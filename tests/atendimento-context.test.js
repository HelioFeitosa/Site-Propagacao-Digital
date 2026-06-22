const assert = require('node:assert/strict');

delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;

const handler = require('../api/atendimento.js');

let ipCounter = 10;

function request(payload) {
  ipCounter += 1;
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': `127.90.0.${ipCounter}` },
    socket: {},
    body: payload
  };
}

function response(resolve) {
  return {
    setHeader() {},
    end(body) {
      resolve(JSON.parse(body));
    }
  };
}

async function call(messages, lead = {}) {
  return new Promise(async (resolve) => {
    await handler(request({ lead, messages, page: 'Home', path: '/' }), response(resolve));
  });
}

async function runFlow(steps) {
  let lead = {};
  const messages = [{ role: 'assistant', content: 'Olá' }];
  const replies = [];

  for (const text of steps) {
    messages.push({ role: 'user', content: text });
    const result = await call(messages, lead);
    lead = result.lead;
    replies.push(result.reply);
    messages.push({ role: 'assistant', content: result.reply });
  }

  return { lead, replies };
}

function includesAny(text, words) {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return words.some((word) => normalized.includes(word));
}

(async () => {
  const sapataria = await runFlow([
    'meu nome é Paulo e tenho uma sapataria',
    'Não ! Eu não vendo uma sapataria, eu vendo sapatos !',
    'Sapataria vende sapatos; Padaria vende Pão; e Açougue vende Carne ! Voce entende isso ?'
  ]);
  assert.equal(sapataria.lead.name, 'Paulo');
  assert.equal(sapataria.lead.businessType, 'sapataria');
  assert.equal(sapataria.lead.product, 'sapatos');
  assert.ok(!sapataria.replies.at(-1).includes('principais uma sapataria'));
  assert.ok(includesAny(sapataria.replies.at(-1), ['entendi', 'sapatos']));

  const acai = await runFlow([
    'meu nome é Marcia',
    'vendo açaí no meu bairro',
    'não, eu já vendo !',
    'simples',
    'é em Litro ! é polpa do açaí in natura !',
    '22,00'
  ]);
  assert.equal(acai.lead.name, 'Marcia');
  assert.ok(includesAny(acai.lead.productDetail || '', ['acai em litro', 'polpa']));
  assert.equal(acai.lead.productPrice, 'R$ 22,00');
  assert.ok(!includesAny(acai.replies.at(-1), ['quais tamanhos']));

  const manicoba = await runFlow([
    'me chamo Marcio vendo maniçoba',
    'quero vender mais',
    'simples',
    'voce é doido ? eu vendo maniçoba ! de onde voce tirou açaí ?'
  ]);
  assert.equal(manicoba.lead.name, 'Marcio');
  assert.ok(includesAny(manicoba.lead.product || '', ['manicoba']));
  assert.ok(!includesAny(manicoba.replies.at(-1), ['acai']));

  const marta = await runFlow([
    'meu nome é João eu vendo Bolo decorados',
    'whatsapp',
    'Eu ja falei WhatsApp!',
    'voce é uma inteligencia Artificial ?',
    'mais Simples',
    'O João se aboreceu com voce ! Eu sou a Marta ! eu vou continuar com voce !'
  ]);
  assert.equal(marta.lead.name, 'Marta');
  assert.equal(marta.lead.channel, 'WhatsApp');
  assert.ok(includesAny(marta.lead.product || '', ['bolo decorados']));
  assert.ok(includesAny(marta.replies.at(-1), ['marta']));

  const colchao = await runFlow([
    'sou João e vendo colchoes no meu ponto no julia sefer',
    'simples',
    'entrega',
    'eu ja falei',
    'voce não lembra da conversa que tivemos pelo celular ?'
  ]);
  assert.equal(colchao.lead.name, 'João');
  assert.ok(includesAny(colchao.lead.product || '', ['colchoes']));
  assert.equal(colchao.lead.deliveryMethod, 'entrega');
  assert.ok(includesAny(colchao.replies.at(-1), ['nao consigo acessar automaticamente', 'conversa']));

  const perguntaDireta = await runFlow([
    'meu nome é Carlos e vendo marmita',
    'voce é uma inteligencia Artificial ?',
    'porque voce ignorou a minha pergunta?'
  ]);
  assert.equal(perguntaDireta.lead.name, 'Carlos');
  assert.ok(includesAny(perguntaDireta.replies.at(-2), ['inteligencia artificial', 'atendente virtual']));
  assert.ok(includesAny(perguntaDireta.replies.at(-1), ['deveria ter respondido', 'atendente virtual']));

  const offTopic = await runFlow([
    'me chamo Ana e tenho uma loja de roupas',
    'me passa uma receita de strogonoff'
  ]);
  assert.equal(offTopic.lead.name, 'Ana');
  assert.ok(includesAny(offTopic.replies.at(-1), ['chatgpt', 'site', 'google']));
  assert.ok(!includesAny(offTopic.replies.at(-1), ['estrutura simples ou completa']));

  const oficina = await runFlow([
    'Meu nome é Renato e tenho uma oficina de bicicletas. Quero aumentar clientes e organizar orçamento pelo WhatsApp. Qual caminho você recomenda sem repetir perguntas?'
  ]);
  assert.equal(oficina.lead.name, 'Renato');
  assert.equal(oficina.lead.businessType, 'oficina de bicicletas');
  assert.ok(includesAny(oficina.lead.product || '', ['conserto', 'manutencao', 'bicicletas']));
  assert.equal(oficina.lead.channel, 'WhatsApp');
  assert.ok(!oficina.lead.location);
  assert.ok(!includesAny(oficina.replies.at(-1), ['voce vende oficina', 'principais oficina', 'vender pelo whatsapp tambem']));
  assert.ok(!includesAny(oficina.replies.at(-1), ['em de bicicletas']));
  assert.ok(includesAny(oficina.replies.at(-1), ['whatsapp', 'google local', 'servicos']));

  const pizzaria = await runFlow([
    'ola meu nome é Marcos Eu trabalho com pizza',
    'mai pelo Zap',
    'Não ! Eu não quero loja virtual , Eu teho uma pequena Pizzaria !'
  ]);
  assert.equal(pizzaria.lead.name, 'Marcos');
  assert.equal(pizzaria.lead.channel, 'WhatsApp');
  assert.ok(includesAny(pizzaria.lead.product || '', ['pizza']));
  assert.ok(!includesAny(pizzaria.replies[1], ['lojas virtuais parece', 'estrutura mais completa']));
  assert.ok(includesAny(pizzaria.replies[1], ['zap', 'cardapio', 'whatsapp']));
  assert.ok(!includesAny(pizzaria.replies[2], ['lojas virtuais parece', 'quer começar rapido']));
  assert.ok(includesAny(pizzaria.replies[2], ['pizzaria', 'nao vou insistir', 'whatsapp']));

  console.log('Atendimento context regression tests passed.');
})();
