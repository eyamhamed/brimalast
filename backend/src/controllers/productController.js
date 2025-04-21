// controllers/productController.js
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Artisan
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      promotionPrice,
      images
    } = req.body;

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can create products' });
    }

    // Check if artisan is approved
    if (!req.user.isApproved) {
      return res.status(403).json({ message: 'Your artisan account must be approved before adding products' });
    }

    // Basic validation
    if (!name || !description || !category || !price || !images || images.length === 0) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newProduct = new Product({
      name,
      description,
      category,
      price,
      promotionPrice: promotionPrice || price,
      images,
      artisan: req.user.id
    });

    await newProduct.save();

    res.status(201).json({
      message: 'Product created successfully and awaiting approval',
      product: newProduct.getPublicProduct()
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      minPrice, 
      maxPrice, 
      sort = 'createdAt',
      artisan,
      isBestSeller,
      isNewCollection,
      isFlashSale,
      search
    } = req.query;

    // Build filter object
    const filter = { isApproved: true };
    
    if (category) filter.category = category;
    if (artisan) filter.artisan = artisan;
    if (isBestSeller === 'true') filter.isBestSeller = true;
    if (isNewCollection === 'true') filter.isNewCollection = true;
    if (isFlashSale === 'true') filter.isFlashSale = true;
    
    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Determine sort order
    let sortOption = {};
    switch (sort) {
      case 'priceAsc':
        sortOption = { price: 1 };
        break;
      case 'priceDesc':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
    }

    const products = await Product.find(filter)
      .populate('artisan', 'fullName')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sortOption);

    const total = await Product.countDocuments(filter);

    res.json({
      products: products.map(product => product.getPublicProduct()),
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('artisan', 'fullName profilePicture region');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If product is not approved, only admin or the artisan who created it can see it
    if (!product.isApproved) {
      if (!req.user || (req.user.role !== 'admin' && 
          product.artisan._id.toString() !== req.user.id)) {
        return res.status(404).json({ message: 'Product not found' });
      }
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Artisan
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      promotionPrice,
      images
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only the artisan who created the product or an admin can update it
    if (product.artisan.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // Update fields if provided
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = price;
    if (promotionPrice) product.promotionPrice = promotionPrice;
    if (images && images.length > 0) product.images = images;

    // If artisan updates an approved product, set it back to pending
    if (product.isApproved && req.user.role !== 'admin') {
      product.isApproved = false;
    }

    product.updatedAt = Date.now();

    await product.save();

    res.json({
      message: req.user.role === 'admin' ? 'Product updated successfully' : 
        'Product updated successfully and awaiting approval',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Artisan
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only the artisan who created the product or an admin can delete it
    if (product.artisan.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await product.remove();

    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get products by artisan
// @route   GET /api/products/artisan/:artisanId
// @access  Public
exports.getArtisanProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    
    const filter = { 
      artisan: req.params.artisanId,
      isApproved: true
    };

    const products = await Product.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      products: products.map(product => product.getPublicProduct()),
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get artisan products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get artisan dashboard products (including pending)
// @route   GET /api/products/dashboard
// @access  Private/Artisan
exports.getArtisanDashboardProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    
    // Only artisans can access their dashboard
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filter = { artisan: req.user.id };

    const products = await Product.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get artisan dashboard products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};