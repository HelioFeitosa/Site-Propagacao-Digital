const assert = require('node:assert/strict');

delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;

const handler = require('../api/atendimento');

function call(payload) {
  return new Promise((resolve) => {
    handler({
      method: 'POST',
      headers: { 'x-forwarded-for': `127.70.0.${Date.now() % 200}` },
      socket: {},
      body: payload
    }, {
      setHeader() {},
      end(value) {
        resolve(JSON.parse(value));
      }
    });
  });
}

(async () => {
  const result = await call({
    visitorId: 'pd016session00000001',
    lead: { commercialVersion: 1 },
    messages: [
      { role: 'assistant', content: 'Como você gostaria que eu te chamasse?' },
      { role: 'user', content: 'Marina' }
    ],
    page: 'Home',
    path: '/'
  });

  assert.equal(result.provider, 'commercial-state');
  assert.equal(result.lead.customerName, 'Marina');
  assert.equal(result.lead.businessType, null);
  assert.match(result.reply, /qual é o seu negócio/i);
  assert.equal(result.memory.saved, false);
  console.log('PD-016 API integration test passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
