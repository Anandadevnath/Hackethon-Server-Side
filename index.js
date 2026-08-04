// server.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./database/db.js";
import userRoute from "./routes/userRoute.js";
import cropRoute from "./routes/cropRoute.js";
import adminRoute from "./routes/adminRoute.js";
import pestRoute from "./routes/pestServer.js";
import { Buffer } from "buffer";

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- MIDDLEWARE --------------------

// JSON parsing, allow up to 10MB for image uploads
app.use(express.json({ limit: "10mb" }));

// CORS: allow requests from any origin with credentials.
app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin. Note: This is permissive and might be a security risk.
    // Ensure you trust all origins that will access this API.
    callback(null, true);
  },
  credentials: true
}));

// -------------------- DATABASE --------------------
connectDB();

// -------------------- ROUTES --------------------

// Main app routes
app.use("/user", userRoute);
app.use("/crop", cropRoute);
app.use("/panel", adminRoute);
app.use("/", pestRoute);

// -------------------- CROP SCANNER API --------------------

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_MODEL_ID = "wambugu71/crop_leaf_diseases_vit";
const HF_TTS_MODEL = process.env.HF_TTS_MODEL;

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

// Gemini
app.post("/api/ai", async (req, res) => {
  res.status(501).json({ error: "AI feature has been removed" });
});

// tts post req
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    const requestedModel = req.body.model || HF_TTS_MODEL;

    if (!text) {
      return res.status(400).json({ ok: false, error: "text is required" });
    }

    if (!HF_API_TOKEN) {
      return res.status(500).json({ ok: false, error: "HF_API_TOKEN missing" });
    }

    const payload = {
      inputs: text
    };

    const hfRes = await fetch(
      `https://router.huggingface.co/v1/models/${requestedModel}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!hfRes.ok) {
      const errorText = await hfRes.text();
      let detail = errorText;
      try {
        detail = JSON.parse(errorText);
      } catch (e) {
      }
      console.error("❌ HF TTS error:", detail);
      const status = hfRes.status;
      if (status === 404) {
        try {
          const metaHeaders = HF_API_TOKEN ? { Authorization: `Bearer ${HF_API_TOKEN}` } : {};
          const metaRes = await fetch(`https://huggingface.co/api/models/${requestedModel}`, {
            method: "GET",
            headers: metaHeaders,
          });
          const metaText = await metaRes.text();
          let meta = metaText;
          try { meta = JSON.parse(metaText); } catch (e) { }
          const pipelineTag = meta && (meta.pipeline_tag || meta.modelType || null);
          const tags = meta && meta.tags ? meta.tags : [];
          const isTTS = pipelineTag && pipelineTag.toLowerCase().includes('text-to-speech')
            || tags.some(t => String(t).toLowerCase().includes('text-to-speech'))
            || tags.some(t => String(t).toLowerCase().includes('tts'));

          return res.status(502).json({
            ok: false,
            error: "HuggingFace TTS error",
            detail: "Model not available via Hugging Face router inference. See Hub metadata for details.",
            model: requestedModel,
            modelHub: `https://huggingface.co/${requestedModel}`,
            hf: detail,
            metaStatus: metaRes.status,
            meta,
            hint: isTTS ? "Model appears to support TTS (check usage/pipeline)." : "Model does not appear to be a TTS model. Use a TTS-specific model or adjust request.",
          });
        } catch (metaErr) {
          console.warn("Failed to fetch Hub metadata:", metaErr);
          return res.status(502).json({
            ok: false,
            error: "HuggingFace TTS error",
            detail: "Model not found and Hub metadata fetch failed.",
            model: requestedModel,
            modelHub: `https://huggingface.co/${requestedModel}`,
            hf: detail,
          });
        }
      }

      return res.status(500).json({
        ok: false,
        error: "HuggingFace TTS error",
        detail,
      });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString("base64");
    const contentType = hfRes.headers.get("content-type") || "audio/wav";

    return res.json({
      ok: true,
      audioBase64: `data:${contentType};base64,${base64Audio}`,
      contentType,
    });

  } catch (err) {
    console.error("💥 TTS Server Error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// tts get req
app.get("/api/tts/check-model", async (req, res) => {
  try {
    const model = req.query.model || HF_TTS_MODEL;


    const headersWithAuth = HF_API_TOKEN
      ? { Authorization: `Bearer ${HF_API_TOKEN}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };

    let routerStatus = null;
    let routerInfo = null;
    try {
      const infoRes = await fetch(`https://router.huggingface.co/v1/models/${model}`, {
        method: "GET",
        headers: headersWithAuth,
      });
      routerStatus = infoRes.status;
      const text = await infoRes.text();
      try {
        routerInfo = JSON.parse(text);
      } catch (e) {
        routerInfo = text;
      }

      if (infoRes.ok) {
        return res.json({ ok: true, model, available: true, info: routerInfo, source: "router" });
      }
    } catch (e) {
      console.warn("Router check failed:", e.message || e);
    }
    try {
      const metaHeaders = HF_API_TOKEN ? { Authorization: `Bearer ${HF_API_TOKEN}` } : {};
      const metaRes = await fetch(`https://huggingface.co/api/models/${model}`, {
        method: "GET",
        headers: metaHeaders,
      });
      const metaText = await metaRes.text();
      let meta = metaText;
      try {
        meta = JSON.parse(metaText);
      } catch (e) {
        // leave as text
      }

      if (metaRes.ok) {
        return res.json({
          ok: true,
          model,
          available: false,
          note: "Model found on Hugging Face Hub but not available via router inference. See details.",
          router: { status: routerStatus, info: routerInfo },
          meta,
          modelHub: `https://huggingface.co/${model}`,
        });
      }

      // If metadata endpoint also didn't find it, return 404 with both responses
      return res.status(404).json({
        ok: false,
        model,
        available: false,
        router: { status: routerStatus, info: routerInfo },
        metaStatus: metaRes.status,
        meta,
        modelHub: `https://huggingface.co/${model}`,
      });
    } catch (metaErr) {
      console.error("💥 Check-model fallback error:", metaErr);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  } catch (err) {
    console.error("💥 Check-model error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});


// -------------------- START SERVER --------------------
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Welcome to the NoteApp Backend API</h1>
        <ul>
          <li>User: <a href="/user">/user</a></li>
          <li>Crop: <a href="/crop">/crop</a></li>
          <li>Panel: <a href="/panel">/panel</a></li>
          <li>Pest: <a href="/pest">/pest</a></li>
          <li>Predict: <a href="/api/predict">/api/predict</a></li>
          <li>TTS: <a href="/api/tts">/api/tts</a></li>
          <li>Check Model: <a href="/api/tts/check-model">/api/tts/check-model</a></li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
