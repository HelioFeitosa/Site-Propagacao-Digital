# PD-016 — Humanização Comercial do Atendente V1.0

## Objetivo

Introduzir uma jornada consultiva determinística antes das recomendações comerciais, preservando a Home, o PD-015, preços, integrações e proteções existentes.

## Arquitetura da alteração

- Criar um módulo puro de estado comercial, sem dependência de API ou navegador.
- Ativar a nova jornada somente para conversas marcadas com `commercialVersion: 1`.
- Manter o atendimento legado como compatibilidade para conversas e testes antigos.
- Fazer a API consultar o estado comercial antes de chamar qualquer provedor de IA.
- Manter o estado da nova jornada apenas na conversa armazenada em `sessionStorage`.
- Liberar modelo visual e WhatsApp somente depois dos respectivos sinais explícitos.

## Implementação

1. Criar testes vermelhos cobrindo os 15 cenários obrigatórios.
2. Implementar inicialização, extração e transições do estado.
3. Integrar o módulo ao endpoint sem alterar Safe Mode, Safe State, memória persistente ou integrações.
4. Atualizar saudação e estado inicial do cliente.
5. Condicionar ações visuais e WhatsApp aos novos estados.
6. Ajustar fallback local para respeitar a ordem consultiva.
7. Rodar testes legados, novos testes e regressão visual PD-015.
8. Validar em navegador nos tamanhos 390×844 e 1366×768 e registrar capturas.
9. Revisar diff e criar commits locais, sem push, merge ou deploy.

## Arquivos previstos

- `lib/commercial-conversation.js` (novo)
- `tests/pd-016-commercial-humanization.test.js` (novo)
- `tests/pd-016-browser-regression.test.js` (novo)
- `api/atendimento.js`
- `atendimento.js`
- `package.json`

## Critérios de parada

- Todos os testes passam.
- Nenhuma regressão do PD-015.
- Nenhum deploy, push ou merge.
- Entrega do parecer para aprovação de Hélio.
