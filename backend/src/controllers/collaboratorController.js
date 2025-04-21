const User = require('../models/User');

// @desc    Apply to become a collaborator
// @route   POST /api/collaborators/apply
// @access  Private
exports.applyAsCollaborator = async (req, res) => {
  try {
    const { 
      collaboratorRole, 
      skills, 
      portfolio, 
      experience, 
      bio, 
      specialties 
    } = req.body;
    
    // Validate role
    if (!['designer', 'expert_technique', 'marketeur'].includes(collaboratorRole)) {
      return res.status(400).json({ message: 'Invalid collaborator role' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already a collaborator
    if (user.collaboratorRole) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }
    
    // Update user with collaborator details
    user.collaboratorRole = collaboratorRole;
    user.collaboratorDetails = {
      skills: skills || [],
      portfolio: portfolio || '',
      experience: experience || '',
      bio: bio || '',
      specialties: specialties || [],
      submissionDate: Date.now(),
      isApproved: false
    };
    
    await user.save();
    
    res.status(201).json({
      message: 'Collaborator application submitted successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        collaboratorRole: user.collaboratorRole,
        collaboratorDetails: user.collaboratorDetails
      }
    });
  } catch (error) {
    console.error('Collaborator application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all collaborators
// @route   GET /api/collaborators
// @access  Public
exports.getCollaborators = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    const query = { 
      collaboratorRole: { $ne: null },
      'collaboratorDetails.isApproved': true
    };
    
    if (role) {
      query.collaboratorRole = role;
    }
    
    const collaborators = await User.find(query)
      .select('fullName profilePicture collaboratorRole collaboratorDetails')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      collaborators,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};