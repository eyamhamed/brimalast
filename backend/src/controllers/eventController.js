const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Artisan
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      startDate,
      endDate,
      maxParticipants,
      price,
      isFree,
      images,
      materials,
      duration,
      experienceType
    } = req.body;

    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Only artisans can create events' });
    }

    // Check if the artisan is approved
    if (!req.user.isApproved) {
      return res.status(403).json({ message: 'Your artisan account must be approved to create events' });
    }

    // Create new event
    const event = new Event({
      title,
      description,
      artisan: req.user.id,
      location,
      startDate,
      endDate,
      maxParticipants: maxParticipants || 10,
      price: price || 0,
      isFree: isFree || false,
      images: images || [],
      materials: materials || [],
      duration,
      experienceType: experienceType || 'workshop'
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully and pending approval',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      experienceType,
      region,
      startDate,
      endDate,
      artisan
    } = req.query;

    // Build filter
    const filter = { isApproved: true };
    
    if (experienceType) filter.experienceType = experienceType;
    if (region) filter['location.region'] = region;
    if (artisan) filter.artisan = artisan;
    
    // Date filtering
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.endDate = { $lte: new Date(endDate) };
    }

    // Only show future events by default
    if (!startDate && !endDate) {
      filter.startDate = { $gte: new Date() };
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { startDate: 1 },
      populate: { path: 'artisan', select: 'fullName' }
    };

    // Execute query
    const events = await Event.paginate(filter, options);

    res.json({
      events: events.docs,
      totalEvents: events.totalDocs,
      totalPages: events.totalPages,
      currentPage: events.page
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('artisan', 'fullName region profilePicture');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Only show approved events to public
    if (!event.isApproved && (!req.user || (req.user.role !== 'admin' && event.artisan._id.toString() !== req.user.id))) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Book an event
// @route   POST /api/events/:id/book
// @access  Private
exports.bookEvent = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      numberOfParticipants,
      specialRequirements
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.isApproved) {
      return res.status(400).json({ message: 'This event is not available for booking' });
    }

    if (event.hasEnded) {
      return res.status(400).json({ message: 'This event has already ended' });
    }

    if (event.isFull) {
      return res.status(400).json({ message: 'This event is fully booked' });
    }

    // Create reservation
    const reservation = new Reservation({
      event: event._id,
      user: req.user.id,
      fullName: fullName || req.user.fullName,
      email: email || req.user.email,
      phoneNumber,
      numberOfParticipants: numberOfParticipants || 1,
      specialRequirements,
      status: 'confirmed'
    });

    // Generate a promo code
    const promoCode = `EVENT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    reservation.promoCode = promoCode;
    reservation.promoCodeSent = true;

    // Update event participants count
    event.currentParticipants += (numberOfParticipants || 1);
    
    await reservation.save();
    await event.save();

    // TODO: Send confirmation email with promo code

    res.status(201).json({
      message: 'Event booked successfully',
      reservation,
      promoCode
    });
  } catch (error) {
    console.error('Book event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ADD NEW METHODS BELOW

// @desc    Get user's event reservations
// @route   GET /api/events/reservations
// @access  Private
exports.getUserReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user.id })
      .populate({
        path: 'event',
        select: 'title startDate endDate location artisan',
        populate: {
          path: 'artisan',
          select: 'fullName'
        }
      })
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get artisan's events
// @route   GET /api/events/artisan
// @access  Private/Artisan
exports.getArtisanEvents = async (req, res) => {
  try {
    // Check if user is an artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Not an artisan.' });
    }

    const events = await Event.find({ artisan: req.user.id })
      .sort({ startDate: 1 });

    res.json({
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Get artisan events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update event details
// @route   PUT /api/events/:id
// @access  Private/Artisan
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the event's artisan
    if (event.artisan.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    // If event was approved, set isApproved back to false for re-approval
    const wasApproved = event.isApproved;
    
    // Update fields
    const updateData = { ...req.body };
    
    // If event was approved before, it needs re-approval after updates
    if (wasApproved && req.user.role !== 'admin') {
      updateData.isApproved = false;
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json({
      message: wasApproved && req.user.role !== 'admin' ? 
               'Event updated and submitted for re-approval' : 
               'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get event reservations (for artisans)
// @route   GET /api/events/:id/reservations
// @access  Private/Artisan
exports.getEventReservations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the event's artisan
    if (event.artisan.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these reservations' });
    }

    const reservations = await Reservation.find({ event: req.params.id })
      .sort({ createdAt: -1 });

    res.json({
      count: reservations.length,
      event: {
        id: event._id,
        title: event.title,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants
      },
      reservations
    });
  } catch (error) {
    console.error('Get event reservations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel a reservation
// @route   PUT /api/events/reservations/:id/cancel
// @access  Private
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Only the user who made the reservation can cancel it
    if (reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this reservation' });
    }

    // Get the event to update participant count
    const event = await Event.findById(reservation.event);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Update reservation status
    reservation.status = 'canceled';
    await reservation.save();

    // Update event participant count
    event.currentParticipants -= reservation.numberOfParticipants;
    if (event.currentParticipants < 0) event.currentParticipants = 0;
    await event.save();

    res.json({ 
      message: 'Reservation canceled successfully',
      reservation
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const now = new Date();
    
    const events = await Event.find({
      isApproved: true,
      startDate: { $gte: now }
    })
    .sort({ startDate: 1 })
    .limit(parseInt(limit))
    .populate('artisan', 'fullName');
    
    res.json(events);
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get events by region
// @route   GET /api/events/regions/:region
// @access  Public
exports.getEventsByRegion = async (req, res) => {
  try {
    const { region } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const filter = { 
      isApproved: true,
      'location.region': region,
      startDate: { $gte: new Date() }
    };
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { startDate: 1 },
      populate: { path: 'artisan', select: 'fullName' }
    };
    
    const events = await Event.paginate(filter, options);
    
    res.json({
      region,
      events: events.docs,
      totalEvents: events.totalDocs,
      totalPages: events.totalPages,
      currentPage: events.page
    });
  } catch (error) {
    console.error('Get events by region error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};