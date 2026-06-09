@echo off
echo =================================================================
echo             Auditing Hot/Warm Prerequisites on Local PC
echo =================================================================
echo.

echo [1/5] Checking Node.js and npm installations...
where node >nul 2>nul
if %errorlevel% equ 0 (
  for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
  echo  [OK] Node.js is installed (%NODE_VER%^)
) else (
  echo  [ERROR] Node.js is MISSING. Please download from https://nodejs.org/
)

where npm >nul 2>nul
if %errorlevel% equ 0 (
  for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
  echo  [OK] npm is installed (%NPM_VER%^)
) else (
  echo  [ERROR] npm command is MISSING.
)
echo.

echo [2/5] Checking npm package dependencies status...
if exist "node_modules" (
  echo  [OK] node_modules exists.
) else (
  echo  [WARNING] node_modules is missing! Please run "setup-local.bat" first.
)
echo.

echo [3/5] Checking local environment credentials file .env...
if exist ".env" (
  echo  [OK] .env exists.
) else (
  echo  [WARNING] .env does not exist! Please run "setup-local.bat" to bootstrap it.
)
echo.

echo [4/5] Checking SQLite Database path...
if exist "data\predictions.db" (
  echo  [OK] Existing pre-populated predictions.db found!
) else (
  echo  [INFO] No predictions.db found. Server will initialize a clean one on first run,
  echo         or you can place your downloaded backup in "data\predictions.db".
)
echo.

echo [5/5] Checking Python / FinBERT capability...
where python >nul 2>nul
if %errorlevel% equ 0 (
  echo  [OK] Python is available on your local PC.
) else (
  echo  [INFO] Python was not found. System will gracefully fall back to lexicon-based rules
  echo         without FinBERT (no crash will occur).
)
echo.

echo =================================================================
echo                      Local Inspection Complete
echo =================================================================
echo If all checks look good, run "run-local.bat" to launch.
echo.
pause
