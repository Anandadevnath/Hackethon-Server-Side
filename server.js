import express from "express"
import 'dotenv/config'
import cors from 'cors'
import connectDB from "./database/db.js"
import userRoute from "./routes/userRoute.js"
import cropRoute from "./routes/cropRoute.js"
import adminRoute from "./routes/adminRoute.js"
const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())

// CORS: allow requests from any origin. Use with caution in production.
// Using `origin: true` reflects the request origin, which allows credentials.
app.use(cors({ origin: true, credentials: true }))

// Routes
app.use("/user", userRoute)
app.use("/crop", cropRoute)
app.use("/panel", adminRoute)
//http://localhost:8000/user/register

app.listen(PORT,()=>{
    connectDB()
 console.log(`server is running at port ${PORT}`)
 
})