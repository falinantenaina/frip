import Balle from "../models/balle.model.js";
import Livreur from "../models/livreur.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir toutes les ventes
// @route   GET /api/ventes
// @access  Private
export const getVentes = async (req, res, next) => {
  try {
    const { balle, statutLivraison, livreur, dateDebut, dateFin } = req.query;

    let query = {};

    if (balle) {
      query.balle = balle;
    }

    if (statutLivraison) {
      query.statutLivraison = statutLivraison;
    }

    if (livreur) {
      query.livreur = livreur;
    }

    if (dateDebut || dateFin) {
      query.dateVente = {};
      if (dateDebut) {
        query.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        query.dateVente.$lte = new Date(dateFin);
      }
    }

    const ventes = await Vente.find(query)
      .populate("balle", "nom numero")
      .populate("produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    res.status(200).json({
      success: true,
      count: ventes.length,
      data: ventes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une vente par ID
// @route   GET /api/ventes/:id
// @access  Private
export const getVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id)
      .populate("balle", "nom numero prixAchat")
      .populate("produit")
      .populate("livreur", "nom telephone");

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: "Vente non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      data: vente,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle vente
// @route   POST /api/ventes
// @access  Private (Admin only)
export const createVente = async (req, res, next) => {
  try {
    const { balle, produit, livreur } = req.body;

    // Vérifier que la balle existe
    const balleDoc = await Balle.findById(balle);
    if (!balleDoc) {
      return res.status(404).json({
        success: false,
        message: "Balle non trouvée",
      });
    }

    // Si un produit est spécifié, vérifier qu'il existe et est disponible
    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);

      if (!produitDoc) {
        return res.status(404).json({
          success: false,
          message: "Produit non trouvé",
        });
      }

      if (produitDoc.statut !== "disponible") {
        return res.status(400).json({
          success: false,
          message: "Ce produit n'est plus disponible",
        });
      }

      // Marquer le produit comme vendu
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    // Vérifier que le livreur existe
    if (livreur) {
      const livreurDoc = await Livreur.findById(livreur);
      if (!livreurDoc) {
        return res.status(404).json({
          success: false,
          message: "Livreur non trouvé",
        });
      }
    }

    // Créer la vente
    const vente = await Vente.create(req.body);

    // Mettre à jour les statistiques de la balle
    balleDoc.totalVentes += vente.prixVente;
    balleDoc.nombreVentes += 1;
    balleDoc.calculerBenefice();
    await balleDoc.save();

    // Incrémenter le nombre de livraisons du livreur
    if (livreur) {
      await Livreur.findByIdAndUpdate(livreur, {
        $inc: { nombreLivraisons: 1 },
      });
    }

    await vente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    res.status(201).json({
      success: true,
      data: vente,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une vente
// @route   PUT /api/ventes/:id
// @access  Private (Admin only)
export const updateVente = async (req, res, next) => {
  try {
    let vente = await Vente.findById(req.params.id);

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: "Vente non trouvée",
      });
    }

    const ancienStatut = vente.statutLivraison;

    vente = await Vente.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    // Si le statut passe à "livré", enregistrer la date
    if (ancienStatut !== "livré" && vente.statutLivraison === "livré") {
      vente.dateLivraison = new Date();
      await vente.save();
    }

    res.status(200).json({
      success: true,
      data: vente,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Annuler une vente
// @route   PUT /api/ventes/:id/annuler
// @access  Private (Admin only)
export const annulerVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: "Vente non trouvée",
      });
    }

    if (vente.statutLivraison === "annulé") {
      return res.status(400).json({
        success: false,
        message: "Cette vente est déjà annulée",
      });
    }

    // Remettre le produit comme disponible
    if (vente.produit) {
      await Produit.findByIdAndUpdate(vente.produit, {
        statut: "disponible",
      });
    }

    // Mettre à jour les statistiques de la balle
    const balle = await Balle.findById(vente.balle);
    if (balle) {
      balle.totalVentes -= vente.prixVente;
      balle.nombreVentes -= 1;
      balle.calculerBenefice();
      await balle.save();
    }

    // Annuler la vente
    vente.statutLivraison = "annulé";
    vente.raisonAnnulation = req.body.raisonAnnulation || "Non spécifiée";
    await vente.save();

    await vente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    res.status(200).json({
      success: true,
      data: vente,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une vente
// @route   DELETE /api/ventes/:id
// @access  Private (Admin only)
export const deleteVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);

    if (!vente) {
      return res.status(404).json({
        success: false,
        message: "Vente non trouvée",
      });
    }

    // Remettre le produit comme disponible si non annulé
    if (vente.produit && vente.statutLivraison !== "annulé") {
      await Produit.findByIdAndUpdate(vente.produit, {
        statut: "disponible",
      });
    }

    // Mettre à jour les statistiques de la balle
    if (vente.statutLivraison !== "annulé") {
      const balle = await Balle.findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    await vente.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des ventes
// @route   GET /api/ventes/stats/summary
// @access  Private
export const getVentesStats = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = { statutLivraison: { $ne: "annulé" } };

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) {
        matchQuery.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateVente.$lte = new Date(dateFin);
      }
    }

    const stats = await Vente.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalVentes: { $sum: 1 },
          montantTotal: { $sum: "$montantTotal" },
          fraisLivraisonTotal: { $sum: "$fraisLivraison" },
        },
      },
    ]);

    const statsByStatus = await Vente.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$statutLivraison",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalVentes: 0,
          montantTotal: 0,
          fraisLivraisonTotal: 0,
        },
        byStatus: statsByStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};
