import type { CourseStats, QueryResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export async function postQuery(
  query: string,
  sessionId: string | null
): Promise<QueryResponse> {
  const response = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error("Query failed");
  }

  return response.json();
}

export async function getCourseStats(): Promise<CourseStats> {
  const response = await fetch(`${API_URL}/courses`);

  if (!response.ok) {
    throw new Error("Failed to load course stats");
  }

  return response.json();
}
