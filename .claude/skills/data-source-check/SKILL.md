---
name: data-source-check
description: Check which data sources are using real APIs vs mock data. Flag any generateMock*() calls that need to be replaced.
user_invocable: true
---

Audit all data sources in the RealEstate project:

1. Search for all `generateMock` function calls across the codebase
2. For each mock found, identify:
   - Which file contains it
   - Which API route uses it
   - What real data source should replace it (ATTOM, RentCast, Census, FRED, BLS, etc.)
3. Check `lib/engines/data-sources.ts` for real vs mock implementations
4. Report a table showing each data source, its status (real/mock), and priority (P0/P1/P2)
5. Flag any production routes still returning mock data

NEVER ship mock data to production.
