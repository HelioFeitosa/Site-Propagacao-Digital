# PD-019C Memory, Handoff and Visual Honesty Design

## Root cause

The PD-019B state is carried by the browser, but a name-only answer such as `Marcos` is rejected by the local memory validator because it lacks an explicit phrase such as `meu nome`. The browser retains only 24 messages, sends 18, and the OpenAI request uses 10; therefore old facts depend entirely on structured state. The WhatsApp handoff reads structured state but summarizes only the last six user messages. Visual presentation is also inferred again in the browser from text and segment instead of being driven exclusively by a server-authorized `READY` asset.

## Design

Keep OpenAI-first. Add a cumulative version-3 state with canonical fields plus fact metadata (`value`, `source`, `turn`) and a factual summary derived locally. The server will recover explicit facts from the current user message before the OpenAI call, validate model-proposed updates without accepting empty values, preserve existing facts unless an explicit correction is present, and answer memory questions from cumulative state.

Visual requests, infographic requests, gallery rejection and human handoff become deterministic operational events. Food/pizzeria requests cannot activate the fashion asset; unavailable custom visuals get an honest response. A rejected generic gallery is remembered and not offered again. Only `visualStatus: READY` plus a recognized asset ID may cause the browser to render a card.

The handoff summary is generated from cumulative structured state, never from the last messages alone. It includes visitor phone only when explicitly provided, otherwise states that the visitor initiated contact from their own WhatsApp.

## Verification

Automated tests cover the complete Marcos sequence, name after 15 turns, 20-turn continuity, corrections, reset, fallback preservation, invalid JSON, gallery rejection, visual honesty, and handoff with/without visitor phone. Preview and Production must be checked through the deployed API and official domain. Rollback remains the PD-019B production deployment.
