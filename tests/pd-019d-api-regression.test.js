const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY = 'test-only-not-real';
process.env.HELIO_OPENAI_ENABLED = 'true';

global.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  const current = body.input.at(-1)?.content || '';
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'req_pd019d' },
    json: async () => ({ output_text: JSON.stringify({
      reply: /quero$/i.test(current)
        ? 'Posso pensar junto com você. Hoje seus pedidos chegam mais pelo ponto físico ou pelo WhatsApp?'
        : 'Vou responder de forma simples e seguir no seu ritmo. O que você gostaria de entender primeiro?',
      intent: 'consultation', confidence: 0.95, memoryUpdates: [],
      questionAsked: 'O que você gostaria de entender primeiro?',
      recommendedAction: null, requestedAssetId: null, handoffRequested: false
    }) })
  };
};

const handler = require('../api/atendimento');
function call(visitorId, lead, messages) {
  return new Promise((resolve) => handler({
    method: 'POST', headers: { 'x-forwarded-for': `10.21.0.${Date.now() % 220}` }, socket: {},
    body: { visitorId, lead, messages, page: 'Home', path: '/' }
  }, { setHeader() {}, end(value) { resolve(JSON.parse(value)); } }));
}

(async () => {
  let lead = { commercialVersion: 3 };
  const messages = [];
  const turns = [
    'Marcos eu vendo pizza',
    'quero',
    'quero vender no zap',
    'calma eu quero saber mais como isso funciona',
    'tem uma imagem pra me mostrar?',
    'ok diz pra ele me ligar',
    'já é quinta vez que você mostra esse botão de galeria',
    'eu quero atendimento humano',
    'uma pessoa pode me atender agora?',
    'quero continuar no zap'
  ];
  const results = [];
  for (const text of turns) {
    messages.push({ role: 'user', content: text });
    const response = await call('pd019d-marcos', lead, messages);
    results.push(response);
    lead = response.lead;
    messages.push({ role: 'assistant', content: response.reply });
  }

  assert.match(results[0].reply, /Prazer, Marcos!/);
  assert.doesNotMatch(results[0].reply, /registrado/i);
  assert.equal(results[2].action, null);
  assert.match(lead.salesChannels, /WhatsApp/i);
  assert.doesNotMatch(results.slice(0, 7).map((r) => r.reply).join(' '), /98448-7207|5591984487207/);
  assert.match(results[3].reply, /Imagine uma página/i);
  assert.equal(results[4].action, null);
  assert.equal(lead.visualStatus, 'UNAVAILABLE');
  assert.equal(lead.galleryRejectedForSegment, true);
  assert.match(results[5].reply, /preciso do número.*retorno/i);
  assert.equal(lead.callbackRequested, true);
  assert.equal(lead.visitorPhone, '');
  assert.equal(results.filter((r) => r.action?.type === 'whatsapp').length, 1);
  assert.equal(lead.contactPreference, 'whatsapp');
  assert.equal(lead.urgency, 'immediate');
  assert.ok(results.every((r) => (r.reply.match(/\?/g) || []).length <= 1));

  const summary = results.find((r) => r.action?.summary)?.action.summary || '';
  assert.match(summary, /Nome: Marcos/);
  assert.match(summary, /Produto: Pizza/);
  assert.match(summary, /Canal desejado: vender e receber pedidos pelo WhatsApp/i);
  assert.match(summary, /Dúvida: não entende como a solução funciona/i);
  assert.match(summary, /Pedido|Solicitações: pediu imagem específica para pizzaria/i);
  assert.match(summary, /Galeria|Objeção: não aceitou a galeria genérica/i);
  assert.match(summary, /Preferência: continuar agora pelo WhatsApp/i);
  assert.match(summary, /Ligação: solicitada inicialmente, mas telefone para retorno não foi informado/i);

  const isolated = await call('pd019d-other-session', { commercialVersion: 3 }, [{ role: 'user', content: 'qual é o meu nome?' }]);
  assert.doesNotMatch(isolated.reply, /Marcos/);
  assert.equal(isolated.lead.customerName, '');

  console.log('PD-019D complete humanized API regression passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
