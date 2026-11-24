import type { AgentInstructions, BusinessSetup } from "../../shared/agent";

/**
 * A conversation model behind the ElevenLabs voice session.
 * The voice connection stays on ElevenLabs either way.
 * `llm` is omitted when ElevenLabs should use the model saved on the agent.
 */
export interface IntelligenceProvider {
  readonly id: "elevenlabs" | "grok";
  readonly label: string;
  prepare(setup: BusinessSetup): AgentInstructions & { llm?: string };
}
