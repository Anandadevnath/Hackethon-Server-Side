import express from "express";
import { loginUser,logoutUser, registerUser, updateFarmer, getMe, forgotPassword, verifyOtp, resetPassword } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { userSchema, userUpdateSchema, validateUser } from "../validators/userValidate.js";

const router = express.Router();

router.post("/register", validateUser(userSchema),registerUser)
router.post("/login",loginUser)
router.post("/forgot-password", forgotPassword)
router.post("/verify-otp", verifyOtp)
router.post("/reset-password", resetPassword)
router.post("/logout",isAuthenticated,logoutUser)
router.patch("/update", isAuthenticated, validateUser(userUpdateSchema), updateFarmer)
router.get("/me", isAuthenticated, getMe)

export default router