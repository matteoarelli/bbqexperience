"""Client per Claude Code CLI — usa il piano Pro Max come layer di qualita superiore."""

import subprocess
import os
import time

CLAUDE_CMD = os.environ.get("CLAUDE_CMD", "claude")


def ask(
    prompt: str,
    *,
    system: str = "",
    max_tokens: int = 8192,
    timeout: int = 300,
) -> str:
    """Invia prompt a Claude Code CLI in modalita --print. Ritorna il testo generato."""
    full_prompt = prompt
    if system:
        full_prompt = f"[System: {system}]\n\n{prompt}"

    last_error: Exception | None = None

    for attempt in range(3):
        try:
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
        except FileNotFoundError:
            raise RuntimeError(
                f"Claude CLI non trovato ('{CLAUDE_CMD}'). "
                "Installa con: npm install -g @anthropic-ai/claude-code"
            )
        except subprocess.TimeoutExpired:
            last_error = RuntimeError(f"Claude CLI timeout dopo {timeout}s")
        except RuntimeError as e:
            last_error = e

        if attempt < 2:
            wait = [3, 10][attempt]
            print(f"[RETRY] Claude CLI tentativo {attempt + 2}/3 tra {wait}s...")
            time.sleep(wait)

    raise last_error  # type: ignore[misc]


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
    raw = ask(prompt, timeout=600)

    # Parsa la risposta strutturata
    result: dict = {
        "quality_score": 0,
        "issues": [],
        "improved_content": content,  # Fallback all'originale
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

    # Ultimo campo
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
        if len(value) > 100:  # Solo se ha contenuto sostanziale
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
) -> str:
    """Genera analisi strategica settimanale. Ritorna report strutturato."""
    prompt = f"""Sei lo strategy advisor di BBQ Experience (bbq-experience.com).
Analizza i dati della settimana e genera un piano d'azione.

DATI TRAFFICO:
{traffic_data}

PERFORMANCE CONTENUTI:
{content_performance}

NOVITA COMPETITOR:
{competitor_news}

CODA ATTUALE:
{current_queue}

Genera un report con:
1. TOP INSIGHT: la cosa piu importante emersa dai dati (1-2 frasi)
2. CONTENUTI DA PRIORITIZZARE: 3 topic specifici con keyword e motivazione
3. CONTENUTI DA DEPRIORITIZZARE: topic che non performano, da mettere in pausa
4. CLUSTER FOCUS: quale dei 5 cluster (smoking, grills, thermometers, brisket, sauces) merita piu attenzione questa settimana e perche
5. AZIONI IMMEDIATE: 2-3 azioni concrete per la settimana
6. PILLAR CONTENT OUTLINE: se e il momento giusto, outline per un pillar article (5000 parole)

Sii conciso e pratico. Zero fuffa."""
    return ask(prompt, timeout=300)


def generate_pillar_content(
    title: str,
    keyword: str,
    cluster: str,
    outline: str,
) -> str:
    """Genera un pillar article completo (~5000 parole). Usa Claude per massima qualita."""
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
    return ask(prompt, timeout=900)  # 15 min per un pillar
