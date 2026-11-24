import { buildInstructions, type BusinessSetup } from "../../shared/agent";
import type { IntelligenceProvider } from "./types";

/** ElevenLabs hosts the language model. This provider only supplies the phone brief. */
export const elevenlabsIntelligence: IntelligenceProvider = {
  id: "elevenlabs",
  label: "ElevenLabs",
  prepare(setup: BusinessSetup) {
    return buildInstructions(setup);
  },
};
