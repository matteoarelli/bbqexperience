"""Whitelist loader: pulls catalog products + published articles from Strapi.

Used by claude_quality_gate to ground the Opus review:
  - product links in the article must be in the catalog whitelist
  - blog/recipe/tutorial cross-links must be in the published-articles whitelist

Caches per-process; the Windows scheduled task is a fresh process each tick,
so no cross-tick staleness.
"""
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_HERE.parent))

from agents.lib import strapi_client as strapi


def load_catalog_whitelist(locale: str = "en") -> list[dict]:
    """Pull all published products with brand + price + slug.

    Returns: [{"slug": "weber-smokey-mountain-22", "name": "Weber Smokey Mountain 22\"", "brand": "Weber", "price": 449.0}, ...]
    """
    items = strapi.find_all_pages(
        "products",
        locale=locale,
        status="published",
        populate="brand_relation",
        sort="updatedAt:desc",
    )
    out: list[dict] = []
    for it in items:
        slug = it.get("slug", "")
        name = it.get("name") or it.get("title") or ""
        if not slug or not name:
            continue
        brand_rel = it.get("brand_relation") or {}
        brand = ""
        if isinstance(brand_rel, dict):
            brand = brand_rel.get("name", "")
        price = it.get("price") or it.get("current_price") or None
        out.append({
            "slug": slug,
            "name": name,
            "brand": brand,
            "price": price,
        })
    return out


def load_blog_whitelist(locale: str = "en") -> list[dict]:
    """Pull all published blog posts + recipes + tutorials + reviews.

    Returns: [{"slug": "...", "title": "...", "content_type": "blog-post" | "recipe" | "tutorial" | "review"}, ...]
    """
    out: list[dict] = []
    type_map = [
        ("blog-posts", "blog-post"),
        ("recipes", "recipe"),
        ("tutorials", "tutorial"),
        ("reviews", "review"),
    ]
    for endpoint, label in type_map:
        try:
            items = strapi.find_all_pages(
                endpoint,
                locale=locale,
                status="published",
                sort="published_date:desc",
            )
        except Exception as e:
            # Tolerant: a content type might not exist yet in this env
            print(f"[whitelist] WARN: {endpoint} fetch failed: {e}")
            continue
        for it in items:
            slug = it.get("slug", "")
            title = it.get("title", "")
            if not slug or not title:
                continue
            out.append({
                "slug": slug,
                "title": title,
                "content_type": label,
            })
    return out


if __name__ == "__main__":
    cat = load_catalog_whitelist()
    blog = load_blog_whitelist()
    print(f"catalog: {len(cat)} products")
    for p in cat[:5]:
        print(f"  - {p['brand']} {p['name']} (/{p['slug']}) {p.get('price')}")
    print(f"blog/recipes/tutorials/reviews: {len(blog)} entries")
    for b in blog[:5]:
        print(f"  - [{b['content_type']}] {b['title']} (/{b['slug']})")
