"""Test per slugify condiviso + guard slug duplicati in content_generator.

Quick task 260522-goj. Nessuna dipendenza di rete: strapi.find/update mockati.
"""

import sys
import os

# Aggiungi path agenti per import (stesso pattern di test_ab_tester.py)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.slugify import slugify
import content_generator as cg


class TestSlugify:
    """Funzione pura: casi chiave punteggiatura, troncamento, bordi."""

    def test_deep_dive_case(self):
        assert slugify("Deep Dive: Indulge in a smokehouse feast this weekend") == \
            "deep-dive-indulge-in-a-smokehouse-feast-this-weekend"

    def test_punctuation_stripped(self):
        assert slugify("Best BBQ Sauce: Kansas City, Texas & Carolina!") == \
            "best-bbq-sauce-kansas-city-texas-carolina"

    def test_collapse_and_trim(self):
        assert slugify("  How   to -- smoke   brisket  ") == "how-to-smoke-brisket"

    def test_truncate_80(self):
        long = "a" * 100
        out = slugify(long)
        assert len(out) <= 80
        assert out == "a" * 80

    def test_no_trailing_dash_after_truncate(self):
        # 79 'a' + spazio + parola: il taglio a 80 non deve lasciare '-' di coda
        out = slugify("a" * 79 + " word")
        assert not out.endswith("-")

    def test_empty(self):
        assert slugify("") == ""
        assert slugify("   ") == ""


class TestPublishedSlugExists:
    """Helper difensivo: total>0 -> True, errore rete -> False."""

    def test_true_when_total_positive(self, monkeypatch):
        monkeypatch.setattr(cg.strapi, "find",
                            lambda *a, **k: {"meta": {"pagination": {"total": 1}}})
        assert cg.published_slug_exists("blog-posts", "esistente") is True

    def test_false_when_total_zero(self, monkeypatch):
        monkeypatch.setattr(cg.strapi, "find",
                            lambda *a, **k: {"meta": {"pagination": {"total": 0}}})
        assert cg.published_slug_exists("blog-posts", "nuovo") is False

    def test_false_on_network_error(self, monkeypatch):
        def boom(*a, **k):
            raise RuntimeError("network error: timeout")
        monkeypatch.setattr(cg.strapi, "find", boom)
        # Difensivo: non deve propagare, ritorna False per non bloccare la pipeline
        assert cg.published_slug_exists("blog-posts", "qualsiasi") is False

    def test_false_on_empty_slug(self):
        assert cg.published_slug_exists("blog-posts", "") is False


class TestGetNextAcceptableQueueItem:
    """Decisione di skip: slug gia pubblicato -> failed e prossimo; nuovo -> ritornato."""

    def test_duplicate_slug_skipped_then_new_returned(self, monkeypatch):
        items = [
            {"documentId": "dup", "title": "Smoked Brisket Guide",
             "target_keyword": "smoked brisket", "content_type": "blog"},
            {"documentId": "new", "title": "Pellet Smoker Basics",
             "target_keyword": "pellet smoker", "content_type": "blog"},
        ]
        calls = {"i": 0}

        def fake_get_next():
            i = calls["i"]
            return items[i] if i < len(items) else None

        # ritorna l'item corrente e fa avanzare il puntatore quando viene marcato failed
        monkeypatch.setattr(cg, "get_next_queue_item", fake_get_next)
        monkeypatch.setattr(cg, "is_acceptable_topic", lambda *a, **k: (True, ""))

        # primo slug esiste pubblicato, secondo no
        published = {slugify("Smoked Brisket Guide")}
        monkeypatch.setattr(cg, "published_slug_exists",
                            lambda ct, slug: slug in published)

        updates = []

        def fake_update(content_type, doc_id, data):
            updates.append((doc_id, data))
            calls["i"] += 1  # simula che l'item failed esce dalla coda 'ready'
            return {}
        monkeypatch.setattr(cg.strapi, "update", fake_update)

        result = cg.get_next_acceptable_queue_item()

        assert result is not None
        assert result["documentId"] == "new"
        # il duplicato e' stato marcato failed con log slug
        assert len(updates) == 1
        assert updates[0][0] == "dup"
        assert updates[0][1]["status"] == "failed"
        assert "Duplicate slug" in updates[0][1]["generation_log"]

    def test_new_slug_returned_immediately(self, monkeypatch):
        item = {"documentId": "ok", "title": "Fresh Topic",
                "target_keyword": "fresh topic", "content_type": "blog"}
        monkeypatch.setattr(cg, "get_next_queue_item", lambda: item)
        monkeypatch.setattr(cg, "is_acceptable_topic", lambda *a, **k: (True, ""))
        monkeypatch.setattr(cg, "published_slug_exists", lambda ct, slug: False)

        result = cg.get_next_acceptable_queue_item()
        assert result is item
