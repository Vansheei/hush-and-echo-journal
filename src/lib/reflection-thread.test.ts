import { expect, it } from "vitest";
import { threadConversation, type ThreadItem } from "./reflection-thread";

const thread: ThreadItem[] = [
  { id: "1", role: "you", text: "Why do I keep avoiding her?", at: 1 },
  { id: "2", role: "claude", text: "Maybe it feels safer.", at: 2 },
  { id: "3", role: "note", text: "Private: I think it's guilt.", at: 3 },
];

it("sends earlier replies in order after the entry and first reflection", () => {
  expect(threadConversation("entry text", "first reflection", thread)).toEqual([
    { role: "user", content: "entry text" },
    { role: "assistant", content: "first reflection" },
    { role: "user", content: "Why do I keep avoiding her?" },
    { role: "assistant", content: "Maybe it feels safer." },
  ]);
});

it("never sends the owner's private notes to Claude", () => {
  const sent = JSON.stringify(threadConversation("entry text", "first reflection", thread));
  expect(sent).not.toContain("guilt");
});
