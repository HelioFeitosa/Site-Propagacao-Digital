const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const galleryPath = path.join(root, 'galeria-modelos.html');

assert.ok(fs.existsSync(galleryPath), 'A página da galeria deve existir');

const gallery = fs.readFileSync(galleryPath, 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stores = fs.readFileSync(path.join(root, 'lojas-virtuais.html'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

assert.match(gallery, /Galeria de modelos/i);
assert.match(gallery, /Moda e calçados/i);
assert.match(gallery, /Beleza e cosméticos/i);
assert.match(gallery, /Eletrônicos/i);
assert.match(gallery, /Toner e cartuchos/i);
assert.match(gallery, /Móveis e colchões/i);
assert.match(gallery, /Açaí e delivery/i);

for (const asset of [
  'loja-moda-print.jpg',
  'loja-beleza-print.jpg',
  'loja-eletronicos-print.jpg',
  'loja-toner-print.jpg',
  'destak-colchoes-modelo.jpg',
  'acai-delivery-whatsapp.svg'
]) {
  assert.match(gallery, new RegExp(asset.replace('.', '\\.')));
  assert.ok(fs.existsSync(path.join(root, 'img', 'modelos-lojas', asset)), `Imagem ausente: ${asset}`);
}

assert.match(gallery, /wa\.me\/5591987137397/);
assert.match(gallery, /não é um modelo fechado|personalizado/i);
assert.match(index, /href="\/galeria-modelos"/);
assert.match(stores, /href="\/galeria-modelos"/);
assert.match(sitemap, /<loc>https:\/\/propagacaodigital\.com\/galeria-modelos<\/loc>/);
assert.match(gallery, /href="\/modelos\/loja-moda\/"/);
assert.match(gallery, /Ver demo funcionando/i);
assert.match(sitemap, /<loc>https:\/\/propagacaodigital\.com\/modelos\/loja-moda\/<\/loc>/);

console.log('Galeria de modelos tests passed.');
