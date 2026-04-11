import Livreur from "../models/livreur.model.js";
import PaiementLivreur from "../models/paiementLivreur.model.js";
import Vente from "../models/vente.model.js";

export const getPaiements = async (req, res) => {
  try {
    const { livreurId } = req.params;
    const { dateDebut, dateFin } = req.query;
    const filter = livreurId ? { livreur: livreurId } : {};
    if (dateDebut || dateFin) { filter.datePaiement = {}; if (dateDebut) filter.datePaiement.$gte = new Date(dateDebut); if (dateFin) filter.datePaiement.$lte = new Date(dateFin); }
    const paiements = await PaiementLivreur.find(filter).populate("livreur", "nom telephone").sort("-datePaiement");
    res.status(200).json({ success: true, count: paiements.length, data: paiements });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getPaiement = async (req, res) => {
  try {
    const p = await PaiementLivreur.findById(req.params.id).populate("livreur", "nom telephone");
    if (!p) return res.status(404).json({ success: false, message: "Paiement non trouvé" });
    res.status(200).json({ success: true, data: p });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const createPaiement = async (req, res) => {
  try {
    const { livreur, montantVerse, description, datePaiement } = req.body;
    const livreurExists = await Livreur.findById(livreur);
    if (!livreurExists) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    const paiement = await PaiementLivreur.create({ livreur, montantVerse, description, datePaiement: datePaiement || Date.now() });
    const populated = await PaiementLivreur.findById(paiement._id).populate("livreur", "nom telephone");
    res.status(201).json({ success: true, data: populated });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updatePaiement = async (req, res) => {
  try {
    let p = await PaiementLivreur.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: "Paiement non trouvé" });
    p = await PaiementLivreur.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("livreur", "nom telephone");
    res.status(200).json({ success: true, data: p });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deletePaiement = async (req, res) => {
  try {
    const p = await PaiementLivreur.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: "Paiement non trouvé" });
    await p.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getStatsPaiementsLivreur = async (req, res) => {
  try {
    const { livreurId } = req.params;
    const livreur = await Livreur.findById(livreurId);
    if (!livreur) return res.status(404).json({ success: false, message: "Livreur non trouvé" });
    const ventes = await Vente.find({ livreur: livreurId, statutLivraison: { $ne: "annulé" } });
    const totalAVerser = ventes.reduce((sum, v) => sum + v.prixVente, 0);
    const paiements = await PaiementLivreur.find({ livreur: livreurId });
    const totalVerse = paiements.reduce((sum, p) => sum + p.montantVerse, 0);
    res.status(200).json({ success: true, data: { totalAVerser, totalVerse, reste: totalAVerser - totalVerse, nombreVentes: ventes.length, nombrePaiements: paiements.length } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
