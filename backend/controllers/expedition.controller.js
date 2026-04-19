import Expedition from "../models/expedition.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir toutes les expéditions
// @route   GET /api/expeditions
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
export const getExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);

    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const venteIds = [
      ...new Set(
        expedition.produits
          .filter((p) => p.vente)
          .map((p) => p.vente.toString()),
      ),
    ];

    const ventes = await Vente.find({ _id: { $in: venteIds } })
      .populate("balle", "nom numero")
      .populate("produits.produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    res.status(200).json({ success: true, data: { expedition, ventes } });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une expédition
// @route   POST /api/expeditions
export const createExpedition = async (req, res, next) => {
  try {
    const expedition = new Expedition(req.body);
    await expedition.save();
    res.status(201).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une expédition
// @route   PUT /api/expeditions/:id
export const updateExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const fields = [
      "nom",
      "destination",
      "dateExpedition",
      "statut",
      "notes",
      "fraisColis",
      "modeCommissionnaire",
      "pourcentageCommissionnaire",
      "salaireCommissionnaire",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) expedition[f] = req.body[f];
    });

    await expedition.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une expédition
// @route   DELETE /api/expeditions/:id
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
export const ajouterProduitsExpedition = async (req, res, next) => {
  try {
    const expedition = await Expedition.findById(req.params.id);
    if (!expedition) {
      return res
        .status(404)
        .json({ success: false, message: "Expédition non trouvée" });
    }

    const { produits } = req.body;
    if (!produits || !Array.isArray(produits)) {
      return res
        .status(400)
        .json({ success: false, message: "Produits invalides" });
    }

    expedition.produits.push(...produits);
    await expedition.save();

    const venteIds = [
      ...new Set(produits.filter((p) => p.vente).map((p) => p.vente)),
    ];
    if (venteIds.length > 0) {
      await Vente.updateMany(
        { _id: { $in: venteIds } },
        { expedition: expedition._id },
      );
    }

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Retirer un produit d'une expédition
// @route   DELETE /api/expeditions/:id/produits/:produitId
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
          totalBeneficeVentes: { $sum: "$totalBeneficeVentes" },
          totalBenefice: { $sum: "$benefice" },
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
          totalBenefice: { $sum: "$benefice" },
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
          totalBeneficeVentes: 0,
          totalBenefice: 0,
        },
        byDestination: statsByDestination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ventes disponibles pour expédition
// @route   GET /api/expeditions/ventes-disponibles
export const getVentesDisponiblesExpedition = async (req, res, next) => {
  try {
    const { destination } = req.query;

    const filter = {
      statutLivraison: { $in: ["en_attente", "en_cours"] },
      expedition: null,
    };

    if (destination) {
      filter.destinationClient = { $regex: destination, $options: "i" };
    }

    const ventes = await Vente.find(filter)
      .populate("balle", "nom numero")
      .sort({ dateVente: -1 });

    res.status(200).json({ success: true, count: ventes.length, data: ventes });
  } catch (error) {
    next(error);
  }
};

// @desc    Expéditions en préparation
// @route   GET /api/expeditions/en-preparation
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

// @desc    Annuler une vente depuis une expédition
// @route   PUT /api/expeditions/:id/annuler-vente/:venteId
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

    for (const entry of vente.produits || []) {
      if (entry.produit) {
        await Vente.db
          .model("Produit")
          .findByIdAndUpdate(entry.produit, { statut: "disponible" });
      }
    }

    if (vente.balle) {
      const balle = await Vente.db.model("Balle").findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= vente.produits?.length || 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    vente.statutLivraison = "annulé";
    vente.raisonAnnulation =
      req.body.raisonAnnulation || "Annulée depuis l'expédition";
    vente.expedition = null;
    await vente.save();

    expedition.produits = expedition.produits.filter(
      (p) => p.vente?.toString() !== vente._id.toString(),
    );
    await expedition.save();

    const venteIds = [
      ...new Set(
        expedition.produits
          .filter((p) => p.vente)
          .map((p) => p.vente.toString()),
      ),
    ];
    const ventes = await Vente.find({ _id: { $in: venteIds } })
      .populate("balle", "nom numero")
      .populate("produits.produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    res.status(200).json({ success: true, data: { expedition, ventes } });
  } catch (error) {
    next(error);
  }
};

// @desc    Détacher une vente d'une expédition (sans l'annuler)
// @route   PUT /api/expeditions/:id/detacher-vente/:venteId
export const detacherVenteExpedition = async (req, res, next) => {
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

    // Retirer les produits de cette vente de l'expédition
    expedition.produits = expedition.produits.filter(
      (p) => p.vente?.toString() !== vente._id.toString(),
    );
    await expedition.save();

    // Détacher la vente sans l'annuler
    vente.expedition = null;
    await vente.save();

    const venteIds = [
      ...new Set(
        expedition.produits
          .filter((p) => p.vente)
          .map((p) => p.vente.toString()),
      ),
    ];
    const ventes = await Vente.find({ _id: { $in: venteIds } })
      .populate("balle", "nom numero")
      .populate("produits.produit")
      .populate("livreur", "nom telephone")
      .sort({ dateVente: -1 });

    res.status(200).json({ success: true, data: { expedition, ventes } });
  } catch (error) {
    next(error);
  }
};

// @desc    Marquer une expédition comme expédiée
// @route   PUT /api/expeditions/:id/expedier
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

    expedition.statut = "expédiée";
    expedition.dateExpedition = req.body.dateExpedition
      ? new Date(req.body.dateExpedition)
      : new Date();

    if (req.body.fraisColis !== undefined)
      expedition.fraisColis = Number(req.body.fraisColis);
    if (req.body.modeCommissionnaire !== undefined)
      expedition.modeCommissionnaire = req.body.modeCommissionnaire;
    if (req.body.pourcentageCommissionnaire !== undefined)
      expedition.pourcentageCommissionnaire = Number(
        req.body.pourcentageCommissionnaire,
      );
    if (req.body.salaireCommissionnaire !== undefined)
      expedition.salaireCommissionnaire = Number(
        req.body.salaireCommissionnaire,
      );

    await expedition.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};

// @desc    Rattacher une vente à une expédition
// @route   PUT /api/expeditions/:id/rattacher-vente
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

    const produitsAjoutes = (
      vente.produits && vente.produits.length > 0
        ? vente.produits
        : [
            {
              nomProduit: vente.nomProduit,
              tailleProduit: vente.tailleProduit,
              prixVente: vente.prixVente,
              prixAchat: 0,
            },
          ]
    ).map((p) => ({
      vente: vente._id,
      nomProduit: p.nomProduit,
      tailleProduit: p.tailleProduit,
      prixVente: p.prixVente,
      prixAchat: p.prixAchat || 0,
    }));

    expedition.produits.push(...produitsAjoutes);
    await expedition.save();

    vente.expedition = expedition._id;
    await vente.save();

    res.status(200).json({ success: true, data: expedition });
  } catch (error) {
    next(error);
  }
};
