#!/usr/bin/env bash
# Serves the production build locally for the exhibition laptop.
#
# Why local rather than drc-geo.pages.dev: the wall tracker talks to the
# browser over ws://127.0.0.1, and an http://localhost page can always open
# that. No wifi dependency, no CDN cold start, nothing to go wrong mid-day.
#
# Open:  http://localhost:4173/?wall=1
set -euo pipefail
cd "$(dirname "$0")/.."
# Always rebuild: it takes two seconds, and serving a stale dist/ on the day
# is a much worse failure than a two-second wait.
echo "building…"
npm run build >/dev/null
# Newest wins: an earlier serve.sh left running in another tab is stopped
# rather than making this one fail with "port in use".
for pid in $(lsof -t -iTCP:4173 -sTCP:LISTEN 2>/dev/null); do
  if ps -o command= -p "$pid" | grep -q "vite preview"; then
    echo "stopping the older app server (pid $pid) and taking over"
    kill "$pid" 2>/dev/null || true
  fi
done
sleep 0.5
echo "serving dist/ — open  http://localhost:4173/?wall=1  in Chrome"
exec npx vite preview --port 4173 --strictPort
