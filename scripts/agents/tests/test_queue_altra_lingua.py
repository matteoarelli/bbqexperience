"""Ricerche non in inglese o legate a un luogo (21/10/2026).

Lo scout aveva accodato "Charcoal Grill Traduzione", "Smoke Ring Roma" e
"Limpiador De Parrillas": 3 argomenti su 7 da buttare a mano.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from agents.queue_quality_audit import motivo_scarto  # noqa: E402


@pytest.mark.parametrize("titolo", [
    "Charcoal Grill Traduzione",
    "Smoke Ring Roma",
    "Limpiador De Parrillas",
    "Texas Brisket Ricetta",
    "Come affumicare il salmone",
    "Barbacoa en olla de presión",
    "Migliore griglia a carbone",
])
def test_scarta_altre_lingue_e_luoghi(titolo):
    assert motivo_scarto(titolo)


@pytest.mark.parametrize("titolo", [
    "Bbq Smoking Wood Types",
    "Wireless Thermometer Bbq",
    "Smoked Brisket Queso Dip",
    "Bbq Rub Recipe For Chicken Wings",
    "Carne Asada On The Grill",
    "How To Smoke Meat In The Oven",
    "Charcoal Grilled Chicken",
    "Napoleon Prestige Pro 500",
    "Pellet Grill Vs Offset Smoker",
])
def test_tiene_ricerche_inglesi(titolo):
    assert motivo_scarto(titolo) is None
