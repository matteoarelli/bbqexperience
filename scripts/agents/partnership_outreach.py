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
