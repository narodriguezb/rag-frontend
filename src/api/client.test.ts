import { afterEach, describe, expect, it, vi } from "vitest";
import { getCourseStats, postQuery } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postQuery", () => {
  it("posts the query and returns parsed json", async () => {
    const payload = { answer: "42", sources: [], session_id: "s1" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postQuery("hi", null);

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "hi", session_id: null }),
    });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(postQuery("hi", null)).rejects.toThrow("Query failed");
  });
});

describe("getCourseStats", () => {
  it("fetches the courses endpoint and returns json", async () => {
    const payload = { total_courses: 2, course_titles: ["A", "B"] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCourseStats();

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/courses");
  });
});
