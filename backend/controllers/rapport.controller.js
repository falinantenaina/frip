import Balle from "../models/balle.model.js";
import Depense from "../models/depense.model.js";
import Vente from "../models/vente.model.js";

// @desc    Obtenir le rapport global
// @route   GET /api/rapports/global
// @access  Private
export const getRapportGlobal = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = {};

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) {
        matchQuery.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateVente.$lte = new Date(dateFin);
      }
    }

    // Statistiques des ventes
    const ventesStats = await Vente.aggregate([
      {
        $match: {
          ...matchQuery,
          statutLivraison: { $ne: "annulé" },
        },
      },
      {
        $group: {
          _id: null,
          totalVentes: { $sum: 1 },
          montantVentes: { $sum: "$prixVente" },
          fraisLivraison: { $sum: "$fraisLivraison" },
          montantTotal: { $sum: "$montantTotal" },
        },
      },
    ]);

    // Statistiques des dépenses
    let depensesMatchQuery = {};
    if (dateDebut || dateFin) {
      depensesMatchQuery.dateDepense = {};
      if (dateDebut) {
        depensesMatchQuery.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        depensesMatchQuery.dateDepense.$lte = new Date(dateFin);
      }
    }

    const depensesStats = await Depense.aggregate([
      { $match: depensesMatchQuery },
      {
        $group: {
          _id: null,
          totalDepenses: { $sum: "$montant" },
          nombreDepenses: { $sum: 1 },
        },
      },
    ]);

    // Statistiques des balles
    const ballesStats = await Balle.aggregate([
      {
        $group: {
          _id: null,
          nombreBalles: { $sum: 1 },
          totalInvesti: { $sum: "$prixAchat" },
          totalVentes: { $sum: "$totalVentes" },
          totalBenefice: { $sum: "$benefice" },
        },
      },
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

    const balles = ballesStats[0] || {
      nombreBalles: 0,
      totalInvesti: 0,
      totalVentes: 0,
      totalBenefice: 0,
    };

    // Calculer le bénéfice net
    const beneficeNet = ventes.montantVentes - depenses.totalDepenses;

    res.status(200).json({
      success: true,
      data: {
        ventes,
        depenses,
        balles,
        beneficeNet,
        periode: {
          dateDebut: dateDebut || "Toutes",
          dateFin: dateFin || "Toutes",
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le rapport par jour
// @route   GET /api/rapports/par-jour
// @access  Private
export const getRapportParJour = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = {};

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) {
        matchQuery.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateVente.$lte = new Date(dateFin);
      }
    }

    // Ventes par jour
    const ventesParJour = await Vente.aggregate([
      {
        $match: {
          ...matchQuery,
          statutLivraison: { $ne: "annulé" },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateVente" },
          },
          nombreVentes: { $sum: 1 },
          montantTotal: { $sum: "$montantTotal" },
          montantVentes: { $sum: "$prixVente" },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Dépenses par jour
    let depensesMatchQuery = {};
    if (dateDebut || dateFin) {
      depensesMatchQuery.dateDepense = {};
      if (dateDebut) {
        depensesMatchQuery.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        depensesMatchQuery.dateDepense.$lte = new Date(dateFin);
      }
    }

    const depensesParJour = await Depense.aggregate([
      { $match: depensesMatchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateDepense" },
          },
          montantTotal: { $sum: "$montant" },
          nombreDepenses: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Combiner les données
    const datesMap = new Map();

    ventesParJour.forEach((item) => {
      datesMap.set(item._id, {
        date: item._id,
        ventes: item.nombreVentes,
        montantVentes: item.montantVentes,
        depenses: 0,
        benefice: item.montantVentes,
      });
    });

    depensesParJour.forEach((item) => {
      if (datesMap.has(item._id)) {
        const data = datesMap.get(item._id);
        data.depenses = item.montantTotal;
        data.benefice = data.montantVentes - item.montantTotal;
      } else {
        datesMap.set(item._id, {
          date: item._id,
          ventes: 0,
          montantVentes: 0,
          depenses: item.montantTotal,
          benefice: -item.montantTotal,
        });
      }
    });

    const rapportParJour = Array.from(datesMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    res.status(200).json({
      success: true,
      count: rapportParJour.length,
      data: rapportParJour,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le rapport par semaine
// @route   GET /api/rapports/par-semaine
// @access  Private
export const getRapportParSemaine = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = {};

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) {
        matchQuery.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateVente.$lte = new Date(dateFin);
      }
    }

    // Ventes par semaine
    const ventesParSemaine = await Vente.aggregate([
      {
        $match: {
          ...matchQuery,
          statutLivraison: { $ne: "annulé" },
        },
      },
      {
        $group: {
          _id: {
            annee: { $year: "$dateVente" },
            semaine: { $week: "$dateVente" },
          },
          nombreVentes: { $sum: 1 },
          montantTotal: { $sum: "$montantTotal" },
          montantVentes: { $sum: "$prixVente" },
        },
      },
      { $sort: { "_id.annee": -1, "_id.semaine": -1 } },
    ]);

    // Dépenses par semaine
    let depensesMatchQuery = {};
    if (dateDebut || dateFin) {
      depensesMatchQuery.dateDepense = {};
      if (dateDebut) {
        depensesMatchQuery.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        depensesMatchQuery.dateDepense.$lte = new Date(dateFin);
      }
    }

    const depensesParSemaine = await Depense.aggregate([
      { $match: depensesMatchQuery },
      {
        $group: {
          _id: {
            annee: { $year: "$dateDepense" },
            semaine: { $week: "$dateDepense" },
          },
          montantTotal: { $sum: "$montant" },
        },
      },
      { $sort: { "_id.annee": -1, "_id.semaine": -1 } },
    ]);

    // Combiner les données
    const semainesMap = new Map();

    ventesParSemaine.forEach((item) => {
      const key = `${item._id.annee}-${item._id.semaine}`;
      semainesMap.set(key, {
        annee: item._id.annee,
        semaine: item._id.semaine,
        ventes: item.nombreVentes,
        montantVentes: item.montantVentes,
        depenses: 0,
        benefice: item.montantVentes,
      });
    });

    depensesParSemaine.forEach((item) => {
      const key = `${item._id.annee}-${item._id.semaine}`;
      if (semainesMap.has(key)) {
        const data = semainesMap.get(key);
        data.depenses = item.montantTotal;
        data.benefice = data.montantVentes - item.montantTotal;
      } else {
        semainesMap.set(key, {
          annee: item._id.annee,
          semaine: item._id.semaine,
          ventes: 0,
          montantVentes: 0,
          depenses: item.montantTotal,
          benefice: -item.montantTotal,
        });
      }
    });

    const rapportParSemaine = Array.from(semainesMap.values()).sort((a, b) => {
      if (a.annee !== b.annee) return b.annee - a.annee;
      return b.semaine - a.semaine;
    });

    res.status(200).json({
      success: true,
      count: rapportParSemaine.length,
      data: rapportParSemaine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le rapport par mois
// @route   GET /api/rapports/par-mois
// @access  Private
export const getRapportParMois = async (req, res, next) => {
  try {
    const { dateDebut, dateFin } = req.query;

    let matchQuery = {};

    if (dateDebut || dateFin) {
      matchQuery.dateVente = {};
      if (dateDebut) {
        matchQuery.dateVente.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        matchQuery.dateVente.$lte = new Date(dateFin);
      }
    }

    // Ventes par mois
    const ventesParMois = await Vente.aggregate([
      {
        $match: {
          ...matchQuery,
          statutLivraison: { $ne: "annulé" },
        },
      },
      {
        $group: {
          _id: {
            annee: { $year: "$dateVente" },
            mois: { $month: "$dateVente" },
          },
          nombreVentes: { $sum: 1 },
          montantTotal: { $sum: "$montantTotal" },
          montantVentes: { $sum: "$prixVente" },
        },
      },
      { $sort: { "_id.annee": -1, "_id.mois": -1 } },
    ]);

    // Dépenses par mois
    let depensesMatchQuery = {};
    if (dateDebut || dateFin) {
      depensesMatchQuery.dateDepense = {};
      if (dateDebut) {
        depensesMatchQuery.dateDepense.$gte = new Date(dateDebut);
      }
      if (dateFin) {
        depensesMatchQuery.dateDepense.$lte = new Date(dateFin);
      }
    }

    const depensesParMois = await Depense.aggregate([
      { $match: depensesMatchQuery },
      {
        $group: {
          _id: {
            annee: { $year: "$dateDepense" },
            mois: { $month: "$dateDepense" },
          },
          montantTotal: { $sum: "$montant" },
        },
      },
      { $sort: { "_id.annee": -1, "_id.mois": -1 } },
    ]);

    // Combiner les données
    const moisMap = new Map();

    ventesParMois.forEach((item) => {
      const key = `${item._id.annee}-${item._id.mois}`;
      moisMap.set(key, {
        annee: item._id.annee,
        mois: item._id.mois,
        ventes: item.nombreVentes,
        montantVentes: item.montantVentes,
        depenses: 0,
        benefice: item.montantVentes,
      });
    });

    depensesParMois.forEach((item) => {
      const key = `${item._id.annee}-${item._id.mois}`;
      if (moisMap.has(key)) {
        const data = moisMap.get(key);
        data.depenses = item.montantTotal;
        data.benefice = data.montantVentes - item.montantTotal;
      } else {
        moisMap.set(key, {
          annee: item._id.annee,
          mois: item._id.mois,
          ventes: 0,
          montantVentes: 0,
          depenses: item.montantTotal,
          benefice: -item.montantTotal,
        });
      }
    });

    const rapportParMois = Array.from(moisMap.values()).sort((a, b) => {
      if (a.annee !== b.annee) return b.annee - a.annee;
      return b.mois - a.mois;
    });

    res.status(200).json({
      success: true,
      count: rapportParMois.length,
      data: rapportParMois,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le rapport par balle
// @route   GET /api/rapports/par-balle
// @access  Private
export const getRapportParBalle = async (req, res, next) => {
  try {
    const balles = await Balle.find().sort({ createdAt: -1 });

    const rapportParBalle = await Promise.all(
      balles.map(async (balle) => {
        const ventes = await Vente.countDocuments({
          balle: balle._id,
          statutLivraison: { $ne: "annulé" },
        });

        const depenses = await Depense.find({ balle: balle._id });
        const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

        return {
          id: balle._id,
          nom: balle.nom,
          numero: balle.numero,
          prixAchat: balle.prixAchat,
          totalVentes: balle.totalVentes,
          nombreVentes: ventes,
          depenses: totalDepenses,
          benefice: balle.benefice,
          statut: balle.statut,
        };
      }),
    );

    res.status(200).json({
      success: true,
      count: rapportParBalle.length,
      data: rapportParBalle,
    });
  } catch (error) {
    next(error);
  }
};
