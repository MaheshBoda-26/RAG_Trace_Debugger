# Hyperframes Composition Brief: RAG Trace Debugger

## Objective
Create a short launch-style brag video for RAG Trace Debugger.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 17 seconds (within the 15-25s law)

## Source Material
- Project root: `/Users/maheshboda/Projects/RAG_Trace_Debugger`
- Primary files read: `web/index.html`, `web/src/index.css`, `web/src/pages/Home.tsx`, `web/src/components/TraceTimeline.tsx`, `web/src/components/ComparisonView.tsx`, `web/src/components/StageCard.tsx`, `web/src/components/Layout.tsx`, `server/data/queries/queries.json`
- Product name: RAG Trace Debugger
- Tagline / strongest claim: "See which stage broke your answer."
- Key UI or visual moment to recreate: the 5-stage exhibit strip (StageCard row) and the copper VERDICT stamp; the ComparisonView before/after panel
- Copy that must appear verbatim:
  - "THE ANSWER WAS WRONG." / "EVERY STAGE SAID OK."
  - "NOTE: The Starter plan does not include automated bank reconciliation."
  - "Needed chunk(s) were retrieved but dropped at rerank: pricing#0."
  - "Re-test this case"
  - "See which stage broke your answer."
  - "15/15 failures localized · 0 framework deps · runs without API keys"

## Creative Direction
- Tone preset: cinematic
- Creative direction: evidence documentary — the quiet drama of an audit that finds the one number that lied
- Interpretation: few scenes, long confident holds, big Fraunces serif type, restrained 0.5-0.8s reveals, dramatic push-ins instead of quick cuts; completely dry delivery
- Angle: a broken RAG answer looks innocent — five stages all say ok — the evidence shows rerank dropped the one chunk that knew the answer; re-test proves the fix
- Hook: chat answer reads fine while all five stages tick "ok" → "THE ANSWER WAS WRONG. EVERY STAGE SAID OK."
- Outro / punchline: wordmark + verbatim tagline + the eval receipt line
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: oklch(0.155 0.005 60) (≈ #131211, near-black warm)
- Text: oklch(0.94 0.004 85) (≈ #f3f1ec)
- Accent: oklch(0.72 0.14 52) (copper ≈ #d9894a)
- Error red: oklch(0.68 0.17 28); Success verdigris: oklch(0.72 0.09 175)
- Display font: Fraunces (local `assets/fonts/fraunces-latin.woff2`, weights 300-700; declare @font-face)
- Body font: Instrument Sans (local `assets/fonts/instrument-sans-latin.woff2`)
- Mono font: JetBrains Mono (local `assets/fonts/jetbrains-mono-latin.woff2`) — all trace/meta/label text
- Visual references from the project: hairline `--color-border` panel borders on `--color-bg-elevated` surfaces; uppercase mono exhibit-labels with 0.08em letter-spacing; the 2px left status rail on case rows; the Mark glyph (rect + "M6 21h5l2.5-10 3 15 2-5H26" fault spike); the ruled `substrate` baseline texture (32px repeating hairlines fading out) as the persistent background layer

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. The lie — 4.0s — q12 answer types on; five stages tick ok; hook lines slam and hold
2. The evidence — 4.5s — five stage panels arrive on beats; camera pushes to rerank; VERDICT stamp + failure reason
3. The re-test — 4.5s — before/after panel; simulated click on "Re-test this case"; values flip; IMPROVED
4. The receipt — 4.0s — wordmark draws in; verbatim tagline; receipt row; music fades

## Audio
- Audio role: cinematic support / restrained documentary bed
- Audio arc: quiet bed under the hook, procedural tension through the trace, clinical resolution at the re-test, confident fade under the outro
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (already copied into composition assets)
- Music treatment: volume 0.30, ~0.6s fade-in, fade out across the final 1.5s under the outro hold
- Music cue guidance: bundled preset at `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (109.96 BPM; beat grid ≈0.545s). Strong cues: 8.74s, 13.11s, 17.47s, 18.56s, 22.93s. Beat-locked moments: verdict stamp ≈8.74s; IMPROVED stamp ≈17.47s (±0.15s). Sequential reveals snap to the beat grid ±0.10s, every other beat for readable text.
- Audio-reactive treatment: subtle — music RMS/bass gently swells the background evidence-glow and verdict stamp presence. No waveform/equalizer visuals. Extract per-frame audio data with the hyperframes-creative helper (`scripts/extract-audio-data.py`) into the composition and sample per-frame via `tl.call()`.
- Audio-coupled moments:
  - Scene 1 hook slam — impactSoft_medium_001
  - Scene 1 typing + rail ok-ticks — sparse low-volume key/click ticks (thin out after ~6 chars)
  - Scene 2 panel arrivals — card/drop cues, low volume
  - Scene 2 verdict stamp — bong_001 (beat-locked)
  - Scene 3 simulated click — click_003
  - Scene 3 IMPROVED — impactBell_heavy_000 (beat-locked)
- SFX selection guidance: low-HF-risk files only (impactSoft_medium_*, bong_001, click_003, impactBell_heavy_000 already copied); align SFX to animation starts; never two SFX within 150ms; skip SFX entirely during the outro hold
- SFX analysis guidance: `.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes chooses exact timestamps/density/volume after animation exists
- Audio files: music + selected SFX already copied into `brag-output/composition/assets/` (interface: bong_001, drop_001, click_003; impact: impactSoft_medium_001, impactBell_heavy_000)

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the trace strip, verdict stamp, and re-test panel are the required recreations)
- Keep all text readable in the final render (hook lines hold ≥1.6s; stage panels ≥1.0s; outro ≥2s)
- Keep the video within 15-25 seconds (17s authored)
- Include the planned music/SFX layer
- Treat /brag audio notes as guidance, not a fixed cue sheet
- Major reveals may move toward strong cues within ~0.15s; smaller entrances within ~0.10s; 1-3 strong cue locks total
- Use SFX to support motion: card sounds for panel reveals, announcement cue for the verdict stamp, click for the simulated re-test, bell for the healed verdict
- Honor the music fade-out under the outro
- Audio-reactive: extract audio data and wire at least one visual element (background evidence-glow / stamp presence) if extraction is available; if unavailable, note it and skip without blocking
- Use local assets for audio and fonts (already staged under `assets/`)
- Run `hyperframes check` before render — it is brag's single gate
