import express from "express";
import { createInvestissement, deleteInvestissement, getInvestissement, getInvestissements, getStatsInvestissements, updateInvestissement } from "../controllers/investissement.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(protect);
router.get("/stats/summary", getStatsInvestissements);
router.route("/").get(getInvestissements).post(authorize("admin"), createInvestissement);
router.route("/:id").get(getInvestissement).put(authorize("admin"), updateInvestissement).delete(authorize("admin"), deleteInvestissement);
export default router;
