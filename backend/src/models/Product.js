const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Original price set by the artisan
  originalPrice: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  // Final price after markup (this is what customers see)
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  // Markup percentage (default 30%)
  markupPercentage: {
    type: Number,
    default: 30,
    min: 0,
    max: 100
  },
  category: {
    type: String,
    enum: ['Men', 'Women', 'Gifts', 'Home', 'Kids', 'Beauty'],
    required: [true, 'Product category is required']
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artisan information is required']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
  }],
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  promotionalStatus: {
    type: String,
    enum: ['none', 'flash_sale', 'new_collection', 'best_seller'],
    default: 'none'
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  ratings: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  // New fields for more detailed product management
  materials: [{
    type: String,
    trim: true
  }],
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'inches'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'lbs'],
      default: 'g'
    }
  },
  customizable: {
    type: Boolean,
    default: false
  },
  
  // Added fields based on the Cahier des Charges
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  
  // For flash sales
  promotionStartDate: {
    type: Date
  },
  promotionEndDate: {
    type: Date
  },
  
  // For collaborative products
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['designer', 'technical_expert', 'marketer']
    },
    contribution: {
      type: String
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discounted price
ProductSchema.virtual('discountedPrice').get(function() {
  return this.price * (1 - this.discountPercentage / 100);
});

// Virtual for product availability
ProductSchema.virtual('isAvailable').get(function() {
  return this.stock > 0;
});

// Virtual to check if a promotion is active
ProductSchema.virtual('isPromotionActive').get(function() {
  if (this.promotionalStatus === 'flash_sale' && this.promotionStartDate && this.promotionEndDate) {
    const now = new Date();
    return now >= this.promotionStartDate && now <= this.promotionEndDate;
  }
  return false;
});

// Method to get public product data
ProductSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    price: this.price,
    discountedPrice: this.discountedPrice,
    discountPercentage: this.discountPercentage,
    category: this.category,
    images: this.images,
    ratings: this.ratings,
    totalReviews: this.totalReviews,
    isAvailable: this.isAvailable,
    promotionalStatus: this.promotionalStatus,
    isPromotionActive: this.isPromotionActive,
    materials: this.materials,
    dimensions: this.dimensions,
    weight: this.weight,
    customizable: this.customizable,
    artisan: this.artisan
  };
};

// Method to check if promotion is valid
ProductSchema.methods.hasValidPromotion = function() {
  if (!this.promotionEndDate) return true;
  return new Date() <= this.promotionEndDate;
};

// Compound index for efficient querying
ProductSchema.index({ 
  category: 1, 
  promotionalStatus: 1, 
  price: 1 
});

// Add text search index
ProductSchema.index({ 
  name: 'text', 
  description: 'text' 
});

// Pre-save middleware for stock management and price calculation
ProductSchema.pre('save', function(next) {
  // For new products, set originalPrice equal to price initially
  if (this.isNew && !this.originalPrice && this.price) {
    this.originalPrice = this.price;
  }
  
  // When a product is approved, apply the 30% markup
  if (this.isModified('isApproved') && this.isApproved) {
    // Calculate the price with markup (original price + markup percentage)
    this.price = this.originalPrice * (1 + this.markupPercentage / 100);
    
    // Set as new collection when approved
    if (!this.promotionalStatus || this.promotionalStatus === 'none') {
      this.promotionalStatus = 'new_collection';
    }
  }
  
  // Ensure stock is not negative
  this.stock = Math.max(0, this.stock);
  
  // Automatically mark as new collection for the first month
  if (!this.createdAt) {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if (!this.promotionalStatus || this.promotionalStatus === 'none') {
      this.promotionalStatus = 'new_collection';
    }
  }
  
  // Clear expired promotions
  if (this.promotionalStatus === 'flash_sale' && this.promotionEndDate && new Date() > this.promotionEndDate) {
    this.promotionalStatus = 'none';
    this.discountPercentage = 0;
  }
  
  next();
});

// Static method for updating stock
ProductSchema.statics.updateStock = async function(productId, quantity) {
  const product = await this.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  product.stock -= quantity;
  await product.save();
  return product;
};

// Static method for admin to mark products as best sellers
ProductSchema.statics.markAsBestSeller = async function(productId, isBestSeller = true) {
  const product = await this.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  product.promotionalStatus = isBestSeller ? 'best_seller' : 'none';
  await product.save();
  return product;
};

// Static method for setting up flash sales
ProductSchema.statics.setupFlashSale = async function(productId, discountPercentage, startDate, endDate) {
  const product = await this.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  product.promotionalStatus = 'flash_sale';
  product.discountPercentage = discountPercentage;
  product.promotionStartDate = startDate || new Date();
  product.promotionEndDate = endDate;
  
  await product.save();
  return product;
};

// Plugin for pagination
ProductSchema.plugin(mongoosePaginate);

// Create the model
const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;