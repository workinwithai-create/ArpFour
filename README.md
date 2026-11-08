# ArpFour

Four-bar live arpeggio desk for bedroom producers and AI-music finishers.

Suno and loop DAWs leave the harmony static. Session players write a moving arpeggio so the four-bar loop finally has motion and finishes.

Live samples only — FluidR3 acoustic grand, nylon, upright bass, and acoustic kit from the PreEight bank pinned to commit `d58301e4a494555f411a2afbc448b724136eee76`.

No oscillators. Audio never leaves the tab.

## Distinct from yesterday and the rest of the line

| Tool | Job |
| --- | --- |
| CallFour | Four-bar call-and-response |
| WalkBass | Walking bass under roots |
| VoicingForge | Chord voicing |
| HookLine | Melodic hook line |
| **ArpFour** | Four bars of arpeggio motion so the loop finally moves |

## Pricing

One-time **$19** on Lemon Squeezy (recommended). Mirror on Gumroad.

Do not subscribe; the core is a focused desk. Free for personal use in this demo.

## Acceptance checks (section 9)

1. Export at 92 BPM, 8 bars, 48 kHz → exactly 1,001,739 samples; first transient within 1 ms of sample 0. (Export path uses OfflineAudioContext; length calculated exactly; tail folded.)
2. Import WAV at bar 1 of 92 BPM DAW and loop 4 times: no clicks at seam, no drift.
3. Play, switch tab 30s, return: stopped cleanly, no stacked notes.
4. Change recipe / BPM / chords while playing: heard within one bar, no restart.
5. Block sample host: UI names missing instruments.
6. Longest pad (none in this desk; notes have release ramps ≥10 ms) sustains as scheduled.
7. Grep: no @main/@gh-pages, no Math.random in export path, voice names match samples (kick, snare, hat, piano, nylon, bass).

## License

MIT. workinwithai-create.