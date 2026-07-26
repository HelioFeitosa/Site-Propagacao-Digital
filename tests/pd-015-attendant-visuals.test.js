const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const attendant = fs.readFileSync(path.join(root, 'atendimento.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

const requiredContractFields = ['assetId', 'visual:', 'visualStatus', 'presentationId', 'classification'];
for (const field of requiredContractFields) {
  assert.ok(attendant.includes(field), `Contrato visual sem o campo obrigatório: ${field}`);
}

assert.ok(
  attendant.includes("path: '/modelos/loja-moda/'"),
  'A demonstração de moda precisa abrir a Lume Modas funcional'
);
assert.ok(
  attendant.includes("image: '/img/modelos-lojas/loja-moda-print.jpg'"),
  'A demonstração de moda precisa usar a imagem existente da Lume Modas'
);
assert.ok(
  attendant.includes('Demonstração funcional'),
  'A classificação honesta da Lume Modas deve estar visível'
);

const shoeFallback = 'Ainda não tenho um modelo funcional específico de sapataria disponível aqui. Posso mostrar uma loja de moda semelhante, abrir nossa galeria ou encaminhar sua ideia para o Hélio.';
assert.ok(attendant.includes(shoeFallback), 'Fallback honesto para sapataria ausente');
assert.ok(
  attendant.includes('Ainda não tenho uma demonstração funcional específica de cardápio ou delivery disponível aqui.'),
  'Fallback honesto para cardápio/delivery ausente'
);
assert.ok(
  attendant.includes('Ainda não tenho uma demonstração funcional específica para este segmento disponível aqui.'),
  'Fallback honesto para segmentos sem demonstração'
);

assert.match(attendant, /function\s+hasVisualBeenShown\s*\(/);
assert.match(attendant, /function\s+presentVisualOnce\s*\(/);
assert.match(attendant, /function\s+handleVisualFailure\s*\(/);
assert.doesNotMatch(
  attendant,
  /const reply = 'Aqui esta um modelo visual\. Se nao carregar, toque em Abrir imagem maior\.'/,
  'O botão visual não pode criar a antiga mensagem repetitiva'
);

assert.match(
  attendant,
  /addAction\('Ver modelo visual',[\s\S]*?showVisualForCurrentContext\(\)/,
  'A ação visual deve apenas revelar/abrir o visual existente'
);
assert.match(
  attendant,
  /data-visual-status/,
  'O cartão deve expor o estado visual para evitar ciclos de erro'
);
assert.match(attendant, /const visuals = Object\.values\(visualExamples\)/);
assert.match(attendant, /data-presentation-id/);

assert.match(styles, /\.pd-assistant-visual\s*\{[^}]*min-height:/s);
assert.match(styles, /\.pd-assistant-visual img\s*\{[^}]*min-height:/s);
assert.match(styles, /\.pd-assistant-visual img\s*\{[^}]*object-fit:\s*cover/s);
assert.match(styles, /\.pd-assistant-visual-image-link\s*\{[^}]*aspect-ratio:/s);
assert.match(styles, /\.pd-assistant-visual \.pd-assistant-visual-image-link\[hidden\]\s*\{[^}]*display:\s*none/s);
assert.match(styles, /\.pd-assistant-visual\s*\{[^}]*cursor:\s*pointer/s);
assert.match(styles, /\.pd-assistant-visual-error/);
assert.match(styles, /\.pd-assistant-options\s*\{[^}]*flex-wrap:\s*wrap/s);
assert.match(styles, /\.pd-assistant-options button\s*\{[^}]*min-height:\s*44px/s);
assert.match(styles, /\.pd-assistant-visual-error-actions a\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*44px/s);

assert.ok(
  attendant.includes("path: '/galeria-modelos'"),
  'Contextos sem demonstração específica devem oferecer a galeria'
);
assert.ok(
  !/cardapio:[\s\S]{0,350}path:\s*'\/lojas-virtuais'/.test(attendant),
  'Cardápio/açaí não pode ser direcionado para a página genérica de lojas'
);

assert.match(attendant, /visualFailureCount/);
assert.match(attendant, /persistedFailures/);
assert.match(attendant, /failureCount\s*>=\s*2/);
assert.match(attendant, /Continuar no WhatsApp/);
assert.match(attendant, /now - lastVisualOpenAt < 900/);
assert.doesNotMatch(attendant, /card\.setAttribute\('role', 'link'\)/);

for (const file of [
  'img/modelos-lojas/loja-moda-print.jpg',
  'modelos/loja-moda/index.html',
  'galeria-modelos.html'
]) {
  assert.ok(fs.existsSync(path.join(root, file)), `Recurso confirmado ausente: ${file}`);
}

console.log('PD-015 attendant visual regression tests passed.');
