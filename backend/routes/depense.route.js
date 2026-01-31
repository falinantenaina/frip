import express from "express";
import {
  createDepense,
  deleteDepense,
  getDepense,
  getDepenses,
  getDepensesStats,
  updateDepense,
} from "../controllers/depense.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(protect);

router.route("/").get(getDepenses).post(authorize("admin"), createDepense);

router.get("/stats/summary", getDepensesStats);

router
  .route("/:id")
  .get(getDepense)
  .put(authorize("admin"), updateDepense)
  .delete(authorize("admin"), deleteDepense);

export default router;
