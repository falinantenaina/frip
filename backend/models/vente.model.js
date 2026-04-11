import mongoose from "mongoose";

// Sous-schema pour chaque produit dans une vente
const produitVenteSchema = new mongoose.Schema(
  {
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Produit" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },
    prixVente: { type: Number, required: true, min: 0 },
    // Prix d'achat (pour ventes libres — calcul bénéfice)
    prixAchat: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const venteSchema = new mongoose.Schema(
  {
    // Balle optionnelle (null = vente libre sans balle)
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      default: null,
    },

    // Type de vente
    typeVente: {
      type: String,
      enum: ["balle", "libre"],
      default: "balle",
    },

    // Tableau de produits
    produits: [produitVenteSchema],

    // Champs de compatibilité
    produit: { type: mongoose.Schema.Types.ObjectId, ref: "Produit" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },

    // Informations client
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

    // Destination client (pour les expéditions)
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

    // Livraison locale
    livreur: { type: mongoose.Schema.Types.ObjectId, ref: "Livreur" },
    fraisLivraison: { type: Number, default: 0, min: 0 },
    lieuLivraison: {
      type: String,
      trim: true,
    },
    statutLivraison: {
      type: String,
      enum: ["en_attente", "en_cours", "livré", "annulé"],
      default: "en_attente",
    },
    dateLivraison: { type: Date },

    // Montants
    montantTotal: { type: Number },

    // Notes
    commentaires: { type: String, trim: true },
    raisonAnnulation: { type: String, trim: true },
    dateVente: { type: Date, default: Date.now },
    // Référence expédition (si la vente est rattachée à une expédition)
    expedition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expedition",
      default: null,
    },
  },
  { timestamps: true },
);

// Calculer le montant total avant sauvegarde
venteSchema.pre("save", function () {
  if (this.produits && this.produits.length > 0) {
    this.prixVente = this.produits.reduce((sum, p) => sum + p.prixVente, 0);
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

export const Vente = mongoose.model("Vente", venteSchema);
export default Vente;
