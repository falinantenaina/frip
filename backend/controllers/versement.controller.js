import Versement from "../models/versement.model.js";

export const getVersements = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const filter = {};
    if (dateDebut || dateFin) { filter.dateVersement = {}; if (dateDebut) filter.dateVersement.$gte = new Date(dateDebut); if (dateFin) filter.dateVersement.$lte = new Date(dateFin); }
    const versements = await Versement.find(filter).sort("-dateVersement");
    res.status(200).json({ success: true, count: versements.length, data: versements });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getVersement = async (req, res) => {
  try {
    const v = await Versement.findById(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: "Versement non trouvé" });
    res.status(200).json({ success: true, data: v });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const createVersement = async (req, res) => {
  try {
    const v = await Versement.create(req.body);
    res.status(201).json({ success: true, data: v });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateVersement = async (req, res) => {
  try {
    let v = await Versement.findById(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: "Versement non trouvé" });
    v = await Versement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: v });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const deleteVersement = async (req, res) => {
  try {
    const v = await Versement.findById(req.params.id);
    if (!v) return res.status(404).json({ success: false, message: "Versement non trouvé" });
    await v.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getStatsVersements = async (req, res) => {
  try {
    const versements = await Versement.find();
    const total = versements.reduce((sum, v) => sum + v.montant, 0);
    res.status(200).json({ success: true, data: { total, count: versements.length } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
