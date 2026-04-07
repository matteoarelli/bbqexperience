# Google Search Console API Setup

## Prerequisiti
1. Proprieta bbq-experience.com verificata in Google Search Console
2. Google Cloud project con Search Console API abilitata
3. Service account con accesso alla proprieta GSC

## Setup

### 1. Crea progetto Google Cloud
- Vai su https://console.cloud.google.com
- Crea progetto "BBQ Experience"
- Abilita "Google Search Console API"

### 2. Crea Service Account
- IAM & Admin → Service Accounts → Create
- Nome: bbq-experience-gsc
- Scarica JSON key → salva come `/opt/services/bbqexperience/gsc-credentials.json`

### 3. Aggiungi Service Account a GSC
- Search Console → Impostazioni → Utenti e autorizzazioni
- Aggiungi utente: [email del service account]
- Permesso: Completo

### 4. Environment variables
```bash
# Aggiungi a /opt/services/bbqexperience/.env
GSC_CREDENTIALS_PATH=/opt/services/bbqexperience/gsc-credentials.json
GSC_SITE_URL=https://bbq-experience.com
```

### 5. Test
```bash
cd /opt/services/bbqexperience/app
python3 -c "
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os, json

creds = service_account.Credentials.from_service_account_file(
    os.environ['GSC_CREDENTIALS_PATH'],
    scopes=['https://www.googleapis.com/auth/webmasters.readonly']
)
service = build('searchconsole', 'v1', credentials=creds)
response = service.searchanalytics().query(
    siteUrl=os.environ['GSC_SITE_URL'],
    body={'startDate': '2026-04-01', 'endDate': '2026-04-07', 'dimensions': ['query'], 'rowLimit': 5}
).execute()
for row in response.get('rows', []):
    print(f'{row[\"keys\"][0]}: pos={row[\"position\"]:.1f}, imp={row[\"impressions\"]}, clicks={row[\"clicks\"]}')
"
```
