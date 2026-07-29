const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const officialPhone = '5591984487207';
const supersededPhone = '5591987137397';
const incorrectPhone = '5591984487202';
const officialPages = [
  'index.html',
  'agentes-de-atendimento.html',
  'automacao-com-ia.html',
  'criacao-de-sites-belem.html',
  'galeria-modelos.html',
  'landing-pages.html',
  'lojas-virtuais.html',
  'seo-para-empresas.html',
  'trafego-pago.html',
  'videos-e-artes.html'
];

for (const relativePath of officialPages) {
  const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const whatsappDestinations = [...contents.matchAll(/https:\/\/wa\.me\/(\d+)/g)]
    .map((match) => match[1]);

  assert.ok(
    whatsappDestinations.length > 0,
    `${relativePath} deve produzir ao menos um destino comercial wa.me`
  );
  assert.deepEqual(
    [...new Set(whatsappDestinations)],
    [officialPhone],
    `${relativePath} deve direcionar exclusivamente ao telefone oficial`
  );
  assert.ok(
    !contents.includes(supersededPhone),
    `${relativePath} não pode continuar usando o telefone comercial superado`
  );
  assert.ok(
    !contents.includes(incorrectPhone),
    `${relativePath} não pode usar o número informado por engano`
  );
}

const attendant = fs.readFileSync(path.join(root, 'atendimento.js'), 'utf8');
assert.match(
  attendant,
  new RegExp(`const WHATSAPP_NUMBER = '${officialPhone}'`)
);
assert.match(
  attendant,
  /return `https:\/\/wa\.me\/\$\{WHATSAPP_NUMBER\}\?text=\$\{encodeURIComponent\(message\)\}`;/
);

const admin = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
assert.match(
  admin,
  new RegExp(`const WHATSAPP_NUMBER = '${officialPhone}'`)
);
assert.match(
  admin,
  /return `https:\/\/wa\.me\/\$\{WHATSAPP_NUMBER\}\?text=\$\{encodeURIComponent\(text\)\}`;/
);

const demonstration = [
  fs.readFileSync(path.join(root, 'modelos', 'loja-moda', 'index.html'), 'utf8'),
  fs.readFileSync(path.join(root, 'modelos', 'loja-moda', 'app.js'), 'utf8')
].join('\n');
assert.ok(
  demonstration.includes(supersededPhone),
  'O contato próprio da demonstração Lume Modas deve permanecer preservado'
);
assert.ok(
  !demonstration.includes(incorrectPhone),
  'A demonstração não pode conter o número informado por engano'
);

console.log('PD-018 official phone contract tests passed.');
