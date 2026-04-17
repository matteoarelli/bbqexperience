# Phase 11: Strapi Schema Migration & Localization Helper - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 11-strapi-schema-migration-localization-helper
**Areas discussed:** Product Category Taxonomy, Schema Changes Scope, Locale Helper Strategy, Migration & Downtime

---

## Product Category Taxonomy

### Existing product mapping
| Option | Description | Selected |
|--------|-------------|----------|
| Map fuel→accessory, other→accessory | Semplice: i pochi prodotti fuel/other diventano accessori. Nessuna categoria residua. | ✓ |
| Aggiungi fuel e other come categorie | Mantieni tutte e 7 le categorie (5 roadmap + fuel + other). Più preciso, ma la UI filtri avrà più opzioni. | |
| Decidi tu (Claude) | Lascia a Claude la decisione sul mapping basandosi sui prodotti reali presenti. | |

**User's choice:** Map fuel→accessory, other→accessory
**Notes:** Clean mapping, 5 categorie finali come da ROADMAP

### Category translations
| Option | Description | Selected |
|--------|-------------|----------|
| Definiscili ora | Fissiamo grill/griglia/parrilla, smoker/affumicatore/ahumador ecc. | |
| Lascia al planner | Il planner o il researcher troveranno le traduzioni standard BBQ per IT/ES | ✓ |

**User's choice:** Lascia al planner

### Old category field
| Option | Description | Selected |
|--------|-------------|----------|
| Rimuovi completamente | Clean break. Lo schema non ha più il campo enum dopo la migration. | ✓ |
| Mantieni read-only | Tieni il campo enum come backup ma non mostrarlo nell'admin. | |

**User's choice:** Rimuovi completamente
**Notes:** Nessun deprecated field, clean break

---

## Schema Changes Scope

### Subscriber source values
| Option | Description | Selected |
|--------|-------------|----------|
| Sì, quei 5 valori | inline, landing, footer, exit-intent, legacy | ✓ |
| Decidi tu | Claude decide il set esatto | |

**User's choice:** Sì, quei 5 valori (inline, landing, footer, exit-intent, legacy)

### Price range handling
| Option | Description | Selected |
|--------|-------------|----------|
| Non toccare ora | Phase 13 farà il mapping enum→€ sul frontend | |
| Sostituisci con campo numerico | Aggiungi un campo `price` (decimal) e rimuovi l'enum | ✓ |

**User's choice:** Sostituisci con campo numerico
**Notes:** Consente filtri € diretti in Phase 13 senza mapping artificiale

### Recipe-collection scaffold
| Option | Description | Selected |
|--------|-------------|----------|
| Sì, solo schema CMS | Content type recipe-collection senza UI frontend | |
| Anche relazione recipe→collection | Sia il content type CHE la relazione sul Recipe | ✓ |

**User's choice:** Anche relazione recipe→collection
**Notes:** Phase 14 trova tutto pronto CMS-side

---

## Locale Helper Strategy

### Helper scope
| Option | Description | Selected |
|--------|-------------|----------|
| Solo TS helper per CMS | Il Python è già OK. Crea solo TypeScript helper. | |
| Verifica + documenta Python, crea TS | Verifica agent compliance, documenta, e crea TS helper. | ✓ |
| Solo documentazione | Nessun nuovo helper, solo docs. | |

**User's choice:** Verifica + documenta Python, crea TS

### Refactoring extent
| Option | Description | Selected |
|--------|-------------|----------|
| Sì, solo audit + fix se manca slug | Grep per chiamate update() senza slug e fixa | |
| Decidi tu | Claude valuta e decide | ✓ |

**User's choice:** Decidi tu (Claude's discretion)

---

## Migration & Downtime

### Migration strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Script Python one-shot | Script in scripts/agents/ via REST API | |
| Script Node.js CMS-side | Script in cms/scripts/ via entityService | ✓ |
| Manuale via admin | 25 prodotti a mano nell'admin panel | |

**User's choice:** Script Node.js CMS-side
**Notes:** Più vicino al runtime CMS, usa entityService interno

### Downtime handling
| Option | Description | Selected |
|--------|-------------|----------|
| Off-peak, nessun avviso | Deploy di notte/mattina, Matteo evita admin durante rebuild | ✓ |
| Maintenance mode | Flag di manutenzione formale | |

**User's choice:** Off-peak, nessun avviso

---

## Claude's Discretion

- Locale helper refactoring: Claude valuta le chiamate agent e decide cosa fixare
- Recipe-collection schema details: field types, constraints, ordering mechanism
- Product-category slug convention e admin display config

## Deferred Ideas

None — discussion stayed within phase scope
