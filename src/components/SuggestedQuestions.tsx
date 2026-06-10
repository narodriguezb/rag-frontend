import CollapsibleSection from "./CollapsibleSection";

const QUESTIONS = [
  'What is the outline of the "MCP: Build Rich-Context AI Apps with Anthropic" course?',
  "Are there any courses that include a Chatbot implementation?",
  "Are there any courses that explain what RAG is?",
  "What was covered in lesson 5 of the MCP course?",
];

const LABELS = [
  "Outline of a course",
  "Courses about Chatbot",
  "Courses explaining RAG",
  "Details of a course's lesson",
];

interface Props {
  onSelect: (question: string) => void;
  disabled: boolean;
}

export default function SuggestedQuestions({ onSelect, disabled }: Props) {
  return (
    <CollapsibleSection title="Try asking:">
      <div className="flex flex-col gap-2 py-3">
        {QUESTIONS.map((question, i) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-text-primary transition hover:border-primary hover:bg-surface-hover hover:text-primary hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {LABELS[i]}
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
