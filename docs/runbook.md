# BBQ Experience — Runbook Operativo

## Deploy Manuale

### Trigger rebuild senza git push
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 '/opt/webhooks/scripts/rebuild-web.sh'
```

### Verifica stato deploy
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'tail -20 /opt/webhooks/logs/bbqexperience.log'
```

## Ripristino Backup

### Elenco backup disponibili
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'ls -lh /opt/backups/bbqexperience/'
```

### Ripristino da backup
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 '/opt/webhooks/scripts/restore-db.sh /opt/backups/bbqexperience/bbqexperience_YYYY-MM-DD.sql.gz'
```

Il script chiede conferma prima di procedere. Strapi viene fermato, il DB ricreato, e Strapi riavviato.

### Verifica post-ripristino
1. Accedi a https://cms.bbq-experience.com/admin
2. Verifica che i contenuti siano presenti
3. Trigger un rebuild del frontend: `/opt/webhooks/scripts/rebuild-web.sh`

## Token Instagram

### Verifica scadenza token
Il token viene refreshato automaticamente ogni lunedi alle 04:00. Dura 60 giorni.

```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'tail -5 /opt/webhooks/logs/instagram-token.log'
```

### Generare nuovo token manualmente
1. Vai a https://developers.facebook.com/apps/
2. Seleziona l'app BBQ Experience
3. Tools > Graph API Explorer
4. Seleziona Instagram Graph API
5. Genera un User Access Token con permesso `instagram_basic`
6. Converti in long-lived token:
   ```
   GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={APP_SECRET}&access_token={SHORT_TOKEN}
   ```
7. Salva il token sul server:
   ```bash
   ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'echo "IL_NUOVO_TOKEN" > /opt/services/bbqexperience/.instagram-token'
   ```

## Container Docker

### Stato container
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

### Riavvio Strapi
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'docker restart bbqexperience-strapi'
```

### Riavvio PostgreSQL
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'docker restart bbqexperience-postgres'
```

### Log Strapi (ultimi errori)
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'docker logs bbqexperience-strapi --tail 50'
```

### Log Umami
```bash
ssh -i "~/.ssh/hetzner_production" root@204.168.153.43 'docker logs umami --tail 50'
```

## Troubleshooting

### Sito non raggiungibile
1. Verifica container: `docker ps` — tutti devono essere `Up`
2. Verifica Caddy: `docker logs caddy --tail 20`
3. Verifica DNS: `nslookup bbq-experience.com` — deve puntare a 204.168.153.43
4. Verifica Cloudflare: dashboard Cloudflare > SSL > verifica che sia attivo

### Build fallita
1. Leggi log: `tail -30 /opt/webhooks/logs/bbqexperience.log`
2. Causa comune: Strapi non raggiungibile durante la build
3. Verifica Strapi: `curl -s http://localhost:1337/_health`
4. Se Strapi e giu: `docker restart bbqexperience-strapi && sleep 10 && /opt/webhooks/scripts/rebuild-web.sh`

### Webhook non ricevuto
1. Verifica log webhook: `tail -20 /opt/webhooks/logs/webhook.log`
2. Verifica che GitHub abbia inviato: GitHub > Settings > Webhooks > Recent Deliveries
3. Causa comune: secret mismatch — verificare che `REBUILD_SECRET_TOKEN` corrisponda

### Immagini rotte
1. Verifica che il CMS sia raggiungibile: `curl -s https://cms.bbq-experience.com/_health`
2. Verifica upload directory: `ls /opt/services/bbqexperience/app/cms/public/uploads/`
3. Causa comune: PUBLIC_CMS_URL non impostato correttamente nel frontend

### Instagram sync fallito
1. Leggi log: `tail -20 /opt/webhooks/logs/instagram-sync.log`
2. Causa comune: token scaduto — vedi sezione "Token Instagram"
3. Test manuale: `cd /opt/services/bbqexperience && node /opt/webhooks/scripts/sync-instagram.mjs`

## Dashboard Servizi

| Servizio | URL | Note |
|----------|-----|------|
| Sito | https://bbq-experience.com | Frontend Astro |
| CMS | https://cms.bbq-experience.com/admin | Strapi admin |
| Analytics | https://analytics.bbq-experience.com | Umami dashboard |
| Sentry | https://sentry.io | Error tracking |
| UptimeRobot | https://uptimerobot.com | Uptime monitoring |
| Cloudflare | https://dash.cloudflare.com | DNS + CDN |
| Brevo | https://app.brevo.com | Newsletter |
| Hetzner | https://console.hetzner.cloud | VPS management |
