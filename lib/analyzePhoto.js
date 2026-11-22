// Sends a room photo to Claude and gets back a structured description:
// current wall color, surface problems, doors/windows and rough wall size.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CONDITIONS } from "../shared/paintCalc.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// What we ask Claude to return. Structured outputs guarantee the reply matches this shape.
const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "is_room_photo",
    "current_wall_color_hex",
    "current_wall_color_name",
    "walls_visible",
    "wall_widths_ft",
    "estimated_wall_height_ft",
    "doors",
    "windows",
    "conditions",
    "size_confidence",
    "scale_clues",
    "notes",
  ],
  properties: {
    is_room_photo: {
      type: "boolean",
      description: "False if the photo doesn't show interior walls that could be painted.",
    },
    current_wall_color_hex: {
      type: "string",
      description: "Best guess of the true wall color as #RRGGBB, corrected for lighting and shadows.",
    },
    current_wall_color_name: { type: "string", description: "Plain name, e.g. 'warm beige'." },
    walls_visible: { type: "integer", description: "How many distinct walls are visible." },
    wall_widths_ft: {
      type: "array",
      items: { type: "number" },
      description: "Estimated width in feet of each visible wall that would be painted, one entry per wall.",
    },
    estimated_wall_height_ft: { type: "number", description: "Floor-to-ceiling height in feet." },
    doors: { type: "integer", description: "Doors on the visible walls." },
    windows: { type: "integer", description: "Windows on the visible walls." },
    conditions: {
      type: "array",
      items: { type: "string", enum: Object.keys(CONDITIONS) },
      description: "Surface problems you can actually see. Empty if the walls look sound.",
    },
    size_confidence: { type: "string", enum: ["low", "medium", "high"] },
    scale_clues: {
      type: "string",
      description: "Which objects you used to judge size (doors, outlets, furniture), in one sentence.",
    },
    notes: {
      type: "string",
      description: "One or two short sentences of anything useful for the painter, or an empty string.",
    },
  },
};

// Same shape, checked again on our side before the rest of the app trusts it.
const AnalysisSchema = z.object({
  is_room_photo: z.boolean(),
  current_wall_color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  current_wall_color_name: z.string(),
  walls_visible: z.number().int().min(0),
  wall_widths_ft: z.array(z.number().min(0)).max(12),
  estimated_wall_height_ft: z.number().min(0),
  doors: z.number().int().min(0),
  windows: z.number().int().min(0),
  conditions: z.array(z.enum(Object.keys(CONDITIONS))),
  size_confidence: z.enum(["low", "medium", "high"]),
  scale_clues: z.string(),
  notes: z.string(),
});

const SYSTEM_PROMPT = `You help homeowners plan interior painting from a single phone photo.

Measure using objects of known size: interior doors are about 80 inches tall and 30-36 inches wide, light switches and outlets are about 4.5 inches tall, outlets sit about 12-16 inches above the floor, and kitchen counters are 36 inches high. Most ceilings are 8, 9 or 10 feet. If the user gives a known measurement, treat it as correct and scale everything else from it.

For wall color, report the paint color as it would look in even daylight, not the shadowed or tinted color the camera captured.

Only list surface conditions you can actually see. A photo that looks fine should get an empty list.`;

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      "Photo analysis isn't set up yet: add ANTHROPIC_API_KEY to your .env file (see README).",
    );
    err.status = 503;
    throw err;
  }
  client ??= new Anthropic();
  return client;
}

/**
 * @param {Buffer} imageBuffer  The photo.
 * @param {string} mediaType    "image/jpeg", "image/png", "image/webp" or "image/gif".
 * @param {object} [hints]      Anything the user already knows, e.g. { ceilingHeightFt: 8 }.
 */
export async function analyzeRoomPhoto(imageBuffer, mediaType, hints = {}) {
  const hintLines = [];
  if (Number(hints.ceilingHeightFt) > 0) {
    hintLines.push(`The ceiling height is ${Number(hints.ceilingHeightFt)} feet.`);
  }
  if (Number(hints.knownWallWidthFt) > 0) {
    hintLines.push(`The main wall in the photo is ${Number(hints.knownWallWidthFt)} feet wide.`);
  }

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // If a safety check declines the request, retry on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBuffer.toString("base64") },
          },
          {
            type: "text",
            text: ["Analyze this room for a paint job.", ...hintLines].join("\n"),
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("The photo couldn't be analyzed. Try a different photo."), {
      status: 422,
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error("The analysis was cut off. Please try again."), { status: 502 });
  }

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) {
    throw Object.assign(new Error("The analysis came back empty. Please try again."), { status: 502 });
  }

  const parsed = AnalysisSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw Object.assign(new Error("The analysis came back in an unexpected format. Please try again."), {
      status: 502,
    });
  }
  return parsed.data;
}
