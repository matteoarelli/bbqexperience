#!/bin/bash
# Content Generator — gira sul PC Windows di Matteo via Task Scheduler
cd "$(dirname "$0")/../.."

# Carica env vars da file locale (NON committato)
set -a
source scripts/agents/.env.windows
set +a

python3 scripts/agents/content_generator.py 2>&1 | tee -a logs/content-generator-windows.log
