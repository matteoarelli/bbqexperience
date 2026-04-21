"""Test per ab_tester.py — verifica z-test e logica soglie vincitore."""

import sys
import os

# Aggiungi path agenti per import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_tester import two_proportion_ztest, should_declare_winner


class TestTwoProportionZTest:
    """Test correttezza matematica del two-proportion z-test."""

    def test_different_proportions(self):
        """50/1000 vs 80/1000 — z negativo, p_value tra 0 e 1."""
        z, p = two_proportion_ztest(50, 1000, 80, 1000)
        assert z < 0, f"z dovrebbe essere negativo, ottenuto {z}"
        assert 0 < p < 1, f"p_value dovrebbe essere tra 0 e 1, ottenuto {p}"

    def test_equal_proportions(self):
        """500/1000 vs 500/1000 — z vicino a 0, p_value vicino a 1."""
        z, p = two_proportion_ztest(500, 1000, 500, 1000)
        assert abs(z) < 0.01, f"z dovrebbe essere ~0, ottenuto {z}"
        assert p > 0.95, f"p_value dovrebbe essere ~1, ottenuto {p}"

    def test_zero_successes(self):
        """0/1000 vs 0/1000 — caso limite, z=0, p=1.0."""
        z, p = two_proportion_ztest(0, 1000, 0, 1000)
        assert z == 0.0, f"z dovrebbe essere 0.0, ottenuto {z}"
        assert p == 1.0, f"p_value dovrebbe essere 1.0, ottenuto {p}"


class TestShouldDeclareWinner:
    """Test logica soglie per dichiarazione vincitore."""

    def test_insufficient_impressions(self):
        """Meno di 500 impression — non dichiarare vincitore."""
        assert should_declare_winner(400, 400, 10, 0.01) is False

    def test_insufficient_days(self):
        """Meno di 7 giorni — non dichiarare vincitore."""
        assert should_declare_winner(600, 600, 5, 0.01) is False

    def test_all_conditions_met(self):
        """Tutte le condizioni soddisfatte — dichiarare vincitore."""
        assert should_declare_winner(600, 600, 7, 0.01) is True

    def test_high_p_value(self):
        """p_value >= 0.05 anche con dati sufficienti — non dichiarare."""
        assert should_declare_winner(600, 600, 10, 0.10) is False
