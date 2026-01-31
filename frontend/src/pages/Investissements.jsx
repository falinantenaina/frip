import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useInvestissementStore } from '../stores/financeStores';

const Investissements = () => {
  const {
    investissements,
    versements,
    loading,
    fetchInvestissements,
    fetchVersements,
    createInvestissement,
    createVersement,
    updateInvestissement,
    updateVersement,
    deleteInvestissement,
    deleteVersement,
  } = useInvestissementStore();

  const [activeTab, setActiveTab] = useState('investissements'); // 'investissements' ou 'versements'
  const [periode, setPeriode] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('investissement'); // 'investissement' ou 'versement'
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    montant: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadData();
  }, [periode]);

  const loadData = () => {
    const filters = {};
    
    if (periode !== 'all') {
      const now = new Date();
      let dateDebut;

      switch (periode) {
        case 'day':
          dateDebut = format(now, 'yyyy-MM-dd');
          filters.dateDebut = dateDebut;
          filters.dateFin = dateDebut;
          break;
        case 'week':
          dateDebut = new Date(now.setDate(now.getDate() - 7));
          filters.dateDebut = format(dateDebut, 'yyyy-MM-dd');
          break;
        case 'month':
          dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
          filters.dateDebut = format(dateDebut, 'yyyy-MM-dd');
          break;
      }
    }

    fetchInvestissements(filters);
    fetchVersements(filters);
  };

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);

    if (item) {
      setFormData({
        montant: item.montant.toString(),
        description: item.description || '',
        date: format(new Date(item.dateInvestissement || item.dateVersement), 'yyyy-MM-dd'),
      });
    } else {
      setFormData({
        montant: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
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
      montant: parseFloat(formData.montant),
      description: formData.description,
      [modalType === 'investissement' ? 'dateInvestissement' : 'dateVersement']: new Date(
        formData.date
      ),
    };

    let result;
    if (editingItem) {
      result =
        modalType === 'investissement'
          ? await updateInvestissement(editingItem._id, data)
          : await updateVersement(editingItem._id, data);
    } else {
      result =
        modalType === 'investissement'
          ? await createInvestissement(data)
          : await createVersement(data);
    }

    if (result.success) {
      toast.success(
        editingItem
          ? `${modalType === 'investissement' ? 'Investissement' : 'Versement'} modifié`
          : `${modalType === 'investissement' ? 'Investissement' : 'Versement'} créé`
      );
      handleCloseModal();
      loadData();
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const handleDelete = async (type, id, description) => {
    if (
      window.confirm(
        `Supprimer ${
          type === 'investissement' ? "l'investissement" : 'le versement'
        } "${description}" ?`
      )
    ) {
      const result =
        type === 'investissement'
          ? await deleteInvestissement(id)
          : await deleteVersement(id);

      if (result.success) {
        toast.success('Supprimé avec succès');
        loadData();
      } else {
        toast.error('Erreur de suppression');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' AR';
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  // Calculs
  const totalInvestissements = investissements.reduce((sum, i) => sum + i.montant, 0);
  const totalVersements = versements.reduce((sum, v) => sum + v.montant, 0);
  const solde = totalInvestissements - totalVersements;

  if (loading && investissements.length === 0 && versements.length === 0) {
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Investissements</h1>
      </div>

      {/* Filtre de période */}
      <div className="card mb-20">
        <div className="flex-between">
          <select
            className="form-select"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
            <option value="all">Toutes les périodes</option>
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats-grid mb-20">
        <div className="stat-card">
          <div className="stat-icon green">
            <FaArrowDown />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalInvestissements)}</h3>
            <p>Total reçu de l'investisseur</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <FaArrowUp />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalVersements)}</h3>
            <p>Total versé à l'investisseur</p>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${solde >= 0 ? 'orange' : 'green'}`}>
            <span>💰</span>
          </div>
          <div className="stat-info">
            <h3 className={solde >= 0 ? 'text-danger' : 'text-success'}>
              {formatCurrency(Math.abs(solde))}
            </h3>
            <p>{solde >= 0 ? 'Reste à rembourser' : 'Surplus versé'}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <span>📊</span>
          </div>
          <div className="stat-info">
            <h3>
              {investissements.length} / {versements.length}
            </h3>
            <p>Investissements / Versements</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-20">
        <div className="flex gap-20" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'investissements' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('investissements')}
            style={{ borderRadius: '0', borderBottom: 'none' }}
          >
            <FaArrowDown /> Argent reçu ({investissements.length})
          </button>
          <button
            className={`btn ${activeTab === 'versements' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('versements')}
            style={{ borderRadius: '0', borderBottom: 'none' }}
          >
            <FaArrowUp /> Argent versé ({versements.length})
          </button>
        </div>
      </div>

      {/* Contenu selon le tab */}
      {activeTab === 'investissements' ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Argent reçu de l'investisseur</h3>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleOpenModal('investissement')}
            >
              <FaPlus /> Enregistrer un investissement
            </button>
          </div>
          <div className="table-container">
            {investissements.length === 0 ? (
              <p className="no-data">Aucun investissement enregistré</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investissements.map((inv) => (
                    <tr key={inv._id}>
                      <td>{formatDate(inv.dateInvestissement)}</td>
                      <td>
                        <strong className="text-success">{formatCurrency(inv.montant)}</strong>
                      </td>
                      <td>{inv.description || '-'}</td>
                      <td>
                        <div className="flex gap-10">
                          <button
                            className="btn btn-sm btn-icon btn-secondary"
                            onClick={() => handleOpenModal('investissement', inv)}
                            title="Modifier"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() =>
                              handleDelete('investissement', inv._id, inv.description)
                            }
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
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Argent versé à l'investisseur</h3>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleOpenModal('versement')}
            >
              <FaPlus /> Enregistrer un versement
            </button>
          </div>
          <div className="table-container">
            {versements.length === 0 ? (
              <p className="no-data">Aucun versement enregistré</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versements.map((vers) => (
                    <tr key={vers._id}>
                      <td>{formatDate(vers.dateVersement)}</td>
                      <td>
                        <strong className="text-danger">{formatCurrency(vers.montant)}</strong>
                      </td>
                      <td>{vers.description || '-'}</td>
                      <td>
                        <div className="flex gap-10">
                          <button
                            className="btn btn-sm btn-icon btn-secondary"
                            onClick={() => handleOpenModal('versement', vers)}
                            title="Modifier"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() => handleDelete('versement', vers._id, vers.description)}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? 'Modifier' : 'Enregistrer'}{' '}
                {modalType === 'investissement' ? "l'investissement" : 'le versement'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Montant (AR) *</label>
                    <input
                      type="number"
                      name="montant"
                      className="form-input"
                      placeholder="Ex: 1000000"
                      value={formData.montant}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      type="date"
                      name="date"
                      className="form-input"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder={
                      modalType === 'investissement'
                        ? 'Ex: Investissement pour achat de balles'
                        : 'Ex: Remboursement partiel + bénéfices'
                    }
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingItem ? 'Modifier' : 'Enregistrer'}
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

export default Investissements;
