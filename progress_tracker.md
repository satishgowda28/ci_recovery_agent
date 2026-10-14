# Progress Tracker

Legend: `[ ]` not started · `[~]` in progress · `[x]` complete
Last updated: 2026-10-14 (Phase 1a: OllamaProvider done)

Plan: MVP first, then grow into full Feedback → Remediation → Verification system. Owner codes; Claude guides/reviews.

## Roadmap phases

| Phase | Name                               | Status |
| ----- | ---------------------------------- | ------ |
| 0     | Learn architecture / LLM basics    | [~]    |
| 1     | Tiny local read-only agent (CLI)   | [~]    |
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
- [x] `packages/shared` (TS source package, consumed via `exports` → `src/index.ts`)
- [x] ESLint (flat config), Prettier
- [x] Vitest (shared tests via root `npm test`; frontend has own config)
- [x] `tsconfig.base.json` filled + extended by agent and shared
- [x] Minimal `LLMProvider` interface in `packages/shared`
- [x] README (setup, commands, layout, architecture)

## Phase 1 — Tiny local agent (current)

Source: `progress.md` → Phase 1. Success criterion: agent can inspect a small repo and explain a code issue using tools. No writing, no GitHub, no autonomous fixes.

Review checks against this list only. Items marked _(added)_ are not in `progress.md`; reason given.

- [x] 1a. Ollama provider _(added: plan puts it in Phase 2, but the loop needs one working provider)_
- [ ] 1b. Read tools (from `progress.md`):
  - [ ] `readFile(path)`
  - [ ] `listFiles(dir?)`
  - [ ] `searchCode(query)`
  - [ ] `getGitDiff()`
  - [x] Path sandbox: tools cannot read outside repo root _(added: plan §21 "validate tool arguments", "least privilege")_
  - [ ] Output size cap with `[truncated]` _(added: keeps tool output within small-model context)_
  - [ ] Tests for each tool + sandbox
- [ ] 1c. Agent loop: LLM → tool call → execute → result → LLM, with max-iterations cap (from `progress.md` + plan §5)
- [ ] 1d. CLI: ask a question about a repo, get an answer (from `progress.md` "Build a TypeScript CLI")
- [ ] Phase 1 done: success criterion demonstrated on this repo or demo-frontend

## Modules (code)

- [x] LLM layer: `LLMProvider` interface, request/response types, `isToolCallResponse` guard
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
- [x] Ollama client — plain `fetch` `OllamaProvider` behind `LLMProvider` (tested)
- [ ] Free cloud LLM SDK (OpenRouter or similar) — behind `LLMProvider`
- [ ] Paid LLM SDK (optional, last)
- [ ] `@octokit/*` (REST, webhooks, app auth)
- [ ] HTTP server for webhooks (Fastify/Express/Hono — decide at Phase 5)
- [ ] Schema validation (zod) for tool args + LLM structured output
- [ ] Telegram Bot API or Slack Bolt (pick one, Phase 9)

## Third-party integrations / accounts

- [x] Ollama installed + tool-calling model (`llama3.2`)
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
- 2026-10-10 — Task 001 steps 1–4 done: tsconfig.base, shared package, LLM types + type guard + tests. README written (step 5). Task 001 complete.
- 2026-10-14 — Phase 1a done: OllamaProvider (fetch, non-streaming) + 5 mocked-fetch tests. Next: 1b tools.
- 2026-10-14 — 1b sandbox done: `resolveInRoot` (path.resolve + path.relative, rejects `..` segments, absolute, null bytes) + 5 tests. Next: `readFile`.
