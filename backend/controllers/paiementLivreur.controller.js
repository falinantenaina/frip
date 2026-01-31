import Livreur from "../models/livreur.model.js";
import PaiementLivreur from "../models/paiementLivreur.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir tous les paiements ou par livreur
// @route   GET /api/paiements-livreurs ou /api/livreurs/:livreurId/paiements
// @access  Private (Admin)
export const getPaiements = async (req, res) => {
  try {
    const { livreurId } = req.params;
    const { dateDebut, dateFin } = req.query;

    const filter = livreurId ? { livreur: livreurId } : {};

    // Filtre par date si fourni
    if (dateDebut || dateFin) {
      filter.datePaiement = {};
      if (dateDebut) filter.datePaiement.$gte = new Date(dateDebut);
      if (dateFin) filter.datePaiement.$lte = new Date(dateFin);
    }

    const paiements = await PaiementLivreur.find(filter)
      .populate("livreur", "nom telephone")
      .sort("-datePaiement");

    res.status(200).json({
      success: true,
      count: paiements.length,
      data: paiements,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des paiements",
      error: error.message,
    });
  }
};

// @desc    Obtenir un paiement par ID
// @route   GET /api/paiements-livreurs/:id
// @access  Private (Admin)
export const getPaiement = async (req, res) => {
  try {
    const paiement = await PaiementLivreur.findById(req.params.id)
      .populate("livreur", "nom telephone")
      .populate("ventes", "nomClient nomProduit prixVente");

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Paiement non trouvé",
      });
    }

    res.status(200).json({
      success: true,
      data: paiement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du paiement",
      error: error.message,
    });
  }
};

// @desc    Créer un paiement livreur
// @route   POST /api/paiements-livreurs
// @access  Private (Admin)
export const createPaiement = async (req, res) => {
  try {
    const { livreur, montantVerse, description, datePaiement } = req.body;

    // Vérifier que le livreur existe
    const livreurExists = await Livreur.findById(livreur);
    if (!livreurExists) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    const paiement = await PaiementLivreur.create({
      livreur,
      montantVerse,
      description,
      datePaiement: datePaiement || Date.now(),
    });

    const populatedPaiement = await PaiementLivreur.findById(
      paiement._id,
    ).populate("livreur", "nom telephone");

    res.status(201).json({
      success: true,
      data: populatedPaiement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la création du paiement",
      error: error.message,
    });
  }
};

// @desc    Mettre à jour un paiement
// @route   PUT /api/paiements-livreurs/:id
// @access  Private (Admin)
export const updatePaiement = async (req, res) => {
  try {
    let paiement = await PaiementLivreur.findById(req.params.id);

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Paiement non trouvé",
      });
    }

    paiement = await PaiementLivreur.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    ).populate("livreur", "nom telephone");

    res.status(200).json({
      success: true,
      data: paiement,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour du paiement",
      error: error.message,
    });
  }
};

// @desc    Supprimer un paiement
// @route   DELETE /api/paiements-livreurs/:id
// @access  Private (Admin)
export const deletePaiement = async (req, res) => {
  try {
    const paiement = await PaiementLivreur.findById(req.params.id);

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Paiement non trouvé",
      });
    }

    await paiement.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du paiement",
      error: error.message,
    });
  }
};

// @desc    Obtenir les statistiques de paiement d'un livreur
// @route   GET /api/livreurs/:livreurId/paiements/stats
// @access  Private (Admin)
export const getStatsPaiementsLivreur = async (req, res) => {
  try {
    const { livreurId } = req.params;

    // Vérifier que le livreur existe
    const livreur = await Livreur.findById(livreurId);
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    // Récupérer toutes les ventes livrées (avec prix de vente)
    const ventes = await Vente.find({
      livreur: livreurId,
      statutLivraison: { $ne: "annulé" },
    });

    const totalAVerser = ventes.reduce(
      (sum, vente) => sum + vente.prixVente,
      0,
    );

    // Récupérer tous les paiements
    const paiements = await PaiementLivreur.find({ livreur: livreurId });
    const totalVerse = paiements.reduce((sum, p) => sum + p.montantVerse, 0);

    const reste = totalAVerser - totalVerse;

    res.status(200).json({
      success: true,
      data: {
        totalAVerser,
        totalVerse,
        reste,
        nombreVentes: ventes.length,
        nombrePaiements: paiements.length,
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
