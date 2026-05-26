@echo off
REM Wrapper Windows Task Scheduler — Task: "BBQ Meta Review", daily 09:00 local.
REM Registra con:
REM   schtasks /Create /TN "BBQ Meta Review" /SC DAILY /ST 09:00 /TR "%~dp0meta_review.cmd" /F
REM
REM Phase 17 PLAN 17-02: consuma meta_changes_pending.jsonl prodotto da
REM meta_optimizer.py (.119 cron 03:30 UTC), Claude sonnet gate, Strapi PUT
REM con skip_rebuild=True. Vedi meta_review.py docstring per dettagli.
cd /d C:\Progetti\bbqexperience\scripts\agents
if not exist C:\Progetti\bbqexperience\logs mkdir C:\Progetti\bbqexperience\logs
python meta_review.py >> C:\Progetti\bbqexperience\logs\meta-review.log 2>&1
