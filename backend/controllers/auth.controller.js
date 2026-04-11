import { generateToken } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";

export const register = async (req, res, next) => {
  try {
    const { nom, email, motDePasse, role, telephone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "Cet email est déjà utilisé" });
    const user = await User.create({ nom, email, motDePasse, role: role || "admin", telephone });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, data: { id: user._id, nom: user.nom, email: user.email, role: user.role, telephone: user.telephone }, token });
  } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) return res.status(400).json({ success: false, message: "Veuillez fournir un email et un mot de passe" });
    const user = await User.findOne({ email }).select("+motDePasse");
    if (!user) return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
    if (!user.actif) return res.status(401).json({ success: false, message: "Votre compte a été désactivé" });
    const isMatch = await user.comparerMotDePasse(motDePasse);
    if (!isMatch) return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
    const token = generateToken(user._id);
    res.status(200).json({ success: true, data: { id: user._id, nom: user.nom, email: user.email, role: user.role, telephone: user.telephone }, token });
  } catch (error) { next(error); }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { nom: req.body.nom, telephone: req.body.telephone }, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+motDePasse");
    if (!(await user.comparerMotDePasse(req.body.ancienMotDePasse))) return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect" });
    user.motDePasse = req.body.nouveauMotDePasse;
    await user.save();
    const token = generateToken(user._id);
    res.status(200).json({ success: true, data: user, token });
  } catch (error) { next(error); }
};
