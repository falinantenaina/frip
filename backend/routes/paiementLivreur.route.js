import express from "express";
import { createPaiement, deletePaiement, getPaiement, getPaiements, updatePaiement } from "../controllers/paiementLivreur.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect);
router.route("/").get(getPaiements).post(authorize("admin"), createPaiement);
router.route("/:id").get(getPaiement).put(authorize("admin"), updatePaiement).delete(authorize("admin"), deletePaiement);
export default router;
