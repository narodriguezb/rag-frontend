import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatInput from "./ChatInput";

describe("ChatInput", () => {
  it("sends the typed value and clears the input", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText(/ask about courses/i);
    await userEvent.type(input, "hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith("hello");
    expect(input).toHaveValue("");
  });

  it("does not send when disabled", async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={true} />);

    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(onSend).not.toHaveBeenCalled();
  });
});
