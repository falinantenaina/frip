import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { connectDB } from "./config/database.js";
import { errorHandler } from "./middlewares/error.middleware.js";

// Charger les variables d'environnement
dotenv.config();

// Connecter à la base de données
connectDB();

import authRoutes from "./routes/auth.route.js";
import balleRoutes from "./routes/balle.route.js";
import depenseRoutes from "./routes/depense.route.js";
import investissementRoutes from "./routes/investissement.route.js";
import livreurRoutes from "./routes/livreur.route.js";
import paiementLivreurRoutes from "./routes/paiementLivreur.route.js";
import produiteRoutes from "./routes/produit.route.js";
import rapportRoutes from "./routes/rapport.route.js";
import venteRoutes from "./routes/vente.route.js";
import versementRoutes from "./routes/versement.route.js";

const __dirname = path.resolve();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
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

// Route de test
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API Friperie Live - Backend opérationnel",
    version: "1.0.0",
  });
});

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");

  console.log(frontendPath);
  app.use(express.static(frontendPath));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// Gestionnaire d'erreurs
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`,
  );
});

// Gestion des rejets de promesses non gérés
process.on("unhandledRejection", (err, promise) => {
  console.log(`❌ Erreur: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
