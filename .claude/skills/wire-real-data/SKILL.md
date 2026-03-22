---
name: wire-real-data
description: Replace mock data in a LootVue engine with real API calls. Use when connecting FRED, FHFA, Zillow, Census, or other data sources to production code.
---

# Wire Real Data into an Engine

## Pre-Flight

1. Identify ALL `generateMock*()` calls in the target engine
2. For each mock function, determine the real data source from this table:

| Data Type | Real Source | API/Method |
|-----------|-----------|------------|
| Interest rates | FRED API | Series: MORTGAGE30US, DFF, DGS10 |
| Building permits | FRED API | Series: [MSA]BPPRIVSA |
| Home prices (MSA) | FHFA HPI via FRED | Bulk CSV or FRED series |
| Home prices (ZIP) | Zillow ZHVI | CSV download (check license) |
| Rental rates | Zillow ZORI or RentCast API | CSV or API |
| Demographics | Census ACS 5-Year | API: api.census.gov |
| Employment | BLS via FRED | Series: [MSA]NAN |
| Property details | ATTOM API | REST endpoints |
| Walk Score | Walk Score API | REST endpoint |
| School ratings | GreatSchools API | REST endpoint |

## Implementation Steps

3. Research the API docs online FIRST — check latest endpoints, rate limits, auth requirements
4. Create or update data fetcher in `lootvue/src/lib/engines/data-sources.ts`
5. Add Zod schema for API response validation
6. Implement caching layer with proper TTL:
   - Census: 30 days
   - BLS/RentCast: 7 days
   - FRED/ATTOM: 1 day
   - WalkScore/GreatSchools: 90 days
7. Add `asOfDate` to every data response
8. Replace mock call with real fetcher
9. Add fallback chain: API → cache (labeled 'stale') → 'Data unavailable' message
10. **NEVER silently return mock data** — error or label explicitly
11. Test with real data and verify values match authoritative sources
12. Update `docs/mock-data-inventory.md` to mark this mock as replaced

## Required Interface

Every data fetch must return:
```typescript
interface DataSourceResult<T> {
  data: T;
  source: string;          // e.g., 'FRED MORTGAGE30US'
  fetchedAt: string;       // ISO timestamp
  cacheExpiry: string;     // ISO timestamp
  status: 'fresh' | 'cached' | 'stale' | 'error';
}
```

## Post-Flight

13. Run `npx tsc --noEmit` to verify no type errors
14. Run `npm run build` to verify build succeeds
15. Verify the replaced data appears correctly in the UI
16. Keep `lootvue/` and `property-analyzer/` engines in sync
