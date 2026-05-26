@echo off
REM Wrapper Windows Task Scheduler — Task: "BBQ GSC Refresh Review", weekly Sun 10:00 local.
REM Registra con:
REM   schtasks /Create /TN "BBQ GSC Refresh Review" /SC WEEKLY /D SUN /ST 10:00 ^
REM            /TR "%~dp0gsc_refresh_review.cmd" /F
REM
REM Phase 17 PLAN 17-03: consuma state/gsc_refresh_queue.jsonl prodotto da
REM gsc_refresh.py (.119 cron Sun 08:00 UTC), Claude Opus rewrite + quality gate
REM (review_article) + Strapi PUT (NO skip_rebuild — refresh deve rebuildare)
REM + re-index (Indexing API + IndexNow). Vedi gsc_refresh_review.py docstring.
cd /d C:\Progetti\bbqexperience\scripts\agents
if not exist C:\Progetti\bbqexperience\logs mkdir C:\Progetti\bbqexperience\logs
python gsc_refresh_review.py >> C:\Progetti\bbqexperience\logs\gsc-refresh-review.log 2>&1
