# PD-019C Memory, Handoff and Visual Honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve cumulative commercial memory, generate complete WhatsApp handoffs, and prevent unsupported visual promises.

**Architecture:** Extend the OpenAI-first state contract with locally validated cumulative facts and deterministic operational events. The frontend renders only server-authorized actions/assets and builds handoff text from the cumulative state.

**Tech Stack:** Node.js, browser JavaScript, OpenAI Responses API structured output, Vercel Functions.

## Global Constraints

- Preserve OpenAI-first and official phone/prices.
- Do not add image generation, CRM, services, or third-party integrations.
- Write failing regressions before production changes.

### Task 1: Reproduce cumulative-memory failure

**Files:** `tests/pd-019c-memory-handoff-visual.test.js`

- [ ] Test name-only capture, 20-turn preservation, corrections, reset and fallback.
- [ ] Run the test and confirm expected failure.

### Task 2: Implement cumulative memory and factual summary

**Files:** `lib/conversation-memory.js`, `lib/commercial-guardrails.js`, `lib/openai-conversation.js`, `api/atendimento.js`

- [ ] Add deterministic extraction and validated fact metadata.
- [ ] Include the cumulative factual summary in the safe OpenAI context.
- [ ] Answer memory questions from structured state.
- [ ] Run focused and existing memory tests.

### Task 3: Implement visual honesty and gallery rejection

**Files:** `lib/commercial-guardrails.js`, `api/atendimento.js`, `atendimento.js`

- [ ] Handle image/infographic requests honestly when no compatible asset exists.
- [ ] Persist gallery rejection and suppress repeated gallery actions/cards.
- [ ] Render only server-authorized READY assets.

### Task 4: Implement professional handoff

**Files:** `lib/commercial-handoff.js`, `api/atendimento.js`, `atendimento.js`

- [ ] Build the complete structured summary with visitor-phone rules.
- [ ] Return and use the server-built WhatsApp URL.
- [ ] Validate destination `5591984487207`.

### Task 5: Verify and publish

**Files:** `package.json`, SOCI current-state records.

- [ ] Run focused tests, full suite, build and diff/security checks.
- [ ] Commit and push the branch; deploy and validate Preview.
- [ ] Merge to main, deploy Production, validate official domain and logs.
- [ ] Update SOCI with cause, architecture, commits, deployments and rollback.
