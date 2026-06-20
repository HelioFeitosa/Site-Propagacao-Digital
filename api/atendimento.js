const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

const rateLimit = new Map();

const services = {
  sites: 'Criação de Sites Profissionais',
  lojas: 'Lojas Virtuais',
  trafego: 'Tráfego Pago',
  seo: 'SEO para Empresas',
  automacao: 'Automação com IA',
  agentes: 'Agente de Atendimento',
  landing: 'Landing Pages',
  conteudo: 'Vídeos e Artes'
};

const serviceSignals = [
  ['agentes', /(atendente|atendimento|chatbot|chat|responder cliente|qualificar lead|whatsapp)/i],
  ['automacao', /(automat|ia|inteligência artificial|processo repetitivo|sistema)/i],
  ['trafego', /(tráfego|trafego|anúncio|anuncio|ads|google ads|meta ads|facebook|instagram|campanha)/i],
  ['seo', /(seo|google|busca|pesquisa|ranquear|aparecer|topo)/i],
  ['lojas', /(loja virtual|ecommerce|e-commerce|catálogo|catalogo|produto|vender online|pagamento|frete)/i],
  ['landing', /(landing|página de venda|pagina de venda|capturar lead|oferta|conversão|conversao)/i],
  ['conteudo', /(vídeo|video|arte|criativo|design|post|conteúdo|conteudo|social media)/i],
  ['sites', /(site|website|página profissional|pagina profissional|presença online|presenca online)/i]
];

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local')
    .split(',')[0]
    .trim();
}

function isRateLimited(req) {
  const ip = getIp(req);
  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, resetAt: now + 60_000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }

  entry.count += 1;
  rateLimit.set(ip, entry);
  return entry.count > 24;
}

function readBody(req) {
  if (req.body) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 24_000) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function cleanText(value, max = 800) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanName(value) {
  const ignored = new Set(['ola', 'olá', 'oi', 'opa', 'bom', 'boa', 'meu', 'nome', 'sou', 'eu']);
  return cleanText(value, 80)
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-zÀ-ÿ'-]/g, ''))
    .find((part) => part.length > 1 && !ignored.has(part.toLowerCase())) || '';
}

function updateLead(lead, messages) {
  const next = { ...(lead || {}) };
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const allUserText = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n');

  const namePatterns = [
    /(?:n(?:ão|ao|\?) .*?nome.*?(?:é|e|\?)|meu nome n(?:ão|ao|\?) .*?(?:é|e|\?).*?meu nome (?:é|e|\?)|nome correto (?:é|e|\?)|corrigindo.*?nome.*?(?:é|e|\?))\s+([A-Za-zÀ-ÿ'-]{2,})/i,
    /(?:meu nome (?:é|e|\?)|me chamo|sou|aqui (?:é|e|\?)|nome (?:é|e|\?))\s+([A-Za-zÀ-ÿ'-]{2,})/i,
    /(?:olá|ola|oi|opa),?\s*(?:meu nome é|me chamo|sou)?\s*([A-Za-zÀ-ÿ'-]{2,})/i
  ];
  const extractedName = cleanName((namePatterns.map((pattern) => lastUser.match(pattern)).find(Boolean) || [])[1]);
  if (process.env.PD_DEBUG_ASSISTANT === '1') {
    console.log('[pd-debug-name]', { lastUser, extractedName });
  }
  if (extractedName) next.name = extractedName;

  const foundService = serviceSignals.find(([, pattern]) => pattern.test(allUserText));
  if (foundService) next.service = foundService[0];

  if (!next.goal && foundService) next.goal = services[foundService[0]];
  if (/(urgente|hoje|agora|rápido|rapido|essa semana|quanto antes)/i.test(allUserText)) next.urgency = 'urgente';

  const budgetMatch = allUserText.match(/(?:r\$\s?\d[\d.,]*|até\s?r?\$?\s?\d[\d.,]*|orçamento.*|orcamento.*|investir.*|valor.*|preço.*|preco.*)/i);
  if (budgetMatch) next.budget = cleanText(budgetMatch[0], 120);

  const businessCandidate = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .find((text) => text.length > 24 && /(negócio|negocio|empresa|loja|clínica|clinica|serviço|servico|vendo|trabalho|objetivo|quero|preciso)/i.test(text));
  if (businessCandidate) next.business = cleanText(businessCandidate, 180);

  if (next.name && (next.business || next.goal || next.service)) next.ready = true;
  return next;
}

function buildInstructions(lead, page, path) {
  return `
Você é Hélio, consultor da Propagação Digital.
Você conversa em português do Brasil com clientes que chegam pelo site.

Objetivo:
- Conversar de forma natural, inteligente e humana.
- Entender o nome, negócio, objetivo, urgência e melhor solução.
- Responder qualquer pergunta sobre os serviços sem parecer robô de script.
- Corrigir informações quando o cliente corrigir. Exemplo: se ele disser "não, meu nome é Junior", aceite Junior e não continue chamando de Olá.
- Conduzir para WhatsApp somente quando fizer sentido, sem pressão.

Serviços da Propagação Digital:
- Criação de Sites Profissionais: sites modernos, responsivos, preparados para SEO e WhatsApp.
- Lojas Virtuais: catálogo, produtos, pedidos, pagamentos, frete, estoque e integrações.
- Landing Pages: páginas diretas para campanhas, ofertas e conversão no WhatsApp.
- SEO para Empresas: estrutura para aparecer no Google por serviços e localização.
- Tráfego Pago: Meta Ads e Google Ads com estratégia e otimização.
- Automação com IA: processos, fluxos, produtividade e integração.
- Agente de Atendimento: atendente inteligente para responder, qualificar leads e encaminhar vendas.
- Vídeos e Artes: criativos, posts, peças e materiais visuais.

Tom:
- Amigável, profissional, claro e direto.
- Use frases curtas e quebras de linha quando ajudar a leitura.
- Pode usar um emoji leve ocasionalmente, sem exagero.
- Não invente preço fechado. Explique que depende do escopo e colete contexto.
- Não diga que é IA, modelo, API ou sistema.
- Se não souber algo externo, diga que pode confirmar no WhatsApp com a equipe.

Estado atual do lead:
Nome: ${lead.name || 'não informado'}
Negócio/objetivo: ${lead.business || lead.goal || 'não informado'}
Serviço provável: ${lead.service ? services[lead.service] : 'não definido'}
Urgência: ${lead.urgency || 'não informada'}
Investimento/valor citado: ${lead.budget || 'não informado'}
Página atual: ${page || path || 'site'}

Responda apenas a próxima mensagem do Hélio, em texto natural. Não use JSON.
`.trim();
}

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
      if (content.type === 'text' && content.text) parts.push(content.text);
    }
  }

  return parts.join('\n').trim();
}

async function callOpenAI(messages, lead, page, path) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: buildInstructions(lead, page, path),
      input: messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      })),
      max_output_tokens: 380,
      store: false
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Falha na IA');
  }

  return extractText(data);
}

function fallbackReply(lead, lastUserText = '') {
  if (/n(?:ão|ao|\?).*nome|nome correto|meu nome (?:é|e|\?)/i.test(lastUserText) && lead.name) {
    return `Perfeito, ${lead.name}. Corrigi aqui.\nAgora me conte um pouco do seu negócio ou do objetivo que você quer alcançar.`;
  }

  if (!OPENAI_API_KEY) {
    if (lead.name && !lead.business && !lead.service) {
      return `Prazer, ${lead.name}.\nMe fale um pouco do seu negócio ou do objetivo que você quer alcançar, que eu te ajudo a escolher o melhor caminho.`;
    }

    if (lead.name && lead.service && services[lead.service]) {
      return `${lead.name}, pelo que você explicou, ${services[lead.service]} parece ser o melhor caminho.\nMe conte como está sua estrutura hoje para eu te orientar melhor.`;
    }

    return 'Entendi. Me conte um pouco mais do seu negócio e do que você quer melhorar primeiro.\n\nPode ser: aparecer no Google, vender mais, criar um site, melhorar o atendimento ou automatizar processos.';
  }

  if (lead.service && services[lead.service]) {
    return `Pelo que você explicou, o caminho mais indicado parece ser ${services[lead.service]}.\n\nMe fale rapidamente como está sua estrutura hoje para eu te orientar com mais precisão.`;
  }

  return 'Entendi. Me conte um pouco mais do seu negócio e do objetivo principal agora: aparecer no Google, vender mais, criar um site, automatizar atendimento ou melhorar campanhas?';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Método não permitido' });
  }

  if (isRateLimited(req)) {
    return sendJson(res, 429, { error: 'Muitas mensagens em pouco tempo. Tente novamente em instantes.' });
  }

  let body = {};
  let nextLead = {};

  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody || '{}');
    const messages = Array.isArray(body.messages)
      ? body.messages.slice(-18).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: cleanText(message.content, 900)
      })).filter((message) => message.content)
      : [];

    const lead = updateLead(body.lead || {}, messages);
    nextLead = lead;
    let reply = '';

    if (OPENAI_API_KEY) {
      try {
        reply = await callOpenAI(messages, lead, cleanText(body.page, 160), cleanText(body.path, 120));
      } catch (error) {
        console.error('[pd-atendimento-ai]', error.message);
      }
    }

    return sendJson(res, 200, {
      reply: reply || fallbackReply(lead, messages[messages.length - 1]?.content || ''),
      lead
    });
  } catch (error) {
    console.error('[pd-atendimento]', error);
    return sendJson(res, 200, {
      reply: 'Tive uma instabilidade rápida aqui, mas continuo com você.\nMe diga em uma frase qual é seu negócio e o que você quer melhorar primeiro.',
      lead: Object.keys(nextLead).length ? nextLead : (body && body.lead ? body.lead : {})
    });
  }
};
