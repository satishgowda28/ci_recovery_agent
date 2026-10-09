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

| Failure | Initial behavior |
|---|---|
| Formatting | Candidate for auto-fix |
| Simple lint | Candidate for auto-fix |
| TypeScript | Human approval |
| Unit test | Human approval |
| Playwright | Human approval initially |
| Build | Human approval |
| Dependency | Human approval |
| Security | Human approval |
| Unknown | Human approval |

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
  severity: "low" | "medium" | "high" | "critical";
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
