import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAppStore from "../stores/appStore";

const DESTINATIONS = ["Local", "Antsirabe", "Autre"];
const CATEGORIES = [
  { value: "chaussures", label: "👟 Chaussures" },
  { value: "robes", label: "👗 Robes / Vêtements" },
  { value: "autres", label: "📦 Autres" },
];

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
    updateVente,
    fetchVente,
    loading,
    fetchProduitsDisponibles,
    prosduitsDispo,
    rattacherVente,
    fetchExpeditionsEnPreparation,
  } = useAppStore();

  const [typeVente, setTypeVente] = useState("libre");
  const [venteMode, setVenteMode] = useState("avec_produit");
  const [expeditionsEnPrepa, setExpeditionsEnPrepa] = useState([]);
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    balle: balleIdParam || "",
    produit: "",
    nomClient: "",
    telephoneClient: "",
    destinationClient: "Antsirabe",
    nomProduit: "",
    tailleProduit: "",
    prixVente: "",
    prixAchat: "",
    categorie: "chaussures",
    livreur: "",
    fraisLivraison: "0",
    lieuLivraison: "",
    statutLivraison: "en_attente",
    commentaires: "",
    expeditionId: "",
  });

  useEffect(() => {
    fetchBalles();
    fetchLivreurs();
    loadExpeditionsEnPrepa();
    if (isEdit) loadVente();
  }, []);

  const loadExpeditionsEnPrepa = async () => {
    const r = await fetchExpeditionsEnPreparation();
    if (r.success) setExpeditionsEnPrepa(r.data);
  };

  const loadVente = async () => {
    const result = await fetchVente(id);
    if (result.success) {
      const vente = result.data;
      setTypeVente(vente.typeVente || "balle");
      setFormData({
        balle: vente.balle?._id || "",
        produit: vente.produit?._id || "",
        nomClient: vente.nomClient,
        telephoneClient: vente.telephoneClient,
        destinationClient: vente.destinationClient || "Local",
        nomProduit: vente.nomProduit,
        tailleProduit: vente.tailleProduit || "",
        prixVente: vente.prixVente.toString(),
        prixAchat: "",
        categorie: vente.categorie || "autres",
        livreur: vente.livreur?._id || "",
        fraisLivraison: vente.fraisLivraison.toString(),
        lieuLivraison: vente.lieuLivraison,
        statutLivraison: vente.statutLivraison,
        commentaires: vente.commentaires || "",
        expeditionId: "",
      });
    }
  };

  useEffect(() => {
    if (formData.balle) fetchProduitsDisponibles(formData.balle);
  }, [formData.balle]);

  const produitsDisponibles = prosduitsDispo[formData.balle] || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === "produit" && value) {
      const produit = produitsDisponibles.find((p) => p._id === value);
      if (produit) {
        setFormData((p) => ({
          ...p,
          produit: value,
          nomProduit: produit.nom,
          tailleProduit: produit.taille || "",
          prixVente: produit.prixVente.toString(),
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      nomClient: formData.nomClient,
      telephoneClient: formData.telephoneClient,
      destinationClient: formData.destinationClient,
      nomProduit: formData.nomProduit,
      tailleProduit: formData.tailleProduit,
      prixVente: parseFloat(formData.prixVente),
      fraisLivraison: parseFloat(formData.fraisLivraison) || 0,
      lieuLivraison: formData.lieuLivraison,
      statutLivraison: formData.statutLivraison,
      commentaires: formData.commentaires,
      typeVente,
      categorie: formData.categorie,
    };
    if (typeVente === "libre" && formData.prixAchat) {
      data.prixAchatProduit = parseFloat(formData.prixAchat) || 0;
    }
    if (typeVente === "balle") {
      data.balle = formData.balle;
      if (venteMode === "avec_produit" && formData.produit)
        data.produit = formData.produit;
    }
    if (formData.livreur) data.livreur = formData.livreur;

    if (isEdit) {
      const r = await updateVente(id, data);
      if (r.success) {
        toast.success("Vente modifiée");
        navigate("/ventes");
      } else toast.error(r.message || "Erreur");
      return;
    }

    const result = await createVente(data);
    if (!result.success) {
      toast.error(result.message || "Erreur");
      return;
    }

    const venteId = result.data._id;
    if (formData.expeditionId && venteId) {
      const rattachRes = await rattacherVente(formData.expeditionId, venteId);
      if (rattachRes.success) {
        toast.success("✅ Vente créée et rattachée à l'expédition", {
          autoClose: 4000,
        });
      } else {
        toast.warning(
          "Vente créée mais rattachement échoué : " +
            (rattachRes.message || ""),
        );
      }
    } else {
      toast.success(
        result.venteFusionnee
          ? `✅ Produit ajouté à la commande de ${formData.nomClient}`
          : "Vente créée avec succès",
      );
    }
    navigate("/ventes");
  };

  const totalEstime =
    (parseFloat(formData.prixVente) || 0) +
    (parseFloat(formData.fraisLivraison) || 0);
  const beneficeEstime =
    typeVente === "libre" && formData.prixAchat
      ? (parseFloat(formData.prixVente) || 0) -
        (parseFloat(formData.prixAchat) || 0)
      : null;

  const expeditionsFiltrees = expeditionsEnPrepa.filter(
    (exp) =>
      formData.destinationClient !== "Local" &&
      (exp.destination === formData.destinationClient ||
        exp.destination === "Antsirabe"),
  );

  // Couleur de la catégorie sélectionnée
  const catColor = {
    chaussures: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
    robes: { bg: "#fce7f3", color: "#be185d", border: "#f9a8d4" },
    autres: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  };
  const selectedCat = catColor[formData.categorie] || catColor.autres;

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">
          {isEdit ? "Modifier la vente" : "Nouvelle Vente"}
        </h1>
      </div>

      {!isEdit && (
        <div className="card" style={{ maxWidth: 900, margin: "0 auto 20px" }}>
          <label className="form-label" style={{ marginBottom: 10 }}>
            Type de vente
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { val: "libre", icon: "🛍️", label: "Directe" },
              { val: "balle", icon: "📦", label: "Stock" },
            ].map(({ val, icon, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => setTypeVente(val)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: "2px solid",
                  borderColor:
                    typeVente === val
                      ? val === "balle"
                        ? "var(--primary-color)"
                        : "var(--success-color)"
                      : "var(--border-color)",
                  background:
                    typeVente === val
                      ? val === "balle"
                        ? "#eff6ff"
                        : "#f0fdf4"
                      : "white",
                  color:
                    typeVente === val
                      ? val === "balle"
                        ? "var(--primary-color)"
                        : "var(--success-color)"
                      : "var(--secondary-color)",
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          {/* ── CATÉGORIE DU PRODUIT ── */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Catégorie du produit *
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, categorie: value }))
                  }
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `2px solid ${formData.categorie === value ? catColor[value].border : "var(--border-color)"}`,
                    background:
                      formData.categorie === value
                        ? catColor[value].bg
                        : "white",
                    color:
                      formData.categorie === value
                        ? catColor[value].color
                        : "var(--secondary-color)",
                    fontWeight: formData.categorie === value ? 600 : 400,
                    fontSize: 14,
                    transition: "all 0.2s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── VENTE PAR BALLE ── */}
          {typeVente === "balle" && (
            <>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <div className="flex gap-20">
                  {[
                    ["avec_produit", "Avec produit existant"],
                    ["sans_produit", "Saisie manuelle"],
                  ].map(([m, l]) => (
                    <label key={m} className="flex gap-10">
                      <input
                        type="radio"
                        name="venteMode"
                        value={m}
                        checked={venteMode === m}
                        onChange={(e) => setVenteMode(e.target.value)}
                      />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
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
                      {b.nom} — {b.numero}
                    </option>
                  ))}
                </select>
              </div>
              {venteMode === "avec_produit" && (
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
                        {p.nom} — {p.taille || "?"} — {p.prixVente} AR
                      </option>
                    ))}
                  </select>
                  {formData.balle && produitsDisponibles.length === 0 && (
                    <small className="text-danger">
                      Aucun produit disponible
                    </small>
                  )}
                </div>
              )}
              {venteMode === "sans_produit" && (
                <>
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
                </>
              )}
            </>
          )}

          {/* ── VENTE LIBRE ── */}
          {typeVente === "libre" && (
            <>
              <div className="form-group">
                <label className="form-label">Nom du produit *</label>
                <input
                  type="text"
                  name="nomProduit"
                  className="form-input"
                  placeholder="Ex: Robe fleurie"
                  value={formData.nomProduit}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prix de vente (AR) *</label>
                  <input
                    type="number"
                    name="prixVente"
                    className="form-input"
                    placeholder="30000"
                    value={formData.prixVente}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Prix d'achat (AR)
                    <small
                      style={{
                        color: "var(--secondary-color)",
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      optionnel
                    </small>
                  </label>
                  <input
                    type="number"
                    name="prixAchat"
                    className="form-input"
                    placeholder="0"
                    value={formData.prixAchat}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>
              {beneficeEstime !== null && (
                <div
                  style={{
                    background: beneficeEstime >= 0 ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${beneficeEstime >= 0 ? "#bbf7d0" : "#fecaca"}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    marginBottom: 12,
                    fontSize: 13,
                    color: beneficeEstime >= 0 ? "#166534" : "#991b1b",
                  }}
                >
                  Bénéfice estimé :{" "}
                  <strong>
                    {new Intl.NumberFormat("fr-FR").format(beneficeEstime)} AR
                  </strong>
                </div>
              )}
            </>
          )}

          {/* ── CLIENT ── */}
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              paddingTop: 16,
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 14 }}>👤 Client</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input
                type="text"
                name="nomClient"
                className="form-input"
                placeholder="Marie Rabe"
                value={formData.nomClient}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone *</label>
              <input
                type="tel"
                name="telephoneClient"
                className="form-input"
                placeholder="+261 34 00 000 00"
                value={formData.telephoneClient}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Destination</label>
              <select
                name="destinationClient"
                className="form-select"
                value={formData.destinationClient}
                onChange={handleChange}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lieu de livraison</label>
              <input
                type="text"
                name="lieuLivraison"
                className="form-input"
                placeholder="Ex: Antsirabe centre"
                value={formData.lieuLivraison}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ── RATTACHER EXPÉDITION ── */}
          {!isEdit && expeditionsFiltrees.length > 0 && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#1d4ed8",
                  marginBottom: 10,
                }}
              >
                📦 Ajouter à une expédition en préparation
              </p>
              <select
                name="expeditionId"
                className="form-select"
                value={formData.expeditionId}
                onChange={handleChange}
              >
                <option value="">Ne pas rattacher à une expédition</option>
                {expeditionsFiltrees.map((exp) => (
                  <option key={exp._id} value={exp._id}>
                    {exp.nom} — {exp.destination} ({exp.produits?.length || 0}{" "}
                    produits)
                  </option>
                ))}
              </select>
              {formData.expeditionId && (
                <small
                  style={{
                    color: "#1d4ed8",
                    fontSize: 12,
                    marginTop: 6,
                    display: "block",
                  }}
                >
                  ✅ Cette vente sera ajoutée automatiquement à l'expédition
                  sélectionnée
                </small>
              )}
            </div>
          )}

          {/* ── LIVRAISON (mode édition) ── */}
          {isEdit && (
            <div>
              <div
                style={{
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: 16,
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontWeight: 600, fontSize: 14 }}>🚚 Livraison</p>
              </div>
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
                    {livreurs.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.nom} — {l.telephone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Frais livraison (AR)</label>
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
                  <label className="form-label">Statut</label>
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
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Commentaires</label>
            <textarea
              name="commentaires"
              className="form-textarea"
              rows={2}
              value={formData.commentaires}
              onChange={handleChange}
            />
          </div>

          {/* Résumé */}
          <div
            style={{
              background: "var(--light-color)",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 20,
            }}
          >
            <div className="flex-between mb-10">
              <span>Catégorie</span>
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background: selectedCat.bg,
                  color: selectedCat.color,
                  border: `1px solid ${selectedCat.border}`,
                }}
              >
                {CATEGORIES.find((c) => c.value === formData.categorie)?.label}
              </span>
            </div>
            <div className="flex-between mb-10">
              <span>Prix de vente</span>
              <strong>{formData.prixVente || 0} AR</strong>
            </div>
            {typeVente === "libre" && formData.prixAchat && (
              <div className="flex-between mb-10">
                <span>Prix d'achat</span>
                <strong className="text-danger">
                  − {formData.prixAchat} AR
                </strong>
              </div>
            )}
            <div className="flex-between mb-10">
              <span>Frais de livraison</span>
              <strong>{formData.fraisLivraison || 0} AR</strong>
            </div>
            <div
              className="flex-between"
              style={{
                borderTop: "2px solid var(--border-color)",
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              <strong>Total client</strong>
              <strong style={{ fontSize: 20, color: "var(--success-color)" }}>
                {totalEstime} AR
              </strong>
            </div>
          </div>

          <div className="flex-between">
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
              disabled={loading.ventes}
            >
              {loading.ventes
                ? "Enregistrement..."
                : isEdit
                  ? "Modifier"
                  : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VenteForm;
