# Diary roadmap

- [x] Diagnose GitHub APK failures using the latest job log; replace retired Android SDK `tools` default with explicit supported packages.
- [x] Fix run #5 failure: speech plugin crashed start-page rendering in the web bundle step; lazy import + server stub, clean-copy build/sync verified.
- [ ] Confirm a successful GitHub APK run and download (blocked until the corrected workflow reaches GitHub and runs).

- [x] Reorganize Settings into seven heading-only linked sections; all section/back navigation and saved sound preferences verified on mobile and desktop.
- [x] Add offline English/Hindi/German interface labels, buttons, section names and dates; encrypted writing preservation tested, AI/transcription language remains independent.

- [x] Android native upgrades: biometric-protected diary key, local TTS at 1.15x, encrypted file sharing, back gesture navigation, native base-model default; 42 automated tests and browser fallback flow verified. Phase 5 not started.
- [ ] Nothing Phone 2a native checks: enable/lock/fingerprint and PIN fallback; hear a reply with an installed offline voice; export/save backup via share sheet; back from chapters to index and from other pages; confirm base selected. Blocked on an installed APK and physical phone.

- [x] Security group, optional PIN, recovery passphrase reset, clearer fingerprint refusal guidance, warm 40%-faded writing sheet; 36 tests and browser PIN/reset/save flow passed.
- [x] Audit Phase 4 and APK readiness before Phase 5: features present, live Claude/phone tests remain unverified, people matching approximate, no Android build project.
- [ ] Native Android contacts and notification permission requests (blocked: no Android package/permission bridge exists; browser cannot grant them).
- [ ] APK build/install readiness: native project, plugin registration and fixed signing are configured; Gradle compilation awaits GitHub Action and installation/device behavior require the owner's phone.

- [x] Add secure device unlock with passphrase fallback and six coming-later interfaces; 34 tests pass, simulated PRF setup/lock/unlock/removal verified.
- [ ] Verify fingerprint unlock on the owner's device (physical biometrics and browser PRF support cannot be tested here).

- [x] Warm larger lantern beside heading, autumn scroll tones, burgundy ribbons, 60% faded page artwork; correct default-thinking reply exhaustion and verify recap preview/scroll using a simulated Claude reply.

- [x] Implement the four Phase 1 safeguards; verify recording through background lock, playback, ciphertext backup round-trip and lock lifecycle tests.
- [x] Implement Phase 2 local tone notes, explicit reflection confirmation, exact 5.5 routing, encrypted key settings, loose ends and worry parking; verify item edits and persistence in the app.
- [ ] Verify a live Claude reflection (blocked: owner's Anthropic key has not been entered; no older-model substitution).
- [x] Stop after Phase 2; phone checklist is in the approved plan.
- [ ] Re-enable lock when switching apps before real use (paused at owner's request).
- [x] Design pass: antique book theme, covers, unlock animation, cassettes/reels, ribbon, journal view, sounds, seasons, people tab preview
- [x] Pre–Phase 3: three switchable covers, IM Fell English/Pinyon fonts, durable multilingual small speech cache, editable words and encrypted glossary.
- [x] Phase 3: local semantic search with timestamps, facts/interpretations notebook, confirmed people clarification, voice/text companion with modes and feedback.
- [x] Verify glossary/notebook/people persistence, transcript correction and reflection context, real semantic search, hold-to-talk, real Whisper cache reuse after worker recreation with model host blocked; give a short phone checklist.
- [ ] Live Claude companion/reflection and actual phone voice/mixed-language quality verification (owner's key and phone required; no substitution).
- [x] Pre–Phase 4 fixes: hands-free companion conversation with silence detection and trust switch, prominent companion spot, meaning-search-only past moments with tappable sources, notebook renamed "What I know about you" with AI-suggested notes and thumbs, written entries, red unsure-word flags, softer muffled page sound.
- [x] Phase 4: weekly recap (Sonnet, on request, linked entries), drafts from entry/conversation (never sent), per-person pages from confirmed people only.
- [ ] Verify Phase 4 live: companion conversation loop, recap, drafts and people pages with the owner's key and phone.

- [x] Design pass 2: celestial-forest cover with vines/moons and rising-gold bloom unlock, scroll-banner headings, art-nouveau page frame with swan and faint butterflies, featured Companion card, ribbon bookmark sections, burnt-paper writing page in script.
- [ ] Owner phone check of the new design and softer page sound.

- [x] Capacitor Android APK: offline bundle, mic/camera only, GitHub debug APK workflow (Gradle build first verified on GitHub).
- [x] Add burgundy and blue covers following the green cover pattern.
