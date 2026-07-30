# PD-019 Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o atendente Hélio com roteamento híbrido OpenAI validado e estável em produção.

**Architecture:** Manter o fluxo comercial determinístico como autoridade local e acionar a OpenAI apenas quando `HELIO_OPENAI_ENABLED`, `OPENAI_API_KEY` e a elegibilidade local estiverem simultaneamente presentes. Toda resposta externa passa pela validação local e qualquer falha preserva a resposta determinística como `openai-fallback`.

**Tech Stack:** Node.js CommonJS, Vercel Functions, Vercel CLI/API, OpenAI Responses API, testes `node:test`.

## Global Constraints

- Não expor, copiar para código ou enviar ao navegador qualquer segredo.
- Preservar `store: false`, timeout controlado e validação local.
- Não alterar preços, telefone oficial, CTAs, links ou autoridade comercial local.
- Não destruir trabalho paralelo ou documentos históricos.
- Publicar somente após Preview, testes, build e auditoria aprovados.
- Fazer rollback se a validação de produção falhar.

---

### Task 1: Diagnóstico do ambiente

**Files:**
- Inspect: `.vercel/project.json`
- Inspect: `api/atendimento.js`
- Inspect: `lib/hybrid-openai.js`

**Interfaces:**
- Consumes: sessão Vercel autenticada e metadados do projeto.
- Produces: causa-raiz comprovada sem revelar valores.

- [ ] Confirmar branch, HEAD, worktree, remotes e vínculo Vercel.
- [ ] Listar somente nomes, targets e branch scopes das variáveis.
- [ ] Confirmar Git integration, projeto, time e snapshot do deployment.
- [ ] Provar em qual condição do roteamento o fluxo para.

### Task 2: Corrigir configuração e validar Preview

**Files:**
- Modify only if evidence requires: `api/atendimento.js`
- Test only if evidence requires: `tests/pd-019a-hybrid-routing.test.js`

**Interfaces:**
- Consumes: causa-raiz da Task 1.
- Produces: deployment Preview com os três requisitos efetivos.

- [ ] Corrigir somente targets/escopos necessários das variáveis existentes.
- [ ] Criar deployment Preview novo, sem reutilizar snapshot.
- [ ] Testar caso elegível e confirmar `provider: openai`.
- [ ] Testar casos determinísticos e confirmar `provider: commercial-state`.
- [ ] Provar timeout/falha como `provider: openai-fallback`.

### Task 3: Auditoria e verificação completa

**Files:**
- Verify: `api/atendimento.js`
- Verify: `lib/hybrid-openai.js`
- Verify: `tests/pd-019a-hybrid-routing.test.js`

**Interfaces:**
- Consumes: Preview aprovado.
- Produces: evidência de segurança e regressão.

- [ ] Executar todas as suítes, testes PD-019A, build, sintaxe e `git diff --check`.
- [ ] Auditar frontend, HTML, bundle, Git, logs e respostas contra segredos.
- [ ] Confirmar `store: false`, timeout e validação de telefone, preço e links.
- [ ] Confirmar telefone oficial `(91) 9 8448-7207` / `5591984487207`.

### Task 4: SOCI e Confiança Total

**Files:**
- Locate and preserve: registros SOCI vigentes.
- Create or supersede: `SOCI/Skills/CONFIANCA-TOTAL-OPERACIONAL.md`.

**Interfaces:**
- Consumes: decisão oficial confirmada por Hélio na PD-019.
- Produces: registro vigente e histórico preservado.

- [ ] Localizar a fonte documental vigente e índices aplicáveis.
- [ ] Preservar o documento anterior e registrar supersessão.
- [ ] Materializar os dez princípios e a frase institucional.
- [ ] Atualizar índices e registrar a decisão.

### Task 5: Publicação e validação de produção

**Files:**
- Commit: somente arquivos aprovados nas Tasks 2–4.

**Interfaces:**
- Consumes: Preview, testes e auditoria aprovados.
- Produces: `main`, `origin/main` e Production no mesmo commit.

- [ ] Revisar diff e garantir worktree limpo.
- [ ] Fazer push da branch e merge seguro em `main`.
- [ ] Publicar Production e aguardar `READY`.
- [ ] Validar domínio oficial, caso determinístico, elegível e fallback.
- [ ] Verificar logs sanitizados; executar rollback imediato se falhar.
- [ ] Registrar deployments, commit final, riscos e rollback.
