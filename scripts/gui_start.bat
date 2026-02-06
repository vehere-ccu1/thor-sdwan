@echo off
REM Start the SD-WAN CMS GUI (Vite dev server)
cd /d "%~dp0..\gui"
echo Starting GUI...
call npm run dev
