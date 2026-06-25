const { getRedis } = require('../lib/client-memory');

const services = [
  {
    name: 'Comecar rapido',
    scope: 'Pagina simples, WhatsApp, SEO basico e oferta clara.',
    deadline: '3 a 7 dias',
    negotiation: 'Ideal para cliente pequeno que quer vender logo.',
    upsell: 'Adicionar trafego local e cardapio digital.'
  },
  {
    name: 'Vender todos os dias',
    scope: 'Pagina de venda, funil para WhatsApp, SEO local, tracking e campanha.',
    deadline: '7 a 15 dias',
    negotiation: 'Melhor pacote para negocio que ja vende e quer acelerar.',
    upsell: 'Adicionar atendente inteligente e automacao.'
  },
  {
    name: 'Estrutura completa',
    scope: 'Site/loja, atendente IA, memoria de cliente, SEO, campanhas e painel.',
    deadline: '15 a 30 dias',
    negotiation: 'Para cliente que quer uma estrutura profissional de verdade.',
    upsell: 'Manutencao mensal, conteudo e gestao de trafego.'
  }
];

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function tokenFrom(req) {
  const header = req.headers['x-admin-token'];
  const url = new URL(req.url || '/', 'https://propagacaodigital.com');
  return String(header || url.searchParams.get('token') || '').trim();
}

function cleanRecord(record) {
  const lead = record?.lead || {};
  return {
    visitorId: record?.visitorId || '',
    name: record?.name || lead.name || '',
    business: lead.business || lead.businessType || record?.businessSearchText || '',
    product: lead.productDetail || lead.product || '',
    service: lead.service || '',
    goal: lead.salesGoal || lead.goal || '',
    channel: lead.channel || '',
    location: lead.location || '',
    urgency: lead.urgency || '',
    stage: lead.stage || '',
    summary: record?.summary || '',
    updatedAt: record?.updatedAt || ''
  };
}

async function scanClientIds(redis) {
  const ids = new Set(await redis.smembers('pd:clients').catch(() => []));
  let cursor = 0;

  for (let round = 0; round < 8; round += 1) {
    const result = await redis.scan(cursor, { match: 'pd:client:*', count: 50 }).catch(() => null);
    if (!Array.isArray(result)) break;
    cursor = Number(result[0] || 0);
    for (const key of result[1] || []) ids.add(String(key).replace('pd:client:', ''));
    if (!cursor) break;
  }

  return [...ids].slice(0, 100);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Metodo nao permitido' });

  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return sendJson(res, 503, {
      error: 'ADMIN_TOKEN nao configurado',
      setup: 'Configure ADMIN_TOKEN no Vercel para ativar o painel.'
    });
  }

  if (tokenFrom(req) !== expected) {
    return sendJson(res, 401, { error: 'Acesso nao autorizado' });
  }

  const redis = getRedis();
  if (!redis) return sendJson(res, 503, { error: 'Memoria de clientes indisponivel' });

  const ids = await scanClientIds(redis);
  const records = [];

  for (const id of ids) {
    const record = await redis.get(`pd:client:${id}`).catch(() => null);
    if (record) records.push(cleanRecord(record));
  }

  records.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return sendJson(res, 200, {
    leads: records.slice(0, 60),
    services,
    updatedAt: new Date().toISOString()
  });
};
