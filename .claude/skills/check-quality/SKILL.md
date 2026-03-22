---
name: check-quality
description: Run TypeScript checks, linting, and build validation for both lootvue and property-analyzer.
user_invocable: true
---

Run quality checks for the LootVue platform:

## Property Analyzer (Backend)
1. `cd property-analyzer && npx tsc --noEmit` - TypeScript type checking
2. `cd property-analyzer && npm run lint` - ESLint
3. `cd property-analyzer && npm run build` - Production build test

## LootVue (Frontend)
4. `cd lootvue && npx tsc --noEmit` - TypeScript type checking
5. `cd lootvue && npm run lint` - ESLint
6. `cd lootvue && npm run build` - Production build test

Report all errors found. Fix any that are straightforward, flag complex ones for the user.
Both projects must pass all checks.
