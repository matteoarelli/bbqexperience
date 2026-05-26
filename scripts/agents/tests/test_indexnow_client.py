"""Test stubs per lib/indexnow_client.py — bodies implementati in Task 2."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


def test_ping_payload_shape():
    pytest.skip("implemented in Task 2")


def test_ping_missing_key_noop():
    pytest.skip("implemented in Task 2")


def test_ping_422_returns_failure():
    pytest.skip("implemented in Task 2")
