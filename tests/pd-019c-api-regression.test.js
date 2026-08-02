const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY = 'test-only-not-real';
process.env.HELIO_OPENAI_ENABLED = 'true';

global.fetch = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => 'req_pd019c' },
  json: async () => ({ output_text: JSON.stringify({
    reply: 'Vou continuar usando os dados confirmados. Qual é o próximo ponto que você quer resolver?',
    intent: 'diagnosis', confidence: 0.9, memoryUpdates: [],
    questionAsked: 'Qual é o próximo ponto que você quer resolver?',
    recommendedAction: null, requestedAssetId: null, handoffRequested: false
  }) })
});
const handler = require('../api/atendimento');

function call(lead, messages) {
  return new Promise((resolve) => handler({
    method: 'POST', headers: { 'x-forwarded-for': `10.20.0.${Date.now() % 220}` }, socket: {},
    body: { visitorId: 'pd019c-marcos-session', lead, messages, page: 'Home', path: '/' }
  }, { setHeader() {}, end(value) { resolve(JSON.parse(value)); } }));
}

(async () => {
  let lead = { commercialVersion: 3 };
  const messages = [{ role: 'assistant', content: 'Como você gostaria que eu te chamasse?' }];
  const turns = [
    'Marcos', 'vendo pizza', 'não entendo, me ajude',
    'ponto físico e pedidos pelo WhatsApp', 'quero vender mais',
    'mostre uma imagem', 'essa galeria não tem pizza', 'crie um infográfico',
    'não quero a mesma galeria', 'me passe para o responsável',
    'qual é o meu nome?', 'o que eu vendo?'
  ];
  let handoff;
  const replies = [];
  for (const text of turns) {
    messages.push({ role: 'user', content: text });
    const result = await call(lead, messages);
    lead = result.lead;
    replies.push(result.reply);
    messages.push({ role: 'assistant', content: result.reply });
    if (result.action?.type === 'whatsapp') handoff = result.action;
  }
  assert.equal(lead.customerName, 'Marcos');
  assert.equal(lead.businessType, 'pizzaria');
  assert.equal(lead.productsOrServices, 'pizza');
  assert.equal(lead.salesChannels, 'ponto físico e pedidos pelo WhatsApp');
  assert.equal(lead.goals, 'aumentar as vendas');
  assert.equal(lead.galleryRejectedForSegment, true);
  assert.match(replies[5], /não consigo criar e exibir/i);
  assert.doesNotMatch(replies[8], /abrir.*galeria/i);
  assert.match(replies[10], /Marcos/);
  assert.match(replies[11], /pizza/);
  assert.equal(handoff.value, '5591984487207');
  assert.ok(handoff.url.startsWith('https://wa.me/5591984487207?text='));
  const decoded = decodeURIComponent(handoff.url.split('?text=')[1]);
  assert.match(decoded, /Nome: Marcos/);
  assert.match(decoded, /Objetivo: aumentar as vendas/);
  assert.match(decoded, /Telefone do visitante: não informado/);

  const preserved = { ...lead };
  global.fetch = async () => { const error = new Error('timeout sanitized'); error.name = 'AbortError'; throw error; };
  const fallback = await call(lead, [...messages, { role: 'user', content: 'continue' }]);
  assert.equal(fallback.provider, 'openai-fallback');
  assert.equal(fallback.lead.customerName, preserved.customerName);
  assert.equal(fallback.lead.businessType, preserved.businessType);
  assert.equal(fallback.lead.goals, preserved.goals);
  console.log('PD-019C complete Marcos API regression passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
