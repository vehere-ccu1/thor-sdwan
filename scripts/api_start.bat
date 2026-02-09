@echo off
REM Start the SD-WAN CMS API (Python FastAPI + ClickHouse)
cd /d "%~dp0..\api"
if not exist "vdev\Scripts\activate.bat" (
  echo API vdev not found. Run: cd api && setup_vdev.sh
  exit /b 1
)
echo Starting API (uvicorn)...
set CLICKHOUSE_HOST=%CLICKHOUSE_HOST%
if "%CLICKHOUSE_HOST%"=="" set CLICKHOUSE_HOST=localhost
set CLICKHOUSE_PORT=%CLICKHOUSE_PORT%
if "%CLICKHOUSE_PORT%"=="" set CLICKHOUSE_PORT=9000
call vdev\Scripts\activate.bat
uvicorn main:app --host 0.0.0.0 --port 3443
