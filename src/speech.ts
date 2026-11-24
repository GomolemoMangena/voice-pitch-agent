let playback: HTMLAudioElement | null = null;
let playbackUrl: string | null = null;
let request: AbortController | null = null;
let cancelPlayback: (() => void) | null = null;

export function stopSpeech(): void {
  request?.abort();
  request = null;
  cancelPlayback?.();
  cancelPlayback = null;
  if (playback) {
    playback.pause();
    playback.src = "";
    playback.remove();
    playback = null;
  }
  if (playbackUrl) {
    URL.revokeObjectURL(playbackUrl);
    playbackUrl = null;
  }
}

export async function playSpeech(text: string, voiceId: string, speed: number): Promise<void> {
  stopSpeech();
  const controller = new AbortController();
  request = controller;
  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId, speed }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(await readError(response));
    const blob = await response.blob();
    if (controller.signal.aborted) return;
    const url = URL.createObjectURL(blob);
    playbackUrl = url;
    const audio = new Audio(url);
    audio.volume = 1;
    audio.setAttribute("data-agent-voice", "true");
    document.body.appendChild(audio);
    playback = audio;
    await new Promise<void>((resolve, reject) => {
      cancelPlayback = () => resolve();
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("The audio could not play."));
      void audio.play().catch(reject);
    });
    cancelPlayback = null;
  } finally {
    if (request === controller) request = null;
  }
}

async function readError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // The body was audio or plain text.
  }
  return raw.slice(0, 400) || `Request failed (${response.status}).`;
}
