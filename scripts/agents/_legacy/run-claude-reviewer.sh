#!/bin/bash
# Claude Reviewer — gira sul PC Windows di Matteo via Task Scheduler
cd "$(dirname "$0")/../.."

# Carica env vars da file locale (NON committato)
set -a
source scripts/agents/.env.windows
set +a

python3 scripts/agents/claude_reviewer.py 2>&1 | tee -a logs/claude-reviewer-windows.log
