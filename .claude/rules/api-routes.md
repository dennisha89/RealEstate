---
globs: "**/app/api/**/*.ts"
---

# API Route Rules

- Validate ALL input with Zod schemas before processing.
- Rate limiting: 100 req/min default.
- Auth required on all non-public endpoints.
- Never log PII or financial details in error messages.
- All 18 routes currently use `generateMock*()` — replace with real data from `data-sources.ts`.
- Return proper HTTP status codes (400 for validation, 401 for auth, 429 for rate limit, 500 for server error).
- CORS configured for known origins only.
- Each API route is owned by a domain agent — see File-to-Agent Routing in CLAUDE.md.
