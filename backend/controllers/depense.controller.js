import Balle from "../models/balle.model.js";
import Depense from "../models/depense.model.js";

// @desc    Obtenir toutes les dépenses
// @route   GET /api/depenses
// @access  Private
export const getDepenses = async (req, res, next) => {
  try {
    const { balle, type, dateDebut, dateFin } = req.query;

    let query = {};

    if (balle) {
      if (balle === "global") {
        query.balle = null;
      } else {
        query.balle = balle;
      }
    }

    if (type) {
      query.type = type;
    }

    if (dateDebut || dateFin) {
      query.dateDepense = {};
      if (dateDebut) {
        query.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        query.dateDepense.$lte = new Date(dateFin);
      }
    }

    const depenses = await Depense.find(query)
      .populate("balle", "nom numero")
      .sort({ dateDepense: -1 });

    res.status(200).json({
      success: true,
      count: depenses.length,
      data: depenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une dépense par ID
// @route   GET /api/depenses/:id
// @access  Private
export const getDepense = async (req, res, next) => {
  try {
    const depense = await Depense.findById(req.params.id).populate(
      "balle",
      "nom numero",
    );

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: "Dépense non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      data: depense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle dépense
// @route   POST /api/depenses
// @access  Private (Admin only)
export const createDepense = async (req, res, next) => {
  try {
    const { balle } = req.body;

    // Si une balle est spécifiée, vérifier qu'elle existe
    if (balle) {
      const balleDoc = await Balle.findById(balle);

      if (!balleDoc) {
        return res.status(404).json({
          success: false,
          message: "Balle non trouvée",
        });
      }

      // Mettre à jour les dépenses de la balle
      balleDoc.depensesLiees += req.body.montant;
      balleDoc.calculerBenefice();
      await balleDoc.save();
    }

    const depense = await Depense.create(req.body);

    await depense.populate("balle", "nom numero");

    res.status(201).json({
      success: true,
      data: depense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une dépense
// @route   PUT /api/depenses/:id
// @access  Private (Admin only)
export const updateDepense = async (req, res, next) => {
  try {
    let depense = await Depense.findById(req.params.id);

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: "Dépense non trouvée",
      });
    }

    const ancienMontant = depense.montant;
    const ancienneBalle = depense.balle;

    depense = await Depense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("balle", "nom numero");

    // Mettre à jour les statistiques des balles si nécessaire
    if (ancienneBalle) {
      const ancienneBalleDoc = await Balle.findById(ancienneBalle);
      if (ancienneBalleDoc) {
        ancienneBalleDoc.depensesLiees -= ancienMontant;
        ancienneBalleDoc.calculerBenefice();
        await ancienneBalleDoc.save();
      }
    }

    if (depense.balle) {
      const nouvelleBalleDoc = await Balle.findById(depense.balle);
      if (nouvelleBalleDoc) {
        nouvelleBalleDoc.depensesLiees += depense.montant;
        nouvelleBalleDoc.calculerBenefice();
        await nouvelleBalleDoc.save();
      }
    }

    res.status(200).json({
      success: true,
      data: depense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une dépense
// @route   DELETE /api/depenses/:id
// @access  Private (Admin only)
export const deleteDepense = async (req, res, next) => {
  try {
    const depense = await Depense.findById(req.params.id);

    if (!depense) {
      return res.status(404).json({
        success: false,
        message: "Dépense non trouvée",
      });
    }

    // Mettre à jour les statistiques de la balle si nécessaire
    if (depense.balle) {
      const balle = await Balle.findById(depense.balle);
      if (balle) {
        balle.depensesLiees -= depense.montant;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    await depense.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des dépenses
// @route   GET /api/depenses/stats/summary
// @access  Private
export const getDepensesStats = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = {};

    if (dateDebut || dateFin) {
      matchQuery.dateDepense = {};
      if (dateDebut) {
        matchQuery.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateDepense.$lte = new Date(dateFin);
      }
    }

    const stats = await Depense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalDepenses: { $sum: "$montant" },
          nombreDepenses: { $sum: 1 },
        },
      },
    ]);

    const statsByType = await Depense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$montant" },
          count: { $sum: 1 },
        },
      },
    ]);

    const depensesGlobales = await Depense.aggregate([
      {
        $match: {
          ...matchQuery,
          balle: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$montant" },
        },
      },
    ]);

    const depensesParBalle = await Depense.aggregate([
      {
        $match: {
          ...matchQuery,
          balle: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$montant" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalDepenses: 0,
          nombreDepenses: 0,
        },
        byType: statsByType,
        depensesGlobales: depensesGlobales[0]?.total || 0,
        depensesParBalle: depensesParBalle[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
