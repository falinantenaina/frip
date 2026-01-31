import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDepenseStore } from '../stores/otherStores';
import useBalleStore from '../stores/balleStore';

const DepenseForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get('balle');

  const { createDepense, loading } = useDepenseStore();
  const { balles, fetchBalles } = useBalleStore();

  const [formData, setFormData] = useState({
    description: '',
    montant: '',
    type: 'autre',
    balle: balleIdParam || '',
    notes: '',
  });

  useEffect(() => {
    fetchBalles();
  }, []);

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

    const result = await createDepense(data);

    if (result.success) {
      toast.success('Dépense créée avec succès');
      if (balleIdParam) {
        navigate(`/balles/${balleIdParam}`);
      } else {
        navigate('/depenses');
      }
    } else {
      toast.error(result.message || 'Erreur lors de la création');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Nouvelle dépense</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
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

          <div className="flex-between mt-20">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/depenses')}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Créer la dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepenseForm;
