const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');
const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    }, 
    process.env.JWT_SECRET || 'your_jwt_secret', 
    { expiresIn: '1d' }
  );
};

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    // Enhanced logging with more context
    console.log('🚀 [SIGNUP] Incoming Request:', {
      timestamp: new Date().toISOString(),
      body: {
        fullName: req.body.fullName,
        email: req.body.email,
        passwordLength: req.body.password ? req.body.password.length : 0
      }
    });
    
    const { fullName, email, password, role } = req.body;

    // Comprehensive input validation
    const validationErrors = [];
    if (!fullName) validationErrors.push('Full name is required');
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (email && !emailRegex.test(email)) {
      validationErrors.push('Invalid email format');
    }

    // Password complexity validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (password && !passwordRegex.test(password)) {
      validationErrors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.warn('🚫 [SIGNUP] Validation Failed:', validationErrors);
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.warn('🚫 [SIGNUP] User Already Exists:', email);
      return res.status(400).json({ 
        message: 'User already exists',
        field: 'email'
      });
    }

    // Create new user with Mongoose model (password hashing is handled in the User model pre-save hook)
    const newUser = new User({ 
      fullName, 
      email: email.toLowerCase(), 
      password,
      role: role || 'user' // Default to user if no role specified
    });

    // Save user to database
    await newUser.save();

    // Generate JWT token
    const token = generateToken(newUser);

    // Update last login
    newUser.lastLogin = new Date();
    await newUser.save();

    // Log successful user creation
    console.log('✅ [SIGNUP] User Created Successfully:', {
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role
    });

    // Respond with token and user profile
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    // Comprehensive error logging
    console.error('❌ [SIGNUP] Error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors 
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        field: 'email'
      });
    }

    // Generic server error
    res.status(500).json({ 
      message: 'Error creating user', 
      error: error.message 
    });
  }
});

// Signin Route with improved debugging and error handling
router.post('/signin', async (req, res) => {
  try {
    console.log('🚀 [SIGNIN] Incoming Request:', {
      timestamp: new Date().toISOString(),
      email: req.body.email,
      passwordProvided: !!req.body.password
    });

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.warn('🚫 [SIGNIN] Missing Credentials');
      return res.status(400).json({ 
        message: 'Email and password are required',
        missingFields: [
          ...(!email ? ['email'] : []),
          ...(!password ? ['password'] : [])
        ]
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log(`🔍 [SIGNIN] User lookup: ${email.toLowerCase()}, Found: ${!!user}`);
    
    if (!user) {
      console.warn('🚫 [SIGNIN] User Not Found:', email);
      return res.status(400).json({ 
        message: 'Invalid credentials'
      });
    }

    // Verify the password using the User model's method
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
      console.log(`🔍 [SIGNIN] Password match result: ${isMatch}`);
    } catch (bcryptError) {
      console.error('❌ [SIGNIN] Password comparison error:', bcryptError);
      return res.status(500).json({ 
        message: 'An error occurred during authentication' 
      });
    }
    
    if (!isMatch) {
      console.warn('🚫 [SIGNIN] Invalid Password for user:', email);
      return res.status(400).json({ 
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    console.log('✅ [SIGNIN] User Authenticated:', {
      userId: user._id,
      email: user.email
    });

    // Respond with token and user profile
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ [SIGNIN] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get current user route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // User is already available in req.user from authMiddleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password route
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'New password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success even if user not found (security best practice)
    if (!user) {
      return res.json({ 
        message: 'If your email exists in our system, you will receive a password reset link' 
      });
    }
    
    // Generate a reset token (normally would be sent via email)
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    
    // In a real app, you would send an email with the reset link
    // For this example, we'll just return the token
    console.log('✉️ [RESET] Would send reset token to:', email);
    
    res.json({ 
      message: 'If your email exists in our system, you will receive a password reset link',
      // Only include token in development for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    } catch (tokenError) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== DEVELOPMENT ROUTES - REMOVE IN PRODUCTION =====
if (process.env.NODE_ENV === 'development') {
  // Password debugging tool
  router.post('/dev/debug-password', async (req, res) => {
    try {
      const { rawPassword, hashedPassword } = req.body;
      
      if (!rawPassword || !hashedPassword) {
        return res.status(400).json({
          message: 'Both rawPassword and hashedPassword are required'
        });
      }
      
      // Test if the provided hash is valid
      let isValidHash = true;
      try {
        // This will throw an error if the hash format is invalid
        await bcrypt.compare('test', hashedPassword);
      } catch (e) {
        isValidHash = false;
      }
      
      // Try to compare the raw password with the hash
      let isMatch = false;
      let error = null;
      
      try {
        isMatch = await bcrypt.compare(rawPassword, hashedPassword);
      } catch (e) {
        error = {
          message: e.message,
          name: e.name
        };
      }
      
      // Generate a new hash for the raw password for comparison
      const newHash = await bcrypt.hash(rawPassword, 10);
      
      res.json({
        isValidHash,
        isMatch,
        error,
        hashInfo: {
          originalHash: hashedPassword,
          newHashForSamePassword: newHash,
          hashesMatch: newHash === hashedPassword,
          originalHashLength: hashedPassword.length,
          newHashLength: newHash.length
        }
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error debugging password',
        error: error.message
      });
    }
  });

  // Reset and test password route
  router.post('/dev/reset-and-test', async (req, res) => {
    try {
      const { email, newPassword, testLogin } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({ 
          message: 'Email and new password are required' 
        });
      }
      
      // Find the user
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update the user's password
      user.password = newPassword;
      await user.save();
      
      // Get the updated user
      const updatedUser = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      // Attempt login if requested
      let loginResult = null;
      if (testLogin) {
        try {
          // Test if the password works
          const isMatch = await updatedUser.comparePassword(newPassword);
          
          if (isMatch) {
            // Generate token as if logging in
            const token = generateToken(updatedUser);
            
            loginResult = {
              success: true,
              token: token,
              user: {
                id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role
              }
            };
          } else {
            loginResult = {
              success: false,
              message: 'Password reset was successful but login failed',
              comparisonResult: isMatch
            };
          }
        } catch (loginError) {
          loginResult = {
            success: false,
            message: 'Error testing login after password reset',
            error: loginError.message
          };
        }
      }
      
      // Return result
      res.json({
        message: 'Password reset successful',
        user: {
          id: user._id,
          email: user.email
        },
        testLogin: loginResult
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  });
}

module.exports = router;