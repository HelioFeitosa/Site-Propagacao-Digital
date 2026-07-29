const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const scripts = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

assert.equal((home.match(/<h1\b/g) || []).length, 1, 'A Home deve ter um único h1');
assert.match(home, /<title>Sites, Lojas Virtuais e Atendimento Digital \| Propagação Digital<\/title>/);
assert.match(
  home,
  /<meta name="description" content="Criamos sites, lojas virtuais e atendimento digital para empresas de todo o Brasil\. Conheça projetos funcionando e converse pelo WhatsApp\."/
);

const primaryNav = home.slice(home.indexOf('<nav class="nav"'), home.indexOf('</nav>'));
assert.ok(
  primaryNav.indexOf('href="#projetos-funcionando"') < primaryNav.indexOf('href="#servicos"')
  && primaryNav.indexOf('href="#servicos"') < primaryNav.indexOf('href="#sobre"'),
  'A navegação principal deve seguir a ordem comercial da Home'
);

const projectsStart = home.indexOf('id="projetos-funcionando"');
const servicesStart = home.indexOf('id="servicos"');
const aboutStart = home.indexOf('id="sobre"');

assert.ok(
  projectsStart < servicesStart && servicesStart < aboutStart,
  'A ordem comercial deve ser projetos, serviços e só então Quem somos'
);

const servicesEnd = home.indexOf('</section>', servicesStart);
const services = home.slice(servicesStart, servicesEnd);
const serviceIds = [...services.matchAll(/id="(servico-[^"]+)"/g)].map((match) => match[1]);

assert.deepEqual(serviceIds, [
  'servico-criacao-de-sites',
  'servico-lojas-virtuais',
  'servico-landing-pages',
  'servico-seo',
  'servico-agentes-de-atendimento',
  'servico-automacao-com-ia'
], 'A Home deve priorizar exatamente os seis serviços comerciais definidos na PD-014');

for (const unsupportedClaim of [
  'o seu negócio vende muito mais',
  'entregar resultados reais',
  'fazem o seu negócio vender muito mais',
  'Cada case é um projeto real'
]) {
  assert.ok(!home.includes(unsupportedClaim), `Alegação comercial sem prova: ${unsupportedClaim}`);
}

const genericWhatsAppText = 'Ol%C3%A1%21%20Conheci%20a%20Propaga%C3%A7%C3%A3o%20Digital%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto%20para%20o%20meu%20neg%C3%B3cio.';
assert.match(
  home,
  new RegExp(`href="https://wa\\.me/5591984487207\\?text=${genericWhatsAppText}"[^>]*>Conversar sobre meu negócio</a>`)
);

for (const project of ['Lume%20Modas', 'Destak%20Colch%C3%B5es', 'Big%20Blog%20Brasil']) {
  assert.match(
    home,
    new RegExp(`href="https://wa\\.me/5591984487207\\?text=Ol%C3%A1%21%20Vi%20o%20projeto%20${project}%20e%20gostaria%20de%20algo%20parecido%20para%20o%20meu%20neg%C3%B3cio\\."`)
  );
}

const whatsappNumbers = [...home.matchAll(/https:\/\/wa\.me\/(\d+)/g)].map((match) => match[1]);
assert.ok(whatsappNumbers.length > 0, 'A Home deve conter CTAs de WhatsApp');
assert.deepEqual([...new Set(whatsappNumbers)], ['5591984487207'], 'Todos os CTAs devem usar o número comercial aprovado');

assert.match(
  home,
  /<img src="img\/hero-businessman\.jpg"[^>]*width="1600"[^>]*height="1195"[^>]*fetchpriority="high"/
);

assert.match(
  styles,
  /@media \(max-width: 640px\)[\s\S]*?\.pd-assistant-launcher-copy\s*\{\s*display:\s*none;[\s\S]*?\.pd-assistant-launcher::before\s*\{\s*content:\s*'PD';/
);

const revealSelector = scripts.match(/const targets = document\.querySelectorAll\(([\s\S]*?)\);/)?.[1] || '';
assert.ok(!revealSelector.includes('.hero-badge'), 'O selo comercial não pode depender da animação de revelação');
assert.ok(!revealSelector.includes('.hero-cta'), 'Os CTAs principais não podem depender da animação de revelação');

for (const dimensions of [
  ['img/modelos-lojas/loja-moda-print.jpg', '1280', '1700'],
  ['img/modelos-lojas/destak-colchoes-modelo.jpg', '1366', '768'],
  ['img/case-bigblog.jpg', '1600', '893']
]) {
  const [src, width, height] = dimensions;
  assert.match(
    home,
    new RegExp(`<img src="${src.replaceAll('/', '\\/')}"[^>]*width="${width}"[^>]*height="${height}"[^>]*loading="lazy"`)
  );
}

console.log('PD-014 sales-ready structural tests passed.');
