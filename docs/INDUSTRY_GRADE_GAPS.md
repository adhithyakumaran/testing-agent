# Industry-Grade Gaps — Tracked for Later Hardening

## Phase 3 — Observability (core done, gaps remain)
- [ ] Retry logic doesn't distinguish transient errors (timeout/429/5xx) from permanent
      ones (401/403/bad input) — currently retries everything 3x, wasting time/cost on
      unrecoverable errors
- [ ] No retry/graceful degradation outside askLLM() — Playwright runs, DOM scans, and
      Postgres queries all crash raw on failure (e.g. DB not started)
- [ ] console.log/console.error only — no structured logging (log levels, persistent
      log files, anything pluggable into real ops tooling)
- [ ] No alerting on failure (e.g. Slack/email if a scheduled run fails silently)
- [ ] No easy way to query llm_calls cost data — proven to log correctly but requires
      a new script each time to summarize
- [ ] No tracking of healer/classifier accuracy over time (e.g. % of high-confidence
      fixes actually approved without edits) — future trust metric

<!-- Add more entries here as they're identified in later phases -->
## Phase 4-prep — Neon/CI wiring
- [ ] No retry around ingest-results.ts's DB connection in CI — if Neon has a transient
      blip during a CI run, ingestion silently fails with no retry
- [x] failures table not yet proven populated from a REAL CI failure (only proven
      locally before the Neon migration) — needs one deliberate test
- [ ] No branch protection / required-check policy tied to CI status yet — red CI
      doesn't currently block a merge

## Phase 4 — Dashboard
- [ ] No authentication — anyone reaching the server sees all data including costs/errors
- [ ] No pagination on any table — LIMIT 50 with no way to see older records
- [ ] Auto-refresh polls every 30s even when tab isn't visible/focused
- [ ] No date-range or per-app filtering (matters once multiple client apps exist)
- [ ] Generic "Failed to load X" error states — no distinction between network/DB/server errors
- [ ] Not deployed anywhere — only runs locally via manual npx tsx command, no process manager

## Phase 6 — Security review (in progress)
- [x] SQL injection surface checked — all queries use parameterized placeholders, verified no
      string concatenation into SQL anywhere in the codebase
- [x] Prompt injection surface found and fixed — scanned DOM content (data-test attrs, text)
      now sanitized in dom-scanner.ts before reaching LLM prompts
- [x] Dashboard authentication added — session-based login (was previously no auth, then
      Basic Auth, now a proper branded session-based login page)
- [ ] Session secret currently a single shared value in .env — fine for one admin user,
      would need real user accounts/roles if multiple people need different access levels
- [ ] No rate limiting on /login — vulnerable to brute-force password guessing
- [ ] No HTTPS enforced — fine on localhost, must be added before any real deployment
- [ ] CI secrets (DATABASE_URL) — confirmed stored as GitHub Actions secret, not yet verified
      it never appears in any workflow log output
- [ ] npm audit not yet run — dependency vulnerability check still pending

## Phase 6 — Security review (continued)
- [x] Rate limiting added to /login (10 attempts / 15 min per IP)
- [x] npm audit run — 0 known vulnerabilities across all dependencies (28 July 2026)
