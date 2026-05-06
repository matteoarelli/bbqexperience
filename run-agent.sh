#!/bin/bash
# Wrapper per eseguire agenti con env vars caricate
set -a
source /home/matteo/bbqexperience/.env
export PATH="/home/matteo/.npm-global/bin:/home/matteo/.local/bin:$PATH"
set +a
cd /home/matteo/bbqexperience
python3 "scripts/agents/$1" 2>&1
