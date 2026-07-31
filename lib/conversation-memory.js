const ALLOWED_FIELDS = new Set([
  'customerName',
  'businessType',
  'productsOrServices',
  'salesChannels',
  'goals',
  'painPoints',
  'preferences',
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
  return false;
}

function applyMemoryUpdates(currentState = {}, updates = [], currentMessage = '') {
  const state = { ...currentState };
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

    if (!ALLOWED_FIELDS.has(field) || !Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
      rejected.push({ field, reason: 'invalid-field-or-confidence' });
      continue;
    }
    if (!isExplicitEvidence(currentMessage, evidence)) {
      rejected.push({ field, reason: 'missing-explicit-evidence' });
      continue;
    }
    if (metaMessage || !fieldHasContext(field, currentMessage, value)) {
      rejected.push({ field, reason: 'incompatible-context' });
      continue;
    }

    state[field] = value;
    applied.push({ field, value });
  }

  return { state, applied, rejected };
}

module.exports = {
  ALLOWED_FIELDS,
  MIN_CONFIDENCE,
  applyMemoryUpdates
};
