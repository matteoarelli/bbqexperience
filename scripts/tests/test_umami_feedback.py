"""Test unitari per umami_feedback — parsing URL, filtro bassa confidenza."""

import sys
import os
from datetime import date, timedelta

import pytest

# Aggiungi scripts/ al path per import agenti
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.umami_feedback import parse_umami_path, is_high_confidence


class TestParseUmamiPath:
    """Test mappatura URL Umami -> (content_type, slug, locale)."""

    def test_en_blog(self):
        result = parse_umami_path("/en/blog/my-article/")
        assert result == ("blog-posts", "my-article", "en")

    def test_it_reviews(self):
        result = parse_umami_path("/it/recensioni/weber-kettle/")
        assert result == ("reviews", "weber-kettle", "it")

    def test_es_recipes(self):
        result = parse_umami_path("/es/recetas/pulled-pork/")
        assert result == ("recipes", "pulled-pork", "es")

    def test_es_tutorials(self):
        result = parse_umami_path("/es/tutoriales/how-to-smoke/")
        assert result == ("tutorials", "how-to-smoke", "es")

    def test_en_reviews(self):
        result = parse_umami_path("/en/reviews/kamado-joe/")
        assert result == ("reviews", "kamado-joe", "en")

    def test_it_guide(self):
        result = parse_umami_path("/it/guide/come-affumicare/")
        assert result == ("tutorials", "come-affumicare", "it")

    def test_it_ricette(self):
        result = parse_umami_path("/it/ricette/costine-bbq/")
        assert result == ("recipes", "costine-bbq", "it")

    def test_es_resenas(self):
        result = parse_umami_path("/es/resenas/traeger-pro/")
        assert result == ("reviews", "traeger-pro", "es")

    def test_homepage_returns_none(self):
        """Homepage non e una pagina di dettaglio."""
        assert parse_umami_path("/en/") is None

    def test_about_returns_none(self):
        """Pagine non-contenuto restituiscono None."""
        assert parse_umami_path("/en/about/") is None

    def test_short_path_returns_none(self):
        """Path con meno di 3 segmenti restituisce None."""
        assert parse_umami_path("/en") is None

    def test_unknown_locale_returns_none(self):
        """Locale sconosciuto restituisce None."""
        assert parse_umami_path("/fr/blog/article/") is None


class TestIsHighConfidence:
    """Test filtro bassa confidenza per esclusione aggiornamenti."""

    def test_high_visits_old_content(self):
        """Contenuto vecchio con tante visite -> alta confidenza."""
        old_date = (date.today() - timedelta(days=30)).isoformat()
        assert is_high_confidence(100, old_date) is True

    def test_low_visits(self):
        """Sotto 50 visite -> bassa confidenza."""
        old_date = (date.today() - timedelta(days=30)).isoformat()
        assert is_high_confidence(30, old_date) is False

    def test_recent_content(self):
        """Contenuto pubblicato da meno di 7 giorni -> bassa confidenza."""
        recent_date = date.today().isoformat()
        assert is_high_confidence(100, recent_date) is False

    def test_null_date(self):
        """Data pubblicazione None -> bassa confidenza."""
        assert is_high_confidence(100, None) is False

    def test_exactly_50_visits(self):
        """Esattamente 50 visite -> alta confidenza (soglia inclusa)."""
        old_date = (date.today() - timedelta(days=30)).isoformat()
        assert is_high_confidence(50, old_date) is True

    def test_exactly_7_days(self):
        """Esattamente 7 giorni -> alta confidenza (soglia inclusa)."""
        seven_days = (date.today() - timedelta(days=7)).isoformat()
        assert is_high_confidence(100, seven_days) is True
