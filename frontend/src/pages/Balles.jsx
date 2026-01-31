import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCalculator } from 'react-icons/fa';
import { toast } from 'react-toastify';
import useBalleStore from '../stores/balleStore';

const Balles = () => {
  const { balles, loading, fetchBalles, deleteBalle, recalculateStats } = useBalleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  useEffect(() => {
    loadBalles();
  }, []);

  const loadBalles = () => {
    const filters = {};
    if (filterStatut) filters.statut = filterStatut;
    if (searchTerm) filters.search = searchTerm;
    fetchBalles(filters);
  };

  useEffect(() => {
    loadBalles();
  }, [filterStatut]);

  const handleSearch = () => {
    loadBalles();
  };

  const handleDelete = async (id, nom) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la balle "${nom}" ?`)) {
      const result = await deleteBalle(id);
      if (result.success) {
        toast.success('Balle supprimée avec succès');
      } else {
        toast.error(result.message || 'Erreur de suppression');
      }
    }
  };

  const handleRecalculate = async (id) => {
    const result = await recalculateStats(id);
    if (result.success) {
      toast.success('Statistiques recalculées');
    } else {
      toast.error(result.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' AR';
  };

  const getStatutBadgeClass = (statut) => {
    const classes = {
      en_stock: 'disponible',
      en_vente: 'en_cours',
      vendu: 'vendu',
      archivé: 'annule',
    };
    return classes[statut] || 'disponible';
  };

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
        <h1 className="page-title">Gestion des Balles</h1>
        <Link to="/balles/new" className="btn btn-primary">
          <FaPlus /> Nouvelle balle
        </Link>
      </div>

      <div className="filters-bar">
        <select
          className="form-select"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_stock">En stock</option>
          <option value="en_vente">En vente</option>
          <option value="vendu">Vendu</option>
          <option value="archivé">Archivé</option>
        </select>

        <input
          type="text"
          className="form-input"
          placeholder="Rechercher une balle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-secondary" onClick={handleSearch}>
          Rechercher
        </button>
      </div>

      <div className="table-container">
        {balles.length === 0 ? (
          <p className="no-data">Aucune balle trouvée</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Balle</th>
                <th>Prix d'achat</th>
                <th>Ventes</th>
                <th>Dépenses</th>
                <th>Bénéfice</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {balles.map((balle) => (
                <tr key={balle._id}>
                  <td>
                    <strong>{balle.nom}</strong>
                    <br />
                    <small className="text-secondary">{balle.numero}</small>
                  </td>
                  <td>{formatCurrency(balle.prixAchat)}</td>
                  <td>
                    {formatCurrency(balle.totalVentes)}
                    <br />
                    <small className="text-secondary">
                      {balle.nombreVentes} vente{balle.nombreVentes > 1 ? 's' : ''}
                    </small>
                  </td>
                  <td>{formatCurrency(balle.depensesLiees)}</td>
                  <td>
                    <strong className={balle.benefice >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(balle.benefice)}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatutBadgeClass(balle.statut)}`}>
                      {balle.statut.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-10">
                      <Link
                        to={`/balles/${balle._id}`}
                        className="btn btn-sm btn-icon btn-primary"
                        title="Voir détails"
                      >
                        <FaEye />
                      </Link>
                      <Link
                        to={`/balles/${balle._id}/edit`}
                        className="btn btn-sm btn-icon btn-secondary"
                        title="Modifier"
                      >
                        <FaEdit />
                      </Link>
                      <button
                        className="btn btn-sm btn-icon btn-success"
                        onClick={() => handleRecalculate(balle._id)}
                        title="Recalculer les stats"
                      >
                        <FaCalculator />
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() => handleDelete(balle._id, balle.nom)}
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

export default Balles;
