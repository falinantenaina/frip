import express from "express";
import {
  createBalle,
  deleteBalle,
  getBalle,
  getBalles,
  getBallesStats,
  recalculateStats,
  updateBalle,
} from "../controllers/balle.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(protect);

router.route("/").get(getBalles).post(authorize("admin"), createBalle);

router.get("/stats/summary", getBallesStats);

router
  .route("/:id")
  .get(getBalle)
  .put(authorize("admin"), updateBalle)
  .delete(authorize("admin"), deleteBalle);

router.put("/:id/recalculate", authorize("admin"), recalculateStats);

export default router;
