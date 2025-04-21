const { body, param, validationResult } = require('express-validator');

// Validation middleware for product creation
const validateProductCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('category')
    .isIn(['Men', 'Women', 'Gifts', 'Home', 'Kids', 'Beauty'])
    .withMessage('Invalid product category'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  
  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation middleware for product ID
const validateProductId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID')
];

module.exports = {
  validateProductCreation,
  validateProductId
};