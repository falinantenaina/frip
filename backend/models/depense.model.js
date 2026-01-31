import mongoose from "mongoose";
const depenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "La description est requise"],
      trim: true,
    },
    montant: {
      type: Number,
      required: [true, "Le montant est requis"],
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "transport",
        "emballage",
        "publicité",
        "salaire",
        "loyer",
        "autre",
      ],
      required: [true, "Le type de dépense est requis"],
    },
    balle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balle",
      default: null, // null signifie dépense globale
    },
    dateDepense: {
      type: Date,
      default: Date.now,
    },
    recu: {
      type: String, // URL ou chemin du fichier reçu (optionnel)
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index pour recherche et rapports
depenseSchema.index({ balle: 1, dateDepense: -1 });
depenseSchema.index({ type: 1, dateDepense: -1 });
depenseSchema.index({ dateDepense: -1 });

const Depense = mongoose.model("Depense", depenseSchema);

export default Depense;
