import mongoose from "mongoose";

const cropBatchSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  cropType: { 
    type: String, 
    enum: [
      // Grains & Cereals (শস্য)
      'Paddy',        // ধান
      'Rice',         // চাল
      'Wheat',        // গম
      'Maize',        // ভুট্টা
      'Barley',       // যব
      
      // Cash Crops (অর্থকরী ফসল)
      'Jute',         // পাট
      'Sugarcane',    // আখ
      'Cotton',       // তুলা
      'Tobacco',      // তামাক
      'Tea',          // চা
      
      // Vegetables (সবজি)
      'Potato',       // আলু
      'Onion',        // পেঁয়াজ
      'Garlic',       // রসুন
      'Tomato',       // টমেটো
      'Chili',        // মরিচ
      'Brinjal',      // বেগুন
      'Cabbage',      // বাঁধাকপি
      'Cauliflower',  // ফুলকপি
      'Carrot',       // গাজর
      'Radish',       // মুলা
      'Spinach',      // পালং শাক
      'Pumpkin',      // কুমড়া
      'Bottle Gourd', // লাউ
      'Bitter Gourd', // করলা
      'Cucumber',     // শসা
      'Okra',         // ঢেঁড়স
      'Beans',        // শিম
      'Ginger',       // আদা
      'Turmeric',     // হলুদ
      'Coriander',    // ধনিয়া
      
      // Pulses (ডাল)
      'Lentils',      // মসুর ডাল
      'Chickpea',     // ছোলা
      'Mung Bean',    // মুগ ডাল
      'Black Gram',   // মাষকলাই
      'Peas',         // মটরশুঁটি
      
      // Oilseeds (তৈলবীজ)
      'Mustard',      // সরিষা
      'Groundnut',    // চীনাবাদাম
      'Sesame',       // তিল
      'Sunflower',    // সূর্যমুখী
      
      // Fruits (ফল)
      'Mango',        // আম
      'Banana',       // কলা
      'Jackfruit',    // কাঁঠাল
      'Litchi',       // লিচু
      'Papaya',       // পেঁপে
      'Guava',        // পেয়ারা
      'Watermelon',   // তরমুজ
      'Pineapple',    // আনারস
      'Coconut',      // নারিকেল
      'Orange',       // কমলা
      'Lemon',        // লেবু
      
      // Others (অন্যান্য)
      'Betel Leaf',   // পান
      'Betel Nut',    // সুপারি
      'Vegetables',   // শাকসবজি (mixed)
      'Other'         // অন্যান্য
    ], 
    required: true 
  },
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
