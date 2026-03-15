---
name: check-quality
description: Run TypeScript checks, linting, and build validation for production readiness.
user_invocable: true
---

Run quality checks for the RealEstate project:

1. `cd property-analyzer && npx tsc --noEmit` - TypeScript type checking
2. `cd property-analyzer && npm run lint` - ESLint
3. `cd property-analyzer && npm run build` - Production build test

Report all errors found. Fix any that are straightforward, flag complex ones for the user.
