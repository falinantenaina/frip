import Investissement from "../models/investissement.model.js";

export const getInvestissements = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const filter = {};
    if (dateDebut || dateFin) { filter.dateInvestissement = {}; if (dateDebut) filter.dateInvestissement.$gte = new Date(dateDebut); if (dateFin) filter.dateInvestissement.$lte = new Date(dateFin); }
    const investissements = await Investissement.find(filter).sort("-dateInvestissement");
    res.status(200).json({ success: true, count: investissements.length, data: investissements });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getInvestissement = async (req, res) => {
  try {
    const inv = await Investissement.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: "Investissement non trouvé" });
    res.status(200).json({ success: true, data: inv });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const createInvestissement = async (req, res) => {
  try {
    const inv = await Investissement.create(req.body);
    res.status(201).json({ success: true, data: inv });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateInvestissement = async (req, res) => {
  try {
    let inv = await Investissement.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: "Investissement non trouvé" });
    inv = await Investissement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: inv });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deleteInvestissement = async (req, res) => {
  try {
    const inv = await Investissement.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: "Investissement non trouvé" });
    await inv.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getStatsInvestissements = async (req, res) => {
  try {
    const investissements = await Investissement.find();
    const total = investissements.reduce((sum, inv) => sum + inv.montant, 0);
    res.status(200).json({ success: true, data: { total, count: investissements.length } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
