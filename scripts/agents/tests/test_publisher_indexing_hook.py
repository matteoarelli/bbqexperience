"""Test stubs per il post-publish indexing hook — bodies implementati in Task 3.

WIRE_SITE discovered: scripts/agents/claude_review_runner.py:129 (strapi.publish in apply_review).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


def test_publish_triggers_indexing():
    pytest.skip("implemented in Task 3")


def test_publish_continues_on_indexing_failure():
    pytest.skip("implemented in Task 3")
