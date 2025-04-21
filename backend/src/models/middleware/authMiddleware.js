const jwt = require('jsonwebtoken');
const User = require('../../models/User');
// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    console.log('Authorization Header:', authHeader);

    if (!authHeader) {
      return res.status(401).json({ 
        message: 'No token, authorization denied',
        details: 'Authorization header is missing'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.replace('Bearer ', '');

    console.log('Extracted Token:', token);

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    console.log('Decoded Token:', decoded);

    // Find user and attach to request
    const user = await User.findById(decoded.id);
    
    console.log('Found User:', user);

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        details: error.message
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired',
        details: error.message
      });
    }

    res.status(401).json({
      message: 'Please authenticate',
      error: error.message
    });
  }
};

// Role-based Authorization Middleware
const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Not authorized',
        details: 'No user attached to the request'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};