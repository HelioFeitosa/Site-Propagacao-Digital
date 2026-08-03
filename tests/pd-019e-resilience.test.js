const assert = require('node:assert/strict');
const {
  createConversationState,
  resolveLocalTurn,
  validateConversationOutput
} = require('../lib/commercial-guardrails');
const {
  applyMemoryUpdates,
  extractDeterministicMemoryUpdates
} = require('../lib/conversation-memory');
const { buildCommercialHandoff } = require('../lib/commercial-handoff');

function remember(state, message, turn = 1) {
  return applyMemoryUpdates(
    state,
    extractDeterministicMemoryUpdates(message, { state }),
    message,
    { turn }
  ).state;
}

let state = createConversationState();
state = remember(state, 'Silvio tenho uma assistência técnica de refrigeradores e geladeiras', 1);
state = remember(state, 'quero receber mais pedidos e aparecer mais na região', 2);
state = remember(state, 'no momento eu só posso investir R$ 1.000 em publicidade. O que dá para fazer com isso?', 3);

assert.equal(state.customerName, 'Silvio');
assert.equal(state.businessType, 'assistência técnica de refrigeradores e geladeiras');
assert.equal(state.productsOrServices, 'conserto de refrigeradores e geladeiras');
assert.equal(state.goals, 'receber mais pedidos e aparecer mais na região');
assert.equal(state.visitorBudget, 'R$ 1.000');
assert.equal(state.officialPrice, '');
assert.equal(state.quotedThirdPartyAmount, '');

for (const [message, expected] of [
  ['meu orçamento é 800 reais', 'R$ 800'],
  ['tenho até 2 mil para divulgação', 'R$ 2.000'],
  ['posso investir R$ 1.000,00', 'R$ 1.000,00'],
  ['posso investir 1.000 reais', 'R$ 1.000'],
  ['posso investir 1.000,50 reais', 'R$ 1.000,50']
]) {
  const parsed = remember(createConversationState(), message);
  assert.equal(parsed.visitorBudget, expected, message);
}

let local = resolveLocalTurn('Quanto eu disse que posso investir?', state);
assert.equal(local.handled, true);
assert.match(local.reply, /R\$ 1\.000/);
assert.equal(local.action, undefined);

local = resolveLocalTurn('no momento eu só posso investir R$ 1.000 em publicidade. O que dá para fazer com isso?', state);
assert.equal(local.handled, true);
assert.match(local.reply, /concentrar.*ação local e simples/i);
assert.match(local.reply, /somente para os anúncios.*página e dos materiais/is);
assert.doesNotMatch(local.reply, /garant|clientes por mês|ligações|vendas garantidas/i);
assert.equal(local.action, undefined);

const allowedBudget = validateConversationOutput({
  reply: 'Com R$ 1.000, é melhor concentrar o orçamento em uma ação local.',
  intent: 'budget-consultation', confidence: 0.9, memoryUpdates: [],
  questionAsked: null, recommendedAction: null, requestedAssetId: null,
  handoffRequested: false
}, state);
assert.equal(allowedBudget.accepted, true);

const inventedPrice = validateConversationOutput({
  reply: 'Nosso serviço custa R$ 999.',
  intent: 'pricing', confidence: 0.9, memoryUpdates: [],
  questionAsked: null, recommendedAction: null, requestedAssetId: null,
  handoffRequested: false
}, state);
assert.equal(inventedPrice.reason, 'unauthorized-price');

const quotedThirdParty = validateConversationOutput({
  reply: 'A cotação externa que você informou foi R$ 700.',
  intent: 'third-party-quote', confidence: 0.9, memoryUpdates: [],
  questionAsked: null, recommendedAction: null, requestedAssetId: null,
  handoffRequested: false
}, { ...state, quotedThirdPartyAmount: 'R$ 700' });
assert.equal(quotedThirdParty.accepted, true);

const noVisualIntent = resolveLocalTurn('qual é o próximo passo?', state);
assert.notEqual(noVisualIntent.action?.type, 'gallery');
const gallery = resolveLocalTurn('quero ver trabalhos', state);
assert.equal(gallery.action.type, 'gallery');
const repeatedGallery = resolveLocalTurn('mostre a galeria', { ...state, galleryCtaShown: true });
assert.equal(repeatedGallery.action, undefined);

const handoff = buildCommercialHandoff({ ...state, humanHandoffRequested: true }).message;
assert.match(handoff, /Nome: Silvio/);
assert.match(handoff, /Negócio: Assistência técnica de refrigeradores e geladeiras/i);
assert.match(handoff, /Objetivo: receber mais pedidos e aparecer mais na região/i);
assert.match(handoff, /Interesse: publicidade e presença local/i);
assert.match(handoff, /Orçamento informado: R\$ 1\.000/i);
assert.match(handoff, /Dúvida principal: o que pode ser feito com esse valor/i);
assert.match(handoff, /Telefone do visitante: não informado/i);
assert.match(handoff, /Próximo passo: responsável avaliar uma estratégia compatível com o orçamento/i);

console.log('PD-019E monetary context and resilience contract tests passed.');
