import mongoose from "mongoose";

// ── Schéma d'un produit dans une vente ───────────────────────────────────────
const produitVenteSchema = new mongoose.Schema(
  {
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produit",
      default: null,
    },
    nomProduit: { type: String, required: true, trim: true },
    tailleProduit: { type: String, trim: true, default: "" },
    prixVente: { type: Number, required: true, min: 0 },
    prixAchat: { type: Number, default: 0, min: 0 },
    benefice: { type: Number, default: 0 }, // calculé automatiquement
    categorie: {
      type: String,
      enum: ["chaussures", "robes", "autres"],
      default: "autres",
    },
  },
  { _id: true },
);

// ── Schéma principal de la vente ─────────────────────────────────────────────
const venteSchema = new mongoose.Schema(
  {
    // ── Rattachements ────────────────────────────────────────────────────────
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      default: null,
    },
    typeVente: { type: String, enum: ["balle", "libre"], default: "libre" },
    expedition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      default: null,
    },

    // ── Liste des produits ───────────────────────────────────────────────────
    produits: [produitVenteSchema],

    // ── Champ de compatibilité (1er produit / vente simple) ──────────────────
    nomProduit: { type: String, required: true, trim: true },
    tailleProduit: { type: String, trim: true, default: "" },

    // ── Client ───────────────────────────────────────────────────────────────
    nomClient: { type: String, required: true, trim: true },
    telephoneClient: { type: String, required: true, trim: true },
    destinationClient: { type: String, trim: true, default: "Local" },

    // ── Totaux calculés automatiquement (pre-save) ───────────────────────────
    prixVente: { type: Number, default: 0, min: 0 }, // somme prixVente produits
    totalAchat: { type: Number, default: 0 }, // somme prixAchat produits
    totalBenefice: { type: Number, default: 0 }, // somme benefice produits
    montantTotal: { type: Number, default: 0 }, // prixVente + fraisLivraison

    // ── Catégorie principale (déduite des sous-produits) ─────────────────────
    categorie: {
      type: String,
      enum: ["chaussures", "robes", "autres"],
      default: "autres",
    },

    // ── Livraison ────────────────────────────────────────────────────────────
    livreur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livreur",
      default: null,
    },
    fraisLivraison: { type: Number, default: 0, min: 0 },
    lieuLivraison: { type: String, trim: true, default: "" },
    statutLivraison: {
      type: String,
      enum: ["en_attente", "en_cours", "livré", "annulé"],
      default: "en_attente",
    },
    dateLivraison: { type: Date, default: null },

    // ── Infos complémentaires ─────────────────────────────────────────────────
    commentaires: { type: String, trim: true, default: "" },
    raisonAnnulation: { type: String, trim: true, default: "" },
    dateVente: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// ── Hook pre-save : recalcul automatique complet ──────────────────────────────
venteSchema.pre("save", function () {
  if (this.produits && this.produits.length > 0) {
    // 1. Bénéfice par produit
    this.produits.forEach((p) => {
      p.benefice = (p.prixVente || 0) - (p.prixAchat || 0);
    });

    // 2. Totaux de la vente
    this.prixVente = this.produits.reduce(
      (sum, p) => sum + (p.prixVente || 0),
      0,
    );
    this.totalAchat = this.produits.reduce(
      (sum, p) => sum + (p.prixAchat || 0),
      0,
    );
    this.totalBenefice = this.produits.reduce(
      (sum, p) => sum + (p.benefice || 0),
      0,
    );

    // 3. Catégorie principale (si tous identiques → cette catégorie, sinon "autres")
    const cats = [
      ...new Set(this.produits.map((p) => p.categorie || "autres")),
    ];
    this.categorie = cats.length === 1 ? cats[0] : "autres";
  } else {
    this.prixVente = 0;
    this.totalAchat = 0;
    this.totalBenefice = 0;
  }

  // 4. Montant total = produits + frais livraison
  this.montantTotal = (this.prixVente || 0) + (this.fraisLivraison || 0);
});

// ── Index ─────────────────────────────────────────────────────────────────────
venteSchema.index({ balle: 1, dateVente: -1 });
venteSchema.index({ statutLivraison: 1, dateVente: -1 });
venteSchema.index({ livreur: 1, dateVente: -1 });
venteSchema.index({ dateVente: -1 });
venteSchema.index({ telephoneClient: 1, dateVente: -1 });
venteSchema.index({ typeVente: 1, dateVente: -1 });
venteSchema.index({ categorie: 1, dateVente: -1 });

export const Vente = mongoose.model("Vente", venteSchema);
export default Vente;
