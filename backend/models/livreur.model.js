import mongoose from "mongoose";
const livreurSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  telephone: { type: String, required: true, trim: true },
  telephoneSecondaire: { type: String, trim: true },
  adresse: { type: String, trim: true },
  actif: { type: Boolean, default: true },
  nombreLivraisons: { type: Number, default: 0 },
  notes: { type: String, trim: true },
}, { timestamps: true });
const Livreur = mongoose.model("Livreur", livreurSchema);
export default Livreur;
