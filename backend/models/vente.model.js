import mongoose from "mongoose";

const produitVenteSchema = new mongoose.Schema(
  {
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Produit" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },
    prixVente: { type: Number, required: true, min: 0 },
    prixAchat: { type: Number, default: 0, min: 0 },
    // Bénéfice par produit = prixVente - prixAchat (calculé automatiquement)
    benefice: { type: Number, default: 0 },
    categorie: {
      type: String,
      enum: ["chaussures", "robes", "autres"],
      default: "autres",
    },
  },
  { _id: true },
);

const venteSchema = new mongoose.Schema(
  {
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      default: null,
    },
    typeVente: {
      type: String,
      enum: ["balle", "libre"],
      default: "balle",
    },
    produits: [produitVenteSchema],
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Produit" },

    // Champs de compatibilité / affichage pour vente simple
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },

    // Catégorie principale (déduite des sous-produits via pre-save)
    categorie: {
      type: String,
      enum: ["chaussures", "robes", "autres"],
      default: "autres",
    },

    nomClient: {
      type: String,
      required: [true, "Le nom du client est requis"],
      trim: true,
    },
    telephoneClient: {
      type: String,
      required: [true, "Le téléphone du client est requis"],
      trim: true,
    },
    destinationClient: {
      type: String,
      trim: true,
      default: "Local",
    },

    // ─── Plus utilisé directement : calculé automatiquement ───────────────
    // prixVente est maintenant = somme(produits.prixVente), géré par pre-save
    // On le garde pour compatibilité descendante (agrégations existantes)
    prixVente: { type: Number, default: 0, min: 0 },

    // Total bénéfice de la vente = somme(produits.benefice)
    totalAchat: { type: Number, default: 0 },
    totalBenefice: { type: Number, default: 0 },

    livreur: { type: mongoose.Schema.Types.ObjectId, ref: "Livreur" },
    fraisLivraison: { type: Number, default: 0, min: 0 },
    lieuLivraison: { type: String, trim: true },
    statutLivraison: {
      type: String,
      enum: ["en_attente", "en_cours", "livré", "annulé"],
      default: "en_attente",
    },
    dateLivraison: { type: Date },
    // montantTotal = prixVente (total produits) + fraisLivraison
    montantTotal: { type: Number, default: 0 },
    commentaires: { type: String, trim: true },
    raisonAnnulation: { type: String, trim: true },
    dateVente: { type: Date, default: Date.now },
    expedition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      default: null,
    },
  },
  { timestamps: true },
);

// ── Hook pre-save : recalcul complet ──────────────────────────────────────
venteSchema.pre("save", function () {
  if (this.produits && this.produits.length > 0) {
    // 1. Calculer le bénéfice de chaque sous-produit
    this.produits.forEach((p) => {
      p.benefice = (p.prixVente || 0) - (p.prixAchat || 0);
    });

    // 2. prixVente total = somme des prixVente des sous-produits
    this.prixVente = this.produits.reduce(
      (sum, p) => sum + (p.prixVente || 0),
      0,
    );

    // 3. totalBenefice = somme des bénéfices des sous-produits
    this.totalBenefice = this.produits.reduce(
      (sum, p) => sum + (p.benefice || 0),
      0,
    );

    this.totalAchat = this.produits.reduce(
      (sum, p) => sum + (p.prixAchat || 0),
    );

    // 4. Catégorie principale : si tous identiques → cette catégorie, sinon "autres"
    const cats = [
      ...new Set(this.produits.map((p) => p.categorie || "autres")),
    ];
    this.categorie = cats.length === 1 ? cats[0] : "autres";
  } else {
    // Pas de sous-produits : pas de bénéfice calculable automatiquement
    this.totalBenefice = 0;
  }

  // 5. montantTotal = prixVente + fraisLivraison
  this.montantTotal = (this.prixVente || 0) + (this.fraisLivraison || 0);
});

// ── Hook pre findOneAndUpdate ─────────────────────────────────────────────
// Uniquement pour les mises à jour directes (fraisLivraison, etc.)
venteSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
  const update = this.getUpdate();
  if (update.fraisLivraison !== undefined || update.prixVente !== undefined) {
    // On ne peut pas recalculer les sous-produits ici, on met juste à jour montantTotal
    const prixVente = update.prixVente;
    const fraisLivraison = update.fraisLivraison;
    if (prixVente !== undefined && fraisLivraison !== undefined) {
      update.montantTotal = prixVente + fraisLivraison;
      this.setUpdate(update);
    }
  }
});

venteSchema.index({ balle: 1, dateVente: -1 });
venteSchema.index({ statutLivraison: 1, dateVente: -1 });
venteSchema.index({ livreur: 1, dateVente: -1 });
venteSchema.index({ dateVente: -1 });
venteSchema.index({ telephoneClient: 1, dateVente: -1 });
venteSchema.index({ typeVente: 1, dateVente: -1 });
venteSchema.index({ destinationClient: 1, dateVente: -1 });
venteSchema.index({ categorie: 1, dateVente: -1 });

export const Vente = mongoose.model("Vente", venteSchema);
export default Vente;
