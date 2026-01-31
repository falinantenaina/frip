import Investissement from "../models/investissement.model.js";

// @desc    Obtenir tous les investissements
// @route   GET /api/investissements
// @access  Private
export const getInvestissements = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;

    const filter = {};

    // Filtre par date si fourni
    if (dateDebut || dateFin) {
      filter.dateInvestissement = {};
      if (dateDebut) filter.dateInvestissement.$gte = new Date(dateDebut);
      if (dateFin) filter.dateInvestissement.$lte = new Date(dateFin);
    }

    const investissements = await Investissement.find(filter).sort(
      "-dateInvestissement",
    );

    res.status(200).json({
      success: true,
      count: investissements.length,
      data: investissements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des investissements",
      error: error.message,
    });
  }
};

// @desc    Obtenir un investissement par ID
// @route   GET /api/investissements/:id
// @access  Private
export const getInvestissement = async (req, res) => {
  try {
    const investissement = await Investissement.findById(req.params.id);

    if (!investissement) {
      return res.status(404).json({
        success: false,
        message: "Investissement non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: investissement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'investissement",
      error: error.message,
    });
  }
};

// @desc    Créer un investissement
// @route   POST /api/investissements
// @access  Private (Admin)
export const createInvestissement = async (req, res) => {
  try {
    const investissement = await Investissement.create(req.body);

    res.status(201).json({
      success: true,
      data: investissement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création de l'investissement",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour un investissement
// @route   PUT /api/investissements/:id
// @access  Private (Admin)
export const updateInvestissement = async (req, res) => {
  try {
    let investissement = await Investissement.findById(req.params.id);

    if (!investissement) {
      return res.status(404).json({
        success: false,
        message: "Investissement non trouvé",
      });
    }

    investissement = await Investissement.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: investissement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour de l'investissement",
      error: error.message,
    });
  }
};

// @desc    Supprimer un investissement
// @route   DELETE /api/investissements/:id
// @access  Private (Admin)
export const deleteInvestissement = async (req, res) => {
  try {
    const investissement = await Investissement.findById(req.params.id);

    if (!investissement) {
      return res.status(404).json({
        success: false,
        message: "Investissement non trouvé",
      });
    }

    await investissement.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de l'investissement",
      error: error.message,
    });
  }
};

// @desc    Obtenir les statistiques des investissements
// @route   GET /api/investissements/stats/summary
// @access  Private
export const getStatsInvestissements = async (req, res) => {
  try {
    const investissements = await Investissement.find();
    const total = investissements.reduce((sum, inv) => sum + inv.montant, 0);

    res.status(200).json({
      success: true,
      data: {
        total,
        count: investissements.length,
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
