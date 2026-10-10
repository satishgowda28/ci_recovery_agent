# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working mode

The owner writes the code themselves; Claude guides. Default to: explain the concept, propose a small bounded task with acceptance criteria, review their diff, suggest next step. Do not implement whole features unprompted. Keep `progress_tracker.md` current (see below) when a module/phase item changes state.

## Source of truth

- `AI-Engineering-Feedback-Remediation-Agent-Master-Plan.md` — full design, 12-phase roadmap, security rules, "what NOT to build". It embeds `progress.md` as an appendix.
- `progress.md` — original plan + ADR-001..016 (architecture decisions). Change direction by updating the ADRs, not silently.
- `progress_tracker.md` — live status of every module, SDK, third-party integration and code item. Update after each milestone. Use `[ ]` / `[~]` / `[x]`.
- `README.md` — architecture diagram only.

Core principle: **LLM proposes, tools execute, policy authorizes, humans approve risky actions, verification decides success.** Build the minimum that proves each concept; no framework (LangChain/LangGraph/MCP/CrewAI), DB, Redis, or cloud before it is needed. The agent loop is hand-written first. Localhost + free/local LLMs (Ollama) first; paid models are optional fallback. Maximum 2–3 remediation attempts, never an unbounded fix loop. No unrestricted shell tool.

## Layout

npm workspaces (`apps/*`, `packages/*`):

- `apps/agent` (`@agent/core`) — the agent. ESM-style NodeNext TS, run with `tsx`. Currently only a stub `src/index.ts`. Planned subdirs per plan: `agent/ llm/ tools/ github/ playwright/ policy/ notifications/ workflows/`.
- `apps/demo-frontend` (`@demo/frontend`) — small Vite + React 19 store app that exists only to produce realistic CI/Playwright failures. Keep it small (ADR-002).
- `packages/shared` (`@agent/shared`) — empty; intended for shared types (`LLMProvider`, `FailureAnalysis`, `EngineeringFeedback`).

Architecture seams that span files (once built): LLM calls only through the `LLMProvider` interface (`generate(request): Promise<response>`), never a vendor SDK in agent code; repo access only through explicit tools; a deterministic policy engine sits between LLM diagnosis and any tool with side effects.

## Commands

Run from repo root unless noted.

```bash
npm install
npm run dev:agent            # tsx watch apps/agent/src/index.ts
npm run dev:frontend         # vite dev server
npm run typecheck:agent      # tsc --noEmit in apps/agent
npm run lint                 # eslint . (root flat config, whole repo)
npm run format               # prettier --write .
npm run format:check
```

Frontend (`cd apps/demo-frontend` or `--workspace=@demo/frontend`):

```bash
npm test                              # vitest run (jsdom)
npx vitest run src/App.test.tsx       # single unit test file
npx vitest run -t "name"              # single test by name
npm run test:e2e                      # playwright (chromium)
npx playwright test tests/e2e/store.spec.ts -g "name"   # single e2e
npm run build                         # tsc -b && vite build
npm run typecheck
```

Root `_lint`, `_typecheck`, `_test`, `_build` scripts (underscore prefix) fan out to all workspaces with `--if-present`; there is no unprefixed root `test`/`build`.

## Known quirks (as of init)

- `tsconfig.base.json` is empty; `apps/agent/tsconfig.json` does not extend it.
- `apps/demo-frontend` has its own `package-lock.json` and pins different eslint/vitest/typescript majors than the root. `LOCKFILE-NOTE.md` there is stale. Watch for version conflicts under the workspace hoist.
- `apps/demo-frontend/workflows/ci.yml` is not under `.github/workflows/`, so GitHub will not run it yet. It also runs `npm ci` per job without `working-directory`, and uploads `playwright-report/` relative to repo root.
- `playwright.config.ts`: `baseURL` is port 4173 but `webServer.url` is 5173 (dev server) — mismatch to fix.
- Root `eslint.config.js` applies browser + node globals to all files.
