import mongoose from "mongoose";

const versementSchema = new mongoose.Schema(
  {
    montant: {
      type: Number,
      required: [true, "Le montant est requis"],
      min: [0, "Le montant ne peut pas être négatif"],
    },
    dateVersement: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["remboursement", "benefice", "autre"],
      default: "autre",
    },
  },
  {
    timestamps: true,
  },
);

// Index pour optimiser les requêtes
versementSchema.index({ dateVersement: -1 });

const Versement = mongoose.model("Versement", versementSchema);

export default Versement;
