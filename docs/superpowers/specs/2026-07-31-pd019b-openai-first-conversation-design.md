# PD-019B — OpenAI como Centro Conversacional — Design

**Data:** 2026-07-31  
**Decisão:** aprovada expressamente por Hélio Feitosa na missão PD-019B  
**Objetivo:** substituir o questionário rígido por uma conversa OpenAI-first, mantendo fatos, ações e segurança sob autoridade local.

## Diagnóstico e causa-raiz

O frontend envia `lead` e as últimas mensagens para `POST /api/atendimento`. No servidor, todo atendimento normal entra no ramo `commercialVersion: 1`, chama `advanceCommercialConversation()` e recebe imediatamente estado e texto produzidos pelo fluxo sequencial. A OpenAI só é chamada quando esse fluxo marca `aiAssistance.eligible`, hoje limitado principalmente ao fallback após diagnóstico confirmado.

O questionário grava texto livre diretamente em campos conforme o próximo campo vazio. Por isso “mais ou menos” vira negócio e uma crítica pode virar canal. O frontend contém uma segunda heurística, `updateLeadLocally()`, acionada pelo fallback, que também pode gravar texto livre como memória comercial. A duplicação cria dois controladores imperfeitos e explica repetições, perda de contexto e resumos absurdos.

## Alternativas consideradas

1. **OpenAI-first estruturada com guardrails locais — escolhida.** Uma única chamada interpreta, responde e propõe atualizações estruturadas; o servidor valida cada campo, substitui fatos oficiais e executa somente ações permitidas.
2. **Extrator semântico local mais OpenAI textual.** Reduz dependência do modelo para memória, mas mantém duas interpretações concorrentes e exige reconstruir linguagem natural com regras frágeis.
3. **Agente com ferramentas e múltiplas chamadas.** Permite planejamento mais amplo, porém aumenta custo, latência e superfície de falha sem necessidade para o escopo atual.

## Arquitetura-alvo

```text
Frontend
  → API /api/atendimento
    → reset/fatos/ações determinísticas prioritárias
    → contrato seguro de contexto
    → OpenAI Responses API com Structured Outputs
    → validação da resposta e das atualizações de memória
    → aplicação local de fatos, assetId, CTA e handoff
    → resposta ao frontend
    → fallback contextual sem mutação de memória
```

O antigo `commercial-conversation.js` deixa de decidir a ordem dos turnos. Suas regras úteis de fatos e ações são migradas ou reutilizadas como guardrails. `commercial-state` deixa de ser o provider conversacional padrão; respostas OpenAI válidas usam `openai`, fatos locais usam `commercial-state` e falhas elegíveis usam `openai-fallback`.

## Componentes

### `lib/openai-conversation.js`

Responsável por:

- montar contexto mínimo e seguro;
- definir identidade do Hélio e fatos oficiais;
- solicitar Structured Outputs com `text.format.type = json_schema`;
- extrair e validar JSON;
- classificar falhas sem registrar conteúdo bruto;
- preservar `store: false` e timeout de 7 segundos.

### `lib/conversation-memory.js`

Responsável por validar e aplicar atualizações propostas pelo modelo. Campos aceitos: nome, negócio, segmento, produtos/serviços, canais, objetivo, dores, preferências e handoff. Toda atualização exige evidência textual explícita, confiança mínima e compatibilidade do campo.

Mensagens sociais, críticas, respostas vagas, correções sem novo valor, comandos técnicos e conteúdo citado não são evidência. Correções explícitas podem substituir valores anteriores e registram somente o novo dado validado.

### `lib/commercial-guardrails.js`

Responsável por fatos e ações oficiais:

- identidade do Hélio;
- telefone e WhatsApp;
- preços oficiais de loja virtual;
- catálogo de assets permitido;
- URLs e CTAs autorizados;
- handoff;
- reset;
- bloqueio administrativo;
- validação final de texto e ações.

### `api/atendimento.js`

Orquestra o fluxo. Intercepta somente reset e fatos/ações que precisam de resposta local exata. Para os demais turnos chama a conversa estruturada, valida a saída, aplica memória e retorna ações autorizadas. Se a OpenAI falhar, mantém o estado intacto e usa fallback contextual curto.

### `atendimento.js`

Deixa de inferir memória no fallback. Apenas mantém a sessão, renderiza resposta, aplica `lead` validado vindo do servidor e executa ações retornadas que correspondam ao catálogo local.

## Contrato estruturado

```json
{
  "reply": "texto curto em português",
  "intent": "diagnosis",
  "confidence": 0.92,
  "memoryUpdates": [
    {
      "field": "customerName",
      "value": "Neto",
      "confidence": 0.99,
      "evidence": "Neto vendo toner para impressoras"
    }
  ],
  "questionAsked": "Por quais canais você vende atualmente?",
  "recommendedAction": null,
  "requestedAssetId": null,
  "handoffRequested": false
}
```

O schema usa propriedades obrigatórias e `additionalProperties: false`. `memoryUpdates` é uma lista para permitir múltiplos fatos na mesma frase. Evidência é validada como trecho normalizado da mensagem atual; não é persistida nem retornada ao frontend.

## Contexto enviado

- identidade fixa do assistente;
- resumo curto gerado localmente a partir do estado validado;
- dados conhecidos validados;
- no máximo dez mensagens recentes, limitadas por tamanho;
- fatos comerciais oficiais necessários;
- IDs de assets disponíveis, sem caminhos internos;
- ações permitidas;
- mensagem atual.

Não são enviados segredos, variáveis, logs, caminhos locais, SOCI, prompt administrativo, histórico integral ou dados desnecessários.

## Regras conversacionais

- Responder perguntas diretas antes de avançar o diagnóstico.
- Extrair múltiplos fatos em qualquer ordem.
- Fazer no máximo uma pergunta principal.
- Não resumir automaticamente após cada turno.
- Reconhecer crítica, ironia, confusão e contestação sem gravá-las como fatos comerciais.
- Admitir erro e retomar o último estado validado.
- Identificar-se sempre como Hélio, consultor virtual e assistente de IA da Propagação Digital.
- Nunca prometer abrir galeria, WhatsApp ou asset sem retornar ação local válida.

## Reset

As frases autorizadas de reset são tratadas antes da OpenAI. O servidor retorna estado vazio com nova versão conversacional, marca `reset: true` e não salva memória. O frontend substitui, em vez de mesclar, o estado e limpa mensagens temporárias.

## Fatos determinísticos

Perguntas sobre telefone, WhatsApp, preços, serviços oficiais, identidade e handoff recebem fatos do servidor. A OpenAI pode formular explicações somente quando os valores oficiais já estiverem presentes no contexto; a validação rejeita qualquer valor diferente.

Preços oficiais de loja virtual:

- Nosso Essencial: R$ 1.500;
- Nosso Profissional: R$ 3.000;
- Nosso Completo: R$ 5.000.

Telefone oficial: `(91) 9 8448-7207`. WhatsApp: `5591984487207`.

## Fallback

Falhas de autenticação, faturamento, rate limit, modelo, timeout, JSON inválido, resposta vazia ou validação produzem `openai-fallback`. O texto é curto, contextual e não reinicia o questionário. O estado permanece idêntico. Telefone, preços, galeria e handoff continuam disponíveis localmente.

## Testes

- Regressões completas Neto e Marcos com respostas estruturadas simuladas.
- Extração múltipla, correções, identidade, memória e reset.
- Perguntas diretas e preços oficiais.
- Contaminação por crítica, insulto, respostas vagas e comandos.
- Timeout, vazio, JSON inválido e falhas HTTP.
- Rejeição de preço, telefone, link, asset e ação inventados.
- Dez ou mais turnos, ausência de loops e uma pergunta principal.
- Preview real com conversa longa e Production com smoke tests.

## Segurança e rollback

Chave somente no servidor, `store: false`, contexto limitado, logs apenas com classificação e request ID validado. O commit de produção anterior `0cc53b9edf98abe4cde2f7f9bbbe86809e961a59` permanece como rollback. Qualquer falha de Production restaura esse estado antes da entrega.
