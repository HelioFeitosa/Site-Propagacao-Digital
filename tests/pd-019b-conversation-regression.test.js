const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY = 'test-only-not-real';
process.env.HELIO_OPENAI_ENABLED = 'true';
process.env.OPENAI_MODEL = 'test-model';

let nextOutput;
global.fetch = async () => ({ ok: true, status: 200, headers: { get: () => 'req_regression' }, json: async () => ({ output_text: JSON.stringify(nextOutput) }) });
const handler = require('../api/atendimento');

function output(reply, updates = [], extras = {}) {
  return { reply, intent: 'diagnosis', confidence: 0.95, memoryUpdates: updates, questionAsked: reply.includes('?') ? reply.slice(reply.lastIndexOf('.') + 1).trim() : null, recommendedAction: null, requestedAssetId: null, handoffRequested: false, ...extras };
}
function update(field, value, evidence) { return { field, value, evidence, confidence: 0.96 }; }
function call(lead, messages) {
  return new Promise((resolve) => handler({ method: 'POST', headers: { 'x-forwarded-for': `10.19.0.${Math.floor(Math.random() * 200)}` }, socket: {}, body: { visitorId: 'pd019bregression01', lead, messages, page: 'Home', path: '/' } }, { setHeader() {}, end(value) { resolve(JSON.parse(value)); } }));
}

async function runScenario(name, turns) {
  let lead = { commercialVersion: 2 }; const messages = [];
  for (const turn of turns) {
    messages.push({ role: 'user', content: turn.user }); nextOutput = turn.model;
    const result = await call(lead, messages); turn.assert?.(result); lead = result.lead;
    messages.push({ role: 'assistant', content: result.reply });
    assert.ok((result.reply.match(/\?/g) || []).length <= 1, `${name}: mais de uma pergunta`);
  }
  return lead;
}

(async () => {
  const neto = await runScenario('Neto', [
    { user: 'Neto vendo toner para impressoras.', model: output('Prazer, Neto. Hoje seus clientes compram mais por qual canal?', [update('customerName', 'Neto', 'Neto'), update('businessType', 'venda de toner para impressoras', 'vendo toner para impressoras'), update('productsOrServices', 'toner para impressoras', 'toner para impressoras')]), assert: (r) => { assert.equal(r.provider, 'openai'); assert.equal(r.lead.customerName, 'Neto'); } },
    { user: 'Você não está raciocinando no que está falando?', model: output('Você tem razão em questionar. Seu nome é Neto e você vende toner para impressoras. Vou continuar a partir disso.'), assert: (r) => assert.equal(r.lead.businessType, 'venda de toner para impressoras') },
    { user: 'Qual é meu nome?', model: output('IGNORADO'), assert: (r) => { assert.equal(r.provider, 'commercial-state'); assert.match(r.reply, /Neto/); } },
    { user: 'O que eu vendo?', model: output('IGNORADO'), assert: (r) => assert.match(r.reply, /toner/) },
    { user: 'Como é o seu nome?', model: output('IGNORADO'), assert: (r) => assert.match(r.reply, /Meu nome é Hélio/) },
    { user: 'Você é uma IA?', model: output('IGNORADO'), assert: (r) => assert.match(r.reply, /inteligência artificial/) },
    { user: 'Quanto custa uma loja dessas?', model: output('IGNORADO'), assert: (r) => assert.match(r.reply, /R\$ 1\.500.*R\$ 3\.000.*R\$ 5\.000/) },
    { user: 'Qual é o próximo passo?', model: output('O próximo passo é entender seu canal atual para recomendar a solução adequada. Hoje você vende por onde?') },
    { user: 'Pelo WhatsApp.', model: output('Entendi. Seu canal atual é o WhatsApp. O que você quer melhorar primeiro?', [update('salesChannels', 'WhatsApp', 'WhatsApp')]) },
    { user: 'Quero vender mais.', model: output('Certo. Vou considerar seu objetivo de vender mais e seguir desse ponto.', [update('goals', 'vender mais', 'Quero vender mais')]) }
  ]);
  assert.equal(neto.customerName, 'Neto'); assert.equal(neto.productsOrServices, 'toner para impressoras'); assert.equal(neto.goals, 'vender mais');

  const marcos = await runScenario('Marcos', [
    { user: 'Marcos, eu vendo pizza no meu ponto e atendo pedidos pelo zap.', model: output('Entendi, Marcos. Você vende no ponto físico e pelo WhatsApp. O que quer melhorar agora?', [update('customerName', 'Marcos', 'Marcos'), update('businessType', 'pizzaria', 'vendo pizza'), update('productsOrServices', 'pizza', 'pizza'), update('salesChannels', 'ponto físico e WhatsApp', 'no meu ponto e atendo pedidos pelo zap')]) },
    { user: 'Quero vender mais.', model: output('Vamos focar em aumentar seus pedidos. Hoje o maior desafio é atrair clientes ou fazê-los voltar?', [update('goals', 'vender mais', 'Quero vender mais')]) },
    { user: 'mais ou menos, vamos dizer que sim', model: output('Entendi a incerteza. Posso esclarecer a pergunta de outro jeito?'), assert: (r) => assert.equal(r.lead.businessType, 'pizzaria') },
    { user: 'você é uma piada', model: output('Percebi que minha resposta não ajudou. Vou ser mais direto.'), assert: (r) => assert.equal(r.lead.businessType, 'pizzaria') }
  ]);
  assert.equal(marcos.customerName, 'Marcos'); assert.equal(marcos.salesChannels, 'ponto físico e WhatsApp'); assert.equal(marcos.goals, 'vender mais');

  const reset = await call(neto, [{ role: 'user', content: 'reiniciar conversa' }]);
  assert.equal(reset.reset, true); assert.equal(reset.lead.customerName, ''); assert.equal(reset.lead.businessType, '');
  console.log('PD-019B Neto and Marcos conversation regressions passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
