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
assert.match(html, /Lume Modas/i);
assert.match(html, /class="commerce-header"/);
assert.match(html, /class="commerce-search"/);
assert.match(html, /class="commerce-nav"/);
for (const label of ['Feminino', 'Masculino', 'Calçados', 'Acessórios', 'Promoções', 'Contato']) {
  assert.match(html, new RegExp(label, 'i'));
}

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
assert.equal((html.match(/data-carousel-slide/g) || []).length, 3);
assert.match(html, /id="carousel-prev"/);
assert.match(html, /id="carousel-next"/);
assert.equal((html.match(/data-carousel-dot/g) || []).length, 3);

const {
  filterProducts,
  formatCurrency,
  addCartItem,
  updateCartQuantity,
  removeCartItem,
  cartTotal,
  buildWhatsAppUrl,
  normalizeSlideIndex,
  nextSlideIndex
} = require('../modelos/loja-moda/app.js');
const searchFixture = [
  { name: 'Vestido Midi', category: 'vestidos', description: 'Leve e fluido' },
  { name: 'Tênis Urbano', category: 'calcados', description: 'Casual branco' },
  { name: 'Bolsa Luz', category: 'acessorios', description: 'Compacta' }
];

assert.equal(filterProducts(searchFixture, 'midi', 'all').length, 1);
assert.equal(filterProducts(searchFixture, 'tenis', 'all').length, 1);
assert.equal(filterProducts(searchFixture, '', 'vestidos').length, 1);
assert.equal(filterProducts(searchFixture, 'produto inexistente', 'all').length, 0);
assert.equal(formatCurrency(189.9), 'R$ 189,90');

let cart = addCartItem([], { productId: 'vestido-midi', name: 'Vestido Midi', price: 189.9, size: 'M', color: 'Preto', quantity: 1 });
cart = addCartItem(cart, { productId: 'vestido-midi', name: 'Vestido Midi', price: 189.9, size: 'M', color: 'Preto', quantity: 1 });
assert.equal(cart.length, 1);
assert.equal(cart[0].quantity, 2);
assert.equal(cartTotal(cart), 379.8);

cart = addCartItem(cart, { productId: 'vestido-midi', name: 'Vestido Midi', price: 189.9, size: 'G', color: 'Preto', quantity: 1 });
assert.equal(cart.length, 2, 'Tamanhos diferentes devem permanecer como itens diferentes');
cart = updateCartQuantity(cart, cart[0].key, 3);
assert.equal(cart[0].quantity, 3);
cart = removeCartItem(cart, cart[0].key);
assert.equal(cart.length, 1);
assert.equal(updateCartQuantity(cart, cart[0].key, 0).length, 0, 'Quantidade zero remove o item');

assert.equal(buildWhatsAppUrl([]), '', 'Carrinho vazio não deve abrir o WhatsApp');
const whatsappUrl = buildWhatsAppUrl([
  { productId: 'vestido-midi', name: 'Vestido Midi', price: 189.9, size: 'M', color: 'Preto', quantity: 2 }
]);
assert.match(whatsappUrl, /^https:\/\/wa\.me\/5591987137397\?text=/);
const whatsappMessage = decodeURIComponent(whatsappUrl.split('?text=')[1]);
assert.match(whatsappMessage, /demonstração Lume Moda/i);
assert.match(whatsappMessage, /2x Vestido Midi/);
assert.match(whatsappMessage, /R\$\s?379,80/);

assert.equal(normalizeSlideIndex(-1, 3), 2);
assert.equal(normalizeSlideIndex(3, 3), 0);
assert.equal(nextSlideIndex(1, 3, 1), 2);
assert.equal(nextSlideIndex(0, 3, -1), 2);

console.log('Loja Lume Moda structural tests passed.');
