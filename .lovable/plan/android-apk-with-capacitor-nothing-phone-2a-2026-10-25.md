# Android APK with Capacitor (Nothing Phone 2a)

Scope: package the diary as an installable Android app that works fully offline. No Phase 5, no Google Drive, no OAuth, no contacts or notification permissions. App-switch locking stays paused.

## What gets built

1. **Capacitor setup**: core, CLI and Android platform. App ID `com.vanshika.diary`, name "Vanshika's Diary". The native `android/` project is created and saved in the project (synced to GitHub).
2. **Offline, local loading**: the app is built as a static bundle copied into the APK. No server URL in the config, so nothing loads from the internet at start-up.
3. **Make everything offline-safe**:
   - Page, scroll and cover artwork currently load from hosted asset links; they will be bundled into the app instead.
   - Fonts (IM Fell English, Pinyon Script) currently load from Google Fonts; they will be bundled locally.
   - Page-turn sound and other assets checked the same way.
4. **Android manifest**: only `RECORD_AUDIO`, `CAMERA` and `MODIFY_AUDIO_SETTINGS` (needed for microphone in the WebView), plus `INTERNET` (Whisper model download once, and Claude when you ask). Nothing else.
5. **Camera/microphone permission**: the app asks Android for microphone/camera the first time you record, then the WebView grants it.
6. **GitHub Action**: on every push, builds the web bundle, syncs Capacitor, runs Gradle `assembleDebug`, and uploads `app-debug.apk` as a downloadable artifact.

## What behaves differently inside the Android WebView

Works:
- IndexedDB and encryption (Web Crypto): work, because the app runs from a secure local `https://localhost` origin.
- Whisper model cache: works; downloaded once over the internet (~250 MB for "small"), then reused offline. Uninstalling the app or "Clear storage" deletes it and your diary — export a backup first.
- Recording audio/video: works after you allow microphone/camera.
- Local meaning search: works (WebAssembly).

Flagged:
- **Fingerprint unlock will not work** in the APK. The current browser fingerprint method is not supported in Android WebView. Passphrase and PIN keep working. A native fingerprint plugin is a separate later step.
- **Export encrypted backup**: the browser "download file" method does not save anything in a WebView. It will fail silently or show an error. Fixing it needs a native save/share step, a later round unless you want it now.
- **Night Companion voice reading aloud**: Android WebView often has no built-in speech voices, so replies may only appear as text (the text fallback stays).
- **Transcription speed**: GPU acceleration is usually unavailable, so it uses the slower fallback. Expect slower transcripts, especially on "small".
- **Storage protection**: may report "not granted"; app data is still kept unless you uninstall or clear it.
- **Claude features**: still need internet and your key.
- **Back button**: Android's back button closes the app instead of turning pages back, unless handled later.

## Can you install the debug APK without signing setup?

Yes. Debug APKs are signed automatically with a debug key. You only need to allow your browser or Files app to "install unknown apps". Note that a debug build cannot be published to the Play Store, and a new build must be signed with the same key to update in place. Each GitHub run creates a new debug key, so you may need to uninstall before installing a newer one — **uninstalling deletes your diary data**, so export a backup first. To avoid this, the workflow will use a fixed debug keystore stored in the repository.

## Steps to install from GitHub

1. In Lovable, connect the project to GitHub (Connectors → GitHub) if not done yet.
2. Open the repository on GitHub on your phone (signed in), tap **Actions**.
3. Tap the latest **Android debug APK** run with a green tick.
4. Scroll to **Artifacts**, tap **app-debug** to download a ZIP.
5. Open the ZIP in Files, tap `app-debug.apk`.
6. If asked, allow "Install unknown apps" for Files, then tap **Install**.
7. Open Vanshika's Diary, set up or unlock, and allow microphone/camera when you first record.
8. Turn on Wi-Fi once to let Whisper download its model.

## Technical details

- Packages: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (v7). `capacitor.config.ts`: `appId`, `appName`, `webDir` pointing at the SPA client output, `server.androidScheme: "https"`, no `server.url`.
- Enable TanStack Start SPA mode so the build emits a static `index.html` shell; verify build output and set `webDir` accordingly. Lovable preview/publish keeps working.
- Replace `/__l5e/...` CSS URLs with bundled imports in `src/assets`; self-host fonts via local `@font-face`.
- `MainActivity` uses Capacitor's `BridgeWebChromeClient` (grants `onPermissionRequest` after runtime permission). Add a small runtime permission request before `getUserMedia` if needed.
- Workflow `.github/workflows/android-debug.yml`: Bun install, web build, `npx cap sync android`, JDK 21, `./gradlew assembleDebug`, `actions/upload-artifact`. Committed debug keystore at `android/app/debug.keystore` (debug only).
- Keep `LOCK_ON_HIDE` paused. Record the Capacitor/offline-bundle rule in `AGENTS.md`.
- Cannot test on a real phone here; I can verify the bundle builds locally and the workflow file is valid, but the Gradle build will be confirmed on the first GitHub run.
