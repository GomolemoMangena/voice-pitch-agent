import type { VoiceChoice } from "../../shared/session";
import { describeFailure, elevenlabs } from "./client";

const CACHE_MS = 60_000;

interface Favorite extends VoiceChoice {
  savedAt: number;
  bookmarked: boolean;
}

let cached: { at: number; voices: VoiceChoice[] } | null = null;

/**
 * Voices this account has kept: bookmarked, added to a collection, or otherwise saved.
 * IDs come from the API, never from a guessed list. ElevenLabs no longer sets
 * favoritedAtUnix for these; voiceType "saved" is the current library filter.
 */
export async function favoriteVoices(): Promise<VoiceChoice[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.voices;

  const favorites: Favorite[] = [];
  let nextPageToken: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    let result;
    try {
      result = await elevenlabs().voices.search({
        pageSize: 100,
        nextPageToken,
        voiceType: "saved",
      });
    } catch (error) {
      throw new Error(describeFailure(error));
    }
    for (const voice of result.voices) {
      favorites.push({
        id: voice.voiceId,
        name: voice.name?.trim() || voice.voiceId,
        available: canSpeak(voice.category, voice.isOwner),
        savedAt: voice.favoritedAtUnix ?? voice.createdAtUnix ?? 0,
        bookmarked: voice.isBookmarked === true,
      });
    }
    if (!result.hasMore || !result.nextPageToken) break;
    nextPageToken = result.nextPageToken;
  }

  favorites.sort((left, right) => {
    if (left.available !== right.available) return left.available ? -1 : 1;
    if (left.bookmarked !== right.bookmarked) return left.bookmarked ? -1 : 1;
    return right.savedAt - left.savedAt;
  });
  const choices = favorites.map(({ id, name, available }) => ({ id, name, available }));
  if (choices.length === 0) {
    throw new Error(
      "No saved voices were found on this ElevenLabs account. Bookmark a voice or add it to a collection, then reload.",
    );
  }
  cached = { at: Date.now(), voices: choices };
  return choices;
}

export async function assertFavoriteVoice(voiceId: string): Promise<void> {
  const voices = await favoriteVoices();
  const voice = voices.find((item) => item.id === voiceId);
  if (!voice) throw new Error("Choose one of the favourite voices.");
  if (!voice.available) {
    throw new Error("This voice needs a paid ElevenLabs plan. Choose Bella, which this account can speak.");
  }
}

/** Library copies (professional voices this account does not own) cannot be spoken on the free plan. */
function canSpeak(category: string | undefined, isOwner: boolean | undefined): boolean {
  if (category === "professional" && isOwner !== true) return false;
  return true;
}
