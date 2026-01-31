import express from "express";
const router = express.Router();

import {
  getMe,
  login,
  register,
  updatePassword,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/updateprofile", protect, updateProfile);
router.put("/updatepassword", protect, updatePassword);

export default router;
