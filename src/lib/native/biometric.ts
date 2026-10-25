import { registerPlugin } from "@capacitor/core";
import { db } from "@/lib/storage/db";
import { createDeviceWrap, unlockWithDeviceWrap, type DeviceWrap, type VaultMeta } from "@/lib/crypto/vault";

export interface DiaryBiometricPlugin {
  available(): Promise<{ available: boolean }>;
  exists(options: { id: string }): Promise<{ exists: boolean }>;
  enroll(options: { id: string; secret: string }): Promise<void>;
  unlock(options: { id: string }): Promise<{ secret: string }>;
  remove(options: { id: string }): Promise<void>;
}
export const DiaryBiometric = registerPlugin<DiaryBiometricPlugin>("DiaryBiometric");
type NativeWrap = DeviceWrap & { nativeId: string };
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));

export async function getNativeWrap(): Promise<NativeWrap | undefined> {
  const wrap = await (await db()).get("meta", "nativeDeviceUnlock") as NativeWrap | undefined;
  if (!wrap) return undefined;
  return (await DiaryBiometric.exists({ id: wrap.nativeId })).exists ? wrap : undefined;
}
export async function removeNativeUnlock() {
  const database = await db();
  const wrap = await database.get("meta", "nativeDeviceUnlock") as NativeWrap | undefined;
  if (wrap) await DiaryBiometric.remove({ id: wrap.nativeId });
  await database.delete("meta", "nativeDeviceUnlock");
}
export async function enableNativeUnlock(meta: VaultMeta, passphrase: string) {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const nativeId = crypto.randomUUID();
  try {
    // Verify passphrase and wrap the existing DEK before invoking Android.
    const wrap = await createDeviceWrap(meta, passphrase, secret, new Uint8Array(), new Uint8Array());
    await DiaryBiometric.enroll({ id: nativeId, secret: encode(secret) });
    try {
      await removeNativeUnlock();
      await (await db()).put("meta", { ...wrap, nativeId }, "nativeDeviceUnlock");
    } catch (error) { await DiaryBiometric.remove({ id: nativeId }); throw error; }
  } finally { secret.fill(0); }
}
export async function unlockNative() {
  const wrap = await getNativeWrap();
  if (!wrap) throw new Error("Enable fingerprint in Security first. After restoring a backup, use your passphrase or PIN.");
  const result = await DiaryBiometric.unlock({ id: wrap.nativeId });
  const secret = decode(result.secret);
  result.secret = "";
  try { return await unlockWithDeviceWrap(wrap, secret); }
  finally { secret.fill(0); }
}