import express from "express";
import {
  createLabel,
  getLabels,
  getLabelById,
  updateLabel,
  deleteLabel,
  mergeLabels
} from "../../controllers/v1/labelController.js";
import { requireJwtAuthentication, requireAuthentication, requireAdmin } from "../../middlewares/auth.js";
const router = express.Router();

    //POST
router.post("/", requireJwtAuthentication, createLabel);
router.post("/:sourceLabelId/merge-into/:targetLabelId", requireJwtAuthentication, mergeLabels);
    //GET
router.get("/", requireAuthentication, getLabels);
router.get("/:id", requireAuthentication, getLabelById);

    //PUT
router.put("/:id", requireJwtAuthentication, updateLabel);

    //DELETE
router.delete("/:id", requireAdmin, deleteLabel);

export default router;