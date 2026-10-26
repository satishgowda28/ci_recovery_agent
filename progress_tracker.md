# Progress Tracker

Legend: `[ ]` not started · `[~]` in progress · `[x]` complete
Last updated: 2026-10-26 (Phase 2 complete)

Plan: MVP first, then grow into full Feedback → Remediation → Verification system. Owner codes; Claude guides/reviews.

## Now / open items (read first in a new session)

- **Next:** owner to choose Phase 4 (Playwright + CI) or Phase 3 (demo frontend pages). Spec contract first, add frozen checklist here.
- **Parked reminder (owner decides when):** truncated/blocked answers — `length` / `content_filter` stop reasons are treated as final answers by both providers. Needs a stop-reason field on `LLMResponse` + loop handling. Raise again at Phase 6 (structured diagnosis) at the latest.
- **Later notes:** `getGitDiff` ignores untracked files; `listFiles`/`searchCode` duplicate the exclude list; zod config error prints raw JSON (`z.prettifyError`); branch is `master`, plan says `main`; demo-frontend quirks (port mismatch, `ci.yml` location) belong to Phase 4.

## Roadmap phases

| Phase | Name                               | Status |
| ----- | ---------------------------------- | ------ |
| 0     | Learn architecture / LLM basics    | [~]    |
| 1     | Tiny local read-only agent (CLI)   | [x]    |
| 2     | LLM provider abstraction           | [x]    |
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

## Phase 1 — Tiny local agent (complete)

Source: `progress.md` → Phase 1. Success criterion: agent can inspect a small repo and explain a code issue using tools. No writing, no GitHub, no autonomous fixes.

Review checks against this list only. Items marked _(added)_ are not in `progress.md`; reason given.

- [x] 1a. Ollama provider _(added: plan puts it in Phase 2, but the loop needs one working provider)_
- [x] 1b. Read tools (from `progress.md`):
  - [x] `readFile(path)` (`readFileContent`, zod `safeParse` args, errors returned as text)
  - [x] `listFiles(dir?)` (sorted, skips `node_modules`/`.git`, schema via `toJSONSchema`)
  - [x] `searchCode(query)` (plain-text match, recursive walk skips `node_modules`/`.git`, skips files > 1 MB, `path:line: text`)
  - [x] `getGitDiff()` (`execFile` with fixed args, no shell; `git diff HEAD --no-color --no-ext-diff`; timeout + maxBuffer; `No changes` when empty)
  - [x] Path sandbox: tools cannot read outside repo root _(added: plan §21 "validate tool arguments", "least privilege")_
  - [x] Output size cap with `[truncated]` (readFile + getGitDiff 20k chars via shared `MAX_CHARS` in `src/const`, searchCode 50 matches) _(added: keeps tool output within small-model context)_
  - [x] Tests for each tool + sandbox (28 agent tests)
- [x] 1c. Agent loop: LLM → tool call → execute → result → LLM, with max-iterations cap (from `progress.md` + plan §5)
  - [x] Tool registry: `defineTool` (zod schema → `parameters` + `safeParse` in one place), `getToolDefinitions()`, `runTool()` (unknown tool / bad args / throw → error text)
  - [x] Loop `runAgent` (`src/agent/loop.ts`) + max-iterations cap (`MAX_ITER` = 8), `onToolCall` hook
  - [x] Loop tests (fake provider, 6 tests)
- [x] 1d. CLI: ask a question about a repo, get an answer (from `progress.md` "Build a TypeScript CLI") — `npm run agent -- [--repo <path>] [--model <name>] "<question>"`; `util.parseArgs`, repo resolved via `INIT_CWD`, tool calls → stderr, answer → stdout, exit 1 on usage/repo/Ollama errors
- [x] Phase 1 done: success criterion demonstrated on demo-frontend — explicit question ("Read playwright.config.ts. Is baseURL port same as webServer port?") → `readFile` → correct diagnosis (4173 vs 5173). Open-ended wording ("Why does the Playwright test use the wrong port?") fails with llama3.2 (naive search, honest "couldn't find") — model planning limit, deferred to model router / prompt work

## Phase 2 — LLM provider abstraction (complete)

Source: `progress.md` → Phase 2 + ADR-008. Success criterion: switching providers requires configuration changes, not agent-code changes.

Review checks against this list only. Items marked _(added)_ are not in `progress.md`; reason given.

- [x] 2a. Config + provider factory (contract first): `loadConfig()` (zod, env vars `LLM_PROVIDER`, `LLM_MODEL`, `OLLAMA_URL`, `OPENROUTER_API_KEY`), `createProvider(config)`, `.env.example`, CLI uses factory
- [x] 2b. `FreeCloudProvider` = `OpenRouterProvider` (OpenAI-compatible chat completions, plain `fetch`) + mocked-fetch tests
- [ ] 2c. `PaidProvider` _(optional, deferred: plan + CLAUDE.md say paid is optional fallback)_
- [x] Phase 2 done: same CLI question answered via `ollama` and `openrouter` by changing `.env` only — open-ended "Why does the Playwright test use the wrong port?" on demo-frontend: `openrouter` + `nvidia/nemotron-3.5-super-vl:free` → listFiles → searchCode → readFile ×4 → correct diagnosis (4173 preview vs 5173 dev) in ~9s; `ollama` + llama3.2 → naive search, "couldn't find". Live checks: zod `$schema` accepted, `usage` returned

**Reminder — raise when Phase 2 is done (not part of the Phase 2 checklist):**

- Truncated/blocked answers: when the model stops for `length` (max tokens) or `content_filter`, the agent receives a cut-off or empty answer and treats it as final. Applies to both Ollama (`done_reason`) and OpenRouter (`finish_reason`). Fix needs a shared-contract change in `LLMResponse` (e.g. a stop-reason / truncated field) and loop handling. Decide then whether to schedule it.

## Modules (code)

- [x] LLM layer: `LLMProvider` interface, request/response types, `isToolCallResponse` guard
- [x] Agent loop (manual): observe → LLM → tool call → result → repeat
- [x] Tool registry + argument validation
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
- [x] Free cloud LLM (OpenRouter) — plain `fetch` `OpenRouterProvider` behind `LLMProvider` (tested, mocked)
- [ ] Paid LLM SDK (optional, last)
- [ ] `@octokit/*` (REST, webhooks, app auth)
- [ ] HTTP server for webhooks (Fastify/Express/Hono — decide at Phase 5)
- [~] Schema validation (zod) for tool args (done) + LLM structured output (later)
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
- 2026-10-14 — 1b `readFile` done + 4 tests (temp dir). Decision: tool errors (incl. sandbox) returned as text, not thrown. zod adopted for tool arg validation. Next: `listFiles`.
- 2026-10-15 — 1b `listFiles` done + 4 tests. Next: `searchCode`.
- 2026-10-16 — 1b `searchCode` done + 5 tests (temp dir). Output cap item complete. Next: `getGitDiff`.
- 2026-10-21 — 1b `getGitDiff` done + 5 tests (temp git repo). `MAX_CHARS` moved to `src/const`. 1b complete. Later: untracked files not in diff. Next: 1c agent loop + registry.
- 2026-10-21 — 1c registry done: tools migrated to `defineTool`, `registry.ts` + 5 tests (33 agent tests). Live probe: zod `$schema` + `role: tool` result accepted by llama3.2. Next: loop.
- 2026-10-21 — 1c loop done: `runAgent` + 6 fake-provider tests (39 agent tests). 1c complete. Next: 1d CLI, then live demo on demo-frontend.
- 2026-10-22 — 1d CLI done. Manual acceptance: usage/bad repo/Ollama down → exit 1; demo-frontend port question answered correctly (4173 vs 5173), exit 0. Live runs earlier: llama3.2 correct ~1/3 on open-ended wording (hallucinated or bad tool args), correct on explicit wording. Later: answer quality (stronger model / prompt). Next: Phase 1 demo sign-off.
- 2026-10-22 — Phase 1 complete (owner sign-off). Later notes carried forward: open-ended question quality (stronger model or prompt e.g. "start with listFiles"), `getGitDiff` ignores untracked files, shared EXCLUDE list for listFiles/searchCode. Next: pick Phase 2 vs Phase 4 (see plan).
- 2026-10-26 — 2a + 2b done: `loadConfig` (zod, pure), `createProvider` (`src/llm/`), `.env` via `process.loadEnvFile()` (missing file OK), `.env.example`; `OpenRouterProvider` (string args parsed with `{}` fallback, error-in-200 handled, optional usage); Ollama now sends documented `tool_name` on tool results. 56 agent tests. Next: live switch demo (ollama ↔ openrouter via `.env`).
- 2026-10-26 — Phase 2 complete. Switch via `.env` only, no code change. Cloud model solved the open-ended question llama3.2 could not (closes Phase 1 later note on answer quality via provider choice). 2c PaidProvider stays deferred. Reminder raised: truncated/blocked answers (`length` / `content_filter`).
