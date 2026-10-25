// Renders the app's start page from the built server bundle into dist/client/index.html,
// so the Android app can load everything locally from inside the APK (no server, offline).
import { writeFile } from "node:fs/promises";

const { default: worker } = await import(`${process.cwd()}/dist/server/index.mjs`);
const env = { ASSETS: { fetch: () => new Response("", { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const res = await worker.fetch(new Request("https://localhost/"), env, ctx);
const html = await res.text();
if (res.status !== 200 || !html.includes("<html")) throw new Error(`Start page render failed (${res.status})`);
await writeFile("dist/client/index.html", html);
console.log("Wrote dist/client/index.html");
process.exit(0);
