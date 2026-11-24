const HARD_STOP =
  /\b(stop calling|please stop|hang up|end the call|don'?t call|do not call|remove me|take me off|goodbye)\b|^\s*(stop|bye|goodbye)\b/i;

const SOFT_DECLINE = /\b(not interested|no thanks|no thank you|not a good time)\b/i;

const GOODBYE =
  /\b(goodbye|good-bye|have a (good|great|nice) day|thanks for your time|thank you for your time)\b/i;

export function isHardStop(text: string): boolean {
  return HARD_STOP.test(text);
}

export function isSoftDecline(text: string): boolean {
  return SOFT_DECLINE.test(text);
}

export function isGoodbye(text: string): boolean {
  return GOODBYE.test(text);
}
