// server.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./database/db.js";
import userRoute from "./routes/userRoute.js";
import cropRoute from "./routes/cropRoute.js";
import adminRoute from "./routes/adminRoute.js";
import dataRoute from "./routes/dataRoute.js";
import smartAlertRoute from "./routes/smartAlertRoute.js";
import { Buffer } from "buffer";
import fetch from "node-fetch"; // if using Node 18+, native fetch is fine

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- MIDDLEWARE --------------------

// JSON parsing, allow up to 10MB for image uploads
app.use(express.json({ limit: "10mb" }));

// CORS: allow requests from any origin. Update in production as needed
app.use(cors({ origin: true, credentials: true }));

// -------------------- DATABASE --------------------
connectDB();

// -------------------- ROUTES --------------------

// Main app routes
app.use("/user", userRoute);
app.use("/crop", cropRoute);
app.use("/panel", adminRoute);
app.use("/data", dataRoute);  // Bilingual data options (crop types, storage types, divisions)
app.use("/api/smart-alert", smartAlertRoute);  // Smart Bangla alert generation with LLM

// -------------------- CROP SCANNER API --------------------

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_MODEL_ID = "wambugu71/crop_leaf_diseases_vit";

if (!HF_API_TOKEN) {
  console.warn("Warning: HF_API_TOKEN is not set in .env");
}

// Simple GET to test API
app.get("/api/predict", (req, res) => {
  res.json({ ok: true, message: "GET /api/predict is alive" });
});

// POST for image classification
app.post("/api/predict", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    // Decode base64 -> Buffer
    const base64Data = imageBase64.split(",")[1] || imageBase64;
    const imgBuffer = Buffer.from(base64Data, "base64");

    const hfRes = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "image/jpeg",
        },
        body: imgBuffer,
      }
    );

    if (!hfRes.ok) {
      const text = await hfRes.text();
      console.error("HF error:", hfRes.status, text);
      return res.status(hfRes.status).json({ error: "HF error", detail: text });
    }

    const result = await hfRes.json();
    return res.json(result);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
