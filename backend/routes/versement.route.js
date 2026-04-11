import express from "express";
import { createVersement, deleteVersement, getStatsVersements, getVersement, getVersements, updateVersement } from "../controllers/versement.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect);
router.get("/stats/summary", getStatsVersements);
router.route("/").get(getVersements).post(authorize("admin"), createVersement);
router.route("/:id").get(getVersement).put(authorize("admin"), updateVersement).delete(authorize("admin"), deleteVersement);
export default router;
