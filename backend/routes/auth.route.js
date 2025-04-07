import express from "express";
import {
  signup,
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { protectedRoute } from "../middleware/protectRoute.js";

const router = express.Router();

//This route is used to check if the user is authenticated or not
router.get("/me", protectedRoute, getMe);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
