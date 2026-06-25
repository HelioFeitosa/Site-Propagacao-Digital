const { Redis } = require('@upstash/redis');

const MEMORY_TTL_SECONDS = 60 * 60 * 24 * 365;
const MAX_NAME_MATCHES = 12;

let redisClient;

function cleanText(value, max = 240) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalize(value) {
  return cleanText(value, 500)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function safeVisitorId(value) {
  const id = cleanText(value, 80);
  return /^[a-zA-Z0-9_-]{16,80}$/.test(id) ? id : '';
}

function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.ARMAZENAR_REDIS_REST_URL ||
    process.env.ARMAZENAR_REST_URL ||
    process.env.ARMAZENAR_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.KV_REST_API_READ_ONLY_TOKEN ||
    process.env.ARMAZENAR_REDIS_REST_TOKEN ||
    process.env.ARMAZENAR_REST_TOKEN ||
    process.env.ARMAZENAR_TOKEN;

  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function identityName(value) {
  return normalize(value).replace(/[^a-z0-9]/g, '').slice(0, 50);
}

function businessTokens(value) {
  const ignored = new Set([
    'a', 'o', 'as', 'os', 'da', 'de', 'do', 'das', 'dos', 'e', 'em', 'no', 'na',
    'meu', 'minha', 'loja', 'empresa', 'negocio', 'comercio', 'aqui', 'sou', 'eu'
  ]);

  return [...new Set(normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignored.has(token))
    .slice(0, 14))];
}

function extractRecallIdentity(text) {
  const value = cleanText(text, 300);
  const normalized = normalize(value);
  const asksRecall = /(lembra|lembrar|recorda|ja falei com voce|conversamos antes)/.test(normalized);
  if (!asksRecall) return null;

  const nameMatch = value.match(
    /(?:aqui\s+(?:é|e|eh)|sou\s+eu|meu\s+nome\s+(?:é|e|eh)|me\s+chamo)\s+(?:o|a)?\s*([A-Za-zÀ-ÿ'-]{2,})/i
  );
  const name = cleanText((nameMatch || [])[1], 60);

  const businessMatch = value.match(
    /(?:da|do|de)\s+(.+?)(?:[,!?]|\s+lembra|\s+recorda|$)/i
  );
  const businessHint = cleanText((businessMatch || [])[1], 160);

  return name && businessTokens(businessHint).length
    ? { name, businessHint }
    : null;
}

function isForgetRequest(text) {
  return /(esque[cç]a meus dados|apague meus dados|delete meus dados|remova meus dados|n[aã]o guarde meus dados)/i
    .test(cleanText(text, 300));
}

function buildSummary(lead, messages) {
  const facts = [];
  if (lead.businessType) facts.push(`negócio: ${cleanText(lead.businessType, 80)}`);
  else if (lead.business) facts.push(`negócio: ${cleanText(lead.business, 120)}`);
  if (lead.productDetail || lead.product) facts.push(`produto: ${cleanText(lead.productDetail || lead.product, 100)}`);
  if (lead.goal || lead.salesGoal) facts.push(`objetivo: ${cleanText(lead.salesGoal || lead.goal, 120)}`);
  if (lead.service) facts.push(`solução avaliada: ${cleanText(lead.service, 40)}`);
  if (lead.channel) facts.push(`canal: ${cleanText(lead.channel, 50)}`);
  if (lead.planPreference) facts.push(`preferência: ${cleanText(lead.planPreference, 100)}`);
  if (lead.location) facts.push(`local: ${cleanText(lead.location, 80)}`);
  if (lead.stage) facts.push(`status: ${cleanText(lead.stage, 100)}`);

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')?.content;
  if (lastUserMessage) facts.push(`última informação: ${cleanText(lastUserMessage, 160)}`);

  return facts.join('; ').slice(0, 700);
}

function memoryRecord(visitorId, lead, messages) {
  return {
    version: 1,
    visitorId,
    name: cleanText(lead.name, 60),
    businessSearchText: cleanText([
      lead.business,
      lead.businessType,
      lead.product,
      lead.productDetail,
      lead.location
    ].filter(Boolean).join(' '), 350),
    lead: {
      name: cleanText(lead.name, 60),
      business: cleanText(lead.business, 180),
      businessType: cleanText(lead.businessType, 100),
      product: cleanText(lead.product, 120),
      productDetail: cleanText(lead.productDetail, 160),
      productPrice: cleanText(lead.productPrice, 60),
      deliveryArea: cleanText(lead.deliveryArea, 100),
      deliveryMethod: cleanText(lead.deliveryMethod, 100),
      location: cleanText(lead.location, 100),
      goal: cleanText(lead.goal, 160),
      salesGoal: cleanText(lead.salesGoal, 160),
      service: cleanText(lead.service, 40),
      channel: cleanText(lead.channel, 80),
      stage: cleanText(lead.stage, 120),
      planPreference: cleanText(lead.planPreference, 120),
      delivery: cleanText(lead.delivery, 120),
      peakPeriod: cleanText(lead.peakPeriod, 60),
      urgency: cleanText(lead.urgency, 80),
      budget: cleanText(lead.budget, 100),
      ready: Boolean(lead.ready)
    },
    summary: buildSummary(lead, messages),
    updatedAt: new Date().toISOString()
  };
}

function candidateScore(record, businessHint) {
  const wanted = businessTokens(businessHint);
  const available = new Set(businessTokens(record.businessSearchText));
  if (!wanted.length || !available.size) return 0;
  return wanted.filter((token) => available.has(token)).length / wanted.length;
}

async function loadVisitorMemory(visitorId) {
  const redis = getRedis();
  const id = safeVisitorId(visitorId);
  if (!redis || !id) return null;
  return redis.get(`pd:client:${id}`);
}

async function findReturningMemory(name, businessHint) {
  const redis = getRedis();
  const nameKey = identityName(name);
  if (!redis || !nameKey) return null;

  const ids = (await redis.smembers(`pd:name:${nameKey}`)).slice(0, MAX_NAME_MATCHES);
  let best = null;

  for (const id of ids) {
    const record = await redis.get(`pd:client:${id}`);
    if (!record) continue;
    const score = candidateScore(record, businessHint);
    if (!best || score > best.score) best = { record, score };
  }

  return best && best.score >= 0.5 ? best.record : null;
}

async function saveClientMemory(visitorId, lead, messages) {
  const redis = getRedis();
  const id = safeVisitorId(visitorId);
  const nameKey = identityName(lead.name);
  const hasBusiness = businessTokens([
    lead.business,
    lead.businessType,
    lead.product,
    lead.productDetail
  ].filter(Boolean).join(' ')).length > 0;

  if (!redis || !id || !nameKey || !hasBusiness) return false;

  const record = memoryRecord(id, lead, messages);
  const clientKey = `pd:client:${id}`;
  const indexKey = `pd:name:${nameKey}`;

  await redis.set(clientKey, record, { ex: MEMORY_TTL_SECONDS });
  await redis.sadd(indexKey, id);
  await redis.sadd('pd:clients', id);
  await redis.expire(indexKey, MEMORY_TTL_SECONDS);
  await redis.expire('pd:clients', MEMORY_TTL_SECONDS);
  return true;
}

async function linkVisitorMemory(visitorId, sourceVisitorId) {
  const redis = getRedis();
  const id = safeVisitorId(visitorId);
  const sourceId = safeVisitorId(sourceVisitorId);
  if (!redis || !id || !sourceId || id === sourceId) return false;
  await redis.set(`pd:alias:${id}`, sourceId, { ex: MEMORY_TTL_SECONDS });
  return true;
}

async function forgetClientMemory(visitorId) {
  const redis = getRedis();
  const id = safeVisitorId(visitorId);
  if (!redis || !id) return false;

  const aliasId = safeVisitorId(await redis.get(`pd:alias:${id}`));
  const ids = [...new Set([id, aliasId].filter(Boolean))];

  for (const targetId of ids) {
    const record = await redis.get(`pd:client:${targetId}`);
    if (record?.name) {
      await redis.srem(`pd:name:${identityName(record.name)}`, targetId);
    }
    await redis.del(`pd:client:${targetId}`);
    await redis.del(`pd:alias:${targetId}`);
    await redis.srem('pd:clients', targetId);
  }

  return true;
}

module.exports = {
  businessTokens,
  candidateScore,
  extractRecallIdentity,
  findReturningMemory,
  forgetClientMemory,
  getRedis,
  isForgetRequest,
  linkVisitorMemory,
  loadVisitorMemory,
  saveClientMemory,
  safeVisitorId
};
