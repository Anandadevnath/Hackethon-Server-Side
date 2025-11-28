import { CropBatch } from "../models/cropBatchModel.js";
import { Farmer } from "../models/userModel.js";
import { isValidObjectId } from "mongoose";

// View all crop batches
export const getAllCropBatches = async (req, res) => {
  try {
    const batches = await CropBatch.find()
      .populate("farmerId", "name email phone location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// View crop batches of a specific farmer
export const getCropBatchesByFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;

    if (!isValidObjectId(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID"
      });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    const batches = await CropBatch.find({ farmerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      farmer: {
        _id: farmer._id,
        name: farmer.name,
        email: farmer.email
      },
      count: batches.length,
      data: batches
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// View a single crop batch by ID
export const getCropBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID"
      });
    }

    const batch = await CropBatch.findById(id).populate("farmerId", "name email phone location");
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update crop batch basic fields (optional feature)
export const updateCropBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID"
      });
    }

    const batch = await CropBatch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    const allowed = ["cropType", "estimatedWeightKg", "harvestDate", "storageLocation", "storageType", "notes"];
    const updates = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updatable fields provided"
      });
    }

    const updated = await CropBatch.findByIdAndUpdate(id, { $set: updates }, { new: true });

    return res.status(200).json({
      success: true,
      message: "Crop batch updated successfully",
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a crop batch
export const deleteCropBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID"
      });
    }

    const batch = await CropBatch.findById(id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Crop batch not found"
      });
    }

    await CropBatch.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Crop batch deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

