import mongoose from "mongoose";
const investissementSchema = new mongoose.Schema({
  montant: { type: Number, required: true, min: 0 },
  dateInvestissement: { type: Date, default: Date.now },
  description: { type: String, trim: true },
  type: { type: String, enum: ["capital","complement","autre"], default: "autre" },
}, { timestamps: true });
investissementSchema.index({ dateInvestissement: -1 });
const Investissement = mongoose.model("Investissement", investissementSchema);
export default Investissement;
