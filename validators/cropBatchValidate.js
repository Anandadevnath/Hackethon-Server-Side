import * as yup from 'yup';

// Common crops grown in Bangladesh (60+ types)
const CROP_TYPES = [
  // Grains & Cereals
  'Paddy', 'Rice', 'Wheat', 'Maize', 'Barley',
  // Cash Crops
  'Jute', 'Sugarcane', 'Cotton', 'Tobacco', 'Tea',
  // Vegetables
  'Potato', 'Onion', 'Garlic', 'Tomato', 'Chili', 'Brinjal', 'Cabbage',
  'Cauliflower', 'Carrot', 'Radish', 'Spinach', 'Pumpkin', 'Bottle Gourd',
  'Bitter Gourd', 'Cucumber', 'Okra', 'Beans', 'Ginger', 'Turmeric', 'Coriander',
  // Pulses
  'Lentils', 'Chickpea', 'Mung Bean', 'Black Gram', 'Peas',
  // Oilseeds
  'Mustard', 'Groundnut', 'Sesame', 'Sunflower',
  // Fruits
  'Mango', 'Banana', 'Jackfruit', 'Litchi', 'Papaya', 'Guava',
  'Watermelon', 'Pineapple', 'Coconut', 'Orange', 'Lemon',
  // Others
  'Betel Leaf', 'Betel Nut', 'Vegetables', 'Other'
];

export const cropBatchSchema = yup.object().shape({
  cropType: yup.string().oneOf(CROP_TYPES).required('cropType is required'),
  estimatedWeightKg: yup.number().min(0).required('estimatedWeightKg is required'),
  harvestDate: yup.date().required('harvestDate is required'),
  storageLocation: yup.object().shape({
    division: yup.string().required('division is required'),
    district: yup.string().required('district is required')
  }).required('storageLocation is required'),
  storageType: yup.string().oneOf(['Jute Bag Stack', 'Silo', 'Open Area', 'Cold Storage', 'Warehouse']).required('storageType is required'),
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
  cropType: yup.string().oneOf(CROP_TYPES).optional(),
  estimatedWeightKg: yup.number().min(0).optional(),
  harvestDate: yup.date().optional(),
  storageLocation: yup.object().shape({
    division: yup.string().optional(),
    district: yup.string().optional()
  }).optional(),
  storageType: yup.string().oneOf(['Jute Bag Stack', 'Silo', 'Open Area', 'Cold Storage', 'Warehouse']).optional(),
  notes: yup.string().optional()
});
