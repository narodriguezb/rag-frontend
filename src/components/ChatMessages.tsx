import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import Message from "./Message";
import LoadingDots from "./LoadingDots";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function ChatMessages({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="scrollbar-custom flex flex-1 flex-col gap-4 overflow-y-auto p-8">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="max-w-[85%] self-start">
          <div className="rounded-[18px] rounded-bl-sm bg-surface">
            <LoadingDots />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
