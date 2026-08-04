import mongoose from "mongoose"

const connectDB = async () =>{
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI environment variable is missing in Vercel settings");

        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(`${uri}/note_app`);
        console.log("mongoDB connected successfully");
    }
    catch (error){
        // This will print the specific reason (Auth, Network, etc.) to your Vercel logs
        console.error("MongoDB connection error:", error.message);

        // We throw the error so the serverless function remains in a failed state,
        // allowing Vercel to correctly log the crash and stop the function
        throw error;
    }

}
export default connectDB