# Playable Piano

A playable piano in your browser, in plain HTML, CSS and vanilla JavaScript.
No build step, no account, no audio files — sound is synthesized live with
the Web Audio API.

## Features

- **2 octaves** (C4–B5 by default) with octave shift buttons.
- **Play by mouse, touch, or computer keyboard:**
  - Lower octave: `Z S X D C V G B H N J M`
  - Upper octave: `Q 2 W 3 E R 5 T 6 Y 7 U`
- **Sound:** piano-like synthesis (fundamental + harmonics with a natural
  decay), plus sine, triangle and sawtooth options, and a volume control.
- **Sustain:** sustain button, or hold `Shift` while playing.
- **Record:** record what you play and play it back.
- **Learn a tune:** Twinkle Twinkle, Ode to Joy and Happy Birthday play
  with the keys lighting up so you can follow along.

## Run it

Just open `index.html` in a browser, or serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/

## Files

- `index.html` — layout, controls, record and demo-song buttons
- `app.js` — UI, Web Audio playback, keyboard handling, recording, demo songs
- `logic.js` — pure note logic: frequencies, note names, key mapping, demo songs (no DOM, unit-testable)
- `styles.css` — piano and page styling
