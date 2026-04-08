# BBQ Experience

Editorial portal for the BBQ Experience brand (74k Instagram followers). Reviews, recipes, tutorials, and news for the BBQ community. Multilingual (EN/IT/ES).

**Live:** https://bbq-experience.com
**CMS:** https://cms.bbq-experience.com/admin

## Architecture

```
User -> Cloudflare CDN -> Caddy -> Astro SSR (:4321) -> Strapi CMS (:1337) -> PostgreSQL
```

- **Frontend:** Astro 6 (SSR, islands architecture, Tailwind 4, GSAP animations)
- **CMS:** Strapi 5 (headless, 12 content types, i18n plugin)
- **Database:** PostgreSQL 16
- **Deploy:** Git push -> GitHub webhook -> Hetzner VPS -> Docker rebuild
- **AI Agents:** Content generation (Claude), translation (Ollama), SEO optimization, competitor monitoring

## Project Structure

```
bbqexperience/
  cms/              # Strapi 5 CMS (Dockerfile, config, content-type schemas)
  web/              # Astro 6 frontend (pages, components, API endpoints)
  scripts/
    agents/         # Python AI agents (content gen, translation, SEO, monitoring)
      lib/          # Shared libraries (strapi_client, telegram, claude_client)
    *.mjs           # One-off seed/migration scripts
    *.sh            # Infra scripts (rebuild, backup, restore)
  docs/             # Architecture docs, content strategy, runbook
  state/            # Runtime state files (gitignored content, .gitkeep tracked)
```

## Quick Start (Development)

```bash
# 1. Start CMS + database
docker compose up -d

# 2. Install frontend deps and start dev server
cd web
npm install
npm run dev
# -> http://localhost:4321

# 3. Access Strapi admin
# -> http://localhost:1337/admin
```

Requires: Docker, Node.js 22+, npm

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

| Variable | Purpose |
|----------|---------|
| `STRAPI_API_TOKEN` | API access to Strapi (generate in admin panel) |
| `DATABASE_PASSWORD` | PostgreSQL password |
| `BREVO_API_KEY` | Newsletter service (Brevo/Sendinblue) |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API for post sync |
| `TELEGRAM_BOT_TOKEN` | Agent notifications via Telegram |

For AI agents on Windows, configure `scripts/agents/.env.windows`.

## Deployment

Deploy is automatic via webhook on every `git push` to `main`:

1. GitHub sends POST to `http://<server>:9000/hooks/bbqexperience`
2. Webhook triggers `scripts/rebuild-web.sh`
3. Astro builds inside Docker container
4. Smoke test verifies all locale homepages respond 200
5. Output copied to Caddy-served directory

**No GitHub Actions.** Deploy runs on the Hetzner VPS via [adnanh/webhook](https://github.com/adnanh/webhook).

## AI Agents

| Agent | Schedule | Platform | Purpose |
|-------|----------|----------|---------|
| `content_generator.py` | Daily 06:00 | Windows | Generate articles via Claude CLI |
| `claude_reviewer.py` | Daily 07:00 | Windows | Quality review of generated content |
| `translation_agent.py` | Every 6h | Ubuntu (local) | Translate to IT/ES via Ollama |
| `seo_optimizer.py` | 09:00, 15:00 | Hetzner | Internal linking optimization |
| `keyword_scout.py` | Monday 05:00 | Hetzner | Google Suggest keyword discovery |
| `competitor_monitor.py` | Every 12h | Hetzner | RSS tracking of BBQ blogs |
| `content_promoter.py` | Every 6h | Ubuntu (local) | Bridge content to Instagram bot |
| `telegram_bot.py` | Daemon | Hetzner | Dashboard and monitoring bot |

## Database

- **Backup:** Daily via `scripts/backup-db.sh` (30-day retention)
- **Restore:** `scripts/restore-db.sh <backup-file.sql.gz>` (with rollback safety)
- **Container:** `postgres:16-alpine`

## Content Types (Strapi)

blog-post, recipe, review, tutorial, product, instagram-post, subscriber, editorial-calendar, brand, partnership, keyword-tracker, content-queue

## License

Private repository. All rights reserved.
