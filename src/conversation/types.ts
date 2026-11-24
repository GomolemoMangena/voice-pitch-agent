import type { BusinessSetup } from "../../shared/agent";

export interface TranscriptItem {
  id: number;
  role: "caller" | "agent" | "note";
  text: string;
  latency: number | null;
}

export interface CallSession {
  inCall: boolean;
  microphone: boolean;
  listening: boolean;
  hearing: string;
  error: string;
  items: TranscriptItem[];
  start: (setup: BusinessSetup, voiceId: string, speed: number) => Promise<void>;
  end: () => void;
  toggleMic: () => void;
  sendText: (text: string) => void;
}
