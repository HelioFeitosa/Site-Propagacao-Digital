const assert = require('node:assert/strict');
const { createConversationState, resolveLocalTurn } = require('../lib/commercial-guardrails');
const { extractDeterministicMemoryUpdates, applyMemoryUpdates } = require('../lib/conversation-memory');
const { buildCommercialHandoff } = require('../lib/commercial-handoff');

function apply(state, message, turn = 1) {
  return applyMemoryUpdates(state, extractDeterministicMemoryUpdates(message, { state }), message, { turn }).state;
}

let state = createConversationState();
let result = resolveLocalTurn('Marcos eu vendo pizza', state);
assert.equal(result.handled, true);
assert.match(result.reply, /Prazer, Marcos!/);
assert.doesNotMatch(result.reply, /registrado/i);
assert.ok((result.reply.match(/\?/g) || []).length <= 1);
Object.assign(state, result.statePatch);

result = resolveLocalTurn('quero vender no zap', state);
assert.equal(result.handled, true);
assert.equal(result.action, undefined);
assert.match(result.statePatch.salesChannels, /WhatsApp/i);
assert.doesNotMatch(result.reply, /98448|Propaga[cç][aã]o Digital.*WhatsApp/i);

result = resolveLocalTurn('eu não sei, não entendo isso! me ajude por favor!', state);
assert.match(result.reply, /Fica tranquilo, Marcos/i);
assert.match(result.reply, /explicar de forma simples/i);
assert.doesNotMatch(result.reply, /convers[aã]o|funil|landing page|tr[aá]fego|CTA|lead/i);

result = resolveLocalTurn('calma eu quero saber mais como isso funciona', state);
assert.match(result.reply, /Vamos por partes|forma simples/i);
assert.equal(result.action, undefined);

result = resolveLocalTurn('ok diz pra ele me ligar', state);
assert.equal(result.statePatch.callbackRequested, true);
assert.equal(result.statePatch.contactPreference, 'phone');
assert.match(result.reply, /preciso do n[uú]mero.*retorno/i);
assert.doesNotMatch(result.reply, /vai ligar|ligar[aá]/i);
assert.equal(result.action, undefined);

result = resolveLocalTurn('uma pessoa pode me atender agora?', state);
assert.equal(result.action.type, 'whatsapp');
assert.equal(result.statePatch.urgency, 'immediate');
assert.equal(result.statePatch.handoffCtaShown, true);
assert.match(result.reply, /continuar agora pelo WhatsApp/i);
assert.equal((result.reply.match(/5591984487207|98448-7207/g) || []).length, 0);

const afterCta = { ...state, ...result.statePatch };
result = resolveLocalTurn('quero continuar no zap', afterCta);
assert.equal(result.action, undefined);
assert.doesNotMatch(result.reply, /bot[aã]o.*abaixo|5591984487207|98448-7207/i);

state = apply(state, 'Marcos eu vendo pizza', 1);
state = { ...state, salesChannels: 'vender e receber pedidos pelo WhatsApp' };
state = apply(state, 'quero aumentar as vendas', 2);
Object.assign(state, {
  consultationDoubts: ['não entende como a solução funciona e pediu explicação simples'],
  visualRequests: ['imagem específica para pizzaria'],
  galleryRejectedForSegment: true,
  humanHandoffRequested: true,
  contactPreference: 'whatsapp',
  callbackRequested: true,
  urgency: 'immediate',
  visitorPhone: ''
});
const handoff = buildCommercialHandoff(state).message;
assert.match(handoff, /Nome: Marcos/);
assert.match(handoff, /Canal desejado: vender e receber pedidos pelo WhatsApp/i);
assert.match(handoff, /D[uú]vida: n[aã]o entende como a solu[cç][aã]o funciona/i);
assert.match(handoff, /Prefer[eê]ncia: continuar agora pelo WhatsApp/i);
assert.match(handoff, /Liga[cç][aã]o: solicitada inicialmente, mas telefone para retorno n[aã]o foi informado/i);
assert.match(handoff, /Pr[oó]ximo passo: atendimento humano para explicar a solu[cç][aã]o/i);

const withPhone = apply(state, 'Meu telefone é (91) 99999-1234', 3);
const phoneCallback = buildCommercialHandoff({ ...withPhone, callbackRequested: true, contactPreference: 'phone' }).message;
assert.match(phoneCallback, /Liga[cç][aã]o: solicitada para o telefone confirmado/i);

console.log('PD-019D humanized consultant contract tests passed.');
