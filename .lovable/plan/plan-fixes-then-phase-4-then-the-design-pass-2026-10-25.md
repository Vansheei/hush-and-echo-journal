# Plan: fixes, then Phase 4, then the design pass

## Part 1: Fixes (check each one, fix what falls short)
Most of these were built last round. I'll test each against your list and fix any gaps:
1. **Companion conversation**: one tap starts it. It notices when you stop talking, sends automatically, reads the reply out at 1.15x, then listens again. Tapping again ends the conversation. There's no Send button and no holding. The "trust this conversation" switch skips the confirmation popup until you leave the page or the diary locks.
2. **Companion spot**: its own featured place on the main page, not in the list.
3. **Past entries**: local meaning search picks only the few most relevant moments for each message. Only those get sent, and they show as tappable entry + timestamp chips.
4. **"What I know about you"**: no form to fill in. After a reflection or conversation, Claude suggests notes marked fact or interpretation, and you accept, edit or dismiss each one. Thumbs up/down steer future replies.
5. **Written entries**: a third entry type with its own page.
6. **Unsure words**: a small red "!" in transcripts. Tap it to correct the word or add its meaning to the glossary.
7. **Page sound**: I'll look for a short CC0 recording of an old page being turned and play it quietly. If I can't find a clean one, the made-up sound gets slower and quieter, with no crackle and the high tones cut.

## Part 2: Phase 4 (check, fix what falls short)
- **Weekly recap**: uses Claude Sonnet 5.5 and runs only when you ask. It covers what came up, patterns and specific tips tied to your entries, with no generic motivation. It links to the entries it used.
- **Drafts**: texts or emails written from an entry or conversation. You can only copy them. Nothing is ever sent.
- **People pages**: the entries and moments each confirmed person appears in. People you haven't confirmed never show up.

## Part 3: Design pass (from your six photos, drawn fresh, never copied)

**Cover and lock screen (photos 1 + 2)**
- Background: deep, speckled dark green with misty shadows at the edges and soft gold light rays slanting down from the top, like the forest.
- Top: a gold crescent moon with a star at top left and a pale full moon at top right.
- Around it: small scattered gold stars, thin gold-and-green vines with leaves and tiny flowers climbing both sides, and a worn burnt-gold edge.
- The fingerprint button sits at the bottom.
- Plum and ocean covers keep the same artwork in their own colours.

**Unlock animation**
1. Gold light grows from the fingerprint.
2. It travels up the vines on both sides, and the leaves light up as it passes.
3. Flowers bloom one at a time.
4. The moons brighten, then the cover swings open into the page. It takes about 3 seconds and is much brighter than the current glow.
5. With reduced motion turned on, it becomes a gentle fade.

**Page headings (photo 5)**
- Every page title sits on a curled parchment scroll in the copperplate font: a pale centre, browned edges and a rolled end on each side.

**Inside pages (photos 3, 4, 6)**
- Paper: warm aged parchment with a subtle laid-paper grain, soft brown stains near the edges, and very faint old handwriting in the background.
- Border: a thin brown art-nouveau floral frame with lotus flowers along the bottom and a small swan in one bottom corner.
- Butterflies: three or four faint sepia ones drifting down one side, as the only whimsical extra.
- I'll leave out the quill, ink and books from photo 3 so it stays uncluttered.
- Seasonal leaves become fainter so they don't compete with the butterflies.

**Main page**
- **Companion**: a special card that looks like a little night window into the forest cover, with a crescent moon, soft rays, a faint swan on water and a "Talk to me" line.
- **Other sections**: Loose ends, Worry parking, People, Glossary, Search, What I know about you, Recap and Drafts become coloured ribbon bookmarks along the page edge. Each has a small gold icon and its name in the heading font. On a phone they sit in a tidy two-column ribbon stack, never a plain list.

**Writing page**
- Opening: a burnt-paper reveal where ember edges glow and creep inward, then the page settles.
- Writing area: looks like a real lined, slightly aged page with a margin line. What you type shows in the copperplate font.

## Rules kept
Personality, privacy and local encryption all stay. Nothing is sent without your confirmation (except while trust is on), and nothing gets tagged automatically. App-switch locking stays paused for testing.

## After building
I'll take phone and desktop screenshots, run the tests, and give you a short phone checklist.

## Technical details
- New components: `CelestialCover` (layered SVG for rays, stars, moons and vines, with timed bloom), `ScrollBanner`, `PageFrame` (border, swan and butterflies), `RibbonTabs`, `CompanionCard` and `BurntReveal`.
- Textures come from SVG feTurbulence, so they work offline with no large images. Colours stay as `[data-cover]` tokens.
- If I find a CC0 sound, I'll bundle it locally (attribution kept in AGENTS.md). Otherwise I'll use a low-passed noise sweep.
- Companion speech end is detected by a Web Audio RMS threshold plus about 1.2s of silence, and speech is spoken at rate 1.15. The trust flag lives only in memory and clears when you leave the page or the diary locks.
- Context for Claude is the top-k semantic matches only, and the chips link to `/entry/$id?t=`.
