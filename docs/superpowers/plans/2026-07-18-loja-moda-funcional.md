# Loja Funcional de Moda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a demonstração navegável `Lume Moda`, conectá-la à galeria central e validar busca, filtros, produto, carrinho e finalização demonstrativa pelo WhatsApp.

**Architecture:** Uma aplicação estática independente em `modelos/loja-moda/`, sem bibliotecas externas. `catalogo.js` fornece dados imutáveis; `app.js` controla estado, renderização, busca, filtros, detalhes, carrinho persistente e WhatsApp; a galeria central apenas apresenta e encaminha para a demo.

**Tech Stack:** HTML5, CSS responsivo, JavaScript ES2020 no navegador, `localStorage`, Node.js `assert` para testes estruturais e navegador local para testes de comportamento.

## Global Constraints

- A marca, os produtos e os preços da `Lume Moda` são fictícios e devem ter aviso visível.
- Nenhum pagamento, login, banco de dados, estoque real ou frete por CEP será implementado.
- O WhatsApp de demonstração usa `5591987137397` e identifica claramente a origem na demo.
- Não instalar dependências externas.
- Não expor segredos, tokens ou chaves no navegador.
- A galeria central continua disponível em `/galeria-modelos`.
- A URL só será ensinada ao Hélio Virtual após publicação e verificação HTTP 200.

---

### Task 1: Contrato estrutural e catálogo

**Files:**
- Create: `tests/loja-moda-funcional.test.js`
- Create: `modelos/loja-moda/catalogo.js`
- Create: `modelos/loja-moda/index.html`

**Interfaces:**
- Produces: `window.LUME_PRODUCTS`, uma lista com objetos `{ id, name, category, description, price, image, sizes, colors, featured }`.
- Produces: elementos com IDs `product-grid`, `search-input`, `category-filters`, `cart-button`, `cart-drawer`, `product-modal` e `demo-notice`.

- [ ] **Step 1: Escrever o teste estrutural que exige rota, aviso, catálogo e controles**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'modelos/loja-moda/index.html'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'modelos/loja-moda/catalogo.js'), 'utf8');
assert.match(html, /Lume Moda/);
assert.match(html, /demonstração.*Propagação Digital/i);
for (const id of ['product-grid','search-input','category-filters','cart-button','cart-drawer','product-modal']) assert.match(html, new RegExp(`id="${id}"`));
assert.match(catalog, /window\.LUME_PRODUCTS/);
assert.ok((catalog.match(/id:/g) || []).length >= 8);
```

- [ ] **Step 2: Executar o teste e confirmar falha por arquivos ausentes**

Run: `node tests/loja-moda-funcional.test.js`
Expected: FAIL com `ENOENT` para `modelos/loja-moda/index.html`.

- [ ] **Step 3: Criar catálogo com dez produtos e HTML semântico mínimo**

O catálogo deve conter novidades, vestidos, conjuntos, calçados e acessórios. O HTML deve carregar `catalogo.js` antes de `app.js`, usar `aria-live` no resultado de busca e oferecer o link `/galeria-modelos`.

- [ ] **Step 4: Executar o teste e confirmar aprovação**

Run: `node tests/loja-moda-funcional.test.js`
Expected: `Loja Lume Moda structural tests passed.`

- [ ] **Step 5: Commit do catálogo e estrutura**

```powershell
git add -- tests/loja-moda-funcional.test.js modelos/loja-moda/catalogo.js modelos/loja-moda/index.html
git commit -m "feat: scaffold functional fashion demo"
```

### Task 2: Renderização, pesquisa e filtros

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Create: `modelos/loja-moda/app.js`

**Interfaces:**
- Produces: `normalizeText(value)`, `filterProducts(products, query, category)` e `formatCurrency(value)`.
- Consumes: `window.LUME_PRODUCTS`.

- [ ] **Step 1: Acrescentar testes puros para pesquisa sem acento, categoria e resultado vazio**

```js
const { filterProducts } = require('../modelos/loja-moda/app.js');
assert.equal(filterProducts([{name:'Vestido Midi',category:'vestidos',description:'leve'}], 'midi', 'all').length, 1);
assert.equal(filterProducts([{name:'Tênis Urbano',category:'calcados',description:'casual'}], 'tenis', 'all').length, 1);
assert.equal(filterProducts([{name:'Bolsa',category:'acessorios',description:'compacta'}], '', 'vestidos').length, 0);
```

- [ ] **Step 2: Executar e confirmar falha porque `app.js` ainda não exporta a função**

Run: `node tests/loja-moda-funcional.test.js`
Expected: FAIL com `MODULE_NOT_FOUND` ou `filterProducts is not a function`.

- [ ] **Step 3: Implementar funções puras e inicialização protegida para navegador**

```js
function normalizeText(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function filterProducts(products, query, category) {
  const needle = normalizeText(query);
  return products.filter((product) => (category === 'all' || product.category === category) && normalizeText(`${product.name} ${product.category} ${product.description}`).includes(needle));
}
if (typeof module !== 'undefined') module.exports = { normalizeText, filterProducts };
```

No navegador, renderizar os cards, atualizar `aria-live`, permitir filtros e exibir botão `Limpar busca` quando não houver resultados.

- [ ] **Step 4: Executar o teste estrutural e puro**

Run: `node tests/loja-moda-funcional.test.js`
Expected: PASS.

- [ ] **Step 5: Commit de busca e filtros**

```powershell
git add -- tests/loja-moda-funcional.test.js modelos/loja-moda/app.js
git commit -m "feat: add fashion catalog search and filters"
```

### Task 3: Produto e carrinho demonstrativo

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Modify: `modelos/loja-moda/app.js`
- Modify: `modelos/loja-moda/index.html`

**Interfaces:**
- Produces: `addCartItem(cart, selection)`, `updateCartQuantity(cart, key, quantity)`, `removeCartItem(cart, key)` e `cartTotal(cart)`.
- `selection` tem `{ productId, name, price, size, color, quantity }`.

- [ ] **Step 1: Acrescentar testes de item distinto por variação, quantidade, remoção e total**

```js
const { addCartItem, updateCartQuantity, removeCartItem, cartTotal } = require('../modelos/loja-moda/app.js');
let cart = addCartItem([], { productId:'vestido-midi', name:'Vestido Midi', price:189.9, size:'M', color:'Preto', quantity:1 });
cart = addCartItem(cart, { productId:'vestido-midi', name:'Vestido Midi', price:189.9, size:'M', color:'Preto', quantity:1 });
assert.equal(cart[0].quantity, 2);
assert.equal(cartTotal(cart), 379.8);
cart = updateCartQuantity(cart, cart[0].key, 3);
assert.equal(cart[0].quantity, 3);
assert.equal(removeCartItem(cart, cart[0].key).length, 0);
```

- [ ] **Step 2: Executar e confirmar falha por funções ausentes**

Run: `node tests/loja-moda-funcional.test.js`
Expected: FAIL com `addCartItem is not a function`.

- [ ] **Step 3: Implementar seleção de tamanho/cor, detalhes e operações imutáveis do carrinho**

O modal deve impedir adição sem variações válidas. O drawer deve alterar quantidade, remover, calcular total e mostrar estado vazio.

- [ ] **Step 4: Implementar persistência resiliente**

Usar a chave `lume-moda-demo-cart-v1`; envolver leitura e gravação em `try/catch`; em falha, manter o array em memória.

- [ ] **Step 5: Executar testes e confirmar aprovação**

Run: `node tests/loja-moda-funcional.test.js`
Expected: PASS.

- [ ] **Step 6: Commit do produto e carrinho**

```powershell
git add -- tests/loja-moda-funcional.test.js modelos/loja-moda/app.js modelos/loja-moda/index.html
git commit -m "feat: add product details and demo cart"
```

### Task 4: Finalização segura pelo WhatsApp

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Modify: `modelos/loja-moda/app.js`

**Interfaces:**
- Produces: `buildWhatsAppUrl(cart)` retornando string iniciada por `https://wa.me/5591987137397?text=` ou string vazia quando não houver itens válidos.

- [ ] **Step 1: Acrescentar teste do resumo e rejeição do carrinho vazio**

```js
const { buildWhatsAppUrl } = require('../modelos/loja-moda/app.js');
assert.equal(buildWhatsAppUrl([]), '');
const url = buildWhatsAppUrl([{key:'x',productId:'x',name:'Vestido Midi',price:189.9,size:'M',color:'Preto',quantity:2}]);
assert.match(url, /^https:\/\/wa\.me\/5591987137397\?text=/);
const message = decodeURIComponent(url.split('text=')[1]);
assert.match(message, /demonstração Lume Moda/i);
assert.match(message, /2x Vestido Midi/);
```

- [ ] **Step 2: Executar e confirmar falha por função ausente**

Run: `node tests/loja-moda-funcional.test.js`
Expected: FAIL com `buildWhatsAppUrl is not a function`.

- [ ] **Step 3: Implementar URL somente com itens válidos e total calculado**

A mensagem deve declarar que é uma demonstração, listar quantidade, produto, tamanho, cor, subtotal e pedir conversa sobre projeto semelhante.

- [ ] **Step 4: Executar testes e confirmar aprovação**

Run: `node tests/loja-moda-funcional.test.js`
Expected: PASS.

- [ ] **Step 5: Commit da finalização demonstrativa**

```powershell
git add -- tests/loja-moda-funcional.test.js modelos/loja-moda/app.js
git commit -m "feat: add safe WhatsApp demo checkout"
```

### Task 5: Design responsivo e integração com a galeria

**Files:**
- Create: `modelos/loja-moda/styles.css`
- Modify: `modelos/loja-moda/index.html`
- Modify: `galeria-modelos.html`
- Modify: `tests/galeria-modelos.test.js`
- Modify: `sitemap.xml`

**Interfaces:**
- Produces: link `/modelos/loja-moda/` com rótulo `Ver demo funcionando`.

- [ ] **Step 1: Atualizar o teste da galeria para exigir o link funcional e retorno**

```js
assert.match(gallery, /href="\/modelos\/loja-moda\/"/);
assert.match(gallery, /Ver demo funcionando/i);
assert.match(html, /href="\/galeria-modelos"/);
```

- [ ] **Step 2: Executar e confirmar falha porque o cartão ainda abre apenas imagem**

Run: `node tests/galeria-modelos.test.js`
Expected: FAIL na expressão `/modelos/loja-moda/`.

- [ ] **Step 3: Criar CSS completo e substituir o link do cartão**

O CSS deve ter hero comercial, menu fixo, filtros horizontais roláveis, grid de quatro/duas/uma colunas, modal acessível, drawer lateral, foco visível e media queries para 768 px e 480 px.

- [ ] **Step 4: Adicionar a demo ao sitemap**

Adicionar `https://propagacaodigital.com/modelos/loja-moda/` com `lastmod` 2026-07-18, `monthly` e prioridade `0.7`.

- [ ] **Step 5: Executar testes das duas superfícies**

Run: `node tests/loja-moda-funcional.test.js; node tests/galeria-modelos.test.js`
Expected: ambos PASS.

- [ ] **Step 6: Commit da apresentação e integração**

```powershell
git add -- modelos/loja-moda/styles.css modelos/loja-moda/index.html galeria-modelos.html tests/galeria-modelos.test.js sitemap.xml
git commit -m "feat: connect functional fashion demo to gallery"
```

### Task 6: Verificação completa no navegador

**Files:**
- Modify if required: `modelos/loja-moda/index.html`
- Modify if required: `modelos/loja-moda/styles.css`
- Modify if required: `modelos/loja-moda/app.js`
- Modify: `docs/superpowers/plans/2026-07-18-loja-moda-funcional.md`

**Interfaces:**
- Consumes: aplicação local em `/modelos/loja-moda/`.
- Produces: evidência de funcionamento em 1280 px e 390 px.

- [ ] **Step 1: Executar toda a suíte relevante e verificação sintática**

```powershell
node --check modelos/loja-moda/app.js
node tests/loja-moda-funcional.test.js
node tests/galeria-modelos.test.js
npm test
npm run build
```

Expected: todos com código 0.

- [ ] **Step 2: Abrir servidor local e verificar no navegador**

Validar: título, dez cards, imagens carregadas, busca `vestido`, filtro `calçados`, abertura de produto, seleção de variações, adição, incremento, remoção, total, WhatsApp e retorno à galeria.

- [ ] **Step 3: Verificar responsividade**

Em 390 × 844, confirmar `body.scrollWidth <= document.documentElement.clientWidth`, menu utilizável, grid em uma coluna, modal e carrinho sem sobreposição.

- [ ] **Step 4: Verificar console e links**

Confirmar zero erros de console e HTTP local válido para `/galeria-modelos` e `/modelos/loja-moda/`.

- [ ] **Step 5: Registrar resultados no plano e executar verificação final**

Run: `git diff --check`
Expected: nenhuma saída e código 0.

- [ ] **Step 6: Commit de correções de verificação, se houver**

```powershell
git add -- modelos/loja-moda galeria-modelos.html tests/loja-moda-funcional.test.js tests/galeria-modelos.test.js sitemap.xml docs/superpowers/plans/2026-07-18-loja-moda-funcional.md
git commit -m "test: verify functional fashion demo"
```

## Dependência posterior

Publicação em produção, criação de domínio independente e atualização do Botpress exigem autorização específica após a demo local ser aprovada por Hélio.
