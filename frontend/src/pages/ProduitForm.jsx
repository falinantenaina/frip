import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useProduitStore } from '../stores/otherStores';
import useBalleStore from '../stores/balleStore';

const ProduitForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get('balle');

  const { createProduit, createProduitsBulk, loading } = useProduitStore();
  const { balles, fetchBalles } = useBalleStore();

  const [mode, setMode] = useState('single'); // 'single' ou 'bulk'
  const [formData, setFormData] = useState({
    balle: balleIdParam || '',
    nom: '',
    taille: '',
    prixVente: '',
    description: '',
  });

  const [bulkProduits, setBulkProduits] = useState([
    { nom: '', taille: '', prixVente: '', description: '' },
  ]);

  useEffect(() => {
    fetchBalles();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBulkChange = (index, field, value) => {
    const newProduits = [...bulkProduits];
    newProduits[index][field] = value;
    setBulkProduits(newProduits);
  };

  const addProduitRow = () => {
    setBulkProduits([
      ...bulkProduits,
      { nom: '', taille: '', prixVente: '', description: '' },
    ]);
  };

  const removeProduitRow = (index) => {
    const newProduits = bulkProduits.filter((_, i) => i !== index);
    setBulkProduits(newProduits);
  };

  const handleSubmitSingle = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      prixVente: parseFloat(formData.prixVente),
    };

    const result = await createProduit(data);

    if (result.success) {
      toast.success('Produit créé avec succès');
      if (balleIdParam) {
        navigate(`/balles/${balleIdParam}`);
      } else {
        navigate('/balles');
      }
    } else {
      toast.error(result.message || 'Erreur lors de la création');
    }
  };

  const handleSubmitBulk = async (e) => {
    e.preventDefault();

    if (!formData.balle) {
      toast.error('Veuillez sélectionner une balle');
      return;
    }

    // Filtrer les lignes vides
    const produitsValides = bulkProduits.filter(
      (p) => p.nom && p.prixVente
    );

    if (produitsValides.length === 0) {
      toast.error('Ajoutez au moins un produit valide');
      return;
    }

    // Convertir les prix en nombres
    const produitsFormatted = produitsValides.map((p) => ({
      ...p,
      prixVente: parseFloat(p.prixVente),
    }));

    const result = await createProduitsBulk(formData.balle, produitsFormatted);

    if (result.success) {
      toast.success(`${produitsFormatted.length} produit(s) créé(s) avec succès`);
      if (balleIdParam) {
        navigate(`/balles/${balleIdParam}`);
      } else {
        navigate('/balles');
      }
    } else {
      toast.error(result.message || 'Erreur lors de la création');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Ajouter des produits</h1>
      </div>

      {/* Mode selection */}
      <div className="card mb-20" style={{ maxWidth: '900px', margin: '0 auto 20px' }}>
        <div className="flex gap-20">
          <label className="flex gap-10">
            <input
              type="radio"
              value="single"
              checked={mode === 'single'}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Produit unique</span>
          </label>
          <label className="flex gap-10">
            <input
              type="radio"
              value="bulk"
              checked={mode === 'bulk'}
              onChange={(e) => setMode(e.target.value)}
            />
            <span>Plusieurs produits</span>
          </label>
        </div>
      </div>

      {mode === 'single' ? (
        // Formulaire produit unique
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <form onSubmit={handleSubmitSingle}>
            <div className="form-group">
              <label className="form-label">Balle *</label>
              <select
                name="balle"
                className="form-select"
                value={formData.balle}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner une balle</option>
                {balles.map((balle) => (
                  <option key={balle._id} value={balle._id}>
                    {balle.nom} - {balle.numero}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input
                  type="text"
                  name="nom"
                  className="form-input"
                  placeholder="Ex: Jean Levis"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Taille</label>
                <input
                  type="text"
                  name="taille"
                  className="form-input"
                  placeholder="Ex: M"
                  value={formData.taille}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Prix de vente (AR) *</label>
              <input
                type="number"
                name="prixVente"
                className="form-input"
                placeholder="Ex: 15000"
                value={formData.prixVente}
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
                placeholder="Description du produit..."
                value={formData.description}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="flex-between mt-20">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles')}
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Création...' : 'Créer le produit'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Formulaire produits multiples
        <div className="card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <form onSubmit={handleSubmitBulk}>
            <div className="form-group">
              <label className="form-label">Balle *</label>
              <select
                name="balle"
                className="form-select"
                value={formData.balle}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner une balle</option>
                {balles.map((balle) => (
                  <option key={balle._id} value={balle._id}>
                    {balle.nom} - {balle.numero}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-20">
              <h4 className="mb-10">Liste des produits</h4>
              {bulkProduits.map((produit, index) => (
                <div
                  key={index}
                  className="card mb-10"
                  style={{ background: 'var(--light-color)' }}
                >
                  <div className="flex-between mb-10">
                    <strong>Produit {index + 1}</strong>
                    {bulkProduits.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeProduitRow(index)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nom *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: T-shirt Nike"
                        value={produit.nom}
                        onChange={(e) =>
                          handleBulkChange(index, 'nom', e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Taille</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: L"
                        value={produit.taille}
                        onChange={(e) =>
                          handleBulkChange(index, 'taille', e.target.value)
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Prix (AR) *</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Ex: 8000"
                        value={produit.prixVente}
                        onChange={(e) =>
                          handleBulkChange(index, 'prixVente', e.target.value)
                        }
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Description..."
                      value={produit.description}
                      onChange={(e) =>
                        handleBulkChange(index, 'description', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary mb-20"
              onClick={addProduitRow}
            >
              + Ajouter un produit
            </button>

            <div className="flex-between mt-20">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(balleIdParam ? `/balles/${balleIdParam}` : '/balles')}
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Création...' : `Créer ${bulkProduits.length} produit(s)`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProduitForm;
