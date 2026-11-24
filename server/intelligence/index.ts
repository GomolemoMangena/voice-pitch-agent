import { elevenlabsIntelligence } from "./elevenlabs";
import { grokIntelligence } from "./grok";
import type { IntelligenceProvider } from "./types";

export function activeIntelligence(): IntelligenceProvider {
  const id = process.env.AI_PROVIDER?.trim() || "elevenlabs";
  if (id === "elevenlabs") return elevenlabsIntelligence;
  if (id === "grok") return grokIntelligence;
  throw new Error(`Unknown AI_PROVIDER "${id}". Use elevenlabs.`);
}
