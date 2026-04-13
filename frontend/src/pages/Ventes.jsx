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
  FaSearch,
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

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " Ar";
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

const BeneficePill = ({ value, size = 11 }) => {
  const pos = value >= 0;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 7px",
        borderRadius: 10,
        fontSize: size,
        fontWeight: 700,
        background: pos ? "#dcfce7" : "#fee2e2",
        color: pos ? "#166534" : "#dc2626",
        border: `1px solid ${pos ? "#bbf7d0" : "#fecaca"}`,
        whiteSpace: "nowrap",
      }}
    >
      {pos ? "+" : ""}
      {fmt(value)}
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

  // FIX scroll : type="button" sur tous les boutons hors formulaire
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

  const counts = {};
  CATEGORIES_CONFIG.forEach(({ key }) => {
    const list =
      key === "toutes"
        ? ventes
        : ventes.filter((v) => getCategorieVente(v) === key);
    counts[key] = list.length;
  });

  const totalFiltre = ventesFiltered.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );
  const beneficeFiltre = ventesFiltered
    .filter((v) => v.statutLivraison !== "annulé")
    .reduce((acc, v) => acc + (v.totalBenefice || 0), 0);

  const PBtn = ({ value, label }) => {
    const active = filterPeriode === value;
    return (
      <button
        type="button"
        onClick={() => {
          setFilterPeriode(value);
          setFilterDateSpec("");
        }}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          border: active ? "none" : "1.5px solid #e2e8f0",
          background: active ? "#2563eb" : "white",
          color: active ? "white" : "#64748b",
          fontWeight: active ? 700 : 500,
          whiteSpace: "nowrap",
          boxShadow: active ? "0 2px 6px rgba(37,99,235,0.25)" : "none",
          transition: "all 0.15s",
        }}
      >
        {label}
      </button>
    );
  };

  if (loading.ventes && ventes.length === 0)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  // ── Carte mobile ────────────────────────────────────────────────────────────
  const VenteCard = ({ vente }) => {
    const grouped = isGroupee(vente);
    const expanded = expandedVentes.has(vente._id);
    const canAdd = vente.statutLivraison !== "annulé";
    const catVente = getCategorieVente(vente);

    return (
      <div
        style={{
          background: "white",
          borderRadius: 14,
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: 10,
          overflow: "hidden",
          borderLeft: `4px solid ${grouped ? "#2563eb" : "#e2e8f0"}`,
        }}
      >
        <div style={{ padding: "12px 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ fontSize: 14, color: "#0f172a" }}>
                  {vente.nomClient}
                </strong>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/ventes/${vente._id}/ajouter-produit`)
                    }
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
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
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                {vente.telephoneClient} · {fmtDate(vente.dateVente)}
              </div>
            </div>
            <button
              type="button"
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <CategorieBadge categorie={catVente} />
            <span
              style={{
                fontSize: 13,
                color: "#1e293b",
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
                  <FaBoxOpen size={12} /> {vente.produits.length} produits
                </span>
              ) : (
                <>
                  {vente.nomProduit}
                  {vente.tailleProduit && (
                    <span style={{ color: "#94a3b8" }}>
                      {" "}
                      · {vente.tailleProduit}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          <div
            style={{
              background: "#f8fafc",
              borderRadius: 10,
              padding: "8px 12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {[
              { label: "Vente", value: vente.prixVente, color: "#1d4ed8" },
              { label: "Achat", value: vente.totalAchat, color: "#92400e" },
              {
                label: "Total",
                value: vente.montantTotal,
                color: "#059669",
                bold: true,
              },
            ].map(({ label, value, color, bold }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{ fontSize: 12, fontWeight: bold ? 800 : 600, color }}
                >
                  {fmt(value || 0)}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Bénéfice :</span>
            <BeneficePill value={vente.totalBenefice || 0} size={12} />
            {vente.fraisLivraison > 0 && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                · Frais : <strong>{fmt(vente.fraisLivraison)}</strong>
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {vente.livreur ? `🚚 ${vente.livreur.nom}` : "Pas de livreur"}
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {grouped && (
                <button
                  type="button"
                  onClick={() => toggleExpand(vente._id)}
                  style={{
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {expanded ? (
                    <FaChevronUp size={10} />
                  ) : (
                    <FaChevronDown size={10} />
                  )}
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
                  type="button"
                  className="btn btn-sm btn-icon btn-danger"
                  onClick={() => handleAnnuler(vente._id)}
                >
                  <FaBan />
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-icon btn-danger"
                onClick={() => handleDelete(vente._id, vente.nomClient)}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        </div>

        {grouped && expanded && (
          <div
            style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}
          >
            {vente.produits.map((pe, idx) => (
              <div
                key={pe._id || idx}
                style={{
                  padding: "10px 14px",
                  borderBottom:
                    idx < vente.produits.length - 1
                      ? "1px solid #e2e8f0"
                      : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: "#94a3b8", marginRight: 4 }}>
                      #{idx + 1}
                    </span>
                    {pe.nomProduit}
                    {pe.tailleProduit && (
                      <span style={{ color: "#94a3b8", fontWeight: 400 }}>
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
                      marginTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <CategorieBadge categorie={pe.categorie || "autres"} />
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      V : <strong>{fmt(pe.prixVente)}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: "#92400e" }}>
                      A : <strong>{fmt(pe.prixAchat || 0)}</strong>
                    </span>
                    <BeneficePill
                      value={
                        pe.benefice ?? (pe.prixVente || 0) - (pe.prixAchat || 0)
                      }
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {vente.statutLivraison !== "annulé" && (
                    <button
                      type="button"
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
                        type="button"
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

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventes</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
            {ventes.length} vente{ventes.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          to="/ventes/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
          }}
        >
          <FaPlus size={12} /> {!isMobile && "Nouvelle vente"}
        </Link>
      </div>

      {/* Onglets catégories */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
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
              type="button"
              onClick={() => setActiveCategory(cfg.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 14px",
                borderRadius: 12,
                cursor: "pointer",
                border: active
                  ? `2px solid ${cfg.border}`
                  : "2px solid transparent",
                background: active ? cfg.lightBg : "white",
                boxShadow: active
                  ? `0 2px 8px ${cfg.color}22`
                  : "0 1px 3px rgba(0,0,0,0.07)",
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
                    color: active ? cfg.text : "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile && cfg.key !== "toutes"
                    ? cfg.label.split(" ")[0]
                    : cfg.label}
                </span>
              </div>
              <span
                style={{
                  background: active ? cfg.color : "#e2e8f0",
                  color: active ? "white" : "#64748b",
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

      {/* Mini-stats */}
      {activeCategory === "toutes" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: isMobile ? 6 : 10,
            marginBottom: 14,
          }}
        >
          {CATEGORIES_CONFIG.filter((c) => c.key !== "toutes").map((cfg) => {
            const list = ventes.filter(
              (v) =>
                getCategorieVente(v) === cfg.key &&
                v.statutLivraison !== "annulé",
            );
            const total = list.reduce((s, v) => s + (v.prixVente || 0), 0);
            const ben = list.reduce((s, v) => s + (v.totalBenefice || 0), 0);
            return (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setActiveCategory(cfg.key)}
                style={{
                  background: cfg.lightBg,
                  border: `1.5px solid ${cfg.border}`,
                  borderRadius: 12,
                  padding: isMobile ? "8px 10px" : "12px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 700,
                    color: cfg.text,
                    marginBottom: 3,
                  }}
                >
                  {cfg.icon} {isMobile ? cfg.label.split(" ")[0] : cfg.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: cfg.text,
                    opacity: 0.7,
                    marginBottom: 3,
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
                  {new Intl.NumberFormat("fr-FR").format(total)} Ar
                </div>
                {!isMobile && (
                  <div
                    style={{
                      fontSize: 11,
                      color: ben >= 0 ? "#166534" : "#dc2626",
                      marginTop: 2,
                      fontWeight: 600,
                    }}
                  >
                    Bén. : {new Intl.NumberFormat("fr-FR").format(ben)} Ar
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div
        style={{
          background: "white",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            style={{
              flex: "0 0 auto",
              width: 140,
              fontSize: 13,
              padding: "9px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
              color: "#1e293b",
              outline: "none",
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
          <div style={{ flex: 1, minWidth: 120, position: "relative" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                fontSize: 12,
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              style={{
                width: "100%",
                fontSize: 13,
                padding: "9px 12px 9px 32px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                background: "#f8fafc",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Rechercher client, produit…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
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
            style={{
              padding: "6px 10px",
              fontSize: 12,
              width: isMobile ? "100%" : 145,
              border:
                filterPeriode === "date"
                  ? "2px solid #2563eb"
                  : "1.5px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
              color: "#1e293b",
              outline: "none",
            }}
            value={filterDateSpec}
            onChange={(e) => {
              setFilterDateSpec(e.target.value);
              setFilterPeriode(e.target.value ? "date" : "tous");
            }}
          />
        </div>
      </div>

      {/* Résumé filtre */}
      {(filterPeriode !== "tous" ||
        activeCategory !== "toutes" ||
        searchTerm) && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
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
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 700 }}>
              Total : {fmt(totalFiltre)}
            </span>
            <BeneficePill value={beneficeFiltre} size={12} />
          </div>
        </div>
      )}

      {/* Contenu */}
      {ventesFiltered.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1.5px solid #e2e8f0",
            padding: "48px 24px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛍️</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 6,
            }}
          >
            Aucune vente trouvée
          </div>
          <div style={{ fontSize: 13 }}>
            {activeCategory !== "toutes"
              ? `Aucune vente dans "${CATEGORIES_CONFIG.find((c) => c.key === activeCategory)?.label}"`
              : "Essayez de modifier vos filtres"}
          </div>
        </div>
      ) : isMobile ? (
        <div>
          {ventesFiltered.map((v) => (
            <VenteCard key={v._id} vente={v} />
          ))}
        </div>
      ) : (
        /* Tableau desktop — 9 colonnes au lieu de 14 */
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1.5px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <table className="data-table">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ width: 36 }}></th>
                <th style={{ width: 82 }}>Date</th>
                <th>Client</th>
                <th>Produit / Cat. / Dest.</th>
                <th>Montants</th>
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
                      {/* Expand */}
                      <td style={{ textAlign: "center" }}>
                        {grouped && (
                          <button
                            type="button"
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
                            {expanded ? (
                              <FaChevronUp size={10} />
                            ) : (
                              <FaChevronDown size={10} />
                            )}
                          </button>
                        )}
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {fmtDate(vente.dateVente)}
                      </td>

                      {/* Client */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: 13 }}>
                              {vente.nomClient}
                            </strong>
                            <br />
                            <small style={{ color: "#94a3b8" }}>
                              {vente.telephoneClient}
                            </small>
                          </div>
                          {canAdd && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/ventes/${vente._id}/ajouter-produit`)
                              }
                              style={{
                                flexShrink: 0,
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
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
                      </td>

                      {/* Produit + catégorie + destination fusionnés */}
                      <td>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 4,
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
                              <FaBoxOpen size={11} /> {vente.produits.length}{" "}
                              produits
                            </span>
                          ) : (
                            <>
                              {vente.nomProduit}
                              {vente.tailleProduit && (
                                <small style={{ color: "#94a3b8" }}>
                                  {" "}
                                  · {vente.tailleProduit}
                                </small>
                              )}
                            </>
                          )}
                        </div>
                        <div
                          style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        >
                          <CategorieBadge categorie={catVente} />
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 8,
                              fontWeight: 500,
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
                        </div>
                      </td>

                      {/* Vente + Achat + Bénéfice dans une cellule */}
                      <td>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {fmt(vente.prixVente)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#92400e",
                            marginTop: 1,
                          }}
                        >
                          Achat : {fmt(vente.totalAchat || 0)}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <BeneficePill value={vente.totalBenefice || 0} />
                        </div>
                      </td>

                      {/* Total + frais si > 0 */}
                      <td>
                        <strong style={{ color: "#059669", fontSize: 13 }}>
                          {fmt(vente.montantTotal)}
                        </strong>
                        {vente.fraisLivraison > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            +{fmt(vente.fraisLivraison)} livr.
                          </div>
                        )}
                      </td>

                      {/* Livreur */}
                      <td style={{ fontSize: 12, color: "#475569" }}>
                        {vente.livreur ? (
                          vente.livreur.nom
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>—</span>
                        )}
                      </td>

                      {/* Statut */}
                      <td>
                        <button
                          type="button"
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

                      {/* Actions */}
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
                              type="button"
                              className="btn btn-sm btn-icon btn-danger"
                              onClick={() => handleAnnuler(vente._id)}
                            >
                              <FaBan />
                            </button>
                          )}
                          <button
                            type="button"
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

                    {/* Sous-lignes produits */}
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
                          <td style={{ color: "#94a3b8", fontSize: 11 }}>
                            #{idx + 1}
                          </td>
                          <td></td>
                          <td style={{ paddingLeft: 12 }}>
                            <strong style={{ fontSize: 13 }}>
                              {pe.nomProduit}
                            </strong>
                            {pe.tailleProduit && (
                              <small style={{ color: "#94a3b8" }}>
                                {" "}
                                · {pe.tailleProduit}
                              </small>
                            )}
                            <div style={{ marginTop: 3 }}>
                              <CategorieBadge
                                categorie={pe.categorie || "autres"}
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {fmt(pe.prixVente)}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#92400e",
                                marginTop: 1,
                              }}
                            >
                              Achat : {fmt(pe.prixAchat || 0)}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <BeneficePill
                                value={
                                  pe.benefice ??
                                  (pe.prixVente || 0) - (pe.prixAchat || 0)
                                }
                              />
                            </div>
                          </td>
                          <td colSpan={3}></td>
                          <td>
                            <div className="flex gap-10">
                              {vente.statutLivraison !== "annulé" && (
                                <button
                                  type="button"
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
                                    type="button"
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

      <style>{`
        input:focus, select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
          outline: none !important;
        }
        .data-table th { font-size: 11px; color: #64748b; letter-spacing: 0.05em; padding: 12px 14px; }
        .data-table td { vertical-align: middle; padding: 12px 14px; }
      `}</style>
    </div>
  );
};

export default Ventes;
