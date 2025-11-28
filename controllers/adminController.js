import { Admin } from "../models/adminModel.js";

// Admin Registration - Simple (no hashing, no JWT)
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists"
      });
    }

    const newAdmin = await Admin.create({ email, password });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        _id: newAdmin._id,
        email: newAdmin.email,
        createdAt: newAdmin.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin Login - Simple (no JWT, just check email and password)
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

