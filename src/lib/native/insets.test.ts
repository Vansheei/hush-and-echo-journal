import { afterEach, expect, it, vi } from "vitest";
import { applyNativeInsets, startNativeInsets } from "./insets";

const mocks = vi.hoisted(() => ({ native: true, overlay: vi.fn(), get: vi.fn(), listen: vi.fn(), remove: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => "android" },
  registerPlugin: () => ({ getInsets: mocks.get, addListener: mocks.listen }),
}));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setOverlaysWebView: mocks.overlay } }));
afterEach(() => { vi.clearAllMocks(); document.documentElement.removeAttribute("style"); mocks.native = true; });

it("requests an Android overlay and applies both system-bar insets with rotation updates", async () => {
  mocks.get.mockResolvedValue({ top: 32, bottom: 24, left: 0, right: 0 });
  mocks.listen.mockResolvedValue({ remove: mocks.remove });
  const stop = await startNativeInsets();
  expect(mocks.overlay).toHaveBeenCalledWith({ overlay: true });
  expect(document.documentElement.style.getPropertyValue("--native-safe-top")).toBe("32px");
  expect(document.documentElement.style.getPropertyValue("--native-safe-bottom")).toBe("24px");
  const update = mocks.listen.mock.calls[0]?.[1];
  update({ top: 0, bottom: 24, left: 32, right: 0 });
  expect(document.documentElement.style.getPropertyValue("--native-safe-left")).toBe("32px");
  stop(); expect(mocks.remove).toHaveBeenCalledOnce();
});

it("leaves browser safe areas to CSS without calling Android", async () => {
  mocks.native = false;
  const stop = await startNativeInsets(); stop();
  expect(mocks.overlay).not.toHaveBeenCalled(); expect(mocks.get).not.toHaveBeenCalled();
});

it("rejects invalid inset values and clamps negatives", () => {
  applyNativeInsets({ top: -1, bottom: 25, left: NaN, right: Infinity });
  expect(document.documentElement.style.getPropertyValue("--native-safe-top")).toBe("0px");
  expect(document.documentElement.style.getPropertyValue("--native-safe-left")).toBe("");
});