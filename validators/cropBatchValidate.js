import * as yup from 'yup';

export const cropBatchSchema = yup.object().shape({
  cropType: yup.string().oneOf(['Paddy','Rice']).required('cropType is required'),
  estimatedWeightKg: yup.number().min(0).required('estimatedWeightKg is required'),
  harvestDate: yup.date().required('harvestDate is required'),
  storageLocation: yup.object().shape({
    division: yup.string().required('division is required'),
    district: yup.string().required('district is required')
  }).required('storageLocation is required'),
  storageType: yup.string().oneOf(['Jute Bag Stack','Silo','Open Area']).required('storageType is required'),
  notes: yup.string().optional()
});

export const validateCropBatch = (schema) => (req, res, next) => {
  try {
    schema.validateSync(req.body, { abortEarly: false });
    return next();
  } catch (err) {
    const errors = err.inner ? err.inner.map((e) => e.message) : [err.message];
    return res.status(400).json({ success: false, errors });
  }
};

// Partial update schema for editing an existing batch
export const cropBatchUpdateSchema = yup.object().shape({
  cropType: yup.string().oneOf(['Paddy','Rice']).optional(),
  estimatedWeightKg: yup.number().min(0).optional(),
  harvestDate: yup.date().optional(),
  storageLocation: yup.object().shape({
    division: yup.string().optional(),
    district: yup.string().optional()
  }).optional(),
  storageType: yup.string().oneOf(['Jute Bag Stack','Silo','Open Area']).optional(),
  notes: yup.string().optional()
});
