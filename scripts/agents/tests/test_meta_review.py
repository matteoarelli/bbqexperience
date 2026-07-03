"""Test per meta_review.py — Windows Claude gate + Strapi PUT skip_rebuild.

Behavior coverage (PLAN 17-02 Task 3, STEP 3-4):
- test_review_meta_approve              -> review_meta ritorna approved=True
- test_review_meta_reject_length        -> title > 60 char -> ReviewIssue critical
- test_review_meta_reject_claim         -> Claude reject -> ReviewResult approved=False
- test_meta_review_main_apply_on_approve -> Claude approve -> strapi.update skip=True
- test_meta_review_main_queue_on_reject  -> Claude reject -> NO strapi.update
- test_meta_review_no_pending           -> empty file -> telegram + return
"""

import sys
import os
import json
import subprocess
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _fresh_meta_review(monkeypatch, tmp_path):
    """Reimporta meta_review con state dir reindirizzato a tmp_path."""
    if "agents.meta_review" in sys.modules:
        del sys.modules["agents.meta_review"]
    from agents import meta_review as mr
    monkeypatch.setattr(mr, "PENDING_FILE", tmp_path / "meta_changes_pending.jsonl")
    monkeypatch.setattr(mr, "LOG_FILE", tmp_path / "meta_changes.jsonl")
    return mr


# ─── review_meta (in claude_quality_gate) ─────────────────────────────────


class TestReviewMeta:
    def test_review_meta_reject_length_title(self, monkeypatch):
        """Title > 60 char -> pre-check rejection, ReviewIssue 'length'."""
        from agents import claude_quality_gate as gate
        result = gate.review_meta(
            current_title="Old", current_meta="Old meta",
            proposed_title="x" * 61, proposed_meta="ok meta",
            queries=["q1"], locale="en", excerpt="ex",
        )
        assert result.approved is False
        # ReviewIssue dataclass usage (B4 fix verification)
        assert any(i.category == "length" and i.severity == "critical"
                   for i in result.issues)

    def test_review_meta_reject_length_meta(self, monkeypatch):
        from agents import claude_quality_gate as gate
        result = gate.review_meta(
            current_title="Old", current_meta="Old meta",
            proposed_title="ok title", proposed_meta="x" * 156,
            queries=["q1"], locale="en", excerpt="ex",
        )
        assert result.approved is False
        assert any(i.category == "length" for i in result.issues)

    def test_review_meta_approve_when_claude_ok(self, monkeypatch):
        """Claude ritorna decision=approve -> approved=True, no issues."""
        from agents import claude_quality_gate as gate

        class _FakeRes:
            returncode = 0
            stdout = json.dumps({"decision": "approve", "reasoning": "looks good"})
            stderr = ""

        monkeypatch.setattr(subprocess, "run", lambda *a, **kw: _FakeRes())
        result = gate.review_meta(
            current_title="Old", current_meta="Old meta",
            proposed_title="Best Pellet Grill 2026",
            proposed_meta="Find your match with 5 tested models, prices, and temp ranges from 225F-500F.",
            queries=["best pellet grill"], locale="en",
            excerpt="Article about pellet grills tested at 225F-500F.",
        )
        assert result.approved is True

    def test_review_meta_reject_when_claude_rejects(self, monkeypatch):
        from agents import claude_quality_gate as gate

        class _FakeRes:
            returncode = 0
            stdout = json.dumps({"decision": "reject", "reasoning": "claim not in excerpt"})
            stderr = ""

        monkeypatch.setattr(subprocess, "run", lambda *a, **kw: _FakeRes())
        result = gate.review_meta(
            current_title="Old", current_meta="Old meta",
            proposed_title="Best Grill Under $100",
            proposed_meta="Top picks below 100 dollars with free shipping.",
            queries=["best grill"], locale="en",
            excerpt="Article about general BBQ tips, no price discussion.",
        )
        assert result.approved is False
        # Almeno un issue 'semantic'
        assert any(i.category == "semantic" for i in result.issues)

    def test_review_meta_uses_sonnet_model(self):
        """m2 lock: review_meta deve usare --model sonnet (non opus)."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "claude_quality_gate.py"
        text = src.read_text(encoding="utf-8")
        # review_meta deve esistere ed essere sonnet
        assert "def review_meta" in text
        # Cerca "sonnet" all'interno della funzione review_meta
        review_meta_idx = text.find("def review_meta")
        next_def_idx = text.find("\ndef ", review_meta_idx + 1)
        if next_def_idx == -1:
            next_def_idx = len(text)
        review_meta_body = text[review_meta_idx:next_def_idx]
        assert "sonnet" in review_meta_body, "review_meta deve usare --model sonnet (m2 lock)"


# ─── meta_review.main flow ────────────────────────────────────────────────


class TestMetaReviewMain:
    def _write_pending(self, tmp_path, records: list[dict]):
        f = tmp_path / "meta_changes_pending.jsonl"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("\n".join(json.dumps(r) for r in records) + "\n",
                     encoding="utf-8")

    def test_meta_review_no_pending(self, monkeypatch, tmp_path):
        """Pending vuoto -> return senza errori e SENZA Telegram.

        Il no-op routine e' stato silenziato il 2026-06-05 (niente report
        "nessuna proposta"); il test ora verifica il silenzio.
        """
        mr = _fresh_meta_review(monkeypatch, tmp_path)
        tg_calls = []
        monkeypatch.setattr(mr.telegram, "send_agent_report",
                             lambda *a, **kw: tg_calls.append((a, kw)) or True)
        mr.main()
        assert len(tg_calls) == 0

    def test_meta_review_apply_on_approve(self, monkeypatch, tmp_path):
        """Claude approve -> strapi.update(skip_rebuild=True) + log + clear pending."""
        mr = _fresh_meta_review(monkeypatch, tmp_path)

        proposal = {
            "url": "https://bbq-experience.com/en/blog/x",
            "locale": "en", "content_type": "blog-posts",
            "documentId": "doc-001", "slug": "x",
            "before": {"seo_title": "Old", "seo_description": "Old m"},
            "proposed": {"seo_title": "New Title",
                          "seo_description": "New meta description with CTA at 225F."},
            "query_targets": ["best grill"],
            "metrics": {"position": 6, "ctr": 0.01, "impressions": 1000},
            "timestamp": datetime.now().isoformat(),
        }
        self._write_pending(tmp_path, [proposal])

        # Mock review_meta: ritorna approved
        from agents import claude_quality_gate as gate
        approved_result = gate.ReviewResult(
            approved=True, score=10, summary="OK",
            corrected_html="", issues=[],
        )
        monkeypatch.setattr(mr, "review_meta",
                             lambda **kw: approved_result)
        # Mock strapi.update — cattura kwargs
        update_calls = []
        monkeypatch.setattr(mr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        monkeypatch.setattr(mr.telegram, "send_agent_report",
                             lambda *a, **kw: True)

        mr.main()

        # strapi.update chiamato 1 volta con skip_rebuild=True
        assert len(update_calls) == 1
        args, kwargs = update_calls[0]
        assert kwargs.get("skip_rebuild") is True, \
            f"skip_rebuild=True mancante. kwargs={kwargs}"
        assert kwargs.get("locale") == "en"
        # Log file scritto + pending svuotato
        log_file = tmp_path / "meta_changes.jsonl"
        assert log_file.exists()
        log_records = [json.loads(l) for l in log_file.read_text(encoding="utf-8").splitlines() if l.strip()]
        assert len(log_records) == 1
        assert log_records[0]["review"]["decision"] == "approve"
        assert log_records[0].get("applied") is True
        # Pending svuotato
        pending = tmp_path / "meta_changes_pending.jsonl"
        assert pending.read_text(encoding="utf-8").strip() == ""

    def test_meta_review_queue_on_reject(self, monkeypatch, tmp_path):
        """Claude reject -> NO strapi.update + log con decision='reject'."""
        mr = _fresh_meta_review(monkeypatch, tmp_path)

        proposal = {
            "url": "https://bbq-experience.com/en/blog/y", "locale": "en",
            "content_type": "blog-posts", "documentId": "doc-002", "slug": "y",
            "before": {"seo_title": "Old", "seo_description": "Old m"},
            "proposed": {"seo_title": "Clickbait!!", "seo_description": "fake claim"},
            "query_targets": ["q"], "metrics": {}, "timestamp": datetime.now().isoformat(),
        }
        self._write_pending(tmp_path, [proposal])

        from agents import claude_quality_gate as gate
        rejected_result = gate.ReviewResult(
            approved=False, score=0, summary="rejected reason",
            corrected_html="",
            issues=[gate.ReviewIssue(severity="major", category="semantic",
                                       description="bad claim")],
        )
        monkeypatch.setattr(mr, "review_meta", lambda **kw: rejected_result)
        update_calls = []
        monkeypatch.setattr(mr.strapi, "update",
                             lambda *a, **kw: update_calls.append((a, kw)) or {"data": {}})
        monkeypatch.setattr(mr.telegram, "send_agent_report",
                             lambda *a, **kw: True)

        mr.main()

        assert update_calls == [], "strapi.update NON deve essere chiamato su reject"
        log_records = [json.loads(l) for l in (tmp_path / "meta_changes.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
        assert len(log_records) == 1
        assert log_records[0]["review"]["decision"] == "reject"
        assert log_records[0].get("applied") is False
