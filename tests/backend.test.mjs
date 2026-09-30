import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication, loadConfig } from '../server.mjs';
import { generateDraft, validateGeneration, extractDraft, buildGenerationRequest } from '../server/generation.mjs';
import { JobStore } from '../server/store.mjs';
import { linkedinTextPayload, classifyDeliveryOutcome, assertLivePublishAllowed } from '../server/linkedin.mjs';

const brief = { title: 'Packaging brief', audience: 'Jewelry buyer', topic: 'Box dimensions', body: 'Collect dimensions before requesting a quote.', sources: 'User supplied notes' };
const generation = { channelId: 'linkedin-company', brief, language: 'English', instructions: '' };
const stage = { channelId: 'linkedin-company', contentId: 'content-1', variantId: 'variant-1', text: 'Check product dimensions before requesting packaging quotes.\n\n#packaging', review: { facts: true, rights: true, disclosure: true, cta: true }, reviewed: true };
const generated = (text = 'Check dimensions before requesting a packaging quote.') => ({ status: 'completed', output: [{ type: 'reasoning', summary: [] }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] });
const testConfig = directory => ({ port: 8787, openaiKey: '', openaiModel: '', linkedinOrganization: '', dataDirectory: directory });
async function fixture(t, changes = {}, fetchImpl = async () => { throw new Error('Unexpected external request'); }) {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-test-'));
  const app = createApplication({ config: { ...testConfig(directory), ...changes }, fetchImpl });
  const base = await app.listen(0);
  t.after(async () => { await app.close(); rmSync(directory, { recursive: true, force: true }); });
  const sessionResponse = await fetch(`${base}/api/session`);
  const cookie = sessionResponse.headers.get('set-cookie').split(';')[0];
  const session = await sessionResponse.json();
  const post = (path, body, extra = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json', 'X-Packrivo-CSRF': session.csrfToken, ...(extra.headers || {}) }, body: JSON.stringify(body) });
  return { app, base, cookie, session, post, directory };
}

test('configuration defaults fail closed and reject arbitrary model/target input', () => {
  const config = loadConfig({});
  assert.equal(config.port, 8787); assert.equal(config.openaiKey, ''); assert.equal(config.openaiModel, '');
  assert.throws(() => loadConfig({ PORT: '0' }), /PORT/);
  assert.throws(() => loadConfig({ OPENAI_MODEL: 'https://evil.example' }), /OPENAI_MODEL/);
  assert.throws(() => loadConfig({ LINKEDIN_ORGANIZATION_URN: 'urn:li:person:123' }), /URN/);
});

test('session reports explicit blocked capabilities without secrets or fake connection', async t => {
  const f = await fixture(t, { openaiKey: 'test-secret-not-real', openaiModel: 'configured-model', linkedinOrganization: 'urn:li:organization:123' });
  assert.equal(f.session.capabilities.generation.configured, true);
  assert.equal(f.session.capabilities.livePublishEnabled, false);
  assert.equal(f.session.capabilities.publishing['linkedin-company'].status, 'blocked');
  assert.equal(f.session.capabilities.publishing['linkedin-company'].target, 'urn:li:organization:123');
  assert.ok(!JSON.stringify(f.session).includes('test-secret-not-real'));
  assert.match(f.cookie, /^packrivo_session=/);
});

test('static allowlist keeps source, env, jobs, arbitrary files and traversal private', async t => {
  const f = await fixture(t);
  for (const path of ['/server.mjs', '/server/store.mjs', '/.env', '/.env.example', '/.packrivo-data/jobs.json', '/package.json', '/%2e%2e/server.mjs']) assert.equal((await fetch(`${f.base}${path}`)).status, 404, path);
  const response = await fetch(f.base);
  assert.equal(response.status, 200); assert.match(await response.text(), /Packrivo Social Desk/);
  assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
});

test('host, origin, fetch-site, session and CSRF are enforced', async t => {
  const f = await fixture(t);
  const hostStatus = await new Promise((resolve, reject) => { const request = http.get(`${f.base}/api/session`, { headers: { Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); }); request.on('error', reject); });
  assert.equal(hostStatus, 403);
  assert.equal((await fetch(`${f.base}/api/session`, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(`${f.base}/api/session`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await fetch(`${f.base}/api/jobs`)).status, 401);
  assert.equal((await f.post('/api/jobs', stage, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.post('/api/jobs', stage, { headers: { 'X-Packrivo-CSRF': 'incorrect' } })).status, 403);
  assert.equal((await f.post('/api/jobs', stage, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  const noOrigin = await fetch(`${f.base}/api/jobs`, { method: 'POST', headers: { Cookie: f.cookie, 'Content-Type': 'application/json', 'X-Packrivo-CSRF': f.session.csrfToken }, body: JSON.stringify(stage) });
  assert.equal(noOrigin.status, 403);
});

test('unconfigured AI returns a clear error and makes no provider request', async t => {
  const f = await fixture(t);
  const response = await f.post('/api/generate', generation);
  assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'GENERATION_UNCONFIGURED');
});

test('configured AI uses fixed Responses API, server-only key and provider output', async t => {
  let called = 0;
  const f = await fixture(t, { openaiKey: 'test-secret-not-real', openaiModel: 'test-model' }, async (url, options) => {
    called++; assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-secret-not-real'); assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.model, 'test-model'); assert.equal(body.tools, undefined);
    assert.ok(body.input.includes(brief.body));
    return new Response(JSON.stringify(generated()), { status: 200 });
  });
  const response = await f.post('/api/generate', generation); const data = await response.json();
  assert.equal(response.status, 200); assert.equal(called, 1); assert.equal(data.draft.provider, 'openai'); assert.equal(data.draft.caption, generated().output[1].content[0].text);
  assert.deepEqual(f.app.store.list(), [], 'generation alone creates no publish job');
  assert.equal((await f.post('/api/generate', generation)).status, 429, 'repeat billing requests throttled');
});

test('generation validators reject arbitrary channels, extra destinations and oversized brief', () => {
  assert.throws(() => validateGeneration({ ...generation, channelId: 'reddit' }), /本阶段/);
  assert.throws(() => validateGeneration({ ...generation, url: 'https://evil.example' }), /字段/);
  assert.throws(() => validateGeneration({ ...generation, brief: { ...brief, body: 'a'.repeat(12001) } }), /长度/);
  assert.throws(() => validateGeneration({ ...generation, language: 'unknown' }), /语言/);
  assert.equal(buildGenerationRequest(validateGeneration(generation), { openaiModel: 'test' }).max_output_tokens, 1800);
});

test('refusals, incomplete/empty/oversized model output fail closed', () => {
  assert.throws(() => extractDraft({ ...generated(), status: 'incomplete' }, 3000), /未完整/);
  assert.throws(() => extractDraft(generated(''), 3000), /输出为空/);
  assert.throws(() => extractDraft(generated('a'.repeat(3001)), 3000), /长度/);
  assert.throws(() => extractDraft({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'No' }] }] }, 3000), /未能提供/);
});

test('provider errors, malformed JSON, timeout and echoed secrets never become fake drafts', async () => {
  const config = { openaiKey: 'test-secret-not-real', openaiModel: 'test-model' };
  await assert.rejects(generateDraft(generation, config, async () => new Response('secret upstream content', { status: 401 })), error => error.code === 'GENERATION_PROVIDER_ERROR' && !error.message.includes('secret upstream'));
  await assert.rejects(generateDraft(generation, config, async () => new Response('not json')), error => error.code === 'GENERATION_INVALID_RESPONSE');
  await assert.rejects(generateDraft(generation, config, async () => { throw Object.assign(new Error('private'), { name: 'TimeoutError' }); }), error => error.code === 'GENERATION_TIMEOUT');
  await assert.rejects(generateDraft(generation, config, async () => new Response(JSON.stringify(generated(config.openaiKey)))), error => error.code === 'GENERATION_INVALID_RESPONSE');
});

test('concurrent generation cannot issue a second provider request', async t => {
  let finish, entered;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const responsePromise = new Promise(resolve => { finish = resolve; });
  const f = await fixture(t, { openaiKey: 'test-placeholder', openaiModel: 'test-model' }, async () => { entered(); await responsePromise; return new Response(JSON.stringify(generated())); });
  const first = f.post('/api/generate', generation);
  await enteredPromise;
  const second = await f.post('/api/generate', generation); assert.equal(second.status, 409);
  finish(); assert.equal((await first).status, 200);
});

test('staging requires exact review, text-only valid payload and supported target', async t => {
  const f = await fixture(t);
  for (const input of [{ ...stage, reviewed: false }, { ...stage, review: { ...stage.review, facts: false } }, { ...stage, channelId: 'instagram' }, { ...stage, text: '' }, { ...stage, text: 'a'.repeat(3001) }, { ...stage, variantId: 'bad"id' }, { ...stage, media: 'https://example.com/image.jpg' }, { ...stage, accessToken: 'never-store-this' }]) {
    const response = await f.post('/api/jobs', input); assert.equal(response.status, 400);
  }
  assert.deepEqual(f.app.store.list(), []);
});

test('durable staging suppresses parallel duplicates across client IDs and never posts', async t => {
  const f = await fixture(t, { linkedinOrganization: 'urn:li:organization:123' });
  const responses = await Promise.all([f.post('/api/jobs', stage), f.post('/api/jobs', { ...stage, contentId: 'another-content', variantId: 'another-variant' })]);
  assert.deepEqual(responses.map(value => value.status).sort(), [200, 201]);
  const values = await Promise.all(responses.map(value => value.json()));
  assert.equal(values[0].job.id, values[1].job.id); assert.equal(f.app.store.list().length, 1);
  assert.equal(values[0].job.status, 'blocked'); assert.equal(values[0].job.target, 'urn:li:organization:123');
  const persisted = JSON.parse(readFileSync(join(f.directory, 'jobs.json'), 'utf8'));
  assert.equal(persisted.jobs[0].contentHash.length, 64);
  const publish = await f.post(`/api/jobs/${values[0].job.id}/publish`, { reviewed: true });
  assert.equal(publish.status, 409); assert.equal((await publish.json()).error.code, 'LIVE_PUBLISH_BLOCKED');
  assert.equal(f.app.store.list()[0].status, 'blocked');
});

test('jobs survive restart and changed text or destination creates a fresh review intent', () => {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-store-')); const config = testConfig(directory);
  let store = new JobStore(directory);
  try {
    const first = store.stage(stage, config); store.close(); store = new JobStore(directory);
    assert.equal(store.stage(stage, config).job.id, first.job.id); assert.equal(store.stage(stage, config).duplicate, true);
    assert.equal(store.stage({ ...stage, text: 'Different content' }, config).duplicate, false);
    assert.equal(store.stage(stage, { ...config, linkedinOrganization: 'urn:li:organization:123' }).duplicate, false);
    assert.equal(store.list().length, 3);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('store refuses a second process and corrupt files, preserving source data', () => {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-store-')); const store = new JobStore(directory);
  try { assert.throws(() => new JobStore(directory), /锁定/); } finally { store.close(); }
  const file = join(directory, 'jobs.json'); writeFileSync(file, '{broken');
  assert.throws(() => new JobStore(directory), /损坏/); assert.equal(readFileSync(file, 'utf8'), '{broken'); assert.equal(existsSync(join(directory, 'jobs.lock')), false);
  rmSync(directory, { recursive: true, force: true });
});

test('interrupted send is quarantined as uncertain on restart and stays deduplicated', () => {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-store-')); const config = testConfig(directory);
  let store = new JobStore(directory); const result = store.stage(stage, config); store.close();
  const file = join(directory, 'jobs.json'), data = JSON.parse(readFileSync(file, 'utf8')); data.jobs[0].status = 'sending'; writeFileSync(file, JSON.stringify(data));
  store = new JobStore(directory);
  try { assert.equal(store.get(result.job.id).status, 'uncertain'); assert.equal(store.stage(stage, config).duplicate, true); assert.match(store.get(result.job.id).reason, /不得自动重试/); }
  finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('LinkedIn payload is correct text-only shape and no config can enable a transport', () => {
  const payload = linkedinTextPayload({ text: stage.text, target: 'urn:li:organization:123' });
  assert.equal(payload.author, 'urn:li:organization:123'); assert.equal(payload.commentary, stage.text); assert.equal(payload.visibility, 'PUBLIC'); assert.equal(payload.lifecycleState, 'PUBLISHED'); assert.equal(payload.content, undefined);
  assert.deepEqual(payload.distribution, { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] });
  assert.throws(() => linkedinTextPayload({ text: 'Post', target: null }), /URN/);
  assert.throws(() => assertLivePublishAllowed({ enabled: true, approved: true, accessToken: 'fake' }), error => error.code === 'LIVE_PUBLISH_BLOCKED');
});

test('uncertain transport outcomes cannot be classified as safe to retry or published', () => {
  for (const input of [{ timeout: true }, { networkError: true }, { status: 500 }, { status: 408 }, { status: 201 }, { status: 200 }, {}]) assert.equal(classifyDeliveryOutcome(input), 'uncertain');
  assert.equal(classifyDeliveryOutcome({ status: 401 }), 'failed');
  assert.equal(classifyDeliveryOutcome({ status: 201, postId: 'urn:li:share:123' }), 'acknowledged', 'creation acknowledgement still needs verification');
});

test('request body size limit is enforced before staging', async t => {
  const f = await fixture(t); const response = await f.post('/api/jobs', { ...stage, text: 'a'.repeat(50000) });
  assert.equal(response.status, 413); assert.equal(f.app.store.list().length, 0);
});

test('staging and adapter preserve exact reviewed whitespace and line endings', () => {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-exact-')); const store = new JobStore(directory);
  try { const text = '  exact reviewed\r\nsecond line  '; const { job } = store.stage({ ...stage, text }, { ...testConfig(directory), linkedinOrganization: 'urn:li:organization:123' }); assert.equal(job.text, text); assert.equal(linkedinTextPayload(job).commentary, text); }
  finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('malformed provider content is a sanitized provider error, not an internal exception', () => {
  for (const content of [[null], {}, null]) assert.throws(() => extractDraft({ status: 'completed', output: [{ type: 'message', role: 'assistant', content }] }, 3000), error => error.code === 'GENERATION_INVALID_RESPONSE' && error.status === 502);
});

test('post-rename fsync failure fails closed and recovers committed job on restart', { skip: process.platform === 'win32' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'packrivo-fsync-'));
  const config = testConfig(directory);
  const originalFsync = fs.fsyncSync;
  let store = new JobStore(directory);
  try {
    fs.fsyncSync = fd => {
      if (fs.fstatSync(fd).isDirectory()) throw Object.assign(new Error('injected directory fsync failure'), { code: 'EIO' });
      return originalFsync(fd);
    };
    syncBuiltinESMExports();
    try {
      assert.throws(() => store.stage(stage, config), error => error.code === 'STORE_WRITE_UNCERTAIN' && error.status === 503);
    } finally { fs.fsyncSync = originalFsync; syncBuiltinESMExports(); }
    const file = join(directory, 'jobs.json'), committed = readFileSync(file, 'utf8');
    assert.equal(JSON.parse(committed).jobs.length, 1);
    assert.throws(() => store.stage({ ...stage, text: 'Second reviewed post' }, config), error => error.code === 'STORE_CLOSED');
    assert.equal(readFileSync(file, 'utf8'), committed);
    store.close(); store = new JobStore(directory);
    assert.equal(store.stage(stage, config).duplicate, true);
    assert.equal(store.stage({ ...stage, text: 'Second reviewed post' }, config).duplicate, false);
    assert.equal(store.list().length, 2); assert.ok(store.list().some(job => job.text === stage.text));
  } finally {
    fs.fsyncSync = originalFsync; syncBuiltinESMExports(); store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
