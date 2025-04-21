const express = require('express');
const Product = require('../models/Product');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');
const {
   validateProductCreation,
   validateProductId,
   validateProductUpdate
} = require('../models/middleware/productValidation');

const router = express.Router();

// Diagnostic route to test API functionality
router.get('/api-test', (req, res) => {
  const routes = router.stack
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }));
  
  res.json({
    message: 'API is working',
    availableRoutes: routes
  });
});

// SECTION 1: FIXED ROUTES (no path parameters)
// ===========================================

// Get all products with advanced filtering
router.get('/', async (req, res) => {
  try {
    const {
       page = 1,
       limit = 10,
       category,
       promotionalStatus,
       minPrice,
       maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      artisan
    } = req.query;
    
    // Build query
    const query = {};
    if (category) query.category = category;
    if (promotionalStatus) query.promotionalStatus = promotionalStatus;
    if (artisan) query.artisan = artisan;
    
    // Only show approved products for public access
    if (!req.user || (req.user.role !== 'admin')) {
      query.isApproved = true;
    }
         
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sorting
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: { path: 'artisan', select: 'fullName profilePicture region' }
    };
    
    // Execute query
    const products = await Product.paginate(query, options);
    
    res.json({
      products: products.docs,
      totalProducts: products.totalDocs,
      totalPages: products.totalPages,
      currentPage: products.page
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({
       message: 'Error fetching products',
       error: error.message
     });
  }
});

// Create Product (Artisan only)
router.post('/',
   authMiddleware,
   roleMiddleware(['artisan', 'admin']),
   validateProductCreation,
  async (req, res) => {
    try {
      // For new products, store the artisan's price as both originalPrice and price
      const productData = {
        ...req.body,
        artisan: req.user._id,
        originalPrice: req.body.price, // Store original price
        isApproved: false // All new products need approval
      };
      
      const product = new Product(productData);
      await product.save();
      
      res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Product creation error:', error);
      res.status(500).json({
         message: 'Error creating product',
         error: error.message
       });
    }
});

// Health check endpoint
router.get('/health/check', async (req, res) => {
  try {
    // Count products to verify database connection
    const count = await Product.countDocuments();
    
    res.json({
      status: 'ok',
      message: 'Product API is working correctly',
      productCount: count,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Product API health check failed',
      error: error.message
    });
  }
});

// SECTION 2: ROUTES WITH SPECIFIC PREFIXES
// =========================================

// Get products by section type (recommended, bestsellers, new)
router.get('/sections/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const { limit = 8 } = req.query;
    
    let query = { isApproved: true };
    let sort = {};
    
    // Configure query based on section
    switch (section) {
      case 'recommended':
        // For recommended products, return highly rated products
        query.ratings = { $gte: 4 };
        sort = { ratings: -1 };
        break;
      
      case 'bestsellers':
        // Return products marked as bestsellers
        query.promotionalStatus = 'best_seller';
        sort = { updatedAt: -1 };
        break;
      
      case 'new':
        // Return recently added products or new collection
        query.promotionalStatus = 'new_collection';
        sort = { createdAt: -1 };
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid section type' });
    }
    
    console.log(`Fetching ${section} products with query:`, query);
    
    // Fetch products
    const products = await Product.find(query)
      .populate('artisan', 'fullName profilePicture region')
      .sort(sort)
      .limit(Number(limit));
    
    console.log(`Found ${products.length} products for section ${section}`);
    
    // Transform to include virtual properties
    const formattedProducts = products.map(product => {
      const productObj = product.toObject({ virtuals: true });
      // Don't include originalPrice in the public response
      delete productObj.originalPrice;
      delete productObj.markupPercentage;
      return productObj;
    });
    
    res.json(formattedProducts);
  } catch (error) {
    console.error(`Error fetching ${req.params.section} products:`, error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Validate category
    const validCategories = ['Men', 'Women', 'Gifts', 'Home', 'Kids', 'Beauty'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Build query
    const query = { 
      category,
      isApproved: true 
    };
    
    // Sorting
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: { path: 'artisan', select: 'fullName profilePicture region' }
    };
    
    // Execute query
    const products = await Product.paginate(query, options);
    
    res.json({
      category,
      products: products.docs,
      totalProducts: products.totalDocs,
      totalPages: products.totalPages,
      currentPage: products.page
    });
  } catch (error) {
    console.error('Fetch category products error:', error);
    res.status(500).json({
      message: 'Error fetching category products',
      error: error.message
    });
  }
});

// Get Artisan's Products (for dashboard)
router.get('/dashboard/artisan',
  authMiddleware,
  roleMiddleware(['artisan']),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      // Build query for artisan's own products
      const query = { artisan: req.user._id };
      
      // Filter by approval status if specified
      if (status === 'pending') {
        query.isApproved = false;
      } else if (status === 'approved') {
        query.isApproved = true;
      }
      
      // Sorting
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      // Pagination options
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort
      };
      
      // Execute query
      const products = await Product.paginate(query, options);
      
      res.json({
        products: products.docs,
        totalProducts: products.totalDocs,
        totalPages: products.totalPages,
        currentPage: products.page,
        pending: await Product.countDocuments({ artisan: req.user._id, isApproved: false }),
        approved: await Product.countDocuments({ artisan: req.user._id, isApproved: true })
      });
    } catch (error) {
      console.error('Fetch artisan products error:', error);
      res.status(500).json({
        message: 'Error fetching artisan products',
        error: error.message
      });
    }
});

// SECTION 3: ALTERNATE APPROVAL ROUTE - WITH DIFFERENT PATH PATTERN
// ================================================================

// Alternative approach with a different URL pattern
router.put('/approve-product/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  validateProductId, 
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('Approving product:', {
        id: product._id,
        name: product.name,
        originalPrice: product.originalPrice,
        price: product.price
      });

      // Store markup percentage if provided, otherwise use default (30%)
      if (req.body.markupPercentage !== undefined) {
        product.markupPercentage = req.body.markupPercentage;
      }
      
      // Set approval fields
      product.isApproved = true;
      product.approvedBy = req.user._id;
      product.approvalDate = new Date();
      product.rejectionReason = null;
      
      // Set as new collection for newly approved products
      product.promotionalStatus = 'new_collection';
      
      // Ensure originalPrice exists
      if (!product.originalPrice) {
        product.originalPrice = product.price;
      }
      
      // Calculate markup explicitly
      product.price = product.originalPrice * (1 + (product.markupPercentage || 30) / 100);
      
      console.log('After markup calculation:', {
        originalPrice: product.originalPrice,
        markup: product.markupPercentage || 30,
        finalPrice: product.price
      });
      
      // Save the product
      await product.save();
      
      res.json({
        message: 'Product approved successfully',
        product: {
          ...product.toObject(),
          originalPrice: product.originalPrice,
          finalPrice: product.price,
          markup: (product.markupPercentage || 30) + '%'
        }
      });
    } catch (error) {
      console.error('Error approving product:', error);
      res.status(500).json({
        message: 'Error approving product',
        error: error.message
      });
    }
});

// SECTION 4: PRODUCT-SPECIFIC ROUTES WITH ID PARAMETERS
// ====================================================

// Admin route for approving products with markup
router.put('/:id/approve',
  authMiddleware,
  roleMiddleware(['admin']),
  validateProductId,
  async (req, res) => {
    try {
      console.log('Approval endpoint called for product ID:', req.params.id);
      
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log('Product found for approval:', {
        id: product._id,
        name: product.name,
        originalPrice: product.originalPrice,
        price: product.price
      });

      // Store markup percentage if provided, otherwise use default (30%)
      if (req.body.markupPercentage !== undefined) {
        product.markupPercentage = req.body.markupPercentage;
      }
      
      // Set approval fields
      product.isApproved = true;
      product.approvedBy = req.user._id;
      product.approvalDate = new Date();
      product.rejectionReason = null;
      
      // Set as new collection for newly approved products
      product.promotionalStatus = 'new_collection';
      
      // Ensure originalPrice exists
      if (!product.originalPrice) {
        product.originalPrice = product.price;
      }
      
      // Calculate markup explicitly
      product.price = product.originalPrice * (1 + (product.markupPercentage || 30) / 100);
      
      console.log('After markup calculation:', {
        originalPrice: product.originalPrice,
        markup: product.markupPercentage || 30,
        finalPrice: product.price
      });
      
      // Save the product
      await product.save();
      
      console.log('Product saved after approval');
      
      res.json({
        message: 'Product approved successfully',
        product: {
          ...product.toObject(),
          originalPrice: product.originalPrice,
          finalPrice: product.price,
          markup: (product.markupPercentage || 30) + '%'
        }
      });
    } catch (error) {
      console.error('Error approving product:', error);
      res.status(500).json({
        message: 'Error approving product',
        error: error.message
      });
    }
});

// Admin reject product
router.put('/:id/reject',
  authMiddleware,
  roleMiddleware(['admin']),
  validateProductId,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }
      
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      product.isApproved = false;
      product.rejectionReason = reason;
      
      await product.save();
      
      res.json({
        message: 'Product rejected successfully',
        product
      });
    } catch (error) {
      console.error('Error rejecting product:', error);
      res.status(500).json({
        message: 'Error rejecting product',
        error: error.message
      });
    }
});

// Set product promotional status (Admin only)
router.put('/:id/promotion',
  authMiddleware,
  roleMiddleware(['admin']),
  validateProductId,
  async (req, res) => {
    try {
      const { promotionalStatus, discountPercentage, promotionEndDate } = req.body;
      
      if (!promotionalStatus) {
        return res.status(400).json({ message: 'Promotional status is required' });
      }
      
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Update promotional info
      product.promotionalStatus = promotionalStatus;
      
      if (discountPercentage !== undefined) {
        product.discountPercentage = discountPercentage;
      }
      
      if (promotionEndDate) {
        product.promotionEndDate = new Date(promotionEndDate);
      }
      
      // Set promotion start date to now if it's a new promotion
      if (promotionalStatus !== 'none' && !product.promotionStartDate) {
        product.promotionStartDate = new Date();
      }
      
      await product.save();
      
      res.json({
        message: 'Product promotion updated successfully',
        product
      });
    } catch (error) {
      console.error('Update product promotion error:', error);
      res.status(500).json({
        message: 'Error updating product promotion',
        error: error.message
      });
    }
});

// SECTION 5: GENERIC PRODUCT ROUTES WITH ID
// =========================================

// Get Single Product
router.get('/:id',
   validateProductId,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('artisan', 'fullName profilePicture region');
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Create a response object without exposing originalPrice to customers
      const productData = product.toObject({ virtuals: true });
      
      // If user is admin or the artisan who created it, show the original price
      if (req.user && (req.user.role === 'admin' || (product.artisan._id.toString() === req.user._id.toString()))) {
        // Show all data including original price
      } else {
        // For regular users, don't show originalPrice
        delete productData.originalPrice;
        delete productData.markupPercentage;
      }
      
      res.json(productData);
    } catch (error) {
      console.error('Fetch product error:', error);
      res.status(500).json({
         message: 'Error fetching product',
         error: error.message
       });
    }
});

// Update Product (Artisan owner or Admin only)
router.put('/:id',
  authMiddleware,
  validateProductId,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Check if user is the artisan owner or admin
      if (product.artisan.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this product' });
      }
      
      // Handle update
      const updatedData = { ...req.body };
      
      // If regular artisan updates price, update originalPrice
      if (req.user.role === 'artisan' && updatedData.price !== undefined) {
        updatedData.originalPrice = updatedData.price;
        
        // If product was already approved, calculate the new price with markup
        if (product.isApproved) {
          updatedData.price = updatedData.originalPrice * (1 + (product.markupPercentage / 100));
        }
      }
      
      // If regular artisan updates, product needs approval again
      if (req.user.role !== 'admin') {
        updatedData.isApproved = false;
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: updatedData },
        { new: true, runValidators: true }
      );
      
      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        message: 'Error updating product',
        error: error.message
      });
    }
});

// Delete Product (Artisan owner or Admin only)
router.delete('/:id',
  authMiddleware,
  validateProductId,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Check if user is the artisan owner or admin
      if (product.artisan.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this product' });
      }
      
      await Product.findByIdAndDelete(req.params.id);
      
      res.json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        message: 'Error deleting product',
        error: error.message
      });
    }
});

// SECTION 6: DEVELOPMENT & TESTING ROUTES
// ======================================

// Add test products for development
router.post('/dev/add-test-products',
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res) => {
    try {
      const { count = 5 } = req.body;
      const artisanId = req.user._id;
      
      const categories = ['Men', 'Women', 'Gifts', 'Home', 'Kids', 'Beauty'];
      const promotionalStatuses = ['none', 'flash_sale', 'new_collection', 'best_seller'];
      
      const testProducts = [];
      
      for (let i = 0; i < count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const promotionalStatus = promotionalStatuses[Math.floor(Math.random() * promotionalStatuses.length)];
        const originalPrice = Math.floor(Math.random() * 100) + 10; // Random price between 10 and 110
        const ratings = (Math.random() * 2) + 3; // Random rating between 3 and 5
        
        const product = new Product({
          name: `Test Product ${i + 1}`,
          description: `This is a test product description for product ${i + 1}`,
          originalPrice,
          price: originalPrice * 1.3, // Apply 30% markup
          category,
          artisan: artisanId,
          images: ['https://placehold.co/600x400.png'],
          stock: Math.floor(Math.random() * 50) + 5,
          promotionalStatus,
          discountPercentage: promotionalStatus === 'flash_sale' ? Math.floor(Math.random() * 50) + 5 : 0,
          ratings,
          totalReviews: Math.floor(Math.random() * 50),
          isApproved: true,
          approvedBy: artisanId,
          approvalDate: new Date(),
          markupPercentage: 30
        });
        
        await product.save();
        testProducts.push(product);
      }
      
      res.status(201).json({
        message: `${count} test products created successfully`,
        products: testProducts
      });
    } catch (error) {
      console.error('Error creating test products:', error);
      res.status(500).json({
        message: 'Error creating test products',
        error: error.message
      });
    }
});

// Update existing products to include originalPrice
router.post('/dev/update-schema',
  authMiddleware,
  roleMiddleware(['admin']),
  async (req, res) => {
    try {
      const products = await Product.find({});
      let updated = 0;
      
      for (const product of products) {
        if (!product.originalPrice) {
          product.originalPrice = product.price;
          if (product.isApproved) {
            product.markupPercentage = 30;
          }
          await product.save();
          updated++;
        }
      }
      
      res.json({
        message: `Updated ${updated} of ${products.length} products`,
        updated,
        total: products.length
      });
    } catch (error) {
      console.error('Error updating schema:', error);
      res.status(500).json({
        message: 'Error updating schema',
        error: error.message
      });
    }
});

module.exports = router;