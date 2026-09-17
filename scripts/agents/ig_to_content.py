#!/usr/bin/env python3
"""
IG-to-Content — Converte post Instagram ad alto engagement in articoli per il sito.

Quando un post IG supera una soglia di engagement, crea automaticamente una entry
nella ContentQueue per espanderlo in un articolo completo.

Flusso: sync-instagram → Strapi (instagram-posts) → questo agente → ContentQueue → content_generator
Cron: Daily 10:00 su 192.168.1.119 (dopo sync-instagram delle */6h).
"""

import json
import os
import sys
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.lib import strapi_client as strapi
from agents.lib import telegram
from agents.lib.slugify import slugify
from agents.keyword_scout import is_acceptable_topic
from agents.lib import claude_client as llm
from agents import queue_quality_audit as queue_audit

# Mappa content_type -> plural Strapi (allineata a content_generator.STRAPI_CONTENT_TYPES)
STRAPI_CONTENT_TYPES = {
    "blog": "blog-posts",
    "tutorial": "tutorials",
    "recipe": "recipes",
    "comparison": "blog-posts",
}


def _published_slug_exists(content_type_strapi: str, slug: str) -> bool:
    """True se esiste già un contenuto pubblicato con questo slug.

    Difensivo: su errore di rete logga e ritorna False (non bloccare l'accodamento
    per un problema transitorio — meglio un eventuale doppione che la pipeline ferma).
    Stesso pattern di content_generator.published_slug_exists.
    """
    if not slug:
        return False
    try:
        resp = strapi.find(content_type_strapi, filters={"slug": {"$eq": slug}}, page_size=1)
        return resp.get("meta", {}).get("pagination", {}).get("total", 0) > 0
    except Exception as e:
        print(f"  [WARN] check slug pubblicato fallito ({content_type_strapi}/{slug}), skip: {e}")
        return False

# Soglia engagement per espansione in articolo
# Scala normalizzata 0.0-1.0 (vedi sync-instagram.mjs). 0.5 ~ top 25% nei dati 2026-05.
MIN_ENGAGEMENT_SCORE = 0.5

# Cluster detection da caption
CLUSTER_KEYWORDS = {
    "smoking": ["smok", "wood", "pellet", "offset", "charcoal smoke"],
    "grills": ["grill", "gas grill", "charcoal grill", "weber", "traeger", "kamado"],
    "thermometers": ["thermometer", "temperature", "probe", "thermapen", "meater", "temp"],
    "brisket": ["brisket", "beef", "flat", "point", "texas"],
    "sauces": ["sauce", "rub", "marinade", "season", "glaze", "mop"],
}


def detect_cluster(caption: str) -> str:
    """Rileva il cluster tematico dalla caption del post IG."""
    caption_lower = caption.lower()
    scores: dict[str, int] = {}
    for cluster, keywords in CLUSTER_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in caption_lower)
        if score > 0:
            scores[cluster] = score

    if scores:
        return max(scores, key=scores.get)
    return "uncategorized"


def extract_topic(caption: str) -> str:
    """Estrae un topic/titolo dalla caption per l'articolo.

    Tronca al word boundary se troppo lungo (no "..." dangling che finirebbe
    letteralmente nel titolo pubblicato — vedi audit 12 mag, articolo
    "Deep Dive: When you marinate pork in Dr Pepper...").
    """
    lines = [l.strip() for l in caption.split("\n") if l.strip() and not l.startswith("#")]
    if not lines:
        return "Untitled BBQ Post"
    topic = lines[0]
    # Rimuovi emoji
    topic = re.sub(r'[^\w\s\-:,.]', '', topic).strip()
    # Tronca al word boundary, no "..."
    if len(topic) > 80:
        topic = topic[:80].rsplit(" ", 1)[0].rstrip(",.:-")
    return topic


def sintetizza_topic(caption: str) -> dict | None:
    """Dal post Instagram ricava un VERO argomento da articolo: {title, keyword}.

    La caption e' lo spunto, non il titolo. Il modello deve capire di cosa parla
    il post (taglio di carne, tecnica, attrezzo) e proporre un titolo da guida e
    la ricerca corrispondente. Ritorna None se dal post non esce niente di
    utile: meglio nessun articolo che un articolo su una didascalia.
    """
    testo = " ".join(l for l in caption.split("\n") if not l.strip().startswith("#"))[:900].strip()
    if len(testo) < 25:
        return None
    prompt = f"""Sei l'editor di bbq-experience.com (barbecue, affumicatura, griglie).
Questo e' il testo di un post Instagram che ha funzionato bene:

\"\"\"{testo}\"\"\"

Ricava UN argomento da articolo del sito. Il post e' solo lo spunto: NON copiare la
frase. Chiediti di cosa parla davvero (taglio di carne, tecnica, attrezzo, ricetta) e
proponi il titolo di una guida utile e la ricerca Google corrispondente.

Regole:
- titolo in inglese, 4-10 parole, senza emoji, senza due punti iniziali, senza slogan
- keyword in inglese minuscolo, 2-6 parole, come la scriverebbe una persona su Google
- se il post non riguarda barbecue/griglia/affumicatura, o e' solo una foto senza un
  argomento (slogan, saluti, promozione), rispondi con usable=false

Rispondi SOLO con JSON:
{{"usable": true, "title": "...", "keyword": "..."}}"""
    try:
        raw = llm.ask(prompt, max_tokens=300, timeout=120)
        blocco = re.search(r"\{.*\}", raw, re.DOTALL)
        if not blocco:
            return None
        dati = json.loads(blocco.group(0))
    except Exception as e:
        print(f"  [WARN] sintesi topic fallita: {e}")
        return None
    if not dati.get("usable"):
        return None
    title = (dati.get("title") or "").strip().strip('"')
    keyword = (dati.get("keyword") or "").strip().lower()
    if not title or not keyword:
        return None
    return {"title": title, "keyword": keyword}


def get_high_engagement_posts() -> list[dict]:
    """Recupera post IG con engagement sopra la soglia."""
    posts = strapi.find_all_pages(
        "instagram-posts",
        status="draft",
        sort="engagement_score:desc",
        page_size=50,
        fields=["instagram_id", "caption", "engagement_score", "like_count", "comments_count", "permalink"],
    )

    return [p for p in posts if (p.get("engagement_score") or 0) >= MIN_ENGAGEMENT_SCORE]


def get_existing_queue_sources() -> set[str]:
    """Recupera gli instagram_id gia in coda per evitare duplicati."""
    items = strapi.find_all_pages(
        "content-queues",
        status="draft",
        fields=["generation_log"],
    )
    sources: set[str] = set()
    for item in items:
        log = item.get("generation_log", "") or ""
        # Cerca pattern "from_ig:XXXXX" nel log
        match = re.search(r"from_ig:(\S+)", log)
        if match:
            sources.add(match.group(1))
    return sources


def create_content_from_ig(post: dict) -> dict | None:
    """Crea una entry nella ContentQueue da un post IG."""
    caption = post.get("caption", "") or ""
    ig_id = post.get("instagram_id", "")
    engagement = post.get("engagement_score", 0)
    likes = post.get("like_count", 0)
    comments = post.get("comments_count", 0)
    permalink = post.get("permalink", "")

    # SINTESI, NON COPIA (17/09/2026). Prima qui c'era extract_topic(), che
    # prendeva la prima riga della caption come titolo: in coda erano finiti
    # "Deep Dive: ARTERIAL APOCALYPSE." e "Ever thought your brisket could
    # dance Wiggle wiggle wiggle... Discover the". Su 54 voci in coda, 47 erano
    # da buttare. Ora il post Instagram e' solo lo SPUNTO: il titolo e la
    # keyword li costruisce il modello, e se non ne esce un argomento sensato
    # il post viene saltato invece di diventare un articolo.
    sintesi = sintetizza_topic(caption)
    if not sintesi:
        print(f"  [skip ig_id:{ig_id}] nessun argomento sensato ricavabile dalla caption")
        return None
    topic = sintesi["keyword"]
    titolo_sintetico = sintesi["title"]
    cluster = detect_cluster(caption)

    # Filtro qualità condiviso con keyword_scout: stop ai topic stagionali fuori
    # finestra, ai year-modifier stale, ai trailing modifier ("reddit", "uk").
    ok, reason = is_acceptable_topic(topic)
    if not ok:
        print(f"  [skip ig_id:{ig_id}] {topic!r}: {reason}")
        return None

    # Filtro spazzatura + sovrapposizione con gli articoli gia' pubblicati.
    motivo = queue_audit.verifica_topic(titolo_sintetico)
    if motivo:
        print(f"  [skip ig_id:{ig_id}] {titolo_sintetico!r}: {motivo}")
        return None

    # Determina il content type basandosi sul contenuto
    content_type = "blog"
    caption_lower = caption.lower()
    if any(w in caption_lower for w in ["recipe", "cook", "how to make", "ingredients"]):
        content_type = "recipe"
    elif any(w in caption_lower for w in ["guide", "tutorial", "how to", "step by step"]):
        content_type = "tutorial"
    elif any(w in caption_lower for w in ["review", "tested", "score", "verdict"]):
        content_type = "blog"  # Reviews manuali, blog per espansioni

    # Niente piu' prefisso "Deep Dive:": era il marchio di fabbrica delle
    # caption incollate. Il titolo arriva dalla sintesi ed e' gia' un titolo.
    title = titolo_sintetico

    # Dedup a monte: se lo slug derivato esiste già pubblicato, non accodare
    # (eviterebbe poi il 400 "slug must be unique" al gate).
    slug = slugify(title)
    ct = STRAPI_CONTENT_TYPES.get(content_type, "blog-posts")
    if _published_slug_exists(ct, slug):
        print(f"  [skip ig_id:{ig_id}] slug già pubblicato: {slug}")
        return None

    try:
        resp = strapi.create("content-queues", {
            "title": title,
            "content_type": content_type,
            "status": "ready",
            "cluster": cluster,
            "target_keyword": topic.lower().replace(":", "").strip(),
            "difficulty": "low",
            "priority": 3,  # Priorita media-alta (da engagement reale)
            "ai_generated": True,
            "generation_log": (
                f"from_ig:{ig_id} | engagement:{engagement:.2f} | "
                f"likes:{likes} comments:{comments} | {permalink}"
            ),
        })
        return resp.get("data")
    except Exception as e:
        print(f"[ERRORE] Creazione ContentQueue fallita: {e}")
        return None


def main():
    print(f"[{datetime.now().isoformat()}] IG-to-Content avviato")

    # Recupera post ad alto engagement
    high_posts = get_high_engagement_posts()
    print(f"Post IG con engagement >= {MIN_ENGAGEMENT_SCORE}: {len(high_posts)}")

    if not high_posts:
        print("Nessun post ad alto engagement da espandere")
        return

    # Filtra quelli gia in coda
    existing = get_existing_queue_sources()
    new_posts = [p for p in high_posts if p.get("instagram_id", "") not in existing]
    print(f"Post non ancora in coda: {len(new_posts)}")

    if not new_posts:
        print("Tutti i post ad alto engagement sono gia stati processati")
        return

    # Crea max 2 entry per run (non sovraccaricare la coda)
    created: list[str] = []
    for post in new_posts[:2]:
        result = create_content_from_ig(post)
        if result:
            title = result.get("title", "?")
            created.append(
                f"<b>{title}</b> "
                f"(engagement: {post.get('engagement_score', 0):.2f}, "
                f"likes: {post.get('like_count', 0)})"
            )
            print(f"Creato: {title}")

    if created:
        telegram.send_agent_report(
            "IG-to-Content",
            f"{len(created)} post virali convertiti in articoli per il sito",
            created,
        )

    print(f"[{datetime.now().isoformat()}] IG-to-Content completato")


if __name__ == "__main__":
    main()
