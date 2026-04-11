import mongoose from "mongoose";

const produitVenteSchema = new mongoose.Schema(
  {
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Produit" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },
    prixVente: { type: Number, required: true, min: 0 },
    prixAchat: { type: Number, default: 0, min: 0 },
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
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },

    // Catégorie principale de la vente (déduite des produits ou saisie directement)
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
    prixVente: {
      type: Number,
      required: [true, "Le prix de vente est requis"],
      min: 0,
    },
    livreur: { type: mongoose.Schema.Types.ObjectId, ref: "Livreur" },
    fraisLivraison: { type: Number, default: 0, min: 0 },
    lieuLivraison: { type: String, trim: true },
    statutLivraison: {
      type: String,
      enum: ["en_attente", "en_cours", "livré", "annulé"],
      default: "en_attente",
    },
    dateLivraison: { type: Date },
    montantTotal: { type: Number },
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

venteSchema.pre("save", function () {
  if (this.produits && this.produits.length > 0) {
    this.prixVente = this.produits.reduce((sum, p) => sum + p.prixVente, 0);
    // Déduire la catégorie principale : si tous les produits ont la même catégorie, on l'utilise
    const cats = [
      ...new Set(this.produits.map((p) => p.categorie || "autres")),
    ];
    this.categorie = cats.length === 1 ? cats[0] : "autres";
  }
  this.montantTotal = this.prixVente + (this.fraisLivraison || 0);
});

venteSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
  const update = this.getUpdate();
  if (update.prixVente !== undefined || update.fraisLivraison !== undefined) {
    const prixVente = update.prixVente ?? this._conditions.prixVente;
    const fraisLivraison =
      update.fraisLivraison ?? this._conditions.fraisLivraison ?? 0;
    update.montantTotal = prixVente + fraisLivraison;
    this.setUpdate(update);
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
