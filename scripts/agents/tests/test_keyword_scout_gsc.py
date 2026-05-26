"""Test per keyword_scout.py — GSC striking-distance source + fusione Suggest.

Behavior coverage (PLAN 17-02 Task 2):
- test_scout_gsc_striking          -> filtra pos∈[8,20] AND imp>=30 AND ctr<benchmark
- test_fusion_dedup                -> dedup via slugify, source 'gsc+suggest' se entrambe
- test_telegram_format             -> build_report distingue [GSC striking] vs [Suggest]
- test_imports_shared_ctr_benchmark -> B1: import da lib.ctr_benchmark
"""

import sys
import os
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestScoutGscStriking:
    def test_filters_by_position_and_impressions(self, monkeypatch):
        """pos in [8,20], imp >= 30, ctr < benchmark."""
        from agents import keyword_scout

        # Fake search_analytics rows:
        # row1: pos 11.3, imp 47, ctr 0.0 -> PASS (striking, sotto benchmark)
        # row2: pos 5.0, imp 100, ctr 0.0 -> SKIP (pos < 8)
        # row3: pos 9.0, imp 10, ctr 0.0 -> SKIP (imp < 30)
        # row4: pos 12.0, imp 50, ctr 0.10 -> SKIP (ctr 10% sopra benchmark pos 10 = 1.6%)
        # row5: pos 25.0, imp 100, ctr 0.0 -> SKIP (pos > 20)
        fake_rows = [
            {"keys": ["smoked brisket flat or point"], "clicks": 0, "impressions": 47, "ctr": 0.0, "position": 11.3},
            {"keys": ["short pos"], "clicks": 5, "impressions": 100, "ctr": 0.0, "position": 5.0},
            {"keys": ["low imp"], "clicks": 0, "impressions": 10, "ctr": 0.0, "position": 9.0},
            {"keys": ["above benchmark"], "clicks": 5, "impressions": 50, "ctr": 0.10, "position": 12.0},
            {"keys": ["pos out of range"], "clicks": 0, "impressions": 100, "ctr": 0.0, "position": 25.0},
        ]
        monkeypatch.setattr(keyword_scout.gsc_client, "search_analytics",
                             lambda **kw: fake_rows)

        results = keyword_scout.scout_gsc_striking(days=28)
        # Solo row1 deve passare
        assert len(results) == 1
        assert results[0]["query"] == "smoked brisket flat or point"
        assert results[0]["source"] == "gsc"
        assert results[0]["position"] == 11.3
        assert results[0]["impressions"] == 47

    def test_skip_above_benchmark(self, monkeypatch):
        """Row che gia converte sopra benchmark NON e' striking-distance."""
        from agents import keyword_scout
        # Pos 8.0 -> benchmark CTR_BENCHMARK[8] = 0.024. ctr 0.030 > 0.024 -> SKIP
        fake_rows = [
            {"keys": ["already converting"], "clicks": 30, "impressions": 1000, "ctr": 0.030, "position": 8.0},
        ]
        monkeypatch.setattr(keyword_scout.gsc_client, "search_analytics",
                             lambda **kw: fake_rows)
        results = keyword_scout.scout_gsc_striking(days=28)
        assert results == []

    def test_returns_empty_on_gsc_error(self, monkeypatch):
        """GSC fetch fallita -> ritorna [] senza raise (graceful)."""
        from agents import keyword_scout

        def boom(**kw):
            raise RuntimeError("GSC fake error")
        monkeypatch.setattr(keyword_scout.gsc_client, "search_analytics", boom)
        results = keyword_scout.scout_gsc_striking(days=28)
        assert results == []


class TestFusionDedup:
    def test_fusion_dedup_marks_both_sources(self):
        from agents import keyword_scout
        suggest = [{"query": "smoked brisket flat", "source": "suggest", "cluster": "brisket"}]
        striking = [{"query": "smoked brisket flat", "clicks": 0, "impressions": 47,
                     "ctr": 0.0, "position": 11.3, "source": "gsc"}]
        merged = keyword_scout._dedup_candidates(suggest, striking)
        assert len(merged) == 1
        m = merged[0]
        assert m["source"] == "gsc+suggest"
        # metriche GSC preservate
        assert m["position"] == 11.3
        assert m["impressions"] == 47

    def test_fusion_keeps_unique_separately(self):
        from agents import keyword_scout
        suggest = [{"query": "best pellet grill 2026", "source": "suggest"}]
        striking = [{"query": "weber kettle vs kamado", "clicks": 2, "impressions": 124,
                     "ctr": 0.016, "position": 9.1, "source": "gsc"}]
        merged = keyword_scout._dedup_candidates(suggest, striking)
        assert len(merged) == 2
        sources = {m["source"] for m in merged}
        assert "suggest" in sources
        assert "gsc" in sources


class TestTelegramFormat:
    def test_telegram_format_has_source_labels(self):
        """build_report (o equivalente) include i 3 label di source."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "keyword_scout.py"
        text = src.read_text(encoding="utf-8")
        # I 3 label devono essere presenti in qualche posto nel build_report / report
        assert "[GSC striking]" in text, "manca [GSC striking] label"
        assert "[Suggest]" in text, "manca [Suggest] label"
        assert "[GSC+Suggest]" in text, "manca [GSC+Suggest] label"


class TestImportsSharedCtrBenchmark:
    def test_imports_shared_ctr_benchmark(self):
        """B1 fix: import da lib, NON tramite meta_optimizer (no circular)."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "keyword_scout.py"
        text = src.read_text(encoding="utf-8")
        assert "from agents.lib.ctr_benchmark import" in text, \
            "manca import shared ctr_benchmark"
        assert "from agents.meta_optimizer import CTR_BENCHMARK" not in text, \
            "B1: no circular import via meta_optimizer"
        assert "CTR_BENCHMARK = {" not in text, \
            "no inline duplicate"
