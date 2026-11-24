import { ConversationProvider } from "@elevenlabs/react";
import type { ReactNode } from "react";

export function ConversationRoot({ children }: { children: ReactNode }) {
  return <ConversationProvider>{children}</ConversationProvider>;
}
