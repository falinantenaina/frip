import express from "express";
import {
  createProduit,
  createProduitsBulk,
  deleteProduit,
  getProduit,
  getProduits,
  getProduitsDisponibles,
  updateProduit,
} from "../controllers/produit.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.use(protect);

router.route("/").get(getProduits).post(authorize("admin"), createProduit);

router.post("/bulk", authorize("admin"), createProduitsBulk);

router.get("/balle/:balleId/disponibles", getProduitsDisponibles);

router
  .route("/:id")
  .get(getProduit)
  .put(authorize("admin"), updateProduit)
  .delete(authorize("admin"), deleteProduit);

export default router;
