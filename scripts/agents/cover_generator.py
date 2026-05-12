#!/usr/bin/env python3
"""Cover image generator — compone cover da stock photo + title overlay.

Strategia post-2026-05-12 (rifiuto SDXL): le cover sono assemblate da
fotografie reali curate dall'editor (state/stock-covers/<bucket>/*.jpg)
con un overlay gradient + titolo sovrapposto via Pillow. Niente AI
generation per le immagini — solo composizione editoriale.

Motivazione: SDXL hallucina display digitali, loghi, testo (es. cover
del thermometer review aveva "ne ce" e cifre scrambled). Il claim
"Honest BBQ reviews. No BS." è incompatibile con cover AI riconoscibili.

Cron: 6:10 AM Ubuntu .119. Indipendente da Qwen/SDXL VRAM swap.
"""

from __future__ import annotations

import io
import os
import random
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Carica env vars da .env (Ubuntu) / .env.windows (Windows)
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

REPO_ROOT = _script_dir.parent.parent
STOCK_ROOT = REPO_ROOT / "state" / "stock-covers"
FONT_DIR = REPO_ROOT / "state" / "fonts"

COVER_WIDTH = 1216
COVER_HEIGHT = 832

CONTENT_TYPES_WITH_COVER = ["blog-posts", "tutorials", "recipes"]

# Mapping content_type Strapi -> bucket stock dir.
BUCKET_BY_TYPE = {
    "blog-posts": "blog",
    "tutorials": "tutorial",
    "recipes": "recipe",
}


# ─── Stock picker ──────────────────────────────────────────────────────────────

IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp")


def _list_images(folder: Path) -> list[Path]:
    if not folder.exists():
        return []
    return [p for p in folder.iterdir() if p.suffix.lower() in IMG_EXTS and p.is_file()]


def pick_stock_image(bucket: str, doc_id: str) -> Path | None:
    """Pesca deterministicamente un'immagine stock per il bucket dato.

    Deterministic by doc_id hash → stesso articolo ottiene sempre la stessa
    cover se rieseguito (idempotenza). Fallback a 'default/' se bucket vuoto.
    """
    candidates = _list_images(STOCK_ROOT / bucket)
    if not candidates:
        candidates = _list_images(STOCK_ROOT / "default")
    if not candidates:
        return None
    # Deterministic pick
    idx = hash(doc_id) % len(candidates)
    return sorted(candidates)[idx]


# ─── Composer ──────────────────────────────────────────────────────────────────


def _load_font(size: int):
    """Carica Oswald-Bold (o altro TTF curato) da state/fonts/. Fallback PIL default."""
    from PIL import ImageFont
    for fname in ("Oswald-Bold.ttf", "Oswald.ttf", "Inter-Bold.ttf", "Inter.ttf"):
        p = FONT_DIR / fname
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _wrap_text(text: str, font, max_width: int, max_lines: int = 3) -> list[str]:
    """Word-wrap greedy. Tronca a max_lines con '...' se overflow."""
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current: list[str] = []
    for w in words:
        test = " ".join(current + [w])
        bbox = font.getbbox(test)
        if (bbox[2] - bbox[0]) <= max_width:
            current.append(w)
        else:
            if current:
                lines.append(" ".join(current))
            current = [w]
            if len(lines) >= max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(" ".join(current))
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        # Aggiungi ellipsis all'ultima riga
        last = lines[-1]
        while font.getbbox(last + "...")[2] > max_width and len(last) > 1:
            last = last[:-1].rstrip()
        lines[-1] = last + "..."
    return lines


def compose_cover(stock_path: Path, title: str) -> bytes:
    """Apre stock photo, fit to COVER_WIDTHxCOVER_HEIGHT, applica gradient + titolo.

    Output: JPEG bytes 85% quality (~120-200KB per immagine, vs 1-2MB PNG SDXL).
    """
    from PIL import Image, ImageDraw, ImageOps

    img = Image.open(stock_path).convert("RGB")
    img = ImageOps.fit(img, (COVER_WIDTH, COVER_HEIGHT), method=Image.Resampling.LANCZOS)

    # Gradient overlay bottom 60% (trasparente top → nero opaco bottom)
    overlay = Image.new("RGBA", (COVER_WIDTH, COVER_HEIGHT), (0, 0, 0, 0))
    grad_start = int(COVER_HEIGHT * 0.40)
    grad_pixels = overlay.load()
    grad_range = COVER_HEIGHT - grad_start
    for y in range(grad_start, COVER_HEIGHT):
        # Curve esponenziale (più scura sotto)
        ratio = (y - grad_start) / grad_range
        alpha = int(220 * (ratio ** 1.3))
        for x in range(COVER_WIDTH):
            grad_pixels[x, y] = (0, 0, 0, alpha)

    composed = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # Title text bottom-left con shadow
    draw = ImageDraw.Draw(composed)
    title_font = _load_font(size=64)

    max_text_width = int(COVER_WIDTH * 0.85)
    lines = _wrap_text(title, title_font, max_text_width, max_lines=3)

    # Layout: ultima riga a 80px dal bottom, righe sopra in stacking
    bottom_margin = 80
    line_spacing = 12
    left_margin = 48

    # Calcola altezza totale del blocco titolo
    line_heights = []
    for line in lines:
        bbox = title_font.getbbox(line)
        line_heights.append(bbox[3] - bbox[1])
    total_height = sum(line_heights) + line_spacing * max(0, len(lines) - 1)

    y = COVER_HEIGHT - bottom_margin - total_height
    for line, lh in zip(lines, line_heights):
        # Shadow (offset +3,+3, semi-trasparente nero)
        draw.text((left_margin + 3, y + 3), line, fill=(0, 0, 0), font=title_font)
        # Main text bianco
        draw.text((left_margin, y), line, fill="white", font=title_font)
        y += lh + line_spacing

    # Brand watermark top-right
    wm_font = _load_font(size=22)
    wm_text = "BBQ EXPERIENCE"
    wm_bbox = wm_font.getbbox(wm_text)
    wm_w = wm_bbox[2] - wm_bbox[0]
    draw.text((COVER_WIDTH - wm_w - 32 + 1, 32 + 1), wm_text, fill=(0, 0, 0), font=wm_font)
    draw.text((COVER_WIDTH - wm_w - 32, 32), wm_text, fill=(255, 255, 255), font=wm_font)

    buf = io.BytesIO()
    composed.save(buf, format="JPEG", quality=85, optimize=True, progressive=True)
    return buf.getvalue()


# ─── Strapi integration ────────────────────────────────────────────────────────


def find_articles_needing_cover(content_type: str, hours: int = 26) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    resp = strapi.find(
        content_type,
        locale="en",
        status="published",
        page_size=50,
        sort="published_date:desc,createdAt:desc",
        filters={"createdAt": {"$gte": since}},
        populate="cover_image",
        fields=["title", "slug", "documentId"],
    )
    out = []
    for item in resp.get("data", []):
        cover = item.get("cover_image")
        if not cover:
            out.append(item)
    return out


def build_filename(content_type: str, slug: str) -> str:
    safe_slug = re.sub(r"[^a-z0-9-]", "-", (slug or "cover").lower())[:60]
    return f"cover-{content_type}-{safe_slug}.jpg"


def process_one(content_type: str, item: dict) -> tuple[bool, str]:
    doc_id = item.get("documentId") or str(item.get("id", ""))
    title = item.get("title", "Untitled")
    slug = item.get("slug", "")

    bucket = BUCKET_BY_TYPE.get(content_type, "default")
    stock_path = pick_stock_image(bucket, doc_id)
    if not stock_path:
        return False, f"no stock photo in {STOCK_ROOT / bucket} or default/"

    try:
        jpeg_bytes = compose_cover(stock_path, title)
    except Exception as e:
        return False, f"compose error ({stock_path.name}): {e}"

    filename = build_filename(content_type, slug)
    try:
        media_list = strapi.upload_file(jpeg_bytes, filename, mime="image/jpeg")
        media_id = media_list[0]["id"]
        media_url = media_list[0].get("url", "")
    except Exception as e:
        return False, f"Strapi upload error: {e}"

    try:
        strapi.update(content_type, doc_id, {"cover_image": media_id})
    except Exception as e:
        return False, f"Strapi attach error: {e}"

    return True, f"{content_type}/{doc_id} ← {stock_path.name} → media#{media_id} ({media_url})"


def main() -> int:
    print(f"[{datetime.now().isoformat()}] cover_generator started (stock+overlay mode)")

    # Sanity: stock root deve esistere con almeno una directory popolata
    if not STOCK_ROOT.exists():
        msg = f"Stock dir {STOCK_ROOT} non esiste — popola con foto BBQ. Vedi README."
        print(f"[FATAL] {msg}")
        try:
            telegram.send_agent_report("Cover Generator", f"FATAL: {msg}")
        except Exception:
            pass
        return 2

    total_stock = sum(len(_list_images(STOCK_ROOT / b)) for b in (*BUCKET_BY_TYPE.values(), "default"))
    if total_stock == 0:
        msg = f"Stock dir {STOCK_ROOT} vuoto — popola con foto BBQ. Vedi README."
        print(f"[FATAL] {msg}")
        try:
            telegram.send_agent_report("Cover Generator", f"FATAL: {msg}")
        except Exception:
            pass
        return 2

    print(f"Stock catalog: {total_stock} foto totali")

    summary = {"ok": [], "ko": []}
    for ct in CONTENT_TYPES_WITH_COVER:
        try:
            items = find_articles_needing_cover(ct, hours=26)
        except Exception as e:
            print(f"[ERROR] find {ct}: {e}")
            summary["ko"].append(f"{ct} list: {e}")
            continue
        print(f"{ct}: {len(items)} articoli senza cover")
        for item in items:
            doc_id = item.get("documentId")
            title = item.get("title", "Untitled")
            print(f"-> {ct}/{doc_id} '{title}'")
            ok, msg = process_one(ct, item)
            if ok:
                summary["ok"].append(msg)
                print(f"   OK: {msg}")
            else:
                summary["ko"].append(f"{ct}/{doc_id} '{title}': {msg}")
                print(f"   KO: {msg}")

    n_ok = len(summary["ok"])
    n_ko = len(summary["ko"])
    if n_ok or n_ko:
        lines = [f"OK: {n_ok}", f"KO: {n_ko}"]
        if summary["ok"]:
            lines.append("")
            lines.append("Generate:")
            lines.extend(f"- {m}" for m in summary["ok"][:8])
        if summary["ko"]:
            lines.append("")
            lines.append("Errori:")
            lines.extend(f"- {m}" for m in summary["ko"][:5])
        try:
            telegram.send_agent_report("Cover Generator", f"{n_ok} cover generate, {n_ko} errori", lines)
        except Exception as e:
            print(f"[WARN] telegram notify failed: {e}")

    print(f"[{datetime.now().isoformat()}] cover_generator done: ok={n_ok} ko={n_ko}")
    return 0 if n_ko == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
