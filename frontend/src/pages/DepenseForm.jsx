// DepenseForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAppStore from '../stores/appStore';

const DepenseForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get('balle');
  const { createDepense, balles, fetchBalles } = useAppStore();
  const [formData, setFormData] = useState({ description: '', montant: '', type: 'autre', balle: balleIdParam || '', notes: '' });

  useEffect(() => { fetchBalles(); }, []);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createDepense({ description: formData.description, montant: parseFloat(formData.montant), type: formData.type, balle: formData.balle || null, notes: formData.notes });
    if (result.success) { toast.success('Dépense créée'); navigate(balleIdParam ? `/balles/${balleIdParam}` : '/depenses'); }
    else toast.error(result.message || 'Erreur');
  };

  const TYPES = ["transport", "emballage", "publicité", "salaire", "loyer", "autre"];

  return (
    <div className="main-content">
      <div className="page-header"><h1 className="page-title">Nouvelle dépense</h1></div>
      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input type="text" name="description" className="form-input" value={formData.description} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Montant (AR) *</label>
              <input type="number" name="montant" className="form-input" value={formData.montant} onChange={handleChange} min="0" required />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select name="type" className="form-select" value={formData.type} onChange={handleChange} required>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Balle (optionnel)</label>
            <select name="balle" className="form-select" value={formData.balle} onChange={handleChange}>
              <option value="">Dépense globale</option>
              {balles.map((b) => <option key={b._id} value={b._id}>{b.nom} - {b.numero}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea name="notes" className="form-textarea" value={formData.notes} onChange={handleChange} rows={2} />
          </div>
          <div className="flex-between mt-20">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/depenses')}>Annuler</button>
            <button type="submit" className="btn btn-primary">Créer la dépense</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepenseForm;
