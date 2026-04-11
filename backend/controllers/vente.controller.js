import Balle from "../models/balle.model.js";
import Expedition from "../models/expedition.model.js";
import Livreur from "../models/livreur.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";

/**
 * Synchronise les produits d'une vente dans l'expédition liée.
 * Appelé après chaque modification (ajout/suppression/modification de produit, annulation).
 */
async function syncExpeditionFromVente(vente) {
  if (!vente.expedition) return;
  const expedition = await Expedition.findById(vente.expedition);
  if (!expedition) return;

  if (vente.statutLivraison === "annulé") {
    // Retirer tous les produits de cette vente de l'expédition
    expedition.produits = expedition.produits.filter(
      (p) => p.vente?.toString() !== vente._id.toString(),
    );
    // Détacher la vente de l'expédition
    await Vente.findByIdAndUpdate(vente._id, { expedition: null });
  } else {
    // Reconstruire les entrées de cette vente dans l'expédition
    const produitsVente = (
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

    // Remplacer les anciens produits de cette vente
    expedition.produits = [
      ...expedition.produits.filter(
        (p) => p.vente?.toString() !== vente._id.toString(),
      ),
      ...produitsVente,
    ];
  }

  await expedition.save(); // pre-save recalcule totalVentes + totalFrais si nécessaire
}

function jourCourant(date = new Date()) {
  const debut = new Date(date);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(date);
  fin.setHours(23, 59, 59, 999);
  return { debut, fin };
}

async function trouverVenteMemeJour(
  telephoneClient,
  dateVente,
  typeVente,
  balleId,
) {
  const { debut, fin } = jourCourant(
    dateVente ? new Date(dateVente) : new Date(),
  );
  const query = {
    telephoneClient,
    statutLivraison: { $ne: "annulé" },
    dateVente: { $gte: debut, $lte: fin },
    typeVente,
  };
  // Pour les ventes balle, on regroupe par balle aussi
  if (typeVente === "balle" && balleId) {
    query.balle = balleId;
  }
  return Vente.findOne(query);
}

// @desc    Obtenir toutes les ventes
// @route   GET /api/ventes
export const getVentes = async (req, res, next) => {
  try {
    const {
      balle,
      statutLivraison,
      livreur,
      dateDebut,
      dateFin,
      typeVente,
      destinationClient,
    } = req.query;
    let query = {};

    if (balle) query.balle = balle;
    if (statutLivraison) query.statutLivraison = statutLivraison;
    if (livreur) query.livreur = livreur;
    if (typeVente) query.typeVente = typeVente;
    if (destinationClient)
      query.destinationClient = { $regex: destinationClient, $options: "i" };

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

    res.status(200).json({ success: true, count: ventes.length, data: ventes });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une vente par ID
export const getVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id)
      .populate("balle", "nom numero prixAchat")
      .populate("produit")
      .populate("produits.produit")
      .populate("livreur", "nom telephone");

    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    res.status(200).json({ success: true, data: vente });
  } catch (error) {
    next(error);
  }
};

// @desc    Créer une vente (avec ou sans balle)
// @route   POST /api/ventes
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
      typeVente = "balle",
      destinationClient = "Local",
    } = req.body;

    // prixAchat optionnel pour ventes libres (envoyé depuis VenteForm)
    const prixAchatProduit = req.body.prixAchatProduit || 0;

    // ── Vente LIBRE (sans balle) ──────────────────────────────────────────
    if (typeVente === "libre") {
      if (livreur) {
        const livreurDoc = await Livreur.findById(livreur);
        if (!livreurDoc)
          return res
            .status(404)
            .json({ success: false, message: "Livreur non trouvé" });
      }

      const nouveauProduitEntry = {
        produit: null,
        nomProduit: nomProduit || "",
        tailleProduit: tailleProduit || "",
        prixVente: Number(prixVente),
        prixAchat: prixAchatProduit,
      };

      // Fusion si même client même jour
      const venteExistante = await trouverVenteMemeJour(
        telephoneClient,
        dateVente,
        "libre",
        null,
      );

      if (venteExistante) {
        venteExistante.produits.push(nouveauProduitEntry);
        await venteExistante.save();

        await venteExistante.populate([
          { path: "livreur", select: "nom telephone" },
        ]);

        return res.status(200).json({
          success: true,
          venteFusionnee: true,
          message: `Produit ajouté à la commande existante de ${venteExistante.nomClient}`,
          data: venteExistante,
        });
      }

      const nouvelleVente = await Vente.create({
        ...req.body,
        typeVente: "libre",
        balle: null,
        produits: [nouveauProduitEntry],
        destinationClient,
      });

      if (livreur) {
        await Livreur.findByIdAndUpdate(livreur, {
          $inc: { nombreLivraisons: 1 },
        });
      }

      await nouvelleVente.populate([
        { path: "livreur", select: "nom telephone" },
      ]);

      return res
        .status(201)
        .json({ success: true, venteFusionnee: false, data: nouvelleVente });
    }

    // ── Vente BALLE (avec balle) ──────────────────────────────────────────
    const balleDoc = await Balle.findById(balle);
    if (!balleDoc)
      return res
        .status(404)
        .json({ success: false, message: "Balle non trouvée" });

    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);
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

    if (livreur) {
      const livreurDoc = await Livreur.findById(livreur);
      if (!livreurDoc)
        return res
          .status(404)
          .json({ success: false, message: "Livreur non trouvé" });
    }

    const venteExistante = await trouverVenteMemeJour(
      telephoneClient,
      dateVente,
      "balle",
      balle,
    );

    const nouveauProduitEntry = {
      produit: produit || null,
      nomProduit: nomProduit || (produitDoc ? produitDoc.nom : ""),
      tailleProduit: tailleProduit || (produitDoc ? produitDoc.taille : ""),
      prixVente: Number(prixVente),
    };

    if (venteExistante) {
      venteExistante.produits.push(nouveauProduitEntry);
      await venteExistante.save();

      balleDoc.totalVentes += Number(prixVente);
      balleDoc.nombreVentes += 1;
      balleDoc.calculerBenefice();
      await balleDoc.save();

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

    const nouvelleVente = await Vente.create({
      ...req.body,
      typeVente: "balle",
      produits: [nouveauProduitEntry],
      destinationClient,
    });

    balleDoc.totalVentes += nouvelleVente.prixVente;
    balleDoc.nombreVentes += 1;
    balleDoc.calculerBenefice();
    await balleDoc.save();

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

    return res
      .status(201)
      .json({ success: true, venteFusionnee: false, data: nouvelleVente });
  } catch (error) {
    next(error);
  }
};

// @desc    Ajouter un produit à une vente existante
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
        message: "Impossible d'ajouter un produit à une vente annulée",
      });
    }

    const { produit, nomProduit, tailleProduit, prixVente } = req.body;

    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);
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

    vente.produits.push({
      produit: produit || null,
      nomProduit: nomProduit || (produitDoc ? produitDoc.nom : ""),
      tailleProduit: tailleProduit || (produitDoc ? produitDoc.taille : ""),
      prixVente: Number(prixVente),
    });

    await vente.save();

    if (vente.balle) {
      const balleDoc = await Balle.findById(vente.balle);
      if (balleDoc) {
        balleDoc.totalVentes += Number(prixVente);
        balleDoc.nombreVentes += 1;
        balleDoc.calculerBenefice();
        await balleDoc.save();
      }
    }

    // Sync expédition liée
    await syncExpeditionFromVente(vente);

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
export const supprimerProduitVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

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

    if (entry.produit) {
      await Produit.findByIdAndUpdate(entry.produit, { statut: "disponible" });
    }

    if (vente.balle) {
      const balleDoc = await Balle.findById(vente.balle);
      if (balleDoc) {
        balleDoc.totalVentes -= entry.prixVente;
        balleDoc.nombreVentes -= 1;
        balleDoc.calculerBenefice();
        await balleDoc.save();
      }
    }

    vente.produits.splice(entryIndex, 1);
    await vente.save();

    // Sync expédition liée
    await syncExpeditionFromVente(vente);

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
export const updateVente = async (req, res, next) => {
  try {
    let vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

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

    if (vente.balle) {
      const balle = await Balle.findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente;
        balle.nombreVentes -= vente.produits?.length || 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    vente.statutLivraison = "annulé";
    vente.raisonAnnulation = req.body.raisonAnnulation || "Non spécifiée";
    await vente.save();

    // Sync expédition : retire automatiquement la vente de l'expédition liée
    await syncExpeditionFromVente(vente);

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
export const deleteVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

    if (vente.statutLivraison !== "annulé") {
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

      if (vente.balle) {
        const balle = await Balle.findById(vente.balle);
        if (balle) {
          balle.totalVentes -= vente.prixVente;
          balle.nombreVentes -= vente.produits?.length || 1;
          balle.calculerBenefice();
          await balle.save();
        }
      }
    }

    await vente.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Stats ventes
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
          montantVentes: { $sum: "$prixVente" },
          fraisLivraisonTotal: { $sum: "$fraisLivraison" },
        },
      },
    ]);

    const statsByType = await Vente.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$typeVente",
          count: { $sum: 1 },
          montant: { $sum: "$prixVente" },
        },
      },
    ]);

    const statsByStatus = await Vente.aggregate([
      { $match: { statutLivraison: { $ne: "annulé" } } },
      { $group: { _id: "$statutLivraison", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        global: stats[0] || {
          totalVentes: 0,
          montantTotal: 0,
          montantVentes: 0,
          fraisLivraisonTotal: 0,
        },
        byType: statsByType,
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
      prixAchat,
      produit: produitRef,
    } = req.body;

    const vente = await Vente.findById(id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });
    if (vente.statutLivraison === "annulé")
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une vente annulée",
      });

    const produitEntry = vente.produits.id(produitEntryId);
    if (!produitEntry)
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé dans cette vente",
      });

    const ancienPrix = produitEntry.prixVente;

    if (produitRef && produitEntry.produit?.toString() !== produitRef) {
      if (produitEntry.produit) {
        await Produit.findByIdAndUpdate(produitEntry.produit, {
          statut: "disponible",
        });
        if (vente.balle) {
          await Balle.findByIdAndUpdate(vente.balle, {
            $inc: { totalVentes: -ancienPrix, nombreVentes: -1 },
          });
        }
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
      if (vente.balle) {
        await Balle.findByIdAndUpdate(vente.balle, {
          $inc: { totalVentes: nvxPrix, nombreVentes: 1 },
        });
      }
    } else if (prixVente !== undefined && prixVente !== ancienPrix) {
      if (vente.balle) {
        await Balle.findByIdAndUpdate(vente.balle, {
          $inc: { totalVentes: prixVente - ancienPrix },
        });
      }
    }

    if (nomProduit !== undefined) produitEntry.nomProduit = nomProduit;
    if (tailleProduit !== undefined) produitEntry.tailleProduit = tailleProduit;
    if (prixVente !== undefined) produitEntry.prixVente = prixVente;
    if (prixAchat !== undefined) produitEntry.prixAchat = prixAchat;

    await vente.save();

    // Sync expédition liée
    await syncExpeditionFromVente(vente);

    await vente.populate("balle livreur produits.produit");

    res.status(200).json({
      success: true,
      message: "Produit modifié avec succès",
      data: vente,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
