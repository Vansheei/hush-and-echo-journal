// Prepares the offline web files the Android app loads from inside the APK (no server, offline).
// With CAPACITOR=1 the build prerenders the start page to _shell.html; its output folder differs by
// environment (dist/client here, .output/public on GitHub), so find it and copy to one fixed folder.
import { access, cp, copyFile, rm } from "node:fs/promises";

const candidates = ["dist/client", ".output/public"];
const out = "android-web";
let source;
for (const dir of candidates) {
  if (await access(`${dir}/_shell.html`).then(() => true, () => false)) { source = dir; break; }
}
if (!source) throw new Error(`Missing _shell.html in ${candidates.join(" or ")}. Was the build run with CAPACITOR=1?`);

await rm(out, { recursive: true, force: true });
await cp(source, out, { recursive: true });
await copyFile(`${out}/_shell.html`, `${out}/index.html`);
console.log(`Copied ${source} to ${out} and wrote ${out}/index.html`);
