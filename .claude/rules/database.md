---
globs: "database/**/*.sql, **/migrations/**"
---

# Database Rules

- Enable TimescaleDB extension (currently commented out in 01_schema.sql line 16)
- Convert time-series tables to hypertables with proper chunk intervals
- All queries use `time_bucket()` for time-series aggregations
- Continuous aggregates for daily→weekly, weekly→monthly rollups
- Retention: raw data 2yr, aggregated 10yr
- Parameterized queries only ($1, $2) — never string interpolation
- All schema changes in versioned migration files in `database/migrations/`
- Test queries with EXPLAIN ANALYZE before deploying
- Always include `created_at` and `updated_at` on new tables
