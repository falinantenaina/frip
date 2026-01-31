import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useBalleStore from '../stores/balleStore';

const BalleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createBalle, updateBalle, fetchBalle, loading } = useBalleStore();

  const [formData, setFormData] = useState({
    nom: '',
    numero: '',
    prixAchat: '',
    description: '',
    statut: 'en_stock',
  });

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      loadBalle();
    }
  }, [id]);

  const loadBalle = async () => {
    const result = await fetchBalle(id);
    if (result.success) {
      const balle = result.data.balle;
      setFormData({
        nom: balle.nom,
        numero: balle.numero,
        prixAchat: balle.prixAchat,
        description: balle.description || '',
        statut: balle.statut,
      });
    }
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
      ...formData,
      prixAchat: parseFloat(formData.prixAchat),
    };

    const result = isEdit
      ? await updateBalle(id, data)
      : await createBalle(data);

    if (result.success) {
      toast.success(isEdit ? 'Balle modifiée avec succès' : 'Balle créée avec succès');
      navigate('/balles');
    } else {
      toast.error(result.message || 'Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Modifier la balle' : 'Nouvelle balle'}</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom de la balle *</label>
              <input
                type="text"
                name="nom"
                className="form-input"
                placeholder="Ex: Balle Premium Hiver"
                value={formData.nom}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Numéro *</label>
              <input
                type="text"
                name="numero"
                className="form-input"
                placeholder="Ex: BALLE001"
                value={formData.numero}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prix d'achat (AR) *</label>
              <input
                type="number"
                name="prixAchat"
                className="form-input"
                placeholder="Ex: 800000"
                value={formData.prixAchat}
                onChange={handleChange}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Statut</label>
              <select
                name="statut"
                className="form-select"
                value={formData.statut}
                onChange={handleChange}
              >
                <option value="en_stock">En stock</option>
                <option value="en_vente">En vente</option>
                <option value="vendu">Vendu</option>
                <option value="archivé">Archivé</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-textarea"
              placeholder="Description de la balle..."
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="flex-between mt-20">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/balles')}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BalleForm;
