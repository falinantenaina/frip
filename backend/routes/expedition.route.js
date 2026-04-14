import express from "express";
import {
  ajouterProduitsExpedition,
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
  retirerProduitExpedition,
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
router.put("/:id/rattacher-vente", authorize("admin"), rattacherVente);
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
router.post("/:id/produits", authorize("admin"), ajouterProduitsExpedition);
router.delete(
  "/:id/produits/:produitId",
  authorize("admin"),
  retirerProduitExpedition,
);

export default router;
