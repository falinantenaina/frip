import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " AR";

export const formatDate = (date) =>
  format(new Date(date), "dd/MM//yyyy", { locale: fr });

export const getPeriodeLabel = () => {
  if (filterPeriode === "jour") return "Aujourd'hui";
  if (filterPeriode === "semaine") return "Cette semaine";
  if (filterPeriode === "mois") return "Ce mois";
  if (filterPeriode === "date" && filterDateSpecifique)
    return format(parseISO(filterDateSpecifique), "dd MMMM yyyy", {
      locale: fr,
    });
  return null;
};

export const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";

export const fmtDate = (d) => format(new Date(d), "dd/MM/yyyy", { locale: fr });

export const getStatutClass = (s) =>
  ({
    en_attente: "en_attente",
    en_cours: "en_cours",
    livre: "livre",
    livré: "livre",
    annule: "annule",
    annulé: "annule",
  })[s] || "en_attente";
export const getStatutLabel = (s) =>
  ({
    en_attente: "En attente",
    en_cours: "En cours",
    livre: "Livré",
    livré: "Livré",
    annule: "Annulé",
    annulé: "Annulé",
  })[s] || s;
export const isGroupee = (v) => v.produits && v.produits.length > 1;
