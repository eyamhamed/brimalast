const express = require('express');
const router = express.Router();
const collaboratorController = require('../controllers/collaboratorController');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');
// Public routes
router.get('/', collaboratorController.getCollaborators);

// Protected routes
router.post('/apply', authMiddleware, collaboratorController.applyAsCollaborator);

module.exports = router;