// controllers/analyticsController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Event = require('../models/Event');

// Get admin dashboard stats
exports.getAdminStats = async (req, res) => {
  try {
    // Get date range (default to last 30 days)
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Revenue stats
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    
    // User stats
    const userCount = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const artisanCount = await User.countDocuments({ 
      role: 'artisan', 
      isApproved: true,
      createdAt: { $gte: start, $lte: end }
    });
    
    // Product stats
    const productStats = await Product.aggregate([
      {
        $match: {
          isApproved: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Event stats
    const eventStats = await Event.aggregate([
      {
        $match: {
          isApproved: true,
          startDate: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$experienceType',
          count: { $sum: 1 },
          avgParticipants: { $avg: '$currentParticipants' }
        }
      }
    ]);
    
    // Prepare response
    const stats = {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      revenue: orderStats.length ? {
        total: orderStats[0].totalRevenue,
        orderCount: orderStats[0].orderCount,
        averageOrderValue: orderStats[0].averageOrderValue
      } : {
        total: 0,
        orderCount: 0,
        averageOrderValue: 0
      },
      users: {
        newUsers: userCount,
        newArtisans: artisanCount
      },
      productsByCategory: productStats,
      eventsByType: eventStats
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get artisan dashboard stats
exports.getArtisanStats = async (req, res) => {
  try {
    // Check if user is artisan
    if (req.user.role !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Not an artisan.' });
    }
    
    // Get date range (default to last 30 days)
    const { startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Get artisan products
    const products = await Product.find({ artisan: req.user.id, isApproved: true });
    const productIds = products.map(p => p._id);
    
    // Sales stats
    const salesStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: 'paid',
          'items.product': { $in: productIds }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.product': { $in: productIds }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.totalPrice' },
          totalItems: { $sum: '$items.quantity' },
          orderCount: { $addToSet: '$_id' }
        }
      }
    ]);
    
    // Top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: 'paid'
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.product': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (product) => {
        const details = await Product.findById(product._id).select('name images');
        return {
          ...product,
          name: details?.name || 'Unknown Product',
          image: details?.images?.[0] || ''
        };
      })
    );
    
    // Event stats (if applicable)
    const eventStats = await Event.aggregate([
      {
        $match: {
          artisan: mongoose.Types.ObjectId(req.user.id),
          isApproved: true,
          startDate: { $gte: start }
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalParticipants: { $sum: '$currentParticipants' }
        }
      }
    ]);
    
    // Prepare response
    const stats = {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      products: {
        total: products.length,
        approved: products.filter(p => p.isApproved).length,
        pending: products.filter(p => !p.isApproved).length
      },
      sales: salesStats.length ? {
        revenue: salesStats[0].totalRevenue,
        itemsSold: salesStats[0].totalItems,
        orderCount: salesStats[0].orderCount.length
      } : {
        revenue: 0,
        itemsSold: 0,
        orderCount: 0
      },
      topProducts: topProductsWithDetails,
      events: eventStats.length ? {
        totalEvents: eventStats[0].totalEvents,
        totalParticipants: eventStats[0].totalParticipants
      } : {
        totalEvents: 0,
        totalParticipants: 0
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get artisan stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};