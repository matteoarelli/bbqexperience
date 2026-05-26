"""Test per phase17_outcome_tracker.py — Phase 20 Outcome Measurement.

Behavior coverage:
- test_decide_verdict_success            -> lift >= 10x AND weeks <= 2
- test_decide_verdict_on_track           -> 3 <= lift < 10x AND weeks <= 2
- test_decide_verdict_revisit_prompts    -> lift < 3x AND weeks >= 2
- test_decide_verdict_degraded_rollback  -> lift < 1.5x AND weeks >= 4
- test_decide_verdict_monitoring_early   -> low lift in week 1 -> monitoring (no panic)
- test_decide_verdict_priority_order     -> degraded_rollback wins over revisit_prompts
- test_compute_delta_happy_path          -> lift 2.5x, pct strings, abs pp
- test_compute_delta_zero_baseline_safe  -> bl_clicks=0 -> no division by zero
- test_compute_delta_lift_round          -> round 2 decimal places
- test_select_top_climbing_declining     -> sort by ctr_vs_benchmark_x, filter impr>=50
- test_select_filters_low_impressions    -> impr<50 escluso
- test_weeks_since_baseline              -> diff_days // 7 floor
- test_aggregate_gsc_empty               -> rows=[] -> zeros (no division)
"""

import sys
import os
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# sys.path: aggiunge scripts/ così possiamo fare `from agents.X import Y`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ─── Helpers ──────────────────────────────────────────────────────────────


def _fresh_tracker(monkeypatch, tmp_path):
    """Importa il modulo con STATE_DIR ridiretto a tmp_path (test isolation)."""
    if "agents.phase17_outcome_tracker" in sys.modules:
        del sys.modules["agents.phase17_outcome_tracker"]
    from agents import phase17_outcome_tracker as tr
    monkeypatch.setattr(tr, "STATE_DIR", tmp_path)
    monkeypatch.setattr(tr, "OUTCOME_FILE", tmp_path / "phase17_outcome.jsonl")
    monkeypatch.setattr(tr, "META_CHANGES_FILE", tmp_path / "meta_changes.jsonl")
    monkeypatch.setattr(tr, "GSC_REFRESH_SUCCESS", tmp_path / "gsc_refresh_success.jsonl")
    monkeypatch.setattr(tr, "GSC_REFRESH_PENDING", tmp_path / "gsc_refresh_pending.jsonl")
    return tr


# ─── _decide_verdict (decision tree) ──────────────────────────────────────


class TestDecideVerdict:
    def test_decide_verdict_success(self, monkeypatch, tmp_path):
        """lift 12x in week 1 -> success + scale actions."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        delta = {"lift_ctr_x": 12.0}
        verdict, actions = tr._decide_verdict(delta, weeks_elapsed=1)
        assert verdict == "success"
        # Verifica almeno un action mention scale
        assert any("Scale" in a or "scale" in a or "Estendere" in a for a in actions)

    def test_decide_verdict_on_track(self, monkeypatch, tmp_path):
        """lift 5x in week 2 -> on-track + nessuna azione."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        delta = {"lift_ctr_x": 5.0}
        verdict, actions = tr._decide_verdict(delta, weeks_elapsed=2)
        assert verdict == "on-track"
        assert any("Nessuna modifica" in a for a in actions)

    def test_decide_verdict_revisit_prompts(self, monkeypatch, tmp_path):
        """lift 2x in week 3 -> revisit_prompts (sotto 3x dopo week 2)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        delta = {"lift_ctr_x": 2.0}
        verdict, actions = tr._decide_verdict(delta, weeks_elapsed=3)
        assert verdict == "revisit_prompts"
        # Power words action menzionata
        assert any("power_words" in a for a in actions)

    def test_decide_verdict_degraded_rollback(self, monkeypatch, tmp_path):
        """lift 1.2x in week 5 -> degraded_rollback (priority più alta)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        delta = {"lift_ctr_x": 1.2}
        verdict, actions = tr._decide_verdict(delta, weeks_elapsed=5)
        assert verdict == "degraded_rollback"
        # PAUSE action presente
        assert any("PAUSE" in a for a in actions)

    def test_decide_verdict_monitoring_early(self, monkeypatch, tmp_path):
        """lift 1.0x in week 1 -> monitoring (no panic, troppo presto per revisit)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        delta = {"lift_ctr_x": 1.0}
        verdict, actions = tr._decide_verdict(delta, weeks_elapsed=1)
        # Non scatta revisit_prompts perché weeks_elapsed < 2
        assert verdict == "monitoring"

    def test_decide_verdict_priority_order(self, monkeypatch, tmp_path):
        """degraded_rollback ha priorità su revisit_prompts (entrambi triggerati)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        # lift 1.0x in week 5 -> potrebbe match sia revisit (>=2) sia degraded (>=4)
        delta = {"lift_ctr_x": 1.0}
        verdict, _ = tr._decide_verdict(delta, weeks_elapsed=5)
        assert verdict == "degraded_rollback"  # priorità più alta


# ─── _compute_delta ───────────────────────────────────────────────────────


class TestComputeDelta:
    def test_compute_delta_happy_path(self, monkeypatch, tmp_path):
        """Baseline 35/29k/0.12%/6.7 vs current 90/30k/0.30%/6.0."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        baseline = {"clicks": 35, "impressions": 29000, "ctr": 0.0012, "position": 6.7}
        current = {"clicks": 90, "impressions": 30000, "ctr": 0.0030, "position": 6.0}
        delta = tr._compute_delta(current, baseline)
        # lift_ctr_x = 0.0030 / 0.0012 = 2.5
        assert delta["lift_ctr_x"] == 2.5
        # clicks +157%
        assert "+157%" == delta["clicks_pct"]
        # ctr +0.18pp
        assert "+0.18pp" == delta["ctr_abs_pp"]
        # position improved by 0.7
        assert "-0.7" == delta["position_delta"]

    def test_compute_delta_zero_baseline_safe(self, monkeypatch, tmp_path):
        """bl_clicks=0 non deve dare division by zero."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        baseline = {"clicks": 0, "impressions": 0, "ctr": 0.0, "position": 0.0}
        current = {"clicks": 5, "impressions": 100, "ctr": 0.05, "position": 4.0}
        delta = tr._compute_delta(current, baseline)
        # Non dovrebbe alzare ZeroDivisionError
        assert "lift_ctr_x" in delta
        # bl_ctr=0 -> lift_ctr_x default 0.0
        assert delta["lift_ctr_x"] == 0.0

    def test_compute_delta_lift_round(self, monkeypatch, tmp_path):
        """lift round a 2 decimali (es. 0.0035/0.0012 = 2.916... -> 2.92)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        baseline = {"clicks": 35, "impressions": 29000, "ctr": 0.0012, "position": 6.7}
        current = {"clicks": 100, "impressions": 30000, "ctr": 0.0035, "position": 6.0}
        delta = tr._compute_delta(current, baseline)
        assert delta["lift_ctr_x"] == 2.92


# ─── _select_top_climbing_declining ───────────────────────────────────────


class TestSelectTopClimbingDeclining:
    def test_select_top_climbing_declining(self, monkeypatch, tmp_path):
        """3 URL con CTR vs benchmark differenti -> sort climbing desc, declining asc."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        # benchmark_for_position(6) = 0.040 (FirstPageSage 2026, ctr_benchmark.py)
        # url_high: ctr 0.08, ratio 2.0
        # url_mid: ctr 0.04, ratio 1.0
        # url_low: ctr 0.005, ratio 0.125
        rows = [
            {"keys": ["https://bbq-experience.com/en/blog/high"], "impressions": 100,
             "clicks": 8, "ctr": 0.08, "position": 6.0},
            {"keys": ["https://bbq-experience.com/en/blog/mid"], "impressions": 100,
             "clicks": 4, "ctr": 0.04, "position": 6.0},
            {"keys": ["https://bbq-experience.com/en/blog/low"], "impressions": 200,
             "clicks": 1, "ctr": 0.005, "position": 6.0},
        ]
        climbing, declining = tr._select_top_climbing_declining(rows)
        # climbing[0] = high (ratio 2.0)
        assert "/high" in climbing[0]["url"]
        # declining[0] = low (ratio 0.125)
        assert "/low" in declining[0]["url"]
        # ratio campo presente
        assert climbing[0]["ctr_vs_benchmark_x"] == 2.0

    def test_select_filters_low_impressions(self, monkeypatch, tmp_path):
        """URL con impressions < 50 esclusi (noise long-tail)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        rows = [
            {"keys": ["https://bbq-experience.com/en/blog/noise"], "impressions": 10,
             "clicks": 5, "ctr": 0.5, "position": 1.0},  # ratio enorme ma noise
            {"keys": ["https://bbq-experience.com/en/blog/signal"], "impressions": 100,
             "clicks": 5, "ctr": 0.05, "position": 6.0},  # ratio normale
        ]
        climbing, _ = tr._select_top_climbing_declining(rows)
        # Solo signal deve essere presente
        assert len(climbing) == 1
        assert "/signal" in climbing[0]["url"]


# ─── _weeks_since_baseline ────────────────────────────────────────────────


class TestWeeksSinceBaseline:
    def test_weeks_since_baseline_zero(self, monkeypatch, tmp_path):
        """today == baseline date -> 0 weeks."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        assert tr._weeks_since_baseline(date(2026, 5, 25)) == 0

    def test_weeks_since_baseline_one_week(self, monkeypatch, tmp_path):
        """today = baseline + 7 days -> 1 week."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        assert tr._weeks_since_baseline(date(2026, 6, 1)) == 1

    def test_weeks_since_baseline_floor(self, monkeypatch, tmp_path):
        """today = baseline + 10 days -> floor a 1 week (non 1.42)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        assert tr._weeks_since_baseline(date(2026, 6, 4)) == 1


# ─── _aggregate_gsc_28d safety ────────────────────────────────────────────


class TestAggregateGSC:
    def test_aggregate_gsc_empty(self, monkeypatch, tmp_path):
        """gsc_client.top_pages -> [] -> totals con zeri, no ZeroDivisionError."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        monkeypatch.setattr(tr.gsc_client, "top_pages", lambda **kw: [])
        totals, rows = tr._aggregate_gsc_28d()
        assert totals == {"clicks": 0, "impressions": 0, "ctr": 0.0, "position": 0.0}
        assert rows == []

    def test_aggregate_gsc_weighted_position(self, monkeypatch, tmp_path):
        """Position aggregata = weighted by impressions."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        rows = [
            {"keys": ["url1"], "clicks": 10, "impressions": 1000, "ctr": 0.01, "position": 5.0},
            {"keys": ["url2"], "clicks": 20, "impressions": 1000, "ctr": 0.02, "position": 7.0},
        ]
        monkeypatch.setattr(tr.gsc_client, "top_pages", lambda **kw: rows)
        totals, _ = tr._aggregate_gsc_28d()
        assert totals["clicks"] == 30
        assert totals["impressions"] == 2000
        # weighted pos = (5*1000 + 7*1000) / 2000 = 6.0
        assert totals["position"] == 6.0
        # ctr aggregato = 30/2000 = 0.015
        assert totals["ctr"] == 0.015


# ─── _count_jsonl_records_since ───────────────────────────────────────────


class TestCountJsonlRecordsSince:
    def test_count_jsonl_filters_old_records(self, monkeypatch, tmp_path):
        """Record con timestamp > 7gg fa NON contato."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        # 1 record vecchio (10gg fa) + 1 recente (1gg fa)
        f = tmp_path / "test.jsonl"
        old = (datetime.now() - timedelta(days=10)).isoformat()
        new = (datetime.now() - timedelta(days=1)).isoformat()
        f.write_text(
            json.dumps({"timestamp": old, "x": 1}) + "\n"
            + json.dumps({"timestamp": new, "x": 2}) + "\n",
            encoding="utf-8",
        )
        since = datetime.now() - timedelta(days=7)
        assert tr._count_jsonl_records_since(f, since) == 1

    def test_count_jsonl_missing_file(self, monkeypatch, tmp_path):
        """File non esiste -> 0 (no errore)."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        since = datetime.now() - timedelta(days=7)
        assert tr._count_jsonl_records_since(tmp_path / "nope.jsonl", since) == 0

    def test_count_jsonl_corrupt_line_skipped(self, monkeypatch, tmp_path):
        """Riga JSON malformata -> skip, no raise."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        f = tmp_path / "test.jsonl"
        new = (datetime.now() - timedelta(days=1)).isoformat()
        f.write_text(
            "NOT_JSON\n"
            + json.dumps({"timestamp": new, "x": 1}) + "\n",
            encoding="utf-8",
        )
        since = datetime.now() - timedelta(days=7)
        assert tr._count_jsonl_records_since(f, since) == 1


# ─── Integration: build_outcome_record ────────────────────────────────────


class TestBuildOutcomeRecord:
    def test_build_outcome_record_smoke(self, monkeypatch, tmp_path):
        """Smoke test: build_outcome_record produce dict completo senza eccezioni."""
        tr = _fresh_tracker(monkeypatch, tmp_path)
        # Mock GSC + Strapi
        monkeypatch.setattr(tr.gsc_client, "top_pages", lambda **kw: [
            {"keys": ["https://bbq-experience.com/en/blog/x"], "clicks": 100,
             "impressions": 30000, "ctr": 0.0033, "position": 6.0},
        ])
        monkeypatch.setattr(tr.strapi, "find_all_pages", lambda *a, **kw: [{"slug": "x"}] * 5)
        rec = tr.build_outcome_record()
        # Verifica chiavi attese
        assert "timestamp" in rec
        assert "week_number" in rec
        assert "baseline_2026_05_25" in rec
        assert "current_28d" in rec
        assert "delta" in rec
        assert "decision_tree_verdict" in rec
        assert "action_recommendations" in rec
        assert "top_5_climbing" in rec
        assert "top_5_declining" in rec
        # baseline è quello hardcoded
        assert rec["baseline_2026_05_25"]["clicks"] == 35
