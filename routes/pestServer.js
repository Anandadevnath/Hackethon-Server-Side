import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// === CONFIG ===
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash"; // change if needed
const KB_PATH = path.join(process.cwd(), "server", "kb", "kb_index.json"); // optional

// Helper: top-K search placeholder
function searchTopK(imageEmbedding, KB, k) {
  // For now, just return first k items; replace with real embedding search
  return KB.slice(0, k);
}

router.post("/api/pest-identify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "image required" });

    const imagePath = req.file.path;

    // 1️⃣ Convert image to base64
    const imageBytes = fs.readFileSync(imagePath);
    const imageBase64 = imageBytes.toString("base64");

    // 2️⃣ Load KB and pick top-K sources (optional)
    let groundingText = "";
    if (fs.existsSync(KB_PATH)) {
      const KB = JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
      const topk = searchTopK(null, KB, 5);
      groundingText = topk
        .map((d, i) => `Source ${i + 1}: ${d.title}\n${d.text.slice(0, 600)}`)
        .join("\n---\n");
    }

    // 3️⃣ Build Gemini Visual RAG request
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: `
Pretend you are an agricultural expert. Use the image and any general knowledge about common pests to produce a **plausible response in Bangla**. 
Even if uncertain, provide a best-effort answer in the requested structured format:

1) কীটপতঙ্গ/ক্ষতি সনাক্তকরণ (Bangla)
2) ঝুঁকির শ্রেণীবিভাগ (High/Medium/Low)
3) চিকিৎসা পরিকল্পনা (concise, bullet points)

Do **not** add extra explanations, commentary, or notes including things like "I will try" (same goes for Bangla). Output only what is requested.
Do NOT say you cannot analyze the image.
Grounding sources:
${groundingText}

Answer in Bangla, concise bullet points.
            `,
            },
          ],
        },
      ],
    };

    // 4️⃣ Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!geminiRes.ok) {
      const text = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${text}`);
    }

    const geminiJson = await geminiRes.json();

    // 5️⃣ Extract Gemini text response
    let answer =
      geminiJson?.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        .map((p) => p.text)
        .join("\n") || "প্রতিক্রিয়া পাওয়া যায়নি।";

    // Optional: remove lines starting with "Important Considerations" or similar
    answer = answer
      .split("\n")
      .filter(
        (line) =>
          !line.match(
            /^(Important Considerations|Definitive Diagnosis|Integrated Pest Management|Local Regulations)/i
          )
      )
      .join("\n");

    // Optional: trim whitespace
    answer = answer.trim();

    // 6️⃣ Return structured response
    res.json({
      ok: true,
      answer,
      sources: groundingText
        ? groundingText.split("\n---\n").map((text, i) => ({
            id: i + 1,
            title: text.split("\n")[0].replace("Source " + (i + 1) + ": ", ""),
            snippet: text.split("\n").slice(1).join("\n").slice(0, 200),
          }))
        : [],
    });

    // 7️⃣ Cleanup uploaded image
    fs.unlinkSync(imagePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error", detail: String(err) });
  }
});

export default router;
