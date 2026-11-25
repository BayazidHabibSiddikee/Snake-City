#!/usr/bin/env bash
# Serpent Peaks — local launcher
# Starts the game server and opens it in your default browser.

GAME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3000

# Kill any process already on the port
fuser -k "$PORT/tcp" 2>/dev/null || true

echo "🐍 Starting Serpent Peaks on http://localhost:$PORT ..."

# Serve the pre-built dist folder
npx --yes serve "$GAME_DIR/dist" --listen "$PORT" --single &
SERVER_PID=$!

# Wait until the server is up (max 5s)
for i in {1..10}; do
  curl -sf "http://localhost:$PORT" >/dev/null 2>&1 && break
  sleep 0.5
done

# Open browser
if command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:$PORT"
elif command -v google-chrome &>/dev/null; then
  google-chrome --app="http://localhost:$PORT" --window-size=1280,720
elif command -v chromium-browser &>/dev/null; then
  chromium-browser --app="http://localhost:$PORT" --window-size=1280,720
fi

echo "✅ Game running. Close this terminal to stop the server."
wait "$SERVER_PID"
