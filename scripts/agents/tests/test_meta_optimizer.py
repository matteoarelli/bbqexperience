"""Test per meta_optimizer.py — Hetzner Qwen drafter + JSONL queue.

Behavior coverage (PLAN 17-02 Task 1):
- test_benchmark_logic            -> needs_meta_rewrite filter (B1: imports shared module)
- test_prompt_includes_queries    -> build_prompt injects top GSC queries
- test_length_caps                -> parse_qwen_output truncates 60/155 at word boundary
- test_jsonl_atomic_append        -> process_page writes to PENDING via atomic_io
- test_skip_during_sdxl_utc       -> _sdxl_guard uses UTC-explicit hour (B5)
- test_no_overlap_recent          -> skip URL toccato negli ultimi 14gg
- test_per_locale_filter          -> _locale_from_url estrae locale da URL path
- test_imports_shared_ctr_benchmark -> grep-style assert sull'import (B1)
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


def _fresh_meta_optimizer(monkeypatch, tmp_path):
    """Importa il modulo con state/ ridiretto a tmp_path (test isolation)."""
    # Reimporta per evitare side-effects tra test (state dir cached a livello modulo)
    if "agents.meta_optimizer" in sys.modules:
        del sys.modules["agents.meta_optimizer"]
    from agents import meta_optimizer as mo
    # Patch state dir
    monkeypatch.setattr(mo, "STATE_DIR", tmp_path)
    monkeypatch.setattr(mo, "PENDING_FILE", tmp_path / "meta_changes_pending.jsonl")
    monkeypatch.setattr(mo, "LOG_FILE", tmp_path / "meta_changes.jsonl")
    return mo


# ─── Benchmark logic ──────────────────────────────────────────────────────


class TestBenchmarkLogic:
    def test_benchmark_logic_triggers_for_subperforming(self, monkeypatch, tmp_path):
        """pos 6 + ctr 0.01 < benchmark 0.040 * 0.6 == 0.024 -> True."""
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        row = {"keys": ["https://bbq-experience.com/en/blog/x"],
               "impressions": 1000, "position": 6, "ctr": 0.01}
        assert mo.needs_meta_rewrite(row) is True

    def test_benchmark_logic_skips_low_impressions(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        row = {"keys": ["x"], "impressions": 50, "position": 6, "ctr": 0.001}
        assert mo.needs_meta_rewrite(row) is False

    def test_benchmark_logic_skips_off_range(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # position 11 fuori range [1,10]
        row = {"keys": ["x"], "impressions": 1000, "position": 11, "ctr": 0.001}
        assert mo.needs_meta_rewrite(row) is False

    def test_benchmark_logic_skips_above_threshold(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # pos 6, benchmark 0.040 * 0.6 = 0.024. ctr 0.030 > 0.024 -> False
        row = {"keys": ["x"], "impressions": 1000, "position": 6, "ctr": 0.030}
        assert mo.needs_meta_rewrite(row) is False


# ─── Prompt + length cap ──────────────────────────────────────────────────


class TestPromptAndCaps:
    def test_prompt_includes_queries(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        row = {"keys": ["https://bbq-experience.com/en/blog/best-grill"],
               "impressions": 1000, "position": 6, "ctr": 0.01}
        current = {"current_title": "Best Grill Ever",
                   "current_meta": "The best grill review.",
                   "excerpt": "Excerpt about grills."}
        queries = [
            {"keys": ["best pellet grill"], "clicks": 5, "impressions": 200, "ctr": 0.025, "position": 6.4},
            {"keys": ["best gas grill 2026"], "clicks": 3, "impressions": 150, "ctr": 0.020, "position": 7.1},
            {"keys": ["weber pellet grill review"], "clicks": 2, "impressions": 90, "ctr": 0.022, "position": 5.5},
            {"keys": ["traeger vs weber"], "clicks": 1, "impressions": 60, "ctr": 0.016, "position": 8.2},
            {"keys": ["best smoker for beginners"], "clicks": 1, "impressions": 40, "ctr": 0.025, "position": 9.0},
        ]
        prompt = mo.build_prompt(row, current, queries, "en")
        # tutte e 5 le query devono apparire nel prompt
        for q in queries:
            assert q["keys"][0] in prompt, f"query missing: {q['keys'][0]}"
        # current title + meta presenti
        assert "Best Grill Ever" in prompt
        assert "The best grill review." in prompt

    def test_length_caps_truncate_word_boundary(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # title supera 60 char e' tronco al confine di spazio
        long_title = "A " * 80  # 160 char
        raw = f"SEO_TITLE: {long_title}\nSEO_DESCRIPTION: short desc\nREASONING: y"
        parsed = mo.parse_qwen_output(raw)
        assert parsed is not None
        assert len(parsed["seo_title"]) <= 60

    def test_length_caps_meta_155(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        long_meta = "lorem ipsum " * 30  # > 155 char
        raw = f"SEO_TITLE: ok title\nSEO_DESCRIPTION: {long_meta}\nREASONING: y"
        parsed = mo.parse_qwen_output(raw)
        assert parsed is not None
        assert len(parsed["seo_description"]) <= 155


# ─── JSONL atomic append ──────────────────────────────────────────────────


class TestJsonlAtomicAppend:
    def test_jsonl_atomic_append(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # Mock Strapi find (current meta) + Qwen ask + gsc_client.queries_for_page
        monkeypatch.setattr(mo, "_fetch_current_meta", lambda ct, slug, loc: {
            "documentId": "doc-001",
            "current_title": "Old title",
            "current_meta": "Old meta",
            "excerpt": "Excerpt text.",
        })
        monkeypatch.setattr(mo, "_content_type_and_slug_from_url",
                             lambda url: ("blog-posts", "best-grill"))
        monkeypatch.setattr(mo.gsc_client, "queries_for_page",
                             lambda url, days=28, top_n=5: [
                                 {"keys": ["best pellet grill"], "clicks": 5,
                                  "impressions": 200, "ctr": 0.025, "position": 6.4}])
        monkeypatch.setattr(mo.claude, "ask", lambda *a, **kw: (
            "SEO_TITLE: New Best Pellet Grill 2026\n"
            "SEO_DESCRIPTION: New meta with CTA at 225F for 8 hrs and pricing.\n"
            "REASONING: punchier"
        ))
        row = {"keys": ["https://bbq-experience.com/en/blog/best-grill"],
               "impressions": 1000, "position": 6, "ctr": 0.01}
        ok = mo.process_page(row, recent_urls=set())
        assert ok is True
        # Pending file scritto
        pending_file = tmp_path / "meta_changes_pending.jsonl"
        assert pending_file.exists()
        lines = pending_file.read_text(encoding="utf-8").strip().splitlines()
        assert len(lines) == 1
        rec = json.loads(lines[0])
        assert rec["url"] == "https://bbq-experience.com/en/blog/best-grill"
        assert rec["locale"] == "en"
        assert rec["documentId"] == "doc-001"
        assert "before" in rec and "proposed" in rec
        assert rec["before"]["seo_title"] == "Old title"
        assert rec["proposed"]["seo_title"].startswith("New Best Pellet Grill")
        assert "timestamp" in rec
        assert rec["query_targets"] == ["best pellet grill"]


# ─── SDXL guard (B5: UTC explicit) ────────────────────────────────────────


class TestSdxlGuard:
    def test_skip_during_sdxl_utc_hour_4(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # Freeze UTC hour to 4
        import agents.meta_optimizer as _mod_ref

        class _FrozenDt:
            @classmethod
            def now(cls, tz=None):
                # ritorna sempre 2026-05-25 04:30 UTC
                return datetime(2026, 5, 25, 4, 30, tzinfo=tz or timezone.utc)

        monkeypatch.setattr(_mod_ref, "datetime", _FrozenDt)
        with pytest.raises(SystemExit) as exc:
            mo._sdxl_guard()
        assert exc.value.code == 0

    def test_skip_during_sdxl_utc_hour_5(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        import agents.meta_optimizer as _mod_ref

        class _FrozenDt:
            @classmethod
            def now(cls, tz=None):
                return datetime(2026, 12, 25, 5, 45, tzinfo=tz or timezone.utc)

        monkeypatch.setattr(_mod_ref, "datetime", _FrozenDt)
        with pytest.raises(SystemExit) as exc:
            mo._sdxl_guard()
        assert exc.value.code == 0

    def test_no_skip_when_hour_3(self, monkeypatch, tmp_path):
        """03:30 UTC (cron schedule) deve passare il guard."""
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        import agents.meta_optimizer as _mod_ref

        class _FrozenDt:
            @classmethod
            def now(cls, tz=None):
                return datetime(2026, 5, 25, 3, 30, tzinfo=tz or timezone.utc)

        monkeypatch.setattr(_mod_ref, "datetime", _FrozenDt)
        # NON deve raise
        mo._sdxl_guard()  # OK


# ─── Recent overlap guard ─────────────────────────────────────────────────


class TestRecentOverlap:
    def test_no_overlap_recent(self, monkeypatch, tmp_path):
        """URL toccato 5gg fa NON deve essere ri-processato."""
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        # Scrivi una entry recente in meta_changes.jsonl
        log_file = tmp_path / "meta_changes.jsonl"
        recent_iso = (datetime.now() - timedelta(days=5)).isoformat()
        log_file.write_text(json.dumps({
            "url": "https://bbq-experience.com/en/blog/x",
            "timestamp": recent_iso,
        }) + "\n", encoding="utf-8")
        recent = mo._recent_changes_urls()
        assert "https://bbq-experience.com/en/blog/x" in recent

    def test_old_entries_excluded(self, monkeypatch, tmp_path):
        """URL toccato 30gg fa deve essere ri-processabile (fuori finestra 14gg)."""
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        log_file = tmp_path / "meta_changes.jsonl"
        old_iso = (datetime.now() - timedelta(days=30)).isoformat()
        log_file.write_text(json.dumps({
            "url": "https://bbq-experience.com/en/blog/y",
            "timestamp": old_iso,
        }) + "\n", encoding="utf-8")
        recent = mo._recent_changes_urls()
        assert "https://bbq-experience.com/en/blog/y" not in recent


# ─── Per-locale filter ────────────────────────────────────────────────────


class TestPerLocaleFilter:
    def test_per_locale_filter(self, monkeypatch, tmp_path):
        mo = _fresh_meta_optimizer(monkeypatch, tmp_path)
        assert mo._locale_from_url("https://bbq-experience.com/en/blog/x") == "en"
        assert mo._locale_from_url("https://bbq-experience.com/it/blog/y") == "it"
        assert mo._locale_from_url("https://bbq-experience.com/es/recetas/z") == "es"
        # fallback default 'en'
        assert mo._locale_from_url("https://bbq-experience.com/blog/x") == "en"


# ─── B1 fix verification ──────────────────────────────────────────────────


class TestImportsSharedCtrBenchmark:
    def test_imports_shared_ctr_benchmark(self):
        """B1 fix: meta_optimizer.py importa da agents.lib.ctr_benchmark,
        NON ridefinisce CTR_BENCHMARK inline.
        """
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "meta_optimizer.py"
        text = src.read_text(encoding="utf-8")
        assert "from agents.lib.ctr_benchmark import" in text, \
            "manca import from shared ctr_benchmark"
        assert "CTR_BENCHMARK = {" not in text, \
            "CTR_BENCHMARK ridefinito inline (B1 fix violato)"
        # Anche: no try/except ImportError fallback per ctr_benchmark
        assert "ImportError" not in text or "ctr_benchmark" not in text.split("ImportError")[0][-200:], \
            "fallback ImportError per ctr_benchmark non ammesso"
