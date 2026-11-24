export type CallType = "outbound" | "inbound";

export interface BusinessSetup {
  business: string;
  callType: CallType;
  offer: string;
  goal: string;
}

export const DEFAULT_SETUP: BusinessSetup = {
  business: "Brightside Solar",
  callType: "outbound",
  offer:
    "Rooftop solar and battery installs. Typical home system 5-8 kW, about 3 days to install. Free site survey, no obligation. Finance available from 12 months to 7 years. 10-year workmanship warranty. Survey slots open Tuesday to Friday.",
  goal: "Book a free site survey. Be polite, never pushy. If they say stop or not interested twice, thank them and end the call.",
};

export interface AgentInstructions {
  prompt: string;
  firstMessage: string;
}

export function buildInstructions(input: BusinessSetup): AgentInstructions {
  const business = clip(input.business, "the business");
  const offer = clip(input.offer, "No facts were provided.");
  const goal = clip(input.goal, "Help the caller.");
  const inbound = input.callType === "inbound";
  const firstMessage = inbound
    ? `Thanks for calling ${business}. How can I help you today?`
    : `Hi, this is a quick call from ${business}. Have I caught you at an alright time?`;

  const prompt = [
    `You are a phone agent for ${business}. ${inbound ? "You are answering an inbound call." : "You are making an outbound pitch call."}`,
    `Your opening line was already spoken: "${firstMessage}" Do not repeat it.`,
    `Facts you may use (do not invent anything else; if unsure, say a colleague will follow up): ${offer}`,
    `Goal and rules: ${goal}`,
    "Style: this is spoken aloud. One to two short sentences, plain words, no lists, no markdown, no emoji. Listen to what the caller actually said: answer their question or objection first, then move toward the goal. Mirror their pace and mood. If asked whether you are a bot or AI, say yes, you are an automated assistant. If they ask to stop, comply politely and end.",
    "When a free site survey is a sensible next step and the caller is willing, offer to book one and confirm a day. When they ask to stop, or they decline twice, thank them and say goodbye.",
  ].join("\n");

  return { prompt, firstMessage };
}

function clip(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 4000) : fallback;
}
