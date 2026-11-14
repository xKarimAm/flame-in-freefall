---
name: build-module
description: Build one lane task end to end from the lane PLAN.md, test-first, and open a PR. Use when asked to build or finish a task in pipeline/ or web/.
---

# Build one lane task

You own one lane folder (`pipeline/` or `web/`). Everything else is read-only (see AGENTS.md).

1. **Load.** Read AGENTS.md, PLAN.md, your lane PLAN.md, contracts/README.md and the schemas your task touches. Done when you can name the inputs, outputs, acceptance checks and test command.
2. **State.** Keep `<lane>/STATE.md` with: Goal, Key decisions, Task list, File map, Current step, Open questions. Update after every task.
3. **Test first.** One behaviour at a time, red then green. Tests are the oracle; a test changes only when the PLAN changes. Run the lane tests after every edit. Fakes stand in for every model call.
4. **Stuck.** Same failure three times: stop, write it under Open questions, report. A contract that doesn't fit: open an issue (`lane:orchestrator`, `contract-change`), continue against golden data.
5. **Ship.** Branch `lane/<lane>/<task>`, Conventional Commits (`feat(pipeline): ...`), PR to main with: acceptance checks ticked with evidence, test output, deviations. Never merge your own PR.
