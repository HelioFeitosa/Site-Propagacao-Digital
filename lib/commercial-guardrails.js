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
    visitorBudget: '',
    officialPrice: '',
    quotedThirdPartyAmount: '',
    visitorPhone: '',
    memoryFacts: {},
    visualRequests: [],
    galleryRejectedForSegment: false,
    galleryRejectionReason: '',
    humanHandoffRequested: false,
    contactPreference: '',
    callbackRequested: false,
    urgency: '',
    consultationDoubts: [],
    handoffCtaShown: false,
    whatsappInterest: false,
    galleryInterest: false,
    galleryCtaShown: false,
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

  const introduction = text.match(/^([A-Za-zÀ-ÿ'-]{2,40})\s+(?:eu\s+)?(?:vendo|trabalho com|tenho)\s+(.+)$/i);
  if (introduction && /pizza|pizzaria/.test(value)) {
    const name = clean(introduction[1], 40);
    return {
      handled: true,
      reply: `Prazer, ${name}! Que bom falar com você.\n\nEntendi que você trabalha com uma pizzaria. Vou conhecer um pouco melhor como você vende hoje para pensar numa solução que realmente ajude.\n\nHoje você já recebe alguns pedidos pelo WhatsApp ou ainda recebe poucos?`,
      statePatch: {
        customerName: name,
        businessType: 'pizzaria',
        productsOrServices: 'pizza'
      }
    };
  }

  if (/(quero vender|receber pedidos|vender e receber).*(whatsapp|zap)|(whatsapp|zap).*(como canal|para vender|pra vender)/.test(value)) {
    return {
      handled: true,
      reply: `Isso faz sentido para uma pizzaria${state.customerName ? `, ${state.customerName}` : ''}. O WhatsApp pode ser o canal onde seus clientes veem a oferta e já enviam o pedido.\n\nHoje você já recebe alguns pedidos por lá ou ainda recebe poucos?`,
      statePatch: { salesChannels: 'vender e receber pedidos pelo WhatsApp' }
    };
  }

  if (/(nao sei|nao entendo|me ajude|me ajuda).*(isso|como|por favor)?|^(nao sei|nao entendo)/.test(value)) {
    const doubts = [...new Set([...(Array.isArray(state.consultationDoubts) ? state.consultationDoubts : []), 'não entende como a solução funciona e pediu explicação simples'])];
    return {
      handled: true,
      reply: `Fica tranquilo${state.customerName ? `, ${state.customerName}` : ''}. Você não precisa entender desses detalhes agora.\n\nVou explicar de forma simples e pensar junto com você no caminho mais fácil para sua pizzaria vender mais.\n\nHoje os pedidos chegam mais pelo WhatsApp ou pelo seu ponto físico?`,
      statePatch: { consultationDoubts: doubts }
    };
  }

  if (/(calma|quero saber mais).*(como isso funciona)|como isso funciona/.test(value)) {
    const doubts = [...new Set([...(Array.isArray(state.consultationDoubts) ? state.consultationDoubts : []), 'não entende como a solução funciona e pediu explicação simples'])];
    return {
      handled: true,
      reply: 'Vamos por partes. Imagine uma página onde a pessoa vê os sabores, toca no botão e já abre o WhatsApp com o pedido pronto para enviar.\n\nVocê gostaria que o cliente visse primeiro os sabores ou os combos?',
      statePatch: { consultationDoubts: doubts }
    };
  }

  if (/(diz|peca|pede).*(pra|para).*(ele|alguem|equipe).*(me ligar|ligar pra mim)|quero.*(que me ligue|uma ligacao|ligação)/.test(value)) {
    if (!state.visitorPhone) {
      return {
        handled: true,
        reply: `Posso registrar o pedido${state.customerName ? `, ${state.customerName}` : ''}. Para alguém da equipe ligar para você, preciso do número de telefone para retorno.\n\nSe preferir não informar aqui, você também pode continuar pelo nosso WhatsApp.`,
        statePatch: { callbackRequested: true, contactPreference: 'phone' }
      };
    }
    return {
      handled: true,
      reply: 'Posso registrar a solicitação de ligação no número que você informou. Qual é o melhor período para receber o contato?',
      statePatch: { callbackRequested: true, contactPreference: 'phone' }
    };
  }

  if (/(uma pessoa|alguem|atendente).*(pode|consegue).*(me atender|falar comigo).*(agora)?|atendimento.*agora/.test(value)) {
    if (state.handoffCtaShown) {
      return {
        handled: true,
        reply: 'Sim. Nossa equipe pode continuar o atendimento pelo WhatsApp quando você abrir a conversa.',
        statePatch: { humanHandoffRequested: true, contactPreference: 'whatsapp', urgency: 'immediate' }
      };
    }
    return {
      handled: true,
      reply: 'Sim. Você pode continuar agora pelo WhatsApp com nossa equipe.\n\nVou deixar o botão disponível logo abaixo.',
      action: { type: 'whatsapp', value: OFFICIAL_WHATSAPP },
      statePatch: { humanHandoffRequested: true, whatsappInterest: true, contactPreference: 'whatsapp', urgency: 'immediate', handoffCtaShown: true }
    };
  }

  if (/(quero|vou|prefiro).*(continuar|falar).*(whatsapp|zap)/.test(value) && state.handoffCtaShown) {
    return {
      handled: true,
      reply: 'Certo. A conversa com nossa equipe já está disponível para você continuar.',
      statePatch: { humanHandoffRequested: true, whatsappInterest: true, contactPreference: 'whatsapp' }
    };
  }

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

  if (/(qual e (o )?meu nome|como eu me chamo|voce sabe (o )?meu nome)/.test(value)) {
    return { handled: true, reply: state.customerName ? `Seu nome é ${state.customerName}.` : 'Você ainda não me informou seu nome.' };
  }

  if (/(o que eu vendo|com o que eu trabalho|voce sabe o que eu faco|o que eu faco)/.test(value)) {
    const asksWhatIDo = /(voce sabe o que eu faco|o que eu faco)/.test(value);
    const product = asksWhatIDo ? (state.businessType || state.productsOrServices) : (state.productsOrServices || state.businessType);
    return { handled: true, reply: product ? `Você vende ou oferece ${product}.` : 'Você ainda não me informou o que vende ou oferece.' };
  }

  if (/qual e meu negocio/.test(value)) {
    return { handled: true, reply: state.businessType ? `Seu negócio é ${state.businessType}.` : 'Você ainda não me informou qual é o seu negócio.' };
  }

  if (/(o que eu quero melhorar|qual e (o )?meu objetivo)/.test(value)) {
    return { handled: true, reply: state.goals ? `Você quer ${state.goals}.` : 'Você ainda não me informou o que quer melhorar.' };
  }

  if (/(quanto.*(?:posso|disse).*(?:investir|orcamento)|qual.*meu orcamento)/.test(value)) {
    return { handled: true, reply: state.visitorBudget ? `Você informou que pode investir ${state.visitorBudget} em publicidade.` : 'Você ainda não informou quanto pode investir.' };
  }

  if (/(voce.*anotou.*(?:zap|whatsapp|telefone)|qual.*meu.*(?:zap|whatsapp|telefone))/.test(value)) {
    return { handled: true, reply: state.visitorPhone ? `O telefone que você informou é ${state.visitorPhone}.` : 'Você ainda não informou seu telefone ou WhatsApp.' };
  }

  if (/(investir|orcamento|tenho ate|so posso).*(?:r\$|reais|\d|mil)/.test(value) && state.visitorBudget) {
    return {
      handled: true,
      reply: `Entendi${state.customerName ? `, ${state.customerName}` : ''}. Com ${state.visitorBudget} é melhor concentrar o investimento em uma ação local e simples, em vez de dividir o valor em várias frentes.\n\nAntes de indicar o melhor caminho, preciso saber se esses ${state.visitorBudget} seriam somente para os anúncios ou se também precisam incluir a preparação da página e dos materiais.`
    };
  }

  if (/(o que eu pedi.*(mostrar|imagem|infografico)|qual.*solicitacao visual)/.test(value)) {
    const requests = Array.isArray(state.visualRequests) ? state.visualRequests : [];
    return { handled: true, reply: requests.length ? `Você pediu: ${requests.join(' e ')}.` : 'Você ainda não pediu nenhuma imagem ou infográfico.' };
  }

  if (/(essa|a|nao quero a mesma).*(galeria).*(nao tem|sem|nao possui|pizza)|nao quero a mesma galeria|galeria.*(nao tem|sem).*(pizza|pizzaria)/.test(value)) {
    return {
      handled: true,
      reply: 'Você tem razão: a galeria atual não possui uma demonstração específica de pizzaria. Não vou oferecê-la novamente; posso registrar o pedido e encaminhá-lo ao responsável.',
      statePatch: {
        galleryInterest: false,
        galleryRejectedForSegment: true,
        galleryRejectionReason: 'não possui exemplo específico de pizzaria'
      }
    };
  }

  if (/(quinta|5a|cinco).*(vez).*(galeria)|repete|repetindo.*galeria|mostra.*botao.*galeria/.test(value) && /pizza|pizzaria/.test(normalize(`${state.businessType} ${state.productsOrServices}`))) {
    return {
      handled: true,
      reply: 'Você tem razão em reclamar. Esse exemplo não corresponde à sua pizzaria e não vou oferecer a galeria novamente. Posso seguir explicando a solução em texto.',
      statePatch: {
        galleryInterest: false,
        galleryRejectedForSegment: true,
        galleryRejectionReason: 'rejeitou exemplo genérico repetido e incompatível com pizzaria'
      }
    };
  }

  if (/(tem|possui|existe|mostra|mostrar|ver).*(imagem|foto|visual)/.test(value) && /pizza|pizzaria/.test(normalize(`${state.businessType} ${state.productsOrServices}`))) {
    return {
      handled: true,
      reply: 'Ainda não tenho uma imagem específica de pizzaria disponível aqui. Posso registrar esse pedido e explicar em texto como a página funcionaria para seus sabores e pedidos.',
      statePatch: {
        visualRequested: true,
        visualStatus: 'UNAVAILABLE',
        visualAssetId: null,
        visualRequests: [...new Set([...(Array.isArray(state.visualRequests) ? state.visualRequests : []), 'imagem específica para pizzaria'])]
      }
    };
  }

  if (/(imagem|infografico|infográfico|arte|visual).*(pizza|pizzaria)|(?:mostre|mostrar|crie|criar|quero).*(imagem|infografico|infográfico)/.test(value)) {
    const request = /infografico|infográfico/.test(value) ? 'infográfico específico para pizzaria' : 'imagem específica para pizzaria';
    return {
      handled: true,
      reply: 'Ainda não consigo criar e exibir um material personalizado diretamente aqui. Posso registrar o pedido e encaminhá-lo ao responsável; a galeria contém apenas modelos já existentes.',
      statePatch: {
        visualRequested: true,
        visualStatus: 'UNAVAILABLE',
        visualAssetId: null,
        visualRequests: [...new Set([...(Array.isArray(state.visualRequests) ? state.visualRequests : []), request])]
      }
    };
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

  if (/(quero falar com|falar com|me passe para|encaminhe para).*(responsavel|pessoa|helio)|atendimento humano|quero contratar/.test(value)) {
    if (state.handoffCtaShown) {
      return { handled: true, reply: 'O atendimento com nossa equipe já está disponível para você continuar pelo WhatsApp.' };
    }
    return {
      handled: true,
      reply: 'Sim. Vou deixar o botão para continuar com nossa equipe no WhatsApp.',
      action: { type: 'whatsapp', value: OFFICIAL_WHATSAPP },
      statePatch: { humanHandoffRequested: true, whatsappInterest: true, contactPreference: 'whatsapp', handoffCtaShown: true }
    };
  }

  if (isExplicitGalleryIntent(text)) {
    if (state.galleryRejectedForSegment) {
      return { handled: true, reply: 'A galeria genérica já foi descartada para o seu caso. Posso explicar a solução em texto ou encaminhar o pedido específico ao responsável.' };
    }
    if (state.galleryCtaShown) {
      return { handled: true, reply: 'A galeria já está disponível nesta conversa.' };
    }
    return {
      handled: true,
      reply: 'Posso abrir a galeria de projetos disponíveis.',
      action: { type: 'gallery', value: '/galeria-modelos' },
      statePatch: { galleryInterest: true, galleryCtaShown: true }
    };
  }

  return { handled: false };
}

function invalid(reason) {
  return { accepted: false, reason };
}

function validateConversationOutput(candidate, state = {}) {
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
  const allowedPrices = new Set([
    ...Object.values(STORE_PRICES),
    state.visitorBudget,
    state.officialPrice,
    state.quotedThirdPartyAmount
  ].filter(Boolean).map(normalize));
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

function isExplicitGalleryIntent(message) {
  const value = normalize(message);
  return /(quero|gostaria|posso|pode|mostre|mostrar|ver|abrir|conhecer|tem|algum).*(trabalhos|galeria|exemplo|modelo)|(?:galeria|trabalhos|exemplo|modelo).*(ver|mostrar|abrir|conhecer)/.test(value);
}

module.exports = {
  ALLOWED_ACTIONS,
  ALLOWED_ASSET_IDS,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_WHATSAPP,
  STORE_PRICES,
  createConversationState,
  isExplicitGalleryIntent,
  resolveLocalTurn,
  validateConversationOutput
};
