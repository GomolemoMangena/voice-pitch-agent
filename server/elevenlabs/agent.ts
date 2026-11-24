import { readFileSync, writeFileSync } from "node:fs";
import { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { describeFailure, elevenlabs } from "./client";

const AGENT_NAME = "Voice Pitch Agent";

const overrideConfig: ElevenLabs.ConversationConfigClientOverrideConfigInput = {
  agent: {
    firstMessage: true,
    prompt: { prompt: true, llm: true },
  },
  tts: { voiceId: true, speed: true },
  conversation: { textOnly: true },
};

const clientEvents: ElevenLabs.ClientEvent[] = [
  ElevenLabs.ClientEvent.UserTranscript,
  ElevenLabs.ClientEvent.TentativeUserTranscript,
  ElevenLabs.ClientEvent.AgentResponse,
  ElevenLabs.ClientEvent.AgentChatResponsePart,
  ElevenLabs.ClientEvent.Interruption,
];

let preparing: Promise<string> | null = null;

export function ensureAgent(): Promise<string> {
  preparing ??= prepare().catch((error) => {
    preparing = null;
    throw error;
  });
  return preparing;
}

/** Writes this call's brief onto the agent. Client overrides of the opening line are rejected. */
export async function applyCall(input: {
  prompt: string;
  firstMessage: string;
  voiceId: string;
  speed: number;
}): Promise<string> {
  const agentId = await ensureAgent();
  try {
    await elevenlabs().conversationalAi.agents.update(agentId, {
      conversationConfig: {
        agent: {
          prompt: { prompt: input.prompt },
          firstMessage: input.firstMessage,
        },
        tts: {
          modelId: ElevenLabs.TtsConversationalModel.ElevenFlashV2,
          voiceId: input.voiceId,
          speed: input.speed,
        },
      },
    });
  } catch (error) {
    throw new Error(describeFailure(error));
  }
  return agentId;
}

async function prepare(): Promise<string> {
  const existing = process.env.ELEVENLABS_AGENT_ID?.trim();
  const agentId = existing || (await createAgent());
  try {
    await elevenlabs().conversationalAi.agents.update(agentId, {
      platformSettings: {
        auth: { enableAuth: true },
        overrides: { conversationConfigOverride: overrideConfig },
      },
      conversationConfig: {
        tts: { modelId: ElevenLabs.TtsConversationalModel.ElevenFlashV2 },
        conversation: { maxDurationSeconds: 1800, clientEvents },
      },
    });
  } catch (error) {
    throw new Error(describeFailure(error));
  }
  return agentId;
}

async function createAgent(): Promise<string> {
  let created;
  try {
    created = await elevenlabs().conversationalAi.agents.create({
      name: AGENT_NAME,
      conversationConfig: {
        agent: {
          language: "en",
          disableFirstMessageInterruptions: false,
          firstMessage: "Hi. Have I caught you at an alright time?",
          prompt: {
            prompt: "You are a phone agent. The call setup replaces this prompt at the start of each conversation.",
          },
        },
        tts: { modelId: ElevenLabs.TtsConversationalModel.ElevenFlashV2 },
        conversation: { maxDurationSeconds: 1800, clientEvents },
      },
      platformSettings: {
        auth: { enableAuth: true },
        overrides: { conversationConfigOverride: overrideConfig },
      },
    });
  } catch (error) {
    throw new Error(describeFailure(error));
  }
  persistAgentId(created.agentId);
  return created.agentId;
}

function persistAgentId(agentId: string): void {
  process.env.ELEVENLABS_AGENT_ID = agentId;
  const path = ".env";
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    text = "";
  }
  const line = `ELEVENLABS_AGENT_ID=${agentId}`;
  if (/^ELEVENLABS_AGENT_ID=.*$/m.test(text)) {
    text = text.replace(/^ELEVENLABS_AGENT_ID=.*$/m, line);
  } else {
    text = `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
}
