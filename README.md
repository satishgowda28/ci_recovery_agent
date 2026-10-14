# AI CI Recovery Agent

A TypeScript agent that watches GitHub Actions, collects evidence when CI fails (logs, Git diff, Playwright artifacts), asks an LLM to diagnose the failure, and either fixes it or asks a human, then verifies the result by re-running CI.

> **The LLM proposes. Tools execute. Policy authorizes. Humans approve risky actions. Verification decides success.**

The project grows from a small read-only agent into a full feedback → remediation → verification system. See [the master plan](AI-Engineering-Feedback-Remediation-Agent-Master-Plan.md) for the roadmap and [progress_tracker.md](progress_tracker.md) for current status. Architecture decisions (ADRs) are in [progress.md](progress.md).

## Status

Early development. The monorepo foundation and shared LLM types are in place; the agent itself is a stub.

## Prerequisites

- Node.js 22 or newer
- [Ollama](https://ollama.com) with a tool-calling model, e.g. `ollama pull llama3.2`

## Setup

```bash
npm install
```

## Commands

Run from the repo root.

| Command                   | What it does                              |
| ------------------------- | ----------------------------------------- |
| `npm run dev:agent`       | Run the agent with `tsx` (watch)          |
| `npm run dev:frontend`    | Start the demo frontend (Vite)            |
| `npm run test:shared`     | Unit tests for `packages/shared`          |
| `npm run typecheck:agent` | Typecheck `apps/agent`                    |
| `npm run lint`            | ESLint across the repo                    |
| `npm run format`          | Prettier write (`format:check` to verify) |

Demo frontend tests (from `apps/demo-frontend`): `npm test` for unit, `npm run test:e2e` for Playwright.

## Layout

```text
apps/agent          the agent (LLM providers, tools, loop, policy)
apps/demo-frontend  small React app used to produce realistic CI failures
packages/shared     shared types, e.g. the LLMProvider interface
```

## Architecture

```text
                         GitHub
                           │
                    GitHub Actions
                           │
                    CI failure event
                           │
                           ▼
                  ┌─────────────────┐
                  │ Agent Runtime   │
                  │                 │
                  │ Observe         │
                  │ Reason          │
                  │ Plan            │
                  │ Act             │
                  └────────┬────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Tool Layer  │
                    └──────┬──────┘
                           │
          ┌────────────────┼─────────────────┐
          │                │                 │
          ▼                ▼                 ▼
      GitHub API       Filesystem        Playwright
          │                │                 │
          ▼                ▼                 ▼
      logs/diff        source code       trace/test
                           │
                           │
                           ▼
                    ┌─────────────┐
                    │ Model Router│
                    └──────┬──────┘
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
          Ollama       OpenRouter      Paid API
           FREE          FREE            PAID
             │             │              │
             └─────────────┼──────────────┘
                           │
                           ▼
                       Diagnosis
                           │
                           ▼
                    Policy Engine
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
             AUTO-FIX             HUMAN
                 │                   │
                 ▼                   ▼
             GitHub             Telegram /
             commit             Slack
                 │
                 ▼
             CI rerun
                 │
            ┌────┴────┐
            ▼         ▼
          PASS       FAIL
            │         │
           DONE    Agent loop
```
