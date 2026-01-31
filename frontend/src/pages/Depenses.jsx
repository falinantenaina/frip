import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useDepenseStore } from '../stores/otherStores';
import useBalleStore from '../stores/balleStore';

const Depenses = () => {
  const { depenses, loading, fetchDepenses, createDepense, updateDepense, deleteDepense } =
    useDepenseStore();
  const { balles, fetchBalles } = useBalleStore();

  const [showModal, setShowModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterBalle, setFilterBalle] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    montant: '',
    type: 'autre',
    balle: '',
    notes: '',
  });

  useEffect(() => {
    fetchBalles();
    loadDepenses();
  }, []);

  const loadDepenses = () => {
    const filters = {};
    if (filterType) filters.type = filterType;
    if (filterBalle) filters.balle = filterBalle === 'global' ? 'global' : filterBalle;
    fetchDepenses(filters);
  };

  useEffect(() => {
    loadDepenses();
  }, [filterType, filterBalle]);

  const handleOpenModal = (depense = null) => {
    if (depense) {
      setEditingDepense(depense);
      setFormData({
        description: depense.description,
        montant: depense.montant.toString(),
        type: depense.type,
        balle: depense.balle?._id || '',
        notes: depense.notes || '',
      });
    } else {
      setEditingDepense(null);
      setFormData({
        description: '',
        montant: '',
        type: 'autre',
        balle: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDepense(null);
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
      description: formData.description,
      montant: parseFloat(formData.montant),
      type: formData.type,
      balle: formData.balle || null,
      notes: formData.notes,
    };

    const result = editingDepense
      ? await updateDepense(editingDepense._id, data)
      : await createDepense(data);

    if (result.success) {
      toast.success(editingDepense ? 'Dépense modifiée' : 'Dépense créée');
      handleCloseModal();
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const handleDelete = async (id, description) => {
    if (window.confirm(`Supprimer la dépense "${description}" ?`)) {
      const result = await deleteDepense(id);
      if (result.success) {
        toast.success('Dépense supprimée');
      } else {
        toast.error(result.message);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' AR';
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  if (loading && depenses.length === 0) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Dépenses</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nouvelle dépense
        </button>
      </div>

      <div className="filters-bar">
        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tous les types</option>
          <option value="transport">Transport</option>
          <option value="emballage">Emballage</option>
          <option value="publicité">Publicité</option>
          <option value="salaire">Salaire</option>
          <option value="loyer">Loyer</option>
          <option value="autre">Autre</option>
        </select>

        <select
          className="form-select"
          value={filterBalle}
          onChange={(e) => setFilterBalle(e.target.value)}
        >
          <option value="">Toutes les balles</option>
          <option value="global">Dépenses globales</option>
          {balles.map((balle) => (
            <option key={balle._id} value={balle._id}>
              {balle.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        {depenses.length === 0 ? (
          <p className="no-data">Aucune dépense</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Balle</th>
                <th>Montant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((depense) => (
                <tr key={depense._id}>
                  <td>{formatDate(depense.dateDepense)}</td>
                  <td>
                    <strong>{depense.description}</strong>
                    {depense.notes && (
                      <>
                        <br />
                        <small className="text-secondary">{depense.notes}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <span className="status-badge disponible">{depense.type}</span>
                  </td>
                  <td>
                    {depense.balle ? (
                      <>
                        {depense.balle.nom}
                        <br />
                        <small className="text-secondary">{depense.balle.numero}</small>
                      </>
                    ) : (
                      <span className="text-secondary">Global</span>
                    )}
                  </td>
                  <td>
                    <strong className="text-danger">{formatCurrency(depense.montant)}</strong>
                  </td>
                  <td>
                    <div className="flex gap-10">
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() => handleOpenModal(depense)}
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() => handleDelete(depense._id, depense.description)}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingDepense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input
                    type="text"
                    name="description"
                    className="form-input"
                    placeholder="Ex: Transport de la balle"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Montant (AR) *</label>
                    <input
                      type="number"
                      name="montant"
                      className="form-input"
                      placeholder="Ex: 20000"
                      value={formData.montant}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select
                      name="type"
                      className="form-select"
                      value={formData.type}
                      onChange={handleChange}
                      required
                    >
                      <option value="transport">Transport</option>
                      <option value="emballage">Emballage</option>
                      <option value="publicité">Publicité</option>
                      <option value="salaire">Salaire</option>
                      <option value="loyer">Loyer</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Balle (optionnel)</label>
                  <select
                    name="balle"
                    className="form-select"
                    value={formData.balle}
                    onChange={handleChange}
                  >
                    <option value="">Dépense globale</option>
                    {balles.map((balle) => (
                      <option key={balle._id} value={balle._id}>
                        {balle.nom} - {balle.numero}
                      </option>
                    ))}
                  </select>
                  <small className="text-secondary">
                    Laissez vide pour une dépense globale (non liée à une balle)
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    className="form-textarea"
                    placeholder="Notes additionnelles..."
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingDepense ? 'Modifier' : 'Créer'}
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

export default Depenses;
