@echo off
setlocal
cd /d "%~dp0"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined CHROME (
  echo Google Chrome was not found in the standard installation locations.
  pause
  exit /b 1
)

curl.exe --silent --fail --max-time 3 --output NUL http://127.0.0.1:5173/assistant
if errorlevel 1 goto start_server
curl.exe --silent --fail --max-time 3 --output NUL http://127.0.0.1:3001/api/healthz
if errorlevel 1 goto start_server
start "" "%CHROME%" --app=http://localhost:5173/assistant
exit /b 0

:start_server
start "" powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddMinutes(3); do { curl.exe --silent --fail --max-time 3 --output NUL http://127.0.0.1:5173/assistant; if ($LASTEXITCODE -eq 0) { curl.exe --silent --fail --max-time 3 --output NUL http://127.0.0.1:3001/api/healthz; if ($LASTEXITCODE -eq 0) { Start-Process -FilePath '%CHROME%' -ArgumentList '--app=http://localhost:5173/assistant'; exit 0 } }; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); Write-Error 'Timed out waiting for the local app and API to become ready.'; exit 1"
node scripts/dev.mjs
pause
