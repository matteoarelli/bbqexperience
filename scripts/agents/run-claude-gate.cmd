@echo off
REM BBQ Experience - Claude Opus 4.7 quality gate runner.
REM Triggered by Windows Task Scheduler every 15 min.
REM Polls Strapi content-queues with status=draft_review, runs Opus, applies fixes.
REM Logs to C:\Progetti\bbqexperience\logs\claude-gate.log

setlocal
cd /d "%~dp0..\.."
if not exist logs mkdir logs

set LOG=logs\claude-gate.log
echo. >> %LOG%
echo ============================================== >> %LOG%
echo [%DATE% %TIME%] BBQ Claude Gate tick >> %LOG%
echo ============================================== >> %LOG%

REM Use system python (3.11+ assumed). Override with PYTHON_BIN env if needed.
if "%PYTHON_BIN%"=="" set PYTHON_BIN=python

"%PYTHON_BIN%" scripts\agents\claude_review_runner.py >> %LOG% 2>&1

set EXITCODE=%ERRORLEVEL%
echo [%DATE% %TIME%] Exit %EXITCODE% >> %LOG%
exit /b %EXITCODE%
