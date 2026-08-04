const assert = require('node:assert/strict');
const { createConversationState, resolveLocalTurn } = require('../lib/commercial-guardrails');
const {
  applyMemoryUpdates,
  extractDeterministicMemoryUpdates,
  normalizeBrazilianVisitorPhone
} = require('../lib/conversation-memory');
const { buildCommercialHandoff } = require('../lib/commercial-handoff');

function remember(state, message, turn) {
  const updates = extractDeterministicMemoryUpdates(message, { state });
  return applyMemoryUpdates(state, updates, message, { turn }).state;
}

let state = createConversationState();
state = remember(state, 'Flavio trabalho com móveis planejados', 1);
state = remember(state, 'atendo casas, apartamentos e empresas', 2);
state = remember(state, 'vendo pelo zap e redes', 3);
state = remember(state, 'quero um site básico para apresentar projetos e receber orçamentos', 4);

assert.equal(state.canonicalMemory.name.value, 'Flavio');
assert.equal(state.canonicalMemory.business.value, 'móveis planejados');
assert.equal(state.canonicalMemory.products.value, 'móveis planejados');
assert.equal(state.canonicalMemory.customerTypes.value, 'casas, apartamentos e empresas');
assert.equal(state.canonicalMemory.channels.value, 'WhatsApp e redes sociais');
assert.equal(state.canonicalMemory.goal.value, 'site básico para apresentar projetos e receber orçamentos');
assert.equal(state.canonicalMemory.business.source, 'user-explicit');
assert.equal(state.canonicalMemory.business.turn, 1);
assert.equal(state.canonicalMemory.business.confidence, 1);

const contaminated = applyMemoryUpdates(state, [{
  field: 'businessType', value: 'pizzaria', evidence: 'pizza', confidence: 0.99
}], 'estou aguardando', { turn: 8 }).state;
assert.equal(contaminated.canonicalMemory.business.value, 'móveis planejados');
assert.equal(contaminated.canonicalMemory.products.value, 'móveis planejados');

state = { ...state, businessType: 'pizzaria', productsOrServices: 'pizza' };
state = remember(state, 'eu não vendo pizza', 8);
assert.equal(state.businessType, 'móveis planejados');
assert.equal(state.productsOrServices, 'móveis planejados');
assert.ok(state.rejectedFacts.some((fact) => fact.value === 'pizza' && fact.reason === 'explicitly-denied-by-user'));

for (const [input, display, e164] of [
  ['meu WhatsApp é (91) 9 8713-7397', '(91) 9 8713-7397', '5591987137397'],
  ['meu telefone é 91 98713-7397', '(91) 9 8713-7397', '5591987137397'],
  ['meu zap é 91987137397', '(91) 9 8713-7397', '5591987137397'],
  ['meu celular é +55 91 98713-7397', '(91) 9 8713-7397', '5591987137397']
]) {
  const phone = normalizeBrazilianVisitorPhone(input);
  assert.deepEqual(phone && { display: phone.display, e164: phone.e164 }, { display, e164 });
}
assert.equal(normalizeBrazilianVisitorPhone('meu telefone é 1234'), null);
assert.equal(normalizeBrazilianVisitorPhone('o WhatsApp da empresa é 5591984487207'), null);

state = remember(state, 'meu WhatsApp é (91) 9 8713-7397', 11);
assert.equal(state.visitorPhone, '(91) 9 8713-7397');
assert.equal(state.canonicalMemory.visitorPhone.value.e164, '5591987137397');
let memoryReply = resolveLocalTurn('qual é meu WhatsApp?', state);
assert.match(memoryReply.reply, /\(91\) 9 8713-7397/);

const handoff = buildCommercialHandoff({
  ...state,
  visualRequests: ['exemplo de site'],
  visualActionStatus: 'RENDERED',
  humanHandoffRequested: true,
  contactPreference: 'whatsapp'
}).message;
assert.match(handoff, /Nome: Flavio/);
assert.match(handoff, /Negócio: Móveis planejados/i);
assert.match(handoff, /Clientes: casas, apartamentos e empresas/i);
assert.match(handoff, /Canais: WhatsApp e redes sociais/i);
assert.match(handoff, /Pedido visual: solicitou exemplo de site/i);
assert.match(handoff, /Galeria: aceitou visualizar modelo geral/i);
assert.match(handoff, /Telefone do visitante: \(91\) 9 8713-7397/i);
assert.match(handoff, /Fato rejeitado: pizza — informação incorreta, não usar/i);
assert.doesNotMatch(handoff, /Produto: Pizza|Negócio: Pizzaria/i);

console.log('PD-019F canonical memory, rejection and phone tests passed.');
