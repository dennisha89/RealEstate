---
name: code-hygiene
description: Run a full code hygiene scan — dead code, broken imports, unused exports, orphaned files, endpoint wiring, engine sync. Uses code-integrity agent.
user_invocable: true
---

Run a full code hygiene scan across the LootVue platform using the code-integrity agent checklist:

1. **Dead imports**: `cd lootvue && npx tsc --noEmit 2>&1 | grep "not found\|Cannot find"` and same for property-analyzer
2. **Unused exports**: Search for exported functions/types in engines that are never imported elsewhere
3. **Dead code**: Search for functions defined but never called across both projects
4. **Endpoint wiring**: For each API route, verify the engine it calls exists and the function signatures match
5. **Engine sync**: Compare function names and interfaces between `property-analyzer/lib/engines/` and `lootvue/src/lib/engines/` for shared engines
6. **Type mismatches**: Check Zod schemas against TypeScript interfaces
7. **Store orphans**: Verify every Zustand store action is used by at least one component

Report as: CRITICAL (runtime breaks) / WARNING (silent bugs) / CLEANUP (safe to remove)
