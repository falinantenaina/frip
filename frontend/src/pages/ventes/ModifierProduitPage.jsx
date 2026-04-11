import { useEffect, useState } from "react";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useBalleStore from "../../stores/balleStore";
import useVenteStore from "../../stores/venteStore";
import api from "../../utils/api";

/**
 * Route attendue : /ventes/:venteId/produits/:produitEntryId/edit
 */
const ModifierProduitPage = () => {
  const { venteId, produitEntryId } = useParams();
  const navigate = useNavigate();
  const { ventes, fetchVentes, modifierProduit, loading } = useVenteStore();
  const { balles, fetchBalles } = useBalleStore();
  const [produitsDisponibles, setProduitsDisponibles] = useState([]);

  // Récupère la vente et l'entrée produit correspondantes
  const vente = ventes.find((v) => v._id === venteId);
  const produitEntry = vente?.produits?.find((p) => p._id === produitEntryId);

  const [formData, setFormData] = useState(null);

  // Initialise le formulaire une fois la vente chargée
  useEffect(() => {
    if (!vente) fetchVentes();
    fetchBalles();
  }, []);

  useEffect(() => {
    if (produitEntry && !formData) {
      const balleId = vente?.balle?._id || vente?.balle || "";
      setFormData({
        balle: balleId,
        produit: produitEntry.produit?._id || produitEntry.produit || "",
        nomProduit: produitEntry.nomProduit,
        tailleProduit: produitEntry.tailleProduit || "",
        prixVente: produitEntry.prixVente.toString(),
        prixAchat: produitEntry.prixAchat.toString(),
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
      const liste = res.data.data;
      // Inclure le produit actuel s'il n'est pas dans la liste disponible
      if (produitActuelId) {
        const dejaDedans = liste.find((p) => p._id === produitActuelId);
        if (!dejaDedans) {
          try {
            const r2 = await api.get(`/produits/${produitActuelId}`);
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
    if (name === "balle" && value) {
      loadProduits(value, formData.produit);
    }
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
      prixAchat: parseFloat(formData.prixAchat),
    };
    if (formData.produit) payload.produit = formData.produit;

    const result = await modifierProduit(venteId, produitEntryId, payload);
    if (result.success) {
      toast.success("Produit modifié avec succès ✅");
      navigate("/ventes");
    } else {
      toast.error(result.message || "Erreur lors de la modification");
    }
  };

  // Écran de chargement si la vente n'est pas encore disponible
  if (!vente || !produitEntry || !formData) {
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

      {/* Résumé produit actuel */}
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
          Produit actuel : <strong>{produitEntry.nomProduit}</strong>
          {produitEntry.tailleProduit && (
            <span> · {produitEntry.tailleProduit}</span>
          )}
        </span>
        <span>
          Prix actuel :{" "}
          <strong>
            {new Intl.NumberFormat("fr-FR").format(produitEntry.prixVente)} AR
          </strong>
        </span>
      </div>

      {/* Formulaire */}
      <div className="card" style={{ maxWidth: 600 }}>
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
          {/* Balle */}
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

          {/* Changer de produit (optionnel) */}
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

          {/* Nom + Taille */}
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
          <div className="form-group">
            <label className="form-label">Prix d'achat (AR) *</label>
            <input
              type="number"
              name="prixAchat"
              className="form-input"
              value={formData.prixAchat}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 8,
            }}
          >
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
              <FaSave />
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifierProduitPage;
