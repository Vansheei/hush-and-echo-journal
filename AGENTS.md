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
- No backend: all data lives in IndexedDB on device, encrypted with a random data key wrapped by passphrase and recovery-phrase keys (`src/lib/crypto`, `src/lib/storage`). Why: the owner requires nothing to leave the device unencrypted.
- App routes use `ssr: false` and the root wraps everything in ClientOnly + VaultProvider + Gate. Why: Web Crypto/IndexedDB/media are browser-only and the app must run in a Capacitor WebView.
- Transcription runs in a Web Worker behind `src/lib/transcription`; tone analysis is a swappable voice-cue interface in `src/lib/tone` (audio + Whisper timestamps; per-entry Listen/Reflect overrides the Settings default) and browser-direct, explicitly confirmed AI lives in `src/lib/ai`. Why: keep inference isolated and avoid server access to diary content.
- Locked transcription retains only decoded audio and a non-extractable encrypt-only completion key; decryption keys are scoped to preparation and released before the visible lock, with revision-checked saves. Why: finish safely without retaining decrypt capability or resurrecting deleted entries.
- Recording locks are deferred through pause/review/encrypted saving using a stable busy callback. Why: automatic locking must not discard an active recording.
- Backups snapshot all encrypted IndexedDB stores in a single transaction with versioned binary encoding; Phase 2 items use their own encrypted store. Why: maintain consistent ciphertext exports and preserve existing diary data during upgrades.
- Look-and-feel prefs (cover colour, sounds) live unencrypted in localStorage via `src/lib/appearance.ts`; theme colours switch through `[data-cover]` tokens in `src/styles.css`. Why: the cover and lock sound must work while the vault is locked, and these hold no diary content.
