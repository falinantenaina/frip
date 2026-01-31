import express from "express";
import {
  createLivreur,
  deleteLivreur,
  getLivreur,
  getLivreurs,
  getLivreurStats,
  updateLivreur,
} from "../controllers/livreur.controller.js";
import {
  getPaiements,
  getStatsPaiementsLivreur,
} from "../controllers/paiementLivreur.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect);

router.route("/").get(getLivreurs).post(authorize("admin"), createLivreur);

router
  .route("/:id")
  .get(getLivreur)
  .put(authorize("admin"), updateLivreur)
  .delete(authorize("admin"), deleteLivreur);

router.get("/:id/stats", getLivreurStats);

// Paiements d'un livreur
router.get("/:livreurId/paiements", getPaiements);
router.get("/:livreurId/paiements/stats", getStatsPaiementsLivreur);

export default router;
