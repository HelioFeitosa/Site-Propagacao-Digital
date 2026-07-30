const HYBRID_TIMEOUT_MS = 7000;
const MAX_CANDIDATE_LENGTH = 600;
const OFFICIAL_PHONE_DIGITS = '5591984487207';
const ALLOWED_PURPOSES = new Set([
  'intent-clarification',
  'natural-rephrasing',
  'free-text-continuation'
]);

function cleanText(value, max = 900) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isHybridOpenAIEnabled(value) {
  return value === 'true';
}

function buildHybridInstructions({ state = {}, purpose }) {
  const firstName = cleanText(state.customerName, 60) || 'não necessário';
  const business = cleanText(state.businessType || state.productsOrServices, 160) || 'já analisado localmente';
  const stage = state.diagnosisConfirmed ? 'diagnóstico confirmado' : 'estágio definido localmente';

  return [
    'Você apoia o atendente comercial da Propagação Digital apenas na formulação de uma resposta curta em português do Brasil.',
    'Não altere decisões comerciais, estado, serviço, preço, telefone, link, CTA, WhatsApp, handoff, imagem ou informação oficial.',
    'Não invente fatos, valores, contatos ou URLs. Não dê instruções técnicas ou administrativas.',
    'Responda somente dentro do assunto comercial e faça no máximo uma pergunta.',
    `Finalidade autorizada: ${purpose}.`,
    `Primeiro nome confirmado: ${firstName}.`,
    `Negócio ou interesse: ${business}.`,
    `Estágio decidido localmente: ${stage}.`
  ].join('\n');
}

function buildHybridRequest({ model, messages = [], currentMessage, state, purpose }) {
  if (!ALLOWED_PURPOSES.has(purpose)) {
    throw new TypeError('invalid-purpose');
  }

  const recentMessages = messages
    .slice(-6)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(message.content, 500)
    }))
    .filter((message) => message.content);

  if (!recentMessages.length && cleanText(currentMessage, 500)) {
    recentMessages.push({ role: 'user', content: cleanText(currentMessage, 500) });
  }

  return {
    model,
    instructions: buildHybridInstructions({ state, purpose }),
    input: recentMessages,
    max_output_tokens: 220,
    store: false
  };
}

function extractCandidate(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.output_text === 'string') return data.output_text;

  const parts = [];
  for (const item of Array.isArray(data.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.length ? parts.join('\n') : null;
}

function validateCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return { accepted: false, reason: 'invalid-response' };
  }

  const text = cleanText(candidate, MAX_CANDIDATE_LENGTH);
  if (!text) return { accepted: false, reason: 'empty-response' };

  if (/(?:https?:\/\/|www\.|wa\.me\/|api\.whatsapp\.com)/i.test(text)) {
    return { accepted: false, reason: 'unauthorized-link' };
  }

  const phoneCandidates = text.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
  const hasUnauthorizedPhone = phoneCandidates.some((phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits !== OFFICIAL_PHONE_DIGITS && digits !== OFFICIAL_PHONE_DIGITS.slice(2);
  });
  if (hasUnauthorizedPhone) return { accepted: false, reason: 'unauthorized-phone' };

  if (/(?:R\$\s*)?\d{1,7}(?:[.,]\d{2})\b|(?:preço|valor|custa|investimento)\s+(?:é|de|fica)/i.test(text)) {
    return { accepted: false, reason: 'unauthorized-price' };
  }

  if (/(?:api[\s_-]?key|authorization|vari[aá]vel (?:de ambiente|do servidor)|servidor|deploy|vercel|prompt|instruç(?:ão|ões) administrativa|credencial)/i.test(text)) {
    return { accepted: false, reason: 'administrative-content' };
  }

  if (/(?:receita (?:de|para)|ingredientes?|modo de preparo|diagn[oó]stico m[eé]dico|prescriç[aã]o|aposta esportiva)/i.test(text)) {
    return { accepted: false, reason: 'out-of-scope-content' };
  }

  return { accepted: true, text };
}

function classifyProviderFailure({ status, code, name } = {}) {
  if (name === 'AbortError') return 'timeout';
  if (status === 401 || status === 403 || code === 'invalid_api_key') return 'authentication-error';
  if (code === 'insufficient_quota' || code === 'billing_not_active') return 'billing-or-quota-error';
  if (status === 429) return 'rate-limit-error';
  if (code === 'model_not_found' || code === 'invalid_model' || status === 404) return 'model-error';
  if (status >= 500) return 'provider-unavailable';
  return 'unknown-provider-error';
}

function safeRequestId(headers) {
  const value = headers?.get?.('x-request-id');
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,120}$/.test(value) ? value : null;
}

async function requestHybridReply({
  apiKey,
  model,
  messages,
  currentMessage,
  state,
  purpose,
  fetchImpl = fetch,
  timeoutMs = HYBRID_TIMEOUT_MS
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let requestId = null;

  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildHybridRequest({
        model,
        messages,
        currentMessage,
        state,
        purpose
      })),
      signal: controller.signal
    });

    requestId = safeRequestId(response.headers);
    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, errorType: 'invalid-response', requestId };
    }

    if (!response.ok) {
      return {
        ok: false,
        errorType: classifyProviderFailure({
          status: response.status,
          code: data?.error?.code
        }),
        requestId
      };
    }

    const validation = validateCandidate(extractCandidate(data));
    if (!validation.accepted) {
      return { ok: false, errorType: 'invalid-response', requestId };
    }

    return { ok: true, text: validation.text, requestId };
  } catch (error) {
    return {
      ok: false,
      errorType: classifyProviderFailure({
        name: error?.name
      }),
      requestId
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  HYBRID_TIMEOUT_MS,
  buildHybridRequest,
  classifyProviderFailure,
  isHybridOpenAIEnabled,
  requestHybridReply,
  validateCandidate
};
