import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { VaultProvider, useVault } from "./vault-context";

const mocks = vi.hoisted(() => ({ list: vi.fn(), complete: vi.fn(), transcribe: vi.fn(), decode: vi.fn(), put: vi.fn(), writer: { usages: ["encrypt"] }, key: { usages: ["encrypt", "decrypt"] } }));
vi.mock("@/lib/crypto/vault", () => ({ encryptionOnlyKey: () => mocks.writer, unlockWithPassphrase: async () => mocks.key, resetPassphrase: vi.fn() }));
vi.mock("@/lib/storage/db", () => ({
  DEFAULT_SETTINGS: { autoLockMin: 5, whisperModel: "base" }, getSettings: async () => ({ autoLockMin: 5, whisperModel: "base" }),
  getVaultMeta: async () => ({}), putSettings: vi.fn(), putVaultMeta: vi.fn(), listEntries: mocks.list,
  putEntry: mocks.put, completeEntry: mocks.complete, loadMedia: async () => new Blob(),
}));
vi.mock("@/lib/transcription", () => ({ decodeToMono16k: mocks.decode, transcribeAudio: mocks.transcribe }));
let vault: ReturnType<typeof useVault> | undefined;
function Probe() { vault = useVault(); return <span>{vault.status}</span>; }
beforeEach(() => { vi.clearAllMocks(); mocks.list.mockResolvedValue([]); mocks.decode.mockResolvedValue(new Float32Array([1, 2])); mocks.put.mockResolvedValue("revision"); });
it("defers locking throughout recording and keeps the busy callback stable", async () => {
  render(<VaultProvider><Probe /></VaultProvider>);
  await waitFor(() => expect(vault?.status).toBe("locked"));
  await act(async () => vault?.unlock("pass"));
  const busy = vault?.setBusy;
  act(() => { vault?.setBusy(true); vault?.lock(); vault?.bump(); });
  expect(vault?.status).toBe("unlocked"); expect(vault?.key).toBe(mocks.key); expect(vault?.setBusy).toBe(busy);
  await act(async () => vault?.setBusy(false));
  await waitFor(() => expect(vault?.status).toBe("locked")); expect(vault?.key).toBeNull();
});
it("finishes current transcription encrypted after lock without starting another job", async () => {
  const entry = { id: "job", status: "pending", segments: [] };
  mocks.list.mockResolvedValue([entry]);
  let finish: ((s: { start: number; end: number; text: string }[]) => void) | undefined;
  mocks.transcribe.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<VaultProvider><Probe /></VaultProvider>);
  await waitFor(() => expect(vault?.status).toBe("locked"));
  await act(async () => vault?.unlock("pass"));
  await waitFor(() => expect(mocks.transcribe).toHaveBeenCalledTimes(1));
  act(() => vault?.lock()); expect(vault?.key).toBeNull(); expect(vault?.status).toBe("locked");
  await act(async () => { finish?.([{ start: 0, end: 2, text: "Saved safely" }]); });
  expect(mocks.complete).toHaveBeenCalledWith(mocks.writer, expect.objectContaining({ status: "done", segments: [{ start: 0, end: 2, text: "Saved safely" }] }), "revision");
  expect(mocks.transcribe).toHaveBeenCalledTimes(1); expect(vault?.progress).toEqual({});
});