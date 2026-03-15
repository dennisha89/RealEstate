---
globs: "**/stores/**/*.ts, **/lib/hooks/**/*.ts"
---

# State Management Rules (Zustand)

- One store per domain — don't merge unrelated state into a single store.
- 13 stores in `lootvue/src/lib/stores/`: analysis, watchlist, oracle, deal-pipeline, decision-journal, buybox, ui, user-profile, simulator, deal-room, exchange, capital, lender.
- Use `immer` middleware for complex nested state updates.
- Selectors: always use shallow equality selectors to prevent unnecessary re-renders (`useStore(state => state.value)`).
- Async actions: handle loading/error states within the store, not in components.
- Never store derived data — compute it in selectors or hooks.
- Reset functions: every store must have a `reset()` action for cleanup.
- Persist sensitive data (user profile, auth) with `persist` middleware + secure storage.
- Never persist financial analysis results — always recompute from source.
