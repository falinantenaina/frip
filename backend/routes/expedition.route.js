import express from "express";
import {
  annulerVenteExpedition,
  createExpedition,
  deleteExpedition,
  detacherVenteExpedition,
  expedierExpedition,
  getExpedition,
  getExpeditions,
  getExpeditionsEnPreparation,
  getExpeditionsStats,
  getVentesDisponiblesExpedition,
  rattacherVente,
  rattacherVentesBulk,
  updateExpedition,
} from "../controllers/expedition.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.get("/stats/summary", getExpeditionsStats);
router.get("/ventes-disponibles", getVentesDisponiblesExpedition);
router.get("/en-preparation", getExpeditionsEnPreparation);

router
  .route("/")
  .get(getExpeditions)
  .post(authorize("admin"), createExpedition);

router
  .route("/:id")
  .get(getExpedition)
  .put(authorize("admin"), updateExpedition)
  .delete(authorize("admin"), deleteExpedition);

router.put("/:id/expedier", authorize("admin"), expedierExpedition);

// Rattacher une ou plusieurs ventes
router.put("/:id/rattacher-vente", authorize("admin"), rattacherVente);
router.post("/:id/ventes", authorize("admin"), rattacherVentesBulk);

// Annuler / détacher une vente de l'expédition
router.put(
  "/:id/annuler-vente/:venteId",
  authorize("admin"),
  annulerVenteExpedition,
);
router.put(
  "/:id/detacher-vente/:venteId",
  authorize("admin"),
  detacherVenteExpedition,
);

// NOTE : Les anciennes routes /:id/produits et /:id/produits/:produitId
// ont été supprimées. Gérez les produits directement via les routes /ventes.

export default router;
