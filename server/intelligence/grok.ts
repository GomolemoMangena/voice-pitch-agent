import type { BusinessSetup } from "../../shared/agent";
import type { IntelligenceProvider } from "./types";

/**
 * Reserved seam for a later Grok provider.
 * The voice session would stay on ElevenLabs and send `llm: "custom-llm"`
 * once a server endpoint exists to answer those turns. That endpoint is not built.
 */
export const grokIntelligence: IntelligenceProvider = {
  id: "grok",
  label: "Grok",
  prepare(_setup: BusinessSetup): never {
    throw new Error("Grok is not connected. Leave AI_PROVIDER unset or set it to elevenlabs.");
  },
};
