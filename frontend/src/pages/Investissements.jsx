import { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import useAppStore from '../stores/appStore';

const Investissements = () => {
  const { investissements, versements, loading, fetchInvestissements, fetchVersements, createInvestissement, createVersement, updateInvestissement, updateVersement, deleteInvestissement, deleteVersement } = useAppStore();
  const [activeTab, setActiveTab] = useState('investissements');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('investissement');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ montant: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => { fetchInvestissements(); fetchVersements(); }, []);

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setFormData(item ? {
      montant: item.montant.toString(),
      description: item.description || '',
      date: format(new Date(item.dateInvestissement || item.dateVersement), 'yyyy-MM-dd'),
    } : { montant: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      montant: parseFloat(formData.montant),
      description: formData.description,
      [modalType === 'investissement' ? 'dateInvestissement' : 'dateVersement']: new Date(formData.date),
    };
    let result;
    if (editingItem) {
      result = modalType === 'investissement' ? await updateInvestissement(editingItem._id, data) : await updateVersement(editingItem._id, data);
    } else {
      result = modalType === 'investissement' ? await createInvestissement(data) : await createVersement(data);
    }
    if (result.success) { toast.success(editingItem ? 'Modifié' : 'Enregistré'); setShowModal(false); setEditingItem(null); }
    else toast.error(result.message || 'Erreur');
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Supprimer ?')) return;
    const r = type === 'investissement' ? await deleteInvestissement(id) : await deleteVersement(id);
    r.success ? toast.success('Supprimé') : toast.error('Erreur');
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' AR';
  const fmtDate = (d) => format(new Date(d), 'dd MMM yyyy', { locale: fr });

  const totalInvestissements = investissements.reduce((s, i) => s + i.montant, 0);
  const totalVersements = versements.reduce((s, v) => s + v.montant, 0);
  const solde = totalInvestissements - totalVersements;

  if (loading.investissements && investissements.length === 0 && versements.length === 0) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <div className="main-content">
      <div className="page-header"><h1 className="page-title">Investissements & Versements</h1></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon green"><FaArrowDown /></div><div className="stat-info"><h3>{fmt(totalInvestissements)}</h3><p>Total reçu de l'investisseur</p></div></div>
        <div className="stat-card"><div className="stat-icon red"><FaArrowUp /></div><div className="stat-info"><h3>{fmt(totalVersements)}</h3><p>Total versé à l'investisseur</p></div></div>
        <div className="stat-card">
          <div className={`stat-icon ${solde >= 0 ? 'orange' : 'green'}`}><span>💰</span></div>
          <div className="stat-info">
            <h3 className={solde >= 0 ? 'text-danger' : 'text-success'}>{fmt(Math.abs(solde))}</h3>
            <p>{solde >= 0 ? 'Reste à rembourser' : 'Surplus versé'}</p>
          </div>
        </div>
      </div>

      <div className="card mb-20">
        <div className="flex gap-20">
          {['investissements', 'versements'].map((tab) => (
            <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
              {tab === 'investissements' ? <><FaArrowDown /> Argent reçu ({investissements.length})</> : <><FaArrowUp /> Argent versé ({versements.length})</>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'investissements' ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Argent reçu de l'investisseur</h3>
            <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal('investissement')}><FaPlus /> Enregistrer</button>
          </div>
          {investissements.length === 0 ? <p className="no-data">Aucun investissement</p> : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Montant</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {investissements.map((inv) => (
                  <tr key={inv._id}>
                    <td>{fmtDate(inv.dateInvestissement)}</td>
                    <td><strong className="text-success">{fmt(inv.montant)}</strong></td>
                    <td>{inv.description || '-'}</td>
                    <td>
                      <div className="flex gap-10">
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => handleOpenModal('investissement', inv)}><FaEdit /></button>
                        <button className="btn btn-sm btn-icon btn-danger" onClick={() => handleDelete('investissement', inv._id)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Argent versé à l'investisseur</h3>
            <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal('versement')}><FaPlus /> Enregistrer</button>
          </div>
          {versements.length === 0 ? <p className="no-data">Aucun versement</p> : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Montant</th><th>Description</th><th>Actions</th></tr></thead>
              <tbody>
                {versements.map((v) => (
                  <tr key={v._id}>
                    <td>{fmtDate(v.dateVersement)}</td>
                    <td><strong className="text-danger">{fmt(v.montant)}</strong></td>
                    <td>{v.description || '-'}</td>
                    <td>
                      <div className="flex gap-10">
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => handleOpenModal('versement', v)}><FaEdit /></button>
                        <button className="btn btn-sm btn-icon btn-danger" onClick={() => handleDelete('versement', v._id)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Modifier' : 'Enregistrer'} {modalType === 'investissement' ? "l'investissement" : 'le versement'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Montant (AR) *</label>
                    <input type="number" name="montant" className="form-input" value={formData.montant} onChange={(e) => setFormData({ ...formData, montant: e.target.value })} min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" name="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">{editingItem ? 'Modifier' : 'Enregistrer'}</button>
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
