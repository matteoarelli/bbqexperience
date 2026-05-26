"""CTR benchmark per-position — single source of truth.

Importato da: meta_optimizer.py, keyword_scout.py, claude_strategist.py.
Mai duplicare i valori inline. Mai try/except ImportError fallback.

Fonte: FirstPageSage 2026 + Backlinko 2024 (conservative cut).
Numeri Google English organic, no SERP features (no AI Overviews, no PAA box).

Uso tipico:
    from agents.lib.ctr_benchmark import (
        CTR_BENCHMARK, REWRITE_FACTOR, benchmark_for_position,
    )
    actual = row["ctr"]
    bench = benchmark_for_position(row["position"])
    if actual < bench * REWRITE_FACTOR:
        # page subperforma -> candidate per meta-rewrite
        ...
"""

# Per-position click-through rate benchmark.
CTR_BENCHMARK: dict[int, float] = {
    1: 0.398,
    2: 0.187,
    3: 0.103,
    4: 0.075,
    5: 0.051,
    6: 0.040,
    7: 0.030,
    8: 0.024,
    9: 0.020,
    10: 0.016,
}

# Trigger soglia rewrite: actual_ctr < CTR_BENCHMARK[pos] * REWRITE_FACTOR
# 0.6 = 40% sotto benchmark — soglia conservativa per evitare false positives
# (l'IT/ES ha CTR strutturalmente più bassi del EN, eviciamo over-trigger).
REWRITE_FACTOR: float = 0.6

# Posizione minima/massima valida (oltre la 10 il benchmark non e' significativo).
_MIN_POS = 1
_MAX_POS = 10


def benchmark_for_position(pos: float) -> float:
    """Ritorna il benchmark CTR per una posizione media (round + clamp 1-10).

    Esempi:
      benchmark_for_position(6.4) -> CTR_BENCHMARK[6] == 0.040
      benchmark_for_position(7.6) -> CTR_BENCHMARK[8] == 0.024
      benchmark_for_position(0.3) -> CTR_BENCHMARK[1] (clamp basso)
      benchmark_for_position(15)  -> CTR_BENCHMARK[10] (clamp alto)
    """
    rounded = max(_MIN_POS, min(_MAX_POS, round(pos)))
    return CTR_BENCHMARK[rounded]
