import { useEffect, useState } from "react";
import { getCourseStats } from "../api/client";
import type { CourseStats } from "../types";
import CollapsibleSection from "./CollapsibleSection";

export default function CourseStatsPanel() {
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCourseStats()
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <CollapsibleSection title="Courses">
      <div className="flex flex-col gap-3 py-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <span className="text-sm font-semibold text-text-secondary">
            Number of courses:
          </span>
          <span className="ml-2 text-sm font-semibold text-primary">
            {error ? "0" : (stats?.total_courses ?? "-")}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          {error ? (
            <span className="text-[0.85rem] italic text-text-secondary">
              Failed to load courses
            </span>
          ) : !stats ? (
            <span className="text-[0.85rem] italic text-text-secondary">
              Loading...
            </span>
          ) : stats.course_titles.length === 0 ? (
            <span className="text-[0.85rem] italic text-text-secondary">
              No courses available
            </span>
          ) : (
            stats.course_titles.map((title) => (
              <div
                key={title}
                className="border-b border-border py-2 text-[0.85rem] leading-snug text-text-primary last:border-b-0"
              >
                {title}
              </div>
            ))
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
