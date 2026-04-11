import mongoose from "mongoose";

// Sous-schema pour chaque produit dans une expédition
const produitExpeditionSchema = new mongoose.Schema(
  {
    vente: { type: mongoose.Schema.Types.ObjectId, ref: "Vente" },
    nomProduit: { type: String, required: true },
    tailleProduit: { type: String },
    prixVente: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const expeditionSchema = new mongoose.Schema(
  {
    // Nom de l'expédition ex: "Vague 112", "Produit Noël"
    nom: {
      type: String,
      required: [true, "Le nom de l'expédition est requis"],
      trim: true,
    },

    // Destination principale : Antsirabe ou autre
    destination: {
      type: String,
      required: [true, "La destination est requise"],
      trim: true,
      default: "Antsirabe",
    },

    // Date d'expédition
    dateExpedition: {
      type: Date,
      default: Date.now,
    },

    // Produits expédiés (liens vers ventes ou saisie manuelle)
    produits: [produitExpeditionSchema],

    // Frais colis (transport/emballage de l'expédition)
    fraisColis: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Salaire commissionnaire
    salaireCommissionnaire: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Mode calcul commissionnaire
    modeCommissionnaire: {
      type: String,
      enum: ["fixe", "pourcentage"],
      default: "fixe",
    },

    // Si pourcentage : % sur le prix de vente total
    pourcentageCommissionnaire: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Total des frais de cette expédition
    totalFrais: {
      type: Number,
      default: 0,
    },

    // Total ventes expédiées
    totalVentes: {
      type: Number,
      default: 0,
    },

    // Statut
    statut: {
      type: String,
      enum: ["en_preparation", "expédiée", "livrée", "annulée"],
      default: "en_preparation",
    },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Calculer les totaux avant sauvegarde (create / save)
expeditionSchema.pre("save", function () {
  this.totalVentes = this.produits.reduce((sum, p) => sum + p.prixVente, 0);
  if (this.modeCommissionnaire === "pourcentage") {
    this.salaireCommissionnaire =
      (this.totalVentes * this.pourcentageCommissionnaire) / 100;
  }
  this.totalFrais = this.fraisColis + this.salaireCommissionnaire;
});

// Recalculer aussi lors de findOneAndUpdate (PUT)
expeditionSchema.pre(["findOneAndUpdate", "updateOne"], async function () {
  const update = this.getUpdate();
  // Récupérer le doc actuel pour connaître les produits et valeurs non modifiées
  const doc = await this.model.findOne(this.getFilter()).lean();
  if (!doc) return;

  const fraisColis =
    update.fraisColis !== undefined ? update.fraisColis : doc.fraisColis;
  const modeCommissionnaire =
    update.modeCommissionnaire !== undefined
      ? update.modeCommissionnaire
      : doc.modeCommissionnaire;
  const pourcentage =
    update.pourcentageCommissionnaire !== undefined
      ? update.pourcentageCommissionnaire
      : doc.pourcentageCommissionnaire;
  let salaire =
    update.salaireCommissionnaire !== undefined
      ? update.salaireCommissionnaire
      : doc.salaireCommissionnaire;
  const totalVentes = doc.totalVentes; // produits non modifiés ici

  if (modeCommissionnaire === "pourcentage") {
    salaire = (totalVentes * pourcentage) / 100;
    update.salaireCommissionnaire = salaire;
  }
  update.totalFrais = fraisColis + salaire;
  this.setUpdate(update);
});

expeditionSchema.index({ dateExpedition: -1 });
expeditionSchema.index({ destination: 1, dateExpedition: -1 });
expeditionSchema.index({ statut: 1 });

const Expedition = mongoose.model("Expedition", expeditionSchema);
export default Expedition;
