import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AppError, reject } from './server/errors.mjs';
import { generateDraft, generationCapability } from './server/generation.mjs';
import { JobStore } from './server/store.mjs';
import { assertLivePublishAllowed, linkedinCapability } from './server/linkedin.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const COOKIE = 'packrivo_session';
const MAX_BODY = 48 * 1024;
const STATIC_FILES = new Set(['index.html', 'app.js', 'styles.css', 'theme-dark.css', 'README.md', 'ROADMAP.md', 'REVIEW_NOTES.md', 'THIRD_PARTY_NOTICES.md', 'UPGRADE.md', 'SOURCE_REVIEW_ORIGINAL.md', 'TEST_RESULTS.md']);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new AppError(500, 'CONFIG_INVALID', 'PORT 必须是有效端口');
  const model = (env.OPENAI_MODEL || '').trim();
  if (model && !/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new AppError(500, 'CONFIG_INVALID', 'OPENAI_MODEL 必须是模型 ID');
  const organization = (env.LINKEDIN_ORGANIZATION_URN || '').trim();
  if (organization && !/^urn:li:organization:[1-9]\d*$/.test(organization)) throw new AppError(500, 'CONFIG_INVALID', 'LINKEDIN_ORGANIZATION_URN 必须是公司主页 URN');
  return { port, openaiKey: env.OPENAI_API_KEY || '', openaiModel: model, linkedinOrganization: organization, dataDirectory: resolve(env.PACKRIVO_DATA_DIR || join(ROOT, '.packrivo-data')) };
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a), second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
function cookieValue(header, name) {
  const entry = String(header || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) || '';
}
async function parseBody(request) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') reject(415, 'JSON_REQUIRED', '请使用 application/json');
  if (Number(request.headers['content-length']) > MAX_BODY) reject(413, 'BODY_TOO_LARGE', '请求超出长度上限');
  let length = 0; const chunks = [];
  for await (const chunk of request) { length += chunk.length; if (length > MAX_BODY) reject(413, 'BODY_TOO_LARGE', '请求超出长度上限'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { reject(400, 'INVALID_JSON', 'JSON 请求无法读取'); }
}
function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); response.end(JSON.stringify(value));
}

export function createApplication({ config = loadConfig(), fetchImpl = globalThis.fetch, root = ROOT } = {}) {
  const store = new JobStore(config.dataDirectory), sessions = new Map();
  let generationBusy = false; const generationTimes = [];
  function capabilities() { return { generation: generationCapability(config), publishing: { 'linkedin-company': linkedinCapability(config) }, livePublishEnabled: false }; }
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      // Exact Host validation prevents DNS-rebinding names, proxying and open LAN use.
      const port = server.address()?.port;
      const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
      if (!hosts.has(request.headers.host)) reject(403, 'HOST_REJECTED', '只允许直接使用 localhost 或 127.0.0.1');
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) reject(400, 'INVALID_PATH', '请求路径无效');
      const url = new URL(request.url, `http://${request.headers.host}`), origin = url.origin;
      const pathname = decodeURIComponent(url.pathname);
      const isApi = pathname.startsWith('/api/');
      if (isApi) {
        if (request.headers.origin && request.headers.origin !== origin) reject(403, 'ORIGIN_REJECTED', '拒绝跨站请求');
        if (request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(request.headers['sec-fetch-site'])) reject(403, 'ORIGIN_REJECTED', '拒绝跨站请求');
        const now = Date.now();
        for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
        let session = sessions.get(cookieValue(request.headers.cookie, COOKIE));
        if (request.method === 'GET' && pathname === '/api/session') {
          if (!session) {
            if (sessions.size >= 128) reject(429, 'SESSION_LIMIT', '本地会话过多，请稍后再试');
            const id = randomBytes(32).toString('hex');
            session = { csrfToken: randomBytes(32).toString('hex'), expiresAt: now + 60 * 60 * 1000, lastGeneration: 0 };
            sessions.set(id, session);
            response.setHeader('Set-Cookie', `${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
          }
          return sendJson(response, 200, { csrfToken: session.csrfToken, capabilities: capabilities(), jobs: store.list() });
        }
        if (!session) reject(401, 'SESSION_REQUIRED', '请先刷新本地服务连接');
        if (request.method === 'GET' && pathname === '/api/jobs') return sendJson(response, 200, { jobs: store.list() });
        if (request.method !== 'POST') reject(405, 'METHOD_NOT_ALLOWED', '不支持该请求方法');
        // Browser POST must explicitly originate on this exact local origin.
        if (request.headers.origin !== origin || !safeEqual(request.headers['x-packrivo-csrf'], session.csrfToken)) reject(403, 'CSRF_REJECTED', '请求校验失败，请刷新本地服务连接');
        const input = await parseBody(request);
        if (pathname === '/api/generate') {
          if (!generationCapability(config).configured) reject(503, 'GENERATION_UNCONFIGURED', generationCapability(config).reason);
          while (generationTimes.length && generationTimes[0] < now - 60 * 60 * 1000) generationTimes.shift();
          if (generationBusy) reject(409, 'GENERATION_BUSY', '已有生成请求进行中，请等待完成');
          if (now - session.lastGeneration < 10000 || generationTimes.length >= 20) reject(429, 'GENERATION_LIMIT', '本地保护限制：每次间隔 10 秒，每小时最多 20 次请求');
          generationBusy = true; session.lastGeneration = now; generationTimes.push(now);
          try { return sendJson(response, 200, await generateDraft(input, config, fetchImpl)); } finally { generationBusy = false; }
        }
        if (pathname === '/api/jobs') {
          const result = store.stage(input, config);
          return sendJson(response, result.duplicate ? 200 : 201, result);
        }
        if (/^\/api\/jobs\/[a-zA-Z0-9_-]+\/publish$/.test(pathname)) {
          store.get(pathname.split('/')[3]);
          assertLivePublishAllowed();
        }
        reject(404, 'NOT_FOUND', '接口不存在');
      }
      if (!['GET', 'HEAD'].includes(request.method)) reject(405, 'METHOD_NOT_ALLOWED', '不支持该请求方法');
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!STATIC_FILES.has(relative) && !/^assets\/brand-icons\/[a-z0-9-]+\.svg$/.test(relative)) reject(404, 'NOT_FOUND', '文件不存在');
      const destination = await realpath(join(root, relative));
      const base = await realpath(root);
      if (!destination.startsWith(`${base}${sep}`)) reject(404, 'NOT_FOUND', '文件不存在');
      const bytes = await readFile(destination);
      response.writeHead(200, { 'Content-Type': TYPES[extname(relative)] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const status = error instanceof AppError ? error.status : error?.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500;
      const code = error instanceof AppError ? error.code : status === 404 ? 'NOT_FOUND' : status === 400 ? 'INVALID_PATH' : 'SERVER_ERROR';
      const message = error instanceof AppError ? error.message : status === 404 ? '文件不存在' : status === 400 ? '请求路径无效' : '本地服务操作失败；请检查目录权限。原记录未主动清空。';
      // Never log request bodies, provider responses, headers, tokens or raw exceptions.
      sendJson(response, status, { error: { code, message } });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => store.close());
  return {
    server, store, capabilities,
    async listen(port = config.port) { await new Promise((resolvePromise, rejectPromise) => { server.once('error', rejectPromise); server.listen(port, '127.0.0.1', () => { server.off('error', rejectPromise); resolvePromise(); }); }); return `http://127.0.0.1:${server.address().port}`; },
    async close() { if (!server.listening) { store.close(); return; } await new Promise(resolvePromise => server.close(resolvePromise)); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let app;
  try {
    app = createApplication();
    const address = await app.listen();
    console.log(`Packrivo local service: ${address}`);
    console.log('Live publishing is blocked in this review build. No social credentials are loaded.');
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { app.close().then(() => process.exit(0)); });
  } catch (error) {
    if (app) await app.close();
    console.error(error instanceof AppError ? `${error.code}: ${error.message}` : 'Local service could not start. Check whether the port is in use and the data directory is writable.');
    process.exitCode = 1;
  }
}
