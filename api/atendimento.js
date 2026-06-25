const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const ALLOW_GEMINI_FALLBACK = process.env.ALLOW_GEMINI_FALLBACK === 'true';
const {
  extractRecallIdentity,
  findReturningMemory,
  forgetClientMemory,
  isForgetRequest,
  linkVisitorMemory,
  loadVisitorMemory,
  saveClientMemory,
  safeVisitorId
} = require('../lib/client-memory');

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
  ['agentes', /(atendente|atendimento|chatbot|chat|responder cliente|qualificar lead)/i],
  ['automacao', /(automat|\bia\b|inteligência artificial|processo repetitivo|sistema)/i],
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

function cleanText(value, max = 900) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeForMatch(value) {
  return cleanText(value, 1800)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cleanName(value) {
  const ignored = new Set(['ola', 'olá', 'oi', 'opa', 'bom', 'boa', 'meu', 'no', 'nome', 'sou', 'eu', 'a', 'o']);
  const name = cleanText(value, 80)
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-zÀ-ÿ'-]/g, ''))
    .find((part) => part.length > 1 && !ignored.has(part.toLowerCase())) || '';
  return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : '';
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function extractMoneyValue(text) {
  const value = cleanText(text, 80);
  const direct = value.match(/^(?:r\$\s*)?(\d{1,5})(?:[,.](\d{2}))?$/i);
  if (direct) return `R$ ${direct[1]},${direct[2] || '00'}`;

  const inline = value.match(/(?:r\$\s*)?(\d{1,5})(?:[,.](\d{2}))?\s*(?:reais|real|o litro|por litro|litro)?/i);
  if (inline && /pre[cç]o|valor|custa|reais|real|r\$|litro/i.test(value)) return `R$ ${inline[1]},${inline[2] || '00'}`;

  return '';
}

function extractFoodProduct(text) {
  const value = cleanText(text, 180);
  const direct = value.match(/(?:vendo|venda|tenho|trabalho com|faco|faço)\s+(.+?)(?:\s+no meu bairro|\s+no bairro|\s+no meu ponto|\s+na minha loja|\s+na minha cidade|!|\.|$)/i);
  const raw = direct ? direct[1] : '';
  const product = raw
    .split(/\b(?:whatsapp|instagram|facebook|google|eu ja falei|eu já falei|simples|mais simples|entrega|retirada)\b/i)[0]
    .replace(/\b(mais|online|todo dia|todos os dias|pelo whatsapp|no whatsapp|no meu ponto|no ponto)\b/gi, '')
    .trim();

  if (product && product.length >= 3) return product;
  return '';
}

function cleanProductPhrase(value) {
  const product = cleanText(value, 120)
    .split(/\b(?:no meu bairro|no bairro|no meu ponto|na minha loja|na minha cidade|pelo whatsapp|no whatsapp|whatsapp|instagram|facebook|google)\b/i)[0]
    .replace(/\b(?:eu vendo|vendo|venda|tenho|trabalho com|faco|faço|mais|online|todo dia|todos os dias)\b/gi, '')
    .replace(/^[,.;:\s]+/, '')
    .replace(/\b(?:uma|um|a|o|as|os)\s+/i, '')
    .trim();
  if (/^pizza$/i.test(product)) return 'pizzas';
  return product;
}

const businessProductRules = [
  { pattern: /sapataria/, business: 'sapataria', product: 'sapatos' },
  { pattern: /padaria/, business: 'padaria', product: 'pães' },
  { pattern: /acougue|açougue/, business: 'açougue', product: 'carnes' },
  { pattern: /pizzaria/, business: 'pizzaria', product: 'pizzas' },
  { pattern: /hamburgueria|lanchonete/, business: 'lanchonete', product: 'lanches' },
  { pattern: /loja de roupa|loja de roupas/, business: 'loja de roupas', product: 'roupas' },
  { pattern: /loja de colchao|loja de colchões|loja de colchoes/, business: 'loja de colchões', product: 'colchões' },
  { pattern: /oficina de bicicleta|oficina de bicicletas|bicicletaria/, business: 'oficina de bicicletas', product: 'serviços de conserto e manutenção de bicicletas' },
  { pattern: /barbearia/, business: 'barbearia', product: 'serviços de corte e barba' },
  { pattern: /salao de beleza|salão de beleza/, business: 'salão de beleza', product: 'serviços de beleza' },
  { pattern: /clinica|clínica/, business: 'clínica', product: 'serviços de atendimento' }
];

function inferBusinessProduct(text) {
  const normalized = normalizeForMatch(text);
  const rule = businessProductRules.find((item) => item.pattern.test(normalized));
  if (!rule) return null;
  return { businessType: rule.business, product: rule.product };
}

function isKnownBusinessType(value) {
  const normalized = normalizeForMatch(value);
  return businessProductRules.some((item) => item.pattern.test(normalized));
}

function cleanLocationCandidate(value) {
  const location = cleanText(value, 80);
  const normalized = normalizeForMatch(location);
  if (!location || location.length < 3) return '';
  if (hasAny(normalized, [
    /^de /,
    /bicicleta/,
    /bicicletas/,
    /sapatos/,
    /colchoes/,
    /colchões/,
    /servicos/,
    /serviços/,
    /manutencao/,
    /manutenção/,
    /pizzaria/,
    /padaria/,
    /sapataria/,
    /acougue/,
    /açougue/
  ])) return '';
  return location;
}

function extractProductCorrection(text) {
  const value = cleanText(text, 220);
  const correction = value.match(/n(?:ão|ao)\s+vendo\s+.+?,?\s*(?:eu\s+)?vendo\s+(.+?)(?:!|\.|$)/i);
  if (correction) return cleanProductPhrase(correction[1]);

  const explicit = value.match(/(?:o produto|meu produto|eu vendo|vendo)\s+(?:é|e|são|sao)?\s*(.+?)(?:!|\.|$)/i);
  if (explicit && /n(?:ão|ao)\s+vendo|corrigindo|na verdade|produto/i.test(value)) {
    return cleanProductPhrase(explicit[1]);
  }

  return '';
}

function productLabel(lead) {
  return lead.productDetail || lead.product || 'seu produto';
}

function isNameQuestion(text) {
  return hasAny(normalizeForMatch(text), [
    /qual.*meu nome/,
    /como.*meu nome/,
    /sabe.*meu nome/,
    /lembra.*meu nome/
  ]);
}

function isAssistantNameQuestion(text) {
  return hasAny(normalizeForMatch(text), [
    /qual.*seu nome/,
    /como.*seu nome/,
    /seu nome mesmo/,
    /quem.*voce/,
    /quem.*você/
  ]);
}

function isAiIdentityQuestion(text) {
  return hasAny(normalizeForMatch(text), [
    /voce.*inteligencia artificial/,
    /você.*inteligencia artificial/,
    /voce.*ia/,
    /você.*ia/,
    /voce.*robo/,
    /você.*robo/,
    /voce.*humano/,
    /você.*humano/
  ]);
}

function isAnswerDemand(text) {
  return hasAny(normalizeForMatch(text), [
    /porque.*ignorou.*pergunta/,
    /por que.*ignorou.*pergunta/,
    /responda.*minha pergunta/,
    /responde.*minha pergunta/,
    /nao respondeu/,
    /não respondeu/
  ]);
}

function isPersonSwitch(text) {
  return hasAny(normalizeForMatch(text), [
    /joao.*nao quer.*falar/,
    /joão.*não quer.*falar/,
    /cliente.*nao quer.*falar/,
    /cliente.*não quer.*falar/,
    /eu sou\s+[a-z]/,
    /sou eu\s+[a-z]/,
    /vou continuar/,
    /continuar com voce/,
    /continuar com você/
  ]);
}

function isSimplePlanChoice(text) {
  return hasAny(normalizeForMatch(text), [
    /^simples\b/,
    /mais simples/,
    /estrutura simples/,
    /quero simples/,
    /vender rapido/,
    /vender rápido/,
    /sem complicar/
  ]);
}

function isWhatsAppChannelReply(text) {
  return hasAny(normalizeForMatch(text), [
    /^whatsapp$/,
    /^zap$/,
    /pelo zap/,
    /pelo whatsapp/,
    /mais pelo zap/,
    /mais pelo whatsapp/,
    /mai pelo zap/,
    /zap/,
    /whatsapp/,
    /ja falei whatsapp/,
    /já falei whatsapp/,
    /eu ja falei whatsapp/,
    /eu já falei whatsapp/
  ]);
}

function rejectsVirtualStore(text) {
  return hasAny(normalizeForMatch(text), [
    /nao quero loja virtual/,
    /não quero loja virtual/,
    /nao.*loja virtual/,
    /não.*loja virtual/,
    /tenho.*pizzaria/,
    /pequena pizzaria/,
    /pizzaria/
  ]);
}

function isPreviousConversationQuestion(text) {
  return hasAny(normalizeForMatch(text), [
    /lembra.*conversa/,
    /lembra.*celular/,
    /conversando.*celular/,
    /continue.*aqui/,
    /podemos continuar/,
    /estava conversando/,
    /agorinha/
  ]);
}

function isFrustrated(text) {
  return hasAny(normalizeForMatch(text), [
    /doido/,
    /maluco/,
    /retardado/,
    /imbecil/,
    /burro/,
    /burra/,
    /maquina/,
    /maquina burra/,
    /robo burro/,
    /nao pensa/,
    /nao raciocina/,
    /inconsistente/,
    /inconcistente/,
    /ja te falei/,
    /ja falei/,
    /eu ja falei/,
    /j[aá] falei/,
    /acabei de falar/,
    /responde direito/,
    /nao vou continuar/,
    /não vou continuar/,
    /vou procurar outra empresa/,
    /procura outra empresa/,
    /nao entende.*contexto/,
    /não entende.*contexto/,
    /falando a mesma coisa/,
    /mesma coisa sempre/,
    /fica dificil/,
    /fica difícil/,
    /ignorou.*pergunta/
  ]);
}

function buildMemorySummary(lead, messages) {
  const facts = [];
  if (lead.name) facts.push(`Nome: ${lead.name}`);
  if (lead.business) facts.push(`Negócio informado: ${lead.business}`);
  if (lead.product) facts.push(`Produto já citado: ${lead.product}`);
  if (lead.productDetail) facts.push(`Produto/detalhe já citado: ${lead.productDetail}`);
  if (lead.productPrice) facts.push(`Preço do produto já citado: ${lead.productPrice}`);
  if (lead.deliveryArea) facts.push(`Área de entrega já citada: ${lead.deliveryArea}`);
  if (lead.deliveryMethod) facts.push(`Forma de compra/entrega já citada: ${lead.deliveryMethod}`);
  if (lead.location) facts.push(`Local/bairro já citado: ${lead.location}`);
  if (lead.goal) facts.push(`Objetivo informado: ${lead.goal}`);
  if (lead.salesGoal) facts.push(`Meta comercial já citada: ${lead.salesGoal}`);
  if (lead.service && services[lead.service]) facts.push(`Serviço provável: ${services[lead.service]}`);
  if (lead.channel) facts.push(`Canal já citado: ${lead.channel}`);
  if (lead.stage) facts.push(`Estágio já citado: ${lead.stage}`);
  if (lead.planPreference) facts.push(`Preferência de estrutura já citada: ${lead.planPreference}`);
  if (lead.delivery) facts.push(`Entrega/delivery já citado: ${lead.delivery}`);
  if (lead.peakPeriod) facts.push(`Horário de maior venda já citado: ${lead.peakPeriod}`);
  if (lead.urgency) facts.push(`Urgência já citada: ${lead.urgency}`);
  if (lead.budget) facts.push(`Investimento/valor já citado: ${lead.budget}`);

  const recentUserFacts = messages
    .filter((message) => message.role === 'user')
    .slice(-6)
    .map((message) => `Cliente disse: ${cleanText(message.content, 180)}`);

  return [...facts, ...recentUserFacts].join('\n') || 'Nenhum dado consolidado ainda.';
}

function updateLead(lead, messages) {
  const next = { ...(lead || {}) };
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')?.content || '';
  const allUserText = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n');
  const fullConversationText = messages
    .map((message) => message.content)
    .join('\n');
  const normalizedAll = normalizeForMatch(allUserText);
  const normalizedLast = normalizeForMatch(lastUser);
  const normalizedLastAssistant = normalizeForMatch(lastAssistant);
  const normalizedConversation = normalizeForMatch(fullConversationText);

  if (!isNameQuestion(lastUser)) {
    const correctionNamePatterns = [
      /(?:n(?:ão|ao|\?) .*?nome.*?(?:é|e)|meu nome n(?:ão|ao|\?) .*?(?:é|e).*?meu nome (?:é|e)|nome correto (?:é|e)|corrigindo.*?nome.*?(?:é|e))\s+([A-Za-zÀ-ÿ'-]{2,})/i
    ];
    const directNamePatterns = [
      /(?:sou eu)\s+([A-Za-zÀ-ÿ'-]{2,})/i,
      /(?:meu nome\s+(?:é|e|eh)|meu no\s+(?:é|e|eh)|me chamo|eu sou|sou|aqui\s+(?:é|e|eh)|nome\s+(?:é|e|eh))\s+(?:(?:a|o)\s+)?([A-Za-zÀ-ÿ'-]{2,})/i,
      /(?:olá|ola|oi|opa),?\s*(?:meu nome é|me chamo|sou)\s*([A-Za-zÀ-ÿ'-]{2,})/i
    ];
    const correctionName = cleanName((correctionNamePatterns.map((pattern) => lastUser.match(pattern)).find(Boolean) || [])[1]);
    const extractedName = cleanName((directNamePatterns.map((pattern) => lastUser.match(pattern)).find(Boolean) || [])[1]);
    const explicitNameInLast = hasAny(normalizedLast, [/sou eu\s+[a-z]/, /eu sou\s+[a-z]/, /me chamo\s+[a-z]/, /meu nome\s+(e|eh)\s+[a-z]/]);
    if (correctionName) next.name = correctionName;
    else if (extractedName && (!next.name || explicitNameInLast)) next.name = extractedName;

    if (!next.name) {
      const firstBusinessMessage = messages
        .filter((message) => message.role === 'user')
        .map((message) => message.content)
        .find((text) => /(?:vendo|venda|tenho|trabalho|preciso|quero)\b/i.test(text));
      const firstTokenName = cleanName((firstBusinessMessage?.match(/^\s*([A-Za-zÀ-ÿ'-]{2,})\s+(?:vendo|venda|tenho|trabalho|preciso|quero)\b/i) || [])[1]);
      if (firstTokenName) next.name = firstTokenName;
    }

    if (!next.name) {
      const normalizedNameMatch = normalizedAll.match(/(?:meu\s+n(?:ome|o)\s*(?:e|eh)|me\s+chamo|eu\s+sou|sou)\s+(?:a|o)?\s*([a-z]{2,})/i);
      const normalizedName = cleanName((normalizedNameMatch || [])[1]);
      if (normalizedName) next.name = normalizedName;
    }
  }

  if (hasAny(normalizedLast, [/de onde.*tirou/, /nao.*foi.*isso/, /nao.*e.*isso/, /nao.*quero.*isso/])) {
    delete next.service;
    delete next.goal;
  }

  const salesIntent = hasAny(normalizedAll, [
    /quero vender mais/,
    /vender mais/,
    /vendo /,
    /venda /,
    /vender online/,
    /verder online/,
    /vender pela internet/,
    /vender todo dia/,
    /vender todos os dias/,
    /loja online/,
    /delivery/,
    /ifood/,
    /cardapio/,
    /acai/,
    /acai/,
    /hamburguer/,
    /pizza/,
    /manicoba/,
    /maniçoba/,
    /marmita/,
    /tacaca/,
    /tacacá/,
    /comida/,
    /lanche/,
    /bairro/,
    /bairo/
  ]);

  const foundService = salesIntent ? ['lojas'] : serviceSignals.find(([, pattern]) => pattern.test(allUserText));
  if (foundService) next.service = foundService[0];

  if (salesIntent) next.goal = 'Vender online todos os dias';
  else if (!next.goal && foundService) next.goal = services[foundService[0]];
  if (/(urgente|hoje|agora|rápido|rapido|essa semana|quanto antes)/i.test(allUserText)) next.urgency = 'urgente';

  const budgetMatch = allUserText.match(/(?:r\$\s?\d[\d.,]*|até\s?r?\$?\s?\d[\d.,]*|orçamento.*|orcamento.*|investir.*|valor.*|preço.*|preco.*)/i);
  if (budgetMatch) next.budget = cleanText(budgetMatch[0], 120);

  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content);

  const inferredBusiness = [...userMessages].reverse().map((text) => inferBusinessProduct(text)).find(Boolean);
  if (inferredBusiness) {
    next.businessType = inferredBusiness.businessType;
    next.product = inferredBusiness.product;
    next.business = next.business || `tem ${inferredBusiness.businessType}`;
  }

  const productBusinessCandidate = [...userMessages]
    .reverse()
    .find((text) => text.length > 8 && /(açaí|acai|maniçoba|manicoba|marmita|tacacá|tacaca|bairro|bairo|delivery|produto|comida|lanchonete|restaurante|loja)/i.test(text));

  const businessCandidate = productBusinessCandidate || [...userMessages]
    .reverse()
    .find((text) => text.length > 14 && /(negócio|negocio|empresa|clínica|clinica|serviço|servico|trabalho|objetivo|quero|preciso)/i.test(text));

  if (businessCandidate) next.business = cleanText(businessCandidate, 180);

  const correctedProduct = extractProductCorrection(lastUser);
  if (correctedProduct) {
    next.product = correctedProduct;
    delete next.productDetail;
  } else {
    const productFromConversation = [...userMessages].reverse().map((text) => extractFoodProduct(text)).find(Boolean);
    if (productFromConversation && !isKnownBusinessType(productFromConversation)) next.product = cleanProductPhrase(productFromConversation);
  }

  const locationMatch = allUserText.match(/(?:no meu ponto no|no ponto no|no bairro|em|na)\s+([A-Za-zÀ-ÿ0-9\s'-]{3,40})(?:!|\.|,|\n|$)/i);
  const locationCandidate = cleanLocationCandidate((locationMatch || [])[1]);
  if (locationCandidate) next.location = locationCandidate;

  if (hasAny(normalizedLast, [/acai|maniçoba|manicoba|marmita|tacaca|tacacá|comida|lanche|bairro|bairo|delivery|produto|servico/])) {
    next.business = cleanText(lastUser, 180);
  }

  if (hasAny(normalizedAll, [/acai.*litro|litro.*acai|açaí.*litro|litro.*açaí|polpa|in natura|caroco|carocos|caroço|caroços/])) {
    next.productDetail = 'açaí em litro, polpa in natura';
    next.product = 'açaí em litro';
    next.business = next.business || 'vende açaí em litro no bairro';
  }

  const priceWasAsked = hasAny(normalizedLastAssistant, [/preco do litro|preço do litro|qual.*preco|qual.*preço|valor do litro/]) ||
    hasAny(normalizedConversation, [/preco do litro|preço do litro|valor do litro/]);
  const productPrice = extractMoneyValue(lastUser);
  if (productPrice && (next.productDetail || priceWasAsked)) {
    next.productPrice = productPrice;
  }

  if (!next.productPrice && (next.productDetail || priceWasAsked)) {
    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1];
      const current = messages[index];
      if (current.role !== 'user') continue;
      const previousAskedPrice = previous.role === 'assistant' && hasAny(normalizeForMatch(previous.content), [
        /preco do litro/,
        /preço do litro/,
        /qual.*preco/,
        /qual.*preço/,
        /valor do litro/
      ]);
      const historicalPrice = extractMoneyValue(current.content);
      if (previousAskedPrice && historicalPrice) next.productPrice = historicalPrice;
    }
  }

  const deliveryWasAsked = hasAny(normalizedLastAssistant, [/entrega.*bairro|entrega em quais bairros|quais bairros|area de entrega|área de entrega|regiao de entrega|região de entrega/]) ||
    hasAny(normalizedConversation, [/entrega em quais bairros|quais bairros.*entrega|area de entrega|área de entrega/]);
  if (deliveryWasAsked && hasAny(normalizedLast, [/so no meu bairro|só no meu bairro|meu bairro|somente no bairro|apenas no bairro|no bairro/])) {
    next.deliveryArea = 'somente no próprio bairro';
  }

  if (!next.deliveryArea && deliveryWasAsked) {
    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1];
      const current = messages[index];
      if (current.role !== 'user') continue;
      const previousAskedDelivery = previous.role === 'assistant' && hasAny(normalizeForMatch(previous.content), [
        /entrega.*bairro/,
        /entrega em quais bairros/,
        /quais bairros/,
        /area de entrega/,
        /área de entrega/,
        /regiao de entrega/,
        /região de entrega/
      ]);
      if (previousAskedDelivery && hasAny(normalizeForMatch(current.content), [/so no meu bairro|só no meu bairro|meu bairro|somente no bairro|apenas no bairro|no bairro/])) {
        next.deliveryArea = 'somente no próprio bairro';
      }
    }
  }

  const methodWasAsked = hasAny(normalizedLastAssistant, [/retirada ou entrega|cliente compra hoje|como o cliente compra|forma de entregar|retirar o pedido|entregar ou retirar/]) ||
    hasAny(normalizedConversation, [/retirada ou entrega|cliente compra hoje|como o cliente compra/]);
  if (methodWasAsked && hasAny(normalizedLast, [/\bentrega\b|entrego|delivery|levo ate|levo até/])) next.deliveryMethod = 'entrega';
  if (methodWasAsked && hasAny(normalizedLast, [/retirada|retira|buscar|busca no ponto|pega no ponto/])) next.deliveryMethod = next.deliveryMethod ? `${next.deliveryMethod} e retirada` : 'retirada no ponto';
  if (!next.deliveryMethod && next.product && hasAny(normalizedLast, [/^entrega$/, /\bentrega\b|entrego|delivery|levo ate|levo até/])) next.deliveryMethod = 'entrega';
  if (!next.deliveryMethod && next.product && hasAny(normalizedLast, [/^retirada$/, /retirada|retira|buscar|busca no ponto|pega no ponto/])) next.deliveryMethod = 'retirada no ponto';

  if (!next.deliveryMethod && methodWasAsked) {
    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1];
      const current = messages[index];
      if (current.role !== 'user') continue;
      const previousAskedMethod = previous.role === 'assistant' && hasAny(normalizeForMatch(previous.content), [
        /retirada ou entrega/,
        /cliente compra hoje/,
        /como o cliente compra/,
        /forma de entregar/,
        /retirar o pedido/,
        /entregar ou retirar/
      ]);
      const currentText = normalizeForMatch(current.content);
      if (previousAskedMethod && hasAny(currentText, [/\bentrega\b|entrego|delivery|levo ate|levo até/])) next.deliveryMethod = 'entrega';
      if (previousAskedMethod && hasAny(currentText, [/retirada|retira|buscar|busca no ponto|pega no ponto/])) next.deliveryMethod = next.deliveryMethod ? `${next.deliveryMethod} e retirada` : 'retirada no ponto';
    }
  }

  if (hasAny(normalizedAll, [/whatsapp|zap|zapi/])) next.channel = 'WhatsApp';
  if (hasAny(normalizedAll, [/instagram|insta/])) next.channel = next.channel ? `${next.channel} e Instagram` : 'Instagram';
  if (hasAny(normalizedAll, [/ifood|i food/])) next.channel = next.channel ? `${next.channel} e iFood` : 'iFood';
  if (hasAny(normalizedAll, [/comecar do zero|começar do zero|ainda vou comecar|ainda vou começar/])) next.stage = 'começando do zero';
  if (hasAny(normalizedAll, [/ja vendo|já vendo|ja recebe|já recebe|ja tenho|já tenho|vendo pelo|recebo pelo/])) next.stage = 'já vende/recebe pedidos';
  if (hasAny(normalizedConversation, [/voce ja recebe pedidos pelo whatsapp|ja recebe pedidos pelo whatsapp|vende pelo whatsapp|pedidos pelo whatsapp/]) && hasAny(normalizedLast, [/^sim\b|^recebo\b|recebo|vendo|ja|claro/])) {
    next.channel = 'WhatsApp';
    next.stage = 'já vende/recebe pedidos';
  }
  if (hasAny(normalizedConversation, [/voce ja recebe pedidos pelo whatsapp|ja recebe pedidos pelo whatsapp|vende pelo whatsapp|pedidos pelo whatsapp/]) && hasAny(normalizedAll, [/\brecebo\b/, /\bsim\b/, /ja vendo/, /vendo pelo/])) {
    next.channel = 'WhatsApp';
    next.stage = 'já vende/recebe pedidos';
  }
  if (hasAny(normalizedAll, [/entregador|moto|motoboy|motoqueiro|entrega|delivery/])) next.delivery = 'quer usar entregador/motoboy';
  if (hasAny(normalizedAll, [/atrair mais cliente|atrair mais clinete|atrair mais clientes|mais cliente|mais clinete|mais clientes|cliente no bairro|clinete no bairro|clientes no bairro/])) next.salesGoal = 'atrair mais clientes no bairro';
  if (hasAny(normalizedAll, [/simples|rapido|rápido|estrutura simples|comecar rapido|começar rápido|vender rapido|vender rápido/])) next.planPreference = 'estrutura simples para começar rápido';
  if (hasAny(normalizedAll, [/completo|completa|estrutura completa|escalar/])) next.planPreference = 'estrutura mais completa';
  if (hasAny(normalizedLast, [/manha|pala manha|pela manha|de manha|cedo/])) next.peakPeriod = 'manhã';
  else if (hasAny(normalizedLast, [/tarde/])) next.peakPeriod = 'tarde';
  else if (hasAny(normalizedLast, [/noite|noturno/])) next.peakPeriod = 'noite';
  else if (hasAny(normalizedLast, [/dia todo|todo dia|o dia inteiro/])) next.peakPeriod = 'dia todo';

  if (next.name && (next.business || next.goal || next.service)) next.ready = true;
  return next;
}

function buildInstructions(lead, page, path, messages = []) {
  const memorySummary = buildMemorySummary(lead, messages);

  return `
Você é Hélio, consultor da Propagação Digital.
Você conversa em português do Brasil com clientes que chegam pelo site.

Objetivo:
- Conversar de forma natural, inteligente e humana, como um bom consultor comercial.
- Entender nome, negócio, objetivo, urgência e melhor solução.
- Responder perguntas sobre serviços sem parecer robô de script.
- Não siga roteiro fixo. Responda exatamente ao que o cliente acabou de dizer.
- Se o cliente corrigir você, aceite a correção imediatamente e não repita a pergunta anterior.
- Se o cliente rejeitar uma solução, nunca ofereça a mesma solução na resposta seguinte.
- Se o cliente disser que tem pizzaria, padaria, sapataria, barbearia, oficina, açougue, lanchonete, loja pequena ou negócio local, não comece por "loja virtual completa". Priorize página/cardápio simples, WhatsApp/Zap, Google local e anúncios locais.
- Se o cliente disser "pelo Zap", "pelo WhatsApp" ou "mais pelo Zap", aceite isso como canal escolhido. Não pergunte novamente se ele quer WhatsApp.
- Se o cliente disser "não quero loja virtual", não diga "Lojas Virtuais parece ser um bom caminho". Diga que uma página/cardápio simples com WhatsApp é mais adequada.
- Se o cliente disser que trabalha com pizza ou tem pizzaria, entenda que ele vende pizzas/comida e precisa de cardápio/pedidos pelo WhatsApp, não de loja virtual completa.
- Não presuma o serviço só porque a pessoa está em uma página específica. Use a página apenas como contexto fraco.
- Se o cliente perguntar "de onde você tirou isso?", "não foi isso" ou corrigir uma suposição, peça desculpas, abandone a suposição anterior e siga pelo que o cliente disser depois.
- Se o cliente disser que quer vender online, vender todo dia, vender no bairro, vender açaí, comida, produtos ou delivery, priorize uma estrutura de venda online/local: loja virtual simples, cardápio/página de pedidos, WhatsApp, tráfego pago e SEO local. Não recomende Automação com IA como primeira solução nesses casos.
- Antes de fazer uma pergunta, leia a memória consolidada e o histórico. Nunca pergunte de novo algo que o cliente já respondeu.
- Se uma informação já foi dada, use essa informação e avance para a próxima etapa lógica.
- Se o estado indicar "cliente reconhecido", diga de forma natural que lembra dele, use o resumo anterior e continue do ponto em que pararam.
- Se não houver memória recuperada, seja honesto e peça nome + negócio para tentar localizar. Nunca finja lembrar.
- Se o estado indicar "memória procurada e não encontrada", diga claramente que não encontrou um registro confirmado. Nunca responda "lembro sim".
- Ao reconhecer alguém, não revele telefone, pagamento, senha ou qualquer dado sensível. Use apenas nome, negócio e status comercial.
- Se o cliente responder "simples", "rápido", "simples pra vender rápido" ou "completo", aceite como resposta sobre o tipo de estrutura e avance para plano/WhatsApp. Não repita a pergunta sobre estrutura simples ou completa.
- Se o cliente disser que vende "açaí em litro", "polpa", "in natura" ou corrigir que não vende copos/tamanhos, aceite isso como detalhe do produto. Não pergunte novamente quais tamanhos vende. Avance para preço, bairros de entrega, fotos ou oferta.
- Faça no máximo uma pergunta por resposta.
- Se o cliente pedir exemplo, foto, imagem, modelo visual, cardapio, loja virtual, site pronto, "como ficaria", "mostra" ou "cadê a imagem", responda em uma frase curta que a imagem/modelo visual vai aparecer logo abaixo.
- Nunca diga que nao consegue anexar imagem aqui. O site exibe um card visual separado abaixo da sua resposta.
- Nunca use a pagina de vendas da Propagacao Digital como exemplo visual de loja. O exemplo de loja virtual deve parecer uma loja real: vitrine, produtos, precos, carrinho e pedido pelo celular.
- Nao descreva mockups longos quando o cliente pediu imagem. Apenas contextualize: "Abaixo vai um modelo visual para seu negocio". Nao faca pergunta junto dessa resposta.
- Se o cliente insistir "cade a imagem?", "mostra", "manda logo", peca desculpas em uma frase e diga para olhar o card visual logo abaixo.
- Se o cliente perguntar algo fora do assunto, responda com educação e traga a conversa de volta para o negócio.
- Exemplo fora do assunto: se pedir receita de strogonoff, diga que até poderia ajudar, mas recomenda procurar isso no ChatGPT, e volte para site, Google, vendas, automação ou atendimento.
- Corrigir informações quando o cliente corrigir. Exemplo: se disser "não, meu nome é Junior", aceite Junior.
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
- Nunca envie blocos grandes de texto. Quebre a resposta em partes pequenas, como conversa de WhatsApp.
- Prefira 1 ideia por linha ou por parágrafo curto.
- Quando explicar uma solução com vários elementos, separe por linhas: página/cardápio, tráfego pago, SEO local, WhatsApp.
- Pode usar um emoji leve ocasionalmente, sem exagero.
- Não invente preço fechado. Explique que depende do escopo e colete contexto.
- Não diga que é IA, modelo, API ou sistema.

Estado atual do lead:
Nome: ${lead.name || 'não informado'}
Negócio/objetivo: ${lead.business || lead.goal || 'não informado'}
Produto já citado: ${lead.product || 'não informado'}
Produto/detalhe já citado: ${lead.productDetail || 'não informado'}
Preço do produto já citado: ${lead.productPrice || 'não informado'}
Área de entrega já citada: ${lead.deliveryArea || 'não informada'}
Forma de compra/entrega já citada: ${lead.deliveryMethod || 'não informada'}
Local/bairro já citado: ${lead.location || 'não informado'}
Meta comercial já citada: ${lead.salesGoal || 'não informada'}
Serviço provável: ${lead.service ? services[lead.service] : 'não definido'}
Canal de venda já citado: ${lead.channel || 'não informado'}
Estágio já citado: ${lead.stage || 'não informado'}
Preferência de estrutura já citada: ${lead.planPreference || 'não informada'}
Entrega/delivery já citado: ${lead.delivery || 'não informado'}
Horário de venda já citado: ${lead.peakPeriod || 'não informado'}
Urgência: ${lead.urgency || 'não informada'}
Investimento/valor citado: ${lead.budget || 'não informado'}
Cliente reconhecido de conversa anterior: ${lead.returningClient ? 'sim' : 'não'}
Memória procurada e não encontrada: ${lead.recallNotFound ? 'sim' : 'não'}
Último contato salvo: ${lead.memoryLastContact || 'não disponível'}
Resumo comercial anterior: ${lead.previousSummary || 'não disponível'}
Página atual: ${page || path || 'site'}

Memória consolidada da conversa:
${memorySummary}

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
      instructions: buildInstructions(lead, page, path, messages),
      input: messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      })),
      max_output_tokens: 420,
      store: false
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Falha na IA');
  }

  return formatForChatReadability(extractText(data));
}

function toGeminiContents(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
}

function extractGeminiText(data) {
  const parts = [];

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) parts.push(part.text);
    }
  }

  return parts.join('\n').trim();
}

function formatForChatReadability(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/(?<!\d)([.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/g, '$1\n\n')
    .replace(/:\s+(?=\S)/g, ':\n')
    .replace(/,\s+(nós|eu|você|para você|combinad[ao]s?|junto com|e \*\*SEO|e SEO|quando alguém|para que)/gi, ',\n$1')
    .replace(/\s+(Combinada com|Combinado com)\s+/g, '\n$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function callGemini(messages, lead, page, path) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildInstructions(lead, page, path, messages) }]
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: 0.25,
        topP: 0.75,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Falha na Gemini API');
  }

  return formatForChatReadability(extractGeminiText(data));
}

function priorityReply(lead, lastUserText = '', messages = []) {
  const last = normalizeForMatch(lastUserText);
  const context = normalizeForMatch(messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n'));

  if (lead.returningClient && lead.previousSummary && extractRecallIdentity(lastUserText)) {
    return `Oi, ${lead.name}! Lembro sim.\n\nNo nosso último contato ficou registrado:\n${lead.previousSummary}.\n\nVamos continuar desse ponto.\nO que mudou desde aquela conversa?`;
  }

  if (lead.recallNotFound && extractRecallIdentity(lastUserText)) {
    return `Oi, ${lead.name || 'meu amigo'}.\n\nProcurei pelo nome e pelo negócio informado, mas não encontrei um registro confirmado ainda.\n\nMe diga em uma frase onde paramos, que eu continuo daqui e salvo corretamente para a próxima vez.`;
  }

  if (isAiIdentityQuestion(lastUserText)) {
    return 'Sou o Hélio, atendente virtual da Propagação Digital.\n\nEu uso inteligência artificial para entender sua mensagem e te orientar melhor.\n\nMas eu preciso responder com clareza e manter o contexto do que você já falou.\n\nPode perguntar direto que eu respondo.';
  }

  if (isAnswerDemand(lastUserText)) {
    return 'Você tem razão.\n\nEu deveria ter respondido sua pergunta diretamente antes de continuar o atendimento.\n\nSou o Hélio, atendente virtual da Propagação Digital.\n\nUso inteligência artificial para conversar com você e ajudar a encontrar a melhor solução para o seu negócio.';
  }

  if (isPersonSwitch(lastUserText) && lead.name) {
    const knownProduct = lead.productDetail || lead.product;
    const productLine = knownProduct ? `\n\nPelo histórico desta conversa, o negócio é ${productLabel(lead)}.` : '';
    const channelLine = lead.channel ? `\nO canal citado foi ${lead.channel}.` : '';

    return `Perfeito, ${lead.name}.\n\nVou continuar com você agora.${productLine}${channelLine}\n\nPara não repetir pergunta, vou seguir do ponto certo:\nmontar uma oferta simples, clara e levar o cliente para o WhatsApp.\n\nSe você confirmar que esse continua sendo o objetivo, eu te mostro o próximo passo.`;
  }

  if (isPreviousConversationQuestion(lastUserText)) {
    const known = [];
    if (lead.name) known.push(`seu nome é ${lead.name}`);
    if (lead.productDetail || lead.product) known.push(`você trabalha com ${productLabel(lead)}`);
    if (lead.business) known.push(`você comentou: ${lead.business}`);

    if (known.length) {
      return `Consigo continuar pelo que está nesta conversa aqui.\n\nO que tenho anotado agora:\n${known.map((item) => `- ${item}`).join('\n')}\n\nMas eu não consigo acessar automaticamente a conversa feita em outro aparelho.\n\nSe faltou algo que você falou no celular, me diga só esse ponto que eu continuo daqui.`;
    }

    return 'Consigo continuar por aqui, sim.\n\nMas preciso ser transparente:\neu não consigo acessar automaticamente a conversa que você fez em outro aparelho.\n\nSe você me lembrar seu nome e o que você vende ou quer melhorar, eu continuo daqui sem problema.';
  }

  if (isAssistantNameQuestion(lastUserText)) {
    return 'Meu nome é Hélio.\n\nSou o consultor da Propagação Digital.\n\nE você é o cliente que estou atendendo agora.';
  }

  if (isNameQuestion(lastUserText)) {
    if (lead.name) {
      return `Seu nome é ${lead.name}.\n\nEu errei ao repetir perguntas que você já tinha respondido.\nVou seguir com o que já tenho anotado.`;
    }

    return 'Você ainda não me disse seu nome com clareza.\n\nMe diga só seu nome, por favor.';
  }

  if (lead.product && lead.channel === 'WhatsApp' && isWhatsAppChannelReply(lastUserText)) {
    const name = lead.name ? `${lead.name}, ` : '';
    if (hasAny(last, [/ja falei/, /já falei/, /eu ja falei/, /eu já falei/])) {
      return `${name}você tem razão.\n\nWhatsApp já está anotado.\n\nNão vou perguntar isso de novo.\n\nO próximo passo é montar uma oferta simples para ${productLabel(lead)}:\n1. fotos reais dos produtos;\n2. texto curto com modelos, prazo e forma de encomenda;\n3. botão direto para orçamento no WhatsApp;\n4. anúncio local para atrair clientes perto de você.`;
    }

    return `${name}perfeito, Zap anotado.\n\nNão precisa de loja virtual completa agora.\n\nPara ${productLabel(lead)}, o melhor caminho é uma estrutura simples para pedido pelo WhatsApp:\n1. cardápio/página com sabores, tamanhos e fotos reais;\n2. botão direto para pedir pelo Zap;\n3. Google local para quem procura perto;\n4. anúncios no bairro levando direto para o WhatsApp.\n\nO próximo passo é destacar os sabores ou combos que você mais quer vender.`;
  }

  if (lead.product && rejectsVirtualStore(lastUserText)) {
    const name = lead.name ? `${lead.name}, ` : '';
    const business = lead.businessType || (last.includes('pizzaria') ? 'pizzaria' : 'negócio');
    return `${name}agora ficou claro.\n\nVocê tem uma ${business}.\nVocê quer vender mais ${productLabel(lead)} pelo WhatsApp/Zap.\n\nNão vou insistir em loja virtual completa.\n\nEu faria assim:\n1. cardápio/página simples com seus principais produtos;\n2. botão direto para pedido no WhatsApp;\n3. fotos reais e ofertas do dia;\n4. anúncios locais para pessoas perto da sua região.\n\nIsso é mais rápido e mais adequado para uma pequena ${business}.`;
  }

  if (extractProductCorrection(lastUserText)) {
    const name = lead.name ? `${lead.name}, ` : '';
    const business = lead.businessType ? `\n\nVocê tem uma ${lead.businessType}.` : '';
    return `${name}agora entendi corretamente.${business}\n\nO produto que você vende é ${productLabel(lead)}.\n\nNão vou tratar ${lead.businessType || 'o tipo de negócio'} como produto.\n\nPara vender mais ${productLabel(lead)}, o caminho certo é:\n1. página simples com fotos reais;\n2. botão direto para WhatsApp;\n3. Google local para quem procura perto;\n4. anúncios para atrair cliente interessado.`;
  }

  if (lead.businessType && lead.product && hasAny(last, [/voce entende/, /você entende/, /sapataria vende/, /padaria vende/, /acougue vende/, /açougue vende/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    return `${name}sim, entendi.\n\n${lead.businessType.charAt(0).toUpperCase() + lead.businessType.slice(1)} é o tipo de negócio.\n${productLabel(lead)} é o produto vendido.\n\nA partir daqui vou falar de venda de ${productLabel(lead)}, não de vender a ${lead.businessType}.\n\nPara o seu caso, eu faria uma estrutura simples com WhatsApp, Google local e anúncios no bairro.`;
  }

  if (isFrustrated(lastUserText)) {
    const known = [];
    if (lead.name) known.push(`seu nome é ${lead.name}`);
    if (lead.productDetail || lead.product) known.push(`você vende ${productLabel(lead)}`);
    if (lead.productPrice) known.push(`o preço é ${lead.productPrice} o litro`);
    if (lead.deliveryArea) known.push(`a entrega é ${lead.deliveryArea}`);
    if (lead.deliveryMethod) known.push(`a forma de compra é ${lead.deliveryMethod}`);

    return `Você tem razão em reclamar.\n\nEu puxei uma informação errada e isso atrapalhou a conversa.\n\nO que eu tenho anotado até aqui:\n${known.length ? known.map((item) => `- ${item}`).join('\n') : '- ainda faltam dados claros'}\n\nVou continuar a partir disso, sem voltar para o começo.\n\nPara vender mais ${productLabel(lead)}, o caminho certo é uma oferta simples no WhatsApp, fotos reais, anúncio no bairro e uma página/cardápio direto para pedido.`;
  }

  if (lead.product && isSimplePlanChoice(lastUserText)) {
    const name = lead.name ? `${lead.name}, ` : '';
    const channel = lead.channel || 'WhatsApp';
    return `${name}perfeito.\n\nVamos pelo caminho simples para vender rápido.\n\nEu montaria assim:\n1. página curta com fotos reais de ${productLabel(lead)};\n2. botão direto para orçamento no ${channel};\n3. texto simples explicando modelos, valores a partir de, prazo e entrega;\n4. anúncio local para pessoas perto do seu ponto.\n\nSem loja virtual completa agora.\n\nO próximo passo é separar 3 a 5 fotos reais dos produtos que você mais quer vender.`;
  }

  if (lead.deliveryArea && hasAny(last, [/so no meu bairro|só no meu bairro|meu bairro|somente no bairro|apenas no bairro|no bairro/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    return `${name}perfeito.\n\nÁrea de entrega anotada:\n${lead.deliveryArea}.\n\nResumo da oferta até aqui:\n- produto: ${productLabel(lead)};\n- ${lead.productPrice || 'preço ainda não informado'};\n- entrega ${lead.deliveryArea};\n- pedido direto pelo WhatsApp.\n\nAgora falta só definir uma chamada forte para o anúncio.\n\nVocê prefere destacar a qualidade do produto ou a entrega rápida no bairro?`;
  }

  if (lead.product && lead.planPreference && hasAny(last, [/^simples\b|vender mais|quero vender|o que voce me diz|oque voce me diz|o que você me diz|me orienta|proximo|próximo/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    return `${name}vamos seguir pelo caminho simples para vender mais ${productLabel(lead)}.\n\nEu faria assim:\n1. uma página/cardápio direto para pedido no WhatsApp;\n2. fotos reais de ${productLabel(lead)};\n3. uma oferta clara para o bairro;\n4. anúncio local para quem mora perto.\n\nSem complicar.\n\nAgora preciso saber:\ncomo o cliente compra hoje, retirada ou entrega?`;
  }

  if (lead.product && lead.deliveryMethod && hasAny(last, [/\bentrega\b|entrego|delivery|sim continue|continue|pode continuar|vamos continuar/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    const locationLine = lead.location ? `\n- local: ${lead.location};` : '';
    const adTarget = lead.location ? `perto de ${lead.location}` : 'perto do seu ponto';
    return `${name}perfeito.\n\nEntão já temos:\n- produto: ${productLabel(lead)};\n- venda no ponto físico;\n- forma de compra: ${lead.deliveryMethod};${locationLine}\n\nAgora o próximo passo é montar uma oferta simples para atrair cliente.\n\nEu trabalharia com:\n1. fotos reais dos produtos;\n2. anúncio para pessoas ${adTarget};\n3. botão direto para WhatsApp;\n4. chamada para visitar o ponto ou pedir entrega.\n\nQual tipo de ${productLabel(lead)} você mais quer vender primeiro?`;
  }

  if (lead.product && hasAny(last, [/vendo|venda|tenho|trabalho com|meu ponto|minha loja|loja fisica|loja física/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    const locationText = lead.location ? ` em ${lead.location}` : '';
    if (lead.channel === 'WhatsApp') {
      return `${name}entendi.\n\nVocê trabalha com ${productLabel(lead)}${locationText}.\n\nComo você já falou em WhatsApp, eu não vou perguntar isso de novo.\n\nEu começaria com uma estrutura direta:\n1. página simples explicando seus serviços;\n2. botão para orçamento no WhatsApp;\n3. Google local para quem procura perto;\n4. anúncios para pessoas da sua região.\n\nO próximo passo é destacar os serviços que mais trazem lucro ou mais procura.`;
    }

    return `${name}entendi.\n\nVocê vende ${productLabel(lead)} no seu ponto físico${locationText}.\n\nNesse caso, eu não começaria falando de loja virtual completa.\n\nEu começaria com uma estrutura mais direta:\n1. página simples mostrando seus principais ${productLabel(lead)};\n2. botão para chamar no WhatsApp;\n3. Google/SEO local para quem procura perto de você;\n4. anúncios no bairro para levar gente até o seu ponto.\n\nSeu objetivo principal é levar mais pessoas para a loja ou vender pelo WhatsApp também?`;
  }

  const acaiContext = context.includes('acai') || context.includes('açaí') || lead.productDetail;
  const mentionsAcaiLiter = acaiContext && hasAny(last, [
    /litro/,
    /polpa/,
    /in natura/,
    /caroco/,
    /carocos/,
    /caroço/,
    /caroços/,
    /doido/,
    /altista/,
    /autista/
  ]);

  if (mentionsAcaiLiter) {
    const name = lead.name ? `${lead.name}, ` : '';
    if (lead.productPrice) {
      if (lead.deliveryArea) {
        return `${name}agora fechou.\n\nProduto:\naçaí em litro,\npolpa in natura.\n\nPreço:\n${lead.productPrice} o litro.\n\nEntrega:\n${lead.deliveryArea}.\n\nCom isso, a oferta fica pronta para WhatsApp e anúncio local.\n\nVocê prefere destacar “açaí puro/in natura” ou “entrega rápida no bairro”?`;
      }

      return `${name}agora fechou.\n\nProduto:\naçaí em litro,\npolpa in natura.\n\nPreço:\n${lead.productPrice} o litro.\n\nCom isso, eu já montaria a oferta assim:\n**Açaí in natura por litro no seu bairro**\n\nPedido direto pelo WhatsApp,\ncom retirada ou entrega combinada.\n\nAgora preciso só de uma coisa para deixar a campanha mais certeira:\nvocê entrega em quais bairros?`;
    }

    return `${name}você tem razão.\n\nAgora ficou claro:\nnão é açaí no copo com tamanhos e adicionais.\n\nÉ açaí em litro,\npolpa in natura,\nfeito a partir do caroço do açaí.\n\nEntão o caminho correto é outro:\n1. página simples mostrando o litro da polpa;\n2. fotos reais do produto, embalagem e preparo;\n3. botão direto para pedido no WhatsApp;\n4. anúncio no bairro para quem compra açaí para casa, família ou revenda.\n\nPara montar a oferta certa,\nqual é o preço do litro hoje?`;
  }

  if (lead.productDetail && lead.productPrice && hasAny(last, [/^(?:r\$\s*)?\d{1,5}(?:[,.]\d{2})?$/, /reais|real|o litro|por litro/])) {
    const name = lead.name ? `${lead.name}, ` : '';
    return `${name}perfeito.\n\nPreço anotado:\n${lead.productPrice} o litro.\n\nAgora a oferta já começa a ficar clara:\naçaí em litro,\npolpa in natura,\npedido direto pelo WhatsApp.\n\nPara segmentar bem os anúncios,\nvocê entrega em quais bairros?`;
  }

  if (lead.productDetail && lead.productPrice && lead.deliveryArea) {
    const name = lead.name ? `${lead.name}, ` : '';
    return `${name}já tenho os pontos principais:\n\n- produto: açaí em litro, polpa in natura;\n- preço: ${lead.productPrice} o litro;\n- entrega: ${lead.deliveryArea}.\n\nAgora posso conduzir para a oferta e o WhatsApp.\n\nVocê tem foto real do produto para usar no anúncio?`;
  }

  return '';
}

function fallbackReply(lead, lastUserText = '', messages = []) {
  const last = normalizeForMatch(lastUserText);
  const context = normalizeForMatch(messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n'));

  if (hasAny(last, [/nao.*nome|n.o.*nome|nome correto|corrigindo.*nome|meu nome e|meu nome ./]) && lead.name) {
    return `Perfeito, ${lead.name}. Corrigi aqui.\nAgora me conte um pouco do seu negócio ou do objetivo que você quer alcançar.`;
  }

  if (hasAny(last, [
    /strogonoff|estrogonofe|receita de bolo|receita|macarrao|cozinhar/,
    /futebol|politica|novela|filme|musica|piada/
  ])) {
    return 'Olha, meu amigo, eu até poderia tentar te responder, mas para esse tipo de assunto eu recomendo você procurar no ChatGPT. 😄\n\nPor aqui eu consigo te ajudar melhor com site, loja virtual, Google, tráfego pago, automação e atendimento para o seu negócio.';
  }

  if (hasAny(last, [/exemplo|modelo|foto|imagem|como seria|cardapio|cardapio digital|pagina de pedidos/]) && hasAny(context, [/bairro|whatsapp|motoboy|entregador|vender|comida|delivery/])) {
    const product = productLabel(lead);
    const businessName = lead.name ? `${product} do ${lead.name}` : product;
    return `Claro.\n\nUm cardápio digital para ${product} poderia ficar assim:\n\n**${businessName} - Pedidos pelo WhatsApp**\n\n1. Oferta principal:\n- ${product}\n- descrição curta do preparo\n- foto real do produto\n\n2. Pedido:\n- quantidade\n- observações\n- endereço de entrega ou retirada\n\n3. Botão final:\n**Enviar pedido no WhatsApp**\n\nQuando o cliente clicar,\no WhatsApp já abre com o pedido organizado.\n\nAssim você atende mais rápido e evita perder venda por conversa confusa.`;
  }

  if (hasAny(last, [/acai|delivery|cardapio|bairro|bairo|comida|lanchonete|restaurante/])) {
    if (lead.productDetail) {
      const name = lead.name ? `${lead.name}, ` : '';
      if (lead.productPrice) {
        if (lead.deliveryArea) {
          return `${name}perfeito.\n\nJá tenho o produto, preço e entrega:\naçaí em litro,\npolpa in natura,\n${lead.productPrice} o litro,\nentrega ${lead.deliveryArea}.\n\nAgora o melhor é montar a oferta e levar o cliente para o WhatsApp.\n\nVocê tem foto real da polpa ou da embalagem?`;
        }

        return `${name}perfeito.\n\nJá tenho o produto e o preço:\naçaí em litro,\npolpa in natura,\n${lead.productPrice} o litro.\n\nAgora precisamos definir a área de entrega.\n\nVocê entrega em quais bairros?`;
      }

      return `${name}entendi.\n\nO produto é açaí em litro,\npolpa in natura.\n\nNesse caso, a página precisa vender a confiança do produto:\norigem, preparo, embalagem, retirada/entrega e pedido pelo WhatsApp.\n\nQual é o preço do litro hoje?`;
    }

    if (lead.planPreference && (lead.channel || lead.stage)) {
      const name = lead.name ? `${lead.name}, ` : '';
      return `${name}perfeito.\n\nComo você já escolheu uma estrutura simples,\nnão vou voltar para o começo.\n\nVamos focar em vender mais ${productLabel(lead)}.\n\nA estrutura correta é:\n1. oferta clara;\n2. foto real do produto;\n3. botão direto para pedido no WhatsApp;\n4. anúncio no bairro.\n\nQual é a melhor forma de entregar ou retirar o pedido hoje?`;
    }

    const name = lead.name ? `${lead.name}, agora entendi melhor` : 'Agora entendi melhor';
    const nextQuestion = lead.channel
      ? 'Você quer que essa estrutura seja mais simples para começar rápido ou mais completa para escalar os pedidos?'
      : 'Você já recebe pedidos pelo WhatsApp hoje ou ainda vai começar do zero?';
    return `${name}: você quer vender ${productLabel(lead)} para pessoas da sua região.\n\nNesse caso, eu começaria com uma estrutura simples e direta:\n1. cardápio/página de pedidos pelo WhatsApp;\n2. fotos reais do produto;\n3. Google/SEO local para aparecer para quem procura perto de você;\n4. tráfego pago leve no bairro para trazer pedidos todos os dias.\n\n${nextQuestion}`;
  }

  if ((lead.channel || lead.stage) && (context.includes('vender') || context.includes('online') || context.includes('acai') || context.includes('bairro'))) {
    if (lead.planPreference) {
      if (lead.productDetail) {
        const name = lead.name ? `${lead.name}, ` : '';
        if (lead.productPrice) {
          if (lead.deliveryArea) {
            return `${name}perfeito.\n\nJá entendi:\naçaí em litro,\npolpa in natura,\n${lead.productPrice} o litro,\nentrega ${lead.deliveryArea}.\n\nVamos manter a estrutura simples para vender rápido:\n1. oferta clara do litro;\n2. foto real da polpa/embalagem;\n3. botão direto para pedido no WhatsApp;\n4. anúncio local no bairro.\n\nVocê tem foto real do produto para usar?`;
          }

          return `${name}perfeito.\n\nJá entendi:\naçaí em litro,\npolpa in natura,\n${lead.productPrice} o litro.\n\nVamos manter a estrutura simples para vender rápido:\n1. página com a oferta do litro;\n2. fotos reais da polpa e da embalagem;\n3. botão direto para pedido no WhatsApp;\n4. anúncio local no bairro.\n\nPara anunciar do jeito certo,\nvocê entrega em quais bairros?`;
        }

        return `${name}perfeito.\n\nJá entendi o produto:\naçaí em litro,\npolpa in natura.\n\nVamos manter a estrutura simples para vender rápido:\n1. página com a oferta do litro;\n2. fotos reais da polpa e da embalagem;\n3. botão direto para pedido no WhatsApp;\n4. anúncio local no bairro.\n\nPara fechar a oferta,\nqual é o preço do litro hoje?`;
      }

      const periodLine = lead.peakPeriod ? `\nComo você vende mais pela ${lead.peakPeriod}, os anúncios devem começar antes desse horário.` : '';
      const deliveryLine = lead.delivery ? '\nComo você quer usar entregador/motoboy, o pedido precisa chegar organizado com endereço e forma de pagamento.' : '';
      return `Perfeito. Vamos pelo caminho simples para vender rápido.${periodLine}${deliveryLine}\n\nEu montaria assim:\n1. cardápio/página simples para ${productLabel(lead)};\n2. botão direto para pedido no WhatsApp;\n3. fotos reais do produto;\n4. anúncio local no bairro para gerar pedido rápido.\n\nO próximo passo é definir a oferta inicial:\nqual é a principal opção de ${productLabel(lead)} que você quer vender primeiro?`;
    }

    if (lead.peakPeriod) {
      return `Perfeito, então vamos usar isso a favor da campanha.\n\nComo você vende mais pela ${lead.peakPeriod}, dá para concentrar os anúncios antes e durante esse horário.\n\nA estrutura ficaria assim:\n1. cardápio/página de pedidos no WhatsApp;\n2. combos de açaí com fotos boas;\n3. anúncios no bairro no horário certo;\n4. rota organizada para o entregador de moto.\n\nVocê já tem fotos boas dos seus açaís ou ainda precisa produzir esse material?`;
    }

    return 'Perfeito, então já temos um ponto importante:\nvocê já usa WhatsApp para vender ou receber pedidos.\n\nO próximo passo é organizar isso para vender mais todos os dias:\n1. cardápio/página de pedidos;\n2. oferta e combos claros;\n3. anúncios no bairro;\n4. Google local para quem procura perto de você.\n\nVocê quer começar com uma estrutura simples e rápida ou com algo mais completo?';
  }

  if (hasAny(last, [/vender online|verder online|vender pela internet|vender todo dia|vender todos os dias|como faco para vender|como vender|loja online|ecommerce|e-commerce/])) {
    return 'Boa pergunta. Para vender online do jeito certo, primeiro precisamos escolher a estrutura certa para o seu caso.\n\nSe você tem muitos produtos, o melhor caminho costuma ser uma loja virtual.\nSe você vende poucos serviços ou uma oferta principal, uma landing page com WhatsApp pode converter mais rápido.\nDepois disso, entram SEO e tráfego pago para trazer clientes.\n\nMe diga: você vende produtos, serviços ou os dois?';
  }

  if (hasAny(last, [/aparecer no google|ranquear|seo|topo do google|busca do google|pesquisa do google/])) {
    return 'Para aparecer no Google, normalmente trabalhamos em três frentes: uma página bem estruturada, SEO local e conteúdo com as palavras que seus clientes pesquisam.\n\nSe a empresa ainda não tem site forte, começamos pela base. Se já tem site, melhoramos SEO, velocidade, títulos, páginas de serviço e sinais locais.\n\nQual serviço ou produto você quer que as pessoas encontrem no Google?';
  }

  if (hasAny(last, [/trafego pago|anuncio|anuncios|ads|google ads|meta ads|facebook ads|instagram ads/])) {
    return 'Tráfego pago funciona melhor quando não é só impulsionar post.\nO ideal é ter uma oferta clara, uma página ou WhatsApp bem preparado, campanha segmentada e acompanhamento para ajustar o que traz cliente de verdade.\n\nVocê já anuncia hoje ou vai começar do zero?';
  }

  if (hasAny(last, [/atendente|chatbot|robo|agente|responder cliente|qualificar lead/])) {
    return 'Um agente de atendimento pode responder dúvidas, entender o que o cliente precisa, qualificar o lead e encaminhar para o WhatsApp com contexto.\n\nO ponto principal é ele conhecer bem o seu negócio e não ficar preso em respostas secas.\n\nHoje você recebe mais contatos pelo WhatsApp, Instagram ou pelo site?';
  }

  if (hasAny(last, [/preco|valor|quanto custa|orcamento|investimento|mensalidade/])) {
    return 'Consigo te orientar, mas não é correto chutar um valor sem entender o escopo.\n\nO preço muda conforme o tipo de projeto: site, loja virtual, landing page, tráfego, SEO ou agente de atendimento.\n\nMe diga qual solução você está buscando e se precisa de algo simples para começar ou uma estrutura mais completa.';
  }

  if (hasAny(last, [/quais servicos|o que voces fazem|servicos|solucoes|propagacao digital/])) {
    return 'A Propagação Digital ajuda empresas a venderem melhor na internet.\n\nFazemos criação de sites, lojas virtuais, landing pages, SEO para Google, tráfego pago, automações com IA, agentes de atendimento, vídeos e artes.\n\nMe diga seu objetivo principal agora: ser encontrado, vender mais, automatizar atendimento ou melhorar sua presença online?';
  }

  if (hasAny(last, [/obrigado|obrigada|valeu|beleza|ok|certo/])) {
    return 'Perfeito. Quando quiser, me diga qual é o seu negócio e o que você quer melhorar primeiro.\nAí eu te indico o caminho mais adequado.';
  }

  if (context.includes('vender') || context.includes('verder') || context.includes('cliente') || context.includes('online') || context.includes('acai') || context.includes('bairro')) {
    return 'Agora ficou claro: o foco é vender todos os dias para clientes da sua região.\n\nPara um negócio como esse, eu começaria com uma página/cardápio de pedidos bem simples no WhatsApp, oferta clara, fotos boas, SEO local e tráfego pago leve para o bairro.\n\nVocê já vende pelo WhatsApp hoje ou ainda vai começar do zero?';
  }

  if (!lead.product && lead.service && services[lead.service]) {
    const greeting = lead.name ? `${lead.name}, pelo que você explicou` : 'Pelo que você explicou';
    return `${greeting}, ${services[lead.service]} parece ser um bom caminho.\n\nPara eu te orientar melhor, me diga: você quer começar rápido com uma solução mais simples ou montar uma estrutura mais completa para vender todos os dias?`;
  }

  if (lead.name && !lead.business) {
    return `Prazer, ${lead.name}.\nMe fale um pouco do seu negócio ou do objetivo que você quer alcançar, que eu te ajudo a escolher o melhor caminho.`;
  }

  return 'Entendi. Para eu te responder melhor, me diga em uma frase qual é o seu negócio e qual resultado você quer agora.\n\nExemplo: “tenho uma loja de roupas e quero vender pelo WhatsApp” ou “sou prestador de serviço e quero aparecer no Google”.';
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

    const lastUserText = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const visitorId = safeVisitorId(body.visitorId);

    if (isForgetRequest(lastUserText)) {
      await forgetClientMemory(visitorId).catch((error) => {
        console.error('[pd-client-memory-forget]', error.message);
      });

      return sendJson(res, 200, {
        reply: 'Pronto.\n\nApaguei a memória comercial associada a este navegador.\n\nSe você voltar depois, começaremos um novo atendimento.',
        lead: {},
        provider: 'memory',
        memory: { forgotten: true }
      });
    }

    const clientLead = { ...(body.lead || {}) };
    delete clientLead.returningClient;
    delete clientLead.previousSummary;
    delete clientLead.memoryLastContact;

    let storedMemory = null;
    let recalledMemory = null;

    try {
      storedMemory = await loadVisitorMemory(visitorId);
      const recallIdentity = extractRecallIdentity(lastUserText);
      if (recallIdentity) {
        recalledMemory = await findReturningMemory(recallIdentity.name, recallIdentity.businessHint);
      }
    } catch (error) {
      console.error('[pd-client-memory-load]', error.message);
    }

    const activeMemory = recalledMemory || storedMemory;
    const lead = updateLead({
      ...(activeMemory?.lead || {}),
      ...clientLead
    }, messages);

    if (recalledMemory) {
      lead.returningClient = true;
      lead.previousSummary = cleanText(recalledMemory.summary, 700);
      lead.memoryLastContact = cleanText(recalledMemory.updatedAt, 80);
      await linkVisitorMemory(visitorId, recalledMemory.visitorId).catch((error) => {
        console.error('[pd-client-memory-link]', error.message);
      });
    } else if (extractRecallIdentity(lastUserText)) {
      lead.recallNotFound = true;
    }

    nextLead = lead;
    let reply = '';
    let provider = OPENAI_API_KEY ? 'fallback' : 'missing-openai-key';

    if (OPENAI_API_KEY) {
      try {
        reply = await callOpenAI(messages, lead, cleanText(body.page, 160), cleanText(body.path, 120));
        if (reply) {
          provider = 'openai';
        } else {
          provider = 'openai-empty';
          console.error('[pd-atendimento-ai] resposta OpenAI sem texto');
        }
      } catch (error) {
        provider = 'openai-error';
        console.error('[pd-atendimento-ai]', error.message);
      }
    } else {
      console.error('[pd-atendimento-ai] OPENAI_API_KEY ausente no runtime');
    }

    if (!reply) {
      reply = priorityReply(lead, messages[messages.length - 1]?.content || '', messages);
    }

    if (!reply && GEMINI_API_KEY && ALLOW_GEMINI_FALLBACK) {
      try {
        reply = await callGemini(messages, lead, cleanText(body.page, 160), cleanText(body.path, 120));
        if (reply) provider = 'gemini';
      } catch (error) {
        console.error('[pd-atendimento-gemini]', error.message);
      }
    }

    const finalReply = formatForChatReadability(reply || fallbackReply(lead, lastUserText, messages));
    let memorySaved = false;

    try {
      memorySaved = await saveClientMemory(visitorId, lead, [
        ...messages,
        { role: 'assistant', content: finalReply }
      ]);
    } catch (error) {
      console.error('[pd-client-memory-save]', error.message);
    }

    return sendJson(res, 200, {
      reply: finalReply,
      lead,
      provider,
      memory: {
        recognized: Boolean(recalledMemory),
        saved: memorySaved
      }
    });
  } catch (error) {
    console.error('[pd-atendimento]', error);
    return sendJson(res, 200, {
      reply: 'Tive uma instabilidade rápida aqui, mas continuo com você.\nMe diga em uma frase qual é seu negócio e o que você quer melhorar primeiro.',
      lead: Object.keys(nextLead).length ? nextLead : (body && body.lead ? body.lead : {})
    });
  }
};
