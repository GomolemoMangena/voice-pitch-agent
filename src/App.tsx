import { FormEvent, useEffect, useRef, useState } from "react";
import { DEFAULT_SETUP, type BusinessSetup, type CallType } from "../shared/agent";
import { useCallSession } from "./conversation/useCallSession";
import { listVoices } from "./providers/voice";
import { playSpeech, stopSpeech } from "./speech";
import type { VoiceChoice } from "../shared/session";

type Tab = "call" | "read";

export function App() {
  const [tab, setTab] = useState<Tab>("call");
  const [voices, setVoices] = useState<VoiceChoice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [voiceError, setVoiceError] = useState("");

  useEffect(() => {
    let active = true;
    listVoices()
      .then((next) => {
        if (!active) return;
        setVoices(next);
        setVoiceId((current) => {
          const chosen = next.find((voice) => voice.id === current);
          if (chosen?.available) return current;
          return next.find((voice) => voice.available)?.id || next[0]?.id || "";
        });
      })
      .catch((caught) => {
        if (!active) return;
        setVoiceError(caught instanceof Error ? caught.message : "The voice list could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>Voice Pitch Agent</h1>
          <p className="lede">Speak or type as the caller. The agent answers out loud.</p>
        </div>
        <div className="voice-controls">
          <label>
            Voice
            <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
              {voices.length === 0 && <option value="">No saved voices</option>}
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id} disabled={!voice.available}>
                  {voice.available ? voice.name : `${voice.name} (needs a paid plan)`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Speed
            <span className="speed">
              <input
                type="range"
                min={0.7}
                max={1.2}
                step={0.1}
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
              />
              <span>{rate.toFixed(1)}</span>
            </span>
          </label>
        </div>
      </header>
      {voiceError && <p className="error">{voiceError}</p>}

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "call"} onClick={() => setTab("call")}>
          Call simulator
        </button>
        <button type="button" role="tab" aria-selected={tab === "read"} onClick={() => setTab("read")}>
          Read text aloud
        </button>
      </div>

      <div hidden={tab !== "call"}>
        <CallSimulator voiceId={voiceId} rate={rate} />
      </div>
      <div hidden={tab !== "read"}>
        <ReadAloud voiceId={voiceId} rate={rate} />
      </div>
    </div>
  );
}

function CallSimulator({ voiceId, rate }: { voiceId: string; rate: number }) {
  const [business, setBusiness] = useState(DEFAULT_SETUP.business);
  const [callType, setCallType] = useState<CallType>(DEFAULT_SETUP.callType);
  const [offer, setOffer] = useState(DEFAULT_SETUP.offer);
  const [goal, setGoal] = useState(DEFAULT_SETUP.goal);
  const [draft, setDraft] = useState("");
  const session = useCallSession();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [session.items, session.hearing]);

  const setup: BusinessSetup = { business, callType, offer, goal };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    session.sendText(draft);
    setDraft("");
  }

  return (
    <div className="layout">
      <section className="card">
        <h2>Setup</h2>
        <div className="stack">
          <label className="field">
            Business name
            <input value={business} onChange={(event) => setBusiness(event.target.value)} />
          </label>
          <label className="field">
            Call type
            <select value={callType} onChange={(event) => setCallType(event.target.value as CallType)}>
              <option value="outbound">Outbound pitch</option>
              <option value="inbound">Answering inbound calls</option>
            </select>
          </label>
          <label className="field">
            Offer and key facts
            <textarea value={offer} onChange={(event) => setOffer(event.target.value)} />
          </label>
          <label className="field">
            Goal and rules
            <textarea className="goal" rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="card call-card">
        <h2>{session.inCall ? "On a call" : "Call"}</h2>
        <div className="log" ref={logRef} aria-live="polite">
          {session.items.length === 0 && <p className="note">Start the call to hear the opening line.</p>}
          {session.items.map((item) => {
            if (item.role === "note") {
              return (
                <p key={item.id} className="note">
                  {item.text}
                </p>
              );
            }
            if (item.role === "caller") {
              return (
                <div key={item.id} className="bubble caller">
                  <p>{item.text}</p>
                </div>
              );
            }
            return (
              <div key={item.id} className="agent-wrap">
                <div className="bubble agent">
                  {item.text ? <p>{item.text}</p> : <span className="pending" aria-label="Waiting for the reply" />}
                </div>
                {item.latency !== null && <p className="latency">first text in {item.latency.toFixed(1)} s</p>}
              </div>
            );
          })}
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={() => void session.start(setup, voiceId, rate)}
            disabled={session.inCall || !voiceId}
          >
            Start call
          </button>
          <button
            type="button"
            className={session.listening ? "listening" : "secondary"}
            aria-pressed={session.listening}
            onClick={session.toggleMic}
            disabled={!session.inCall || !session.microphone}
          >
            {session.listening ? "Listening" : "Speak"}
          </button>
          <button type="button" className="danger" onClick={session.end} disabled={!session.inCall}>
            End call
          </button>
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <input
            value={draft}
            placeholder={session.inCall ? "Type what the caller says" : "Start the call to type"}
            disabled={!session.inCall}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" disabled={!session.inCall || !draft.trim()}>
            Send
          </button>
        </form>
        {session.hearing && <p className="hearing">Hearing: {session.hearing}</p>}
        {session.error && <p className="error">{session.error}</p>}
        <p className="hint">The microphone is on while the button says Listening. Click it to mute. Use headphones so it does not hear the agent.</p>
      </section>
    </div>
  );
}

function ReadAloud({ voiceId, rate }: { voiceId: string; rate: number }) {
  const [text, setText] = useState("");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  async function play() {
    const spoken = text.trim();
    if (!spoken || !voiceId) return;
    setPlaying(true);
    setError("");
    try {
      await playSpeech(spoken, voiceId, rate);
    } catch (caught) {
      if (!isAbort(caught)) setError(caught instanceof Error ? caught.message : "The audio could not play.");
    } finally {
      setPlaying(false);
    }
  }

  return (
    <section className="card read-card">
      <h2>Read text aloud</h2>
      <textarea
        value={text}
        placeholder="Type something to hear the selected voice."
        onChange={(event) => setText(event.target.value)}
      />
      <div className="read-actions">
        <button type="button" onClick={() => void play()} disabled={!text.trim() || !voiceId}>
          {playing ? "Playing" : "Play"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            stopSpeech();
            setPlaying(false);
          }}
        >
          Stop
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
