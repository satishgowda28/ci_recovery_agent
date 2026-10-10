# AI Engineering Feedback & Remediation Agent — Master Project Document

> **Purpose:** Single source of truth for the project we have designed together.  
> **Status:** Ready to start development.  
> **Primary stack:** TypeScript / Node.js + GitHub + GitHub Actions + Playwright.  
> **Development strategy:** Localhost first, free/local LLMs first, paid models only when useful.

---

## Executive Summary

This project starts as an **AI-powered CI/CD recovery agent** for a frontend codebase and is intentionally designed to grow into an **AI Engineering Feedback → Remediation → Verification system**.

The first implementation will monitor GitHub Actions, collect CI and Playwright evidence, ask an LLM to diagnose failures, use a deterministic policy engine to decide whether an action is permitted, and either perform a low-risk remediation or request human approval.

Longer term, the same architecture can consume:

- CI failures
- Playwright failures
- QA issues
- code-review comments
- Figma/UI mismatches
- accessibility findings
- performance findings
- other engineering feedback

The key architecture principle is:

> **LLM proposes. Tools execute. Policy authorizes. Humans approve risky actions. Verification decides success.**

This is not intended to compete on the claim that nobody has built an AI coding agent. Existing systems already perform parts of this workflow. The portfolio value is demonstrating that you can design and implement the **orchestration, evidence collection, tool layer, model abstraction, policy/safety boundary, human-in-the-loop workflow, and verification loop**.

---

# 1. What We Are Building

Initial flow:

```text
Developer pushes code
        ↓
GitHub Actions
        ↓
Lint / TypeScript / Unit tests / Build / Playwright
        ↓
CI failure
        ↓
GitHub webhook
        ↓
TypeScript Agent
        ↓
Collect evidence
        ↓
LLM diagnosis
        ↓
Policy engine
        ↓
Auto-fix OR human approval
        ↓
GitHub commit / PR
        ↓
CI rerun
        ↓
PASS / FAIL
```

The broader version becomes:

```text
CI ───────┐
QA ───────┤
Figma ────┤
Review ───┤
A11y ─────┤
Perf ─────┤
          ▼
Feedback Normalizer
          ▼
Agent Runtime
          ▼
Evidence + Tools
          ▼
LLM
          ▼
Policy Engine
      ┌───┴───┐
     Auto   Human
      │       │
      └───┬───┘
          ▼
       GitHub
          ▼
      Verification
```

---

# 2. Why We Are Building It This Way

The goal is not just to make an LLM edit code.

The project should demonstrate understanding of:

- LLM APIs
- tool/function calling
- agent loops
- repository access
- GitHub APIs
- webhooks
- CI/CD
- Playwright
- test automation
- policy-based autonomy
- human-in-the-loop systems
- model abstraction
- cost control
- security boundaries
- verification
- auditability
- system design

The frontend background is an advantage here: Playwright, browser behavior, UI regressions, Figma comparison, and frontend CI are natural areas to specialize in.

---

# 3. Core Mental Model

An LLM does **not** automatically see the project filesystem.

It only sees the information that the application sends to it.

The agent gives it controlled capabilities through tools.

```text
                  LLM
                   │
             requests tool
                   │
                   ▼
             Agent Runtime
                   │
                   ▼
                Tool
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
      Filesystem GitHub Playwright
          │        │        │
          └────────┼────────┘
                   ▼
               Tool result
                   │
                   ▼
                  LLM
```

The clean distinction is:

```text
LLM       = reasoning
Agent     = orchestration
Tools     = execution
Policy    = authorization
Human     = authority for risky actions
CI/tests  = verification
```

---

# 4. Repository Access

Initial read-only tools:

```text
listFiles()
readFile(path)
searchCode(query)
getGitDiff()
getCILogs()
getWorkflowRun()
getPlaywrightEvidence()
```

Later write/execute tools:

```text
modifyFile(path, patch)
runLint()
runTests()
runPlaywright()
createBranch()
createCommit()
createPullRequest()
rerunWorkflow()
```

Do not initially expose an unrestricted:

```text
executeAnyShellCommand()
```

Prefer narrow, controlled operations.

---

# 5. Agent Loop

Implement the primitive loop manually first.

```text
Observe
  ↓
Reason
  ↓
Request tool
  ↓
Execute tool
  ↓
Return result
  ↓
Reason again
  ↓
Finish or take next action
```

Conceptually:

```ts
while (!finished) {
  const response = await llm.generate(context);

  if (response.toolCall) {
    const result = await executeTool(response.toolCall);
    context.addToolResult(result);
    continue;
  }

  finished = true;
}
```

Do not begin with LangGraph, MCP, CrewAI, or another framework. Learn the primitive first. Frameworks can be evaluated later when there is a concrete problem they solve.

---

# 6. LLM Strategy: Free + Paid + Local

The system must be provider-agnostic.

Use:

```ts
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

Possible providers:

```text
Ollama / local model
Free cloud model
Paid model
```

The agent calls:

```ts
llm.generate(...)
```

not provider-specific SDK calls throughout the codebase.

Later add a model router:

```text
                    Model Router
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           Local        Free        Paid
```

Possible routing:

```text
Simple task
  → local

Medium task
  → free cloud

Difficult task
  → paid only if necessary
```

Potential fallback:

```text
Local
  ↓ insufficient capability
Free cloud
  ↓ insufficient capability
Paid
```

The goal is to minimize spending.

---

# 7. Development and Hosting Strategy

## Now: localhost

Keep the system local while learning and building.

```text
Laptop
 ├── TypeScript Agent
 ├── Demo Frontend
 ├── Ollama / free model
 └── Playwright
```

GitHub Actions remains GitHub-hosted.

Do not pay for hosting before the core system works.

## Local GitHub webhooks

When webhooks are introduced:

```text
GitHub
   ↓
secure HTTPS tunnel
   ↓
localhost
   ↓
TypeScript Agent
```

Do not expose the development machine directly.

## Later: production

When the project is ready for a portfolio/live deployment:

```text
GitHub
   ↓
Public HTTPS webhook
   ↓
Containerized Node/TypeScript Agent
   ├── Agent Runtime
   ├── GitHub Tools
   ├── Model Router
   ├── Policy Engine
   └── Notifications
```

Use Docker and environment variables so the service remains portable.

**Hosting vendor is intentionally TBD.** We choose the simplest/lowest-cost option when the application is ready to deploy rather than optimizing cloud architecture now.

---

# 8. GitHub Actions

Initial workflow:

```text
pull_request / push
        │
        ├── lint
        ├── typecheck
        ├── unit tests
        ├── build
        └── Playwright E2E
```

Preserve useful Playwright artifacts on failure:

```text
playwright-report/
test-results/
screenshots
traces
videos where useful
```

The agent should combine these with:

```text
workflow metadata
job metadata
failed step
CI logs
commit SHA
branch
changed files
Git diff
```

---

# 9. Playwright

Playwright is a first-class CI evidence source.

Use it for:

- E2E testing
- screenshots
- traces
- visual regression
- browser console evidence
- network evidence
- reproducing QA issues

Example:

```text
Frontend change
      ↓
GitHub Actions
      ↓
Playwright
      ↓
Failure
      ↓
Screenshot + trace + logs + Git diff
      ↓
AI diagnosis
```

Important safety distinction:

```text
Broken test
     vs
Broken application
```

A failing Playwright assertion should not automatically result in changing the expected value.

Example:

```text
Expected $499
Actual $599
```

The agent must investigate whether the application or test is wrong.

---

# 10. Example Playwright Auto-Remediation

UI changes:

```tsx
<button>Add</button>
```

to:

```tsx
<button>Add to cart</button>
```

Test still uses:

```ts
page.getByRole('button', { name: 'Add' });
```

CI fails.

Agent sees:

```text
Playwright failure
+
Git diff
+
component source
+
test source
```

It can infer:

```text
UI label changed.
Test selector is stale.
```

Potential workflow:

```text
Diagnose
  ↓
Policy check
  ↓
Human approval initially
  ↓
Modify selector
  ↓
Run Playwright
  ↓
Pass
  ↓
Commit / PR
  ↓
CI rerun
```

This is an excellent initial portfolio demonstration.

---

# 11. Failure Categories

Start with:

```text
lint
formatting
typecheck
unit-test
playwright
build
dependency
security
unknown
```

Initial policy:

| Failure     | Default                  |
| ----------- | ------------------------ |
| Formatting  | Candidate for auto-fix   |
| Simple lint | Candidate for auto-fix   |
| TypeScript  | Human approval           |
| Unit test   | Human approval           |
| Playwright  | Human approval initially |
| Build       | Human approval           |
| Dependency  | Human approval           |
| Security    | Human approval           |
| Unknown     | Human approval           |
| Production  | Human approval           |

LLM confidence is evidence, not authorization.

---

# 12. Policy Engine

The LLM should propose an action.

A deterministic policy engine decides whether that action is permitted.

```text
LLM
 ↓
Proposed action
 ↓
Policy Engine
 ├── allowed → tool executes
 └── blocked → human approval
```

Example:

```yaml
lint:
  auto_fix: true
  max_files: 5

unit_test:
  auto_fix: false

security:
  auto_fix: false

production:
  auto_fix: false
```

This separation is one of the most important architectural decisions.

---

# 13. Human-in-the-Loop

Use Telegram or Slack initially.

Example:

```text
🚨 CI FAILURE

Failure:
Playwright

Diagnosis:
The UI label changed from "Add"
to "Add to cart".

Proposed action:
Update the affected test selector.

Risk:
Medium

Confidence:
91%

[Approve]
[Reject]
[Details]
```

Approval resumes the agent.

Record:

- who approved
- what action was approved
- when
- agent run
- resulting commit

---

# 14. QA Extension

A tester could create:

```text
Checkout fails with 10+ products

Steps:
1. Login
2. Add 10 products
3. Open cart
4. Click checkout
5. Blank page appears
```

The agent can eventually:

```text
Issue
 ↓
Understand
 ↓
Inspect repository
 ↓
Create reproduction
 ↓
Run Playwright
 ↓
Confirm failure
 ↓
Diagnose
 ↓
Propose fix
```

An even stronger feature:

```text
QA issue
 ↓
Generate Playwright regression test
 ↓
Run test
 ↓
Confirm failure
 ↓
Fix application
 ↓
Run test again
 ↓
Pass
```

Human feedback becomes executable regression protection.

---

# 15. Figma / Designer Extension

A designer could say:

> "The checkout page does not match Figma."

Long-term flow:

```text
Figma
 +
Live application
 +
Playwright screenshot
 +
Git diff
 ↓
AI
 ↓
Visual comparison
 ↓
Diagnosis
 ↓
Proposed UI change
```

Playwright visual assertions can help establish measurable differences.

Figma can eventually be integrated as another evidence/tool source.

Do not implement this in the first MVP.

---

# 16. Unified Feedback Model

Eventually normalize every input into:

```ts
type EngineeringFeedback = {
  source: 'ci' | 'qa' | 'code-review' | 'figma' | 'accessibility' | 'performance';

  repository: string;
  pullRequest?: number;

  title: string;
  description: string;

  evidence: Evidence[];

  severity?: Severity;
};
```

Then:

```text
CI failure       → EngineeringFeedback
QA issue         → EngineeringFeedback
Designer comment → EngineeringFeedback
Code review      → EngineeringFeedback
```

The same agent architecture can process all of them.

---

# 17. Browser Agent — Future

A future version can expose browser tools:

```text
openPage()
click()
fill()
screenshot()
inspectConsole()
inspectNetwork()
runAccessibility()
```

Then:

```text
QA:
Checkout button doesn't work.

Agent:
open /checkout
 ↓
click checkout
 ↓
inspect console
 ↓
inspect network
 ↓
inspect screenshot
 ↓
inspect source
 ↓
diagnose
```

This becomes agentic debugging rather than simple code generation.

---

# 18. Suggested Repository Structure

```text
ai-engineering-agent/
│
├── apps/
│   ├── demo-frontend/
│   │   ├── src/
│   │   ├── tests/
│   │   └── playwright.config.ts
│   │
│   └── agent/
│       ├── src/
│       │   ├── agent/
│       │   ├── llm/
│       │   ├── tools/
│       │   ├── github/
│       │   ├── playwright/
│       │   ├── policy/
│       │   ├── notifications/
│       │   └── workflows/
│       └── package.json
│
├── packages/
│   └── shared/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── README.md
├── progress.md
└── package.json
```

---

# 19. Development Roadmap

## Phase 0 — Understand the architecture

Learn:

- LLM API
- tool/function calling
- structured output
- agent loop
- Git
- GitHub Actions
- Playwright

Do not build cloud infrastructure.

## Phase 1 — Tiny local agent

Tools:

```text
listFiles
readFile
searchCode
getGitDiff
```

Goal: agent can inspect a repository and explain an issue.

No writes.

## Phase 2 — LLM provider abstraction

Build:

```text
LLMProvider
 ├── OllamaProvider
 ├── FreeCloudProvider
 └── PaidProvider
```

Goal: provider can be switched through configuration.

## Phase 3 — Demo frontend

Small React/Next.js app:

```text
Login
Products
Cart
Checkout
Orders
```

Goal: create realistic failures.

## Phase 4 — Playwright CI

Add E2E tests and GitHub Actions.

Goal: intentionally break the app and inspect logs, screenshots, and traces.

## Phase 5 — GitHub integration

Build webhook and workflow/log retrieval.

Goal: failed GitHub workflow becomes an internal agent task.

## Phase 6 — AI failure analyzer

Create structured diagnosis.

Goal: agent explains root cause with evidence.

## Phase 7 — Read-only agent

Add repository/CI/Playwright evidence tools.

Goal: agent can investigate but cannot change anything.

## Phase 8 — Controlled remediation

Add narrow write/test tools.

Goal: agent can make a controlled change and verify it.

## Phase 9 — Human approval

Add Telegram or Slack.

Goal: risky actions pause until approval.

## Phase 10 — GitHub remediation loop

Add branch/commit/PR/rerun capabilities.

Goal:

```text
failure → diagnose → approve → fix → verify → CI pass
```

## Phase 11 — Portfolio polish

Create:

- architecture diagram
- README
- controlled demos
- test suite
- security documentation
- short demo video
- LinkedIn post

## Phase 12 — Extensions

Only after MVP stability:

```text
QA
Figma
code review
accessibility
performance
browser agent
```

---

# 20. Coding-Agent Development Strategy

Use your coding agent as an implementation assistant, not the architect.

Do not ask:

> "Build the entire platform."

Instead:

1. Give it the architecture.
2. Give it one bounded task.
3. Ask for a plan.
4. Review the plan.
5. Let it implement.
6. Run tests.
7. Inspect the diff.
8. Commit.
9. Update `progress.md`.
10. Move to the next task.

Recommended prompt:

```text
You are implementing one task in the AI Engineering Feedback & Remediation Agent.

Read:
- README.md
- progress.md
- relevant source files

Before coding:
1. Explain your understanding.
2. State the files you will change.
3. State the tests you will add/update.

Task:
<ONE SMALL TASK>

Constraints:
- TypeScript
- Follow existing architecture
- Do not introduce frameworks unless required
- Do not modify unrelated files
- Do not add paid services
- Keep LLM code behind LLMProvider
- Add tests

Acceptance criteria:
<criteria>

After implementation:
- Run relevant tests.
- Show the resulting diff.
- Explain what changed.
- Identify anything incomplete.

Do not start the next task.
```

---

# 21. Security Rules

Treat the agent as potentially dangerous.

1. Least-privilege GitHub permissions.
2. No unrestricted shell initially.
3. Never expose secrets to the LLM.
4. Never put secrets into prompts.
5. Do not automatically modify protected branches.
6. Use feature branches for agent changes.
7. Limit remediation attempts.
8. Record tool calls.
9. Validate tool arguments.
10. Keep credentials outside model context.
11. Separate diagnosis from authorization.
12. Require human approval for risky operations.

---

# 22. Auditability

Eventually record:

```text
Agent run ID
Workflow ID
Repository
Commit
LLM provider
Model
Tool calls
Policy result
Human approval
Files changed
Tests executed
Commit
CI rerun
Final result
```

Example:

```text
Agent Run #124

Received CI failure
Downloaded Playwright evidence
Read Checkout.tsx
Read checkout.spec.ts
Proposed selector change
Policy: HUMAN_REQUIRED
Human approved
Modified test
Playwright passed
Commit created
CI rerun
CI passed
```

---

# 23. What NOT to Build Initially

Avoid:

```text
Multiple agents
Microservices
Kubernetes
Complex cloud infrastructure
Full SaaS dashboard
WhatsApp + Telegram + Slack simultaneously
Figma integration
RAG
Vector database
Autonomous production deployment
Unlimited shell access
Ten LLM providers
```

These are later possibilities, not MVP requirements.

---

# 24. Recommended Initial Stack

```text
TypeScript
Node.js
React / Next.js demo app
GitHub
GitHub Actions
Playwright
Ollama
Free LLM provider
Docker later
PostgreSQL later
Redis later
Telegram or Slack later
```

Only add PostgreSQL when persistent state is actually required.

Only add Redis when queues/background jobs are actually required.

---

# 25. ETA With AI Assistance

A realistic estimate assumes roughly **2–4 focused hours/day** and strong use of a coding agent.

## Working MVP: ~2–3 weeks

Example:

```text
Days 1–2
Architecture + tiny agent

Days 3–4
Tool calling + filesystem tools

Days 5–6
LLM provider abstraction + local/free model

Days 7–9
Demo frontend + Playwright

Days 10–11
GitHub Actions + artifacts

Days 12–14
GitHub webhook + failure ingestion

Days 15–17
Failure analyzer + policy engine

Days 18–21
Controlled remediation + verification
```

## Strong portfolio version: ~4–6 weeks

```text
Weeks 1–2
Core agent + tools + LLM abstraction
+ Playwright + GitHub Actions

Week 3
GitHub integration
+ diagnosis
+ policy engine
+ audit trail

Week 4
Human approval
+ controlled remediation
+ CI recovery loop

Week 5
Reliability
+ security
+ tests
+ documentation
+ demos

Week 6
Polish
+ architecture diagram
+ demo video
+ LinkedIn write-up
```

AI can significantly accelerate coding, boilerplate, tests, refactoring, and documentation.

AI does **not** remove the need for you to understand and debug the architecture.

---

# 26. Portfolio Demo Scenarios

## Scenario A — Lint

```text
Introduce lint error
 ↓
CI fails
 ↓
Agent diagnoses
 ↓
Policy permits
 ↓
Agent fixes
 ↓
CI passes
```

## Scenario B — Playwright selector

```text
Change UI label
 ↓
Playwright fails
 ↓
Agent reads diff + test
 ↓
Identifies stale selector
 ↓
Approval
 ↓
Fix
 ↓
CI passes
```

## Scenario C — Real application bug

```text
Break checkout
 ↓
Playwright fails
 ↓
Agent investigates
 ↓
Determines application behavior is wrong
 ↓
Human approval
 ↓
Fix
 ↓
CI passes
```

## Scenario D — Dangerous failure

```text
Security/authentication failure
 ↓
Agent diagnoses
 ↓
Policy blocks auto-fix
 ↓
Human required
```

## Scenario E — QA issue

Later:

```text
QA issue
 ↓
Agent reproduces with Playwright
 ↓
Generates regression test
 ↓
Fixes bug
 ↓
Verification
```

---

# 27. LinkedIn Positioning

Avoid:

> "I built an AI coding agent."

Prefer:

> **Built an AI-powered engineering feedback and remediation system that connects GitHub Actions, Playwright, repository tools, LLMs, policy-based autonomy, and human approval into a closed-loop development workflow.**

The project demonstrates:

- TypeScript
- frontend engineering
- Playwright
- CI/CD
- GitHub APIs
- LLMs
- tool calling
- agent architecture
- system design
- policy/safety
- human-in-the-loop
- automated verification

---

# 28. Definition of Done

The MVP is complete when:

```text
Developer pushes code
        ↓
GitHub Actions
        ↓
Playwright fails
        ↓
GitHub webhook
        ↓
Agent receives failure
        ↓
Agent retrieves:
  logs
  Git diff
  source
  Playwright evidence
        ↓
LLM diagnoses
        ↓
Policy evaluates
        ↓
Human approval OR safe auto-fix
        ↓
Agent modifies code
        ↓
Runs tests
        ↓
Creates commit/PR
        ↓
GitHub Actions reruns
        ↓
PASS
```

---

# 29. First Development Task

Do not start with GitHub integration.

Start with:

```text
TASK 001

Create the TypeScript monorepo.

Create:
- apps/agent
- apps/demo-frontend
- packages/shared
- README.md
- progress.md

Add:
- TypeScript
- ESLint
- Prettier
- Vitest

Create a minimal LLMProvider interface.

Do not add:
- LangChain
- LangGraph
- MCP
- database
- Redis
- GitHub integration
- Playwright
- cloud deployment

Goal:
A clean TypeScript foundation from which the agent can be built incrementally.
```

After Task 001, implement the smallest possible tool-calling prototype.

---

# 30. Final Architecture

Keep returning to this diagram:

```text
             ENGINEERING FEEDBACK
                      │
                      ▼
                COLLECT EVIDENCE
                      │
                      ▼
                     LLM
               "What happened?"
                      │
                      ▼
                 PROPOSE PLAN
                      │
                      ▼
                POLICY ENGINE
                /                         ALLOW            BLOCK
               │                │
               ▼                ▼
             TOOLS            HUMAN
               │             APPROVAL
               └──────┬─────────┘
                      ▼
                    CHANGE
                      │
                      ▼
                   VERIFY
                  /                     PASS      FAIL
                │          │
               DONE    Analyze again
                           │
                      max attempts
                           │
                           ▼
                         HUMAN
```

The central engineering question is not:

> "Can an LLM write code?"

It is:

> **"How do we safely convert engineering feedback and evidence into verified code changes?"**

That is the project.

---

# 31. Current Architecture Decisions

| Area            | Decision                                   |
| --------------- | ------------------------------------------ |
| Language        | TypeScript / Node.js                       |
| Frontend        | Small React/Next.js demo                   |
| CI              | GitHub Actions                             |
| E2E             | Playwright                                 |
| Development     | Localhost first                            |
| Local webhook   | Secure HTTPS tunnel                        |
| Production      | Containerized Node/TS service              |
| Cloud provider  | TBD later                                  |
| LLM             | Provider-agnostic                          |
| Local model     | Ollama                                     |
| Free models     | Supported                                  |
| Paid models     | Optional fallback                          |
| Agent access    | Explicit tools                             |
| Authorization   | Deterministic policy engine                |
| Risky changes   | Human approval                             |
| Agent loop      | Manual first                               |
| Frameworks      | Add only when justified                    |
| Database        | Add when persistence requires it           |
| Redis           | Add when queues/background jobs require it |
| Autonomous loop | Maximum 2–3 attempts initially             |
| Git workflow    | Feature branch / PR                        |
| Security        | Least privilege                            |
| Audit           | Agent/tool/policy/action history           |

---

# 32. Project Rule

At every stage ask:

> **What is the smallest implementation that proves this architectural concept?**

Do not build infrastructure before you need it.

Do not add an AI framework before understanding the underlying loop.

Do not pay for an LLM before trying local/free inference.

Do not deploy before the local architecture works.

Do not give the agent write access before its read-only behavior is trustworthy.

Build progressively and let each milestone prove the next architectural decision.

---

# Appendix — Existing Progress / ADR Notes

# AI CI/CD Recovery Agent — Project Progress

## Project goal

Build a TypeScript-based AI CI/CD recovery ecosystem for a frontend project.

The system will:

1. Monitor GitHub Actions.
2. Detect CI failures.
3. Collect useful evidence: logs, Git diff, changed files, test results, and Playwright artifacts.
4. Ask an LLM to diagnose the failure and propose an action.
5. Use a deterministic policy engine to decide whether the proposed action is allowed automatically.
6. Auto-fix only low-risk, well-defined failures.
7. Escalate risky or ambiguous failures to a human through Telegram/Slack.
8. After approval, let the agent act through explicit tools.
9. Re-run CI and verify the result.
10. Keep an audit trail of agent decisions and actions.

### Core principle

**The LLM proposes. Tools execute. Policy authorizes. Humans approve risky actions.**

The LLM does NOT automatically have access to the repository. Repository access is provided through explicit tools such as `readFile`, `searchCode`, GitHub APIs, Playwright evidence, and eventually controlled write/command tools.

---

# Technology direction

## Primary stack

- TypeScript / Node.js
- GitHub
- GitHub Actions
- Playwright
- PostgreSQL later, when persistence is needed
- Redis later, when queues/background jobs are needed
- Telegram or Slack for human approval
- LLM provider abstraction

## LLM strategy

The project must support interchangeable model providers:

- Local models via Ollama
- Free cloud models where practical
- Paid models only when they provide a meaningful quality/capability advantage

Do not hard-code the agent to one provider.

Use an internal interface such as:

```ts
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

The agent should call `llm.generate(...)`, not a provider SDK directly.

A model router can later choose:

```text
Local → Free cloud → Paid fallback
```

based on task complexity, capability requirements, confidence, and cost.

---

# Architecture

```text
GitHub
  │
  ▼
GitHub Actions
  │
  │ CI failure
  ▼
Webhook / Event Ingestion
  │
  ▼
Agent Runtime
  │
  ├── Failure Analyzer
  ├── LLM
  ├── Tool Executor
  └── Policy Engine
       │
       ├── AUTO
       │
       └── HUMAN APPROVAL
              │
              ▼
        Telegram / Slack
              │
              ▼
          GitHub Tools
              │
              ▼
          CI rerun
              │
          PASS / FAIL
```

---

# Agent tool model

The agent should have explicit tools rather than unrestricted repository access.

Initial tools:

```text
readFile(path)
listFiles()
searchCode(query)
getGitDiff()
getCILogs()
getWorkflowRun()
getPlaywrightFailure()
```

Later:

```text
modifyFile(path, patch)
runLint()
runTests()
runPlaywright()
createBranch()
createCommit()
createPullRequest()
rerunWorkflow()
```

Dangerous tools must be protected by policy and/or human approval.

---

# Failure categories

Start with:

```text
lint
formatting
typecheck
unit-test
playwright
build
dependency
security
unknown
```

Initial policy:

| Failure     | Initial behavior         |
| ----------- | ------------------------ |
| Formatting  | Candidate for auto-fix   |
| Simple lint | Candidate for auto-fix   |
| TypeScript  | Human approval           |
| Unit test   | Human approval           |
| Playwright  | Human approval initially |
| Build       | Human approval           |
| Dependency  | Human approval           |
| Security    | Human approval           |
| Unknown     | Human approval           |

The policy should be deterministic and configurable.

Confidence from the LLM is evidence, not authorization.

---

# Playwright role

Playwright is not just a scraping tool in this project.

It is part of the CI evidence pipeline.

GitHub Actions should run Playwright E2E tests and preserve:

- test output
- screenshots
- traces
- videos where useful
- HTML report
- browser console/network evidence where useful

Example flow:

```text
Frontend change
   ↓
GitHub Actions
   ↓
Playwright
   ↓
Failure
   ↓
Screenshot + trace + logs + Git diff
   ↓
AI diagnosis
```

Important distinction:

A failed test does NOT automatically mean the test is wrong.

The agent must distinguish between:

```text
broken test
vs
broken application
```

For example, a changed button label may justify a test update, while a changed price or broken authentication flow should normally be escalated.

---

# Development roadmap

## Phase 0 — Understand the architecture

Goal: understand the moving parts before using an agent framework.

Learn:

- LLM API basics
- tool/function calling
- structured output
- agent loop
- Git/GitHub basics
- GitHub Actions basics
- Playwright CI basics

Do NOT start with LangGraph/MCP/etc. Build a tiny agent loop yourself first.

---

## Phase 1 — Tiny local agent

Build a TypeScript CLI.

Example:

```text
User
 ↓
Agent
 ↓
LLM
 ↓
Tool call
 ↓
readFile()
 ↓
result back to LLM
```

Tools:

```text
listFiles
readFile
searchCode
getGitDiff
```

Success criterion:

The agent can inspect a small repository and explain a code issue using tools.

No writing.
No GitHub.
No autonomous fixes.

---

## Phase 2 — LLM provider abstraction

Create:

```text
LLMProvider
 ├── OllamaProvider
 ├── FreeCloudProvider
 └── PaidProvider
```

Add configuration:

```env
LLM_PROVIDER=ollama
LLM_MODEL=<local-model>
```

The rest of the agent must not care which provider is being used.

Success criterion:

Switching providers requires configuration changes, not agent-code changes.

---

## Phase 3 — Demo frontend

Create a deliberately small React/Next.js application.

Suggested areas:

```text
Login
Products
Cart
Checkout
Orders
```

Do not spend time making a polished product UI.

The application exists mainly to generate realistic CI failures.

---

## Phase 4 — Playwright CI

Add Playwright tests:

```text
login.spec.ts
cart.spec.ts
checkout.spec.ts
orders.spec.ts
```

Create GitHub Actions:

```text
lint
typecheck
unit tests
build
Playwright E2E
```

Upload Playwright reports and artifacts on failure.

Success criterion:

You can intentionally break the demo app and inspect the CI failure, screenshot, and trace.

---

## Phase 5 — GitHub failure ingestion

Create a GitHub App/webhook integration.

Receive workflow/check failures.

Agent should collect:

```text
workflow metadata
job metadata
failed step
CI logs
commit SHA
branch
changed files
Git diff
Playwright artifacts
```

Success criterion:

A failed GitHub Actions run automatically creates an internal failure-analysis request.

---

## Phase 6 — AI Failure Analyzer

Build structured diagnosis:

```ts
type FailureAnalysis = {
  category: FailureCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  rootCause: string;
  affectedFiles: string[];
  suggestedAction: string;
  requiresHumanApproval: boolean;
};
```

The LLM diagnoses.

The policy engine authorizes.

---

## Phase 7 — Read-only agent

Give the agent:

```text
readFile
searchCode
getGitDiff
getCILogs
getPlaywrightEvidence
```

It should be able to investigate failures but cannot modify anything.

Success criterion:

For a failed CI run, the agent can produce a useful root-cause analysis with evidence.

---

## Phase 8 — Controlled remediation

Add:

```text
modifyFile
runLint
runTests
runPlaywright
gitDiff
```

Initially allow only narrow, low-risk remediation such as formatting/simple lint.

Never give unrestricted shell access.

Success criterion:

Agent can fix an approved low-risk issue, verify locally, and show the diff.

---

## Phase 9 — Human-in-the-loop

Add Telegram or Slack.

Example:

```text
🚨 CI Failure

Type: Playwright
Risk: Medium

Diagnosis:
The test expects "Add", but the UI now exposes
"Add to cart".

Proposed action:
Update test selector.

[Approve]
[Reject]
[Details]
```

Human approval resumes the agent.

---

## Phase 10 — GitHub remediation loop

Agent can:

```text
create branch
modify files
commit
push
create PR
rerun CI
```

Then:

```text
CI PASS → complete

CI FAIL → analyze again

attempts >= limit → human escalation
```

Start with a maximum of 2–3 remediation attempts.

---

# Coding-agent strategy

Use your coding agent as an implementation assistant, not as the architect.

Give it small, bounded tasks.

Good task:

> Implement the `LLMProvider` interface and an Ollama provider. Add unit tests. Do not modify the agent loop.

Bad task:

> Build the entire AI CI/CD platform.

For every coding-agent task, provide:

1. Current architecture.
2. Exact file/module to change.
3. Acceptance criteria.
4. Constraints.
5. Tests required.
6. What must NOT be changed.

---

# Recommended coding-agent workflow

For each milestone:

```text
1. Ask coding agent to inspect the repository.
2. Ask it to propose a plan.
3. Review the plan.
4. Ask it to implement ONE small task.
5. Run tests.
6. Inspect the diff.
7. Commit.
8. Update progress.md.
9. Move to the next task.
```

Do not let the coding agent continuously redesign the architecture.

Keep architectural decisions with you.

---

# Coding-agent prompt template

```text
You are implementing one task in the AI CI/CD Recovery Agent.

Read:
- README.md
- progress.md
- relevant source files

Before coding:
1. Explain your understanding.
2. State the files you will change.
3. State the tests you will add/update.

Task:
<ONE SMALL TASK>

Constraints:
- TypeScript
- Follow existing architecture
- Do not introduce new frameworks unless required
- Do not modify unrelated files
- Do not add paid services
- Keep provider-specific LLM code behind LLMProvider
- Add tests

Acceptance criteria:
<criteria>

After implementation:
- Run relevant tests.
- Show the resulting diff.
- Explain what changed.
- Identify anything still incomplete.

Do not start the next task.
```

---

# Progress tracking

Update this file after every meaningful milestone.

Use:

```text
[ ] Not started
[~] In progress
[x] Complete
```

Track:

```text
Architecture
LLM provider abstraction
Local model
Tool calling
Agent loop
Demo frontend
Playwright
GitHub Actions
Failure ingestion
Failure analyzer
Policy engine
Read-only agent
Controlled remediation
Human approval
GitHub write actions
CI recovery loop
Audit trail
Documentation
Demo video
LinkedIn post
```

---

# Important project rules

1. TypeScript first. Do not switch the core backend to Go.
2. Keep the frontend/demo application small.
3. Minimize spending.
4. Support local/free LLMs first.
5. Paid models are optional fallbacks.
6. Never hard-code the agent to one LLM provider.
7. LLMs do not receive automatic filesystem access.
8. Repository access happens through explicit tools.
9. LLM proposes; tools execute.
10. Deterministic policy authorizes risky actions.
11. Human approval is required for ambiguous/high-risk changes.
12. Start read-only before allowing writes.
13. Never allow unlimited autonomous CI-fix loops.
14. Every agent action should eventually be auditable.
15. Build the fundamentals before adopting agent frameworks.

---

# Definition of done

The project is considered a strong MVP when this works:

```text
Developer pushes code
        ↓
GitHub Actions
        ↓
Playwright fails
        ↓
GitHub webhook
        ↓
Agent receives failure
        ↓
Agent retrieves:
  logs
  Git diff
  source
  Playwright evidence
        ↓
LLM diagnoses
        ↓
Policy evaluates
        ↓
Human approval OR safe auto-fix
        ↓
Agent modifies code
        ↓
Runs tests
        ↓
Creates commit/PR
        ↓
GitHub Actions reruns
        ↓
PASS
```

The final portfolio story should emphasize the **system architecture, safety model, tool-use loop, CI/CD integration, and human-in-the-loop design**, not simply "I built an AI agent."

---

# Architecture Decision Record (ADR)

This section is the source of truth for major architecture and deployment decisions.  
When we make a meaningful architectural change, update this section rather than silently changing direction.

## ADR-001 — Language / Runtime

**Decision:** Use TypeScript / Node.js for the core agent system.

**Reason:**

- The project owner is significantly more comfortable with TypeScript/JavaScript than Go.
- This keeps the learning focus on agent architecture, CI/CD, GitHub, Playwright, tool calling, and system design instead of learning a second backend language at the same time.

**Rejected for this project:** Go as the primary backend.

---

## ADR-002 — Frontend Scope

**Decision:** Keep the demo frontend deliberately small.

The frontend exists mainly to generate realistic CI/CD and Playwright scenarios.

Suggested areas:

```text
Login
Products
Cart
Checkout
Orders
```

Do not spend project time building a large production-style frontend.

---

## ADR-003 — Development Environment

**Decision:** Keep the project on localhost during the initial development and learning phases.

Phases that should remain local:

```text
Agent/tool-calling prototype
LLM provider abstraction
Local model integration
Demo frontend
Playwright
Basic GitHub Actions
Read-only agent
Initial policy engine
```

**Reason:**

- No hosting cost while unemployed.
- Faster experimentation.
- Easier debugging.
- The core architecture can be validated before introducing deployment complexity.

Do NOT prematurely deploy the entire system just to make it "real."

---

## ADR-004 — GitHub Actions Execution Environment

**Decision:** Use GitHub-hosted Actions runners for CI.

The repository's CI remains responsible for:

```text
lint
typecheck
unit tests
build
Playwright E2E
```

The AI agent is a separate control/analysis system. It does not replace GitHub Actions.

---

## ADR-005 — Local GitHub Webhook Development

A localhost agent cannot normally receive GitHub webhooks directly from the public internet.

**Decision:** During local webhook development, expose only the required webhook endpoint through a secure HTTPS tunnel.

Conceptually:

```text
GitHub
   │
   │ HTTPS webhook
   ▼
Secure tunnel
   │
   ▼
localhost
   │
   ▼
TypeScript Agent
```

Do not expose the developer machine directly to the public internet.

The tunnel is a development mechanism, not the production architecture.

---

## ADR-006 — Production Deployment Target

**Decision:** When the project becomes live, deploy the agent as a containerized Node.js/TypeScript service with a public HTTPS endpoint.

Production shape:

```text
GitHub
   │
   │ webhook
   ▼
Public HTTPS endpoint
   │
   ▼
Containerized TypeScript Agent
   │
   ├── Agent Runtime
   ├── GitHub Tools
   ├── LLM Provider Router
   ├── Policy Engine
   └── Notification / Approval
```

The hosting vendor is intentionally **NOT decided yet**.

Do not lock the architecture to a specific cloud provider at this stage.

The application should remain portable through:

```text
Dockerfile
environment variables
stateless HTTP/API design where possible
external persistence when required
```

When the project reaches the deployment phase, evaluate the simplest low-cost hosting option available at that time.

---

## ADR-007 — Frontend Hosting

**Decision:** Do not make frontend hosting a current concern.

The demo frontend can remain local during development.

For the live portfolio version, it may be hosted separately from the agent or alongside it, depending on what produces the simplest deployment.

The agent's public webhook endpoint is the important production requirement.

---

## ADR-008 — LLM Provider Architecture

**Decision:** Never couple the agent directly to a single LLM vendor.

Use:

```ts
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

Possible implementations:

```text
Ollama / local
Free cloud model
Paid provider
```

The agent interacts with the abstraction, not provider-specific SDKs.

---

## ADR-009 — Model Routing / Cost Control

**Decision:** Prefer free/local inference and use paid inference selectively.

Target routing:

```text
Simple task
   ↓
Local model

Medium task
   ↓
Free cloud model

Difficult / high-value task
   ↓
Paid model when necessary
```

Possible fallback:

```text
Local
  ↓ failure / insufficient capability
Free cloud
  ↓ failure / insufficient capability
Paid
```

Do not assume free models have unlimited availability or sufficient capabilities for every task.

---

## ADR-010 — Repository Access

**Decision:** The LLM does not receive implicit filesystem/repository access.

The agent exposes explicit tools:

```text
readFile
listFiles
searchCode
getGitDiff
getCILogs
getWorkflowRun
getPlaywrightEvidence
```

Later, controlled write/execute tools may be added:

```text
modifyFile
runLint
runTests
runPlaywright
createBranch
createCommit
createPullRequest
rerunWorkflow
```

The tool layer is the boundary between the model and the repository.

---

## ADR-011 — LLM vs Tool Responsibilities

**Decision:**

```text
LLM
  → reason
  → diagnose
  → propose actions

Tools
  → actually read/write/execute

Policy Engine
  → authorize

Human
  → approve risky/ambiguous actions
```

The LLM must not be treated as the security or authorization layer.

---

## ADR-012 — Policy Engine

**Decision:** Use a deterministic policy engine for action authorization.

Initial examples:

```text
formatting        → candidate for auto-fix
simple lint       → candidate for auto-fix
typecheck         → human approval
unit tests        → human approval
Playwright        → human approval initially
build             → human approval
dependency        → human approval
security          → human approval
unknown           → human approval
production        → human approval
```

LLM confidence is evidence, not authorization.

---

## ADR-013 — Human-in-the-Loop

**Decision:** Use Telegram or Slack as the initial human approval interface.

The approval system should allow:

```text
Approve
Reject
Show details
```

Approval must be tied to a specific agent run/action and recorded for auditability.

---

## ADR-014 — Agent Runtime

**Decision:** Build the first agent loop manually in TypeScript.

Do not start by depending on LangGraph, MCP, CrewAI, or another agent framework.

First understand:

```text
LLM
 ↓
tool call
 ↓
tool execution
 ↓
tool result
 ↓
LLM
```

After the fundamental loop works, evaluate frameworks only where they solve a demonstrated problem.

---

## ADR-015 — Playwright

**Decision:** Playwright is a first-class CI evidence source.

Use it for:

```text
E2E tests
screenshots
traces
test reports
browser evidence
```

The agent should combine Playwright evidence with:

```text
CI logs
Git diff
changed files
source code
```

A Playwright failure must NOT automatically be interpreted as a broken test.

The agent must consider:

```text
test is wrong
vs
application is wrong
```

---

## ADR-016 — Autonomous Remediation Limits

**Decision:** Never allow an unlimited remediation loop.

Initial maximum:

```text
2–3 remediation attempts
```

If the pipeline still fails:

```text
STOP
 ↓
Human escalation
```

Every remediation attempt should eventually be recorded in an audit trail.

---

# Current deployment strategy

For now:

```text
Developer laptop
      │
      ├── TypeScript Agent
      ├── Demo Frontend
      ├── Ollama / free LLM
      └── Playwright
              │
              ▼
       GitHub Actions
```

When webhook integration is needed locally:

```text
GitHub
   │
   ▼
HTTPS tunnel
   │
   ▼
localhost agent
```

When the portfolio project is ready to go live:

```text
GitHub
   │
   ▼
Public HTTPS webhook
   │
   ▼
Containerized TypeScript Agent
   │
   ├── LLM Provider Router
   ├── GitHub Tools
   ├── Policy Engine
   └── Human Approval
```

**Hosting provider: TBD at deployment time.**

This is intentional. We should not spend time choosing cloud infrastructure before the core system works locally.
