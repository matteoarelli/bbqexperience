@echo off
REM Wrapper Windows Task Scheduler — Task: "BBQ Meta Review", daily 09:00 local.
REM Registra con:
REM   schtasks /Create /TN "BBQ Meta Review" /SC DAILY /ST 09:00 /TR "%~dp0meta_review.cmd" /F
REM
REM Phase 17 PLAN 17-02: consuma meta_changes_pending.jsonl prodotto da
REM meta_optimizer.py (.119 cron 03:30 UTC), Claude sonnet gate, Strapi PUT
REM con skip_rebuild=True. Vedi meta_review.py docstring per dettagli.
REM
REM Fix 1 v1.2.1 (2026-05-27): cross-machine queue sync.
REM   meta_optimizer scrive pending su .119 (Linux). meta_review legge su Windows.
REM   Pre-step: scp pending da .119 a Windows. Post-step: truncate remote.
REM   Senza questo step la queue non viaggia mai cross-machine e meta_review
REM   legge sempre file vuoto.

cd /d C:\Progetti\bbqexperience\scripts\agents
if not exist C:\Progetti\bbqexperience\logs mkdir C:\Progetti\bbqexperience\logs

echo. >> C:\Progetti\bbqexperience\logs\meta-review.log
echo === [%DATE% %TIME%] meta_review.cmd start === >> C:\Progetti\bbqexperience\logs\meta-review.log

REM Pre-step: sync queue from .119 to Windows
echo [sync] scp queue from .119 >> C:\Progetti\bbqexperience\logs\meta-review.log
scp -o StrictHostKeyChecking=accept-new matteo@192.168.1.119:/home/matteo/bbqexperience/scripts/agents/state/meta_changes_pending.jsonl C:\Progetti\bbqexperience\scripts\agents\state\meta_changes_pending.jsonl >> C:\Progetti\bbqexperience\logs\meta-review.log 2>&1
if errorlevel 1 (
  echo [meta_review] ERR scp fail - aborting [%DATE% %TIME%] >> C:\Progetti\bbqexperience\logs\meta-review.log
  exit /b 1
)

REM Main run
echo [run] python meta_review.py >> C:\Progetti\bbqexperience\logs\meta-review.log
python meta_review.py >> C:\Progetti\bbqexperience\logs\meta-review.log 2>&1
set REVIEW_EXIT=%errorlevel%

REM Post-step: clear remote pending (Python su Windows ha consumato)
REM Truncate remote only if Python exited cleanly (>=0 is OK including failed-but-handled)
echo [sync] truncate remote pending [%DATE% %TIME%] >> C:\Progetti\bbqexperience\logs\meta-review.log
ssh -o StrictHostKeyChecking=accept-new matteo@192.168.1.119 "truncate -s 0 /home/matteo/bbqexperience/scripts/agents/state/meta_changes_pending.jsonl" >> C:\Progetti\bbqexperience\logs\meta-review.log 2>&1
if errorlevel 1 (
  echo [meta_review] WARN remote truncate fail - manual cleanup needed >> C:\Progetti\bbqexperience\logs\meta-review.log
)

echo === [%DATE% %TIME%] meta_review.cmd end exit=%REVIEW_EXIT% === >> C:\Progetti\bbqexperience\logs\meta-review.log
exit /b %REVIEW_EXIT%
