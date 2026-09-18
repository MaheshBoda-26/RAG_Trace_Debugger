# Brag Plan: RAG Trace Debugger

## What is this app?
A diagnostic layer for RAG pipelines: it records every stage of a retrieval-augmented
answer (query rewrite → retrieval → rerank → assembly → generation), names the stage
that broke the answer, and re-runs the case with adjusted parameters to prove the fix.

## The angle
Every broken RAG answer looks innocent — the chat UI shows a confident response. The
drama is in the *evidence*: one chunk knew the answer, and rerank dropped it. This
video treats the product like a forensic instrument: a question goes in, five stages
light up one by one, a stage verdict stamps RERANK in copper, then "Re-test this case"
re-runs the pipeline with `rerank_k` raised and the verdict heals. A real eval run
localizes 15/15 labeled failures with zero misses — that number is the receipts.

## Hook (first 2-3 seconds)
A chat answer that reads perfectly — "NOTE: The Starter plan does not include
automated bank reconciliation." — while underneath it a stage rail shows five green
OKs. Text slams in: "THE ANSWER WAS WRONG." / "EVERY STAGE SAID OK."

## Key moments (the middle)
1. The 5-stage trace strip animating stage by stage — query_rewrite, retrieval,
   rerank, assembly, generation — each with its duration, like an evidence timeline.
2. The verdict stamp: rerank stamped in copper with the actual failure reason from
   the app: "Needed chunk(s) were retrieved but dropped at rerank: pricing#0."
3. The re-test: a before/after parameter diff (`rerank_k: 5 → 7`), the failed signal
   flipping from `key_terms_in_context: false` to `true`, verdict healing to a
   verdigris IMPROVED.

## Outro / punchline
The product wordmark and its own tagline, verbatim: "See which stage broke your
answer." followed by the eval receipt: 15/15 failures localized · 0 framework deps ·
runs without API keys.

## User flow worth showing
entry → key action → result: submit "Summarize what the Starter plan does and does
not include." → the traced pipeline records all 5 stages and stamps rerank as the
broken one → re-test raises rerank_k and the needed chunk (pricing#0) stays in
context. This is the actual demo flow of the app (case q12).

## Tone
- Preset: cinematic
- Creative direction: evidence documentary — the quiet drama of an audit that finds the one number that lied.
- Interpretation: few scenes, long confident holds, big serif type, restrained motion (0.5-0.8s reveals), dramatic reveals instead of quick cuts; humor stays completely dry.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: oklch(0.155 0.005 60)  ≈ #131211 (near-black warm)
- Surface/elevated: oklch(0.19 0.006 58) / oklch(0.225 0.007 58)
- Accent: oklch(0.72 0.14 52)  ≈ copper #d9894a
- Text: oklch(0.94 0.004 85) ≈ #f3f1ec
- Muted text: oklch(0.78 0.005 80) / dim oklch(0.64 0.008 75)
- Success (healed): oklch(0.72 0.09 175) muted verdigris
- Error (verdict): oklch(0.68 0.17 28) dried-blood red
- Display font: Fraunces (self-hosted woff2, weights 300-700)
- Body font: Instrument Sans (self-hosted woff2)
- Mono font: JetBrains Mono (self-hosted woff2) — all trace/meta text
- Strongest visual element: the 5-stage trace strip with per-stage status + the
  copper VERDICT stamp; hairline-bordered evidence panels on near-black.

## Share copy (draft)
Your RAG pipeline lied to you — politely. RAG Trace Debugger records every stage,
names the one that broke the answer, and re-runs it to prove the fix. 15/15 failures
localized, zero framework deps.

## Audio direction
- Role: cinematic support under a documentary edit; restrained and warm, never busy.
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 (steady, clean — the polished/cinematic pick), volume 0.30, fade in over 0.6s, fade out across the final 1.5s under the outro.
- Music cue guidance: bundled preset at composition/assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json (109.96 BPM). Strong cues in window: 8.74s, 13.11s, 17.47s, 18.56s, 22.93s. Lock the verdict stamp near 8.74s and the healed verdict near 17.47s (±0.15s). Beat grid ≈ 0.545s spacing for sequential stage light-ups (snap within ±0.10s, skipping beats so text stays readable).
- Audio-reactive treatment: subtle; music RMS/bass gently swells the background evidence-glow and the verdict stamp's presence. No waveform/equalizer visuals.
- SFX posture: sparse, professional restraint — 5-6 cues total.
- Audio-coupled moments: hook text slam (impactSoft_medium_001), per-stage light-ups (ui/interface click, low volume), verdict stamp (bong_001), re-test flip (click_003), healed verdict (impactBell_heavy_000), outro wordmark (let music swell alone).
- Restraint rule: no SFX during the long outro hold; nothing brighter than low-HF-risk files; never two SFX within 150ms.

## Storyboard

### Scene 1 — The lie — 4.0s
Near-black evidence room. A chat panel (recreated app UI, JetBrains Mono) shows the
real q12 answer typing on: "NOTE: The Starter plan does not include automated bank
reconciliation." Beneath it a compact stage rail shows five stages, each ticking to a
small verdigris "ok" in sequence. At ~2.4s the hook slams over/under in Fraunces
display caps: "THE ANSWER WAS WRONG." then "EVERY STAGE SAID OK." — hook line holds
≥1.6s settled.
Sequential/interaction: yes — answer text types character-by-character (key ticks,
very low volume, thin out after 6 chars); 5 rail "ok" ticks land on the beat grid.
Audio intent: quiet, composed — the calm before the accusation.
Audio-coupled idea: typed text with subtle key ticks; rail ticks on beats.
Music: steady bed, low.
Transition mood: hard cut → Scene 2.

### Scene 2 — The evidence — 4.5s
Full trace strip recreates the app's exhibit row: five hairline panels —
01 query_rewrite · 02 retrieval · 03 rerank · 04 assembly · 05 generation —
each with a duration (0.0ms, 0.2ms, 49.1ms, 0.0ms, 0.0ms). Panels arrive one by one
on the beat grid, then the camera pushes slightly toward rerank as its panel lifts
and stamps: VERDICT — rerank, in copper, with the real reason line beneath: "Needed
chunk(s) were retrieved but dropped at rerank: pricing#0."
Sequential/interaction: yes — 5 panels arrive on consecutive beats (every other beat
so each reads); verdict stamp is beat-locked to 8.74s.
Audio intent: procedural tension rising; the stamp is the punctuation.
Audio-coupled idea: panel-by-panel card reveals; stamp lands with bong_001.
Music: bed continues.
Transition mood: hard cut → Scene 3.

### Scene 3 — The re-test — 4.5s
Split evidence panel, before | after, recreated from the app's ComparisonView:
left "before" shows rerank_k 5, key_terms_in_context false (error red);
a cursor moves to and clicks the real "Re-test this case" button (simulated click);
right "after" shows rerank_k 7, key_terms_in_context true (verdigris), and the
verdict heals to IMPROVED. Bottom line in mono: chunk pricing#0 kept in context.
Sequential/interaction: yes — simulated cursor click on the re-test button; values
flip false→true; IMPROVED stamps in.
Audio intent: clinical resolution — the instrument proving the fix.
Audio-coupled idea: simulated click (click_003); value flips; IMPROVED with impactBell_heavy_000, beat-locked near 17.47s.
Music: bed continues.
Transition mood: clean cut → Scene 4.

### Scene 4 — The receipt — 4.0s
Wordmark: the trace glyph (rect + fault-spike path) draws in as an SVG stroke, then
"RAG Trace Debugger" in Fraunces, tagline verbatim beneath: "See which stage broke
your answer." Receipt row in JetBrains Mono fades up: "15/15 failures localized ·
0 framework deps · runs without API keys". Hold ≥2s. Music fades under.
Sequential/interaction: no — one composed hold.
Audio intent: confident exhale; music carries, SFX silent.
Audio-coupled idea: none.
Music: fade out 1.5s.
Transition mood: fade to black.

**Music mood for this video:** cinematic-restrained (vol-12 steady bed)
**Audio summary:** a low steady bed under a near-silent evidence edit — five beats
carry all the punctuation: the hook slam, five stage ticks, the verdict stamp, the
healed verdict, then silence as the wordmark holds.

---
Total: 4.0 + 4.5 + 4.5 + 4.0 = 17.0s. Reading floors honored: hook lines hold 1.6s+;
stage panels hold ≥1.0s each; outro holds 2s+. Within 15-25s target; 20s nominal with
transition overlaps absorbed into scene holds.
