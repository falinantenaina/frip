import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBox,
  FaChartLine,
  FaPlus,
  FaShoppingBag,
  FaTruck,
  FaWarehouse,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import useAppStore from "../stores/appStore";
import useAuthStore from "../stores/authStore";
import api from "../utils/api";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0) + " AR";

const formatDate = (date) => format(new Date(date), "dd MMM", { locale: fr });

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

const getExpedStatutClass = (s) =>
  ({
    en_preparation: "en_attente",
    expédiée: "en_cours",
    livrée: "livre",
    annulée: "annule",
  })[s] || "en_attente";

const getExpedStatutLabel = (s) =>
  ({
    en_preparation: "En préparation",
    expédiée: "Expédiée",
    livrée: "Livrée",
    annulée: "Annulée",
  })[s] || s;

const StatCard = ({ icon, label, value, sub, color, bgColor, trend }) => (
  <div
    style={{
      background: bgColor || "white",
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: "var(--shadow)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      border: bgColor
        ? `1px solid ${color}33`
        : "1px solid var(--border-color)",
      transition: "transform 0.15s",
    }}
  >
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: 14,
        background: color + "22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
        color,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--dark-color)",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
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
        <div
          style={{
            fontSize: 11,
            color,
            marginTop: 3,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {trend === "up" && <FaArrowUp style={{ fontSize: 9 }} />}
          {trend === "down" && <FaArrowDown style={{ fontSize: 9 }} />}
          {sub}
        </div>
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name} : {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const isInvestisseur = user?.role === "investisseur";
  const {
    balles,
    ventes,
    expeditions,
    fetchBalles,
    fetchVentes,
    fetchExpeditions,
  } = useAppStore();

  const [stats, setStats] = useState({
    totalVentes: 0,
    montantTotal: 0,
    totalBenefice: 0,
    nombreBalles: 0,
    totalDepenses: 0,
    beneficeNet: 0,
    totalExpeditions: 0,
    fraisExpeditions: 0,
    investisseur: null,
  });
  const [rapportJour, setRapportJour] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchBalles();
    fetchVentes();
    fetchExpeditions();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Date des 14 derniers jours pour le mini-graphe
      const dateDebut = format(subDays(new Date(), 13), "yyyy-MM-dd");
      const dateFin = format(new Date(), "yyyy-MM-dd");

      const [ventesRes, depensesRes, ballesRes, rapportRes, jourRes] =
        await Promise.all([
          api.get("/ventes/stats/summary"),
          api.get("/depenses/stats/summary"),
          api.get("/balles/stats/summary"),
          api.get("/rapports/global"),
          api.get(
            `/rapports/par-jour?dateDebut=${dateDebut}&dateFin=${dateFin}`,
          ),
        ]);

      const g = rapportRes.data.data;

      setStats({
        totalVentes: ventesRes.data.data.global.totalVentes || 0,
        montantTotal: ventesRes.data.data.global.montantTotal || 0,
        totalDepenses: depensesRes.data.data.global.totalDepenses || 0,
        totalBenefice: ballesRes.data.data.global.totalBenefice || 0,
        nombreBalles: ballesRes.data.data.global.totalBalles || 0,
        beneficeNet: g.beneficeNet || 0,
        totalExpeditions: g.expeditions?.totalExpeditions || 0,
        fraisExpeditions: g.expeditions?.totalFrais || 0,
        investisseur: g.investisseur || null,
      });

      // Graphe : 14 derniers jours (chronologique)
      const jours = jourRes.data.data.slice(0, 14).reverse();
      setRapportJour(
        jours.map((j) => ({
          date: format(new Date(j.date), "dd/MM"),
          Ventes: j.montantVentes || 0,
          Dépenses: j.depenses || 0,
        })),
      );
    } catch (error) {
      console.error("Erreur dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const recentVentes = ventes.slice(0, 6);
  const recentExpeditions = expeditions.slice(0, 5);
  const topBalles = [...balles]
    .sort((a, b) => (b.benefice || 0) - (a.benefice || 0))
    .slice(0, 5);

  if (loading)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  const beneficePositif = stats.beneficeNet >= 0;

  return (
    <div className="main-content">
      {/* ── En-tête ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-secondary">
            {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        {!isInvestisseur && (
          <Link to="/ventes/new" className="btn btn-primary">
            <FaPlus /> Nouvelle vente
          </Link>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon={<FaShoppingBag />}
          label="Ventes totales"
          value={stats.totalVentes}
          sub={`${formatCurrency(stats.montantTotal)}`}
          color="#2563eb"
        />
        <StatCard
          icon={<FaWarehouse />}
          label="Balles en stock"
          value={stats.nombreBalles}
          sub={`Bénéfice balles : ${formatCurrency(stats.totalBenefice)}`}
          color="#8b5cf6"
        />
        <StatCard
          icon={<FaTruck />}
          label="Dépenses totales"
          value={formatCurrency(stats.totalDepenses)}
          sub={`Frais expéd. : ${formatCurrency(stats.fraisExpeditions)}`}
          color="#ef4444"
        />
        <StatCard
          icon={<FaBox />}
          label="Expéditions"
          value={stats.totalExpeditions}
          sub={`Frais : ${formatCurrency(stats.fraisExpeditions)}`}
          color="#f59e0b"
        />
        <StatCard
          icon={<FaChartLine />}
          label="Bénéfice net global"
          value={formatCurrency(Math.abs(stats.beneficeNet))}
          sub={beneficePositif ? "Positif ✅" : "Négatif ⚠️"}
          color={beneficePositif ? "#10b981" : "#ef4444"}
          bgColor={beneficePositif ? "#f0fdf4" : "#fef2f2"}
          trend={beneficePositif ? "up" : "down"}
        />
      </div>

      {/* ── Grille principale ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Ventes récentes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🛒 Ventes récentes</h3>
            {!isInvestisseur && (
              <Link to="/ventes" className="btn btn-sm btn-secondary">
                Voir tout
              </Link>
            )}
          </div>
          {recentVentes.length === 0 ? (
            <p className="no-data">Aucune vente récente</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Produit</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentVentes.map((vente) => (
                  <tr key={vente._id}>
                    <td>
                      <strong>{vente.nomClient}</strong>
                      <br />
                      <small className="text-secondary">
                        {formatDate(vente.dateVente)}
                      </small>
                    </td>
                    <td>
                      {vente.produits && vente.produits.length > 1 ? (
                        <span
                          style={{
                            color: "var(--primary-color)",
                            fontWeight: 600,
                          }}
                        >
                          📦 {vente.produits.length} produits
                        </span>
                      ) : (
                        vente.nomProduit
                      )}
                    </td>
                    <td>
                      <strong className="text-success">
                        {formatCurrency(vente.montantTotal)}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                      >
                        {getStatutLabel(vente.statutLivraison)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top balles par bénéfice */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Top balles (bénéfice)</h3>
            {!isInvestisseur && (
              <Link to="/balles" className="btn btn-sm btn-secondary">
                Voir tout
              </Link>
            )}
          </div>
          {topBalles.length === 0 ? (
            <p className="no-data">Aucune balle</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Balle</th>
                  <th>Ventes</th>
                  <th>CA</th>
                  <th>Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {topBalles.map((balle) => (
                  <tr key={balle._id}>
                    <td>
                      <strong>{balle.nom}</strong>
                      <br />
                      <small className="text-secondary">{balle.numero}</small>
                    </td>
                    <td>{balle.nombreVentes || 0}</td>
                    <td>{formatCurrency(balle.totalVentes)}</td>
                    <td>
                      <strong
                        className={
                          balle.benefice >= 0 ? "text-success" : "text-danger"
                        }
                      >
                        {formatCurrency(balle.benefice)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Expéditions récentes ── */}
      {recentExpeditions.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">🚚 Expéditions récentes</h3>
            <Link to="/expeditions" className="btn btn-sm btn-secondary">
              Voir tout
            </Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Nom</th>
                <th>Destination</th>
                <th>Ventes</th>
                <th>CA expédié</th>
                <th>Frais</th>
                <th>Bénéfice net</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentExpeditions.map((exp) => (
                <tr key={exp._id}>
                  <td>
                    <small className="text-secondary">
                      {format(new Date(exp.dateExpedition), "dd/MM/yyyy")}
                    </small>
                  </td>
                  <td>
                    <strong>{exp.nom}</strong>
                  </td>
                  <td>{exp.destination}</td>
                  <td>{exp.ventes?.length || 0}</td>
                  <td className="text-success">
                    {formatCurrency(exp.totalVentes)}
                  </td>
                  <td className="text-danger">
                    {formatCurrency(exp.totalFrais)}
                  </td>
                  <td>
                    <strong
                      style={{
                        color:
                          exp.benefice >= 0
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      }}
                    >
                      {formatCurrency(exp.benefice)}
                    </strong>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getExpedStatutClass(exp.statut)}`}
                    >
                      {getExpedStatutLabel(exp.statut)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bilan résumé ── */}
      <div
        className="card"
        style={{
          marginTop: 20,
          background: "linear-gradient(135deg, #f0fdf4, #eff6ff)",
          border: "1px solid #bbf7d0",
        }}
      >
        <div className="card-header">
          <h3 className="card-title">📋 Bilan financier global</h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              label: "Chiffre d'affaires",
              val: stats.montantTotal,
              color: "#2563eb",
              bg: "#eff6ff",
              sign: "",
            },
            {
              label: "− Dépenses",
              val: stats.totalDepenses,
              color: "#dc2626",
              bg: "#fef2f2",
              sign: "−",
            },
            {
              label: "− Frais expéditions",
              val: stats.fraisExpeditions,
              color: "#d97706",
              bg: "#fef3c7",
              sign: "−",
            },
            {
              label: "= Bénéfice net",
              val: Math.abs(stats.beneficeNet),
              color: beneficePositif ? "#059669" : "#dc2626",
              bg: beneficePositif ? "#f0fdf4" : "#fef2f2",
              sign: beneficePositif ? "+" : "−",
              big: true,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.bg,
                borderRadius: 10,
                padding: "12px 16px",
                border: item.big
                  ? `2px solid ${item.color}66`
                  : "1px solid transparent",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--secondary-color)",
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: item.big ? 18 : 15,
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                {item.sign} {formatCurrency(item.val)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
