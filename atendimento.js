(function () {
  'use strict';

  const WHATSAPP_NUMBER = '5591987137397';
  const STORAGE_KEY = 'pd-assistente-helio-v2';
  const VISITOR_KEY = 'pd-assistente-visitor-v1';
  const API_ENDPOINT = '/api/atendimento';
  const TYPING_APPEAR_DELAY_MS = 3000;
  const RESPONSE_DELAY_MS = 10000;

  const services = {
    sites: {
      name: 'Criação de Sites Profissionais',
      path: '/criacao-de-sites-belem',
      pitch: 'site profissional, preparado para Google, confiança e contatos pelo WhatsApp'
    },
    lojas: {
      name: 'Lojas Virtuais',
      path: '/lojas-virtuais',
      pitch: 'loja virtual com catálogo, pedidos, pagamento, frete e organização comercial'
    },
    trafego: {
      name: 'Tráfego Pago',
      path: '/trafego-pago',
      pitch: 'campanhas no Meta Ads e Google Ads com estratégia, página e acompanhamento'
    },
    seo: {
      name: 'SEO para Empresas',
      path: '/seo-para-empresas',
      pitch: 'estrutura para sua empresa aparecer quando o cliente procurar no Google'
    },
    automacao: {
      name: 'Automação com IA',
      path: '/automacao-com-ia',
      pitch: 'automações para reduzir tarefas repetitivas e acelerar processos'
    },
    agentes: {
      name: 'Agente de Atendimento',
      path: '/agentes-de-atendimento',
      pitch: 'atendente inteligente para responder, qualificar e encaminhar clientes'
    },
    landing: {
      name: 'Landing Pages',
      path: '/landing-pages',
      pitch: 'página direta para transformar anúncios, visitas e ofertas em conversas'
    },
    conteudo: {
      name: 'Vídeos e Artes',
      path: '/videos-e-artes',
      pitch: 'peças visuais profissionais para divulgar serviços, produtos e campanhas'
    }
  };

  const visualExamples = {
    fashion: {
      id: 'fashion',
      assetId: 'lume-modas-functional-demo',
      visual: '/img/modelos-lojas/loja-moda-print.jpg',
      image: '/img/modelos-lojas/loja-moda-print.jpg',
      path: '/modelos/loja-moda/',
      title: 'Lume Modas',
      classification: 'Demonstração funcional',
      visualStatus: 'ready',
      text: 'Loja de moda navegável, com catálogo, busca, favoritos, carrinho e pedido pelo WhatsApp.'
    }
  };

  const visuals = Object.values(visualExamples);
  const recognizedAssetIds = new Set(
    visuals.map((example) => example.assetId)
  );
  const shoeFallback = 'Ainda não tenho um modelo funcional específico de sapataria disponível aqui. Posso mostrar uma loja de moda semelhante, abrir nossa galeria ou encaminhar sua ideia para o Hélio.';
  const foodFallback = 'Ainda não tenho uma demonstração funcional específica de cardápio ou delivery disponível aqui. Posso abrir nossa galeria ou encaminhar sua ideia para o Hélio.';
  const genericVisualFallback = 'Ainda não tenho uma demonstração funcional específica para este segmento disponível aqui. Posso abrir nossa galeria ou encaminhar sua ideia para o Hélio.';
  const visualFailureCount = new Map();
  let lastVisualOpenAt = 0;

  const initialLead = {
    name: '',
    business: '',
    goal: '',
    service: '',
    urgency: '',
    budget: '',
    ready: false
  };

  function loadVisitorId() {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (/^[a-zA-Z0-9_-]{16,80}$/.test(saved || '')) return saved;

    const generated = window.crypto?.randomUUID
      ? window.crypto.randomUUID().replaceAll('-', '')
      : `pd${Date.now()}${Math.random().toString(36).slice(2, 18)}`;
    localStorage.setItem(VISITOR_KEY, generated);
    return generated;
  }

  function loadConversation() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      return {
        lead: { ...initialLead, ...(saved.lead || {}) },
        messages: Array.isArray(saved.messages) ? saved.messages : []
      };
    } catch {
      return { lead: { ...initialLead }, messages: [] };
    }
  }

  function saveConversation() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      lead,
      messages: chatMessages.slice(-24)
    }));
  }

  const visitorId = loadVisitorId();
  let { lead, messages: chatMessages } = loadConversation();
  let isSending = false;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function nl2br(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  function normalizeMatch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function isExplicitVisualRequest(value) {
    return /(imagem|foto|visual|mostra|mostrar|manda|mande|cade|cad[eê]|\bonde\b|onde esta|onde ficou|nao apareceu|nao esta aparecendo|quero ver|modelo|exemplo|loja pronta|site pronto|mockup|layout)/.test(normalizeMatch(value));
  }

  function injectInterface() {
    const root = document.createElement('div');
    root.className = 'pd-assistant-root';
    root.innerHTML = `
      <button class="pd-assistant-launcher" type="button" aria-label="Abrir atendimento inteligente" aria-expanded="false">
        <span class="pd-assistant-launcher-copy">
          <strong>Atendente Online: Hélio</strong>
        </span>
        <span class="pd-assistant-launcher-status" aria-hidden="true"></span>
      </button>

      <section class="pd-assistant" role="dialog" aria-modal="false" aria-label="Atendimento inteligente Propagação Digital" hidden>
        <header class="pd-assistant-header">
          <div class="pd-assistant-identity">
            <span class="pd-assistant-logo">PD</span>
            <span>
              <strong>Hélio</strong>
              <small><i></i> Consultor da Propagação Digital</small>
            </span>
          </div>
          <div class="pd-assistant-header-actions">
            <button class="pd-assistant-reset" type="button" title="Recomeçar atendimento" aria-label="Recomeçar atendimento">↻</button>
            <button class="pd-assistant-close" type="button" title="Fechar atendimento" aria-label="Fechar atendimento">×</button>
          </div>
        </header>

        <div class="pd-assistant-progress" aria-hidden="true"><span></span></div>
        <div class="pd-assistant-messages" aria-live="polite"></div>
        <div class="pd-assistant-options"></div>

        <form class="pd-assistant-form">
          <label class="sr-only" for="pd-assistant-input">Digite sua mensagem</label>
          <input id="pd-assistant-input" autocomplete="off" maxlength="480" placeholder="Digite sua mensagem..." />
          <button type="submit" aria-label="Enviar mensagem">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 20.5 3l-5.8 18-3.2-7-8.5-2.5Zm8.5 2.5 9-11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
        <p class="pd-assistant-privacy">O Hélio guarda um resumo comercial por até 12 meses para continuar seu atendimento. Para apagar, escreva “esqueça meus dados”.</p>
      </section>
    `;
    document.body.appendChild(root);
    return root;
  }

  const root = injectInterface();
  const launcher = root.querySelector('.pd-assistant-launcher');
  const panel = root.querySelector('.pd-assistant');
  const closeButton = root.querySelector('.pd-assistant-close');
  const resetButton = root.querySelector('.pd-assistant-reset');
  const messages = root.querySelector('.pd-assistant-messages');
  const options = root.querySelector('.pd-assistant-options');
  const form = root.querySelector('.pd-assistant-form');
  const input = root.querySelector('#pd-assistant-input');
  const submitButton = form.querySelector('button');
  const progress = root.querySelector('.pd-assistant-progress span');

  function greetingText() {
    return 'Olá! Sou o assistente virtual da Propagação Digital.\n Você está buscando um site, uma loja virtual\nou uma forma de divulgar melhor seu negócio?\nMe diga o que você precisa pra eu mostrar a melhor solução pra você !.';
  }

  function openAssistant() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-hidden');
    renderConversation();
    window.setTimeout(() => input.focus(), 250);
  }

  function closeAssistant() {
    panel.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      panel.hidden = true;
      launcher.classList.remove('is-hidden');
    }, 220);
  }

  function resetAssistant() {
    lead = { ...initialLead };
    chatMessages = [];
    visualFailureCount.clear();
    saveConversation();
    input.disabled = false;
    submitButton.disabled = false;
    renderConversation();
  }

  function addMessageToDom(text, type) {
    const message = document.createElement('div');
    message.className = `pd-assistant-message is-${type}`;
    message.innerHTML = nl2br(text);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function openVisualTarget(example) {
    const now = Date.now();
    if (now - lastVisualOpenAt < 900) return;
    lastVisualOpenAt = now;
    window.open(example.path, '_blank', 'noopener');
  }

  function handleVisualFailure(card, example) {
    const storedVisual = chatMessages.find((message) => (
      message.type === 'visual' && message.assetId === example.assetId
    ));
    const persistedFailures = Number(storedVisual?.failureCount) || 0;
    const failureCount = Math.max(
      visualFailureCount.get(example.assetId) || 0,
      persistedFailures
    ) + 1;
    visualFailureCount.set(example.assetId, failureCount);
    card.setAttribute('data-visual-status', 'failed');
    if (storedVisual) {
      storedVisual.visualStatus = 'failed';
      storedVisual.failureCount = failureCount;
      saveConversation();
    }

    const imageLink = card.querySelector('.pd-assistant-visual-image-link');
    if (imageLink) imageLink.hidden = true;

    const existingError = card.querySelector('.pd-assistant-visual-error');
    if (existingError) existingError.remove();

    const error = document.createElement('div');
    error.className = 'pd-assistant-visual-error';
    error.setAttribute('role', 'status');
    error.innerHTML = failureCount >= 2
      ? `<strong>Não foi possível carregar esta imagem.</strong>
         <p>Você ainda pode abrir a galeria ou conversar diretamente com o Hélio.</p>
         <span class="pd-assistant-visual-error-actions">
           <a href="/galeria-modelos">Abrir galeria</a>
           <a href="${escapeHtml(buildWhatsappUrl())}" target="_blank" rel="noopener">Continuar no WhatsApp</a>
         </span>`
      : `<strong>Não foi possível carregar a prévia.</strong>
         <p>O projeto continua disponível no botão “Abrir projeto”.</p>`;
    card.prepend(error);
  }

  function addVisualToDom(example, visualStatus = 'ready', presentationId = '') {
    if (!example || !recognizedAssetIds.has(example.assetId)) return null;

    const card = document.createElement('article');
    card.className = 'pd-assistant-visual';
    card.setAttribute('data-visual-card', example.id);
    card.setAttribute('data-asset-id', example.assetId);
    card.setAttribute('data-visual-status', visualStatus);
    if (presentationId) card.setAttribute('data-presentation-id', presentationId);
    card.innerHTML = `
      <a class="pd-assistant-visual-image-link" href="${escapeHtml(example.path)}" target="_blank" rel="noopener" aria-label="Abrir ${escapeHtml(example.title)}">
        <img src="${escapeHtml(example.visual)}" alt="Prévia da ${escapeHtml(example.title)}" loading="eager" />
      </a>
      <div>
        <span>${escapeHtml(example.classification)}</span>
        <strong>${escapeHtml(example.title)}</strong>
        <p>${escapeHtml(example.text)}</p>
        <a href="${escapeHtml(example.path)}" target="_blank" rel="noopener">Abrir projeto</a>
        <small>Você pode navegar pela demonstração em uma nova aba.</small>
      </div>
    `;
    const img = card.querySelector('img');
    img.addEventListener('load', () => {
      messages.scrollTop = messages.scrollHeight;
    }, { once: true });
    img.addEventListener('error', () => {
      handleVisualFailure(card, example);
    });
    card.querySelectorAll('.pd-assistant-visual-image-link, div > a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openVisualTarget(example);
      });
    });
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      openVisualTarget(example);
    });
    messages.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
    return card;
  }

  function renderConversation() {
    messages.innerHTML = '';
    options.innerHTML = '';

    if (!chatMessages.length) {
      chatMessages.push({ role: 'assistant', content: greetingText() });
      saveConversation();
    }

    chatMessages.forEach((message) => {
      if (message.type === 'visual') {
        const example = visualExamples[message.visualId];
        if (example && message.assetId === example.assetId) {
          addVisualToDom(example, message.visualStatus, message.presentationId);
        }
        return;
      }

      addMessageToDom(message.content, message.role === 'user' ? 'user' : 'bot');
    });

    updateProgress();
    renderActions();
  }

  function addTyping() {
    const typing = document.createElement('div');
    typing.className = 'pd-assistant-message is-bot pd-assistant-typing';
    typing.innerHTML = 'digitando<span class="pd-typing-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    return typing;
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function updateProgress() {
    let value = 12;
    if (lead.name) value += 18;
    if (lead.business) value += 18;
    if (lead.goal) value += 18;
    if (lead.service) value += 16;
    if (lead.urgency || lead.budget || lead.ready) value += 18;
    progress.style.width = `${Math.min(value, 100)}%`;
  }

  function renderActions() {
    options.innerHTML = '';

    const visualAction = getVisualContext('', '').example;
    if (visualAction) {
      addAction('Ver modelo visual', () => {
        showVisualForCurrentContext();
      });
    }

    const serviceAction = resolveServiceAction();
    if (serviceAction) {
      addAction(serviceAction.label, () => {
        window.location.href = serviceAction.path;
      });
    }

    if (lead.name || lead.business || lead.goal || lead.service) {
      addAction('Continuar no WhatsApp', () => {
        window.open(buildWhatsappUrl(), '_blank', 'noopener');
      });
    }
  }

  function addAction(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', handler);
    options.appendChild(button);
  }

  function getVisualContext(userText, replyText) {
    const currentUserText = normalizeMatch(userText);
    const combined = normalizeMatch([
      userText,
      replyText,
      lead.business,
      lead.goal,
      lead.product,
      lead.service
    ].filter(Boolean).join(' '));

    const explicitVisualRequest = isExplicitVisualRequest(currentUserText);
    const askedForVisual = explicitVisualRequest || /(cardapio|cardapio digital|loja virtual|site)/.test(combined);
    const hasContext = Boolean(lead.business || lead.product || lead.service);
    if (!askedForVisual && !hasContext) return { example: null, notice: '' };

    const isShoe = /(sapataria|sapato|calcado|calçado|tenis|tênis)/.test(combined);
    const isFashion = isShoe || /(roupa|moda|vestuario|vestuário|boutique)/.test(combined);
    const isFood = /(acai|açaí|comida|cardapio|cardápio|pizza|pizzaria|lanche|delivery|marmita|restaurante)/.test(combined);
    if (isFashion) {
      return {
        example: visualExamples.fashion,
        notice: isShoe ? shoeFallback : ''
      };
    }
    if (isFood) {
      return {
        example: null,
        notice: explicitVisualRequest ? foodFallback : ''
      };
    }

    return {
      example: null,
      notice: explicitVisualRequest ? genericVisualFallback : ''
    };
  }

  function selectVisualExample(userText, replyText) {
    return getVisualContext(userText, replyText).example;
  }

  function hasVisualBeenShown(assetId) {
    return chatMessages.some((message) => (
      message.type === 'visual' &&
      message.assetId === assetId &&
      message.visualStatus !== 'removed'
    ));
  }

  function presentVisualOnce(example) {
    if (!example || !recognizedAssetIds.has(example.assetId)) return null;

    const existingCard = messages.querySelector(`[data-asset-id="${example.assetId}"]`);
    if (existingCard || hasVisualBeenShown(example.assetId)) {
      const card = existingCard || messages.querySelector(`[data-visual-card="${example.id}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      card?.focus({ preventScroll: true });
      return card;
    }

    const presentationId = `${example.assetId}-${Date.now()}`;
    chatMessages.push({
      role: 'assistant',
      type: 'visual',
      visualId: example.id,
      assetId: example.assetId,
      presentationId,
      visual: example.visual,
      visualStatus: example.visualStatus,
      content: `Demonstração apresentada: ${example.title}`
    });
    const card = addVisualToDom(example, example.visualStatus, presentationId);
    saveConversation();
    return card;
  }

  function presentNoticeOnce(notice) {
    if (!notice) return;
    const alreadyShown = chatMessages.some((message) => (
      message.type === 'visual-notice' && message.content === notice
    ));
    if (alreadyShown) return;
    chatMessages.push({ role: 'assistant', type: 'visual-notice', content: notice });
    addMessageToDom(notice, 'bot');
  }

  function resolveServiceAction() {
    const context = normalizeMatch([
      lead.business,
      lead.goal,
      lead.product,
      lead.service
    ].filter(Boolean).join(' '));

    if (/(roupa|moda|vestuario|boutique|sapataria|sapato|calcado|tenis)/.test(context)) {
      return { label: 'Abrir demonstração de moda', path: '/modelos/loja-moda/' };
    }
    if (/(acai|comida|cardapio|pizza|pizzaria|lanche|delivery|marmita|restaurante)/.test(context)) {
      return { label: 'Conhecer a galeria', path: '/galeria-modelos' };
    }
    if (lead.service === 'lojas') {
      return { label: 'Ver página do serviço', path: '/lojas-virtuais' };
    }
    if (lead.service === 'sites' || /(site institucional|site profissional)/.test(context)) {
      return { label: 'Ver página do serviço', path: '/criacao-de-sites-belem' };
    }
    if (lead.service && services[lead.service]) {
      return { label: 'Ver página do serviço', path: services[lead.service].path };
    }
    return null;
  }

  function showVisualForCurrentContext() {
    const { example } = getVisualContext('quero ver uma imagem do modelo visual', '');
    if (example) presentVisualOnce(example);
    else messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }

  async function submitMessage(text) {
    const content = text.trim();
    if (!content || isSending) return;

    isSending = true;
    input.value = '';
    input.disabled = true;
    submitButton.disabled = true;
    options.innerHTML = '';

    chatMessages.push({ role: 'user', content });
    addMessageToDom(content, 'user');
    saveConversation();

    let typing = null;

    try {
      const resultPromise = askHelio();
      await wait(TYPING_APPEAR_DELAY_MS);
      typing = addTyping();
      const [resultStatus] = await Promise.allSettled([resultPromise, wait(RESPONSE_DELAY_MS)]);
      if (resultStatus.status === 'rejected') throw resultStatus.reason;
      const result = resultStatus.value;
      if (result.lead) lead = { ...lead, ...result.lead };
      const reply = result.reply || fallbackReply(content);
      chatMessages.push({ role: 'assistant', content: reply });
      if (typing) typing.remove();
      addMessageToDom(reply, 'bot');
      const visualContext = getVisualContext(content, reply);
      presentNoticeOnce(visualContext.notice);
      if (visualContext.example) presentVisualOnce(visualContext.example);
    } catch {
      const reply = fallbackReply(content);
      chatMessages.push({ role: 'assistant', content: reply });
      if (typing) typing.remove();
      addMessageToDom(reply, 'bot');
      const visualContext = getVisualContext(content, reply);
      presentNoticeOnce(visualContext.notice);
      if (visualContext.example) presentVisualOnce(visualContext.example);
    } finally {
      saveConversation();
      updateProgress();
      renderActions();
      input.disabled = false;
      submitButton.disabled = false;
      isSending = false;
      input.focus();
    }
  }

  async function askHelio() {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        lead,
        messages: chatMessages.slice(-18),
        page: document.title,
        path: window.location.pathname
      })
    });

    if (!response.ok) throw new Error('Atendimento indisponível');
    return response.json();
  }

  function cleanName(name) {
    const ignored = ['ola', 'olá', 'oi', 'opa', 'bom', 'boa', 'meu', 'nome', 'sou', 'eu', 'a', 'o'];
    const cleaned = String(name || '')
      .split(/\s+/)
      .map((part) => part.replace(/[^A-Za-zÀ-ÿ'-]/g, ''))
      .find((part) => part.length > 1 && !ignored.includes(part.toLowerCase())) || '';
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : '';
  }

  function updateLeadLocally(text) {
    const lower = text.toLowerCase();
    const nameMatch = text.match(/(?:meu nome (?:é|e|\?)|me chamo|eu sou|sou|aqui (?:é|e|\?)|nome (?:é|e|\?))\s+(?:a|o)?\s*([A-Za-zÀ-ÿ'-]{2,})/i);
    const correctionMatch = text.match(/(?:n(?:ão|ao|\?) .*?nome.*?(?:é|e|\?)|meu nome n(?:ão|ao|\?) .*?(?:é|e|\?).*?meu nome (?:é|e|\?)|nome correto (?:é|e|\?))\s+([A-Za-zÀ-ÿ'-]{2,})/i);
    const extractedName = cleanName((correctionMatch || nameMatch || [])[1]);

    if (extractedName) lead.name = extractedName;

    const serviceSignals = [
      ['agentes', /(atendente|atendimento|chatbot|chat|responder cliente|qualificar lead)/],
      ['automacao', /(automat|\bia\b|inteligência artificial|processo repetitivo)/],
      ['trafego', /(tráfego|trafego|anúncio|anuncio|ads|google ads|meta ads|facebook|instagram)/],
      ['seo', /(seo|google|busca|pesquisa|ranquear|aparecer)/],
      ['lojas', /(loja virtual|ecommerce|e-commerce|catálogo|catalogo|produto|vender online)/],
      ['landing', /(landing|página de venda|pagina de venda|capturar lead|whatsapp)/],
      ['conteudo', /(vídeo|video|arte|criativo|design|post|conteúdo|conteudo)/],
      ['sites', /(site|website|página profissional|pagina profissional|presença online)/]
    ];

    const found = serviceSignals.find(([, pattern]) => pattern.test(lower));
    if (found) {
      lead.service = found[0];
      lead.goal = services[found[0]].pitch;
    }

    if (!lead.business && lower.length > 18 && /(negócio|negocio|empresa|loja|clínica|clinica|serviço|servico|vendo|trabalho|quero)/.test(lower)) {
      lead.business = text.slice(0, 180);
    }

    if (/(urgente|hoje|agora|rápido|rapido|essa semana|quanto antes)/.test(lower)) lead.urgency = 'urgente';
    if (/r\$\s?\d|reais|orçamento|orcamento|investir|valor|preço|preco/.test(lower)) lead.budget = text.slice(0, 120);
  }

  function fallbackReply(text) {
    updateLeadLocally(text);

    if (/não.*nome|nome.*correto|meu nome é/i.test(text) && lead.name) {
      return `Perfeito, ${lead.name}. Corrigi aqui.\nAgora me conte: qual é o seu negócio e o que você quer melhorar primeiro?`;
    }

    if (/preço|preco|valor|quanto custa|orçamento|orcamento/i.test(text)) {
      return 'Consigo te orientar sim. O valor depende do tipo de solução, estrutura necessária e urgência.\nMe diga qual serviço você está buscando e como está sua empresa hoje, que eu te indico o caminho mais realista.';
    }

    if (/quais serviços|o que vocês fazem|serviços|servicos/i.test(text)) {
      return 'A Propagação Digital faz sites profissionais, lojas virtuais, landing pages, SEO, tráfego pago, automações com IA, agentes de atendimento, vídeos e artes.\nMe diga seu objetivo principal que eu te digo qual desses resolve melhor.';
    }

    if (!lead.name) {
      return 'Entendi. Antes de te orientar melhor, me diga seu nome, por favor.';
    }

    if (!lead.business) {
      return `Prazer, ${lead.name}.\nMe fale um pouco do seu negócio ou do objetivo que você quer alcançar. Pode escrever do seu jeito.`;
    }

    if (lead.service && services[lead.service]) {
      return `${lead.name}, pelo que você explicou, o caminho mais indicado parece ser ${services[lead.service].name}.\n${services[lead.service].pitch}.\nSe quiser, eu já posso abrir o WhatsApp com esse contexto organizado para você falar com a Propagação Digital.`;
    }

    return `${lead.name}, entendi. Para te indicar a solução certa, me diga o que pesa mais agora: aparecer no Google, vender mais, criar um site, melhorar atendimento ou automatizar processos?`;
  }

  function buildWhatsappUrl() {
    const service = lead.service && services[lead.service] ? services[lead.service].name : 'A definir';
    const transcript = chatMessages
      .filter((message) => message.role === 'user')
      .slice(-6)
      .map((message) => `- ${message.content}`)
      .join('\n');

    const message = [
      `Olá, sou ${lead.name || 'um visitante do site'}. Falei com o Hélio no site da Propagação Digital.`,
      '',
      `Nome: ${lead.name || 'Não informado'}`,
      `Negócio/objetivo: ${lead.business || lead.goal || 'Não informado'}`,
      `Solução indicada: ${service}`,
      `Urgência: ${lead.urgency || 'Não informada'}`,
      `Investimento/valor comentado: ${lead.budget || 'Não informado'}`,
      '',
      'Resumo do que eu expliquei:',
      transcript || '- Ainda vou explicar pelo WhatsApp.',
      '',
      'Quero continuar o atendimento.'
    ].join('\n');

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(input.value);
  });

  launcher.addEventListener('click', openAssistant);
  closeButton.addEventListener('click', closeAssistant);
  resetButton.addEventListener('click', resetAssistant);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) closeAssistant();
  });
})();
