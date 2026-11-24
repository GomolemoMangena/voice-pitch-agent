import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";

let client: ElevenLabsClient | null = null;

export function elevenlabs(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set. Add it to .env and restart.");
  }
  client ??= new ElevenLabsClient({ apiKey });
  return client;
}

export function describeFailure(error: unknown): string {
  if (error instanceof ElevenLabsError) {
    const detail = readDetail(error.body);
    if (detail) return detail;
    return error.message || `ElevenLabs returned ${error.statusCode ?? "an error"}.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "The request failed.";
}

function readDetail(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}
