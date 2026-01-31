import express from "express";
import {
  getRapportGlobal,
  getRapportParBalle,
  getRapportParJour,
  getRapportParMois,
  getRapportParSemaine,
} from "../controllers/rapport.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(protect);

router.get("/global", getRapportGlobal);
router.get("/par-jour", getRapportParJour);
router.get("/par-semaine", getRapportParSemaine);
router.get("/par-mois", getRapportParMois);
router.get("/par-balle", getRapportParBalle);

export default router;
