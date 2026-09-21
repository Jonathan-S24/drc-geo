#!/usr/bin/env python3
"""
DRC.Geo wall tracker — turns a webcam pointed at the projected image into a
touch-like pointer for the app.

    webcam ──► MediaPipe hand landmarks ──► index fingertip (camera space)
           ──► homography from a 4-corner calibration ──► unit square of the
           projected image ──► WebSocket to the browser at ~30 Hz

The browser (src/kiosk/useWallTracker.ts) draws the cursor and dwell ring and
fires the click. This process never touches the OS mouse, so it needs no
Accessibility permission — only the camera prompt, once.

Run:   .venv/bin/python tracker.py            # real camera
       .venv/bin/python tracker.py --simulate # fake finger, no camera needed
       .venv/bin/python tracker.py --show     # + a preview window for aiming

Then open the app with ?wall=1 in Chrome and press C to calibrate.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import signal
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
MODEL = HERE / "hand_landmarker.task"
CALIB_FILE = HERE / "calibration.json"

# ---- tuning -----------------------------------------------------------------
# Where the four calibration targets sit, in unit coordinates of the projected
# image. Inset from the true corners so a finger on them is comfortably inside
# the camera's view and doesn't hide against the bezel of the projection.
CAL_INSET = 0.08
CAL_TARGETS = [
    (CAL_INSET, CAL_INSET),
    (1 - CAL_INSET, CAL_INSET),
    (1 - CAL_INSET, 1 - CAL_INSET),
    (CAL_INSET, 1 - CAL_INSET),
]
CAL_HOLD_S = 1.6        # hold still on a target this long
CAL_RADIUS = 0.02       # ...within this radius (camera-normalized units)
CAL_MOVE_AWAY = 0.07    # after a corner is captured, the finger must travel this far before the next arms
CAL_MIN_SPREAD = 0.06   # any two captured corners closer than this → the run is garbage, start over

DWELL_S = 1.0           # hold still this long to click
DWELL_RADIUS = 0.045    # ...within this radius (unit-square units, 4.5% of width)
DWELL_GRACE_S = 0.2     # a tremor spike outside the radius shorter than this doesn't cancel the hold
DWELL_DRIFT = 0.06      # the anchor follows slow movement (per frame), so a wandering-but-still hand still clicks
REARM_RADIUS = 0.09     # after a click, move this far before another can fire...
REARM_AWAY_S = 0.25     # ...and stay that far for this long — a tremor spike is momentary, a real move isn't
# One Euro filter (Casiez et al.): heavy smoothing when the hand is still,
# light smoothing when it moves fast — the standard for pointer tracking.
# min_cutoff: jitter suppression at rest (lower = smoother, more lag at rest)
# beta: how quickly smoothing relaxes with speed (higher = less lag when moving)
ONE_EURO_MIN_CUTOFF = 1.0
ONE_EURO_BETA = 2.0
ONE_EURO_D_CUTOFF = 1.0
LOST_AFTER_S = 0.25     # no hand for this long → cursor hidden
BROADCAST_HZ = 30
# -----------------------------------------------------------------------------


@dataclass
class Shared:
    """State the vision thread writes and the WebSocket loop reads."""
    lock: threading.Lock = field(default_factory=threading.Lock)
    cam_pt: tuple[float, float] | None = None   # smoothed fingertip, camera-normalized
    seen_at: float = 0.0
    fps: float = 0.0
    infer_ms: float = 0.0          # model time per frame — separates "slow camera" from "slow model"
    frame_wh: tuple[int, int] = (0, 0)
    stop: bool = False
    # --simulate only: where the fake finger should go and hold (calibration targets).
    sim_goto: tuple[float, float] | None = None


class OneEuro:
    """Adaptive low-pass filter for one 2-D point stream."""
    def __init__(self, min_cutoff: float, beta: float, d_cutoff: float) -> None:
        self.min_cutoff, self.beta, self.d_cutoff = min_cutoff, beta, d_cutoff
        self.x: tuple[float, float] | None = None
        self.dx = (0.0, 0.0)
        self.t: float | None = None

    @staticmethod
    def _alpha(cutoff: float, dt: float) -> float:
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def reset(self) -> None:
        self.x = None
        self.t = None

    def __call__(self, pt: tuple[float, float], t: float) -> tuple[float, float]:
        if self.x is None or self.t is None:
            self.x, self.t = pt, t
            return pt
        dt = max(1e-3, t - self.t)
        self.t = t
        a_d = self._alpha(self.d_cutoff, dt)
        dx = tuple((pt[i] - self.x[i]) / dt for i in range(2))
        self.dx = tuple(a_d * dx[i] + (1 - a_d) * self.dx[i] for i in range(2))
        speed = math.hypot(*self.dx)
        cutoff = self.min_cutoff + self.beta * speed
        a = self._alpha(cutoff, dt)
        self.x = (a * pt[0] + (1 - a) * self.x[0], a * pt[1] + (1 - a) * self.x[1])
        return self.x


def calibration_problem(cam_pts: list[tuple[float, float]]) -> str | None:
    """Why a set of four captured corners can't be trusted, or None if it can.
    The two failure modes seen in practice are two corners on top of each
    other and a hand that wandered so the quad folds over itself; both give
    a homography that flips one axis and collapses the other."""
    if len(cam_pts) != 4:
        return "need four corners"
    for i in range(4):
        for j in range(i + 1, 4):
            if math.dist(cam_pts[i], cam_pts[j]) < CAL_MIN_SPREAD:
                return f"corners {i + 1} and {j + 1} are on top of each other"
    # Convex, consistently wound quadrilateral: every consecutive edge pair
    # must turn the same way.
    signs = []
    for i in range(4):
        a, b, c = cam_pts[i], cam_pts[(i + 1) % 4], cam_pts[(i + 2) % 4]
        cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        signs.append(cross > 0)
    if len(set(signs)) != 1:
        return "the four corners don't form a rectangle-ish shape (crossed or folded)"
    area = 0.0
    for i in range(4):
        x1, y1 = cam_pts[i]
        x2, y2 = cam_pts[(i + 1) % 4]
        area += x1 * y2 - x2 * y1
    if abs(area) / 2 < 0.02:
        return "the rectangle is too small in the camera's view — trace a bigger one"
    return None


class Calibration:
    def __init__(self) -> None:
        self.H: np.ndarray | None = None
        self.load()

    def load(self) -> None:
        if not CALIB_FILE.exists():
            return
        data = json.loads(CALIB_FILE.read_text())
        pts = [tuple(p) for p in data.get("cam_pts", [])]
        problem = calibration_problem(pts)
        if problem:
            print(f"[cal] ignoring saved {CALIB_FILE.name}: {problem} — press C to calibrate")
            CALIB_FILE.unlink()
            return
        self.H = np.array(data["H"], dtype=np.float64)
        print(f"[cal] loaded {CALIB_FILE.name}")

    def save(self, cam_pts: list[tuple[float, float]], persist: bool = True) -> None:
        import cv2
        src = np.array(cam_pts, dtype=np.float32)
        dst = np.array(CAL_TARGETS, dtype=np.float32)
        self.H = cv2.getPerspectiveTransform(src, dst).astype(np.float64)
        if not persist:
            print("[cal] computed (not saved — simulate mode)")
            return
        CALIB_FILE.write_text(json.dumps({"H": self.H.tolist(), "cam_pts": cam_pts, "targets": CAL_TARGETS}, indent=2))
        print(f"[cal] saved {CALIB_FILE.name}")

    @property
    def ready(self) -> bool:
        return self.H is not None

    def map(self, pt: tuple[float, float]) -> tuple[float, float]:
        x, y = pt
        v = self.H @ np.array([x, y, 1.0])
        return (float(v[0] / v[2]), float(v[1] / v[2]))


# ---- vision thread ------------------------------------------------------------

def vision_loop(shared: Shared, camera: int, width: int, height: int, show: bool, mirror: bool, infer_width: int) -> None:
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision

    if not MODEL.exists():
        print(f"[vision] missing {MODEL.name} — run setup.sh first", file=sys.stderr)
        shared.stop = True
        return

    opts = vision.HandLandmarkerOptions(
        base_options=mpp.BaseOptions(model_asset_path=str(MODEL)),
        num_hands=1,
        running_mode=vision.RunningMode.VIDEO,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = vision.HandLandmarker.create_from_options(opts)

    cap = cv2.VideoCapture(camera)
    if not cap.isOpened():
        print(f"[vision] could not open camera {camera}. On macOS, grant camera access to Terminal in "
              "System Settings → Privacy & Security → Camera, then run again.", file=sys.stderr)
        shared.stop = True
        return
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    # FaceTime cameras drop to 15 fps in dim light unless asked otherwise.
    cap.set(cv2.CAP_PROP_FPS, 30)

    smoother = OneEuro(ONE_EURO_MIN_CUTOFF, ONE_EURO_BETA, ONE_EURO_D_CUTOFF)
    smooth: tuple[float, float] | None = None
    n = 0
    infer_total = 0.0
    t_fps = time.time()
    print("[vision] camera running — point at the wall with your index finger")

    while not shared.stop:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.02)
            continue
        h, w = frame.shape[:2]
        # The palm detector works on a ~192 px thumbnail and the landmark model
        # on a ~224 px crop; handing MediaPipe the full 1280×720 frame only
        # costs resize time inside it. Landmarks come back normalized, so the
        # cursor is unaffected. The preview still shows the full frame.
        small = frame if w <= infer_width else cv2.resize(frame, (infer_width, int(h * infer_width / w)), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        t_inf = time.perf_counter()
        res = landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(time.time() * 1000))
        infer_total += time.perf_counter() - t_inf

        tip = None
        if res.hand_landmarks:
            lm = res.hand_landmarks[0][8]  # index fingertip
            tip = (float(lm.x), float(lm.y))

        n += 1
        now = time.time()
        if now - t_fps >= 1.0:
            with shared.lock:
                shared.fps = n / (now - t_fps)
                shared.infer_ms = 1000 * infer_total / max(n, 1)
                shared.frame_wh = (w, h)
            n, infer_total, t_fps = 0, 0.0, now

        if tip is not None:
            smooth = smoother(tip, now)
            with shared.lock:
                shared.cam_pt = smooth
                shared.seen_at = now
        else:
            smooth = None
            smoother.reset()

        if show:
            # Preview only. A raw webcam feed is not mirrored (FaceTime flips it
            # for you); --mirror flips it here so a desk test feels like a mirror.
            # Tracking is unaffected either way — calibration absorbs orientation.
            sx = (1 - smooth[0]) if (mirror and smooth is not None) else (smooth[0] if smooth else 0)
            if mirror:
                frame = cv2.flip(frame, 1)
            if tip is not None:
                cv2.circle(frame, (int(sx * w), int(smooth[1] * h)), 12, (24, 214, 247), 3)
            cv2.putText(frame, f"{shared.fps:.0f} fps  hand: {'yes' if tip else 'no'}", (12, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (244, 235, 220), 2)
            cv2.imshow("DRC.Geo wall tracker — aim the camera at the projection", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                shared.stop = True

    cap.release()
    if show:
        cv2.destroyAllWindows()


def simulate_loop(shared: Shared) -> None:
    """A fake finger for testing the pipeline without a camera: wanders the
    unit square and stops for ~1.5 s every few seconds to trigger dwells."""
    t0 = time.time()
    print("[sim] simulated finger running")
    x = y = 0.5
    while not shared.stop:
        t = time.time() - t0
        cycle = t % 6.0
        goto = shared.sim_goto
        if goto is not None:
            # Calibration: glide to the target and hold there, with a little
            # tremor so the hold logic is tested with realistic jitter.
            x += 0.15 * (goto[0] - x)
            y += 0.15 * (goto[1] - y)
            jx = x + 0.004 * math.sin(t * 17)
            jy = y + 0.004 * math.cos(t * 13)
            with shared.lock:
                shared.cam_pt = (jx, jy)
                shared.seen_at = time.time()
                shared.fps = 30.0
                shared.frame_wh = (1280, 720)
            time.sleep(1 / 30)
            continue
        if cycle < 4.0:
            # Lissajous wander
            x = 0.5 + 0.38 * math.sin(0.9 * t)
            y = 0.5 + 0.34 * math.sin(1.3 * t + 1.1)
        else:
            # freeze wherever the wander left it at cycle == 4.0
            tf = t - cycle + 4.0
            x = 0.5 + 0.38 * math.sin(0.9 * tf)
            y = 0.5 + 0.34 * math.sin(1.3 * tf + 1.1)
        present = (t % 20.0) < 17.0  # vanish for 3 s every 20 s
        with shared.lock:
            shared.cam_pt = (x, y) if present else None
            shared.seen_at = time.time() if present else shared.seen_at
            shared.fps = 30.0
            shared.frame_wh = (1280, 720)
        time.sleep(1 / 30)


# ---- pointer logic (unit space) ---------------------------------------------

class Dwell:
    """Hold-still-to-click. A finger in mid-air trembles, and a small
    calibration rectangle magnifies that on screen, so "still" has to be
    forgiving: a generous radius, an anchor that drifts with slow movement,
    and a grace period so one tremor spike doesn't restart the second."""
    def __init__(self) -> None:
        self.anchor: tuple[float, float] | None = None
        self.anchor_t = 0.0
        self.outside_since: float | None = None
        self.away_since: float | None = None
        self.armed = True
        self.click_pt: tuple[float, float] | None = None

    def reset(self) -> None:
        self.anchor = None
        self.outside_since = None
        self.away_since = None
        self.armed = True
        self.click_pt = None

    def update(self, pt: tuple[float, float] | None, now: float) -> tuple[float, tuple[float, float] | None]:
        """Returns (progress 0..1, click point or None)."""
        if pt is None:
            self.anchor = None
            self.outside_since = None
            return 0.0, None
        if self.click_pt is not None and not self.armed:
            if math.dist(pt, self.click_pt) > REARM_RADIUS:
                if self.away_since is None:
                    self.away_since = now
                if now - self.away_since < REARM_AWAY_S:
                    return 0.0, None
                self.armed = True
                self.click_pt = None
                self.away_since = None
            else:
                self.away_since = None
                self.anchor = None
                return 0.0, None
        if self.anchor is None:
            self.anchor = pt
            self.anchor_t = now
            self.outside_since = None
            return 0.0, None
        if math.dist(pt, self.anchor) > DWELL_RADIUS:
            if self.outside_since is None:
                self.outside_since = now
            elif now - self.outside_since > DWELL_GRACE_S:
                self.anchor = pt
                self.anchor_t = now
                self.outside_since = None
                return 0.0, None
        else:
            self.outside_since = None
            self.anchor = (self.anchor[0] + DWELL_DRIFT * (pt[0] - self.anchor[0]),
                           self.anchor[1] + DWELL_DRIFT * (pt[1] - self.anchor[1]))
        progress = (now - self.anchor_t) / DWELL_S
        if progress >= 1.0:
            click = self.anchor
            self.armed = False
            self.click_pt = click
            self.anchor = None
            self.outside_since = None
            return 1.0, click
        return progress, None


class CalibrationRun:
    """Walks the four targets; each one needs a steady finger for CAL_HOLD_S.

    After a corner is captured the finger must move CAL_MOVE_AWAY before the
    next target arms — a fixed pause is not enough, a person who hasn't yet
    noticed the target changed just gets captured twice at the same spot.
    """
    def __init__(self) -> None:
        self.step = 0
        self.pts: list[tuple[float, float]] = []
        self.anchor: tuple[float, float] | None = None
        self.anchor_t = 0.0
        self.await_move_from: tuple[float, float] | None = None
        self.restarted = False

    @property
    def phase(self) -> str:
        return "move" if self.await_move_from is not None else "hold"

    def update(self, cam_pt: tuple[float, float] | None, now: float) -> tuple[float, bool]:
        """Returns (hold progress 0..1, finished)."""
        if cam_pt is None:
            self.anchor = None
            return 0.0, False
        if self.await_move_from is not None:
            if math.dist(cam_pt, self.await_move_from) < CAL_MOVE_AWAY:
                return 0.0, False
            self.await_move_from = None
        if self.anchor is None or math.dist(cam_pt, self.anchor) > CAL_RADIUS:
            self.anchor = cam_pt
            self.anchor_t = now
            return 0.0, False
        p = (now - self.anchor_t) / CAL_HOLD_S
        if p >= 1.0:
            pt = self.anchor
            self.anchor = None
            self.await_move_from = pt
            if any(math.dist(pt, q) < CAL_MIN_SPREAD for q in self.pts):
                print(f"[cal] corner {self.step + 1}/4 is on top of an earlier one — starting over")
                self.step = 0
                self.pts = []
                self.restarted = True
                return 0.0, False
            self.pts.append(pt)
            print(f"[cal] corner {self.step + 1}/4 captured at cam {pt[0]:.3f},{pt[1]:.3f}")
            self.step += 1
            if self.step >= 4:
                problem = calibration_problem(self.pts)
                if problem:
                    print(f"[cal] {problem} — starting over")
                    self.step = 0
                    self.pts = []
                    self.restarted = True
                    return 0.0, False
            return 1.0, self.step >= 4
        return p, False


# ---- websocket server ----------------------------------------------------------

def take_over_port(port: int) -> bool:
    """If an earlier tracker is still holding the port (a tab that never got
    Ctrl-C), stop it. Only ever kills our own tracker.py — anything else on
    the port is left alone and reported."""
    try:
        pids = subprocess.run(["lsof", "-t", f"-iTCP:{port}", "-sTCP:LISTEN"],
                              capture_output=True, text=True, check=False).stdout.split()
    except FileNotFoundError:
        return False
    took = False
    for pid in pids:
        if int(pid) == os.getpid():
            continue
        cmd = subprocess.run(["ps", "-o", "command=", "-p", pid], capture_output=True, text=True, check=False).stdout
        if "tracker.py" in cmd:
            print(f"[ws] an older tracker (pid {pid}) is still running — stopping it and taking over")
            os.kill(int(pid), signal.SIGTERM)
            took = True
        else:
            print(f"[ws] port {port} is held by another program (pid {pid}): {cmd.strip()[:80]}", file=sys.stderr)
    if took:
        time.sleep(1.0)
    return took


async def serve(shared: Shared, cal: Calibration, port: int, simulate: bool, bound: threading.Event) -> None:
    import websockets

    clients: set = set()
    dwell = Dwell()
    cal_run: CalibrationRun | None = None
    state = {"present": False}

    async def send_all(msg: dict) -> None:
        if not clients:
            return
        data = json.dumps(msg)
        await asyncio.gather(*(c.send(data) for c in list(clients)), return_exceptions=True)

    async def handler(ws) -> None:
        nonlocal cal_run
        clients.add(ws)
        print(f"[ws] browser connected ({len(clients)} client{'s' if len(clients) != 1 else ''})")
        await ws.send(json.dumps({"t": "hello", "calibrated": cal.ready or simulate, "simulate": simulate}))
        try:
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if msg.get("t") == "calibrate":
                    if cal_run is not None:
                        continue   # already running (a held-down C key repeats)
                    cal_run = CalibrationRun()
                    dwell.reset()
                    print("[cal] started — hold your finger on each target")
                elif msg.get("t") == "cancel":
                    cal_run = None
                    with shared.lock:
                        shared.sim_goto = None
                    print("[cal] cancelled")
        finally:
            clients.discard(ws)
            print(f"[ws] browser disconnected ({len(clients)} left)")

    async def broadcaster() -> None:
        nonlocal cal_run
        period = 1 / BROADCAST_HZ
        last_log = 0.0
        while not shared.stop:
            t0 = time.time()
            with shared.lock:
                cam_pt = shared.cam_pt if (t0 - shared.seen_at) < LOST_AFTER_S else None
                fps = shared.fps
                infer_ms = shared.infer_ms

            if cal_run is not None:
                if simulate:
                    with shared.lock:
                        shared.sim_goto = CAL_TARGETS[min(cal_run.step, 3)]
                progress, done = cal_run.update(cam_pt, t0)
                await send_all({"t": "cal", "step": min(cal_run.step, 3), "total": 4,
                                "progress": round(progress, 3), "present": cam_pt is not None,
                                "phase": cal_run.phase, "restarted": cal_run.restarted})
                cal_run.restarted = False
                if done:
                    cal.save(cal_run.pts, persist=not simulate)
                    cal_run = None
                    dwell.reset()
                    with shared.lock:
                        shared.sim_goto = None
                    await send_all({"t": "cal_done"})
            elif cal.ready or simulate:
                unit = cam_pt if simulate else (cal.map(cam_pt) if cam_pt else None)
                if unit is not None:
                    # Allow a little overshoot past the calibrated targets, then clamp.
                    unit = (min(1.0, max(0.0, unit[0])), min(1.0, max(0.0, unit[1])))
                progress, click = dwell.update(unit, t0)
                if unit is None:
                    await send_all({"t": "pos", "present": False})
                else:
                    await send_all({"t": "pos", "present": True, "x": round(unit[0], 4), "y": round(unit[1], 4),
                                    "dwell": round(progress, 3)})
                if click is not None:
                    await send_all({"t": "click", "x": round(click[0], 4), "y": round(click[1], 4)})
                state["present"] = unit is not None
            else:
                await send_all({"t": "pos", "present": False, "uncalibrated": True})

            if t0 - last_log > 5.0:
                last_log = t0
                print(f"[status] camera {fps:4.1f} fps · model {infer_ms:4.1f} ms · hand {'yes' if cam_pt else 'no '} · "
                      f"{'calibrated' if (cal.ready or simulate) else 'NOT calibrated — press C in the app'} · "
                      f"{len(clients)} browser{'s' if len(clients) != 1 else ''}")

            await asyncio.sleep(max(0.0, period - (time.time() - t0)))

    try:
        server = await websockets.serve(handler, "127.0.0.1", port)
    except OSError:
        if not take_over_port(port):
            raise
        server = await websockets.serve(handler, "127.0.0.1", port)
    async with server:
        print(f"[ws] listening on ws://127.0.0.1:{port}")
        bound.set()
        await broadcaster()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--camera", type=int, default=0, help="camera index (default 0 = built-in)")
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--infer-width", type=int, default=640, help="frame width handed to the model (smaller = faster)")
    ap.add_argument("--show", action="store_true", help="open a preview window to aim the camera")
    ap.add_argument("--mirror", action="store_true", help="flip the preview like a mirror (desk testing; not for a wall-facing camera)")
    ap.add_argument("--simulate", action="store_true", help="fake finger, no camera (pipeline test)")
    ap.add_argument("--recalibrate", action="store_true", help="forget the saved calibration")
    args = ap.parse_args()

    if args.recalibrate and CALIB_FILE.exists():
        CALIB_FILE.unlink()
        print(f"[cal] removed {CALIB_FILE.name}")

    shared = Shared()
    cal = Calibration()

    # The camera and the preview window run on the MAIN thread: macOS will
    # only show the camera-permission prompt (and only draws Cocoa windows)
    # from there. The WebSocket server is the one that goes to a background
    # thread — asyncio is happy anywhere.
    bound = threading.Event()

    def run_server() -> None:
        try:
            asyncio.run(serve(shared, cal, args.port, args.simulate, bound))
        except Exception as e:  # noqa: BLE001 — surface it, don't die silently
            print(f"\n[ws] COULD NOT START: {e}\n", file=sys.stderr)
            shared.stop = True
            bound.set()

    threading.Thread(target=run_server, daemon=True).start()
    # Don't touch the camera until the port is ours: if it isn't, the reason
    # must be the last thing on screen, not buried under camera chatter.
    bound.wait(timeout=10)
    if shared.stop:
        sys.exit(1)

    try:
        if args.simulate:
            simulate_loop(shared)
        else:
            vision_loop(shared, args.camera, args.width, args.height, args.show, args.mirror, args.infer_width)
    except KeyboardInterrupt:
        pass
    finally:
        shared.stop = True
        print("[exit] bye")


if __name__ == "__main__":
    main()
