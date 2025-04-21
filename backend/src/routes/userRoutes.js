const express = require('express');
const { authMiddleware } = require('../models/middleware/authMiddleware');
const router = express.Router();
const User = require('../models/User'); // Ajoutez cette ligne pour importer le modèle User

// Définition du contrôleur utilisateur directement dans le fichier
const userController = {
  getProfile: async (req, res) => {
    try {
      res.json({ message: 'Profil utilisateur', user: req.user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  updateProfile: async (req, res) => {
    try {
      const { fullName, region, phoneNumber } = req.body;
      // Logique pour mettre à jour le profil
      res.json({ message: 'Profil mis à jour', updates: req.body });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  applyAsArtisan: async (req, res) => {
    try {
      const { region, phoneNumber, artisanDescription } = req.body;
      const userId = req.user.id;

      // Trouver l'utilisateur dans la base de données
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      console.log('User before artisan update:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      });

      // Mettre à jour les informations de l'utilisateur
      user.region = region || user.region;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.role = 'artisan'; // Changer le rôle en artisan
      user.artisanDetails = {
        ...user.artisanDetails,
        description: artisanDescription || '',
        submissionDate: new Date(),
        approvedDate: null,
        approvedBy: null,
        rejectionReason: '',
        rejectionDate: null,
        rejectedBy: null
      };

      await user.save();

      console.log('User updated to artisan:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      });

      res.status(201).json({ 
        message: 'Demande d\'artisan soumise avec succès',
        user: {
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          region: user.region,
          phoneNumber: user.phoneNumber
        }
      });
    } catch (error) {
      console.error('Artisan application error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  getArtisans: async (req, res) => {
    try {
      // Logique pour obtenir la liste des artisans
      const artisans = await User.find({ 
        role: 'artisan', 
        isApproved: true 
      }).select('fullName region profilePicture');
      
      res.json({ artisans });
    } catch (error) {
      console.error('Get artisans error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  getArtisanById: async (req, res) => {
    try {
      // Logique pour obtenir un artisan par ID
      const artisan = await User.findOne({ 
        _id: req.params.id,
        role: 'artisan',
        isApproved: true
      }).select('-password');
      
      if (!artisan) {
        return res.status(404).json({ message: 'Artisan not found' });
      }
      
      res.json({ artisan });
    } catch (error) {
      console.error('Get artisan by ID error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Routes pour le profil utilisateur
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// Routes pour les artisans
router.post('/apply-artisan', authMiddleware, userController.applyAsArtisan);
router.get('/artisans', userController.getArtisans);
router.get('/artisans/:id', userController.getArtisanById);

// Cette ligne est cruciale pour que le routeur soit correctement exporté
module.exports = router;