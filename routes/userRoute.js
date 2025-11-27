import express from "express";
import { loginUser,logoutUser, registerUser, updateFarmer, getMe } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/isAuthenticated.js";
import { userSchema, userUpdateSchema, validateUser } from "../validators/userValidate.js";

const router = express.Router();

router.post("/register", validateUser(userSchema),registerUser)
router.post("/login",loginUser)
router.post("/logout",isAuthenticated,logoutUser)
router.patch("/update", isAuthenticated, validateUser(userUpdateSchema), updateFarmer)
router.get("/me", isAuthenticated, getMe)

export default router