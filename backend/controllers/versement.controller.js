import Versement from "../models/versement.model.js";

// @desc    Obtenir tous les versements
// @route   GET /api/versements
// @access  Private
export const getVersements = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;

    const filter = {};

    // Filtre par date si fourni
    if (dateDebut || dateFin) {
      filter.dateVersement = {};
      if (dateDebut) filter.dateVersement.$gte = new Date(dateDebut);
      if (dateFin) filter.dateVersement.$lte = new Date(dateFin);
    }

    const versements = await Versement.find(filter).sort("-dateVersement");

    res.status(200).json({
      success: true,
      count: versements.length,
      data: versements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des versements",
      error: error.message,
    });
  }
};

// @desc    Obtenir un versement par ID
// @route   GET /api/versements/:id
// @access  Private
export const getVersement = async (req, res) => {
  try {
    const versement = await Versement.findById(req.params.id);

    if (!versement) {
      return res.status(404).json({
        success: false,
        message: "Versement non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: versement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du versement",
      error: error.message,
    });
  }
};

// @desc    Créer un versement
// @route   POST /api/versements
// @access  Private (Admin)
export const createVersement = async (req, res) => {
  try {
    const versement = await Versement.create(req.body);

    res.status(201).json({
      success: true,
      data: versement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création du versement",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour un versement
// @route   PUT /api/versements/:id
// @access  Private (Admin)
export const updateVersement = async (req, res) => {
  try {
    let versement = await Versement.findById(req.params.id);

    if (!versement) {
      return res.status(404).json({
        success: false,
        message: "Versement non trouvé",
      });
    }

    versement = await Versement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: versement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour du versement",
      error: error.message,
    });
  }
};

// @desc    Supprimer un versement
// @route   DELETE /api/versements/:id
// @access  Private (Admin)
export const deleteVersement = async (req, res) => {
  try {
    const versement = await Versement.findById(req.params.id);

    if (!versement) {
      return res.status(404).json({
        success: false,
        message: "Versement non trouvé",
      });
    }

    await versement.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du versement",
      error: error.message,
    });
  }
};

// @desc    Obtenir les statistiques des versements
// @route   GET /api/versements/stats/summary
// @access  Private
export const getStatsVersements = async (req, res) => {
  try {
    const versements = await Versement.find();
    const total = versements.reduce((sum, vers) => sum + vers.montant, 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        count: versements.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des statistiques",
      error: error.message,
    });
  }
};
