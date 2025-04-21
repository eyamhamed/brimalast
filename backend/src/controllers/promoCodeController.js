const PromoCode = require('../models/PromoCode');

// @desc    Create a new promo code
// @route   POST /api/promocodes
// @access  Private/Admin/Marketer
exports.createPromoCode = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      startDate,
      endDate,
      minOrderValue,
      applicableCategories,
      applicableProducts
    } = req.body;

    // Check authorization (admin or marketer)
    if (req.user.role !== 'admin' && (!req.user.collaboratorRole || req.user.collaboratorRole !== 'marketeur' || !req.user.collaboratorDetails.isApproved)) {
      return res.status(403).json({ message: 'Not authorized to create promo codes' });
    }

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code });
    if (existingCode) {
      return res.status(400).json({ message: 'Promo code already exists' });
    }

    const promoCode = new PromoCode({
      code,
      discountType: discountType || 'percentage',
      discountValue,
      maxUses: maxUses || 0,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      createdBy: req.user.id,
      minOrderValue: minOrderValue || 0,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || []
    });

    await promoCode.save();

    res.status(201).json({
      message: 'Promo code created successfully',
      promoCode
    });
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all promo codes
// @route   GET /api/promocodes
// @access  Private/Admin/Marketer
exports.getPromoCodes = async (req, res) => {
  try {
    // Check authorization
    if (req.user.role !== 'admin' && (!req.user.collaboratorRole || req.user.collaboratorRole !== 'marketeur' || !req.user.collaboratorDetails.isApproved)) {
      return res.status(403).json({ message: 'Not authorized to view promo codes' });
    }

    const promoCodes = await PromoCode.find()
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json(promoCodes);
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Validate a promo code
// @route   POST /api/promocodes/validate
// @access  Public
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, orderValue, category, productId } = req.body;

    const promoCode = await PromoCode.findOne({ code });

    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    const validation = promoCode.validate(orderValue, category, productId);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const discountAmount = promoCode.calculateDiscount(orderValue);

    res.json({
      valid: true,
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount
      }
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Apply a promo code (increment usage count)
// @route   POST /api/promocodes/apply
// @access  Private
exports.applyPromoCode = async (req, res) => {
  try {
    const { code } = req.body;

    const promoCode = await PromoCode.findOne({ code });

    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }

    if (!promoCode.isValid) {
      return res.status(400).json({ message: 'Promo code is invalid or expired' });
    }

    // Increment usage count
    promoCode.currentUses += 1;
    await promoCode.save();

    res.json({
      message: 'Promo code applied successfully',
      promoCode: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue
      }
    });
  } catch (error) {
    console.error('Apply promo code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};