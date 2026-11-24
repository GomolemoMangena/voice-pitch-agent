import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ConversationRoot } from "./providers/root";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConversationRoot>
      <App />
    </ConversationRoot>
  </StrictMode>,
);
