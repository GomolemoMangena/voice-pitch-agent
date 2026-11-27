import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import type { BusinessSetup } from "../../../shared/agent";
import type { SessionTicket } from "../../../shared/session";
import { isGoodbye, isHardStop, isSoftDecline } from "../../intent";
import { apiUrl } from "../../apiBase";
import { playSpeech, stopSpeech } from "../../speech";
import type { CallSession, TranscriptItem } from "../../conversation/types";

interface PartEvent {
  type?: string;
  text?: string;
}

export function useCallSession(): CallSession {
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [inCall, setInCall] = useState(false);
  const [hearing, setHearing] = useState("");
  const [error, setError] = useState("");
  const [voiceMode, setVoiceMode] = useState(true);
  const [userMuted, setUserMuted] = useState(false);

  const itemsRef = useRef<TranscriptItem[]>([]);
  const inCallRef = useRef(false);
  const idRef = useRef(1);
  const declinesRef = useRef(0);
  const endAfterRef = useRef(false);
  const hangupRef = useRef(false);
  const notedRef = useRef(false);
  const openAgentRef = useRef<number | null>(null);
  const userAtRef = useRef<number | null>(null);
  const typedRef = useRef("");
  const voiceModeRef = useRef(true);
  const voiceRef = useRef({ voiceId: "", speed: 1 });
  const connectedRef = useRef(false);
  const micBlockedRef = useRef(false);
  const endRef = useRef<() => void>(() => {});
  const speakGenRef = useRef(0);
  const duckedRef = useRef(false);
  const userMutedRef = useRef(false);
  const speakReplyRef = useRef<(text: string) => Promise<void>>(async () => {});
  const setMutedRef = useRef<(muted: boolean) => void>(() => {});

  const publish = useCallback((next: TranscriptItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return idRef.current;
  }, []);

  const finish = useCallback(
    (conversationEnd: () => void) => {
      if (!inCallRef.current) return;
      inCallRef.current = false;
      setInCall(false);
      setHearing("");
      hangupRef.current = false;
      stopSpeech();
      try {
        conversationEnd();
      } catch {
        // The session was already closed.
      }
      if (!notedRef.current) {
        notedRef.current = true;
        publish([...itemsRef.current, { id: nextId(), role: "note", text: "Call ended", latency: null }]);
      }
    },
    [nextId, publish],
  );

  const openAgent = useCallback(() => {
    if (openAgentRef.current !== null) return openAgentRef.current;
    const id = nextId();
    openAgentRef.current = id;
    const latency = userAtRef.current === null ? null : (performance.now() - userAtRef.current) / 1000;
    publish([...itemsRef.current, { id, role: "agent", text: "", latency }]);
    return id;
  }, [nextId, publish]);

  const writeAgent = useCallback(
    (id: number, text: string, replace: boolean) => {
      publish(
        itemsRef.current.map((item) => {
          if (item.id !== id) return item;
          const latency =
            item.latency ?? (userAtRef.current === null ? null : (performance.now() - userAtRef.current) / 1000);
          return { ...item, text: replace ? text : `${item.text}${text}`, latency };
        }),
      );
    },
    [publish],
  );

  const conversation = useConversation({
    onConnect: () => {
      connectedRef.current = true;
      if (!micBlockedRef.current) setError("");
      silenceRemoteAudio();
    },
    onDisconnect: () => {
      if (!inCallRef.current) return;
      inCallRef.current = false;
      setInCall(false);
      setHearing("");
      if (!notedRef.current) {
        notedRef.current = true;
        publish([...itemsRef.current, { id: nextId(), role: "note", text: "Call ended", latency: null }]);
      }
    },
    onError: (message) => {
      setError((current) => (current && /unknown error/i.test(message) ? current : message || "The conversation failed."));
      if (!connectedRef.current) {
        inCallRef.current = false;
        setInCall(false);
      }
    },
    onIncomingEvent: (event) => {
      const detail = serverError(event);
      if (detail) setError(detail);
      const transcript = tentativeTranscript(event);
      if (transcript) setHearing(transcript);
    },
    onAgentChatResponsePart: (part) => {
      const chunk = part as PartEvent;
      if (chunk.type === "start") {
        const id = openAgent();
        if (chunk.text) writeAgent(id, chunk.text, true);
        return;
      }
      if (chunk.type === "delta" && chunk.text) {
        writeAgent(openAgent(), chunk.text, false);
      }
    },
    onInterruption: () => {
      silenceRemoteAudio();
      if (duckedRef.current) return;
      openAgentRef.current = null;
      hangupRef.current = false;
      speakGenRef.current += 1;
      stopSpeech();
    },
    onModeChange: () => {
      silenceRemoteAudio();
    },
    onMessage: (payload) => {
      const text = payload.message.trim();
      if (!text) return;
      if (payload.role === "user") {
        setHearing("");
        openAgentRef.current = null;
        userAtRef.current = performance.now();
        hangupRef.current = false;
        if (normalize(text) === normalize(typedRef.current)) {
          typedRef.current = "";
          return;
        }
        const soft = isSoftDecline(text);
        if (soft) declinesRef.current += 1;
        endAfterRef.current = isHardStop(text) || (soft && declinesRef.current >= 2);
        publish([...itemsRef.current, { id: nextId(), role: "caller", text, latency: null }]);
        return;
      }

      const id = openAgentRef.current ?? openAgent();
      writeAgent(id, text, true);
      openAgentRef.current = null;
      hangupRef.current = endAfterRef.current || (declinesRef.current > 0 && isGoodbye(text));
      void speakReplyRef.current(text);
    },
  });

  endRef.current = conversation.endSession;
  setMutedRef.current = conversation.setMuted;

  const speakReply = useCallback(
    async (text: string) => {
      const generation = ++speakGenRef.current;
      const stale = () => generation !== speakGenRef.current || !inCallRef.current;
      silenceRemoteAudio();
      const duck = voiceModeRef.current && !userMutedRef.current;
      duckedRef.current = duck;
      if (duck) setMutedRef.current(true);
      try {
        await playSpeech(text, voiceRef.current.voiceId, voiceRef.current.speed);
      } catch (caught) {
        if (!isAbort(caught) && !stale()) {
          setError(caught instanceof Error ? caught.message : "The reply could not be played.");
        }
      } finally {
        duckedRef.current = false;
        if (duck && inCallRef.current && !userMutedRef.current) setMutedRef.current(false);
      }
      if (stale()) return;
      if (hangupRef.current) finish(() => endRef.current());
    },
    [finish],
  );

  speakReplyRef.current = speakReply;

  useEffect(() => {
    if (!inCall) return;
    const timer = window.setInterval(() => silenceRemoteAudio(), 400);
    return () => window.clearInterval(timer);
  }, [inCall]);

  useEffect(() => {
    return () => {
      stopSpeech();
      try {
        endRef.current();
      } catch {
        // Nothing was connected.
      }
    };
  }, []);

  const start = useCallback(
    async (setup: BusinessSetup, voiceId: string, speed: number) => {
      setError("");
      setHearing("");
      declinesRef.current = 0;
      endAfterRef.current = false;
      hangupRef.current = false;
      notedRef.current = false;
      connectedRef.current = false;
      micBlockedRef.current = false;
      duckedRef.current = false;
      userMutedRef.current = false;
      setUserMuted(false);
      primeAudio();
      openAgentRef.current = null;
      userAtRef.current = null;
      typedRef.current = "";
      voiceRef.current = { voiceId, speed };
      publish([]);
      inCallRef.current = true;
      setInCall(true);

      let microphone = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        microphone = false;
        micBlockedRef.current = true;
        setError("Microphone permission was blocked. You can still type. The replies are read aloud.");
      }
      voiceModeRef.current = microphone;
      setVoiceMode(microphone);

      let ticket: SessionTicket;
      try {
        const response = await fetch(apiUrl("/conversation/session"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...setup, voiceId, speed, mode: microphone ? "voice" : "text" }),
        });
        const body = (await response.json()) as SessionTicket & { error?: string };
        if (!response.ok || (microphone ? !body.token : !body.signedUrl)) {
          throw new Error(body.error || "The call could not start.");
        }
        ticket = body;
      } catch (caught) {
        inCallRef.current = false;
        setInCall(false);
        setError(caught instanceof Error ? caught.message : "The call could not start.");
        return;
      }

      userAtRef.current = performance.now();
      const overrides = microphone ? undefined : { conversation: { textOnly: true as const } };
      if (microphone && ticket.token) {
        // ElevenLabs rejects LiveKit's default /rtc/v1 join. The dual peer connection uses /rtc.
        conversation.startSession({
          conversationToken: ticket.token,
          connectionType: "webrtc",
          overrides,
          webRtc: { singlePeerConnection: false },
        });
      } else if (ticket.signedUrl) {
        conversation.startSession({ signedUrl: ticket.signedUrl, connectionType: "websocket", overrides });
      }
    },
    [conversation, publish],
  );

  const end = useCallback(() => {
    finish(conversation.endSession);
  }, [conversation, finish]);

  const toggleMic = useCallback(() => {
    if (!voiceModeRef.current || conversation.status !== "connected") return;
    const muted = !userMutedRef.current;
    userMutedRef.current = muted;
    setUserMuted(muted);
    if (!duckedRef.current) conversation.setMuted(muted);
  }, [conversation]);

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!inCallRef.current || !trimmed) return;
      const soft = isSoftDecline(trimmed);
      if (soft) declinesRef.current += 1;
      endAfterRef.current = isHardStop(trimmed) || (soft && declinesRef.current >= 2);
      typedRef.current = trimmed;
      userAtRef.current = performance.now();
      hangupRef.current = false;
      stopSpeech();
      publish([...itemsRef.current, { id: nextId(), role: "caller", text: trimmed, latency: null }]);
      conversation.sendUserMessage(trimmed);
    },
    [conversation, nextId, publish],
  );

  return {
    inCall,
    microphone: voiceMode,
    listening: inCall && voiceMode && !userMuted && conversation.status === "connected",
    hearing,
    error,
    items,
    start,
    end,
    toggleMic,
    sendText,
  };
}

function serverError(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const record = event as { type?: string; error_event?: { message?: string; reason?: string } };
  if (record.type !== "error") return null;
  return record.error_event?.message || record.error_event?.reason || null;
}

function tentativeTranscript(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const record = event as {
    type?: string;
    tentative_user_transcription_event?: { user_transcript?: string };
  };
  if (record.type !== "tentative_user_transcript") return null;
  const text = record.tentative_user_transcription_event?.user_transcript?.trim();
  return text || null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

let primed: AudioContext | null = null;

/** Run from the Start click, before any await, so the browser will allow later playback. */
function primeAudio(): void {
  const Context = window.AudioContext;
  if (!Context) return;
  primed ??= new Context();
  void primed.resume();
}

function liveElements(): HTMLAudioElement[] {
  return [...document.querySelectorAll("audio")].filter(
    (element) => element.srcObject instanceof MediaStream,
  );
}

function silenceRemoteAudio(): void {
  for (const element of liveElements()) {
    element.muted = true;
    element.volume = 0;
    element.pause();
  }
}
