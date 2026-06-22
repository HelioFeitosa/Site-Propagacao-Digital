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

  console.log('Atendimento context regression tests passed.');
})();
