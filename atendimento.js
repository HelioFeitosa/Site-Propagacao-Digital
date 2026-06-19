(function () {
  'use strict';

  const WHATSAPP_NUMBER = '5591987137397';
  const STORAGE_KEY = 'pd-assistente-lead-v1';

  const services = {
    sites: {
      name: 'Criação de Sites Profissionais',
      path: '/criacao-de-sites-belem',
      pitch: 'um site profissional, preparado para Google, confiança e contatos pelo WhatsApp'
    },
    lojas: {
      name: 'Loja Virtual',
      path: '/lojas-virtuais',
      pitch: 'uma loja virtual organizada para apresentar produtos e facilitar pedidos ou pagamentos'
    },
    trafego: {
      name: 'Tráfego Pago Estratégico',
      path: '/trafego-pago',
      pitch: 'campanhas com oferta, página de destino e acompanhamento comercial'
    },
    seo: {
      name: 'SEO para Empresas',
      path: '/seo-para-empresas',
      pitch: 'uma estrutura para sua empresa ser encontrada por clientes no Google'
    },
    automacao: {
      name: 'Automação com IA',
      path: '/automacao-com-ia',
      pitch: 'automação de tarefas e atendimento para ganhar velocidade e reduzir trabalho repetitivo'
    },
    agentes: {
      name: 'Agente de Atendimento',
      path: '/agentes-de-atendimento',
      pitch: 'um agente inteligente para responder, qualificar e encaminhar clientes'
    },
    landing: {
      name: 'Landing Page',
      path: '/landing-pages',
      pitch: 'uma página de venda direta para transformar campanhas e visitas em conversas'
    },
    conteudo: {
      name: 'Vídeos e Artes',
      path: '/videos-e-artes',
      pitch: 'peças visuais profissionais para divulgar serviços, produtos e campanhas'
    }
  };

  const initialState = {
    step: 'name',
    name: '',
    business: '',
    goal: '',
    presence: '',
    urgency: '',
    investment: '',
    recommendation: '',
    score: 0,
    completed: false
  };

  let state = loadState();

  function loadState() {
    try {
      return { ...initialState, ...JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return { ...initialState };
    }
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function injectInterface() {
    const root = document.createElement('div');
    root.className = 'pd-assistant-root';
    root.innerHTML = `
      <button class="pd-assistant-launcher" type="button" aria-label="Abrir atendimento inteligente" aria-expanded="false">
        <span class="pd-assistant-launcher-mark">PD</span>
        <span class="pd-assistant-launcher-copy">
          <strong>Atendimento</strong>
          <small>Descubra a solução ideal</small>
        </span>
        <span class="pd-assistant-launcher-status" aria-hidden="true"></span>
      </button>

      <section class="pd-assistant" role="dialog" aria-modal="false" aria-label="Atendimento inteligente Propagação Digital" hidden>
        <header class="pd-assistant-header">
          <div class="pd-assistant-identity">
            <span class="pd-assistant-logo">PD</span>
            <span>
              <strong>Lia</strong>
              <small><i></i> Consultora digital online</small>
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
          <label class="sr-only" for="pd-assistant-input">Digite sua resposta</label>
          <input id="pd-assistant-input" autocomplete="off" maxlength="120" placeholder="Digite sua resposta..." />
          <button type="submit" aria-label="Enviar resposta">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 20.5 3l-5.8 18-3.2-7-8.5-2.5Zm8.5 2.5 9-11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
        <p class="pd-assistant-privacy">Suas respostas ficam neste navegador até você abrir o WhatsApp.</p>
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
  const progress = root.querySelector('.pd-assistant-progress span');

  function openAssistant() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-hidden');
    renderStep();
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
    state = { ...initialState };
    saveState();
    messages.innerHTML = '';
    options.innerHTML = '';
    renderGreeting();
  }

  function addMessage(text, type, allowHtml) {
    const message = document.createElement('div');
    message.className = `pd-assistant-message is-${type}`;
    message.innerHTML = allowHtml ? text : escapeHtml(text);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTyping(callback) {
    const typing = document.createElement('div');
    typing.className = 'pd-assistant-message is-bot pd-assistant-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    window.setTimeout(() => {
      typing.remove();
      callback();
      messages.scrollTop = messages.scrollHeight;
    }, 420);
  }

  function setOptions(items) {
    options.innerHTML = '';
    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.value = item.value;
      button.addEventListener('click', () => submitAnswer(item.value, item.label));
      options.appendChild(button);
    });
  }

  function setProgress(value) {
    progress.style.width = `${value}%`;
  }

  function renderGreeting() {
    setProgress(8);
    input.placeholder = 'Digite seu primeiro nome...';
    addMessage('Olá! Eu sou a Lia, consultora digital da Propagação Digital.', 'bot');
    addTyping(() => addMessage('Vou entender seu negócio e indicar a solução com maior potencial de resultado. Como posso chamar você?', 'bot'));
  }

  function renderStep() {
    options.innerHTML = '';

    if (!messages.children.length) {
      if (state.completed) {
        renderResult();
        return;
      }
      renderGreeting();
      return;
    }

    const steps = {
      business() {
        setProgress(24);
        input.placeholder = 'Ex.: clínica, loja, prestador de serviço...';
        addTyping(() => addMessage(`Prazer, ${state.name}. Qual é o tipo do seu negócio ou serviço?`, 'bot'));
      },
      goal() {
        setProgress(40);
        input.placeholder = 'Você também pode escrever seu objetivo...';
        addTyping(() => {
          addMessage('Qual resultado você mais quer conquistar agora?', 'bot');
          setOptions([
            { value: 'site', label: 'Ter um site profissional' },
            { value: 'vendas', label: 'Vender mais pela internet' },
            { value: 'google', label: 'Aparecer no Google' },
            { value: 'leads', label: 'Receber mais contatos' },
            { value: 'atendimento', label: 'Automatizar atendimento' },
            { value: 'conteudo', label: 'Melhorar vídeos e artes' }
          ]);
        });
      },
      presence() {
        setProgress(58);
        input.placeholder = 'Conte brevemente como está hoje...';
        addTyping(() => {
          addMessage('Como está sua presença digital hoje?', 'bot');
          setOptions([
            { value: 'nenhuma', label: 'Ainda não comecei' },
            { value: 'social', label: 'Só Instagram ou redes sociais' },
            { value: 'site-fraco', label: 'Tenho site, mas não gera contatos' },
            { value: 'anuncios', label: 'Já anuncio e quero melhorar' },
            { value: 'estrutura', label: 'Tenho estrutura e quero escalar' }
          ]);
        });
      },
      urgency() {
        setProgress(74);
        input.placeholder = 'Digite o prazo desejado...';
        addTyping(() => {
          addMessage('Quando você gostaria de colocar essa solução em funcionamento?', 'bot');
          setOptions([
            { value: 'imediato', label: 'O quanto antes' },
            { value: '30-dias', label: 'Nos próximos 30 dias' },
            { value: '60-dias', label: 'Em até 2 meses' },
            { value: 'pesquisa', label: 'Estou pesquisando' }
          ]);
        });
      },
      investment() {
        setProgress(88);
        input.placeholder = 'Você pode informar uma faixa diferente...';
        addTyping(() => {
          addMessage('Para eu indicar um caminho realista, qual faixa de investimento você considera?', 'bot');
          setOptions([
            { value: 'ate-1500', label: 'Até R$ 1.500' },
            { value: '1500-3000', label: 'R$ 1.500 a R$ 3.000' },
            { value: '3000-7000', label: 'R$ 3.000 a R$ 7.000' },
            { value: 'acima-7000', label: 'Acima de R$ 7.000' },
            { value: 'orientacao', label: 'Preciso de orientação' }
          ]);
        });
      }
    };

    if (steps[state.step]) steps[state.step]();
  }

  function normalizeGoal(value) {
    const text = value.toLowerCase();
    if (/(loja|e-?commerce|produto|vender online)/.test(text)) return 'vendas';
    if (/(site|página institucional|presença online)/.test(text)) return 'site';
    if (/(google|seo|busca|encontrad)/.test(text)) return 'google';
    if (/(anúncio|anuncio|tráfego|trafego|lead|contato|cliente)/.test(text)) return 'leads';
    if (/(automat|atendimento|agente|chat|whatsapp|ia)/.test(text)) return 'atendimento';
    if (/(arte|vídeo|video|design|conteúdo|conteudo|social)/.test(text)) return 'conteudo';
    return value;
  }

  function submitAnswer(value, visibleLabel) {
    const answer = value.trim();
    if (!answer) return;

    options.innerHTML = '';
    addMessage(visibleLabel || answer, 'user');
    input.value = '';

    switch (state.step) {
      case 'name':
        state.name = answer.split(' ')[0].slice(0, 30);
        state.step = 'business';
        break;
      case 'business':
        state.business = answer.slice(0, 100);
        state.step = 'goal';
        break;
      case 'goal':
        state.goal = normalizeGoal(answer);
        state.step = 'presence';
        break;
      case 'presence':
        state.presence = answer;
        state.step = 'urgency';
        break;
      case 'urgency':
        state.urgency = answer;
        state.step = 'investment';
        break;
      case 'investment':
        state.investment = answer;
        state.recommendation = recommendService();
        state.score = calculateScore();
        state.completed = true;
        state.step = 'result';
        break;
      default:
        return;
    }

    saveState();
    if (state.completed) renderResult();
    else renderStep();
  }

  function recommendService() {
    const goal = state.goal.toLowerCase();
    const presence = state.presence.toLowerCase();
    const business = state.business.toLowerCase();

    if (goal === 'atendimento') return /agente|whatsapp|responder|atendimento/.test(goal + business) ? 'agentes' : 'automacao';
    if (goal === 'google') return presence === 'nenhuma' || presence === 'social' ? 'sites' : 'seo';
    if (goal === 'conteudo') return 'conteudo';
    if (goal === 'site') return /produto|loja|varejo|e-?commerce/.test(business) ? 'lojas' : 'sites';
    if (goal === 'vendas') return /produto|loja|varejo|e-?commerce/.test(business) ? 'lojas' : 'landing';
    if (goal === 'leads') return presence === 'nenhuma' || presence === 'social' ? 'landing' : 'trafego';
    return 'sites';
  }

  function calculateScore() {
    let score = 35;
    if (state.urgency === 'imediato') score += 30;
    else if (state.urgency === '30-dias') score += 22;
    else if (state.urgency === '60-dias') score += 12;

    if (state.investment === 'acima-7000') score += 28;
    else if (state.investment === '3000-7000') score += 23;
    else if (state.investment === '1500-3000') score += 15;
    else if (state.investment === 'ate-1500') score += 7;
    else score += 10;

    if (state.presence === 'anuncios' || state.presence === 'estrutura') score += 7;
    return Math.min(score, 100);
  }

  function leadLabel() {
    if (state.score >= 80) return 'Prioridade alta';
    if (state.score >= 60) return 'Boa oportunidade';
    return 'Projeto em planejamento';
  }

  function answerLabel(key, value) {
    const labels = {
      goal: {
        site: 'Ter um site profissional',
        vendas: 'Vender mais pela internet',
        google: 'Aparecer no Google',
        leads: 'Receber mais contatos',
        atendimento: 'Automatizar atendimento',
        conteudo: 'Melhorar vídeos e artes'
      },
      presence: {
        nenhuma: 'Ainda não começou',
        social: 'Só redes sociais',
        'site-fraco': 'Site sem geração de contatos',
        anuncios: 'Já anuncia',
        estrutura: 'Estrutura pronta para escalar'
      },
      urgency: {
        imediato: 'O quanto antes',
        '30-dias': 'Próximos 30 dias',
        '60-dias': 'Até 2 meses',
        pesquisa: 'Em pesquisa'
      },
      investment: {
        'ate-1500': 'Até R$ 1.500',
        '1500-3000': 'R$ 1.500 a R$ 3.000',
        '3000-7000': 'R$ 3.000 a R$ 7.000',
        'acima-7000': 'Acima de R$ 7.000',
        orientacao: 'Precisa de orientação'
      }
    };
    return labels[key]?.[value] || value;
  }

  function buildWhatsappUrl() {
    const service = services[state.recommendation];
    const message = [
      `Olá, sou ${state.name}. Fiz a análise no site da Propagação Digital.`,
      '',
      `Negócio: ${state.business}`,
      `Objetivo: ${answerLabel('goal', state.goal)}`,
      `Situação atual: ${answerLabel('presence', state.presence)}`,
      `Prazo: ${answerLabel('urgency', state.urgency)}`,
      `Investimento considerado: ${answerLabel('investment', state.investment)}`,
      `Solução recomendada: ${service.name}`,
      `Qualificação: ${leadLabel()} (${state.score}/100)`,
      '',
      'Quero conversar sobre o melhor plano para começar.'
    ].join('\n');
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function renderResult() {
    options.innerHTML = '';
    setProgress(100);
    input.placeholder = 'Atendimento concluído';
    input.disabled = true;
    form.querySelector('button').disabled = true;

    const service = services[state.recommendation];
    addTyping(() => {
      addMessage(
        `<strong>${escapeHtml(state.name)}, encontrei o caminho mais indicado.</strong><br>Para o seu momento, recomendo <b>${escapeHtml(service.name)}</b>: ${escapeHtml(service.pitch)}.`,
        'bot',
        true
      );
      addMessage(
        `<div class="pd-assistant-result">
          <span class="pd-assistant-result-label">${leadLabel()}</span>
          <strong>${escapeHtml(service.name)}</strong>
          <p>Seu diagnóstico já está organizado. Ao continuar, o WhatsApp abrirá com todo o contexto para você não precisar explicar tudo novamente.</p>
          <a class="pd-assistant-whatsapp" href="${buildWhatsappUrl()}" target="_blank" rel="noopener">Continuar no WhatsApp</a>
          <a class="pd-assistant-service-link" href="${service.path}">Conhecer esta solução</a>
        </div>`,
        'bot',
        true
      );
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.completed) return;
    submitAnswer(input.value);
  });

  launcher.addEventListener('click', openAssistant);
  closeButton.addEventListener('click', closeAssistant);
  resetButton.addEventListener('click', () => {
    input.disabled = false;
    form.querySelector('button').disabled = false;
    resetAssistant();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) closeAssistant();
  });
})();
