import { Farmer } from "../models/userModel.js"
import { Session } from "../models/sessionModel.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import nodemailer from "nodemailer"
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
         return res.status(409).json({
            success:false,
            message:"User already exists with this email"
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
        return res.status(401).json({
            success:false,
            message:"Invalid email or password"
        })
      }

      const passwordCheck = await bcrypt.compare(password,user.password)

      if(!passwordCheck){
        return res.status(401).json({
            success:false,
            message:"Invalid email or password"
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

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

    const user = await Farmer.findOne({ email })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashedOtp = await bcrypt.hash(otp, 10)

    user.otp = hashedOtp
    user.otpExpiry = Date.now() + 15 * 60 * 1000 // 15 minutes
    await user.save()
    // If email credentials are not configured, provide a friendly fallback
    // Accept either `EMAIL_USER`/`EMAIL_PASS` or `MAIL_USER`/`MAIL_PASS`.
    const emailUser = process.env.EMAIL_USER || process.env.MAIL_USER
    let emailPass = process.env.EMAIL_PASS || process.env.MAIL_PASS
    // App passwords are often shown with spaces when copied from Google UI; strip spaces if present
    if (emailPass) emailPass = String(emailPass).replace(/\s+/g, '')
    if (!emailUser || !emailPass) {
      // In production we should fail loudly; in development we log OTP to console for testing
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ success: false, message: 'Mail credentials not configured on server' })
      }

      console.log(`DEV MODE: Password reset OTP for ${user.email} is: ${otp}`)
      return res.status(200).json({ success: true, message: 'OTP logged to server console (development only)' })
    }

    // send email using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })

    const mailOptions = {
      from: emailUser,
      to: user.email,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is: ${otp}. It expires in 15 minutes.`
    }

    try {
      await transporter.sendMail(mailOptions)
      return res.status(200).json({ success: true, message: 'OTP sent to email' })
    } catch (mailError) {
      const errMsg = (mailError && (mailError.response || mailError.message)) || String(mailError)
      const isGmailAuthError = /BadCredentials|Username and Password not accepted|Invalid login/i.test(errMsg)

      if (isGmailAuthError) {
        return res.status(500).json({
          success: false,
          message:
            'SMTP authentication failed. If you are using Gmail, create an App Password and set `EMAIL_USER` and `EMAIL_PASS` environment variables. See https://support.google.com/accounts/answer/185833 for details.',
          details: errMsg
        })
      }

      return res.status(500).json({ success: false, message: errMsg })
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' })

    const user = await Farmer.findOne({ email })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not set' })
    }

    const match = await bcrypt.compare(otp, user.otp)
    if (!match) return res.status(400).json({ success: false, message: 'Invalid OTP' })

    // OTP is valid — issue a short-lived reset token
    const resetToken = jwt.sign({ id: user._id, purpose: 'reset' }, process.env.SECRET_KEY, { expiresIn: '15m' })

    // clear stored otp to prevent reuse
    user.otp = null
    user.otpExpiry = null
    await user.save()

    return res.status(200).json({ success: true, resetToken })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body
    if (!resetToken || !newPassword) return res.status(400).json({ success: false, message: 'Reset token and new password are required' })

    let payload
    try {
      payload = jwt.verify(resetToken, process.env.SECRET_KEY)
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' })
    }

    if (!payload || payload.purpose !== 'reset' || !payload.id) {
      return res.status(400).json({ success: false, message: 'Invalid reset token' })
    }

    const user = await Farmer.findById(payload.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    user.otp = null
    user.otpExpiry = null
    await user.save()

    return res.status(200).json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
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