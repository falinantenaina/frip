import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import useAppStore from "../stores/appStore";

const BalleDetails = () => {
  const { id } = useParams();
  const { fetchBalle } = useAppStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBalle(); }, [id]);

  const loadBalle = async () => {
    setLoading(true);
    const result = await fetchBalle(id);
    if (result.success) setData(result.data);
    setLoading(false);
  };

  const formatCurrency = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";
  const formatDate = (d) => format(new Date(d), "dd MMM yyyy", { locale: fr });
  const getStatutClass = (s) => ({ en_attente: "en_attente", en_cours: "en_cours", livré: "livre", annulé: "annule", disponible: "disponible", vendu: "vendu" })[s] || "disponible";

  if (loading || !data) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  const { balle, produits, ventes, depenses } = data;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <Link to="/balles" className="btn btn-secondary btn-sm mb-10"><FaArrowLeft /> Retour</Link>
          <h1 className="page-title">{balle.nom}</h1>
          <p className="text-secondary">Numéro: {balle.numero}</p>
        </div>
        <Link to={`/balles/${id}/edit`} className="btn btn-primary"><FaEdit /> Modifier</Link>
      </div>

      <div className="stats-grid">
        {[
          { label: "Prix d'achat", value: formatCurrency(balle.prixAchat), color: "blue" },
          { label: "Total ventes", value: formatCurrency(balle.totalVentes), color: "green" },
          { label: "Dépenses liées", value: formatCurrency(balle.depensesLiees), color: "orange" },
          { label: "Bénéfice", value: formatCurrency(balle.benefice), color: balle.benefice >= 0 ? "green" : "red" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><span>AR</span></div>
            <div className="stat-info">
              <h3 className={balle.benefice >= 0 && s.label === "Bénéfice" ? "text-success" : s.label === "Bénéfice" ? "text-danger" : ""}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Produits */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Produits ({produits?.length || 0})</h3>
          <Link to={`/produits/new?balle=${id}`} className="btn btn-sm btn-primary"><FaPlus /> Ajouter</Link>
        </div>
        {!produits || produits.length === 0 ? <p className="no-data">Aucun produit</p> : (
          <table className="data-table">
            <thead><tr><th>Nom</th><th>Taille</th><th>Prix vente</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.nom}</strong></td>
                  <td>{p.taille || "-"}</td>
                  <td>{formatCurrency(p.prixVente)}</td>
                  <td><span className={`status-badge ${getStatutClass(p.statut)}`}>{p.statut}</span></td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ventes */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Ventes ({ventes?.length || 0})</h3>
          <Link to={`/ventes/new?balle=${id}`} className="btn btn-sm btn-primary"><FaPlus /> Nouvelle vente</Link>
        </div>
        {!ventes || ventes.length === 0 ? <p className="no-data">Aucune vente</p> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Client</th><th>Produit</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {ventes.map((v) => (
                <tr key={v._id}>
                  <td>{formatDate(v.dateVente)}</td>
                  <td><strong>{v.nomClient}</strong><br /><small className="text-secondary">{v.telephoneClient}</small></td>
                  <td>{v.produits?.length > 1 ? `📦 ${v.produits.length} produits` : v.nomProduit}</td>
                  <td><strong className="text-success">{formatCurrency(v.montantTotal)}</strong></td>
                  <td><span className={`status-badge ${getStatutClass(v.statutLivraison)}`}>{v.statutLivraison.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dépenses */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dépenses liées ({depenses?.length || 0})</h3>
          <Link to={`/depenses/new?balle=${id}`} className="btn btn-sm btn-primary"><FaPlus /> Ajouter</Link>
        </div>
        {!depenses || depenses.length === 0 ? <p className="no-data">Aucune dépense</p> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Montant</th></tr></thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d._id}>
                  <td>{formatDate(d.dateDepense)}</td>
                  <td>{d.description}</td>
                  <td><span className="status-badge disponible">{d.type}</span></td>
                  <td><strong className="text-danger">{formatCurrency(d.montant)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BalleDetails;
