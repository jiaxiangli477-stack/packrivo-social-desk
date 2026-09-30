# Packrivo Social Desk · 1.1 可审查增量

基于私有仓库 main 提交 `e305f92ef6fc57e928ce348175fba6388f3a87d8` 的独立副本。原目录未修改，未推送代码、未部署、未申请 OAuth、未发送真实社媒帖子。界面品牌和现有离线运营流程保留。

## 这次可以做什么

1. 双击 `index.html`，继续离线编辑、账号登记、手工发布交接、结果记录与 JSON 导入导出
2. 启动可选 Node 本机服务，手动检查真实配置状态
3. 配置 OpenAI 后，从已保存母稿请求 LinkedIn 公司主页、Instagram、Facebook 或 X 的文字草稿；先预览、可修改，接受后创建未审核版本
4. 对已保存的 LinkedIn 公司主页纯文字版本完成四项审核，在本次页面重新确认该版本，再预览最终正文＋标签并暂存请求
5. 在“本机服务”看到持久请求、目标、确切文案、受阻原因和重复请求结果。暂存永远不改变版本为“已发布”

没有模型配置时会明确提示，不会用静态模板冒充 AI 生成。Instagram/Facebook/X 仅是文字起草格式，**不代表账号连接或发布适配器已完成**。33 个渠道仍是运营目录。

## 启动

需要 Node.js 22 或更新版本，无第三方依赖，不需要 `npm install`。

```sh
node server.mjs
```

浏览器打开终端打印的 `http://127.0.0.1:8787`。服务固定监听 127.0.0.1，不提供修改监听地址的设置。不要放到公网、反向代理或共享电脑上。

首次进入“本机服务”或工作室，点击“检查本机服务”。单纯启动服务、打开页面或连接服务都不会将母稿送到 OpenAI。

### 可选：启用真实 AI 起草

将 `.env.example` 复制为本机 `.env`，由操作者自己填入 `OPENAI_API_KEY` 和本账户支持 Responses API 的 `OPENAI_MODEL`，然后运行：

```sh
node --env-file=.env server.mjs
```

也可以由系统环境传入这两个值。不要把 `.env`、密钥或平台令牌发到聊天、前端、代码仓库、日志或备份。

点击“生成平台草稿”会将屏幕说明中的已保存母稿字段和补充要求发送给 OpenAI，可能产生 API 费用。不会自动抓取来源 URL，不上传媒体。采用 `store:false`，但这不等于零数据保留，适用账户的数据处理政策仍然生效。每次间隔至少 10 秒、每小时最多 20 次、同一服务只允许一个在途生成；这些是简单保护，不是金额预算系统。超时或网络错误不自动重试。

“已配置”只说明服务端存在密钥和模型名，不能证明密钥有效、模型可用或额度充足。本次交付没有用真实账户做生成验收。

`LINKEDIN_ORGANIZATION_URN` 只是可选预览目标，例如组织 URN；不会连接账号或证明拥有该主页。**本版本没有 LinkedIn 访问令牌配置，没有可以打开真实发帖的环境开关**。

## 数据与审核

- 浏览器母稿继续使用原 `packrivo-social-desk-v1` 和备份 schema 1；AI 起草来源作为可选附加字段，旧数据可读
- file://、localhost、127.0.0.1 和不同端口各自拥有不同的浏览器存储。迁移前先从原页面导出备份，再在新地址导入，不会自动搬移旧浏览器数据
- 修改母稿、任一版本发布内容、接受 AI 草稿或新建版本会清空相关审核。仅改变计划日期不会授权自动执行
- API 暂存及人工发布交接要求本次页面对确切版本重新确认。审核快照仅在内存，刷新、导入后不能凭历史 ready 字段直接执行
- 真实提交前的预览包含最终文字、目标和公开可见性说明；当前提交仅是本机暂存
- LinkedIn 暂存只支持文字，正文与标签共最多 3,000 个 JavaScript 字符。不上传素材，关联素材或图片说明必须先移除并重新审核
- 任务存储与浏览器备份分开。默认目录 `.packrivo-data/`（可用 `PACKRIVO_DATA_DIR` 指定私有绝对路径），`jobs.json` 包含文字、审核记录、目标、时间和哈希，**不包含密钥**
- 同一渠道＋目标＋完全相同文字始终返回已有任务，即使来自不同版本或重复点击。改文案/目标需重新预览、创建新任务。当前不能再次暂存同样的周期性重复帖子
- 存储采用单进程排他锁、原子替换、文件刷盘；最多 5,000 条，满额拒绝写入。不是多用户数据库，不支持多进程服务
- 持久文件损坏时拒绝启动且保留原文件。落盘结果不确定时停止接受任务，不能用旧内存继续覆盖数据

### 备份、退出与异常恢复

关闭服务请在终端按 Ctrl+C。退出后再备份整个私有任务数据目录；浏览器内容使用原“导出备份”。二者都可能包含业务资料，应妥善保管。

异常退出可能留下 `jobs.lock`，下一次启动会报锁定。先确认没有 Packrivo 服务进程运行，备份数据目录，再由操作者移除该锁文件后重启；不要在服务运行时删锁或编辑 `jobs.json`。

任何历史 `sending` 记录在重启时转为 `uncertain`，必须人工对账，不自动重发。本次界面没有发送路径，正常新任务只会是 `blocked`。结果分类/重启恢复是未来投递的基础防护，不能当成已经实现完整队列或平台核验。

## 安全范围

本机服务提供精确 Host 校验、同源 Origin/Fetch Metadata 检查、HttpOnly + SameSite=Strict 会话、CSRF 校验、静态文件白名单、输入上限与禁止重定向的固定 OpenAI 地址。密钥只在服务进程环境中读取。错误不会透传提供商原始响应、请求头或密钥。

这是一台可信个人电脑上的开发/审查构建，没有用户登录系统、TLS、系统密钥库或多用户隔离。不能抵御已控制本机的其他进程。不要将其作为已完成的生产服务公开。

## 明确未完成

- LinkedIn OAuth、Community Management API 准入、权限/公司角色验证、令牌刷新、真实发布与发布后读取核验
- 其他平台账号连接、图片/视频上传、批量投递、自动排期、重试/撤销界面、持续自动发布授权
- 在线数据库、多人登录/权限、部署、线上监控、平台效果自动归因
- 真实 OpenAI 与 LinkedIn 端到端验收
- 真实浏览器视觉与点击验收：本轮云浏览器访问 localhost 被客户端策略阻止（`ERR_BLOCKED_BY_CLIENT`）；没有改成公网或其他绕行方式

手工回填公开 URL 仍只是格式检查，不证明帖子存在。原版全部边界和审查发现见 `SOURCE_REVIEW_ORIGINAL.md`；它审查的是升级前代码，不是升级后验收报告。

## 检查

```sh
npm test
npm run test:frontend
```

不使用真实密钥、不调用第三方服务。后端测试用注入的假响应覆盖 Responses 请求结构、真/假成功区分、错误/超时/格式异常；HTTP 测试覆盖来源校验、会话、CSRF、静态文件拒绝、输入验证、暂存及重复请求；文件测试覆盖重启、锁、损坏和不确定记录。

前端 VM 测试覆盖离线无网络、转义、审核失效、导入标识校验、编辑保留、生成接受/取消/导航竞争、确切预览和暂存。它们不能替代浏览器对话框、剪贴板、布局和真实网络的验收。

## 接口与实现位置

- `server.mjs`：本机 HTTP 入口、会话/CSRF、静态白名单
- `server/generation.mjs`：固定 OpenAI Responses API、输入与输出验证
- `server/linkedin.mjs`：文字 payload 构造、能力门控、结果分类；**无网络发送函数**
- `server/store.mjs`：持久受阻任务、内容哈希去重与崩溃恢复
- `GET /api/session`：配置能力与会话，不返回任何提供商密钥
- `POST /api/generate`：主动生成草稿
- `GET /api/jobs`、`POST /api/jobs`：读取/暂存经审核的确切请求
- `POST /api/jobs/:id/publish`：始终返回 `409 LIVE_PUBLISH_BLOCKED`

## 官方实现依据

核对日期：2026-09-30。文档/资格随平台变化，真正接入前需再次核验。

- [OpenAI 文本生成](https://developers.openai.com/api/docs/guides/text)：使用固定 `https://api.openai.com/v1/responses`，从输出消息的 `output_text` 内容提取文字
- [OpenAI Responses 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)：无 SDK 依赖，显式关闭响应存储
- [OpenAI 数据控制](https://developers.openai.com/api/docs/guides/your-data)：`store:false` 不等于所有数据保留例外已解决
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)：文本 payload 的 author/commentary/distribution 等结构；创建回执和远端核验尚未接入
- [LinkedIn Community Management 准入](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-api-migration-guide)：公司权限与产品准入是后续接入门槛
