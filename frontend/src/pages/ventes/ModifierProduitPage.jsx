import { useEffect, useState } from "react";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../../stores/appStore";
import api from "../../utils/api";

const CATEGORIES = [
  { value: "chaussures", label: "👟 Chaussures" },
  { value: "robes", label: "👗 Robes / Vêtements" },
  { value: "autres", label: "📦 Autres" },
];

const CAT_COLORS = {
  chaussures: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  robes: { bg: "#fce7f3", color: "#be185d", border: "#f9a8d4" },
  autres: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
};

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";

/**
 * Modifier un produit dans une vente.
 * Route : /ventes/:venteId/produits/:produitEntryId/edit
 */
const ModifierProduitPage = () => {
  const { venteId, produitEntryId } = useParams();
  const navigate = useNavigate();
  const { ventes, fetchVentes, modifierProduit, balles, fetchBalles } =
    useAppStore();

  const [produitsDisponibles, setProduitsDisponibles] = useState([]);
  const [formData, setFormData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const vente = ventes.find((v) => v._id === venteId);
  const produitEntry = vente?.produits?.find((p) => p._id === produitEntryId);

  useEffect(() => {
    if (!vente) fetchVentes();
    fetchBalles();
  }, []);

  useEffect(() => {
    if (produitEntry && !formData) {
      const balleId = vente?.balle?._id || vente?.balle || "";
      setFormData({
        balle: balleId,
        produitRef: produitEntry.produit?._id || produitEntry.produit || "",
        nomProduit: produitEntry.nomProduit,
        tailleProduit: produitEntry.tailleProduit || "",
        prixVente: produitEntry.prixVente.toString(),
        prixAchat: (produitEntry.prixAchat || 0).toString(),
        categorie: produitEntry.categorie || "autres",
      });
      if (balleId)
        loadProduits(
          balleId,
          produitEntry.produit?._id || produitEntry.produit,
        );
    }
  }, [produitEntry]);

  const loadProduits = async (balleId, produitActuelId) => {
    try {
      const res = await api.get(`/produits/balle/${balleId}/disponibles`);
      const liste = [...res.data.data];
      // Inclure le produit actuel même s'il est "vendu"
      if (produitActuelId && !liste.find((p) => p._id === produitActuelId)) {
        try {
          const r2 = await api.get(`/produits/${produitActuelId}`);
          liste.unshift(r2.data.data);
        } catch {}
      }
      setProduitsDisponibles(liste);
    } catch (e) {
      console.error("Erreur chargement produits", e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (name === "balle" && value) {
      loadProduits(value, formData.produitRef);
    }
    if (name === "produitRef" && value) {
      const p = produitsDisponibles.find((p) => p._id === value);
      if (p) {
        setFormData((prev) => ({
          ...prev,
          produitRef: value,
          nomProduit: p.nom,
          tailleProduit: p.taille || "",
          prixVente: p.prixVente.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
      prixAchat: parseFloat(formData.prixAchat) || 0,
      categorie: formData.categorie,
    };
    if (formData.produitRef) payload.produit = formData.produitRef;

    const result = await modifierProduit(venteId, produitEntryId, payload);
    setSubmitting(false);

    if (result.success) {
      toast.success("Produit modifié ✅");
      navigate("/ventes");
    } else {
      toast.error(result.message || "Erreur lors de la modification");
    }
  };

  if (!vente || !produitEntry || !formData) {
    return (
      <div className="main-content">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const prixVenteNum = Number(formData.prixVente) || 0;
  const prixAchatNum = Number(formData.prixAchat) || 0;
  const benefice = prixVenteNum - prixAchatNum;
  const selectedCat = CAT_COLORS[formData.categorie] || CAT_COLORS.autres;

  return (
    <div className="main-content">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => navigate("/ventes")}
            title="Retour"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 26 }}>
              Modifier le produit
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--secondary-color)",
                marginTop: 2,
              }}
            >
              Commande de <strong>{vente.nomClient}</strong>
              {vente.telephoneClient && <span> · {vente.telephoneClient}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Produit actuel */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: "12px 20px",
          marginBottom: 24,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          fontSize: 13,
          color: "#1d4ed8",
        }}
      >
        <span>
          Produit : <strong>{produitEntry.nomProduit}</strong>
          {produitEntry.tailleProduit && (
            <span> · {produitEntry.tailleProduit}</span>
          )}
        </span>
        <span>
          Prix vente : <strong>{fmt(produitEntry.prixVente)}</strong>
        </span>
        <span>
          Prix achat : <strong>{fmt(produitEntry.prixAchat || 0)}</strong>
        </span>
        <span>
          Bénéfice :{" "}
          <strong>
            {fmt((produitEntry.prixVente || 0) - (produitEntry.prixAchat || 0))}
          </strong>
        </span>
        <span>
          Catégorie :{" "}
          <strong>
            {CATEGORIES.find((c) => c.value === produitEntry.categorie)
              ?.label || "Autres"}
          </strong>
        </span>
      </div>

      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card-header">
          <h2
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <FaSave style={{ color: "var(--primary-color)" }} />
            Modifier les informations
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Catégorie */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Catégorie *
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map(({ value, label }) => {
                const c = CAT_COLORS[value];
                const sel = formData.categorie === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, categorie: value }))
                    }
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      transition: "all 0.2s",
                      border: `2px solid ${sel ? c.border : "var(--border-color)"}`,
                      background: sel ? c.bg : "white",
                      color: sel ? c.color : "var(--secondary-color)",
                      fontWeight: sel ? 600 : 400,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Changer de balle/produit */}
          <div className="form-group">
            <label className="form-label">Balle (optionnel)</label>
            <select
              name="balle"
              className="form-select"
              value={formData.balle}
              onChange={handleChange}
            >
              <option value="">Aucune balle sélectionnée</option>
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
                name="produitRef"
                className="form-select"
                value={formData.produitRef}
                onChange={handleChange}
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

          {/* Nom + taille */}
          <div className="form-row">
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

          {/* Prix */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prix de vente (AR) *</label>
              <input
                type="number"
                name="prixVente"
                className="form-input"
                min="0"
                value={formData.prixVente}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Prix d'achat (AR)</label>
              <input
                type="number"
                name="prixAchat"
                className="form-input"
                min="0"
                value={formData.prixAchat}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Récapitulatif */}
          <div
            style={{
              background: selectedCat.bg,
              border: `1px solid ${selectedCat.border}`,
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                Catégorie
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: selectedCat.color,
                }}
              >
                {CATEGORIES.find((c) => c.value === formData.categorie)?.label}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                Bénéfice estimé
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: benefice >= 0 ? "#166534" : "#dc2626",
                }}
              >
                {fmt(benefice)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                Marge
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {prixVenteNum > 0
                  ? Math.round((benefice / prixVenteNum) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/ventes")}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <FaSave />
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifierProduitPage;
