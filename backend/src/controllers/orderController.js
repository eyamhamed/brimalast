// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const notificationService = require('../utils/notificationService');
const emailService = require('../utils/emailService');
const paymentService = require('../utils/paymentService');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      discountCode,
      isGift,
      giftMessage,
      orderNotes
    } = req.body;
    
    if (!items || !items.length) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }
    
    // Calculate item prices and check stock
    let subtotal = 0;
    let discount = 0;
    const orderItems = [];
    let primaryArtisan = null;
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }
      
      if (!product.isApproved) {
        return res.status(400).json({ message: `Product ${product.name} is not available` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${product.name}` });
      }
      
      const price = product.discountedPrice || product.price;
      const totalPrice = price * item.quantity;
      
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price,
        totalPrice
      });
      
      subtotal += totalPrice;
      
      // Track primary artisan (for simplified order assignment)
      if (!primaryArtisan && product.artisan) {
        primaryArtisan = product.artisan;
      }
    }
    
    // Apply discount code if provided
    if (discountCode) {
      const promoCode = await PromoCode.findOne({ code: discountCode });
      
      if (!promoCode) {
        return res.status(404).json({ message: 'Discount code not found' });
      }
      
      const validation = promoCode.validate(subtotal);
      
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
      
      discount = promoCode.calculateDiscount(subtotal);
      
      // Increment promo code usage
      promoCode.currentUses += 1;
      await promoCode.save();
    }
    
    // Calculate shipping cost (simplified)
    const shippingCost = subtotal > 100 ? 0 : 7.99;
    
    // Calculate estimated delivery (10 days from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 10);
    
    // Create order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingCost,
      discount,
      discountCode,
      totalAmount: subtotal + shippingCost - discount,
      paymentMethod,
      isGift,
      giftMessage,
      orderNotes,
      artisan: primaryArtisan,
      estimatedDelivery
    });
    
    await order.save();
    
    // Create payment session if not cash on delivery
    let paymentInfo = null;
    if (paymentMethod !== 'cash_on_delivery') {
      paymentInfo = await paymentService.createPaymentSession({
        orderId: order._id,
        totalAmount: order.totalAmount,
        customerName: shippingAddress.fullName,
        customerEmail: req.user.email,
        customerPhone: shippingAddress.phone
      });
      
      if (paymentInfo.success) {
        order.paymentReference = paymentInfo.paymentReference;
        await order.save();
      }
    }
    
    // Send notification to user
    notificationService.sendNotification(
      req.user.id,
      'Order Placed Successfully',
      `Your order #${order._id} has been received and is being processed.`,
      { orderId: order._id.toString(), type: 'order_created' }
    );
    
    // Send email confirmation
    emailService.sendOrderConfirmation(req.user.email, order);
    
    res.status(201).json({
      message: 'Order created successfully',
      order,
      payment: paymentInfo
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: req.user.id };
    
    if (status) {
      query.orderStatus = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'items.product',
        select: 'name images'
      }
    };
    
    const orders = await Order.paginate(query, options);
    
    res.json({
      orders: orders.docs,
      totalOrders: orders.totalDocs,
      totalPages: orders.totalPages,
      currentPage: orders.page
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'fullName email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization (user who created order, admin, or artisan of the products)
    if (
      order.user._id.toString() !== req.user.id && 
      req.user.role !== 'admin' && 
      (order.artisan && order.artisan.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findById(req.params.id)
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }
    
    // Check if order can be cancelled
    if (!order.canCancel()) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    // Update order status
    order.orderStatus = 'cancelled';
    order.orderNotes = order.orderNotes ? 
      `${order.orderNotes}\nCancellation reason: ${reason}` : 
      `Cancellation reason: ${reason}`;
    
    // Also update payment status if applicable
    if (order.paymentStatus === 'pending') {
      order.paymentStatus = 'cancelled';
    }
    
    // Restore product stock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product._id },
        { $inc: { stock: item.quantity } }
      );
    }
    
    await order.save();
    
    // Send notification
    notificationService.sendNotification(
      req.user.id,
      'Order Cancelled',
      `Your order #${order._id} has been cancelled.`,
      { orderId: order._id.toString(), type: 'order_cancelled' }
    );
    
    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update order status (admin/artisan)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Artisan
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const order = await Order.findById(req.params.id)
      .populate('user', 'email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (
      req.user.role !== 'admin' && 
      (order.artisan && order.artisan.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }
    
    // Update order status
    order.orderStatus = status;
    
    if (notes) {
      order.orderNotes = order.orderNotes ? 
        `${order.orderNotes}\nStatus update: ${notes}` : 
        `Status update: ${notes}`;
    }
    
    await order.save();
    
    // Send notification to user
    notificationService.sendNotification(
      order.user._id,
      'Order Status Updated',
      `Your order #${order._id} status has been updated to ${status}.`,
      { orderId: order._id.toString(), type: 'order_updated', status }
    );
    
    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify order payment
// @route   GET /api/orders/:id/payment
// @access  Private
exports.verifyOrderPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }
    
    if (!order.paymentReference) {
      return res.status(400).json({ message: 'No payment associated with this order' });
    }
    
    // Only verify if not already paid
    if (order.paymentStatus === 'paid') {
      return res.json({
        verified: true,
        status: order.paymentStatus,
        order
      });
    }
    
    // Verify with payment service (requires session ID)
    if (req.query.sessionId) {
      const verification = await paymentService.verifyPayment(req.query.sessionId);
      
      if (verification.success && verification.status === 'COMPLETED') {
        // Update order payment status
        order.paymentStatus = 'paid';
        order.transactionId = verification.transactionId;
        
        // If this was the first pending order, update status
        if (order.orderStatus === 'pending') {
          order.orderStatus = 'processing';
        }
        
        await order.save();
      }
      
      return res.json({
        verified: verification.success,
        status: verification.status,
        order
      });
    }
    
    res.json({
      verified: false,
      status: 'UNKNOWN',
      message: 'Session ID required for verification'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get artisan orders
// @route   GET /api/orders/artisan
// @access  Private/Artisan
exports.getArtisanOrders = async (req, res) => {
  try {
    // Check if user is artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Not an artisan.' });
    }
    
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { artisan: req.user.id };
    
    if (status) {
      query.orderStatus = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'items.product', select: 'name images' },
        { path: 'user', select: 'fullName email' }
      ]
    };
    
    const orders = await Order.paginate(query, options);
    
    res.json({
      orders: orders.docs,
      totalOrders: orders.totalDocs,
      totalPages: orders.totalPages,
      currentPage: orders.page
    });
  } catch (error) {
    console.error('Get artisan orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};