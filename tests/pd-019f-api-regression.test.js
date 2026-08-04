const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY = 'test-only-not-real';
process.env.HELIO_OPENAI_ENABLED = 'true';

global.fetch = async () => ({
  ok: true, status: 200, headers: { get: () => 'req_pd019f' },
  json: async () => ({ output_text: JSON.stringify({
    reply: 'Vou continuar somente com os fatos informados por você.',
    intent: 'consultation', confidence: 0.9,
    memoryUpdates: [{ field: 'businessType', value: 'pizzaria', evidence: 'pizza', confidence: 0.99 }],
    questionAsked: null, recommendedAction: null, requestedAssetId: null, handoffRequested: false
  }) })
});

const handler = require('../api/atendimento');
function call(visitorId, lead, messages) {
  return new Promise((resolve) => handler({
    method: 'POST', headers: { 'x-forwarded-for': `10.23.0.${Date.now() % 220}` }, socket: {},
    body: { visitorId, lead, messages, page: 'Home', path: '/' }
  }, { setHeader() {}, end(value) { resolve(JSON.parse(value)); } }));
}

(async () => {
  let lead = { commercialVersion: 3 };
  const messages = [];
  const turns = [
    'Flavio trabalho com móveis planejados',
    'atendo casas, apartamentos e empresas',
    'vendo pelo zap e redes',
    'quero um site básico',
    'mostre uma imagem',
    'abra a galeria',
    'estou aguardando',
    'eu não vendo pizza',
    'qual é meu nome?',
    'com o que eu trabalho?',
    'meu WhatsApp é (91) 9 8713-7397',
    'qual é meu WhatsApp?',
    'me passe para o responsável'
  ];
  const results = [];
  for (const text of turns) {
    messages.push({ role: 'user', content: text });
    const result = await call('pd019f-flavio', lead, messages);
    results.push(result);
    lead = result.lead;
    if (result.action?.type === 'open_visual') lead.visualActionStatus = 'RENDERED';
    messages.push({ role: 'assistant', content: result.reply });
  }

  assert.equal(lead.customerName, 'Flavio');
  assert.equal(lead.businessType, 'móveis planejados');
  assert.equal(lead.visitorPhone, '(91) 9 8713-7397');
  assert.equal(results[4].action, null);
  assert.equal(results[4].lead.visualActionStatus, 'REQUESTED');
  assert.equal(results[5].action.type, 'open_visual');
  assert.equal(results[5].action.assetId, 'lume-modas-functional-demo');
  assert.equal(results[5].action.status, 'READY');
  assert.doesNotMatch(results[6].reply, /vou abrir|vou mostrar|quer que eu abra/i);
  assert.match(results[8].reply, /Flavio/);
  assert.match(results[9].reply, /móveis planejados/i);
  assert.match(results[11].reply, /\(91\) 9 8713-7397/);
  assert.equal(results[12].action.type, 'whatsapp');
  assert.equal(results[12].action.value, '5591984487207');
  assert.match(results[12].action.summary, /Fato rejeitado: pizza/i);
  assert.doesNotMatch(results.map((item) => item.reply).slice(7).join(' '), /pizzaria|produto.*pizza/i);
  assert.equal(results.filter((item) => item.action?.type === 'open_visual').length, 1);

  for (let turn = 0; turn < 30; turn += 1) {
    const query = turn % 2 ? 'qual é meu nome?' : 'com o que eu trabalho?';
    const result = await call('pd019f-flavio', lead, [{ role: 'user', content: query }]);
    lead = result.lead;
    assert.equal(lead.customerName, 'Flavio');
    assert.equal(lead.businessType, 'móveis planejados');
    assert.notEqual(result.action?.type, 'open_visual');
  }

  const isolated = await call('pd019f-other', { commercialVersion: 3 }, [{ role: 'user', content: 'qual é meu nome?' }]);
  assert.doesNotMatch(isolated.reply, /Flavio/);
  assert.equal(isolated.lead.customerName, '');

  console.log('PD-019F complete Flavio API and 30-turn regression passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
