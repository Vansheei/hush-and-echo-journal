# Plan: fixes check, Phase 4 check, then design pass

## Status note
The 7 fixes and Phase 4 (weekly recap, drafts, people pages) were already built last round. I won't rebuild them. I'll re-check each one against your list and fix anything that falls short:
- Companion: one tap starts, it stops listening when you go quiet, sends and reads the reply at 1.15x, then listens again. A second tap ends it. The trust switch resets when you leave or lock.
- Past entries: only the closest matches from local search get sent, shown as tappable entry + timestamp chips.
- "What I know about you": only Claude's suggestions (fact or interpretation) that you accept, edit or dismiss, plus thumbs up/down.
- Written entries, red "!" on unsure words, softer page sound (quieter, slower, no crackle, high tones cut).
- Recap only when you ask, drafts never sent, people pages built only from people you confirmed.

## Design pass

1. **Cover and lock screen** (refs 1 + 2): deep forest green with soft diagonal light rays and shadowed edges. A speckled star texture, gold crescent moons, a pale full moon and small gold stars. Gold and green vines and flowers around the edges, plus a faint burnt-gold border. All drawn fresh as our own art (vector), never traced from the references. All three covers stay switchable. Green gets this full scene, and plum and ocean get matching colour versions.
2. **Unlock animation**: on fingerprint/unlock, gold light starts at the bottom, travels up the vines, flowers bloom one at a time, then the cover swings open. Brighter and slower than the current glow, about 2.5s. With reduced motion turned on it becomes a simple fade.
3. **Scroll banner headings**: every page title sits on a curled parchment scroll in Pinyon Script. One shared banner used everywhere.
4. **Inside pages**: warm aged parchment with soft stains and mottling, inside a thin ornate art-nouveau border with lotus flowers and a tiny swan in one corner. Two or three faint sepia butterflies drift down one side. Butterflies are the only whimsical extra. Seasonal leaves stay, but toned down so the page doesn't feel cluttered.
5. **Main page**:
   - Companion gets a featured spot: an oval "moonlit" card with a little light glow and a short line inviting you to talk.
   - Loose ends, Worry parking, People, Glossary, Search, What I know about you, Recap and Drafts become coloured ribbon bookmark tabs coming off the page edge. Each has a small gold icon. They wrap neatly into two columns on a phone.
6. **Writing page**: when it opens, a short burnt-paper reveal. Embers creep across, then settle into the page. The text box looks like a real lined page, and what you type shows in the heading font. With reduced motion turned on it's a plain fade.

## Order
Fixes check, then Phase 4 check, then design in the order above. After that comes a phone check on mobile and desktop screenshots, then a short phone checklist.

## Unchanged rules
Personality, privacy, local encryption, nothing sent without your confirmation, no automatic tagging. App-switch locking stays paused for testing.

## Technical details
- New components: `ScrollBanner`, `PageFrame` (border + butterflies), `CelestialCover` (SVG layers: rays, stars, moons, vines with per-flower bloom delays), `RibbonTabs`, `CompanionCard`, `BurntReveal`.
- Textures come from SVG filters (feTurbulence) and gradients, so no large images and it works offline. Colours stay as tokens in styles.css under `[data-cover]`.
- The unlock sequence is driven by CSS animation delays inside `UnlockOverlay`, and respects `prefers-reduced-motion` and the in-app motion setting.
- Verification: typecheck, the existing tests, and Playwright screenshots at 390px and 1280px with no horizontal overflow and no console errors.
