// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// User order routes
router.post('/', orderController.createOrder);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);
router.get('/:id/payment', orderController.verifyOrderPayment);

// Artisan order routes
router.get('/artisan', roleMiddleware(['artisan']), orderController.getArtisanOrders);

// Admin/Artisan routes
router.put('/:id/status', roleMiddleware(['admin', 'artisan']), orderController.updateOrderStatus);

module.exports = router;