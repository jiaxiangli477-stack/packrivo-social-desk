import { createHash } from 'node:crypto';
import { reject, keys, object, text, identifier } from './errors.mjs';
export const LIVE_BLOCK_REASON = '本版本仅暂存审核后的请求，不会发帖。尚未实现 LinkedIn OAuth、应用准入与公司主页角色/权限核验；真实发布必须完成这些条件并另行确认。';
export function linkedinCapability(config) {
  return { supported: true, format: 'text', liveEnabled: false, status: 'blocked', reason: LIVE_BLOCK_REASON, target: config.linkedinOrganization || null };
}
function reviewedText(value) {
  text(value, '发布文案', 3000, true); // Validate without modifying the reviewed payload.
  return value;
}
export function validateStage(input) {
  keys(input, ['channelId', 'contentId', 'variantId', 'text', 'review', 'reviewed']);
  if (input.channelId !== 'linkedin-company') reject(400, 'CHANNEL_UNSUPPORTED', '当前只能暂存 LinkedIn 公司主页纯文字请求；其他渠道请使用人工发布');
  if (input.reviewed !== true) reject(400, 'REVIEW_REQUIRED', '请先预览并确认这份确切文案');
  keys(object(input.review, '审核'), ['facts', 'rights', 'disclosure', 'cta']);
  if (['facts', 'rights', 'disclosure', 'cta'].some(key => input.review[key] !== true)) reject(400, 'REVIEW_REQUIRED', '请完成四项人工审核');
  return { channelId: input.channelId, contentId: identifier(input.contentId, '内容 ID'), variantId: identifier(input.variantId, '版本 ID'), text: reviewedText(input.text), review: { facts: true, rights: true, disclosure: true, cta: true } };
}
export function contentHash(channelId, target, value) {
  return createHash('sha256').update(JSON.stringify([channelId, target || null, value])).digest('hex');
}
export function linkedinTextPayload(job) {
  if (!/^urn:li:organization:[1-9]\d*$/.test(job.target || '')) reject(409, 'LINKEDIN_TARGET_UNCONFIGURED', '服务端尚未设置有效的 LinkedIn 公司主页 URN');
  const commentary = reviewedText(job.text);
  return { author: job.target, commentary, visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false };
}
// No network transport exists in this release. A flag/token cannot bypass app approval,
// account authorization, exact-content approval or verification that is not implemented.
export function assertLivePublishAllowed() { reject(409, 'LIVE_PUBLISH_BLOCKED', LIVE_BLOCK_REASON); }
// Conservative future-delivery classification: ambiguous results must not be retried.
export function classifyDeliveryOutcome({ status, postId, timeout = false, networkError = false } = {}) {
  if (timeout || networkError || !Number.isInteger(status) || status === 408 || status >= 500) return 'uncertain';
  if (status === 201 && /^urn:li:(share|ugcPost):[1-9]\d*$/.test(postId || '')) return 'acknowledged';
  if (status >= 400 && status < 500) return 'failed';
  return 'uncertain';
}
