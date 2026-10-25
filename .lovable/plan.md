# Diary — Phase 1 safeguards and Phase 2

## First: finish the Phase 1 safeguards

The Phase 1 plan now includes all four requested additions. Implement and verify them before the Phase 2 features:

- Request persistent browser storage on setup, show whether it was granted in Settings, and let existing diaries request it too. Browsers may refuse; this is not a guarantee against clearing site data, uninstalling or losing a device.
- Never auto-lock during active or paused recording or encrypted saving. A pending lock waits for the recording to finish and save safely. Prevent closing the recording screen from silently discarding an active recording.
- Lock the visible diary immediately during transcription, let only the current job finish and save encrypted, and pause the queue until unlock. Clear decrypted screens, media URLs and all application decryption-key references on lock. Browser JavaScript cannot guarantee physical memory erasure.
- Add **Export encrypted backup** in Settings: a versioned, consistent snapshot containing encrypted entries, media, settings and wrapped-key metadata. No plaintext content, raw keys or recovery words. Report export failures. The backup uses the passphrase/recovery phrase valid when exported; no Drive connection or automatic upload.

## Phase 2: private reflection tools

### Settings and model choices
- An Anthropic key field with save, replace and remove; keep the key encrypted on this device and mask it after saving. Never send it to Lovable Cloud or store it in source code.
- Keep your requested 5.5 models; no substitution with older versions. The [official model documentation](https://docs.claude.com/en/docs/about-claude/models) confirms callable IDs `claude-haiku-5-5` and `claude-sonnet-5-5`. Preserve your written names `claude-haiku 5.5` and `sonne 5.5` as labels, using the documented IDs for requests.
- Per-feature model choices: requested Haiku for extraction, tagging, Notebook preparation and short reflections; requested Sonnet for companion, recap and drafts. Future-phase features have settings only, not their full experience yet.
- If Anthropic rejects a requested 5.5 model, show the error and leave the selected model unchanged. Do not claim a live call works until one succeeds.

### Listening and reflection
- A **Listen / Reflect** choice, defaulting to **Listen**. Listen saves and transcribes without contacting Claude.
- In Reflect mode, offer an explicit reflection request once the transcript is ready; never send automatically.
- Before each request, show exactly which transcript text and optional tone notes will leave the device and ask for confirmation. Send text only, never recordings.
- Save short reflections encrypted with the entry. Handle cancelled requests, no key, missing transcript, connection failure and invalid model names without losing entries.

### Local tone notes
- Add a replaceable on-device tone-analysis module, initially using conservative text cues from the transcript, without downloading another large model.
- Treat results as uncertain observations, not diagnoses or reliable detection of emotion from a voice. Allow correction or removal; include them in Claude requests only when explicitly selected.

### Loose ends and worry parking
- Dedicated **Loose ends** and **Worry parking** pages, accessible from the diary.
- Create, edit and delete items locally; mark loose ends resolved, and archive parked worries. Include optional links back to their source entry.
- Reflection may suggest items, but only add them after explicit acceptance. No automatic reminders, resurfacing, external actions or notification content.

## Technical details
- Keep the existing client-only TanStack app and encrypted IndexedDB storage; no backend, Cloud or analytics.
- Import a non-extractable encrypt-only companion key alongside the decryption key at unlock. A running transcription retains only its already-decoded audio and encrypt-only completion capability after locking, then drops both. Guard against stale jobs overwriting later edits, deletion or a new unlock session.
- Use stable recording lifecycle guards rather than blocking locking merely because the recording page is open. Guard asynchronous reads so they cannot recreate decrypted media after locking.
- Export all encrypted stores in one consistent IndexedDB read transaction, with explicit binary encoding and format version. Test reconstructing and decrypting the exported records without altering the user's live diary. A restore screen is not part of this request.
- Add browser-only Anthropic and swappable tone modules. Requests require explicit confirmation, have no model fallback, and are cancelled on lock. Never persist the key or outgoing text in plaintext.
- Browser-direct requests necessarily expose the key to the running browser while in use; encrypted storage protects it at rest, not from a compromised device or malicious script. Explain this at key entry and require acknowledgement before saving it.
- Add encrypted stores/types for Phase 2 items with a versioned IndexedDB upgrade; preserve existing Phase 1 entries. New pages receive their own Diary titles and descriptions.
- Record the module and key-lifecycle decisions in the project's architecture notes.

## Verification and stopping point
- Run focused tests for storage permission granted/refused, uninterrupted recording, safe encrypted transcription completion after locking, released key references, encrypted backup round-trip, silent Listen mode, explicit request confirmation, exact model values, no fallback, and encrypted Phase 2 item persistence.
- Exercise setup, record/save/playback, lock/unlock, backup download and Phase 2 item creation/editing in the app.
- Live Claude verification needs your encrypted key and a valid callable model name. If either is unavailable, report that part as unverified, without substituting another model.
- Stop after Phase 2. No semantic search, full Notebook, companion chat, weekly recap, drafts, people pages or Google Drive sync yet.

## Phone test checklist
1. Check whether storage protection was granted; export a backup and keep it outside the browser.
2. Record longer than the auto-lock interval, pause/resume, save and replay it.
3. Lock during transcription; unlock and check its saved result.
4. Leave Listen selected and record an entry: no Claude request should occur.
5. Save your Anthropic key, choose Reflect, review the outgoing text, and explicitly confirm a reflection.
6. Check that a rejected model produces an error, not an older-model response.
7. Add/edit/resolve a loose end and park/archive a worry; lock and unlock to confirm they persist.