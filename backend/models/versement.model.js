import mongoose from "mongoose";
const versementSchema = new mongoose.Schema({
  montant: { type: Number, required: true, min: 0 },
  dateVersement: { type: Date, default: Date.now },
  description: { type: String, trim: true },
  type: { type: String, enum: ["remboursement","benefice","autre"], default: "autre" },
}, { timestamps: true });
versementSchema.index({ dateVersement: -1 });
const Versement = mongoose.model("Versement", versementSchema);
export default Versement;
