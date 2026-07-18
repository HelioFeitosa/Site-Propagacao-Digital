(function lumeApp(global) {
  'use strict';

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function filterProducts(products, query, category) {
    const needle = normalizeText(query);
    return (Array.isArray(products) ? products : []).filter((product) => {
      const matchesCategory = !category || category === 'all' || product.category === category;
      const haystack = normalizeText(`${product.name} ${product.category} ${product.description}`);
      return matchesCategory && haystack.includes(needle);
    });
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  }

  function spritePosition(index) {
    const safeIndex = Math.max(0, Math.min(9, Number(index) || 0));
    const column = safeIndex % 5;
    const row = Math.floor(safeIndex / 5);
    return { x: column * 25, y: row * 100 };
  }

  function cartKey(item) {
    return `${String(item.productId || '')}::${String(item.size || '')}::${String(item.color || '')}`;
  }

  function validCartItem(item) {
    return item && item.productId && item.name && Number(item.price) >= 0 && item.size && item.color;
  }

  function addCartItem(cart, selection) {
    const current = Array.isArray(cart) ? cart.map((item) => ({ ...item })) : [];
    if (!validCartItem(selection)) return current;
    const key = cartKey(selection);
    const quantity = Math.max(1, Number(selection.quantity) || 1);
    const existing = current.find((item) => item.key === key);
    if (existing) existing.quantity += quantity;
    else current.push({ ...selection, key, price: Number(selection.price), quantity });
    return current;
  }

  function updateCartQuantity(cart, key, quantity) {
    const nextQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!nextQuantity) return removeCartItem(cart, key);
    return (Array.isArray(cart) ? cart : []).map((item) => item.key === key ? { ...item, quantity: nextQuantity } : { ...item });
  }

  function removeCartItem(cart, key) {
    return (Array.isArray(cart) ? cart : []).filter((item) => item.key !== key).map((item) => ({ ...item }));
  }

  function cartTotal(cart) {
    const total = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    return Math.round(total * 100) / 100;
  }

  function buildWhatsAppUrl(cart) {
    const items = (Array.isArray(cart) ? cart : []).filter(validCartItem);
    if (!items.length) return '';
    const lines = items.map((item) => {
      const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      return `- ${item.quantity}x ${item.name} | Tam. ${item.size} | ${item.color} | ${formatCurrency(subtotal)}`;
    });
    const message = [
      'Olá! Montei este pedido na demonstração Lume Moda da Propagação Digital:',
      '',
      ...lines,
      '',
      `Total demonstrativo: ${formatCurrency(cartTotal(items))}`,
      '',
      'Gostaria de conversar sobre uma loja virtual assim para o meu negócio.'
    ].join('\n');
    return `https://wa.me/5591987137397?text=${encodeURIComponent(message)}`;
  }

  function productVisual(product, className = 'product-visual') {
    const position = spritePosition(product.imageIndex);
    return `<div class="${className}" role="img" aria-label="${escapeHtml(product.name)}" style="--sheet-image:url('${escapeHtml(product.image)}');--sheet-x:${position.x}%;--sheet-y:${position.y}%"></div>`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initStore() {
    const products = Array.isArray(global.LUME_PRODUCTS) ? global.LUME_PRODUCTS : [];
    const grid = document.getElementById('product-grid');
    const search = document.getElementById('search-input');
    const filters = document.getElementById('category-filters');
    const status = document.getElementById('results-status');
    const empty = document.getElementById('empty-results');
    const clearSearch = document.getElementById('clear-search');
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('product-modal-content');
    const modalClose = document.getElementById('product-modal-close');
    const cartButton = document.getElementById('cart-button');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartClose = document.getElementById('cart-close');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCheckout = document.getElementById('cart-checkout');
    const cartHelp = document.getElementById('cart-help');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!grid || !search || !filters || !status || !empty || !clearSearch) return;

    let activeCategory = 'all';
    const storageKey = 'lume-moda-demo-cart-v1';
    let cart = [];

    try {
      const saved = JSON.parse(global.localStorage?.getItem(storageKey) || '[]');
      cart = Array.isArray(saved) ? saved.filter(validCartItem) : [];
    } catch (_) {
      cart = [];
    }
    const categories = [
      ['all', 'Toda coleção'],
      ['novidades', 'Novidades'],
      ['vestidos', 'Vestidos'],
      ['conjuntos', 'Conjuntos'],
      ['calcados', 'Calçados'],
      ['acessorios', 'Acessórios']
    ];

    filters.innerHTML = categories.map(([value, label]) => `<button type="button" data-category="${value}" aria-pressed="${value === 'all'}">${label}</button>`).join('');

    function render() {
      const visible = filterProducts(products, search.value, activeCategory);
      grid.innerHTML = visible.map((product) => `
        <article class="product-card" data-category="${escapeHtml(product.category)}">
          <button type="button" class="product-open" data-product-id="${escapeHtml(product.id)}" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
            ${productVisual(product)}
            ${product.featured ? '<span class="product-badge">Destaque</span>' : ''}
          </button>
          <div class="product-card-copy">
            <span>${escapeHtml(product.category)}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${formatCurrency(product.price)}</p>
            <button type="button" class="product-open-link" data-product-id="${escapeHtml(product.id)}">Ver detalhes</button>
          </div>
        </article>
      `).join('');
      status.textContent = `${visible.length} ${visible.length === 1 ? 'peça encontrada' : 'peças encontradas'}`;
      empty.hidden = visible.length !== 0;
      grid.hidden = visible.length === 0;
    }

    function saveCart() {
      try { global.localStorage?.setItem(storageKey, JSON.stringify(cart)); } catch (_) { /* Mantém o estado em memória. */ }
    }

    function renderCart() {
      if (!cartItems || !cartCount || !cartTotalElement || !cartCheckout || !cartHelp) return;
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = String(count);
      cartItems.innerHTML = cart.length ? cart.map((item) => `
        <article class="cart-item" data-cart-key="${escapeHtml(item.key)}">
          <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.size)} · ${escapeHtml(item.color)}</span><small>${formatCurrency(item.price)} cada</small></div>
          <div class="cart-item-actions">
            <button type="button" data-cart-action="decrease" aria-label="Diminuir quantidade de ${escapeHtml(item.name)}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" aria-label="Aumentar quantidade de ${escapeHtml(item.name)}">+</button>
            <button type="button" data-cart-action="remove">Remover</button>
          </div>
        </article>
      `).join('') : '<div class="cart-empty"><strong>Sua sacola está vazia</strong><p>Escolha uma peça para testar a experiência.</p></div>';
      cartTotalElement.textContent = formatCurrency(cartTotal(cart));
      cartCheckout.disabled = cart.length === 0;
      cartHelp.textContent = cart.length ? 'Você será levado ao WhatsApp com este resumo demonstrativo.' : 'Adicione uma peça para continuar.';
      saveCart();
    }

    function openCart() {
      if (!cartDrawer || !backdrop || !cartButton) return;
      cartDrawer.setAttribute('aria-hidden', 'false');
      cartButton.setAttribute('aria-expanded', 'true');
      backdrop.hidden = false;
      document.body.classList.add('drawer-open');
      cartClose?.focus();
    }

    function closeCart() {
      if (!cartDrawer || !backdrop || !cartButton) return;
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartButton.setAttribute('aria-expanded', 'false');
      backdrop.hidden = true;
      document.body.classList.remove('drawer-open');
    }

    function openProduct(productId) {
      if (!modal || !modalContent) return;
      const product = products.find((item) => item.id === productId);
      if (!product) return;
      modalContent.innerHTML = `
        <div class="product-modal-grid">
          ${productVisual(product, 'product-modal-visual')}
          <div class="product-modal-copy">
            <span>${escapeHtml(product.category)}</span>
            <h2>${escapeHtml(product.name)}</h2>
            <p>${escapeHtml(product.description)}</p>
            <strong>${formatCurrency(product.price)}</strong>
            <form id="product-selection-form">
              <label>Tamanho<select name="size" required>${product.sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join('')}</select></label>
              <label>Cor<select name="color" required>${product.colors.map((color) => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`).join('')}</select></label>
              <button type="submit">Adicionar à sacola</button>
            </form>
            <small>Produto e valor fictícios para demonstração.</small>
          </div>
        </div>`;
      const form = document.getElementById('product-selection-form');
      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);
        cart = addCartItem(cart, { productId: product.id, name: product.name, price: product.price, size: data.get('size'), color: data.get('color'), quantity: 1 });
        renderCart();
        modal.close();
        openCart();
      }, { once: true });
      modal.showModal();
    }

    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      activeCategory = button.dataset.category;
      filters.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      render();
    });
    search.addEventListener('input', render);
    clearSearch.addEventListener('click', () => {
      search.value = '';
      activeCategory = 'all';
      filters.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.category === 'all')));
      render();
      search.focus();
    });
    grid.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-product-id]');
      if (trigger) openProduct(trigger.dataset.productId);
    });
    modalClose?.addEventListener('click', () => modal.close());
    modal?.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });
    cartButton?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    backdrop?.addEventListener('click', closeCart);
    cartItems?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cart-action]');
      const itemElement = event.target.closest('[data-cart-key]');
      if (!button || !itemElement) return;
      const key = itemElement.dataset.cartKey;
      const item = cart.find((entry) => entry.key === key);
      if (!item) return;
      if (button.dataset.cartAction === 'increase') cart = updateCartQuantity(cart, key, item.quantity + 1);
      if (button.dataset.cartAction === 'decrease') cart = updateCartQuantity(cart, key, item.quantity - 1);
      if (button.dataset.cartAction === 'remove') cart = removeCartItem(cart, key);
      renderCart();
    });
    cartCheckout?.addEventListener('click', () => {
      const url = buildWhatsAppUrl(cart);
      if (url) global.open(url, '_blank', 'noopener,noreferrer');
    });
    render();
    renderCart();
  }

  const api = { normalizeText, filterProducts, formatCurrency, spritePosition, addCartItem, updateCartQuantity, removeCartItem, cartTotal, buildWhatsAppUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStore);
    else initStore();
  }
})(typeof window !== 'undefined' ? window : globalThis);
