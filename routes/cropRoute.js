import express from 'express';
import { registerCropBatch, listFarmerBatches, updateCropBatch } from '../controllers/cropBatchController.js';
import { isAuthenticated } from '../middleware/isAuthenticated.js';
import { cropBatchSchema, cropBatchUpdateSchema, validateCropBatch } from '../validators/cropBatchValidate.js';

const router = express.Router();

router.post('/', isAuthenticated, validateCropBatch(cropBatchSchema), registerCropBatch);
router.get('/', isAuthenticated, listFarmerBatches);
router.patch('/update/:id', isAuthenticated, validateCropBatch(cropBatchUpdateSchema), updateCropBatch);

export default router;
