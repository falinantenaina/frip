import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAppStore from '../stores/appStore';
import api from '../utils/api';

const ProduitForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get('balle');
  const { balles, fetchBalles } = useAppStore();
  const [mode, setMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ balle: balleIdParam || '', nom: '', taille: '', prixVente: '', description: '' });
  const [bulkProduits, setBulkProduits] = useState([{ nom: '', taille: '', prixVente: '', description: '' }]);

  useEffect(() => { fetchBalles(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleBulkChange = (idx, field, value) => { const n = [...bulkProduits]; n[idx][field] = value; setBulkProduits(n); };
  const addRow = () => setBulkProduits([...bulkProduits, { nom: '', taille: '', prixVente: '', description: '' }]);
  const removeRow = (idx) => setBulkProduits(bulkProduits.filter((_, i) => i !== idx));

  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/produits', { ...formData, prixVente: parseFloat(formData.prixVente) });
      toast.success('Produit créé'); navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  const handleSubmitBulk = async (e) => {
    e.preventDefault();
    if (!formData.balle) { toast.error('Sélectionnez une balle'); return; }
    const valides = bulkProduits.filter((p) => p.nom && p.prixVente);
    if (valides.length === 0) { toast.error('Ajoutez au moins un produit valide'); return; }
    setLoading(true);
    try {
      await api.post('/produits/bulk', { balle: formData.balle, produits: valides.map((p) => ({ ...p, prixVente: parseFloat(p.prixVente) })) });
      toast.success(`${valides.length} produit(s) créé(s)`); navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="main-content">
      <div className="page-header"><h1 className="page-title">Ajouter des produits</h1></div>
      <div className="card mb-20" style={{ maxWidth: 900, margin: '0 auto 20px' }}>
        <div className="flex gap-20">
          {['single', 'bulk'].map((m) => (
            <label key={m} className="flex gap-10">
              <input type="radio" value={m} checked={mode === m} onChange={(e) => setMode(e.target.value)} />
              <span>{m === 'single' ? 'Produit unique' : 'Plusieurs produits'}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        {mode === 'single' ? (
          <form onSubmit={handleSubmitSingle}>
            <div className="form-group">
              <label className="form-label">Balle *</label>
              <select name="balle" className="form-select" value={formData.balle} onChange={handleChange} required>
                <option value="">Sélectionner une balle</option>
                {balles.map((b) => <option key={b._id} value={b._id}>{b.nom} - {b.numero}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input type="text" name="nom" className="form-input" value={formData.nom} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Taille</label>
                <input type="text" name="taille" className="form-input" value={formData.taille} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Prix vente (AR) *</label>
              <input type="number" name="prixVente" className="form-input" value={formData.prixVente} onChange={handleChange} min="0" required />
            </div>
            <div className="flex-between mt-20">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles')}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Création...' : 'Créer le produit'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitBulk}>
            <div className="form-group">
              <label className="form-label">Balle *</label>
              <select name="balle" className="form-select" value={formData.balle} onChange={handleChange} required>
                <option value="">Sélectionner une balle</option>
                {balles.map((b) => <option key={b._id} value={b._id}>{b.nom} - {b.numero}</option>)}
              </select>
            </div>
            {bulkProduits.map((p, idx) => (
              <div key={idx} className="card mb-10" style={{ background: 'var(--light-color)' }}>
                <div className="flex-between mb-10">
                  <strong>Produit {idx + 1}</strong>
                  {bulkProduits.length > 1 && <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(idx)}>Supprimer</button>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input type="text" className="form-input" value={p.nom} onChange={(e) => handleBulkChange(idx, 'nom', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taille</label>
                    <input type="text" className="form-input" value={p.taille} onChange={(e) => handleBulkChange(idx, 'taille', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prix (AR) *</label>
                    <input type="number" className="form-input" value={p.prixVente} onChange={(e) => handleBulkChange(idx, 'prixVente', e.target.value)} min="0" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary mb-20" onClick={addRow}>+ Ajouter un produit</button>
            <div className="flex-between mt-20">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles')}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Création...' : `Créer ${bulkProduits.length} produit(s)`}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProduitForm;
