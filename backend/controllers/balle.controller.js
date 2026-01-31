import Balle from "../models/balle.model.js";
import Depense from "../models/depense.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir toutes les balles
// @route   GET /api/balles
// @access  Private
export const getBalles = async (req, res, next) => {
  try {
    const { statut, search } = req.query;

    let query = {};

    if (statut) {
      query.statut = statut;
    }

    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { numero: { $regex: search, $options: "i" } },
      ];
    }

    const balles = await Balle.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: balles.length,
      data: balles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une balle par ID
// @route   GET /api/balles/:id
// @access  Private
export const getBalle = async (req, res, next) => {
  try {
    const balle = await Balle.findById(req.params.id);

    if (!balle) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    // Récupérer les produits, ventes et dépenses associés
    const produits = await Produit.find({ balle: balle._id });
    const ventes = await Vente.find({ balle: balle._id }).populate("livreur");
    const depenses = await Depense.find({ balle: balle._id });

    res.status(200).json({
      success: true,
      data: {
        balle,
        produits,
        ventes,
        depenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle balle
// @route   POST /api/balles
// @access  Private (Admin only)
export const createBalle = async (req, res, next) => {
  try {
    const balle = await Balle.create(req.body);

    res.status(201).json({
      success: true,
      data: balle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une balle
// @route   PUT /api/balles/:id
// @access  Private (Admin only)
export const updateBalle = async (req, res, next) => {
  try {
    let balle = await Balle.findById(req.params.id);

    if (!balle) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    balle = await Balle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: balle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une balle
// @route   DELETE /api/balles/:id
// @access  Private (Admin only)
export const deleteBalle = async (req, res, next) => {
  try {
    const balle = await Balle.findById(req.params.id);

    if (!balle) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    // Vérifier s'il y a des ventes associées
    const ventesCount = await Vente.countDocuments({ balle: balle._id });

    if (ventesCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer une balle avec des ventes associées",
      });
    }

    // Supprimer les produits associés
    await Produit.deleteMany({ balle: balle._id });

    // Supprimer les dépenses associées
    await Depense.deleteMany({ balle: balle._id });

    await balle.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Recalculer les statistiques d'une balle
// @route   PUT /api/balles/:id/recalculate
// @access  Private (Admin only)
export const recalculateStats = async (req, res, next) => {
  try {
    const balle = await Balle.findById(req.params.id);

    if (!balle) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    // Calculer le total des ventes
    const ventes = await Vente.find({
      balle: balle._id,
      statutLivraison: { $ne: "annulé" },
    });

    balle.totalVentes = ventes.reduce((sum, vente) => sum + vente.prixVente, 0);
    balle.nombreVentes = ventes.length;

    // Calculer les dépenses liées
    const depenses = await Depense.find({ balle: balle._id });
    balle.depensesLiees = depenses.reduce((sum, dep) => sum + dep.montant, 0);

    // Calculer le bénéfice
    balle.calculerBenefice();

    await balle.save();

    res.status(200).json({
      success: true,
      data: balle,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des balles
// @route   GET /api/balles/stats/summary
// @access  Private
export const getBallesStats = async (req, res, next) => {
  try {
    const stats = await Balle.aggregate([
      {
        $group: {
          _id: null,
          totalBalles: { $sum: 1 },
          totalInvesti: { $sum: "$prixAchat" },
          totalVentes: { $sum: "$totalVentes" },
          totalDepenses: { $sum: "$depensesLiees" },
          totalBenefice: { $sum: "$benefice" },
        },
      },
    ]);

    const statsByStatus = await Balle.aggregate([
      {
        $group: {
          _id: "$statut",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalBalles: 0,
          totalInvesti: 0,
          totalVentes: 0,
          totalDepenses: 0,
          totalBenefice: 0,
        },
        byStatus: statsByStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};
