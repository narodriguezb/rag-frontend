import CourseStatsPanel from "./CourseStatsPanel";
import SuggestedQuestions from "./SuggestedQuestions";

interface Props {
  onSelectQuestion: (question: string) => void;
  disabled: boolean;
}

export default function Sidebar({ onSelectQuestion, disabled }: Props) {
  return (
    <aside className="scrollbar-custom w-80 flex-shrink-0 overflow-y-auto border-r border-border bg-surface p-6 max-md:order-2 max-md:max-h-[40vh] max-md:w-full max-md:border-b max-md:border-r-0 max-lg:w-72">
      <CourseStatsPanel />
      <SuggestedQuestions onSelect={onSelectQuestion} disabled={disabled} />
    </aside>
  );
}
