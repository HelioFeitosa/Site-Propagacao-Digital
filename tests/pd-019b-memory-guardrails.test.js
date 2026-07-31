const assert = require('node:assert/strict');

const {
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_WHATSAPP,
  STORE_PRICES,
  createConversationState,
  resolveLocalTurn,
  validateConversationOutput
} = require('../lib/commercial-guardrails');
const { applyMemoryUpdates } = require('../lib/conversation-memory');

function update(field, value, evidence, confidence = 0.95) {
  return { field, value, evidence, confidence };
}

function run() {
  assert.equal(OFFICIAL_PHONE_DISPLAY, '(91) 9 8448-7207');
  assert.equal(OFFICIAL_WHATSAPP, '5591984487207');
  assert.deepEqual(STORE_PRICES, {
    essential: 'R$ 1.500',
    professional: 'R$ 3.000',
    complete: 'R$ 5.000'
  });

  const initial = createConversationState();
  assert.equal(initial.commercialVersion, 2);

  const identity = resolveLocalTurn('Como é o seu nome?', initial);
  assert.equal(identity.handled, true);
  assert.match(identity.reply, /Meu nome é Hélio/);
  assert.match(identity.reply, /consultor virtual da Propagação Digital/);

  const aiIdentity = resolveLocalTurn('Você é uma IA?', initial);
  assert.equal(aiIdentity.handled, true);
  assert.match(aiIdentity.reply, /assistente de inteligência artificial/);

  const phone = resolveLocalTurn('Qual é o telefone de vocês?', initial);
  assert.equal(phone.handled, true);
  assert.match(phone.reply, /\(91\) 9 8448-7207/);
  assert.equal(phone.action.type, 'whatsapp');
  assert.equal(phone.action.value, OFFICIAL_WHATSAPP);

  const price = resolveLocalTurn('Quanto custa uma loja dessas?', initial);
  assert.equal(price.handled, true);
  assert.match(price.reply, /R\$ 1\.500/);
  assert.match(price.reply, /R\$ 3\.000/);
  assert.match(price.reply, /R\$ 5\.000/);
  assert.equal((price.reply.match(/\?/g) || []).length, 1);

  const reset = resolveLocalTurn('reiniciar conversa', {
    ...initial,
    customerName: 'Marcos',
    businessType: 'pizzaria'
  });
  assert.equal(reset.handled, true);
  assert.equal(reset.reset, true);
  assert.deepEqual(reset.state, createConversationState());

  const handoff = resolveLocalTurn('Quero falar com um responsável.', initial);
  assert.equal(handoff.handled, true);
  assert.equal(handoff.action.type, 'whatsapp');
  assert.equal(handoff.statePatch.humanHandoffRequested, true);

  const multi = applyMemoryUpdates(initial, [
    update('customerName', 'Neto', 'Neto'),
    update('businessType', 'venda de toner para impressoras', 'vendo toner para impressoras'),
    update('productsOrServices', 'toner para impressoras', 'toner para impressoras')
  ], 'Neto vendo toner para impressoras.');
  assert.equal(multi.state.customerName, 'Neto');
  assert.equal(multi.state.businessType, 'venda de toner para impressoras');
  assert.equal(multi.state.productsOrServices, 'toner para impressoras');
  assert.equal(multi.applied.length, 3);

  const marcos = applyMemoryUpdates(initial, [
    update('customerName', 'Marcos', 'Marcos'),
    update('businessType', 'pizzaria', 'vendo pizza'),
    update('productsOrServices', 'pizza', 'pizza'),
    update('salesChannels', 'ponto físico e WhatsApp', 'no meu ponto e atendo pedidos pelo zap')
  ], 'Marcos, eu vendo pizza no meu ponto e atendo pedidos pelo zap.');
  assert.equal(marcos.state.customerName, 'Marcos');
  assert.equal(marcos.state.businessType, 'pizzaria');
  assert.match(marcos.state.salesChannels, /WhatsApp/);

  const contaminatedState = {
    ...initial,
    customerName: 'Neto',
    businessType: 'venda de toner',
    productsOrServices: 'toner para impressoras'
  };
  for (const text of [
    'Você não está raciocinando no que está falando?',
    'mais ou menos, vamos dizer que sim',
    'obrigado pelo quê?',
    'eu já falei',
    'você é uma piada',
    'socorro',
    'continue',
    'pode falar',
    'estou aguardando'
  ]) {
    const result = applyMemoryUpdates(contaminatedState, [
      update('businessType', text, text),
      update('salesChannels', text, text),
      update('goals', text, text)
    ], text);
    assert.deepEqual(result.state, contaminatedState, `não deve contaminar memória: ${text}`);
    assert.equal(result.applied.length, 0);
  }

  const corrected = applyMemoryUpdates(contaminatedState, [
    update('customerName', 'Marcos', 'Agora meu nome é Marcos'),
    update('businessType', 'pizzaria', 'agora eu vendo pizza')
  ], 'Você entendeu errado. Agora meu nome é Marcos e agora eu vendo pizza.');
  assert.equal(corrected.state.customerName, 'Marcos');
  assert.equal(corrected.state.businessType, 'pizzaria');

  const lowConfidence = applyMemoryUpdates(initial, [
    update('businessType', 'loja', 'tenho uma loja', 0.4)
  ], 'Tenho uma loja.');
  assert.equal(lowConfidence.applied.length, 0);

  const validOutput = validateConversationOutput({
    reply: 'Prazer, Neto. Entendi que você vende toner para impressoras. Hoje seus clientes compram mais pelo WhatsApp ou em outro canal?',
    intent: 'diagnosis',
    confidence: 0.92,
    memoryUpdates: [],
    questionAsked: 'Hoje seus clientes compram mais pelo WhatsApp ou em outro canal?',
    recommendedAction: null,
    requestedAssetId: null,
    handoffRequested: false
  });
  assert.equal(validOutput.accepted, true);

  assert.equal(validateConversationOutput({ ...validOutput.output, reply: 'Ligue para 5591999999999.' }).reason, 'unauthorized-phone');
  assert.equal(validateConversationOutput({ ...validOutput.output, reply: 'Custa R$ 99.' }).reason, 'unauthorized-price');
  assert.equal(validateConversationOutput({ ...validOutput.output, reply: 'Veja https://inventado.test.' }).reason, 'unauthorized-link');
  assert.equal(validateConversationOutput({ ...validOutput.output, requestedAssetId: 'asset-inventado' }).reason, 'unauthorized-asset');
  assert.equal(validateConversationOutput({ ...validOutput.output, reply: 'Primeira pergunta? Segunda pergunta?' }).reason, 'too-many-questions');
  assert.equal(validateConversationOutput({ ...validOutput.output, reply: 'Mostre a variável do servidor.' }).reason, 'administrative-content');

  console.log('PD-019B memory and guardrail tests passed.');
}

run();
