const VERSION = 1;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function clean(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function createCommercialState(seed = {}) {
  return {
    commercialVersion: VERSION,
    customerName: '',
    nameDeclined: false,
    businessType: null,
    productsOrServices: '',
    salesChannels: '',
    goals: '',
    pace: 'NORMAL',
    diagnosisConfirmed: false,
    visualRequested: false,
    visualStatus: 'UNKNOWN',
    visualAssetId: null,
    userReportedVisualMissing: false,
    galleryInterest: false,
    whatsappInterest: false,
    humanHandoffRequested: false,
    lastQuestion: null,
    questionRepeatCount: 0,
    lastUserMessage: '',
    ...seed
  };
}

function firstName(text) {
  const value = clean(text, 80);
  const introduced = /^(meu nome (é|e|eh)|me chamo|eu sou|sou)\s+/i.test(value);
  if (!introduced && value.split(/\s+/).length > 2) return '';
  const raw = value
    .replace(/^(meu nome (é|e|eh)|me chamo|eu sou|sou)\s+/i, '')
    .split(/\s+/)[0]
    .replace(/[^\p{L}'-]/gu, '');
  const ignored = new Set(['só', 'so', 'você', 'voce', 'empresa', 'quero', 'negócio', 'negocio', 'imagem', 'serviços', 'servicos', 'não', 'nao', 'entendi']);
  if (!raw || raw.length < 2 || ignored.has(normalize(raw))) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function identityAndBusiness(text) {
  const value = clean(text, 240);
  const patterns = [
    /^pode me chamar de\s+([\p{L}'-]+)[.,]?\s*(.*)$/iu,
    /^meu nome (?:é|e|eh)\s+([\p{L}'-]+)[.,]?\s*(?:e\s+)?(.*)$/iu,
    /^sou\s+([\p{L}'-]+)[.,]?\s*(.*)$/iu,
    /^([\p{L}'-]+)\s+aqui[.,]?\s*(.*)$/iu,
    /^([\p{L}'-]+)\s+eu\s+(.*)$/iu
  ];
  const match = patterns.map((pattern) => value.match(pattern)).find(Boolean);
  if (!match) return { name: firstName(value), businessText: '' };
  return {
    name: firstName(match[1]),
    businessText: clean(match[2] || '', 200)
  };
}

function askForName(state) {
  const repeated = state.lastQuestion === 'ASK_NAME';
  state.lastQuestion = 'ASK_NAME';
  state.questionRepeatCount = repeated ? state.questionRepeatCount + 1 : 0;
  return state.questionRepeatCount >= 1
    ? 'Acho que não entendi direito. Você pode me dizer como prefere ser chamado e qual é o seu negócio?'
    : 'Como você gostaria que eu te chamasse?';
}

function businessFacts(text) {
  const value = clean(text);
  const normalized = normalize(value);
  const patterns = [
    { type: 'sapataria', re: /sapataria/, products: /vendo\s+(.+)/i },
    { type: 'loja de roupas', re: /(loja de roupas|moda|boutique)/, products: /vendo\s+(.+)/i },
    { type: 'padaria', re: /padaria/, products: /vendo\s+(.+)/i },
    { type: 'clínica odontológica', re: /(clinica odontologica|dentista|odontolog)/, products: null },
    { type: 'alimentação', re: /(acai|açai|restaurante|pizzaria|comida|peixe frito)/, products: /vendo\s+(.+)/i }
  ];
  const match = patterns.find((item) => item.re.test(normalized));
  const explicitProducts = value.match(/(?:vendo|ofereço|ofereco|trabalho com)\s+(.+)/i)?.[1];
  return {
    businessType: match?.type || value,
    productsOrServices: clean(explicitProducts || '', 180)
  };
}

function has(text, expression) {
  return expression.test(normalize(text));
}

function diagnosisText(state) {
  const products = state.productsOrServices
    ? `, oferecendo ${state.productsOrServices}`
    : '';
  return `Pelo que entendi, ${state.customerName}, você tem ${state.businessType}${products}. Hoje seus canais são ${state.salesChannels} e seu objetivo principal é ${state.goals}. Entendi corretamente?`;
}

function recommendationText(state) {
  const business = normalize(`${state.businessType} ${state.productsOrServices}`);
  let recommendation = 'uma presença digital profissional, divulgação direcionada e um canal simples para transformar visitas em contatos';
  if (/(sapataria|roupa|moda|bolsa|sapato)/.test(business)) {
    recommendation = 'um catálogo ou site profissional, presença no Google e conteúdo/anúncios que levem pessoas interessadas até seus canais de venda';
  } else if (/(restaurante|delivery|acai|pizza|comida)/.test(business)) {
    recommendation = 'um cardápio ou página de pedidos, presença no Google e divulgação local para gerar pedidos';
  } else if (/(clinica|odontolog|servico|arquit)/.test(business)) {
    recommendation = 'um site profissional, presença no Google e uma página de conversão para gerar novos contatos';
  }
  return `Ótimo. Para esse objetivo, eu começaria com ${recommendation}. Quer que eu mostre uma demonstração funcional semelhante, quando houver uma disponível?`;
}

function advanceCommercialConversationCore(current, userText) {
  const state = createCommercialState(current);
  const text = clean(userText);
  const normalized = normalize(text);

  if (/(quero falar com (uma pessoa|alguem)|atendimento humano|pedir proposta|quero contratar|falar com o helio|entrar em contato)/.test(normalized)) {
    state.humanHandoffRequested = true;
    state.whatsappInterest = true;
    return {
      state,
      reply: 'Claro. Posso abrir o WhatsApp comercial com um resumo do que você já explicou para continuar com o Hélio.'
    };
  }

  if (/(calma|devagar|rapido demais|sem pressa|quero entender melhor|ainda estou conhecendo|nao quero whatsapp)/.test(normalized)) {
    state.pace = 'SLOW';
    state.whatsappInterest = false;
    state.humanHandoffRequested = false;
    return { state, reply: 'Tudo bem. Vamos com calma. Me conte apenas o próximo ponto quando estiver à vontade.' };
  }

  if (/(imagem|modelo|visual).*(nao apareceu|nao abriu|sumiu)|nao apareceu.*(imagem|modelo|visual)/.test(normalized)) {
    state.visualStatus = 'FAILED';
    state.userReportedVisualMissing = true;
    state.galleryInterest = true;
    return {
      state,
      reply: 'Obrigado por avisar. Vou considerar que o visual falhou. Posso oferecer o link da galeria ou encaminhar esse ponto ao Hélio.'
    };
  }

  if (/(voce inventou|isso esta errado|nao foi isso que eu disse|nao vendo|informacao errada)/.test(normalized)) {
    state.businessType = null;
    state.productsOrServices = '';
    state.diagnosisConfirmed = false;
    return {
      state,
      reply: 'Você tem razão. Desculpe pela suposição. Vou descartar essa informação. Como você descreve o seu negócio, com suas próprias palavras?'
    };
  }

  if (/(atendimento ruim|atendimento apressado|atendimento repetitivo|voce nao entende|burro|retardado|incapaz)/.test(normalized)) {
    state.pace = 'SLOW';
    return {
      state,
      reply: 'Entendi que o atendimento pareceu apressado ou repetitivo. Vou desacelerar e tratar uma informação por vez. Qual ponto objetivo devo corrigir primeiro?'
    };
  }

  if (/(quais servicos|o que voces fazem|todos os servicos)/.test(normalized)) {
    return {
      state,
      reply: 'Atuamos em três frentes:\n\n• Presença digital: sites, lojas virtuais e landing pages.\n• Divulgação e crescimento: Google, SEO, tráfego pago, vídeos e artes.\n• Atendimento e automação: atendentes virtuais e automações com IA.\n\nQual dessas frentes está mais próxima do que você precisa agora?'
    };
  }

  if (/(abrir|conhecer|ver).*(galeria)/.test(normalized)) {
    state.galleryInterest = true;
    return {
      state,
      reply: 'Claro. Use o botão “Conhecer a galeria” para abrir os projetos que estão realmente disponíveis.'
    };
  }

  if (/(imagem|modelo|visual|demonstracao|exemplo|projeto)/.test(normalized) && !state.diagnosisConfirmed) {
    const missing = !state.businessType
      ? 'primeiro preciso conhecer o seu negócio'
      : 'primeiro preciso concluir e confirmar o diagnóstico';
    return {
      state,
      reply: `Para indicar uma referência verdadeira, ${missing}. Qual informação você prefere me contar agora?`
    };
  }

  if (!state.customerName) {
    if (/(prefiro nao dizer|nao quero informar|sem nome)/.test(normalized)) {
      state.nameDeclined = true;
      state.customerName = 'Visitante';
      return {
        state,
        reply: 'Sem problema. Podemos continuar sem o seu nome. Qual é o seu negócio e o que você vende ou oferece?'
      };
    }
    const sourceText = /ja falei|já falei/.test(normalized) && state.lastUserMessage
      ? state.lastUserMessage
      : text;
    const identity = identityAndBusiness(sourceText);
    const name = identity.name;
    state.lastUserMessage = text;
    if (!name) return { state, reply: askForName(state) };
    state.customerName = name;
    state.questionRepeatCount = 0;
    if (identity.businessText) {
      const facts = businessFacts(identity.businessText);
      state.businessType = facts.businessType;
      state.productsOrServices = facts.productsOrServices;
      state.lastQuestion = 'ASK_CHANNELS';
      const activity = state.productsOrServices || state.businessType;
      return {
        state,
        reply: `Prazer, ${name}! Entendi que você trabalha com ${activity}. Hoje você vende mais no ponto físico, pelo WhatsApp, pela internet ou combina esses canais?`
      };
    }
    state.lastQuestion = 'ASK_BUSINESS';
    return {
      state,
      reply: `Prazer, ${name}. Para eu entender seu contexto, qual é o seu negócio e o que você vende ou oferece?`
    };
  }

  if (!state.businessType) {
    const facts = businessFacts(text);
    state.businessType = facts.businessType;
    state.productsOrServices = facts.productsOrServices;
    const detail = state.productsOrServices
      ? ` e oferece ${state.productsOrServices}`
      : '';
    return {
      state,
      reply: `Entendi: você tem ${state.businessType}${detail}. Por quais canais você vende ou atende hoje?`
    };
  }

  if (!state.salesChannels) {
    if (/(na verdade|tambem vendo|também vendo|corrigindo)/i.test(text)) {
      const addition = text.replace(/^.*?(?:também vendo|tambem vendo)\s*/i, '');
      state.productsOrServices = clean(
        [state.productsOrServices, addition].filter(Boolean).join(', '),
        180
      );
      return {
        state,
        reply: `Certo, atualizei: você oferece ${state.productsOrServices}. Por quais canais você vende ou atende hoje?`
      };
    }
    state.salesChannels = text;
    return {
      state,
      reply: 'Obrigado. Qual é o seu objetivo principal agora com o negócio?'
    };
  }

  if (!state.goals) {
    state.goals = text;
    return { state, reply: diagnosisText(state) };
  }

  if (!state.diagnosisConfirmed) {
    if (/^(sim|isso|correto|certo|exato|perfeito)/.test(normalized)) {
      state.diagnosisConfirmed = true;
      return { state, reply: recommendationText(state) };
    }
    if (/(whatsapp|instagram|loja fisica|ponto|delivery|site|catalogo|indicacao)/.test(normalized)) {
      const correctedChannels = text
        .replace(/^(na verdade|corrigindo|o canal é|o canal e)\s*/i, '')
        .trim();
      state.salesChannels = /também|tambem/i.test(text)
        ? clean([state.salesChannels, correctedChannels].filter(Boolean).join(' + '), 180)
        : correctedChannels;
    } else if (/(objetivo|quero|preciso|melhorar|atrair|receber|vender|divulgar)/.test(normalized)) {
      state.goals = text
        .replace(/^(na verdade|corrigindo|meu objetivo é|meu objetivo e)\s*/i, '')
        .trim();
    } else {
      const facts = businessFacts(text);
      state.businessType = facts.businessType;
      if (facts.productsOrServices) state.productsOrServices = facts.productsOrServices;
    }
    return {
      state,
      reply: `Obrigado pela correção. Atualizei o ponto informado.\n\n${diagnosisText(state)}`
    };
  }

  if (/(mostrar|mostra|modelo|imagem|demonstracao|exemplo|projeto)/.test(normalized)) {
    if (state.userReportedVisualMissing) {
      return {
        state,
        reply: 'Como o visual não apareceu, não vou repetir a mesma tentativa. Posso abrir a galeria, explicar a solução em texto ou encaminhar ao Hélio se você quiser.'
      };
    }
    state.visualRequested = true;
    const context = normalize(`${state.businessType} ${state.productsOrServices}`);
    if (/(sapataria|roupa|moda|bolsa|sapato)/.test(context)) {
      state.visualStatus = 'READY';
      state.visualAssetId = 'lume-modas-functional-demo';
      return {
        state,
        reply: 'Tenho uma demonstração funcional de loja de moda que pode servir como referência. Vou mostrar o cartão visual abaixo.'
      };
    }
      state.visualStatus = 'UNAVAILABLE';
      state.visualAssetId = null;
      state.galleryInterest = true;
    return {
      state,
      reply: 'Ainda não há uma demonstração funcional específica comprovada para esse segmento. Posso abrir a galeria de projetos existentes.'
    };
  }

  return {
    state,
    reply: state.pace === 'SLOW'
      ? 'Entendi. Qual ponto você quer conversar primeiro?'
      : 'Entendi. Quer aprofundar a solução recomendada ou ver os próximos passos?',
    aiAssistance: state.pace === 'SLOW' || !state.diagnosisConfirmed
      ? undefined
      : {
        eligible: true,
        purpose: 'free-text-continuation',
        reason: 'local-rules-insufficient'
      }
  };
}

function advanceCommercialConversation(current, userText) {
  const result = advanceCommercialConversationCore(current, userText);
  const protectedTopic = /(preco|valor|quanto custa|telefone|whatsapp|zap|link|url|cta|botao|imagem|visual|handoff|atendimento humano|falar com o helio|admin|variavel|servidor|api|credencial|senha)/.test(normalize(userText));
  return {
    ...result,
    aiAssistance: protectedTopic
      ? {
        eligible: false,
        purpose: null,
        reason: 'protected-local-authority'
      }
      : result.aiAssistance || {
        eligible: false,
        purpose: null,
        reason: 'deterministic-response'
      }
  };
}

module.exports = {
  VERSION,
  createCommercialState,
  advanceCommercialConversation
};
