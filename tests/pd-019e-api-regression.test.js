const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY = 'test-only-not-real';
process.env.HELIO_OPENAI_ENABLED = 'true';

let providerCall = 0;
global.fetch = async () => {
  providerCall += 1;
  if (providerCall === 2) {
    const error = new Error('timeout sanitized');
    error.name = 'AbortError';
    throw error;
  }
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'req_pd019e' },
    json: async () => ({ output_text: JSON.stringify({
      reply: 'Vou considerar o que você explicou e seguir de forma prática.',
      intent: 'consultation', confidence: 0.95, memoryUpdates: [],
      questionAsked: null, recommendedAction: 'gallery', requestedAssetId: null,
      handoffRequested: false
    }) })
  };
};

const handler = require('../api/atendimento');
function call(lead, messages) {
  return new Promise((resolve) => handler({
    method: 'POST', headers: { 'x-forwarded-for': `10.22.0.${Date.now() % 220}` }, socket: {},
    body: { visitorId: 'pd019e-silvio', lead, messages, page: 'Home', path: '/' }
  }, { setHeader() {}, end(value) { resolve(JSON.parse(value)); } }));
}

(async () => {
  let lead = { commercialVersion: 3 };
  const messages = [];
  const turns = [
    'Silvio tenho uma assistência técnica de refrigeradores e geladeiras',
    'quero receber mais pedidos e aparecer mais na região',
    'no momento eu só posso investir R$ 1.000 em publicidade. O que dá para fazer com isso?',
    'você sabe meu nome?',
    'você sabe o que eu faço?',
    'você anotou meu zap?',
    'me passe para o responsável'
  ];
  const results = [];
  for (const text of turns) {
    messages.push({ role: 'user', content: text });
    const result = await call(lead, messages);
    results.push(result);
    lead = result.lead;
    messages.push({ role: 'assistant', content: result.reply });
  }

  assert.equal(lead.customerName, 'Silvio');
  assert.equal(lead.businessType, 'assistência técnica de refrigeradores e geladeiras');
  assert.equal(lead.goals, 'receber mais pedidos e aparecer mais na região');
  assert.equal(lead.visitorBudget, 'R$ 1.000');
  assert.equal(results[1].provider, 'openai-fallback');
  assert.equal(results[2].provider, 'commercial-state');
  assert.match(results[2].reply, /R\$ 1\.000/);
  assert.match(results[3].reply, /Silvio/);
  assert.match(results[4].reply, /assistência técnica.*refrigeradores.*geladeiras/i);
  assert.match(results[5].reply, /não informou.*(telefone|WhatsApp|zap)/i);
  assert.equal(results.slice(0, 6).filter((item) => item.action?.type === 'gallery').length, 0);
  assert.ok(!results.slice(0, 6).some((item) => /Já tenho seu nome|Isso me ajuda a direcionar|Registrado|Atualizei os dados/i.test(item.reply)));
  assert.equal(results[6].action.type, 'whatsapp');
  assert.equal(results[6].action.value, '5591984487207');
  assert.match(results[6].action.summary, /Orçamento informado: R\$ 1\.000/);
  assert.match(results[6].action.summary, /Telefone do visitante: não informado/i);

  const failureLead = { ...lead, transientError: 'timeout' };
  const recovery = await call(failureLead, [...messages, { role: 'user', content: 'qual é o meu objetivo?' }]);
  assert.equal(recovery.provider, 'commercial-state');
  assert.match(recovery.reply, /receber mais pedidos e aparecer mais na região/i);
  assert.equal(recovery.lead.transientError, undefined);

  const twentyTurns = Array.from({ length: 20 }, (_, index) => index % 2
    ? 'qual é o meu objetivo?'
    : 'quanto eu disse que posso investir?');
  for (const text of twentyTurns) {
    const result = await call(lead, [{ role: 'user', content: text }]);
    lead = result.lead;
    assert.notEqual(result.action?.type, 'gallery');
    assert.doesNotMatch(result.reply, /garant.*(?:cliente|venda|ligação)/i);
  }

  console.log('PD-019E exact Silvio API and 20-turn recovery regression passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
