#!/bin/bash
# Wrapper per eseguire agenti con env vars caricate
set -a
source /home/matteo/bbqexperience/.env
export PATH="/home/matteo/.npm-global/bin:/home/matteo/.local/bin:$PATH"
set +a
cd /home/matteo/bbqexperience
# "${@:2}" inoltra gli argomenti allo script (17/09/2026): serve a
# cover_generator.py --apply, che senza argomenti fa solo il report.
python3 "scripts/agents/$1" "${@:2}" 2>&1
