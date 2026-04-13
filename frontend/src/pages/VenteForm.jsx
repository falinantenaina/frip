import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaPlus,
  FaShoppingCart,
  FaTag,
  FaTrash,
  FaTruck,
  FaUser,
} from "react-icons/fa";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "chaussures", label: "👟 Chaussures" },
  { value: "robes", label: "👗 Vêtements" },
  { value: "autres", label: "📦 Autres" },
];

const CAT_COLORS = {
  chaussures: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  robes: { bg: "#fce7f3", color: "#be185d", border: "#f9a8d4" },
  autres: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
};

const STATUTS = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "livré", label: "Livré" },
];

const DESTINATIONS = ["Local", "Antsirabe", "Autre"];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " Ar";

// ─── Styles inline globaux ────────────────────────────────────────────────────
const styles = {
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  card: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    padding: 24,
    marginBottom: 16,
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
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  formGroup: { marginBottom: 16 },
};

// ─── Sous-composant : Sélecteur de catégorie ──────────────────────────────────
const CategorieSelector = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {CATEGORIES.map(({ value: v, label }) => {
      const c = CAT_COLORS[v];
      const selected = value === v;
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            padding: "7px 14px",
            borderRadius: 20,
            cursor: "pointer",
            fontSize: 13,
            transition: "all 0.2s",
            border: `2px solid ${selected ? c.border : "#e2e8f0"}`,
            background: selected ? c.bg : "white",
            color: selected ? c.color : "#94a3b8",
            fontWeight: selected ? 700 : 400,
            boxShadow: selected ? `0 0 0 3px ${c.border}33` : "none",
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// ─── Sous-composant : Ligne de produit ────────────────────────────────────────
const ProduitLigne = ({
  produit,
  index,
  onChange,
  onRemove,
  onAdd,
  balles,
  produitsDisponibles,
  fetchProduitsDisponibles,
  canRemove,
  isLast,
}) => {
  const [mode, setMode] = useState("sans_produit");

  const handleBalle = (balleId) => {
    onChange(index, "balle", balleId);
    onChange(index, "produitRef", "");
    if (balleId) fetchProduitsDisponibles(balleId);
  };

  const handleProduitRef = (produitId) => {
    const dispList = produitsDisponibles[produit.balle] || [];
    const p = dispList.find((x) => x._id === produitId);
    if (p) {
      onChange(index, "produitRef", produitId);
      onChange(index, "nomProduit", p.nom);
      onChange(index, "tailleProduit", p.taille || "");
      onChange(index, "prixVente", p.prixVente.toString());
    }
  };

  const benefice =
    (Number(produit.prixVente) || 0) - (Number(produit.prixAchat) || 0);
  const hasPrix = !!produit.prixVente;

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1.5px solid #e2e8f0",
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        position: "relative",
        transition: "border-color 0.2s",
      }}
    >
      {/* Entête ligne */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
            {produit.nomProduit || `Produit ${index + 1}`}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Toggle mode */}
          <div
            style={{
              display: "flex",
              background: "#e2e8f0",
              borderRadius: 20,
              padding: 3,
              gap: 2,
            }}
          >
            {["avec_produit", "sans_produit"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: mode === m ? 600 : 400,
                  background: mode === m ? "white" : "transparent",
                  color: mode === m ? "#1e293b" : "#64748b",
                  boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {m === "avec_produit" ? "📦 Stock" : "✏️ Manuel"}
              </button>
            ))}
          </div>

          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                border: "none",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              title="Supprimer ce produit"
            >
              <FaTrash size={11} /> Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Catégorie */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Catégorie *</label>
        <CategorieSelector
          value={produit.categorie}
          onChange={(v) => onChange(index, "categorie", v)}
        />
      </div>

      {/* Mode sélection depuis stock */}
      {mode === "avec_produit" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={styles.formGroup}>
            <label style={styles.label}>Balle</label>
            <select
              style={styles.inputBase}
              value={produit.balle || ""}
              onChange={(e) => handleBalle(e.target.value)}
            >
              <option value="">Sélectionner une balle</option>
              {balles.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.nom} – {b.numero}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Produit</label>
            <select
              style={{ ...styles.inputBase, opacity: !produit.balle ? 0.5 : 1 }}
              value={produit.produitRef || ""}
              onChange={(e) => handleProduitRef(e.target.value)}
              disabled={!produit.balle}
            >
              <option value="">Sélectionner un produit</option>
              {(produitsDisponibles[produit.balle] || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nom} · {p.taille || "–"} · {p.prixVente} Ar
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Champs produit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nom du produit *</label>
          <input
            type="text"
            style={styles.inputBase}
            placeholder="Ex: Veste"
            value={produit.nomProduit}
            onChange={(e) => onChange(index, "nomProduit", e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Prix de vente (Ar) *</label>
          <input
            type="number"
            style={styles.inputBase}
            placeholder="15000"
            min="0"
            value={produit.prixVente}
            onChange={(e) => onChange(index, "prixVente", e.target.value)}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Prix d'achat (Ar)</label>
          <input
            type="number"
            style={styles.inputBase}
            placeholder="0"
            min="0"
            value={produit.prixAchat}
            onChange={(e) => onChange(index, "prixAchat", e.target.value)}
          />
        </div>
      </div>

      {/* Résumé bénéfice */}
      {hasPrix && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: benefice >= 0 ? "#f0fdf4" : "#fff1f2",
            border: `1px solid ${benefice >= 0 ? "#bbf7d0" : "#fecdd3"}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: benefice >= 0 ? "#166534" : "#be123c",
            marginTop: 4,
          }}
        >
          <span>💰 Bénéfice estimé</span>
          <strong>{fmt(benefice)}</strong>
        </div>
      )}

      {/* Bouton "Ajouter un autre produit" — uniquement sur la dernière ligne */}
      {isLast && (
        <button
          type="button"
          onClick={onAdd}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 16px",
            borderRadius: 10,
            border: "2px dashed #93c5fd",
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#dbeafe";
            e.currentTarget.style.borderColor = "#2563eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#eff6ff";
            e.currentTarget.style.borderColor = "#93c5fd";
          }}
        >
          <FaPlus size={12} /> Ajouter un autre produit
        </button>
      )}
    </div>
  );
};

// ─── Composant principal : VenteForm ──────────────────────────────────────────
const VenteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get("balle");

  const {
    balles,
    livreurs,
    fetchBalles,
    fetchLivreurs,
    createVente,
    fetchVente,
    loading,
    fetchProduitsDisponibles,
    prosduitsDispo,
  } = useAppStore();

  const isEdit = !!id;
  const [typeVente, setTypeVente] = useState("libre");

  const [infoForm, setInfoForm] = useState({
    nomClient: "",
    telephoneClient: "",
    destinationClient: "Antsirabe",
    livreur: "",
    fraisLivraison: "0",
    lieuLivraison: "",
    statutLivraison: "en_attente",
    commentaires: "",
    balle: balleIdParam || "",
  });

  const produitVide = () => ({
    id: Date.now() + Math.random(),
    balle: balleIdParam || "",
    produitRef: "",
    nomProduit: "",
    tailleProduit: "",
    prixVente: "",
    prixAchat: "0",
    categorie: "chaussures",
  });

  const [produits, setProduits] = useState([produitVide()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBalles();
    fetchLivreurs();
    if (balleIdParam) fetchProduitsDisponibles(balleIdParam);
  }, []);

  useEffect(() => {
    if (isEdit) navigate(`/ventes/${id}/edit-info`, { replace: true });
  }, [isEdit]);

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfoForm((p) => ({ ...p, [name]: value }));
  };

  const handleProduitChange = (index, field, value) => {
    setProduits((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const addProduit = () => setProduits((p) => [...p, produitVide()]);
  const removeProduit = (index) =>
    setProduits((p) => p.filter((_, i) => i !== index));

  const totalVente = produits.reduce(
    (s, p) => s + (Number(p.prixVente) || 0),
    0,
  );
  const totalAchat = produits.reduce(
    (s, p) => s + (Number(p.prixAchat) || 0),
    0,
  );
  const totalBenefice = totalVente - totalAchat;
  const montantTotal = totalVente + (Number(infoForm.fraisLivraison) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (produits.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }
    setSubmitting(true);
    try {
      const premierProduit = produits[0];
      const payload = {
        ...infoForm,
        typeVente,
        balle: typeVente === "balle" ? infoForm.balle : undefined,
        nomProduit: premierProduit.nomProduit,
        tailleProduit: premierProduit.tailleProduit,
        prixVente: Number(premierProduit.prixVente) || 0,
        prixAchat: Number(premierProduit.prixAchat) || 0,
        categorie: premierProduit.categorie,
        produit: premierProduit.produitRef || undefined,
        fraisLivraison: Number(infoForm.fraisLivraison) || 0,
      };
      const result = await createVente(payload);
      if (!result.success) {
        toast.error(result.message || "Erreur lors de la création");
        return;
      }
      const venteId = result.data._id;
      if (produits.length > 1) {
        const { ajouterProduit } = useAppStore.getState();
        for (let i = 1; i < produits.length; i++) {
          const p = produits[i];
          await ajouterProduit(venteId, {
            produit: p.produitRef || undefined,
            nomProduit: p.nomProduit,
            tailleProduit: p.tailleProduit,
            prixVente: Number(p.prixVente) || 0,
            prixAchat: Number(p.prixAchat) || 0,
            categorie: p.categorie,
          });
        }
      }
      toast.success("Vente créée avec succès ✅");
      navigate("/ventes");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 32,
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
            Nouvelle vente
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 3 }}>
            Créer une vente avec un ou plusieurs produits
          </p>
        </div>

        {/* Indicateur nbr produits */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 13,
            color: "#2563eb",
            fontWeight: 600,
          }}
        >
          <FaShoppingCart size={13} />
          {produits.length} produit{produits.length > 1 ? "s" : ""}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 24,
            alignItems: "start",
          }}
          className="vente-form-grid"
        >
          {/* ── Colonne gauche : Produits ──────────────────────────────────── */}
          <div>
            {/* Type de vente */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <FaTag size={11} /> Type de vente
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { value: "libre", label: "🆓 Vente libre" },
                  { value: "balle", label: "📦 Depuis une balle" },
                ].map(({ value, label }) => {
                  const selected = typeVente === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTypeVente(value)}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 10,
                        border: `2px solid ${selected ? "#2563eb" : "#e2e8f0"}`,
                        background: selected
                          ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                          : "white",
                        color: selected ? "#1d4ed8" : "#64748b",
                        fontWeight: selected ? 700 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: selected ? "0 0 0 3px #bfdbfe" : "none",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {typeVente === "balle" && (
                <div style={{ marginTop: 16 }}>
                  <label style={styles.label}>Balle principale</label>
                  <select
                    name="balle"
                    style={styles.inputBase}
                    value={infoForm.balle}
                    onChange={handleInfoChange}
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
              )}
            </div>

            {/* Liste produits */}
            <div style={styles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={styles.sectionTitle}>
                  <FaShoppingCart size={11} /> Produits ({produits.length})
                </div>
              </div>

              {produits.map((p, i) => (
                <ProduitLigne
                  key={p.id}
                  produit={p}
                  index={i}
                  onChange={handleProduitChange}
                  onRemove={removeProduit}
                  onAdd={addProduit}
                  balles={balles}
                  produitsDisponibles={prosduitsDispo}
                  fetchProduitsDisponibles={fetchProduitsDisponibles}
                  canRemove={produits.length > 1}
                  isLast={i === produits.length - 1}
                />
              ))}

              {/* Récapitulatif totaux */}
              {produits.some((p) => p.prixVente) && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #f8faff, #f0fdf4)",
                    border: "1px solid #bfdbfe",
                    borderRadius: 14,
                    padding: "20px 24px",
                    marginTop: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 16,
                  }}
                >
                  {[
                    {
                      label: "Total vente",
                      value: totalVente,
                      color: "#1d4ed8",
                    },
                    {
                      label: "Total achat",
                      value: totalAchat,
                      color: "#92400e",
                    },
                    {
                      label: "Bénéfice",
                      value: totalBenefice,
                      color: totalBenefice >= 0 ? "#166534" : "#dc2626",
                    },
                    {
                      label: "Montant total",
                      value: montantTotal,
                      color: "#1d4ed8",
                      bold: true,
                    },
                  ].map(({ label, value, color, bold }) => (
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
                        {fmt(value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Colonne droite ─────────────────────────────────────────────── */}
          <div>
            {/* Client */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <FaUser size={11} /> Client
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nom du client *</label>
                <input
                  type="text"
                  name="nomClient"
                  style={styles.inputBase}
                  placeholder="Prénom Nom"
                  value={infoForm.nomClient}
                  onChange={handleInfoChange}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Téléphone *</label>
                <input
                  type="tel"
                  name="telephoneClient"
                  style={styles.inputBase}
                  placeholder="034 XX XXX XX"
                  value={infoForm.telephoneClient}
                  onChange={handleInfoChange}
                  required
                />
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={styles.label}>Destination</label>
                <select
                  name="destinationClient"
                  style={styles.inputBase}
                  value={infoForm.destinationClient}
                  onChange={handleInfoChange}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Livraison */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <FaTruck size={11} /> Livraison
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Statut</label>
                <select
                  name="statutLivraison"
                  style={styles.inputBase}
                  value={infoForm.statutLivraison}
                  onChange={handleInfoChange}
                >
                  {STATUTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Livreur</label>
                <select
                  name="livreur"
                  style={styles.inputBase}
                  value={infoForm.livreur}
                  onChange={handleInfoChange}
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
                  placeholder="0"
                  min="0"
                  value={infoForm.fraisLivraison}
                  onChange={handleInfoChange}
                />
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={styles.label}>Lieu de livraison</label>
                <input
                  type="text"
                  name="lieuLivraison"
                  style={styles.inputBase}
                  placeholder="Adresse..."
                  value={infoForm.lieuLivraison}
                  onChange={handleInfoChange}
                />
              </div>
            </div>

            {/* Commentaires */}
            <div style={styles.card}>
              <label style={styles.label}>💬 Commentaires</label>
              <textarea
                name="commentaires"
                style={{
                  ...styles.inputBase,
                  resize: "vertical",
                  minHeight: 80,
                }}
                placeholder="Notes..."
                value={infoForm.commentaires}
                onChange={handleInfoChange}
                rows={3}
              />
            </div>

            {/* Boutons actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: submitting
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
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
                        width: 16,
                        height: 16,
                        border: "2.5px solid rgba(255,255,255,0.4)",
                        borderTop: "2.5px solid white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <FaCheck size={14} /> Créer la vente
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/ventes")}
                style={{
                  width: "100%",
                  padding: "12px",
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
            </div>
          </div>
        </div>
      </form>

      {/* Responsive styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .vente-form-grid {
          grid-template-columns: 1fr 360px;
        }

        @media (max-width: 900px) {
          .vente-form-grid {
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

export default VenteForm;
