// Envelope encryption: a random data key (DEK) encrypts everything.
// The DEK is wrapped by a passphrase-derived key and by a recovery-phrase-derived key.
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type Enc = { iv: Uint8Array; ct: ArrayBuffer };
export type DeviceWrap = { v: 1; id: Uint8Array; salt: Uint8Array; wrap: Enc };
export type VaultMeta = {
  v: 1;
  iterations: number;
  passSalt: Uint8Array;
  passWrap: Enc;
  recSalt: Uint8Array;
  recWrap: Enc;
};

export const DEFAULT_ITERATIONS = 600_000;
const te = new TextEncoder();
const td = new TextDecoder();

export class WrongSecretError extends Error {
  constructor(msg = "That didn't unlock the diary.") {
    super(msg);
  }
}

const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function kdf(secret: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", te.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(key: CryptoKey, data: BufferSource): Promise<Enc> {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv, ct };
}

export function decryptBytes(key: CryptoKey, e: Enc): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: e.iv as BufferSource }, key, e.ct);
}

export const encryptJSON = (key: CryptoKey, v: unknown) => encryptBytes(key, te.encode(JSON.stringify(v)));
export async function decryptJSON<T>(key: CryptoKey, e: Enc): Promise<T> {
  return JSON.parse(td.decode(await decryptBytes(key, e))) as T;
}

const writers = new WeakMap<CryptoKey, CryptoKey>();
async function importDek(raw: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
  writers.set(key, await crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt"]));
  return key;
}
export function encryptionOnlyKey(key: CryptoKey) {
  const writer = writers.get(key);
  if (!writer) throw new Error("No encryption-only key available.");
  return writer;
}

export const normalizePhrase = (p: string) => p.trim().toLowerCase().split(/\s+/).join(" ");

async function unwrap(secret: string, salt: Uint8Array, wrap: Enc, iterations: number) {
  try {
    return new Uint8Array(await decryptBytes(await kdf(secret, salt, iterations), wrap));
  } catch {
    throw new WrongSecretError();
  }
}

async function wrapWithPass(raw: Uint8Array, pass: string, iterations: number) {
  const passSalt = rand(16);
  const passWrap = await encryptBytes(await kdf(pass, passSalt, iterations), raw as BufferSource);
  return { passSalt, passWrap };
}

export async function createVault(passphrase: string, iterations = DEFAULT_ITERATIONS) {
  const raw = rand(32);
  const phrase = generateMnemonic(wordlist, 128);
  const recSalt = rand(16);
  const recWrap = await encryptBytes(await kdf(phrase, recSalt, iterations), raw);
  const meta: VaultMeta = { v: 1, iterations, ...(await wrapWithPass(raw, passphrase, iterations)), recSalt, recWrap };
  const key = await importDek(raw);
  raw.fill(0);
  return { meta, key, phrase };
}

export async function unlockWithPassphrase(meta: VaultMeta, passphrase: string) {
  const raw = await unwrap(passphrase, meta.passSalt, meta.passWrap, meta.iterations);
  const key = await importDek(raw);
  raw.fill(0);
  return key;
}

/** Unlock with the recovery phrase and set a new passphrase. */
export async function resetPassphrase(meta: VaultMeta, phrase: string, newPassphrase: string) {
  const p = normalizePhrase(phrase);
  if (!validateMnemonic(p, wordlist)) throw new WrongSecretError("That recovery phrase isn't valid.");
  const raw = await unwrap(p, meta.recSalt, meta.recWrap, meta.iterations);
  const next: VaultMeta = { ...meta, ...(await wrapWithPass(raw, newPassphrase, meta.iterations)) };
  const key = await importDek(raw);
  raw.fill(0);
  return { meta: next, key };
}

export async function changePassphrase(meta: VaultMeta, oldPass: string, newPass: string) {
  const raw = await unwrap(oldPass, meta.passSalt, meta.passWrap, meta.iterations);
  const next: VaultMeta = { ...meta, ...(await wrapWithPass(raw, newPass, meta.iterations)) };
  raw.fill(0);
  return next;
}

async function deviceWrappingKey(secret: Uint8Array) {
  if (secret.byteLength !== 32) throw new Error("Invalid device encryption secret.");
  return crypto.subtle.importKey("raw", secret as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function createDeviceWrap(meta: VaultMeta, pass: string, secret: Uint8Array, id: Uint8Array, salt: Uint8Array): Promise<DeviceWrap> {
  const raw = await unwrap(pass, meta.passSalt, meta.passWrap, meta.iterations);
  try { return { v: 1, id, salt, wrap: await encryptBytes(await deviceWrappingKey(secret), raw as BufferSource) }; }
  finally { raw.fill(0); }
}

export async function unlockWithDeviceWrap(record: DeviceWrap, secret: Uint8Array) {
  const raw = new Uint8Array(await decryptBytes(await deviceWrappingKey(secret), record.wrap));
  try { return await importDek(raw); }
  finally { raw.fill(0); }
}
