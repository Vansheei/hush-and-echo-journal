export interface ToneAnalyzer { analyze(text: string): string[] }
// Conservative text cues only: no voice emotion detection or diagnosis.
export const textCueAnalyzer: ToneAnalyzer = {
  analyze(text) {
    const cues: string[] = [];
    if (/\b(worry|worried|anxious|afraid)\b/i.test(text)) cues.push("Possible worry — based on words, not voice.");
    if (/\b(happy|grateful|relieved|thankful)\b/i.test(text)) cues.push("Possible relief or appreciation — based on words, not voice.");
    if (/\b(sad|lonely|hurt|upset)\b/i.test(text)) cues.push("Possible sadness — based on words, not voice.");
    return cues;
  },
};