# Phone fixes: Claude key, Companion, reflection, camera, lock screen

Fingerprint unlock and diary PIN code will not be changed, refactored or "improved". This covers the Android fingerprint plugin, browser device unlock, PIN files and the PIN/fingerprint unlock steps. Priority 6 only changes which fields the lock screen *shows*.

## What the code shows now

- **Saving the key:** only spaces and line breaks at the very start and end are removed. Invisible characters in the middle of the key (zero-width spaces, non-breaking spaces, "smart" punctuation, line breaks inside the key) are kept. The encrypted storage saves the whole string, with no length limit or cutting.
- **Reading the key back:** it is read and decrypted again right before every Companion turn and every reflection, so an old value is not reused. An empty key stops with "Save your Anthropic key in Settings first" before anything is sent.
- **Request headers:** `x-api-key`, `anthropic-version: 2023-06-01` and `anthropic-dangerous-direct-browser-access: true` are all sent, spelled as Anthropic expects.
- **Error text:** Anthropic's own message is already shown when it sends one. When it doesn't, you get a generic message.

So the code path looks right, but I can't confirm the cause until we see the saved character count. My best guess is invisible characters picked up when copying on the phone, or keyboard/autofill changing the text. The diagnostic below will settle this.

## Are priorities 2 and 3 only the key?

- **Priority 3 (Request reflection):** probably the key alone. The key error goes into a small line inside the confirm box, so it can look like nothing happened. I'll also make the error easier to see.
- **Priority 2 (Night Companion):** the key failure explains the missing text reply. There's also a separate problem with speech: the app only reads replies aloud with voices marked "on-device". If Android reports no such voice, nothing is spoken and only a small note appears. So: no text = the key; no voice even with a working key = a separate issue, fixed below.

## Priority 1 — Claude key

1. When saving, clean the key: remove invisible and non-standard characters anywhere in it, not just at the ends. If what's left doesn't start with `sk-ant-` or contains spaces, show a warning and don't save.
2. Turn off autocorrect, auto-capitals, spellcheck and autofill on the key field.
3. In About companion, add a key check showing: character count, first 6 characters, last 4 characters, and "contains hidden characters: yes/no". The full key is never shown. (You asked for this explicitly; the rest of the key stays hidden.)
4. Add a "Test key" button that makes one tiny request with no diary content, after you confirm, and shows Anthropic's exact reply (status code, error type and message).
5. Every Claude error in Companion, reflection, The Week's Tale and Unsent Letters shows Anthropic's real error text, its type and the status code.

## Priority 2 — Night Companion

- Show the reply as text every time, saved first, before any speech.
- Then read it aloud every time at your chosen speed. On Android, use any installed Android voice (not only ones marked "on-device"). Prefer offline voices, and fall back to the default Android voice if none are offline. If speech still fails, show the reason clearly.
- Reply text sent to Claude is still sent only with your confirmation or under the "trust this conversation" toggle. Nothing about consent changes.

## Priority 3 — Request reflection

- Show errors on the entry page and in the confirm box, with Anthropic's text.
- Explain why the button might be missing ("switch this entry to Reflect" / "transcript not ready").

## Priority 4 — Camera

- Front camera preview not mirrored. The saved video also stays unmirrored.
- Preview fits the whole frame inside the screen (no zoom or crop), within the phone's safe edges.
- A flip button to switch between front and back. It's disabled while recording if the phone can't switch mid-recording.
- A torch button: the back camera uses its real light where the phone supports it. The front camera uses a bright warm-white "screen flash" over the screen around the preview.
- Recordings still save only inside the encrypted diary. Nothing goes to the gallery, and no new Android permissions are added.

## Priority 5 — Lock screen

- The cover artwork fills the whole screen edge to edge, with no card and no green border around it.
- The passphrase field, Open button, fingerprint, PIN switch, "Forgot passphrase?" and the lantern sit on top of the artwork near the bottom, inside safe edges, with a soft dark fade behind them so they're readable. The unlock glow and dandelion animation stay.

## Priority 6 — Hide the passphrase field

- New Security setting: "Hide passphrase on lock screen". You can only turn it on when fingerprint or a diary PIN is set up.
- When it's on, the lock screen shows the fingerprint button and/or PIN field. A small "Use passphrase" link still lets you type the passphrase if needed, and the recovery option stays reachable, so you can't get locked out.
- Passphrase and recovery phrase are unchanged and still required for backup export, recovery phrase viewing and passphrase reset.
- If fingerprint and PIN are both removed later, the passphrase field comes back automatically.

## Checks

- Tests: key cleaning (hidden characters removed, real key unchanged), the key check showing count/first 6/last 4 only, request headers exact, Anthropic error text shown, the hide-passphrase rule (only with fingerprint/PIN, and it comes back when both are removed).
- Run the existing PIN and fingerprint tests unchanged to confirm nothing changed there.
- Phone-sized screenshots of the lock screen and camera.
- Not checkable here: a live Claude reply with your key, Android voices, torch and the camera flip on the Nothing Phone. Those need your APK retest.

## Technical details

- Files: `CompanionSettings.tsx` (sanitize, input attributes, diagnostic, test button), a new `src/lib/ai/key.ts` (sanitize + fingerprint helpers), `anthropic.ts` (error format `status · type · message`; headers unchanged), `ReflectionPanel.tsx`, `companion.tsx`, `native/speech.ts` (voice choice fallback), `record.tsx` (no `scaleX(-1)`, `object-contain`, facingMode switch, `applyConstraints({advanced:[{torch}]})`, screen-flash overlay), `LockScreen.tsx` + `BookCover.tsx` full-bleed variant + `styles.css`, `LockSettings`/Security, plus a lock-screen preference flag in the appearance store, which is readable while the diary is locked.
- Untouched: `crypto/device.ts`, `crypto/pin.ts`, `native/biometric.ts`, `DiaryBiometricPlugin.java`, `DeviceUnlockSettings.tsx`, the PIN/device unlock functions in `vault-context.tsx`.
