const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto('https://propagacaodigital.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    const launcher = page.getByRole('button', { name: 'Abrir atendimento inteligente' });
    await launcher.click();
    const panel = page.getByRole('dialog', { name: 'Atendimento inteligente Propagação Digital' });
    await panel.waitFor({ state: 'visible' });
    assert.match(await panel.innerText(), /Hélio/);
    assert.match(await panel.innerText(), /como você gostaria que eu te chamasse/i);
    assert.equal(errors.length, 0, `browser errors: ${errors.join(' | ')}`);
    console.log(JSON.stringify({ url: page.url(), status: 200, viewport: '390x844', widget: 'visible', consoleErrors: 0 }));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
