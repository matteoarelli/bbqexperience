"""Test per gsc_refresh_review.py — Windows Task Scheduler Sun 10:00 local.

Behavior coverage (PLAN 17-03 Task 2):
- test_process_candidate_full_path   -> end-to-end happy path (gen + review + apply + reindex)
- test_quality_gate_reject           -> score<7 -> needs_human, NO strapi.update, NO indexing
- test_publishedAt_preserved         -> published_at NOT in update payload
- test_locale_aware_update           -> locale propagated to strapi.update
- test_competitor_diff_in_prompt     -> competitor_articles included when non-empty, absent when empty
- test_no_queue                      -> empty file -> telegram noop + return
- test_cluster_reverse_lookup (M7)   -> _cluster_for_keyword scans CLUSTERS, returns matching/uncategorized
- test_build_prompt_decay_only (M8)  -> branches=['decay'] -> only decay line in metrics_block
- test_build_prompt_ctr_opp_only (M8) -> branches=['ctr_opportunity'] -> only CTR line
- test_build_prompt_both_branches (M8) -> branches=['decay','ctr_opportunity'] -> both lines
"""

import sys
import os
import json
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _fresh_gsc_refresh_review(monkeypatch, tmp_path):
    """Reimporta gsc_refresh_review con state dir reindirizzato a tmp_path."""
    if "agents.gsc_refresh_review" in sys.modules:
        del sys.modules["agents.gsc_refresh_review"]
    from agents import gsc_refresh_review as grr
    monkeypatch.setattr(grr, "QUEUE_FILE", tmp_path / "gsc_refresh_queue.jsonl")
    monkeypatch.setattr(grr, "FAILED_FILE", tmp_path / "gsc_refresh_failed.jsonl")
    monkeypatch.setattr(grr, "SUCCESS_FILE", tmp_path / "gsc_refresh_success.jsonl")
    return grr


def _make_candidate(*, url=None, slug="x", locale="en", branches=None,
                    content_type="blog-posts", gsc_queries=None, competitor=None,
                    metrics_28d=None, metrics_7d=None) -> dict:
    """Builder per fixture candidate JSONL record."""
    return {
        "url": url or f"https://bbq-experience.com/{locale}/blog/{slug}",
        "slug": slug,
        "locale": locale,
        "content_type": content_type,
        "branches": branches if branches is not None else ["decay"],
        "metrics_28d": metrics_28d or {"impressions": 600, "clicks": 4, "ctr": 0.0067,
                                        "position": 5.0, "avg_clicks_per_week": 1.0},
        "metrics_7d": metrics_7d or {"clicks": 0, "decay_pct": 100.0},
        "gsc_queries": gsc_queries if gsc_queries is not None else [
            {"query": "best pellet grill 2026", "clicks": 3, "impressions": 100,
             "ctr": 0.03, "position": 5.0}],
        "competitor_articles": competitor if competitor is not None else [],
        "timestamp": "2026-05-26T08:30:00",
    }


def _write_queue(tmp_path, records):
    f = tmp_path / "gsc_refresh_queue.jsonl"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text("\n".join(json.dumps(r) for r in records) + "\n", encoding="utf-8")


# ─── M7: cluster reverse-lookup ──────────────────────────────────────────


class TestClusterReverseLookup:
    def test_cluster_reverse_lookup_matches_smoking(self, monkeypatch, tmp_path):
        """Keyword 'how to smoke meat' -> cluster 'smoking' via reverse-lookup."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        result = grr._cluster_for_keyword("how to smoke meat")
        assert result == "smoking"

    def test_cluster_reverse_lookup_matches_brisket(self, monkeypatch, tmp_path):
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        result = grr._cluster_for_keyword("smoked brisket recipe")
        assert result == "brisket"

    def test_cluster_reverse_lookup_returns_uncategorized(self, monkeypatch, tmp_path):
        """Keyword not matching any cluster seed -> 'uncategorized'."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        result = grr._cluster_for_keyword("completely unrelated topic xyz")
        assert result == "uncategorized"

    def test_cluster_reverse_lookup_empty_keyword(self, monkeypatch, tmp_path):
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        assert grr._cluster_for_keyword("") == "uncategorized"
        assert grr._cluster_for_keyword(None) == "uncategorized"


# ─── M8: conditional metrics_block rendering ─────────────────────────────


class TestBuildPromptMetricsBlock:
    def _make_current(self):
        return {"title": "Test Article", "documentId": "doc-001"}

    def test_build_prompt_decay_only(self, monkeypatch, tmp_path):
        """branches=['decay'] -> metrics_block contains 'Decay' line, no 'CTR opportunity'."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate(branches=["decay"],
                                     metrics_7d={"clicks": 0, "decay_pct": 80.0})
        prompt = grr._build_prompt(candidate, self._make_current())
        assert "Decay 7gg vs media 28gg" in prompt
        assert "-80.0%" in prompt or "80.0" in prompt
        assert "CTR opportunity:" not in prompt

    def test_build_prompt_ctr_opportunity_only(self, monkeypatch, tmp_path):
        """branches=['ctr_opportunity'] -> CTR line with benchmark, no Decay line."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate(
            branches=["ctr_opportunity"],
            metrics_28d={"impressions": 600, "clicks": 4, "ctr": 0.0067,
                          "position": 5.0, "avg_clicks_per_week": 1.0},
        )
        prompt = grr._build_prompt(candidate, self._make_current())
        assert "CTR opportunity:" in prompt
        assert "benchmark" in prompt.lower()
        assert "Decay 7gg vs media 28gg" not in prompt

    def test_build_prompt_both_branches(self, monkeypatch, tmp_path):
        """branches=['decay','ctr_opportunity'] -> BOTH lines present."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate(
            branches=["decay", "ctr_opportunity"],
            metrics_28d={"impressions": 600, "clicks": 4, "ctr": 0.0067,
                          "position": 5.0, "avg_clicks_per_week": 1.0},
            metrics_7d={"clicks": 0, "decay_pct": 100.0},
        )
        prompt = grr._build_prompt(candidate, self._make_current())
        assert "Decay 7gg vs media 28gg" in prompt
        assert "CTR opportunity:" in prompt


# ─── Process candidate full path ─────────────────────────────────────────


class TestProcessCandidate:
    def _mock_review_pass(self, monkeypatch, grr, score=8):
        from agents import claude_quality_gate as gate

        def _fake_review(article_html, **kw):
            return gate.ReviewResult(
                approved=True, score=score, summary="OK",
                corrected_html=article_html, issues=[],
            )

        monkeypatch.setattr(grr, "review_article", _fake_review)

    def test_process_candidate_full_path(self, monkeypatch, tmp_path):
        """Full happy path: multistep gen + review pass + strapi.update + reindex."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate()
        # Mock strapi find: current article exists
        monkeypatch.setattr(grr.strapi, "find", lambda *a, **kw: {"data": [
            {"documentId": "doc-001", "title": "Best Pellet Grill 2026", "slug": "x"}
        ]})
        # Mock multistep: returns article dict
        monkeypatch.setattr(grr.claude, "generate_article_multistep",
                             lambda *a, **kw: {
                                 "content": "<p>refreshed article body</p>" * 50,
                                 "excerpt": "new excerpt",
                                 "seo_title": "Fresh Best Pellet Grill 2026",
                                 "seo_description": "Refreshed meta description",
                             })
        # Quality gate pass
        self._mock_review_pass(monkeypatch, grr, score=8)
        # Mock strapi.update + indexing
        update_calls = []
        monkeypatch.setattr(grr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        idx_calls = []
        monkeypatch.setattr(grr.gsc_client, "request_indexing",
                             lambda url: idx_calls.append(url) or {"success": True})
        indexnow_calls = []
        monkeypatch.setattr(grr.indexnow_client, "ping",
                             lambda urls: indexnow_calls.append(urls) or {"success": True})

        result = grr.process_candidate(candidate)
        assert result["decision"] == "applied"
        assert len(update_calls) == 1
        # locale passato
        assert update_calls[0][1].get("locale") == "en"
        # NO skip_rebuild -> default False (refresh DEVE rebuildare)
        assert update_calls[0][1].get("skip_rebuild", False) is False
        # Re-index chiamato
        assert idx_calls == [candidate["url"]]
        assert indexnow_calls == [[candidate["url"]]]

    def test_quality_gate_reject(self, monkeypatch, tmp_path):
        """Quality score <7 -> needs_human, NO strapi.update, NO indexing."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate()
        monkeypatch.setattr(grr.strapi, "find", lambda *a, **kw: {"data": [
            {"documentId": "doc-001", "title": "Test", "slug": "x"}
        ]})
        monkeypatch.setattr(grr.claude, "generate_article_multistep",
                             lambda *a, **kw: {"content": "<p>weak</p>", "excerpt": "x",
                                                "seo_title": "x", "seo_description": "x"})
        # Score 5 < 7 -> needs_human
        self._mock_review_pass(monkeypatch, grr, score=5)
        update_calls = []
        monkeypatch.setattr(grr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        idx_calls = []
        monkeypatch.setattr(grr.gsc_client, "request_indexing",
                             lambda url: idx_calls.append(url) or {"success": True})

        result = grr.process_candidate(candidate)
        assert result["decision"] == "needs_human"
        assert update_calls == [], "strapi.update NON deve essere chiamato su needs_human"
        assert idx_calls == [], "indexing NON deve essere chiamato su needs_human"

    def test_publishedAt_preserved(self, monkeypatch, tmp_path):
        """update payload NON contiene publishedAt (preserva data originale)."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate()
        monkeypatch.setattr(grr.strapi, "find", lambda *a, **kw: {"data": [
            {"documentId": "doc-001", "title": "Test", "slug": "x",
             "publishedAt": "2024-01-01T00:00:00.000Z"}
        ]})
        monkeypatch.setattr(grr.claude, "generate_article_multistep",
                             lambda *a, **kw: {"content": "<p>x</p>", "excerpt": "x",
                                                "seo_title": "x", "seo_description": "x"})
        self._mock_review_pass(monkeypatch, grr, score=8)
        update_calls = []
        monkeypatch.setattr(grr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        monkeypatch.setattr(grr.gsc_client, "request_indexing", lambda url: {"success": True})
        monkeypatch.setattr(grr.indexnow_client, "ping", lambda urls: {"success": True})

        grr.process_candidate(candidate)
        # Verifica payload NON contiene publishedAt
        payload = update_calls[0][0][2]  # update(content_type, doc_id, payload, ...)
        assert "publishedAt" not in payload, \
            f"publishedAt non deve essere nel payload: {list(payload.keys())}"
        # Anche cover_image NON deve essere nel payload (m4 lock: out of scope)
        assert "cover_image" not in payload

    def test_locale_aware_update(self, monkeypatch, tmp_path):
        """Candidate IT -> locale='it' passato a strapi.update."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        candidate = _make_candidate(locale="it", slug="migliore-pellet-grill-2026",
                                     url="https://bbq-experience.com/it/blog/migliore-pellet-grill-2026")
        monkeypatch.setattr(grr.strapi, "find", lambda *a, **kw: {"data": [
            {"documentId": "doc-it", "title": "Migliore Pellet Grill 2026",
             "slug": "migliore-pellet-grill-2026"}
        ]})
        monkeypatch.setattr(grr.claude, "generate_article_multistep",
                             lambda *a, **kw: {"content": "<p>x</p>", "excerpt": "x",
                                                "seo_title": "x", "seo_description": "x"})
        self._mock_review_pass(monkeypatch, grr, score=8)
        update_calls = []
        monkeypatch.setattr(grr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        monkeypatch.setattr(grr.gsc_client, "request_indexing", lambda url: {"success": True})
        monkeypatch.setattr(grr.indexnow_client, "ping", lambda urls: {"success": True})

        grr.process_candidate(candidate)
        assert update_calls[0][1].get("locale") == "it"
        # Slug IT propagato nel body (Strapi v5 PUT locale richiede slug)
        payload = update_calls[0][0][2]
        assert payload.get("slug") == "migliore-pellet-grill-2026"

    def test_competitor_diff_in_prompt(self, monkeypatch, tmp_path):
        """competitor_articles non-vuoto -> presente nel prompt; vuoto -> assente graceful."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        # With competitor articles
        cand_with = _make_candidate(competitor=[
            {"url": "https://heygrillhey.com/x", "title": "Best Pellet Grill 2026", "source": "HGH"},
        ])
        prompt_with = grr._build_prompt(cand_with, {"title": "T", "documentId": "d"})
        assert "heygrillhey.com" in prompt_with or "Best Pellet Grill 2026" in prompt_with
        # Without
        cand_without = _make_candidate(competitor=[])
        prompt_without = grr._build_prompt(cand_without, {"title": "T", "documentId": "d"})
        # competitor_articles_json renders as "[]" which is acceptable; no error
        assert isinstance(prompt_without, str)
        assert len(prompt_without) > 100  # prompt non vuoto


# ─── Main flow: no queue ──────────────────────────────────────────────────


class TestMainNoQueue:
    def test_no_queue(self, monkeypatch, tmp_path):
        """Empty queue file (or missing) -> telegram noop + return."""
        grr = _fresh_gsc_refresh_review(monkeypatch, tmp_path)
        tg_calls = []
        monkeypatch.setattr(grr.telegram, "send_agent_report",
                             lambda *a, **kw: tg_calls.append((a, kw)) or True)
        grr.main()
        assert len(tg_calls) == 1
        assert "Nessun candidato" in tg_calls[0][0][1] or "nessun candidato" in tg_calls[0][0][1].lower()


# ─── M7 + M8 fix grep verification ────────────────────────────────────────


class TestM7M8GrepVerification:
    def test_imports_clusters_from_keyword_scout(self):
        """M7: import CLUSTERS from keyword_scout."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "gsc_refresh_review.py"
        text = src.read_text(encoding="utf-8")
        assert "from agents.keyword_scout import CLUSTERS" in text, \
            "M7: manca import CLUSTERS da keyword_scout"
        assert "def _cluster_for_keyword" in text, \
            "M7: manca helper _cluster_for_keyword"

    def test_no_cluster_from_strapi_field(self):
        """M7: no usage of current.get('cluster') — cluster da reverse-lookup."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "gsc_refresh_review.py"
        text = src.read_text(encoding="utf-8")
        assert 'current.get("cluster"' not in text, \
            "M7: non leggere campo 'cluster' da Strapi (non esiste schema)"
        assert "current.get('cluster'" not in text

    def test_conditional_metrics_block(self):
        """M8: conditional rendering basato su branches."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "gsc_refresh_review.py"
        text = src.read_text(encoding="utf-8")
        assert "metrics_block" in text
        assert 'if "decay" in branches' in text or 'if \'decay\' in branches' in text, \
            "M8: manca conditional 'decay' branch"
        assert ('if "ctr_opportunity" in branches' in text
                or "if 'ctr_opportunity' in branches" in text), \
            "M8: manca conditional 'ctr_opportunity' branch"

    def test_no_skip_rebuild_in_refresh(self):
        """Refresh DEVE rebuildare (no skip_rebuild=True): grep cnt 0."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "gsc_refresh_review.py"
        text = src.read_text(encoding="utf-8")
        # No skip_rebuild=True anywhere
        assert "skip_rebuild=True" not in text, \
            "Refresh deve permettere rebuild — no skip_rebuild=True"

    def test_prompt_template_has_metrics_block_placeholder(self):
        """Template {metrics_block} placeholder per M8 conditional rendering."""
        import pathlib
        tpl = pathlib.Path(__file__).parent.parent / "prompts" / "claude_refresh_review.md"
        assert tpl.exists(), "prompts/claude_refresh_review.md mancante"
        text = tpl.read_text(encoding="utf-8")
        assert "{metrics_block}" in text, "Template manca placeholder {metrics_block}"
        assert "{url}" in text
        assert "{gsc_queries_json}" in text
        assert "{competitor_articles_json}" in text
