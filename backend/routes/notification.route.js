import express from "express";

import {
  getAllNotification,
  deleteAllNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { protectedRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/", protectedRoute, getAllNotification);
router.delete("/", protectedRoute, deleteAllNotification);
router.delete("/:id", protectedRoute, deleteNotification);

export default router;
