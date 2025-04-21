const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Génération de JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    }, 
    process.env.JWT_SECRET || 'your_jwt_secret', 
    { expiresIn: '1d' }
  );
};

// @desc    Inscription d'un utilisateur
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    console.log('Signup Request Body:', req.body);
    
    const { fullName, email, password, role } = req.body;

    // Validation complète des entrées
    const validationErrors = [];
    if (!fullName) validationErrors.push('Full name is required');
    if (!email) validationErrors.push('Email is required');
    if (!password) validationErrors.push('Password is required');

    // Validation du format de l'email
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (email && !emailRegex.test(email)) {
      validationErrors.push('Invalid email format');
    }

    // Validation de la complexité du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (password && !passwordRegex.test(password)) {
      validationErrors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Retourner les erreurs de validation s'il y en a
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists',
        field: 'email'
      });
    }

    // Créer un nouvel utilisateur
    const newUser = new User({ 
      fullName, 
      email, 
      password,
      role: role || 'user' // Par défaut 'user' si aucun rôle n'est spécifié
    });

    // Sauvegarder l'utilisateur dans la base de données
    await newUser.save();

    // Générer un token JWT
    const token = generateToken(newUser);

    // Mettre à jour la dernière connexion
    newUser.lastLogin = new Date();
    await newUser.save();

    // Répondre avec le token et le profil utilisateur
    res.status(201).json({
      token,
      user: newUser.profile
    });
  } catch (error) {
    console.error('Signup Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Gérer les erreurs de validation mongoose spécifiques
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors 
      });
    }

    // Gérer les erreurs de clé dupliquée
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        field: 'email'
      });
    }

    // Erreur serveur générique
    res.status(500).json({ 
      message: 'Error creating user', 
      error: error.message 
    });
  }
};

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/signin
// @access  Public
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Valider les entrées
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        missingFields: [
          ...(!email ? ['email'] : []),
          ...(!password ? ['password'] : [])
        ]
      });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials',
        field: 'email'
      });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Invalid credentials',
        field: 'password'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer un token JWT
    const token = generateToken(user);

    // Répondre avec le token et le profil utilisateur
    res.json({
      token,
      user: user.profile
    });
  } catch (error) {
    console.error('Signin Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Obtenir l'utilisateur actuel
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.profile);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};