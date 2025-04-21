const User = require('../models/User');
const Product = require('../models/Product');
// Add these new imports
const Event = require('../models/Event');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Vérification des entrées
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Trouver l'utilisateur avec le rôle admin
    const admin = await User.findOne({ email, role: 'admin' });
    
    // Logs de débogage
    console.log('Admin login attempt for:', email);
    console.log('Admin user found:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials or not an admin' });
    }
    
    // Vérifier que le mot de passe existe
    if (!admin.password) {
      console.error('Admin user has no password in database:', admin._id);
      
      // Ajoutez cette partie pour déboguer
      const adminDetails = await User.findById(admin._id).select('_id email role password');
      console.log('Admin details:', {
        id: adminDetails._id,
        email: adminDetails.email,
        role: adminDetails.role,
        hasPassword: !!adminDetails.password,
        passwordType: typeof adminDetails.password
      });
      
      return res.status(500).json({ message: 'Server error - account configuration issue' });
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Générer le token JWT
    const token = jwt.sign(
      { id: admin._id, role: admin.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Renvoyer les informations d'admin et le token
    res.status(200).json({
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending artisan applications
// @route   GET /api/admin/artisans/pending
// @access  Private/Admin
exports.getPendingArtisans = async (req, res) => {
  try {
    console.log('Searching for pending artisans...');
    
    // Log all users for debugging
    const allUsers = await User.find().select('_id email role isApproved');
    console.log('All users:', allUsers);
    
    // Get artisans with role='artisan'
    const allArtisans = await User.find({ role: 'artisan' }).select('_id email isApproved');
    console.log('All users with role artisan:', allArtisans);
    
    const pendingArtisans = await User.find({ 
      role: 'artisan',
      isApproved: false
    }).select('-password').sort({ createdAt: -1 });
    
    console.log('Pending artisans found:', pendingArtisans);
    
    res.json(pendingArtisans);
  } catch (error) {
    console.error('Get pending artisans error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user by ID for debugging
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve artisan application
// @route   PUT /api/admin/artisans/:id/approve
// @access  Private/Admin
exports.approveArtisan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Approving artisan:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    });
    
    if (user.role !== 'artisan') {
      return res.status(400).json({ message: 'User is not an artisan' });
    }
    
    if (user.isApproved) {
      return res.status(400).json({ message: 'Artisan is already approved' });
    }
    
    user.isApproved = true;
    user.artisanDetails = {
      ...user.artisanDetails,
      approvedDate: Date.now(),
      approvedBy: req.user.id
    };
    
    await user.save();
    
    res.json({ 
      message: 'Artisan approved successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Approve artisan error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject artisan application
// @route   PUT /api/admin/artisans/:id/reject
// @access  Private/Admin
exports.rejectArtisan = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'artisan') {
      return res.status(400).json({ message: 'User is not an artisan' });
    }
    
    // Reset role to regular user
    user.role = 'user';
    user.isApproved = false;
    user.artisanDetails = {
      ...user.artisanDetails,
      rejectionReason: reason,
      rejectionDate: Date.now(),
      rejectedBy: req.user.id
    };
    
    await user.save();
    
    res.json({ 
      message: 'Artisan application rejected',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Reject artisan error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending product approvals
// @route   GET /api/admin/products/pending
// @access  Private/Admin
exports.getPendingProducts = async (req, res) => {
  try {
    const pendingProducts = await Product.find({ isApproved: false })
      .populate('artisan', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(pendingProducts);
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve a product
// @route   PUT /api/admin/products/:id/approve
// @access  Private/Admin
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    product.isApproved = true;
    product.approvedBy = req.user.id;
    product.approvalDate = Date.now();
    product.rejectionReason = '';
    
    await product.save();
    
    res.json({ 
      message: 'Product approved successfully',
      product
    });
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject a product
// @route   PUT /api/admin/products/:id/reject
// @access  Private/Admin
exports.rejectProduct = async (req, res) => {
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
      message: 'Product rejected',
      product
    });
  } catch (error) {
    console.error('Reject product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts for various entities
    const pendingArtisans = await User.countDocuments({ 
      role: 'artisan',
      isApproved: false
    });
    
    const approvedArtisans = await User.countDocuments({ 
      role: 'artisan',
      isApproved: true
    });
    
    const pendingProducts = await Product.countDocuments({ 
      isApproved: false 
    });
    
    const approvedProducts = await Product.countDocuments({ 
      isApproved: true 
    });
    
    const totalUsers = await User.countDocuments();
    
    // Get product stats by category
    const productsByCategory = await Product.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      counts: {
        users: totalUsers,
        artisans: {
          pending: pendingArtisans,
          approved: approvedArtisans,
          total: pendingArtisans + approvedArtisans
        },
        products: {
          pending: pendingProducts,
          approved: approvedProducts,
          total: pendingProducts + approvedProducts
        }
      },
      productsByCategory
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ----- ADD NEW CONTROLLER METHODS BELOW -----

// @desc    Get pending collaborator applications
// @route   GET /api/admin/collaborators/pending
// @access  Private/Admin
exports.getPendingCollaborators = async (req, res) => {
  try {
    const pendingCollaborators = await User.find({
      collaboratorRole: { $ne: null },
      'collaboratorDetails.isApproved': false
    }).select('-password');
    
    res.json(pendingCollaborators);
  } catch (error) {
    console.error('Get pending collaborators error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve collaborator application
// @route   PUT /api/admin/collaborators/:id/approve
// @access  Private/Admin
exports.approveCollaborator = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.collaboratorRole) {
      return res.status(400).json({ message: 'User is not a collaborator' });
    }
    
    user.collaboratorDetails.isApproved = true;
    user.collaboratorDetails.approvedDate = Date.now();
    user.collaboratorDetails.approvedBy = req.user.id;
    
    await user.save();
    
    res.json({
      message: 'Collaborator approved successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        collaboratorRole: user.collaboratorRole,
        collaboratorDetails: user.collaboratorDetails
      }
    });
  } catch (error) {
    console.error('Approve collaborator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject collaborator application
// @route   PUT /api/admin/collaborators/:id/reject
// @access  Private/Admin
exports.rejectCollaborator = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.collaboratorRole) {
      return res.status(400).json({ message: 'User is not a collaborator' });
    }
    
    // Set rejection details
    user.collaboratorDetails.isApproved = false;
    user.collaboratorDetails.rejectionReason = reason;
    user.collaboratorDetails.rejectionDate = Date.now();
    
    await user.save();
    
    res.json({
      message: 'Collaborator application rejected',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        collaboratorRole: user.collaboratorRole,
        collaboratorDetails: user.collaboratorDetails
      }
    });
  } catch (error) {
    console.error('Reject collaborator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending events
// @route   GET /api/admin/events/pending
// @access  Private/Admin
exports.getPendingEvents = async (req, res) => {
  try {
    const pendingEvents = await Event.find({
      isApproved: false
    }).populate('artisan', 'fullName email');
    
    res.json(pendingEvents);
  } catch (error) {
    console.error('Get pending events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve event
// @route   PUT /api/admin/events/:id/approve
// @access  Private/Admin
exports.approveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    event.isApproved = true;
    event.approvedBy = req.user.id;
    
    await event.save();
    
    res.json({
      message: 'Event approved successfully',
      event
    });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject event
// @route   PUT /api/admin/events/:id/reject
// @access  Private/Admin
exports.rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    event.isApproved = false;
    event.rejectionReason = reason;
    
    await event.save();
    
    res.json({
      message: 'Event rejected',
      event
    });
  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get enhanced dashboard stats (including collaborators and events)
// @route   GET /api/admin/dashboard/enhanced
// @access  Private/Admin
exports.getEnhancedDashboardStats = async (req, res) => {
  try {
    // Get all the original stats
    const pendingArtisans = await User.countDocuments({ 
      role: 'artisan',
      isApproved: false
    });
    
    const approvedArtisans = await User.countDocuments({ 
      role: 'artisan',
      isApproved: true
    });
    
    const pendingProducts = await Product.countDocuments({ 
      isApproved: false 
    });
    
    const approvedProducts = await Product.countDocuments({ 
      isApproved: true 
    });
    
    const totalUsers = await User.countDocuments();
    
    // Get collaborator stats
    const pendingCollaborators = await User.countDocuments({
      collaboratorRole: { $ne: null },
      'collaboratorDetails.isApproved': false
    });
    
    const approvedCollaborators = await User.countDocuments({
      collaboratorRole: { $ne: null },
      'collaboratorDetails.isApproved': true
    });
    
    // Get collaborators by role
    const collaboratorsByRole = await User.aggregate([
      { $match: { 
        collaboratorRole: { $ne: null },
        'collaboratorDetails.isApproved': true
      }},
      { $group: { _id: '$collaboratorRole', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get event stats
    const pendingEvents = await Event.countDocuments({
      isApproved: false
    });
    
    const approvedEvents = await Event.countDocuments({
      isApproved: true
    });
    
    // Get events by type
    const eventsByType = await Event.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: '$experienceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      counts: {
        users: totalUsers,
        artisans: {
          pending: pendingArtisans,
          approved: approvedArtisans,
          total: pendingArtisans + approvedArtisans
        },
        products: {
          pending: pendingProducts,
          approved: approvedProducts,
          total: pendingProducts + approvedProducts
        },
        collaborators: {
          pending: pendingCollaborators,
          approved: approvedCollaborators,
          total: pendingCollaborators + approvedCollaborators
        },
        events: {
          pending: pendingEvents,
          approved: approvedEvents,
          total: pendingEvents + approvedEvents
        }
      },
      collaboratorsByRole,
      eventsByType,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get enhanced dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};