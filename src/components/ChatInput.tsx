import { useState } from "react";

interface Props {
  onSend: (query: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="flex flex-shrink-0 gap-3 border-t border-border bg-background px-8 py-6">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        disabled={disabled}
        autoComplete="off"
        placeholder="Ask about courses, lessons, or specific content..."
        className="flex-1 rounded-3xl border border-border bg-surface px-5 py-3.5 text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-label="Send"
        className="flex min-w-[52px] items-center justify-center rounded-3xl bg-primary px-5 py-3 text-white transition hover:not-disabled:bg-primary-hover hover:not-disabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
