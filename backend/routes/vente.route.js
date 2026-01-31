import express from "express";
import {
  annulerVente,
  createVente,
  deleteVente,
  getVente,
  getVentes,
  getVentesStats,
  updateVente,
} from "../controllers/vente.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect);

router.route("/").get(getVentes).post(authorize("admin"), createVente);

router.get("/stats/summary", getVentesStats);

router
  .route("/:id")
  .get(getVente)
  .put(authorize("admin"), updateVente)
  .delete(authorize("admin"), deleteVente);

router.put("/:id/annuler", authorize("admin"), annulerVente);

export default router;
