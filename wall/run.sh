#!/usr/bin/env bash
# Starts the wall tracker. Any flags are passed through (e.g. --show, --simulate, --recalibrate).
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { echo "run wall/setup.sh first"; exit 1; }
# MediaPipe's C++ layer logs its own startup chatter and a failing telemetry
# uploader to stderr every minute; neither is ours to act on.
.venv/bin/python -u tracker.py "$@" 2>&1 | grep --line-buffered -vE '^(I0000|W0000|E0000|INFO: Created|=== Source Location|wireless/android)'
