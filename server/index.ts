import "dotenv/config";
import { Readable } from "node:stream";
import express from "express";
import type { CallType } from "../shared/agent";
import type { SessionTicket } from "../shared/session";
import { applyCall } from "./elevenlabs/agent";
import { describeFailure, elevenlabs } from "./elevenlabs/client";
import { assertFavoriteVoice, favoriteVoices } from "./elevenlabs/voices";
import { activeIntelligence } from "./intelligence";

const PORT = 4100;
const SPEAK_MODEL = "eleven_flash_v2_5";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/voices", async (_req, res) => {
  try {
    const voices = await favoriteVoices();
    res.json({ voices });
  } catch (error) {
    res.status(502).json({ error: describeFailure(error) });
  }
});

app.post("/api/conversation/session", async (req, res) => {
  try {
    const setup = readSetup(req.body);
    const voiceId = typeof req.body?.voiceId === "string" ? req.body.voiceId.trim() : "";
    const speed = clampSpeed(req.body?.speed);
    if (!voiceId) {
      res.status(400).json({ error: "Choose a voice." });
      return;
    }
    await assertFavoriteVoice(voiceId);
    const prepared = activeIntelligence().prepare(setup);
    const agentId = await applyCall({
      prompt: prepared.prompt,
      firstMessage: prepared.firstMessage,
      voiceId,
      speed,
    });
    const textOnly = req.body?.mode === "text";
    const ticket: SessionTicket = {
      overrides: textOnly ? { conversation: { textOnly: true } } : {},
    };
    if (textOnly) {
      const signed = await elevenlabs().conversationalAi.conversations.getSignedUrl({ agentId });
      ticket.signedUrl = signed.signedUrl;
    } else {
      const token = await elevenlabs().conversationalAi.conversations.getWebrtcToken({ agentId });
      ticket.token = token.token;
    }
    res.json(ticket);
  } catch (error) {
    res.status(502).json({ error: describeFailure(error) });
  }
});

app.post("/api/speak", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const voiceId = typeof req.body?.voiceId === "string" ? req.body.voiceId.trim() : "";
  const speed = clampSpeed(req.body?.speed);
  if (!text) {
    res.status(400).json({ error: "Enter some text to read." });
    return;
  }
  if (!voiceId) {
    res.status(400).json({ error: "Choose a voice." });
    return;
  }

  try {
    await assertFavoriteVoice(voiceId);
    const stream = await elevenlabs().textToSpeech.stream(voiceId, {
      text: text.slice(0, 5000),
      modelId: SPEAK_MODEL,
      voiceSettings: { speed, stability: 0.5, similarityBoost: 0.75 },
    });
    res.status(200);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    Readable.fromWeb(stream as import("node:stream/web").ReadableStream<Uint8Array>).pipe(res);
  } catch (error) {
    if (!res.headersSent) res.status(502).json({ error: describeFailure(error) });
    else res.end();
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Voice Pitch Agent API on http://127.0.0.1:${PORT}`);
});

function readSetup(body: unknown): { business: string; callType: CallType; offer: string; goal: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    business: textField(record.business),
    callType: record.callType === "inbound" ? "inbound" : "outbound",
    offer: textField(record.offer),
    goal: textField(record.goal),
  };
}

function textField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampSpeed(value: unknown): number {
  const speed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(speed)) return 1;
  return Math.min(1.2, Math.max(0.7, Math.round(speed * 10) / 10));
}
