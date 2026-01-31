import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useLivreurStore } from '../stores/otherStores';

const Livreurs = () => {
  const { livreurs, loading, fetchLivreurs, createLivreur, updateLivreur, deleteLivreur } =
    useLivreurStore();

  const [showModal, setShowModal] = useState(false);
  const [editingLivreur, setEditingLivreur] = useState(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    telephoneSecondaire: '',
    adresse: '',
    notes: '',
    actif: true,
  });

  useEffect(() => {
    fetchLivreurs();
  }, []);

  const handleOpenModal = (livreur = null) => {
    if (livreur) {
      setEditingLivreur(livreur);
      setFormData({
        nom: livreur.nom,
        telephone: livreur.telephone,
        telephoneSecondaire: livreur.telephoneSecondaire || '',
        adresse: livreur.adresse || '',
        notes: livreur.notes || '',
        actif: livreur.actif,
      });
    } else {
      setEditingLivreur(null);
      setFormData({
        nom: '',
        telephone: '',
        telephoneSecondaire: '',
        adresse: '',
        notes: '',
        actif: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLivreur(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editingLivreur
      ? await updateLivreur(editingLivreur._id, formData)
      : await createLivreur(formData);

    if (result.success) {
      toast.success(editingLivreur ? 'Livreur modifié' : 'Livreur créé');
      handleCloseModal();
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const handleDelete = async (id, nom) => {
    if (window.confirm(`Supprimer le livreur "${nom}" ?`)) {
      const result = await deleteLivreur(id);
      if (result.success) {
        toast.success('Livreur supprimé');
      } else {
        toast.error(result.message);
      }
    }
  };

  if (loading && livreurs.length === 0) {
    return (
      <div className="main-content">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Livreurs</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nouveau livreur
        </button>
      </div>

      <div className="table-container">
        {livreurs.length === 0 ? (
          <p className="no-data">Aucun livreur</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                <th>Livraisons</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {livreurs.map((livreur) => (
                <tr key={livreur._id}>
                  <td>
                    <strong>{livreur.nom}</strong>
                    {livreur.notes && (
                      <>
                        <br />
                        <small className="text-secondary">{livreur.notes}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {livreur.telephone}
                    {livreur.telephoneSecondaire && (
                      <>
                        <br />
                        <small className="text-secondary">{livreur.telephoneSecondaire}</small>
                      </>
                    )}
                  </td>
                  <td>{livreur.adresse || '-'}</td>
                  <td>
                    <strong>{livreur.nombreLivraisons || 0}</strong> livraison
                    {livreur.nombreLivraisons > 1 ? 's' : ''}
                  </td>
                  <td>
                    <span className={`status-badge ${livreur.actif ? 'disponible' : 'annule'}`}>
                      {livreur.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-10">
                      <Link
                        to={`/livreurs/${livreur._id}`}
                        className="btn btn-sm btn-icon btn-primary"
                        title="Voir détails"
                      >
                        <FaEye />
                      </Link>
                      <button
                        className="btn btn-sm btn-icon btn-secondary"
                        onClick={() => handleOpenModal(livreur)}
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="btn btn-sm btn-icon btn-danger"
                        onClick={() => handleDelete(livreur._id, livreur.nom)}
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
                {editingLivreur ? 'Modifier le livreur' : 'Nouveau livreur'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nom complet *</label>
                  <input
                    type="text"
                    name="nom"
                    className="form-input"
                    placeholder="Ex: Rakoto Jean"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Téléphone principal *</label>
                    <input
                      type="tel"
                      name="telephone"
                      className="form-input"
                      placeholder="Ex: +261 34 00 000 00"
                      value={formData.telephone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Téléphone secondaire</label>
                    <input
                      type="tel"
                      name="telephoneSecondaire"
                      className="form-input"
                      placeholder="Ex: +261 33 00 000 00"
                      value={formData.telephoneSecondaire}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adresse</label>
                  <input
                    type="text"
                    name="adresse"
                    className="form-input"
                    placeholder="Ex: Analakely, Antananarivo"
                    value={formData.adresse}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    className="form-textarea"
                    placeholder="Remarques sur le livreur..."
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label className="flex gap-10">
                    <input
                      type="checkbox"
                      name="actif"
                      checked={formData.actif}
                      onChange={handleChange}
                    />
                    <span>Livreur actif</span>
                  </label>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingLivreur ? 'Modifier' : 'Créer'}
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

export default Livreurs;
