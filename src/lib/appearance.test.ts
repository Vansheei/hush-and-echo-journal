import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
it("preserves seasonal and voice choices across reloads without changing the chosen cover", async () => {
  const appearance = await import("./appearance");
  appearance.setAppearance({ cover: "plum", seasonalScene: false, readRepliesAloud: false, companionVoiceSpeed: 1.25 });
  vi.resetModules();
  const reloaded = await import("./appearance");
  expect(reloaded.getAppearance()).toMatchObject({ cover: "plum", seasonalScene: false, readRepliesAloud: false, companionVoiceSpeed: 1.25 });
});
it("keeps the existing 1.15x speech default and enabled seasonal scenes", async () => {
  const appearance = await import("./appearance");
  expect(appearance.getAppearance()).toMatchObject({ companionVoiceSpeed: 1.15, seasonalScene: true, readRepliesAloud: true });
});
it("retains Hindi interface language after reload without touching encrypted settings", async () => {
  const appearance = await import("./appearance");
  appearance.setAppearance({ language: "hi" });
  vi.resetModules();
  expect((await import("./appearance")).getAppearance().language).toBe("hi");
  expect(localStorage.length).toBe(1);
});