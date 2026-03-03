import Balle from "../models/balle.model.js";
import Livreur from "../models/livreur.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Retourne minuit (00:00:00.000) et 23:59:59.999 du jour de la date donnée.
 */
function jourCourant(date = new Date()) {
  const debut = new Date(date);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(date);
  fin.setHours(23, 59, 59, 999);
  return { debut, fin };
}

/**
 * Cherche une vente NON-annulée du même client (par téléphone) pour le même jour.
 * Si dateVente est fournie dans le body on l'utilise, sinon on prend aujourd'hui.
 */
async function trouverVenteMemeJour(telephoneClient, dateVente) {
  const { debut, fin } = jourCourant(
    dateVente ? new Date(dateVente) : new Date(),
  );
  return Vente.findOne({
    telephoneClient,
    statutLivraison: { $ne: "annulé" },
    dateVente: { $gte: debut, $lte: fin },
  });
}

// ─── Controllers ────────────────────────────────────────────────────────────

// @desc    Obtenir toutes les ventes
// @route   GET /api/ventes
// @access  Private
export const getVentes = async (req, res, next) => {
  try {
    const { balle, statutLivraison, livreur, dateDebut, dateFin } = req.query;

    let query = {};

    if (balle) query.balle = balle;
    if (statutLivraison) query.statutLivraison = statutLivraison;
    if (livreur) query.livreur = livreur;

    if (dateDebut || dateFin) {
      query.dateVente = {};
      if (dateDebut) query.dateVente.$gte = new Date(dateDebut);
      if (dateFin) query.dateVente.$lte = new Date(dateFin);
    }

    const ventes = await Vente.find(query)
      .populate("balle", "nom numero")
      .populate("produit")
      .populate("produits.produit")
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
      .populate("produits.produit")
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

// @desc    Créer une vente OU ajouter un produit à une vente existante du même jour
// @route   POST /api/ventes
// @access  Private (Admin only)
//
// Comportement :
//   1. On vérifie si le client (identifié par son téléphone) a déjà une vente
//      non-annulée pour le même jour calendaire.
//   2. Si OUI  → on ajoute juste le nouveau produit à cette vente existante
//               et on met à jour prixVente / montantTotal / stats balle.
//   3. Si NON  → on crée une nouvelle vente comme avant.
//
// Le front-end reçoit dans les deux cas la vente complète + un flag
// `venteFusionnee: true/false` pour savoir ce qui s'est passé.
export const createVente = async (req, res, next) => {
  try {
    const {
      balle,
      produit,
      telephoneClient,
      nomProduit,
      tailleProduit,
      prixVente,
      dateVente,
      livreur,
    } = req.body;

    // ── 1. Vérifier la balle ──────────────────────────────────────────────
    const balleDoc = await Balle.findById(balle);
    if (!balleDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Balle non trouvée" });
    }

    // ── 2. Vérifier / marquer le produit ─────────────────────────────────
    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);
      if (!produitDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Produit non trouvé" });
      }
      if (produitDoc.statut !== "disponible") {
        return res.status(400).json({
          success: false,
          message: "Ce produit n'est plus disponible",
        });
      }
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    // ── 3. Vérifier le livreur ────────────────────────────────────────────
    if (livreur) {
      const livreurDoc = await Livreur.findById(livreur);
      if (!livreurDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Livreur non trouvé" });
      }
    }

    // ── 4. Chercher une vente existante du même client le même jour ───────
    const venteExistante = await trouverVenteMemeJour(
      telephoneClient,
      dateVente,
    );

    // Objet produit à ajouter au tableau `produits`
    const nouveauProduitEntry = {
      produit: produit || null,
      nomProduit: nomProduit || (produitDoc ? produitDoc.nom : ""),
      tailleProduit: tailleProduit || (produitDoc ? produitDoc.taille : ""),
      prixVente: Number(prixVente),
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CAS A : vente existante → fusion
    // ═══════════════════════════════════════════════════════════════════════
    if (venteExistante) {
      // Ajouter le produit au tableau
      venteExistante.produits.push(nouveauProduitEntry);

      // Recalculer prixVente (somme) + montantTotal (le pre-save s'en charge)
      await venteExistante.save();

      // Mettre à jour les stats de la balle (on ajoute juste le delta de prix)
      balleDoc.totalVentes += Number(prixVente);
      balleDoc.nombreVentes += 1;
      balleDoc.calculerBenefice();
      await balleDoc.save();

      // Incrémenter le livreur si la vente fusionnée a un livreur
      if (venteExistante.livreur) {
        await Livreur.findByIdAndUpdate(venteExistante.livreur, {
          $inc: { nombreLivraisons: 1 },
        });
      }

      await venteExistante.populate([
        { path: "balle", select: "nom numero" },
        { path: "produit" },
        { path: "produits.produit" },
        { path: "livreur", select: "nom telephone" },
      ]);

      return res.status(200).json({
        success: true,
        venteFusionnee: true,
        message: `Produit ajouté à la vente existante du client ${venteExistante.nomClient}`,
        data: venteExistante,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CAS B : aucune vente ce jour → créer une nouvelle vente
    // ═══════════════════════════════════════════════════════════════════════
    const nouvelleVente = await Vente.create({
      ...req.body,
      produits: [nouveauProduitEntry],
    });

    // Mettre à jour les stats de la balle
    balleDoc.totalVentes += nouvelleVente.prixVente;
    balleDoc.nombreVentes += 1;
    balleDoc.calculerBenefice();
    await balleDoc.save();

    // Incrémenter le livreur
    if (livreur) {
      await Livreur.findByIdAndUpdate(livreur, {
        $inc: { nombreLivraisons: 1 },
      });
    }

    await nouvelleVente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "produits.produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    return res.status(201).json({
      success: true,
      venteFusionnee: false,
      data: nouvelleVente,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ajouter un produit à une vente existante (route explicite)
// @route   POST /api/ventes/:id/ajouter-produit
// @access  Private (Admin only)
export const ajouterProduitVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }
    if (vente.statutLivraison === "annulé") {
      return res.status(400).json({
        success: false,
        message: "Impossible d'ajouter un produit à une vente annulée",
      });
    }

    const { produit, nomProduit, tailleProduit, prixVente } = req.body;

    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);
      if (!produitDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Produit non trouvé" });
      }
      if (produitDoc.statut !== "disponible") {
        return res.status(400).json({
          success: false,
          message: "Ce produit n'est plus disponible",
        });
      }
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    vente.produits.push({
      produit: produit || null,
      nomProduit: nomProduit || (produitDoc ? produitDoc.nom : ""),
      tailleProduit: tailleProduit || (produitDoc ? produitDoc.taille : ""),
      prixVente: Number(prixVente),
    });

    await vente.save(); // pre-save recalcule prixVente + montantTotal

    // Mettre à jour les stats de la balle
    const balleDoc = await Balle.findById(vente.balle);
    if (balleDoc) {
      balleDoc.totalVentes += Number(prixVente);
      balleDoc.nombreVentes += 1;
      balleDoc.calculerBenefice();
      await balleDoc.save();
    }

    await vente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "produits.produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    res.status(200).json({ success: true, data: vente });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un produit d'une vente
// @route   DELETE /api/ventes/:id/produits/:produitEntryId
// @access  Private (Admin only)
export const supprimerProduitVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }

    const entryIndex = vente.produits.findIndex(
      (p) => p._id.toString() === req.params.produitEntryId,
    );

    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé dans cette vente",
      });
    }

    const entry = vente.produits[entryIndex];

    // Remettre le produit comme disponible
    if (entry.produit) {
      await Produit.findByIdAndUpdate(entry.produit, { statut: "disponible" });
    }

    // Mettre à jour les stats de la balle
    const balleDoc = await Balle.findById(vente.balle);
    if (balleDoc) {
      balleDoc.totalVentes -= entry.prixVente;
      balleDoc.nombreVentes -= 1;
      balleDoc.calculerBenefice();
      await balleDoc.save();
    }

    vente.produits.splice(entryIndex, 1);
    await vente.save(); // recalcule prixVente + montantTotal

    await vente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "produits.produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    res.status(200).json({ success: true, data: vente });
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
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }

    const ancienStatut = vente.statutLivraison;

    vente = await Vente.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "produits.produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    if (ancienStatut !== "livré" && vente.statutLivraison === "livré") {
      vente.dateLivraison = new Date();
      await vente.save();
    }

    res.status(200).json({ success: true, data: vente });
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
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }
    if (vente.statutLivraison === "annulé") {
      return res
        .status(400)
        .json({ success: false, message: "Cette vente est déjà annulée" });
    }

    // Remettre TOUS les produits du tableau comme disponibles
    if (vente.produits && vente.produits.length > 0) {
      for (const entry of vente.produits) {
        if (entry.produit) {
          await Produit.findByIdAndUpdate(entry.produit, {
            statut: "disponible",
          });
        }
      }
    } else if (vente.produit) {
      await Produit.findByIdAndUpdate(vente.produit, { statut: "disponible" });
    }

    // Mettre à jour les stats de la balle
    const balle = await Balle.findById(vente.balle);
    if (balle) {
      balle.totalVentes -= vente.prixVente;
      balle.nombreVentes -= vente.produits?.length || 1;
      balle.calculerBenefice();
      await balle.save();
    }

    vente.statutLivraison = "annulé";
    vente.raisonAnnulation = req.body.raisonAnnulation || "Non spécifiée";
    await vente.save();

    await vente.populate([
      { path: "balle", select: "nom numero" },
      { path: "produit" },
      { path: "produits.produit" },
      { path: "livreur", select: "nom telephone" },
    ]);

    res.status(200).json({ success: true, data: vente });
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
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    }

    if (vente.statutLivraison !== "annulé") {
      // Remettre tous les produits disponibles
      if (vente.produits && vente.produits.length > 0) {
        for (const entry of vente.produits) {
          if (entry.produit) {
            await Produit.findByIdAndUpdate(entry.produit, {
              statut: "disponible",
            });
          }
        }
      } else if (vente.produit) {
        await Produit.findByIdAndUpdate(vente.produit, {
          statut: "disponible",
        });
      }

      const balle = await Balle.findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= vente.produits?.length || 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    await vente.deleteOne();

    res.status(200).json({ success: true, data: {} });
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
      if (dateDebut) matchQuery.dateVente.$gte = new Date(dateDebut);
      if (dateFin) matchQuery.dateVente.$lte = new Date(dateFin);
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

export const modifierProduitVente = async (req, res) => {
  try {
    const { id, produitEntryId } = req.params;
    const {
      nomProduit,
      tailleProduit,
      prixVente,
      produit: produitRef,
    } = req.body;

    const vente = await Vente.findById(id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé")
      return res
        .status(400)
        .json({
          success: false,
          message: "Impossible de modifier une vente annulée",
        });

    const produitEntry = vente.produits.id(produitEntryId);
    if (!produitEntry)
      return res
        .status(404)
        .json({
          success: false,
          message: "Produit non trouvé dans cette vente",
        });

    const ancienPrix = produitEntry.prixVente;

    // Si le produit référencé change → swap des statuts + stats balle
    if (produitRef && produitEntry.produit?.toString() !== produitRef) {
      if (produitEntry.produit) {
        await Produit.findByIdAndUpdate(produitEntry.produit, {
          statut: "disponible",
        });
        await Balle.findByIdAndUpdate(vente.balle, {
          $inc: { totalVentes: -ancienPrix, nombreVentes: -1 },
        });
      }
      const nouveauProduit = await Produit.findByIdAndUpdate(
        produitRef,
        { statut: "vendu" },
        { new: true },
      );
      if (!nouveauProduit)
        return res
          .status(404)
          .json({ success: false, message: "Nouveau produit introuvable" });
      produitEntry.produit = produitRef;
      const nvxPrix = prixVente ?? nouveauProduit.prixVente;
      await Balle.findByIdAndUpdate(vente.balle, {
        $inc: { totalVentes: nvxPrix, nombreVentes: 1 },
      });
    } else if (prixVente !== undefined && prixVente !== ancienPrix) {
      // Même produit, prix modifié → ajuster stats
      await Balle.findByIdAndUpdate(vente.balle, {
        $inc: { totalVentes: prixVente - ancienPrix },
      });
    }

    if (nomProduit !== undefined) produitEntry.nomProduit = nomProduit;
    if (tailleProduit !== undefined) produitEntry.tailleProduit = tailleProduit;
    if (prixVente !== undefined) produitEntry.prixVente = prixVente;

    await vente.save(); // recalcul prixVente + montantTotal via hook pre("save")
    await vente.populate("balle livreur");

    res
      .status(200)
      .json({
        success: true,
        message: "Produit modifié avec succès",
        data: vente,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
