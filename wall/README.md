# Wall tracker — touch the projection

Turns a webcam pointed at the projected image into a touch-like pointer for
DRC.Geo. No touch frame, no touchscreen: a finger held on a spot for one
second is a tap.

```
webcam ─► MediaPipe hand landmarks ─► index fingertip
       ─► homography from a 4-corner calibration ─► unit square of the image
       ─► WebSocket (ws://127.0.0.1:8765) ─► the app draws the cursor, fires the click
```

The tracker never moves the OS mouse, so macOS needs no Accessibility
permission — only the camera prompt, once.

## Setup — once

```bash
wall/setup.sh
```

Creates a private Python env and downloads the hand model (8 MB). Python 3.10–3.12.

## Exhibition day — three terminals

```bash
wall/serve.sh              # 1. the app, locally, on http://localhost:4173
wall/run.sh                # 2. the tracker (add --show to see the camera feed while aiming)
```

3. Chrome → **http://localhost:4173/?wall=1**. Tap the "touch to begin" gate
   once **with the trackpad** — that one real tap is what puts Chrome in
   fullscreen and keeps the screen awake (browsers refuse both from anything
   synthetic). Then press **C** and hold your finger on each of the four targets.

Calibration is saved to `wall/calibration.json` and survives a restart. Redo
it whenever the projector or camera moves (`run.sh --recalibrate`, or just
press C again).

## Camera placement

- **Near the projector, facing the wall**, so a visitor standing in front of
  the image doesn't block the camera's view of their own hand.
- The whole projected image inside the frame, with margin. `--show` opens a
  preview to aim with.
- Fairly even light on the wall. The tracker is robust to skin tone and
  ordinary room light; near-dark or a strong backlight behind the visitor hurt it.
- The built-in FaceTime camera works from ~3 m. A cheap USB webcam placed
  closer to the wall tracks smaller hands more reliably.

## Tuning

Top of `tracker.py`: `DWELL_S` (hold time for a tap, 1.0 s), `DWELL_RADIUS`
(how still is still), `SMOOTH_ALPHA` (jitter vs. lag), `CAL_INSET` (where the
calibration targets sit). The four numbers most likely to need a nudge on the
day are the first three.

## Pipeline test without a camera

```bash
wall/run.sh --simulate
```

A fake finger wanders the image and pauses every few seconds, so the cursor,
dwell ring, hover tooltips, edge auto-scroll, clicks and the calibration flow
can all be checked with no hardware at all.

## Known limits

- **Dwell, not touch.** A webcam can't tell a finger on the wall from one an
  inch in front of it — only a depth sensor or a touch frame can. So "hold
  still for a second" is the tap.
- **One hand.** Two visitors pointing at once: the tracker follows one.
- **Typing.** The search box has nothing to type with. Everything else is
  reachable by pointing.
- **Fullscreen** has to be entered with a real trackpad tap once per session —
  browsers refuse it from synthetic events, by design.

## Why not MediaPipe 1.0

`requirements.txt` pins `mediapipe<1.0`. The 1.0.1 wheel crashes on macOS in
`TensorsToDetectionsCalculator` (Metal helper init, even with the CPU
delegate) — verified on Apple Silicon before the model is ever given a frame.
0.10.x is fine.
