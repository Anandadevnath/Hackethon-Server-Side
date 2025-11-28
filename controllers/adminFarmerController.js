import { Farmer } from "../models/userModel.js";
import { isValidObjectId } from "mongoose";

// View all farmers
export const getAllFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: farmers.length,
      data: farmers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// View a single farmer by ID
export const getFarmerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID"
      });
    }

    const farmer = await Farmer.findById(id).select("-password");
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: farmer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a farmer
export const deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID"
      });
    }

    const farmer = await Farmer.findById(id);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    await Farmer.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Farmer deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Suspend a farmer
export const suspendFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID"
      });
    }

    const farmer = await Farmer.findById(id);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    if (farmer.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "Farmer is already suspended"
      });
    }

    farmer.isSuspended = true;
    await farmer.save();

    return res.status(200).json({
      success: true,
      message: "Farmer suspended successfully",
      data: {
        _id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        isSuspended: farmer.isSuspended
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Unsuspend a farmer
export const unsuspendFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer ID"
      });
    }

    const farmer = await Farmer.findById(id);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    if (!farmer.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "Farmer is not suspended"
      });
    }

    farmer.isSuspended = false;
    await farmer.save();

    return res.status(200).json({
      success: true,
      message: "Farmer unsuspended successfully",
      data: {
        _id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        isSuspended: farmer.isSuspended
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

