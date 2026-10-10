# Progress Tracker

Legend: `[ ]` not started · `[~]` in progress · `[x]` complete
Last updated: 2026-10-10 (initial audit from repo state)

Plan: MVP first, then grow into full Feedback → Remediation → Verification system. Owner codes; Claude guides/reviews.

## Roadmap phases

| Phase | Name                               | Status |
| ----- | ---------------------------------- | ------ |
| 0     | Learn architecture / LLM basics    | [~]    |
| 1     | Tiny local read-only agent (CLI)   | [ ]    |
| 2     | LLM provider abstraction           | [ ]    |
| 3     | Demo frontend                      | [~]    |
| 4     | Playwright + GitHub Actions CI     | [~]    |
| 5     | GitHub failure ingestion           | [ ]    |
| 6     | AI failure analyzer                | [ ]    |
| 7     | Read-only CI agent                 | [ ]    |
| 8     | Controlled remediation             | [ ]    |
| 9     | Human-in-the-loop (Telegram/Slack) | [ ]    |
| 10    | GitHub remediation loop            | [ ]    |
| 11    | Portfolio polish                   | [ ]    |
| 12    | Extensions (QA, Figma, a11y, ...)  | [ ]    |

## Task 001 — Monorepo foundation

- [x] npm workspaces (`apps/*`, `packages/*`)
- [x] `apps/agent` stub (tsx, tsc typecheck)
- [x] `apps/demo-frontend` scaffold
- [~] `packages/shared` (package.json only, no code)
- [x] ESLint (flat config), Prettier
- [~] Vitest (root dev dep; only frontend has tests)
- [ ] `tsconfig.base.json` filled + extended by apps
- [ ] Minimal `LLMProvider` interface in `packages/shared`
- [ ] README beyond diagram (setup, run, architecture)

## Modules (code)

- [ ] LLM layer: `LLMProvider` interface, request/response types
- [ ] Agent loop (manual): observe → LLM → tool call → result → repeat
- [ ] Tool registry + argument validation
- [ ] Read tools: `listFiles`, `readFile`, `searchCode`, `getGitDiff`
- [ ] CI tools: `getCILogs`, `getWorkflowRun`, `getPlaywrightEvidence`
- [ ] Failure categories + `FailureAnalysis` type
- [ ] Policy engine (deterministic, configurable)
- [ ] Write tools: `modifyFile`, `runLint`, `runTests`, `runPlaywright`
- [ ] GitHub write: branch / commit / PR / rerun workflow
- [ ] Remediation loop with attempt cap (2–3)
- [ ] Audit trail (run ID, tool calls, policy result, approval)
- [ ] Unified `EngineeringFeedback` model (later)
- [ ] Model router Local → Free → Paid (later)

## Demo frontend

- [x] Vite + React 19 + TS scaffold
- [x] Vitest + Testing Library setup, `App.test.tsx`
- [x] Playwright config + `tests/e2e/store.spec.ts`
- [ ] Fix Playwright port mismatch (baseURL 4173 vs webServer 5173)
- [ ] Pages per plan: Login, Products, Cart, Checkout, Orders
- [ ] Specs: login, cart, checkout, orders
- [ ] Scripted "break it" scenarios (stale selector, price change, lint error, auth failure)

## CI (GitHub Actions)

- [~] `ci.yml` drafted (lint, typecheck, unit, build, e2e + artifact upload) — currently at `apps/demo-frontend/workflows/`, not active
- [ ] Move to `.github/workflows/`, add `working-directory` / workspace commands
- [ ] Push repo to GitHub, first green run
- [ ] Verify failure artifacts (report, trace, screenshot, video) downloadable

## SDKs / libraries

- [x] TypeScript, tsx, @types/node
- [x] ESLint + typescript-eslint, Prettier
- [x] Vitest, Testing Library, jsdom
- [x] Playwright test runner
- [ ] Ollama client (HTTP or `ollama` npm) — behind `LLMProvider`
- [ ] Free cloud LLM SDK (OpenRouter or similar) — behind `LLMProvider`
- [ ] Paid LLM SDK (optional, last)
- [ ] `@octokit/*` (REST, webhooks, app auth)
- [ ] HTTP server for webhooks (Fastify/Express/Hono — decide at Phase 5)
- [ ] Schema validation (zod) for tool args + LLM structured output
- [ ] Telegram Bot API or Slack Bolt (pick one, Phase 9)

## Third-party integrations / accounts

- [ ] Ollama installed + a tool-calling-capable model pulled
- [ ] GitHub repo + fine-grained token / GitHub App (least privilege)
- [ ] Webhook secret + signature verification
- [ ] HTTPS tunnel for local webhooks (cloudflared / ngrok / smee)
- [ ] OpenRouter (or other free-tier) API key
- [ ] Telegram bot or Slack app
- [ ] Docker (deployment phase)
- [ ] PostgreSQL (only when persistence required)
- [ ] Redis (only when queues required)
- [ ] Hosting vendor (TBD at deploy time, ADR-006)

## Cross-cutting

- [ ] Security rules checklist (plan §21) enforced in code
- [ ] Secrets never reach LLM context
- [ ] Unit tests for agent, tools, policy
- [ ] Docs: architecture diagram, security doc
- [ ] Demo video
- [ ] LinkedIn post

## Log

- 2026-10-10 — Tracker created. Repo audited: Task 001 partly done (monorepo, lint/format, frontend scaffold). Next: finish Task 001 (tsconfig.base, `LLMProvider`), then Phase 1 tool-calling prototype.
