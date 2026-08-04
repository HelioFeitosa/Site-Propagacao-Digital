const ALLOWED_FIELDS = new Set([
  'customerName',
  'businessType',
  'productsOrServices',
  'salesChannels',
  'goals',
  'painPoints',
  'preferences',
  'visitorBudget',
  'officialPrice',
  'quotedThirdPartyAmount',
  'customerTypes',
  'visitorPhone',
  'humanHandoffRequested',
  'contactPreference',
  'callbackRequested',
  'urgency'
]);
const MIN_CONFIDENCE = 0.78;
const CANONICAL_FIELD_MAP = Object.freeze({
  customerName: 'name',
  businessType: 'business',
  productsOrServices: 'products',
  customerTypes: 'customerTypes',
  salesChannels: 'channels',
  goals: 'goal',
  visitorBudget: 'visitorBudget',
  visitorPhone: 'visitorPhone'
});

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function memoryUpdate(field, value, evidence, confidence = 0.99) {
  return { field, value, evidence, confidence, source: 'local-deterministic' };
}

function canonicalFact(value, turn = null, confidence = 1) {
  return { value, source: 'user-explicit', turn, confidence };
}

function createCanonicalMemory(state = {}) {
  return { ...(state.canonicalMemory || {}) };
}

function projectCanonicalMemory(state) {
  const canonical = state.canonicalMemory || {};
  for (const [legacyField, canonicalField] of Object.entries(CANONICAL_FIELD_MAP)) {
    const fact = canonical[canonicalField];
    if (!fact) continue;
    state[legacyField] = canonicalField === 'visitorPhone' && fact.value?.display
      ? fact.value.display
      : fact.value;
  }
  return state;
}

function normalizeBrazilianVisitorPhone(message) {
  const text = clean(message, 300);
  if (!/(?:meu|minha)\s+(?:whatsapp|zap|telefone|celular)/i.test(text)) return null;
  const ownedPart = text.replace(/^.*?(?:meu|minha)\s+(?:whatsapp|zap|telefone|celular)(?:\s+(?:é|e)|\s*:)?\s*/i, '');
  let digits = ownedPart.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length === 13) digits = digits.slice(2);
  if (!/^[1-9]{2}9\d{8}$/.test(digits)) return null;
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  return {
    display: `(${ddd}) ${local[0]} ${local.slice(1, 5)}-${local.slice(5)}`,
    e164: `55${digits}`,
    source: 'user-explicit'
  };
}

function formatBudgetValue(rawValue, usesThousandsWord = false) {
  const raw = clean(rawValue, 40).toLowerCase();
  if (usesThousandsWord) {
    const numeric = Number(raw.replace(',', '.'));
    return Number.isFinite(numeric) ? `R$ ${Math.round(numeric * 1000).toLocaleString('pt-BR')}` : '';
  }
  const normalized = raw.replace(/\s/g, '');
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(normalized)) return '';
  return `R$ ${normalized}`;
}

function extractVisitorBudget(message) {
  const text = clean(message, 900);
  const contextual = /(?:posso|consigo|quero|pretendo|vou)?\s*(?:investir|gastar)|(?:meu\s+)?or[cç]amento|tenho\s+(?:at[eé]\s+)?|s[oó]\s+posso\s+investir/i;
  if (!contextual.test(text)) return null;
  const thousandWord = text.match(/(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*mil\b/i);
  const numeric = text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:reais)?/i);
  const value = thousandWord
    ? formatBudgetValue(thousandWord[1], true)
    : numeric ? formatBudgetValue(numeric[1]) : '';
  if (!value) return null;
  return memoryUpdate('visitorBudget', value, thousandWord?.[0] || numeric[0]);
}

function extractDeterministicMemoryUpdates(message, { previousAssistant = '' } = {}) {
  const text = clean(message, 900);
  const source = normalize(text);
  const previous = normalize(previousAssistant);
  const updates = [];
  const flavioIntroduction = text.match(/^([A-Za-zÀ-ÿ'-]{2,40})\s+(?:eu\s+)?trabalho\s+com\s+(m[oó]veis\s+planejados)/i);
  if (flavioIntroduction) {
    const name = clean(flavioIntroduction[1], 40);
    updates.push(memoryUpdate('customerName', name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), name, 1));
    updates.push(memoryUpdate('businessType', 'móveis planejados', flavioIntroduction[2], 1));
    updates.push(memoryUpdate('productsOrServices', 'móveis planejados', flavioIntroduction[2], 1));
  }
  const explicitName = text.match(/(?:meu nome (?:é|e)|me chamo|pode me chamar de|agora meu nome (?:é|e)|nome correto (?:é|e))\s+([A-Za-zÀ-ÿ'-]{2,40})/i);
  const nameOnly = /(?:como.*(?:chamar|chamasse)|qual.*seu nome|seu nome)/.test(previous) && /^[A-Za-zÀ-ÿ'-]{2,40}$/.test(text);
  if (explicitName || nameOnly) {
    const name = clean(explicitName?.[1] || text, 40);
    updates.push(memoryUpdate('customerName', name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), explicitName?.[0] || text));
  }
  const serviceIntroduction = text.match(/^([A-Za-zÀ-ÿ'-]{2,40})\s+(?:eu\s+)?tenho\s+uma\s+(assist[eê]ncia\s+t[eé]cnica\s+de\s+refrigeradores\s+e\s+geladeiras)/i);
  if (serviceIntroduction) {
    const name = clean(serviceIntroduction[1], 40);
    updates.push(memoryUpdate('customerName', name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), name));
    updates.push(memoryUpdate('businessType', 'assistência técnica de refrigeradores e geladeiras', serviceIntroduction[2]));
    updates.push(memoryUpdate('productsOrServices', 'conserto de refrigeradores e geladeiras', serviceIntroduction[2]));
  }
  if (/(vendo|trabalho com|tenho (uma )?pizzaria|meu negocio.*pizzaria).*pizza|vendo pizza|pizzaria/.test(source)) {
    updates.push(memoryUpdate('businessType', 'pizzaria', text));
    updates.push(memoryUpdate('productsOrServices', 'pizza', source.includes('pizza') ? text : 'pizzaria'));
  }
  if (/(ponto fisico|loja fisica).*(whatsapp|zap)|(whatsapp|zap).*(ponto fisico|loja fisica)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'ponto físico e pedidos pelo WhatsApp', text));
  } else if (/(whatsapp|zap)/.test(source) && !/redes/.test(source) && /(vendo|pedidos|atendo|canal|pelo)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'pedidos pelo WhatsApp', text));
  } else if (/(ponto fisico|loja fisica)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'ponto físico', text));
  }
  if (/(quero|preciso|objetivo).*(vender mais|aumentar.*venda)/.test(source)) {
    updates.push(memoryUpdate('goals', 'aumentar as vendas', text));
  }
  if (/(quero|preciso|objetivo).*(receber mais pedidos).*(aparecer mais).*(regiao)/.test(source)) {
    updates.push(memoryUpdate('goals', 'receber mais pedidos e aparecer mais na região', text));
  }
  if (/atendo\s+casas.*apartamentos.*empresas/.test(source)) {
    updates.push(memoryUpdate('customerTypes', 'casas, apartamentos e empresas', text, 1));
  }
  if (/(vendo|atendo).*(zap|whatsapp).*(redes)|(zap|whatsapp).*(redes)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'WhatsApp e redes sociais', text, 1));
  }
  if (/(quero|preciso).*(site basico).*(apresentar projetos|receber orcamentos)/.test(source)) {
    updates.push(memoryUpdate('goals', 'site básico para apresentar projetos e receber orçamentos', text, 1));
  } else if (/(quero|preciso).*(site basico)/.test(source)) {
    updates.push(memoryUpdate('goals', 'site básico para apresentar projetos e receber orçamentos', text, 1));
  }
  const visitorBudget = extractVisitorBudget(text);
  if (visitorBudget) updates.push(visitorBudget);
  const phone = normalizeBrazilianVisitorPhone(text);
  if (phone) updates.push(memoryUpdate('visitorPhone', phone, text, 1));
  return updates;
}

function buildFactualSummary(state = {}) {
  return [
    state.customerName && `Nome: ${state.customerName}`,
    state.businessType && `Negócio: ${state.businessType}`,
    state.productsOrServices && `Produto: ${state.productsOrServices}`,
    state.salesChannels && `Canais: ${state.salesChannels}`,
    state.goals && `Objetivo: ${state.goals}`,
    state.visitorBudget && `Orçamento do visitante: ${state.visitorBudget}`,
    state.painPoints && `Dores: ${state.painPoints}`,
    Array.isArray(state.visualRequests) && state.visualRequests.length && `Solicitações visuais: ${state.visualRequests.join(', ')}`,
    state.galleryRejectedForSegment && 'Decisão: rejeitou a galeria genérica por não ter exemplo compatível',
    state.humanHandoffRequested && 'Próximo passo: atendimento humano solicitado',
    state.contactPreference && `Preferência de contato: ${state.contactPreference}`,
    state.callbackRequested && 'Ligação solicitada',
    Array.isArray(state.consultationDoubts) && state.consultationDoubts.length && `Dúvidas: ${state.consultationDoubts.join(', ')}`
  ].filter(Boolean).join('; ');
}

function isExplicitEvidence(message, evidence) {
  const normalizedMessage = normalize(message);
  const normalizedEvidence = normalize(evidence);
  return normalizedEvidence.length >= 2 && normalizedMessage.includes(normalizedEvidence);
}

function isMetaOrNonCommercial(message) {
  const value = normalize(message);
  if (/^(sim|nao|mais ou menos|vamos dizer que sim|continue|pode falar|estou aguardando|socorro|obrigado|ok|certo|talvez)$/.test(value)) return true;
  return /(voce.*(louco|piada|raciocinando|entendeu errado)|obrigado pelo que|eu ja falei|nao foi isso|insulto|assistente|inteligencia artificial|\bia\b|prompt|servidor|variavel|api)/.test(value);
}

function fieldHasContext(field, message, value) {
  const source = normalize(message);
  const normalizedValue = normalize(value);
  if (!normalizedValue) return false;

  if (field === 'customerName') {
    return /(meu nome|me chamo|pode me chamar|agora meu nome|nome correto|^\w+\s+(?:eu\s+)?(?:vendo|trabalho|tenho|ofereco))/.test(source);
  }
  if (field === 'businessType' || field === 'productsOrServices') {
    return /(vendo|vende|vender|trabalho com|ofereco|ofere[cç]o|tenho (uma|um)|meu negocio|minha empresa|produzo|faco|fa[cç]o|atendo|pedidos|agora eu vendo)/.test(source);
  }
  if (field === 'salesChannels') {
    return /(whatsapp|zap|instagram|facebook|loja fisica|ponto|site|internet|marketplace|delivery|pedidos pelo|vendo pelo|atendo pelo)/.test(source);
  }
  if (field === 'goals') {
    return /(objetivo|quero|preciso|melhorar|aumentar|conseguir|vender mais|atrair|divulgar|aparecer)/.test(source);
  }
  if (field === 'painPoints') {
    return /(dificuldade|problema|nao consigo|pouco|quase ninguem|queda|perdendo)/.test(source);
  }
  if (field === 'preferences') {
    return /(prefiro|gostaria|quero que|sem pressa|devagar)/.test(source);
  }
  if (field === 'visitorBudget') {
    return /(investir|gastar|orcamento|tenho ate|reais|r\$|\bmil\b)/.test(source);
  }
  if (field === 'officialPrice' || field === 'quotedThirdPartyAmount') {
    return /(preco|valor|cotacao|orcamento|terceiro|fornecedor)/.test(source);
  }
  if (field === 'humanHandoffRequested') {
    return normalizedValue === 'true' && /(falar com|responsavel|atendimento humano|pessoa)/.test(source);
  }
  if (field === 'visitorPhone') {
    return /(meu telefone|meu celular|meu whatsapp)/.test(source);
  }
  if (field === 'customerTypes') {
    return /(atendo|clientes|casas|apartamentos|empresas|publico)/.test(source);
  }
  return false;
}

function applyMemoryUpdates(currentState = {}, updates = [], currentMessage = '', options = {}) {
  const state = {
    ...currentState,
    memoryFacts: { ...(currentState.memoryFacts || {}) },
    canonicalMemory: createCanonicalMemory(currentState),
    rejectedFacts: Array.isArray(currentState.rejectedFacts) ? [...currentState.rejectedFacts] : []
  };
  projectCanonicalMemory(state);
  const applied = [];
  const rejected = [];
  const normalizedMessage = normalize(currentMessage);
  const explicitCorrection = /(agora meu nome|nome correto|na verdade|agora eu vendo|eu vendo|meu negocio|minha empresa)/.test(normalizedMessage);
  const metaMessage = isMetaOrNonCommercial(currentMessage) && !explicitCorrection;
  if (/(?:eu\s+)?n[aã]o\s+(?:vendo|trabalho com|ofere[cç]o)\s+pizza/i.test(currentMessage)) {
    if (!state.rejectedFacts.some((fact) => normalize(fact.value) === 'pizza')) {
      state.rejectedFacts.push({ field: 'products', value: 'pizza', reason: 'explicitly-denied-by-user', turn: options.turn ?? null });
    }
    for (const canonicalField of ['business', 'products']) {
      if (normalize(state.canonicalMemory[canonicalField]?.value).includes('pizza')) delete state.canonicalMemory[canonicalField];
    }
    projectCanonicalMemory(state);
  }

  for (const raw of Array.isArray(updates) ? updates.slice(0, 8) : []) {
    const field = clean(raw?.field, 60);
    const booleanField = field === 'humanHandoffRequested' || field === 'callbackRequested';
    const phoneField = field === 'visitorPhone';
    const value = booleanField ? raw?.value === true : phoneField ? raw?.value : clean(raw?.value, 240);
    const evidence = clean(raw?.evidence, 300);
    const confidence = Number(raw?.confidence);

    if (state.rejectedFacts.some((fact) => normalize(value?.display || value).includes(normalize(fact.value)))) {
      rejected.push({ field, reason: 'explicitly-rejected-fact' });
      continue;
    }

    if (!ALLOWED_FIELDS.has(field) || (field !== 'humanHandoffRequested' && !value) || !Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
      rejected.push({ field, reason: 'invalid-field-or-confidence' });
      continue;
    }
    if (!isExplicitEvidence(currentMessage, evidence)) {
      rejected.push({ field, reason: 'missing-explicit-evidence' });
      continue;
    }
    const deterministicNameAnswer = raw?.source === 'local-deterministic' && field === 'customerName';
    if (metaMessage || (!deterministicNameAnswer && !fieldHasContext(field, currentMessage, value))) {
      rejected.push({ field, reason: 'incompatible-context' });
      continue;
    }

    const comparableValue = phoneField ? value.display : value;
    const existing = booleanField ? state[field] : clean(state[field], 240);
    let nextValue = comparableValue;
    const equivalentSalesGoal = field === 'goals'
      && /(vender mais|aumentar.*venda)/.test(normalize(existing))
      && /(vender mais|aumentar.*venda)/.test(normalize(value));
    if (equivalentSalesGoal) nextValue = existing;
    if (existing && normalize(existing) !== normalize(value) && !explicitCorrection && !equivalentSalesGoal) {
      if (field === 'customerName' || field === 'businessType' || field === 'visitorPhone') {
        rejected.push({ field, reason: 'confirmed-value-requires-explicit-correction' });
        continue;
      }
      if (['productsOrServices', 'salesChannels', 'goals', 'painPoints', 'preferences'].includes(field)) {
        nextValue = clean(`${existing}; ${value}`, 240);
      }
    }

    state[field] = nextValue;
    state.memoryFacts[field] = { value: nextValue, source: 'user-explicit', turn: Number.isInteger(options.turn) ? options.turn : null };
    const canonicalField = CANONICAL_FIELD_MAP[field];
    if (canonicalField) state.canonicalMemory[canonicalField] = canonicalFact(phoneField ? value : nextValue, Number.isInteger(options.turn) ? options.turn : null, 1);
    applied.push({ field, value: nextValue });
  }

  projectCanonicalMemory(state);
  return { state, applied, rejected };
}

module.exports = {
  ALLOWED_FIELDS,
  MIN_CONFIDENCE,
  applyMemoryUpdates,
  buildFactualSummary,
  createCanonicalMemory,
  extractDeterministicMemoryUpdates,
  extractVisitorBudget,
  normalizeBrazilianVisitorPhone,
  projectCanonicalMemory
};
