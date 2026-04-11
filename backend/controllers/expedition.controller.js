import Expedition from "../models/expedition.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir toutes les expéditions
// @route   GET /api/expeditions
// @access  Private
export const getExpeditions = async (req, res, next) => {
  try {
    const { statut, destination, dateDebut, dateFin } = req.query;
    let query = {};

    if (statut) query.statut = statut;
    if (destination) query.destination = { $regex: destination, $options: "i" };

    if (dateDebut || dateFin) {
      query.dateExpedition = {};
      if (dateDebut) query.dateExpedition.$gte = new Date(dateDebut);
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setDate(fin.getDate() + 1);
        query.dateExpedition.$lte = fin;
      }
    }

    const expeditions = await Expedition.find(query).sort({
      dateExpedition: -1,
    });

    res.status(200).json({
      success: true,
      count: expeditions.length,
      data: expeditions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une expédition avec le détail complet des ventes
// @route   GET /api/expeditions/:id
// @access  Private
export const getExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);

    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    // Récupérer toutes les ventes rattachées à cette expédition
    const ventes = await Vente.find({ expedition: expedition._id })
      .populate("balle", "nom numero")
      .populate("produits.produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    console.log(ventes);

    res.status(200).json({ success: true, data: { expedition, ventes } });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une expédition
// @route   POST /api/expeditions
// @access  Private (Admin)
export const createExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.create(req.body);
    res.status(201).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une expédition
// @route   PUT /api/expeditions/:id
// @access  Private (Admin)
export const updateExpedition = async (req, res, next) => {
  try {
    let expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    expedition = await Expedition.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une expédition
// @route   DELETE /api/expeditions/:id
// @access  Private (Admin)
export const deleteExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }
    await expedition.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Ajouter des produits/ventes à une expédition
// @route   POST /api/expeditions/:id/produits
// @access  Private (Admin)
export const ajouterProduitsExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const { produits } = req.body; // array de { vente?, nomProduit, tailleProduit, prixVente }
    if (!produits || !Array.isArray(produits)) {
      return res
        .status(400)
        .json({ success: false, message: "Produits invalides" });
    }

    expedition.produits.push(...produits);
    await expedition.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Retirer un produit d'une expédition
// @route   DELETE /api/expeditions/:id/produits/:produitId
// @access  Private (Admin)
export const retirerProduitExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const idx = expedition.produits.findIndex(
      (p) => p._id.toString() === req.params.produitId,
    );
    if (idx === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Produit non trouvé" });
    }

    expedition.produits.splice(idx, 1);
    await expedition.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Stats expéditions
// @route   GET /api/expeditions/stats/summary
// @access  Private
export const getExpeditionsStats = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    let match = {};
    if (dateDebut || dateFin) {
      match.dateExpedition = {};
      if (dateDebut) match.dateExpedition.$gte = new Date(dateDebut);
      if (dateFin) match.dateExpedition.$lte = new Date(dateFin);
    }

    const stats = await Expedition.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalExpeditions: { $sum: 1 },
          totalFrais: { $sum: "$totalFrais" },
          totalVentes: { $sum: "$totalVentes" },
          totalProduits: { $sum: { $size: "$produits" } },
          totalFraisColis: { $sum: "$fraisColis" },
          totalSalaire: { $sum: "$salaireCommissionnaire" },
        },
      },
    ]);

    const statsByDestination = await Expedition.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
          totalFrais: { $sum: "$totalFrais" },
          totalVentes: { $sum: "$totalVentes" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalExpeditions: 0,
          totalFrais: 0,
          totalVentes: 0,
          totalProduits: 0,
          totalFraisColis: 0,
          totalSalaire: 0,
        },
        byDestination: statsByDestination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ventes disponibles pour expédition (destination Antsirabe, non encore expédiées)
// @route   GET /api/expeditions/ventes-disponibles
// @access  Private
export const getVentesDisponiblesExpedition = async (req, res, next) => {
  try {
    const { destination } = req.query;

    const filter = {
      statutLivraison: { $in: ["en_attente", "en_cours"] },
      expedition: null, // pas encore rattachée à une expédition
    };

    if (destination) {
      filter.destinationClient = { $regex: destination, $options: "i" };
    }

    const ventes = await Vente.find(filter)
      .populate("balle", "nom numero")
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

// @desc    Expéditions en préparation (pour le formulaire de vente)
// @route   GET /api/expeditions/en-preparation
// @access  Private
export const getExpeditionsEnPreparation = async (req, res, next) => {
  try {
    const expeditions = await Expedition.find({ statut: "en_preparation" })
      .select("_id nom destination dateExpedition produits")
      .sort({ dateExpedition: -1 });

    res.status(200).json({ success: true, data: expeditions });
  } catch (error) {
    next(error);
  }
};

// @desc    Annuler une vente depuis une expédition (retire aussi de l'expédition)
// @route   PUT /api/expeditions/:id/annuler-vente/:venteId
// @access  Private (Admin)
export const annulerVenteExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const vente = await Vente.findById(req.params.venteId);
    if (!vente) {
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }
    if (vente.statutLivraison === "annulé") {
      return res
        .status(400)
        .json({ success: false, message: "Cette vente est déjà annulée" });
    }

    // Remettre les produits en stock
    for (const entry of vente.produits || []) {
      if (entry.produit) {
        await Vente.db
          .model("Produit")
          .findByIdAndUpdate(entry.produit, { statut: "disponible" });
      }
    }

    // Mettre à jour la balle si nécessaire
    if (vente.balle) {
      const balle = await Vente.db.model("Balle").findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= vente.produits?.length || 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    // Annuler la vente
    vente.statutLivraison = "annulé";
    vente.raisonAnnulation =
      req.body.raisonAnnulation || "Annulée depuis l'expédition";
    vente.expedition = null;
    await vente.save();

    // Retirer les produits de cette vente de l'expédition
    expedition.produits = expedition.produits.filter(
      (p) => p.vente?.toString() !== vente._id.toString(),
    );
    await expedition.save();

    // Retourner l'expédition mise à jour avec ses ventes
    const ventes = await Vente.find({ expedition: expedition._id })
      .populate("balle", "nom numero")
      .populate("produits.produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    res.status(200).json({ success: true, data: { expedition, ventes } });
  } catch (error) {
    next(error);
  }
};

// @desc    Marquer une expédition comme expédiée (et figer les frais)
// @route   PUT /api/expeditions/:id/expedier
// @access  Private (Admin)
export const expedierExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }
    if (expedition.statut !== "en_preparation") {
      return res.status(400).json({
        success: false,
        message: "Expédition déjà expédiée ou annulée",
      });
    }

    // Figer la date et passer au statut expédiée
    expedition.statut = "expédiée";
    expedition.dateExpedition = req.body.dateExpedition
      ? new Date(req.body.dateExpedition)
      : new Date();

    // Mettre à jour les frais si fournis
    if (req.body.fraisColis !== undefined)
      expedition.fraisColis = req.body.fraisColis;
    if (req.body.salaireCommissionnaire !== undefined)
      expedition.salaireCommissionnaire = req.body.salaireCommissionnaire;
    if (req.body.modeCommissionnaire !== undefined)
      expedition.modeCommissionnaire = req.body.modeCommissionnaire;
    if (req.body.pourcentageCommissionnaire !== undefined)
      expedition.pourcentageCommissionnaire =
        req.body.pourcentageCommissionnaire;

    await expedition.save(); // pre-save recalcule totalFrais

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Rattacher une vente à une expédition (depuis formulaire vente)
// @route   PUT /api/expeditions/:id/rattacher-vente
// @access  Private (Admin)
export const rattacherVente = async (req, res, next) => {
  try {
    const { venteId } = req.body;
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }
    if (expedition.statut !== "en_preparation") {
      return res.status(400).json({
        success: false,
        message: "Impossible d'ajouter à une expédition déjà expédiée",
      });
    }

    const vente = await Vente.findById(venteId);
    if (!vente) {
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }

    // Ajouter les produits de la vente à l'expédition
    const produitsAjoutes = (
      vente.produits && vente.produits.length > 0
        ? vente.produits
        : [
            {
              nomProduit: vente.nomProduit,
              tailleProduit: vente.tailleProduit,
              prixVente: vente.prixVente,
            },
          ]
    ).map((p) => ({
      vente: vente._id,
      nomProduit: p.nomProduit,
      tailleProduit: p.tailleProduit,
      prixVente: p.prixVente,
    }));

    expedition.produits.push(...produitsAjoutes);
    await expedition.save();

    // Marquer la vente comme rattachée
    vente.expedition = expedition._id;
    await vente.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};
