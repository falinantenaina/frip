import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaBan } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import useVenteStore from '../stores/venteStore';

const Ventes = () => {
  const { ventes, loading, fetchVentes, deleteVente, annulerVente, updateVente } = useVenteStore();
  const [filterStatut, setFilterStatut] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVentes();
  }, []);

  const loadVentes = () => {
    const filters = {};
    if (filterStatut) filters.statutLivraison = filterStatut;
    fetchVentes(filters);
  };

  useEffect(() => {
    loadVentes();
  }, [filterStatut]);

  const handleSearch = () => {
    // Filtrer localement pour la recherche
    loadVentes();
  };

  const handleDelete = async (id, client) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la vente de ${client} ?`)) {
      const result = await deleteVente(id);
      if (result.success) {
        toast.success('Vente supprimée avec succès');
      } else {
        toast.error(result.message || 'Erreur de suppression');
      }
    }
  };

  const handleAnnuler = async (id) => {
    const raison = prompt('Raison de l\'annulation:');
    if (raison) {
      const result = await annulerVente(id, raison);
      if (result.success) {
        toast.success('Vente annulée avec succès');
      } else {
        toast.error(result.message || 'Erreur');
      }
    }
  };

  const handleChangeStatut = async (id, currentStatut) => {
    // Déterminer le prochain statut
    let nextStatut;
    switch (currentStatut) {
      case 'en_attente':
        nextStatut = 'en_cours';
        break;
      case 'en_cours':
        nextStatut = 'livré';
        break;
      case 'livré':
        nextStatut = 'en_attente';
        break;
      default:
        return;
    }

    const result = await updateVente(id, { statutLivraison: nextStatut });
    if (result.success) {
      toast.success(`Statut changé en "${getStatutLabel(nextStatut)}"`);
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' AR';
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
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

  const getStatutLabel = (statut) => {
    const labels = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      livre: 'Livré',
      livré: 'Livré',
      annule: 'Annulé',
      annulé: 'Annulé',
    };
    return labels[statut] || statut;
  };

  const filteredVentes = ventes.filter((vente) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      vente.nomClient.toLowerCase().includes(search) ||
      vente.telephoneClient.includes(search) ||
      vente.nomProduit.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Ventes</h1>
        <Link to="/ventes/new" className="btn btn-primary">
          <FaPlus /> Nouvelle vente
        </Link>
      </div>

      <div className="filters-bar">
        <select
          className="form-select"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="livré">Livré</option>
          <option value="annulé">Annulé</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Rechercher un client, téléphone, produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-secondary" onClick={handleSearch}>
          Rechercher
        </button>
      </div>

      <div className="table-container">
        {filteredVentes.length === 0 ? (
          <p className="no-data">Aucune vente trouvée</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Produit</th>
                <th>Taille</th>
                <th>Prix</th>
                <th>Frais</th>
                <th>Total</th>
                <th>Livreur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map((vente) => (
                <tr key={vente._id}>
                  <td>{formatDate(vente.dateVente)}</td>
                  <td>
                    <strong>{vente.nomClient}</strong>
                    <br />
                    <small className="text-secondary">{vente.telephoneClient}</small>
                  </td>
                  <td>{vente.nomProduit}</td>
                  <td>{vente.tailleProduit || '-'}</td>
                  <td>{formatCurrency(vente.prixVente)}</td>
                  <td>{formatCurrency(vente.fraisLivraison)}</td>
                  <td>
                    <strong className="text-success">
                      {formatCurrency(vente.montantTotal)}
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
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                      onClick={() => handleChangeStatut(vente._id, vente.statutLivraison)}
                      style={{ 
                        cursor: vente.statutLivraison === 'annulé' ? 'not-allowed' : 'pointer',
                        border: 'none',
                        opacity: vente.statutLivraison === 'annulé' ? 0.6 : 1,
                      }}
                      disabled={vente.statutLivraison === 'annulé'}
                      title={vente.statutLivraison === 'annulé' ? 'Vente annulée' : 'Cliquez pour changer le statut'}
                    >
                      {getStatutLabel(vente.statutLivraison)}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-10">
                      <Link
                        to={`/ventes/${vente._id}/edit`}
                        className="btn btn-sm btn-icon btn-secondary"
                        title="Modifier"
                      >
                        <FaEdit />
                      </Link>
                      {vente.statutLivraison !== 'annulé' && (
                        <button
                          className="btn btn-sm btn-icon btn-danger"
                          onClick={() => handleAnnuler(vente._id)}
                          title="Annuler"
                        >
                          <FaBan />
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() => handleDelete(vente._id, vente.nomClient)}
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Ventes;
