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
- Transcription runs in a Web Worker via transformers.js behind `src/lib/transcription`; future tone analysis gets its own module with a swappable interface. Why: keep heavy work off the UI thread and let models be replaced.
