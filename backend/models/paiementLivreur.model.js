import mongoose from "mongoose";

const paiementLivreurSchema = new mongoose.Schema(
  {
    livreur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Livreur",
      required: [true, "Le livreur est requis"],
    },
    montantVerse: {
      type: Number,
      required: [true, "Le montant versé est requis"],
      min: [0, "Le montant ne peut pas être négatif"],
    },
    datePaiement: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    ventes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vente",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index pour optimiser les requêtes
paiementLivreurSchema.index({ livreur: 1, datePaiement: -1 });

const PaiementLivreur = mongoose.model(
  "PaiementLivreur",
  paiementLivreurSchema,
);

export default PaiementLivreur;
