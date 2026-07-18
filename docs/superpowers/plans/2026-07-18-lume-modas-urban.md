# Lume Modas Urban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar à loja funcional Lume Modas o visual azul, rosa e branco aprovado, com cabeçalho de e-commerce, carrossel acessível de três banners de roupas e rodapé profissional.

**Architecture:** A página estática existente continuará usando `index.html`, `styles.css`, `catalogo.js` e `app.js`. A lógica pura do carrossel será exportada por `app.js` para testes em Node; a inicialização no navegador controlará slides, setas, indicadores, pausa e movimento reduzido sem interferir no catálogo ou no carrinho.

**Tech Stack:** HTML5, CSS responsivo, JavaScript sem dependências, testes Node com `node:assert`.

## Global Constraints

- Nome exibido: **Lume Modas**.
- Paleta principal: azul-escuro, azul médio, rosa forte e branco.
- Exibir no mínimo três banners fotográficos distintos de roupas no mesmo espaço.
- Preservar busca, filtros, detalhes, tamanhos, cores, sacola persistente, total e WhatsApp.
- Nenhum pagamento real, perfil social, política publicada ou link externo será inventado.
- Número comercial: **55 91 98713-7397**.
- Não publicar em produção sem nova autorização de Hélio.

---

## File Structure

- `modelos/loja-moda/index.html`: estrutura do cabeçalho, navegação, três slides, catálogo e rodapé.
- `modelos/loja-moda/styles.css`: identidade Urban, responsividade e estados visuais do carrossel.
- `modelos/loja-moda/app.js`: catálogo/carrinho existentes e controlador do carrossel.
- `modelos/loja-moda/assets/banner-moda-1.jpg`: fotografia colorida de roupas do Banco de Ideias.
- `modelos/loja-moda/assets/banner-moda-2.jpg`: fotografia escura de boutique do Banco de Ideias.
- `modelos/loja-moda/assets/banner-moda-3.png`: composição de produtos da coleção Lume.
- `tests/loja-moda-funcional.test.js`: contrato estrutural e testes unitários.

### Task 1: Cabeçalho Urban e contrato estrutural

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Modify: `modelos/loja-moda/index.html`

**Interfaces:**
- Consumes: IDs existentes `search-input`, `cart-button` e `cart-count`.
- Produces: `.commerce-header`, `.commerce-search`, `.commerce-nav` e seis links de categorias.

- [ ] **Step 1: Write the failing structural test**

Adicionar ao teste:

```js
assert.match(html, /Lume Modas/i);
assert.match(html, /class="commerce-header"/);
assert.match(html, /class="commerce-search"/);
assert.match(html, /class="commerce-nav"/);
for (const label of ['Feminino', 'Masculino', 'Calçados', 'Acessórios', 'Promoções', 'Contato']) {
  assert.match(html, new RegExp(label, 'i'));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/loja-moda-funcional.test.js`

Expected: FAIL porque `commerce-header` ainda não existe.

- [ ] **Step 3: Implement the header markup**

Substituir o cabeçalho atual por:

```html
<header class="commerce-header">
  <a class="store-logo" href="#inicio" aria-label="Lume Modas, início">LUME MODAS</a>
  <label class="commerce-search" for="search-input"><span class="sr-only">Buscar produtos</span><input id="search-input" type="search" placeholder="Digite o que procura" autocomplete="off" /></label>
  <button id="cart-button" type="button" aria-controls="cart-drawer" aria-expanded="false">Sacola <span id="cart-count">0</span></button>
</header>
<nav class="commerce-nav" aria-label="Categorias principais">
  <a href="#produtos" data-nav-category="feminino">Feminino</a><a href="#produtos" data-nav-category="masculino">Masculino</a><a href="#produtos" data-nav-category="calcados">Calçados</a><a href="#produtos" data-nav-category="acessorios">Acessórios</a><a href="#produtos" data-nav-category="novidades">Promoções</a><a href="#rodape">Contato</a>
</nav>
```

Remover o segundo campo de busca do cabeçalho do catálogo para manter apenas um `#search-input`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/loja-moda-funcional.test.js`

Expected: `Loja Lume Moda structural tests passed.`

- [ ] **Step 5: Commit**

```powershell
git add -- modelos/loja-moda/index.html tests/loja-moda-funcional.test.js
git commit -m "feat: add Lume Modas commerce header"
```

### Task 2: Carrossel acessível de três banners

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Modify: `modelos/loja-moda/index.html`
- Modify: `modelos/loja-moda/app.js`
- Create: `modelos/loja-moda/assets/banner-moda-1.jpg`
- Create: `modelos/loja-moda/assets/banner-moda-2.jpg`
- Create: `modelos/loja-moda/assets/banner-moda-3.png`

**Interfaces:**
- Consumes: `data-carousel-slide`, `data-carousel-dot`, `#carousel-prev`, `#carousel-next`.
- Produces: `normalizeSlideIndex(index: number, length: number): number` e `nextSlideIndex(index: number, length: number, direction?: number): number`.

- [ ] **Step 1: Write failing carousel tests**

Adicionar:

```js
assert.equal((html.match(/data-carousel-slide/g) || []).length, 3);
assert.match(html, /id="carousel-prev"/);
assert.match(html, /id="carousel-next"/);
assert.equal((html.match(/data-carousel-dot/g) || []).length, 3);

const { normalizeSlideIndex, nextSlideIndex } = require('../modelos/loja-moda/app.js');
assert.equal(normalizeSlideIndex(-1, 3), 2);
assert.equal(normalizeSlideIndex(3, 3), 0);
assert.equal(nextSlideIndex(1, 3, 1), 2);
assert.equal(nextSlideIndex(0, 3, -1), 2);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/loja-moda-funcional.test.js`

Expected: FAIL porque não existem três slides e `normalizeSlideIndex` não foi exportada.

- [ ] **Step 3: Copy the approved assets**

Copiar sem alterar os originais:

```powershell
Copy-Item -LiteralPath 'img/modelos-lojas/stock-moda-1.jpg' -Destination 'modelos/loja-moda/assets/banner-moda-1.jpg'
Copy-Item -LiteralPath 'img/modelos-lojas/stock-moda-2.jpg' -Destination 'modelos/loja-moda/assets/banner-moda-2.jpg'
Copy-Item -LiteralPath 'modelos/loja-moda/assets/lume-products-sheet.png' -Destination 'modelos/loja-moda/assets/banner-moda-3.png'
```

- [ ] **Step 4: Add the three-slide HTML**

Usar esta estrutura dentro de `#inicio`:

```html
<section class="fashion-carousel" aria-roledescription="carrossel" aria-label="Destaques da Lume Modas">
  <article class="fashion-slide is-active" data-carousel-slide aria-hidden="false" style="--banner:url('assets/banner-moda-1.jpg')"><div><span>Coleção Lume</span><h1>Moda, calçados e acessórios</h1><p>Escolha suas peças favoritas e monte seu pedido pelo WhatsApp.</p><a href="#produtos">Ver ofertas</a></div></article>
  <article class="fashion-slide" data-carousel-slide aria-hidden="true" style="--banner:url('assets/banner-moda-2.jpg')"><div><span>Novos estilos</span><h2>Looks para todos os momentos</h2><p>Descubra cores, tamanhos e combinações.</p><a href="#produtos">Conhecer novidades</a></div></article>
  <article class="fashion-slide" data-carousel-slide aria-hidden="true" style="--banner:url('assets/banner-moda-3.png')"><div><span>Compra simples</span><h2>Sua seleção pronta no WhatsApp</h2><p>Monte a sacola e envie o resumo para atendimento.</p><a href="#produtos">Montar sacola</a></div></article>
  <button id="carousel-prev" type="button" aria-label="Banner anterior">‹</button><button id="carousel-next" type="button" aria-label="Próximo banner">›</button>
  <div class="carousel-dots"><button type="button" data-carousel-dot="0" aria-label="Mostrar banner 1" aria-current="true"></button><button type="button" data-carousel-dot="1" aria-label="Mostrar banner 2"></button><button type="button" data-carousel-dot="2" aria-label="Mostrar banner 3"></button></div>
</section>
```

- [ ] **Step 5: Implement pure carousel functions and browser controller**

Adicionar antes de `initStore`:

```js
function normalizeSlideIndex(index, length) {
  if (!Number.isInteger(length) || length <= 0) return 0;
  return ((Number(index) % length) + length) % length;
}

function nextSlideIndex(index, length, direction = 1) {
  return normalizeSlideIndex(Number(index) + Number(direction || 1), length);
}
```

Dentro de `initStore`, selecionar slides, setas e bolinhas; criar `showSlide(index)` que alterna `is-active`, `aria-hidden` e `aria-current`. Iniciar intervalo de 6000 ms apenas quando `matchMedia('(prefers-reduced-motion: reduce)').matches` for falso; parar em `mouseenter`/`focusin` e reiniciar em `mouseleave`/`focusout`. Exportar as duas funções no objeto `api`.

- [ ] **Step 6: Run test to verify it passes**

Run: `node tests/loja-moda-funcional.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- modelos/loja-moda/index.html modelos/loja-moda/app.js modelos/loja-moda/assets/banner-moda-1.jpg modelos/loja-moda/assets/banner-moda-2.jpg modelos/loja-moda/assets/banner-moda-3.png tests/loja-moda-funcional.test.js
git commit -m "feat: add three-banner fashion carousel"
```

### Task 3: Rodapé profissional e identidade Urban

**Files:**
- Modify: `tests/loja-moda-funcional.test.js`
- Modify: `modelos/loja-moda/index.html`
- Modify: `modelos/loja-moda/styles.css`

**Interfaces:**
- Consumes: estrutura e classes das Tasks 1 e 2.
- Produces: `#rodape`, `.footer-grid`, `.payment-strip` e layout responsivo completo.

- [ ] **Step 1: Write the failing footer/style test**

Adicionar:

```js
assert.match(html, /id="rodape"/);
assert.match(html, /Formas de pagamento/i);
assert.match(html, /Compra protegida/i);
assert.match(html, /Atendimento/i);
assert.match(html, /Política de privacidade/i);
assert.match(html, /Demonstração criada pela Propagação Digital/i);
assert.match(css, /--urban-blue:/);
assert.match(css, /--urban-pink:/);
assert.match(css, /@media \(max-width: 640px\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/loja-moda-funcional.test.js`

Expected: FAIL porque `#rodape` e as novas variáveis ainda não existem.

- [ ] **Step 3: Add complete footer markup**

Substituir o rodapé simples por:

```html
<footer class="store-footer" id="rodape">
  <div class="footer-grid"><section><h2>Lume Modas</h2><p>Modelo funcional de loja virtual criado para demonstrar uma experiência real de compra.</p></section><section><h3>Compre</h3><a href="#produtos">Feminino</a><a href="#produtos">Masculino</a><a href="#produtos">Calçados</a><a href="#produtos">Acessórios</a></section><section><h3>Atendimento</h3><a href="https://wa.me/5591987137397">WhatsApp comercial</a><span>Trocas e devoluções · demonstração</span><span>Política de privacidade · demonstração</span></section><section><h3>Projeto</h3><a href="/galeria-modelos">Voltar à Galeria de Modelos</a><span>Redes sociais · demonstração</span></section></div>
  <div class="payment-strip"><span><strong>Formas de pagamento</strong> Pix, cartão e boleto · demonstração</span><span><strong>Compra protegida</strong> Nenhum pagamento real é processado</span></div>
  <p class="footer-credit">Demonstração criada pela Propagação Digital.</p>
</footer>
```

- [ ] **Step 4: Replace visual tokens and responsive CSS**

Definir:

```css
:root { --urban-navy:#153a62; --urban-blue:#075f9a; --urban-pink:#df2678; --urban-paper:#f4f7fb; --urban-ink:#26384c; }
```

Estilizar `.commerce-header`, `.commerce-nav`, `.fashion-carousel`, `.fashion-slide`, controles, cards e `.store-footer`. Em `@media (max-width: 640px)`, usar cabeçalho em grade, busca em linha inteira, navegação rolável, slides com altura mínima de 430 px, produtos em duas colunas e rodapé em uma coluna. Garantir `max-width:100%` e `overflow-x:hidden` apenas no corpo, sem esconder a rolagem interna do menu.

- [ ] **Step 5: Run the tests**

Run: `node tests/loja-moda-funcional.test.js && node tests/galeria-modelos.test.js`

Expected: ambos PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- modelos/loja-moda/index.html modelos/loja-moda/styles.css tests/loja-moda-funcional.test.js
git commit -m "feat: finish Urban fashion storefront design"
```

### Task 4: Browser and regression verification

**Files:**
- Modify only if a failing verification reveals a defect, always after adding a reproducing test.

**Interfaces:**
- Consumes: completed Lume Modas demo.
- Produces: verification evidence, no new production interface.

- [ ] **Step 1: Run full automated verification**

```powershell
node --check modelos/loja-moda/app.js
node tests/loja-moda-funcional.test.js
node tests/galeria-modelos.test.js
node tests/helio-v1-0-4.test.js
npm test
npm run build
git diff --check
```

Expected: exit code 0 for every command.

- [ ] **Step 2: Verify desktop in a browser**

At 1280 px, confirm the two header bands, exactly three slides, next/previous buttons, dots, automatic advance, pause on hover, ten product cards, product modal, cart total and WhatsApp destination.

- [ ] **Step 3: Verify mobile in a browser**

At 390 x 844, confirm readable logo/search/cart, scrollable category navigation, banner crop, controls, two-column products, single-column footer and `document.body.scrollWidth <= document.documentElement.clientWidth`.

- [ ] **Step 4: Inspect browser errors**

Confirm no console error is emitted while loading, changing slides, searching, opening a product, adding to cart and removing it.

- [ ] **Step 5: Final scoped commit if verification required fixes**

```powershell
git add -- modelos/loja-moda tests/loja-moda-funcional.test.js tests/galeria-modelos.test.js
git commit -m "fix: polish Lume Modas responsive experience"
```

Do not create this commit when verification required no changes.
