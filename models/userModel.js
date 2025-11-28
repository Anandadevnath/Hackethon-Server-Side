import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema({
   name: { type: String, required: true },
   email: { type: String, required: true, unique: true },
   phone: { type: String, required: true },
   password: { type: String },
   avatar: { type: String },
   preferredLanguage: {
      type: String,
      enum: ["bn", "en"],
      default: "bn"
   },

   location: {
      division: { type: String, required: true },
      district: { type: String, required: true },
      upazila: { type: String, required: true }
   },
   badges: [
      {
         type: String
      }
   ],
   role: {
      type: String,
      enum: ["farmer", "admin"],
      default: "farmer"
   },

   isVerified: { type: Boolean, default: false },
   isLoggedIn: { type: Boolean, default: false },
   isSuspended: { type: Boolean, default: false },
   token: { type: String, default: null },
   otp: { type: String, default: null },
   otpExpiry: { type: Date, default: null }
}, { timestamps: true });

export const Farmer = mongoose.model("Farmer", farmerSchema);
// Backwards-compatible alias for existing code that imports { User }
export const User = Farmer;