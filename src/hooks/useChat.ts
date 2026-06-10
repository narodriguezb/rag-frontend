import { useCallback, useRef, useState } from "react";
import { postQuery } from "../api/client";
import type { ChatMessage } from "../types";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to the Course Materials Assistant! I can help you with questions about courses, lessons and specific content. What would you like to know?",
  isWelcome: true,
};

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query || isLoading) return;

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: query },
      ]);
      setIsLoading(true);

      try {
        const data = await postQuery(query, sessionId.current);
        sessionId.current = data.session_id;
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: data.answer,
            sources: data.sources,
          },
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: `Error: ${message}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  return { messages, isLoading, sendMessage };
}
