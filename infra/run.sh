#!/usr/bin/env bash
# =============================================================
# SkyView Smart Agriculture — Local Run Script
# Usage: ./run.sh
# Runs the FastAPI backend locally (without Docker).
# Requires: Python 3.11+, optional PostgreSQL or uses SQLite.
# =============================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}🌾 SkyView Smart Agriculture Backend v2.0${NC}"
echo -e "${BLUE}=============================================${NC}"

# ── .env check ────────────────────────────────────────────────
if [ ! -f "skyview/.env" ]; then
    echo -e "${YELLOW}⚠️  No skyview/.env found — creating from skyview/.env.example${NC}"
    if [ -f "skyview/.env.example" ]; then
        cp skyview/.env.example skyview/.env
        echo -e "${GREEN}✅ skyview/.env created. Edit it with your credentials before production use.${NC}"
    else
        echo -e "${RED}❌ skyview/.env.example not found. Cannot continue.${NC}"
        exit 1
    fi
fi

# Load env vars (skip comments and blank lines)
if [ -f "skyview/.env" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Strip Windows carriage returns
        clean_line=$(echo "$line" | tr -d '\r')
        # Skip comments and empty lines
        if [[ ! "$clean_line" =~ ^# ]] && [[ ! -z "$clean_line" ]]; then
            # Extract key and value
            key=$(echo "$clean_line" | cut -d'=' -f1)
            val=$(echo "$clean_line" | cut -d'=' -f2-)
            # Strip surrounding quotes from value
            val="${val#\"}"
            val="${val%\"}"
            val="${val#\'}"
            val="${val%\'}"
            export "$key=$val"
        fi
    done < "skyview/.env"
    echo -e "${GREEN}✅ Environment loaded${NC}"
fi

# ── Python check ──────────────────────────────────────────────
PYTHON_EXE="python3"
if ! command -v python3 &>/dev/null; then
    if command -v python &>/dev/null; then
        PYTHON_EXE="python"
    else
        echo -e "${RED}❌ Python not found. Install Python 3.11+.${NC}"
        exit 1
    fi
fi

PYTHON_VERSION=$($PYTHON_EXE -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo -e "${GREEN}✅ Python ${PYTHON_VERSION}${NC}"

# ── Virtual environment ───────────────────────────────────────
VENV_DIR="${PROJECT_ROOT}/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    $PYTHON_EXE -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
if [ -f "$VENV_DIR/Scripts/activate" ]; then
    source "$VENV_DIR/Scripts/activate"
else
    source "$VENV_DIR/bin/activate"
fi
echo -e "${GREEN}✅ Virtual environment active${NC}"

# ── Dependencies ──────────────────────────────────────────────
echo -e "${BLUE}Installing/checking dependencies...${NC}"
python -m pip install --quiet -r infra/requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

# ── Database schema init ──────────────────────────────────────
echo -e "${BLUE}Initialising database schema...${NC}"
python - <<'PYEOF'
import sys
sys.path.insert(0, ".")
try:
    from skyview.data.db import init_db
    from skyview.data.schema import init_schema
    init_db()
    init_schema()
    print("  ✅ Schema ready")
except Exception as e:
    print(f"  ⚠️  Schema init warning (continuing): {e}")
PYEOF

# ── MQTT bridge (optional background service) ─────────────────
# Deprecated: MQTT bridge is not used in the standalone backend run in v2.0
MQTT_PID=""

# ── Cleanup on exit ───────────────────────────────────────────
cleanup() {
    echo -e "\n${BLUE}Shutting down...${NC}"
    [ -n "$MQTT_PID" ] && kill "$MQTT_PID" 2>/dev/null || true
    echo -e "${GREEN}Goodbye 🌾${NC}"
}
trap cleanup INT TERM EXIT

# ── Start API server ──────────────────────────────────────────
HOST="${API_HOST:-0.0.0.0}"
PORT="${API_PORT:-8000}"
WORKERS="${API_WORKERS:-1}"
RELOAD_FLAG=""
[ "${DEBUG:-False}" = "True" ] && RELOAD_FLAG="--reload"

# On Windows, uvicorn multiprocessing (--workers > 1) fails with WinError 10022
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    if [ "$WORKERS" -gt 1 ]; then
        echo -e "${YELLOW}⚠️  Multiple workers are not supported on Windows. Forcing workers to 1.${NC}"
        WORKERS=1
    fi
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}🚀 Starting SkyView API on http://${HOST}:${PORT}${NC}"
echo -e "${GREEN}   Docs: http://localhost:${PORT}/docs${NC}"
echo -e "${GREEN}   Admin: http://localhost:${PORT}/admin/tables${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

# shellcheck disable=SC2086
uvicorn skyview.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --workers "$WORKERS" \
    $RELOAD_FLAG