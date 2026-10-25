# Diary — Phase 1 Plan

A private, on-device voice and video journal. Phase 1 only: app shell, lock screen, encryption, recovery phrase, recording, encrypted local storage, timeline, and local transcription. No backend, no analytics, no server calls with your data.

## What you will get

1. **First launch setup**
   - Choose a passphrase (with confirm).
   - A 12-word recovery phrase is generated and shown once. You tick "I wrote it down" and re-type 3 random words to confirm.
    - Call `navigator.storage.persist()` during setup and check the result. Show whether protection was granted; a browser can refuse, so this cannot guarantee data is never deleted. Clearing site data, uninstalling, private browsing and device loss still require a backup.
2. **Lock screen**
   - Passphrase unlock. "Forgot passphrase?" lets you unlock with the recovery phrase and set a new passphrase.
    - Auto-lock after inactivity (default 5 min) and when the app goes to the background. Never interrupt an active recording, including pause and encrypted saving. Fingerprint button shown as "coming later".
    - A requested lock during recording waits for safe completion and encrypted saving. In-flight transcription may finish and save encrypted while the diary is locked; no new job starts until unlock.
    - On lock, release every application-held decryption-key reference, clear decrypted views and revoke media URLs. JavaScript/Web Crypto cannot guarantee physical zeroization of a `CryptoKey`; raw key bytes are overwritten immediately after import.
3. **Home / Timeline**
   - Entries grouped by day, newest first, showing type (video/audio), duration, time, and transcript snippet or status ("Transcribing 42%").
   - Big record button at the bottom.
4. **Recording**
   - Toggle video or audio. Video at 720p, front/back camera switch, timer, pause/stop, discard or save.
   - Saved only inside the app (never the gallery).
5. **Entry page**
   - Plays the decrypted recording. Transcript with timestamps; tapping a line jumps the player to that moment.
   - Delete entry (with confirmation).
6. **Background transcription**
   - Runs on the phone with Whisper (multilingual, auto language detection). Progress shown on the timeline and entry page. First run downloads the model (~75–250 MB, cached afterwards).
    - Choose whisper-base (faster) or whisper-small (more accurate) in a minimal Settings screen. Settings also has auto-lock time and "Lock now".
7. **Export encrypted backup**
    - Settings offers an "Export encrypted backup" button before Google Drive sync exists.
    - Export a consistent, versioned snapshot of encrypted entries, media, settings and wrapped-key metadata; never plaintext, unwrapped keys or recovery words. It must remain decryptable using the passphrase or recovery phrase from the export date.
    - Surface download success or failure. Keep backups outside the browser; changing the passphrase does not change older backups.

## Design
Simple, calm, mobile-first layout. All colours, fonts, radii and spacing live in one theme file so the seasonal pastel redesign later is a single swap.

## Technical details

- **Stack**: existing TanStack Start app, client-only rendering for the app routes (`ssr: false`) so everything runs in the browser and works in a Capacitor WebView. Routes: `/` (gate: setup / lock / timeline), `/record`, `/entry/$id`, `/settings`.
- **Key model** (envelope encryption):
  - Random 256-bit data key (DEK) encrypts everything with AES-GCM (fresh 12-byte IV per record).
  - DEK is wrapped twice: by a key from the passphrase (PBKDF2-SHA256, 600k iterations, random salt) and by a key from the recovery phrase (BIP39-style 12 words, PBKDF2). Changing passphrase re-wraps only the DEK.
   - DEK kept only in memory while unlocked; all application decryption-key references released on lock. Before locking, a running transcription has its required audio and an encrypt-only, non-extractable key for saving its result; it cannot retain the decryption key. Recording locks are deferred through safe encrypted saving.
- **Storage**: IndexedDB (via `idb`). Stores: `meta` (salts, wrapped keys, KDF params), `entries` (encrypted JSON: date, type, duration, transcript, status), `media` (encrypted chunks of ~1 MB so large videos don't blow memory). Only IDs and an encrypted-blob layout are plaintext; dates/titles are inside the ciphertext.
- **Recording**: `MediaRecorder` with `getUserMedia` (1280x720 constraint, audio-only option), WebM/Opus or MP4 fallback by `isTypeSupported`.
- **Transcription**: `@huggingface/transformers` in a Web Worker, WebGPU with WASM fallback, `return_timestamps: true`, chunked long audio. Audio decoded to 16 kHz mono via Web Audio, decrypted in memory only. Queue resumes pending jobs on next unlock.
- **Modules with clear interfaces** for later phases: `crypto/`, `storage/`, `recorder/`, `transcription/` (a `tone/` slot reserved for Phase 2).
- **Privacy**: no analytics or external scripts; only network use is the one-time Whisper model download from Hugging Face. Remove default Lovable meta/branding.
   - **Tests**: unit tests for encrypt/decrypt round-trip, wrong passphrase rejection, recovery-phrase unlock, and passphrase change keeping data readable; add coverage for persistent-storage denial, uninterrupted recording, encrypted transcription completion after locking, key-reference cleanup and backup ciphertext round-trip.

## Note for Phase 2
Preserve the owner's requested names `claude-haiku 5.5` and `sonne 5.5`. Do not replace them with older versions. Verify callable IDs against official documentation before claiming live AI calls work; surface unsupported-model errors without fallback.

## Phase 1 test checklist (on your phone, Chrome)
1. Set a passphrase, write down the recovery phrase, confirm the words.
2. Record a 30s audio entry and a 30s video entry; check both appear on the timeline.
3. Watch transcription progress finish; tap a transcript line and confirm playback jumps there.
4. Wait for auto-lock (or "Lock now"), unlock with passphrase; try a wrong passphrase.
5. Use "Forgot passphrase" with the recovery phrase, set a new one, confirm entries are still there.
6. Check your gallery: no recordings should appear there.
7. Check storage protection in Settings; if it was refused, export a backup anyway.
8. Keep recording beyond the auto-lock time, pause and resume, then save; confirm the whole recording remains playable.
9. Lock during transcription, unlock after it finishes, and confirm the transcript was saved.
10. Export an encrypted backup and keep it outside the browser; validate its contents with a decrypting round-trip test before treating export as complete.
