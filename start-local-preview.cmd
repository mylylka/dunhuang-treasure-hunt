@echo off
setlocal
cd /d "%~dp0" || exit /b 1

set "DUNHUANG_PREVIEW_NODE="
where.exe /q node.exe
if not errorlevel 1 set "DUNHUANG_PREVIEW_NODE=node.exe"
if not defined DUNHUANG_PREVIEW_NODE if exist "%CODEX_PRIMARY_RUNTIME_NODE%" set "DUNHUANG_PREVIEW_NODE=%CODEX_PRIMARY_RUNTIME_NODE%"
if not defined DUNHUANG_PREVIEW_NODE if exist "%CODEX_TASK_WORKSPACE_NODE%" set "DUNHUANG_PREVIEW_NODE=%CODEX_TASK_WORKSPACE_NODE%"
if not defined DUNHUANG_PREVIEW_NODE (
  for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -Command "Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime.*' | Sort-Object Version -Descending | ForEach-Object { Join-Path $_.InstallLocation 'dependencies\node\bin\node.exe' }"`) do (
    if not defined DUNHUANG_PREVIEW_NODE if exist "%%I" set "DUNHUANG_PREVIEW_NODE=%%I"
  )
)

if not defined DUNHUANG_PREVIEW_NODE (
  echo Node.js is required to start the preview.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Game dependencies are missing. Run npm ci in this folder first.
  pause
  exit /b 1
)

echo Open http://127.0.0.1:5175/ in your browser after Vite shows it is ready.
echo Keep this window open while playing.
"%DUNHUANG_PREVIEW_NODE%" node_modules/vite/bin/vite.js --configLoader runner --host 127.0.0.1 --port 5175 --strictPort
set "DUNHUANG_PREVIEW_STATUS=%ERRORLEVEL%"
if not "%DUNHUANG_PREVIEW_STATUS%"=="0" pause
exit /b %DUNHUANG_PREVIEW_STATUS%
