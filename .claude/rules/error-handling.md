---
globs: "**/*.{ts,tsx}"
---

# Error Handling Rules

- **API routes**: Always return structured error responses `{ error: string, code: string, details?: unknown }`.
- **Engine errors**: Throw typed errors (e.g., `DataFetchError`, `CalculationError`, `ValidationError`) — never throw plain strings.
- **React error boundaries**: Wrap each dashboard page in an error boundary. Show "Something went wrong" with retry button, not a white screen.
- **Toast notifications**: Use for transient errors (API timeout, rate limit). Use inline errors for validation (form fields).
- **Loading states**: Every async operation must show a loading skeleton. Never leave the UI frozen.
- **Empty states**: Every list/table/chart must handle zero-data case with a helpful message.
- **Retry logic**: API calls retry up to 3 times with exponential backoff (1s, 2s, 4s). After 3 failures, show error state.
- **Never swallow errors**: No empty `catch {}` blocks. At minimum, log to console in dev.
- **Financial engine errors**: If a calculation fails, show "Unable to compute" with the specific metric — never show stale or partial results without labeling them.
