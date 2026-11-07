import type { Segment } from "@/lib/storage/db";

/**
 * Applies the owner's edited text to each transcript piece, keeping its original
 * times so "With times" and play-from-here still line up. Emptied pieces are dropped.
 */
export function applySegmentEdits(segments: Segment[], texts: string[]): Segment[] {
  if (texts.length !== segments.length) throw new Error("Transcript changed while editing. Close and try again.");
  return segments
    .map((s, i) => ({ ...s, text: (texts[i] ?? "").replace(/\s+/gu, " ").trim() }))
    .filter((s) => s.text.length > 0);
}
