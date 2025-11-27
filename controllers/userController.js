import { verifyMail } from "../emailVerify/verifyMail.js"
import { Farmer } from "../models/userModel.js"
import { Session } from "../models/sessionModel.js"
import { sendOtpMail } from "../emailVerify/sendOtpMail.js"
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
        location: location || undefined
      })
      const token = jwt.sign({id:newUser._id,},
        process.env.SECRET_KEY,{expiresIn:"10m"}
    )
      verifyMail(token,email)
      newUser.token=token
      await newUser.save()
      return res.status(201).json({
        success:true,
        message:"User registered successfully",
        data:newUser
      })
 }
 catch(error){
   return res.status(500).json({
    success:false,
    message:error.message
   })
 }

}
export const verification =async (req,res) =>{
  
  try{
       const authHeader = req.headers.authorization;
       if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({
            success:false,
            message:"Authorization token missing or invalid"
        })
       }

       const token = authHeader.split(' ')[1];

       let decoded;
       try{
          decoded = jwt.verify(token,process.env.SECRET_KEY)
       }
       catch(error){
        if(error.name === 'TokenExpiredError'){
            return res.status(401).json({
                success:false,
                message:"Token has expired"
            })
        }
        return res.status(401).json({
            success:false,
            message:"Token verification failed"
        })
       }
        const user = await Farmer.findById(decoded.id)
       if(!user){
        return res.status(404).json({
            success:false,
            message:"User not found"
        })
       }

        user.token = null
        user.isVerified = true
        await user.save()

        return res.status(200).json({
            success:true,
            message:"Email verified successfully"
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
      //check if user is verified
      if(user.isVerified !== true){
        return res.status(403).json({
            success:false,
            message:"Verify your email to login"
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
export const forgetPassword = async (req,res) =>{
  try{
    const {email} = req.body;
    const user = await Farmer.findOne({email})
    if(!user){
      return res.status(404).json({
        success:false,
        message:"User not found"
      })
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    //send otp via email
    await sendOtpMail(email,otp);
    return res.status(200).json({
      success:true,
      message:"OTP sent to your email"
    })
  }
  catch(error){
    return res.status(500).json({
      success:false,
      message:error.message
    })

  }
}

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.params.email;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }

    const user = await Farmer.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP found, please request a new one or already validated"
      });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired, please request a new one"
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export const changePassword = async (req, res) => {

  const { newPassword,confirmPassword } = req.body;
  const email = req.params.email;
  if (!newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Both new password and confirm password are required"
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }
  try {
    const user = await Farmer.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
}catch(error){
    return res.status(500).json({
      success: false,
      message: error.message
    });
}

}

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