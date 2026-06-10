export interface Source {
  text: string;
  link?: string | null;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  session_id: string;
}

export interface CourseStats {
  total_courses: number;
  course_titles: string[];
}

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  isWelcome?: boolean;
}
