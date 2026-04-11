import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBan,
  FaBoxOpen,
  FaCalendarAlt,
  FaEdit,
  FaPlus,
  FaRocket,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";
import api from "../utils/api";

const DESTINATIONS = ["Antsirabe", "Local", "Autre"];

const fmtAR = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " AR";
const fmtDate = (d) => format(new Date(d), "dd MMM yyyy", { locale: fr });

const statutConfig = {
  en_preparation: { label: "En préparation", bg: "#fef3c7", color: "#92400e" },
  expédiée: { label: "Expédiée", bg: "#dbeafe", color: "#1e40af" },
  livrée: { label: "Livrée", bg: "#d1fae5", color: "#065f46" },
  annulée: { label: "Annulée", bg: "#fee2e2", color: "#991b1b" },
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
                  Ex: Vague 112, Produit Noël
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

// ── Modal Expédier (saisir frais au moment d'expédier) ───────────────────────
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

            {/* Bilan */}
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

// ── Page principale ──────────────────────────────────────────────────────────
// ── Modal Détail ventes d'une expédition ─────────────────────────────────────
const VentesExpeditionModal = ({ expedition, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/expeditions/${expedition._id}`);
      setData(r.data.data);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [expedition._id]);

  const handleAnnulerVente = async (venteId, nomClient) => {
    const raison = window.prompt(
      `Annuler la commande de ${nomClient} ?\nRaison :`,
    );
    if (raison === null) return;
    try {
      await api.put(`/expeditions/${expedition._id}/annuler-vente/${venteId}`, {
        raisonAnnulation: raison || "Annulée depuis expédition",
      });
      toast.success(`Commande de ${nomClient} annulée`);
      loadDetail();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const getStatutClass = (s) =>
    ({
      en_attente: "en_attente",
      en_cours: "en_cours",
      livré: "livre",
      annulé: "annule",
    })[s] || "en_attente";
  const getStatutLabel = (s) =>
    ({
      en_attente: "En attente",
      en_cours: "En cours",
      livré: "Livré",
      annulé: "Annulé",
    })[s] || s;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose()}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 780,
          width: "calc(100% - 24px)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">👥 Ventes — {expedition.nom}</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--secondary-color)",
                marginTop: 4,
              }}
            >
              {expedition.destination} · {fmtDate(expedition.dateExpedition)}
            </p>
          </div>
          <button className="modal-close" onClick={() => onClose()}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : !data?.ventes?.length ? (
            <p className="no-data">Aucune vente rattachée à cette expédition</p>
          ) : (
            data.ventes.map((vente) => (
              <div
                key={vente._id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  marginBottom: 12,
                  overflow: "hidden",
                  opacity: vente.statutLivraison === "annulé" ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    background: "var(--light-color)",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15 }}>{vente.nomClient}</strong>
                    <span
                      style={{
                        color: "var(--secondary-color)",
                        fontSize: 13,
                        marginLeft: 10,
                      }}
                    >
                      {vente.telephoneClient}
                    </span>
                    {vente.lieuLivraison && (
                      <span
                        style={{
                          color: "var(--secondary-color)",
                          fontSize: 12,
                          marginLeft: 8,
                        }}
                      >
                        📍 {vente.lieuLivraison}
                      </span>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <strong
                      style={{ color: "var(--success-color)", fontSize: 15 }}
                    >
                      {fmtAR(vente.prixVente)}
                    </strong>
                    <span
                      className={`status-badge ${getStatutClass(vente.statutLivraison)}`}
                    >
                      {getStatutLabel(vente.statutLivraison)}
                    </span>
                    {vente.statutLivraison !== "annulé" && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          handleAnnulerVente(vente._id, vente.nomClient)
                        }
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
                {(vente.produits?.length > 0
                  ? vente.produits
                  : [
                      {
                        nomProduit: vente.nomProduit,
                        tailleProduit: vente.tailleProduit,
                        prixVente: vente.prixVente,
                      },
                    ]
                ).map((p, i) => (
                  <div
                    key={p._id || i}
                    style={{
                      padding: "8px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--border-color)",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <span style={{ color: "#94a3b8", marginRight: 8 }}>
                        #{i + 1}
                      </span>
                      <strong>{p.nomProduit}</strong>
                      {p.tailleProduit && (
                        <span
                          style={{
                            color: "var(--secondary-color)",
                            marginLeft: 6,
                          }}
                        >
                          · {p.tailleProduit}
                        </span>
                      )}
                    </span>
                    <span
                      style={{ color: "var(--success-color)", fontWeight: 600 }}
                    >
                      {fmtAR(p.prixVente)}
                    </span>
                  </div>
                ))}
                {vente.fraisLivraison > 0 && (
                  <div
                    style={{
                      padding: "6px 14px",
                      background: "#f8fafc",
                      borderTop: "1px solid var(--border-color)",
                      fontSize: 12,
                      color: "var(--secondary-color)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Frais livraison</span>
                    <span>{fmtAR(vente.fraisLivraison)}</span>
                  </div>
                )}
              </div>
            ))
          )}
          {data?.ventes?.length > 0 && (
            <div
              style={{
                background: "var(--light-color)",
                borderRadius: 8,
                padding: "12px 14px",
                borderTop: "2px solid var(--border-color)",
                display: "flex",
                gap: 24,
                justifyContent: "flex-end",
                flexWrap: "wrap",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span>
                CA actif :{" "}
                <span style={{ color: "var(--success-color)" }}>
                  {fmtAR(
                    data.ventes
                      .filter((v) => v.statutLivraison !== "annulé")
                      .reduce((s, v) => s + v.prixVente, 0),
                  )}
                </span>
              </span>
              <span>
                Total expédition :{" "}
                <span style={{ color: "var(--primary-color)" }}>
                  {fmtAR(data.expedition.totalVentes)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
  const [ventesModal, setVentesModal] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [expandedVentes, setExpandedVentes] = useState(new Set());
  const [ventesMap, setVentesMap] = useState({});
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

  // Charger les ventes d'une expédition au clic sur "Ventes"
  const toggleVentesExpedition = async (expId) => {
    setExpandedVentes((p) => {
      const n = new Set(p);
      if (n.has(expId)) {
        n.delete(expId);
        return n;
      }
      n.add(expId);
      return n;
    });
    if (!ventesMap[expId]) {
      try {
        const res = await api.get(`/expeditions/${expId}`);
        setVentesMap((p) => ({ ...p, [expId]: res.data.data.ventes }));
      } catch {
        toast.error("Erreur chargement ventes");
      }
    }
  };

  const handleAnnulerVenteExpedition = async (expId, venteId, nomClient) => {
    const raison = prompt(`Annuler la vente de ${nomClient} ? Raison :`);
    if (!raison) return;
    try {
      const res = await api.put(
        `/expeditions/${expId}/annuler-vente/${venteId}`,
        { raisonAnnulation: raison },
      );
      if (res.data.success) {
        toast.success("Vente annulée et retirée de l'expédition ✅");
        setVentesMap((p) => ({ ...p, [expId]: res.data.data.ventes }));
        fetchExpeditions({}, true);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

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
          const isExpanded = expanded.has(exp._id);
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
              {/* Header */}
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
                  <div style={{ flex: 1 }}>
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
                      {fmtDate(exp.dateExpedition)} ·{" "}
                      {exp.produits?.length || 0} produit(s)
                      {exp.notes && <span> · 📝 {exp.notes}</span>}
                    </div>
                  </div>

                  {/* Montants — masqués si en préparation */}
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
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {exp.produits?.length > 0 && (
                      <button
                        onClick={() => toggleExpand(exp._id)}
                        className="btn btn-sm btn-secondary"
                      >
                        {isExpanded ? "▲" : "▼"} ({exp.produits.length})
                      </button>
                    )}
                    <button
                      onClick={() => setVentesModal(exp)}
                      className="btn btn-sm btn-secondary"
                      style={{ color: "#1d4ed8", fontWeight: 600 }}
                      title="Voir les ventes rattachées"
                    >
                      👥 Ventes
                    </button>
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
                        <FaRocket /> Expédier
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

              {/* Détail produits */}
              {isExpanded && exp.produits && exp.produits.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    background: "#f8fafc",
                  }}
                >
                  <div
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
                        display: "grid",
                        gridTemplateColumns: "30px 1fr 80px 110px",
                        gap: 8,
                        fontSize: 13,
                        borderBottom:
                          idx < exp.produits.length - 1
                            ? "1px solid var(--border-color)"
                            : "none",
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
                  ))}
                  <div
                    style={{
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 24,
                      fontSize: 13,
                      borderTop: "2px solid var(--border-color)",
                      fontWeight: 700,
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

              {/* Liste des ventes rattachées */}
              {expandedVentes.has(exp._id) && (
                <div
                  style={{
                    borderTop: "2px solid #bfdbfe",
                    background: "#f0f9ff",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#1d4ed8",
                      borderBottom: "1px solid #bfdbfe",
                    }}
                  >
                    📋 Ventes rattachées à cette expédition
                  </div>
                  {!ventesMap[exp._id] ? (
                    <div
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "var(--secondary-color)",
                      }}
                    >
                      <div
                        className="spinner"
                        style={{ margin: "0 auto" }}
                      ></div>
                    </div>
                  ) : ventesMap[exp._id].length === 0 ? (
                    <p
                      style={{
                        padding: 16,
                        color: "var(--secondary-color)",
                        fontSize: 13,
                      }}
                    >
                      Aucune vente rattachée
                    </p>
                  ) : (
                    ventesMap[exp._id].map((v) => (
                      <div
                        key={v._id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #bfdbfe",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          {/* Client */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <strong style={{ fontSize: 14 }}>
                              {v.nomClient}
                            </strong>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--secondary-color)",
                              }}
                            >
                              {v.telephoneClient}
                            </span>
                            <span
                              style={{
                                padding: "1px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background:
                                  v.statutLivraison === "annulé"
                                    ? "#fee2e2"
                                    : v.statutLivraison === "livré"
                                      ? "#d1fae5"
                                      : "#fef3c7",
                                color:
                                  v.statutLivraison === "annulé"
                                    ? "#991b1b"
                                    : v.statutLivraison === "livré"
                                      ? "#065f46"
                                      : "#92400e",
                              }}
                            >
                              {v.statutLivraison}
                            </span>
                          </div>
                          {/* Produits */}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--secondary-color)",
                              marginBottom: 2,
                            }}
                          >
                            {v.produits && v.produits.length > 1 ? (
                              v.produits.map((p, i) => (
                                <span key={p._id} style={{ marginRight: 12 }}>
                                  {i + 1}. {p.nomProduit}
                                  {p.tailleProduit
                                    ? ` (${p.tailleProduit})`
                                    : ""}{" "}
                                  — {fmtAR(p.prixVente)}
                                </span>
                              ))
                            ) : (
                              <span>
                                {v.nomProduit}
                                {v.tailleProduit ? ` (${v.tailleProduit})` : ""}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "var(--secondary-color)" }}>
                              Lieu : {v.lieuLivraison}
                            </span>
                            {v.livreur && (
                              <span
                                style={{
                                  color: "var(--secondary-color)",
                                  marginLeft: 12,
                                }}
                              >
                                🚚 {v.livreur.nom}
                              </span>
                            )}
                            <span
                              style={{
                                marginLeft: 12,
                                fontWeight: 700,
                                color: "var(--success-color)",
                              }}
                            >
                              {fmtAR(v.prixVente)}
                            </span>
                          </div>
                        </div>
                        {/* Actions vente */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {v.statutLivraison !== "annulé" && (
                            <button
                              onClick={() =>
                                handleAnnulerVenteExpedition(
                                  exp._id,
                                  v._id,
                                  v.nomClient,
                                )
                              }
                              className="btn btn-sm btn-danger"
                              title="Annuler cette vente et la retirer de l'expédition"
                              style={{ fontSize: 12 }}
                            >
                              <FaBan /> Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {ventesMap[exp._id] && ventesMap[exp._id].length > 0 && (
                    <div
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        color: "#1d4ed8",
                        fontWeight: 600,
                        borderTop: "1px solid #bfdbfe",
                      }}
                    >
                      {
                        ventesMap[exp._id].filter(
                          (v) => v.statutLivraison !== "annulé",
                        ).length
                      }{" "}
                      vente(s) active(s) · Total CA :{" "}
                      {fmtAR(
                        ventesMap[exp._id]
                          .filter((v) => v.statutLivraison !== "annulé")
                          .reduce((s, v) => s + v.prixVente, 0),
                      )}
                    </div>
                  )}
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
      {ventesModal && (
        <VentesExpeditionModal
          expedition={ventesModal}
          onClose={() => {
            setVentesModal(null);
            fetchExpeditions({}, true);
          }}
        />
      )}
    </div>
  );
};

export default Expeditions;
