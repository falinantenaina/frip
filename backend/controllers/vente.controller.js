import Balle from "../models/balle.model.js";
import Expedition from "../models/expedition.model.js";
import Livreur from "../models/livreur.model.js";
import Produit from "../models/produit.model.js";
import Vente from "../models/vente.model.js";

/**
 * Retourne le montant total des sous-produits d'une vente.
 * Utilisé pour synchroniser balle.totalVentes.
 */
function sommePrixVente(vente) {
  if (vente.produits && vente.produits.length > 0) {
    return vente.produits.reduce((sum, p) => sum + (p.prixVente || 0), 0);
  }
  return vente.prixVente || 0;
}

/**
 * Synchronise les produits d'une vente dans l'expédition liée.
 */
async function syncExpeditionFromVente(vente) {
  if (!vente.expedition) return;
  const expedition = await Expedition.findById(vente.expedition);
  if (!expedition) return;

  if (vente.statutLivraison === "annulé") {
    expedition.produits = expedition.produits.filter(
      (p) => p.vente?.toString() !== vente._id.toString(),
    );
    await Vente.findByIdAndUpdate(vente._id, { expedition: null });
  } else {
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

    expedition.produits = [
      ...expedition.produits.filter(
        (p) => p.vente?.toString() !== vente._id.toString(),
      ),
      ...produitsVente,
    ];
  }

  await expedition.save();
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
  if (typeVente === "balle" && balleId) {
    query.balle = balleId;
  }
  return Vente.findOne(query);
}

// @desc    Obtenir toutes les ventes
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

// @desc    Créer une vente
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

    const prixAchatProduit = req.body.prixAchatProduit || 0;

    // ── Vente LIBRE ──────────────────────────────────────────────────────
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
        prixAchat: Number(prixAchatProduit),
        // benefice calculé par pre-save
        categorie: req.body.categorie || "autres",
      };

      const venteExistante = await trouverVenteMemeJour(
        telephoneClient,
        dateVente,
        "libre",
        null,
      );

      if (venteExistante) {
        venteExistante.produits.push(nouveauProduitEntry);
        await venteExistante.save(); // pre-save recalcule prixVente, totalBenefice, montantTotal
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

    // ── Vente BALLE ──────────────────────────────────────────────────────
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
        return res
          .status(400)
          .json({
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
      // prixAchat non fourni pour vente balle (coût réparti sur la balle globalement)
      prixAchat: 0,
      categorie: req.body.categorie || "autres",
    };

    if (venteExistante) {
      venteExistante.produits.push(nouveauProduitEntry);
      await venteExistante.save(); // pre-save recalcule tout

      // Sync balle : ajouter le prixVente du nouveau produit
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
    // Après create, pre-save a calculé prixVente = somme produits

    balleDoc.totalVentes += nouvelleVente.prixVente; // = prixVente du premier produit
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Impossible d'ajouter un produit à une vente annulée",
        });
    }

    const {
      produit,
      nomProduit,
      tailleProduit,
      prixVente,
      prixAchat,
      categorie,
    } = req.body;

    let produitDoc = null;
    if (produit) {
      produitDoc = await Produit.findById(produit);
      if (!produitDoc)
        return res
          .status(404)
          .json({ success: false, message: "Produit non trouvé" });
      if (produitDoc.statut !== "disponible") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Ce produit n'est plus disponible",
          });
      }
      produitDoc.statut = "vendu";
      await produitDoc.save();
    }

    const ancienTotal = vente.prixVente || 0;

    vente.produits.push({
      produit: produit || null,
      nomProduit: nomProduit || (produitDoc ? produitDoc.nom : ""),
      tailleProduit: tailleProduit || (produitDoc ? produitDoc.taille : ""),
      prixVente: Number(prixVente),
      prixAchat: Number(prixAchat || 0),
      categorie: categorie || "autres",
    });

    await vente.save(); // pre-save recalcule prixVente, totalBenefice, montantTotal

    // Sync balle : diff = nouveau total - ancien total
    if (vente.balle) {
      const diff = (vente.prixVente || 0) - ancienTotal;
      const balleDoc = await Balle.findById(vente.balle);
      if (balleDoc) {
        balleDoc.totalVentes += diff;
        balleDoc.nombreVentes += 1;
        balleDoc.calculerBenefice();
        await balleDoc.save();
      }
    }

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
    await vente.save(); // pre-save recalcule prixVente, totalBenefice, montantTotal

    // Sync balle : soustraire le prixVente du produit retiré
    if (vente.balle) {
      const balleDoc = await Balle.findById(vente.balle);
      if (balleDoc) {
        balleDoc.totalVentes -= entry.prixVente;
        balleDoc.nombreVentes -= 1;
        balleDoc.calculerBenefice();
        await balleDoc.save();
      }
    }

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

// @desc    Mettre à jour une vente (infos client, livraison, statut)
export const updateVente = async (req, res, next) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente)
      return res
        .status(404)
        .json({ success: false, message: "Vente non trouvée" });

    const ancienStatut = vente.statutLivraison;
    const ancienTotal = vente.prixVente || 0;

    // Champs modifiables directement sur la vente
    const editableFields = [
      "nomClient",
      "telephoneClient",
      "destinationClient",
      "nomProduit",
      "tailleProduit",
      "fraisLivraison",
      "lieuLivraison",
      "statutLivraison",
      "livreur",
      "commentaires",
      "categorie",
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vente[field] = req.body[field];
      }
    });

    // Si la catégorie change, propager à tous les sous-produits
    if (
      req.body.categorie !== undefined &&
      vente.produits &&
      vente.produits.length > 0
    ) {
      const allSameCat = vente.produits.every(
        (p) => p.categorie === vente.produits[0].categorie,
      );
      if (allSameCat || vente.produits.length === 1) {
        vente.produits.forEach((p) => {
          p.categorie = req.body.categorie;
        });
      }
    }

    // pre-save recalcule prixVente (somme produits), totalBenefice, montantTotal, categorie
    await vente.save();

    // Sync balle si le total a changé (ex: fraisLivraison ne change pas totalVentes balle)
    // totalVentes balle = somme prixVente produits, pas montantTotal
    if (vente.balle && vente.prixVente !== ancienTotal) {
      const diff = vente.prixVente - ancienTotal;
      const balleDoc = await Balle.findById(vente.balle);
      if (balleDoc) {
        balleDoc.totalVentes += diff;
        balleDoc.calculerBenefice();
        await balleDoc.save();
      }
    }

    if (ancienStatut !== "livré" && vente.statutLivraison === "livré") {
      vente.dateLivraison = new Date();
      await vente.save();
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

    // Remettre les produits en stock
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

    // Sync balle : soustraire prixVente (= somme des sous-produits)
    if (vente.balle) {
      const balle = await Balle.findById(vente.balle);
      if (balle) {
        balle.totalVentes -= vente.prixVente; // prixVente = somme produits (calculé par pre-save)
        balle.nombreVentes -= vente.produits?.length || 1;
        balle.calculerBenefice();
        await balle.save();
      }
    }

    vente.statutLivraison = "annulé";
    vente.raisonAnnulation = req.body.raisonAnnulation || "Non spécifiée";
    await vente.save();

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
          balle.totalVentes -= vente.prixVente; // prixVente = somme produits
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
          montantVentes: { $sum: "$prixVente" }, // somme des totaux produits par vente
          totalBenefice: { $sum: "$totalBenefice" }, // nouveau : somme des bénéfices
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
          benefice: { $sum: "$totalBenefice" },
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
          totalBenefice: 0,
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

// @desc    Modifier un produit dans une vente
export const modifierProduitVente = async (req, res) => {
  try {
    const { id, produitEntryId } = req.params;
    const {
      nomProduit,
      tailleProduit,
      prixVente,
      prixAchat,
      categorie,
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

    const ancienTotalVente = vente.prixVente || 0; // avant modif

    // Changement de référence produit
    if (produitRef && produitEntry.produit?.toString() !== produitRef) {
      if (produitEntry.produit) {
        await Produit.findByIdAndUpdate(produitEntry.produit, {
          statut: "disponible",
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
    }

    // Appliquer les champs modifiables
    if (nomProduit !== undefined) produitEntry.nomProduit = nomProduit;
    if (tailleProduit !== undefined) produitEntry.tailleProduit = tailleProduit;
    if (prixVente !== undefined) produitEntry.prixVente = Number(prixVente);
    if (prixAchat !== undefined) produitEntry.prixAchat = Number(prixAchat);
    if (categorie !== undefined) produitEntry.categorie = categorie;

    // pre-save recalcule : benefice du produit, prixVente total, totalBenefice, montantTotal, categorie principale
    await vente.save();

    // Sync balle : diff entre nouveau total et ancien total
    if (vente.balle && vente.prixVente !== ancienTotalVente) {
      const diff = vente.prixVente - ancienTotalVente;
      const balle = await Balle.findById(vente.balle);
      if (balle) {
        balle.totalVentes += diff;
        balle.calculerBenefice();
        await balle.save();
      }
    }

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
