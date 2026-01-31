import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useBalleStore from '../stores/balleStore';

const BalleDetails = () => {
  const { id } = useParams();
  const { fetchBalle, loading } = useBalleStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadBalle();
  }, [id]);

  const loadBalle = async () => {
    const result = await fetchBalle(id);
    if (result.success) {
      setData(result.data);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' AR';
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const getStatutClass = (statut) => {
    const classes = {
      en_attente: 'en_attente',
      en_cours: 'en_cours',
      livre: 'livre',
      livré: 'livre',
      annule: 'annule',
      annulé: 'annule',
      disponible: 'disponible',
      vendu: 'vendu',
    };
    return classes[statut] || 'disponible';
  };

  if (loading || !data) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  const { balle, produits, ventes, depenses } = data;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <Link to="/balles" className="btn btn-secondary btn-sm mb-10">
            <FaArrowLeft /> Retour
          </Link>
          <h1 className="page-title">{balle.nom}</h1>
          <p className="text-secondary">Numéro: {balle.numero}</p>
        </div>
        <Link to={`/balles/${id}/edit`} className="btn btn-primary">
          <FaEdit /> Modifier
        </Link>
      </div>

      {/* Statistiques de la balle */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span>AR</span>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(balle.prixAchat)}</h3>
            <p>Prix d'achat</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <span>AR</span>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(balle.totalVentes)}</h3>
            <p>Total des ventes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <span>AR</span>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(balle.depensesLiees)}</h3>
            <p>Dépenses liées</p>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${balle.benefice >= 0 ? 'green' : 'red'}`}>
            <span>AR</span>
          </div>
          <div className="stat-info">
            <h3 className={balle.benefice >= 0 ? 'text-success' : 'text-danger'}>
              {formatCurrency(balle.benefice)}
            </h3>
            <p>Bénéfice</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Produits */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Produits ({produits?.length || 0})</h3>
            <Link to={`/produits/new?balle=${id}`} className="btn btn-sm btn-primary">
              <FaPlus /> Ajouter un produit
            </Link>
          </div>
          <div className="table-container">
            {!produits || produits.length === 0 ? (
              <p className="no-data">Aucun produit</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Taille</th>
                    <th>Prix de vente</th>
                    <th>Statut</th>
                    <th>Date d'ajout</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((produit) => (
                    <tr key={produit._id}>
                      <td><strong>{produit.nom}</strong></td>
                      <td>{produit.taille || '-'}</td>
                      <td>{formatCurrency(produit.prixVente)}</td>
                      <td>
                        <span className={`status-badge ${getStatutClass(produit.statut)}`}>
                          {produit.statut}
                        </span>
                      </td>
                      <td>{formatDate(produit.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Ventes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ventes ({ventes?.length || 0})</h3>
            <Link to={`/ventes/new?balle=${id}`} className="btn btn-sm btn-primary">
              <FaPlus /> Nouvelle vente
            </Link>
          </div>
          <div className="table-container">
            {!ventes || ventes.length === 0 ? (
              <p className="no-data">Aucune vente</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Produit</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {ventes.map((vente) => (
                    <tr key={vente._id}>
                      <td>{formatDate(vente.dateVente)}</td>
                      <td>
                        <strong>{vente.nomClient}</strong>
                        <br />
                        <small className="text-secondary">{vente.telephoneClient}</small>
                      </td>
                      <td>{vente.nomProduit}</td>
                      <td>
                        <strong className="text-success">
                          {formatCurrency(vente.montantTotal)}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatutClass(vente.statutLivraison)}`}>
                          {vente.statutLivraison.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Dépenses */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Dépenses liées ({depenses?.length || 0})</h3>
            <Link to={`/depenses/new?balle=${id}`} className="btn btn-sm btn-primary">
              <FaPlus /> Ajouter une dépense
            </Link>
          </div>
          <div className="table-container">
            {!depenses || depenses.length === 0 ? (
              <p className="no-data">Aucune dépense</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {depenses.map((depense) => (
                    <tr key={depense._id}>
                      <td>{formatDate(depense.dateDepense)}</td>
                      <td>{depense.description}</td>
                      <td>
                        <span className="status-badge disponible">
                          {depense.type}
                        </span>
                      </td>
                      <td>
                        <strong className="text-danger">
                          {formatCurrency(depense.montant)}
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
    </div>
  );
};

export default BalleDetails;
