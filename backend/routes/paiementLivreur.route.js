import express from "express";
import {
  createPaiement,
  deletePaiement,
  getPaiement,
  getPaiements,
  updatePaiement,
} from "../controllers/paiementLivreur.controller.js";

const router = express.Router();

import { authorize, protect } from "../middlewares/auth.middleware.js";

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Routes principales
router.route("/").get(getPaiements).post(authorize("admin"), createPaiement);

router
  .route("/:id")
  .get(getPaiement)
  .put(authorize("admin"), updatePaiement)
  .delete(authorize("admin"), deletePaiement);

export default router;
