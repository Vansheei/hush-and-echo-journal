# Diary — Phase 1 Plan

A private, on-device voice and video journal. Phase 1 only: app shell, lock screen, encryption, recovery phrase, recording, encrypted local storage, timeline, and local transcription. No backend, no analytics, no server calls with your data.

## What you will get

1. **First launch setup**
   - Choose a passphrase (with confirm).
   - A 12-word recovery phrase is generated and shown once. You tick "I wrote it down" and re-type 3 random words to confirm.
2. **Lock screen**
   - Passphrase unlock. "Forgot passphrase?" lets you unlock with the recovery phrase and set a new passphrase.
   - Auto-lock after inactivity (default 5 min) and when the app goes to the background. Fingerprint button shown as "coming later".
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
   - Choose whisper-base (faster) or whisper-small (more accurate) in a minimal Settings screen. Settings also has auto-lock time and "Lock now". The rest of Settings comes in Phase 2.

## Design
Simple, calm, mobile-first layout. All colours, fonts, radii and spacing live in one theme file so the seasonal pastel redesign later is a single swap.

## Technical details

- **Stack**: existing TanStack Start app, client-only rendering for the app routes (`ssr: false`) so everything runs in the browser and works in a Capacitor WebView. Routes: `/` (gate: setup / lock / timeline), `/record`, `/entry/$id`, `/settings`.
- **Key model** (envelope encryption):
  - Random 256-bit data key (DEK) encrypts everything with AES-GCM (fresh 12-byte IV per record).
  - DEK is wrapped twice: by a key from the passphrase (PBKDF2-SHA256, 600k iterations, random salt) and by a key from the recovery phrase (BIP39-style 12 words, PBKDF2). Changing passphrase re-wraps only the DEK.
  - DEK kept only in memory while unlocked; cleared on lock.
- **Storage**: IndexedDB (via `idb`). Stores: `meta` (salts, wrapped keys, KDF params), `entries` (encrypted JSON: date, type, duration, transcript, status), `media` (encrypted chunks of ~1 MB so large videos don't blow memory). Only IDs and an encrypted-blob layout are plaintext; dates/titles are inside the ciphertext.
- **Recording**: `MediaRecorder` with `getUserMedia` (1280x720 constraint, audio-only option), WebM/Opus or MP4 fallback by `isTypeSupported`.
- **Transcription**: `@huggingface/transformers` in a Web Worker, WebGPU with WASM fallback, `return_timestamps: true`, chunked long audio. Audio decoded to 16 kHz mono via Web Audio, decrypted in memory only. Queue resumes pending jobs on next unlock.
- **Modules with clear interfaces** for later phases: `crypto/`, `storage/`, `recorder/`, `transcription/` (a `tone/` slot reserved for Phase 2).
- **Privacy**: no analytics or external scripts; only network use is the one-time Whisper model download from Hugging Face. Remove default Lovable meta/branding.
- **Tests**: unit tests for encrypt/decrypt round-trip, wrong passphrase rejection, recovery-phrase unlock, and passphrase change keeping data readable.

## Note for Phase 2
The model names in your brief (claude-haiku-5-5, claude-sonnet-5-5) don't match current Anthropic IDs; I'll map them to the current Haiku/Sonnet models then, with the per-feature override you asked for.

## Phase 1 test checklist (on your phone, Chrome)
1. Set a passphrase, write down the recovery phrase, confirm the words.
2. Record a 30s audio entry and a 30s video entry; check both appear on the timeline.
3. Watch transcription progress finish; tap a transcript line and confirm playback jumps there.
4. Wait for auto-lock (or "Lock now"), unlock with passphrase; try a wrong passphrase.
5. Use "Forgot passphrase" with the recovery phrase, set a new one, confirm entries are still there.
6. Check your gallery: no recordings should appear there.
