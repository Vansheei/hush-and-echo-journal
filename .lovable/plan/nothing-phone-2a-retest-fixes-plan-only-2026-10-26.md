# Nothing Phone 2a retest fixes (plan only)

## 1. Claude thinking parameter (key is valid; request shape is wrong)
Anthropic says `thinking: {"type":"disabled"}` is rejected on these 5.5 models; `between_tools` is the correct "off" form.
- In `src/lib/ai/anthropic.ts`: send `{"type":"between_tools"}` for both haiku and sonnet paths (sonnet already uses it; haiku currently sends `disabled` — the cause of the 400).
- Check every other Claude caller (companion, notebook, recap, drafts, extraction, tagging, glossary) for the same bad parameter and fix all of them in the same turn.
- Update `src/lib/ai/anthropic.test.ts` with a test per model asserting the exact thinking value sent.
- Retest what I can locally: mocked Claude responses for reflection, companion, recap through the real request code. Live Anthropic calls from the phone are yours to retest (Test key → companion → reflect → recap).

## 2. Front camera un-mirrored, preview matches saved video
- The front preview must show you as others see you (not a mirror) AND the saved video must match the preview. MediaRecorder records the raw sensor image, so I'll flip the recorded front-camera video to match the non-mirrored preview.
- Implementation: draw the camera stream to a canvas with a horizontal flip for front camera and record from `canvas.captureStream()` (audio track passed through from the mic). Rear camera records raw, no flip. If canvas recording proves unreliable in the WebView, fallback: keep preview un-mirrored via CSS and note the saved-video caveat to you before shipping.
- Test: record front and rear in the browser harness, confirm preview and saved playback have the same orientation.

## 3. Full-screen 20:9 camera preview
- Rework `/record` layout: camera fills the whole screen (object-fit: cover), with close button, timer, Video/Audio toggle and record button floating on top of the video, safe-area padded. No cream panel behind the preview.
- Applies to audio mode too: full-screen dark stage with the mic visual, controls floating.

## 4. Front flash as full-screen flood
- When torch is on and no hardware LED exists: a full-screen warm-white overlay at full opacity behind the controls (preview keeps running underneath via the canvas pipeline from fix 2, or preview hidden with a "screen is your light" state). Not white borders.
- Keep rear-camera real LED torch as-is.

## 5. "+" quick-record button
- Find where the "+" button renders (index/header) and wire it to navigate to `/record`. Verify it works from every page it appears on. Add a routing test.

## 6. Unlock animation full screen
- Fix `UnlockOverlay` so the overlay covers the entire viewport (fixed inset-0 over the cover background), not a small centered box. Same timing and dandelion/daffodil behavior, just full-bleed.

## 7. App icon with readable "Journal"
- Regenerate icon artwork from the bottle-green cover: square, moons + some botanical border, with the word "Journal" in gold calligraphy large in the centre (title "Vanshika's Diary" omitted as agreed).
- Generate mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi, adaptive foreground + background, and round variants; replace all files under `android/app/src/main/res/mipmap-*`. Splash stays green as built.

## 8. Whole app as 20:9 full screen
- Audit the app shell: remove any max-width/centered-desktop framing on the diary routes so pages use the full phone width with the existing safe-area tokens. Record, entry, settings and lock screens get checked explicitly.

## What I will not touch
- Fingerprint and diary PIN code: unchanged.
- No new permissions, no Phase 5, no Google Drive/OAuth.

## Verification
- Bun tests (existing + new thinking-parameter and routing tests).
- Playwright at 412x915 (≈20:9): record screen layout, un-mirrored preview, "+" navigation, full-screen unlock overlay, floating controls.
- I cannot run the APK or real Claude calls here: you'll retest key flow, camera, flash, icon on the phone from the next GitHub Actions APK.
