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
- Device unlock wraps the existing DEK using platform WebAuthn PRF with required user verification; store only credential metadata and ciphertext, invalidate on recovery, and keep passphrase fallback. Why: a biometric success flag alone cannot securely unlock an encrypted diary without retaining a decryption secret.
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
- Companion uses local Whisper and only localService speech voices, with explicit outgoing-text preview and a text fallback. Why: voice interaction must not upload audio to speech services.
- Browser Claude requests explicitly configure model-supported reply-only thinking, and reject exhausted or empty replies without retrying. Why: default thinking can consume the reply allowance, and resending personal text requires fresh consent.
