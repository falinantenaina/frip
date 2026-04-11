import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import api from '../utils/api';
import useAppStore from '../stores/appStore';

const LivreurDetails = () => {
  const { id } = useParams();
  const [livreur, setLivreur] = useState(null);
  const [livraisons, setLivraisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const { paiements, fetchPaiements, createPaiement } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ montantVerse: '', description: '' });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [livreurRes, livraisonsRes] = await Promise.all([
        api.get(`/livreurs/${id}`),
        api.get(`/ventes?livreur=${id}`),
      ]);
      setLivreur(livreurRes.data.data.livreur);
      setLivraisons(livraisonsRes.data.data);
      await fetchPaiements(id);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const paiementsLivreur = paiements[id] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createPaiement({ livreur: id, montantVerse: parseFloat(formData.montantVerse), description: formData.description });
    if (result.success) { toast.success('Paiement enregistré'); setShowModal(false); }
    else toast.error(result.message || 'Erreur');
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' AR';
  const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy', { locale: fr });
  const getStatutClass = (s) => ({ en_attente: 'en_attente', en_cours: 'en_cours', livré: 'livre', annulé: 'annule' })[s] || 'en_attente';

  const totalAVerser = livraisons.filter((l) => l.statutLivraison !== 'annulé').reduce((s, l) => s + l.prixVente, 0);
  const totalVerse = paiementsLivreur.reduce((s, p) => s + p.montantVerse, 0);
  const reste = totalAVerser - totalVerse;

  if (loading || !livreur) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <Link to="/livreurs" className="btn btn-secondary btn-sm mb-10"><FaArrowLeft /> Retour</Link>
          <h1 className="page-title">{livreur.nom}</h1>
          <p className="text-secondary">{livreur.telephone}{livreur.telephoneSecondaire && ` · ${livreur.telephoneSecondaire}`}</p>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { icon: '📦', label: 'Livraisons totales', val: livraisons.length, color: 'blue', isNumber: true },
          { icon: '💰', label: 'Prix de vente total', val: fmt(totalAVerser), color: 'green' },
          { icon: '💸', label: 'Montant versé', val: fmt(totalVerse), color: 'orange' },
          { icon: '📊', label: reste > 0 ? 'Reste à verser' : 'Tout payé', val: fmt(Math.abs(reste)), color: reste > 0 ? 'red' : 'green' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><span>{s.icon}</span></div>
            <div className="stat-info"><h3 className={reste > 0 && s.label === 'Reste à verser' ? 'text-danger' : ''}>{s.val}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Paiements */}
      <div className="card mb-20">
        <div className="card-header">
          <h3 className="card-title">Paiements ({paiementsLivreur.length})</h3>
          <button className="btn btn-sm btn-primary" onClick={() => { setFormData({ montantVerse: '', description: '' }); setShowModal(true); }}>
            <FaPlus /> Enregistrer un paiement
          </button>
        </div>
        {paiementsLivreur.length === 0 ? <p className="no-data">Aucun paiement</p> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Montant versé</th><th>Description</th></tr></thead>
            <tbody>
              {paiementsLivreur.map((p) => (
                <tr key={p._id}>
                  <td>{fmtDate(p.datePaiement)}</td>
                  <td><strong className="text-success">{fmt(p.montantVerse)}</strong></td>
                  <td>{p.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Livraisons */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Livraisons ({livraisons.length})</h3></div>
        {livraisons.length === 0 ? <p className="no-data">Aucune livraison</p> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Client</th><th>Produit</th><th>Lieu</th><th>Prix vente</th><th>Frais</th><th>Statut</th></tr></thead>
            <tbody>
              {livraisons.map((l) => (
                <tr key={l._id}>
                  <td>{fmtDate(l.dateVente)}</td>
                  <td><strong>{l.nomClient}</strong><br /><small className="text-secondary">{l.telephoneClient}</small></td>
                  <td>{l.produits?.length > 1 ? `📦 ${l.produits.length} produits` : l.nomProduit}</td>
                  <td>{l.lieuLivraison}</td>
                  <td><strong className="text-success">{fmt(l.prixVente)}</strong></td>
                  <td><span className="text-secondary">{fmt(l.fraisLivraison)}</span></td>
                  <td><span className={`status-badge ${getStatutClass(l.statutLivraison)}`}>{l.statutLivraison.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Enregistrer un paiement</h2><button className="modal-close" onClick={() => setShowModal(false)}>&times;</button></div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Montant versé (AR) *</label>
                  <input type="number" name="montantVerse" className="form-input" value={formData.montantVerse} onChange={(e) => setFormData({ ...formData, montantVerse: e.target.value })} min="0" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
                <div className="card" style={{ background: 'var(--light-color)', marginBottom: 15 }}>
                  <div className="flex-between mb-10"><span>Total à verser:</span><strong>{fmt(totalAVerser)}</strong></div>
                  <div className="flex-between mb-10"><span>Déjà versé:</span><strong>{fmt(totalVerse)}</strong></div>
                  <div className="flex-between" style={{ borderTop: '2px solid var(--border-color)', paddingTop: 10 }}>
                    <span className="font-bold">Reste:</span>
                    <strong className={reste > 0 ? 'text-danger' : 'text-success'}>{fmt(Math.abs(reste))}</strong>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivreurDetails;
