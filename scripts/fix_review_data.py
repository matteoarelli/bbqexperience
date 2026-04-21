#!/usr/bin/env python3
"""Script di migrazione one-shot per correggere dati prodotto in Strapi.

Popola prezzi mancanti, collega brand_relation, e ricategorizza pellet grill.
Usato durante Phase 13 (review-filters-taxonomy) per garantire che i filtri
abbiano dati completi su cui operare.

PREREQUISITO: L'API token deve avere permessi di lettura su:
  - products (find, findOne, update)
  - brands (find)
  - product-categories (find)
Se mancano i permessi, lo script segnala l'errore e continua con le sezioni
che può eseguire.
"""

import argparse
import os
import sys
from datetime import datetime, timezone

# Aggiungi root progetto al path per import moduli agenti
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scripts.agents.lib.strapi_client import find, update, find_all_pages

# --- Sezione 1: Prezzi stimati in EUR ---
# Stime basate su prezzi retail tipici — Matteo verificherà e correggerà in Strapi admin
# Slug allineati ai dati di produzione (verificati 2026-04-21)
PRICE_ESTIMATES: dict[str, float] = {
    # Grill
    "weber-summit-s-470-gas-grill": 1499.00,
    "weber-kettle-premium-22": 199.00,
    "lodge-cast-iron-sportsman-grill": 189.00,
    "char-broil-kettleman-tru-infrared": 159.00,
    "napoleon-prestige-pro-500": 1299.00,
    "kamado-joe-classic-iii": 1899.00,
    "big-green-egg-large": 1299.00,
    # Smoker
    "oklahoma-joes-highland-offset-smoker": 349.00,
    "pit-boss-navigator-850": 699.00,
    "yoder-ys640s": 1999.00,
    # Pellet Grill (da ricategorizzare in sezione 3)
    "traeger-ironwood-885-pellet-smoker": 1599.00,
    "camp-chef-woodwind-wifi-24": 799.00,
    # Termometri
    "thermoworks-thermapen-one": 99.00,
    "thermoworks-signals": 229.00,
    "meater-plus-wireless-thermometer": 109.00,
    "inkbird-ibbq-4t-wifi-thermometer": 49.00,
    # Accessori
    "weber-rapidfire-chimney-starter": 24.00,
    "grillgrate-sear-station": 89.00,
    "flame-boss-500": 349.00,
    "fireboard-2-drive": 279.00,
    "thermacell-patio-shield": 39.00,
    "ironwood-cutting-board-juice-channel": 59.00,
    # Combustibili/Carbone
    "fogo-super-premium-charcoal": 34.00,
    "jealous-devil-lump-charcoal": 29.00,
    "kingsford-professional-briquettes": 22.00,
    "royal-oak-lump-charcoal": 18.00,
}

# --- Sezione 2: Correzione brand_relation mancanti ---
# Mappa slug prodotto -> slug brand per TUTTI i 25 prodotti
# Lo script collegherà solo quelli che attualmente hanno brand_relation NULL
BRAND_FIXES: dict[str, str] = {
    "weber-summit-s-470-gas-grill": "weber",
    "weber-kettle-premium-22": "weber",
    "weber-rapidfire-chimney-starter": "weber",
    "lodge-cast-iron-sportsman-grill": "lodge",
    "char-broil-kettleman-tru-infrared": "char-broil",
    "napoleon-prestige-pro-500": "napoleon",
    "kamado-joe-classic-iii": "kamado-joe",
    "big-green-egg-large": "big-green-egg",
    "oklahoma-joes-highland-offset-smoker": "oklahoma-joes",
    "pit-boss-navigator-850": "pit-boss",
    "yoder-ys640s": "yoder",
    "traeger-ironwood-885-pellet-smoker": "traeger",
    "camp-chef-woodwind-wifi-24": "camp-chef",
    "thermoworks-thermapen-one": "thermoworks",
    "thermoworks-signals": "thermoworks",
    "meater-plus-wireless-thermometer": "meater",
    "inkbird-ibbq-4t-wifi-thermometer": "inkbird",
    "grillgrate-sear-station": "grillgrate",
    "flame-boss-500": "flame-boss",
    "fireboard-2-drive": "fireboard",
    "thermacell-patio-shield": "thermacell",
    "ironwood-cutting-board-juice-channel": "ironwood",
    "fogo-super-premium-charcoal": "fogo",
    "jealous-devil-lump-charcoal": "jealous-devil",
    "kingsford-professional-briquettes": "kingsford",
    "royal-oak-lump-charcoal": "royal-oak",
}

# --- Sezione 3: Ricategorizzazione pellet grill ---
# Questi prodotti sono attualmente in "Smoker" ma devono stare in "Pellet Grill"
PELLET_RECLASSIFY: list[str] = [
    "traeger-ironwood-885-pellet-smoker",
    "camp-chef-woodwind-wifi-24",
]


def _log(msg: str) -> None:
    """Stampa messaggio con timestamp UTC."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")


def _get_product_map() -> dict[str, dict]:
    """Recupera tutti i prodotti e crea mappa slug -> {documentId, slug, ...}."""
    products = find_all_pages(
        "products",
        locale="en",
        status="published",
        populate="*",
    )
    product_map: dict[str, dict] = {}
    for p in products:
        slug = p.get("slug", "")
        if slug:
            product_map[slug] = p
    return product_map


def _get_brand_map() -> dict[str, str]:
    """Recupera tutti i brand e crea mappa slug -> documentId.

    Ritorna dict vuoto se l'API restituisce 403 (permessi mancanti).
    """
    try:
        brands = find_all_pages(
            "brands",
            locale="en",
            status="published",
        )
        return {b.get("slug", ""): b["documentId"] for b in brands if b.get("slug")}
    except RuntimeError as e:
        if "403" in str(e):
            _log("ERROR: API token non ha permessi di lettura su 'brands'.")
            _log("       Vai in Strapi Admin -> Settings -> API Tokens -> il tuo token")
            _log("       e abilita Brand: find, findOne")
            return {}
        raise


def _get_category_id(slug: str) -> str | None:
    """Recupera documentId di una categoria prodotto dato lo slug.

    Ritorna None se l'API restituisce 403 (permessi mancanti).
    """
    try:
        resp = find(
            "product-categories",
            locale="en",
            status="published",
            filters={"slug": {"$eq": slug}},
        )
        data = resp.get("data", [])
        if data:
            return data[0]["documentId"]
        return None
    except RuntimeError as e:
        if "403" in str(e):
            _log("ERROR: API token non ha permessi di lettura su 'product-categories'.")
            _log("       Vai in Strapi Admin -> Settings -> API Tokens -> il tuo token")
            _log("       e abilita ProductCategory: find, findOne")
            return None
        raise


def section_1_prices(product_map: dict[str, dict], dry_run: bool) -> int:
    """Popola prezzi prodotto con stime EUR. Ritorna conteggio aggiornamenti."""
    _log("=== SEZIONE 1: Popolamento prezzi ===")
    updated = 0

    for slug, product in product_map.items():
        if slug in PRICE_ESTIMATES:
            price = PRICE_ESTIMATES[slug]
            doc_id = product["documentId"]
            if dry_run:
                _log(f"[DRY-RUN] Aggiornerei prezzo per {slug}: EUR {price:.2f}")
            else:
                update("products", doc_id, {"price": price})
                _log(f"Updated price for {slug}: EUR {price:.2f}")
            updated += 1
        else:
            _log(f"WARNING: No price estimate for {slug} — set manually in Strapi admin")

    _log(f"Sezione 1 completata: {updated} prezzi {'da aggiornare' if dry_run else 'aggiornati'}")
    return updated


def section_2_brands(product_map: dict[str, dict], brand_map: dict[str, str], dry_run: bool) -> int:
    """Collega brand_relation mancanti. Ritorna conteggio aggiornamenti."""
    _log("=== SEZIONE 2: Correzione brand_relation ===")

    if not brand_map:
        _log("SKIP: Nessun brand caricato (probabilmente permessi API mancanti). Sezione 2 saltata.")
        return 0

    updated = 0

    for product_slug, brand_slug in BRAND_FIXES.items():
        if product_slug not in product_map:
            _log(f"WARNING: Prodotto '{product_slug}' non trovato in Strapi — skip")
            continue

        product = product_map[product_slug]
        doc_id = product["documentId"]

        # Salta se il prodotto ha già brand_relation impostato
        existing_brand = product.get("brand_relation")
        if existing_brand is not None:
            _log(f"OK: {product_slug} ha già brand_relation — skip")
            continue

        # Controlla se il brand esiste
        if brand_slug not in brand_map:
            _log(f"WARNING: Brand '{brand_slug}' not found in Strapi — create it manually")
            continue

        brand_doc_id = brand_map[brand_slug]
        if dry_run:
            _log(f"[DRY-RUN] Collegherei {product_slug} -> brand '{brand_slug}' ({brand_doc_id})")
        else:
            update("products", doc_id, {"brand_relation": brand_doc_id})
            _log(f"Linked {product_slug} -> brand '{brand_slug}'")
        updated += 1

    _log(f"Sezione 2 completata: {updated} brand {'da collegare' if dry_run else 'collegati'}")
    return updated


def section_3_pellet_grills(product_map: dict[str, dict], dry_run: bool) -> int:
    """Ricategorizza pellet grill da Smoker a Pellet Grill. Ritorna conteggio."""
    _log("=== SEZIONE 3: Ricategorizzazione pellet grill ===")

    pellet_cat_id = _get_category_id("pellet-grill")
    if not pellet_cat_id:
        _log("ERROR: Categoria 'pellet-grill' non trovata o non accessibile! Sezione 3 saltata.")
        return 0

    updated = 0
    for slug in PELLET_RECLASSIFY:
        if slug not in product_map:
            _log(f"WARNING: Prodotto '{slug}' non trovato — skip ricategorizzazione")
            continue

        doc_id = product_map[slug]["documentId"]
        if dry_run:
            _log(f"[DRY-RUN] Ricategorizzerei {slug} -> pellet-grill ({pellet_cat_id})")
        else:
            update("products", doc_id, {"product_category": pellet_cat_id})
            _log(f"Recategorized {slug} to pellet-grill")
        updated += 1

    _log(f"Sezione 3 completata: {updated} prodotti {'da ricategorizzare' if dry_run else 'ricategorizzati'}")
    return updated


def main() -> None:
    """Entrypoint principale — esegue le 3 sezioni in ordine."""
    parser = argparse.ArgumentParser(
        description="Corregge dati prodotto: prezzi, brand, categorie pellet grill"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra modifiche senza scrivere su Strapi",
    )
    args = parser.parse_args()

    if args.dry_run:
        _log("*** MODALITA' DRY-RUN — nessuna modifica verra' scritta ***")

    # Carica dati da Strapi
    _log("Caricamento prodotti da Strapi...")
    product_map = _get_product_map()
    _log(f"Trovati {len(product_map)} prodotti")

    _log("Caricamento brand da Strapi...")
    brand_map = _get_brand_map()
    _log(f"Trovati {len(brand_map)} brand")

    # Esegui le 3 sezioni
    prices_count = section_1_prices(product_map, args.dry_run)
    brands_count = section_2_brands(product_map, brand_map, args.dry_run)
    pellet_count = section_3_pellet_grills(product_map, args.dry_run)

    # Riepilogo finale
    _log("=" * 50)
    _log(f"RIEPILOGO: Updated {prices_count} prices, {brands_count} brand relations, {pellet_count} category reassignments")
    if args.dry_run:
        _log("*** Nessuna modifica scritta (dry-run). Rilanciare senza --dry-run per applicare. ***")

    # Segnala se ci sono sezioni saltate per permessi
    if not brand_map:
        _log("")
        _log("AZIONE RICHIESTA: Aggiornare permessi API token in Strapi admin per brands e product-categories,")
        _log("                  poi rilanciare lo script.")


if __name__ == "__main__":
    main()
