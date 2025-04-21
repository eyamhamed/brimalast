// models/Order.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  shippingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    region: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Tunisia'
    },
    phone: String
  },
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discountCode: String,
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'cash_on_delivery'],
    default: 'card'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentReference: String,
  transactionId: String,
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderNotes: String,
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String,
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedDelivery: Date
}, {
  timestamps: true
});

// Virtual for order total
OrderSchema.virtual('calculateTotal').get(function() {
  return this.subtotal + this.shippingCost - this.discount;
});

// Method to check if order is fully paid
OrderSchema.methods.isPaid = function() {
  return this.paymentStatus === 'paid';
};

// Method to check if order can be cancelled
OrderSchema.methods.canCancel = function() {
  return ['pending', 'processing'].includes(this.orderStatus);
};

// Method to get status history
OrderSchema.methods.getStatusHistory = function() {
  return this.statusHistory || [];
};

// Pre-save hook to calculate totals
OrderSchema.pre('save', function(next) {
  if (this.isModified('items') || !this.subtotal) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  
  this.totalAmount = this.subtotal + this.shippingCost - this.discount;
  next();
});

// Add a method to update stock when order is confirmed
OrderSchema.methods.updateProductStock = async function() {
  const Product = mongoose.model('Product');
  
  for (const item of this.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: -item.quantity } }
    );
  }
};

// Add pagination plugin
OrderSchema.plugin(mongoosePaginate);

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;