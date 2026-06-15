@echo off
echo =================================================================
echo             Setting up PRISM locally for Windows PC
echo =================================================================
echo.

REM Check Node version
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed or not in your PATH.
  echo Please download and install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

echo [1/5] Checking Node.js and npm versions...
call node --version
call npm --version
echo.

echo [2/5] Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo WARNING: Some npm packages failed to install. We will attempt to proceed.
)
echo.

echo [3/5] Creating local storage directory...
if not exist "data" (
  mkdir data
  echo Created "data" directory successfully.
) else (
  echo "data" directory already exists.
)
echo.

echo [4/5] Setting up local environment configurations...
if not exist ".env" (
  copy ".env.example" ".env"
  echo Created .env file from template.
  echo === IMPORTANT: Please open your .env file and fill in actual credentials! ===
) else (
  echo .env file already exists. Skipping copy.
)
echo.

echo [5/5] Checking Python and FinBERT sentiment tooling...
where python >nul 2>nul
if %errorlevel% neq 0 (
  echo Python was not found in PATH. Sentiment score fallbacks will be used.
  echo If you want true FinBERT support locally, install Python and run:
  echo pip install transformers torch --break-system-packages
) else (
  echo Python detected! Installing transformers and torch...
  call pip install transformers torch --break-system-packages
)
echo.

echo =================================================================
echo             Setup Complete! Clean build is ready.
echo =================================================================
echo 1. Open and configure your API keys inside the ".env" file.
echo 2. Run "verify-local.bat" to verify conditions.
echo 3. Run "run-local.bat" to boot both servers and launch the application!
echo.
pause
