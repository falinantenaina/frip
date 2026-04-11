import Balle from "../models/balle.model.js";
import Depense from "../models/depense.model.js";

export const getDepenses = async (req, res, next) => {
  try {
    const { balle, type, dateDebut, dateFin } = req.query;
    let query = {};
    if (balle) { query.balle = balle === "global" ? null : balle; }
    if (type) query.type = type;
    if (dateDebut || dateFin) { query.dateDepense = {}; if (dateDebut) query.dateDepense.$gte = new Date(dateDebut); if (dateFin) query.dateDepense.$lte = new Date(dateFin); }
    const depenses = await Depense.find(query).populate("balle", "nom numero").sort({ dateDepense: -1 });
    res.status(200).json({ success: true, count: depenses.length, data: depenses });
  } catch (error) { next(error); }
};

export const getDepense = async (req, res, next) => {
  try {
    const depense = await Depense.findById(req.params.id).populate("balle", "nom numero");
    if (!depense) return res.status(404).json({ success: false, message: "Dépense non trouvée" });
    res.status(200).json({ success: true, data: depense });
  } catch (error) { next(error); }
};

export const createDepense = async (req, res, next) => {
  try {
    const { balle } = req.body;
    if (balle) {
      const balleDoc = await Balle.findById(balle);
      if (!balleDoc) return res.status(404).json({ success: false, message: "Balle non trouvée" });
      balleDoc.depensesLiees += req.body.montant;
      balleDoc.calculerBenefice();
      await balleDoc.save();
    }
    const depense = await Depense.create(req.body);
    await depense.populate("balle", "nom numero");
    res.status(201).json({ success: true, data: depense });
  } catch (error) { next(error); }
};

export const updateDepense = async (req, res, next) => {
  try {
    let depense = await Depense.findById(req.params.id);
    if (!depense) return res.status(404).json({ success: false, message: "Dépense non trouvée" });
    const ancienMontant = depense.montant;
    const ancienneBalle = depense.balle;
    depense = await Depense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("balle", "nom numero");
    if (ancienneBalle) { const b = await Balle.findById(ancienneBalle); if (b) { b.depensesLiees -= ancienMontant; b.calculerBenefice(); await b.save(); } }
    if (depense.balle) { const b = await Balle.findById(depense.balle); if (b) { b.depensesLiees += depense.montant; b.calculerBenefice(); await b.save(); } }
    res.status(200).json({ success: true, data: depense });
  } catch (error) { next(error); }
};

export const deleteDepense = async (req, res, next) => {
  try {
    const depense = await Depense.findById(req.params.id);
    if (!depense) return res.status(404).json({ success: false, message: "Dépense non trouvée" });
    if (depense.balle) { const balle = await Balle.findById(depense.balle); if (balle) { balle.depensesLiees -= depense.montant; balle.calculerBenefice(); await balle.save(); } }
    await depense.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { next(error); }
};

export const getDepensesStats = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    let matchQuery = {};
    if (dateDebut || dateFin) { matchQuery.dateDepense = {}; if (dateDebut) matchQuery.dateDepense.$gte = new Date(dateDebut); if (dateFin) matchQuery.dateDepense.$lte = new Date(dateFin); }
    const stats = await Depense.aggregate([{ $match: matchQuery }, { $group: { _id: null, totalDepenses: { $sum: "$montant" }, nombreDepenses: { $sum: 1 } } }]);
    const statsByType = await Depense.aggregate([{ $match: matchQuery }, { $group: { _id: "$type", total: { $sum: "$montant" }, count: { $sum: 1 } } }]);
    res.status(200).json({ success: true, data: { global: stats[0] || { totalDepenses: 0, nombreDepenses: 0 }, byType: statsByType } });
  } catch (error) { next(error); }
};
