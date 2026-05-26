"""Test per gsc_refresh.py — Ubuntu .119 (NOT Hetzner) weekly orchestrator.

Behavior coverage (PLAN 17-03 Task 1):
- test_selection_decay              -> decay branch criteria (clicks_7d vs avg_28d * 0.7)
- test_selection_ctr_opportunity    -> CTR opportunity branch (pos in [1,10], ctr < benchmark)
- test_selection_union_dedup        -> page matching both branches -> branches=["decay","ctr_opportunity"] LIST
- test_selection_top10_by_imp       -> when >10 qualify, top 10 by impressions kept
- test_competitor_diff_reuse        -> competitor_news.json optional, no-op when missing
- test_queue_write_atomic           -> uses atomic_io.append_jsonl_atomic
- test_skip_during_sdxl_utc         -> _sdxl_guard exits 0 when datetime.now(timezone.utc).hour in (4,5)
"""

import sys
import os
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# sys.path: aggiunge scripts/ così possiamo fare `from agents.X import Y`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ─── Helpers ──────────────────────────────────────────────────────────────


def _fresh_gsc_refresh(monkeypatch, tmp_path):
    """Importa il modulo con state/ ridiretto a tmp_path (test isolation)."""
    if "agents.gsc_refresh" in sys.modules:
        del sys.modules["agents.gsc_refresh"]
    from agents import gsc_refresh as gr
    monkeypatch.setattr(gr, "STATE_DIR", tmp_path)
    monkeypatch.setattr(gr, "QUEUE_FILE", tmp_path / "gsc_refresh_queue.jsonl")
    monkeypatch.setattr(gr, "COMPETITOR_STATE", tmp_path / "competitor_state.json")
    return gr


def _make_page_row(url: str, *, impressions: int = 0, clicks: int = 0,
                   ctr: float = 0.0, position: float = 0.0) -> dict:
    """Fixture helper: simula una riga GSC search_analytics dimensions=['page']."""
    return {
        "keys": [url],
        "impressions": impressions,
        "clicks": clicks,
        "ctr": ctr,
        "position": position,
    }


# ─── Selection criteria: decay branch ──────────────────────────────────────


class TestSelectionDecay:
    def test_selection_decay_triggers_at_80_percent_loss(self, monkeypatch, tmp_path):
        """clicks_7d=2, clicks_28d=40 (avg 10/week, decay 80%), imp_28d=300 -> selected."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/x"
        last_28 = {url: _make_page_row(url, impressions=300, clicks=40, ctr=0.13, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=20, clicks=2, ctr=0.10, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        assert len(candidates) == 1
        assert "decay" in candidates[0]["branches"]

    def test_selection_decay_skips_below_20_percent_loss(self, monkeypatch, tmp_path):
        """clicks_7d=8, clicks_28d=40 (avg 10/week, decay 20%) -> NOT selected (decay branch)."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/y"
        last_28 = {url: _make_page_row(url, impressions=300, clicks=40, ctr=0.13, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=20, clicks=8, ctr=0.40, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        # No branches active (decay 20% < 30% threshold, ctr 0.13 > benchmark[5]=0.051)
        assert candidates == []

    def test_selection_decay_skips_low_impressions(self, monkeypatch, tmp_path):
        """imp_28d=150 < DECAY_MIN_IMP_28D (200) -> decay branch not eligible."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/z"
        last_28 = {url: _make_page_row(url, impressions=150, clicks=40, ctr=0.27, position=15.0)}
        last_7 = {url: _make_page_row(url, impressions=10, clicks=0, ctr=0.0, position=15.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        # imp_28d=150 < 200 (DECAY_MIN) AND < 500 (OPP_MIN), pos 15 fuori range
        assert candidates == []


# ─── Selection criteria: CTR opportunity branch ───────────────────────────


class TestSelectionCtrOpportunity:
    def test_selection_ctr_opportunity_triggers(self, monkeypatch, tmp_path):
        """imp_28d=600, ctr=0.012, pos=5 -> selected (benchmark[5]=0.051, 0.012<0.051)."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/opp"
        # Carichi alti: avg 1/week, clicks_7d 1 -> no decay (1 >= 1*0.7)
        last_28 = {url: _make_page_row(url, impressions=600, clicks=4, ctr=0.0067, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=150, clicks=1, ctr=0.0067, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        # ctr 0.0067 < benchmark[5] 0.051 -> ctr_opportunity attiva
        candidates = gr._select_candidates()
        assert len(candidates) == 1
        assert "ctr_opportunity" in candidates[0]["branches"]

    def test_selection_ctr_opportunity_skips_low_impressions(self, monkeypatch, tmp_path):
        """imp_28d=400 < 500 (OPPORTUNITY_MIN_IMP_28D) -> NOT selected."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/low"
        last_28 = {url: _make_page_row(url, impressions=400, clicks=2, ctr=0.005, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=100, clicks=1, ctr=0.01, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        assert candidates == []

    def test_selection_ctr_opportunity_skips_above_benchmark(self, monkeypatch, tmp_path):
        """ctr=0.06 > benchmark[5]=0.051 -> NOT selected (CTR sopra)."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/good"
        last_28 = {url: _make_page_row(url, impressions=600, clicks=36, ctr=0.06, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=150, clicks=9, ctr=0.06, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        # ctr sopra benchmark + clicks_7d 9 / avg 9 -> no decay
        assert candidates == []


# ─── Selection criteria: union + dedup ────────────────────────────────────


class TestSelectionUnionDedup:
    def test_selection_union_branches_list(self, monkeypatch, tmp_path):
        """Page matching both branches -> single entry with branches=['decay','ctr_opportunity'] LIST (M8)."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        url = "https://bbq-experience.com/en/blog/both"
        # Setup: imp_28d=600 (>=500 and >=200), clicks_28d=4 (avg 1/wk),
        # clicks_7d=0 (decay 100%), ctr 0.0067 < benchmark[5] 0.051, pos 5
        last_28 = {url: _make_page_row(url, impressions=600, clicks=4, ctr=0.0067, position=5.0)}
        last_7 = {url: _make_page_row(url, impressions=150, clicks=0, ctr=0.0, position=5.0)}
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        assert len(candidates) == 1
        b = candidates[0]["branches"]
        # CRITICAL M8: branches must be a LIST, not a joined string
        assert isinstance(b, list), f"branches must be list, got {type(b).__name__}"
        assert "decay" in b
        assert "ctr_opportunity" in b


# ─── Selection criteria: top 10 by impressions ────────────────────────────


class TestSelectionTop10:
    def test_selection_top10_by_impressions(self, monkeypatch, tmp_path):
        """When >10 candidates qualify, top 10 by impressions_28d kept."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        # Crea 15 URL tutti con decay >=30%
        urls = [f"https://bbq-experience.com/en/blog/p{i}" for i in range(15)]
        last_28 = {}
        last_7 = {}
        for i, url in enumerate(urls):
            imp = 200 + i * 100  # 200, 300, ..., 1600
            last_28[url] = _make_page_row(url, impressions=imp, clicks=40, ctr=0.20, position=15.0)
            last_7[url] = _make_page_row(url, impressions=imp // 4, clicks=0, ctr=0.0, position=15.0)
        monkeypatch.setattr(gr, "_fetch_clicks_per_week",
                             lambda days_back: last_28 if days_back == 28 else last_7)
        candidates = gr._select_candidates()
        assert len(candidates) == 10
        # Ordinati per impressions desc -> primo deve essere quello con imp piu alta
        imps = [c["metrics_28d"]["impressions"] for c in candidates]
        assert imps == sorted(imps, reverse=True)
        assert imps[0] == 1600  # max impressions


# ─── Competitor diff reuse (optional state file) ──────────────────────────


class TestCompetitorDiffReuse:
    def test_competitor_diff_present(self, monkeypatch, tmp_path):
        """When state/competitor_news.json exists with matching items, enriches candidate."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        news = [
            {"url": "https://heygrillhey.com/best-pellet-grill-review",
             "title": "Best Pellet Grill Review 2026", "source": "Hey Grill Hey"},
            {"url": "https://vindulge.com/some-other-topic",
             "title": "Random Smoking Tips", "source": "Vindulge"},
        ]
        (tmp_path / "competitor_state.json").write_text(json.dumps(news), encoding="utf-8")
        loaded = gr._load_competitor_news()
        assert loaded == news
        # match: candidate URL slug 'best-pellet-grill-2026' has tokens overlap >= 2 with news[0] title
        candidate_url = "https://bbq-experience.com/en/blog/best-pellet-grill-2026"
        matched = gr._match_competitor(candidate_url, news)
        # 'best', 'pellet', 'grill' overlap -> match news[0]
        assert len(matched) >= 1
        assert any("pellet" in m["title"].lower() for m in matched)

    def test_competitor_diff_missing_file_noop(self, monkeypatch, tmp_path):
        """Missing competitor state -> empty list, no error."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        loaded = gr._load_competitor_news()
        assert loaded == []
        matched = gr._match_competitor("https://bbq-experience.com/en/blog/x", [])
        assert matched == []


# ─── Queue write atomic ───────────────────────────────────────────────────


class TestQueueWriteAtomic:
    def test_queue_write_via_atomic_io(self, monkeypatch, tmp_path):
        """main() loop uses atomic_io.append_jsonl_atomic for each candidate."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        # Mock select_candidates ritorna 2 candidate sintetici
        candidates = [
            {"url": "https://bbq-experience.com/en/blog/x",
             "branches": ["decay"],
             "metrics_28d": {"impressions": 300, "clicks": 5, "ctr": 0.016, "position": 5.0,
                              "avg_clicks_per_week": 1.25},
             "metrics_7d": {"clicks": 0, "decay_pct": 100.0}},
        ]
        monkeypatch.setattr(gr, "_select_candidates", lambda: candidates)
        monkeypatch.setattr(gr, "_load_competitor_news", lambda: [])
        monkeypatch.setattr(gr.gsc_client, "queries_for_page",
                             lambda url, days=28, top_n=5: [
                                 {"keys": ["best grill 2026"], "clicks": 3, "impressions": 100,
                                  "ctr": 0.03, "position": 6.0}])
        monkeypatch.setattr(gr.telegram, "send_agent_report",
                             lambda *a, **kw: True)
        # _sdxl_guard pass-through (hour=10)

        class _FrozenDt(datetime):
            @classmethod
            def now(cls, tz=None):  # type: ignore[override]
                return datetime(2026, 5, 26, 10, 0, tzinfo=tz or timezone.utc)

        monkeypatch.setattr(gr, "datetime", _FrozenDt)
        gr.main()
        # Queue file scritto con 1 record
        queue_file = tmp_path / "gsc_refresh_queue.jsonl"
        assert queue_file.exists()
        lines = [json.loads(l) for l in queue_file.read_text(encoding="utf-8").splitlines() if l.strip()]
        assert len(lines) == 1
        rec = lines[0]
        # Campi obbligatori
        assert rec["url"] == "https://bbq-experience.com/en/blog/x"
        assert rec["slug"] == "best-pellet-grill-2026" or rec["slug"] == "x"  # parser-dependent
        assert rec["locale"] == "en"
        assert rec["content_type"] == "blog-posts"
        assert isinstance(rec["branches"], list)
        assert "decay" in rec["branches"]
        assert "metrics_28d" in rec
        assert "gsc_queries" in rec
        assert "competitor_articles" in rec
        assert "timestamp" in rec


# ─── SDXL guard (B5: UTC explicit) ────────────────────────────────────────


class TestSdxlGuardUtc:
    def _freeze_now(self, gr, monkeypatch, *, hour: int, month: int = 5):
        """Patcha datetime.now nel modulo gsc_refresh (locale import)."""
        from datetime import datetime as _real_dt, timezone as _real_tz

        class _FrozenDt(_real_dt):
            @classmethod
            def now(cls, tz=None):  # type: ignore[override]
                return _real_dt(2026, month, 26, hour, 0,
                                tzinfo=tz or _real_tz.utc)

        monkeypatch.setattr(gr, "datetime", _FrozenDt)

    def test_skip_during_sdxl_utc_hour_4(self, monkeypatch, tmp_path):
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        self._freeze_now(gr, monkeypatch, hour=4)
        with pytest.raises(SystemExit) as exc:
            gr._sdxl_guard()
        assert exc.value.code == 0

    def test_skip_during_sdxl_utc_hour_5(self, monkeypatch, tmp_path):
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        self._freeze_now(gr, monkeypatch, hour=5, month=12)
        with pytest.raises(SystemExit) as exc:
            gr._sdxl_guard()
        assert exc.value.code == 0

    def test_no_skip_when_hour_8(self, monkeypatch, tmp_path):
        """08:00 UTC (cron Sun 08:00 UTC) deve passare il guard."""
        gr = _fresh_gsc_refresh(monkeypatch, tmp_path)
        self._freeze_now(gr, monkeypatch, hour=8)
        gr._sdxl_guard()  # NON deve raise


# ─── B1 fix verification: imports shared ctr_benchmark ────────────────────


class TestImportsSharedCtrBenchmark:
    def test_imports_shared_ctr_benchmark(self):
        """B1 fix: gsc_refresh.py importa da agents.lib.ctr_benchmark."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "gsc_refresh.py"
        text = src.read_text(encoding="utf-8")
        assert "from agents.lib.ctr_benchmark import" in text, \
            "manca import from shared ctr_benchmark"
        assert "CTR_BENCHMARK = {" not in text, \
            "CTR_BENCHMARK ridefinito inline (B1 fix violato)"
        # No try/except ImportError fallback per ctr_benchmark
        idx = text.find("from agents.lib.ctr_benchmark")
        if idx > 0:
            preceding = text[max(0, idx - 200):idx]
            assert "ImportError" not in preceding, "fallback ImportError NON ammesso"
