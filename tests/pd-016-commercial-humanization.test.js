const assert = require('node:assert/strict');
const {
  createCommercialState,
  advanceCommercialConversation
} = require('../lib/commercial-conversation');

function turn(state, text) {
  return advanceCommercialConversation(state, text);
}

let state = createCommercialState();
assert.equal(state.businessType, null);
assert.equal(state.pace, 'NORMAL');
assert.equal(state.diagnosisConfirmed, false);

// Testes 1 e 2 — isolamento de memória e ausência de segmento presumido.
let isolated = turn(createCommercialState(), 'Quero divulgar melhor meu negócio');
assert.equal(isolated.state.businessType, null);
assert.doesNotMatch(isolated.reply, /colchão|açaí|roupa|sapato/i);
assert.match(isolated.reply, /chamasse|negócio/i);

const previousSession = {
  ...createCommercialState(),
  customerName: 'José',
  businessType: 'loja de colchões'
};
isolated = turn(createCommercialState(), 'Meu nome é Carla');
assert.equal(isolated.state.customerName, 'Carla');
assert.equal(isolated.state.businessType, null);
assert.doesNotMatch(isolated.reply, /colchão/i);
assert.equal(previousSession.businessType, 'loja de colchões');

// Testes 3 a 6 — jornada consultiva.
let result = turn(state, 'Hélio');
state = result.state;
assert.equal(state.customerName, 'Hélio');
assert.match(result.reply, /negócio|empresa/i);
assert.doesNotMatch(result.reply, /WhatsApp|preço|recomendo/i);

result = turn(state, 'Tenho uma sapataria e vendo sapatos e bolsas');
state = result.state;
assert.match(state.productsOrServices, /sapatos e bolsas/i);
assert.match(result.reply, /sapatos e bolsas/i);
assert.match(result.reply, /vende hoje|canais/i);

result = turn(state, 'Na loja física e pelo Instagram');
state = result.state;
assert.match(state.salesChannels, /loja física e pelo Instagram/i);
assert.match(result.reply, /objetivo principal/i);

result = turn(state, 'Quero receber mais pedidos');
state = result.state;
assert.match(state.goals, /receber mais pedidos/i);
assert.match(result.reply, /entendi corretamente/i);
assert.equal(state.diagnosisConfirmed, false);
assert.doesNotMatch(result.reply, /WhatsApp|preço/i);

result = turn(state, 'Sim, está certo');
state = result.state;
assert.equal(state.diagnosisConfirmed, true);
assert.match(result.reply, /site|catálogo|Google|Instagram/i);
assert.match(result.reply, /mostr/i);

result = turn(state, 'Pode mostrar');
state = result.state;
assert.equal(state.visualRequested, true);
assert.equal(state.visualStatus, 'READY');
assert.equal(state.visualAssetId, 'lume-modas-functional-demo');

let acai = turn(createCommercialState(), 'João').state;
let acaiTurn = turn(acai, 'Vendo açaí com peixe frito');
acai = acaiTurn.state;
assert.match(acai.productsOrServices, /açaí com peixe frito/i);
assert.doesNotMatch(acaiTurn.reply, /colchão|roupa/i);
acaiTurn = turn(acai, 'Vendo no ponto e recebo pedidos pelo WhatsApp');
acai = acaiTurn.state;
assert.match(acai.salesChannels, /ponto.*WhatsApp/i);
assert.match(acaiTurn.reply, /objetivo principal/i);
acaiTurn = turn(acai, 'Quero atrair mais pessoas e receber mais pedidos');
assert.equal(acaiTurn.state.diagnosisConfirmed, false);
assert.match(acaiTurn.reply, /entendi corretamente/i);

// Testes 7 e 8 — ritmo lento e crítica.
let slow = createCommercialState();
slow = turn(slow, 'Maria').state;
slow = turn(slow, 'Tenho uma loja de roupas').state;
result = turn(slow, 'Calma, vá devagar e não quero WhatsApp');
assert.equal(result.state.pace, 'SLOW');
assert.doesNotMatch(result.reply, /WhatsApp|preço|contratar|proposta/i);
assert.ok(result.reply.length < 180);

let criticism = createCommercialState();
criticism = turn(criticism, 'Paulo').state;
result = turn(criticism, 'Você inventou que eu vendo roupas');
assert.match(result.reply, /tem razão|desculp/i);
assert.doesNotMatch(result.reply, /você vende roupas/i);
assert.equal(result.state.businessType, null);

let services = createCommercialState();
result = turn(services, 'Quais serviços vocês oferecem?');
assert.match(result.reply, /Presença digital/i);
assert.match(result.reply, /Divulgação e crescimento/i);
assert.match(result.reply, /Atendimento e automação/i);
assert.equal((result.reply.match(/\?/g) || []).length, 1);

// Testes 10 e 11 — visual bloqueado ou fallback honesto.
let earlyVisual = turn(createCommercialState(), 'Quero ver uma imagem');
assert.equal(earlyVisual.state.visualRequested, false);
assert.equal(earlyVisual.state.visualAssetId, null);
assert.doesNotMatch(earlyVisual.reply, /aqui está|cartão abaixo/i);

let noDemo = {
  ...createCommercialState(),
  customerName: 'Bia',
  businessType: 'clínica veterinária',
  salesChannels: 'indicação',
  goals: 'conseguir novos clientes',
  diagnosisConfirmed: true
};
noDemo = turn(noDemo, 'Quero ver uma demonstração').state;
assert.equal(noDemo.visualStatus, 'UNAVAILABLE');
assert.equal(noDemo.visualAssetId, null);

let early = createCommercialState();
early = turn(early, 'João').state;
result = turn(early, 'Quero um site e o preço');
assert.doesNotMatch(result.reply, /R\$/);
assert.equal(result.state.diagnosisConfirmed, false);

let visualMissing = {
  ...state,
  diagnosisConfirmed: true,
  visualRequested: true,
  visualStatus: 'READY',
  visualAssetId: 'lume-modas-functional-demo'
};
result = turn(visualMissing, 'A imagem não apareceu');
assert.equal(result.state.visualStatus, 'FAILED');
assert.equal(result.state.userReportedVisualMissing, true);
assert.match(result.reply, /galeria|link|Hélio/i);
assert.doesNotMatch(result.reply, /está logo abaixo/i);
result = turn(result.state, 'Então mostre a imagem de novo');
assert.equal(result.state.visualStatus, 'FAILED');
assert.doesNotMatch(result.reply, /cartão visual abaixo|vou mostrar/i);
assert.match(result.reply, /não vou repetir|galeria/i);

let whatsapp = createCommercialState();
whatsapp = turn(whatsapp, 'Ana').state;
whatsapp = turn(whatsapp, 'Tenho uma clínica odontológica').state;
result = turn(whatsapp, 'Atendo por indicação');
assert.equal(result.state.whatsappInterest, false);
assert.doesNotMatch(result.reply, /falar no WhatsApp/i);

result = turn(result.state, 'Quero falar com uma pessoa e pedir proposta');
assert.equal(result.state.humanHandoffRequested, true);
assert.equal(result.state.whatsappInterest, true);
assert.match(result.reply, /WhatsApp/i);
result = turn(result.state, 'Calma, não quero WhatsApp');
assert.equal(result.state.humanHandoffRequested, false);
assert.equal(result.state.whatsappInterest, false);
assert.doesNotMatch(result.reply, /abrir o WhatsApp/i);

let corrected = {
  ...createCommercialState(),
  customerName: 'João',
  businessType: 'sapataria',
  productsOrServices: 'sapatos',
  salesChannels: 'loja física',
  goals: 'atrair clientes'
};
corrected = turn(corrected, 'Na verdade também vendo pelo WhatsApp').state;
assert.match(corrected.salesChannels, /WhatsApp/i);
assert.match(corrected.salesChannels, /loja física/i);
result = turn(corrected, 'Sim, agora está certo');
assert.equal(result.state.diagnosisConfirmed, true);

let flower = turn(createCommercialState(), 'Bia').state;
flower = turn(flower, 'Tenho uma floricultura com delivery').state;
assert.match(flower.businessType, /floricultura/i);
assert.doesNotMatch(flower.businessType, /restaurante/i);

result = turn(noDemo, 'Quero abrir a galeria');
assert.equal(result.state.galleryInterest, true);
assert.match(result.reply, /Conhecer a galeria/i);

let correction = createCommercialState();
correction = turn(correction, 'Carlos').state;
correction = turn(correction, 'Tenho uma padaria e vendo pães e bolos').state;
result = turn(correction, 'Na verdade também vendo salgados');
assert.match(result.state.productsOrServices, /salgados/i);
assert.match(result.reply, /salgados/i);

let oneQuestion = createCommercialState();
for (const text of ['Lia', 'Sou arquiteta', 'Instagram', 'Conseguir novos clientes']) {
  result = turn(oneQuestion, text);
  oneQuestion = result.state;
  assert.ok((result.reply.match(/\?/g) || []).length <= 1);
}

console.log('PD-016 commercial humanization tests passed.');
