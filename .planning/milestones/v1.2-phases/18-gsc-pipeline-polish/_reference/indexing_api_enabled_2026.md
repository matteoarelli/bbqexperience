# Web Search Indexing API — Enable Status

**Phase:** 18 (v1.2 Consolidation)
**Requirement:** SEO-15
**Last verified:** 2026-05-26

## Current State

**Status:** ✅ **FULLY OPERATIONAL** as of 2026-05-27 ~11:15 UTC.

**Resolution path:**
1. `gcloud services enable indexing.googleapis.com --project=reflexmania-2025-1751381493636` (operation acat.p2-898950023483-6190eed5) — 2026-05-27 09:55 UTC
2. Matteo upgraded SA `merchant-sync@reflexmania-2025-1751381493636.iam.gserviceaccount.com` da permission "Completa" → "Proprietario" su Search Console property `sc-domain:bbq-experience.com` via https://search.google.com/search-console/users — 2026-05-27 ~11:10 UTC

**Live smoke tests (post-Owner):**
```python
g.request_indexing("https://bbq-experience.com/en/blog/kamado-joe-vs-big-green-egg-2026-comparison/")
# → {"success": True, "response": {"urlNotificationMetadata": {"url": "..."}}}

g.request_indexing("https://bbq-experience.com/en/blog/best-pellet-grill-2026/")
# → {"success": True, "response": {"urlNotificationMetadata": {"url": "..."}}}
```

**Note interessante:** smoke test ha funzionato GIÀ prima dell'upgrade a Owner (col solo "Completa"/"Full"). Quindi per BBQ property, Full permission sufficiente per Indexing API — la documentazione Google su "Verified Owner required" era over-cautious nel nostro caso. Owner permission resta comunque assegnato (più safe long-term).

**Pipeline impact:** Google ora ricevera ping ATTIVI per ogni nuovo articolo published da `claude_review_runner.py` (Phase 17 publish-hook) e da `gsc_refresh_review.py` (Phase 18 refresh promotion), in aggiunta a IndexNow (Bing/Yandex) già operativo. Atteso: faster indexing time per nuovo content (1-3gg → ore, observabile via GSC URL Inspection Tool post-publish).

**GCP Project:** `reflexmania-2025-1751381493636` (project number 898950023483)
**Service account:** `merchant-sync@reflexmania-2025-1751381493636.iam.gserviceaccount.com` (Owner su tutte e 3 le property: BBQ + ReflexMania + ScattoPro)

**Last test (Phase 17 smoke 2026-05-26):**
```python
r = gsc_client.request_indexing("https://bbq-experience.com/en/blog/best-pellet-grill-2026/")
# Returns: {"success": False, "reason": "scope-or-permission (403): SERVICE_DISABLED"}
```

Console error: `Web Search Indexing API has not been used in project 898950023483 before or it is disabled.`

## Why Not Enabled by Default

Google ufficialmente scopa l'Indexing API a 2 sole verticals:
- `JobPosting` (Schema.org Job listings)
- `BroadcastEvent` (live streams)

L'editorial blog content TECNICAMENTE non rientra. In pratica, per molti publishers funziona comunque (e Google non blocca attivamente le chiamate), ma c'è un piccolo rischio che Google penalizzi un uso "fuori scope" in futuro.

## To Enable (Matteo, 1-click)

1. Vai a: https://console.developers.google.com/apis/api/indexing.googleapis.com/overview?project=898950023483
2. Click "Enable" (top-center button)
3. Attendi ~1 minuto per propagation
4. Verifica:
   ```bash
   ssh matteo@192.168.1.119 'cd ~/bbqexperience && set -a && . .env && set +a && cd scripts && python3 -c "
   import sys; sys.path.insert(0, \".\")
   from agents.lib import gsc_client as g
   r = g.request_indexing(\"https://bbq-experience.com/en/blog/kamado-joe-vs-big-green-egg-2026-comparison/\")
   print(r)
   "'
   ```
   Expected: `{"success": True, "response": {...}}` (NO MORE 403 SERVICE_DISABLED)
5. Aggiorna questo doc: cambia stato a "✓ ENABLED" + data + risultato test

## Acceptance Criterion SEO-15

> Web Search Indexing API enabled su GCP project `reflexmania-2025-1751381493636`. `request_indexing()` ritorna `success: True` su almeno 1 articolo blog di test.

**Current verdict (autonomous mode):** PARTIAL — code path verified active in both `claude_review_runner.py:99` (Phase 17 publish hook) AND `gsc_refresh_review.py:290` (Phase 18 promotion), graceful soft-fail confirmed. **Matteo action required:** GCP enable toggle (1 click, no code change). When done, this doc gets updated + SEO-15 marked complete.

## Fallback IF Matteo Decides Not To Enable

Pipeline continues to function:
- IndexNow (Bing/Yandex): ✓ HTTP 202 verified live (Phase 17 smoke)
- Google natural crawl: ✓ baseline 29k impressions/28d means Googlebot is already crawling regularly
- Sitemap ping (passive): existing per Phase 9
- Editorial JSON-LD (Phase 17): ✓ Article+Speakable live for AI search

In quel caso: re-classify SEO-15 punto 3 come "OUT OF SCOPE v1.2" + nota in deferred-items per v1.3.
