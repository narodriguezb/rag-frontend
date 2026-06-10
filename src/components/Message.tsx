import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, Source } from "../types";

function SourceLink({ source }: { source: Source }) {
  if (source.link) {
    return (
      <a
        href={source.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary-hover hover:underline"
      >
        {source.text}
      </a>
    );
  }
  return <span>{source.text}</span>;
}

function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 text-xs text-text-secondary">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer select-none font-medium hover:text-text-primary"
      >
        {open ? "▼" : "▶"} Sources
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-2 pl-2">
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded border-l-[3px] border-primary bg-primary/10 p-2 text-[0.8rem] leading-snug"
            >
              <SourceLink source={source} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex animate-fade-in flex-col ${
        isUser ? "items-end self-end" : "items-start self-start"
      } max-w-[85%]`}
    >
      <div
        className={`rounded-[18px] px-5 py-3 break-words ${
          isUser
            ? "rounded-br-sm bg-user-message text-white"
            : `rounded-bl-sm bg-surface text-text-primary ${
                message.isWelcome ? "border-2 border-border shadow-lg" : ""
              }`
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {message.sources && message.sources.length > 0 && (
        <Sources sources={message.sources} />
      )}
    </div>
  );
}
