import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBan,
  FaBoxOpen,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaPlus,
  FaRocket,
  FaTimes,
  FaTrash,
  FaTruck,
  FaUser,
} from "react-icons/fa";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";
import api from "../utils/api";

const DESTINATIONS = ["Antsirabe", "Local", "Autre"];

const fmtAR = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " AR";
const fmtDate = (d) => format(new Date(d), "dd MMM yyyy", { locale: fr });
const fmtDateCourt = (d) => format(new Date(d), "dd/MM/yyyy", { locale: fr });

const statutConfig = {
  en_preparation: { label: "En préparation", bg: "#fef3c7", color: "#92400e" },
  expédiée: { label: "Expédiée", bg: "#dbeafe", color: "#1e40af" },
  livrée: { label: "Livrée", bg: "#d1fae5", color: "#065f46" },
  annulée: { label: "Annulée", bg: "#fee2e2", color: "#991b1b" },
};

const statutVenteConfig = {
  en_attente: { label: "En attente", cls: "en_attente" },
  en_cours: { label: "En cours", cls: "en_cours" },
  livré: { label: "Livré", cls: "livre" },
  annulé: { label: "Annulé", cls: "annule" },
};

// ── Modal Créer / Modifier expédition ────────────────────────────────────────
const ExpeditionModal = ({ expedition, onClose }) => {
  const { createExpedition, updateExpedition } = useAppStore();
  const isEdit = !!expedition;
  const [form, setForm] = useState({
    nom: expedition?.nom || "",
    destination: expedition?.destination || "Antsirabe",
    dateExpedition: expedition?.dateExpedition
      ? format(new Date(expedition.dateExpedition), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    statut: expedition?.statut || "en_preparation",
    notes: expedition?.notes || "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, dateExpedition: new Date(form.dateExpedition) };
    const result = isEdit
      ? await updateExpedition(expedition._id, payload)
      : await createExpedition(payload);
    if (result.success) {
      toast.success(isEdit ? "Expédition modifiée" : "Expédition créée");
      onClose(true);
    } else {
      toast.error(result.message || "Erreur");
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose(false)}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: "calc(100% - 24px)" }}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            {isEdit ? "Modifier" : "Nouvelle"} expédition
          </h3>
          <button className="modal-close" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Nom de l'expédition *
                <small
                  style={{
                    color: "var(--secondary-color)",
                    fontWeight: 400,
                    marginLeft: 8,
                  }}
                >
                  Ex: Vague 112
                </small>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Vague 112"
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Destination *</label>
                <select
                  className="form-select"
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dateExpedition}
                  onChange={(e) => set("dateExpedition", e.target.value)}
                />
              </div>
            </div>
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select
                  className="form-select"
                  value={form.statut}
                  onChange={(e) => set("statut", e.target.value)}
                >
                  <option value="en_preparation">En préparation</option>
                  <option value="expédiée">Expédiée</option>
                  <option value="livrée">Livrée</option>
                  <option value="annulée">Annulée</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Remarques..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose(false)}
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                {isEdit ? "Modifier" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Modal Expédier ───────────────────────────────────────────────────────────
const ExpedierModal = ({ expedition, onClose }) => {
  const { expedierExpedition } = useAppStore();
  const [form, setForm] = useState({
    dateExpedition: format(new Date(), "yyyy-MM-dd"),
    fraisColis: expedition?.fraisColis?.toString() || "0",
    modeCommissionnaire: expedition?.modeCommissionnaire || "fixe",
    salaireCommissionnaire:
      expedition?.salaireCommissionnaire?.toString() || "0",
    pourcentageCommissionnaire:
      expedition?.pourcentageCommissionnaire?.toString() || "0",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const totalVentes = expedition?.totalVentes || 0;
  const fraisColis = parseFloat(form.fraisColis) || 0;
  const salaire =
    form.modeCommissionnaire === "fixe"
      ? parseFloat(form.salaireCommissionnaire) || 0
      : (totalVentes * (parseFloat(form.pourcentageCommissionnaire) || 0)) /
        100;
  const totalFrais = fraisColis + salaire;
  const netEstime = totalVentes - totalFrais;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      dateExpedition: new Date(form.dateExpedition),
      fraisColis: parseFloat(form.fraisColis) || 0,
      modeCommissionnaire: form.modeCommissionnaire,
      salaireCommissionnaire:
        form.modeCommissionnaire === "fixe"
          ? parseFloat(form.salaireCommissionnaire) || 0
          : 0,
      pourcentageCommissionnaire:
        parseFloat(form.pourcentageCommissionnaire) || 0,
    };
    const result = await expedierExpedition(expedition._id, payload);
    setLoading(false);
    if (result.success) {
      toast.success(`🚀 "${expedition.nom}" expédiée !`);
      onClose(true);
    } else {
      toast.error(result.message || "Erreur");
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose(false)}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: "calc(100% - 24px)" }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">🚀 Expédier — {expedition.nom}</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--secondary-color)",
                marginTop: 4,
              }}
            >
              {expedition.produits?.length || 0} produit(s) · CA :{" "}
              {fmtAR(totalVentes)}
            </p>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Date d'expédition *</label>
              <input
                type="date"
                className="form-input"
                value={form.dateExpedition}
                onChange={(e) => set("dateExpedition", e.target.value)}
                required
              />
            </div>
            <div
              style={{
                background: "var(--light-color)",
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                💰 Frais de l'expédition
              </p>
              <div className="form-group">
                <label className="form-label">
                  Frais colis / transport (AR)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={form.fraisColis}
                  onChange={(e) => set("fraisColis", e.target.value)}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mode commissionnaire</label>
                <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
                  {["fixe", "pourcentage"].map((m) => (
                    <label
                      key={m}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        value={m}
                        checked={form.modeCommissionnaire === m}
                        onChange={() => set("modeCommissionnaire", m)}
                      />
                      <span>
                        {m === "fixe" ? "Montant fixe" : "% sur ventes"}
                      </span>
                    </label>
                  ))}
                </div>
                {form.modeCommissionnaire === "fixe" ? (
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Salaire (AR)"
                    value={form.salaireCommissionnaire}
                    onChange={(e) =>
                      set("salaireCommissionnaire", e.target.value)
                    }
                    min="0"
                  />
                ) : (
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <input
                      type="number"
                      className="form-input"
                      placeholder="%"
                      value={form.pourcentageCommissionnaire}
                      onChange={(e) =>
                        set("pourcentageCommissionnaire", e.target.value)
                      }
                      min="0"
                      max="100"
                      step="0.1"
                      style={{ flex: 1 }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--secondary-color)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      = {fmtAR(salaire)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                {[
                  {
                    label: "CA expédié",
                    val: totalVentes,
                    color: "var(--success-color)",
                  },
                  {
                    label: "Frais colis",
                    val: fraisColis,
                    color: "var(--danger-color)",
                  },
                  {
                    label: "Commissionnaire",
                    val: salaire,
                    color: "var(--danger-color)",
                  },
                  {
                    label: "Total frais",
                    val: totalFrais,
                    color: "var(--danger-color)",
                    bold: true,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    style={{
                      background: "white",
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      style={{ color: "var(--secondary-color)", fontSize: 11 }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontWeight: r.bold ? 700 : 600,
                        color: r.color,
                        fontSize: 14,
                      }}
                    >
                      {fmtAR(r.val)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "2px solid #bbf7d0",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <span>Net estimé</span>
                <span
                  style={{
                    color:
                      netEstime >= 0
                        ? "var(--success-color)"
                        : "var(--danger-color)",
                    fontSize: 16,
                  }}
                >
                  {fmtAR(netEstime)}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ background: "#7c3aed" }}
              >
                {loading ? "Expédition..." : "🚀 Confirmer l'expédition"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Modal Ajouter Produits ───────────────────────────────────────────────────
const AjouterProduitsModal = ({ expedition, onClose }) => {
  const [mode, setMode] = useState("ventes");
  const [ventesDispos, setVentesDispos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [manuelRows, setManuelRows] = useState([
    { nomProduit: "", tailleProduit: "", prixVente: "" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(
        `/expeditions/ventes-disponibles?destination=${expedition.destination}`,
      )
      .then((r) => setVentesDispos(r.data.data))
      .catch(() => {});
  }, [expedition.destination]);

  const toggleSelect = (v) =>
    setSelected((p) =>
      p.find((s) => s._id === v._id)
        ? p.filter((s) => s._id !== v._id)
        : [...p, v],
    );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let produits = [];
      if (mode === "ventes") {
        produits = selected.flatMap((v) =>
          (v.produits?.length > 0
            ? v.produits
            : [
                {
                  nomProduit: v.nomProduit,
                  tailleProduit: v.tailleProduit,
                  prixVente: v.prixVente,
                },
              ]
          ).map((p) => ({
            vente: v._id,
            nomProduit: p.nomProduit,
            tailleProduit: p.tailleProduit,
            prixVente: p.prixVente,
          })),
        );
      } else {
        produits = manuelRows
          .filter((r) => r.nomProduit && r.prixVente)
          .map((r) => ({
            nomProduit: r.nomProduit,
            tailleProduit: r.tailleProduit,
            prixVente: parseFloat(r.prixVente),
          }));
      }
      if (!produits.length) {
        toast.error("Aucun produit à ajouter");
        setLoading(false);
        return;
      }
      await api.post(`/expeditions/${expedition._id}/produits`, { produits });
      toast.success(`${produits.length} produit(s) ajouté(s)`);
      onClose(true);
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose(false)}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: "calc(100% - 24px)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            Ajouter des produits — {expedition.nom}
          </h3>
          <button className="modal-close" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              ["ventes", "📦 Depuis ventes"],
              ["manuel", "✏️ Saisie manuelle"],
            ].map(([m, l]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`btn ${mode === m ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
              >
                {l}
              </button>
            ))}
          </div>
          {mode === "ventes" ? (
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--secondary-color)",
                  marginBottom: 10,
                }}
              >
                Ventes non expédiées — destination {expedition.destination}
              </p>
              {ventesDispos.length === 0 ? (
                <p className="no-data">
                  Aucune vente disponible pour {expedition.destination}
                </p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {ventesDispos.map((v) => (
                    <div
                      key={v._id}
                      onClick={() => toggleSelect(v)}
                      style={{
                        padding: "10px 12px",
                        marginBottom: 6,
                        borderRadius: 8,
                        cursor: "pointer",
                        border: selected.find((s) => s._id === v._id)
                          ? "2px solid var(--primary-color)"
                          : "1px solid var(--border-color)",
                        background: selected.find((s) => s._id === v._id)
                          ? "#eff6ff"
                          : "white",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>{v.nomClient}</strong>
                        <span
                          style={{
                            color: "var(--success-color)",
                            fontWeight: 700,
                          }}
                        >
                          {fmtAR(v.prixVente)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--secondary-color)",
                          marginTop: 2,
                        }}
                      >
                        {v.produits?.length > 1
                          ? `📦 ${v.produits.length} produits`
                          : v.nomProduit}
                        {v.tailleProduit ? ` · ${v.tailleProduit}` : ""} ·{" "}
                        {format(new Date(v.dateVente), "dd/MM/yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selected.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "#eff6ff",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#1d4ed8",
                  }}
                >
                  {selected.length} sélectionnée(s) — Total :{" "}
                  {fmtAR(selected.reduce((s, v) => s + v.prixVente, 0))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {manuelRows.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 120px 30px",
                    gap: 8,
                    marginBottom: 8,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>
                      Produit
                    </label>
                    <input
                      className="form-input"
                      style={{ padding: "8px 10px" }}
                      placeholder="Nom"
                      value={row.nomProduit}
                      onChange={(e) => {
                        const r = [...manuelRows];
                        r[idx].nomProduit = e.target.value;
                        setManuelRows(r);
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>
                      Taille
                    </label>
                    <input
                      className="form-input"
                      style={{ padding: "8px 10px" }}
                      placeholder="L"
                      value={row.tailleProduit}
                      onChange={(e) => {
                        const r = [...manuelRows];
                        r[idx].tailleProduit = e.target.value;
                        setManuelRows(r);
                      }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>
                      Prix (AR)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: "8px 10px" }}
                      placeholder="0"
                      value={row.prixVente}
                      onChange={(e) => {
                        const r = [...manuelRows];
                        r[idx].prixVente = e.target.value;
                        setManuelRows(r);
                      }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      setManuelRows((r) => r.filter((_, i) => i !== idx))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger-color)",
                      cursor: "pointer",
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setManuelRows((r) => [
                    ...r,
                    { nomProduit: "", tailleProduit: "", prixVente: "" },
                  ])
                }
              >
                <FaPlus /> Ajouter une ligne
              </button>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => onClose(false)}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Modal Annuler une vente depuis une expédition ────────────────────────────
const AnnulerVenteModal = ({ expeditionId, vente, onClose }) => {
  const [raison, setRaison] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!raison.trim()) {
      toast.error("Veuillez saisir une raison");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/expeditions/${expeditionId}/annuler-vente/${vente._id}`, {
        raisonAnnulation: raison,
      });
      toast.success(`Vente de ${vente.nomClient} annulée`);
      onClose(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose(false)}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, width: "calc(100% - 24px)" }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Annuler la vente</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--secondary-color)",
                marginTop: 4,
              }}
            >
              Client : <strong>{vente.nomClient}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            ⚠️ Cette action annulera la vente et la retirera de l'expédition.
            Les produits seront remis en stock.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Raison de l'annulation *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Client a annulé sa commande..."
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                required
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose(false)}
              >
                Retour
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? (
                  "Annulation..."
                ) : (
                  <>
                    <FaBan /> Confirmer l'annulation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Sous-section : Ventes d'une expédition ───────────────────────────────────
const VentesExpedition = ({ expedition, onRefresh }) => {
  const [ventes, setVentes] = useState([]);
  const [loadingVentes, setLoadingVentes] = useState(false);
  const [venteAnnuler, setVenteAnnuler] = useState(null);

  const fetchVentes = async () => {
    setLoadingVentes(true);
    try {
      const res = await api.get(`/expeditions/${expedition._id}`);
      setVentes(res.data.data.ventes || []);
    } catch {
      toast.error("Impossible de charger les ventes");
    } finally {
      setLoadingVentes(false);
    }
  };

  useEffect(() => {
    fetchVentes();
  }, [expedition._id]);

  const isEnPrepa = expedition.statut === "en_preparation";

  if (loadingVentes)
    return (
      <div style={{ padding: "20px 16px", textAlign: "center" }}>
        <div
          className="spinner"
          style={{ width: 24, height: 24, borderWidth: 3, margin: "0 auto" }}
        ></div>
      </div>
    );

  if (ventes.length === 0)
    return (
      <div
        style={{
          padding: "16px",
          textAlign: "center",
          color: "var(--secondary-color)",
          fontSize: 13,
        }}
      >
        Aucune vente rattachée à cette expédition
      </div>
    );

  return (
    <div>
      {/* En-tête section ventes */}
      <div
        style={{
          padding: "10px 16px",
          background: "#f0f9ff",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "#1d4ed8",
        }}
      >
        <FaUser style={{ fontSize: 11 }} />
        {ventes.length} vente{ventes.length > 1 ? "s" : ""} rattachée
        {ventes.length > 1 ? "s" : ""}
        <span
          style={{
            marginLeft: "auto",
            fontWeight: 400,
            color: "var(--secondary-color)",
          }}
        >
          Total :{" "}
          <strong style={{ color: "var(--success-color)" }}>
            {fmtAR(ventes.reduce((s, v) => s + (v.montantTotal || 0), 0))}
          </strong>
        </span>
      </div>

      {/* Liste des ventes — tableau desktop */}
      <div className="desktop-only" style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th>Client</th>
              <th>Produit(s)</th>
              <th>Date</th>
              <th>Livreur</th>
              <th>Prix vente</th>
              <th>Total</th>
              <th>Statut</th>
              {isEnPrepa && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {ventes.map((v) => {
              const statCfg = statutVenteConfig[v.statutLivraison] || {
                label: v.statutLivraison,
                cls: "en_attente",
              };
              const isGrouped = v.produits && v.produits.length > 1;
              return (
                <tr
                  key={v._id}
                  style={{ opacity: v.statutLivraison === "annulé" ? 0.55 : 1 }}
                >
                  <td>
                    <strong>{v.nomClient}</strong>
                    <br />
                    <small className="text-secondary">
                      {v.telephoneClient}
                    </small>
                  </td>
                  <td>
                    {isGrouped ? (
                      <span
                        style={{
                          color: "#1d4ed8",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <FaBoxOpen style={{ marginRight: 4 }} />
                        {v.produits.length} produits
                      </span>
                    ) : (
                      <span>
                        {v.nomProduit}
                        {v.tailleProduit && (
                          <small className="text-secondary">
                            {" "}
                            · {v.tailleProduit}
                          </small>
                        )}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{fmtDateCourt(v.dateVente)}</td>
                  <td style={{ fontSize: 13 }}>
                    {v.livreur ? (
                      <span>
                        <FaTruck style={{ marginRight: 4, fontSize: 11 }} />
                        {v.livreur.nom}
                      </span>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{fmtAR(v.prixVente)}</td>
                  <td>
                    <strong className="text-success">
                      {fmtAR(v.montantTotal)}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-badge ${statCfg.cls}`}>
                      {statCfg.label}
                    </span>
                  </td>
                  {isEnPrepa && (
                    <td>
                      {v.statutLivraison !== "annulé" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setVenteAnnuler(v)}
                          title="Annuler cette vente"
                        >
                          <FaBan /> Annuler
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Liste des ventes — cartes mobile */}
      <div className="mobile-only">
        {ventes.map((v) => {
          const statCfg = statutVenteConfig[v.statutLivraison] || {
            label: v.statutLivraison,
            cls: "en_attente",
          };
          const isGrouped = v.produits && v.produits.length > 1;
          return (
            <div
              key={v._id}
              style={{
                margin: "0 0 0 0",
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-color)",
                opacity: v.statutLivraison === "annulé" ? 0.55 : 1,
                background: "white",
              }}
            >
              {/* Ligne 1 : client + statut */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <div>
                  <strong style={{ fontSize: 14 }}>{v.nomClient}</strong>
                  <div
                    style={{ fontSize: 11, color: "var(--secondary-color)" }}
                  >
                    {v.telephoneClient} · {fmtDateCourt(v.dateVente)}
                  </div>
                </div>
                <span
                  className={`status-badge ${statCfg.cls}`}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {statCfg.label}
                </span>
              </div>
              {/* Ligne 2 : produit */}
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {isGrouped ? (
                  <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
                    <FaBoxOpen style={{ marginRight: 4 }} />
                    {v.produits.length} produits
                  </span>
                ) : (
                  <span>
                    {v.nomProduit}
                    {v.tailleProduit && (
                      <span className="text-secondary">
                        {" "}
                        · {v.tailleProduit}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* Ligne 3 : montants + livreur + action */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--secondary-color)" }}>
                  Vente :{" "}
                  <strong style={{ color: "var(--dark-color)" }}>
                    {fmtAR(v.prixVente)}
                  </strong>
                  <span style={{ margin: "0 6px" }}>·</span>
                  Total :{" "}
                  <strong style={{ color: "var(--success-color)" }}>
                    {fmtAR(v.montantTotal)}
                  </strong>
                  {v.livreur && (
                    <span>
                      {" "}
                      · <FaTruck style={{ fontSize: 10 }} /> {v.livreur.nom}
                    </span>
                  )}
                </div>
                {isEnPrepa && v.statutLivraison !== "annulé" && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setVenteAnnuler(v)}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    <FaBan /> Annuler
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal annulation */}
      {venteAnnuler && (
        <AnnulerVenteModal
          expeditionId={expedition._id}
          vente={venteAnnuler}
          onClose={(did) => {
            setVenteAnnuler(null);
            if (did) {
              fetchVentes();
              onRefresh();
            }
          }}
        />
      )}
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────────────────────
const Expeditions = () => {
  const { expeditions, fetchExpeditions, deleteExpedition, loading } =
    useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expedierModal, setExpedierModal] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [expanded, setExpanded] = useState(new Set()); // produits
  const [expandedVentes, setExpandedVentes] = useState(new Set()); // ventes
  const [filterStatut, setFilterStatut] = useState("");

  useEffect(() => {
    fetchExpeditions();
  }, []);

  const refresh = (did) => {
    if (did) fetchExpeditions({}, true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette expédition ?")) return;
    const r = await deleteExpedition(id);
    r.success ? toast.success("Supprimée") : toast.error(r.message);
  };

  const toggleExpand = (id) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleVentes = (id) =>
    setExpandedVentes((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtered = expeditions.filter(
    (e) => !filterStatut || e.statut === filterStatut,
  );
  const totalFraisReel = filtered
    .filter((e) => e.statut !== "en_preparation" && e.statut !== "annulée")
    .reduce((s, e) => s + (e.totalFrais || 0), 0);
  const totalCAExpédie = filtered.reduce((s, e) => s + (e.totalVentes || 0), 0);
  const totalProduits = filtered.reduce(
    (s, e) => s + (e.produits?.length || 0),
    0,
  );

  if (loading.expeditions && expeditions.length === 0) {
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Responsive helpers */}
      <style>{`
        @media (min-width: 769px) { .mobile-only { display: none !important; } }
        @media (max-width: 768px)  { .desktop-only { display: none !important; } }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expéditions</h1>
          <p className="text-secondary">Gestion des envois groupés</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          <FaPlus /> Nouvelle expédition
        </button>
      </div>

      {/* Stats */}
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="stat-card">
          <div className="stat-icon blue" style={{ fontSize: 20 }}>
            🚚
          </div>
          <div className="stat-info">
            <h3>{filtered.length}</h3>
            <p>Expéditions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FaBoxOpen />
          </div>
          <div className="stat-info">
            <h3>{totalProduits}</h3>
            <p>Produits</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red" style={{ fontSize: 16 }}>
            💸
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 18 }}>{fmtAR(totalFraisReel)}</h3>
            <p>Frais réels (expédiées)</p>
          </div>
        </div>
      </div>

      {/* Filtre */}
      <div className="filters-bar">
        <select
          className="form-select"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_preparation">En préparation</option>
          <option value="expédiée">Expédiée</option>
          <option value="livrée">Livrée</option>
          <option value="annulée">Annulée</option>
        </select>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="card">
          <p className="no-data">Aucune expédition</p>
        </div>
      ) : (
        filtered.map((exp) => {
          const cfg = statutConfig[exp.statut] || {};
          const isProdExpanded = expanded.has(exp._id);
          const isVentesExpanded = expandedVentes.has(exp._id);
          const isEnPrepa = exp.statut === "en_preparation";

          return (
            <div
              key={exp._id}
              style={{
                background: "white",
                borderRadius: 12,
                boxShadow: "var(--shadow)",
                marginBottom: 12,
                overflow: "hidden",
                borderLeft: isEnPrepa
                  ? "4px solid #f59e0b"
                  : "4px solid var(--primary-color)",
              }}
            >
              {/* ── Header expédition ── */}
              <div style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: 17 }}>{exp.nom}</strong>
                      <span
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#64748b",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                      >
                        🌍 {exp.destination}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--secondary-color)",
                        marginTop: 4,
                      }}
                    >
                      <FaCalendarAlt style={{ marginRight: 4 }} />
                      {fmtDate(exp.dateExpedition)}
                      {" · "}
                      {exp.produits?.length || 0} produit(s)
                      {exp.notes && <span> · 📝 {exp.notes}</span>}
                    </div>
                  </div>

                  {/* Montants */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 13,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          color: "var(--secondary-color)",
                          fontSize: 11,
                        }}
                      >
                        CA expédié
                      </div>
                      <strong style={{ color: "var(--success-color)" }}>
                        {fmtAR(exp.totalVentes)}
                      </strong>
                    </div>
                    {!isEnPrepa ? (
                      <>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              color: "var(--secondary-color)",
                              fontSize: 11,
                            }}
                          >
                            Frais colis
                          </div>
                          <strong>{fmtAR(exp.fraisColis)}</strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              color: "var(--secondary-color)",
                              fontSize: 11,
                            }}
                          >
                            Commission
                          </div>
                          <strong>{fmtAR(exp.salaireCommissionnaire)}</strong>
                          {exp.modeCommissionnaire === "pourcentage" && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--secondary-color)",
                              }}
                            >
                              {exp.pourcentageCommissionnaire}%
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              color: "var(--secondary-color)",
                              fontSize: 11,
                            }}
                          >
                            Total frais
                          </div>
                          <strong style={{ color: "var(--danger-color)" }}>
                            {fmtAR(exp.totalFrais)}
                          </strong>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              color: "var(--secondary-color)",
                              fontSize: 11,
                            }}
                          >
                            Net
                          </div>
                          <strong
                            style={{
                              color:
                                exp.totalVentes - exp.totalFrais >= 0
                                  ? "var(--success-color)"
                                  : "var(--danger-color)",
                            }}
                          >
                            {fmtAR(exp.totalVentes - exp.totalFrais)}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          background: "#fef3c7",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          color: "#92400e",
                          fontStyle: "italic",
                        }}
                      >
                        ⏳ Frais visibles après expédition
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexShrink: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Bouton ventes */}
                    <button
                      onClick={() => toggleVentes(exp._id)}
                      className="btn btn-sm btn-secondary"
                      title="Voir les ventes rattachées"
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <FaUser style={{ fontSize: 11 }} />
                      {isVentesExpanded ? (
                        <FaChevronUp style={{ fontSize: 10 }} />
                      ) : (
                        <FaChevronDown style={{ fontSize: 10 }} />
                      )}
                    </button>
                    {/* Bouton produits */}
                    {exp.produits?.length > 0 && (
                      <button
                        onClick={() => toggleExpand(exp._id)}
                        className="btn btn-sm btn-secondary"
                      >
                        {isProdExpanded ? "▲" : "▼"} ({exp.produits.length})
                      </button>
                    )}
                    {isEnPrepa && (
                      <button
                        onClick={() => setAddingTo(exp)}
                        className="btn btn-sm btn-secondary"
                        title="Ajouter produits"
                      >
                        <FaPlus />
                      </button>
                    )}
                    {isEnPrepa && (
                      <button
                        onClick={() => setExpedierModal(exp)}
                        className="btn btn-sm btn-primary"
                        style={{ background: "#7c3aed", gap: 6 }}
                        title="Marquer comme expédiée"
                      >
                        <FaRocket />{" "}
                        <span className="desktop-only">Expédier</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(exp);
                        setShowModal(true);
                      }}
                      className="btn btn-sm btn-icon btn-secondary"
                      title="Modifier"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(exp._id)}
                      className="btn btn-sm btn-icon btn-danger"
                      title="Supprimer"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Section ventes rattachées ── */}
              {isVentesExpanded && (
                <div style={{ borderTop: "1px solid var(--border-color)" }}>
                  <VentesExpedition
                    expedition={exp}
                    onRefresh={() => fetchExpeditions({}, true)}
                  />
                </div>
              )}

              {/* ── Détail produits ── */}
              {isProdExpanded && exp.produits && exp.produits.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    background: "#f8fafc",
                  }}
                >
                  {/* En-tête colonnes — desktop */}
                  <div
                    className="desktop-only"
                    style={{
                      padding: "8px 16px",
                      display: "grid",
                      gridTemplateColumns: "30px 1fr 80px 110px",
                      gap: 8,
                      fontWeight: 600,
                      fontSize: 11,
                      color: "var(--secondary-color)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <span>#</span>
                    <span>Produit</span>
                    <span>Taille</span>
                    <span style={{ textAlign: "right" }}>Prix</span>
                  </div>
                  {exp.produits.map((p, idx) => (
                    <div
                      key={p._id || idx}
                      style={{
                        padding: "8px 16px",
                        borderBottom:
                          idx < exp.produits.length - 1
                            ? "1px solid var(--border-color)"
                            : "none",
                        fontSize: 13,
                      }}
                    >
                      {/* Desktop */}
                      <div
                        className="desktop-only"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "30px 1fr 80px 110px",
                          gap: 8,
                        }}
                      >
                        <span style={{ color: "#94a3b8" }}>{idx + 1}</span>
                        <span>
                          <strong>{p.nomProduit}</strong>
                        </span>
                        <span style={{ color: "var(--secondary-color)" }}>
                          {p.tailleProduit || "—"}
                        </span>
                        <span
                          style={{
                            textAlign: "right",
                            color: "var(--success-color)",
                            fontWeight: 600,
                          }}
                        >
                          {fmtAR(p.prixVente)}
                        </span>
                      </div>
                      {/* Mobile */}
                      <div
                        className="mobile-only"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          <span
                            style={{
                              color: "#94a3b8",
                              marginRight: 6,
                              fontSize: 11,
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <strong>{p.nomProduit}</strong>
                          {p.tailleProduit && (
                            <span style={{ color: "var(--secondary-color)" }}>
                              {" "}
                              · {p.tailleProduit}
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            color: "var(--success-color)",
                            fontWeight: 600,
                          }}
                        >
                          {fmtAR(p.prixVente)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Pied de tableau */}
                  <div
                    style={{
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 24,
                      fontSize: 13,
                      borderTop: "2px solid var(--border-color)",
                      fontWeight: 700,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      CA :{" "}
                      <span style={{ color: "var(--success-color)" }}>
                        {fmtAR(exp.totalVentes)}
                      </span>
                    </span>
                    {!isEnPrepa && (
                      <span>
                        Frais :{" "}
                        <span style={{ color: "var(--danger-color)" }}>
                          {fmtAR(exp.totalFrais)}
                        </span>
                      </span>
                    )}
                    {!isEnPrepa && (
                      <span>
                        Net :{" "}
                        <span
                          style={{
                            color:
                              exp.totalVentes - exp.totalFrais >= 0
                                ? "var(--success-color)"
                                : "var(--danger-color)",
                          }}
                        >
                          {fmtAR(exp.totalVentes - exp.totalFrais)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {showModal && (
        <ExpeditionModal
          expedition={editing}
          onClose={(did) => {
            setShowModal(false);
            setEditing(null);
            refresh(did);
          }}
        />
      )}
      {expedierModal && (
        <ExpedierModal
          expedition={expedierModal}
          onClose={(did) => {
            setExpedierModal(null);
            refresh(did);
          }}
        />
      )}
      {addingTo && (
        <AjouterProduitsModal
          expedition={addingTo}
          onClose={(did) => {
            setAddingTo(null);
            refresh(did);
          }}
        />
      )}
    </div>
  );
};

export default Expeditions;
