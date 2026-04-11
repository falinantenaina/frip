import mongoose from "mongoose";

const produitExpeditionSchema = new mongoose.Schema(
  {
    vente: { type: mongoose.Schema.Types.ObjectId, ref: "Vente" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },
    prixVente: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

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
    produits: [produitExpeditionSchema],
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
    totalFrais: {
      type: Number,
      default: 0,
    },
    totalVentes: {
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

// ── Méthode utilitaire de recalcul (réutilisable) ────────────────────────────
expeditionSchema.methods.recalculer = function () {
  // 1. Total ventes depuis les produits
  this.totalVentes = this.produits.reduce(
    (sum, p) => sum + (p.prixVente || 0),
    0,
  );

  // 2. Salaire commissionnaire selon le mode
  if (this.modeCommissionnaire === "pourcentage") {
    this.salaireCommissionnaire =
      (this.totalVentes * (this.pourcentageCommissionnaire || 0)) / 100;
  }

  // 3. Total frais
  this.totalFrais = (this.fraisColis || 0) + (this.salaireCommissionnaire || 0);
};

// ── Hook pre('save') — déclenché par .save() ─────────────────────────────────
expeditionSchema.pre("save", function () {
  this.recalculer();
});

// ── Hook pre findOneAndUpdate — déclenché par findByIdAndUpdate ──────────────
// IMPORTANT : on récupère le doc complet pour recalculer correctement
expeditionSchema.pre(["findOneAndUpdate", "updateOne"], async function () {
  const update = this.getUpdate();
  const doc = await this.model.findOne(this.getFilter()).lean();
  if (!doc) return;

  // Fusionner les champs modifiés avec le doc existant
  const fraisColis =
    update.fraisColis !== undefined
      ? Number(update.fraisColis)
      : doc.fraisColis || 0;
  const modeCommissionnaire =
    update.modeCommissionnaire !== undefined
      ? update.modeCommissionnaire
      : doc.modeCommissionnaire;
  const pourcentage =
    update.pourcentageCommissionnaire !== undefined
      ? Number(update.pourcentageCommissionnaire)
      : doc.pourcentageCommissionnaire || 0;

  // totalVentes : recalculer depuis les produits (doc existant, les produits ne changent pas via update direct)
  const produits =
    update.produits !== undefined ? update.produits : doc.produits;
  const totalVentes = (produits || []).reduce(
    (sum, p) => sum + (p.prixVente || 0),
    0,
  );

  // Recalcul salaire si mode pourcentage
  let salaire =
    update.salaireCommissionnaire !== undefined
      ? Number(update.salaireCommissionnaire)
      : doc.salaireCommissionnaire || 0;

  if (modeCommissionnaire === "pourcentage") {
    salaire = (totalVentes * pourcentage) / 100;
    update.salaireCommissionnaire = salaire;
  }

  update.totalVentes = totalVentes;
  update.totalFrais = fraisColis + salaire;
  this.setUpdate(update);
});

expeditionSchema.index({ dateExpedition: -1 });
expeditionSchema.index({ destination: 1, dateExpedition: -1 });
expeditionSchema.index({ statut: 1 });

const Expedition = mongoose.model("Expedition", expeditionSchema);
export default Expedition;
