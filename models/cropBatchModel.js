import mongoose from "mongoose";

const cropBatchSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  cropType: { type: String, enum: ['Paddy', 'Rice'], required: true },
  estimatedWeightKg: { type: Number, required: true, min: 0 },
  harvestDate: { type: Date, required: true },
  storageLocation: {
    division: { type: String, required: true },
    district: { type: String, required: true }
  },
  storageType: { type: String, enum: ['Jute Bag Stack', 'Silo', 'Open Area'], required: true },
  notes: { type: String }
}, { timestamps: true });

export const CropBatch = mongoose.model('CropBatch', cropBatchSchema);
