// The web server: serves the phone-friendly page and the three API endpoints it calls.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import express from "express";
import multer from "multer";
import { analyzeRoomPhoto } from "./lib/analyzePhoto.js";
import { previewWallColor } from "./lib/previewColor.js";
import { buildPaintPlan } from "./lib/paintCalc.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(), // photos are never saved to disk
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error("Please upload a JPEG, PNG or WebP photo."), { status: 415 }));
  },
});

const app = express();
app.use(express.json());
app.use(express.static("public"));

// 1. Photo in, room description out.
app.post("/api/analyze", upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No photo was uploaded." });
    const analysis = await analyzeRoomPhoto(req.file.buffer, req.file.mimetype, {
      ceilingHeightFt: req.body.ceilingHeightFt,
      knownWallWidthFt: req.body.knownWallWidthFt,
    });
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// 2. Room numbers + colors in, paint plan out. Pure math, no AI.
app.post("/api/plan", (req, res) => {
  try {
    res.json(buildPaintPlan(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Photo + new color in, repainted preview image out.
app.post("/api/preview", upload.single("photo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No photo was uploaded." });
    const hex = String(req.body.colorHex || "");
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      return res.status(400).json({ error: "Pick a color first." });
    }
    const image = await previewWallColor(req.file.buffer, req.file.mimetype, {
      hex,
      name: String(req.body.colorName || "").slice(0, 60),
    });
    res.json({ image });
  } catch (err) {
    next(err);
  }
});

// Turn any error into a friendly JSON message for the page to show.
app.use((err, _req, res, _next) => {
  const { status, message } = describeError(err);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

function describeError(err) {
  if (err instanceof multer.MulterError) {
    return err.code === "LIMIT_FILE_SIZE"
      ? { status: 413, message: "That photo is too big. Please use one under 10 MB." }
      : { status: 400, message: "The photo upload didn't work. Please try again." };
  }
  // Errors from the Claude or OpenAI services.
  if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) {
    const service = err instanceof Anthropic.APIError ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
    if (err.status === 401 || err.status === 403) {
      return { status: 502, message: `The AI service rejected the API key. Check ${service} in your .env file.` };
    }
    if (err.status === 429) {
      return { status: 503, message: "The AI service is busy or out of credit. Wait a minute and try again." };
    }
    if (err.status === 400) {
      return { status: 422, message: "The AI service couldn't use that photo. Try a different one." };
    }
    return { status: 502, message: "The AI service had a problem. Please try again." };
  }
  // Our own errors carry a status and a message written for the user.
  if (err.status && err.status < 600) return { status: err.status, message: err.message };
  return { status: 500, message: "Something went wrong on the server. Please try again." };
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`DIWHYMAN running at http://localhost:${port}`));
