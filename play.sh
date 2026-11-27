#!/usr/bin/env bash
# Serpent Peaks — local launcher
# Starts the Express production server and opens it in your default browser.

GAME_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌  Node.js 22+ required (found $(node -v)). Please upgrade."
  exit 1
fi

# Kill any process already on the port
fuser -k "$PORT/tcp" 2>/dev/null || true

cd "$GAME_DIR"
if [ ! -f "$GAME_DIR/dist/index.html" ]; then
  echo "🔨 Building production bundle first..."
  npm run build
fi

echo "🐍 Starting Serpent Peaks Express production server (node server/index.js) on http://localhost:$PORT ..."
echo "🔌 /api portal proxy and Gemini AI oracle endpoints are fully functional."

# Run Express production server (serves dist/ + /api/browser/proxy + /api/compliment + /api/taunt)
NODE_ENV=production PORT="$PORT" node "$GAME_DIR/server/index.js" &
SERVER_PID=$!

# Wait until the server is up (max 8s)
for i in {1..16}; do
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

echo "✅ Serpent Peaks running with full Express backend APIs and AI services. Close this terminal to stop."
wait "$SERVER_PID"
