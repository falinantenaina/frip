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
  FaSave,
  FaTimes,
  FaTrash,
  FaUnlink,
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
    fraisColis: expedition?.fraisColis?.toString() || "0",
    modeCommissionnaire: expedition?.modeCommissionnaire || "fixe",
    salaireCommissionnaire:
      expedition?.salaireCommissionnaire?.toString() || "0",
    pourcentageCommissionnaire:
      expedition?.pourcentageCommissionnaire?.toString() || "0",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const totalVentes = expedition?.totalVentes || 0;
  const fraisColis = parseFloat(form.fraisColis) || 0;
  const salaire =
    form.modeCommissionnaire === "fixe"
      ? parseFloat(form.salaireCommissionnaire) || 0
      : (totalVentes * (parseFloat(form.pourcentageCommissionnaire) || 0)) /
        100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      dateExpedition: new Date(form.dateExpedition),
      fraisColis: parseFloat(form.fraisColis) || 0,
      salaireCommissionnaire:
        form.modeCommissionnaire === "fixe"
          ? parseFloat(form.salaireCommissionnaire) || 0
          : 0,
      pourcentageCommissionnaire:
        parseFloat(form.pourcentageCommissionnaire) || 0,
    };
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
        style={{ maxWidth: 540, width: "calc(100% - 24px)" }}
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
            {/* Infos de base */}
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

            {/* Frais & Commission — toujours visibles en édition */}
            {isEdit && (
              <div
                style={{
                  background: "var(--light-color)",
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16,
                  border: "1px solid var(--border-color)",
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
                <div className="form-group" style={{ marginBottom: 0 }}>
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
                      placeholder="Salaire commissionnaire (AR)"
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
                {(fraisColis > 0 || salaire > 0) && totalVentes > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "8px 10px",
                      background: "white",
                      borderRadius: 6,
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "var(--secondary-color)" }}>
                      Bénéfice net estimé :
                    </span>
                    <strong
                      style={{
                        color:
                          totalVentes - fraisColis - salaire >= 0
                            ? "var(--success-color)"
                            : "var(--danger-color)",
                      }}
                    >
                      {fmtAR(totalVentes - fraisColis - salaire)}
                    </strong>
                  </div>
                )}
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
                <FaSave /> {isEdit ? "Enregistrer" : "Créer"}
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
                <span>Bénéfice net</span>
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

// ── Modal Modifier une vente depuis l'expédition ─────────────────────────────
const EditVenteExpeditionModal = ({ vente, livreurs, onClose }) => {
  const [form, setForm] = useState({
    statutLivraison: vente.statutLivraison || "en_attente",
    livreur: vente.livreur?._id || vente.livreur || "",
    lieuLivraison: vente.lieuLivraison || "",
    fraisLivraison: vente.fraisLivraison?.toString() || "0",
    commentaires: vente.commentaires || "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/ventes/${vente._id}`, {
        ...form,
        fraisLivraison: parseFloat(form.fraisLivraison) || 0,
        livreur: form.livreur || null,
      });
      toast.success("Vente modifiée ✅");
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={() => onClose(false)}
      style={{ zIndex: 10000 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: "calc(100% - 24px)" }}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">✏️ Modifier — {vente.nomClient}</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--secondary-color)",
                marginTop: 3,
              }}
            >
              {vente.produits?.length > 1
                ? `${vente.produits.length} produits`
                : vente.nomProduit}{" "}
              · {fmtAR(vente.prixVente)}
            </p>
          </div>
          <button className="modal-close" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Statut de livraison</label>
              <select
                className="form-select"
                value={form.statutLivraison}
                onChange={(e) => set("statutLivraison", e.target.value)}
              >
                <option value="en_attente">⏳ En attente</option>
                <option value="en_cours">🚚 En cours</option>
                <option value="livré">✅ Livré</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Livreur</label>
              <select
                className="form-select"
                value={form.livreur}
                onChange={(e) => set("livreur", e.target.value)}
              >
                <option value="">Aucun livreur</option>
                {livreurs.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Lieu de livraison</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Adresse..."
                  value={form.lieuLivraison}
                  onChange={(e) => set("lieuLivraison", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frais livraison (AR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={form.fraisLivraison}
                  onChange={(e) => set("fraisLivraison", e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Commentaires</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Notes..."
                value={form.commentaires}
                onChange={(e) => set("commentaires", e.target.value)}
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSave /> {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Modal Détail ventes d'une expédition ─────────────────────────────────────
const VentesExpeditionModal = ({ expedition, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [livreurs, setLivreurs] = useState([]);
  const [ventesDispos, setVentesDispos] = useState([]);
  const [editingVente, setEditingVente] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [selectedVenteId, setSelectedVenteId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const isEnPrepa = expedition.statut === "en_preparation";

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

  const loadVentesDispos = async () => {
    try {
      const r = await api.get(
        `/expeditions/ventes-disponibles?destination=${expedition.destination}`,
      );
      setVentesDispos(r.data.data);
    } catch {}
  };

  useEffect(() => {
    loadDetail();
    api
      .get("/livreurs")
      .then((r) => setLivreurs(r.data.data))
      .catch(() => {});
    loadVentesDispos();
  }, [expedition._id]);

  const handleRattacher = async () => {
    if (!selectedVenteId) {
      toast.error("Sélectionner une vente");
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/expeditions/${expedition._id}/rattacher-vente`, {
        venteId: selectedVenteId,
      });
      toast.success("Vente rattachée ✅");
      setSelectedVenteId("");
      setShowAddSection(false);
      loadDetail();
      loadVentesDispos();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

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
      loadVentesDispos();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const handleDetacher = async (venteId, nomClient) => {
    if (
      !window.confirm(
        `Retirer la vente de ${nomClient} de cette expédition ?\nLa vente sera conservée dans le système.`,
      )
    )
      return;
    try {
      await api.put(`/expeditions/${expedition._id}/detacher-vente/${venteId}`);
      toast.success(`Vente de ${nomClient} retirée de l'expédition`);
      loadDetail();
      loadVentesDispos();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const handleDeleteVente = async (venteId, nomClient) => {
    if (
      !window.confirm(
        `Supprimer définitivement la vente de ${nomClient} ?\nCette action est irréversible.`,
      )
    )
      return;
    try {
      await api.delete(`/ventes/${venteId}`);
      toast.success(`Vente de ${nomClient} supprimée`);
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

  const activeVentes =
    data?.ventes?.filter((v) => v.statutLivraison !== "annulé") || [];
  const caActif = activeVentes.reduce((s, v) => s + v.prixVente, 0);

  return createPortal(
    <>
      <div
        className="modal-overlay"
        onClick={() => onClose()}
        style={{ zIndex: 9999 }}
      >
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 820,
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
                {data && (
                  <span> · {activeVentes.length} vente(s) active(s)</span>
                )}
              </p>
            </div>
            <button className="modal-close" onClick={() => onClose()}>
              <FaTimes />
            </button>
          </div>
          <div className="modal-body">
            {/* ── Section rattacher une vente (seulement en préparation) ── */}
            {isEnPrepa && (
              <div style={{ marginBottom: 16 }}>
                {!showAddSection ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddSection(true)}
                  >
                    <FaPlus /> Rattacher une vente
                  </button>
                ) : (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 10,
                        color: "#065f46",
                      }}
                    >
                      ➕ Rattacher une vente disponible —{" "}
                      {expedition.destination}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-end",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <select
                          className="form-select"
                          value={selectedVenteId}
                          onChange={(e) => setSelectedVenteId(e.target.value)}
                        >
                          <option value="">Sélectionner une vente...</option>
                          {ventesDispos.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.nomClient} —{" "}
                              {v.produits?.length > 1
                                ? `${v.produits.length} produits`
                                : v.nomProduit}{" "}
                              — {fmtAR(v.prixVente)}
                            </option>
                          ))}
                        </select>
                        {ventesDispos.length === 0 && (
                          <small
                            style={{
                              color: "var(--secondary-color)",
                              marginTop: 4,
                              display: "block",
                            }}
                          >
                            Aucune vente disponible pour{" "}
                            {expedition.destination}
                          </small>
                        )}
                      </div>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handleRattacher}
                        disabled={actionLoading || !selectedVenteId}
                      >
                        {actionLoading ? "..." : "✔ Rattacher"}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setShowAddSection(false);
                          setSelectedVenteId("");
                        }}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Liste des ventes ── */}
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : !data?.ventes?.length ? (
              <p className="no-data">
                Aucune vente rattachée à cette expédition
              </p>
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
                  {/* En-tête vente */}
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
                      <strong style={{ fontSize: 15 }}>
                        {vente.nomClient}
                      </strong>
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
                      {vente.livreur && (
                        <span
                          style={{
                            color: "var(--secondary-color)",
                            fontSize: 12,
                            marginLeft: 8,
                          }}
                        >
                          🚚 {vente.livreur.nom}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
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
                        <>
                          {/* Modifier */}
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingVente(vente)}
                            title="Modifier la vente"
                            style={{ padding: "4px 10px" }}
                          >
                            <FaEdit size={11} /> Modifier
                          </button>
                          {/* Détacher */}
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() =>
                              handleDetacher(vente._id, vente.nomClient)
                            }
                            title="Retirer de l'expédition sans annuler"
                            style={{ padding: "4px 10px", color: "#92400e" }}
                          >
                            <FaUnlink size={11} /> Retirer
                          </button>
                          {/* Annuler */}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              handleAnnulerVente(vente._id, vente.nomClient)
                            }
                            style={{ padding: "4px 10px" }}
                          >
                            <FaBan size={11} /> Annuler
                          </button>
                        </>
                      )}
                      {/* Supprimer définitivement */}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          handleDeleteVente(vente._id, vente.nomClient)
                        }
                        title="Supprimer définitivement"
                        style={{ padding: "4px 8px" }}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Produits */}
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
                        style={{
                          color: "var(--success-color)",
                          fontWeight: 600,
                        }}
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
                  {vente.commentaires && (
                    <div
                      style={{
                        padding: "5px 14px",
                        background: "#fffbeb",
                        borderTop: "1px solid var(--border-color)",
                        fontSize: 12,
                        color: "#92400e",
                      }}
                    >
                      💬 {vente.commentaires}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Bilan */}
            {data?.ventes?.length > 0 && (
              <div
                style={{
                  background: "var(--light-color)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  borderTop: "2px solid var(--border-color)",
                  display: "flex",
                  gap: 20,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <span>
                  CA actif :{" "}
                  <span style={{ color: "var(--success-color)" }}>
                    {fmtAR(caActif)}
                  </span>
                </span>
                {data.expedition.totalFrais > 0 && (
                  <>
                    <span>
                      Frais :{" "}
                      <span style={{ color: "var(--danger-color)" }}>
                        {fmtAR(data.expedition.totalFrais)}
                      </span>
                    </span>
                    <span>
                      Bénéfice net :{" "}
                      <span
                        style={{
                          color:
                            caActif - data.expedition.totalFrais >= 0
                              ? "var(--success-color)"
                              : "var(--danger-color)",
                        }}
                      >
                        {fmtAR(caActif - data.expedition.totalFrais)}
                      </span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal modifier une vente (z-index supérieur) */}
      {editingVente && (
        <EditVenteExpeditionModal
          vente={editingVente}
          livreurs={livreurs}
          onClose={(did) => {
            setEditingVente(null);
            if (did) loadDetail();
          }}
        />
      )}
    </>,
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

  const filtered = expeditions.filter(
    (e) => !filterStatut || e.statut === filterStatut,
  );

  const totalFraisReel = filtered
    .filter((e) => e.statut !== "en_preparation" && e.statut !== "annulée")
    .reduce((s, e) => s + (e.totalFrais || 0), 0);
  const totalCAExpédie = filtered.reduce((s, e) => s + (e.totalVentes || 0), 0);
  const totalBeneficeNet = filtered
    .filter((e) => e.statut !== "en_preparation" && e.statut !== "annulée")
    .reduce((s, e) => s + (e.totalVentes - e.totalFrais), 0);
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

      {/* Stats globales */}
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
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
          <div className="stat-icon orange" style={{ fontSize: 16 }}>
            💰
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: 16 }}>{fmtAR(totalCAExpédie)}</h3>
            <p>CA total</p>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background:
                totalBeneficeNet >= 0
                  ? "var(--success-color)"
                  : "var(--danger-color)",
              fontSize: 16,
            }}
          >
            📈
          </div>
          <div className="stat-info">
            <h3
              style={{
                fontSize: 16,
                color:
                  totalBeneficeNet >= 0
                    ? "var(--success-color)"
                    : "var(--danger-color)",
              }}
            >
              {fmtAR(totalBeneficeNet)}
            </h3>
            <p>Bénéfice net (expédiées)</p>
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
          const beneficeNet = (exp.totalVentes || 0) - (exp.totalFrais || 0);

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

                  {/* Montants */}
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
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
                        {/* Bénéfice net mis en avant */}
                        <div
                          style={{
                            textAlign: "center",
                            background:
                              beneficeNet >= 0 ? "#f0fdf4" : "#fff1f2",
                            border: `1px solid ${beneficeNet >= 0 ? "#bbf7d0" : "#fecdd3"}`,
                            borderRadius: 8,
                            padding: "6px 12px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--secondary-color)",
                              fontSize: 11,
                            }}
                          >
                            Bénéfice net
                          </div>
                          <strong
                            style={{
                              color:
                                beneficeNet >= 0
                                  ? "var(--success-color)"
                                  : "var(--danger-color)",
                              fontSize: 15,
                            }}
                          >
                            {fmtAR(beneficeNet)}
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
                      title="Gérer les ventes"
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
                        title="Expédier"
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

              {/* Détail produits dépliable */}
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
                      gap: 20,
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
                      <>
                        <span>
                          Frais :{" "}
                          <span style={{ color: "var(--danger-color)" }}>
                            {fmtAR(exp.totalFrais)}
                          </span>
                        </span>
                        <span>
                          Bénéfice net :{" "}
                          <span
                            style={{
                              color:
                                beneficeNet >= 0
                                  ? "var(--success-color)"
                                  : "var(--danger-color)",
                            }}
                          >
                            {fmtAR(beneficeNet)}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modals */}
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
