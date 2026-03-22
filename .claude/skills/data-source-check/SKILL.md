---
name: data-source-check
description: Check which data sources are using real APIs vs mock data. Flag any generateMock*() calls that need to be replaced.
user_invocable: true
---

Audit all data sources in the LootVue platform:

1. Search for all `generateMock` function calls across both `property-analyzer/` and `lootvue/`
2. Search for mock data files in `lootvue/src/lib/mock/` (capital-data.ts, exchange-data.ts, lender-data.ts)
3. For each mock found, identify:
   - Which file contains it
   - Which API route or page uses it
   - What real data source should replace it (ATTOM, RentCast, Census, FRED, BLS, etc.)
4. Check `property-analyzer/lib/engines/data-sources.ts` for real vs mock implementations
5. Check `lootvue/src/lib/engines/data-sources.ts` for real vs mock implementations
6. Report a table showing each data source, its status (real/mock), and priority (P0/P1/P2)
7. Flag any production routes still returning mock data

NEVER ship mock data to production.
