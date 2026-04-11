import Livreur from "../models/livreur.model.js";
import Vente from "../models/vente.model.js";

export const getLivreurs = async (req, res, next) => {
  try {
    const { actif, search } = req.query;
    let query = {};
    if (actif !== undefined) query.actif = actif === "true";
    if (search) query.$or = [{ nom: { $regex: search, $options: "i" } }, { telephone: { $regex: search, $options: "i" } }];
    const livreurs = await Livreur.find(query).sort({ nom: 1 });
    res.status(200).json({ success: true, count: livreurs.length, data: livreurs });
  } catch (error) { next(error); }
};

export const getLivreur = async (req, res, next) => {
  try {
    const livreur = await Livreur.findById(req.params.id);
    if (!livreur) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    const livraisons = await Vente.find({ livreur: livreur._id }).populate("balle", "nom numero").sort({ dateVente: -1 }).limit(10);
    res.status(200).json({ success: true, data: { livreur, livraisonsRecentes: livraisons } });
  } catch (error) { next(error); }
};

export const createLivreur = async (req, res, next) => {
  try {
    const livreur = await Livreur.create(req.body);
    res.status(201).json({ success: true, data: livreur });
  } catch (error) { next(error); }
};

export const updateLivreur = async (req, res, next) => {
  try {
    let livreur = await Livreur.findById(req.params.id);
    if (!livreur) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    livreur = await Livreur.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: livreur });
  } catch (error) { next(error); }
};

export const deleteLivreur = async (req, res, next) => {
  try {
    const livreur = await Livreur.findById(req.params.id);
    if (!livreur) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    const livraisonsEnCours = await Vente.countDocuments({ livreur: livreur._id, statutLivraison: { $in: ["en_attente", "en_cours"] } });
    if (livraisonsEnCours > 0) return res.status(400).json({ success: false, message: "Impossible de supprimer un livreur ayant des livraisons en cours" });
    await livreur.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};

export const getLivreurStats = async (req, res, next) => {
  try {
    const livreur = await Livreur.findById(req.params.id);
    if (!livreur) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    const stats = await Vente.aggregate([{ $match: { livreur: livreur._id } }, { $group: { _id: "$statutLivraison", count: { $sum: 1 }, fraisTotal: { $sum: "$fraisLivraison" } } }]);
    res.status(200).json({ success: true, data: { livreur, statistiques: stats } });
  } catch (error) { next(error); }
};
