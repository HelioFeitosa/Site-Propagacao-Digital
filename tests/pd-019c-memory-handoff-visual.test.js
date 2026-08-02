const assert = require('node:assert/strict');
const { createConversationState, resolveLocalTurn } = require('../lib/commercial-guardrails');
const { applyMemoryUpdates, extractDeterministicMemoryUpdates, buildFactualSummary } = require('../lib/conversation-memory');
const { buildCommercialHandoff } = require('../lib/commercial-handoff');

function apply(state, message, previousAssistant = '', turn = 1) {
  const updates = extractDeterministicMemoryUpdates(message, { previousAssistant, state });
  return applyMemoryUpdates(state, updates, message, { turn }).state;
}

function run() {
  let state = createConversationState();
  state = apply(state, 'Marcos', 'Como você gostaria que eu te chamasse?', 2);
  assert.equal(state.customerName, 'Marcos');
  assert.equal(state.memoryFacts.customerName.source, 'user-explicit');
  assert.equal(state.memoryFacts.customerName.turn, 2);

  state = apply(state, 'vendo pizza', 'Qual é o seu negócio?', 4);
  assert.equal(state.businessType, 'pizzaria');
  assert.equal(state.productsOrServices, 'pizza');
  state = apply(state, 'ponto físico e pedidos pelo WhatsApp', 'Como vende hoje?', 6);
  state = apply(state, 'quero vender mais', 'O que quer melhorar?', 8);
  assert.match(state.salesChannels, /ponto físico/i);
  assert.match(state.salesChannels, /WhatsApp/i);
  assert.equal(state.goals, 'aumentar as vendas');

  const beforeNoise = structuredClone(state);
  for (let turn = 9; turn <= 24; turn += 1) {
    state = apply(state, turn % 2 ? 'mais ou menos' : 'continue', '', turn);
  }
  assert.equal(state.customerName, beforeNoise.customerName);
  assert.equal(state.businessType, beforeNoise.businessType);
  assert.match(buildFactualSummary(state), /Marcos.*pizzaria.*pizza.*WhatsApp.*aumentar as vendas/i);

  const preservedBusiness = applyMemoryUpdates(state, [{ field: 'businessType', value: 'loja', evidence: 'vendo roupas', confidence: 0.99 }], 'Também vendo roupas.', { turn: 24 });
  assert.equal(preservedBusiness.state.businessType, 'pizzaria');
  const complementedProducts = applyMemoryUpdates(state, [{ field: 'productsOrServices', value: 'calzones', evidence: 'vendo calzones', confidence: 0.99 }], 'Também vendo calzones.', { turn: 24 });
  assert.match(complementedProducts.state.productsOrServices, /pizza; calzones/);

  const visual = resolveLocalTurn('mostre uma imagem para minha pizzaria', state);
  assert.equal(visual.handled, true);
  assert.equal(visual.statePatch.visualStatus, 'UNAVAILABLE');
  assert.equal(visual.action, undefined);
  assert.match(visual.reply, /não consigo criar e exibir.*personalizad/i);
  Object.assign(state, visual.statePatch);

  const rejected = resolveLocalTurn('essa galeria não tem pizza', state);
  assert.equal(rejected.statePatch.galleryRejectedForSegment, true);
  Object.assign(state, rejected.statePatch);
  const repeated = resolveLocalTurn('não quero a mesma galeria', state);
  assert.equal(repeated.action, undefined);
  assert.doesNotMatch(repeated.reply, /abrir.*galeria/i);

  state.humanHandoffRequested = true;
  const handoff = buildCommercialHandoff(state);
  assert.equal(handoff.number, '5591984487207');
  assert.match(handoff.message, /Nome: Marcos/);
  assert.match(handoff.message, /Negócio: Pizzaria \/ alimentação/);
  assert.match(handoff.message, /Produto: Pizza/);
  assert.match(handoff.message, /Telefone do visitante: não informado/);
  assert.match(handoff.message, /Contato iniciado pelo WhatsApp do próprio visitante/);
  assert.match(handoff.message, /não aceitou a galeria genérica/i);
  assert.ok(handoff.url.startsWith('https://wa.me/5591984487207?text='));

  const withPhone = apply(state, 'Meu telefone é (91) 99999-1234', '', 25);
  const phoneHandoff = buildCommercialHandoff(withPhone);
  assert.match(phoneHandoff.message, /Telefone do visitante: \(91\) 99999-1234/);
  assert.doesNotMatch(phoneHandoff.message, /próprio visitante/);

  state = apply(state, 'Agora meu nome é Marcelo', '', 26);
  assert.equal(state.customerName, 'Marcelo');
  const reset = resolveLocalTurn('reiniciar conversa', state);
  assert.equal(reset.state.customerName, '');
  assert.deepEqual(reset.state.memoryFacts, {});

  console.log('PD-019C cumulative memory, handoff and visual honesty tests passed.');
}

run();
