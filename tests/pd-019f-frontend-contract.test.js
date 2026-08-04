const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'atendimento.js'), 'utf8');

assert.match(source, /result\.action\?\.type === ['"]open_visual['"]/);
assert.match(source, /result\.action\.status === ['"]READY['"]/);
assert.match(source, /presentVisualOnce/);
assert.match(source, /visualActionStatus\s*=\s*['"]RENDERED['"]/);
assert.match(source, /if \(!card\).*visualActionStatus\s*=\s*['"]FAILED['"]/s);
assert.match(source, /hasVisualBeenShown/);

console.log('PD-019F frontend transactional visual contract passed.');
