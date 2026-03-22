---
name: audit-security
description: Run security audit across the codebase. Checks for secrets, SQL injection, XSS, auth gaps, and OWASP top 10.
user_invocable: true
---

Run a security audit on the LootVue platform:

1. **Secrets scan**: Search for hardcoded API keys, passwords, tokens across all files
   - `grep -rn "apiKey\|api_key\|secret\|password\|token" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`
   - Check `.env` files are in `.gitignore`

2. **SQL injection**: Search for string interpolation in SQL queries
   - All queries must use parameterized syntax ($1, $2)
   - Flag any template literal SQL

3. **Input validation**: Verify Zod schemas on all 18 API routes in `property-analyzer/app/api/`
   - Every POST/PUT route must validate request body
   - Every dynamic route param must be validated

4. **Auth check**: Verify auth middleware on protected endpoints
   - Public routes: `/api/status` only
   - All others require authentication

5. **XSS**: Check for `dangerouslySetInnerHTML` usage
   - Must have sanitization if used

6. **Rate limiting**: Verify rate limiting on all API routes

7. **Dependencies**: `cd property-analyzer && npm audit && cd ../lootvue && npm audit`

Report findings as: CRITICAL / WARNING / INFO with file paths and line numbers.
