# Voice Pitch Agent

A browser demo of a sales or answering call. You speak or type as the caller. [ElevenLabs Conversational AI](https://elevenlabs.io/docs/eleven-agents/overview) listens, decides what to say, and speaks the reply. The page stays at [http://localhost:5180](http://localhost:5180).

This project is separate from `voice-agent-platform`.

## Installation

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. In this folder, run `npm install`.

## Environment variables

Copy `.env.example` to `.env`.

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | Server-only key. The browser never receives it. |
| `ELEVENLABS_AGENT_ID` | Written automatically after the agent is created. |
| `AI_PROVIDER` | `elevenlabs` today. `grok` is reserved and refuses to start. |

`.env` is listed in `.gitignore`. Do not commit it.

The key needs these permissions: `voices_read`, `text_to_speech`, `convai_read`, and `convai_write`. A restricted key can sign in and still be rejected for those operations.

## ElevenLabs account setup

1. Create an API key in the ElevenLabs dashboard and paste it into `.env`.
2. Bookmark the voices you want, or add them to a collection such as Voice Pitch Agent. The voice menu loads those saved voices from the API. It does not ship with built-in voice IDs.
3. Start the app and press **Start call** once. The server creates a private agent named Voice Pitch Agent and saves the agent id. Each call writes that call's prompt, opening line, voice, and speed onto the agent before it connects.

The agent uses ElevenLabs' own conversational model. Business name, call type, offer, and goal are sent as the system prompt for that call. A later Grok connection can replace that model without changing the page: add a provider beside `server/intelligence/elevenlabs.ts` and point `AI_PROVIDER` at it. The voice session stays on ElevenLabs.

## Voice configuration

The header lists every voice your account has saved (bookmarked or added to a collection), bookmarked voices first. Speed runs from 0.7 to 1.2, which is the range ElevenLabs accepts. Calls and Read text aloud both use the selected voice. Call speech uses Flash v2, which is the model English agents are allowed to use. Read text aloud uses Flash v2.5, which applies the speed control.

## Running locally

```powershell
npm run dev
```

That starts the Vite page on port 5180 and the Express API on `127.0.0.1:4100`. Vite proxies `/api` to the API. No second server and no tunnel are required.

Voice calls connect from the browser to ElevenLabs with WebRTC, using a short-lived token from `POST /api/conversation/session`. The API key stays on the server. If the microphone is blocked, the same button opens a text session over a signed ElevenLabs WebSocket and the server reads the replies aloud with ElevenLabs text-to-speech.

## Testing the microphone

Use Chrome or Edge. Start a call and allow the microphone. Press **Speak** to turn the microphone on. The agent can be interrupted while it is talking. Headphones keep the microphone from hearing the speakers. Typed lines use the same live session: press Enter or Send.

The opening line is spoken as soon as the call connects. The Brightside Solar setup fields are the defaults and can be edited before the call.

## Troubleshooting

- **Missing permission** on the voice list or on Start call: create a new API key that includes `voices_read`, `text_to_speech`, `convai_read`, and `convai_write`, put it in `.env`, and restart `npm run dev`.
- **No saved voices**: bookmark a voice or add it to a collection in the ElevenLabs voice library, then reload the page.
- **Microphone permission was blocked**: you can still type. Replies are spoken through the Read aloud voice. Allow the microphone in the browser site settings to use Speak.
- **The call ends after about 30 minutes**: that is the session limit set on the agent.
- **Port 5180 is already in use**: stop the other process and run `npm run dev` again.

## What changed from the earlier prototype

The previous server asked Anthropic for every line and the browser spoke it with `speechSynthesis`. That path is gone because conversational intelligence, speech recognition, speech synthesis, turn taking, and interruption now belong to ElevenLabs. The two tabs, the setup fields, typed messages, and the Brightside Solar defaults are still here.
