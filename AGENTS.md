<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Settings sections use independent un-nested routes and a shared name registry in `src/lib/settings-sections.ts`; non-sensitive seasonal/audio preferences share the appearance store. Why: headings can be renamed together and preferences apply consistently in Settings and Companion without extra navigation nesting.
- Optional diary PIN uses a PBKDF2-wrapped DEK in metadata (never a saved PIN); recovery deletes both PIN and device wraps. Why: PIN unlock must release the same encrypted diary key without retaining plaintext credentials.
- Device unlock wraps the existing DEK with browser WebAuthn PRF or the Android DiaryBiometric Capacitor plugin's per-operation BiometricPrompt CryptoObject/Keystore-protected wrapping secret; store only ciphertext, invalidate on recovery/enrollment changes, and keep PIN/passphrase fallback. Why: biometric success alone must never release an unprotected saved decryption secret.
- No backend: all data lives in IndexedDB on device, encrypted with a random data key wrapped by passphrase and recovery-phrase keys (`src/lib/crypto`, `src/lib/storage`). Why: the owner requires nothing to leave the device unencrypted.
- App routes use `ssr: false` and the root wraps everything in ClientOnly + VaultProvider + Gate. Why: Web Crypto/IndexedDB/media are browser-only and the app must run in a Capacitor WebView.
- Transcription runs in a Web Worker behind `src/lib/transcription`; tone analysis is a swappable voice-cue interface in `src/lib/tone` (audio + Whisper timestamps; per-entry Listen/Reflect overrides the Settings default) and browser-direct, explicitly confirmed AI lives in `src/lib/ai`. Why: keep inference isolated and avoid server access to diary content.
- Locked transcription retains only decoded audio and a non-extractable encrypt-only completion key; decryption keys are scoped to preparation and released before the visible lock, with revision-checked saves. Why: finish safely without retaining decrypt capability or resurrecting deleted entries.
- Recording locks are deferred through pause/review/encrypted saving using a stable busy callback. Why: automatic locking must not discard an active recording.
- Backups snapshot all encrypted IndexedDB stores in a single transaction with versioned binary encoding; Phase 2 items use their own encrypted store. Why: maintain consistent ciphertext exports and preserve existing diary data during upgrades.
- Look-and-feel prefs (cover colour, sounds) live unencrypted in localStorage via `src/lib/appearance.ts`; theme colours switch through `[data-cover]` tokens in `src/styles.css`. Why: the cover and lock sound must work while the vault is locked, and these hold no diary content.
- Glossary, confirmed people, notebook, chat and semantic indexes use the encrypted private IndexedDB store; backups enumerate all stores. Why: new personal data must stay encrypted and included in existing backup exports.
- Shared AI personality and confirmed context apply at the single browser AI request boundary; suggestions require explicit owner confirmation before persistence. Why: every Claude feature must honour humour, ambiguity and consent consistently.
- Speech and multilingual embeddings have separate workers and a shared public-weights Cache API adapter; retain the speech worker across locks and stop semantic work on unmount. Why: reusing model weights must not retain vault keys or search plaintext while locked.
- Companion uses local Whisper and only localService voices through native Capacitor TTS on Android or browser speech on web; wait for reply completion before listening, cancel on stop/unmount, and retain outgoing-text consent/text fallback. Why: private speech must stay on device without recording its own reply.
- Browser Claude requests explicitly configure model-supported reply-only thinking, and reject exhausted or empty replies without retrying. Why: default thinking can consume the reply allowance, and resending personal text requires fresh consent.
- Android uses Capacitor loading `dist/client` from the APK (no `server.url`); `bun run build:android` builds SPA mode (`CAPACITOR=1`) and renders `index.html` via `scripts/capacitor-shell.mjs`. App art and fonts live in `public/art` and `public/fonts`, never remote URLs. Why: the diary must work fully offline in the Android WebView.
- The Android debug build signs with the committed `android/app/diary-debug.keystore`. Why: updates must install over the old APK without uninstalling and wiping the on-device diary.
- Android encrypted backups write UTF-8 ciphertext to Filesystem Cache and pass its URI to Share; native Keystore secrets never enter backups. Why: WebView downloads fail and restored device wraps must not unlock on another device.
- Native App back events offer active conversation/book handlers first, then router history/home, exiting only at the root with no history. Why: Android back must respect page turns and active work rather than close the diary prematurely.
- New native settings default to the smaller multilingual model; browser defaults and explicit saved selections remain intact. Why: improve Android transcription speed without overriding the owner's chosen accuracy.
