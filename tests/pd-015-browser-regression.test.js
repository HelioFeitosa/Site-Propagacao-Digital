const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  throw new Error('Playwright não encontrado. Defina NODE_PATH para um runtime que contenha playwright.');
}

const root = path.join(__dirname, '..');
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function staticServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    let relative = decodeURIComponent(url.pathname);
    if (relative.endsWith('/')) relative += 'index.html';
    if (relative === '/galeria-modelos') relative = '/galeria-modelos.html';
    const filename = path.join(root, relative);

    if (!filename.startsWith(root) || !fs.existsSync(filename)) {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    response.writeHead(200, {
      'content-type': mime[path.extname(filename)] || 'application/octet-stream'
    });
    fs.createReadStream(filename).pipe(response);
  });
}

async function makePage(browser, baseUrl, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const nativeTimeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => (
      nativeTimeout(callback, Math.min(delay, 30), ...args)
    );
    window.__pdOpenCount = 0;
    window.open = () => {
      window.__pdOpenCount += 1;
      return null;
    };
  });
  await page.route('**/api/atendimento', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const last = (body.messages || []).filter((message) => message.role === 'user').at(-1)?.content || '';
    const food = /açaí|acai|cardápio|cardapio|delivery/i.test(last) ||
      /açaí|acai|delivery/i.test(body.lead?.business || '');
    const lead = food
      ? { ...body.lead, business: 'Tenho uma loja de açaí e trabalho com delivery', product: 'açaí', service: 'lojas' }
      : { ...body.lead, business: 'Tenho uma sapataria e vendo sapatos', product: 'sapatos', service: 'lojas' };
    const reply = food
      ? 'Entendi. Posso orientar a estrutura de cardápio e delivery para o seu negócio.'
      : 'Vou usar uma demonstração de moda semelhante como referência.';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lead, reply })
    });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  return { page, consoleErrors };
}

async function submit(page, text) {
  const input = page.locator('#pd-assistant-input');
  await input.fill(text);
  await input.press('Enter');
  await page.waitForFunction(() => !document.querySelector('#pd-assistant-input').disabled);
}

(async () => {
  const server = staticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const chromePath = process.env.PD_CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {})
  });

  try {
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 }
    ];
    for (const viewport of viewports) {
      const { page, consoleErrors } = await makePage(browser, baseUrl, viewport);
      await page.evaluate(() => {
        sessionStorage.setItem('pd-assistente-helio-v2', JSON.stringify({
          lead: { name: 'João', business: 'sapataria', goal: 'vender online', service: 'lojas' },
          messages: []
        }));
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.click('.pd-assistant-launcher');
      const before = await page.locator('.pd-assistant-messages > *').count();
      for (let click = 0; click < 3; click += 1) {
        await page.getByRole('button', { name: 'Ver modelo visual' }).click();
      }
      const card = page.locator('[data-visual-card="fashion"]');
      const box = await card.boundingBox();
      assert.equal(await card.count(), 1);
      assert.equal(await page.locator('.pd-assistant-messages > *').count(), before + 1);
      assert.ok(box.height >= 330, `Cartão colapsado em ${viewport.width}x${viewport.height}`);
      assert.equal(await card.locator('a').first().getAttribute('href'), '/modelos/loja-moda/');
      assert.equal(consoleErrors.length, 0);
      await page.close();
    }

    const shoe = await makePage(browser, baseUrl, { width: 390, height: 844 });
    await shoe.page.click('.pd-assistant-launcher');
    await submit(shoe.page, 'Tenho uma sapataria e quero vender online.');
    await submit(shoe.page, 'Mostre uma loja de sapatos.');
    const beforeClicks = await shoe.page.locator('.pd-assistant-messages > *').count();
    for (let click = 0; click < 3; click += 1) {
      await shoe.page.getByRole('button', { name: 'Ver modelo visual' }).click();
    }
    assert.equal(await shoe.page.locator('[data-visual-card="fashion"]').count(), 1);
    assert.equal(await shoe.page.locator('.pd-assistant-messages > *').count(), beforeClicks);
    assert.equal(
      await shoe.page.getByText(/Ainda não tenho um modelo funcional específico de sapataria/).count(),
      1
    );
    const projectLink = shoe.page.locator('[data-visual-card="fashion"] div > a');
    for (let click = 0; click < 3; click += 1) await projectLink.click();
    assert.equal(await shoe.page.evaluate(() => window.__pdOpenCount), 1);
    await shoe.page.close();

    const food = await makePage(browser, baseUrl, { width: 390, height: 844 });
    await food.page.click('.pd-assistant-launcher');
    await submit(food.page, 'Tenho uma loja de açaí e trabalho com delivery.');
    await submit(food.page, 'Quero ver um cardápio.');
    assert.equal(await food.page.locator('[data-visual-card]').count(), 0);
    assert.equal(await food.page.getByRole('button', { name: 'Ver modelo visual' }).count(), 0);
    assert.equal(await food.page.getByRole('button', { name: 'Conhecer a galeria' }).count(), 1);
    assert.equal(
      await food.page.getByText(/Ainda não tenho uma demonstração funcional específica de cardápio/).count(),
      1
    );
    await food.page.close();

    const failure = await makePage(browser, baseUrl, { width: 390, height: 844 });
    await failure.page.evaluate(() => {
      sessionStorage.setItem('pd-assistente-helio-v2', JSON.stringify({
        lead: { business: 'sapataria', goal: 'vender online', service: 'lojas' },
        messages: []
      }));
    });
    await failure.page.reload({ waitUntil: 'domcontentloaded' });
    await failure.page.click('.pd-assistant-launcher');
    await failure.page.getByRole('button', { name: 'Ver modelo visual' }).click();
    const image = failure.page.locator('[data-visual-card="fashion"] img');
    await image.evaluate((element) => element.dispatchEvent(new Event('error')));
    await failure.page.waitForSelector('.pd-assistant-visual-error');
    await image.evaluate((element) => element.dispatchEvent(new Event('error')));
    await failure.page.waitForSelector('.pd-assistant-visual-error-actions');
    assert.equal(await failure.page.locator('.pd-assistant-visual-error').count(), 1);
    assert.equal(await failure.page.getByRole('link', { name: 'Abrir galeria' }).count(), 1);
    assert.equal(await failure.page.getByRole('link', { name: 'Continuar no WhatsApp' }).count(), 1);
    await failure.page.close();

    console.log(`PD-015 browser regression tests passed. Captures: ${os.tmpdir()}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
