const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { 
      fullName, 
      region, 
      phoneNumber, 
      socialLinks,
      profilePicture 
    } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (region) user.region = region;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (socialLinks) {
      user.socialLinks = {
        ...user.socialLinks,
        ...socialLinks
      };
    }
    if (profilePicture) user.profilePicture = profilePicture;
    
    // Update timestamp
    user.updatedAt = Date.now();
    
    await user.save();
    
    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply to become an artisan partner
// @route   POST /api/users/apply-artisan
// @access  Private
exports.applyAsArtisan = async (req, res) => {
  try {
    const { 
      region, 
      phoneNumber, 
      bannerImage,
      socialLinks,
      artisanDescription
    } = req.body;
    
    if (!region || !phoneNumber) {
      return res.status(400).json({ 
        message: 'Region and phone number are required for artisan applications'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Log initial state
    console.log('BEFORE CHANGES - User:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      });
    // Check if user is already an artisan
    if (user.role === 'artisan') {
      return res.status(400).json({ message: 'User is already an artisan' });
    }
    
    // Update user data for artisan application
    user.region = region;
    user.phoneNumber = phoneNumber;
    if (bannerImage) user.bannerImage = bannerImage;
    if (socialLinks) {
      user.socialLinks = {
        ...user.socialLinks,
        ...socialLinks
      };
    }
    
    // Change role to pending artisan
    user.role = 'artisan';
    user.isApproved = false; // Needs admin approval
    
    // Add artisan-specific fields
    user.artisanDetails = {
      description: artisanDescription || '',
      submissionDate: Date.now()
    };
       // Log after changes but before save
    console.log('AFTER CHANGES (BEFORE SAVE) - User:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
    });
    await user.save();
    // Verify the changes were actually saved by reloading the user
    const updatedUser = await User.findById(user._id);
    console.log('AFTER SAVE (RELOADED) - User:', {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved
    });
    res.status(201).json({ 
      message: 'Artisan application submitted successfully. Awaiting approval.',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Artisan application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all artisans (public profiles)
// @route   GET /api/users/artisans
// @access  Public
exports.getArtisans = async (req, res) => {
  try {
    const { page = 1, limit = 10, region } = req.query;
    
    // Build filter for approved artisans only
    const filter = { 
      role: 'artisan',
      isApproved: true
    };
    
    // Add region filter if provided
    if (region) filter.region = region;
    
    const artisans = await User.find(filter)
      .select('fullName profilePicture bannerImage region socialLinks artisanDetails')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ fullName: 1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      artisans,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Get artisans error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get artisan details by ID
// @route   GET /api/users/artisans/:id
// @access  Public
exports.getArtisanById = async (req, res) => {
  try {
    const artisan = await User.findOne({ 
      _id: req.params.id,
      role: 'artisan',
      isApproved: true
    }).select('fullName profilePicture bannerImage region socialLinks artisanDetails');
    
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }
    
    res.json(artisan);
  } catch (error) {
    console.error('Get artisan by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};