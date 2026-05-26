"""Test per content_generator.py + lib/claude_client.py — GSC query priming.

Behavior coverage (PLAN 17-02 Task 2):
- test_priming_outline       -> generate_article_multistep(gsc_queries=[...]) injects in outline
- test_priming_faq           -> top 3 gsc queries diventano candidate FAQ
- test_graceful_degrade      -> gsc_queries=None / [] -> comportamento identico pre-Phase 17
- test_main_fetches_gsc      -> main() flow chiama search_analytics quando keyword presente
"""

import sys
import os
import json
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ─── claude_client.generate_article_multistep priming ─────────────────────


class TestGenerateMultistepPriming:
    def test_priming_outline_includes_queries(self, monkeypatch):
        """Quando passi gsc_queries, _generate_outline prompt include le query."""
        from agents.lib import claude_client

        captured_prompts = []

        def fake_ask(prompt, *, system="", max_tokens=2048, timeout=180, enable_thinking=False):
            captured_prompts.append(prompt)
            # Ritorna outline JSON minimo valido
            if "outline" in prompt.lower() or "Generate an outline" in prompt:
                return json.dumps({
                    "intro_angle": "test angle",
                    "sections": [{"h2": "Section A", "key_points": ["p1", "p2"], "target_words": 320}],
                    "faq_topics": ["q1?", "q2?", "q3?", "q4?"],
                })
            # Section / assembly / seo prompts -> return placeholder HTML
            if "Article title" in prompt and "Section" in prompt:
                return "<h2>Section A</h2><p>content</p>"
            if "Hook angle" in prompt or "Existing sections" in prompt:
                return "<p>intro</p><h2>Section A</h2><p>content</p><p>conc</p>"
            # SEO prompt
            return "EXCERPT: e\nSEO_TITLE: t\nSEO_DESCRIPTION: d"

        monkeypatch.setattr(claude_client, "ask", fake_ask)

        gsc_queries = [
            {"query": "smoked brisket flat", "clicks": 5, "impressions": 200, "ctr": 0.025, "position": 7.2},
            {"query": "brisket point recipe", "clicks": 3, "impressions": 120, "ctr": 0.025, "position": 8.1},
            {"query": "brisket internal temp", "clicks": 2, "impressions": 80, "ctr": 0.025, "position": 6.4},
        ]
        result = claude_client.generate_article_multistep(
            title="Brisket guide", keyword="brisket", cluster="brisket",
            content_type="recipe", gsc_queries=gsc_queries,
        )
        assert "content" in result
        # outline prompt e' captured_prompts[0]
        outline_prompt = captured_prompts[0]
        # tutte le query GSC presenti
        assert "smoked brisket flat" in outline_prompt
        assert "brisket point recipe" in outline_prompt
        # marker dell'iniezione GSC
        assert "REAL GOOGLE QUERIES" in outline_prompt or "gsc" in outline_prompt.lower()

    def test_priming_faq_uses_top_3_queries(self, monkeypatch):
        """Top 3 GSC queries vengono prepended a faq_topics nell'assembly."""
        from agents.lib import claude_client

        captured = []

        def fake_ask(prompt, *, system="", max_tokens=2048, timeout=180, enable_thinking=False):
            captured.append(prompt)
            if "Generate an outline" in prompt:
                return json.dumps({
                    "intro_angle": "x",
                    "sections": [{"h2": "S", "key_points": ["p"], "target_words": 320}],
                    "faq_topics": ["original-q1?", "original-q2?"],
                })
            if "Section " in prompt and "Article title" in prompt:
                return "<h2>S</h2><p>c</p>"
            if "Existing sections" in prompt:
                # questo prompt deve contenere le top 3 query GSC come candidate FAQ
                return "<p>i</p><h2>S</h2><p>c</p><p>conc</p>"
            return "EXCERPT: e\nSEO_TITLE: t\nSEO_DESCRIPTION: d"

        monkeypatch.setattr(claude_client, "ask", fake_ask)

        gsc_queries = [
            {"query": "gsc-q1 first?", "clicks": 10, "impressions": 500, "ctr": 0.02, "position": 5.0},
            {"query": "gsc-q2 second?", "clicks": 8, "impressions": 400, "ctr": 0.02, "position": 6.0},
            {"query": "gsc-q3 third?", "clicks": 5, "impressions": 250, "ctr": 0.02, "position": 7.0},
            {"query": "gsc-q4 fourth?", "clicks": 3, "impressions": 150, "ctr": 0.02, "position": 8.0},
        ]
        claude_client.generate_article_multistep(
            title="t", keyword="k", cluster="c", content_type="blog",
            gsc_queries=gsc_queries,
        )
        # Assembly prompt e' nei captured (3a chiamata: outline, section, assembly, seo)
        assembly_prompt = [p for p in captured if "Existing sections" in p][0]
        # Top 3 query devono apparire come candidate FAQ
        assert "gsc-q1 first?" in assembly_prompt
        assert "gsc-q2 second?" in assembly_prompt
        assert "gsc-q3 third?" in assembly_prompt

    def test_graceful_degrade_when_no_queries(self, monkeypatch):
        """gsc_queries=None -> outline prompt NON contiene REAL GOOGLE QUERIES."""
        from agents.lib import claude_client

        captured = []

        def fake_ask(prompt, *, system="", max_tokens=2048, timeout=180, enable_thinking=False):
            captured.append(prompt)
            if "Generate an outline" in prompt:
                return json.dumps({
                    "intro_angle": "x",
                    "sections": [{"h2": "S", "key_points": ["p"], "target_words": 320}],
                    "faq_topics": ["original-q1?"],
                })
            if "Section " in prompt:
                return "<h2>S</h2><p>c</p>"
            if "Existing sections" in prompt:
                return "<p>i</p><h2>S</h2><p>c</p><p>conc</p>"
            return "EXCERPT: e\nSEO_TITLE: t\nSEO_DESCRIPTION: d"

        monkeypatch.setattr(claude_client, "ask", fake_ask)

        # 1 — Call senza gsc_queries
        claude_client.generate_article_multistep(
            title="t", keyword="k", cluster="c", content_type="blog",
            gsc_queries=None,
        )
        outline_prompt_no_gsc = captured[0]
        assembly_prompt_no_gsc = [p for p in captured if "Existing sections" in p][0]
        # Niente menzione REAL GOOGLE QUERIES nel outline
        assert "REAL GOOGLE QUERIES" not in outline_prompt_no_gsc
        # Niente query GSC nel assembly (solo original-q1?)
        assert "gsc-q" not in assembly_prompt_no_gsc

    def test_graceful_degrade_when_empty_list(self, monkeypatch):
        """gsc_queries=[] (lista vuota) deve essere equivalente a None."""
        from agents.lib import claude_client

        captured = []

        def fake_ask(prompt, *, system="", max_tokens=2048, timeout=180, enable_thinking=False):
            captured.append(prompt)
            if "Generate an outline" in prompt:
                return json.dumps({
                    "intro_angle": "x",
                    "sections": [{"h2": "S", "key_points": ["p"], "target_words": 320}],
                    "faq_topics": ["original?"],
                })
            if "Section " in prompt:
                return "<h2>S</h2><p>c</p>"
            if "Existing sections" in prompt:
                return "<p>i</p><h2>S</h2><p>c</p><p>conc</p>"
            return "EXCERPT: e\nSEO_TITLE: t\nSEO_DESCRIPTION: d"

        monkeypatch.setattr(claude_client, "ask", fake_ask)

        claude_client.generate_article_multistep(
            title="t", keyword="k", cluster="c", content_type="blog",
            gsc_queries=[],
        )
        assert "REAL GOOGLE QUERIES" not in captured[0]


# ─── content_generator main fetches GSC ───────────────────────────────────


class TestContentGeneratorFetchesGsc:
    def test_main_fetches_gsc_for_keyword(self, monkeypatch):
        """Verifica via grep che generate_article passa gsc_queries kwarg."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "content_generator.py"
        text = src.read_text(encoding="utf-8")
        # main / generate_article DEVE menzionare gsc_queries
        assert "gsc_queries" in text, "content_generator non passa gsc_queries"
        # Importa gsc_client (lazy o top-level)
        assert "gsc_client" in text, "content_generator non importa gsc_client"

    def test_outline_helper_has_gsc_block_marker(self):
        """_generate_outline ha logica condizionale REAL GOOGLE QUERIES."""
        import pathlib
        src = pathlib.Path(__file__).parent.parent / "lib" / "claude_client.py"
        text = src.read_text(encoding="utf-8")
        assert "gsc_queries" in text
        assert "REAL GOOGLE QUERIES" in text, "manca marker di iniezione GSC nel outline"
