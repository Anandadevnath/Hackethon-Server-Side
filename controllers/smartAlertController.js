// controllers/smartAlertController.js
import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_API_TOKEN);

// Crop type translations for context
const CROP_TRANSLATIONS = {
  Rice: "চাল",
  Paddy: "ধান",
  Wheat: "গম",
  Maize: "ভুট্টা",
  Potato: "আলু",
  Onion: "পেঁয়াজ",
  Jute: "পাট",
  Sugarcane: "আখ",
  Tomato: "টমেটো",
  Chili: "মরিচ",
  Mango: "আম",
  Banana: "কলা",
  Lentils: "মসুর ডাল",
  Mustard: "সরিষা",
  Garlic: "রসুন",
};

const STORAGE_TRANSLATIONS = {
  "Jute Bag Stack": "পাটের বস্তার স্তূপ",
  Silo: "সাইলো",
  "Open Area": "খোলা জায়গা",
  "Cold Storage": "হিমাগার",
  Warehouse: "গুদাম",
};

const RISK_TRANSLATIONS = {
  Critical: "সংকটপূর্ণ",
  High: "উচ্চ",
  Moderate: "মাঝারি",
  Low: "কম",
};

/**
 * Generate Smart Bangla Alert using LLM
 * POST /api/smart-alert
 */
export async function generateSmartAlert(req, res) {
  try {
    const {
      cropType,
      storageType,
      division,
      district,
      riskLevel,
      etcl,
      temperature,
      humidity,
      rainProb,
      moisture,
    } = req.body;

    if (!cropType || !riskLevel) {
      return res.status(400).json({
        ok: false,
        error: "cropType and riskLevel are required",
      });
    }

    const cropBn = CROP_TRANSLATIONS[cropType] || cropType;
    const storageBn =
      STORAGE_TRANSLATIONS[storageType] || storageType || "গুদাম";
    const riskBn = RISK_TRANSLATIONS[riskLevel] || riskLevel;

    const prompt = buildBanglaPrompt({
      cropType,
      cropBn,
      storageType,
      storageBn,
      division,
      district,
      riskLevel,
      riskBn,
      etcl,
      temperature,
      humidity,
      rainProb,
      moisture,
    });

    let alertMessage = "";
    try {
      const chatCompletion = await client.chatCompletion({
        model: "nvidia/Llama-3.1-Nemotron-Nano-8B-v1:featherless-ai",
        messages: [
          {
            role: "system",
            content:
              "You are an expert agricultural advisor for Bangladeshi farmers. You MUST respond ONLY in Bangla (Bengali) language using Bengali script. Your advice should be specific, actionable, and 2-3 short sentences.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
      });

      alertMessage = chatCompletion.choices[0]?.message?.content || "";
    } catch (hfError) {
      console.error("HF LLM error, falling back:", hfError);
      const fallback = generateFallbackAlert({
        cropType,
        storageType,
        riskLevel,
        temperature,
        humidity,
        rainProb,
        etcl,
      });
      alertMessage = fallback.message;
    }

    const shouldSimulateSMS = riskLevel === "Critical";

    return res.json({
      ok: true,
      data: {
        alertMessage,
        riskLevel,
        riskBn,
        cropType,
        cropBn,
        etcl,
        shouldSimulateSMS,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Smart Alert Error:", error);
    const fallbackAlert = generateFallbackAlert(req.body);
    return res.json({
      ok: true,
      data: {
        alertMessage: fallbackAlert.message,
        riskLevel: req.body.riskLevel,
        riskBn: RISK_TRANSLATIONS[req.body.riskLevel] || req.body.riskLevel,
        cropType: req.body.cropType,
        cropBn: CROP_TRANSLATIONS[req.body.cropType] || req.body.cropType,
        etcl: req.body.etcl,
        shouldSimulateSMS: req.body.riskLevel === "Critical",
        timestamp: new Date().toISOString(),
        fallback: true,
      },
    });
  }
}

/**
 * Build Bangla prompt for the LLM
 */
function buildBanglaPrompt(data) {
  const {
    cropType,
    cropBn,
    storageType,
    storageBn,
    division,
    district,
    riskLevel,
    riskBn,
    etcl,
    temperature,
    humidity,
    rainProb,
    moisture,
  } = data;

  return `
আপনি একজন কৃষি বিশেষজ্ঞ। নিচের তথ্যের উপর ভিত্তি করে কৃষককে বাংলায় সুনির্দিষ্ট পরামর্শ দিন:

📦 ফসলের তথ্য:
- ফসলের ধরন: ${cropBn} (${cropType})
- সংরক্ষণ পদ্ধতি: ${storageBn}
- অবস্থান: ${district || ""}, ${division || "বাংলাদেশ"}
- আর্দ্রতা (ফসলের): ${moisture || "N/A"}%

⚠️ ঝুঁকির মাত্রা: ${riskBn} (${riskLevel})
⏰ ক্ষতির সম্ভাব্য সময়: ${etcl || "N/A"} ঘন্টা

🌤️ আবহাওয়া:
- তাপমাত্রা: ${temperature || "N/A"}°C
- আর্দ্রতা (বাতাসে): ${humidity || "N/A"}%
- বৃষ্টির সম্ভাবনা: ${rainProb || "N/A"}%

এখন কৃষককে ২-৩ বাক্যে সুনির্দিষ্ট পরামর্শ দিন। উদাহরণ ফর্ম্যাট:
"আগামীকাল বৃষ্টি হবে এবং আপনার আলু গুদামে আর্দ্রতা বেশি। এখনই ফ্যান চালু করুন।"
`;
}

/**
 * Fallback template-based alert when LLM fails
 */
function generateFallbackAlert(data) {
  const {
    cropType,
    storageType,
    riskLevel,
    temperature,
    humidity,
    rainProb,
    etcl,
  } = data;

  const cropBn = CROP_TRANSLATIONS[cropType] || cropType;
  const storageBn = STORAGE_TRANSLATIONS[storageType] || "গুদাম";

  // Template-based alerts by risk level
  const templates = {
    Critical: {
      high_rain: `⚠️ জরুরি! আগামীকাল ${rainProb}% বৃষ্টির সম্ভাবনা। আপনার ${cropBn} ${storageBn} থেকে সরিয়ে শুকনো জায়গায় রাখুন। এখনই পদক্ষেপ নিন!`,
      high_humidity: `⚠️ জরুরি! ${storageBn}-এ আর্দ্রতা ${humidity}% - আপনার ${cropBn} নষ্ট হতে পারে। এখনই ফ্যান চালু করুন এবং বায়ু চলাচল বাড়ান।`,
      high_temp: `⚠️ জরুরি! তাপমাত্রা ${temperature}°C - আপনার ${cropBn} ক্ষতিগ্রস্ত হতে পারে। ছায়ায় রাখুন এবং ঠান্ডা করার ব্যবস্থা করুন।`,
      default: `⚠️ জরুরি সতর্কতা! আপনার ${cropBn} সংকটপূর্ণ অবস্থায়। ${etcl} ঘন্টার মধ্যে পদক্ষেপ নিন।`,
    },
    High: {
      default: `🔴 উচ্চ ঝুঁকি! আপনার ${cropBn} ${storageBn}-এ ঝুঁকিতে আছে। আর্দ্রতা ও তাপমাত্রা নিয়ন্ত্রণ করুন। ${etcl} ঘন্টার মধ্যে পরীক্ষা করুন।`,
    },
    Moderate: {
      default: `🟡 মাঝারি ঝুঁকি। আপনার ${cropBn} নিয়মিত পর্যবেক্ষণ করুন। আর্দ্রতা ${humidity}% - বায়ু চলাচল ভালো রাখুন।`,
    },
    Low: {
      default: `🟢 আপনার ${cropBn} ভালো অবস্থায় আছে। স্বাভাবিক সংরক্ষণ পদ্ধতি অব্যাহত রাখুন।`,
    },
  };

  const riskTemplates = templates[riskLevel] || templates.Low;

  // Select appropriate template based on conditions
  let message = riskTemplates.default;

  if (riskLevel === "Critical") {
    if (rainProb && rainProb > 70) {
      message = riskTemplates.high_rain;
    } else if (humidity && humidity > 80) {
      message = riskTemplates.high_humidity;
    } else if (temperature && temperature > 35) {
      message = riskTemplates.high_temp;
    }
  }

  return { message, riskLevel };
}

/**
 * Batch generate alerts for multiple crops
 * POST /api/smart-alert/batch
 */
export async function generateBatchAlerts(req, res) {
  try {
    const { crops } = req.body;

    if (!Array.isArray(crops) || crops.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "crops array is required",
      });
    }

    const alerts = [];

    for (const crop of crops) {
      try {
        // Generate alert for each crop
        const alertData = {
          cropType: crop.cropType,
          storageType: crop.storageType,
          division: crop.storageLocation?.division,
          district: crop.storageLocation?.district,
          riskLevel: crop.riskLevel || "Low",
          etcl: crop.etcl,
          temperature: crop.temperature,
          humidity: crop.humidity,
          rainProb: crop.rainProb,
          moisture: crop.moisture,
        };

        const fallbackAlert = generateFallbackAlert(alertData);

        alerts.push({
          cropId: crop._id || crop.id,
          cropType: crop.cropType,
          ...fallbackAlert,
          shouldSimulateSMS: crop.riskLevel === "Critical",
        });
      } catch (err) {
        console.error(`Error generating alert for crop ${crop._id}:`, err);
      }
    }

    return res.json({
      ok: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Batch Alert Error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to generate batch alerts",
    });
  }
}
