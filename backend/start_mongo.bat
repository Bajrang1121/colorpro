@echo off
title Complete Setup - Color Trading Game
echo ========================================
echo   Complete Color Game Setup
echo ========================================
echo.

REM Run as Administrator check
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Please run as Administrator!
    echo Right-click > Run as Administrator
    pause
    exit /b 1
)

REM Step 1: Create data directory
echo [1/4] Setting up MongoDB...
if not exist "C:\data\db" mkdir C:\data\db
echo ✅ Created C:\data\db

REM Step 2: Start MongoDB
echo [2/4] Starting MongoDB...
for %%v in (7.0 6.0 5.0 4.4) do (
    if exist "C:\Program Files\MongoDB\Server\%%v\bin\mongod.exe" (
        start "MongoDB" "C:\Program Files\MongoDB\Server\%%v\bin\mongod.exe" --dbpath="C:\data\db"
        echo ✅ Started MongoDB v%%v
        timeout /t 5 /nobreak >nul
        goto :MONGO_STARTED
    )
)

echo ⚠️ MongoDB not found, running in database-less mode...
:MONGO_STARTED

REM Step 3: Install dependencies
echo [3/4] Installing Node.js dependencies...
call npm install
echo ✅ Dependencies installed

REM Step 4: Start server
echo [4/4] Starting game server...
echo ========================================
echo    🎮 COLOR TRADING GAME
echo    =====================
echo    Server: http://localhost:5000
echo    Admin Panel: /admin (or use API)
echo    
echo    👑 ADMIN LOGIN:
echo    Username: admin
echo    Password: admin@123
echo    
echo    📱 USER LOGIN:
echo    Mobile: 9876543210
echo    Password: 123456
echo ========================================
echo.
echo Starting server in 3 seconds...
timeout /t 3 /nobreak >nul

start http://localhost:5000
npm start
