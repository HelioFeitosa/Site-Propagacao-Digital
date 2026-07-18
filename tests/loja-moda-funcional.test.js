const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'modelos', 'loja-moda', 'index.html');
const catalogPath = path.join(root, 'modelos', 'loja-moda', 'catalogo.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');

assert.match(html, /Lume Moda/);
assert.match(html, /demonstração.*Propagação Digital/i);

for (const id of [
  'demo-notice',
  'product-grid',
  'search-input',
  'category-filters',
  'cart-button',
  'cart-drawer',
  'product-modal'
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Elemento ausente: ${id}`);
}

assert.match(html, /src="catalogo\.js"/);
assert.match(html, /src="app\.js"/);
assert.match(html, /href="\/galeria-modelos"/);
assert.match(catalog, /window\.LUME_PRODUCTS/);
assert.ok((catalog.match(/\bid:/g) || []).length >= 8, 'O catálogo precisa de pelo menos oito produtos');

console.log('Loja Lume Moda structural tests passed.');
