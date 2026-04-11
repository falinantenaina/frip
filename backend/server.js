import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./config/database.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();
connectDB();

import authRoutes from "./routes/auth.route.js";
import balleRoutes from "./routes/balle.route.js";
import depenseRoutes from "./routes/depense.route.js";
import expeditionRoutes from "./routes/expedition.route.js";
import investissementRoutes from "./routes/investissement.route.js";
import livreurRoutes from "./routes/livreur.route.js";
import paiementLivreurRoutes from "./routes/paiementLivreur.route.js";
import produiteRoutes from "./routes/produit.route.js";
import rapportRoutes from "./routes/rapport.route.js";
import venteRoutes from "./routes/vente.route.js";
import versementRoutes from "./routes/versement.route.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://livefrip.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/balles", balleRoutes);
app.use("/api/produits", produiteRoutes);
app.use("/api/ventes", venteRoutes);
app.use("/api/depenses", depenseRoutes);
app.use("/api/livreurs", livreurRoutes);
app.use("/api/rapports", rapportRoutes);
app.use("/api/paiements-livreurs", paiementLivreurRoutes);
app.use("/api/investissements", investissementRoutes);
app.use("/api/versements", versementRoutes);
app.use("/api/expeditions", expeditionRoutes);

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Mi Chic API - Opérationnel", version: "2.0.0" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
});

process.on("unhandledRejection", (err) => {
  console.log(`❌ Erreur: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
