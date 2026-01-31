import mongoose from "mongoose";

const produitSchema = new mongoose.Schema(
  {
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      required: [true, "La référence à la balle est requise"],
    },
    nom: {
      type: String,
      required: [true, "Le nom du produit est requis"],
      trim: true,
    },
    taille: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    prixVente: {
      type: Number,
      required: [true, "Le prix de vente est requis"],
      min: 0,
    },
    statut: {
      type: String,
      enum: ["disponible", "vendu", "retiré"],
      default: "disponible",
    },
    dateAjout: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index pour recherche
produitSchema.index({ balle: 1, statut: 1 });
produitSchema.index({ nom: "text", description: "text" });

const Produit = mongoose.model("Produit", produitSchema);

export default Produit;
