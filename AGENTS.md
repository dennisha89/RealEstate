# AGENTS.md — RealEstate Intelligence Platform

## Overview
This project uses a multi-agent architecture with 9 specialized Claude Code subagents. Each agent owns a specific domain and has deep context about its files, APIs, and responsibilities.

## Agent Definitions

All agent definitions live in `.claude/agents/` as markdown files with YAML frontmatter.

### Agent Roster

| Agent | File | Domain | When to Use |
|-------|------|--------|-------------|
| **market-researcher** | `.claude/agents/market-researcher.md` | Market trends, demographics, economics, capital flows | "What's the market like in Austin?" |
| **property-valuator** | `.claude/agents/property-valuator.md` | Comparable sales, AVMs, property-level assessment | "What is 123 Main St worth?" |
| **deal-analyzer** | `.claude/agents/deal-analyzer.md` | Financial modeling, cap rates, cash flow, stress tests | "Is this a good deal at $250k?" |
| **risk-assessor** | `.claude/agents/risk-assessor.md` | Risk scoring across 7 dimensions | "What are the risks of investing here?" |
| **data-pipeline** | `.claude/agents/data-pipeline.md` | API integrations, ETL, data validation, caching | "Wire up Census API" or fixing data issues |
| **ui-architect** | `.claude/agents/ui-architect.md` | Components, pages, charts, maps, design system | "Build the dashboard" or any UI work |
| **database-engineer** | `.claude/agents/database-engineer.md` | PostgreSQL, TimescaleDB, migrations, queries | Schema changes, query optimization |
| **test-engineer** | `.claude/agents/test-engineer.md` | Unit, integration, component, E2E tests | Adding or fixing tests |
| **code-reviewer** | `.claude/agents/code-reviewer.md` | Code quality, security, performance review | PR reviews, quality checks |

## Multi-Agent Workflows

### Full Property Analysis Pipeline
```
data-pipeline (fetch real data)
    ├── property-valuator (value + comps)     ← parallel
    └── market-researcher (market context)    ← parallel
            └── deal-analyzer (financial model)
                    └── risk-assessor (risk scoring)
```

### New Feature Development
```
ui-architect (design + components)     ← parallel
database-engineer (schema + queries)   ← parallel
    └── data-pipeline (wire data)
        └── test-engineer (test everything)
            └── code-reviewer (quality check)
```

## Conventions
- Agents use `model: sonnet` for speed on routine tasks
- Switch to `model: opus` for complex financial modeling or architectural decisions
- Each agent has access only to the tools it needs (principle of least privilege)
- Agents cite file paths and line numbers when referencing code
- Agents never silently use mock data — they flag it explicitly

## Adding New Agents
Create a new `.md` file in `.claude/agents/` with:
1. YAML frontmatter: `name`, `description`, `tools`, `model`
2. Role description and expertise
3. Owned files and directories
4. Data sources and APIs
5. Output format specification
6. Rules and constraints
