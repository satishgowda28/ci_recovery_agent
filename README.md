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
