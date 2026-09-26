#!/bin/bash

# ==================== SETUP AND RUN SCRIPT ====================
# Purpose: Initialize and run the Smart Agriculture system locally
# Usage: ./setup_and_run.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🌾 Smart Agriculture System Setup${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check Python
echo -e "${BLUE}[1/5] Checking Python...${NC}"
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.10+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION${NC}"

# Check PostgreSQL (optional, will use Docker if not available)
echo -e "${BLUE}[2/5] Checking PostgreSQL (optional)...${NC}"
if command -v psql &>/dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is installed${NC}"
else
    echo -e "${BLUE}⚠️  PostgreSQL not installed (will use Docker or SQLite)${NC}"
fi

# Install Python dependencies
echo -e "${BLUE}[3/5] Installing Python dependencies...${NC}"
pip install -q -r infra/requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Load environment
echo -e "${BLUE}[4/5] Loading environment...${NC}"
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env created (edit with your settings)${NC}"
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Start services
echo -e "${BLUE}[5/5] Starting services...${NC}"
echo -e "${BLUE}Starting with Docker Compose...${NC}"

cd infra
docker compose up --build

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ System ready at http://localhost:8000${NC}"
echo -e "${GREEN}=========================================${NC}"
# 🐳 Docker Check (optional DB)
# ==============================
echo "[3/7] Checking Docker..."
if command -v docker &>/dev/null && docker info &>/dev/null; then
    echo "🐳 Docker detected — starting DB..."
    docker compose -f infra/docker-compose.yml up -d db || true
else
    echo "⚠️ Docker not available — using SQLite"
fi

# ==============================
# 🐍 Python Environment
# ==============================
echo "[4/7] Setting up Python environment..."

if [ ! -d ".venv" ]; then
    $PYTHON -m venv .venv
    echo "  Created virtual environment"
fi

source .venv/bin/activate
pip install -q --upgrade pip
pip install -r infra/requirements.txt

# ==============================
# 📦 Frontend Setup
# ==============================
echo "[5/7] Installing frontend dependencies..."

cd frontend
if [ ! -d "node_modules" ]; then
    npm install --no-fund --no-audit
fi
cd "$PROJECT_ROOT"

# ==============================
# 🗄️ DB Init
# ==============================
echo "[6/7] Initializing database..."

$PYTHON backend/data/init_db_sqlite.py || true

# ==============================
# 🚀 Start Services
# ==============================
echo "[7/7] Starting services..."

# MQTT Bridge
$PYTHON backend/ingestion/mqtt_to_db_bridge.py &

# Backend
$PYTHON backend/api/app.py &

# Simulator (optional but useful)
$PYTHON backend/simulation/esp32_sensor_simulator.py &

# Frontend
cd frontend
npm run dev &
cd "$PROJECT_ROOT"

echo ""
echo "========================================="
echo "✅ System Running"
echo ""
echo "Backend:   http://localhost:8000"
echo "Frontend:  http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo "========================================="

wait
```
