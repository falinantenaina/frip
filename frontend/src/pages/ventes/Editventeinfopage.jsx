import { useEffect, useState } from "react";
import { FaArrowLeft, FaSave, FaTruck, FaUser } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../../stores/appStore";

const STATUTS = [
  { value: "en_attente", label: "⏳ En attente" },
  { value: "en_cours", label: "🚚 En cours" },
  { value: "livré", label: "✅ Livré" },
  { value: "annulé", label: "❌ Annulé" },
];

const DESTINATIONS = ["Local", "Antsirabe", "Autre"];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " Ar";

// ─── Styles partagés ──────────────────────────────────────────────────────────
const styles = {
  card: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    padding: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  inputBase: {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    background: "#f8fafc",
    transition: "all 0.2s",
    outline: "none",
    color: "#1e293b",
  },
  inputDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    background: "#f1f5f9",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  formGroup: { marginBottom: 16 },
};

const EditVenteInfoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ventes, fetchVentes, updateVente, livreurs, fetchLivreurs } =
    useAppStore();

  const vente = ventes.find((v) => v._id === id);
  const [formData, setFormData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!vente) fetchVentes();
    fetchLivreurs();
  }, []);

  useEffect(() => {
    if (vente && !formData) {
      setFormData({
        nomClient: vente.nomClient || "",
        telephoneClient: vente.telephoneClient || "",
        destinationClient: vente.destinationClient || "Local",
        livreur: vente.livreur?._id || "",
        fraisLivraison: vente.fraisLivraison?.toString() || "0",
        lieuLivraison: vente.lieuLivraison || "",
        statutLivraison: vente.statutLivraison || "en_attente",
        commentaires: vente.commentaires || "",
        raisonAnnulation: vente.raisonAnnulation || "",
      });
    }
  }, [vente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...formData,
      fraisLivraison: Number(formData.fraisLivraison) || 0,
      livreur: formData.livreur || null,
    };
    const result = await updateVente(id, payload);
    setSubmitting(false);
    if (result.success) {
      toast.success("Vente mise à jour ✅");
      navigate("/ventes");
    } else {
      toast.error(result.message || "Erreur lors de la modification");
    }
  };

  if (!vente || !formData) {
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const isAnnule = vente.statutLivraison === "annulé";
  const nouveauTotal =
    (vente.prixVente || 0) + (Number(formData?.fraisLivraison) || 0);

  return (
    <div className="main-content">
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/ventes")}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid #e2e8f0",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            transition: "all 0.2s",
          }}
          title="Retour"
        >
          <FaArrowLeft size={14} />
        </button>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            Modifier la vente
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 3 }}>
            Informations générales de la commande de{" "}
            <strong style={{ color: "#475569" }}>{vente.nomClient}</strong>
          </p>
        </div>
      </div>

      {/* Bannière vente annulée */}
      {isAnnule && (
        <div
          style={{
            background: "#fff1f2",
            border: "1.5px solid #fecdd3",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 20,
            color: "#be123c",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ⚠️ Cette vente est annulée. Certains champs sont en lecture seule.
        </div>
      )}

      {/* Récapitulatif totaux */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8faff, #f0fdf4)",
          border: "1px solid #bfdbfe",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 16,
        }}
      >
        {[
          {
            label: "Total produits",
            value: vente.prixVente || 0,
            color: "#1d4ed8",
          },
          {
            label: "Total achat",
            value: vente.totalAchat || 0,
            color: "#92400e",
          },
          {
            label: "Bénéfice",
            value: vente.totalBenefice || 0,
            color: (vente.totalBenefice || 0) >= 0 ? "#166534" : "#dc2626",
          },
          {
            label: "Frais livraison",
            value: vente.fraisLivraison || 0,
            color: "#64748b",
          },
          {
            label: "Montant total",
            value: vente.montantTotal || 0,
            color: "#1d4ed8",
            bold: true,
          },
          {
            label: "Nb. produits",
            value: vente.produits?.length || 1,
            color: "#374151",
            isCount: true,
          },
        ].map(({ label, value, color, bold, isCount }) => (
          <div key={label}>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: bold ? 17 : 15,
                fontWeight: bold ? 800 : 600,
                color,
              }}
            >
              {isCount ? value : fmt(value)}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          className="edit-vente-grid"
        >
          {/* Colonne 1 : Client */}
          <div style={styles.card}>
            <div style={styles.sectionTitle}>
              <FaUser size={11} /> Informations client
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom du client *</label>
              <input
                type="text"
                name="nomClient"
                style={{
                  ...styles.inputBase,
                  ...(isAnnule ? styles.inputDisabled : {}),
                }}
                required
                value={formData.nomClient}
                onChange={handleChange}
                disabled={isAnnule}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Téléphone *</label>
              <input
                type="tel"
                name="telephoneClient"
                style={{
                  ...styles.inputBase,
                  ...(isAnnule ? styles.inputDisabled : {}),
                }}
                required
                value={formData.telephoneClient}
                onChange={handleChange}
                disabled={isAnnule}
              />
            </div>
            <div style={{ marginBottom: 0 }}>
              <label style={styles.label}>Destination</label>
              <select
                name="destinationClient"
                style={{
                  ...styles.inputBase,
                  ...(isAnnule ? styles.inputDisabled : {}),
                }}
                value={formData.destinationClient}
                onChange={handleChange}
                disabled={isAnnule}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Colonne 2 : Livraison */}
          <div style={styles.card}>
            <div style={styles.sectionTitle}>
              <FaTruck size={11} /> Livraison
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Statut *</label>
              <select
                name="statutLivraison"
                style={styles.inputBase}
                value={formData.statutLivraison}
                onChange={handleChange}
              >
                {STATUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.statutLivraison === "annulé" && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Raison de l'annulation</label>
                <textarea
                  name="raisonAnnulation"
                  style={{
                    ...styles.inputBase,
                    resize: "vertical",
                    minHeight: 72,
                  }}
                  rows={2}
                  placeholder="Indiquer la raison..."
                  value={formData.raisonAnnulation}
                  onChange={handleChange}
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Livreur</label>
              <select
                name="livreur"
                style={styles.inputBase}
                value={formData.livreur}
                onChange={handleChange}
              >
                <option value="">Aucun livreur</option>
                {livreurs.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.nom}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Frais de livraison (Ar)</label>
              <input
                type="number"
                name="fraisLivraison"
                style={styles.inputBase}
                min="0"
                value={formData.fraisLivraison}
                onChange={handleChange}
              />
              {formData.fraisLivraison && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "7px 12px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#1d4ed8",
                  }}
                >
                  Nouveau montant total : <strong>{fmt(nouveauTotal)}</strong>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={styles.label}>Lieu de livraison</label>
              <input
                type="text"
                name="lieuLivraison"
                style={styles.inputBase}
                placeholder="Adresse..."
                value={formData.lieuLivraison}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Commentaires */}
        <div style={styles.card}>
          <label style={styles.label}>💬 Commentaires</label>
          <textarea
            name="commentaires"
            style={{ ...styles.inputBase, resize: "vertical", minHeight: 80 }}
            placeholder="Notes supplémentaires..."
            value={formData.commentaires}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Boutons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/ventes")}
            style={{
              padding: "11px 22px",
              borderRadius: 12,
              border: "1.5px solid #e2e8f0",
              background: "white",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "11px 24px",
              borderRadius: 12,
              border: "none",
              background: submitting
                ? "#94a3b8"
                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: submitting
                ? "none"
                : "0 4px 14px rgba(37,99,235,0.35)",
              transition: "all 0.2s",
            }}
          >
            {submitting ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    display: "inline-block",
                  }}
                />
                Enregistrement...
              </>
            ) : (
              <>
                <FaSave size={13} /> Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .edit-vente-grid {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 768px) {
          .edit-vente-grid {
            grid-template-columns: 1fr !important;
          }
        }

        input:focus, select:focus, textarea:focus {
          border-color: #2563eb !important;
          background: white !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
        }
      `}</style>
    </div>
  );
};

export default EditVenteInfoPage;
