import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import useBalleStore from "../stores/balleStore";
import { useLivreurStore } from "../stores/otherStores";
import useVenteStore from "../stores/venteStore";
import api from "../utils/api";

const VenteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const balleIdParam = searchParams.get("balle");

  const { createVente, updateVente, fetchVente, loading } = useVenteStore();
  const { balles, fetchBalles } = useBalleStore();
  const { livreurs, fetchLivreurs } = useLivreurStore();

  const [produitsDisponibles, setProduitsDisponibles] = useState([]);
  const [formData, setFormData] = useState({
    balle: balleIdParam || "",
    produit: "",
    nomClient: "",
    telephoneClient: "",
    nomProduit: "",
    tailleProduit: "",
    prixVente: "",
    livreur: "",
    fraisLivraison: "0",
    lieuLivraison: "",
    statutLivraison: "en_attente",
    commentaires: "",
  });

  const [venteMode, setVenteMode] = useState("avec_produit");
  const isEdit = !!id;

  useEffect(() => {
    fetchBalles();
    fetchLivreurs();
    if (isEdit) {
      loadVente();
    }
  }, []);

  const loadVente = async () => {
    const result = await fetchVente(id);
    if (result.success) {
      const vente = result.data;
      setFormData({
        balle: vente.balle._id,
        produit: vente.produit?._id || "",
        nomClient: vente.nomClient,
        telephoneClient: vente.telephoneClient,
        nomProduit: vente.nomProduit,
        tailleProduit: vente.tailleProduit || "",
        prixVente: vente.prixVente.toString(),
        livreur: vente.livreur?._id || "",
        fraisLivraison: vente.fraisLivraison.toString(),
        lieuLivraison: vente.lieuLivraison,
        statutLivraison: vente.statutLivraison,
        commentaires: vente.commentaires || "",
      });
      setVenteMode(vente.produit ? "avec_produit" : "sans_produit");
    }
  };

  useEffect(() => {
    if (formData.balle) {
      loadProduitsDisponibles(formData.balle);
    }
  }, [formData.balle]);

  const loadProduitsDisponibles = async (balleId) => {
    try {
      const response = await api.get(`/produits/balle/${balleId}/disponibles`);
      setProduitsDisponibles(response.data.data);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "produit" && value) {
      const produit = produitsDisponibles.find((p) => p._id === value);
      if (produit) {
        setFormData({
          ...formData,
          produit: value,
          nomProduit: produit.nom,
          tailleProduit: produit.taille || "",
          prixVente: produit.prixVente.toString(),
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      balle: formData.balle,
      nomClient: formData.nomClient,
      telephoneClient: formData.telephoneClient,
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
      fraisLivraison: parseFloat(formData.fraisLivraison),
      lieuLivraison: formData.lieuLivraison,
      statutLivraison: formData.statutLivraison,
      commentaires: formData.commentaires,
    };

    if (venteMode === "avec_produit" && formData.produit) {
      data.produit = formData.produit;
    }
    if (formData.livreur) {
      data.livreur = formData.livreur;
    }

    if (isEdit) {
      const result = await updateVente(id, data);
      if (result.success) {
        toast.success("Vente modifiée avec succès");
        navigate("/ventes");
      } else {
        toast.error(result.message || "Erreur lors de la modification");
      }
    } else {
      const result = await createVente(data);
      if (result.success) {
        if (result.venteFusionnee) {
          toast.success(
            `✅ Produit ajouté à la commande existante de ${formData.nomClient} !`,
            { autoClose: 4000 },
          );
        } else {
          toast.success("Vente créée avec succès");
        }
        navigate("/ventes");
      } else {
        toast.error(result.message || "Erreur lors de l'enregistrement");
      }
    }
  };

  const calculateTotal = () => {
    const prix = parseFloat(formData.prixVente) || 0;
    const frais = parseFloat(formData.fraisLivraison) || 0;
    return prix + frais;
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">
          {isEdit ? "Modifier la vente" : "Nouvelle Vente"}
        </h1>
      </div>

      {/* Info fusion automatique */}
      {/* {!isEdit && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            maxWidth: "900px",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            color: "#1d4ed8",
          }}
        >
          <span style={{ fontSize: "18px" }}>💡</span>
          <span>
            Si ce client a déjà une commande aujourd'hui, le produit sera
            automatiquement ajouté à sa commande existante.
          </span>
        </div>
      )} */}

      <div className="card" style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Mode de vente */}
        <div className="mb-20">
          <label className="form-label">Mode de vente</label>
          <div className="flex gap-20">
            <label className="flex gap-10">
              <input
                type="radio"
                name="venteMode"
                value="avec_produit"
                checked={venteMode === "avec_produit"}
                onChange={(e) => setVenteMode(e.target.value)}
              />
              <span>Avec produit existant</span>
            </label>
            <label className="flex gap-10">
              <input
                type="radio"
                name="venteMode"
                value="sans_produit"
                checked={venteMode === "sans_produit"}
                onChange={(e) => setVenteMode(e.target.value)}
              />
              <span>Vente directe (sans produit)</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Balle */}
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
              {balles.map((balle) => (
                <option key={balle._id} value={balle._id}>
                  {balle.nom} - {balle.numero}
                </option>
              ))}
            </select>
          </div>

          {/* Produit (mode avec produit) */}
          {venteMode === "avec_produit" && (
            <div className="form-group">
              <label className="form-label">Produit *</label>
              <select
                name="produit"
                className="form-select"
                value={formData.produit}
                onChange={handleChange}
                required={venteMode === "avec_produit"}
                disabled={!formData.balle}
              >
                <option value="">Sélectionner un produit</option>
                {produitsDisponibles.map((produit) => (
                  <option key={produit._id} value={produit._id}>
                    {produit.nom} - {produit.taille} - {produit.prixVente} AR
                  </option>
                ))}
              </select>
              {!formData.balle && (
                <small className="text-secondary">
                  Sélectionnez d'abord une balle
                </small>
              )}
              {formData.balle && produitsDisponibles.length === 0 && (
                <small className="text-danger">
                  Aucun produit disponible pour cette balle
                </small>
              )}
            </div>
          )}

          {/* Infos produit (mode sans produit) */}
          {venteMode === "sans_produit" && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom du produit *</label>
                  <input
                    type="text"
                    name="nomProduit"
                    className="form-input"
                    placeholder="Ex: Veste en cuir"
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
                    placeholder="Ex: L"
                    value={formData.tailleProduit}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Prix de vente (AR) *</label>
                <input
                  type="number"
                  name="prixVente"
                  className="form-input"
                  placeholder="Ex: 50000"
                  value={formData.prixVente}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
            </>
          )}

          {/* Informations client */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom du client *</label>
              <input
                type="text"
                name="nomClient"
                className="form-input"
                placeholder="Ex: Jean Dupont"
                value={formData.nomClient}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone du client *</label>
              <input
                type="tel"
                name="telephoneClient"
                className="form-input"
                placeholder="Ex: +261 34 00 000 00"
                value={formData.telephoneClient}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Livraison */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Livreur</label>
              <select
                name="livreur"
                className="form-select"
                value={formData.livreur}
                onChange={handleChange}
              >
                <option value="">Pas de livreur</option>
                {livreurs.map((livreur) => (
                  <option key={livreur._id} value={livreur._id}>
                    {livreur.nom} - {livreur.telephone}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Frais de livraison (AR)</label>
              <input
                type="number"
                name="fraisLivraison"
                className="form-input"
                placeholder="0"
                value={formData.fraisLivraison}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lieu de livraison *</label>
              <input
                type="text"
                name="lieuLivraison"
                className="form-input"
                placeholder="Ex: Analakely, Antananarivo"
                value={formData.lieuLivraison}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Statut de livraison</label>
              <select
                name="statutLivraison"
                className="form-select"
                value={formData.statutLivraison}
                onChange={handleChange}
              >
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="livré">Livré</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Commentaires</label>
            <textarea
              name="commentaires"
              className="form-textarea"
              placeholder="Remarques ou instructions particulières..."
              value={formData.commentaires}
              onChange={handleChange}
              rows="3"
            />
          </div>

          {/* Résumé */}
          <div className="card" style={{ background: "var(--light-color)" }}>
            <h4 className="mb-10">Résumé du produit ajouté</h4>
            <div className="flex-between mb-10">
              <span>Prix de vente:</span>
              <strong>{formData.prixVente || 0} AR</strong>
            </div>
            <div className="flex-between mb-10">
              <span>Frais de livraison:</span>
              <strong>{formData.fraisLivraison || 0} AR</strong>
            </div>
            <div
              className="flex-between"
              style={{
                borderTop: "2px solid var(--border-color)",
                paddingTop: "10px",
                marginTop: "10px",
              }}
            >
              <span className="font-bold">Total:</span>
              <strong className="text-success" style={{ fontSize: "20px" }}>
                {calculateTotal()} AR
              </strong>
            </div>
          </div>

          <div className="flex-between mt-20">
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
              {loading
                ? "Enregistrement..."
                : isEdit
                  ? "Modifier la vente"
                  : "Enregistrer la vente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VenteForm;
