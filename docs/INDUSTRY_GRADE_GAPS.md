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