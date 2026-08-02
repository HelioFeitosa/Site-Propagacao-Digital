const ALLOWED_FIELDS = new Set([
  'customerName',
  'businessType',
  'productsOrServices',
  'salesChannels',
  'goals',
  'painPoints',
  'preferences',
  'visitorPhone',
  'humanHandoffRequested'
]);
const MIN_CONFIDENCE = 0.78;

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

function extractDeterministicMemoryUpdates(message, { previousAssistant = '' } = {}) {
  const text = clean(message, 900);
  const source = normalize(text);
  const previous = normalize(previousAssistant);
  const updates = [];
  const explicitName = text.match(/(?:meu nome (?:é|e)|me chamo|pode me chamar de|agora meu nome (?:é|e)|nome correto (?:é|e))\s+([A-Za-zÀ-ÿ'-]{2,40})/i);
  const nameOnly = /(?:como.*(?:chamar|chamasse)|qual.*seu nome|seu nome)/.test(previous) && /^[A-Za-zÀ-ÿ'-]{2,40}$/.test(text);
  if (explicitName || nameOnly) {
    const name = clean(explicitName?.[1] || text, 40);
    updates.push(memoryUpdate('customerName', name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), explicitName?.[0] || text));
  }
  if (/(vendo|trabalho com|tenho (uma )?pizzaria|meu negocio.*pizzaria).*pizza|vendo pizza|pizzaria/.test(source)) {
    updates.push(memoryUpdate('businessType', 'pizzaria', text));
    updates.push(memoryUpdate('productsOrServices', 'pizza', source.includes('pizza') ? text : 'pizzaria'));
  }
  if (/(ponto fisico|loja fisica).*(whatsapp|zap)|(whatsapp|zap).*(ponto fisico|loja fisica)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'ponto físico e pedidos pelo WhatsApp', text));
  } else if (/(whatsapp|zap)/.test(source) && /(vendo|pedidos|atendo|canal|pelo)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'pedidos pelo WhatsApp', text));
  } else if (/(ponto fisico|loja fisica)/.test(source)) {
    updates.push(memoryUpdate('salesChannels', 'ponto físico', text));
  }
  if (/(quero|preciso|objetivo).*(vender mais|aumentar.*venda)/.test(source)) {
    updates.push(memoryUpdate('goals', 'aumentar as vendas', text));
  }
  const phone = text.match(/(?:meu (?:telefone|celular|whatsapp)(?: é| e|:)?\s*)(\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4})/i);
  if (phone) updates.push(memoryUpdate('visitorPhone', phone[1], phone[0]));
  return updates;
}

function buildFactualSummary(state = {}) {
  return [
    state.customerName && `Nome: ${state.customerName}`,
    state.businessType && `Negócio: ${state.businessType}`,
    state.productsOrServices && `Produto: ${state.productsOrServices}`,
    state.salesChannels && `Canais: ${state.salesChannels}`,
    state.goals && `Objetivo: ${state.goals}`,
    state.painPoints && `Dores: ${state.painPoints}`,
    Array.isArray(state.visualRequests) && state.visualRequests.length && `Solicitações visuais: ${state.visualRequests.join(', ')}`,
    state.galleryRejectedForSegment && 'Decisão: rejeitou a galeria genérica por não ter exemplo compatível',
    state.humanHandoffRequested && 'Próximo passo: atendimento humano solicitado'
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
  if (field === 'humanHandoffRequested') {
    return normalizedValue === 'true' && /(falar com|responsavel|atendimento humano|pessoa)/.test(source);
  }
  if (field === 'visitorPhone') {
    return /(meu telefone|meu celular|meu whatsapp)/.test(source);
  }
  return false;
}

function applyMemoryUpdates(currentState = {}, updates = [], currentMessage = '', options = {}) {
  const state = { ...currentState, memoryFacts: { ...(currentState.memoryFacts || {}) } };
  const applied = [];
  const rejected = [];
  const normalizedMessage = normalize(currentMessage);
  const explicitCorrection = /(agora meu nome|nome correto|na verdade|agora eu vendo|eu vendo|meu negocio|minha empresa)/.test(normalizedMessage);
  const metaMessage = isMetaOrNonCommercial(currentMessage) && !explicitCorrection;

  for (const raw of Array.isArray(updates) ? updates.slice(0, 8) : []) {
    const field = clean(raw?.field, 60);
    const value = field === 'humanHandoffRequested' ? raw?.value === true : clean(raw?.value, 240);
    const evidence = clean(raw?.evidence, 300);
    const confidence = Number(raw?.confidence);

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

    const existing = field === 'humanHandoffRequested' ? state[field] : clean(state[field], 240);
    let nextValue = value;
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
    applied.push({ field, value: nextValue });
  }

  return { state, applied, rejected };
}

module.exports = {
  ALLOWED_FIELDS,
  MIN_CONFIDENCE,
  applyMemoryUpdates,
  buildFactualSummary,
  extractDeterministicMemoryUpdates
};
