import { db, getVaultMeta } from "@/lib/storage/db";
import { createPinWrap, unlockWithPinWrap, type PinWrap } from "./vault";

export async function hasPin() { return !!await (await db()).get("meta", "pinUnlock"); }
export async function removePin() { const d = await db(); await d.delete("meta", "pinUnlock"); }
export async function enablePin(pass: string, pin: string) {
  const meta = await getVaultMeta();
  if (!meta) throw new Error("No diary found.");
  await (await db()).put("meta", await createPinWrap(meta, pass, pin), "pinUnlock");
}
export async function unlockUsingPin(pin: string) {
  const wrap = await (await db()).get("meta", "pinUnlock") as PinWrap | undefined;
  if (!wrap) throw new Error("No diary PIN is set.");
  return unlockWithPinWrap(wrap, pin);
}