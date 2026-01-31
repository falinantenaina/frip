import { generateToken } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";

// @desc    Inscription d'un utilisateur
// @route   POST /api/auth/register
// @access  Public (mais devrait être protégé en production)
export const register = async (req, res, next) => {
  try {
    const { nom, email, motDePasse, role, telephone } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      email,
      motDePasse,
      role: role || "admin",
      telephone,
    });

    // Générer le token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    // Validation
    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir un email et un mot de passe",
      });
    }

    // Vérifier l'utilisateur
    const user = await User.findOne({ email }).select("+motDePasse");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier si le compte est actif
    if (!user.actif) {
      return res.status(401).json({
        success: false,
        message: "Votre compte a été désactivé",
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparerMotDePasse(motDePasse);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Générer le token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour le profil
// @route   PUT /api/auth/updateprofile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      nom: req.body.nom,
      telephone: req.body.telephone,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+motDePasse");

    // Vérifier l'ancien mot de passe
    if (!(await user.comparerMotDePasse(req.body.ancienMotDePasse))) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect",
      });
    }

    user.motDePasse = req.body.nouveauMotDePasse;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: user,
      token,
    });
  } catch (error) {
    next(error);
  }
};
