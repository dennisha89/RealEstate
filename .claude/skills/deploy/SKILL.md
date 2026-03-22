---
name: deploy
description: Pre-deployment validation — type check, lint, build, test for both lootvue and property-analyzer.
user_invocable: true
---

Run full pre-deployment validation:

## Property Analyzer (Backend)
1. `cd property-analyzer && npx tsc --noEmit` — TypeScript check
2. `cd property-analyzer && npm run lint` — ESLint
3. `cd property-analyzer && npm run build` — Production build
4. `cd property-analyzer && npm test -- --coverage` — Tests with coverage

## LootVue (Frontend)
5. `cd lootvue && npx tsc --noEmit` — TypeScript check
6. `cd lootvue && npm run lint` — ESLint
7. `cd lootvue && npm run build` — Production build

## Final Checks
8. Search for `generateMock` in non-test files — flag any mock data leaking to production
9. Search for `console.log` — flag debug logging that should be removed
10. Verify no `.env` values are hardcoded

Report: PASS/FAIL for each step. All 7 builds/checks must pass before deploying.
