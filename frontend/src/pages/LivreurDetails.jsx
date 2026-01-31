import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useLivreurPaiementStore } from '../stores/financeStores';

const LivreurDetails = () => {
  const { id } = useParams();
  const [livreur, setLivreur] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { paiements, fetchPaiements, createPaiement } = useLivreurPaiementStore();
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    montantVerse: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [livreurRes, livraisonsRes] = await Promise.all([
        api.get(`/livreurs/${id}`),
        api.get(`/ventes?livreur=${id}`),
      ]);

      setLivreur(livreurRes.data.data.livreur);
      setLivraisons(livraisonsRes.data.data);
      
      // Charger les paiements
      await fetchPaiements(id);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      montantVerse: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      livreur: id,
      montantVerse: parseFloat(formData.montantVerse),
      description: formData.description,
    };

    const result = await createPaiement(data);

    if (result.success) {
      toast.success('Paiement enregistré');
      setShowModal(false);
      loadData();
    } else {
      toast.error(result.message || 'Erreur');
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
    };
    return classes[statut] || 'en_attente';
  };

  // Calculs - CORRECTION: Utiliser le prix de vente, pas les frais de livraison
  const totalAVerser = livraisons
    .filter((l) => l.statutLivraison !== 'annulé')
    .reduce((sum, l) => sum + l.prixVente, 0);

  const totalVerse = paiements.reduce((sum, p) => sum + p.montantVerse, 0);
  const reste = totalAVerser - totalVerse;

  if (loading || !livreur) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <Link to="/livreurs" className="btn btn-secondary btn-sm mb-10">
            <FaArrowLeft /> Retour
          </Link>
          <h1 className="page-title">{livreur.nom}</h1>
          <p className="text-secondary">
            {livreur.telephone}
            {livreur.telephoneSecondaire && ` • ${livreur.telephoneSecondaire}`}
          </p>
        </div>
        <Link to={`/livreurs/${id}/edit`} className="btn btn-primary">
          <FaEdit /> Modifier
        </Link>
      </div>

      {/* Statistiques financières */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <span>📦</span>
          </div>
          <div className="stat-info">
            <h3>{livraisons.length}</h3>
            <p>Livraisons totales</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <span>💰</span>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalAVerser)}</h3>
            <p>Prix de vente total</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <span>💸</span>
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalVerse)}</h3>
            <p>Montant versé</p>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${reste > 0 ? 'red' : 'green'}`}>
            <span>📊</span>
          </div>
          <div className="stat-info">
            <h3 className={reste > 0 ? 'text-danger' : 'text-success'}>
              {formatCurrency(Math.abs(reste))}
            </h3>
            <p>{reste > 0 ? 'Reste à verser' : 'Tout payé'}</p>
          </div>
        </div>
      </div>

      {/* Paiements */}
      <div className="card mb-20">
        <div className="card-header">
          <h3 className="card-title">Historique des paiements ({paiements.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={handleOpenModal}>
            <FaPlus /> Enregistrer un paiement
          </button>
        </div>
        <div className="table-container">
          {paiements.length === 0 ? (
            <p className="no-data">Aucun paiement enregistré</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant versé</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement._id}>
                    <td>{formatDate(paiement.datePaiement)}</td>
                    <td>
                      <strong className="text-success">
                        {formatCurrency(paiement.montantVerse)}
                      </strong>
                    </td>
                    <td>{paiement.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Livraisons */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Livraisons ({livraisons.length})</h3>
        </div>
        <div className="table-container">
          {livraisons.length === 0 ? (
            <p className="no-data">Aucune livraison</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Produit</th>
                  <th>Lieu</th>
                  <th>Prix de vente</th>
                  <th>Frais livraison</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {livraisons.map((livraison) => (
                  <tr key={livraison._id}>
                    <td>{formatDate(livraison.dateVente)}</td>
                    <td>
                      <strong>{livraison.nomClient}</strong>
                      <br />
                      <small className="text-secondary">
                        {livraison.telephoneClient}
                      </small>
                    </td>
                    <td>{livraison.nomProduit}</td>
                    <td>{livraison.lieuLivraison}</td>
                    <td>
                      <strong className="text-success">
                        {formatCurrency(livraison.prixVente)}
                      </strong>
                    </td>
                    <td>
                      <span className="text-secondary">
                        {formatCurrency(livraison.fraisLivraison)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatutClass(livraison.statutLivraison)}`}>
                        {livraison.statutLivraison.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de paiement */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Enregistrer un paiement</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Montant versé (AR) *</label>
                  <input
                    type="number"
                    name="montantVerse"
                    className="form-input"
                    placeholder="Ex: 50000"
                    value={formData.montantVerse}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Ex: Paiement pour les livraisons de la semaine"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="card" style={{ background: 'var(--light-color)', marginBottom: '15px' }}>
                  <div className="flex-between mb-10">
                    <span>Total prix de vente:</span>
                    <strong>{formatCurrency(totalAVerser)}</strong>
                  </div>
                  <div className="flex-between mb-10">
                    <span>Déjà versé:</span>
                    <strong>{formatCurrency(totalVerse)}</strong>
                  </div>
                  <div
                    className="flex-between"
                    style={{
                      borderTop: '2px solid var(--border-color)',
                      paddingTop: '10px',
                    }}
                  >
                    <span className="font-bold">Reste à verser:</span>
                    <strong className={reste > 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(Math.abs(reste))}
                    </strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivreurDetails;
