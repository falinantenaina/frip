import mongoose from "mongoose";

const investissementSchema = new mongoose.Schema(
  {
    montant: {
      type: Number,
      required: [true, "Le montant est requis"],
      min: [0, "Le montant ne peut pas être négatif"],
    },
    dateInvestissement: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["capital", "complement", "autre"],
      default: "autre",
    },
  },
  {
    timestamps: true,
  },
);

// Index pour optimiser les requêtes
investissementSchema.index({ dateInvestissement: -1 });

const Investissement = mongoose.model("Investissement", investissementSchema);

export default Investissement;
