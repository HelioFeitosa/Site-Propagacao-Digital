# PD-019B OpenAI-First Conversation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a OpenAI o controlador conversacional padrão do atendente Hélio, com memória e ações validadas localmente.

**Architecture:** A API resolve primeiro reset e fatos locais obrigatórios; os demais turnos usam Structured Outputs da Responses API. O modelo propõe resposta, intenção, memória e ações, mas módulos locais validam cada campo, substituem fatos oficiais e preservam fallback seguro sem mutação.

**Tech Stack:** Node.js CommonJS, Vercel Functions, OpenAI Responses API, JSON Schema, `node:assert`, Playwright Core.

## Global Constraints

- Preservar `store: false`, timeout de 7000 ms e chave exclusivamente server-side.
- Telefone oficial: `(91) 9 8448-7207`; WhatsApp: `5591984487207`.
- Loja virtual: Essencial R$ 1.500; Profissional R$ 3.000; Completo R$ 5.000.
- No máximo uma pergunta principal por resposta.
- Não permitir que texto do modelo altere preço, telefone, URL, asset, CTA, handoff ou estado sem validação local.
- Não enviar segredos, SOCI, caminhos, logs ou histórico integral.
- Não remover histórico; classificar o controlador rígido como superado.
- Rollback de Production: `0cc53b9edf98abe4cde2f7f9bbbe86809e961a59`.

---

### Task 1: Guardrails comerciais e memória validada

**Files:**
- Create: `lib/commercial-guardrails.js`
- Create: `lib/conversation-memory.js`
- Create: `tests/pd-019b-memory-guardrails.test.js`

**Interfaces:**
- Produces: `resolveLocalTurn(message, state)`, `validateConversationOutput(output, context)`, `applyMemoryUpdates(state, updates, currentMessage)`.

- [ ] Escrever testes falhos para identidade, telefone, preços, reset, assets permitidos e rejeição de fatos inventados.
- [ ] Escrever testes falhos para extração múltipla proposta, correção e rejeição de crítica, insulto, resposta vaga e comando técnico.
- [ ] Executar `node tests/pd-019b-memory-guardrails.test.js` e confirmar falha por módulos ausentes.
- [ ] Implementar catálogo oficial, interceptores locais e validação de saída.
- [ ] Implementar aplicação de memória com evidência explícita, confiança mínima `0.78` e campos permitidos.
- [ ] Executar o teste e confirmar aprovação.

### Task 2: Cliente OpenAI estruturado

**Files:**
- Create: `lib/openai-conversation.js`
- Create: `tests/pd-019b-openai-conversation.test.js`

**Interfaces:**
- Consumes: estado validado, mensagens recentes, fatos, assets e ações.
- Produces: `requestConversationTurn()` com `{ ok, output, errorType, requestId }`.

- [ ] Escrever testes falhos para contrato seguro, schema estrito, `store: false`, dez mensagens limitadas e identidade do Hélio.
- [ ] Escrever testes falhos para sucesso, timeout, vazio, JSON inválido, falhas HTTP e sanitização.
- [ ] Executar o teste e confirmar falha pelo módulo ausente.
- [ ] Implementar `buildConversationRequest()` com `text.format.type = json_schema`.
- [ ] Implementar extração, classificação de erro e timeout de 7000 ms.
- [ ] Executar o teste e confirmar aprovação.

### Task 3: Orquestração OpenAI-first na API

**Files:**
- Modify: `api/atendimento.js`
- Create: `tests/pd-019b-api-routing.test.js`

**Interfaces:**
- Consumes: guardrails, memória e cliente estruturado.
- Produces: `{ reply, lead, provider, actions, reset, memory }`.

- [ ] Escrever testes falhos provando que turnos normais chamam OpenAI antes do questionário rígido.
- [ ] Escrever testes falhos para fato local, fallback imutável e reset verdadeiro.
- [ ] Executar e confirmar que o provider atual ainda é `commercial-state` nos turnos normais.
- [ ] Substituir o ramo `advanceCommercialConversation()` pela nova orquestração.
- [ ] Manter o fluxo legado somente como fallback histórico não controlador.
- [ ] Executar os testes novos e a suíte PD-019A; ajustar compatibilidade sem reativar a sequência rígida.

### Task 4: Frontend sem inferência local contaminante

**Files:**
- Modify: `atendimento.js`
- Create: `tests/pd-019b-frontend-contract.test.js`

**Interfaces:**
- Consumes: resposta validada da API.
- Produces: sessão substituível no reset e ações locais reconhecidas.

- [ ] Escrever teste falho que proíbe `updateLeadLocally()` no fallback.
- [ ] Escrever teste falho para substituição integral de estado em `reset: true`.
- [ ] Escrever teste falho para execução somente de `assetId` e ações reconhecidas.
- [ ] Remover inferência local do fallback e aplicar contrato de reset/ações.
- [ ] Executar testes estruturais e de navegador.

### Task 5: Regressões Neto e Marcos

**Files:**
- Create: `tests/pd-019b-neto-marcos-regression.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: handler completo com fetch simulado.
- Produces: regressões multi-turno determinísticas.

- [ ] Criar helper de respostas estruturadas que deriva somente os dados autorizados do roteiro.
- [ ] Reproduzir cenário Neto com nome+toner, crítica, identidade, memória, reset, preços e próximo passo.
- [ ] Reproduzir cenário Marcos com pizza, ponto físico, WhatsApp, objetivo e mensagens contaminantes.
- [ ] Acrescentar conversa de dez turnos, correções, ausência de loops e limite de uma pergunta.
- [ ] Verificar que os testes falham antes da integração final e passam depois.
- [ ] Adicionar todas as regressões PD-019B ao script `npm test`.

### Task 6: Preview e validação real

**Files:**
- Modify if evidence requires: arquivos das Tasks 1–5.

**Interfaces:**
- Consumes: branch testada e variáveis Preview existentes.
- Produces: Preview `READY` com conversa longa real.

- [ ] Executar todas as suítes, build, sintaxe, segredo e `git diff --check`.
- [ ] Commitar e publicar Preview limpo.
- [ ] Validar identidade, Neto, Marcos, pergunta direta, preço, reset e conversa longa.
- [ ] Confirmar `openai`, fatos locais, fallback controlado e logs sanitizados.
- [ ] Remover qualquer instrumento temporário e criar Preview final.

### Task 7: SOCI, merge e Production

**Files:**
- Create: `C:/Users/pc/Documents/INFINITY-SOCI/03_DECISOES/propagacao-digital/PD-019B-OPENAI-CENTRO-CONVERSACIONAL.md`
- Modify: índices, mapa, decisões oficiais, estado técnico, manual do atendente e Confiança Total no SOCI.

**Interfaces:**
- Consumes: Preview aprovado.
- Produces: `main`, `origin/main` e Production no mesmo commit.

- [ ] Registrar o fluxo rígido como `SUPERADO COMO CONTROLADOR CONVERSACIONAL` e suas regras úteis como `GUARDRAILS COMERCIAIS E OPERACIONAIS`.
- [ ] Atualizar documentação técnica sem reescrever histórico.
- [ ] Fazer push, merge fast-forward e deploy Production.
- [ ] Repetir smoke tests no domínio oficial e inspecionar erros recentes.
- [ ] Fazer rollback para `0cc53b9` se qualquer critério essencial falhar.
- [ ] Atualizar o registro final do SOCI com commits e deployments.
