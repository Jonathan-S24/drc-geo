#!/usr/bin/env bash
# Starts the wall tracker. Any flags are passed through (e.g. --show, --simulate, --recalibrate).
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { echo "run wall/setup.sh first"; exit 1; }
exec .venv/bin/python -u tracker.py "$@"
