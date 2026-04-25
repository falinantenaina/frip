import Balle from "../models/balle.model.js";
import Expedition from "../models/expedition.model.js";
import Livreur from "../models/livreur.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";
import { recalculerEtSauvegarderExpedition } from "./expedition.controller.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Populate standard d'une vente */
const POPULATE_VENTE = [
  { path: "balle", select: "nom numero" },
  { path: "produits.produit" },
  { path: "livreur", select: "nom telephone" },
];

/**
 * Mettre à jour l'expédition liée après modification d'une vente.
 * Puisque l'expédition référence directement les ventes (plus de copie),
 * il suffit de recalculer ses totaux.
 * Si la vente est annulée, on la retire du tableau de ventes de l'expédition.
 */
async function syncExpedition(vente) {
  if (!vente.expedition) return;

  const expedition = await Expedition.findById(vente.expedition);
  if (!expedition) return;

  if (vente.statutLivraison === "annulé") {
    // Retirer la vente de l'expédition et détacher
    expedition.ventes = expedition.ventes.filter(
      (id) => id.toString() !== vente._id.toString(),
    );
    await Vente.findByIdAndUpdate(vente._id, { expedition: null });
  }
  // Qu'elle soit annulée ou simplement modifiée, on recalcule les totaux
  await recalculerEtSauvegarderExpedition(expedition);
}

/** Synchroniser les stats d'une balle après modification d'une vente */
async function syncBalle(balleId, ancienTotal, nouveauTotal, diffNbVentes = 0) {
  if (!balleId) return;
  const balle = await Balle.findById(balleId);
  if (!balle) return;
  balle.totalVentes = (balle.totalVentes || 0) + (nouveauTotal - ancienTotal);
  balle.nombreVentes = Math.max(0, (balle.nombreVentes || 0) + diffNbVentes);
  if (balle.calculerBenefice) balle.calculerBenefice();
  await balle.save();
}

// ── GET /ventes ───────────────────────────────────────────────────────────────
export const getVentes = async (req, res, next) => {
  try {
    const {
      balle,
      statutLivraison,
      livreur,
      dateDebut,
      dateFin,
      typeVente,
      categorie,
    } = req.query;
    const query = {};

    if (balle) query.balle = balle;
    if (statutLivraison) query.statutLivraison = statutLivraison;
    if (livreur) query.livreur = livreur;
    if (typeVente) query.typeVente = typeVente;
    if (categorie) query.categorie = categorie;
    if (dateDebut || dateFin) {
      query.dateVente = {};
      if (dateDebut) query.dateVente.$gte = new Date(dateDebut);
      if (dateFin) query.dateVente.$lte = new Date(dateFin);
    }

    const ventes = await Vente.find(query)
      .populate(POPULATE_VENTE)
      .sort({ dateVente: -1 });

    res.json({ success: true, count: ventes.length, data: ventes });
  } catch (err) {
    next(err);
  }
};

// ── GET /ventes/:id ───────────────────────────────────────────────────────────
export const getVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id).populate(POPULATE_VENTE);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── POST /ventes ──────────────────────────────────────────────────────────────
export const createVente = async (req, res, next) => {
  try {
    const {
      nomClient,
      telephoneClient,
      destinationClient = "Local",
      typeVente = "libre",
      balle: balleId,
      produit: produitId,
      nomProduit,
      tailleProduit,
      prixVente,
      prixAchat = 0,
      categorie = "autres",
      livreur: livreurId,
      fraisLivraison = 0,
      lieuLivraison = "",
      statutLivraison = "en_attente",
      commentaires = "",
    } = req.body;

    // ── Validation balle ──────────────────────────────────────────────────
    let balleDoc = null;
    if (typeVente === "balle") {
      balleDoc = await Balle.findById(balleId);
      if (!balleDoc)
        return res
          .status(404)
          .json({ success: false, message: "Balle non trouvée" });
    }

    // ── Validation produit référencé ──────────────────────────────────────
    let produitDoc = null;
    if (produitId) {
      produitDoc = await Produit.findById(produitId);
      if (!produitDoc)
        return res
          .status(404)
          .json({ success: false, message: "Produit non trouvé" });
      if (produitDoc.statut !== "disponible") {
        return res.status(400).json({
          success: false,
          message: "Ce produit n'est plus disponible",
        });
      }
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    // ── Validation livreur ────────────────────────────────────────────────
    if (livreurId) {
      const livreurDoc = await Livreur.findById(livreurId);
      if (!livreurDoc)
        return res
          .status(404)
          .json({ success: false, message: "Livreur non trouvé" });
    }

    // ── Construire le premier produit ─────────────────────────────────────
    const premierProduit = {
      produit: produitDoc?._id || null,
      nomProduit: nomProduit || produitDoc?.nom || "",
      tailleProduit: tailleProduit || produitDoc?.taille || "",
      prixVente: Number(prixVente) || 0,
      prixAchat: Number(prixAchat) || 0,
      categorie,
    };

    // ── Créer la vente ────────────────────────────────────────────────────
    const nouvelleVente = await Vente.create({
      balle: balleDoc?._id || null,
      typeVente,
      produits: [premierProduit],
      nomProduit: premierProduit.nomProduit,
      tailleProduit: premierProduit.tailleProduit,
      nomClient,
      telephoneClient,
      destinationClient,
      livreur: livreurId || null,
      fraisLivraison: Number(fraisLivraison) || 0,
      lieuLivraison,
      statutLivraison,
      commentaires,
    });

    // ── Sync balle ────────────────────────────────────────────────────────
    if (balleDoc) {
      await syncBalle(balleDoc._id, 0, nouvelleVente.prixVente, 1);
    }

    // ── Sync livreur ──────────────────────────────────────────────────────
    if (livreurId) {
      await Livreur.findByIdAndUpdate(livreurId, {
        $inc: { nombreLivraisons: 1 },
      });
    }

    await nouvelleVente.populate(POPULATE_VENTE);
    return res.status(201).json({ success: true, data: nouvelleVente });
  } catch (err) {
    next(err);
  }
};

// ── PUT /ventes/:id ───────────────────────────────────────────────────────────
export const updateVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une vente annulée",
      });
    }

    const CHAMPS_EDITABLES = [
      "nomClient",
      "telephoneClient",
      "destinationClient",
      "livreur",
      "fraisLivraison",
      "lieuLivraison",
      "statutLivraison",
      "commentaires",
      "raisonAnnulation",
    ];

    CHAMPS_EDITABLES.forEach((champ) => {
      if (req.body[champ] !== undefined) vente[champ] = req.body[champ];
    });

    // Mettre à jour dateLivraison si passage à "livré"
    if (
      req.body.statutLivraison === "livré" &&
      vente.statutLivraison !== "livré"
    ) {
      vente.dateLivraison = new Date();
    }

    await vente.save(); // pre-save recalcule montantTotal

    // Recalcul des totaux de l'expédition liée (source unique = les ventes)
    await syncExpedition(vente);

    await vente.populate(POPULATE_VENTE);
    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── POST /ventes/:id/produits ─────────────────────────────────────────────────
export const ajouterProduitVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une vente annulée",
      });
    }

    const {
      produit: produitId,
      nomProduit,
      tailleProduit,
      prixVente,
      prixAchat = 0,
      categorie = "autres",
    } = req.body;

    const ancienTotal = vente.prixVente || 0;

    let produitDoc = null;
    if (produitId) {
      produitDoc = await Produit.findById(produitId);
      if (!produitDoc)
        return res
          .status(404)
          .json({ success: false, message: "Produit non trouvé" });
      if (produitDoc.statut !== "disponible")
        return res
          .status(400)
          .json({
            success: false,
            message: "Ce produit n'est plus disponible",
          });
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    vente.produits.push({
      produit: produitDoc?._id || null,
      nomProduit: nomProduit || produitDoc?.nom || "",
      tailleProduit: tailleProduit || produitDoc?.taille || "",
      prixVente: Number(prixVente) || 0,
      prixAchat: Number(prixAchat) || 0,
      categorie,
    });

    await vente.save();

    if (vente.balle) {
      await syncBalle(vente.balle, ancienTotal, vente.prixVente, 1);
    }

    // L'expédition recalcule ses totaux depuis les vraies données de la vente
    await syncExpedition(vente);
    await vente.populate(POPULATE_VENTE);

    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── PUT /ventes/:id/produits/:produitEntryId ──────────────────────────────────
export const modifierProduitVente = async (req, res, next) => {
  try {
    const { id, produitEntryId } = req.params;
    const vente = await Vente.findById(id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une vente annulée",
      });
    }

    const produitEntry = vente.produits.id(produitEntryId);
    if (!produitEntry) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Produit non trouvé dans cette vente",
        });
    }

    const ancienTotal = vente.prixVente || 0;

    // Changement de référence produit
    const { produit: nouveauProduitId } = req.body;
    if (
      nouveauProduitId &&
      produitEntry.produit?.toString() !== nouveauProduitId
    ) {
      if (produitEntry.produit) {
        await Produit.findByIdAndUpdate(produitEntry.produit, {
          statut: "disponible",
        });
      }
      const nouveauProduit = await Produit.findByIdAndUpdate(
        nouveauProduitId,
        { statut: "vendu" },
        { new: true },
      );
      if (!nouveauProduit) {
        return res
          .status(404)
          .json({ success: false, message: "Nouveau produit introuvable" });
      }
      produitEntry.produit = nouveauProduitId;
    }

    const { nomProduit, tailleProduit, prixVente, prixAchat, categorie } =
      req.body;
    if (nomProduit !== undefined) produitEntry.nomProduit = nomProduit;
    if (tailleProduit !== undefined) produitEntry.tailleProduit = tailleProduit;
    if (prixVente !== undefined) produitEntry.prixVente = Number(prixVente);
    if (prixAchat !== undefined) produitEntry.prixAchat = Number(prixAchat);
    if (categorie !== undefined) produitEntry.categorie = categorie;

    await vente.save(); // pre-save recalcule tout

    if (vente.balle) {
      await syncBalle(vente.balle, ancienTotal, vente.prixVente, 0);
    }

    // L'expédition recalcule ses totaux depuis les vraies données de la vente
    await syncExpedition(vente);
    await vente.populate(POPULATE_VENTE);

    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /ventes/:id/produits/:produitEntryId ───────────────────────────────
export const supprimerProduitVente = async (req, res, next) => {
  try {
    const { id, produitEntryId } = req.params;
    const vente = await Vente.findById(id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

    const entryIndex = vente.produits.findIndex(
      (p) => p._id.toString() === produitEntryId,
    );
    if (entryIndex === -1) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Produit non trouvé dans cette vente",
        });
    }

    const entry = vente.produits[entryIndex];
    const ancienTotal = vente.prixVente || 0;

    if (entry.produit) {
      await Produit.findByIdAndUpdate(entry.produit, { statut: "disponible" });
    }

    vente.produits.splice(entryIndex, 1);
    await vente.save();

    if (vente.balle) {
      await syncBalle(vente.balle, ancienTotal, vente.prixVente, -1);
    }

    // L'expédition recalcule ses totaux depuis les vraies données de la vente
    await syncExpedition(vente);
    await vente.populate(POPULATE_VENTE);

    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── PUT /ventes/:id/annuler ───────────────────────────────────────────────────
export const annulerVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé") {
      return res
        .status(400)
        .json({ success: false, message: "Cette vente est déjà annulée" });
    }

    const ancienTotal = vente.prixVente || 0;
    const nbProduits = vente.produits?.length || 0;

    for (const entry of vente.produits || []) {
      if (entry.produit) {
        await Produit.findByIdAndUpdate(entry.produit, {
          statut: "disponible",
        });
      }
    }

    if (vente.balle) {
      await syncBalle(vente.balle, ancienTotal, 0, -nbProduits);
    }

    vente.statutLivraison = "annulé";
    vente.raisonAnnulation = req.body.raisonAnnulation || "Non spécifiée";
    await vente.save();

    // Retire la vente de l'expédition et recalcule
    await syncExpedition(vente);
    await vente.populate(POPULATE_VENTE);

    res.json({ success: true, data: vente });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /ventes/:id ────────────────────────────────────────────────────────
export const deleteVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

    if (vente.statutLivraison !== "annulé") {
      for (const entry of vente.produits || []) {
        if (entry.produit) {
          await Produit.findByIdAndUpdate(entry.produit, {
            statut: "disponible",
          });
        }
      }
      if (vente.balle) {
        await syncBalle(
          vente.balle,
          vente.prixVente,
          0,
          -(vente.produits?.length || 0),
        );
      }

      // Retirer la vente de l'expédition et recalculer avant suppression
      if (vente.expedition) {
        const expedition = await Expedition.findById(vente.expedition);
        if (expedition) {
          expedition.ventes = expedition.ventes.filter(
            (id) => id.toString() !== vente._id.toString(),
          );
          await recalculerEtSauvegarderExpedition(expedition);
        }
      }
    }

    await vente.deleteOne();
    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// ── GET /ventes/stats/summary ─────────────────────────────────────────────────
export const getVentesStats = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const matchQuery = { statutLivraison: { $ne: "annulé" } };

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) matchQuery.dateVente.$gte = new Date(dateDebut);
      if (dateFin) matchQuery.dateVente.$lte = new Date(dateFin);
    }

    const [global, byType, byStatus] = await Promise.all([
      Vente.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalVentes: { $sum: 1 },
            montantTotal: { $sum: "$montantTotal" },
            prixVenteTotal: { $sum: "$prixVente" },
            totalAchat: { $sum: "$totalAchat" },
            totalBenefice: { $sum: "$totalBenefice" },
            fraisLivraisonTotal: { $sum: "$fraisLivraison" },
          },
        },
      ]),
      Vente.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$typeVente",
            count: { $sum: 1 },
            prixVente: { $sum: "$prixVente" },
            totalBenefice: { $sum: "$totalBenefice" },
          },
        },
      ]),
      Vente.aggregate([
        { $match: { statutLivraison: { $ne: "annulé" } } },
        { $group: { _id: "$statutLivraison", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        global: global[0] || {
          totalVentes: 0,
          montantTotal: 0,
          prixVenteTotal: 0,
          totalAchat: 0,
          totalBenefice: 0,
          fraisLivraisonTotal: 0,
        },
        byType,
        byStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};
