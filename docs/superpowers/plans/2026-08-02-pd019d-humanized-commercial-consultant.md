# PD-019D Humanized Commercial Consultant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Humanizar o Hélio e tornar sua consultoria comercial natural, preservando OpenAI-first, memória, guardrails, handoff e fatos oficiais.

**Architecture:** A OpenAI continua responsável pela conversa natural. Funções locais pequenas classificam somente intenções operacionais críticas, atualizam memória explícita e constroem o handoff no servidor.

**Tech Stack:** Node.js CommonJS, Vercel Functions, OpenAI Responses API, JavaScript estático, testes `node:assert`.

## Global Constraints

- Não reconstruir arquitetura nem reintroduzir questionário rígido.
- Não alterar preços, telefone, páginas comerciais, identidade visual, chaves ou serviços.
- No máximo uma pergunta principal por resposta.
- WhatsApp oficial: `5591984487207`; exibição: `(91) 9 8448-7207`.
- Usar TDD e validar Preview antes de Production.

---

### Task 1: Contrato de intenção e personalidade

**Files:**
- Create: `tests/pd-019d-humanized-consultant.test.js`
- Modify: `lib/commercial-guardrails.js`
- Modify: `lib/openai-conversation.js`

**Interfaces:**
- Consumes: `resolveLocalTurn(message, state)` e `buildConversationRequest(input)`.
- Produces: interpretação segura de canal, ligação, humano e instruções de personalidade.

- [ ] Escrever testes falhando para acolhimento, venda pelo zap, ligação sem telefone, humano imediato, CTA único e uma pergunta.
- [ ] Executar o teste e confirmar falhas comportamentais esperadas.
- [ ] Implementar estado e regras locais mínimas; fortalecer as instruções OpenAI.
- [ ] Executar o teste e confirmar aprovação.
- [ ] Commitar o ciclo.

### Task 2: Memória e handoff comercial completo

**Files:**
- Modify: `lib/conversation-memory.js`
- Modify: `lib/commercial-handoff.js`
- Modify: `api/atendimento.js`
- Test: `tests/pd-019d-humanized-consultant.test.js`

**Interfaces:**
- Consumes: estado cumulativo da PD-019C.
- Produces: `contactPreference`, `callbackRequested`, `urgency`, `consultationDoubts`, `handoffCtaShown` e resumo sanitizado.

- [ ] Acrescentar asserções falhando para ligação, dúvida, preferência, memória e handoff Marcos.
- [ ] Executar e confirmar RED.
- [ ] Implementar extração/aplicação explícita e resumo no servidor.
- [ ] Executar e confirmar GREEN, inclusive regressões PD-019C.
- [ ] Commitar o ciclo.

### Task 3: Regressão integral da API

**Files:**
- Create: `tests/pd-019d-api-regression.test.js`
- Modify: `package.json`
- Modify only if required by failing behavior: `api/atendimento.js`, `lib/*.js`, `atendimento.js`

**Interfaces:**
- Consumes: endpoint `/api/atendimento` e estado do frontend.
- Produces: prova automatizada da conversa Marcos e cenários adicionais.

- [ ] Automatizar os dez turnos da missão e cenários emocionais/20 turnos/isolamento/fallback.
- [ ] Confirmar RED contra a implementação anterior.
- [ ] Fazer somente os ajustes mínimos apontados pelas falhas.
- [ ] Executar teste específico, suíte completa, checks sintáticos e build.
- [ ] Commitar o ciclo.

### Task 4: Preview e Production

**Files:**
- Create or modify: `tests/pd-019d-deployment-smoke.js`
- Create or modify: `tests/pd-019d-production-browser-smoke.js`

**Interfaces:**
- Consumes: deployment Vercel e domínio oficial.
- Produces: evidência sanitizada de conversa, handoff, mobile e console.

- [ ] Fazer push da branch e criar Preview.
- [ ] Executar conversa Marcos e revisar handoff no Preview.
- [ ] Validar mobile, ausência de CTA/galeria indevidos e logs.
- [ ] Fazer merge em `main`, push e deployment Production.
- [ ] Executar smoke no domínio, logs e preservar rollback PD-019C.

### Task 5: Registro SOCI

**Files:**
- Create: `C:/Users/pc/Documents/INFINITY-SOCI/06_ENGENHARIA/propagacao-digital/PD-019D-HUMANIZACAO-CONSULTORIA-COMERCIAL.md`
- Modify: índice, mapa, decisões, estado técnico, manual do atendente e Confiança Total.

**Interfaces:**
- Consumes: evidências finais de Git, testes e Vercel.
- Produces: estado vigente e rollback auditáveis.

- [ ] Registrar personalidade, linguagem, interpretação WhatsApp, ligação, CTA e handoff.
- [ ] Registrar testes, commits, Preview, Production, segurança e rollback.
- [ ] Verificar referências cruzadas e ausência de segredos.
- [ ] Executar verificação final fresca do repositório e produção.
