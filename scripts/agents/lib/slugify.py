"""Slugify condiviso — unica fonte di verità per gli slug URL-safe degli agenti.

Replica esattamente la logica storica di content_generator.generate_slug.
Centralizzato qui in lib/ per evitare import circolari: content_generator,
ig_to_content e keyword_scout possono importarlo indipendentemente, senza
passare l'uno per l'altro (content_generator già importa keyword_scout).
"""

import re


def slugify(title: str) -> str:
    """Genera slug URL-safe dal titolo.

    Pipeline: lower -> strip -> rimuovi [^a-z0-9\\s-] -> spazi -> '-' ->
    collapse '-+' -> tronca a 80 -> strip '-' di bordo.
    Deve restare allineato allo slug generato da Strapi al publish.
    """
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:80].strip("-")
