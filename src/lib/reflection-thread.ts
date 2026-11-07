export type ThreadItem = { id: string; role: "you" | "claude" | "note"; text: string; at: number };

/**
 * Builds the conversation Claude sees for a follow-up: the confirmed entry text,
 * the first reflection, then earlier replies. Private notes are never included.
 */
export function threadConversation(entryText: string, reflection: string, thread: ThreadItem[]) {
  const turns: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: entryText },
    { role: "assistant", content: reflection },
  ];
  for (const item of thread) {
    if (item.role === "note") continue;
    turns.push({ role: item.role === "you" ? "user" : "assistant", content: item.text });
  }
  return turns;
}
