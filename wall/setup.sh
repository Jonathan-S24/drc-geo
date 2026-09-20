#!/usr/bin/env bash
# One-time setup for the wall tracker: a private Python env + the hand model.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
if [ ! -f hand_landmarker.task ]; then
  echo "downloading hand model (7.8 MB)…"
  curl -sL -o hand_landmarker.task \
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
fi
echo "ready — start it with:  wall/run.sh"
