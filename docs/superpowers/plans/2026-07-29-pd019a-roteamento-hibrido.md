# PD-019A Hybrid OpenAI Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar localmente um roteamento híbrido conservador no qual o `commercial-state` mantém toda autoridade comercial e a OpenAI apenas produz texto candidato para finalidades explicitamente elegíveis.

**Architecture:** O fluxo comercial retorna uma decisão estruturada `aiAssistance` junto do estado e da resposta local. O handler consulta uma feature flag exclusivamente server-side e, somente quando a decisão for elegível, envia contexto mínimo à Responses API; a resposta passa por validação local antes de substituir a resposta candidata, e qualquer falha mantém o fallback local.

**Tech Stack:** Node.js CommonJS, Vercel Functions, OpenAI Responses API via `fetch`, testes Node `assert` com mocks.

## Global Constraints

- Não executar chamada real à OpenAI nem consumir créditos.
- Não alterar variáveis da Vercel, criar Preview, realizar push ou deploy.
- `HELIO_OPENAI_ENABLED` somente habilita o caminho quando seu valor é exatamente `true`.
- `legacyMode` não participa da ativação híbrida.
- O estado, fatos comerciais, preços, telefone, URLs, WhatsApp, CTA, handoff, imagens, memória e progressão permanecem locais.
- Toda falha, timeout ou rejeição da resposta usa fallback local sem erro técnico para o visitante.
- Não registrar chaves, payloads, resposta bruta, dados pessoais ou mensagem externa detalhada.

---

### Task 1: Contrato explícito de elegibilidade

**Files:**
- Modify: `lib/commercial-conversation.js`
- Test: `tests/pd-019a-hybrid-routing.test.js`

**Interfaces:**
- Produces: `advanceCommercialConversation(state, text) -> { state, reply, aiAssistance }`
- `aiAssistance`: `{ eligible: boolean, purpose: string | null, reason: string }`

- [ ] Escrever testes que exijam decisão inelegível para nome, preço, WhatsApp, handoff, imagem e segurança.
- [ ] Executar o teste e confirmar falha pela ausência de `aiAssistance`.
- [ ] Implementar decisão padrão `deterministic-response` e elegibilidade conservadora somente após diagnóstico confirmado, no fallback conversacional livre.
- [ ] Executar o teste e confirmar aprovação.

### Task 2: Cliente híbrido seguro e testável

**Files:**
- Create: `lib/hybrid-openai.js`
- Test: `tests/pd-019a-hybrid-routing.test.js`

**Interfaces:**
- Produces: `isHybridOpenAIEnabled(value)`, `buildHybridRequest(...)`, `validateCandidate(...)`, `classifyProviderFailure(...)` e `requestHybridReply(...)`.
- Consumes: `fetchImpl`, chave e modelo injetados pelo handler; testes usam somente mocks.

- [ ] Escrever testes para flag estrita, contexto máximo de três trocas, `store:false`, timeout e classificação sanitizada.
- [ ] Executar e confirmar falha porque o módulo ainda não existe.
- [ ] Implementar payload mínimo, `AbortController` com timeout de 7000 ms e erros tipados sem mensagem externa.
- [ ] Escrever testes de rejeição para telefone, link, preço, conteúdo administrativo, resposta vazia e malformada.
- [ ] Implementar validação de texto candidato, limite de 600 caracteres e allowlist do telefone oficial.
- [ ] Executar e confirmar aprovação.

### Task 3: Integração no handler sem autoridade sobre o estado

**Files:**
- Modify: `api/atendimento.js`
- Test: `tests/pd-019a-hybrid-routing.test.js`

**Interfaces:**
- Consumes: decisão `aiAssistance` e `requestHybridReply`.
- Produces: providers `commercial-state`, `openai`, `openai-fallback` e `local-fallback`.

- [ ] Escrever testes de integração com `fetch` mockado para flag ausente, falsa, inválida, resposta determinística e mensagem elegível.
- [ ] Confirmar que os testes falham antes da integração.
- [ ] Integrar a chamada somente quando flag, chave e elegibilidade permitirem, preservando cópia do estado local.
- [ ] Fazer falhas, timeout e rejeições retornarem a resposta local com provider `openai-fallback`.
- [ ] Confirmar que `legacyMode` não é necessário e que o frontend não escolhe provedor.
- [ ] Executar os testes de integração.

### Task 4: Documentação, regressão e entrega local

**Files:**
- Modify: `package.json`
- Create: `docs/decisions/pd-019a-hybrid-openai-routing.md`

- [ ] Registrar fronteira de autoridade, feature flag, elegibilidade, contexto, timeout, validações, fallback e riscos.
- [ ] Incluir o novo teste na suíte padrão.
- [ ] Executar o teste PD-019A, toda a suíte e o build.
- [ ] Auditar diff, arquivos rastreados e ocorrências de segredos sem imprimir valores.
- [ ] Criar um único commit local e parar antes de push, Preview, chamada real ou alteração na Vercel.
