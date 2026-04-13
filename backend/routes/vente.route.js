import express from "express";
import {
  ajouterProduitVente,
  annulerVente,
  createVente,
  deleteVente,
  getVente,
  getVentes,
  getVentesStats,
  modifierProduitVente,
  supprimerProduitVente,
  updateVente,
} from "../controllers/vente.controller.js";
import { authorize, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);

// Stats (avant /:id pour éviter la confusion de route)
router.get("/stats/summary", getVentesStats);

// CRUD de base
router.route("/").get(getVentes).post(authorize("admin"), createVente);
router
  .route("/:id")
  .get(getVente)
  .put(authorize("admin"), updateVente) // modif infos générales uniquement
  .delete(authorize("admin"), deleteVente);

// Gestion des produits d'une vente
router.post("/:id/produits", authorize("admin"), ajouterProduitVente);
router
  .route("/:id/produits/:produitEntryId")
  .put(authorize("admin"), modifierProduitVente)
  .delete(authorize("admin"), supprimerProduitVente);

// Annulation
router.put("/:id/annuler", authorize("admin"), annulerVente);

export default router;
