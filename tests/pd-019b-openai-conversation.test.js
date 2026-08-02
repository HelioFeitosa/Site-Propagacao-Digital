const assert = require('node:assert/strict');
const { buildConversationRequest, requestConversationTurn } = require('../lib/openai-conversation');

async function run() {
  const request = buildConversationRequest({ model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'Sou Neto e vendo toner.' }], state: {} });
  assert.equal(request.store, false);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.match(request.instructions, /Propagação Digital/);

  const output = {
    reply: 'Prazer, Neto. Hoje seus clientes chegam mais pelo WhatsApp ou por outro canal?',
    intent: 'diagnosis', confidence: 0.94,
    memoryUpdates: [{ field: 'customerName', value: 'Neto', evidence: 'Neto', confidence: 0.98 }],
    questionAsked: 'Hoje seus clientes chegam mais pelo WhatsApp ou por outro canal?',
    recommendedAction: null, requestedAssetId: null, handoffRequested: false
  };
  const fetchImpl = async () => ({ ok: true, status: 200, headers: { get: () => 'req_test' }, json: async () => ({ output_text: JSON.stringify(output) }) });
  const result = await requestConversationTurn({ apiKey: 'secret', model: 'gpt-4.1-mini', messages: [], currentMessage: 'Sou Neto.', state: {}, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.output.intent, 'diagnosis');
  assert.equal(result.requestId, 'req_test');

  const invalid = await requestConversationTurn({ apiKey: 'secret', model: 'gpt-4.1-mini', messages: [], currentMessage: 'Oi', state: {}, fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ output_text: '{ruim' }) }) });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.errorType, 'invalid-response');
  console.log('PD-019B OpenAI conversation tests passed.');
}
run();
