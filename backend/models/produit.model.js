import mongoose from "mongoose";
const produitSchema = new mongoose.Schema({
  balle: { type: mongoose.Schema.Types.ObjectId, ref: "Balle", required: true },
  nom: { type: String, required: true, trim: true },
  taille: { type: String, trim: true },
  description: { type: String, trim: true },
  prixVente: { type: Number, required: true, min: 0 },
  statut: { type: String, enum: ["disponible","vendu","retiré"], default: "disponible" },
  dateAjout: { type: Date, default: Date.now },
}, { timestamps: true });
produitSchema.index({ balle: 1, statut: 1 });
const Produit = mongoose.model("Produit", produitSchema);
export default Produit;
