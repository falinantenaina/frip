import {
  endOfDay,
  format,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Fragment, useEffect, useState } from "react";
import {
  FaBan,
  FaBoxOpen,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";

const CATEGORIES_CONFIG = [
  {
    key: "toutes",
    label: "Toutes",
    icon: "🛍️",
    color: "#2563eb",
    lightBg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1d4ed8",
  },
  {
    key: "chaussures",
    label: "Chaussures",
    icon: "👟",
    color: "#059669",
    lightBg: "#ecfdf5",
    border: "#6ee7b7",
    text: "#065f46",
  },
  {
    key: "robes",
    label: "Robes & Vêtements",
    icon: "👗",
    color: "#be185d",
    lightBg: "#fdf2f8",
    border: "#f9a8d4",
    text: "#9d174d",
  },
  {
    key: "autres",
    label: "Autres",
    icon: "📦",
    color: "#7c3aed",
    lightBg: "#f5f3ff",
    border: "#c4b5fd",
    text: "#5b21b6",
  },
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";
const fmtDate = (d) => format(new Date(d), "dd/MM/yyyy", { locale: fr });

const getStatutClass = (s) =>
  ({
    en_attente: "en_attente",
    en_cours: "en_cours",
    livré: "livre",
    annulé: "annule",
  })[s] || "en_attente";
const getStatutLabel = (s) =>
  ({
    en_attente: "En attente",
    en_cours: "En cours",
    livré: "Livré",
    annulé: "Annulé",
  })[s] || s;
const isGroupee = (v) => v.produits && v.produits.length > 1;

function getCategorieVente(vente) {
  if (vente.produits && vente.produits.length > 0) {
    const cats = [
      ...new Set(vente.produits.map((p) => p.categorie || "autres")),
    ];
    return cats.length === 1 ? cats[0] : "autres";
  }
  return vente.categorie || "autres";
}

const CategorieBadge = ({ categorie }) => {
  const cfg =
    CATEGORIES_CONFIG.find((c) => c.key === categorie) || CATEGORIES_CONFIG[3];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.lightBg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
};

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
  const navigate = useNavigate();

  const [filterStatut, setFilterStatut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("tous");
  const [filterDateSpec, setFilterDateSpec] = useState("");
  const [expandedVentes, setExpandedVentes] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState("toutes");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  console.log(ventes);

  useEffect(() => {
    fetchVentes();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const h = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", h);
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
    const next = map[currentStatut];
    if (!next) return;
    const r = await updateVente(id, { statutLivraison: next });
    r.success
      ? toast.success(`Statut → "${getStatutLabel(next)}"`)
      : toast.error(r.message || "Erreur");
  };

  const handleSupprimerProduit = async (venteId, peId, nom) => {
    if (!window.confirm(`Retirer "${nom}" ?`)) return;
    const r = await supprimerProduit(venteId, peId);
    r.success
      ? toast.success("Produit retiré")
      : toast.error(r.message || "Erreur");
  };

  /* ── Filtrage ─────────────────────────────────────────────────────────── */
  const ventesFiltered = ventes.filter((v) => {
    if (filterStatut && v.statutLivraison !== filterStatut) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const hit =
        v.nomClient.toLowerCase().includes(s) ||
        v.telephoneClient.includes(s) ||
        v.nomProduit?.toLowerCase().includes(s) ||
        (v.produits || []).some((p) => p.nomProduit?.toLowerCase().includes(s));
      if (!hit) return false;
    }
    const dv = new Date(v.dateVente);
    if (filterPeriode === "jour" && !isToday(dv)) return false;
    if (filterPeriode === "semaine" && !isThisWeek(dv, { weekStartsOn: 1 }))
      return false;
    if (filterPeriode === "mois" && !isThisMonth(dv)) return false;
    if (filterPeriode === "date" && filterDateSpec) {
      const debut = startOfDay(parseISO(filterDateSpec));
      const fin = endOfDay(parseISO(filterDateSpec));
      if (dv < debut || dv > fin) return false;
    }
    if (activeCategory !== "toutes" && getCategorieVente(v) !== activeCategory)
      return false;
    return true;
  });

  /* compteurs onglets */
  const counts = {};
  const totals = {};
  CATEGORIES_CONFIG.forEach(({ key }) => {
    const list =
      key === "toutes"
        ? ventes
        : ventes.filter((v) => getCategorieVente(v) === key);
    counts[key] = list.length;
    totals[key] = list
      .filter((v) => v.statutLivraison !== "annulé")
      .reduce((s, v) => s + (v.prixVente || 0), 0);
  });

  const totalFiltre = ventesFiltered.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );

  const PBtn = ({ value, label }) => (
    <button
      onClick={() => {
        setFilterPeriode(value);
        setFilterDateSpec("");
      }}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        border:
          filterPeriode === value ? "none" : "1px solid var(--border-color)",
        background: filterPeriode === value ? "var(--primary-color)" : "white",
        color: filterPeriode === value ? "white" : "var(--secondary-color)",
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

  /* ── Carte mobile ─────────────────────────────────────────────────────── */
  const VenteCard = ({ vente }) => {
    const grouped = isGroupee(vente);
    const expanded = expandedVentes.has(vente._id);
    const canAdd = vente.statutLivraison !== "annulé";
    const catVente = getCategorieVente(vente);

    return (
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "var(--shadow)",
          marginBottom: 10,
          overflow: "hidden",
          borderLeft: `4px solid ${grouped ? "#2563eb" : "var(--border-color)"}`,
        }}
      >
        <div style={{ padding: "11px 13px" }}>
          {/* Ligne 1 : client + statut */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexWrap: "wrap",
                }}
              >
                <strong
                  style={{
                    fontSize: 14,
                    color: "var(--dark-color)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {vente.nomClient}
                </strong>
                {canAdd && (
                  <button
                    onClick={() =>
                      navigate(`/ventes/${vente._id}/ajouter-produit`)
                    }
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: 19,
                      height: 19,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 8,
                    }}
                  >
                    <FaPlus />
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--secondary-color)",
                  marginTop: 1,
                }}
              >
                {vente.telephoneClient} · {fmtDate(vente.dateVente)}
              </div>
            </div>
            <button
              className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
              onClick={() =>
                handleChangeStatut(vente._id, vente.statutLivraison)
              }
              style={{
                cursor:
                  vente.statutLivraison === "annulé"
                    ? "not-allowed"
                    : "pointer",
                border: "none",
                flexShrink: 0,
                opacity: vente.statutLivraison === "annulé" ? 0.6 : 1,
                fontSize: 11,
              }}
              disabled={vente.statutLivraison === "annulé"}
            >
              {getStatutLabel(vente.statutLivraison)}
            </button>
          </div>

          {/* Ligne 2 : catégorie + produit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexWrap: "wrap",
              marginBottom: 5,
            }}
          >
            <CategorieBadge categorie={catVente} />
            <span
              style={{
                fontSize: 13,
                color: "var(--dark-color)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {grouped ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#1d4ed8",
                    fontWeight: 600,
                  }}
                >
                  <FaBoxOpen />
                  {vente.produits.length} produits
                </span>
              ) : (
                <>
                  {vente.nomProduit}
                  {vente.tailleProduit && (
                    <span style={{ color: "var(--secondary-color)" }}>
                      {" "}
                      · {vente.tailleProduit}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          {/* Ligne 3 : montants */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 12,
              marginBottom: 7,
            }}
          >
            <span style={{ color: "var(--secondary-color)" }}>
              Vente&nbsp;:{" "}
              <strong style={{ color: "var(--dark-color)" }}>
                {fmt(vente.prixVente)}
              </strong>
            </span>
            {vente.fraisLivraison > 0 && (
              <span style={{ color: "var(--secondary-color)" }}>
                Frais&nbsp;: <strong>{fmt(vente.fraisLivraison)}</strong>
              </span>
            )}
            <span style={{ color: "var(--secondary-color)" }}>
              Total&nbsp;:{" "}
              <strong style={{ color: "var(--success-color)" }}>
                {fmt(vente.montantTotal)}
              </strong>
            </span>
          </div>

          {/* Ligne 4 : livreur + actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "var(--secondary-color)" }}>
              {vente.livreur ? `🚚 ${vente.livreur.nom}` : "Pas de livreur"}
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {grouped && (
                <button
                  onClick={() => toggleExpand(vente._id)}
                  style={{
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 7px",
                    cursor: "pointer",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {expanded ? <FaChevronUp /> : <FaChevronDown />}
                  {expanded ? "Masquer" : "Voir"}
                </button>
              )}
              <Link
                to={`/ventes/${vente._id}/edit`}
                className="btn btn-sm btn-icon btn-secondary"
              >
                <FaEdit />
              </Link>
              {vente.statutLivraison !== "annulé" && (
                <button
                  className="btn btn-sm btn-icon btn-danger"
                  onClick={() => handleAnnuler(vente._id)}
                >
                  <FaBan />
                </button>
              )}
              <button
                className="btn btn-sm btn-icon btn-danger"
                onClick={() => handleDelete(vente._id, vente.nomClient)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        {/* Sous-produits */}
        {grouped && expanded && (
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              background: "#f8fafc",
            }}
          >
            {vente.produits.map((pe, idx) => (
              <div
                key={pe._id || idx}
                style={{
                  padding: "8px 13px",
                  borderBottom:
                    idx < vente.produits.length - 1
                      ? "1px solid var(--border-color)"
                      : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ color: "#94a3b8", marginRight: 4 }}>
                      #{idx + 1}
                    </span>
                    {pe.nomProduit}
                    {pe.tailleProduit && (
                      <span
                        style={{
                          color: "var(--secondary-color)",
                          fontWeight: 400,
                        }}
                      >
                        {" "}
                        · {pe.tailleProduit}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      marginTop: 3,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: "var(--secondary-color)" }}
                    >
                      {fmt(pe.prixVente)}
                    </span>
                    <CategorieBadge categorie={pe.categorie || "autres"} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {vente.statutLivraison !== "annulé" && (
                    <button
                      className="btn btn-sm btn-icon btn-secondary"
                      onClick={() =>
                        navigate(`/ventes/${vente._id}/produits/${pe._id}/edit`)
                      }
                    >
                      <FaEdit />
                    </button>
                  )}
                  {vente.produits.length > 1 &&
                    vente.statutLivraison !== "annulé" && (
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() =>
                          handleSupprimerProduit(
                            vente._id,
                            pe._id,
                            pe.nomProduit,
                          )
                        }
                      >
                        <FaTrash />
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Ventes</h1>
        <Link to="/ventes/new" className="btn btn-primary">
          <FaPlus /> {!isMobile && "Nouvelle vente"}
        </Link>
      </div>

      {/* ── Onglets catégories — scroll horizontal sur mobile ─────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {CATEGORIES_CONFIG.map((cfg) => {
          const active = activeCategory === cfg.key;
          return (
            <button
              key={cfg.key}
              onClick={() => setActiveCategory(cfg.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 12px",
                borderRadius: 10,
                cursor: "pointer",
                border: active
                  ? `2px solid ${cfg.border}`
                  : "2px solid transparent",
                background: active ? cfg.lightBg : "white",
                boxShadow: active
                  ? `0 2px 6px ${cfg.color}25`
                  : "0 1px 3px rgba(0,0,0,0.08)",
                transition: "all 0.15s",
                flexShrink: 0,
                minWidth: isMobile ? 76 : 100,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                <span
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? cfg.text : "var(--secondary-color)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile && cfg.key !== "toutes"
                    ? cfg.label.split(
                        " ",
                      )[0] /* "Chaussures", "Robes", "Autres" sur mobile */
                    : cfg.label}
                </span>
              </div>
              <span
                style={{
                  background: active ? cfg.color : "#e2e8f0",
                  color: active ? "white" : "var(--secondary-color)",
                  borderRadius: 20,
                  padding: "0px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {counts[cfg.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Mini-stats (vue Toutes uniquement) ────────────────────────── */}
      {activeCategory === "toutes" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: isMobile ? 6 : 10,
            marginBottom: 12,
          }}
        >
          {CATEGORIES_CONFIG.filter((c) => c.key !== "toutes").map((cfg) => {
            const list = ventes.filter(
              (v) =>
                getCategorieVente(v) === cfg.key &&
                v.statutLivraison !== "annulé",
            );
            const total = list.reduce((s, v) => s + (v.prixVente || 0), 0);
            return (
              <button
                key={cfg.key}
                onClick={() => setActiveCategory(cfg.key)}
                style={{
                  background: cfg.lightBg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 10,
                  padding: isMobile ? "8px 8px" : "10px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 700,
                    color: cfg.text,
                    marginBottom: 2,
                  }}
                >
                  {cfg.icon} {isMobile ? cfg.label.split(" ")[0] : cfg.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: cfg.text,
                    opacity: 0.75,
                    marginBottom: 2,
                  }}
                >
                  {list.length} vente{list.length > 1 ? "s" : ""}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 11 : 13,
                    fontWeight: 700,
                    color: cfg.text,
                  }}
                >
                  {new Intl.NumberFormat("fr-FR").format(total)} AR
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filtres ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: "white",
          padding: "11px 13px",
          borderRadius: 8,
          boxShadow: "var(--shadow)",
          marginBottom: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <select
            className="form-select"
            style={{ flex: "0 0 auto", width: 135, fontSize: 13 }}
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
            style={{ flex: 1, minWidth: 100, fontSize: 13 }}
            placeholder="Rechercher client, produit…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <PBtn value="tous" label="Tout" />
          <PBtn value="jour" label="Auj." />
          <PBtn value="semaine" label="Semaine" />
          <PBtn value="mois" label="Mois" />
          <input
            type="date"
            className="form-input"
            style={{
              padding: "5px 8px",
              fontSize: 12,
              width: isMobile ? "100%" : 145,
              border:
                filterPeriode === "date"
                  ? "2px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              borderRadius: 6,
            }}
            value={filterDateSpec}
            onChange={(e) => {
              setFilterDateSpec(e.target.value);
              setFilterPeriode(e.target.value ? "date" : "tous");
            }}
          />
        </div>
      </div>

      {/* ── Résumé ────────────────────────────────────────────────────── */}
      {(filterPeriode !== "tous" || activeCategory !== "toutes") && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "8px 13px",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 13, color: "#1d4ed8" }}>
            {activeCategory !== "toutes" && (
              <span>
                {CATEGORIES_CONFIG.find((c) => c.key === activeCategory)?.icon}{" "}
                <strong>
                  {
                    CATEGORIES_CONFIG.find((c) => c.key === activeCategory)
                      ?.label
                  }
                </strong>
                {" · "}
              </span>
            )}
            <strong>{ventesFiltered.length}</strong> vente(s)
          </span>
          <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 700 }}>
            {fmt(totalFiltre)}
          </span>
        </div>
      )}

      {/* ── Contenu ───────────────────────────────────────────────────── */}
      {ventesFiltered.length === 0 ? (
        <div className="table-container">
          <p className="no-data">
            {activeCategory !== "toutes"
              ? `Aucune vente dans "${CATEGORIES_CONFIG.find((c) => c.key === activeCategory)?.label}"`
              : "Aucune vente trouvée"}
          </p>
        </div>
      ) : isMobile ? (
        <div>
          {ventesFiltered.map((v) => (
            <VenteCard key={v._id} vente={v} />
          ))}
        </div>
      ) : (
        /* ── Tableau desktop ─────────────────────────────────────────── */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Date</th>
                <th>Client</th>
                <th>Produit(s)</th>
                <th>Catégorie</th>
                <th>Destination</th>
                <th>Vente</th>
                <th>Frais</th>
                <th>Total</th>
                <th>Livreur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ventesFiltered.map((vente) => {
                const grouped = isGroupee(vente);
                const expanded = expandedVentes.has(vente._id);
                const canAdd = vente.statutLivraison !== "annulé";
                const catVente = getCategorieVente(vente);

                return (
                  <Fragment key={vente._id}>
                    <tr style={grouped ? { background: "#f0f9ff" } : {}}>
                      <td style={{ textAlign: "center" }}>
                        {grouped && (
                          <button
                            onClick={() => toggleExpand(vente._id)}
                            style={{
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              border: "none",
                              borderRadius: 6,
                              padding: "3px 7px",
                              cursor: "pointer",
                            }}
                          >
                            {expanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(vente.dateVente)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <div>
                            <strong>{vente.nomClient}</strong>
                            <br />
                            <small className="text-secondary">
                              {vente.telephoneClient}
                            </small>
                          </div>
                          {canAdd && (
                            <button
                              onClick={() =>
                                navigate(`/ventes/${vente._id}/ajouter-produit`)
                              }
                              style={{
                                flexShrink: 0,
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: 24,
                                height: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: 10,
                              }}
                            >
                              <FaPlus />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        {grouped ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "#1d4ed8",
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            <FaBoxOpen /> {vente.produits.length} produits
                          </span>
                        ) : (
                          <>
                            {vente.nomProduit}
                            {vente.tailleProduit && (
                              <small className="text-secondary">
                                {" "}
                                · {vente.tailleProduit}
                              </small>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        <CategorieBadge categorie={catVente} />
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 7px",
                            borderRadius: 10,
                            background:
                              vente.destinationClient === "Antsirabe"
                                ? "#dbeafe"
                                : "#f0fdf4",
                            color:
                              vente.destinationClient === "Antsirabe"
                                ? "#1d4ed8"
                                : "#166534",
                          }}
                        >
                          {vente.destinationClient || "Local"}
                        </span>
                      </td>
                      <td>{fmt(vente.prixVente)}</td>
                      <td>{fmt(vente.fraisLivraison)}</td>
                      <td>
                        <strong className="text-success">
                          {fmt(vente.montantTotal)}
                        </strong>
                      </td>
                      <td>
                        {vente.livreur ? (
                          <>
                            {vente.livreur.nom}
                            <br />
                            <small className="text-secondary">
                              {vente.livreur.telephone}
                            </small>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                          onClick={() =>
                            handleChangeStatut(vente._id, vente.statutLivraison)
                          }
                          style={{
                            cursor:
                              vente.statutLivraison === "annulé"
                                ? "not-allowed"
                                : "pointer",
                            border: "none",
                            opacity:
                              vente.statutLivraison === "annulé" ? 0.6 : 1,
                          }}
                          disabled={vente.statutLivraison === "annulé"}
                        >
                          {getStatutLabel(vente.statutLivraison)}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-10">
                          <Link
                            to={`/ventes/${vente._id}/edit`}
                            className="btn btn-sm btn-icon btn-secondary"
                          >
                            <FaEdit />
                          </Link>
                          {vente.statutLivraison !== "annulé" && (
                            <button
                              className="btn btn-sm btn-icon btn-danger"
                              onClick={() => handleAnnuler(vente._id)}
                            >
                              <FaBan />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() =>
                              handleDelete(vente._id, vente.nomClient)
                            }
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {grouped &&
                      expanded &&
                      vente.produits.map((pe, idx) => (
                        <tr
                          key={`${vente._id}-p${idx}`}
                          style={{
                            background: "#f8fafc",
                            borderLeft: "4px solid #bfdbfe",
                          }}
                        >
                          <td></td>
                          <td
                            style={{
                              color: "#94a3b8",
                              fontSize: 12,
                              paddingLeft: 20,
                            }}
                          >
                            #{idx + 1}
                          </td>
                          <td></td>
                          <td style={{ paddingLeft: 14 }}>
                            <strong>{pe.nomProduit}</strong>
                            {pe.tailleProduit && (
                              <small className="text-secondary">
                                {" "}
                                · {pe.tailleProduit}
                              </small>
                            )}
                          </td>
                          <td>
                            <CategorieBadge
                              categorie={pe.categorie || "autres"}
                            />
                          </td>
                          <td></td>
                          <td>{fmt(pe.prixVente)}</td>
                          <td colSpan={4}></td>
                          <td>
                            <div className="flex gap-10">
                              {vente.statutLivraison !== "annulé" && (
                                <button
                                  className="btn btn-sm btn-icon btn-secondary"
                                  onClick={() =>
                                    navigate(
                                      `/ventes/${vente._id}/produits/${pe._id}/edit`,
                                    )
                                  }
                                >
                                  <FaEdit />
                                </button>
                              )}
                              {vente.produits.length > 1 &&
                                vente.statutLivraison !== "annulé" && (
                                  <button
                                    className="btn btn-sm btn-icon btn-danger"
                                    onClick={() =>
                                      handleSupprimerProduit(
                                        vente._id,
                                        pe._id,
                                        pe.nomProduit,
                                      )
                                    }
                                  >
                                    <FaTrash />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Ventes;
