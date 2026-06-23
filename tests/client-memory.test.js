const assert = require('node:assert/strict');
const {
  businessTokens,
  candidateScore,
  extractRecallIdentity,
  isForgetRequest,
  safeVisitorId
} = require('../lib/client-memory');

const recall = extractRecallIdentity('Aqui é o Neto da loja de cartuchos de toner, lembra?');
assert.deepEqual(recall, {
  name: 'Neto',
  businessHint: 'loja de cartuchos de toner'
});

assert.equal(candidateScore({
  businessSearchText: 'Loja de cartuchos, toner e recarga de impressoras'
}, recall.businessHint), 1);

assert.equal(candidateScore({
  businessSearchText: 'Pizzaria e entrega pelo WhatsApp'
}, recall.businessHint), 0);

assert.deepEqual(
  businessTokens('Loja de cartuchos de toner em Belém'),
  ['cartuchos', 'toner', 'belem']
);

assert.equal(isForgetRequest('Por favor, esqueça meus dados.'), true);
assert.equal(isForgetRequest('Quero continuar o atendimento.'), false);
assert.equal(safeVisitorId('1234567890abcdef'), '1234567890abcdef');
assert.equal(safeVisitorId('curto'), '');

console.log('Client memory tests passed.');
