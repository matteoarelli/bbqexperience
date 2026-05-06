#!/usr/bin/env python3
"""Cover image generator — chiama SDXL su Windows .124:8085 per generare cover image
per articoli Strapi pubblicati nelle ultime 26h senza cover_image.

Cron: 6:10 AM (10 min dopo SDXL up). Finestra SD: 6:00-6:50.
SDXL e Qwen non possono coesistere in VRAM (3090) -> swap controllato dai task Windows
'switch-to-sd.cmd' (6:00) e 'switch-to-qwen.cmd' (6:50).
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import time
import urllib.request
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

SD_URL = os.environ.get("SD_URL", "http://192.168.1.124:8085")
SD_HEALTH_TIMEOUT_SEC = int(os.environ.get("SD_HEALTH_TIMEOUT_SEC", "180"))
COVER_WIDTH = 1216
COVER_HEIGHT = 832
SD_STEPS = 28

CONTENT_TYPES_WITH_COVER = ["blog-posts", "tutorials", "recipes"]

NEGATIVE_PROMPT = (
    "text, watermark, signature, logo, label, blurry, low quality, distorted, "
    "deformed, bad anatomy, ugly, cropped, worst quality, jpeg artifacts, oversaturated"
)


def wait_for_sd_ready(max_seconds: int = SD_HEALTH_TIMEOUT_SEC) -> bool:
    deadline = time.time() + max_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{SD_URL}/health", timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("ok"):
                    return True
        except Exception:
            pass
        time.sleep(5)
    return False


def build_prompt(title: str, keyword: str, cluster: str, content_type_raw: str) -> str:
    topic = (keyword or title).strip()
    topic = re.sub(r"[^A-Za-z0-9 \-/]", "", topic)
    topic = re.sub(r"\s+", " ", topic)[:120]

    if content_type_raw == "recipe":
        scene = f"close-up shot of {topic} dish"
        style = "appetizing food photography, glistening sauces, steam rising, garnish detail"
    elif content_type_raw == "tutorial":
        scene = f"hands of pitmaster working on {topic}"
        style = "behind-the-scenes documentary photography, action shot, technical detail"
    else:
        scene = f"hero shot featuring {topic}"
        style = "editorial photography, magazine quality, dramatic mood"

    prompt = (
        f"Professional BBQ photography, {scene}, "
        f"glowing embers and gentle smoke, dark moody atmosphere, "
        f"warm orange and amber rim lighting, charred wood textures, "
        f"shallow depth of field, sharp focus on subject, "
        f"{style}, "
        f"cinematic 16:9 wide composition, photorealistic, ultra detailed, 8k quality"
    )
    return prompt


def generate_image(prompt: str, seed: int | None = None) -> bytes:
    body = json.dumps({
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "width": COVER_WIDTH,
        "height": COVER_HEIGHT,
        "steps": SD_STEPS,
        "guidance_scale": 6.5,
        "seed": seed,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{SD_URL}/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


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


def attach_cover(content_type: str, document_id: str, media_id: int) -> None:
    strapi.update(content_type, document_id, {"cover_image": media_id})


def build_filename(content_type: str, slug: str) -> str:
    safe_slug = re.sub(r"[^a-z0-9-]", "-", (slug or "cover").lower())[:60]
    return f"cover-{content_type}-{safe_slug}.png"


def process_one(content_type: str, item: dict) -> tuple[bool, str]:
    doc_id = item.get("documentId") or item.get("id")
    title = item.get("title", "Untitled")
    slug = item.get("slug", "")
    keyword = item.get("target_keyword") or title
    cluster = item.get("cluster") or ""
    content_type_raw = "blog" if content_type == "blog-posts" else (
        "tutorial" if content_type == "tutorials" else "recipe"
    )

    prompt = build_prompt(title, keyword, cluster, content_type_raw)
    print(f"  Prompt: {prompt[:140]}...")

    try:
        png_bytes = generate_image(prompt, seed=hash(doc_id) & 0xFFFFFFFF)
    except Exception as e:
        return False, f"SD generate error: {e}"

    filename = build_filename(content_type, slug)
    try:
        media_list = strapi.upload_file(png_bytes, filename, mime="image/png")
        media_id = media_list[0]["id"]
        media_url = media_list[0].get("url", "")
    except Exception as e:
        return False, f"Strapi upload error: {e}"

    try:
        attach_cover(content_type, doc_id, media_id)
    except Exception as e:
        return False, f"Strapi attach error: {e}"

    return True, f"{content_type}/{doc_id} → media#{media_id} ({media_url})"


def main() -> int:
    print(f"[{datetime.now().isoformat()}] cover_generator started")

    print(f"Waiting for SDXL @ {SD_URL} (max {SD_HEALTH_TIMEOUT_SEC}s)...")
    if not wait_for_sd_ready():
        msg = f"SDXL endpoint {SD_URL} not ready after {SD_HEALTH_TIMEOUT_SEC}s"
        print(f"[FATAL] {msg}")
        try:
            telegram.send_agent_report("Cover Generator", f"FATAL: {msg}")
        except Exception:
            pass
        return 2

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
            lines.append("Generati:")
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
