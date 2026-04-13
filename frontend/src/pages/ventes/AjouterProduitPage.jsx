import { useEffect, useState } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../../stores/appStore";

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
 * Ajouter un produit à une vente existante.
 * Route : /ventes/:id/ajouter-produit
 */
const AjouterProduitPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    ajouterProduit,
    balles,
    fetchBalles,
    fetchProduitsDisponibles,
    prosduitsDispo,
    ventes,
    fetchVentes,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("sans_produit"); // "avec_produit" | "sans_produit"

  const vente = ventes.find((v) => v._id === id);

  const [formData, setFormData] = useState({
    balle: vente?.balle?._id || vente?.balle || "",
    produitRef: "",
    nomProduit: "",
    prixVente: "",
    prixAchat: "0",
    categorie: "chaussures",
  });

  useEffect(() => {
    if (!vente) fetchVentes();
    fetchBalles();
    if (formData.balle) fetchProduitsDisponibles(formData.balle);
  }, []);

  const produitsDisponibles = prosduitsDispo[formData.balle] || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === "balle" && value) fetchProduitsDisponibles(value);
    if (name === "produitRef" && value) {
      const prod = produitsDisponibles.find((p) => p._id === value);
      if (prod) {
        setFormData((p) => ({
          ...p,
          produitRef: value,
          nomProduit: prod.nom,
          prixVente: prod.prixVente.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nomProduit || !formData.prixVente) {
      toast.error("Remplissez le nom et le prix du produit");
      return;
    }

    setLoading(true);
    const payload = {
      nomProduit: formData.nomProduit,
      prixVente: parseFloat(formData.prixVente),
      prixAchat: parseFloat(formData.prixAchat) || 0,
      categorie: formData.categorie,
    };
    if (mode === "avec_produit" && formData.produitRef) {
      payload.produit = formData.produitRef;
    }

    const result = await ajouterProduit(id, payload);
    setLoading(false);

    if (result.success) {
      toast.success("Produit ajouté ✅");
      navigate("/ventes");
    } else {
      toast.error(result.message || "Erreur lors de l'ajout");
    }
  };

  const prixVenteNum = Number(formData.prixVente) || 0;
  const prixAchatNum = Number(formData.prixAchat) || 0;
  const beneficeEstime = prixVenteNum - prixAchatNum;
  const nouveauTotal = (vente?.prixVente || 0) + prixVenteNum;
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
              Ajouter un produit
            </h1>
            {vente && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--secondary-color)",
                  marginTop: 2,
                }}
              >
                Commande de <strong>{vente.nomClient}</strong>
                {vente.telephoneClient && (
                  <span> · {vente.telephoneClient}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Résumé vente actuelle */}
      {vente && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "12px 20px",
            marginBottom: 24,
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#1d4ed8",
          }}
        >
          <span>
            Total actuel : <strong>{fmt(vente.prixVente || 0)}</strong>
          </span>
          <span>
            Achat total : <strong>{fmt(vente.totalAchat || 0)}</strong>
          </span>
          <span>
            Bénéfice total : <strong>{fmt(vente.totalBenefice || 0)}</strong>
          </span>
          <span>
            Produits : <strong>{vente.produits?.length || 0}</strong>
          </span>
        </div>
      )}

      <div className="card" style={{ maxWidth: 620 }}>
        <div className="card-header">
          <h2
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <FaPlus style={{ color: "var(--primary-color)" }} />
            Nouveau produit
          </h2>
        </div>

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

        {/* Mode de saisie */}
        <div className="form-group">
          <label className="form-label">Mode de saisie</label>
          <div style={{ display: "flex", gap: 20 }}>
            {["avec_produit", "sans_produit"].map((m) => (
              <label
                key={m}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="radio"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                <span>
                  {m === "avec_produit"
                    ? "Produit existant (stock)"
                    : "Saisie manuelle"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Depuis le stock */}
          {mode === "avec_produit" && (
            <>
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
              <div className="form-group">
                <label className="form-label">Produit *</label>
                <select
                  name="produitRef"
                  className="form-select"
                  value={formData.produitRef}
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
                  <small style={{ color: "var(--danger-color)" }}>
                    Aucun produit disponible dans cette balle
                  </small>
                )}
              </div>
            </>
          )}

          {/* Infos produit */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom du produit *</label>
              <input
                type="text"
                name="nomProduit"
                className="form-input"
                placeholder="Ex: Veste noire"
                value={formData.nomProduit}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prix de vente (AR) *</label>
              <input
                type="number"
                name="prixVente"
                className="form-input"
                placeholder="15000"
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
                placeholder="0"
                min="0"
                value={formData.prixAchat}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Récapitulatif */}
          {formData.prixVente && (
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdf4, #eff6ff)",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                  Bénéfice estimé
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: beneficeEstime >= 0 ? "#166534" : "#dc2626",
                  }}
                >
                  {fmt(beneficeEstime)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                  Nouveau total vente
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#1d4ed8" }}
                >
                  {fmt(nouveauTotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--secondary-color)" }}>
                  Catégorie
                </div>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedCat.bg,
                    color: selectedCat.color,
                    border: `1px solid ${selectedCat.border}`,
                  }}
                >
                  {
                    CATEGORIES.find((c) => c.value === formData.categorie)
                      ?.label
                  }
                </span>
              </div>
            </div>
          )}

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
              disabled={loading}
            >
              <FaPlus />
              {loading ? "Ajout..." : "Ajouter le produit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjouterProduitPage;
