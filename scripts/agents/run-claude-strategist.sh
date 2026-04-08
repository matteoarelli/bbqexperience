#!/bin/bash
# Claude Strategist — gira sul PC Windows di Matteo via Task Scheduler
# Analisi settimanale + generazione pillar content
# Programmato: domenica alle 07:00

cd "$(dirname "$0")/../.."

export STRAPI_URL="https://cms.bbq-experience.com"
export STRAPI_API_TOKEN="60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9"
export TELEGRAM_BOT_TOKEN="8416856369:AAEn8xcQHsVcrfNLnQ8xiYb5yB72KLoP0kc"
export TELEGRAM_CHAT_ID="415456994"
export UMAMI_URL="https://analytics.bbq-experience.com"
export UMAMI_PASSWORD="admin"
export UMAMI_SITE_ID="78df95b7-1b94-43e7-9f0d-38c63e99cf64"
export CLAUDE_CMD="claude"
export OLLAMA_URL="http://192.168.1.115:11434"
export OLLAMA_MODEL="qwen2.5:7b"

python3 scripts/agents/claude_strategist.py 2>&1 | tee -a logs/claude-strategist-windows.log
