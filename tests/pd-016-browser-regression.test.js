const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const atendimentoHandler = require('../api/atendimento');

const root = path.resolve(__dirname, '..');
const captureDir = path.join(root, 'reports', 'pd-016');
fs.mkdirSync(captureDir, { recursive: true });
let requestCounter = 20;

function callApi(body) {
  requestCounter += 1;
  return new Promise((resolve) => {
    atendimentoHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `127.80.0.${requestCounter}` },
      socket: {},
      body
    }, {
      setHeader() {},
      end(value) {
        resolve(JSON.parse(value));
      }
    });
  });
}

function server() {
  return http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root) || !fs.existsSync(filename) || fs.statSync(filename).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    response.writeHead(200, { 'content-type': types[path.extname(filename)] || 'application/octet-stream' });
    fs.createReadStream(filename).pipe(response);
  });
}

async function submit(page, text) {
  const input = page.locator('#pd-assistant-input');
  await input.fill(text);
  await input.press('Enter');
  await page.waitForFunction(() => !document.querySelector('#pd-assistant-input').disabled);
}

(async () => {
  const local = server();
  await new Promise((resolve) => local.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
      const page = await browser.newPage({ viewport });
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      await page.addInitScript(() => {
        const nativeTimeout = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => nativeTimeout(callback, Math.min(delay, 20), ...args);
      });
      await page.route('**/api/atendimento', async (route) => {
        const body = JSON.parse(route.request().postData() || '{}');
        const last = (body.messages || []).filter((message) => message.role === 'user').at(-1)?.content || '';
        const result = await callApi(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(result)
        });
      });
      await page.goto(`http://127.0.0.1:${local.address().port}/`, { waitUntil: 'domcontentloaded' });
      await page.click('.pd-assistant-launcher');
      assert.match(await page.locator('.pd-assistant-message.is-bot').first().innerText(), /como você gostaria que eu te chamasse/i);
      assert.equal(await page.getByRole('button', { name: 'Continuar no WhatsApp' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Ver modelo visual' }).count(), 0);

      const dialogue = viewport.width === 390
        ? [
          'Quero divulgar melhor meu negócio',
          'João',
          'Vendo açaí com peixe frito',
          'Quero conhecer todos os serviços',
          'Quero ver uma imagem',
          'Vendo no ponto e recebo pedidos pelo WhatsApp',
          'Quero atrair mais pessoas e receber mais pedidos',
          'Sim, está certo',
          'Pode mostrar',
          'Não apareceu nenhuma imagem',
          'Quero falar com o Hélio'
        ]
        : [
          'Marina',
          'Tenho uma loja de roupas e vendo vestidos e bolsas',
          'Na loja física e pelo Instagram',
          'Quero receber mais pedidos',
          'Sim, está certo',
          'Pode mostrar'
        ];
      for (const message of dialogue) {
        await submit(page, message);
      }

      if (viewport.width === 390) {
        assert.equal(await page.locator('[data-visual-card]').count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Continuar no WhatsApp' }).count(), 1);
        assert.equal(await page.locator('.pd-assistant-messages').getByText(/colchões/i).count(), 0);
        assert.equal(await page.locator('.pd-assistant-messages').getByText(/olhar novamente|cartão abaixo/i).count(), 0);
      } else {
        assert.equal(await page.locator('[data-visual-card="fashion"]').count(), 1);
        assert.equal(await page.getByRole('button', { name: 'Continuar no WhatsApp' }).count(), 0);
      }
      assert.equal(consoleErrors.length, 0);
      await page.screenshot({
        path: path.join(captureDir, `atendente-${viewport.width}x${viewport.height}.png`),
        fullPage: false
      });
      await page.close();
    }
    console.log(`PD-016 browser regression tests passed. Captures: ${captureDir}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => local.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
