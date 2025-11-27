import { CropBatch } from "../models/cropBatchModel.js";
import { Farmer } from "../models/userModel.js";
import { isValidObjectId } from 'mongoose';

export const registerCropBatch = async (req, res) => {
  try {
    const farmerId = req.userId;
    if (!farmerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
    if (!farmer.isVerified) return res.status(403).json({ success: false, message: 'Farmer must be verified to register crop batches' });

    const { cropType, estimatedWeightKg, harvestDate, storageLocation, storageType, notes } = req.body;

    const newBatch = await CropBatch.create({
      farmerId,
      cropType,
      estimatedWeightKg,
      harvestDate,
      storageLocation,
      storageType,
      notes
    });

    return res.status(201).json({ success: true, data: newBatch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const listFarmerBatches = async (req, res) => {
  try {
    const farmerId = req.userId;
    if (!farmerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const batches = await CropBatch.find({ farmerId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: batches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCropBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const farmerId = req.userId;
    if (!farmerId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!isValidObjectId(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const batch = await CropBatch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (batch.farmerId.toString() !== farmerId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: cannot edit another farmer\'s batch' });
    }

    const allowed = ['cropType', 'estimatedWeightKg', 'harvestDate', 'storageLocation', 'storageType', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const updated = await CropBatch.findByIdAndUpdate(batchId, { $set: updates }, { new: true });
    return res.status(200).json({ success: true, message: 'Batch updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
