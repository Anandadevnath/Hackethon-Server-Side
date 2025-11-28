import express from "express";
import { registerAdmin, loginAdmin } from "../controllers/adminController.js";
import { getAllFarmers, getFarmerById, deleteFarmer, suspendFarmer, unsuspendFarmer } from "../controllers/adminFarmerController.js";
import { getAllCropBatches, getCropBatchesByFarmer, getCropBatchById, updateCropBatch, deleteCropBatch } from "../controllers/adminCropController.js";

const router = express.Router();

// ==================== Admin Authentication ====================
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// ==================== Farmer Management ====================
router.get("/farmers", getAllFarmers);
router.get("/farmers/:id", getFarmerById);
router.delete("/farmers/:id", deleteFarmer);
router.patch("/farmers/:id/suspend", suspendFarmer);
router.patch("/farmers/:id/unsuspend", unsuspendFarmer);

// ==================== Crop Batch Management ====================
router.get("/crops", getAllCropBatches);
router.get("/crops/farmer/:farmerId", getCropBatchesByFarmer);  // Must come before :id route
router.get("/crops/:id", getCropBatchById);
router.patch("/crops/:id", updateCropBatch);
router.delete("/crops/:id", deleteCropBatch);

export default router;

