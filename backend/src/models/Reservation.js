const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phoneNumber: String,
  numberOfParticipants: {
    type: Number,
    default: 1
  },
  specialRequirements: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'canceled'],
    default: 'pending'
  },
  promoCodeSent: {
    type: Boolean,
    default: false
  },
  promoCode: String
}, {
  timestamps: true
});

const Reservation = mongoose.model('Reservation', ReservationSchema);

module.exports = Reservation;