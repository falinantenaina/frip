import mongoose from "mongoose";

const balleSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de la balle est requis"],
      trim: true,
    },
    numero: {
      type: String,
      required: [true, "Le numéro de la balle est requis"],
      unique: true,
      trim: true,
    },
    prixAchat: {
      type: Number,
      required: [true, "Le prix d'achat est requis"],
      min: 0,
    },
    dateAchat: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    statut: {
      type: String,
      enum: ["en_stock", "en_vente", "vendu", "archivé"],
      default: "en_stock",
    },
    // Statistiques calculées
    totalVentes: {
      type: Number,
      default: 0,
    },
    nombreVentes: {
      type: Number,
      default: 0,
    },
    depensesLiees: {
      type: Number,
      default: 0,
    },
    benefice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Méthode pour calculer le bénéfice
balleSchema.methods.calculerBenefice = function () {
  this.benefice = this.totalVentes - this.prixAchat - this.depensesLiees;
  return this.benefice;
};

// Index pour recherche rapide
balleSchema.index({ numero: 1, nom: 1 });

const Balle = mongoose.model("Balle", balleSchema);

export default Balle;
