import mongoose from "mongoose";
const paiementLivreurSchema = new mongoose.Schema({
  livreur: { type: mongoose.Schema.Types.ObjectId, ref: "Livreur", required: true },
  montantVerse: { type: Number, required: true, min: 0 },
  datePaiement: { type: Date, default: Date.now },
  description: { type: String, trim: true },
  ventes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vente" }],
}, { timestamps: true });
paiementLivreurSchema.index({ livreur: 1, datePaiement: -1 });
const PaiementLivreur = mongoose.model("PaiementLivreur", paiementLivreurSchema);
export default PaiementLivreur;
