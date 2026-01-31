import express from "express";
import {
  createInvestissement,
  deleteInvestissement,
  getInvestissement,
  getInvestissements,
  getStatsInvestissements,
  updateInvestissement,
} from "../controllers/investissement.controller.js";

const router = express.Router();

import { authorize, protect } from "../middlewares/auth.middleware.js";

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Routes de statistiques
router.get("/stats/summary", getStatsInvestissements);

// Routes principales
router
  .route("/")
  .get(getInvestissements)
  .post(authorize("admin"), createInvestissement);

router
  .route("/:id")
  .get(getInvestissement)
  .put(authorize("admin"), updateInvestissement)
  .delete(authorize("admin"), deleteInvestissement);

export default router;
