import {
  endOfDay,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { VenteCard } from "../components/ventes/VenteCard";
import { VenteSummary } from "../components/ventes/VenteSummary";
import { VenteTable } from "../components/ventes/VenteTable";
import { getStatutLabel } from "../helpers";
import useAppStore from "../stores/appStore";

const Ventes = () => {
  const {
    ventes,
    loading,
    fetchVentes,
    deleteVente,
    annulerVente,
    updateVente,
    supprimerProduit,
  } = useAppStore();
  const [filterStatut, setFilterStatut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("tous");
  const [filterDateSpecifique, setFilterDateSpecifique] = useState("");
  const [expandedVentes, setExpandedVentes] = useState(new Set());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    fetchVentes();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchVentes({ statutLivraison: filterStatut || undefined }, true);
  }, [filterStatut]);

  const toggleExpand = (id) =>
    setExpandedVentes((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleDelete = async (id, client) => {
    if (!window.confirm(`Supprimer la vente de ${client} ?`)) return;
    const r = await deleteVente(id);
    r.success
      ? toast.success("Vente supprimée")
      : toast.error(r.message || "Erreur");
  };

  const handleAnnuler = async (id) => {
    const raison = prompt("Raison de l'annulation:");
    if (!raison) return;
    const r = await annulerVente(id, raison);
    r.success
      ? toast.success("Vente annulée")
      : toast.error(r.message || "Erreur");
  };

  const handleChangeStatut = async (id, currentStatut) => {
    const map = {
      en_attente: "en_cours",
      en_cours: "livré",
      livré: "en_attente",
    };
    const nextStatut = map[currentStatut];
    if (!nextStatut) return;
    const r = await updateVente(id, { statutLivraison: nextStatut });
    r.success
      ? toast.success(`Statut → "${getStatutLabel(nextStatut)}"`)
      : toast.error(r.message || "Erreur");
  };

  const handleSupprimerProduit = async (
    venteId,
    produitEntryId,
    nomProduit,
  ) => {
    if (!window.confirm(`Retirer "${nomProduit}" ?`)) return;
    const r = await supprimerProduit(venteId, produitEntryId);
    r.success
      ? toast.success("Produit retiré")
      : toast.error(r.message || "Erreur");
  };

  const filteredVentes = ventes.filter((v) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (
        !v.nomClient.toLowerCase().includes(s) &&
        !v.telephoneClient.includes(s) &&
        !v.nomProduit?.toLowerCase().includes(s) &&
        !(v.produits || []).some((p) => p.nomProduit?.toLowerCase().includes(s))
      )
        return false;
    }
    const dv = new Date(v.dateVente);
    if (filterPeriode === "jour") return isToday(dv);
    if (filterPeriode === "semaine") return isThisWeek(dv, { weekStartsOn: 1 });
    if (filterPeriode === "mois") return isThisMonth(dv);
    if (filterPeriode === "date" && filterDateSpecifique) {
      const debut = startOfDay(parseISO(filterDateSpecifique));
      const fin = endOfDay(parseISO(filterDateSpecifique));
      return dv >= debut && dv <= fin;
    }
    return true;
  });

  const totalFiltre = filteredVentes.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );

  const PeriodeBtn = ({ value, label }) => (
    <button
      onClick={() => {
        setFilterPeriode(value);
        setFilterDateSpecifique("");
      }}
      style={{
        padding: isMobile ? "6px 10px" : "7px 14px",
        borderRadius: 6,
        border:
          filterPeriode === value ? "none" : "1px solid var(--border-color)",
        background: filterPeriode === value ? "var(--primary-color)" : "white",
        color: filterPeriode === value ? "white" : "var(--secondary-color)",
        cursor: "pointer",
        fontSize: isMobile ? 12 : 13,
        fontWeight: filterPeriode === value ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  if (loading.ventes && ventes.length === 0)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Ventes</h1>
        <Link to="/ventes/new" className="btn btn-primary">
          <FaPlus />
          {!isMobile && " Nouvelle vente"}
        </Link>
      </div>

      {/* Filtres */}
      <div
        style={{
          background: "white",
          padding: isMobile ? "12px" : "16px 20px",
          borderRadius: 8,
          boxShadow: "var(--shadow)",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            className="form-select"
            style={{
              flex: "0 0 auto",
              minWidth: 130,
              fontSize: isMobile ? 13 : 14,
            }}
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="livré">Livré</option>
            <option value="annulé">Annulé</option>
          </select>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, minWidth: 120 }}
            placeholder="Rechercher client, produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <PeriodeBtn value="tous" label="Tout" />
          <PeriodeBtn value="jour" label="Aujourd'hui" />
          <PeriodeBtn value="semaine" label="Semaine" />
          <PeriodeBtn value="mois" label="Mois" />
          <input
            type="date"
            className="form-input"
            style={{
              padding: "6px 10px",
              fontSize: 13,
              width: isMobile ? "100%" : 150,
              border:
                filterPeriode === "date"
                  ? "2px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              borderRadius: 6,
            }}
            value={filterDateSpecifique}
            onChange={(e) => {
              setFilterDateSpecifique(e.target.value);
              setFilterPeriode(e.target.value ? "date" : "tous");
            }}
          />
        </div>
      </div>

      {/* Résumé période */}
      <VenteSummary
        filteredVentes={filteredVentes}
        filterPeriode={filterPeriode}
      />

      {filteredVentes.length === 0 ? (
        <div className="table-container">
          <p className="no-data">Aucune vente trouvée</p>
        </div>
      ) : isMobile ? (
        /* ── VUE CARTES (mobile) ── */
        <div>
          {filteredVentes.map((vente) => (
            <VenteCard
              key={vente._id}
              vente={vente}
              expandedVentes={expandedVentes}
              onChangeStatut={handleChangeStatut}
              onSuppr={handleSupprimerProduit}
              onToggle={toggleExpand}
              onCancel={handleAnnuler}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* ── VUE TABLEAU (desktop) ── */
        <VenteTable
          filteredVentes={filteredVentes}
          vente={ventes}
          expandedVentes={expandedVentes}
          onChangeStatut={handleChangeStatut}
          onSuppr={handleSupprimerProduit}
          onCancel={handleAnnuler}
          onToggle={toggleExpand}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Ventes;
