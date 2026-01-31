import mongoose from "mongoose";

const venteSchema = new mongoose.Schema(
  {
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      required: [true, "La référence à la balle est requise"],
    },
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produit",
    },
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
    // Détails produit (copie pour historique)
    nomProduit: {
      type: String,
      required: true,
    },
    tailleProduit: {
      type: String,
    },
    prixVente: {
      type: Number,
      required: [true, "Le prix de vente est requis"],
      min: 0,
    },
    // Livraison
    livreur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livreur",
    },
    fraisLivraison: {
      type: Number,
      default: 0,
      min: 0,
    },
    lieuLivraison: {
      type: String,
      required: [true, "Le lieu de livraison est requis"],
      trim: true,
    },
    statutLivraison: {
      type: String,
      enum: ["en_attente", "en_cours", "livré", "annulé"],
      default: "en_attente",
    },
    dateLivraison: {
      type: Date,
    },
    // Montants
    montantTotal: {
      type: Number,
      // required: true,
    },
    // Notes et commentaires
    commentaires: {
      type: String,
      trim: true,
    },
    raisonAnnulation: {
      type: String,
      trim: true,
    },
    dateVente: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Calculer le montant total avant sauvegarde
venteSchema.pre("save", function () {
  this.montantTotal = this.prixVente + this.fraisLivraison;
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

// Index pour recherche et rapports
venteSchema.index({ balle: 1, dateVente: -1 });
venteSchema.index({ statutLivraison: 1, dateVente: -1 });
venteSchema.index({ livreur: 1, dateVente: -1 });
venteSchema.index({ dateVente: -1 });

export const Vente = mongoose.model("Vente", venteSchema);

export default Vente;
