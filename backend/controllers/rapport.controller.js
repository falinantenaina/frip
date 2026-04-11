import Balle from "../models/balle.model.js";
import Depense from "../models/depense.model.js";
import Expedition from "../models/expedition.model.js";
import Investissement from "../models/investissement.model.js";
import Vente from "../models/vente.model.js";
import Versement from "../models/versement.model.js";

function parseDateRange(dateDebut, dateFin) {
  const match = {};
  if (dateDebut || dateFin) {
    match.$gte = dateDebut ? new Date(dateDebut) : undefined;
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setDate(fin.getDate() + 1);
      match.$lte = fin;
    }
  }
  return Object.keys(match).length ? match : null;
}

// @desc    Rapport global complet
export const getRapportGlobal = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);

    const venteMatch = { statutLivraison: { $ne: "annulé" } };
    if (dateRange) venteMatch.dateVente = dateRange;

    const depenseMatch = {};
    if (dateRange) depenseMatch.dateDepense = dateRange;

    const expeditionMatch = { statut: { $in: ["expédiée", "livrée"] } };
    if (dateRange) expeditionMatch.dateExpedition = dateRange;

    const [ventesStats, ventesBalle, ventesLibres, ventesExpediees] =
      await Promise.all([
        Vente.aggregate([
          { $match: venteMatch },
          {
            $group: {
              _id: null,
              totalVentes: { $sum: 1 },
              montantVentes: { $sum: "$prixVente" },
              fraisLivraison: { $sum: "$fraisLivraison" },
              montantTotal: { $sum: "$montantTotal" },
            },
          },
        ]),
        Vente.aggregate([
          { $match: { ...venteMatch, typeVente: "balle" } },
          {
            $group: {
              _id: null,
              montant: { $sum: "$prixVente" },
              count: { $sum: 1 },
            },
          },
        ]),
        Vente.aggregate([
          { $match: { ...venteMatch, typeVente: "libre" } },
          { $unwind: { path: "$produits", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              montantVentes: { $sum: "$produits.prixVente" },
              coutAchat: { $sum: "$produits.prixAchat" },
              count: { $sum: 1 },
            },
          },
        ]),
        Vente.aggregate([
          { $match: { ...venteMatch, expedition: { $ne: null } } },
          {
            $group: {
              _id: null,
              montant: { $sum: "$prixVente" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // ── Ventes par catégorie (global) ────────────────────────────────────────
    const ventesParCategorie = await Vente.aggregate([
      { $match: venteMatch },
      { $unwind: { path: "$produits", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            $cond: {
              if: {
                $gt: [
                  {
                    $size: {
                      $cond: [{ $isArray: "$produits" }, "$produits", []],
                    },
                  },
                  0,
                ],
              },
              then: { $ifNull: ["$produits.categorie", "autres"] },
              else: { $ifNull: ["$categorie", "autres"] },
            },
          },
          montant: {
            $sum: {
              $ifNull: ["$produits.prixVente", "$prixVente"],
            },
          },
          count: { $sum: 1 },
          coutAchat: {
            $sum: { $ifNull: ["$produits.prixAchat", 0] },
          },
        },
      },
      { $sort: { montant: -1 } },
    ]);

    // Regroupement propre par catégorie depuis les sous-produits
    const catStats = await Vente.aggregate([
      { $match: venteMatch },
      { $unwind: { path: "$produits", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { $ifNull: ["$produits.categorie", "autres"] },
          montant: { $sum: "$produits.prixVente" },
          coutAchat: { $sum: { $ifNull: ["$produits.prixAchat", 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { montant: -1 } },
    ]);

    // Stats également des ventes sans sous-produits (typeVente = balle ancien format)
    const catStatsVenteDirecte = await Vente.aggregate([
      {
        $match: {
          ...venteMatch,
          $or: [{ produits: { $exists: false } }, { produits: { $size: 0 } }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$categorie", "autres"] },
          montant: { $sum: "$prixVente" },
          coutAchat: { $sum: 0 },
          count: { $sum: 1 },
        },
      },
    ]);

    // Fusion
    const catMap = {};
    [...catStats, ...catStatsVenteDirecte].forEach(
      ({ _id, montant, coutAchat, count }) => {
        if (!catMap[_id])
          catMap[_id] = { categorie: _id, montant: 0, coutAchat: 0, count: 0 };
        catMap[_id].montant += montant;
        catMap[_id].coutAchat += coutAchat;
        catMap[_id].count += count;
      },
    );
    const categoriesStats = Object.values(catMap).map((c) => ({
      ...c,
      benefice: c.montant - c.coutAchat,
    }));

    const [depensesStats, depensesParType, depensesGlobales, depensesParBalle] =
      await Promise.all([
        Depense.aggregate([
          { $match: depenseMatch },
          {
            $group: {
              _id: null,
              totalDepenses: { $sum: "$montant" },
              nombreDepenses: { $sum: 1 },
            },
          },
        ]),
        Depense.aggregate([
          { $match: depenseMatch },
          {
            $group: {
              _id: "$type",
              total: { $sum: "$montant" },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]),
        Depense.aggregate([
          { $match: { ...depenseMatch, balle: null } },
          { $group: { _id: null, total: { $sum: "$montant" } } },
        ]),
        Depense.aggregate([
          { $match: { ...depenseMatch, balle: { $ne: null } } },
          { $group: { _id: null, total: { $sum: "$montant" } } },
        ]),
      ]);

    const [expeditionsStats] = await Promise.all([
      Expedition.aggregate([
        { $match: expeditionMatch },
        {
          $group: {
            _id: null,
            totalExpeditions: { $sum: 1 },
            totalFraisColis: { $sum: "$fraisColis" },
            totalSalaireCommissionnaire: { $sum: "$salaireCommissionnaire" },
            totalFrais: { $sum: "$totalFrais" },
            totalProduits: { $sum: { $size: "$produits" } },
            totalVentesExpediees: { $sum: "$totalVentes" },
          },
        },
      ]),
    ]);

    const ballesStats = await Balle.aggregate([
      {
        $group: {
          _id: null,
          nombreBalles: { $sum: 1 },
          totalInvesti: { $sum: "$prixAchat" },
          totalVentes: { $sum: "$totalVentes" },
          totalDepensesLiees: { $sum: "$depensesLiees" },
          totalBenefice: { $sum: "$benefice" },
        },
      },
    ]);

    const investMatch = {};
    if (dateRange) investMatch.dateInvestissement = dateRange;
    const versMatch = {};
    if (dateRange) versMatch.dateVersement = dateRange;

    const [investStats, versStats] = await Promise.all([
      Investissement.aggregate([
        { $match: investMatch },
        {
          $group: {
            _id: null,
            total: { $sum: "$montant" },
            count: { $sum: 1 },
          },
        },
      ]),
      Versement.aggregate([
        { $match: versMatch },
        {
          $group: {
            _id: null,
            total: { $sum: "$montant" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ventes = ventesStats[0] || {
      totalVentes: 0,
      montantVentes: 0,
      fraisLivraison: 0,
      montantTotal: 0,
    };
    const depenses = depensesStats[0] || {
      totalDepenses: 0,
      nombreDepenses: 0,
    };
    const expeditions = expeditionsStats[0] || {
      totalExpeditions: 0,
      totalFraisColis: 0,
      totalSalaireCommissionnaire: 0,
      totalFrais: 0,
      totalProduits: 0,
      totalVentesExpediees: 0,
    };
    const balles = ballesStats[0] || {
      nombreBalles: 0,
      totalInvesti: 0,
      totalVentes: 0,
      totalBenefice: 0,
    };

    const libresData = ventesLibres[0] || {
      montantVentes: 0,
      coutAchat: 0,
      count: 0,
    };
    const balleData = ventesBalle[0] || { montant: 0, count: 0 };

    const beneficeBalles = balles.totalBenefice;
    const beneficeLibres = libresData.montantVentes - libresData.coutAchat;
    const beneficeExpeditions =
      expeditions.totalVentesExpediees - expeditions.totalFrais;
    const totalCharges = depenses.totalDepenses + expeditions.totalFrais;
    const beneficeNet = ventes.montantVentes - totalCharges;

    res.status(200).json({
      success: true,
      data: {
        ventes: {
          ...ventes,
          parBalle: balleData,
          libres: { ...libresData, benefice: beneficeLibres },
          expediees: ventesExpediees[0] || { montant: 0, count: 0 },
        },
        depenses: {
          ...depenses,
          parType: depensesParType,
          globales: depensesGlobales[0]?.total || 0,
          liéesBalles: depensesParBalle[0]?.total || 0,
        },
        expeditions,
        balles,
        categories: categoriesStats,
        benefices: {
          balles: beneficeBalles,
          libres: beneficeLibres,
          expeditions: beneficeExpeditions,
          net: beneficeNet,
          parCategorie: categoriesStats.reduce((acc, c) => {
            acc[c.categorie] = c.benefice;
            return acc;
          }, {}),
        },
        investisseur: {
          totalRecu: investStats[0]?.total || 0,
          totalVerse: versStats[0]?.total || 0,
          solde: (investStats[0]?.total || 0) - (versStats[0]?.total || 0),
        },
        totalCharges,
        beneficeNet,
        periode: { dateDebut: dateDebut || "Tout", dateFin: dateFin || "Tout" },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport par catégorie de produit
// @route   GET /api/rapports/par-categorie
export const getRapportParCategorie = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);

    const venteMatch = { statutLivraison: { $ne: "annulé" } };
    if (dateRange) venteMatch.dateVente = dateRange;

    const CATEGORIES = ["chaussures", "robes", "autres"];

    // Stats globales par catégorie depuis les sous-produits
    const statsProduitsDetail = await Vente.aggregate([
      { $match: venteMatch },
      { $unwind: { path: "$produits", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            categorie: { $ifNull: ["$produits.categorie", "autres"] },
          },
          montantVentes: { $sum: "$produits.prixVente" },
          coutAchat: { $sum: { $ifNull: ["$produits.prixAchat", 0] } },
          nombreProduits: { $sum: 1 },
          nombreVentes: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          categorie: "$_id.categorie",
          montantVentes: 1,
          coutAchat: 1,
          nombreProduits: 1,
          nombreVentes: { $size: "$nombreVentes" },
          benefice: { $subtract: ["$montantVentes", "$coutAchat"] },
        },
      },
      { $sort: { montantVentes: -1 } },
    ]);

    // Évolution mensuelle par catégorie
    const evolutionMensuelle = await Vente.aggregate([
      { $match: venteMatch },
      { $unwind: { path: "$produits", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            categorie: { $ifNull: ["$produits.categorie", "autres"] },
            annee: { $year: "$dateVente" },
            mois: { $month: "$dateVente" },
          },
          montant: { $sum: "$produits.prixVente" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.annee": 1, "_id.mois": 1 } },
    ]);

    // Destination par catégorie
    const parDestination = await Vente.aggregate([
      { $match: venteMatch },
      { $unwind: { path: "$produits", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            categorie: { $ifNull: ["$produits.categorie", "autres"] },
            destination: { $ifNull: ["$destinationClient", "Local"] },
          },
          montant: { $sum: "$produits.prixVente" },
          count: { $sum: 1 },
        },
      },
      { $sort: { montant: -1 } },
    ]);

    // Assurer que les 3 catégories sont présentes même avec 0
    const statsParCategorie = CATEGORIES.map((cat) => {
      const found = statsProduitsDetail.find(
        (s) => s._id?.categorie === cat || s.categorie === cat,
      );
      return {
        categorie: cat,
        montantVentes: found?.montantVentes || 0,
        coutAchat: found?.coutAchat || 0,
        nombreProduits: found?.nombreProduits || 0,
        nombreVentes: found?.nombreVentes || 0,
        benefice: found?.benefice || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        statsParCategorie,
        evolutionMensuelle,
        parDestination,
        periode: { dateDebut: dateDebut || "Tout", dateFin: dateFin || "Tout" },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport par jour
export const getRapportParJour = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);

    const venteMatch = { statutLivraison: { $ne: "annulé" } };
    if (dateRange) venteMatch.dateVente = dateRange;
    const depenseMatch = {};
    if (dateRange) depenseMatch.dateDepense = dateRange;
    const expedMatch = {};
    if (dateRange) expedMatch.dateExpedition = dateRange;

    const [ventesParJour, depensesParJour, expedParJour] = await Promise.all([
      Vente.aggregate([
        { $match: venteMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateVente" } },
            nombreVentes: { $sum: 1 },
            montantVentes: { $sum: "$prixVente" },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      Depense.aggregate([
        { $match: depenseMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateDepense" },
            },
            montantDepenses: { $sum: "$montant" },
          },
        },
      ]),
      Expedition.aggregate([
        { $match: expedMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$dateExpedition" },
            },
            fraisExpedition: { $sum: "$totalFrais" },
            nombreExpeditions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const datesMap = new Map();
    ventesParJour.forEach((item) => {
      datesMap.set(item._id, {
        date: item._id,
        ventes: item.nombreVentes,
        montantVentes: item.montantVentes,
        depenses: 0,
        fraisExpedition: 0,
        benefice: item.montantVentes,
      });
    });
    depensesParJour.forEach((item) => {
      const d = datesMap.get(item._id) || {
        date: item._id,
        ventes: 0,
        montantVentes: 0,
        fraisExpedition: 0,
      };
      d.depenses = item.montantDepenses;
      d.benefice =
        (d.montantVentes || 0) -
        item.montantDepenses -
        (d.fraisExpedition || 0);
      datesMap.set(item._id, d);
    });
    expedParJour.forEach((item) => {
      const d = datesMap.get(item._id) || {
        date: item._id,
        ventes: 0,
        montantVentes: 0,
        depenses: 0,
      };
      d.fraisExpedition = item.fraisExpedition;
      d.nombreExpeditions = item.nombreExpeditions;
      d.benefice =
        (d.montantVentes || 0) - (d.depenses || 0) - item.fraisExpedition;
      datesMap.set(item._id, d);
    });

    const rapport = Array.from(datesMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    res
      .status(200)
      .json({ success: true, count: rapport.length, data: rapport });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport par mois
export const getRapportParMois = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);

    const venteMatch = { statutLivraison: { $ne: "annulé" } };
    if (dateRange) venteMatch.dateVente = dateRange;
    const depenseMatch = {};
    if (dateRange) depenseMatch.dateDepense = dateRange;
    const expedMatch = {};
    if (dateRange) expedMatch.dateExpedition = dateRange;

    const [ventesParMois, depensesParMois, expedParMois] = await Promise.all([
      Vente.aggregate([
        { $match: venteMatch },
        {
          $group: {
            _id: {
              annee: { $year: "$dateVente" },
              mois: { $month: "$dateVente" },
            },
            nombreVentes: { $sum: 1 },
            montantVentes: { $sum: "$prixVente" },
          },
        },
        { $sort: { "_id.annee": -1, "_id.mois": -1 } },
      ]),
      Depense.aggregate([
        { $match: depenseMatch },
        {
          $group: {
            _id: {
              annee: { $year: "$dateDepense" },
              mois: { $month: "$dateDepense" },
            },
            montantDepenses: { $sum: "$montant" },
          },
        },
      ]),
      Expedition.aggregate([
        { $match: expedMatch },
        {
          $group: {
            _id: {
              annee: { $year: "$dateExpedition" },
              mois: { $month: "$dateExpedition" },
            },
            fraisExpedition: { $sum: "$totalFrais" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const moisMap = new Map();
    ventesParMois.forEach((item) => {
      const key = `${item._id.annee}-${String(item._id.mois).padStart(2, "0")}`;
      moisMap.set(key, {
        annee: item._id.annee,
        mois: item._id.mois,
        nombreVentes: item.nombreVentes,
        montantVentes: item.montantVentes,
        depenses: 0,
        fraisExpedition: 0,
        benefice: item.montantVentes,
      });
    });
    depensesParMois.forEach((item) => {
      const key = `${item._id.annee}-${String(item._id.mois).padStart(2, "0")}`;
      const d = moisMap.get(key) || {
        annee: item._id.annee,
        mois: item._id.mois,
        nombreVentes: 0,
        montantVentes: 0,
        fraisExpedition: 0,
      };
      d.depenses = item.montantDepenses;
      d.benefice =
        (d.montantVentes || 0) -
        item.montantDepenses -
        (d.fraisExpedition || 0);
      moisMap.set(key, d);
    });
    expedParMois.forEach((item) => {
      const key = `${item._id.annee}-${String(item._id.mois).padStart(2, "0")}`;
      const d = moisMap.get(key) || {
        annee: item._id.annee,
        mois: item._id.mois,
        nombreVentes: 0,
        montantVentes: 0,
        depenses: 0,
      };
      d.fraisExpedition = item.fraisExpedition;
      d.nombreExpeditions = item.count;
      d.benefice =
        (d.montantVentes || 0) - (d.depenses || 0) - item.fraisExpedition;
      moisMap.set(key, d);
    });

    const rapport = Array.from(moisMap.values()).sort((a, b) => {
      if (a.annee !== b.annee) return b.annee - a.annee;
      return b.mois - a.mois;
    });
    res
      .status(200)
      .json({ success: true, count: rapport.length, data: rapport });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport par semaine
export const getRapportParSemaine = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);

    const venteMatch = { statutLivraison: { $ne: "annulé" } };
    if (dateRange) venteMatch.dateVente = dateRange;

    const ventesParSemaine = await Vente.aggregate([
      { $match: venteMatch },
      {
        $group: {
          _id: {
            annee: { $year: "$dateVente" },
            semaine: { $week: "$dateVente" },
          },
          nombreVentes: { $sum: 1 },
          montantVentes: { $sum: "$prixVente" },
        },
      },
      { $sort: { "_id.annee": -1, "_id.semaine": -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: ventesParSemaine.map((v) => ({
        annee: v._id.annee,
        semaine: v._id.semaine,
        nombreVentes: v.nombreVentes,
        montantVentes: v.montantVentes,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport par balle
export const getRapportParBalle = async (req, res, next) => {
  try {
    const balles = await Balle.find().sort({ createdAt: -1 });

    const rapport = await Promise.all(
      balles.map(async (balle) => {
        const [ventesCount, depenses, ventesLibresCount] = await Promise.all([
          Vente.countDocuments({
            balle: balle._id,
            statutLivraison: { $ne: "annulé" },
          }),
          Depense.find({ balle: balle._id }),
          Vente.countDocuments({
            balle: balle._id,
            typeVente: "balle",
            statutLivraison: { $ne: "annulé" },
          }),
        ]);
        const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

        return {
          id: balle._id,
          nom: balle.nom,
          numero: balle.numero,
          prixAchat: balle.prixAchat,
          totalVentes: balle.totalVentes,
          nombreVentes: ventesCount,
          depenses: totalDepenses,
          benefice: balle.benefice,
          statut: balle.statut,
          dateAchat: balle.dateAchat,
        };
      }),
    );

    res
      .status(200)
      .json({ success: true, count: rapport.length, data: rapport });
  } catch (error) {
    next(error);
  }
};

// @desc    Rapport expéditions
export const getRapportExpeditions = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const dateRange = parseDateRange(dateDebut, dateFin);
    const match = {};
    if (dateRange) match.dateExpedition = dateRange;

    const expeditions = await Expedition.find(match).sort({
      dateExpedition: -1,
    });

    const stats = await Expedition.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$destination",
          totalExpeditions: { $sum: 1 },
          totalProduits: { $sum: { $size: "$produits" } },
          totalFraisColis: { $sum: "$fraisColis" },
          totalSalaire: { $sum: "$salaireCommissionnaire" },
          totalFrais: { $sum: "$totalFrais" },
          totalVentes: { $sum: "$totalVentes" },
        },
      },
      { $sort: { totalExpeditions: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: { expeditions, statsParDestination: stats },
    });
  } catch (error) {
    next(error);
  }
};
