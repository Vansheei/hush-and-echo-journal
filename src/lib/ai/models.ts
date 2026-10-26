// Each model names its own "off" form for thinking; the other form is rejected with a 400.
// Haiku 5.5 takes disabled, Sonnet 5.5 takes between_tools, both valid at effort "high" or below.
export const MODELS = {
  haiku: { label: "Claude Haiku 5.5", id: "claude-haiku-5-5", thinkingOff: { type: "disabled" } },
  sonnet: { label: "Claude Sonnet 5.5", id: "claude-sonnet-5-5", thinkingOff: { type: "between_tools" } },
} as const;
export type ModelChoice = keyof typeof MODELS;
export const FEATURES = ["extraction", "tagging", "notebook", "reflection", "companion", "recap", "drafts"] as const;
export type Feature = (typeof FEATURES)[number];
export const MODEL_DEFAULTS: Record<Feature, ModelChoice> = {
  extraction: "haiku", tagging: "haiku", notebook: "haiku", reflection: "haiku",
  companion: "sonnet", recap: "sonnet", drafts: "sonnet",
};