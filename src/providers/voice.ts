import type { VoiceChoice } from "../../shared/session";

export async function listVoices(): Promise<VoiceChoice[]> {
  const response = await fetch("/api/voices");
  const body = (await response.json()) as { voices?: VoiceChoice[]; error?: string };
  if (!response.ok || !body.voices) {
    throw new Error(body.error || "The voice list could not be loaded.");
  }
  return body.voices;
}
