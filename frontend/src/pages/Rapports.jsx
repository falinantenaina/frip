import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../utils/api";

// ── Constantes ────────────────────────────────────────────────────────────────
const MOIS = [
  "",
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
const fmtAR = (n) => fmt(n) + " AR";

const PIE_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const CAT_CONFIG = {
  chaussures: {
    label: "👟 Chaussures",
    color: "#2563eb",
    bg: "#dbeafe",
    textColor: "#1d4ed8",
  },
  robes: {
    label: "👗 Robes / Vêtements",
    color: "#be185d",
    bg: "#fce7f3",
    textColor: "#9d174d",
  },
  autres: {
    label: "📦 Autres",
    color: "#64748b",
    bg: "#f1f5f9",
    textColor: "#475569",
  },
};

// ── Composants réutilisables ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <p
        style={{ fontWeight: 600, marginBottom: 6, color: "var(--dark-color)" }}
      >
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: p.color, margin: "2px 0" }}>
          {p.name} : {fmtAR(p.value)}
        </p>
      ))}
    </div>
  );
};

const KPI = ({
  icon,
  label,
  value,
  sub,
  color = "var(--primary-color)",
  bgColor,
}) => (
  <div
    style={{
      background: bgColor || "white",
      borderRadius: 12,
      padding: "18px 20px",
      boxShadow: "var(--shadow)",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: color + "22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--dark-color)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{ fontSize: 13, color: "var(--secondary-color)", marginTop: 2 }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const BeneficeCard = ({
  titre,
  icon,
  ca,
  charges,
  chargesLabel,
  benefice,
  color,
}) => (
  <div
    style={{
      background: "white",
      borderRadius: 12,
      padding: 20,
      boxShadow: "var(--shadow)",
      borderTop: `3px solid ${color}`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <strong style={{ fontSize: 16 }}>{titre}</strong>
    </div>
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--secondary-color)" }}>
          Chiffre d'affaires
        </span>
        <strong style={{ color: "var(--success-color)" }}>{fmtAR(ca)}</strong>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--secondary-color)" }}>{chargesLabel}</span>
        <strong style={{ color: "var(--danger-color)" }}>
          − {fmtAR(charges)}
        </strong>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 0 0",
          borderTop: "2px solid var(--border-color)",
          fontWeight: 700,
        }}
      >
        <span>Bénéfice</span>
        <strong
          style={{
            fontSize: 18,
            color:
              benefice >= 0 ? "var(--success-color)" : "var(--danger-color)",
          }}
        >
          {fmtAR(benefice)}
        </strong>
      </div>
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3
    style={{
      fontSize: 15,
      fontWeight: 700,
      color: "var(--dark-color)",
      marginBottom: 16,
      paddingBottom: 8,
      borderBottom: "2px solid var(--border-color)",
    }}
  >
    {children}
  </h3>
);

// ── Composant principal ───────────────────────────────────────────────────────
const Rapports = () => {
  const [periode, setPeriode] = useState("month");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("global");

  const [data, setData] = useState(null);
  const [rapportParJour, setRapportParJour] = useState([]);
  const [rapportParMois, setRapportParMois] = useState([]);
  const [rapportParSemaine, setRapportParSemaine] = useState([]);
  const [rapportParBalle, setRapportParBalle] = useState([]);
  const [rapportExpeditions, setRapportExpeditions] = useState(null);
  const [rapportCategories, setRapportCategories] = useState(null);

  useEffect(() => {
    loadRapports();
  }, [periode]);

  const getDateParams = () => {
    const now = new Date();
    let dateDebut, dateFin;
    switch (periode) {
      case "today":
        dateDebut = dateFin = format(now, "yyyy-MM-dd");
        break;
      case "week":
        dateDebut = format(subDays(now, 7), "yyyy-MM-dd");
        dateFin = format(now, "yyyy-MM-dd");
        break;
      case "month":
        dateDebut = format(startOfMonth(now), "yyyy-MM-dd");
        dateFin = format(endOfMonth(now), "yyyy-MM-dd");
        break;
      case "year":
        dateDebut = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");
        dateFin = format(now, "yyyy-MM-dd");
        break;
      default:
        return "";
    }
    return `?dateDebut=${dateDebut}&dateFin=${dateFin}`;
  };

  const loadRapports = async () => {
    setLoading(true);
    try {
      const p = getDateParams();
      const [g, j, m, s, b, e, cat] = await Promise.all([
        api.get(`/rapports/global${p}`),
        api.get(`/rapports/par-jour${p}`),
        api.get(`/rapports/par-mois`),
        api.get(`/rapports/par-semaine${p}`),
        api.get(`/rapports/par-balle`),
        api.get(`/rapports/expeditions${p}`),
        api.get(`/rapports/par-categorie${p}`),
      ]);
      setData(g.data.data);
      setRapportParJour(j.data.data.slice(0, 30).reverse());
      setRapportParMois(m.data.data.slice(0, 12).reverse());
      setRapportParSemaine(s.data.data.slice(0, 12).reverse());
      setRapportParBalle(b.data.data);
      setRapportExpeditions(e.data.data);
      setRapportCategories(cat.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  const g = data || {};
  const benefices = g.benefices || {};

  const depensesParType =
    g.depenses?.parType?.map((d, i) => ({
      name: d._id,
      value: d.total,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })) || [];

  const TABS = [
    
    { id: "benefices", label: "💰 Bénéfices" },
    { id: "global", label: "📊 Vue globale" },
    { id: "categories", label: "👟 Par catégorie" },
    { id: "periode", label: "📅 Période" },
    { id: "semaine", label: "📆 Par semaine" },
    { id: "balle", label: "📦 Par balle" },
    { id: "expedition", label: "🚚 Expéditions" },
  ];

  return (
    <div className="main-content">
      {/* ── En-tête ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports & Statistiques</h1>
          <p className="text-secondary">
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <select
          className="form-select"
          style={{ minWidth: 150 }}
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        >
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="year">Cette année</option>
        </select>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === t.id ? "var(--primary-color)" : "white",
              color: activeTab === t.id ? "white" : "var(--secondary-color)",
              boxShadow:
                activeTab === t.id
                  ? "0 2px 8px rgba(37,99,235,0.3)"
                  : "var(--shadow)",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          TAB : VUE GLOBALE
      ════════════════════════════════════════════════════ */}
      {activeTab === "global" && g.ventes && (
        <>
          {/* KPI principaux */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <KPI
              icon="💰"
              label="Chiffre d'affaires total"
              value={fmtAR(g.ventes.montantVentes)}
              color="var(--primary-color)"
              sub={`${g.ventes.totalVentes} vente(s)`}
            />
            <KPI
              icon="💸"
              label="Total dépenses"
              value={fmtAR(g.depenses?.totalDepenses)}
              color="var(--danger-color)"
              sub={`${g.depenses?.nombreDepenses} entrée(s)`}
            />
            <KPI
              icon="🚚"
              label="Frais expéditions réels"
              value={fmtAR(g.expeditions?.totalFrais)}
              color="var(--warning-color)"
              sub={`${g.expeditions?.totalExpeditions} expédition(s) expédiée(s)`}
            />
            <KPI
              icon={benefices.net >= 0 ? "📈" : "📉"}
              label="Bénéfice net global"
              value={fmtAR(Math.abs(benefices.net))}
              color={
                benefices.net >= 0
                  ? "var(--success-color)"
                  : "var(--danger-color)"
              }
              sub={benefices.net >= 0 ? "Positif ✅" : "Négatif ⚠️"}
              bgColor={benefices.net >= 0 ? "#f0fdf4" : "#fef2f2"}
            />
          </div>

          {/* Répartition des ventes par type */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionTitle>🏷️ Répartition des ventes par type</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {[
                {
                  label: "📦 Ventes par balle",
                  montant: g.ventes.parBalle?.montant || 0,
                  count: g.ventes.parBalle?.count || 0,
                  color: "#2563eb",
                  bg: "#eff6ff",
                },
                {
                  label: "🛒 Ventes libres",
                  montant: g.ventes.libres?.montantVentes || 0,
                  count: g.ventes.libres?.count || 0,
                  benefice: g.ventes.libres?.benefice,
                  color: "#059669",
                  bg: "#f0fdf4",
                },
                {
                  label: "✈️ Ventes expédiées",
                  montant: g.ventes.expediees?.montant || 0,
                  count: g.ventes.expediees?.count || 0,
                  color: "#d97706",
                  bg: "#fef3c7",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: item.bg,
                    borderRadius: 10,
                    padding: "14px 16px",
                    borderLeft: `4px solid ${item.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: item.color,
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--dark-color)",
                      marginBottom: 4,
                    }}
                  >
                    {fmtAR(item.montant)}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "var(--secondary-color)" }}
                  >
                    {item.count} vente(s)
                    {item.benefice !== undefined && (
                      <span
                        style={{
                          color: item.benefice >= 0 ? "#059669" : "#dc2626",
                          marginLeft: 8,
                        }}
                      >
                        · Bén. {fmtAR(item.benefice)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ventes par catégorie */}
          {rapportCategories?.statsParCategorie && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>🏷️ Ventes par catégorie</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {rapportCategories.statsParCategorie.map((cat) => {
                  const cfg = CAT_CONFIG[cat.categorie] || CAT_CONFIG.autres;
                  return (
                    <div
                      key={cat.categorie}
                      style={{
                        background: cfg.bg,
                        borderRadius: 10,
                        padding: "14px 16px",
                        borderLeft: `4px solid ${cfg.color}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: cfg.textColor,
                          marginBottom: 8,
                        }}
                      >
                        {cfg.label}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <div style={{ color: cfg.textColor, opacity: 0.7 }}>
                            CA
                          </div>
                          <strong style={{ color: cfg.textColor }}>
                            {fmtAR(cat.montantVentes)}
                          </strong>
                        </div>
                        <div>
                          <div style={{ color: cfg.textColor, opacity: 0.7 }}>
                            Produits
                          </div>
                          <strong style={{ color: cfg.textColor }}>
                            {cat.nombreProduits}
                          </strong>
                        </div>
                        <div>
                          <div style={{ color: cfg.textColor, opacity: 0.7 }}>
                            Bénéfice
                          </div>
                          <strong
                            style={{
                              color: cat.benefice >= 0 ? "#166534" : "#991b1b",
                            }}
                          >
                            {fmtAR(cat.benefice)}
                          </strong>
                        </div>
                        <div>
                          <div style={{ color: cfg.textColor, opacity: 0.7 }}>
                            Coût achat
                          </div>
                          <strong style={{ color: cfg.textColor }}>
                            {fmtAR(cat.coutAchat)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Détail CA et dépenses */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div className="card">
              <SectionTitle>📊 Répartition du CA</SectionTitle>
              {[
                {
                  label: "Ventes par balle",
                  val: g.ventes.parBalle?.montant || 0,
                  color: PIE_COLORS[0],
                },
                {
                  label: "Ventes libres",
                  val: g.ventes.libres?.montantVentes || 0,
                  color: PIE_COLORS[1],
                },
                {
                  label: "Frais livraison",
                  val:
                    (g.ventes.montantVentes || 0) -
                    (g.ventes.parBalle?.montant || 0) -
                    (g.ventes.libres?.montantVentes || 0),
                  color: PIE_COLORS[2],
                },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: item.color,
                          display: "inline-block",
                        }}
                      />
                      {item.label}
                    </span>
                    <strong>{fmtAR(item.val)}</strong>
                  </div>
                  <div
                    style={{
                      background: "var(--border-color)",
                      borderRadius: 999,
                      height: 6,
                    }}
                  >
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: item.color,
                        width: `${g.ventes.montantVentes ? Math.min(100, Math.round((item.val / g.ventes.montantVentes) * 100)) : 0}%`,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <SectionTitle>💸 Dépenses par type</SectionTitle>
              {depensesParType.length === 0 ? (
                <p className="no-data">Aucune dépense</p>
              ) : (
                <>
                  {depensesParType.slice(0, 6).map((d) => (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border-color)",
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: d.color,
                            display: "inline-block",
                          }}
                        />
                        {d.name}
                      </span>
                      <strong>{fmtAR(d.value)}</strong>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0 0",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <span>Total</span>
                    <span style={{ color: "var(--danger-color)" }}>
                      {fmtAR(g.depenses?.totalDepenses)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bilan financier */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionTitle>📋 Bilan financier</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  label: "CA Total",
                  val: g.ventes.montantVentes,
                  positive: true,
                },
                {
                  label: "Bénéfice balles",
                  val: benefices.balles,
                  positive: true,
                },
                {
                  label: "Bénéfice libres",
                  val: benefices.libres,
                  positive: true,
                },
                {
                  label: "− Dépenses globales",
                  val: -(g.depenses?.globales || 0),
                  positive: false,
                },
                {
                  label: "− Frais expéd.",
                  val: -(benefices.fraisExpeditions || 0),
                  positive: false,
                },
                {
                  label: "= Bénéfice net",
                  val: benefices.net,
                  positive: benefices.net >= 0,
                  big: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: item.big
                      ? item.positive
                        ? "#f0fdf4"
                        : "#fef2f2"
                      : "var(--light-color)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    border: item.big
                      ? `2px solid ${item.positive ? "var(--success-color)" : "var(--danger-color)"}`
                      : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--secondary-color)",
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: item.big ? 20 : 15,
                      fontWeight: 700,
                      color:
                        (item.val || 0) >= 0
                          ? item.positive
                            ? "var(--success-color)"
                            : "var(--dark-color)"
                          : "var(--danger-color)",
                    }}
                  >
                    {fmtAR(Math.abs(item.val || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Investisseur */}
          {g.investisseur && (
            <div className="card">
              <SectionTitle>🤝 Suivi investisseur</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {[
                  {
                    label: "Argent reçu",
                    val: g.investisseur.totalRecu,
                    color: "var(--success-color)",
                    bg: "#f0fdf4",
                  },
                  {
                    label: "Argent versé",
                    val: g.investisseur.totalVerse,
                    color: "var(--danger-color)",
                    bg: "#fef2f2",
                  },
                  {
                    label:
                      g.investisseur.solde >= 0
                        ? "Reste à rembourser"
                        : "Surplus",
                    val: Math.abs(g.investisseur.solde),
                    color: "var(--warning-color)",
                    bg: "#fef3c7",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: s.bg,
                      borderRadius: 8,
                      padding: 14,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: "var(--secondary-color)" }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{ fontSize: 18, fontWeight: 700, color: s.color }}
                    >
                      {fmtAR(s.val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : CATÉGORIES
      ════════════════════════════════════════════════════ */}
      {activeTab === "categories" && rapportCategories && (
        <>
          {/* KPI cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {rapportCategories.statsParCategorie.map((cat) => {
              const cfg = CAT_CONFIG[cat.categorie] || CAT_CONFIG.autres;
              const marge =
                cat.coutAchat > 0
                  ? ((cat.benefice / cat.coutAchat) * 100).toFixed(1)
                  : null;
              return (
                <div
                  key={cat.categorie}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "var(--shadow)",
                    borderTop: `4px solid ${cfg.color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: cfg.textColor,
                      marginBottom: 12,
                    }}
                  >
                    {cfg.label}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      {
                        label: "CA",
                        val: fmtAR(cat.montantVentes),
                        color: cfg.color,
                      },
                      {
                        label: "Coût achat",
                        val: fmtAR(cat.coutAchat),
                        color: "var(--danger-color)",
                      },
                      {
                        label: "Bénéfice",
                        val: fmtAR(cat.benefice),
                        color:
                          cat.benefice >= 0
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      },
                      {
                        label: "Nb produits",
                        val: cat.nombreProduits,
                        color: "var(--secondary-color)",
                      },
                      {
                        label: "Nb ventes",
                        val: cat.nombreVentes,
                        color: "var(--secondary-color)",
                      },
                      marge !== null && {
                        label: "Marge",
                        val: `${marge}%`,
                        color:
                          parseFloat(marge) >= 0
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      },
                    ]
                      .filter(Boolean)
                      .map(({ label, val, color }) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                          }}
                        >
                          <span style={{ color: "var(--secondary-color)" }}>
                            {label}
                          </span>
                          <strong style={{ color }}>{val}</strong>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graphe comparatif */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionTitle>📊 Comparaison par catégorie</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={rapportCategories.statsParCategorie}
                margin={{ top: 4, right: 10, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="categorie"
                  tickFormatter={(v) => CAT_CONFIG[v]?.label || v}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : v
                  }
                />
                <Tooltip formatter={(v) => fmtAR(v)} />
                <Legend />
                <Bar
                  dataKey="montantVentes"
                  fill="#2563eb"
                  name="CA"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="coutAchat"
                  fill="#64748b"
                  name="Coût achat"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="benefice"
                  fill="#10b981"
                  name="Bénéfice"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Évolution mensuelle par catégorie */}
          {rapportCategories.evolutionMensuelle?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📈 Évolution mensuelle par catégorie</SectionTitle>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={(() => {
                    const map = new Map();
                    rapportCategories.evolutionMensuelle.forEach((item) => {
                      const key = `${item._id?.annee || "?"}-${MOIS[item._id?.mois || 0]}`;
                      if (!map.has(key)) map.set(key, { period: key });
                      const cat = item._id?.categorie || "autres";
                      map.get(key)[cat] =
                        (map.get(key)[cat] || 0) + (item.montant || 0);
                    });
                    return Array.from(map.values());
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : v
                    }
                  />
                  <Tooltip formatter={(v) => fmtAR(v)} />
                  <Legend />
                  {Object.keys(CAT_CONFIG).map((cat) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      name={CAT_CONFIG[cat].label}
                      stroke={CAT_CONFIG[cat].color}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Par destination */}
          {rapportCategories.parDestination?.length > 0 && (
            <div className="card">
              <SectionTitle>🌍 Ventes par catégorie & destination</SectionTitle>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Destination</th>
                    <th>Montant</th>
                    <th>Nb ventes</th>
                  </tr>
                </thead>
                <tbody>
                  {rapportCategories.parDestination.map((item, i) => {
                    const cfg =
                      CAT_CONFIG[item._id?.categorie] || CAT_CONFIG.autres;
                    return (
                      <tr key={i}>
                        <td>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              background: cfg.bg,
                              color: cfg.textColor,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td>{item._id?.destination || "Local"}</td>
                        <td className="text-success">
                          <strong>{fmtAR(item.montant)}</strong>
                        </td>
                        <td>{item.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : BÉNÉFICES
      ════════════════════════════════════════════════════ */}
      {activeTab === "benefices" && g.ventes && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Bénéfice ventes par balle */}
            <BeneficeCard
              titre="Ventes par balle"
              icon="📦"
              ca={g.balles?.totalVentes || 0}
              charges={
                (g.balles?.totalInvesti || 0) +
                (g.balles?.totalDepensesLiees || 0)
              }
              chargesLabel="Achat + dépenses liées"
              benefice={benefices.balles || 0}
              color="#2563eb"
            />
            {/* Bénéfice ventes libres */}
            <BeneficeCard
              titre="Ventes libres"
              icon="🛒"
              ca={g.ventes.libres?.montantVentes || 0}
              charges={g.ventes.libres?.coutAchat || 0}
              chargesLabel="Coût d'achat produits"
              benefice={benefices.libres || 0}
              color="#10b981"
            />
            {/* Charges d'expéditions */}
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                boxShadow: "var(--shadow)",
                borderTop: `3px solid #f59e0b`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 20 }}>🚚</span>
                <strong style={{ fontSize: 16 }}>Frais expéditions</strong>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  {
                    label: "Frais colis",
                    val: g.expeditions?.totalFraisColis || 0,
                  },
                  {
                    label: "Commissionnaire",
                    val: g.expeditions?.totalSalaireCommissionnaire || 0,
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "var(--secondary-color)" }}>
                      {label}
                    </span>
                    <strong style={{ color: "var(--danger-color)" }}>
                      − {fmtAR(val)}
                    </strong>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0 0",
                    borderTop: "2px solid var(--border-color)",
                    fontWeight: 700,
                  }}
                >
                  <span>Total frais</span>
                  <strong
                    style={{ fontSize: 18, color: "var(--danger-color)" }}
                  >
                    {fmtAR(benefices.fraisExpeditions || 0)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé bénéfice net */}
          <div
            className="card"
            style={{
              background:
                benefices.net >= 0
                  ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)"
                  : "linear-gradient(135deg, #fef2f2, #fff1f2)",
              border: `2px solid ${benefices.net >= 0 ? "var(--success-color)" : "var(--danger-color)"}`,
              marginBottom: 20,
            }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--secondary-color)",
                  marginBottom: 4,
                }}
              >
                Bénéfice net global
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color:
                    benefices.net >= 0
                      ? "var(--success-color)"
                      : "var(--danger-color)",
                }}
              >
                {fmtAR(benefices.net)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--secondary-color)",
                  marginTop: 6,
                }}
              >
                = Bénéf. balles ({fmtAR(benefices.balles)}) + Bénéf. libres (
                {fmtAR(benefices.libres)}) − Dépenses globales − Frais expéd.
              </div>
            </div>
          </div>

          {/* Dépenses par type (pie) */}
          {depensesParType.length > 0 && (
            <div className="card">
              <SectionTitle>💸 Répartition des dépenses</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={depensesParType}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {depensesParType.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtAR(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gap: 8 }}>
                  {depensesParType.map((d) => (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: d.color,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        {d.name}
                      </span>
                      <strong>{fmtAR(d.value)}</strong>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "2px solid var(--border-color)",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                    }}
                  >
                    <span>Total</span>
                    <span style={{ color: "var(--danger-color)" }}>
                      {fmtAR(g.depenses?.totalDepenses)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : PÉRIODE (PAR JOUR)
      ════════════════════════════════════════════════════ */}
      {activeTab === "periode" && (
        <>
          {rapportParJour.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📅 Évolution journalière</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={rapportParJour}
                  margin={{ top: 4, right: 10, left: 10, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : v
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="montantVentes"
                    fill="#2563eb"
                    name="Ventes"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="depenses"
                    fill="#ef4444"
                    name="Dépenses"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="fraisExpedition"
                    fill="#f59e0b"
                    name="Frais expéd."
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nb ventes</th>
                  <th>CA ventes</th>
                  <th>Dépenses</th>
                  <th>Frais expéd.</th>
                  <th>Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {[...rapportParJour].reverse().map((j) => (
                  <tr key={j.date}>
                    <td>{j.date}</td>
                    <td>{j.ventes || 0}</td>
                    <td className="text-success">{fmtAR(j.montantVentes)}</td>
                    <td style={{ color: "var(--danger-color)" }}>
                      {fmtAR(j.depenses)}
                    </td>
                    <td style={{ color: "var(--warning-color)" }}>
                      {fmtAR(j.fraisExpedition)}
                    </td>
                    <td>
                      <strong
                        style={{
                          color:
                            (j.benefice || 0) >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
                        }}
                      >
                        {fmtAR(j.benefice)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : PAR SEMAINE
      ════════════════════════════════════════════════════ */}
      {activeTab === "semaine" && (
        <>
          {rapportParSemaine.length > 0 ? (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <SectionTitle>📆 Évolution hebdomadaire</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={rapportParSemaine.map((s) => ({
                      label: `S${s.semaine} ${s.annee}`,
                      "Ventes (AR)": s.montantVentes,
                      "Nb ventes": s.nombreVentes,
                    }))}
                    margin={{ top: 4, right: 10, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(1)}M`
                          : v >= 1000
                            ? `${(v / 1000).toFixed(0)}k`
                            : v
                      }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v, name) =>
                        name === "Nb ventes" ? v : fmtAR(v)
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="Ventes (AR)"
                      fill="#2563eb"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="Nb ventes"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Année</th>
                      <th>Semaine</th>
                      <th>Nb ventes</th>
                      <th>CA ventes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rapportParSemaine].reverse().map((s, i) => (
                      <tr key={i}>
                        <td>{s.annee}</td>
                        <td>Semaine {s.semaine}</td>
                        <td>{s.nombreVentes}</td>
                        <td className="text-success">
                          <strong>{fmtAR(s.montantVentes)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="no-data">
              Aucune donnée hebdomadaire pour cette période
            </p>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : PAR MOIS (inclus dans semaine tab, séparé ici pour référence)
          → Affichons-le dans le tab "periode" uniquement
      ════════════════════════════════════════════════════ */}

      {/* ════════════════════════════════════════════════════
          TAB : PAR BALLE
      ════════════════════════════════════════════════════ */}
      {activeTab === "balle" && (
        <>
          {rapportParBalle.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📦 Performance par balle (top 8)</SectionTitle>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={rapportParBalle.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : v
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nom"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip formatter={(v) => fmtAR(v)} />
                  <Legend />
                  <Bar
                    dataKey="prixAchat"
                    fill="#64748b"
                    name="Achat"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="totalVentes"
                    fill="#2563eb"
                    name="Ventes"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="depenses"
                    fill="#ef4444"
                    name="Dépenses"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="benefice"
                    fill="#10b981"
                    name="Bénéfice"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Balle</th>
                  <th>Achat</th>
                  <th>Ventes</th>
                  <th>Nb</th>
                  <th>Dépenses</th>
                  <th>Bénéfice</th>
                  <th>Marge</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rapportParBalle.map((b) => {
                  const marge =
                    b.prixAchat > 0
                      ? ((b.benefice / b.prixAchat) * 100).toFixed(1)
                      : 0;
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.nom}</strong>
                        <br />
                        <small className="text-secondary">{b.numero}</small>
                      </td>
                      <td>{fmtAR(b.prixAchat)}</td>
                      <td style={{ color: "var(--success-color)" }}>
                        {fmtAR(b.totalVentes)}
                      </td>
                      <td>{b.nombreVentes}</td>
                      <td style={{ color: "var(--danger-color)" }}>
                        {fmtAR(b.depenses)}
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              b.benefice >= 0
                                ? "var(--success-color)"
                                : "var(--danger-color)",
                          }}
                        >
                          {fmtAR(b.benefice)}
                        </strong>
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              parseFloat(marge) >= 0
                                ? "var(--success-color)"
                                : "var(--danger-color)",
                          }}
                        >
                          {marge}%
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            {
                              en_stock: "disponible",
                              en_vente: "en_cours",
                              vendu: "vendu",
                              archivé: "annule",
                            }[b.statut] || "disponible"
                          }`}
                        >
                          {b.statut?.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          TAB : EXPÉDITIONS
      ════════════════════════════════════════════════════ */}
      {activeTab === "expedition" && rapportExpeditions && (
        <>
          {/* Stats par destination */}
          {rapportExpeditions.statsParDestination?.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {rapportExpeditions.statsParDestination.map((d) => (
                <div
                  key={d._id}
                  style={{
                    background: "white",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <div
                    style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}
                  >
                    🌍 {d._id}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: "Expéditions",
                        val: d.totalExpeditions,
                        color: "var(--primary-color)",
                        bg: "#eff6ff",
                      },
                      {
                        label: "Ventes",
                        val: d.totalProduits,
                        color: "var(--warning-color)",
                        bg: "#fef3c7",
                      },
                      {
                        label: "Frais réels",
                        val: fmtAR(d.totalFrais),
                        color: "var(--danger-color)",
                        bg: "#fef2f2",
                      },
                      {
                        label: "CA expédié",
                        val: fmtAR(d.totalVentes),
                        color: "var(--success-color)",
                        bg: "#f0fdf4",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: s.bg,
                          borderRadius: 6,
                          padding: "8px 10px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--secondary-color)",
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: s.color,
                            fontSize: typeof s.val === "number" ? 18 : 12,
                          }}
                        >
                          {s.val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Graphe frais vs CA */}
          {rapportExpeditions.statsParDestination?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <SectionTitle>📊 CA vs Frais par destination</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={rapportExpeditions.statsParDestination}
                  margin={{ top: 4, right: 10, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : v
                    }
                  />
                  <Tooltip formatter={(v) => fmtAR(v)} />
                  <Legend />
                  <Bar
                    dataKey="totalVentes"
                    fill="#2563eb"
                    name="CA expédié"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="totalFrais"
                    fill="#ef4444"
                    name="Frais réels"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Liste détaillée */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nom</th>
                  <th>Destination</th>
                  <th>Ventes</th>
                  <th>CA</th>
                  <th>Frais colis</th>
                  <th>Commission</th>
                  <th>Total frais</th>
                  <th>Net</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rapportExpeditions.expeditions?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="no-data">
                      Aucune expédition sur cette période
                    </td>
                  </tr>
                ) : (
                  rapportExpeditions.expeditions?.map((e) => (
                    <tr key={e._id}>
                      <td>
                        {format(new Date(e.dateExpedition), "dd/MM/yyyy")}
                      </td>
                      <td>
                        <strong>{e.nom}</strong>
                      </td>
                      <td>{e.destination}</td>
                      <td>{e.ventes?.length || 0}</td>
                      <td style={{ color: "var(--success-color)" }}>
                        {fmtAR(e.totalVentes)}
                      </td>
                      <td>{fmtAR(e.fraisColis)}</td>
                      <td>
                        {fmtAR(e.salaireCommissionnaire)}
                        {e.modeCommissionnaire === "pourcentage" && (
                          <small className="text-secondary">
                            {" "}
                            ({e.pourcentageCommissionnaire}%)
                          </small>
                        )}
                      </td>
                      <td style={{ color: "var(--danger-color)" }}>
                        {fmtAR(e.totalFrais)}
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              (e.benefice ?? e.totalVentes - e.totalFrais) >= 0
                                ? "var(--success-color)"
                                : "var(--danger-color)",
                          }}
                        >
                          {fmtAR(e.benefice ?? e.totalVentes - e.totalFrais)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            {
                              en_preparation: "en_attente",
                              expédiée: "en_cours",
                              livrée: "livre",
                              annulée: "annule",
                            }[e.statut] || "en_attente"
                          }`}
                        >
                          {e.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Rapports;
