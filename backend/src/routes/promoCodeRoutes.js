const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');

// Public route (for customers to validate codes)
router.post('/validate', promoCodeController.validatePromoCode);

// Protected routes
router.post('/', authMiddleware, promoCodeController.createPromoCode);
router.get('/', authMiddleware, promoCodeController.getPromoCodes);
router.post('/apply', authMiddleware, promoCodeController.applyPromoCode);

module.exports = router;