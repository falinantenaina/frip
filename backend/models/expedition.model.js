import mongoose from "mongoose";

const expeditionSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de l'expédition est requis"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "La destination est requise"],
      trim: true,
      default: "Antsirabe",
    },
    dateExpedition: {
      type: Date,
      default: Date.now,
    },

    // ── Ventes rattachées (remplace l'ancien tableau produits) ───────────────
    ventes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vente",
      },
    ],

    // ── Frais ────────────────────────────────────────────────────────────────
    fraisColis: {
      type: Number,
      default: 0,
      min: 0,
    },
    salaireCommissionnaire: {
      type: Number,
      default: 0,
      min: 0,
    },
    modeCommissionnaire: {
      type: String,
      enum: ["fixe", "pourcentage"],
      default: "fixe",
    },
    pourcentageCommissionnaire: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ── Totaux (recalculés à chaque save depuis les ventes) ──────────────────
    totalFrais: {
      type: Number,
      default: 0,
    },
    totalVentes: {
      type: Number,
      default: 0,
    },
    totalBeneficeVentes: {
      type: Number,
      default: 0,
    },
    benefice: {
      type: Number,
      default: 0,
    },

    statut: {
      type: String,
      enum: ["en_preparation", "expédiée", "livrée", "annulée"],
      default: "en_preparation",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

// ── Recalcul des totaux à partir des ventes peuplées ────────────────────────
// Appelé manuellement depuis le controller (après populate).
expeditionSchema.methods.recalculerDepuisVentes = function (ventesPopulees) {
  // 1. Totaux ventes
  this.totalVentes = ventesPopulees
    .filter((v) => v.statutLivraison !== "annulé")
    .reduce((sum, v) => sum + (v.prixVente || 0), 0);

  this.totalBeneficeVentes = ventesPopulees
    .filter((v) => v.statutLivraison !== "annulé")
    .reduce((sum, v) => sum + (v.totalBenefice || 0), 0);

  // 2. Salaire commissionnaire selon le mode
  if (this.modeCommissionnaire === "pourcentage") {
    this.salaireCommissionnaire =
      (this.totalVentes * (this.pourcentageCommissionnaire || 0)) / 100;
  }

  // 3. Total frais
  this.totalFrais = (this.fraisColis || 0) + (this.salaireCommissionnaire || 0);

  // 4. Bénéfice net
  this.benefice = this.totalBeneficeVentes - this.totalFrais;
};

// ── Hook pre-save : recalcule les frais sans les ventes (si pas peuplées) ───
// Le recalcul complet (avec ventes) doit être fait explicitement via le
// controller avec recalculerDepuisVentes() avant save().
expeditionSchema.pre("save", function () {
  if (this.modeCommissionnaire === "pourcentage") {
    this.salaireCommissionnaire =
      (this.totalVentes * (this.pourcentageCommissionnaire || 0)) / 100;
  }
  this.totalFrais = (this.fraisColis || 0) + (this.salaireCommissionnaire || 0);
  this.benefice = this.totalBeneficeVentes - this.totalFrais;
});

expeditionSchema.index({ dateExpedition: -1 });
expeditionSchema.index({ destination: 1, dateExpedition: -1 });
expeditionSchema.index({ statut: 1 });

const Expedition = mongoose.model("Expedition", expeditionSchema);
export default Expedition;
