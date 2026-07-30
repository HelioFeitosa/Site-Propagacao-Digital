# PD-019A — Roteamento híbrido do atendente

Data da decisão: 2026-07-29
Estado: implementação local, desligada por padrão e ainda não autorizada para Preview ou produção.

## Decisão

O `commercial-state` permanece como única autoridade sobre identidade, estágio, serviço, preço, telefone, URLs, WhatsApp, CTA, handoff, imagens, ativos, memória estruturada, progressão e fatos oficiais.

A OpenAI pode produzir somente um texto candidato. Ela não recebe nem retorna o objeto de estado e não pode decidir ou modificar fatos comerciais.

## Feature flag

`HELIO_OPENAI_ENABLED` é lida exclusivamente no servidor:

- `true`: permite avaliar o roteamento híbrido;
- ausente, `false` ou qualquer outro valor: mantém a OpenAI desligada.

A flag não é enviada ao navegador. `legacyMode` não habilita o caminho híbrido.

## Elegibilidade

Todo resultado do fluxo comercial contém:

```json
{
  "aiAssistance": {
    "eligible": false,
    "purpose": null,
    "reason": "deterministic-response"
  }
}
```

As finalidades aceitas pelo cliente híbrido são:

- `intent-clarification`;
- `natural-rephrasing`;
- `free-text-continuation`.

Nesta primeira versão, somente o fallback conversacional livre após diagnóstico confirmado é elegível. Em caso de dúvida, a resposta permanece local.

Preço, telefone, WhatsApp, links, CTA, imagens, handoff, segurança e comandos administrativos são bloqueados antes da chamada.

## Contexto mínimo

O payload contém:

- no máximo seis mensagens, equivalentes a três trocas recentes;
- no máximo 500 caracteres por mensagem;
- primeiro nome confirmado;
- tipo de negócio ou interesse;
- indicação de que o diagnóstico foi decidido localmente;
- finalidade autorizada;
- instruções curtas de estilo e de não invenção.

Não são enviados SOCI, documentação, caminhos, logs, credenciais, detalhes de infraestrutura, histórico integral ou instruções administrativas. O payload mantém `store: false`.

## Timeout e fallback

O timeout do provedor é de **7000 ms**, implementado com `AbortController`. Timeout, erro HTTP, resposta vazia, resposta malformada ou conteúdo rejeitado preservam a resposta produzida localmente.

Providers internos:

- `commercial-state`: resposta determinística ou caminho híbrido desligado;
- `openai`: texto candidato aceito;
- `openai-fallback`: tentativa elegível rejeitada ou indisponível;
- `local-fallback`: fallback geral local.

O frontend não escolhe o provider.

## Validação do texto candidato

Antes da entrega, o texto:

- precisa ser uma string não vazia;
- é higienizado e limitado a 600 caracteres;
- rejeita URL ou link;
- rejeita telefone diferente de `5591984487207`;
- rejeita preço ou valor não autorizado;
- rejeita instruções técnicas, administrativas ou referências a credenciais;
- rejeita padrões claramente fora do escopo comercial;
- recebe a formatação normal do chat somente após aprovação.

Uma rejeição nunca altera o estado comercial.

## Erros sanitizados

As classificações internas permitidas são:

- `authentication-error`;
- `billing-or-quota-error`;
- `rate-limit-error`;
- `model-error`;
- `timeout`;
- `invalid-response`;
- `provider-unavailable`;
- `unknown-provider-error`.

Logs contêm somente a classificação e, quando válido, o `x-request-id`. Não são registrados chave, cabeçalho Authorization, payload, resposta bruta, dados pessoais ou mensagem detalhada do provedor.

## Riscos conhecidos

- A elegibilidade inicial é deliberadamente estreita e pode manter respostas locais em situações nas quais uma formulação natural seria útil.
- Validações por padrões são uma camada conservadora; não substituem a autoridade local nem permitem que texto do modelo controle ações.
- A configuração, disponibilidade do modelo e faturamento ainda não foram validados porque este passo proíbe chamadas reais.
- Antes de qualquer ativação, ainda são necessários Preview isolado, validação sanitizada da API e aprovação explícita para produção.
