import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";

const Depenses = () => {
  const { depenses, balles, loading, fetchDepenses, fetchBalles, createDepense, updateDepense, deleteDepense } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterBalle, setFilterBalle] = useState("");
  const [formData, setFormData] = useState({ description: "", montant: "", type: "autre", balle: "", notes: "" });

  useEffect(() => { fetchBalles(); fetchDepenses(); }, []);
  useEffect(() => {
    const filters = {};
    if (filterType) filters.type = filterType;
    if (filterBalle) filters.balle = filterBalle === "global" ? "global" : filterBalle;
    fetchDepenses(filters, true);
  }, [filterType, filterBalle]);

  const handleOpenModal = (depense = null) => {
    if (depense) {
      setEditingDepense(depense);
      setFormData({ description: depense.description, montant: depense.montant.toString(), type: depense.type, balle: depense.balle?._id || "", notes: depense.notes || "" });
    } else {
      setEditingDepense(null);
      setFormData({ description: "", montant: "", type: "autre", balle: "", notes: "" });
    }
    setShowModal(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { description: formData.description, montant: parseFloat(formData.montant), type: formData.type, balle: formData.balle || null, notes: formData.notes };
    const result = editingDepense ? await updateDepense(editingDepense._id, data) : await createDepense(data);
    if (result.success) { toast.success(editingDepense ? "Dépense modifiée" : "Dépense créée"); setShowModal(false); setEditingDepense(null); }
    else toast.error(result.message || "Erreur");
  };

  const handleDelete = async (id, description) => {
    if (!window.confirm(`Supprimer "${description}" ?`)) return;
    const r = await deleteDepense(id);
    r.success ? toast.success("Dépense supprimée") : toast.error(r.message);
  };

  const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";
  const fmtDate = (d) => format(new Date(d), "dd MMM yyyy", { locale: fr });

  const TYPES = ["transport", "emballage", "publicité", "salaire", "loyer", "autre"];

  if (loading.depenses && depenses.length === 0) return <div className="main-content"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Gestion des Dépenses</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}><FaPlus /> Nouvelle dépense</button>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" value={filterBalle} onChange={(e) => setFilterBalle(e.target.value)}>
          <option value="">Toutes les balles</option>
          <option value="global">Dépenses globales</option>
          {balles.map((b) => <option key={b._id} value={b._id}>{b.nom}</option>)}
        </select>
      </div>

      <div className="table-container">
        {depenses.length === 0 ? <p className="no-data">Aucune dépense</p> : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Balle</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d._id}>
                  <td>{fmtDate(d.dateDepense)}</td>
                  <td><strong>{d.description}</strong>{d.notes && <><br /><small className="text-secondary">{d.notes}</small></>}</td>
                  <td><span className="status-badge disponible">{d.type}</span></td>
                  <td>{d.balle ? <>{d.balle.nom}<br /><small className="text-secondary">{d.balle.numero}</small></> : <span className="text-secondary">Global</span>}</td>
                  <td><strong className="text-danger">{fmt(d.montant)}</strong></td>
                  <td>
                    <div className="flex gap-10">
                      <button className="btn btn-sm btn-icon btn-secondary" onClick={() => handleOpenModal(d)} title="Modifier"><FaEdit /></button>
                      <button className="btn btn-sm btn-icon btn-danger" onClick={() => handleDelete(d._id, d.description)} title="Supprimer"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingDepense ? "Modifier la dépense" : "Nouvelle dépense"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
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
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">{editingDepense ? "Modifier" : "Créer"}</button>
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
