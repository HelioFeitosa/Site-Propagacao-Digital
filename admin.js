(function () {
  'use strict';

  const TOKEN_KEY = 'pd-admin-token-v1';
  const WHATSAPP_NUMBER = '5591987137397';

  const login = document.querySelector('#adminLogin');
  const content = document.querySelector('#adminContent');
  const form = document.querySelector('#adminTokenForm');
  const tokenInput = document.querySelector('#adminToken');
  const leadsRoot = document.querySelector('#adminLeads');
  const servicesRoot = document.querySelector('#adminServices');
  const refreshButton = document.querySelector('#refreshLeads');

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function serviceName(key) {
    const names = {
      sites: 'Criação de Sites',
      lojas: 'Loja Virtual',
      trafego: 'Tráfego Pago',
      seo: 'SEO',
      automacao: 'Automação com IA',
      agentes: 'Agente de Atendimento',
      landing: 'Landing Page',
      conteudo: 'Vídeos e Artes'
    };
    return names[key] || key || 'A definir';
  }

  function whatsappUrl(lead) {
    const text = [
      `Olá, aqui é o Hélio da Propagação Digital.`,
      ``,
      `Vi seu atendimento no site e já tenho esse resumo:`,
      `Nome: ${lead.name || 'não informado'}`,
      `Negócio: ${lead.business || 'não informado'}`,
      `Produto/serviço: ${lead.product || 'não informado'}`,
      `Objetivo: ${lead.goal || 'não informado'}`,
      `Solução indicada: ${serviceName(lead.service)}`,
      ``,
      `Podemos continuar por aqui?`
    ].join('\n');

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  function renderLeads(leads) {
    if (!leads.length) {
      leadsRoot.innerHTML = '<p class="admin-empty">Ainda não há leads salvos na memória.</p>';
      return;
    }

    leadsRoot.innerHTML = leads.map((lead) => `
      <article class="admin-lead">
        <div>
          <strong>${escapeHtml(lead.name || 'Lead sem nome')}</strong>
          <span>${escapeHtml(lead.business || lead.product || 'Negócio não informado')}</span>
        </div>
        <dl>
          <div><dt>Solução</dt><dd>${escapeHtml(serviceName(lead.service))}</dd></div>
          <div><dt>Canal</dt><dd>${escapeHtml(lead.channel || 'A definir')}</dd></div>
          <div><dt>Urgência</dt><dd>${escapeHtml(lead.urgency || 'A definir')}</dd></div>
          <div><dt>Atualizado</dt><dd>${escapeHtml(lead.updatedAt ? new Date(lead.updatedAt).toLocaleString('pt-BR') : 'Sem data')}</dd></div>
        </dl>
        <p>${escapeHtml(lead.summary || 'Sem resumo salvo.')}</p>
        <a class="btn-primary" href="${whatsappUrl(lead)}" target="_blank" rel="noopener">Assumir no WhatsApp</a>
      </article>
    `).join('');
  }

  function renderServices(services) {
    servicesRoot.innerHTML = services.map((service) => `
      <article class="admin-service">
        <strong>${escapeHtml(service.name)}</strong>
        <p>${escapeHtml(service.scope)}</p>
        <small>Prazo: ${escapeHtml(service.deadline)}</small>
        <small>Negociação: ${escapeHtml(service.negotiation)}</small>
        <small>Upsell: ${escapeHtml(service.upsell)}</small>
      </article>
    `).join('');
  }

  async function loadData(token) {
    leadsRoot.innerHTML = '<p class="admin-empty">Carregando leads...</p>';
    const response = await fetch('/api/admin-leads', {
      headers: { 'x-admin-token': token }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o painel.');

    login.hidden = true;
    content.hidden = false;
    renderLeads(data.leads || []);
    renderServices(data.services || []);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) return;
    sessionStorage.setItem(TOKEN_KEY, token);
    try {
      await loadData(token);
    } catch (error) {
      leadsRoot.innerHTML = '';
      alert(error.message);
    }
  });

  refreshButton.addEventListener('click', () => {
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    if (token) loadData(token).catch((error) => alert(error.message));
  });

  const savedToken = sessionStorage.getItem(TOKEN_KEY);
  if (savedToken) loadData(savedToken).catch(() => sessionStorage.removeItem(TOKEN_KEY));
})();
