# AGENTS.md — RealEstate Intelligence Platform

## Overview

9 specialized Claude Code subagents in `.claude/agents/`. Each owns a domain with specific engine files, API routes, and data sources.

## MANDATORY: Research First

Every agent MUST use WebSearch/WebFetch before making decisions. All agents now have web access. No assumptions from cached knowledge — verify with real-world data.

## Agent Roster

| Agent | Color | Domain | Key Files |
|-------|-------|--------|-----------|
| `market-researcher` | blue | Market trends, demographics, capital flows | 7 engines, 3 API routes |
| `property-valuator` | green | Comps, AVM, property assessment | 2 engines, 3 API routes |
| `deal-analyzer` | yellow | Financial modeling, deal grading, stress tests | 7 engines, 4 API routes |
| `risk-assessor` | red | 7-dimension risk scoring | 6 engines, 3 API routes |
| `data-pipeline` | purple | API integrations, ETL, mock→real data | data-sources.ts (11 functions) |
| `ui-architect` | cyan | Components, charts, maps, pages | components/, app/ |
| `database-engineer` | orange | PostgreSQL, TimescaleDB, migrations | 5 schema files |
| `test-engineer` | green | Unit, integration, component, E2E tests | __tests__/ |
| `code-reviewer` | gray | Quality, security, performance review | Read-only + web |

## Workflows

```
Full Analysis:    data-pipeline → property-valuator + market-researcher (parallel) → deal-analyzer → risk-assessor
New Feature:      ui-architect + database-engineer (parallel) → data-pipeline → test-engineer
Quality Pass:     code-reviewer → test-engineer
```

## Conventions

- All agents use `model: sonnet` for speed. Switch to `opus` for complex reasoning.
- `maxTurns` set per agent to prevent runaway loops.
- `color` field for visual identification.
- Agents cite file paths and line numbers when referencing code.
- Agents never silently use mock data.
