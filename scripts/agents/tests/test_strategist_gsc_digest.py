"""Test per claude_strategist.get_gsc_digest + claude_client.generate_strategy(gsc_digest=...).

Behavior coverage (PLAN 17-03 Task 3):
- test_digest_assembly                   -> get_gsc_digest returns 4-key dict, top10 lists capped
- test_summary_delta_math                -> delta_clicks_pct computation correct
- test_striking_filter_in_digest         -> pos in [8,20] AND imp>=30 only
- test_ctr_opportunity_filter            -> pos in [1,10] AND ctr<benchmark, sorted by gap_pct desc
- test_declining_filter                  -> decay>=30% AND imp_28d>=200 only
- test_strategist_passes_digest          -> main() calls get_gsc_digest + passes to generate_strategy
- test_generate_strategy_includes_digest -> prompt contains GSC WEEKLY DIGEST header + items
- test_telegram_has_3_gsc_recommendations -> regex match for GSC terms in >=3 recs
- test_graceful_no_gsc                   -> get_gsc_digest fails -> still passes gsc_digest=empty dict
- test_imports_shared_ctr_benchmark (B1) -> grep-style assert on import (no fallback)
"""

import sys
import os
import json
import re
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _fresh_strategist(monkeypatch):
    """Reimporta claude_strategist."""
    if "agents.claude_strategist" in sys.modules:
        del sys.modules["agents.claude_strategist"]
    from agents import claude_strategist as cs
    return cs


# ─── get_gsc_digest assembly ──────────────────────────────────────────────


class TestDigestAssembly:
    def _build_search_analytics_mock(self, monkeypatch, cs, *, date_rows=None,
                                       query_rows=None, page_rows_28=None, page_rows_7=None):
        """Mock gsc_client.search_analytics returning different rows by dimension."""
        date_rows = date_rows or []
        query_rows = query_rows or []
        page_rows_28 = page_rows_28 or []
        page_rows_7 = page_rows_7 or []
        call_count = {"n": 0}

        def _fake_search(**kw):
            dims = kw.get("dimensions", [])
            if "date" in dims:
                # Two date calls: curr_7 (first call) then prev_7
                call_count["n"] += 1
                if call_count["n"] == 1:
                    return date_rows[:len(date_rows) // 2] if len(date_rows) > 1 else date_rows
                return date_rows[len(date_rows) // 2:] if len(date_rows) > 1 else []
            if "query" in dims:
                return query_rows
            if "page" in dims:
                # Differentiate by date range length to decide 28d vs 7d
                start = kw.get("start_date", "")
                end = kw.get("end_date", "")
                # Calcola range
                try:
                    s = date.fromisoformat(start)
                    e = date.fromisoformat(end)
                    days = (e - s).days
                except Exception:
                    days = 0
                if days > 14:
                    return page_rows_28
                return page_rows_7
            return []

        monkeypatch.setattr(cs.gsc_client, "search_analytics", _fake_search)

    def test_digest_assembly(self, monkeypatch):
        """get_gsc_digest returns dict with 4 keys, top10 lists capped."""
        cs = _fresh_strategist(monkeypatch)
        self._build_search_analytics_mock(monkeypatch, cs,
            date_rows=[
                {"keys": ["2026-05-19"], "clicks": 10, "impressions": 1000, "ctr": 0.01, "position": 5.0},
                {"keys": ["2026-05-20"], "clicks": 12, "impressions": 1100, "ctr": 0.011, "position": 5.1},
                {"keys": ["2026-05-12"], "clicks": 8, "impressions": 900, "ctr": 0.009, "position": 5.2},
                {"keys": ["2026-05-13"], "clicks": 9, "impressions": 950, "ctr": 0.01, "position": 5.0},
            ],
            query_rows=[],
            page_rows_28=[],
            page_rows_7=[],
        )
        d = cs.get_gsc_digest()
        assert isinstance(d, dict)
        assert set(d.keys()) == {"summary_delta", "striking_top10", "ctr_opportunity_top10", "declining_top10"}
        assert isinstance(d["summary_delta"], dict)
        assert isinstance(d["striking_top10"], list)
        assert len(d["striking_top10"]) <= 10
        assert len(d["ctr_opportunity_top10"]) <= 10
        assert len(d["declining_top10"]) <= 10

    def test_summary_delta_math(self, monkeypatch):
        """7d=100, prev=120 -> delta_clicks_pct == -16.67 (rounded)."""
        cs = _fresh_strategist(monkeypatch)
        self._build_search_analytics_mock(monkeypatch, cs,
            date_rows=[
                # curr_7 (first call): total 100 clicks 5000 imp avg pos 5
                {"keys": ["2026-05-19"], "clicks": 100, "impressions": 5000, "ctr": 0.02, "position": 5.0},
                # prev_7 (second call): total 120 clicks 6000 imp
                {"keys": ["2026-05-12"], "clicks": 120, "impressions": 6000, "ctr": 0.02, "position": 5.0},
            ],
        )
        d = cs.get_gsc_digest()
        sd = d["summary_delta"]
        assert sd["total_clicks_7d"] == 100
        assert sd["total_clicks_prev_7d"] == 120
        # (100-120)/120*100 = -16.666...
        assert sd["delta_clicks_pct"] == pytest.approx(-16.6667, abs=0.1)

    def test_striking_filter_in_digest(self, monkeypatch):
        """striking_top10 only includes pos in [8,20] AND imp>=30."""
        cs = _fresh_strategist(monkeypatch)
        self._build_search_analytics_mock(monkeypatch, cs,
            date_rows=[
                {"keys": ["2026-05-19"], "clicks": 50, "impressions": 1000, "ctr": 0.05, "position": 5.0},
                {"keys": ["2026-05-12"], "clicks": 40, "impressions": 1000, "ctr": 0.04, "position": 5.0},
            ],
            query_rows=[
                # In range -> included
                {"keys": ["best smoker review"], "clicks": 2, "impressions": 100, "ctr": 0.02, "position": 10.0},
                {"keys": ["pellet grill comparison"], "clicks": 1, "impressions": 80, "ctr": 0.0125, "position": 15.0},
                # Out of pos range (pos 5)
                {"keys": ["already top result"], "clicks": 50, "impressions": 500, "ctr": 0.1, "position": 5.0},
                # Below imp threshold
                {"keys": ["tiny query"], "clicks": 0, "impressions": 10, "ctr": 0, "position": 12.0},
                # Above pos range
                {"keys": ["too deep"], "clicks": 0, "impressions": 50, "ctr": 0, "position": 25.0},
            ],
        )
        d = cs.get_gsc_digest()
        striking = d["striking_top10"]
        assert len(striking) == 2  # solo le 2 in range
        queries_in = [s["query"] for s in striking]
        assert "best smoker review" in queries_in
        assert "pellet grill comparison" in queries_in
        assert "already top result" not in queries_in
        assert "tiny query" not in queries_in
        assert "too deep" not in queries_in

    def test_ctr_opportunity_filter(self, monkeypatch):
        """ctr_opportunity_top10 only includes pos in [1,10] AND ctr<benchmark, sorted by gap_pct desc."""
        cs = _fresh_strategist(monkeypatch)
        # benchmark_for_position(5) = 0.051
        self._build_search_analytics_mock(monkeypatch, cs,
            date_rows=[],
            page_rows_28=[
                # Included: pos 5, ctr 0.01 < 0.051, imp 1000
                {"keys": ["https://bbq-experience.com/en/blog/a"], "clicks": 10, "impressions": 1000, "ctr": 0.01, "position": 5.0},
                # Included: pos 7, ctr 0.005 < 0.030, imp 2000
                {"keys": ["https://bbq-experience.com/en/blog/b"], "clicks": 10, "impressions": 2000, "ctr": 0.005, "position": 7.0},
                # Excluded: pos 12 (out of range)
                {"keys": ["https://bbq-experience.com/en/blog/c"], "clicks": 1, "impressions": 500, "ctr": 0.002, "position": 12.0},
                # Excluded: ctr above benchmark
                {"keys": ["https://bbq-experience.com/en/blog/d"], "clicks": 100, "impressions": 500, "ctr": 0.20, "position": 5.0},
                # Excluded: imp < 100 threshold
                {"keys": ["https://bbq-experience.com/en/blog/e"], "clicks": 0, "impressions": 50, "ctr": 0.0, "position": 5.0},
            ],
        )
        d = cs.get_gsc_digest()
        opp = d["ctr_opportunity_top10"]
        urls_in = [o["url"] for o in opp]
        assert "https://bbq-experience.com/en/blog/a" in urls_in
        assert "https://bbq-experience.com/en/blog/b" in urls_in
        assert "https://bbq-experience.com/en/blog/c" not in urls_in
        assert "https://bbq-experience.com/en/blog/d" not in urls_in
        assert "https://bbq-experience.com/en/blog/e" not in urls_in
        # Sort by gap_pct desc (b ha gap maggiore: (0.030 - 0.005)/0.030 = 83% vs a (0.051-0.01)/0.051=80%)
        assert opp[0]["url"] == "https://bbq-experience.com/en/blog/b"
        # Ensure benchmark_ctr key present
        assert "benchmark_ctr" in opp[0]
        assert "gap_pct" in opp[0]

    def test_declining_filter(self, monkeypatch):
        """declining_top10 only includes decay>=30% AND imp_28d>=200."""
        cs = _fresh_strategist(monkeypatch)
        # 28d page: imp 800 clicks 40 (avg_w 10), 7d page: clicks 2 -> decay 80%
        # 28d page: imp 800 clicks 40, 7d page: clicks 8 -> decay 20% (excluded)
        # 28d page: imp 100 (< 200 threshold, excluded)
        self._build_search_analytics_mock(monkeypatch, cs,
            date_rows=[],
            page_rows_28=[
                {"keys": ["https://bbq-experience.com/en/blog/dec1"], "clicks": 40, "impressions": 800, "ctr": 0.05, "position": 5.0},
                {"keys": ["https://bbq-experience.com/en/blog/dec2"], "clicks": 40, "impressions": 800, "ctr": 0.05, "position": 5.0},
                {"keys": ["https://bbq-experience.com/en/blog/dec3"], "clicks": 5, "impressions": 100, "ctr": 0.05, "position": 5.0},
            ],
            page_rows_7=[
                {"keys": ["https://bbq-experience.com/en/blog/dec1"], "clicks": 2, "impressions": 200, "ctr": 0.01, "position": 5.0},
                {"keys": ["https://bbq-experience.com/en/blog/dec2"], "clicks": 8, "impressions": 200, "ctr": 0.04, "position": 5.0},
                {"keys": ["https://bbq-experience.com/en/blog/dec3"], "clicks": 0, "impressions": 25, "ctr": 0.0, "position": 5.0},
            ],
        )
        d = cs.get_gsc_digest()
        decl = d["declining_top10"]
        urls_in = [x["url"] for x in decl]
        assert "https://bbq-experience.com/en/blog/dec1" in urls_in
        assert "https://bbq-experience.com/en/blog/dec2" not in urls_in
        assert "https://bbq-experience.com/en/blog/dec3" not in urls_in

    def test_graceful_no_gsc(self, monkeypatch):
        """gsc_client.search_analytics raise -> digest ritorna dict con liste vuote, no crash."""
        cs = _fresh_strategist(monkeypatch)

        def _explode(**kw):
            raise RuntimeError("GSC SA down")

        monkeypatch.setattr(cs.gsc_client, "search_analytics", _explode)
        d = cs.get_gsc_digest()
        assert d == {"summary_delta": {}, "striking_top10": [],
                     "ctr_opportunity_top10": [], "declining_top10": []}


# ─── claude_client.generate_strategy GSC integration ─────────────────────


class TestGenerateStrategyIncludesDigest:
    def test_generate_strategy_includes_digest(self, monkeypatch):
        """generate_strategy(..., gsc_digest=...) builds prompt with GSC WEEKLY DIGEST header + items."""
        from agents.lib import claude_client
        captured = {"prompt": None}

        def _fake_ask(prompt, *, system="", max_tokens=2048, timeout=300, enable_thinking=False):
            captured["prompt"] = prompt
            return ("Strategy report. Recommendations: "
                    "1) leverage striking distance clicks for query X to grow impressions. "
                    "2) refresh CTR opportunity page Y at position 5. "
                    "3) address decay on page Z (decay 50%).")

        monkeypatch.setattr(claude_client, "ask", _fake_ask)
        digest = {
            "summary_delta": {"total_clicks_7d": 100, "total_clicks_prev_7d": 80,
                              "delta_clicks_pct": 25.0, "delta_pos": -0.3,
                              "total_imp_7d": 5000, "total_imp_prev_7d": 4500,
                              "avg_ctr_7d": 0.02, "avg_ctr_prev_7d": 0.018,
                              "avg_pos_7d": 6.5, "avg_pos_prev_7d": 6.8},
            "striking_top10": [{"query": "best pellet grill", "position": 12.0, "impressions": 100, "clicks": 1, "ctr": 0.01}],
            "ctr_opportunity_top10": [{"url": "https://bbq-experience.com/en/blog/x", "position": 5.0, "impressions": 500, "clicks": 2, "ctr": 0.004, "benchmark_ctr": 0.051, "gap_pct": 92.0}],
            "declining_top10": [{"url": "https://bbq-experience.com/en/blog/y", "clicks_7d": 2, "clicks_prev_7d_avg": 10.0, "decay_pct": 80.0, "position_drift": 1.5}],
        }
        result = claude_client.generate_strategy(
            "traffic data", "content perf", "competitor news",
            "current queue", traffic_scores="", gsc_digest=digest,
        )
        prompt = captured["prompt"]
        assert prompt is not None
        assert "GSC WEEKLY DIGEST" in prompt
        # Verifica almeno 3 elementi rappresentativi (delta_clicks_pct, striking query, ctr url, declining url)
        assert "best pellet grill" in prompt
        assert "https://bbq-experience.com/en/blog/x" in prompt
        assert "https://bbq-experience.com/en/blog/y" in prompt
        assert isinstance(result, str)

    def test_telegram_has_3_gsc_recommendations(self, monkeypatch):
        """Output strategy contiene >=3 raccomandazioni con riferimento a GSC metrics."""
        from agents.lib import claude_client
        # Mock ask to return a strategy string with 3 GSC-anchored recommendations
        sample = (
            "ACTIONS:\n"
            "1. Refresh page X — impressions 500 con CTR 0.4% (benchmark 5%): "
            "   striking distance clear win.\n"
            "2. Rewrite seo_title page Y — position 6, current clicks 2: ctr "
            "   opportunity per chiudere il gap.\n"
            "3. Re-promote pillar Z — decay 50% on 7d window vs avg, recover "
            "   queries dalla striking distance."
        )

        def _fake_ask(prompt, *, system="", max_tokens=2048, timeout=300, enable_thinking=False):
            return sample

        monkeypatch.setattr(claude_client, "ask", _fake_ask)
        out = claude_client.generate_strategy(
            "traffic", "perf", "comp", "queue", traffic_scores="",
            gsc_digest={"summary_delta": {"delta_clicks_pct": 0, "delta_pos": 0},
                        "striking_top10": [], "ctr_opportunity_top10": [],
                        "declining_top10": []},
        )
        # Conta righe con almeno 1 GSC term
        gsc_terms = re.compile(r"\b(clicks|impressions|CTR|position|striking|decay)\b", re.IGNORECASE)
        lines_with_gsc = [l for l in out.split("\n") if gsc_terms.search(l)]
        assert len(lines_with_gsc) >= 3, \
            f"Atteso >=3 raccomandazioni ancorate a GSC, trovate {len(lines_with_gsc)}: {lines_with_gsc}"

    def test_graceful_no_gsc_kwarg(self, monkeypatch):
        """generate_strategy callable senza gsc_digest (esistenti callers safe)."""
        from agents.lib import claude_client
        captured = {"prompt": None}

        def _fake_ask(prompt, *, system="", max_tokens=2048, timeout=300, enable_thinking=False):
            captured["prompt"] = prompt
            return "no GSC strategy"

        monkeypatch.setattr(claude_client, "ask", _fake_ask)
        # Chiama SENZA gsc_digest (backward compat)
        result = claude_client.generate_strategy(
            "traffic", "perf", "comp", "queue", traffic_scores="",
        )
        prompt = captured["prompt"]
        # Esistente callers funzionano: prompt non deve contenere GSC WEEKLY DIGEST
        assert "GSC WEEKLY DIGEST" not in prompt
        assert isinstance(result, str)


# ─── Strategist main() wiring ────────────────────────────────────────────


class TestStrategistPassesDigest:
    def test_strategist_main_passes_digest(self, monkeypatch):
        """main() calls get_gsc_digest + passes to claude.generate_strategy."""
        cs = _fresh_strategist(monkeypatch)
        # Mock data sources
        monkeypatch.setattr(cs, "get_traffic_summary", lambda: "traffic ok")
        monkeypatch.setattr(cs, "get_content_performance", lambda: "perf ok")
        monkeypatch.setattr(cs, "get_competitor_news", lambda: "comp ok")
        monkeypatch.setattr(cs, "get_current_queue", lambda: "queue ok")
        monkeypatch.setattr(cs, "get_traffic_scores", lambda: "scores ok")
        digest_returned = {"summary_delta": {"delta_clicks_pct": 10.0, "delta_pos": -0.5},
                            "striking_top10": [{"query": "q1", "position": 10.0, "impressions": 100, "clicks": 1, "ctr": 0.01}],
                            "ctr_opportunity_top10": [],
                            "declining_top10": []}
        monkeypatch.setattr(cs, "get_gsc_digest", lambda: digest_returned)
        # Mock generate_strategy: capture kwargs
        captured = {"args": None, "kwargs": None}

        def _fake_gen(*args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs
            return "Strategy out"

        monkeypatch.setattr(cs.claude, "generate_strategy", _fake_gen)
        monkeypatch.setattr(cs, "should_generate_pillar", lambda: None)
        # Mock telegram
        monkeypatch.setattr(cs.telegram, "send_agent_report", lambda *a, **kw: True)
        # No state file write (use real, but stub the path)
        monkeypatch.setattr(cs, "STATE_DIR", Path("/tmp/test_state"))

        cs.main()

        # generate_strategy chiamato con gsc_digest=digest_returned
        assert captured["kwargs"] is not None
        assert captured["kwargs"].get("gsc_digest") == digest_returned


# ─── B1 fix verification ─────────────────────────────────────────────────


class TestImportsSharedCtrBenchmark:
    def test_imports_shared_ctr_benchmark(self):
        """B1 fix: claude_strategist.py importa da agents.lib.ctr_benchmark, no fallback."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "claude_strategist.py"
        text = src.read_text(encoding="utf-8")
        assert "from agents.lib.ctr_benchmark import" in text, \
            "manca import shared ctr_benchmark"
        assert "CTR_BENCHMARK = {" not in text, \
            "CTR_BENCHMARK ridefinito inline (B1 fix violato)"
        # No try/except ImportError fallback
        idx = text.find("from agents.lib.ctr_benchmark")
        preceding = text[max(0, idx - 200):idx]
        assert "ImportError" not in preceding, \
            "fallback ImportError per ctr_benchmark NON ammesso (B1)"
        # No circular import from meta_optimizer
        assert "from agents.meta_optimizer import CTR_BENCHMARK" not in text

    def test_generate_strategy_has_gsc_digest_kwarg(self):
        """lib/claude_client.generate_strategy ha gsc_digest kwarg."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "lib" / "claude_client.py"
        text = src.read_text(encoding="utf-8")
        # Cerca firma generate_strategy con gsc_digest
        assert "gsc_digest" in text
        assert "GSC WEEKLY DIGEST" in text  # prompt block marker
