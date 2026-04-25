import Expedition from "../models/expedition.model.js";
import Vente from "../models/vente.model.js";

// ── Helper : populate standard des ventes d'une expédition ──────────────────
const POPULATE_VENTES_EXPEDITION = [
  { path: "balle", select: "nom numero" },
  { path: "produits.produit" },
  { path: "livreur", select: "nom telephone" },
];

/** Charge et retourne les ventes peuplées d'une expédition */
async function getVentesPopulees(expedition) {
  return Vente.find({ _id: { $in: expedition.ventes } })
    .populate(POPULATE_VENTES_EXPEDITION)
    .sort({ dateVente: -1 });
}

/**
 * Recalcule les totaux de l'expédition depuis ses ventes, puis sauvegarde.
 * À appeler après toute modification des ventes rattachées.
 */
export async function recalculerEtSauvegarderExpedition(expedition) {
  const ventes = await getVentesPopulees(expedition);
  expedition.recalculerDepuisVentes(ventes);
  await expedition.save();
  return { expedition, ventes };
}

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

    const ventes = await getVentesPopulees(expedition);

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

// @desc    Mettre à jour les infos générales d'une expédition (pas les ventes)
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

    // Recalcul complet avec les ventes actuelles
    const { expedition: saved, ventes } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({ success: true, data: { expedition: saved, ventes } });
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

    // Détacher toutes les ventes liées
    if (expedition.ventes.length > 0) {
      await Vente.updateMany(
        { _id: { $in: expedition.ventes } },
        { expedition: null },
      );
    }

    await expedition.deleteOne();
    res.status(200).json({ success: true, data: {} });
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
    if (vente.statutLivraison === "annulé") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Impossible de rattacher une vente annulée",
        });
    }

    // Éviter les doublons
    const dejaRattachee = expedition.ventes.some(
      (id) => id.toString() === venteId.toString(),
    );
    if (dejaRattachee) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cette vente est déjà rattachée à cette expédition",
        });
    }

    expedition.ventes.push(vente._id);
    await Vente.findByIdAndUpdate(vente._id, { expedition: expedition._id });

    const { expedition: saved, ventes } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({ success: true, data: { expedition: saved, ventes } });
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

    expedition.ventes = expedition.ventes.filter(
      (id) => id.toString() !== vente._id.toString(),
    );
    await Vente.findByIdAndUpdate(vente._id, { expedition: null });

    const { expedition: saved, ventes } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({ success: true, data: { expedition: saved, ventes } });
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

    // Remettre les produits référencés en stock
    for (const entry of vente.produits || []) {
      if (entry.produit) {
        await Vente.db
          .model("Produit")
          .findByIdAndUpdate(entry.produit, { statut: "disponible" });
      }
    }

    // Sync balle
    if (vente.balle) {
      const balle = await Vente.db.model("Balle").findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= vente.produits?.length || 1;
        if (balle.calculerBenefice) balle.calculerBenefice();
        await balle.save();
      }
    }

    // Annuler la vente et la détacher de l'expédition
    vente.statutLivraison = "annulé";
    vente.raisonAnnulation =
      req.body.raisonAnnulation || "Annulée depuis l'expédition";
    vente.expedition = null;
    await vente.save();

    // Retirer la vente du tableau
    expedition.ventes = expedition.ventes.filter(
      (id) => id.toString() !== vente._id.toString(),
    );

    const { expedition: saved, ventes } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({ success: true, data: { expedition: saved, ventes } });
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

    const { expedition: saved, ventes } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({ success: true, data: { expedition: saved, ventes } });
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

    const [stats, statsByDestination] = await Promise.all([
      Expedition.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalExpeditions: { $sum: 1 },
            totalFrais: { $sum: "$totalFrais" },
            totalVentes: { $sum: "$totalVentes" },
            // Nombre total de ventes rattachées
            totalVentesRattachees: { $sum: { $size: "$ventes" } },
            totalFraisColis: { $sum: "$fraisColis" },
            totalSalaire: { $sum: "$salaireCommissionnaire" },
            totalBeneficeVentes: { $sum: "$totalBeneficeVentes" },
            totalBenefice: { $sum: "$benefice" },
          },
        },
      ]),
      Expedition.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$destination",
            count: { $sum: 1 },
            totalVentes: { $sum: "$totalVentes" },
            totalBenefice: { $sum: "$benefice" },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalExpeditions: 0,
          totalFrais: 0,
          totalVentes: 0,
          totalVentesRattachees: 0,
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
      .select("_id nom destination dateExpedition ventes")
      .sort({ dateExpedition: -1 });

    res.status(200).json({ success: true, data: expeditions });
  } catch (error) {
    next(error);
  }
};

// ── Routes supprimées (remplacées par rattacherVente / detacherVente) ─────────
// ajouterProduitsExpedition → utilisez rattacherVente (une vente à la fois)
//   ou créez une version bulk ci-dessous si besoin.
// retirerProduitExpedition  → utilisez detacherVenteExpedition.

/**
 * @desc    Rattacher plusieurs ventes en une fois (bulk)
 * @route   POST /api/expeditions/:id/ventes   (optionnel, à ajouter dans la route)
 */
export const rattacherVentesBulk = async (req, res, next) => {
  try {
    const { venteIds } = req.body; // tableau d'IDs
    if (!Array.isArray(venteIds) || venteIds.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "venteIds doit être un tableau non vide",
        });
    }

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

    const existingIds = new Set(expedition.ventes.map((id) => id.toString()));
    const ventes = await Vente.find({
      _id: { $in: venteIds },
      statutLivraison: { $ne: "annulé" },
    });

    const nouvellesIds = ventes
      .filter((v) => !existingIds.has(v._id.toString()))
      .map((v) => v._id);

    if (nouvellesIds.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Aucune nouvelle vente valide à rattacher",
        });
    }

    expedition.ventes.push(...nouvellesIds);
    await Vente.updateMany(
      { _id: { $in: nouvellesIds } },
      { expedition: expedition._id },
    );

    const { expedition: saved, ventes: ventesPopulees } =
      await recalculerEtSauvegarderExpedition(expedition);

    res
      .status(200)
      .json({
        success: true,
        data: { expedition: saved, ventes: ventesPopulees },
      });
  } catch (error) {
    next(error);
  }
};
