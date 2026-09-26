# =========================================
# Smart Agriculture System (Windows Runner)
# =========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Smart Agriculture System Booting..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Project Root
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

# Check Dependencies
Write-Host "`n[1/6] Checking dependencies..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js/npm not found." -ForegroundColor Red
    exit 1
}

# Initialize Database
Write-Host "`n[2/6] Initializing database..." -ForegroundColor Yellow

if (Test-Path "backend\data\init_db_sqlite.py") {
    python backend/data/init_db_sqlite.py
}

# Start MQTT Bridge
Write-Host "`n[3/6] Starting MQTT -> DB bridge..." -ForegroundColor Yellow

$mqttProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList "backend/ingestion/mqtt_to_db_bridge.py" `
    -PassThru

# Start Backend API
Write-Host "[4/6] Starting backend API..." -ForegroundColor Yellow

$backendProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList "backend/api/app.py" `
    -PassThru

# Start Sensor Simulator
Write-Host "[5/6] Starting sensor simulator..." -ForegroundColor Yellow

$simProcess = Start-Process `
    -FilePath "python" `
    -ArgumentList "backend/simulation/esp32_sensor_simulator.py" `
    -PassThru

# Start Frontend
Write-Host "[6/6] Starting frontend..." -ForegroundColor Yellow

Set-Location "$PROJECT_ROOT\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}

$frontendProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run","dev" `
    -PassThru

Set-Location $PROJECT_ROOT

# Status
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "All services are running!" -ForegroundColor Green
Write-Host "Backend  : http://localhost:8000" -ForegroundColor White
Write-Host "Frontend : http://localhost:5173" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop everything..." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host "`nStopping all processes..." -ForegroundColor Red

    $processes = @(
        $mqttProcess,
        $backendProcess,
        $simProcess,
        $frontendProcess
    )

    foreach ($proc in $processes) {
        if ($null -ne $proc) {
            try {
                if (-not $proc.HasExited) {
                    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                }
            }
            catch {
            }
        }
    }

    Write-Host "All processes stopped." -ForegroundColor Green
}