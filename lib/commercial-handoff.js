const { OFFICIAL_WHATSAPP } = require('./commercial-guardrails');

function clean(value, fallback = 'Não informado') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function title(value) {
  const text = clean(value);
  return text === 'Não informado' ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function buildCommercialHandoff(state = {}) {
  const visualRequests = Array.isArray(state.visualRequests) && state.visualRequests.length
    ? state.visualRequests.join(' e ')
    : 'Nenhuma registrada';
  const phone = state.visitorPhone ? clean(state.visitorPhone) : 'não informado';
  const doubts = Array.isArray(state.consultationDoubts) && state.consultationDoubts.length
    ? state.consultationDoubts.join(' e ')
    : 'Nenhuma registrada';
  const whatsappChannel = /whatsapp/i.test(state.salesChannels || '');
  const contactPreference = state.contactPreference === 'whatsapp'
    ? 'continuar agora pelo WhatsApp'
    : state.contactPreference === 'phone' ? 'receber ligação' : 'não informada';
  const callback = state.callbackRequested
    ? (state.visitorPhone ? 'solicitada para o telefone confirmado' : 'solicitada inicialmente, mas telefone para retorno não foi informado')
    : 'não solicitada';
  const isLocalRepair = /assistência técnica.*refrigeradores.*geladeiras/i.test(`${state.businessType} ${state.productsOrServices}`);
  const message = [
    'Olá. Conversei com o assistente virtual da Propagação Digital e quero continuar com um responsável.',
    '',
    `Nome: ${clean(state.customerName)}`,
    `Negócio: ${/pizzaria|pizza/i.test(`${state.businessType} ${state.productsOrServices}`) ? 'Pizzaria / alimentação' : title(state.businessType)}`,
    `Produto: ${title(state.productsOrServices)}`,
    `${whatsappChannel ? 'Canal desejado' : 'Canais atuais'}: ${clean(state.salesChannels)}`,
    `Objetivo: ${clean(state.goals)}`,
    `${isLocalRepair ? 'Interesse' : 'Interesses'}: ${isLocalRepair ? 'publicidade e presença local' : (/whatsapp/i.test(state.salesChannels || '') ? 'página/cardápio para pedidos pelo WhatsApp' : clean(state.preferences))}`,
    ...(state.visitorBudget ? [`Orçamento informado: ${clean(state.visitorBudget)}`] : []),
    `Solicitações: ${visualRequests === 'Nenhuma registrada' ? visualRequests : `pediu ${visualRequests}`}`,
    `Objeção: ${state.galleryRejectedForSegment ? 'não aceitou a galeria genérica porque não possui exemplo de pizza' : 'Nenhuma registrada'}`,
    `${isLocalRepair ? 'Dúvida principal' : 'Dúvida'}: ${isLocalRepair && state.visitorBudget ? 'o que pode ser feito com esse valor' : doubts}`,
    `Atendimento humano: ${state.humanHandoffRequested ? 'solicitado' : 'não solicitado'}`,
    `Preferência: ${contactPreference}`,
    `Ligação: ${callback}`,
    `Próximo passo: ${isLocalRepair ? 'responsável avaliar uma estratégia compatível com o orçamento' : 'atendimento humano para explicar a solução e avaliar material específico para pizzaria'}`,
    `Telefone do visitante: ${phone}`,
    ...(state.visitorPhone ? [] : ['Contato iniciado pelo WhatsApp do próprio visitante'])
  ].join('\n');
  return {
    number: OFFICIAL_WHATSAPP,
    message,
    url: `https://wa.me/${OFFICIAL_WHATSAPP}?text=${encodeURIComponent(message)}`
  };
}

module.exports = { buildCommercialHandoff };
