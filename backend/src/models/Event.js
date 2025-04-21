const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    address: String,
    city: String,
    region: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 10
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: false
  },
  images: [{
    type: String
  }],
  materials: [{
    type: String
  }],
  duration: {
    type: Number, // in minutes
    required: true
  },
  experienceType: {
    type: String,
    enum: ['workshop', 'demonstration', 'visit', 'fair'],
    default: 'workshop'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  promoCode: {
    code: String,
    discount: Number
  }
}, {
  timestamps: true
});

// Virtual for checking if event is full
EventSchema.virtual('isFull').get(function() {
  return this.currentParticipants >= this.maxParticipants;
});

// Virtual for checking if event has started
EventSchema.virtual('hasStarted').get(function() {
  return new Date() >= this.startDate;
});

// Virtual for checking if event has ended
EventSchema.virtual('hasEnded').get(function() {
  return new Date() > this.endDate;
});

// Add pagination plugin
EventSchema.plugin(mongoosePaginate);

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;