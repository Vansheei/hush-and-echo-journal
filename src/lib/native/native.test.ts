import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinWrap, createVault, decryptJSON, encryptJSON, unlockWithPinWrap } from "@/lib/crypto/vault";

const mocks = vi.hoisted(() => ({
  native: true, secrets: new Map<string, string>(), enroll: vi.fn(), unlock: vi.fn(), remove: vi.fn(),
  write: vi.fn(), share: vi.fn(), speak: vi.fn(), stop: vi.fn(), voices: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.native ? "android" : "web" },
  registerPlugin: () => ({ available: async () => ({ available: true }), exists: async ({ id }: { id: string }) => ({ exists: mocks.secrets.has(id) }),
    enroll: mocks.enroll, unlock: mocks.unlock, remove: mocks.remove }) }));
vi.mock("@capacitor/filesystem", () => ({ Filesystem: { mkdir: async () => {}, writeFile: mocks.write }, Directory: { Cache: "CACHE" }, Encoding: { UTF8: "utf8" } }));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));
vi.mock("@capacitor-community/text-to-speech", () => ({ TextToSpeech: { speak: mocks.speak, stop: mocks.stop, getSupportedVoices: mocks.voices } }));
import { enableNativeUnlock, removeNativeUnlock, unlockNative } from "./biometric";
import { defaultWhisperModel } from "./platform";
import { getSettings, putSettings, platformSettings } from "@/lib/storage/db";
import { deliverBackup } from "./backup";
import { localVoices, speakLocal, stopSpeech } from "./speech";
import { handleNativeBack, registerBackHandler } from "./back";

beforeEach(() => {
  vi.clearAllMocks(); mocks.native = true;
  mocks.enroll.mockImplementation(async ({ id, secret }) => { mocks.secrets.set(id, secret); });
  mocks.unlock.mockImplementation(async ({ id }) => ({ secret: mocks.secrets.get(id) }));
  mocks.remove.mockImplementation(async ({ id }) => { mocks.secrets.delete(id); });
  mocks.write.mockResolvedValue({ uri: "content://backup" }); mocks.share.mockResolvedValue({});
  mocks.stop.mockResolvedValue(undefined); mocks.speak.mockResolvedValue(undefined);
});
describe("native Android rules", () => {
  it("authenticated biometric release unlocks the same diary as the PIN", async () => {
    const { key, meta } = await createVault("owner-pass", 1000);
    const ciphertext = await encryptJSON(key, { diary: "same encrypted chapter" });
    const pin = await createPinWrap(meta, "owner-pass", "123456");
    await enableNativeUnlock(meta, "owner-pass");
    expect(await decryptJSON(await unlockNative(), ciphertext)).toEqual(await decryptJSON(await unlockWithPinWrap(pin, "123456"), ciphertext));
    expect((await unlockNative()).extractable).toBe(false);
    await removeNativeUnlock();
    await expect(unlockNative()).rejects.toThrow("Enable fingerprint");
  });
  it("cancelled biometric authentication does not release a key", async () => {
    const { meta } = await createVault("owner-pass", 1000);
    await enableNativeUnlock(meta, "owner-pass");
    mocks.unlock.mockRejectedValueOnce(new Error("cancelled"));
    await expect(unlockNative()).rejects.toThrow("cancelled");
    await removeNativeUnlock();
  });
  it("Android defaults to base while browser defaults to small and explicit small survives", async () => {
    expect(defaultWhisperModel(true)).toBe("base"); expect(defaultWhisperModel(false)).toBe("small");
    const { key } = await createVault("owner-pass", 1000);
    await putSettings(key, platformSettings()); expect((await getSettings(key)).whisperModel).toBe("base");
    await putSettings(key, { ...platformSettings(), whisperModel: "small" }); expect((await getSettings(key)).whisperModel).toBe("small");
  });
  it("writes the encrypted backup before sharing the returned file URI", async () => {
    const ciphertext = '{"format":"diary-encrypted-backup","stores":{"entries":[{"ct":[1,2,3]}]}}';
    await deliverBackup(new Blob([ciphertext]), "diary.json");
    expect(mocks.write).toHaveBeenCalledWith({ path: "backups/diary.json", directory: "CACHE", data: ciphertext, encoding: "utf8" });
    expect(mocks.share.mock.calls[0][0].files).toEqual(["content://backup"]);
    expect(mocks.write.mock.invocationCallOrder[0]).toBeLessThan(mocks.share.mock.invocationCallOrder[0]);
  });
  it("uses only local Android voices at 1.15x and waits for playback", async () => {
    mocks.voices.mockResolvedValue({ voices: [{ name: "remote", localService: false, voiceURI: "remote", lang: "en" }, { name: "offline", localService: true, voiceURI: "offline", lang: "en-IN" }] });
    const voices = await localVoices(); expect(voices.map(v => v.voiceURI)).toEqual(["offline"]);
    let complete: (() => void) | undefined;
    mocks.speak.mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const voice = voices[0]; if (!voice) throw new Error("Missing local voice");
    let ended = false; const speaking = speakLocal("reply", voice).then(() => { ended = true; });
    await vi.waitFor(() => expect(mocks.speak).toHaveBeenCalled());
    expect(ended).toBe(false);
    expect(mocks.speak.mock.calls[0][0]).toEqual({ text: "reply", lang: "en-IN", voice: 1, rate: 1.15, queueStrategy: 0 });
    complete?.(); await speaking; expect(ended).toBe(true);
    await stopSpeech(); expect(mocks.stop).toHaveBeenCalled();
  });
  it("back turns a book page first, then navigates, and exits only at the start", async () => {
    const back = vi.fn(), home = vi.fn(), exit = vi.fn(async () => {}), pageBack = vi.fn(() => true);
    const remove = registerBackHandler(pageBack);
    await handleNativeBack({ canGoBack: true, path: "/", back, home, exit });
    expect(pageBack).toHaveBeenCalledOnce(); expect(back).not.toHaveBeenCalled(); remove();
    await handleNativeBack({ canGoBack: true, path: "/settings", back, home, exit }); expect(back).toHaveBeenCalledOnce();
    await handleNativeBack({ canGoBack: false, path: "/settings", back, home, exit }); expect(home).toHaveBeenCalledOnce(); expect(exit).not.toHaveBeenCalled();
    await handleNativeBack({ canGoBack: false, path: "/", back, home, exit }); expect(exit).toHaveBeenCalledOnce();
  });
});