import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import { FaBox, FaDollarSign, FaPlus, FaShoppingBag, FaTruck } from "react-icons/fa";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useAppStore from "../stores/appStore";
import api from "../utils/api";

const Dashboard = () => {
  const { user } = useAuthStore();
  const isInvestisseur = user?.role === "investisseur";
  const { balles, ventes, fetchBalles, fetchVentes } = useAppStore();

  const [stats, setStats] = useState({
    totalVentes: 0, montantTotal: 0, totalBenefice: 0, nombreBalles: 0, totalDepenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchBalles();
    fetchVentes();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ventesRes, depensesRes, ballesRes] = await Promise.all([
        api.get("/ventes/stats/summary"),
        api.get("/depenses/stats/summary"),
        api.get("/balles/stats/summary"),
      ]);
      setStats({
        totalVentes: ventesRes.data.data.global.totalVentes || 0,
        montantTotal: ventesRes.data.data.global.montantTotal || 0,
        totalDepenses: depensesRes.data.data.global.totalDepenses || 0,
        totalBenefice: ballesRes.data.data.global.totalBenefice || 0,
        nombreBalles: ballesRes.data.data.global.totalBalles || 0,
      });
    } catch (error) { console.error("Erreur dashboard:", error); }
    finally { setLoading(false); }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " AR";
  const formatDate = (date) => format(new Date(date), "dd MMM yyyy", { locale: fr });

  const getStatutClass = (s) => ({ en_attente: "en_attente", en_cours: "en_cours", livré: "livre", annulé: "annule" })[s] || "en_attente";
  const getStatutLabel = (s) => ({ en_attente: "En attente", en_cours: "En cours", livré: "Livré", annulé: "Annulé" })[s] || s;

  const recentVentes = ventes.slice(0, 5);
  const topBalles = balles.slice(0, 5);

  if (loading) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-secondary">{format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}</p>
        </div>
        {!isInvestisseur && (
          <Link to="/ventes/new" className="btn btn-primary"><FaPlus /> Nouvelle vente</Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FaShoppingBag /></div>
          <div className="stat-info"><h3>{stats.totalVentes}</h3><p>Ventes totales</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaDollarSign /></div>
          <div className="stat-info"><h3>{formatCurrency(stats.montantTotal)}</h3><p>Chiffre d'affaires</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FaBox /></div>
          <div className="stat-info"><h3>{stats.nombreBalles}</h3><p>Balles en stock</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FaTruck /></div>
          <div className="stat-info"><h3>{formatCurrency(stats.totalDepenses)}</h3><p>Total dépenses</p></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventes récentes</h3>
            {!isInvestisseur && <Link to="/ventes" className="btn btn-sm btn-secondary">Voir tout</Link>}
          </div>
          {recentVentes.length === 0 ? <p className="no-data">Aucune vente récente</p> : (
            <table className="data-table">
              <thead><tr><th>Client</th><th>Produit</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {recentVentes.map((vente) => (
                  <tr key={vente._id}>
                    <td>
                      <strong>{vente.nomClient}</strong><br />
                      <small className="text-secondary">{formatDate(vente.dateVente)}</small>
                    </td>
                    <td>
                      {vente.produits && vente.produits.length > 1
                        ? <span style={{ color: "var(--primary-color)", fontWeight: 600 }}>📦 {vente.produits.length} produits</span>
                        : vente.nomProduit}
                    </td>
                    <td><strong className="text-success">{formatCurrency(vente.montantTotal)}</strong></td>
                    <td><span className={`status-badge ${getStatutClass(vente.statutLivraison)}`}>{getStatutLabel(vente.statutLivraison)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Balles en stock</h3>
            {!isInvestisseur && <Link to="/balles" className="btn btn-sm btn-secondary">Voir tout</Link>}
          </div>
          {topBalles.length === 0 ? <p className="no-data">Aucune balle</p> : (
            <table className="data-table">
              <thead><tr><th>Balle</th><th>Ventes</th><th>Bénéfice</th></tr></thead>
              <tbody>
                {topBalles.map((balle) => (
                  <tr key={balle._id}>
                    <td>
                      <strong>{balle.nom}</strong><br />
                      <small className="text-secondary">{balle.numero}</small>
                    </td>
                    <td>{balle.nombreVentes || 0}</td>
                    <td>
                      <strong className={balle.benefice >= 0 ? "text-success" : "text-danger"}>
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
    </div>
  );
};

export default Dashboard;
