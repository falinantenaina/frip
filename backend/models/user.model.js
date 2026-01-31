import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    motDePasse: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "investisseur"],
      default: "admin",
    },
    telephone: {
      type: String,
      trim: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Hasher le mot de passe avant de sauvegarder
userSchema.pre("save", async function () {
  if (!this.isModified("motDePasse")) return;

  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparerMotDePasse = async function (motDePasseCandidat) {
  return await bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

const User = mongoose.model("User", userSchema);

export default User;
