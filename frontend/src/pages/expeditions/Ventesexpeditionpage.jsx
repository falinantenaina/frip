import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaBan,
  FaBoxOpen,
  FaCheck,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
  FaUnlink,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../../stores/appStore";
import api from "../../utils/api";

const fmtAR = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " AR";
const fmtDate = (d) => format(new Date(d), "dd MMM yyyy", { locale: fr });

const STATUT_CONFIG = {
  en_attente: {
    label: "En attente",
    bg: "#fef3c7",
    color: "#92400e",
    icon: "⏳",
  },
  en_cours: { label: "En cours", bg: "#dbeafe", color: "#1e40af", icon: "🚚" },
  livré: { label: "Livré", bg: "#d1fae5", color: "#065f46", icon: "✅" },
  annulé: { label: "Annulé", bg: "#fee2e2", color: "#991b1b", icon: "❌" },
};

const EXPEDITION_STATUT = {
  en_preparation: { label: "En préparation", bg: "#fef3c7", color: "#92400e" },
  expédiée: { label: "Expédiée", bg: "#dbeafe", color: "#1e40af" },
  livrée: { label: "Livrée", bg: "#d1fae5", color: "#065f46" },
  annulée: { label: "Annulée", bg: "#fee2e2", color: "#991b1b" },
};

// ── Composant : Badge statut ─────────────────────────────────────────────────
const StatutBadge = ({ statut }) => {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Formulaire inline de modification d'un produit ───────────────────────────
const EditProduitInline = ({ produit, venteId, onSave, onCancel }) => {
  const [form, setForm] = useState({
    nomProduit: produit.nomProduit || "",
    tailleProduit: produit.tailleProduit || "",
    prixVente: produit.prixVente?.toString() || "0",
    prixAchat: produit.prixAchat?.toString() || "0",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const benefice =
    (Number(form.prixVente) || 0) - (Number(form.prixAchat) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/ventes/${venteId}/produits/${produit._id}`, {
        nomProduit: form.nomProduit,
        tailleProduit: form.tailleProduit,
        prixVente: parseFloat(form.prixVente) || 0,
        prixAchat: parseFloat(form.prixAchat) || 0,
      });
      toast.success("Produit modifié ✅");
      onSave();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#eff6ff",
        border: "2px solid #2563eb",
        borderRadius: 10,
        padding: 14,
        marginTop: 4,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              display: "block",
              marginBottom: 4,
            }}
          >
            Nom du produit
          </label>
          <input
            type="text"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #bfdbfe",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
            value={form.nomProduit}
            onChange={(e) => set("nomProduit", e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              display: "block",
              marginBottom: 4,
            }}
          >
            Taille
          </label>
          <input
            type="text"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #bfdbfe",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
            value={form.tailleProduit}
            onChange={(e) => set("tailleProduit", e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              display: "block",
              marginBottom: 4,
            }}
          >
            Prix vente (AR)
          </label>
          <input
            type="number"
            min="0"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #bfdbfe",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
            value={form.prixVente}
            onChange={(e) => set("prixVente", e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              display: "block",
              marginBottom: 4,
            }}
          >
            Prix achat (AR)
          </label>
          <input
            type="number"
            min="0"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #bfdbfe",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
            value={form.prixAchat}
            onChange={(e) => set("prixAchat", e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: benefice >= 0 ? "#166534" : "#dc2626",
          }}
        >
          Bénéfice : {fmtAR(benefice)}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1.5px solid #cbd5e1",
              background: "white",
              cursor: "pointer",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: saving ? "#94a3b8" : "#2563eb",
              color: "white",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FaSave size={11} /> {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Formulaire édition vente (statut, livreur, lieu) ─────────────────────────
const EditVenteSection = ({ vente, livreurs, onSave, onCancel }) => {
  const [form, setForm] = useState({
    statutLivraison: vente.statutLivraison || "en_attente",
    livreur: vente.livreur?._id || vente.livreur || "",
    lieuLivraison: vente.lieuLivraison || "",
    fraisLivraison: vente.fraisLivraison?.toString() || "0",
    commentaires: vente.commentaires || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/ventes/${vente._id}`, {
        ...form,
        fraisLivraison: parseFloat(form.fraisLivraison) || 0,
        livreur: form.livreur || null,
      });
      toast.success("Vente modifiée ✅");
      onSave();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#f0fdf4",
        border: "2px solid #10b981",
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#065f46",
              display: "block",
              marginBottom: 4,
            }}
          >
            Statut livraison
          </label>
          <select
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #6ee7b7",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              background: "white",
            }}
            value={form.statutLivraison}
            onChange={(e) => set("statutLivraison", e.target.value)}
          >
            <option value="en_attente">⏳ En attente</option>
            <option value="en_cours">🚚 En cours</option>
            <option value="livré">✅ Livré</option>
          </select>
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#065f46",
              display: "block",
              marginBottom: 4,
            }}
          >
            Livreur
          </label>
          <select
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #6ee7b7",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              background: "white",
            }}
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
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#065f46",
              display: "block",
              marginBottom: 4,
            }}
          >
            Lieu de livraison
          </label>
          <input
            type="text"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #6ee7b7",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="Adresse..."
            value={form.lieuLivraison}
            onChange={(e) => set("lieuLivraison", e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#065f46",
              display: "block",
              marginBottom: 4,
            }}
          >
            Frais livraison (AR)
          </label>
          <input
            type="number"
            min="0"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1.5px solid #6ee7b7",
              borderRadius: 8,
              fontSize: 13,
              outline: "none",
            }}
            value={form.fraisLivraison}
            onChange={(e) => set("fraisLivraison", e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#065f46",
            display: "block",
            marginBottom: 4,
          }}
        >
          Commentaires
        </label>
        <textarea
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1.5px solid #6ee7b7",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
            resize: "vertical",
            minHeight: 60,
            boxSizing: "border-box",
          }}
          placeholder="Notes..."
          value={form.commentaires}
          onChange={(e) => set("commentaires", e.target.value)}
          rows={2}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1.5px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: saving ? "#94a3b8" : "#10b981",
            color: "white",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FaCheck size={11} /> {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
};

// ── Carte d'une vente ─────────────────────────────────────────────────────────
const VenteCard = ({
  vente,
  expeditionId,
  expeditionStatut,
  livreurs,
  onRefresh,
}) => {
  const [editingVente, setEditingVente] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null); // produit._id en cours d'édition
  const [expanded, setExpanded] = useState(false);
  const isAnnule = vente.statutLivraison === "annulé";
  const isEnPrepa = expeditionStatut === "en_preparation";

  const handleAnnulerVente = async () => {
    const raison = window.prompt(
      `Annuler la commande de ${vente.nomClient} ?\nRaison :`,
    );
    if (raison === null) return;
    try {
      await api.put(`/expeditions/${expeditionId}/annuler-vente/${vente._id}`, {
        raisonAnnulation: raison || "Annulée depuis expédition",
      });
      toast.success(`Commande de ${vente.nomClient} annulée`);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const handleDetacher = async () => {
    if (
      !window.confirm(
        `Retirer la vente de ${vente.nomClient} de cette expédition ?\nLa vente sera conservée.`,
      )
    )
      return;
    try {
      await api.put(`/expeditions/${expeditionId}/detacher-vente/${vente._id}`);
      toast.success(`Vente de ${vente.nomClient} retirée de l'expédition`);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const handleDeleteVente = async () => {
    if (
      !window.confirm(
        `Supprimer définitivement la vente de ${vente.nomClient} ?`,
      )
    )
      return;
    try {
      await api.delete(`/ventes/${vente._id}`);
      toast.success(`Vente de ${vente.nomClient} supprimée`);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const handleSupprimerProduit = async (produitId, nomProduit) => {
    if (vente.produits.length <= 1) {
      toast.error("Impossible de supprimer le seul produit d'une vente");
      return;
    }
    if (!window.confirm(`Retirer "${nomProduit}" de cette vente ?`)) return;
    try {
      await api.delete(`/ventes/${vente._id}/produits/${produitId}`);
      toast.success("Produit retiré");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    }
  };

  const produitsAffiches =
    vente.produits?.length > 0
      ? vente.produits
      : [
          {
            nomProduit: vente.nomProduit,
            tailleProduit: vente.tailleProduit,
            prixVente: vente.prixVente,
          },
        ];

  const multiProduits = produitsAffiches.length > 1;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        border: `1.5px solid ${isAnnule ? "#fecdd3" : "#e2e8f0"}`,
        overflow: "hidden",
        marginBottom: 12,
        opacity: isAnnule ? 0.65 : 1,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* En-tête vente */}
      <div
        style={{
          padding: "14px 16px",
          background: isAnnule ? "#fff5f5" : "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Ligne 1 : client + montant + statut */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 15, color: "#0f172a" }}>
                {vente.nomClient}
              </strong>
              {vente.telephoneClient && (
                <span style={{ fontSize: 13, color: "#94a3b8" }}>
                  {vente.telephoneClient}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              {vente.lieuLivraison && (
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  📍 {vente.lieuLivraison}
                </span>
              )}
              {vente.livreur && (
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  🚚 {vente.livreur.nom}
                </span>
              )}
              {vente.commentaires && (
                <span style={{ fontSize: 12, color: "#92400e" }}>
                  💬 {vente.commentaires}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <strong style={{ color: "#059669", fontSize: 16 }}>
              {fmtAR(vente.prixVente)}
            </strong>
            <StatutBadge statut={vente.statutLivraison} />
          </div>
        </div>

        {/* Ligne 2 : actions */}
        {!isAnnule && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setEditingVente(!editingVente);
                setEditingProduit(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 8,
                border: editingVente
                  ? "2px solid #10b981"
                  : "1.5px solid #e2e8f0",
                background: editingVente ? "#f0fdf4" : "white",
                color: editingVente ? "#065f46" : "#475569",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <FaEdit size={10} /> Modifier vente
            </button>
            {isEnPrepa && (
              <button
                onClick={handleDetacher}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1.5px solid #fed7aa",
                  background: "#fff7ed",
                  color: "#92400e",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <FaUnlink size={10} /> Retirer
              </button>
            )}
            <button
              onClick={handleAnnulerVente}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 8,
                border: "1.5px solid #fecdd3",
                background: "#fff1f2",
                color: "#be123c",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <FaBan size={10} /> Annuler
            </button>
            <button
              onClick={handleDeleteVente}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 8,
                border: "1.5px solid #fecdd3",
                background: "#fff1f2",
                color: "#be123c",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              <FaTrash size={10} />
            </button>
          </div>
        )}
        {isAnnule && (
          <button
            onClick={handleDeleteVente}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 8,
              border: "1.5px solid #fecdd3",
              background: "#fff1f2",
              color: "#be123c",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <FaTrash size={10} /> Supprimer
          </button>
        )}

        {/* Formulaire édition vente */}
        {editingVente && (
          <EditVenteSection
            vente={vente}
            livreurs={livreurs}
            onSave={() => {
              setEditingVente(false);
              onRefresh();
            }}
            onCancel={() => setEditingVente(false)}
          />
        )}
      </div>

      {/* Liste des produits */}
      <div>
        {/* En-tête si plusieurs produits */}
        {multiProduits && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "#f1f5f9",
              border: "none",
              borderBottom: "1px solid #e2e8f0",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FaBoxOpen size={12} style={{ color: "#2563eb" }} />
              {produitsAffiches.length} produits
            </span>
            <span style={{ fontSize: 11 }}>
              {expanded ? "▲ Masquer" : "▼ Afficher"}
            </span>
          </button>
        )}

        {/* Produits visibles */}
        {(!multiProduits || expanded) &&
          produitsAffiches.map((p, idx) => (
            <div key={p._id || idx}>
              <div
                style={{
                  padding: "10px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  borderBottom:
                    idx < produitsAffiches.length - 1
                      ? "1px solid #f1f5f9"
                      : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        color: "#cbd5e1",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <strong style={{ fontSize: 13, color: "#1e293b" }}>
                      {p.nomProduit}
                    </strong>
                    {p.tailleProduit && (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        · {p.tailleProduit}
                      </span>
                    )}
                  </div>
                  {p.prixAchat > 0 && (
                    <div
                      style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}
                    >
                      Achat : {fmtAR(p.prixAchat)} · Bén. :{" "}
                      <span
                        style={{
                          color:
                            p.prixVente - p.prixAchat >= 0
                              ? "#10b981"
                              : "#ef4444",
                          fontWeight: 600,
                        }}
                      >
                        {fmtAR((p.prixVente || 0) - (p.prixAchat || 0))}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}
                  >
                    {fmtAR(p.prixVente)}
                  </span>
                  {!isAnnule && p._id && (
                    <>
                      <button
                        onClick={() =>
                          setEditingProduit(
                            editingProduit === p._id ? null : p._id,
                          )
                        }
                        style={{
                          padding: "4px 10px",
                          borderRadius: 7,
                          border:
                            editingProduit === p._id
                              ? "2px solid #2563eb"
                              : "1.5px solid #e2e8f0",
                          background:
                            editingProduit === p._id ? "#eff6ff" : "white",
                          color:
                            editingProduit === p._id ? "#2563eb" : "#64748b",
                          cursor: "pointer",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <FaEdit size={9} /> Modifier
                      </button>
                      {vente.produits?.length > 1 && (
                        <button
                          onClick={() =>
                            handleSupprimerProduit(p._id, p.nomProduit)
                          }
                          style={{
                            padding: "4px 8px",
                            borderRadius: 7,
                            border: "1.5px solid #fecdd3",
                            background: "#fff1f2",
                            color: "#be123c",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          <FaTrash size={9} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Formulaire édition produit inline */}
              {editingProduit === p._id && (
                <div style={{ padding: "0 16px 12px" }}>
                  <EditProduitInline
                    produit={p}
                    venteId={vente._id}
                    onSave={() => {
                      setEditingProduit(null);
                      onRefresh();
                    }}
                    onCancel={() => setEditingProduit(null)}
                  />
                </div>
              )}
            </div>
          ))}

        {/* Frais livraison */}
        {vente.fraisLivraison > 0 && (
          <div
            style={{
              padding: "8px 16px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            <span>Frais livraison</span>
            <span>{fmtAR(vente.fraisLivraison)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Section rattacher une vente ──────────────────────────────────────────────
const RattacherVenteSection = ({ expeditionId, destination, onRefresh }) => {
  const [ventesDispos, setVentesDispos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) {
      api
        .get(`/expeditions/ventes-disponibles?destination=${destination}`)
        .then((r) => setVentesDispos(r.data.data))
        .catch(() => {});
    }
  }, [show, destination]);

  const handleRattacher = async () => {
    if (!selectedId) {
      toast.error("Sélectionner une vente");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/expeditions/${expeditionId}/rattacher-vente`, {
        venteId: selectedId,
      });
      toast.success("Vente rattachée ✅");
      setSelectedId("");
      setShow(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 10,
          border: "2px dashed #2563eb",
          background: "#eff6ff",
          color: "#2563eb",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 20,
        }}
      >
        <FaPlus size={12} /> Rattacher une vente
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#f0fdf4",
        border: "1.5px solid #bbf7d0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <p style={{ fontWeight: 700, color: "#065f46", fontSize: 14 }}>
          ➕ Rattacher une vente — {destination}
        </p>
        <button
          onClick={() => setShow(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
          }}
        >
          <FaTimes />
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          style={{
            flex: 1,
            minWidth: 200,
            padding: "10px 12px",
            border: "1.5px solid #6ee7b7",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
            background: "white",
          }}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
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
        <button
          onClick={handleRattacher}
          disabled={loading || !selectedId}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: loading || !selectedId ? "#94a3b8" : "#10b981",
            color: "white",
            cursor: loading || !selectedId ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "..." : "✔ Rattacher"}
        </button>
      </div>
      {ventesDispos.length === 0 && (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
          Aucune vente disponible pour {destination}
        </p>
      )}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────
const VentesExpeditionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { expeditions, fetchExpeditions } = useAppStore();

  const [data, setData] = useState(null);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trouver l'expédition dans le store pour infos basiques
  const expedition = expeditions.find((e) => e._id === id);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/expeditions/${id}`);
      setData(r.data.data);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!expedition) fetchExpeditions({}, true);
    loadDetail();
    api
      .get("/livreurs")
      .then((r) => setLivreurs(r.data.data))
      .catch(() => {});
  }, [id]);

  const handleRefresh = () => {
    loadDetail();
    fetchExpeditions({}, true);
  };

  const exp = data?.expedition || expedition;
  const ventes = data?.ventes || [];
  const activeVentes = ventes.filter((v) => v.statutLivraison !== "annulé");
  const caActif = activeVentes.reduce((s, v) => s + (v.prixVente || 0), 0);
  // Bénéfice brut des ventes actives (somme des totalBenefice de chaque vente)
  const beneficeVentesActif = activeVentes.reduce(
    (s, v) => s + (v.totalBenefice || 0),
    0,
  );
  // Bénéfice net = données calculées par le backend (totalBeneficeVentes - totalFrais)
  const beneficeNet =
    exp?.benefice !== undefined
      ? exp.benefice
      : beneficeVentesActif - (exp?.totalFrais || 0);
  const isEnPrepa = exp?.statut === "en_preparation";

  const expedStatutCfg = EXPEDITION_STATUT[exp?.statut] || {};

  return (
    <div className="main-content">
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => navigate("/expeditions")}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            flexShrink: 0,
            border: "1.5px solid #e2e8f0",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <FaArrowLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              👥 Ventes — {exp?.nom || "..."}
            </h1>
            {exp?.statut && (
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: expedStatutCfg.bg,
                  color: expedStatutCfg.color,
                }}
              >
                {expedStatutCfg.label}
              </span>
            )}
          </div>
          {exp && (
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              📍 {exp.destination} · 📅 {fmtDate(exp.dateExpedition)}
              {!loading && (
                <span> · {activeVentes.length} vente(s) active(s)</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      {!loading && exp && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Total Ventes",
              value: fmtAR(caActif),
              color: "#059669",
              icon: "💰",
            },
            {
              label: "Total Achats",
              value: fmtAR(caActif - beneficeNet),
              color: "#0284c7",
              icon: "📊",
            },
            {
              label: "Total frais",
              value: fmtAR(exp.totalFrais || 0),
              color: "#dc2626",
              icon: "📦",
              sub:
                exp.fraisColis || exp.salaireCommissionnaire
                  ? `Colis: ${fmtAR(exp.fraisColis)} · Commission: ${fmtAR(exp.salaireCommissionnaire)}`
                  : null,
            },
            {
              label: "Bénéfice net",
              value: fmtAR(beneficeNet),
              color: beneficeNet >= 0 ? "#059669" : "#dc2626",
              icon: "📈",
              highlight: true,
            },
            {
              label: "Ventes",
              value: `${activeVentes.length}/${ventes.length}`,
              color: "#2563eb",
              icon: "🛍️",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.highlight
                  ? beneficeNet >= 0
                    ? "#f0fdf4"
                    : "#fff1f2"
                  : "white",
                borderRadius: 12,
                border: `1.5px solid ${
                  item.highlight
                    ? beneficeNet >= 0
                      ? "#bbf7d0"
                      : "#fecdd3"
                    : "#e2e8f0"
                }`,
                padding: "12px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>
                {item.value}
              </div>
              {item.sub && (
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                  {item.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bouton rattacher (seulement en préparation) */}
      {isEnPrepa && exp && (
        <RattacherVenteSection
          expeditionId={id}
          destination={exp.destination}
          onRefresh={handleRefresh}
        />
      )}

      {/* Contenu */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : ventes.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1.5px solid #e2e8f0",
            padding: "48px 24px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>
            Aucune vente rattachée
          </div>
        </div>
      ) : (
        <div>
          {ventes.map((vente) => (
            <VenteCard
              key={vente._id}
              vente={vente}
              expeditionId={id}
              expeditionStatut={exp?.statut}
              livreurs={livreurs}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VentesExpeditionPage;
