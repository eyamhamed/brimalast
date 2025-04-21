const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // Don't return password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'artisan', 'collaborator', 'admin'],
    default: 'user'
  },
  subRole: {
    type: String,
    enum: ['designer', 'technicalExpert', 'marketer', null],
    default: null
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bannerImage: {
    type: String,
    default: ''
  },
  region: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false // For artisans who need admin approval
  },
  artisanDetails: {
    description: { type: String, default: '' },
    submissionDate: { type: Date, default: null },
    approvedDate: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, default: '' },
    rejectionDate: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  // Add collaborator fields
  collaboratorRole: {
    type: String,
    enum: ['designer', 'expert_technique', 'marketeur', null],
    default: null
  },
  collaboratorDetails: {
    skills: [String],
    portfolio: String,
    experience: String,
    bio: String,
    specialties: [String],
    submissionDate: Date,
    approvedDate: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    rejectionReason: String,
    rejectionDate: Date
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual property for profile (used in the auth routes)
UserSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    subRole: this.subRole,
    collaboratorRole: this.collaboratorRole,
    profilePicture: this.profilePicture,
    isVerified: this.isVerified,
    region: this.region
  };
});

// Hash the password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords - IMPROVED VERSION
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Simple clean comparison using bcrypt
    if (!candidatePassword) {
      return false;
    }
    
    if (!this.password) {
      console.error("User password is undefined or null");
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error) {
    console.error("❌ [COMPARE PASSWORD] Error:", error);
    throw error; // Throw the actual error for better debugging
  }
};

// Method to get user's full profile with sensitive information removed
UserSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Method to update user details
UserSchema.methods.updateProfile = async function(updatedData) {
  // Only allow updating specific fields
  const allowedFields = [
    'fullName', 'profilePicture', 'bannerImage', 
    'region', 'phoneNumber', 'socialLinks'
  ];
  
  // Filter out disallowed fields
  Object.keys(updatedData).forEach(field => {
    if (allowedFields.includes(field)) {
      this[field] = updatedData[field];
    }
  });
  
  // Save the changes
  return await this.save();
};

// Static method to find users by role
UserSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

// Helper static method to check if a user exists
UserSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

module.exports = mongoose.model('User', UserSchema);