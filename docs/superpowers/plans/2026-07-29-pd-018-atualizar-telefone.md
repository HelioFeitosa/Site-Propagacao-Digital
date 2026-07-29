# PD-018 Atualizar Telefone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o contato comercial vigente da Propagação Digital para `(91) 98448-7207` / `5591984487207`, preservando demonstrações, terceiros e histórico.

**Architecture:** A alteração permanece determinística e local: páginas oficiais usam links `wa.me`, enquanto `atendimento.js` e `admin.js` controlam handoff e retomada comercial. Um teste de contrato PD-018 valida todos os pontos oficiais, proíbe o número informado por engano e exclui explicitamente o modelo demonstrativo.

**Tech Stack:** HTML estático, JavaScript Node.js, testes com `node:assert`, Vercel.

## Global Constraints

- Não alterar layout, preços ou textos comerciais além do telefone.
- Não alterar OpenAI, Redis, n8n, banco ou APIs.
- Não ativar WhatsApp Cloud API.
- Não modificar contatos próprios de demonstrações, clientes ou terceiros.
- Não executar deploy.
- Telefone oficial: `(91) 98448-7207`; WhatsApp: `5591984487207`.
- Número anterior `5591987137397`: superado para o contato comercial vigente.
- Número incorreto `5591984487202`: erro de comunicação sem autoridade documental, comercial ou histórica.

---

### Task 1: Contrato determinístico PD-018

**Files:**
- Create: `tests/pd-018-official-phone.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: HTML e JavaScript oficiais do site.
- Produces: verificação executável do telefone oficial e da preservação do modelo demonstrativo.

- [ ] **Step 1: Write the failing test**

Criar um teste que execute os artefatos oficiais, extraia destinos `wa.me`, confirme `5591984487207`, rejeite `5591987137397` e `5591984487202`, e comprove que o modelo Lume continua com seu número demonstrativo.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/pd-018-official-phone.test.js`
Expected: FAIL porque os artefatos oficiais ainda usam `5591987137397`.

- [ ] **Step 3: Register the test**

Adicionar o teste PD-018 ao script `npm test`.

### Task 2: Atualizar o contato comercial oficial

**Files:**
- Modify: `index.html`
- Modify: `agentes-de-atendimento.html`
- Modify: `automacao-com-ia.html`
- Modify: `criacao-de-sites-belem.html`
- Modify: `galeria-modelos.html`
- Modify: `landing-pages.html`
- Modify: `lojas-virtuais.html`
- Modify: `seo-para-empresas.html`
- Modify: `trafego-pago.html`
- Modify: `videos-e-artes.html`
- Modify: `atendimento.js`
- Modify: `admin.js`
- Modify: `README.md`
- Modify: `tests/galeria-modelos.test.js`
- Modify: `tests/pd-013-home-commercial.test.js`
- Modify: `tests/pd-014-sales-ready.test.js`

**Interfaces:**
- Consumes: telefone confirmado por Hélio Feitosa.
- Produces: CTAs, handoff, retomada administrativa e testes usando `5591984487207`.

- [ ] **Step 1: Replace only official commercial occurrences**

Substituir `5591987137397` por `5591984487207` nos arquivos oficiais listados.

- [ ] **Step 2: Preserve demonstrations and historical plans**

Não alterar `modelos/loja-moda/**`, `tests/loja-moda-funcional.test.js` nem planos históricos da demonstração.

- [ ] **Step 3: Run focused test**

Run: `node tests/pd-018-official-phone.test.js`
Expected: PASS.

### Task 3: Registrar o estado vigente no SOCI

**Files:**
- Create: `C:\Users\pc\Documents\INFINITY-SOCI\03_DECISOES\propagacao-digital\PD-018-TELEFONE-OFICIAL.md`
- Modify: `C:\Users\pc\Documents\INFINITY-SOCI\14_CONTEXTO-MESTRE\SOCI-DECISOES-OFICIAIS.md`

**Interfaces:**
- Consumes: autorização de Hélio Feitosa em 2026-07-29 e fonte Git/Vercel confirmada.
- Produces: decisão vigente sem reescrever documentos históricos.

- [ ] **Step 1: Record the official identity decision**

Registrar número vigente, número anterior superado e número incorreto apenas como erro de comunicação.

- [ ] **Step 2: Link the decision from the current master decisions**

Adicionar entrada curta ao índice de decisões oficiais.

### Task 4: Verificação, commit e parada antes do deploy

**Files:**
- Verify: todos os arquivos alterados.

**Interfaces:**
- Consumes: implementação e documentação concluídas.
- Produces: evidência de testes, build, varredura numérica e commit local.

- [ ] **Step 1: Run syntax, focused and complete tests**

Run: `node --check atendimento.js`, `node --check admin.js`, `node tests/pd-018-official-phone.test.js`, `npm test`.

- [ ] **Step 2: Run build**

Run: `npm run build`.

- [ ] **Step 3: Audit numbers and diff**

Pesquisar `5591987137397`, `5591984487207`, `5591984487202`, revisar `git diff` e confirmar que terceiros não foram alterados.

- [ ] **Step 4: Commit scoped project changes**

Commit: `fix: atualizar telefone oficial PD-018`.

- [ ] **Step 5: Stop**

Não executar deploy; apresentar evidências e aguardar autorização de Hélio Feitosa.
