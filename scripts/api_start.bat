@echo off
REM Start the SD-WAN CMS API (backend server)
cd /d "%~dp0..\api"
echo Starting API...
call npm start
