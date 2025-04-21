const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware, roleMiddleware } = require('../models/middleware/authMiddleware');
// Public routes
router.get('/', eventController.getEvents);
router.get('/upcoming', eventController.getUpcomingEvents);
router.get('/regions/:region', eventController.getEventsByRegion);
router.get('/:id', eventController.getEventById);

// User reservation routes
router.get('/reservations', authMiddleware, eventController.getUserReservations);
router.put('/reservations/:id/cancel', authMiddleware, eventController.cancelReservation);

// Artisan routes
router.get('/artisan/events', authMiddleware, roleMiddleware(['artisan']), eventController.getArtisanEvents);
router.get('/:id/reservations', authMiddleware, eventController.getEventReservations);

// Create, update and book events
router.post('/', authMiddleware, roleMiddleware(['artisan']), eventController.createEvent);
router.put('/:id', authMiddleware, eventController.updateEvent);
router.post('/:id/book', authMiddleware, eventController.bookEvent);

module.exports = router;