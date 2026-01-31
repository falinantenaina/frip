import express from "express";
import {
  createVersement,
  deleteVersement,
  getStatsVersements,
  getVersement,
  getVersements,
  updateVersement,
} from "../controllers/versement.controller.js";

const router = express.Router();

import { authorize, protect } from "../middlewares/auth.middleware.js";

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Routes de statistiques
router.get("/stats/summary", getStatsVersements);

// Routes principales
router.route("/").get(getVersements).post(authorize("admin"), createVersement);

router
  .route("/:id")
  .get(getVersement)
  .put(authorize("admin"), updateVersement)
  .delete(authorize("admin"), deleteVersement);

export default router;
