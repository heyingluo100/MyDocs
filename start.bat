@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ================================
echo   个人文档库 - 启动中...
echo ================================

:: 1. 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ 未检测到 Node.js，请先安装: https://nodejs.org
  pause
  exit /b 1
)

:: 2. 检查依赖
if not exist "node_modules" (
  echo 📦 首次运行，正在安装依赖...
  call npm install
)

:: 3. 端口检测（默认 5173）
set PORT=5173
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
  echo.
  echo ⚠️  端口 %PORT% 已被占用
  echo.
  echo   1^) 杀掉占用进程，继续使用 %PORT%
  echo   2^) 换用其他端口
  echo   3^) 取消启动
  echo.
  set /p choice="请选择 [1/2/3]: "
  if "!choice!"=="1" (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>nul
    echo ✅ 已释放端口 %PORT%
  ) else if "!choice!"=="2" (
    set /p PORT="请输入新端口号: "
  ) else (
    echo 已取消
    exit /b 0
  )
)

:: 4. 启动项目并自动打开浏览器
echo.
echo 🚀 启动开发服务器 (端口: %PORT%)...
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:%PORT%"

npx vite --port %PORT%
