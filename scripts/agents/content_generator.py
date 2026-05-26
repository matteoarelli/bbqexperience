#!/usr/bin/env python3
"""
Content Generator — Genera articoli BBQ con Claude Code CLI e li pubblica su Strapi.
Legge dalla ContentQueue, genera in EN con Claude (piano Max), pubblica.
Le traduzioni IT/ES vengono fatte dal translation_agent separato (Ollama).
Cron: Daily 06:00 via Windows Task Scheduler (Claude CLI funziona solo su Windows).
"""

import os
import sys
import io
from datetime import datetime
from pathlib import Path

# Fix encoding Windows
if sys.stdout and hasattr(sys.stdout, 'buffer') and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Carica env vars da .env.windows (Windows) o .env (server)
_script_dir = Path(__file__).parent
for _env_file in [_script_dir / ".env.windows", _script_dir.parent.parent / ".env"]:
    if _env_file.exists():
        for _line in _env_file.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())
        break

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib import claude_client as claude
from agents.lib.slugify import slugify
from agents.keyword_scout import is_acceptable_topic

# ─── Mappe content type Strapi ────────────────────────────────────────────────

STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",  # Le comparazioni sono blog post con categoria specifica
}


def published_slug_exists(content_type_strapi: str, slug: str) -> bool:
    """True se esiste già un contenuto PUBBLICATO con questo slug.

    Evita il 400 ValidationError "slug must be unique" che il quality gate
    sbatteva quando provava a promuovere a published un articolo con slug
    coincidente con uno già live (vedi knowledge-base follow-up duplicati).

    Difensivo: la pipeline gira di notte non presidiata. Se la query Strapi
    fallisce (timeout/rete), logga e ritorna False — non deve mai bloccare la
    generazione per un errore di rete. Lo scopo è evitare duplicati NOTI, non
    introdurre un nuovo single point of failure.
    """
    if not slug:
        return False
    try:
        resp = strapi.find(
            content_type_strapi,
            filters={"slug": {"$eq": slug}},
            page_size=1,
        )
        total = resp.get("meta", {}).get("pagination", {}).get("total", 0)
        return total > 0
    except Exception as e:
        print(f"  [WARN] published_slug_exists({content_type_strapi},{slug}) fallita, skip check: {e}")
        return False


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


def get_next_acceptable_queue_item(max_attempts: int = 15) -> dict | None:
    """Pesca il prossimo item che passa is_acceptable_topic.

    Difesa contro queue legacy (pre-filter): se un item non passa
    (modifier-as-title, year stale, off-season, truncated "..."), lo marca
    come failed e pesca il prossimo. Senza questo, la garbage accumulata
    prima del fix 734195d girerebbe attraverso il drafter sprecando cicli.
    """
    for attempt in range(max_attempts):
        item = get_next_queue_item()
        if item is None:
            return None
        title = item.get("title", "") or ""
        target = item.get("target_keyword", "") or title
        doc_id = item.get("documentId", "")
        ok, reason = is_acceptable_topic(target)

        # Guard slug duplicato: se lo slug derivato dal titolo esiste già
        # pubblicato, generare sarebbe sprecato (Qwen+Claude) e il gate
        # sbatterebbe poi un 400 "slug must be unique". Marca failed e prosegui.
        slug = slugify(title)
        ct = STRAPI_CONTENT_TYPES.get(item.get("content_type", "blog"), "blog-posts")
        if ok and published_slug_exists(ct, slug):
            ok = False
            reason = f"Duplicate slug (already published): {slug}"

        if ok:
            return item

        print(f"  [skip queue:{doc_id}] {target!r}: {reason}")
        try:
            strapi.update("content-queues", doc_id, {
                "status": "failed",
                "generation_log": (
                    f"Filtered by is_acceptable_topic: {reason}"
                    if not reason.startswith("Duplicate slug")
                    else reason
                ),
            })
        except Exception as e:
            print(f"  [WARN] could not mark {doc_id} failed: {e}")
            return None  # evita loop infinito se update fallisce

    print(f"  [WARN] {max_attempts} consecutive items rejected — queue da revisionare")
    return None


def generate_article(title: str, keyword: str, cluster: str, content_type: str) -> dict:
    """Genera articolo completo in EN. Default single-shot Qwen.
    Se env MULTI_STEP=1: usa pipeline outline -> sezioni -> assembly (qualità più alta)."""

    if os.environ.get("MULTI_STEP", "").strip() in ("1", "true", "yes"):
        print("  [generator] MULTI_STEP attivo")
        return claude.generate_article_multistep(title, keyword, cluster, content_type)

    # --- Single-shot path (default) ---

    prompt = f"""Write a complete, publication-ready BBQ article for bbq-experience.com.

Title: {title}
Target keyword: {keyword}
Cluster: {cluster}
Content type: {content_type}

REQUIREMENTS:
- 1500-2000 words in English
- Structure: compelling intro, 6-8 sections with H2/H3, conclusion, FAQ (4-5 questions)
- Use HTML tags: h2, h3, p, ul, li, strong, em, table (where appropriate)
- The target keyword MUST appear in the first paragraph and in at least 2 H2 headings
- Include specific data: temperatures in °F, cooking times, weights in lbs/oz
- Tone: "The Pitmaster" — direct, technical, zero marketing BS, brutally honest
- NO generic intros like "BBQ is a beloved tradition..." — get to the point immediately
- Include practical tips based on real pitmaster experience
- Each section should have an actionable takeaway
- FAQ answers must be specific with data, not generic

OUTPUT: Only the raw HTML content. No markdown code blocks, no ```html wrapper, no explanation text before or after. Start directly with <p> and end with the last closing tag."""

    content = claude.ask(prompt, timeout=300)

    # Pulisci output: rimuovi code blocks markdown, testo pre/post HTML
    content = content.strip()
    if "```html" in content:
        content = content.split("```html", 1)[1]
        if "```" in content:
            content = content.rsplit("```", 1)[0]
    elif "```" in content:
        parts = content.split("```")
        # Prendi il blocco piu lungo (probabilmente l'HTML)
        content = max(parts, key=len)
    # Rimuovi testo prima del primo tag HTML
    first_tag = content.find("<")
    if first_tag > 0:
        content = content[first_tag:]
    # Rimuovi testo dopo l'ultimo tag HTML di chiusura
    last_tag = content.rfind(">")
    if last_tag > 0 and last_tag < len(content) - 1:
        content = content[:last_tag + 1]
    content = content.strip()

    word_count = len(content.split())
    print(f"  Articolo generato: {word_count} parole")

    # Genera excerpt e SEO meta con Claude
    seo_prompt = f"""For this BBQ article titled "{title}" with keyword "{keyword}", generate:

1. An excerpt for search results (1-2 sentences, max 155 characters, plain text, no HTML)
2. SEO title (max 60 characters, must include the keyword)
3. Meta description (max 155 characters, must include the keyword, with call to action)

Reply in this EXACT format (3 lines, nothing else):
EXCERPT: ...
SEO_TITLE: ...
SEO_DESCRIPTION: ..."""

    seo_raw = claude.ask(seo_prompt, timeout=120)

    excerpt = ""
    seo_title = title[:60]
    seo_description = ""

    for line in seo_raw.strip().split("\n"):
        line = line.strip()
        if line.startswith("EXCERPT:"):
            excerpt = line[8:].strip()[:160]
        elif line.startswith("SEO_TITLE:"):
            seo_title = line[10:].strip()[:60]
        elif line.startswith("SEO_DESCRIPTION:"):
            seo_description = line[16:].strip()[:155]

    if not excerpt:
        excerpt = (content[:155].split(".")[0] + ".").strip()
    if not seo_description:
        seo_description = excerpt[:155]

    return {
        "content": content,
        "excerpt": excerpt,
        "seo_title": seo_title,
        "seo_description": seo_description,
    }


def generate_slug(title: str) -> str:
    """Genera slug URL-safe dal titolo. Delega a lib.slugify (unica fonte)."""
    return slugify(title)


def publish_article(
    queue_item: dict, article: dict, content_type_strapi: str, content_type_raw: str
) -> str | None:
    """Pubblica articolo in EN e traduzioni IT/ES su Strapi. Ritorna documentId.

    Phase 17 wiring note: questo path crea l'entry come DRAFT (status='draft').
    La promotion draft->published e l'indicizzazione SE seguono:
    - Promotion: claude_review_runner.apply_review() chiama strapi.publish() dopo
      Claude quality gate (WIRE_SITE: claude_review_runner.py:129 — discovered
      Phase 17 Wave 0). Vedi _notify_search_engines() in claude_review_runner.
    - Translation IT/ES: translation_agent.py su .119 (TODO follow-up Phase 17 v2:
      hookare _notify_search_engines anche li' quando promuove le traduzioni).
    """
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

    # Crea EN come DRAFT. Il quality gate decide se promuovere a published
    # (vedi claude_review_runner.apply_review). Le traduzioni IT/ES sono
    # gestite dal translation_agent separato sul lato Ubuntu.
    try:
        resp = strapi.create(content_type_strapi, base_data, status="draft")
        doc_id = resp.get("data", {}).get("documentId")
        if not doc_id:
            print(f"[ERRORE] Nessun documentId nella risposta per '{title}'")
            return None
        print(f"  Draft creato EN: {content_type_strapi}/{doc_id} (publish gated da Claude review)")
        return doc_id
    except Exception as e:
        print(f"[ERRORE] Creazione draft EN fallita per '{title}': {e}")
        return None


def main():
    print(f"[{datetime.now().isoformat()}] Content Generator avviato")

    queue_item = get_next_acceptable_queue_item()
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
        word_count = len(article['content'].split())
        print(f"Articolo generato: {len(article['content'])} caratteri ({word_count} parole)")

        # Quality gate: validate before publishing
        if word_count < 1000:
            raise ValueError(f"Articolo troppo corto: {word_count} parole (min 1000, target 1500-2000)")
        if not article.get('excerpt') or len(article.get('excerpt') or '') < 50:
            raise ValueError(f"Excerpt mancante/corto: {len(article.get('excerpt') or '')} chars")
        if not article.get('seo_title') or not article.get('seo_description'):
            raise ValueError("SEO title o description mancanti")
        if '<h2' not in article['content']:
            raise ValueError("Articolo senza H2 — struttura incompleta")

        # Pubblica
        published_id = publish_article(queue_item, article, content_type_strapi, content_type_raw)

        if published_id:
            # Aggiorna ContentQueue — Qwen ha finito, ora aspetta Claude Opus quality gate
            # (claude_review_runner.py poll su Windows, transitions to published / preview_pending / needs_human)
            strapi.update("content-queues", doc_id_queue, {
                "status": "draft_review",
                "published_content_id": published_id,
                "ai_generated": True,
                "body_en": article["content"][:500],
                "generation_log": f"Qwen draft pronto {datetime.now().isoformat()} - {len(article['content'].split())} parole - awaiting Claude gate",
            })

            telegram.send_agent_report(
                "Content Generator",
                f"Draft Qwen pronto, in coda per Claude gate",
                [
                    f"<b>{title}</b>",
                    f"Keyword: {keyword}",
                    f"Cluster: {cluster}",
                    f"Tipo: {content_type_strapi}",
                    f"ID: {published_id}",
                    f"Claude gate gira ogni 15 min su Windows",
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
