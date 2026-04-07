# Plan 2: AI Agents — 6 Autonomous Agents + Telegram Bot

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 6 autonomous Python agents and a Telegram command bot that generate content, optimize SEO, translate, scout keywords, monitor competitors, and manage partnership outreach — all fully autonomous with daily Telegram reports.

**Architecture:** Each agent is a standalone Python script in `scripts/agents/`. Shared utilities (Strapi client, Telegram notifier, Ollama client) live in `scripts/agents/lib/`. Agents run via cron on Hetzner (or 192.168.1.119 for Ollama-dependent ones). Telegram bot runs as a systemd daemon.

**Tech Stack:** Python 3.11+, httpx, python-telegram-bot, feedparser, beautifulsoup4, Ollama API (HTTP), Strapi REST API

**Dependencies:** Plan 1 (Strapi Schema) must be completed first.

---

### Task 1: Create Shared Library — Strapi Client

**Files:**
- Create: `scripts/agents/__init__.py`
- Create: `scripts/agents/lib/__init__.py`
- Create: `scripts/agents/lib/strapi_client.py`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p scripts/agents/lib
```

- [ ] **Step 2: Create __init__.py files**

Write `scripts/agents/__init__.py`:
```python
```

Write `scripts/agents/lib/__init__.py`:
```python
```

- [ ] **Step 3: Write Strapi client**

Write `scripts/agents/lib/strapi_client.py`:
```python
"""Client REST per Strapi 5 — usato da tutti gli agenti AI."""

import os
import json
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlencode

STRAPI_URL = os.environ.get("STRAPI_URL", "https://cms.bbq-experience.com")
STRAPI_API_TOKEN = os.environ.get("STRAPI_API_TOKEN", "")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {STRAPI_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _request(method: str, url: str, data: dict | None = None) -> dict:
    """Esegue richiesta HTTP verso Strapi e ritorna JSON response."""
    body = json.dumps(data).encode("utf-8") if data else None
    req = Request(url, data=body, headers=_headers(), method=method)
    try:
        with urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        raise RuntimeError(
            f"Strapi {method} {url} -> {e.code}: {error_body}"
        ) from e


def find(
    content_type: str,
    *,
    locale: str = "en",
    status: str = "published",
    page: int = 1,
    page_size: int = 25,
    sort: str = "",
    filters: dict[str, Any] | None = None,
    populate: str = "",
    fields: list[str] | None = None,
) -> dict:
    """GET /api/{content_type} con parametri Strapi v5."""
    params: dict[str, str] = {
        "locale": locale,
        "status": status,
        "pagination[page]": str(page),
        "pagination[pageSize]": str(page_size),
    }
    if sort:
        params["sort"] = sort
    if populate:
        params["populate"] = populate
    if fields:
        for i, f in enumerate(fields):
            params[f"fields[{i}]"] = f
    if filters:
        _flatten_filters(filters, "filters", params)

    url = f"{STRAPI_URL}/api/{content_type}?{urlencode(params)}"
    return _request("GET", url)


def find_one(content_type: str, document_id: str, *, populate: str = "*") -> dict:
    """GET /api/{content_type}/{documentId}."""
    params = {"populate": populate}
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}?{urlencode(params)}"
    return _request("GET", url)


def create(content_type: str, data: dict) -> dict:
    """POST /api/{content_type} — crea nuova entry."""
    url = f"{STRAPI_URL}/api/{content_type}"
    return _request("POST", url, {"data": data})


def update(content_type: str, document_id: str, data: dict, *, locale: str = "") -> dict:
    """PUT /api/{content_type}/{documentId} — aggiorna entry esistente."""
    params = {}
    if locale:
        params["locale"] = locale
    qs = f"?{urlencode(params)}" if params else ""
    url = f"{STRAPI_URL}/api/{content_type}/{document_id}{qs}"
    return _request("PUT", url, {"data": data})


def find_all_pages(
    content_type: str,
    *,
    locale: str = "en",
    status: str = "published",
    page_size: int = 100,
    sort: str = "",
    filters: dict[str, Any] | None = None,
    populate: str = "",
    fields: list[str] | None = None,
) -> list[dict]:
    """Recupera TUTTE le pagine di una collezione iterando automaticamente."""
    all_data: list[dict] = []
    page = 1
    while True:
        resp = find(
            content_type,
            locale=locale,
            status=status,
            page=page,
            page_size=page_size,
            sort=sort,
            filters=filters,
            populate=populate,
            fields=fields,
        )
        all_data.extend(resp.get("data", []))
        meta = resp.get("meta", {}).get("pagination", {})
        if page >= meta.get("pageCount", 1):
            break
        page += 1
    return all_data


def _flatten_filters(
    filters: dict[str, Any], prefix: str, out: dict[str, str]
) -> None:
    """Serializza filtri Strapi v5 in query params flat."""
    for key, value in filters.items():
        param_key = f"{prefix}[{key}]"
        if isinstance(value, dict):
            _flatten_filters(value, param_key, out)
        else:
            out[param_key] = str(value)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/agents/
git commit -m "feat(agents): add shared Strapi REST client library"
```

---

### Task 2: Create Shared Library — Telegram Notifier

**Files:**
- Create: `scripts/agents/lib/telegram.py`

- [ ] **Step 1: Write Telegram notifier**

Write `scripts/agents/lib/telegram.py`:
```python
"""Invio notifiche Telegram — usato da tutti gli agenti per logging."""

import os
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")


def send(message: str, *, parse_mode: str = "HTML") -> bool:
    """Invia messaggio Telegram. Ritorna True se inviato, False se token mancante."""
    if not BOT_TOKEN or not CHAT_ID:
        print(f"[TELEGRAM] Token mancante, log su console:\n{message}")
        return False

    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": message[:4096],  # Limite Telegram
        "parse_mode": parse_mode,
    }
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except HTTPError as e:
        print(f"[TELEGRAM] Errore invio: {e.code}")
        return False


def send_agent_report(agent_name: str, summary: str, details: list[str] | None = None) -> bool:
    """Invia report formattato per un agente specifico."""
    lines = [f"<b>🤖 {agent_name}</b>", "", summary]
    if details:
        lines.append("")
        for d in details:
            lines.append(f"• {d}")
    return send("\n".join(lines))
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/lib/telegram.py
git commit -m "feat(agents): add shared Telegram notification library"
```

---

### Task 3: Create Shared Library — Ollama Client

**Files:**
- Create: `scripts/agents/lib/ollama.py`

- [ ] **Step 1: Write Ollama client**

Write `scripts/agents/lib/ollama.py`:
```python
"""Client HTTP per Ollama — generazione testo via LLM locale."""

import os
import json
from urllib.request import Request, urlopen

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://192.168.1.119:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:70b")


def generate(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Genera testo con Ollama. Ritorna il testo generato."""
    url = f"{OLLAMA_URL}/api/generate"
    payload: dict = {
        "model": model or OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system

    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    # Timeout lungo per modelli grandi (30 min)
    with urlopen(req, timeout=1800) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result.get("response", "")


def generate_json(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.3,
) -> dict | list:
    """Genera JSON strutturato con Ollama. Ritorna dict/list parsed."""
    raw = generate(
        prompt,
        system=system + "\n\nRispondi SOLO con JSON valido, nessun testo prima o dopo.",
        model=model,
        temperature=temperature,
    )
    # Estrai JSON dal testo (gestisce markdown code blocks)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Rimuovi prima e ultima riga (``` markers)
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


# Prompts di sistema riutilizzabili
PITMASTER_SYSTEM = """Sei "The Pitmaster" di BBQ Experience, un esperto BBQ brutalmente onesto.
Regole:
- Tono diretto, tecnico, mai promozionale
- Score prodotti: range 5.8-8.8, mai 9+ senza giustificazione eccezionale
- Dati concreti: temperature, tempi, pesi
- Zero marketing BS, zero hype
- Scrivi in modo coinvolgente ma autorevole
- Includi sempre sezioni con H2/H3 ben strutturate
- Ogni articolo deve avere: intro, corpo con sezioni, conclusione, FAQ (3-5 domande)
"""

TRANSLATOR_SYSTEM = """Sei un traduttore specializzato in contenuti BBQ e cucina.
Regole:
- Mantieni il tono "The Pitmaster" (diretto, tecnico)
- Adatta le unita di misura: EN usa imperiale (°F, lbs, oz), IT/ES usa metrico (°C, kg, g)
- Non tradurre nomi propri di prodotti o brand
- Mantieni la struttura HTML/Markdown del testo originale
- Traduci anche le FAQ mantenendo il formato domanda/risposta
"""
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/lib/ollama.py
git commit -m "feat(agents): add shared Ollama LLM client library"
```

---

### Task 4: Create `keyword_scout.py` Agent

**Files:**
- Create: `scripts/agents/keyword_scout.py`

- [ ] **Step 1: Write keyword scout agent**

Write `scripts/agents/keyword_scout.py`:
```python
#!/usr/bin/env python3
"""
Keyword Scout — Scopre keyword BBQ e crea piano editoriale settimanale.
Scrape Google Suggest + analisi GSC + gap competitor.
Cron: Lunedi 05:00 su Hetzner.
"""

import os
import sys
import json
import time
import random
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram

# ─── Configurazione ──────────────────────────────────────────────────────────

CLUSTERS = {
    "smoking": [
        "how to smoke meat", "smoking wood types", "smoke ring",
        "cold smoking", "hot smoking", "smoker temperature",
        "electric smoker", "pellet smoker", "offset smoker",
    ],
    "grills": [
        "best bbq grill", "charcoal grill", "gas grill", "pellet grill",
        "portable grill", "grill maintenance", "grill accessories",
        "weber grill", "traeger grill", "kamado grill",
    ],
    "thermometers": [
        "best meat thermometer", "wireless thermometer", "instant read thermometer",
        "thermapen", "meater", "meat temperature chart",
        "bbq thermometer", "probe thermometer",
    ],
    "brisket": [
        "how to cook brisket", "smoked brisket", "brisket recipe",
        "brisket temperature", "brisket wrap", "brisket rub",
        "texas brisket", "brisket flat vs point",
    ],
    "sauces": [
        "bbq sauce recipe", "bbq rub recipe", "dry rub",
        "carolina bbq sauce", "kansas city bbq sauce", "texas bbq sauce",
        "injection marinade", "mop sauce",
    ],
}

# Mappe content_type suggerito per cluster
CLUSTER_CONTENT_TYPE = {
    "smoking": "tutorial",
    "grills": "blog",
    "thermometers": "blog",
    "brisket": "recipe",
    "sauces": "recipe",
}


def get_google_suggestions(query: str) -> list[str]:
    """Recupera suggerimenti da Google Suggest API."""
    url = f"http://suggestqueries.google.com/complete/search?client=firefox&q={quote_plus(query)}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data[1] if len(data) > 1 else []
    except Exception as e:
        print(f"[WARN] Google Suggest fallito per '{query}': {e}")
        return []


def get_existing_keywords() -> set[str]:
    """Recupera keyword gia presenti in ContentQueue e EditorialCalendar."""
    keywords: set[str] = set()

    # Da ContentQueue
    queue_items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        fields=["target_keyword"],
    )
    for item in queue_items:
        kw = item.get("target_keyword", "")
        if kw:
            keywords.add(kw.lower().strip())

    # Da EditorialCalendar
    cal_items = strapi.find_all_pages(
        "editorial-calendars",
        status="draft",
        fields=["target_keyword"],
    )
    for item in cal_items:
        kw = item.get("target_keyword", "")
        if kw:
            keywords.add(kw.lower().strip())

    return keywords


def get_existing_content_titles() -> set[str]:
    """Recupera titoli di contenuti gia pubblicati per evitare duplicati."""
    titles: set[str] = set()
    for ct in ["blog-posts", "tutorials", "recipes", "reviews"]:
        items = strapi.find_all_pages(ct, fields=["title", "slug"])
        for item in items:
            titles.add(item.get("title", "").lower().strip())
            titles.add(item.get("slug", "").lower().strip())
    return titles


def scout_keywords() -> list[dict]:
    """Esegue il scouting keyword per tutti i cluster."""
    existing_kw = get_existing_keywords()
    existing_titles = get_existing_content_titles()
    discoveries: list[dict] = []

    for cluster_name, seeds in CLUSTERS.items():
        for seed in seeds:
            suggestions = get_google_suggestions(seed)
            # Delay casuale per evitare rate limit
            time.sleep(random.uniform(1.0, 3.0))

            for suggestion in suggestions:
                kw = suggestion.lower().strip()
                # Filtra: gia presente, troppo corto, non BBQ-related
                if kw in existing_kw:
                    continue
                if len(kw.split()) < 2:
                    continue
                # Controlla che non sia gia un contenuto esistente
                slug_version = kw.replace(" ", "-")
                if kw in existing_titles or slug_version in existing_titles:
                    continue

                existing_kw.add(kw)
                discoveries.append({
                    "keyword": kw,
                    "cluster": cluster_name,
                    "source_seed": seed,
                    "content_type": CLUSTER_CONTENT_TYPE.get(cluster_name, "blog"),
                })

    return discoveries


def prioritize_and_create_queue(discoveries: list[dict], max_items: int = 7) -> list[dict]:
    """Seleziona le top keyword e crea entry in ContentQueue."""
    # Priorita: distribuisci equamente tra cluster
    by_cluster: dict[str, list[dict]] = {}
    for d in discoveries:
        by_cluster.setdefault(d["cluster"], []).append(d)

    selected: list[dict] = []
    cluster_names = list(by_cluster.keys())
    idx = 0
    while len(selected) < max_items and any(by_cluster.values()):
        cluster = cluster_names[idx % len(cluster_names)]
        if by_cluster.get(cluster):
            selected.append(by_cluster[cluster].pop(0))
        idx += 1

    # Crea entry in ContentQueue e EditorialCalendar
    created: list[dict] = []
    today = datetime.now()
    for i, item in enumerate(selected):
        scheduled = today + timedelta(days=i + 1)
        title = item["keyword"].title()

        # ContentQueue
        strapi.create("content-queues", {
            "title": title,
            "content_type": item["content_type"],
            "status": "ready",
            "scheduled_date": scheduled.strftime("%Y-%m-%d"),
            "cluster": item["cluster"],
            "target_keyword": item["keyword"],
            "difficulty": "medium",
            "priority": i + 1,
            "ai_generated": True,
        })

        # EditorialCalendar
        strapi.create("editorial-calendars", {
            "title": title,
            "content_type": item["content_type"],
            "status": "research",
            "target_date": scheduled.strftime("%Y-%m-%d"),
            "target_keyword": item["keyword"],
            "target_locale": "en",
            "priority": "medium",
            "cluster": item["cluster"],
            "ai_generated": True,
            "source_agent": "keyword_scout",
        })

        created.append(item)

    return created


def main():
    print(f"[{datetime.now().isoformat()}] Keyword Scout avviato")

    discoveries = scout_keywords()
    print(f"Scoperte {len(discoveries)} keyword candidate")

    created = prioritize_and_create_queue(discoveries, max_items=7)
    print(f"Create {len(created)} entry in ContentQueue")

    # Report Telegram
    if created:
        details = [
            f"<b>{item['keyword']}</b> ({item['cluster']}, {item['content_type']})"
            for item in created
        ]
        telegram.send_agent_report(
            "Keyword Scout",
            f"Piano settimanale: {len(created)} nuovi topic scoperti da {len(discoveries)} candidati",
            details,
        )
    else:
        telegram.send_agent_report(
            "Keyword Scout",
            "Nessuna nuova keyword trovata questa settimana.",
        )

    print(f"[{datetime.now().isoformat()}] Keyword Scout completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/keyword_scout.py
git commit -m "feat(agents): add keyword_scout — weekly SEO keyword discovery"
```

---

### Task 5: Create `content_generator.py` Agent

**Files:**
- Create: `scripts/agents/content_generator.py`

- [ ] **Step 1: Write content generator agent**

Write `scripts/agents/content_generator.py`:
```python
#!/usr/bin/env python3
"""
Content Generator — Genera articoli BBQ completi con Ollama e li pubblica su Strapi.
Legge dalla ContentQueue, genera in EN, auto-traduce in IT/ES, pubblica.
Cron: Daily 06:00 su 192.168.1.119 (accesso Ollama locale).
"""

import os
import sys
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import ollama

# ─── Mappe content type Strapi ────────────────────────────────────────────────

STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",  # Le comparazioni sono blog post con categoria specifica
}


def get_next_queue_item() -> dict | None:
    """Recupera il prossimo item dalla ContentQueue con status 'ready'."""
    resp = strapi.find(
        "content-queues",
        status="draft",
        filters={"status": {"$eq": "ready"}},
        sort="priority:asc,scheduled_date:asc",
        page_size=1,
    )
    items = resp.get("data", [])
    return items[0] if items else None


def generate_article(title: str, keyword: str, cluster: str, content_type: str) -> dict:
    """Genera articolo completo in EN con Ollama."""
    prompt = f"""Scrivi un articolo completo per il blog BBQ Experience.

Titolo: {title}
Keyword target: {keyword}
Cluster tematico: {cluster}
Tipo contenuto: {content_type}

Requisiti:
- 1500-2000 parole
- In inglese
- Struttura: introduzione coinvolgente, 4-6 sezioni con H2, conclusione
- Includi una sezione FAQ con 3-5 domande e risposte alla fine
- Usa tag HTML per la formattazione (h2, h3, p, ul, li, strong, em)
- La keyword target deve apparire nel primo paragrafo e in almeno 2 H2
- Tono: esperto ma accessibile, dati concreti (temperature in °F, tempi, pesi in lbs/oz)
- NO introduzioni generiche tipo "BBQ is a beloved tradition..." — vai dritto al punto
- Includi consigli pratici basati su esperienza reale

Genera SOLO il contenuto HTML dell'articolo (no title tag, no head, no body wrapper).
"""
    content = ollama.generate(prompt, system=ollama.PITMASTER_SYSTEM, max_tokens=8192)

    # Genera excerpt
    excerpt_prompt = f"""Dall'articolo seguente, scrivi un excerpt di 1-2 frasi (max 160 caratteri) per i risultati di ricerca. In inglese. Solo il testo, nessun tag HTML.

Articolo: {content[:500]}"""
    excerpt = ollama.generate(excerpt_prompt, temperature=0.3, max_tokens=200).strip()

    # Genera meta title e description
    seo_prompt = f"""Per un articolo BBQ intitolato "{title}" con keyword "{keyword}", genera:
1. SEO title (max 60 caratteri, include la keyword)
2. Meta description (max 155 caratteri, include la keyword, call to action)

Formato risposta JSON: {{"seo_title": "...", "seo_description": "..."}}"""
    seo_data = ollama.generate_json(seo_prompt, temperature=0.3)

    return {
        "content": content,
        "excerpt": excerpt[:160],
        "seo_title": seo_data.get("seo_title", title)[:60],
        "seo_description": seo_data.get("seo_description", excerpt)[:155],
    }


def translate_article(content: str, excerpt: str, seo_title: str, seo_description: str, target_locale: str) -> dict:
    """Traduce un articolo in IT o ES con Ollama."""
    lang_name = "italiano" if target_locale == "it" else "spagnolo"
    units_note = "Converti le unita: °F → °C, lbs → kg, oz → g, inches → cm" if target_locale in ("it", "es") else ""

    prompt = f"""Traduci il seguente articolo BBQ in {lang_name}.
{units_note}
Mantieni TUTTI i tag HTML esattamente come sono.
Non tradurre nomi di prodotti o brand.

Articolo:
{content}"""
    translated_content = ollama.generate(prompt, system=ollama.TRANSLATOR_SYSTEM, max_tokens=8192)

    # Traduci excerpt e SEO
    meta_prompt = f"""Traduci in {lang_name}:
- Excerpt: {excerpt}
- SEO Title: {seo_title}
- Meta Description: {seo_description}

{units_note}
Formato JSON: {{"excerpt": "...", "seo_title": "...", "seo_description": "..."}}"""
    meta = ollama.generate_json(meta_prompt, temperature=0.3)

    return {
        "content": translated_content,
        "excerpt": meta.get("excerpt", excerpt)[:160],
        "seo_title": meta.get("seo_title", seo_title)[:60],
        "seo_description": meta.get("seo_description", seo_description)[:155],
    }


def generate_slug(title: str) -> str:
    """Genera slug URL-safe dal titolo."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:80].strip("-")


def publish_article(
    queue_item: dict, article: dict, content_type_strapi: str, content_type_raw: str
) -> str | None:
    """Pubblica articolo in EN e traduzioni IT/ES su Strapi. Ritorna documentId."""
    title = queue_item.get("title", "Untitled")
    slug = generate_slug(title)
    keyword = queue_item.get("target_keyword", "")

    # Dati comuni
    base_data: dict = {
        "title": title,
        "slug": slug,
        "excerpt": article["excerpt"],
        "seo_title": article["seo_title"],
        "seo_description": article["seo_description"],
        "published_date": datetime.now().strftime("%Y-%m-%d"),
    }

    # Campo contenuto varia per content type
    if content_type_strapi == "blog-posts":
        base_data["content"] = article["content"]
        base_data["category"] = "tips"  # Default per AI-generated
        if content_type_raw == "comparison":
            base_data["category"] = "trends"
        word_count = len(article["content"].split())
        base_data["reading_time"] = max(1, word_count // 200)
    elif content_type_strapi == "tutorials":
        base_data["content"] = article["content"]
        base_data["category"] = "knowledge"
        word_count = len(article["content"].split())
        base_data["reading_time"] = max(1, word_count // 200)
    elif content_type_strapi == "recipes":
        base_data["editorial_intro"] = article["content"]

    # Pubblica EN
    try:
        resp = strapi.create(content_type_strapi, base_data)
        doc_id = resp.get("data", {}).get("documentId")
        if not doc_id:
            print(f"[ERRORE] Nessun documentId nella risposta per '{title}'")
            return None
    except Exception as e:
        print(f"[ERRORE] Pubblicazione EN fallita per '{title}': {e}")
        return None

    # Traduci e pubblica IT
    try:
        it_article = translate_article(
            article["content"], article["excerpt"],
            article["seo_title"], article["seo_description"], "it"
        )
        it_data = {
            "title": title,  # Titolo verra sovrascritto dalla traduzione
            "slug": slug,
            "excerpt": it_article["excerpt"],
            "seo_title": it_article["seo_title"],
            "seo_description": it_article["seo_description"],
            "published_date": base_data["published_date"],
        }
        if content_type_strapi in ("blog-posts", "tutorials"):
            it_data["content"] = it_article["content"]
        elif content_type_strapi == "recipes":
            it_data["editorial_intro"] = it_article["content"]

        strapi.update(content_type_strapi, doc_id, it_data, locale="it")
    except Exception as e:
        print(f"[WARN] Traduzione IT fallita per '{title}': {e}")

    # Traduci e pubblica ES
    try:
        es_article = translate_article(
            article["content"], article["excerpt"],
            article["seo_title"], article["seo_description"], "es"
        )
        es_data = {
            "title": title,
            "slug": slug,
            "excerpt": es_article["excerpt"],
            "seo_title": es_article["seo_title"],
            "seo_description": es_article["seo_description"],
            "published_date": base_data["published_date"],
        }
        if content_type_strapi in ("blog-posts", "tutorials"):
            es_data["content"] = es_article["content"]
        elif content_type_strapi == "recipes":
            es_data["editorial_intro"] = es_article["content"]

        strapi.update(content_type_strapi, doc_id, es_data, locale="es")
    except Exception as e:
        print(f"[WARN] Traduzione ES fallita per '{title}': {e}")

    return doc_id


def main():
    print(f"[{datetime.now().isoformat()}] Content Generator avviato")

    queue_item = get_next_queue_item()
    if not queue_item:
        print("Nessun item nella ContentQueue con status 'ready'")
        telegram.send_agent_report("Content Generator", "Nessun articolo in coda oggi.")
        return

    doc_id_queue = queue_item.get("documentId")
    title = queue_item.get("title", "Untitled")
    keyword = queue_item.get("target_keyword", "")
    cluster = queue_item.get("cluster", "uncategorized")
    content_type_raw = queue_item.get("content_type", "blog")
    content_type_strapi = STRAPI_CONTENT_TYPES.get(content_type_raw, "blog-posts")

    print(f"Generazione: '{title}' (keyword: {keyword}, cluster: {cluster})")

    # Aggiorna status a "generating"
    strapi.update("content-queues", doc_id_queue, {"status": "generating"})

    try:
        # Genera articolo
        article = generate_article(title, keyword, cluster, content_type_raw)
        print(f"Articolo generato: {len(article['content'])} caratteri")

        # Pubblica
        published_id = publish_article(queue_item, article, content_type_strapi, content_type_raw)

        if published_id:
            # Aggiorna ContentQueue
            strapi.update("content-queues", doc_id_queue, {
                "status": "published",
                "published_content_id": published_id,
                "body_en": article["content"][:500],  # Salva preview per reference
                "generation_log": f"Pubblicato {datetime.now().isoformat()} - {content_type_strapi}/{published_id}",
            })

            telegram.send_agent_report(
                "Content Generator",
                f"Articolo pubblicato in 3 lingue",
                [
                    f"<b>{title}</b>",
                    f"Keyword: {keyword}",
                    f"Cluster: {cluster}",
                    f"Tipo: {content_type_strapi}",
                    f"ID: {published_id}",
                ],
            )
        else:
            strapi.update("content-queues", doc_id_queue, {
                "status": "failed",
                "generation_log": f"Pubblicazione fallita {datetime.now().isoformat()}",
            })
            telegram.send_agent_report("Content Generator", f"ERRORE: pubblicazione fallita per '{title}'")

    except Exception as e:
        strapi.update("content-queues", doc_id_queue, {
            "status": "failed",
            "generation_log": f"Errore: {e} - {datetime.now().isoformat()}",
        })
        telegram.send_agent_report("Content Generator", f"ERRORE: {e}")
        raise

    print(f"[{datetime.now().isoformat()}] Content Generator completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/content_generator.py
git commit -m "feat(agents): add content_generator — daily AI article publishing"
```

---

### Task 6: Create `seo_optimizer.py` Agent

**Files:**
- Create: `scripts/agents/seo_optimizer.py`

- [ ] **Step 1: Write SEO optimizer agent**

Write `scripts/agents/seo_optimizer.py`:
```python
#!/usr/bin/env python3
"""
SEO Optimizer — Ottimizza meta tags e inserisce internal link nei contenuti pubblicati.
Cron: 2x/giorno (09:00, 15:00) su Hetzner.
"""

import os
import sys
import re
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram


def get_recent_content(hours: int = 24) -> list[dict]:
    """Recupera contenuti pubblicati nelle ultime N ore."""
    all_recent: list[dict] = []
    for ct in ["blog-posts", "tutorials", "reviews", "recipes"]:
        items = strapi.find_all_pages(
            ct,
            populate="*",
            sort="updatedAt:desc",
            page_size=50,
        )
        # Filtra per data aggiornamento
        cutoff = datetime.now() - timedelta(hours=hours)
        for item in items:
            updated = item.get("updatedAt", "")
            if updated:
                try:
                    item_date = datetime.fromisoformat(updated.replace("Z", "+00:00")).replace(tzinfo=None)
                    if item_date > cutoff:
                        item["_content_type"] = ct
                        all_recent.append(item)
                except ValueError:
                    pass
    return all_recent


def get_all_content_for_linking() -> list[dict]:
    """Recupera tutti i contenuti pubblicati per costruire la mappa internal link."""
    all_content: list[dict] = []
    for ct in ["blog-posts", "tutorials", "reviews", "recipes"]:
        items = strapi.find_all_pages(
            ct,
            fields=["title", "slug", "excerpt", "seo_title"],
        )
        for item in items:
            item["_content_type"] = ct
            all_content.append(item)
    return all_content


def build_link_map(all_content: list[dict]) -> dict[str, dict]:
    """Costruisce mappa keyword → URL per internal linking."""
    link_map: dict[str, dict] = {}
    route_map = {
        "blog-posts": "blog",
        "tutorials": "tutorials",
        "reviews": "reviews",
        "recipes": "recipes",
    }
    for item in all_content:
        slug = item.get("slug", "")
        title = item.get("title", "")
        ct = item.get("_content_type", "")
        route = route_map.get(ct, "blog")
        url = f"/en/{route}/{slug}/"

        # Usa parole chiave dal titolo come anchor
        keywords = extract_keywords(title)
        for kw in keywords:
            if kw not in link_map:
                link_map[kw] = {"url": url, "title": title, "slug": slug}

    return link_map


def extract_keywords(title: str) -> list[str]:
    """Estrae keyword significative dal titolo (2-3 word phrases)."""
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "of", "in", "on", "for",
                  "to", "and", "or", "but", "with", "by", "at", "from", "how", "what",
                  "why", "when", "best", "top", "vs", "your", "our", "this", "that"}
    words = re.findall(r'[a-z]+', title.lower())
    words = [w for w in words if w not in stop_words and len(w) > 2]

    phrases: list[str] = []
    # Bigram e trigram
    for i in range(len(words)):
        if i + 1 < len(words):
            phrases.append(f"{words[i]} {words[i+1]}")
        if i + 2 < len(words):
            phrases.append(f"{words[i]} {words[i+1]} {words[i+2]}")

    return phrases[:5]  # Max 5 keyword per titolo


def add_internal_links(content: str, link_map: dict[str, dict], own_slug: str, max_links: int = 5) -> tuple[str, int]:
    """Aggiunge internal link al contenuto HTML. Ritorna (contenuto, num_link_aggiunti)."""
    added = 0
    used_urls: set[str] = set()

    for keyword, link_info in link_map.items():
        if added >= max_links:
            break
        if link_info["slug"] == own_slug:
            continue
        if link_info["url"] in used_urls:
            continue

        # Cerca la keyword nel testo (case insensitive, solo in paragrafi, non in tag)
        pattern = re.compile(
            rf'(?<![<\w/])({re.escape(keyword)})(?![^<]*>)',
            re.IGNORECASE
        )
        # Sostituisci solo la prima occorrenza
        new_content, count = pattern.subn(
            rf'<a href="{link_info["url"]}">\1</a>',
            content,
            count=1,
        )
        if count > 0:
            content = new_content
            used_urls.add(link_info["url"])
            added += 1

    return content, added


def optimize_content(item: dict, link_map: dict[str, dict]) -> dict | None:
    """Ottimizza un singolo contenuto. Ritorna i dati da aggiornare o None."""
    ct = item.get("_content_type", "")
    slug = item.get("slug", "")
    doc_id = item.get("documentId", "")

    # Campo contenuto varia per tipo
    content_field = "content" if ct in ("blog-posts", "tutorials") else "editorial_content" if ct == "reviews" else "editorial_intro"
    content = item.get(content_field, "") or ""

    if not content or not doc_id:
        return None

    # Aggiungi internal links
    updated_content, links_added = add_internal_links(content, link_map, slug)

    if links_added == 0:
        return None

    return {
        "doc_id": doc_id,
        "content_type": ct,
        "data": {content_field: updated_content},
        "links_added": links_added,
    }


def main():
    print(f"[{datetime.now().isoformat()}] SEO Optimizer avviato")

    # Recupera contenuti recenti e mappa link
    recent = get_recent_content(hours=24)
    print(f"Contenuti recenti (24h): {len(recent)}")

    all_content = get_all_content_for_linking()
    print(f"Contenuti totali per linking: {len(all_content)}")

    link_map = build_link_map(all_content)
    print(f"Keyword nella link map: {len(link_map)}")

    # Ottimizza ogni contenuto recente
    optimized: list[str] = []
    total_links = 0

    for item in recent:
        result = optimize_content(item, link_map)
        if result:
            try:
                strapi.update(result["content_type"], result["doc_id"], result["data"])
                optimized.append(f"{item.get('title', '?')} (+{result['links_added']} link)")
                total_links += result["links_added"]
            except Exception as e:
                print(f"[WARN] Aggiornamento fallito per {item.get('title', '?')}: {e}")

    # Report
    if optimized:
        telegram.send_agent_report(
            "SEO Optimizer",
            f"Ottimizzati {len(optimized)} contenuti, {total_links} internal link aggiunti",
            optimized[:10],  # Max 10 nel report
        )
    else:
        print("Nessun contenuto da ottimizzare")

    print(f"[{datetime.now().isoformat()}] SEO Optimizer completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/seo_optimizer.py
git commit -m "feat(agents): add seo_optimizer — auto internal linking and meta optimization"
```

---

### Task 7: Create `translation_agent.py`

**Files:**
- Create: `scripts/agents/translation_agent.py`

- [ ] **Step 1: Write translation agent**

Write `scripts/agents/translation_agent.py`:
```python
#!/usr/bin/env python3
"""
Translation Agent — Trova contenuti EN senza traduzione IT/ES e li traduce con Ollama.
Cron: ogni 6h su 192.168.1.119.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import ollama


def find_untranslated(content_type: str, target_locale: str) -> list[dict]:
    """Trova contenuti EN che non hanno traduzione nella locale target."""
    # Recupera tutti gli slug EN
    en_items = strapi.find_all_pages(content_type, locale="en", fields=["slug", "title", "documentId"])
    en_slugs = {item.get("slug"): item for item in en_items if item.get("slug")}

    # Recupera tutti gli slug nella locale target
    target_items = strapi.find_all_pages(content_type, locale=target_locale, fields=["slug"])
    target_slugs = {item.get("slug") for item in target_items if item.get("slug")}

    # Trova mancanti
    missing: list[dict] = []
    for slug, item in en_slugs.items():
        if slug not in target_slugs:
            missing.append(item)

    return missing


def translate_content(content_type: str, doc_id: str, target_locale: str) -> bool:
    """Traduce un singolo contenuto. Ritorna True se successo."""
    # Recupera contenuto completo EN
    resp = strapi.find_one(content_type, doc_id, populate="*")
    item = resp.get("data", {})

    lang_name = "italiano" if target_locale == "it" else "spagnolo"

    # Campi da tradurre dipendono dal content type
    text_fields: dict[str, str] = {}

    if content_type in ("blog-posts", "tutorials"):
        for field in ("title", "content", "excerpt", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val
    elif content_type == "reviews":
        for field in ("title", "editorial_content", "excerpt", "verdict", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val
        # Traduci anche pros/cons
        pros = item.get("pros", [])
        cons = item.get("cons", [])
        if pros or cons:
            text_fields["_pros_cons"] = f"Pros: {pros}\nCons: {cons}"
    elif content_type == "recipes":
        for field in ("title", "editorial_intro", "excerpt", "seo_title", "seo_description"):
            val = item.get(field, "")
            if val:
                text_fields[field] = val

    if not text_fields:
        return False

    # Traduci tutto in un unico prompt per efficienza
    fields_text = "\n---\n".join(f"[{k}]\n{v}" for k, v in text_fields.items() if not k.startswith("_"))
    units_note = "Converti unita: °F→°C, lbs→kg, oz→g, inches→cm." if target_locale in ("it", "es") else ""

    prompt = f"""Traduci i seguenti campi in {lang_name}. {units_note}
Mantieni i tag HTML. Non tradurre nomi di prodotti/brand.
Per ogni campo, rispondi nel formato:
[nome_campo]
traduzione

{fields_text}"""

    translated_raw = ollama.generate(prompt, system=ollama.TRANSLATOR_SYSTEM, max_tokens=8192)

    # Parsa le traduzioni
    translated_data: dict = {"slug": item.get("slug", "")}
    current_field = ""
    current_content: list[str] = []

    for line in translated_raw.split("\n"):
        if line.startswith("[") and line.endswith("]"):
            if current_field and current_content:
                translated_data[current_field] = "\n".join(current_content).strip()
            current_field = line[1:-1]
            current_content = []
        else:
            current_content.append(line)
    # Ultimo campo
    if current_field and current_content:
        translated_data[current_field] = "\n".join(current_content).strip()

    # Gestisci pros/cons per review
    if "_pros_cons" in text_fields and content_type == "reviews":
        # Copia pros/cons originali (sono array, non testo lungo)
        translated_data["pros"] = item.get("pros", [])
        translated_data["cons"] = item.get("cons", [])

    # Copia campi strutturati per recipes
    if content_type == "recipes":
        for field in ("ingredients", "instructions", "prep_time", "cook_time", "total_time", "servings"):
            val = item.get(field)
            if val is not None:
                translated_data[field] = val

    # Pubblica traduzione
    translated_data["published_date"] = item.get("published_date", datetime.now().strftime("%Y-%m-%d"))

    try:
        strapi.update(content_type, doc_id, translated_data, locale=target_locale)
        return True
    except Exception as e:
        print(f"[ERRORE] Traduzione {target_locale} fallita per {doc_id}: {e}")
        return False


def main():
    print(f"[{datetime.now().isoformat()}] Translation Agent avviato")

    content_types = ["blog-posts", "tutorials", "reviews", "recipes"]
    locales = ["it", "es"]
    total_translated = 0
    details: list[str] = []

    for ct in content_types:
        for locale in locales:
            missing = find_untranslated(ct, locale)
            if not missing:
                continue

            print(f"{ct}: {len(missing)} traduzioni {locale} mancanti")
            # Traduci max 3 per run per non sovraccaricare Ollama
            for item in missing[:3]:
                doc_id = item.get("documentId", "")
                title = item.get("title", "?")
                if translate_content(ct, doc_id, locale):
                    total_translated += 1
                    details.append(f"{title} → {locale.upper()}")
                    print(f"  Tradotto: {title} -> {locale}")

    # Report
    if total_translated > 0:
        telegram.send_agent_report(
            "Translation Agent",
            f"Tradotti {total_translated} contenuti",
            details,
        )
    else:
        print("Nessun contenuto da tradurre")

    print(f"[{datetime.now().isoformat()}] Translation Agent completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/translation_agent.py
git commit -m "feat(agents): add translation_agent — auto IT/ES translation with Ollama"
```

---

### Task 8: Create `competitor_monitor.py`

**Files:**
- Create: `scripts/agents/competitor_monitor.py`

- [ ] **Step 1: Write competitor monitor agent**

Write `scripts/agents/competitor_monitor.py`:
```python
#!/usr/bin/env python3
"""
Competitor Monitor — Monitora RSS/sitemap di blog BBQ competitor per nuovi articoli.
Cron: ogni 12h su Hetzner.
"""

import os
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import telegram

# ─── Competitor da monitorare ─────────────────────────────────────────────────

COMPETITORS = [
    {"name": "Serious Eats BBQ", "rss": "https://www.seriouseats.com/grilling-barbecue/feed"},
    {"name": "Amazing Ribs", "rss": "https://amazingribs.com/feed/"},
    {"name": "Hey Grill Hey", "rss": "https://heygrillhey.com/feed/"},
    {"name": "Vindulge", "rss": "https://vindulge.com/feed/"},
    {"name": "Girls Can Grill", "rss": "https://girlscangrill.com/feed/"},
    {"name": "ThermoWorks Blog", "rss": "https://blog.thermoworks.com/feed/"},
    {"name": "ATBBQ The Sauce", "rss": "https://www.atbbq.com/thesauce/feed/"},
]

STATE_FILE = Path(__file__).parent.parent.parent / "state" / "competitor_state.json"


def load_state() -> dict:
    """Carica stato precedente (URL gia visti)."""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"seen_urls": []}


def save_state(state: dict) -> None:
    """Salva stato aggiornato."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def fetch_rss(url: str) -> list[dict]:
    """Scarica e parsa un feed RSS. Ritorna lista di articoli."""
    articles: list[dict] = []
    try:
        req = Request(url, headers={"User-Agent": "BBQExperience-Monitor/1.0"})
        with urlopen(req, timeout=15) as resp:
            content = resp.read()

        root = ET.fromstring(content)
        # Supporta sia RSS 2.0 che Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        # RSS 2.0
        for item in root.findall(".//item"):
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            description = item.findtext("description", "").strip()
            if title and link:
                articles.append({
                    "title": title,
                    "url": link,
                    "date": pub_date,
                    "description": description[:200],
                })

        # Atom
        for entry in root.findall(".//atom:entry", ns):
            title = entry.findtext("atom:title", "", ns).strip()
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href", "") if link_el is not None else ""
            pub_date = entry.findtext("atom:published", "", ns).strip()
            summary = entry.findtext("atom:summary", "", ns).strip()
            if title and link:
                articles.append({
                    "title": title,
                    "url": link,
                    "date": pub_date,
                    "description": summary[:200],
                })

    except (HTTPError, ET.ParseError, Exception) as e:
        print(f"[WARN] RSS fetch fallito per {url}: {e}")

    return articles


def main():
    print(f"[{datetime.now().isoformat()}] Competitor Monitor avviato")

    state = load_state()
    seen_urls = set(state.get("seen_urls", []))
    new_articles: list[dict] = []

    for competitor in COMPETITORS:
        articles = fetch_rss(competitor["rss"])
        for article in articles:
            if article["url"] not in seen_urls:
                article["source"] = competitor["name"]
                new_articles.append(article)
                seen_urls.add(article["url"])

    # Aggiorna stato
    # Mantieni solo gli ultimi 1000 URL per non far crescere il file
    state["seen_urls"] = list(seen_urls)[-1000:]
    state["last_check"] = datetime.now().isoformat()
    save_state(state)

    print(f"Nuovi articoli competitor: {len(new_articles)}")

    # Report Telegram se ci sono novita
    if new_articles:
        details = [
            f'<a href="{a["url"]}">{a["title"]}</a> ({a["source"]})'
            for a in new_articles[:10]  # Max 10 nel report
        ]
        telegram.send_agent_report(
            "Competitor Monitor",
            f"{len(new_articles)} nuovi articoli rilevati",
            details,
        )
    else:
        print("Nessun nuovo articolo competitor")

    print(f"[{datetime.now().isoformat()}] Competitor Monitor completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/competitor_monitor.py
git commit -m "feat(agents): add competitor_monitor — RSS tracking of BBQ blogs"
```

---

### Task 9: Create `partnership_outreach.py`

**Files:**
- Create: `scripts/agents/partnership_outreach.py`

- [ ] **Step 1: Write partnership outreach agent**

Write `scripts/agents/partnership_outreach.py`:
```python
#!/usr/bin/env python3
"""
Partnership Outreach — Genera email per brand BBQ e gestisce follow-up automatici.
Cron: Lunedi 08:00 su Hetzner.
"""

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram


# ─── Template email ──────────────────────────────────────────────────────────

OUTREACH_TEMPLATE = """Subject: BBQ Experience x {brand_name} — Product Review Collaboration

Hi {brand_name} Team,

I'm the editor of BBQ Experience (bbq-experience.com), an editorial platform dedicated to honest, in-depth BBQ product reviews, recipes, and guides.

We reach {monthly_visitors}+ monthly readers and have a community of {ig_followers}+ followers on Instagram (@bbqexperience). Our audience is passionate BBQ enthusiasts actively researching gear before purchasing.

{existing_content_note}

We'd love to feature {brand_name} products in our review program. Our format:
- Detailed, hands-on review (1500+ words) with scoring across 5 categories
- Professional photography
- Published in English, Italian, and Spanish
- Cross-promoted on Instagram (74K+ followers)

We're interested in receiving a product for testing. In return, you get an honest, thorough review that ranks well in search and drives purchasing decisions.

Would you be open to a conversation?

Best,
Matteo Arelli
Editor, BBQ Experience
bbq-experience.com
"""

FOLLOWUP_TEMPLATE = """Subject: Re: BBQ Experience x {brand_name} — Quick Follow-Up

Hi {brand_name} Team,

Just following up on my previous email about a potential review collaboration.

We recently published reviews of similar products in your category that are performing well in search. A {brand_name} review would complement our coverage nicely.

Would love to chat if you're interested.

Best,
Matteo Arelli
BBQ Experience
"""


def get_site_metrics() -> dict:
    """Recupera metriche sito per personalizzare le email."""
    # Conta subscriber
    subs = strapi.find("subscribers", status="draft", page_size=1)
    sub_count = subs.get("meta", {}).get("pagination", {}).get("total", 0)

    return {
        "monthly_visitors": "5,000",  # Stima iniziale, aggiornare con dati Umami
        "ig_followers": "74K",
        "subscribers": str(sub_count),
    }


def get_brands_to_contact() -> list[dict]:
    """Recupera brand con status 'to_contact'."""
    return strapi.find_all_pages(
        "brands",
        status="draft",
        filters={"partnership_status": {"$eq": "to_contact"}},
        populate="*",
    )


def get_brands_for_followup() -> list[dict]:
    """Recupera partnership che necessitano follow-up (7+ giorni senza risposta)."""
    cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    partnerships = strapi.find_all_pages(
        "partnerships",
        status="draft",
        filters={
            "status": {"$in": ["outreach", "follow_up_1"]},
        },
        populate="brand",
    )
    # Filtra per data
    return [
        p for p in partnerships
        if p.get("contact_date", "9999") <= cutoff
        and (not p.get("last_follow_up") or p.get("last_follow_up", "9999") <= cutoff)
    ]


def get_existing_content_for_brand(brand_name: str) -> list[str]:
    """Trova review/articoli che menzionano il brand."""
    results: list[str] = []
    for ct in ["reviews", "blog-posts"]:
        items = strapi.find_all_pages(ct, fields=["title", "slug"])
        for item in items:
            title = item.get("title", "").lower()
            if brand_name.lower() in title:
                results.append(item.get("title", ""))
    return results


def generate_outreach_email(brand: dict, metrics: dict) -> str:
    """Genera email di primo contatto."""
    brand_name = brand.get("name", "")
    existing = get_existing_content_for_brand(brand_name)

    if existing:
        note = f"We've already published content mentioning {brand_name}:\n"
        for title in existing[:3]:
            note += f"- {title}\n"
    else:
        note = f"We're expanding our coverage to include {brand_name} products in our review lineup."

    return OUTREACH_TEMPLATE.format(
        brand_name=brand_name,
        monthly_visitors=metrics["monthly_visitors"],
        ig_followers=metrics["ig_followers"],
        existing_content_note=note,
    )


def main():
    print(f"[{datetime.now().isoformat()}] Partnership Outreach avviato")

    metrics = get_site_metrics()
    details: list[str] = []

    # Primo contatto
    brands = get_brands_to_contact()
    for brand in brands:
        brand_name = brand.get("name", "?")
        doc_id = brand.get("documentId", "")
        email = generate_outreach_email(brand, metrics)

        # Crea Partnership entry
        strapi.create("partnerships", {
            "brand": doc_id,
            "status": "outreach",
            "contact_date": datetime.now().strftime("%Y-%m-%d"),
            "email_draft": email,
        })

        # Aggiorna brand status
        strapi.update("brands", doc_id, {"partnership_status": "contacted"})

        details.append(f"Primo contatto: <b>{brand_name}</b>")
        print(f"Email generata per: {brand_name}")

    # Follow-up
    followups = get_brands_for_followup()
    for partnership in followups:
        brand_data = partnership.get("brand", {})
        brand_name = brand_data.get("name", "?") if isinstance(brand_data, dict) else "?"
        p_status = partnership.get("status", "outreach")
        p_doc_id = partnership.get("documentId", "")

        new_status = "follow_up_1" if p_status == "outreach" else "follow_up_2"
        followup_email = FOLLOWUP_TEMPLATE.format(brand_name=brand_name)

        strapi.update("partnerships", p_doc_id, {
            "status": new_status,
            "last_follow_up": datetime.now().strftime("%Y-%m-%d"),
            "email_draft": followup_email,
        })

        # Se gia follow_up_2, marca come declined
        if p_status == "follow_up_1":
            details.append(f"Follow-up 2: <b>{brand_name}</b>")
        else:
            details.append(f"Follow-up 1: <b>{brand_name}</b>")

    # Report
    if details:
        telegram.send_agent_report(
            "Partnership Outreach",
            f"Pipeline: {len(brands)} nuovi contatti, {len(followups)} follow-up",
            details,
        )
    else:
        telegram.send_agent_report(
            "Partnership Outreach",
            "Nessuna azione questa settimana — aggiungi brand in Strapi per iniziare.",
        )

    print(f"[{datetime.now().isoformat()}] Partnership Outreach completato")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/partnership_outreach.py
git commit -m "feat(agents): add partnership_outreach — automated brand email pipeline"
```

---

### Task 10: Create `telegram_bot.py` — Command Center

**Files:**
- Create: `scripts/agents/telegram_bot.py`

- [ ] **Step 1: Install dependency**

```bash
pip install python-telegram-bot==21.7
```

- [ ] **Step 2: Write Telegram bot**

Write `scripts/agents/telegram_bot.py`:
```python
#!/usr/bin/env python3
"""
Telegram Bot — Mission Control per BBQ Experience.
Daemon: systemd service su Hetzner. Sostituisce telegram_dashboard.py (cron).
Report giornaliero alle 21:00 + comandi interattivi.
"""

import os
import sys
import json
import asyncio
import subprocess
from datetime import datetime, time as dtime
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi

# Importa python-telegram-bot
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
UMAMI_URL = os.environ.get("UMAMI_URL", "https://analytics.bbq-experience.com")
UMAMI_PASSWORD = os.environ.get("UMAMI_PASSWORD", "")
UMAMI_SITE_ID = os.environ.get("UMAMI_SITE_ID", "78df95b7-1b94-43e7-9f0d-38c63e99cf64")
PAUSE_FLAG = Path(__file__).parent.parent.parent / "state" / "agents_paused"

# ─── Utility Umami ────────────────────────────────────────────────────────────

def get_umami_token() -> str:
    """Autentica su Umami e ritorna token."""
    url = f"{UMAMI_URL}/api/auth/login"
    body = json.dumps({"username": "admin", "password": UMAMI_PASSWORD}).encode()
    req = Request(url, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())["token"]


def get_umami_stats(token: str) -> dict:
    """Recupera statistiche giornaliere da Umami."""
    today = datetime.now().strftime("%Y-%m-%d")
    url = f"{UMAMI_URL}/api/websites/{UMAMI_SITE_ID}/stats?startAt={today}T00:00:00&endAt={today}T23:59:59"
    req = Request(url, headers={"Authorization": f"Bearer {token}"})
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


# ─── Conteggio contenuti ─────────────────────────────────────────────────────

def get_content_counts() -> dict[str, int]:
    """Conta contenuti per tipo."""
    counts: dict[str, int] = {}
    for ct in ["reviews", "recipes", "tutorials", "blog-posts", "instagram-posts", "subscribers"]:
        try:
            resp = strapi.find(ct, status="draft" if ct == "subscribers" else "published", page_size=1)
            counts[ct] = resp.get("meta", {}).get("pagination", {}).get("total", 0)
        except Exception:
            counts[ct] = 0
    return counts


def get_queue_status() -> dict:
    """Status della ContentQueue."""
    queue = strapi.find_all_pages("content-queues", status="draft", fields=["status"])
    status_counts: dict[str, int] = {}
    for item in queue:
        s = item.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
    return status_counts


def get_pipeline_status() -> list[dict]:
    """Status pipeline partnership."""
    return strapi.find_all_pages("partnerships", status="draft", populate="brand")


# ─── Report giornaliero ──────────────────────────────────────────────────────

async def daily_report(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Invia report giornaliero alle 21:00."""
    lines: list[str] = ["<b>📊 BBQ Experience — Report Giornaliero</b>", ""]

    # Traffico Umami
    try:
        token = get_umami_token()
        stats = get_umami_stats(token)
        lines.append("<b>TRAFFICO</b>")
        lines.append(f"• Pageviews: {stats.get('pageviews', {}).get('value', 0)}")
        lines.append(f"• Visitatori unici: {stats.get('visitors', {}).get('value', 0)}")
        lines.append(f"• Bounce rate: {stats.get('bounces', {}).get('value', 0)}%")
        lines.append("")
    except Exception as e:
        lines.append(f"<i>Umami non disponibile: {e}</i>")
        lines.append("")

    # Contenuti
    counts = get_content_counts()
    lines.append("<b>CONTENUTI</b>")
    lines.append(f"• Reviews: {counts.get('reviews', 0)}")
    lines.append(f"• Ricette: {counts.get('recipes', 0)}")
    lines.append(f"• Tutorial: {counts.get('tutorials', 0)}")
    lines.append(f"• Blog: {counts.get('blog-posts', 0)}")
    lines.append(f"• Post IG: {counts.get('instagram-posts', 0)}")
    lines.append(f"• Subscriber: {counts.get('subscribers', 0)}")
    lines.append("")

    # ContentQueue
    queue = get_queue_status()
    if queue:
        lines.append("<b>CODA AI</b>")
        for status, count in sorted(queue.items()):
            lines.append(f"• {status}: {count}")
        lines.append("")

    # Partnership
    partnerships = get_pipeline_status()
    if partnerships:
        lines.append("<b>PARTNERSHIP</b>")
        for p in partnerships[:5]:
            brand = p.get("brand", {})
            brand_name = brand.get("name", "?") if isinstance(brand, dict) else "?"
            lines.append(f"• {brand_name}: {p.get('status', '?')}")
        lines.append("")

    # Links
    lines.append("<b>LINKS</b>")
    lines.append('• <a href="https://bbq-experience.com">Sito</a>')
    lines.append('• <a href="https://cms.bbq-experience.com/admin">CMS</a>')
    lines.append('• <a href="https://analytics.bbq-experience.com">Analytics</a>')

    await context.bot.send_message(
        chat_id=CHAT_ID,
        text="\n".join(lines),
        parse_mode="HTML",
        disable_web_page_preview=True,
    )


# ─── Comandi ──────────────────────────────────────────────────────────────────

async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /stats — report istantaneo."""
    await daily_report(context)


async def cmd_queue(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /queue — mostra articoli in coda."""
    items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        filters={"status": {"$in": ["ready", "generating"]}},
        sort="priority:asc",
        fields=["title", "status", "scheduled_date", "cluster", "target_keyword"],
    )
    if not items:
        await update.message.reply_text("Coda vuota — lancia keyword_scout per popolarla.")
        return

    lines = ["<b>📝 Coda Pubblicazione</b>", ""]
    for item in items[:15]:
        lines.append(f"• [{item.get('status', '?')}] <b>{item.get('title', '?')}</b>")
        lines.append(f"  {item.get('target_keyword', '')} | {item.get('cluster', '')} | {item.get('scheduled_date', '')}")
    await update.message.reply_html("\n".join(lines))


async def cmd_keywords(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /keywords — top keyword opportunities."""
    items = strapi.find_all_pages(
        "keyword-trackers",
        status="draft",
        filters={"is_low_hanging": {"$eq": "true"}},
        sort="impressions:desc",
        fields=["keyword", "position", "impressions", "trend"],
    )
    if not items:
        await update.message.reply_text("Nessun dato keyword — lancia keyword_scout per iniziare.")
        return

    lines = ["<b>🎯 Top Keyword Opportunities</b>", ""]
    for item in items[:10]:
        trend_icon = "📈" if item.get("trend") == "rising" else "📉" if item.get("trend") == "falling" else "➡️"
        lines.append(f"{trend_icon} <b>{item.get('keyword', '?')}</b> — pos {item.get('position', '?')}, {item.get('impressions', 0)} imp")
    await update.message.reply_html("\n".join(lines))


async def cmd_pipeline(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /pipeline — status partnership."""
    partnerships = get_pipeline_status()
    if not partnerships:
        await update.message.reply_text("Pipeline vuoto — aggiungi brand in Strapi.")
        return

    lines = ["<b>🤝 Partnership Pipeline</b>", ""]
    for p in partnerships:
        brand = p.get("brand", {})
        brand_name = brand.get("name", "?") if isinstance(brand, dict) else "?"
        lines.append(f"• <b>{brand_name}</b>: {p.get('status', '?')} (dal {p.get('contact_date', '?')})")
    await update.message.reply_html("\n".join(lines))


async def cmd_competitors(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /competitors — ultimi articoli competitor."""
    state_file = Path(__file__).parent.parent.parent / "state" / "competitor_state.json"
    if not state_file.exists():
        await update.message.reply_text("Nessun dato competitor — attendi il primo run del monitor.")
        return

    state = json.loads(state_file.read_text())
    last_check = state.get("last_check", "mai")
    total = len(state.get("seen_urls", []))
    await update.message.reply_html(
        f"<b>📡 Competitor Monitor</b>\n\n"
        f"Ultimo check: {last_check}\n"
        f"URL monitorati: {total}\n\n"
        f"<i>Alert nuovi articoli arrivano automaticamente.</i>"
    )


async def cmd_pause(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /pause — pausa agenti per 24h."""
    PAUSE_FLAG.parent.mkdir(parents=True, exist_ok=True)
    PAUSE_FLAG.write_text(datetime.now().isoformat())
    await update.message.reply_text("⏸️ Agenti in pausa per 24h. Usa /resume per riprendere.")


async def cmd_resume(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /resume — riprendi agenti."""
    if PAUSE_FLAG.exists():
        PAUSE_FLAG.unlink()
    await update.message.reply_text("▶️ Agenti ripresi.")


async def cmd_publish(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handler /publish — pubblica prossimo articolo in coda."""
    await update.message.reply_text("🚀 Lancio content_generator...")
    try:
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "content_generator.py")],
            capture_output=True, text=True, timeout=1800,
            env={**os.environ},
        )
        if result.returncode == 0:
            await update.message.reply_text("✅ Articolo pubblicato! Vedi report sopra.")
        else:
            await update.message.reply_text(f"❌ Errore: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        await update.message.reply_text("⏰ Timeout (30 min). Controlla i log.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN non configurato")
        sys.exit(1)

    app = Application.builder().token(BOT_TOKEN).build()

    # Registra comandi
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("queue", cmd_queue))
    app.add_handler(CommandHandler("keywords", cmd_keywords))
    app.add_handler(CommandHandler("pipeline", cmd_pipeline))
    app.add_handler(CommandHandler("competitors", cmd_competitors))
    app.add_handler(CommandHandler("pause", cmd_pause))
    app.add_handler(CommandHandler("resume", cmd_resume))
    app.add_handler(CommandHandler("publish", cmd_publish))

    # Report giornaliero alle 21:00 UTC
    job_queue = app.job_queue
    job_queue.run_daily(daily_report, time=dtime(hour=21, minute=0))

    print(f"[{datetime.now().isoformat()}] Telegram Bot avviato — polling attivo")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/telegram_bot.py
git commit -m "feat(agents): add telegram_bot — interactive command center with daily reports"
```

---

### Task 11: Create `requirements.txt` for Agents

**Files:**
- Create: `scripts/agents/requirements.txt`

- [ ] **Step 1: Write requirements**

Write `scripts/agents/requirements.txt`:
```
python-telegram-bot>=21.0,<22.0
httpx>=0.27.0
feedparser>=6.0.0
beautifulsoup4>=4.12.0
```

Note: Gli agenti usano il piu possibile `urllib` dalla stdlib per minimizzare dipendenze. `httpx` e `beautifulsoup4` sono per usi futuri (competitor monitor avanzato, GSC API).

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/requirements.txt
git commit -m "feat(agents): add Python dependencies for AI agents"
```

---

### Task 12: Create Systemd Service for Telegram Bot

**Files:**
- Create: `scripts/agents/bbqexperience-telegram.service`

- [ ] **Step 1: Write systemd unit file**

Write `scripts/agents/bbqexperience-telegram.service`:
```ini
[Unit]
Description=BBQ Experience Telegram Bot
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/services/bbqexperience/app/scripts/agents
ExecStart=/usr/bin/python3 /opt/services/bbqexperience/app/scripts/agents/telegram_bot.py
Restart=always
RestartSec=10
EnvironmentFile=/opt/services/bbqexperience/.env

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Document deployment steps**

Per attivare sul server Hetzner:
```bash
# Copia il file service
cp scripts/agents/bbqexperience-telegram.service /etc/systemd/system/

# Installa dipendenze Python
pip3 install -r scripts/agents/requirements.txt

# Abilita e avvia
systemctl daemon-reload
systemctl enable bbqexperience-telegram
systemctl start bbqexperience-telegram

# Verifica
systemctl status bbqexperience-telegram
journalctl -u bbqexperience-telegram -f
```

- [ ] **Step 3: Commit**

```bash
git add scripts/agents/bbqexperience-telegram.service
git commit -m "feat(agents): add systemd service for Telegram bot daemon"
```

---

### Task 13: Create Cron Configuration Documentation

**Files:**
- Create: `scripts/agents/crontab.txt`

- [ ] **Step 1: Write crontab reference**

Write `scripts/agents/crontab.txt`:
```bash
# BBQ Experience — AI Agents Cron Schedule
# Hetzner server (204.168.153.43)
# Copiare in crontab: crontab -e

# Keyword Scout — Lunedi 05:00
0 5 * * 1 cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/keyword_scout.py >> /opt/webhooks/logs/keyword-scout.log 2>&1

# SEO Optimizer — Ogni giorno 09:00 e 15:00
0 9,15 * * * cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/seo_optimizer.py >> /opt/webhooks/logs/seo-optimizer.log 2>&1

# Competitor Monitor — Ogni 12 ore
0 */12 * * * cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/competitor_monitor.py >> /opt/webhooks/logs/competitor-monitor.log 2>&1

# Partnership Outreach — Lunedi 08:00
0 8 * * 1 cd /opt/services/bbqexperience/app && /usr/bin/python3 scripts/agents/partnership_outreach.py >> /opt/webhooks/logs/partnership-outreach.log 2>&1

# ─── Agenti su 192.168.1.119 (Ollama) ───
# Content Generator — Ogni giorno 06:00
# 0 6 * * * cd /path/to/bbqexperience && python3 scripts/agents/content_generator.py >> /var/log/bbq-content-generator.log 2>&1

# Translation Agent — Ogni 6 ore
# 0 */6 * * * cd /path/to/bbqexperience && python3 scripts/agents/translation_agent.py >> /var/log/bbq-translation-agent.log 2>&1

# ─── Cron esistenti (NON modificare) ───
# 0 3 * * * /opt/webhooks/scripts/backup-db.sh
# 0 4 * * 1 cd /opt/services/bbqexperience/app && node scripts/refresh-instagram-token.mjs
# 0 */6 * * * cd /opt/services/bbqexperience/app && node scripts/sync-instagram.mjs
# 0 10 * * 0 cd /opt/services/bbqexperience/app && python3 scripts/weekly_newsletter.py
```

- [ ] **Step 2: Commit**

```bash
git add scripts/agents/crontab.txt
git commit -m "docs(agents): add cron schedule reference for all AI agents"
```

---

### Summary

After completing this plan:
- 6 autonomous Python agents: keyword_scout, content_generator, seo_optimizer, translation_agent, competitor_monitor, partnership_outreach
- 1 Telegram bot daemon with 8 interactive commands + daily report
- Shared libraries: strapi_client, telegram notifier, ollama client
- Systemd service file for Telegram bot
- Requirements.txt for Python dependencies
- Crontab reference documentation
- All agents use Strapi REST API (content types from Plan 1)
- Content generator and translation agent use Ollama on 192.168.1.119
- Other agents run on Hetzner (no LLM needed)
