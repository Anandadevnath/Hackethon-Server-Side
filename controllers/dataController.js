import { CROP_TYPES, STORAGE_TYPES, DIVISIONS } from "../data/cropTypes.js";

// Get all crop types with bilingual names
export const getCropTypes = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: CROP_TYPES.length,
      data: CROP_TYPES
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all storage types with bilingual names
export const getStorageTypes = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: STORAGE_TYPES.length,
      data: STORAGE_TYPES
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all divisions with bilingual names
export const getDivisions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: DIVISIONS.length,
      data: DIVISIONS
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all data options (crop types, storage types, divisions)
export const getAllOptions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        cropTypes: CROP_TYPES,
        storageTypes: STORAGE_TYPES,
        divisions: DIVISIONS
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

