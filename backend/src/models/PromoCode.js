const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxUses: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  currentUses: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  applicableCategories: [{
    type: String,
    enum: ['Men', 'Women', 'Gifts', 'Home', 'Kids', 'Beauty']
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// Virtual for checking if promo code has expired
PromoCodeSchema.virtual('isExpired').get(function() {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

// Virtual for checking if promo code has reached max uses
PromoCodeSchema.virtual('isMaxedOut').get(function() {
  if (this.maxUses === 0) return false; // unlimited uses
  return this.currentUses >= this.maxUses;
});

// Virtual for checking if promo code is valid
PromoCodeSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired && !this.isMaxedOut;
});

// Method to validate promo code
PromoCodeSchema.methods.validate = function(orderValue = 0, category = null, productId = null) {
  if (!this.isValid) {
    return { valid: false, message: 'Promo code is invalid or expired' };
  }
  
  if (orderValue < this.minOrderValue) {
    return { valid: false, message: `Minimum order value of ${this.minOrderValue} required` };
  }
  
  if (this.applicableCategories.length > 0 && category && !this.applicableCategories.includes(category)) {
    return { valid: false, message: 'Promo code not applicable for this category' };
  }
  
  if (this.applicableProducts.length > 0 && productId && !this.applicableProducts.map(p => p.toString()).includes(productId.toString())) {
    return { valid: false, message: 'Promo code not applicable for this product' };
  }
  
  return { valid: true };
};

// Method to calculate discount
PromoCodeSchema.methods.calculateDiscount = function(orderValue) {
  if (this.discountType === 'percentage') {
    return Math.min(orderValue * (this.discountValue / 100), orderValue);
  } else {
    return Math.min(this.discountValue, orderValue);
  }
};

const PromoCode = mongoose.model('PromoCode', PromoCodeSchema);

module.exports = PromoCode;