const { spawn } = require('child_process');

const scope = 'heliofeitosa72-3091s-projects';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: false,
      ...options
    });

    if (options.input) child.stdin.write(options.input);
    child.stdin.end();

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} saiu com codigo ${code}`));
    });
  });
}

function readClipboard() {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], {
      stdio: ['ignore', 'pipe', 'inherit']
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.on('exit', (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error('Nao consegui ler o clipboard.'));
    });
  });
}

(async () => {
  const key = await readClipboard();

  if (!key.startsWith('sk-')) {
    throw new Error('O clipboard nao contem uma chave OpenAI valida. Copie a chave novamente antes de executar.');
  }

  console.log(`Chave OpenAI detectada no clipboard. Tamanho: ${key.length} caracteres.`);
  console.log('A chave nao sera exibida.');

  await run('cmd', ['/c', 'vercel', 'env', 'rm', 'OPENAI_API_KEY', 'production', '--yes', '--scope', scope]).catch(() => {});
  await run('cmd', ['/c', 'vercel', 'env', 'add', 'OPENAI_API_KEY', 'production', '--scope', scope], { input: `${key}\n` });

  await run('cmd', ['/c', 'vercel', 'env', 'rm', 'OPENAI_MODEL', 'production', '--yes', '--scope', scope]).catch(() => {});
  await run('cmd', ['/c', 'vercel', 'env', 'add', 'OPENAI_MODEL', 'production', '--scope', scope], { input: 'gpt-5.4-mini\n' });

  console.log('Publicando com a chave tambem injetada diretamente neste deploy...');
  await run('cmd', [
    '/c',
    'vercel',
    'deploy',
    '--prod',
    '--yes',
    '--scope',
    scope,
    '-e',
    `OPENAI_API_KEY=${key}`,
    '-e',
    'OPENAI_MODEL=gpt-5.4-mini'
  ], {
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: '1' }
  });

  console.log('OK: OpenAI instalada e site publicado.');
})().catch((error) => {
  console.error(`ERRO: ${error.message}`);
  process.exit(1);
});
