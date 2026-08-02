const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const deployment = process.argv[2];
if (!deployment) throw new Error('Usage: node tests/pd-019d-deployment-smoke.js <deployment-id-or-url>');
const requestFile = join(tmpdir(), `pd019d-request-${process.pid}.json`);
const responseFile = join(tmpdir(), `pd019d-response-${process.pid}.json`);

async function call(payload) {
  if (/^https:\/\//.test(deployment)) {
    const response = await fetch(`${deployment.replace(/\/$/, '')}/api/atendimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`deployment request failed: HTTP ${response.status}`);
    return response.json();
  }
  writeFileSync(requestFile, JSON.stringify(payload));
  const args = ['vercel', 'curl', '/api/atendimento', '--deployment', deployment, '--', '--silent', '--show-error', '--output', responseFile, '--request', 'POST', '--header', 'Content-Type: application/json', '--data-binary', `@${requestFile}`];
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', `& 'C:\\Program Files\\nodejs\\npx.cmd' ${args.map((arg) => `'${String(arg).replaceAll("'", "''")}'`).join(' ')}`], { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error(`vercel curl failed: ${result.stderr || result.stdout || result.status}`);
  return JSON.parse(readFileSync(responseFile, 'utf8'));
}

(async () => { try {
  let lead = { commercialVersion: 3 };
  const messages = [];
  const turns = ['Marcos eu vendo pizza', 'quero', 'quero vender no zap', 'calma eu quero saber mais como isso funciona', 'tem uma imagem pra me mostrar?', 'ok diz pra ele me ligar', 'já é quinta vez que você mostra esse botão de galeria', 'eu quero atendimento humano', 'uma pessoa pode me atender agora?', 'quero continuar no zap'];
  const responses = [];
  let handoff;
  for (const content of turns) {
    messages.push({ role: 'user', content });
    const response = await call({ visitorId: `pd019d-${Date.now()}`, lead, messages: messages.slice(-24), page: 'Home', path: '/' });
    lead = response.lead; responses.push(response); messages.push({ role: 'assistant', content: response.reply });
    if (response.action?.type === 'whatsapp') handoff = response.action;
  }
  assert.match(responses[0].reply, /Prazer, Marcos!/);
  assert.equal(responses[2].action, null);
  assert.doesNotMatch(responses.slice(0, 7).map((r) => r.reply).join(' '), /98448-7207|5591984487207/);
  assert.match(responses[3].reply, /Imagine uma página/i);
  assert.equal(lead.galleryRejectedForSegment, true);
  assert.equal(lead.callbackRequested, true);
  assert.equal(lead.visitorPhone, '');
  assert.equal(responses.filter((r) => r.action?.type === 'whatsapp').length, 1);
  assert.ok(handoff?.url?.startsWith('https://wa.me/5591984487207?text='));
  const summary = decodeURIComponent(handoff.url.split('?text=')[1]);
  assert.match(summary, /Nome: Marcos[\s\S]*Produto: Pizza[\s\S]*Canal desejado: vender e receber pedidos pelo WhatsApp/i);
  assert.match(summary, /Dúvida: não entende como a solução funciona[\s\S]*Ligação: solicitada inicialmente/i);
  console.log(JSON.stringify({ deployment, providers: responses.map((r) => r.provider), lead: { customerName: lead.customerName, businessType: lead.businessType, productsOrServices: lead.productsOrServices, salesChannels: lead.salesChannels, contactPreference: lead.contactPreference, callbackRequested: lead.callbackRequested, urgency: lead.urgency, galleryRejectedForSegment: lead.galleryRejectedForSegment }, whatsapp: '5591984487207' }, null, 2));
} finally { rmSync(requestFile, { force: true }); rmSync(responseFile, { force: true }); } })().catch((error) => { console.error(error); process.exitCode = 1; });
