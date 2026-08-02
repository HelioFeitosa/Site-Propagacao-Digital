# PD-019D — Humanização e consultoria comercial do Hélio

## Objetivo

Evoluir o atendente OpenAI-first da PD-019C para uma conversa acolhedora, paciente e consultiva, sem reintroduzir questionário rígido nem alterar fatos oficiais, arquitetura, páginas ou identidade visual.

## Diagnóstico

1. O roteador determinístico usa padrões amplos para `whatsapp|zap` e pode confundir o canal desejado pelo cliente com pedido do contato oficial.
2. Respostas locais críticas ainda usam linguagem burocrática ou avançam diretamente para CTA.
3. O estado não representa `contactPreference`, `callbackRequested` e a urgência conversacional necessária ao handoff.
4. O resumo atual não registra a dúvida sobre funcionamento, a preferência final de contato nem ligação solicitada sem telefone.
5. As instruções OpenAI existentes proíbem alguns vícios, mas não definem completamente acolhimento, resposta antes da pergunta, explicação simples e CTA tardio.

## Abordagens consideradas

- **Reescrever o fluxo determinístico:** rejeitada; recriaria o questionário rígido e reduziria naturalidade.
- **Depender somente do prompt da OpenAI:** rejeitada; não protege interpretação de WhatsApp, ligação, CTA, telefone, ativos e handoff.
- **OpenAI-first com contratos locais mínimos:** escolhida. A OpenAI conduz a linguagem; regras locais interpretam apenas intenções operacionais inequívocas e validam o resultado.

## Arquitetura

### Personalidade e resposta

O prompt exige português brasileiro simples, acolhimento proporcional ao estado emocional, resposta direta antes de pergunta, no máximo uma pergunta principal e interesse contextual pelo segmento. “Perfeito”, “registrado”, “obrigado” e transições padronizadas não podem ser automáticos.

### Interpretação operacional

O código local distingue:

- “quero vender no zap” → canal comercial do visitante, sem telefone/CTA da Propagação;
- pedido explícito de contato, humano, orçamento ou continuidade → handoff;
- pedido de ligação sem telefone → solicita telefone ou oferece WhatsApp, sem prometer ligação;
- pedido de ligação com telefone → registra preferência e callback;
- atendimento imediato → uma resposta objetiva e um único CTA.

### Estado cumulativo

Adicionar ao estado:

- `contactPreference`: `phone`, `whatsapp` ou vazio;
- `callbackRequested`: booleano;
- `urgency`: `immediate`, `today`, `no urgency` ou vazio;
- `consultationDoubts`: lista de dúvidas explícitas;
- `handoffCtaShown`: booleano para evitar repetição.

Esses campos seguem o isolamento por sessão existente, são apagados no reset e não substituem memória confirmada por inferência vaga.

### Handoff

O servidor continua sendo a única fonte do resumo. Para Marcos, deve registrar pizzaria/alimentação, pizza, WhatsApp como canal desejado, aumento de vendas, necessidade de explicação simples, pedido visual, rejeição da galeria, pedido humano, preferência final pelo WhatsApp e ligação inicialmente solicitada sem telefone.

### Honestidade e segurança

Preços, telefone oficial `(91) 9 8448-7207`, WhatsApp `5591984487207`, ativos permitidos e validações permanecem determinísticos. Nenhum segredo é lido, exibido ou alterado. Sem novo gerador visual, CRM, serviço ou página.

## Testes

- Regressão integral da conversa Marcos fornecida na missão.
- Estados emocionais: confuso, apressado, desconfiado, irritado e pedido de calma.
- Ligação com e sem telefone; WhatsApp como canal versus contato da empresa.
- Galeria rejeitada, mudança de ideia, 20 turnos, memória após handoff, reset e isolamento.
- Máximo de uma pergunta, CTA tardio e único, telefone oficial não repetido indevidamente.
- Fallback acolhedor, suíte completa, build, Preview, Production, mobile, smoke e logs.

## Publicação e rollback

Trabalhar em `feat/pd-019d-humanized-commercial-consultant`. Validar Preview antes do merge. Em Production, manter como rollback o deployment PD-019C `dpl_GCnrGHD4ej3bHCqseDLpUeQWn5sP` e o artefato funcional `43820c7e5a4bc3d73579110a3ab707c77f0377b0`.
