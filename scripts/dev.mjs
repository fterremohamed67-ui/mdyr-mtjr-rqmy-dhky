import { spawn, spawnSync } from 'node:child_process';
import { connect, createServer } from 'node:net';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const envName of ['.env.local', '.env']) {
  const envFile = path.join(rootDir, envName);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const apiDir = path.join(rootDir, 'artifacts', 'api-server');
const webDir = path.join(rootDir, 'artifacts', 'digital-store-agent');
const apiPort = Number(process.env.API_PORT ?? '3001');
const webPort = Number(process.env.WEB_PORT ?? '5173');
if (![apiPort, webPort].every((port) => Number.isInteger(port) && port > 0 && port <= 65535) || apiPort === webPort) {
  throw new Error('API_PORT and WEB_PORT must be different valid TCP ports.');
}
const viteRequire = createRequire(path.join(webDir, 'package.json'));
const viteEntry = viteRequire.resolve('vite');
const viteCli = path.resolve(path.dirname(viteEntry), '../../bin/vite.js');
const processes = new Set();
let stopping = false;

const apiEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(apiPort),
  HOST: '127.0.0.1',
  CLERK_SECRET_KEY: '',
  CLERK_PUBLISHABLE_KEY: '',
};

const webEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(webPort),
  BASE_PATH: '/',
  API_SERVER_URL: process.env.API_SERVER_URL || `http://127.0.0.1:${apiPort}`,
  VITE_LOCAL_PREVIEW: 'true',
  VITE_CLERK_PUBLISHABLE_KEY: '',
  VITE_CLERK_PROXY_URL: '',
};

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of processes) child.kill();
}

function start(command, args, options) {
  const child = spawn(command, args, { ...options, stdio: 'inherit' });
  processes.add(child);
  child.on('error', (error) => {
    console.error('[dev] Failed to start a workspace service:', error.message);
    shutdown(1);
  });
  child.on('exit', (code) => {
    processes.delete(child);
    if (!stopping) shutdown(code ?? 1);
  });
  return child;
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Stop its existing service, then rerun corepack pnpm dev.`));
        return;
      }
      reject(error);
    });
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function waitForPort(port, child) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !stopping) {
    if (child.exitCode !== null) {
      throw new Error(`Service exited before port ${port} became ready.`);
    }
    if (await canConnect(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for local service on port ${port}.`);
}

async function main() {
  await assertPortAvailable(apiPort);
  await assertPortAvailable(webPort);

  console.log('[dev] Building the local API server...');
  const build = spawnSync(process.execPath, ['./build.mjs'], {
    cwd: apiDir,
    env: apiEnv,
    stdio: 'inherit',
  });
  if (build.error) throw build.error;
  if (build.status !== 0) throw new Error('API server build failed.');

  const api = start(process.execPath, ['--enable-source-maps', './dist/index.mjs'], {
    cwd: apiDir,
    env: apiEnv,
  });
  await waitForPort(apiPort, api);

  const web = start(process.execPath, [viteCli, '--config', 'vite.config.ts', '--host', '0.0.0.0'], {
    cwd: webDir,
    env: webEnv,
  });
  await waitForPort(webPort, web);

  console.log(`[dev] Local preview ready: http://localhost:${webPort}/assistant`);
  console.log(`[dev] API health: http://localhost:${apiPort}/api/healthz`);
  console.log('[dev] Press Ctrl+C to stop both services.');
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(`[dev] ${error.message}`);
  shutdown(1);
});