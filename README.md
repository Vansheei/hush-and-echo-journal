# Virtual Journal

A privacy-first voice and video journal with an AI companion for reflection. Users record entries the way they naturally think, out loud, and the app transcribes, understands and connects them, without the recordings ever leaving the device.

The project explores a practical question: how much of an AI-powered personal assistant can run locally on a phone, and how do you design the parts that do need a large language model so the user stays fully in control of their data?

## Highlights

- **On-device speech recognition** with Whisper running in the browser through transformers.js and WebGPU, including multilingual and code-switched speech (English, Hindi, German)
- **Prosody and paralinguistic analysis** computed locally from speech rate, pauses, loudness and pitch variation, so the language model receives information about *how* something was said, not only the words
- **Retrieval-augmented generation (RAG)** over personal entries: local semantic search selects only the relevant moments, which are sent to the model with visible source references
- **LLM model routing** between Claude Haiku 5.5 and Claude Sonnet 5.5 based on task complexity, balancing quality and cost, configurable per feature
- **Human-in-the-loop AI**: the model suggests, the user decides. No memory is stored, no person is tagged and no message is sent without explicit approval
- **Privacy by design**: end-to-end encrypted local storage, no backend, no accounts, no analytics
- **AI-assisted development**: specified, architected and reviewed by me, with implementation generated through Lovable and planning and code review with Claude

## Features

**Recording.** Audio, video and written entries created inside the app and kept separate from the phone's gallery.

**Transcription.** Every recording is transcribed on the device with word-level timestamps. Tapping a line jumps the recording to that moment. Words the model was unsure about are flagged and can be corrected, building a personal glossary over time.

**Tone notes.** Alongside each transcript the app produces short prosodic annotations such as long pauses, faster speech or a quieter voice, aligned to timestamps.

**Reflection companion.** A spoken, back-and-forth conversation with three switchable modes: CBT-informed reflection, interpersonal reflection for complex situations with other people, or both combined. The companion asks clarifying questions before drawing conclusions and keeps observed facts separate from interpretations.

**Learning layer.** After a conversation the companion proposes things it has learned about the user, each labelled as fact or interpretation. The user accepts, edits or dismisses them, and feedback on replies shapes future responses.

**Search.** Keyword and semantic search, both local, landing on the exact moment inside a recording.

**Organisation.** Loose ends, parked worries, bookmarked entries, people pages and a per-entry choice between simply being listened to or receiving a reflection.

**Interface.** Designed as an antique hardcover journal with aged paper, cursive typography, cassette and film reel entry objects, a seasonal scene and an animated unlock. UI available in English, Hindi and German.

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend | React with TanStack Start, TypeScript, client-side only, mobile-first |
| Android | Capacitor wrapper producing an APK |
| Storage | IndexedDB with chunked, encrypted media |
| Encryption | Web Crypto API, AES-GCM, envelope encryption |
| Speech to text | Whisper via transformers.js in a Web Worker, WebGPU with WASM fallback |
| Prosody analysis | Whisper timestamps combined with the Web Audio API |
| Retrieval | Local embeddings and semantic search |
| Language models | Anthropic Claude API (Haiku 5.5, Sonnet 5.5) |
| Speech output | Built-in speech synthesis on the device |
| Sync (planned) | Google Drive appDataFolder |

### Security model

A random 256-bit data key encrypts all entries. That key is wrapped twice, once by a key derived from the user's passphrase (PBKDF2-SHA256, 600,000 iterations) and once by a 12-word recovery phrase. The unwrapped key exists only in memory and is cleared when the journal locks. The API key is stored encrypted on the device, and only text the user chooses to share is ever sent to the language model.

### Design decisions

- **Local first, cloud only where it adds real value.** Small on-device models handle transcription, prosody and retrieval well. Open-ended reflective conversation is where a large model makes a clear difference, so that is the only part that uses the cloud.
- **Text plus prosody instead of raw audio.** Sending audio to a multimodal model would leak the recordings. Converting tone into readable annotations keeps audio on the device while still giving the model emotional context.
- **Small context over full history.** Retrieval keeps prompts short, which lowers cost, reduces latency and sends far less personal data than passing the full journal.

## Getting started

Requires Node.js and a recent Chromium-based browser (WebGPU recommended).

```bash
git clone <repository-url>
cd <repository-folder>
npm install
npm run dev
```

On first launch, set a passphrase and write down the recovery phrase. To use the AI features, add your own Anthropic API key in Settings. The Whisper model downloads once and is cached on the device afterwards.

## Roadmap

- [x] Encrypted storage, lock screen and recovery phrase
- [x] Recording, on-device transcription and prosody analysis
- [x] Reflections, companion modes and local search
- [ ] Weekly recap, message drafts and full people pages
- [ ] Encrypted sync via Google Drive
- [ ] Fingerprint unlock and Android-native integrations
- [ ] On-device speech emotion recognition model
- [ ] Fine-tuning an open-source model for fully local reflection

## Disclaimer

This is a tool for personal reflection. It is not therapy and does not replace professional support.

## Author

Vanshika, M.Sc. Cognitive Science (AI and Computational Linguistics), Universität Osnabrück

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
