import { mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, reject } from './errors.mjs';
import { validateStage, contentHash, LIVE_BLOCK_REASON } from './linkedin.mjs';
const STATES = ['blocked', 'sending', 'uncertain', 'acknowledged', 'failed', 'published'];
export class JobStore {
  constructor(directory) {
    this.directory = resolve(directory); this.file = join(this.directory, 'jobs.json'); this.lockFile = join(this.directory, 'jobs.lock'); this.closed = false; this.failed = false;
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    // Never silently steal a lock, including after a crash. Recovery is explicit.
    try { this.lock = openSync(this.lockFile, 'wx', 0o600); writeFileSync(this.lock, `${process.pid}\n`); fsyncSync(this.lock); }
    catch { throw new AppError(503, 'STORE_LOCKED', '任务目录已锁定。确认没有正在运行的服务后，按 README 的恢复步骤处理 jobs.lock。'); }
    try {
      this.data = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : { version: 1, jobs: [] };
      this.validate();
      let recovered = false;
      for (const job of this.data.jobs) if (job.status === 'sending') { job.status = 'uncertain'; job.reason = '服务在发送记录后中断，远端结果未知；不得自动重试，请人工核验。'; job.updatedAt = new Date().toISOString(); recovered = true; }
      if (recovered || !existsSync(this.file)) this.persist(this.data);
    } catch (error) { this.close(); throw error instanceof AppError ? error : new AppError(503, 'STORE_INVALID', '持久任务文件损坏或不可写。服务已停止，原文件保留；请先备份并修复。'); }
  }
  validate() {
    if (this.data?.version !== 1 || !Array.isArray(this.data.jobs) || this.data.jobs.length > 5000) throw new Error('invalid store');
    const ids = new Set(), hashes = new Set();
    for (const job of this.data.jobs) {
      if (!job || typeof job.id !== 'string' || ids.has(job.id) || typeof job.text !== 'string' || !STATES.includes(job.status) || job.channelId !== 'linkedin-company' || job.contentHash !== contentHash(job.channelId, job.target, job.text) || hashes.has(job.contentHash)) throw new Error('invalid job');
      validateStage({ channelId: job.channelId, contentId: job.contentId, variantId: job.variantId, text: job.text, review: job.review, reviewed: true });
      ids.add(job.id); hashes.add(job.contentHash);
    }
  }
  persist(data) {
    const temporary = join(this.directory, `jobs-${randomUUID()}.tmp`);
    let fd;
    try {
      fd = openSync(temporary, 'wx', 0o600); writeFileSync(fd, JSON.stringify(data, null, 2)); fsyncSync(fd); closeSync(fd); fd = undefined;
      renameSync(temporary, this.file);
      // Directory fsync is supported on Unix; file flush + atomic rename remains on Windows.
      if (process.platform !== 'win32') { const dirfd = openSync(this.directory, 'r'); try { fsyncSync(dirfd); } finally { closeSync(dirfd); } }
    } finally { if (fd !== undefined) closeSync(fd); if (existsSync(temporary)) unlinkSync(temporary); }
  }
  list() { return structuredClone(this.data.jobs); }
  get(id) { const job = this.data.jobs.find(item => item.id === id); if (!job) reject(404, 'JOB_NOT_FOUND', '任务不存在'); return structuredClone(job); }
  stage(input, config) {
    if (this.closed || this.failed) reject(503, 'STORE_CLOSED', '任务存储不可用，请停止并重启服务后重新核对持久记录');
    const validated = validateStage(input), target = config.linkedinOrganization || null;
    const hash = contentHash(validated.channelId, target, validated.text), existing = this.data.jobs.find(item => item.contentHash === hash);
    if (existing) return { job: structuredClone(existing), duplicate: true };
    if (this.data.jobs.length >= 5000) reject(409, 'STORE_FULL', '任务库已达本地版本上限，请备份后升级存储');
    const now = new Date().toISOString();
    const job = { ...validated, id: randomUUID(), target, contentHash: hash, status: 'blocked', reason: LIVE_BLOCK_REASON, createdAt: now, updatedAt: now };
    const next = { version: 1, jobs: [job, ...this.data.jobs] };
    try { this.persist(next); } catch {
      // An fsync failure after rename leaves commit durability uncertain. Never
      // continue from stale memory and overwrite a possibly committed record.
      this.failed = true;
      reject(503, 'STORE_WRITE_UNCERTAIN', '任务保存结果不确定。已停止接受新任务，请停止并重启服务后核对持久记录；不要自动重试。');
    }
    this.data = next;
    return { job: structuredClone(job), duplicate: false };
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.lock !== undefined) { closeSync(this.lock); this.lock = undefined; unlinkSync(this.lockFile); }
  }
}
