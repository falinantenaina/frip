import {
  endOfDay,
  format,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBan,
  FaBoxOpen,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaPlus,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useBalleStore from "../stores/balleStore";
import useVenteStore from "../stores/venteStore";
import api from "../utils/api";

const AjouterProduitModal = ({ vente, onClose }) => {
  const { ajouterProduit, loading } = useVenteStore();
  const { balles, fetchBalles } = useBalleStore();
  const [produitsDisponibles, setProduitsDisponibles] = useState([]);
  const [venteMode, setVenteMode] = useState("avec_produit");
  const [formData, setFormData] = useState({
    balle: vente.balle?._id || vente.balle || "",
    produit: "",
    nomProduit: "",
    tailleProduit: "",
    prixVente: "",
  });

  useEffect(() => {
    fetchBalles();
    if (formData.balle) loadProduits(formData.balle);
  }, []);

  const loadProduits = async (balleId) => {
    try {
      const res = await api.get(`/produits/balle/${balleId}/disponibles`);
      setProduitsDisponibles(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "balle") loadProduits(value);
    if (name === "produit" && value) {
      const p = produitsDisponibles.find((p) => p._id === value);
      if (p) {
        setFormData((prev) => ({
          ...prev,
          produit: value,
          nomProduit: p.nom,
          tailleProduit: p.taille || "",
          prixVente: p.prixVente.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
    };
    if (venteMode === "avec_produit" && formData.produit) {
      payload.produit = formData.produit;
    }
    const result = await ajouterProduit(vente._id, payload);
    if (result.success) {
      toast.success(`Produit ajouté à la commande de ${vente.nomClient} ✅`);
      onClose();
    } else {
      toast.error(result.message || "Erreur lors de l'ajout");
    }
  };

  const nouveauTotal =
    (vente.prixVente || 0) + parseFloat(formData.prixVente || 0);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          width: "calc(100% - 24px)",
          margin: "12px",
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
        }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Ajouter un produit</h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--secondary-color)",
                marginTop: "4px",
              }}
            >
              Commande de <strong>{vente.nomClient}</strong> ·{" "}
              {vente.telephoneClient}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Mode</label>
            <div className="flex gap-20">
              <label className="flex gap-10" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  value="avec_produit"
                  checked={venteMode === "avec_produit"}
                  onChange={() => setVenteMode("avec_produit")}
                />
                <span>Produit existant</span>
              </label>
              <label className="flex gap-10" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  value="sans_produit"
                  checked={venteMode === "sans_produit"}
                  onChange={() => setVenteMode("sans_produit")}
                />
                <span>Saisie manuelle</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
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
                {balles.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.nom} – {b.numero}
                  </option>
                ))}
              </select>
            </div>

            {venteMode === "avec_produit" && (
              <div className="form-group">
                <label className="form-label">Produit *</label>
                <select
                  name="produit"
                  className="form-select"
                  value={formData.produit}
                  onChange={handleChange}
                  required
                  disabled={!formData.balle}
                >
                  <option value="">Sélectionner un produit</option>
                  {produitsDisponibles.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nom} · {p.taille || "–"} · {p.prixVente} AR
                    </option>
                  ))}
                </select>
                {formData.balle && produitsDisponibles.length === 0 && (
                  <small className="text-danger">
                    Aucun produit disponible
                  </small>
                )}
              </div>
            )}

            {venteMode === "sans_produit" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
                className="vente-form-row"
              >
                <div className="form-group">
                  <label className="form-label">Nom du produit *</label>
                  <input
                    type="text"
                    name="nomProduit"
                    className="form-input"
                    placeholder="Ex: Veste en cuir"
                    value={formData.nomProduit}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Taille</label>
                  <input
                    type="text"
                    name="tailleProduit"
                    className="form-input"
                    placeholder="Ex: L"
                    value={formData.tailleProduit}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

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

            {formData.prixVente && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#166534",
                  marginBottom: "8px",
                }}
              >
                Nouveau total commande ≈{" "}
                <strong>
                  {new Intl.NumberFormat("fr-FR").format(nouveauTotal)} AR
                </strong>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Ajout..." : "Ajouter le produit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ModifierProduitModal = ({ vente, produitEntry, onClose }) => {
  const { modifierProduit, loading } = useVenteStore();
  const { balles, fetchBalles } = useBalleStore();
  const [produitsDisponibles, setProduitsDisponibles] = useState([]);
  const [formData, setFormData] = useState({
    balle: vente.balle?._id || vente.balle || "",
    produit: produitEntry.produit?._id || produitEntry.produit || "",
    nomProduit: produitEntry.nomProduit,
    tailleProduit: produitEntry.tailleProduit || "",
    prixVente: produitEntry.prixVente.toString(),
  });

  useEffect(() => {
    fetchBalles();
    if (formData.balle) loadProduits(formData.balle);
  }, []);

  const loadProduits = async (balleId) => {
    try {
      const res = await api.get(`/produits/balle/${balleId}/disponibles`);
      const liste = res.data.data;
      if (produitEntry.produit) {
        const dejaDedans = liste.find(
          (p) => p._id === (produitEntry.produit?._id || produitEntry.produit),
        );
        if (!dejaDedans) {
          try {
            const r2 = await api.get(
              `/produits/${produitEntry.produit?._id || produitEntry.produit}`,
            );
            liste.unshift(r2.data.data);
          } catch {}
        }
      }
      setProduitsDisponibles(liste);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "balle") loadProduits(value);
    if (name === "produit" && value) {
      const p = produitsDisponibles.find((p) => p._id === value);
      if (p)
        setFormData((prev) => ({
          ...prev,
          produit: value,
          nomProduit: p.nom,
          tailleProduit: p.taille || "",
          prixVente: p.prixVente.toString(),
        }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
    };
    if (formData.produit) payload.produit = formData.produit;

    const result = await modifierProduit(vente._id, produitEntry._id, payload);
    if (result.success) {
      toast.success("Produit modifié avec succès ✅");
      onClose();
    } else {
      toast.error(result.message || "Erreur lors de la modification");
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "500px",
          width: "calc(100% - 24px)",
          margin: "12px",
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
        }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Modifier le produit</h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--secondary-color)",
                marginTop: "4px",
              }}
            >
              Commande de <strong>{vente.nomClient}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Balle</label>
              <select
                name="balle"
                className="form-select"
                value={formData.balle}
                onChange={handleChange}
              >
                <option value="">Sélectionner une balle</option>
                {balles.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.nom} – {b.numero}
                  </option>
                ))}
              </select>
            </div>
            {formData.balle && (
              <div className="form-group">
                <label className="form-label">
                  Changer de produit (optionnel)
                </label>
                <select
                  name="produit"
                  className="form-select"
                  value={formData.produit}
                  onChange={handleChange}
                  disabled={!formData.balle}
                >
                  <option value="">Garder le produit actuel</option>
                  {produitsDisponibles.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.nom} · {p.taille || "–"} · {p.prixVente} AR
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
              className="vente-form-row"
            >
              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input
                  type="text"
                  name="nomProduit"
                  className="form-input"
                  value={formData.nomProduit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Taille</label>
                <input
                  type="text"
                  name="tailleProduit"
                  className="form-input"
                  value={formData.tailleProduit}
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
                value={formData.prixVente}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Modification..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const VenteCard = ({
  vente,
  expanded,
  onToggleExpand,
  onOpenModalVente,
  onOpenModalModifier,
  onChangeStatut,
  onDelete,
  onAnnuler,
  onSupprimerProduit,
  formatCurrency,
  formatDate,
  getStatutClass,
  getStatutLabel,
  isGroupee,
}) => {
  const grouped = isGroupee(vente);
  const canAdd = vente.statutLivraison !== "annulé";

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "var(--shadow)",
        marginBottom: "12px",
        overflow: "hidden",
        borderLeft: grouped
          ? "4px solid #2563eb"
          : "4px solid var(--border-color)",
      }}
    >
      <div style={{ padding: "14px 16px" }}>
        {/* Ligne 1 : client + statut */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "8px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: "15px", color: "var(--dark-color)" }}>
                {vente.nomClient}
              </strong>
              {canAdd && (
                <button
                  onClick={() => onOpenModalVente(vente)}
                  title="Ajouter un produit"
                  style={{
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "10px",
                    flexShrink: 0,
                  }}
                >
                  <FaPlus />
                </button>
              )}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--secondary-color)",
                marginTop: "2px",
              }}
            >
              {vente.telephoneClient} · {formatDate(vente.dateVente)}
            </div>
          </div>
          <button
            className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
            onClick={() => onChangeStatut(vente._id, vente.statutLivraison)}
            style={{
              cursor:
                vente.statutLivraison === "annulé" ? "not-allowed" : "pointer",
              border: "none",
              flexShrink: 0,
              marginLeft: "8px",
              opacity: vente.statutLivraison === "annulé" ? 0.6 : 1,
            }}
            disabled={vente.statutLivraison === "annulé"}
          >
            {getStatutLabel(vente.statutLivraison)}
          </button>
        </div>

        {/* Ligne 2 : produit */}
        <div
          style={{
            fontSize: "13px",
            color: "var(--dark-color)",
            marginBottom: "8px",
          }}
        >
          {grouped ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#1d4ed8",
                fontWeight: 600,
              }}
            >
              <FaBoxOpen />
              {vente.produits.length} produits
            </span>
          ) : (
            <span>
              {vente.nomProduit}
              {vente.tailleProduit && (
                <span style={{ color: "var(--secondary-color)" }}>
                  {" "}
                  · {vente.tailleProduit}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Ligne 3 : montants */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "13px",
            marginBottom: "10px",
          }}
        >
          <span style={{ color: "var(--secondary-color)" }}>
            Vente :{" "}
            <strong style={{ color: "var(--dark-color)" }}>
              {formatCurrency(vente.prixVente)}
            </strong>
          </span>
          {vente.fraisLivraison > 0 && (
            <span style={{ color: "var(--secondary-color)" }}>
              Frais :{" "}
              <strong style={{ color: "var(--dark-color)" }}>
                {formatCurrency(vente.fraisLivraison)}
              </strong>
            </span>
          )}
          <span style={{ color: "var(--secondary-color)" }}>
            Total :{" "}
            <strong style={{ color: "var(--success-color)", fontSize: "14px" }}>
              {formatCurrency(vente.montantTotal)}
            </strong>
          </span>
        </div>

        {/* Ligne 4 : livreur + actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--secondary-color)" }}>
            {vente.livreur ? (
              <span>🚚 {vente.livreur.nom}</span>
            ) : (
              <span>Pas de livreur</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {grouped && (
              <button
                onClick={() => onToggleExpand(vente._id)}
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {expanded ? <FaChevronUp /> : <FaChevronDown />}
                {expanded ? "Masquer" : "Détails"}
              </button>
            )}
            <Link
              to={`/ventes/${vente._id}/edit`}
              className="btn btn-sm btn-icon btn-secondary"
              title="Modifier"
            >
              <FaEdit />
            </Link>
            {vente.statutLivraison !== "annulé" && (
              <button
                className="btn btn-sm btn-icon btn-danger"
                onClick={() => onAnnuler(vente._id)}
                title="Annuler"
              >
                <FaBan />
              </button>
            )}
            <button
              className="btn btn-sm btn-icon btn-danger"
              onClick={() => onDelete(vente._id, vente.nomClient)}
              title="Supprimer"
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      {/* Sous-produits (vente groupée) */}
      {grouped && expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            background: "#f8fafc",
          }}
        >
          {vente.produits.map((pe, idx) => (
            <div
              key={pe._id || idx}
              style={{
                padding: "10px 16px",
                borderBottom:
                  idx < vente.produits.length - 1
                    ? "1px solid var(--border-color)"
                    : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                  <span style={{ color: "#94a3b8", marginRight: "6px" }}>
                    #{idx + 1}
                  </span>
                  {pe.nomProduit}
                  {pe.tailleProduit && (
                    <span
                      style={{
                        color: "var(--secondary-color)",
                        fontWeight: 400,
                      }}
                    >
                      {" "}
                      · {pe.tailleProduit}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--secondary-color)",
                    marginTop: "2px",
                  }}
                >
                  {formatCurrency(pe.prixVente)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {vente.statutLivraison !== "annulé" && (
                  <button
                    className="btn btn-sm btn-icon btn-secondary"
                    onClick={() =>
                      onOpenModalModifier({ vente, produitEntry: pe })
                    }
                    title="Modifier"
                  >
                    <FaEdit />
                  </button>
                )}
                {vente.produits.length > 1 &&
                  vente.statutLivraison !== "annulé" && (
                    <button
                      className="btn btn-sm btn-icon btn-danger"
                      onClick={() =>
                        onSupprimerProduit(vente._id, pe._id, pe.nomProduit)
                      }
                      title="Retirer"
                    >
                      <FaTrash />
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Ventes = () => {
  const {
    ventes,
    loading,
    fetchVentes,
    deleteVente,
    annulerVente,
    updateVente,
    supprimerProduit,
  } = useVenteStore();

  const [filterStatut, setFilterStatut] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedVentes, setExpandedVentes] = useState(new Set());
  const [modalVente, setModalVente] = useState(null);
  const [modalModifier, setModalModifier] = useState(null);

  // ── Ref pour sauvegarder la position de scroll avant ouverture modale ──
  const scrollPositionRef = useRef(0);

  const openModal = (setter, value) => {
    scrollPositionRef.current = window.scrollY;
    setter(value);
  };

  const closeModal = (setter) => {
    setter(null);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  // ── Filtres de date ──────────────────────────────────────────────────────
  const [filterPeriode, setFilterPeriode] = useState("tous");
  const [filterDateSpecifique, setFilterDateSpecifique] = useState("");

  useEffect(() => {
    loadVentes();
  }, []);
  useEffect(() => {
    loadVentes();
  }, [filterStatut]);

  const loadVentes = () => {
    const filters = {};
    if (filterStatut) filters.statutLivraison = filterStatut;
    fetchVentes(filters);
  };

  const toggleExpand = (id) => {
    setExpandedVentes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (id, client) => {
    if (window.confirm(`Supprimer la vente de ${client} ?`)) {
      const r = await deleteVente(id);
      r.success
        ? toast.success("Vente supprimée")
        : toast.error(r.message || "Erreur");
    }
  };

  const handleAnnuler = async (id) => {
    const raison = prompt("Raison de l'annulation:");
    if (raison) {
      const r = await annulerVente(id, raison);
      r.success
        ? toast.success("Vente annulée")
        : toast.error(r.message || "Erreur");
    }
  };

  const handleChangeStatut = async (id, currentStatut) => {
    const map = {
      en_attente: "en_cours",
      en_cours: "livré",
      livré: "en_attente",
    };
    const nextStatut = map[currentStatut];
    if (!nextStatut) return;
    const r = await updateVente(id, { statutLivraison: nextStatut });
    r.success
      ? toast.success(`Statut → "${getStatutLabel(nextStatut)}"`)
      : toast.error(r.message || "Erreur");
  };

  const handleSupprimerProduit = async (
    venteId,
    produitEntryId,
    nomProduit,
  ) => {
    if (window.confirm(`Retirer "${nomProduit}" de cette commande ?`)) {
      const r = await supprimerProduit(venteId, produitEntryId);
      r.success
        ? toast.success("Produit retiré")
        : toast.error(r.message || "Erreur");
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " AR";
  const formatDate = (date) =>
    format(new Date(date), "dd/MM/yyyy", { locale: fr });
  const getStatutClass = (s) =>
    ({
      en_attente: "en_attente",
      en_cours: "en_cours",
      livre: "livre",
      livré: "livre",
      annule: "annule",
      annulé: "annule",
    })[s] || "en_attente";
  const getStatutLabel = (s) =>
    ({
      en_attente: "En attente",
      en_cours: "En cours",
      livre: "Livré",
      livré: "Livré",
      annule: "Annulé",
      annulé: "Annulé",
    })[s] || s;
  const isGroupee = (v) => v.produits && v.produits.length > 1;

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const filteredVentes = ventes.filter((vente) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchTexte =
        vente.nomClient.toLowerCase().includes(s) ||
        vente.telephoneClient.includes(s) ||
        vente.nomProduit?.toLowerCase().includes(s) ||
        (vente.produits || []).some((p) =>
          p.nomProduit?.toLowerCase().includes(s),
        );
      if (!matchTexte) return false;
    }
    const dateVente = new Date(vente.dateVente);
    if (filterPeriode === "jour") return isToday(dateVente);
    if (filterPeriode === "semaine")
      return isThisWeek(dateVente, { weekStartsOn: 1 });
    if (filterPeriode === "mois") return isThisMonth(dateVente);
    if (filterPeriode === "date" && filterDateSpecifique) {
      const debut = startOfDay(parseISO(filterDateSpecifique));
      const fin = endOfDay(parseISO(filterDateSpecifique));
      return dateVente >= debut && dateVente <= fin;
    }
    return true;
  });

  const totalFiltre = filteredVentes.reduce(
    (acc, v) => acc + (v.montantTotal || 0),
    0,
  );

  const getPeriodeLabel = () => {
    if (filterPeriode === "jour") return "Aujourd'hui";
    if (filterPeriode === "semaine") return "Cette semaine";
    if (filterPeriode === "mois") return "Ce mois";
    if (filterPeriode === "date" && filterDateSpecifique)
      return format(parseISO(filterDateSpecifique), "dd MMMM yyyy", {
        locale: fr,
      });
    return null;
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (loading)
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );

  const PeriodeBtn = ({ value, label, icon }) => (
    <button
      onClick={() => {
        setFilterPeriode(value);
        setFilterDateSpecifique("");
      }}
      style={{
        padding: isMobile ? "6px 10px" : "7px 14px",
        borderRadius: "6px",
        border:
          filterPeriode === value ? "none" : "1px solid var(--border-color)",
        background: filterPeriode === value ? "var(--primary-color)" : "white",
        color: filterPeriode === value ? "white" : "var(--secondary-color)",
        cursor: "pointer",
        fontSize: isMobile ? "12px" : "13px",
        fontWeight: filterPeriode === value ? 600 : 400,
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="main-content">
      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">Gestion des Ventes</h1>
        <Link to="/ventes/new" className="btn btn-primary">
          <FaPlus />
          {!isMobile && " Nouvelle vente"}
        </Link>
      </div>

      {/* ── Barre de filtres ── */}
      <div
        style={{
          background: "white",
          padding: isMobile ? "12px" : "16px 20px",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            className="form-select"
            style={{
              flex: "0 0 auto",
              minWidth: "130px",
              fontSize: isMobile ? "13px" : "14px",
            }}
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="livré">Livré</option>
            <option value="annulé">Annulé</option>
          </select>
          <input
            type="text"
            className="form-input"
            style={{
              flex: 1,
              minWidth: "120px",
              fontSize: isMobile ? "13px" : "14px",
            }}
            placeholder={
              isMobile
                ? "Rechercher..."
                : "Rechercher un client, téléphone, produit..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && loadVentes()}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <PeriodeBtn value="tous" label="Tout" />
          <PeriodeBtn
            value="jour"
            label="Auj."
            icon={<FaCalendarAlt style={{ fontSize: "10px" }} />}
          />
          <PeriodeBtn value="semaine" label="Semaine" />
          <PeriodeBtn value="mois" label="Mois" />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              flex: isMobile ? 1 : "0 0 auto",
            }}
          >
            <input
              type="date"
              className="form-input"
              style={{
                padding: "6px 10px",
                fontSize: "13px",
                width: isMobile ? "100%" : "150px",
                border:
                  filterPeriode === "date"
                    ? "2px solid var(--primary-color)"
                    : "1px solid var(--border-color)",
                borderRadius: "6px",
              }}
              value={filterDateSpecifique}
              onChange={(e) => {
                setFilterDateSpecifique(e.target.value);
                setFilterPeriode(e.target.value ? "date" : "tous");
              }}
            />
            {filterPeriode === "date" && filterDateSpecifique && (
              <button
                onClick={() => {
                  setFilterDateSpecifique("");
                  setFilterPeriode("tous");
                }}
                style={{
                  position: "absolute",
                  right: "6px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--secondary-color)",
                  fontSize: "12px",
                  padding: "2px",
                }}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bandeau résumé période ── */}
      {filterPeriode !== "tous" && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "13px", color: "#1d4ed8" }}>
            <strong>{getPeriodeLabel()}</strong> — {filteredVentes.length} vente
            {filteredVentes.length > 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: "13px", color: "#1d4ed8", fontWeight: 700 }}>
            Total : {formatCurrency(totalFiltre)}
          </span>
        </div>
      )}

      {/* ── Contenu ── */}
      {filteredVentes.length === 0 ? (
        <div className="table-container">
          <p className="no-data">Aucune vente trouvée pour cette période</p>
        </div>
      ) : isMobile ? (
        /* ── CARTES MOBILE ── */
        <div style={{ paddingBottom: "20px" }}>
          {filteredVentes.map((vente) => (
            <VenteCard
              key={vente._id}
              vente={vente}
              expanded={expandedVentes.has(vente._id)}
              onToggleExpand={toggleExpand}
              onOpenModalVente={(v) => openModal(setModalVente, v)}
              onOpenModalModifier={(data) => openModal(setModalModifier, data)}
              onChangeStatut={handleChangeStatut}
              onDelete={handleDelete}
              onAnnuler={handleAnnuler}
              onSupprimerProduit={handleSupprimerProduit}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatutClass={getStatutClass}
              getStatutLabel={getStatutLabel}
              isGroupee={isGroupee}
            />
          ))}
        </div>
      ) : (
        /* ── TABLEAU DESKTOP ── */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}></th>
                <th>Date</th>
                <th>Client</th>
                <th>Produit(s)</th>
                <th>Taille</th>
                <th>Prix vente</th>
                <th>Frais</th>
                <th>Total</th>
                <th>Livreur</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map((vente) => {
                const grouped = isGroupee(vente);
                const expanded = expandedVentes.has(vente._id);
                const canAdd = vente.statutLivraison !== "annulé";
                return (
                  <>
                    <tr
                      key={vente._id}
                      style={grouped ? { background: "#f0f9ff" } : {}}
                    >
                      <td style={{ textAlign: "center" }}>
                        {grouped && (
                          <button
                            onClick={() => toggleExpand(vente._id)}
                            style={{
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              cursor: "pointer",
                            }}
                          >
                            {expanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        )}
                      </td>
                      <td>{formatDate(vente.dateVente)}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div>
                            <strong>{vente.nomClient}</strong>
                            <br />
                            <small className="text-secondary">
                              {vente.telephoneClient}
                            </small>
                          </div>
                          {canAdd && (
                            <button
                              onClick={() => openModal(setModalVente, vente)}
                              title="Ajouter un produit"
                              style={{
                                flexShrink: 0,
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "26px",
                                height: "26px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                fontSize: "11px",
                              }}
                            >
                              <FaPlus />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        {grouped ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "#1d4ed8",
                              fontWeight: 600,
                              fontSize: "13px",
                            }}
                          >
                            <FaBoxOpen /> {vente.produits.length} produits
                          </span>
                        ) : (
                          vente.nomProduit
                        )}
                      </td>
                      <td>{!grouped ? vente.tailleProduit || "-" : "-"}</td>
                      <td>{formatCurrency(vente.prixVente)}</td>
                      <td>{formatCurrency(vente.fraisLivraison)}</td>
                      <td>
                        <strong className="text-success">
                          {formatCurrency(vente.montantTotal)}
                        </strong>
                      </td>
                      <td>
                        {vente.livreur ? (
                          <>
                            {vente.livreur.nom}
                            <br />
                            <small className="text-secondary">
                              {vente.livreur.telephone}
                            </small>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                          onClick={() =>
                            handleChangeStatut(vente._id, vente.statutLivraison)
                          }
                          style={{
                            cursor:
                              vente.statutLivraison === "annulé"
                                ? "not-allowed"
                                : "pointer",
                            border: "none",
                            opacity:
                              vente.statutLivraison === "annulé" ? 0.6 : 1,
                          }}
                          disabled={vente.statutLivraison === "annulé"}
                        >
                          {getStatutLabel(vente.statutLivraison)}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-10">
                          <Link
                            to={`/ventes/${vente._id}/edit`}
                            className="btn btn-sm btn-icon btn-secondary"
                            title="Modifier"
                          >
                            <FaEdit />
                          </Link>
                          {vente.statutLivraison !== "annulé" && (
                            <button
                              className="btn btn-sm btn-icon btn-danger"
                              onClick={() => handleAnnuler(vente._id)}
                              title="Annuler"
                            >
                              <FaBan />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() =>
                              handleDelete(vente._id, vente.nomClient)
                            }
                            title="Supprimer"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {grouped &&
                      expanded &&
                      vente.produits.map((pe, idx) => (
                        <tr
                          key={`${vente._id}-p${idx}`}
                          style={{
                            background: "#f8fafc",
                            borderLeft: "4px solid #bfdbfe",
                          }}
                        >
                          <td></td>
                          <td
                            style={{
                              color: "#94a3b8",
                              fontSize: "12px",
                              paddingLeft: "20px",
                            }}
                          >
                            #{idx + 1}
                          </td>
                          <td></td>
                          <td style={{ paddingLeft: "16px" }}>
                            <strong>{pe.nomProduit}</strong>
                          </td>
                          <td>{pe.tailleProduit || "-"}</td>
                          <td>{formatCurrency(pe.prixVente)}</td>
                          <td colSpan={4}></td>
                          <td>
                            <div className="flex gap-10">
                              {vente.statutLivraison !== "annulé" && (
                                <button
                                  className="btn btn-sm btn-icon btn-secondary"
                                  onClick={() =>
                                    openModal(setModalModifier, {
                                      vente,
                                      produitEntry: pe,
                                    })
                                  }
                                  title="Modifier ce produit"
                                >
                                  <FaEdit />
                                </button>
                              )}
                              {vente.produits.length > 1 &&
                                vente.statutLivraison !== "annulé" && (
                                  <button
                                    className="btn btn-sm btn-icon btn-danger"
                                    onClick={() =>
                                      handleSupprimerProduit(
                                        vente._id,
                                        pe._id,
                                        pe.nomProduit,
                                      )
                                    }
                                    title="Retirer"
                                  >
                                    <FaTrash />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalVente && (
        <AjouterProduitModal
          vente={modalVente}
          onClose={() => closeModal(setModalVente)}
        />
      )}
      {modalModifier && (
        <ModifierProduitModal
          vente={modalModifier.vente}
          produitEntry={modalModifier.produitEntry}
          onClose={() => closeModal(setModalModifier)}
        />
      )}
    </div>
  );
};

export default Ventes;
