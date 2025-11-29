import express from "express";
import { getCropTypes, getStorageTypes, getDivisions, getAllOptions } from "../controllers/dataController.js";

const router = express.Router();

// Get all options at once (recommended for frontend)
router.get("/options", getAllOptions);

// Individual endpoints
router.get("/crop-types", getCropTypes);
router.get("/storage-types", getStorageTypes);
router.get("/divisions", getDivisions);

export default router;

