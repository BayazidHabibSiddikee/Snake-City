#!/usr/bin/env bash
# Serpent Peaks — One-line installer
# Usage: curl -sSL https://raw.githubusercontent.com/BayazidHabibSiddikee/Snake-City/main/install.sh | bash
set -euo pipefail

REPO_URL="https://github.com/BayazidHabibSiddikee/Snake-City"
REPO_DIR="serpent-peaks"
PORT="${PORT:-3000}"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       🐍  SERPENT PEAKS INSTALLER  🏔️    ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# --- Check dependencies ---
need() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌  $1 is required but not found. Install it and retry."; exit 1; }
}
need git
need node
need npm

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌  Node.js 22+ required (found $(node -v)). Please upgrade."
  exit 1
fi

# --- Clone or update ---
if [ -d "$REPO_DIR/.git" ]; then
  echo "🔄  Updating existing installation in ./$REPO_DIR ..."
  cd "$REPO_DIR"
  git pull --ff-only
else
  echo "📥  Cloning Serpent Peaks ..."
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
fi

# --- Install & build ---
echo "📦  Installing dependencies ..."
npm install --silent

echo "🔨  Building production bundle ..."
npm run build

# --- Serve via Express production server (serves dist/ + /api proxy & AI endpoints) ---
echo ""
echo "  ✅  Build complete! Starting Serpent Peaks Express production server (node server/index.js) on port $PORT ..."
echo "  🌐  Open http://localhost:$PORT in your browser."
echo "  🔌  API Proxy & Gemini AI Endpoints (/api/browser/proxy, /api/compliment, /api/taunt) are fully active."
echo ""

NODE_ENV=production PORT="$PORT" node server/index.js
