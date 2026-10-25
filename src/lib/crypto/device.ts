import { db } from "@/lib/storage/db";
import { createDeviceWrap, unlockWithDeviceWrap, type DeviceWrap, type VaultMeta } from "./vault";

type PrfOutputs = { prf?: { enabled?: boolean; results?: { first: ArrayBuffer } } };
type PrfInputs = AuthenticationExtensionsClientInputs & { prf: { eval: { first: Uint8Array } } };
const extensions = (salt: Uint8Array): PrfInputs => ({ prf: { eval: { first: salt } } });
const random = () => crypto.getRandomValues(new Uint8Array(32));
const unavailable = "Secure fingerprint unlock is unavailable on this device or browser. Use your passphrase.";

export async function deviceUnlockAvailable() {
  try {
    return window.isSecureContext && typeof PublicKeyCredential !== "undefined" &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function getDeviceWrap(): Promise<DeviceWrap | undefined> {
  return (await db()).get("meta", "deviceUnlock");
}
export async function removeDeviceUnlock() { await (await db()).delete("meta", "deviceUnlock"); }

function credential(value: Credential | null): PublicKeyCredential {
  if (!(value instanceof PublicKeyCredential)) throw new Error("Device unlock was cancelled.");
  return value;
}

async function readSecret(id: Uint8Array, salt: Uint8Array) {
  const result = credential(await navigator.credentials.get({ publicKey: {
    challenge: random(), allowCredentials: [{ type: "public-key", id: id as BufferSource, transports: ["internal"] }],
    userVerification: "required", timeout: 60_000, extensions: extensions(salt),
  } }));
  const secret = (result.getClientExtensionResults() as PrfOutputs).prf?.results?.first;
  if (!secret || secret.byteLength !== 32) throw new Error(unavailable);
  return new Uint8Array(secret);
}

export async function enableDeviceUnlock(meta: VaultMeta, passphrase: string) {
  if (!await deviceUnlockAvailable()) throw new Error(unavailable);
  // Verify the passphrase before asking the owner to create a credential.
  const { unlockWithPassphrase } = await import("./vault");
  await unlockWithPassphrase(meta, passphrase);
  const salt = random();
  const result = credential(await navigator.credentials.create({ publicKey: {
    challenge: random(), rp: { name: "Vanshika’s Diary" },
    user: { id: random(), name: "diary-owner", displayName: "Diary owner" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
    attestation: "none", timeout: 60_000, extensions: extensions(salt),
  } }));
  const output = (result.getClientExtensionResults() as PrfOutputs).prf;
  if (!output?.enabled && !output?.results) throw new Error(unavailable);
  const id = new Uint8Array(result.rawId);
  // Confirm the credential can release the same encryption secret on subsequent unlocks.
  const secret = await readSecret(id, salt);
  try {
    const wrap = await createDeviceWrap(meta, passphrase, secret, id, salt);
    await (await db()).put("meta", wrap, "deviceUnlock");
  } finally { secret.fill(0); }
}

export async function unlockUsingDevice() {
  const wrap = await getDeviceWrap();
  if (!wrap) throw new Error("Open with your passphrase and enable fingerprint unlock in Settings first.");
  const secret = await readSecret(wrap.id, wrap.salt);
  try { return await unlockWithDeviceWrap(wrap, secret); }
  finally { secret.fill(0); }
}