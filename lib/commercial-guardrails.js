const OFFICIAL_PHONE_DISPLAY = '(91) 9 8448-7207';
const OFFICIAL_WHATSAPP = '5591984487207';
const STORE_PRICES = Object.freeze({
  essential: 'R$ 1.500',
  professional: 'R$ 3.000',
  complete: 'R$ 5.000'
});
const ALLOWED_ASSET_IDS = new Set(['lume-modas-functional-demo']);
const ALLOWED_ACTIONS = new Set(['whatsapp', 'gallery', 'service-page']);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(value, max = 700) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function createConversationState(seed = {}) {
  return {
    commercialVersion: 2,
    customerName: '',
    businessType: '',
    productsOrServices: '',
    salesChannels: '',
    goals: '',
    painPoints: '',
    preferences: '',
    humanHandoffRequested: false,
    whatsappInterest: false,
    galleryInterest: false,
    visualRequested: false,
    visualStatus: 'UNKNOWN',
    visualAssetId: null,
    ...seed
  };
}

function resolveLocalTurn(message, currentState = {}) {
  const text = clean(message, 900);
  const value = normalize(text);
  const state = createConversationState(currentState);

  if (/^(recomecar|reiniciar conversa|comecar de novo|apagar conversa|voltar ao inicio)[.!?\s]*$/.test(value)) {
    return {
      handled: true,
      reset: true,
      state: createConversationState(),
      reply: 'Conversa reiniciada. Podemos começar de novo a partir da sua próxima mensagem.'
    };
  }

  if (/(qual e (o )?seu nome|como e (o )?seu nome|como voce se chama)/.test(value)) {
    return {
      handled: true,
      reply: 'Meu nome é Hélio. Sou o consultor virtual da Propagação Digital.'
    };
  }

  if (/(voce e (uma )?ia|voce e inteligencia artificial|e um robo)/.test(value)) {
    return {
      handled: true,
      reply: 'Sim. Sou um assistente de inteligência artificial da Propagação Digital.'
    };
  }

  if (/(qual e (o )?meu nome|como eu me chamo)/.test(value)) {
    return { handled: true, reply: state.customerName ? `Seu nome é ${state.customerName}.` : 'Você ainda não me informou seu nome.' };
  }

  if (/(o que eu vendo|qual e meu negocio|com o que eu trabalho)/.test(value)) {
    const business = state.productsOrServices || state.businessType;
    return { handled: true, reply: business ? `Você me informou que trabalha com ${business}.` : 'Você ainda não me informou o que vende ou oferece.' };
  }

  if (/(o que voces (vendem|fazem)|quais (sao os )?servicos)/.test(value)) {
    return { handled: true, reply: 'A Propagação Digital cria sites, lojas virtuais, landing pages, estratégias de SEO e tráfego pago, automações com IA, agentes de atendimento, vídeos e artes. Qual dessas frentes você quer entender melhor?' };
  }

  if (/(qual|informe|me passe|passa|preciso|quero).*(telefone|numero|contato|whatsapp|zap)|(telefone|numero|contato).*(de voces|oficial)|abrir.*(whatsapp|zap)/.test(value)) {
    return {
      handled: true,
      reply: `O telefone e WhatsApp oficial da Propagação Digital é ${OFFICIAL_PHONE_DISPLAY}.`,
      action: { type: 'whatsapp', value: OFFICIAL_WHATSAPP },
      statePatch: { whatsappInterest: true }
    };
  }

  if (/(quanto custa|preco|valor).*(loja|dessas)|loja.*(quanto custa|preco|valor)/.test(value)) {
    return {
      handled: true,
      reply: `Temos três opções oficiais de loja virtual: Nosso Essencial por ${STORE_PRICES.essential}, Nosso Profissional por ${STORE_PRICES.professional} e Nosso Completo por ${STORE_PRICES.complete}. Você precisa de uma estrutura mais simples para começar ou de recursos mais completos?`
    };
  }

  if (/(quero falar com|falar com).*(responsavel|pessoa|helio)|atendimento humano|quero contratar/.test(value)) {
    return {
      handled: true,
      reply: 'Claro. Posso abrir o WhatsApp oficial para você continuar com um responsável da Propagação Digital.',
      action: { type: 'whatsapp', value: OFFICIAL_WHATSAPP },
      statePatch: { humanHandoffRequested: true, whatsappInterest: true }
    };
  }

  if (/(abrir|ver|conhecer).*(galeria)|galeria.*(abrir|ver|conhecer)/.test(value)) {
    return {
      handled: true,
      reply: 'Posso abrir a galeria de projetos disponíveis.',
      action: { type: 'gallery', value: '/galeria-modelos' },
      statePatch: { galleryInterest: true }
    };
  }

  return { handled: false };
}

function invalid(reason) {
  return { accepted: false, reason };
}

function validateConversationOutput(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return invalid('invalid-response');
  const reply = clean(candidate.reply, 700);
  if (!reply) return invalid('empty-response');

  if ((reply.match(/\?/g) || []).length > 1) return invalid('too-many-questions');

  const urls = reply.match(/(?:https?:\/\/|www\.|wa\.me\/|api\.whatsapp\.com)[^\s]*/gi) || [];
  if (urls.length) return invalid('unauthorized-link');

  const phones = reply.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
  const unauthorizedPhone = phones.some((phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits !== OFFICIAL_WHATSAPP && digits !== OFFICIAL_WHATSAPP.slice(2);
  });
  if (unauthorizedPhone) return invalid('unauthorized-phone');

  const prices = reply.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];
  const allowedPrices = new Set(Object.values(STORE_PRICES).map(normalize));
  if (prices.some((price) => !allowedPrices.has(normalize(price)))) return invalid('unauthorized-price');

  if (/(api[\s_-]?key|authorization|vari[aá]vel (?:de ambiente|do servidor)|prompt interno|credencial|segredo do servidor)/i.test(reply)) {
    return invalid('administrative-content');
  }

  const requestedAssetId = candidate.requestedAssetId == null
    ? null
    : clean(candidate.requestedAssetId, 100);
  if (requestedAssetId && !ALLOWED_ASSET_IDS.has(requestedAssetId)) return invalid('unauthorized-asset');

  const recommendedAction = candidate.recommendedAction == null
    ? null
    : clean(candidate.recommendedAction, 60);
  if (recommendedAction && !ALLOWED_ACTIONS.has(recommendedAction)) return invalid('unauthorized-action');

  const intent = clean(candidate.intent, 60) || 'conversation';
  const confidence = Number(candidate.confidence);
  const memoryUpdates = Array.isArray(candidate.memoryUpdates) ? candidate.memoryUpdates.slice(0, 8) : [];
  const questionAsked = candidate.questionAsked == null ? null : clean(candidate.questionAsked, 240);

  return {
    accepted: true,
    output: {
      reply,
      intent,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(confidence, 1)) : 0,
      memoryUpdates,
      questionAsked,
      recommendedAction,
      requestedAssetId,
      handoffRequested: candidate.handoffRequested === true
    }
  };
}

module.exports = {
  ALLOWED_ACTIONS,
  ALLOWED_ASSET_IDS,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_WHATSAPP,
  STORE_PRICES,
  createConversationState,
  resolveLocalTurn,
  validateConversationOutput
};
