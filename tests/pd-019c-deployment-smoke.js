const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const deployment = process.argv[2];
if (!deployment) throw new Error('Usage: node tests/pd-019c-deployment-smoke.js <deployment-id>');
const requestFile = join(tmpdir(), `pd019c-request-${process.pid}.json`);
const responseFile = join(tmpdir(), `pd019c-response-${process.pid}.json`);

function call(payload) {
  writeFileSync(requestFile, JSON.stringify(payload));
  const result = spawnSync('npx.cmd', [
    'vercel', 'curl', '/api/atendimento', '--deployment', deployment, '--',
    '--silent', '--show-error', '--output', responseFile,
    '--request', 'POST', '--header', 'Content-Type: application/json',
    '--data-binary', `@${requestFile}`
  ], { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error(`vercel curl failed: ${result.stderr || result.stdout}`);
  return JSON.parse(readFileSync(responseFile, 'utf8'));
}

try {
  let lead = { commercialVersion: 2 };
  const messages = [{ role: 'assistant', content: 'Como você gostaria que eu te chamasse?' }];
  const turns = [
    'Marcos', 'vendo pizza', 'não entendo, me ajude',
    'ponto físico e pedidos pelo WhatsApp', 'quero vender mais',
    'mostre uma imagem', 'essa galeria não tem pizza', 'crie um infográfico',
    'não quero a mesma galeria', 'me passe para o responsável',
    'qual é o meu nome?', 'o que eu vendo?'
  ];
  let handoff;
  const providers = [];
  for (const content of turns) {
    messages.push({ role: 'user', content });
    const response = call({ visitorId: 'pd019cdeployment', lead, messages: messages.slice(-24), page: 'Home', path: '/' });
    lead = response.lead;
    providers.push(response.provider);
    messages.push({ role: 'assistant', content: response.reply });
    if (response.action?.type === 'whatsapp') handoff = response.action;
  }
  assert.equal(lead.customerName, 'Marcos');
  assert.equal(lead.businessType, 'pizzaria');
  assert.equal(lead.productsOrServices, 'pizza');
  assert.match(lead.salesChannels, /ponto físico.*WhatsApp/i);
  assert.equal(lead.goals, 'aumentar as vendas');
  assert.equal(lead.galleryRejectedForSegment, true);
  assert.ok(handoff?.url?.startsWith('https://wa.me/5591984487207?text='));
  assert.match(decodeURIComponent(handoff.url.split('?text=')[1]), /Nome: Marcos[\s\S]*Produto: Pizza[\s\S]*Telefone do visitante: não informado/);
  console.log(JSON.stringify({ deployment, providers, lead: {
    customerName: lead.customerName, businessType: lead.businessType,
    productsOrServices: lead.productsOrServices, salesChannels: lead.salesChannels,
    goals: lead.goals, galleryRejectedForSegment: lead.galleryRejectedForSegment,
    visualRequests: lead.visualRequests, humanHandoffRequested: lead.humanHandoffRequested
  }, whatsapp: '5591984487207' }, null, 2));
} finally {
  rmSync(requestFile, { force: true });
  rmSync(responseFile, { force: true });
}
