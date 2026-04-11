import { useEffect, useState } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../../stores/appStore";

const AjouterProduitPage = () => {
  console.log(useParams);
  const { id } = useParams(); // venteId
  console.log(id);
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
  const [venteMode, setVenteMode] = useState("avec_produit");

  // Récupère la vente correspondante
  const vente = ventes.find((v) => v._id === id);

  const [formData, setFormData] = useState({
    balle: vente?.balle?._id || vente?.balle || "",
    produit: "",
    nomProduit: "",
    tailleProduit: "",
    prixVente: "",
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
    if (name === "produit" && value) {
      const prod = produitsDisponibles.find((p) => p._id === value);
      if (prod)
        setFormData((p) => ({
          ...p,
          produit: value,
          nomProduit: prod.nom,
          tailleProduit: prod.taille || "",
          prixVente: prod.prixVente.toString(),
        }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
    };
    if (venteMode === "avec_produit" && formData.produit)
      payload.produit = formData.produit;

    const result = await ajouterProduit(id, payload);
    setLoading(false);
    if (result.success) {
      toast.success("Produit ajouté ✅");
      navigate("/ventes");
    } else {
      toast.error(result.message || "Erreur");
    }
  };

  const nouveauTotal =
    (vente?.prixVente || 0) + parseFloat(formData.prixVente || 0);

  const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n) + " AR";

  return (
    <div className="main-content">
      {/* En-tête */}
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

      {/* Résumé vente (optionnel) */}
      {vente && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "12px 18px",
            marginBottom: 24,
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#1d4ed8",
          }}
        >
          <span>
            Prix actuel : <strong>{fmt(vente.prixVente)}</strong>
          </span>
          <span>
            Statut :{" "}
            <strong>
              {{
                en_attente: "En attente",
                en_cours: "En cours",
                livré: "Livré",
                annulé: "Annulé",
              }[vente.statutLivraison] || vente.statutLivraison}
            </strong>
          </span>
          {vente.produits?.length > 0 && (
            <span>
              Produits existants : <strong>{vente.produits.length}</strong>
            </span>
          )}
        </div>
      )}

      {/* Formulaire dans une card */}
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <h2
            className="card-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <FaPlus style={{ color: "var(--primary-color)" }} />
            Nouveau produit
          </h2>
        </div>

        {/* Mode */}
        <div className="form-group">
          <label className="form-label">Mode de saisie</label>
          <div className="flex gap-20">
            {["avec_produit", "sans_produit"].map((m) => (
              <label
                key={m}
                className="flex gap-10"
                style={{ cursor: "pointer" }}
              >
                <input
                  type="radio"
                  value={m}
                  checked={venteMode === m}
                  onChange={() => setVenteMode(m)}
                />
                <span>
                  {m === "avec_produit"
                    ? "Produit existant"
                    : "Saisie manuelle"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {venteMode === "avec_produit" && (
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
            </>
          )}

          {venteMode === "sans_produit" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input
                  type="text"
                  name="nomProduit"
                  className="form-input"
                  placeholder="Ex: Veste"
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
                  placeholder="L"
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
              placeholder="15000"
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
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#166534",
                marginBottom: 20,
              }}
            >
              Nouveau total ≈{" "}
              <strong>
                {new Intl.NumberFormat("fr-FR").format(nouveauTotal)} AR
              </strong>
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
