import express from "express";
import { forgetPassword, loginUser,logoutUser, registerUser, verification, verifyOtp ,changePassword, updateFarmer } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { userSchema, userUpdateSchema, validateUser } from "../validators/userValidate.js";

const router = express.Router();

router.post("/register", validateUser(userSchema),registerUser)
router.post("/verify", verification)
router.post("/login",loginUser)
router.post("/logout",isAuthenticated,logoutUser)
router.post("/forgot-password",forgetPassword)
router.post("/verify-otp/:email",verifyOtp)
router.post("/change-password/:email",changePassword)
router.patch("/update", isAuthenticated, validateUser(userUpdateSchema), updateFarmer)

export default router