# Phone test fixes (Nothing Phone 2a, 20:9)

Not touched: fingerprint unlock, diary PIN, hide-passphrase toggle, back torch, camera framing, unmirrored preview, unlock animation, "+" button.

## 1. Claude thinking field
- Remove `thinking` entirely from the request body in `anthropic.ts` and `key.ts`.
- Tests assert the body has no `thinking` key, for both models.
- I cannot press Test key on your phone; I will run the exact request shape through tests and report. You run Test key per model and tell me each result.

## 2. Transcription speed (investigate first, then report plainly)
Current facts from the code: runs in a Web Worker (not the UI thread); loads whisper-base or whisper-small; tries WebGPU, else WASM q8; weights cached in a durable cache.
Checks: which model the APK actually picks, whether the cache survives restarts (or re-downloads), audio resampled to 16 kHz mono, WASM threads availability in the WebView.
Likely outcome: whisper-small on WASM in a WebView is too slow for 1+ min clips. Plan: default Android to the smaller model and process in 30 s chunks. If still far slower than real time, I will say so and offer alternatives:
- Android's built-in on-device speech recognition (fast, offline on Pixel-style engines, less control over language).
- A native whisper.cpp plugin (fast, bigger APK, more work).
- Opt-in cloud transcription (breaks your "nothing leaves the device" rule; only if you choose it).

## 3. Repetition loop
- Voice-activity detection: skip silent stretches, split on pauses into ~30 s chunks with small overlap, transcribe each chunk independently so one bad chunk cannot swallow others.
- Repetition guard: a phrase repeated more than 3 times in a row is collapsed to one copy and marked "transcription glitch" in the entry.
- Tests for the guard.

## 4. Background transcription
Honest limit: Whisper runs inside the WebView; Android pauses WebView JavaScript when the app is backgrounded/locked, even with a foreground service keeping the process alive. A foreground service alone will not keep it running reliably.
Options to choose (see question below): native transcription (option from step 2) inside a foreground service with a "entry ready" notification that contains no diary content, or keep in-app only and say so in the app.

## 5. Keep screen awake while recording
Add a keep-awake plugin; hold on start, release on stop/cancel/leave.

## 6. Video stutter
Investigate: canvas-draw pipeline per frame, MediaRecorder bitrate/codec, resolution. Fix: request 720p at 30 fps, record the camera stream directly (unmirror applied only via saved-orientation where possible), set explicit bitrate, play back with native video element. Report findings.

## 7. Front flash around the preview
Warm-white bright frame fills the screen, with the live preview inset in the middle (Snapchat-style), brightness raised while recording.

## 8. UI too large
Audit viewport tag, base font size (body is 1.0625rem) and oversized headings/index rows (up to 2.1rem); scale typography and controls for a ~411 CSS px wide 20:9 phone.

## 9. Companion voice
On Android use only the native text-to-speech plugin; no browser voice list, no localService filter. Speak with the engine default if no voice chosen. Show "no voice" only if the plugin reports no engine. Every reply shown as text and spoken. Note: your message matches the browser-only path, so I will also check why the APK took that path.

## 10. Skip confirmation setting
Security setting "Always send to Claude without confirming" (off by default). When on, reflections and companion turns send directly. Also drop empty glossary/people brackets from the payload.

## 11. Edit transcript in place
Tap transcript, edit, save (encrypted). Reflection uses the corrected text.

## 12. Reply inside a reflection
Text box under each reflection; follow-ups form a thread on the entry. "Add my own note" stored and labelled as your words, not AI. Encrypted and included in backups.

## 13. Section subtitles and empty states
One-line plain subtitle under each whimsical name (index + section header), e.g. "Quiet Garden · park a worry here until you're ready". An empty-state line per section.

## 14. Lock screen full-bleed
Cover fills the screen edge to edge, no card or green border; controls on top of the artwork.

## 15. App icon
Cover artwork with "Journal" readable in gold calligraphy; all densities, adaptive foreground/background, round; verify no Capacitor default image remains in any res folder.

## Verification
Run full test suite and phone-size (412x915) screenshots of lock, index, record, companion, entry before reporting. Anything only checkable on the phone will be listed as unverified.
