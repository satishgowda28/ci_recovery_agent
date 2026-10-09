# AI CI Recovery Demo Frontend

A deliberately small React + TypeScript frontend that acts as the test target for the **AI Engineering Feedback & Remediation Agent** project.

This is not intended to be a polished product UI.

Its purpose is to provide realistic failures for:

- ESLint
- TypeScript
- unit tests
- builds
- Playwright E2E
- future visual regression
- future QA reproduction

## Requirements

- Node.js 22+
- npm

## Setup

```bash
npm install
npx playwright install
```

## Development

```bash
npm run dev
```

Open the URL shown by Vite.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Useful Playwright commands

```bash
npm run test:e2e
npm run test:e2e:ui
```

After a failure, inspect:

```text
playwright-report/
test-results/
```

The CI workflow uploads those artifacts automatically.

## Why this app is intentionally simple

The AI project needs a controlled application where we can deliberately introduce failures.

Examples we will eventually demonstrate:

1. Lint failure → low-risk auto-fix.
2. Playwright selector failure → diagnose using Git diff + test output.
3. Application behavior failure → human approval.
4. QA issue → reproduce with Playwright.
5. UI/design mismatch → future visual regression/Figma workflow.

## Important project rule

Do not turn this into a large frontend application.

The AI agent is the main project. This frontend is the controlled environment in which we generate engineering feedback.
