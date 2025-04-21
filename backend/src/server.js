const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const eventRoutes = require('./routes/eventRoutes');
const promoCodeRoutes = require('./routes/promoCodeRoutes');
const bcrypt = require('bcryptjs'); // Ajout de bcrypt
require('dotenv').config();

// Create Express App - ceci doit être défini AVANT d'utiliser app
const app = express();

// Import Routes
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
// Importer adminRoutes
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Route Sanitization Middleware
app.use((req, res, next) => {
  // Remove any trailing newline or control characters from the path
  req.path = req.path.replace(/(%0A|%0D)/g, '').trim();
  next();
});

// Middleware for request logging
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
};

// Enhanced CORS configuration to allow connections from emulators and physical devices
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS for preflight requests
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true, // Allow cookies if needed
  maxAge: 86400 // Cache preflight response for 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging (optional, for debugging)
app.use(requestLogger);

// Global route logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.path}`);
  next();
});

// Routes - utilisez vos routes importées
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
// Activer les routes admin
app.use('/api/admin', adminRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/promocodes', promoCodeRoutes);
// Ajout d'une route test simple pour vérifier le fonctionnement
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// ROUTE TEMPORAIRE POUR RÉINITIALISER LE MOT DE PASSE D'UN ADMIN - À SUPPRIMER EN PRODUCTION
app.post('/api/dev/reset-admin-password', async (req, res) => {
  try {
    const { email, newPassword, secretKey } = req.body;
    
    // Vérification de sécurité
    if (secretKey !== 'brimasouksecret2025') {
      return res.status(403).json({ message: 'Clé secrète incorrecte' });
    }
    
    // Trouver l'utilisateur admin
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin non trouvé' });
    }
    
    console.log('Admin found:', {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      hasPassword: !!admin.password
    });
    
    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Mettre à jour le mot de passe
    admin.password = hashedPassword;
    await admin.save();
    
    // Vérifier que le mot de passe a bien été enregistré
    const updatedAdmin = await User.findById(admin._id);
    console.log('Password updated:', {
      hasPassword: !!updatedAdmin.password,
      passwordLength: updatedAdmin.password?.length
    });
    
    res.json({ 
      message: 'Mot de passe admin réinitialisé avec succès',
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        passwordUpdated: !!updatedAdmin.password
      }
    });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ROUTE TEMPORAIRE POUR CRÉER UN ADMIN - À SUPPRIMER EN PRODUCTION
app.post('/api/dev/create-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Vérification de sécurité
    if (secretKey !== 'brimasouksecret2025') {
      return res.status(403).json({ message: 'Clé secrète incorrecte' });
    }
    
    // Trouver et mettre à jour l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    user.role = 'admin';
    await user.save();
    
    res.json({ 
      message: 'Utilisateur promu administrateur', 
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      } 
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ROUTE TEMPORAIRE POUR MODIFIER UN UTILISATEUR EN ARTISAN - À SUPPRIMER EN PRODUCTION
app.post('/api/dev/fix-artisan', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User before update:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    });
    
    // Forcer le changement de rôle
    user.role = 'artisan';
    user.isApproved = false;
    user.artisanDetails = {
      ...user.artisanDetails,
      description: 'Artisan spécialisé dans la poterie traditionnelle',
      submissionDate: new Date()
    };
    
    await user.save();
    
    // Vérifier que les changements ont été enregistrés
    const updatedUser = await User.findById(user._id);
    console.log('User after update:', {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved
    });
    
    res.json({
      message: 'User updated to artisan successfully',
      before: { role: user.role, isApproved: user.isApproved },
      after: { role: updatedUser.role, isApproved: updatedUser.isApproved }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive Route Debugging Endpoint
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  
  const extractRoutes = (router, basePath = '') => {
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          path: `${basePath}${middleware.route.path}`,
          methods: Object.keys(middleware.route.methods)
        });
      } else if (middleware.name === 'router') {
        const routerPath = middleware.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/^\^/, '')
          .replace(/\$/, '');
          
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push({
              path: `${basePath}${routerPath}${handler.route.path}`,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    });
  };

  // Extract routes from main app
  extractRoutes(app._router);

  res.json({
    routes,
    timestamp: new Date().toISOString()
  });
});

// Detailed Route Debugging Endpoint
app.get('/api/routes', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }));

  res.json({
    routes,
    timestamp: new Date().toISOString()
  });
});

// Enhanced Route Debugging Endpoint
app.get('/api/routes-detailed', (req, res) => {
  const routes = [];
  
  const extractRoutes = (router, basePath = '') => {
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          fullPath: `${basePath}${middleware.route.path}`,
          methods: Object.keys(middleware.route.methods),
          type: 'direct'
        });
      } else if (middleware.name === 'router') {
        const routerPath = middleware.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/^\^/, '')
          .replace(/\$/, '');
          
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push({
              fullPath: `${basePath}${routerPath}${handler.route.path}`,
              methods: Object.keys(handler.route.methods),
              type: 'nested'
            });
          }
        });
      }
    });
  };

  // Extract routes from main app
  extractRoutes(app._router);

  res.json({
    routes,
    timestamp: new Date().toISOString()
  });
});

// Detailed Route Logging Endpoint
app.get('/api/route-details', (req, res) => {
  const routeDetails = [];

  const logRouteDetails = (router, basePath = '') => {
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        Object.keys(middleware.route.methods).forEach(method => {
          routeDetails.push({
            method: method.toUpperCase(),
            fullPath: `${basePath}${middleware.route.path}`,
            handler: middleware.route.stack[0].name || 'Anonymous'
          });
        });
      } else if (middleware.name === 'router') {
        const routerPath = middleware.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/^\^/, '')
          .replace(/\$/, '');
          
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            Object.keys(handler.route.methods).forEach(method => {
              routeDetails.push({
                method: method.toUpperCase(),
                fullPath: `${basePath}${routerPath}${handler.route.path}`,
                handler: handler.route.stack[0].name || 'Anonymous'
              });
            });
          }
        });
      }
    });
  };

  logRouteDetails(app._router);

  res.json({
    routes: routeDetails,
    timestamp: new Date().toISOString()
  });
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      readyState: mongoose.connection.readyState,
      connection: mongoose.connection.host
    }
  });
});

// Development-only route to clear users
if (process.env.NODE_ENV === 'development') {
  app.delete('/api/dev/clear-users', async (req, res) => {
    try {
      // Optional security check
      const confirmHeader = req.get('X-Confirm-Clear');
      if (confirmHeader !== 'REALLY_CLEAR_USERS') {
        return res.status(403).json({
          message: 'Confirmation header required'
        });
      }

      // Clear all users
      const result = await User.deleteMany({});

      console.log(`[DEV] Cleared ${result.deletedCount} users`);

      res.json({
        message: 'All users cleared',
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error clearing users:', error);
      res.status(500).json({ 
        message: 'Error clearing users', 
        error: error.message 
      });
    }
  });
}
// ROUTE TEMPORAIRE DE DIAGNOSTIC - À SUPPRIMER EN PRODUCTION
app.get('/api/dev/check-users', async (req, res) => {
  try {
    // Récupérer tous les utilisateurs avec leurs rôles exacts
    const users = await User.find({}, 'email role isApproved');
    
    // Vérifier spécifiquement l'utilisateur par email
    const email = req.query.email || 'nouvel.artisan@example.com';
    const targetUser = await User.findOne({ email });
    
    res.json({
      allUsers: users,
      targetUserDetails: targetUser ? {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        isApproved: targetUser.isApproved,
        artisanDetails: targetUser.artisanDetails
      } : null
    });
  } catch (error) {
    console.error('Error checking users:', error);
    res.status(500).json({ error: error.message });
  }
});
// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
  // Log the error with more context
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body
  });

  // Determine the status code
  const statusCode = err.status || 500;

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    statusCode: statusCode,
    message: err.message || 'An unexpected error occurred',
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack 
    })
  });
});

// 404 Handler for undefined routes
app.use((req, res, next) => {
  console.warn(`[${new Date().toISOString()}] Route Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});
 
// MongoDB Connection Function
const connectDB = async () => {
  try {
    // Connection options
    const options = {
      dbName: 'brimasouk'
    };

    // Connect to MongoDB
    const connection = await mongoose.connect(process.env.MONGODB_URI, options);

    // Detailed Connection Information
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📦 Database: ${connection.connection.db.databaseName}`);
    console.log(`🔗 Host: ${connection.connection.host}`);
    console.log(`📊 Ready State: ${mongoose.connection.readyState}`);

    // Log all registered routes after a short delay to ensure all routes are registered
    setTimeout(() => {
      console.log('\n📍 Registered Routes:');
      app._router.stack
        .filter(r => r.route)
        .forEach(r => {
          console.log(`Path: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
        });
    }, 100);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Server Configuration - IMPORTANT CHANGE: Listen on all network interfaces
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💡 Local access URL: http://localhost:${PORT}`);
  console.log(`💡 Network access: Available on all network interfaces (0.0.0.0)`);
});

// Connect to Database
connectDB();

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received signal ${signal}, shutting down gracefully`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close server after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced Error Handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = app;