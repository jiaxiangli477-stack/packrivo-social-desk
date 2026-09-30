import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const folder = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(folder, "app.js"), "utf8");
const instrumented = source.replace(/\n  render\(\);\s*\n\}\)\(\);\s*$/, `
  globalThis.__audit = { normalize, publicationUrl, validDate, validDateTime, publishPack, invalidateReview, reviewComplete, saveVariantFromCard, renderAccounts, renderQueue, ui, setState(value){ state = value; } };
})();`);
assert.notEqual(instrumented, source, "audit hook found");

const element = () => ({ addEventListener() {}, classList: { add() {}, remove() {} }, setAttribute() {} });
let currentCard = null;
const sandbox = {
  URL,
  localStorage: { getItem() { return null; }, setItem() {} },
  document: { getElementById: element, querySelectorAll() { return []; }, querySelector() { return currentCard; } },
  window: { addEventListener() {}, crypto: { randomUUID() { return "generated"; } } },
  location: { hash: "" },
  navigator: {},
  crypto: { randomUUID() { return "generated"; } },
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(instrumented, sandbox, { filename: "app.js" });
const api = sandbox.__audit;

assert.equal(api.validDate("2026-09-30"), true);
assert.equal(api.validDate("2026-02-31"), false);
assert.equal(api.validDateTime("2026-09-30T11:30"), true);
assert.equal(api.validDateTime("yesterday"), false);
assert.equal(api.publicationUrl("linkedin-company", "https://www.linkedin.com/posts/packrivo-test"), "https://www.linkedin.com/posts/packrivo-test");
assert.equal(api.publicationUrl("linkedin-company", "https://example.com/posts/packrivo-test"), "");
assert.equal(api.publicationUrl("linkedin-company", "https://www.linkedin.com/"), "");
assert.equal(api.publishPack({ caption: "Body", hashtags: "packaging #jewelry" }), "Body\n\n#packaging #jewelry");

const content = {
  id: "content-1", title: "Original", goal: "lead", audience: "Buyer", topic: "Boxes", hook: "Question", body: "Answer", cta: "Contact", sources: "Source", mediaRef: "",
  createdAt: "2026-09-30T11:00:00.000Z", updatedAt: "2026-09-30T11:00:00.000Z",
  review: { facts: true, rights: true, disclosure: true, cta: true },
  variants: [{ id: "variant-1", channelId: "linkedin-company", caption: "Post", hashtags: "", altText: "", scheduledAt: "2026-09-30", status: "ready", publishedUrl: "", publishedAt: "", metrics: { views: 0, clicks: 0, inquiries: 0 } }],
};
const backup = { schemaVersion: 1, items: [content], assets: [], accounts: {}, experiments: [], logs: [] };
assert.equal(api.normalize(backup).items[0].variants[0].status, "ready");
assert.throws(() => api.normalize({ ...backup, items: [{ ...content, variants: [{ ...content.variants[0], status: "unknown" }] }] }), /发布状态/);
assert.throws(() => api.normalize({ ...backup, items: [{ ...content, variants: [{ ...content.variants[0], scheduledAt: "2026-02-31" }] }] }), /日期/);
assert.throws(() => api.normalize({ ...backup, items: [{ ...content, variants: [{ ...content.variants[0], status: "published", publishedUrl: "https://example.com/post", publishedAt: "2026-09-30T11:30" }] }] }), /公开帖子链接/);

api.invalidateReview(content);
assert.equal(api.reviewComplete(content), false);
assert.equal(content.variants[0].status, "review");
content.review = { facts: true, rights: true, disclosure: true, cta: true };
content.variants[0].status = "ready";
api.setState({ ...backup, items: [content] });
currentCard = { querySelector(selector) { const fields = { caption: "Edited post", hashtags: "", altText: "", scheduledAt: "2026-09-30" }; const key = selector.match(/data-field="([^"]+)"/)?.[1]; return key ? { value: fields[key] } : null; } };
api.saveVariantFromCard("variant-1");
assert.equal(content.variants[0].status, "review");
assert.equal(api.reviewComplete(content), false);
assert.match(api.renderAccounts(), /当前是人工发布模式/);
content.variants.push({ ...content.variants[0], id: "variant-2", channelId: "instagram", status: "draft" });
assert.equal((api.renderQueue().match(/class="queue-row"/g) || []).length, 1, "default queue excludes drafts");
console.log("Packrivo Social Desk state checks passed");
