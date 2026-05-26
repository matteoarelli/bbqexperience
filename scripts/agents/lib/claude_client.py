"""Client LLM per BBQ Experience — quality reviewer & content generator.

Refactor 2026-04-28: usa Qwen3.6-27B locale via OpenAI-compat (http://192.168.1.124:8080)
invece di Claude Code CLI subprocess. Stesso nome file e signature pubbliche per
backward-compat con i moduli che importano `ask()`, `review_article()`, ecc.

Fallback: se env `BBQ_LLM_BACKEND=claude` o Qwen unreachable, ritenta su Claude CLI.
"""

import json
import os
import subprocess
import time
import urllib.error
import urllib.request

# --- Backend config ---

LLM_URL = os.environ.get("BBQ_LLM_URL", "http://192.168.1.124:8080/v1/chat/completions")
LLM_MODEL = os.environ.get("BBQ_LLM_MODEL", "qwen3.6-27b")
LLM_BACKEND = os.environ.get("BBQ_LLM_BACKEND", "qwen").lower()  # qwen | claude
CLAUDE_CMD = os.environ.get("CLAUDE_CMD", "claude")


# --- Qwen3.6 local backend (default) ---

def _ask_qwen(prompt: str, system: str, max_tokens: int, timeout: int, enable_thinking: bool) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.5,
        "chat_template_kwargs": {"enable_thinking": enable_thinking},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(LLM_URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"].strip()


# --- Claude CLI fallback (legacy, abbonamento Pro/Max) ---

def _ask_claude_cli(prompt: str, system: str, timeout: int) -> str:
    full_prompt = f"[System: {system}]\n\n{prompt}" if system else prompt
    result = subprocess.run(
        [CLAUDE_CMD, "--print", full_prompt],
        capture_output=True,
        text=True,
        timeout=timeout,
        env={**os.environ},
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        raise RuntimeError(f"Claude CLI errore (exit {result.returncode}): {result.stderr[:500]}")
    return result.stdout.strip()


# --- Public ask() — drop-in compat con la versione precedente ---

def ask(
    prompt: str,
    *,
    system: str = "",
    max_tokens: int = 8192,
    timeout: int = 300,
    enable_thinking: bool = True,
) -> str:
    """Invia prompt al backend LLM (Qwen3.6 locale o Claude CLI fallback)."""
    backend = LLM_BACKEND
    last_error: Exception | None = None

    for attempt in range(3):
        try:
            if backend == "claude":
                return _ask_claude_cli(prompt, system, timeout)
            return _ask_qwen(prompt, system, max_tokens, timeout, enable_thinking)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_error = e
            print(f"[RETRY] LLM tentativo {attempt + 2}/3: {e}")
        except subprocess.TimeoutExpired:
            last_error = RuntimeError(f"Backend timeout dopo {timeout}s")
        except FileNotFoundError:
            # Solo se backend=claude e CLI non installato: tenta Qwen come fallback al primo errore
            if backend == "claude" and attempt == 0:
                print("[FALLBACK] Claude CLI mancante, switch a Qwen locale")
                backend = "qwen"
                continue
            last_error = RuntimeError(f"Claude CLI non trovato ('{CLAUDE_CMD}')")
        except RuntimeError as e:
            last_error = e

        if attempt < 2:
            wait = [3, 10][attempt]
            time.sleep(wait)

    raise last_error or RuntimeError("Backend LLM irraggiungibile")


# --- High-level functions (signature invariata) ---

def review_article(title: str, content: str, keyword: str, locale: str = "en") -> dict:
    """Rivede un articolo generato da Ollama. Ritorna contenuto migliorato + feedback."""
    prompt = f"""Sei il quality editor di BBQ Experience. Rivedi questo articolo generato da AI.

TITOLO: {title}
KEYWORD TARGET: {keyword}
LINGUA: {locale}

ARTICOLO:
{content[:6000]}

ISTRUZIONI:
1. Riscrivi le parti deboli (intro generiche, frasi vuote, dati imprecisi)
2. Verifica che temperature, tempi e pesi siano realistici per BBQ
3. Assicurati che la keyword target appaia nel primo paragrafo e in almeno 2 H2
4. Mantieni il tono "The Pitmaster": diretto, tecnico, zero marketing BS
5. La sezione FAQ deve avere risposte concrete, non generiche
6. Mantieni i tag HTML

Rispondi in questo formato ESATTO:

===QUALITY_SCORE===
[numero da 1 a 10]
===ISSUES===
[lista problemi trovati, uno per riga]
===IMPROVED_CONTENT===
[articolo completo migliorato con tag HTML]
===SEO_TITLE===
[meta title ottimizzato, max 60 char]
===SEO_DESCRIPTION===
[meta description ottimizzata, max 155 char]
"""
    # Output strutturato: thinking off per evitare reasoning_content vuoto/perso
    raw = ask(prompt, timeout=600, enable_thinking=False)

    result: dict = {
        "quality_score": 0,
        "issues": [],
        "improved_content": content,
        "seo_title": title,
        "seo_description": "",
    }

    sections = raw.split("===")
    current_key = ""
    current_value: list[str] = []

    for section in sections:
        section = section.strip()
        if section in ("QUALITY_SCORE", "ISSUES", "IMPROVED_CONTENT", "SEO_TITLE", "SEO_DESCRIPTION"):
            if current_key and current_value:
                _set_result(result, current_key, "\n".join(current_value).strip())
            current_key = section
            current_value = []
        elif current_key:
            current_value.append(section)

    if current_key and current_value:
        _set_result(result, current_key, "\n".join(current_value).strip())

    return result


def _set_result(result: dict, key: str, value: str) -> None:
    """Helper per popolare il dizionario risultato."""
    if key == "QUALITY_SCORE":
        try:
            result["quality_score"] = int(value.strip().split("\n")[0])
        except ValueError:
            result["quality_score"] = 5
    elif key == "ISSUES":
        result["issues"] = [line.strip("- ").strip() for line in value.split("\n") if line.strip()]
    elif key == "IMPROVED_CONTENT":
        if len(value) > 100:
            result["improved_content"] = value
    elif key == "SEO_TITLE":
        result["seo_title"] = value[:60]
    elif key == "SEO_DESCRIPTION":
        result["seo_description"] = value[:155]


def generate_strategy(
    traffic_data: str,
    content_performance: str,
    competitor_news: str,
    current_queue: str,
    traffic_scores: str = "",
    *,
    gsc_digest: dict | None = None,
) -> str:
    """Genera analisi strategica settimanale. Ritorna report strutturato.

    Phase 17 (PLAN 17-03): gsc_digest kwarg opzionale per iniettare GSC weekly
    digest nel prompt. Backward compat preservata: caller esistenti continuano
    a funzionare senza modifiche (default None -> nessun blocco GSC nel prompt).

    gsc_digest shape (4 keys):
      - summary_delta: dict con delta_clicks_pct/delta_pos vs prev 7d
      - striking_top10: list of {query, position, impressions, clicks, ctr}
      - ctr_opportunity_top10: list of {url, position, impressions, clicks, ctr, benchmark_ctr, gap_pct}
      - declining_top10: list of {url, clicks_7d, clicks_prev_7d_avg, decay_pct, position_drift}
    """
    traffic_section = ""
    if traffic_scores:
        traffic_section = f"""
=== PER-ARTICLE TRAFFIC DATA ===
{traffic_scores}

Use this data to:
- Prioritize refresh/expansion for underperforming content with high potential
- Identify top performers to replicate their patterns
- Flag content that has been declining (30d >> 7d*4 indicates downtrend)
"""

    gsc_block = ""
    if gsc_digest:
        sd = gsc_digest.get("summary_delta", {}) or {}
        sd_text = (
            f"Delta vs prev 7d: clicks {sd.get('delta_clicks_pct', 0):+.1f}%, "
            f"avg pos {sd.get('delta_pos', 0):+.2f}"
        )
        striking_text = "\n".join(
            f"  - \"{q['query']}\" pos {q['position']}, "
            f"{q['impressions']} imp, {q['ctr']:.1%}"
            for q in gsc_digest.get("striking_top10", [])[:10]
        )
        opp_text = "\n".join(
            f"  - {o['url']} pos {o['position']}, "
            f"gap {o.get('gap_pct', 0):.0f}% below benchmark"
            for o in gsc_digest.get("ctr_opportunity_top10", [])[:10]
        )
        decl_text = "\n".join(
            f"  - {d['url']} decay {d.get('decay_pct', 0)}% "
            f"(clicks 7d {d.get('clicks_7d', 0)} vs avg {d.get('clicks_prev_7d_avg', 0)})"
            for d in gsc_digest.get("declining_top10", [])[:10]
        )
        gsc_block = f"""

=== GSC WEEKLY DIGEST ===
{sd_text}

Top 10 STRIKING DISTANCE (pos 8-20, imp>=30):
{striking_text or "  (none)"}

Top 10 CTR OPPORTUNITY (pos 1-10, below benchmark):
{opp_text or "  (none)"}

Top 10 DECLINING (decay >=30%, imp>=200):
{decl_text or "  (none)"}

REQUIREMENT: at least 3 recommendations MUST reference specific GSC metrics
(clicks/impressions/CTR/position/striking/decay) when GSC WEEKLY DIGEST is non-empty.
"""

    prompt = f"""Sei lo strategy advisor di BBQ Experience (bbq-experience.com).
Analizza i dati della settimana e genera un piano d'azione.

DATI TRAFFICO:
{traffic_data}

PERFORMANCE CONTENUTI:
{content_performance}
{traffic_section}
NOVITA COMPETITOR:
{competitor_news}

CODA ATTUALE:
{current_queue}
{gsc_block}
Genera un report con:
1. TOP INSIGHT: la cosa piu importante emersa dai dati (1-2 frasi)
2. CONTENUTI DA PRIORITIZZARE: 3 topic specifici con keyword e motivazione
3. CONTENUTI DA DEPRIORITIZZARE: topic che non performano, da mettere in pausa
4. CLUSTER FOCUS: quale dei 5 cluster (smoking, grills, thermometers, brisket, sauces) merita piu attenzione questa settimana e perche
5. AZIONI IMMEDIATE: 2-3 azioni concrete per la settimana
6. PILLAR CONTENT OUTLINE: se e il momento giusto, outline per un pillar article (5000 parole)

When recommending content for the queue, note which items were selected based on traffic_score data.

Sii conciso e pratico. Zero fuffa."""
    return ask(prompt, timeout=300, enable_thinking=True)


def generate_pillar_content(
    title: str,
    keyword: str,
    cluster: str,
    outline: str,
) -> str:
    """Genera un pillar article completo (~5000 parole). Usa thinking + max context."""
    prompt = f"""Scrivi un articolo pillar completo per BBQ Experience.

TITOLO: {title}
KEYWORD TARGET: {keyword}
CLUSTER: {cluster}

OUTLINE:
{outline}

REQUISITI:
- 4000-5000 parole in inglese
- Struttura: intro potente, 8-12 sezioni con H2/H3, conclusione, FAQ (5-8 domande)
- Tag HTML per formattazione (h2, h3, p, ul, li, strong, em, table)
- La keyword deve apparire nel primo paragrafo, in almeno 3 H2, e nel summary
- Tono "The Pitmaster": esperto, diretto, dati concreti (temperature in F, tempi, pesi in lbs)
- Includi tabelle comparative dove appropriato
- Ogni sezione deve avere un takeaway pratico
- NO intro generiche ("BBQ is a beloved..."), vai dritto al punto
- Questo deve essere IL contenuto di riferimento su internet per questo topic

Genera SOLO il contenuto HTML (no html/head/body wrapper)."""
    return ask(prompt, timeout=900, max_tokens=8192, enable_thinking=True)


# ─── Multi-step generation (outline -> sezioni -> assembly) ───
# Attivata da MULTI_STEP=1 in content_generator.py. Quality > single-shot a costo
# di ~3-5 min/articolo (vs 30-60s single-shot).

def _extract_json(raw: str) -> dict:
    """Estrae blocco JSON dal testo, tollerante a prefissi/suffissi e markdown fence."""
    import re
    text = raw.strip()
    # Strip markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    # Trova il primo { e l'ultimo }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"Nessun JSON trovato in:\n{raw[:500]}")
    return json.loads(text[start : end + 1])


def _generate_outline(
    title: str,
    keyword: str,
    cluster: str,
    content_type: str,
    *,
    gsc_queries: list[dict] | None = None,
) -> dict:
    """Phase 1: outline JSON con sezioni + key points + word target.

    Phase 17 priming: se gsc_queries e' non-vuoto, inietta le top 5 query
    reali GSC nel prompt per ancorare le H2 alle query che gia portano
    impressions/clicks reali (graceful degrade quando assente).
    """
    sys_prompt = "You are a senior BBQ editor. Output STRICT JSON only, no prose, no markdown fences."

    gsc_block = ""
    if gsc_queries:
        # Supporta sia shape {"query": "..."} (content_generator main) che
        # {"keys": ["..."]} (GSC raw rows da queries_for_page).
        lines = []
        for q in gsc_queries[:5]:
            qtext = q.get("query") or (q.get("keys", [""])[0] if q.get("keys") else "")
            if not qtext:
                continue
            lines.append(
                f"- {qtext} (clicks {q.get('clicks', 0)}, "
                f"pos {q.get('position', 0):.1f})"
            )
        if lines:
            gsc_block = (
                "\n\nREAL GOOGLE QUERIES (last 28d) bringing or trying to bring "
                "traffic — use these to shape H2 sections AND mirror their phrasing:\n"
                + "\n".join(lines) + "\n"
            )

    user_prompt = f"""Generate an outline for a BBQ Experience article.

Title: {title}
Target keyword: {keyword}
Cluster: {cluster}
Content type: {content_type}
Total target: 1800-2200 words
{gsc_block}
Output ONLY valid JSON in this exact shape:
{{
  "intro_angle": "1-sentence angle that hooks the pitmaster reader (no generic openings)",
  "sections": [
    {{"h2": "Section 2 title (must be specific, not generic)", "key_points": ["...", "...", "..."], "target_words": 320}},
    ...
  ],
  "faq_topics": ["specific question 1", "specific question 2", "...", "..."]
}}

Rules:
- 6-8 sections, each 250-400 target_words.
- Keyword "{keyword}" MUST appear in at least 2 H2s.
- Each section has 3-5 concrete key_points (data, temps, processes).
- 4-5 faq_topics, all answerable with specific data.
- NO generic openers ("BBQ is loved...").
- No backticks, no commentary, JSON only."""
    raw = ask(user_prompt, system=sys_prompt, max_tokens=2048, timeout=180, enable_thinking=False)
    outline = _extract_json(raw)
    if not outline.get("sections"):
        raise ValueError(f"Outline senza sections: {outline}")
    return outline


def _generate_section(
    title: str,
    keyword: str,
    cluster: str,
    section: dict,
    idx: int,
    total: int,
) -> str:
    """Phase 2: genera una singola sezione H2 (HTML) — focused prompt = better depth."""
    sys_prompt = (
        "You are 'The Pitmaster', a brutally honest BBQ expert writing for bbq-experience.com. "
        "Direct, technical, real numbers (F, lbs, hours). Zero marketing BS. "
        "Output is HTML fragment only."
    )
    h2 = section.get("h2", "Section")
    points = section.get("key_points", [])
    words = section.get("target_words", 320)
    points_md = "\n".join(f"- {p}" for p in points)
    user_prompt = f"""Article title: "{title}"
Cluster: {cluster}
Target keyword: {keyword}
Section {idx + 1}/{total}: {h2}

Cover these key points (each with concrete data, not platitudes):
{points_md}

Constraints:
- Open with <h2>{h2}</h2>
- Use <h3>, <p>, <ul><li>, <strong> as needed
- {words} words +/- 50
- Include specific numbers (temperatures in F, times in min/hours, weights in lbs/oz, prices in USD)
- 1 actionable takeaway near the end of the section (in <p><strong>Takeaway:</strong> ...</p>)
- NO meta commentary, NO "in this section", NO generic transitions

Output: ONLY the HTML fragment for this single section. No markdown fences. No intro/outro text. Start with <h2>, end with the last </p> of this section."""
    return ask(user_prompt, system=sys_prompt, max_tokens=2048, timeout=240, enable_thinking=False).strip()


def _assemble_article(
    title: str,
    keyword: str,
    cluster: str,
    sections_html: list[str],
    faq_topics: list[str],
    intro_angle: str,
) -> str:
    """Phase 3: combina sezioni + intro + conclusione + FAQ in HTML finale."""
    sys_prompt = (
        "You are 'The Pitmaster' senior editor. Assemble + add intro/conclusion/FAQ. "
        "Preserve every section as-is unless transitions are clearly broken. "
        "Output is full HTML body fragment only."
    )
    sections_combined = "\n\n".join(sections_html)
    faq_md = "\n".join(f"- {q}" for q in faq_topics)
    user_prompt = f"""Article title: "{title}"
Target keyword: {keyword}
Cluster: {cluster}
Hook angle: {intro_angle}

Existing sections (already drafted, KEEP THEIR CONTENT):
{sections_combined}

Tasks (in this order):
1. Write a 130-160 word intro that opens with the hook angle, mentions the keyword "{keyword}" naturally, and sets up the article. NO "BBQ has been a beloved tradition" / generic openings.
2. Output the existing sections UNCHANGED in order.
3. Write a 130-160 word conclusion that ties back to the hook + 1 strong takeaway.
4. Add an FAQ section <h2>Frequently Asked Questions</h2> with these 4-5 questions answered concretely (each <h3>Question</h3><p>Answer with data</p>):
{faq_md}

Constraints:
- Output: full HTML body fragment (no <html>/<head>/<body>, no markdown fences)
- The keyword "{keyword}" MUST appear in the intro paragraph.
- Each section must remain present and intact.
- Total: 1800-2400 words.

Output: ONLY the HTML, starting with <p> (intro) and ending with the last </p> of the FAQ."""
    return ask(user_prompt, system=sys_prompt, max_tokens=8192, timeout=600, enable_thinking=False).strip()


def generate_article_multistep(
    title: str,
    keyword: str,
    cluster: str,
    content_type: str,
    *,
    gsc_queries: list[dict] | None = None,
) -> dict:
    """Pipeline: outline -> sezioni -> assembly. Stessa signature di generate_article single-shot.

    Phase 17 priming (gsc_queries opzionale):
    - Se presente: iniettato nel prompt outline (vedi _generate_outline) E le
      top 3 query reali vengono prepended a faq_topics per ancorare l'assembly
      alle vere query Google.
    - Se assente/None/[]: comportamento identico a pre-Phase 17 (graceful degrade).

    Ritorna dict con keys: content, excerpt, seo_title, seo_description.
    """
    print("[multistep] phase 1/3: outline")
    outline = _generate_outline(title, keyword, cluster, content_type,
                                 gsc_queries=gsc_queries)
    sections = outline.get("sections", [])
    print(f"[multistep] outline: {len(sections)} sezioni, faq={len(outline.get('faq_topics', []))}")

    print("[multistep] phase 2/3: sezioni")
    sections_html = []
    for i, sec in enumerate(sections):
        print(f"[multistep]   sezione {i + 1}/{len(sections)}: {sec.get('h2', '?')[:60]}")
        html = _generate_section(title, keyword, cluster, sec, i, len(sections))
        # Normalizza: rimuovi markdown fences se presenti
        if "```" in html:
            parts = html.split("```")
            html = max(parts, key=len).strip()
            if html.startswith("html"):
                html = html[4:].strip()
        sections_html.append(html)

    # FAQ topics: se gsc_queries presenti, prepend top 3 query come candidate
    # FAQ. Dedup mantenendo l'ordine (real queries first, original outline FAQ
    # come fallback). Cap a 5 totali per non saturare l'assembly prompt.
    faq_topics = outline.get("faq_topics", []) or []
    if gsc_queries:
        real_qs: list[str] = []
        for q in gsc_queries[:3]:
            qtext = q.get("query") or (q.get("keys", [""])[0] if q.get("keys") else "")
            if qtext:
                real_qs.append(qtext)
        # dedup preserving order
        faq_topics = list(dict.fromkeys(real_qs + faq_topics))[:5]

    print("[multistep] phase 3/3: assembly")
    final_html = _assemble_article(
        title=title,
        keyword=keyword,
        cluster=cluster,
        sections_html=sections_html,
        faq_topics=faq_topics,
        intro_angle=outline.get("intro_angle", ""),
    )
    if "```" in final_html:
        parts = final_html.split("```")
        final_html = max(parts, key=len).strip()
        if final_html.startswith("html"):
            final_html = final_html[4:].strip()

    word_count = len(final_html.split())
    print(f"[multistep] final: {word_count} parole")

    # SEO meta (single-shot per excerpt+seo)
    seo_prompt = f"""For this BBQ article titled "{title}" with keyword "{keyword}", generate:

1. An excerpt for search results (1-2 sentences, max 155 characters, plain text, no HTML)
2. SEO title (max 60 characters, must include the keyword)
3. Meta description (max 155 characters, must include the keyword, with call to action)

Reply in this EXACT format (3 lines, nothing else):
EXCERPT: ...
SEO_TITLE: ...
SEO_DESCRIPTION: ..."""
    seo_raw = ask(seo_prompt, max_tokens=512, timeout=120, enable_thinking=False)

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
        excerpt = (final_html[:155].split(".")[0] + ".").strip()
    if not seo_description:
        seo_description = excerpt[:155]

    return {
        "content": final_html,
        "excerpt": excerpt,
        "seo_title": seo_title,
        "seo_description": seo_description,
    }
