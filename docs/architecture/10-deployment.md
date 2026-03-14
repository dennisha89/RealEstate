# Deployment Architecture — RealEstate Intelligence Platform

## Current Stage: Development

The platform is in early development. No production deployment exists yet. This document outlines the target deployment architecture.

---

## Deployment Strategy: Vercel + Supabase

**Primary deployment target:** Vercel (optimized for Next.js)
**Database:** Supabase (managed PostgreSQL + TimescaleDB + Auth)
**Cache:** Upstash Redis (serverless Redis, Vercel-native)

### Why Vercel + Supabase (not AWS ECS)?

| Factor | Vercel + Supabase | AWS ECS |
|--------|-------------------|---------|
| Setup time | Minutes | Days |
| Next.js optimization | Native | Manual |
| Scaling | Automatic | Config required |
| Cost at low scale | Free/Pro tier | $100+/mo minimum |
| DevOps burden | Zero | High |
| Edge functions | Built-in | Lambda@Edge |

**Decision:** Start with Vercel + Supabase. Migrate to AWS only if scale demands it (>10k concurrent users or custom infrastructure needs).

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                        │
│              (Global CDN + Edge Functions)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Next.js Application                                 │    │
│  │  ├── Static pages (landing) → Edge cached            │    │
│  │  ├── Server Components → Serverless functions        │    │
│  │  ├── API Routes (12) → Serverless functions          │    │
│  │  └── Client bundle → CDN distributed                 │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────────┐
          │               │                   │
          ▼               ▼                   ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Supabase       │ │ Upstash      │ │ External APIs    │
│  ├── PostgreSQL │ │ Redis        │ │ ├── ATTOM        │
│  │   + Timescale│ │ ├── API cache│ │ ├── RentCast     │
│  ├── Auth (JWT) │ │ ├── Rate lim │ │ ├── Census ACS   │
│  ├── RLS        │ │ └── Sessions │ │ ├── FRED         │
│  └── Realtime   │ │              │ │ ├── BLS          │
└─────────────────┘ └──────────────┘ │ ├── Walk Score   │
                                     │ ├── GreatSchools │
                                     │ └── Bright Data  │
                                     └──────────────────┘
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env.local (development)
# .env.production (production — set in Vercel dashboard)

# Supabase (P0 — required for auth + database)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (P0 — required for caching + rate limiting)
REDIS_URL=redis://xxx.upstash.io:6379
REDIS_TOKEN=xxx

# Data Sources — P0
ATTOM_API_KEY=xxx
RENTCAST_API_KEY=xxx
CENSUS_API_KEY=xxx

# Data Sources — P1
FRED_API_KEY=xxx
BLS_API_KEY=xxx
WALKSCORE_API_KEY=xxx
GREATSCHOOLS_API_KEY=xxx

# Data Sources — P2
BRIGHTDATA_API_KEY=xxx
CLIMATECHECK_API_KEY=xxx

# Maps + AI
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Vercel Project Settings

```bash
# Framework: Next.js (auto-detected)
# Build command: npm run build
# Output directory: .next
# Install command: npm ci
# Node.js version: 18.x
```

---

## Database Deployment (Supabase)

### Initial Setup

1. Create Supabase project
2. Enable TimescaleDB extension
3. Run schema files in order:

```bash
# Execute in Supabase SQL Editor or via CLI
psql $SUPABASE_DB_URL -f database/01_schema.sql
psql $SUPABASE_DB_URL -f database/02_indexes_optimization.sql
psql $SUPABASE_DB_URL -f database/05_market_intelligence_schema.sql
psql $SUPABASE_DB_URL -f database/06_microeconomics_rental_schema.sql
psql $SUPABASE_DB_URL -f database/07_money_flow_schema.sql
```

4. Run migrations:

```bash
psql $SUPABASE_DB_URL -f database/migrations/001_enable_timescaledb.sql
psql $SUPABASE_DB_URL -f database/migrations/002_create_hypertables.sql
psql $SUPABASE_DB_URL -f database/migrations/003_rls_policies.sql
```

### RLS Policies

All tables use Row-Level Security:
- Users can only read/write their own analyses
- Market data is read-only for all authenticated users
- Admin role for data pipeline operations

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: property-analyzer/package-lock.json

      - name: Install dependencies
        run: cd property-analyzer && npm ci

      - name: Type check
        run: cd property-analyzer && npx tsc --noEmit

      - name: Run tests
        run: cd property-analyzer && npm test

      - name: Build
        run: cd property-analyzer && npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

### Branch Strategy

| Branch | Purpose | Deployment |
|--------|---------|------------|
| `main` | Production | Auto-deploy to Vercel production |
| `develop` | Staging | Auto-deploy to Vercel preview |
| `feature/*` | Feature branches | Preview deployments on PR |

---

## Pre-Deployment Checklist

### Before First Deploy
- [ ] Supabase project created with TimescaleDB enabled
- [ ] All schema files executed
- [ ] RLS policies applied
- [ ] Environment variables set in Vercel dashboard
- [ ] At least P0 API keys obtained (ATTOM, RentCast, Census)
- [ ] Upstash Redis instance created
- [ ] Mapbox account created (for map components)

### Before Each Deploy
- [ ] `npm run build` passes locally
- [ ] All tests pass
- [ ] TypeScript compiles with no errors
- [ ] No hardcoded API keys in code
- [ ] Database migrations tested on staging

---

## Monitoring

### Vercel Analytics (Built-in)
- Web Vitals (LCP, FID, CLS)
- Function execution times
- Error rates by route

### Supabase Dashboard
- Database query performance
- Auth session metrics
- Real-time connection count

### Application-Level (Phase 4)
- Sentry for error tracking
- Custom metrics: analysis completion rate, engine execution times, cache hit rates
- External API health monitoring (track which data sources are down)

---

## Cost Estimate

### Development / MVP

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/mo |
| Supabase | Pro | $25/mo |
| Upstash Redis | Pay-as-you-go | ~$5/mo |
| ATTOM API | Developer | $50-100/mo |
| RentCast API | Basic | $30/mo |
| Census API | Free | $0 |
| FRED API | Free | $0 |
| Mapbox | Free tier | $0 (50k loads) |

**Total: ~$130-180/month**

### Growth (1000+ users)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/mo + usage |
| Supabase | Pro | $25/mo + usage |
| Upstash Redis | Pro | $20/mo |
| Data APIs | Higher tiers | $200-400/mo |
| Mapbox | Pay-as-you-go | $50/mo |

**Total: ~$400-600/month**

---

## Future Migration Path (if needed)

If Vercel + Supabase limitations are hit:

1. **Database:** Supabase → Self-managed PostgreSQL + TimescaleDB on AWS RDS
2. **Application:** Vercel → AWS ECS Fargate (containerized Next.js)
3. **Cache:** Upstash → AWS ElastiCache Redis
4. **CDN:** Vercel Edge → CloudFront

This migration is straightforward because:
- Next.js runs anywhere with `npm run build && npm start`
- Supabase client works with any PostgreSQL (change connection string)
- Redis client works with any Redis instance (change URL)
- No vendor lock-in in application code
