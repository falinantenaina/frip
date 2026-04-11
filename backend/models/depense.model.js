import mongoose from "mongoose";
const depenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  montant: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ["transport","emballage","publicité","salaire","loyer","autre"], required: true },
  balle: { type: mongoose.Schema.Types.ObjectId, ref: "Balle", default: null },
  dateDepense: { type: Date, default: Date.now },
  recu: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });
depenseSchema.index({ balle: 1, dateDepense: -1 });
depenseSchema.index({ type: 1, dateDepense: -1 });
const Depense = mongoose.model("Depense", depenseSchema);
export default Depense;
