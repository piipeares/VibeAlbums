@echo off
cd /d "%~dp0backend"
start "VibeBackend" cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
curl -s http://localhost:3001/health
echo.
echo Testing Spotify API...
curl -s "http://localhost:3001/api/spotify/new-releases?limit=2" | findstr /C:"items"
echo.
echo Testing complete. Server is running in background.
pause
