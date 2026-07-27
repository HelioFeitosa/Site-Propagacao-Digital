const assert = require('node:assert/strict');
const {
  createCommercialState,
  advanceCommercialConversation
} = require('../lib/commercial-conversation');

function turn(state, text) {
  return advanceCommercialConversation(state, text);
}

let result = turn(createCommercialState(), 'Pedro eu vendo açaí com peixe frito');
assert.equal(result.state.customerName, 'Pedro');
assert.match(result.state.productsOrServices, /açaí com peixe frito/i);
assert.match(result.reply, /Prazer, Pedro/i);
assert.match(result.reply, /canais|ponto físico|WhatsApp/i);

const variations = [
  ['Meu nome é Pedro e tenho uma loja de roupas.', 'Pedro', /loja de roupas/i],
  ['Sou Maria, trabalho com manicure.', 'Maria', /manicure/i],
  ['João aqui, vendo celulares.', 'João', /celulares/i],
  ['Pode me chamar de Ana. Tenho uma clínica.', 'Ana', /clínica/i]
];

for (const [text, name, business] of variations) {
  result = turn(createCommercialState(), text);
  assert.equal(result.state.customerName, name);
  assert.match(`${result.state.businessType} ${result.state.productsOrServices}`, business);
}

result = turn(createCommercialState(), 'Pedro.');
assert.equal(result.state.customerName, 'Pedro');
assert.equal(result.state.businessType, null);

result = turn(createCommercialState(), 'Vendo açaí com peixe frito.');
assert.equal(result.state.customerName, '');
assert.equal(result.state.businessType, null);

let loop = turn(createCommercialState(), 'quero divulgar melhor meu negócio');
assert.equal(loop.state.lastQuestion, 'ASK_NAME');
assert.equal(loop.state.questionRepeatCount, 0);
loop = turn(loop.state, 'não entendi');
assert.equal(loop.state.questionRepeatCount, 1);
assert.match(loop.reply, /não entendi direito/i);
assert.doesNotMatch(loop.reply, /^Como você gostaria/i);

const retryState = {
  ...createCommercialState(),
  lastQuestion: 'ASK_NAME',
  questionRepeatCount: 0,
  lastUserMessage: 'Pedro eu vendo açaí com peixe frito'
};
result = turn(retryState, 'já falei');
assert.equal(result.state.customerName, 'Pedro');
assert.match(result.state.productsOrServices, /açaí com peixe frito/i);

console.log('PD-017A loop regression tests passed.');
