import { Farmer } from "../models/userModel.js"
import { Session } from "../models/sessionModel.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { isValidObjectId } from "mongoose"
export const registerUser = async (req,res) =>{
 try{
      const { name, email, phone, password, location, preferredLanguage } = req.body
      if(!name || !email || !phone || !password){
        return res.status(400).json({
            success:false,
            message:"All fields are required"
        })
      }

      // location is required by validator; no BD-specific validation applied
      const existingUser = await Farmer.findOne({email})
      if(existingUser){
         return res.status(400).json({
            success:false,
            message:"User already exists"
          })
      }
      
      const hashedPassword= await bcrypt.hash(password,10)

      const newUser = await Farmer.create({
        name,
        email,
        phone,
        password:hashedPassword,
        preferredLanguage: preferredLanguage || undefined,
        location: location || undefined,
        isVerified: true
      })
      
      //create session for the new user
      await Session.create({userId:newUser._id})
      
      //generate tokens for immediate login
      const accessToken = jwt.sign({id:newUser._id},
        process.env.SECRET_KEY,{expiresIn:"10d"})

      const refreshSecret = process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY
      const refreshToken = jwt.sign({id:newUser._id}, refreshSecret, {expiresIn:"30d"})

      newUser.isLoggedIn = true
      await newUser.save()
      
      // Create clean user object without sensitive fields
      const userData = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        preferredLanguage: newUser.preferredLanguage,
        location: newUser.location,
        badges: newUser.badges,
        role: newUser.role,
        isLoggedIn: newUser.isLoggedIn,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        __v: newUser.__v
      }
      
      return res.status(201).json({
        success:true,
        message:"User registered successfully",
        accessToken,
        refreshToken,
        data:userData
      })
 }
 catch(error){
   return res.status(500).json({
    success:false,
    message:error.message
   })
 }

}

//login 
export const loginUser = async(req,res) =>{
   try{

    const {email,password} = req.body;
      if(!email || !password){
        return res.status(400).json({
            success:false,
            message:"All fields are required"
        })
      }

      const user = await Farmer.findOne({email})
      if(!user){
        return res.status(404).json({
            success:false,
            message:"Unregistered access"
        })
      }

      const passwordCheck = await bcrypt.compare(password,user.password)

      if(!passwordCheck){
        return res.status(402).json({
            success:false,
            message:"Incorrect password"
        })
      }
      
      //check for existing session and delete it
      const existingSession = await Session.findOne({userId:user._id})
      if(existingSession){
        await Session.deleteOne({userId:user._id})
      }

      //create new session
      await Session.create({userId:user._id})

      //generate token
      const accessToken = jwt.sign({id:user._id},
        process.env.SECRET_KEY,{expiresIn:"10d"})

      const refreshSecret = process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY
      if(!refreshSecret){
        return res.status(500).json({ success:false, message: 'Server JWT secret not configured' })
      }
      const refreshToken = jwt.sign({id:user._id}, refreshSecret, {expiresIn:"30d"})

      user.isLoggedIn = true
      await user.save()
      return res.status(200).json({
        success:true,
        message:`Welcome back ${user.name}`,
        accessToken,
        refreshToken,
        user
      })
   }
    catch(error){
        return res.status(500).json({
          success:false,
          message:error.message
        })
      
    }

}
//logout
export const logoutUser = async (req, res) => {
  try {
    const userId = req.userId || (req.user && (req.user.id || req.user._id));
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: user id missing' });
    }
    await Session.deleteOne({ userId: userId });
    await Farmer.findByIdAndUpdate(userId, { isLoggedIn: false });
  return res.status(200).json({
    success:true,
    message:"Logged out successfully"
  })

 }
  catch(error){
    return res.status(500).json({
      success:false,
      message:error.message
    })
  }

}
//forget password


export const updateFarmer = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const allowed = ['name', 'phone', 'preferredLanguage', 'location', 'avatar'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    }

    const updated = await Farmer.findByIdAndUpdate(userId, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Farmer not found' });

    return res.status(200).json({ success: true, message: 'Farmer updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// return currently authenticated user
export const getMe = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await Farmer.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};