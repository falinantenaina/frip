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

router.route("/").get(getVentes).post(authorize("admin"), createVente);

router.get("/stats/summary", getVentesStats);

router
  .route("/:id")
  .get(getVente)
  .put(authorize("admin"), updateVente)
  .delete(authorize("admin"), deleteVente);

router.put(
  "/:id/produits/:produitEntryId",
  authorize("admin"),
  modifierProduitVente,
);

router.put("/:id/annuler", authorize("admin"), annulerVente);

// ── Nouvelles routes pour la gestion multi-produits ─────────────────────────
// Ajouter un produit à une vente existante (appel explicite depuis le front)
router.post("/:id/ajouter-produit", authorize("admin"), ajouterProduitVente);

// Supprimer un produit d'une vente
router.delete(
  "/:id/produits/:produitEntryId",
  authorize("admin"),
  supprimerProduitVente,
);

export default router;
