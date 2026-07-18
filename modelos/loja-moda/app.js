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
    if (!grid || !search || !filters || !status || !empty || !clearSearch) return;

    let activeCategory = 'all';
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
    render();
  }

  const api = { normalizeText, filterProducts, formatCurrency, spritePosition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStore);
    else initStore();
  }
})(typeof window !== 'undefined' ? window : globalThis);
