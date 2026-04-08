#!/bin/bash
# Claude Strategist — gira sul PC Windows di Matteo via Task Scheduler
cd "$(dirname "$0")/../.."

# Carica env vars da file locale (NON committato)
set -a
source scripts/agents/.env.windows
set +a

python3 scripts/agents/claude_strategist.py 2>&1 | tee -a logs/claude-strategist-windows.log
