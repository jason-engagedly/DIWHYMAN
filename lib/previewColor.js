// Creates a "what it would look like" preview by asking an AI image model
// to repaint only the walls in the user's photo. Uses OpenAI's image editing API.
import OpenAI, { toFile } from "openai";

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

let client;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error(
      "Color previews aren't set up yet: add OPENAI_API_KEY to your .env file (see README).",
    );
    err.status = 503;
    throw err;
  }
  client ??= new OpenAI();
  return client;
}

/**
 * @param {Buffer} imageBuffer  The original room photo.
 * @param {string} mediaType    e.g. "image/jpeg".
 * @param {object} color        { hex: "#7A9E7E", name: "sage green" }
 * @returns {Promise<string>}   A data: URL of the finished room (walls repaired, then painted),
 *                              ready for an <img> tag.
 */
export async function previewWallColor(imageBuffer, mediaType, color) {
  const extension = mediaType.split("/")[1] || "jpeg";
  const image = await toFile(imageBuffer, `room.${extension}`, { type: mediaType });
  const colorLabel = color.name ? `${color.name} (${color.hex})` : color.hex;

  const result = await getClient().images.edit({
    model: IMAGE_MODEL,
    image,
    // Show the finished job: walls repaired as the plan describes, then painted.
    prompt: [
      "Show this room after a careful paint job is finished.",
      "First, repair all visible wall damage so the walls are smooth and flawless: fill holes of any size, nail holes, dents, cracks, and gaps between the walls and the baseboards or trim.",
      `Then repaint the walls with a flat interior paint in the color ${colorLabel}.`,
      "Change only the wall surfaces.",
      "Keep everything else exactly the same: ceiling, trim, doors, windows, floor, furniture, decor, outlets and switches.",
      "Keep the original camera angle, lighting, shadows and reflections so the result looks like a real photo of the same room.",
    ].join(" "),
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw Object.assign(new Error("The preview image didn't come back. Please try again."), {
      status: 502,
    });
  }
  return `data:image/png;base64,${b64}`;
}
