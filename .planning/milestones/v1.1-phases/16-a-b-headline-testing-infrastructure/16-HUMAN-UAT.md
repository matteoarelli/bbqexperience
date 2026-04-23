---
status: partial
phase: 16-a-b-headline-testing-infrastructure
source: [16-VERIFICATION.md]
started: 2026-04-21T19:35:00Z
updated: 2026-04-21T19:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Bot UA receives control variant
expected: curl -A 'Googlebot/2.1' against a blog post with an active experiment returns original post.title in h1, not a variant title
result: [pending]

### 2. ab_id cookie set on first visit
expected: curl -v https://bbq-experience.com/en/blog/ shows Set-Cookie with ab_id, 30-day max-age
result: [pending]

### 3. Umami ab-impression events appear
expected: After creating an active ab-experiment and visiting the post, Umami dashboard shows ab-impression events within 24h
result: [pending]

### 4. ab_tester.py --dry-run works
expected: python scripts/agents/ab_tester.py --dry-run produces formatted report with Brevo A/B section, no Telegram send
result: [pending]

### 5. Webhook exclusion end-to-end
expected: Editing an ab-experiment in Strapi admin does NOT trigger rebuild in /opt/webhooks/logs/bbqexperience.log
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
