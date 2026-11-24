export interface SessionOverrides {
  agent?: {
    prompt: { prompt: string; llm?: string };
    firstMessage: string;
  };
  tts?: {
    voiceId: string;
    speed: number;
  };
  conversation?: {
    textOnly?: boolean;
  };
}

export interface SessionTicket {
  token?: string;
  signedUrl?: string;
  overrides: SessionOverrides;
}

export interface VoiceChoice {
  id: string;
  name: string;
  /** False when this ElevenLabs plan cannot speak the voice. */
  available: boolean;
}
