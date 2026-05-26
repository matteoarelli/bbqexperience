"""Test stubs per lib/gsc_client.py — bodies implementati in Task 2."""

import sys
import os

# sys.path: aggiunge scripts/ così possiamo fare `from agents.lib import gsc_client`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest


def test_parse_top_queries():
    pytest.skip("implemented in Task 2")


def test_parse_top_pages():
    pytest.skip("implemented in Task 2")


def test_queries_for_page_filter():
    pytest.skip("implemented in Task 2")


def test_retry_5xx_3times():
    pytest.skip("implemented in Task 2")


def test_no_retry_4xx():
    pytest.skip("implemented in Task 2")


def test_request_indexing_soft_fail():
    pytest.skip("implemented in Task 2")


def test_inspect_url_parsing():
    pytest.skip("implemented in Task 2")
