# PD-019F Final Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze Hélio as a commercially usable attendant after fixing canonical memory authority, transactional visual execution and Brazilian visitor-phone capture.

**Architecture:** Make `canonicalMemory` the authoritative fact store and keep legacy lead fields as projections for compatibility. Keep visual authorization in the server response and rendering confirmation in the frontend lead state. Parse phones only from explicit visitor ownership statements.

**Tech Stack:** Node.js CommonJS, Vercel Functions, static browser JavaScript, OpenAI Responses API with `store: false`, node:assert regression scripts.

## Global Constraints

- Fix only memory contamination, unexecuted visual promises and visitor-phone capture.
- Preserve OpenAI-first, official prices, official WhatsApp `5591984487207`, fallback, isolation, security and rollback.
- Do not create images, furniture demos, CRM, cross-session memory expansion, voice, new services, design changes or later PD missions.

---

### Task 1: Canonical memory and phone

**Files:** `lib/conversation-memory.js`, `lib/commercial-guardrails.js`, `lib/commercial-handoff.js`, `tests/pd-019f-final-stabilization.test.js`

- [ ] Add failing assertions for Flavio facts, assistant contamination, explicit rejection and phone formats.
- [ ] Verify failure on missing canonical source and phone parser.
- [ ] Implement canonical facts, authority hierarchy, rejected facts and legacy projections.
- [ ] Verify focused tests pass.

### Task 2: Transactional visual action

**Files:** `lib/commercial-guardrails.js`, `api/atendimento.js`, `atendimento.js`, `tests/pd-019f-api-regression.test.js`, `tests/pd-019f-frontend-contract.test.js`

- [ ] Reproduce the full Flavio conversation and visual-promise loop.
- [ ] Require `REQUESTED → READY → RENDERED` or `REQUESTED → FAILED`.
- [ ] Render `open_visual` in the same response and persist `RENDERED` only after a card exists.
- [ ] Verify no duplicated promise/card and no fallback lock.

### Task 3: Verification, publication and freeze

**Files:** `package.json`, SOCI PD-019F record, technical state/index/decisions/manual/trust records.

- [ ] Run focused regressions, 30 turns, full suite, syntax and build.
- [ ] Validate Preview Flavio conversation, real visual card and phone.
- [ ] Merge, publish Production, smoke, logs and rollback evidence.
- [ ] Record the functional freeze and non-critical deferred observations.
