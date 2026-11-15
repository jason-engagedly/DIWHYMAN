// Sends close-up photos of wall damage (holes, cracks, gaps) to Claude and gets back
// a list of repairs, using the repair types in shared/repairs.js.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { REPAIR_TYPES } from "../shared/repairs.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const TYPES = Object.keys(REPAIR_TYPES);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["shows_wall_damage", "findings", "notes"],
  properties: {
    shows_wall_damage: {
      type: "boolean",
      description: "False if the photos don't show interior wall or trim surfaces.",
    },
    findings: {
      type: "array",
      description: "One entry per kind of damage seen across all photos.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "count", "approx_size_in", "where", "confidence"],
        properties: {
          type: { type: "string", enum: TYPES },
          count: { type: "integer", description: "How many of this kind. For trim_gaps, the number of separate runs." },
          approx_size_in: { type: "number", description: "Typical size in inches (hole width or crack length). 0 if unknown." },
          where: { type: "string", description: "Short location, e.g. 'beside the door frame'." },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    notes: { type: "string", description: "One short sentence of anything the user should know, or an empty string." },
  },
};

const ResultSchema = z.object({
  shows_wall_damage: z.boolean(),
  findings: z
    .array(
      z.object({
        type: z.enum(TYPES),
        count: z.number().int().min(0).max(200),
        approx_size_in: z.number().min(0),
        where: z.string(),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(20),
  notes: z.string(),
});

// The repair categories, described so the model sorts damage the same way the app prices it.
const TYPE_GUIDE = Object.entries(REPAIR_TYPES)
  .map(([id, t]) => `- ${id}: ${t.label}`)
  .join("\n");

const SYSTEM_PROMPT = `You help homeowners prepare walls for painting. You look at close-up photos of wall damage and sort what you see into these repair types:

${TYPE_GUIDE}

Judge size from anything in the photo with a known size: coins (a US quarter is about 1 in. across), outlets and switch plates (about 4.5 in. tall), screw heads, fingers. If you can't tell the size, say so with low confidence.

Be careful with cracks. Use structural_cracks for any crack wider than about 1/4 in., running diagonally from the corner of a door or window, in a stair-step pattern, or with one side sticking out further than the other. Use water_damage for brown or yellow rings, bubbling paint, or drywall that looks soft or swollen. When unsure between a cosmetic and a serious type, pick the serious one.

Only report damage you can actually see.`;

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("Photo checks aren't set up yet: add ANTHROPIC_API_KEY to your .env file (see README).");
    err.status = 503;
    throw err;
  }
  client ??= new Anthropic();
  return client;
}

/**
 * @param {{buffer: Buffer, mimetype: string}[]} photos  Up to 4 close-up photos.
 */
export async function analyzeImperfections(photos) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...photos.map((p) => ({
            type: "image",
            source: { type: "base64", media_type: p.mimetype, data: p.buffer.toString("base64") },
          })),
          {
            type: "text",
            text: `These ${photos.length} photo${photos.length > 1 ? "s show" : " shows"} spots on my walls I want to fix before painting. What repairs do I need?`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("The photos couldn't be checked. Try different photos."), { status: 422 });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error("The check was cut off. Please try again."), { status: 502 });
  }
  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) {
    throw Object.assign(new Error("The check came back empty. Please try again."), { status: 502 });
  }
  const parsed = ResultSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw Object.assign(new Error("The check came back in an unexpected format. Please try again."), { status: 502 });
  }
  return parsed.data;
}
