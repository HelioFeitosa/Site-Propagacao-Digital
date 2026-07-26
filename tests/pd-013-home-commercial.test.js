const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const attendant = fs.readFileSync(path.join(root, 'atendimento.js'), 'utf8');
const homeText = home.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const requiredHeroCopy = [
  'Sites, lojas virtuais e atendimento digital para empresas',
  'Transformamos seu negócio em uma presença digital pronta para vender.',
  'Criamos sites, lojas virtuais e experiências de atendimento que apresentam sua empresa com profissionalismo e facilitam o contato dos seus clientes.',
  'Ver projetos funcionando',
  'Conversar sobre meu negócio',
  'Atendimento em todo o Brasil · Projeto personalizado · Contato direto pelo WhatsApp'
];

for (const copy of requiredHeroCopy) {
  assert.ok(homeText.includes(copy), `Texto obrigatório ausente: ${copy}`);
}

assert.match(home, /href="#projetos-funcionando"[^>]*>\s*Ver projetos funcionando/s);
assert.match(home, /href="https:\/\/wa\.me\/5591987137397\?text=[^"]+"[^>]*>\s*Conversar sobre meu negócio/s);

const projectsStart = home.indexOf('id="projetos-funcionando"');
const aboutStart = home.indexOf('id="sobre"');
assert.ok(projectsStart > 0, 'Seção de projetos deve existir');
assert.ok(aboutStart > projectsStart, 'Quem somos deve aparecer depois dos projetos');

const projects = home.slice(projectsStart, aboutStart);
const projectsText = projects.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
assert.ok(projectsText.includes('Veja nossos projetos funcionando'));
assert.ok(projectsText.includes('Explore projetos publicados e demonstrações funcionais da experiência que podemos criar para o seu negócio. Abra os projetos, navegue pelas páginas e conheça os recursos em funcionamento.'));

for (const project of [
  {
    name: 'Lume Modas',
    classification: 'Demonstração funcional',
    url: '/modelos/loja-moda/',
    image: 'img/modelos-lojas/loja-moda-print.jpg'
  },
  {
    name: 'Destak Colchões',
    classification: 'Modelo funcional publicado',
    url: 'https://loja-destak-colchoes.vercel.app',
    image: 'img/modelos-lojas/destak-colchoes-modelo.jpg'
  },
  {
    name: 'Big Blog Brasil',
    classification: 'Projeto próprio publicado',
    url: 'https://bigblogbrasil.com',
    image: 'img/case-bigblog.jpg'
  }
]) {
  assert.ok(projects.includes(project.name), `Card ausente: ${project.name}`);
  assert.ok(projects.includes(project.classification), `Classificação ausente: ${project.classification}`);
  assert.ok(projects.includes(`href="${project.url}"`), `URL ausente: ${project.url}`);
  assert.ok(projects.includes(`src="${project.image}"`), `Imagem ausente: ${project.image}`);
  assert.ok(fs.existsSync(path.join(root, project.image)), `Arquivo de imagem ausente: ${project.image}`);
}

assert.equal((projects.match(/class="project-demo-card"/g) || []).length, 3, 'Devem existir exatamente três cards');
assert.equal((projects.match(/>Abrir projeto<\/a>/g) || []).length, 3, 'Cada card precisa abrir o projeto');
assert.equal((projects.match(/>Quero algo parecido<\/a>/g) || []).length, 3, 'Cada card precisa de ação comercial');
assert.match(projects, /href="\/galeria-modelos"[^>]*>Conhecer toda a galeria<\/a>/);

const firstTwoFolds = home.slice(home.indexOf('<section class="hero"'), aboutStart);
for (const unsupportedClaim of ['resultados reais', 'vende muito mais', 'Projetos entregues', 'Suporte dedicado', 'Vendas 24/7']) {
  assert.ok(!firstTwoFolds.includes(unsupportedClaim), `Alegação indevida nas duas primeiras dobras: ${unsupportedClaim}`);
}

assert.ok(!/\.hero-image\s*\{[^}]*order:\s*-1/s.test(styles), 'Imagem não pode vir antes do conteúdo no mobile');
assert.match(styles, /\.whatsapp-float\.is-visible\s*~\s*\.pd-assistant-root\s+\.pd-assistant-launcher/);

const greeting = 'Olá! Sou o assistente virtual da Propagação Digital.\n Você está buscando um site, uma loja virtual\nou uma forma de divulgar melhor seu negócio?\nMe diga o que você precisa pra eu mostrar a melhor solução pra você !.';
assert.ok(
  attendant.includes(JSON.stringify(greeting).slice(1, -1)),
  'Mensagem inicial do atendente não corresponde à missão'
);

console.log('PD-013 Home comercial structural tests passed.');
