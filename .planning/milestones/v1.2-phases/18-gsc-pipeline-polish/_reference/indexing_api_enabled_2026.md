# Web Search Indexing API — Enable Status

**Phase:** 18 (v1.2 Consolidation)
**Requirement:** SEO-15
**Last verified:** 2026-05-26

## Current State

**Status:** ✅ API ENABLED 2026-05-27 09:55 UTC via `gcloud services enable indexing.googleapis.com --project=reflexmania-2025-1751381493636` (operation acat.p2-898950023483-6190eed5).

⚠ **BUT** smoke test post-enable returns NEW 403: `"Permission denied. Failed to verify the URL ownership."` — il service account `merchant-sync@reflexmania-2025-1751381493636.iam.gserviceaccount.com` è "Delegated Owner" su Search Console property (lo ha visto C7 IG bot), ma Indexing API richiede **"Verified Owner"** — distinzione interna di Google separata dalla UI "Owner" role.

**Per arrivare a Verified Owner del SA**, Matteo deve:
1. Vai su https://search.google.com/search-console/users → property `sc-domain:bbq-experience.com`
2. Add user → email del SA → Permission "Owner"
3. Click sull'utente aggiunto → "Verify ownership" — qui Google chiede di scegliere un metodo (DNS TXT, HTML file, etc.)
4. Per service accounts SPESSO non è supportato direttamente — il workaround comune è:
   - Aggiungere DNS TXT con value generato per il SA
   - OPPURE accettare che Indexing API non funziona per il SA + restare su IndexNow

**Alternativa pragmatica (suggerita)**: Indexing API è ufficialmente scoped a JobPosting + BroadcastEvent. Per blog content, IndexNow (Bing+Yandex) + sitemap + natural Googlebot crawl sono sufficienti. **No further action necessario** se accetti questo trade-off.

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
