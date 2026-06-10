import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "./useChat";
import { postQuery } from "../api/client";

vi.mock("../api/client", () => ({
  postQuery: vi.fn(),
}));

const mockedPostQuery = vi.mocked(postQuery);

describe("useChat", () => {
  beforeEach(() => {
    mockedPostQuery.mockReset();
  });

  it("starts with a single welcome message", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isWelcome).toBe(true);
  });

  it("appends the user message and the assistant reply", async () => {
    mockedPostQuery.mockResolvedValue({
      answer: "the answer",
      sources: [],
      session_id: "s1",
    });

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage("what is mcp?");
    });

    const messages = result.current.messages;
    expect(messages).toHaveLength(3);
    expect(messages[1]).toMatchObject({ role: "user", content: "what is mcp?" });
    expect(messages[2]).toMatchObject({ role: "assistant", content: "the answer" });
  });

  it("ignores empty input", async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(mockedPostQuery).not.toHaveBeenCalled();
  });

  it("renders an error message when the request fails", async () => {
    mockedPostQuery.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage("q");
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "Error: boom",
    });
  });
});
