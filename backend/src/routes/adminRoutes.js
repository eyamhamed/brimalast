const express = require('express');
const {
  adminLogin,
  getPendingArtisans,
  approveArtisan,
  rejectArtisan,
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getDashboardStats,
  getAllUsers,
  getUserById,
  // Add new controller functions
  getPendingCollaborators,
  approveCollaborator,
  rejectCollaborator,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getEnhancedDashboardStats
} = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');
const router = express.Router();

// Route d'authentification publique - N'utilise pas le middleware d'authentification
router.post('/auth/login', adminLogin);

// Admin verification middleware - all routes below require admin role
router.use(authMiddleware, roleMiddleware(['admin']));

// Dashboard stats
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/enhanced', getEnhancedDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);

// Artisan management
router.get('/artisans/pending', getPendingArtisans);
router.put('/artisans/:id/approve', approveArtisan);
router.put('/artisans/:id/reject', rejectArtisan);

// Product management
router.get('/products/pending', getPendingProducts);
router.put('/products/:id/approve', approveProduct);
router.put('/products/:id/reject', rejectProduct);

// Collaborator management
router.get('/collaborators/pending', getPendingCollaborators);
router.put('/collaborators/:id/approve', approveCollaborator);
router.put('/collaborators/:id/reject', rejectCollaborator);

// Event management
router.get('/events/pending', getPendingEvents);
router.put('/events/:id/approve', approveEvent);
router.put('/events/:id/reject', rejectEvent);

module.exports = router;