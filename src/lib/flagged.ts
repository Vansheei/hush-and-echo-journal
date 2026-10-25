/** Words Claude said it did not understand or was unsure about, flagged red in transcripts. */
export function cleanToken(token: string) {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
export function flaggedSet(flagged: string[] | undefined) {
  return new Set((flagged ?? []).map(cleanToken).filter(Boolean));
}
export function isFlagged(flagged: string[] | undefined, token: string) {
  const cleaned = cleanToken(token);
  return !!cleaned && flaggedSet(flagged).has(cleaned);
}
