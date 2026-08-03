# PD-019E Conversational Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve valid lead memory across provider failures, distinguish visitor budget from official prices, and expose gallery/WhatsApp CTAs only in the authorized conversational context.

**Architecture:** Extend the existing structured commercial state and deterministic extraction instead of adding a parallel store. Keep official facts and actions local: OpenAI supplies conversation text, while local code validates monetary context, memory, visual intent, handoff and CTA repetition.

**Tech Stack:** Node.js CommonJS, Vercel Functions, OpenAI Responses API, static browser client, `node:assert` regression scripts.

## Global Constraints

- Preserve OpenAI-first, cumulative memory, guardrails, official prices, handoff, PD-019D personality and official WhatsApp `5591984487207`.
- Do not invent advertising results, media costs, service prices, phones or visual assets.
- Use an isolated branch, red-green TDD, complete suite, build, Preview, Production smoke, logs, rollback and SOCI.

---

### Task 1: Monetary context and deterministic memory

**Files:** `lib/conversation-memory.js`, `lib/commercial-guardrails.js`, `tests/pd-019e-resilience.test.js`

- [ ] Write failing tests for `visitorBudget`, business, goal and budget recall formats.
- [ ] Verify the tests fail for missing structured fields.
- [ ] Add deterministic extraction and contextual price validation.
- [ ] Verify focused tests pass.

### Task 2: Failure recovery and contextual CTA

**Files:** `api/atendimento.js`, `atendimento.js`, `lib/openai-conversation.js`, `tests/pd-019e-api-regression.test.js`

- [ ] Reproduce the exact seven-turn Silvio conversation with a provider failure on the budget turn.
- [ ] Verify the next memory turns recover locally and the handoff remains complete.
- [ ] Gate gallery actions on explicit current visual intent and prevent repetition.
- [ ] Verify fallback, gallery and handoff regressions.

### Task 3: Verification and publication

**Files:** `package.json`, `docs/superpowers/specs/2026-08-03-pd019e-resilience.md`, SOCI state records.

- [ ] Run focused tests, complete suite, syntax checks and build.
- [ ] Review the complete diff and commit the branch.
- [ ] Push and validate Preview with the real Silvio scenario and 20-turn regression.
- [ ] Merge to `main`, publish Production, run smoke/log checks and record rollback.
- [ ] Update SOCI only after Production evidence is complete.
