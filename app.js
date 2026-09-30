(function () {
  "use strict";

  const CHANNELS = [
    {id:"linkedin-personal",name:"LinkedIn · 个人档案",mark:"in",group:"core",mode:"manual",signup:"https://www.linkedin.com/signup",publish:"https://www.linkedin.com/feed/",hint:"先用本人真实姓名建立档案，再管理公司主页。"},
    {id:"linkedin-company",name:"LinkedIn · 公司主页",mark:"in",group:"core",mode:"manual",signup:"https://www.linkedin.com/company/setup/new/",publish:"https://www.linkedin.com/feed/",hint:"Packrivo 首个完整人工发布流程。"},
    {id:"instagram",name:"Instagram",mark:"IG",group:"core",mode:"manual",signup:"https://www.instagram.com/accounts/emailsignup/",publish:"https://www.instagram.com/",hint:"图片、图文轮播与短视频；专业账号资格需日后核验。"},
    {id:"facebook",name:"Facebook Page",mark:"f",group:"core",mode:"manual",signup:"https://www.facebook.com/pages/create/",publish:"https://www.facebook.com/",hint:"品牌主页；注册与发布状态由你手工记录。"},
    {id:"threads",name:"Threads",mark:"@",group:"core",mode:"manual",signup:"https://www.threads.com/",publish:"https://www.threads.com/",hint:"Meta 文字社区；实际账号关联方式以平台页面为准。"},
    {id:"tiktok",name:"TikTok",mark:"♪",group:"core",mode:"manual",signup:"https://www.tiktok.com/signup",publish:"https://www.tiktok.com/",hint:"短视频平台；当前不代表发布 API 已获批。"},
    {id:"youtube",name:"YouTube",mark:"▶",group:"core",mode:"manual",signup:"https://www.youtube.com/",publish:"https://studio.youtube.com/",hint:"先创建 Google 账号与品牌频道，再准备教程视频。"},
    {id:"pinterest",name:"Pinterest Business",mark:"P",group:"core",mode:"manual",signup:"https://business.pinterest.com/getting-started/",publish:"https://www.pinterest.com/",hint:"包装结构、材料与灵感图；建议使用 Business 账号。"},
    {id:"google-business",name:"Google Business Profile",mark:"G",group:"core",mode:"manual",signup:"https://www.google.com/business/",publish:"https://www.google.com/business/",hint:"仅当业务符合平台资料资格时建立并核验，不能把账号登记当作 GEO 引用。"},
    {id:"reddit",name:"Reddit",mark:"r/",group:"core",mode:"community",signup:"https://www.reddit.com/",publish:"https://www.reddit.com/r/Packaging/",hint:"针对具体讨论人工回答；先读每个社区的版规。"},
    {id:"x",name:"X",mark:"X",group:"other",mode:"manual",signup:"https://x.com/signup",publish:"https://x.com/",hint:"文字与行业即时讨论。"},
    {id:"quora",name:"Quora",mark:"Q",group:"other",mode:"community",signup:"https://www.quora.com/",publish:"https://www.quora.com/",hint:"只回答真实相关问题，披露业务关系。"},
    {id:"snapchat",name:"Snapchat",mark:"S",group:"other",mode:"manual",signup:"https://www.snapchat.com/",publish:"https://www.snapchat.com/",hint:"通常通过手机 App 注册与发布。"},
    {id:"bluesky",name:"Bluesky",mark:"B",group:"other",mode:"manual",signup:"https://bsky.app/",publish:"https://bsky.app/",hint:"开放社交网络；优先级待目标受众验证。"},
    {id:"mastodon",name:"Mastodon",mark:"M",group:"other",mode:"manual",signup:"https://joinmastodon.org/servers",publish:"https://joinmastodon.org/",hint:"需要先选服务器，具体发帖入口取决于实例。"},
    {id:"medium",name:"Medium",mark:"M",group:"other",mode:"editorial",signup:"https://medium.com/",publish:"https://medium.com/",hint:"长文分发；与官网原文关系需人工处理。"},
    {id:"substack",name:"Substack",mark:"S",group:"other",mode:"editorial",signup:"https://substack.com/get-started",publish:"https://substack.com/",hint:"适合订阅型内容，暂无自动连接。"},
    {id:"tumblr",name:"Tumblr",mark:"t",group:"other",mode:"manual",signup:"https://www.tumblr.com/register",publish:"https://www.tumblr.com/",hint:"博客式社交渠道。"},
    {id:"twitch",name:"Twitch",mark:"T",group:"other",mode:"manual",signup:"https://www.twitch.tv/signup",publish:"https://www.twitch.tv/",hint:"直播导向；本项目需先验证内容形式。"},
    {id:"shopify-community",name:"Shopify Community",mark:"Sh",group:"community",mode:"community",signup:"https://community.shopify.com/",publish:"https://community.shopify.com/",hint:"商家问答，禁止模板化和无关推广。"},
    {id:"etsy-community",name:"Etsy Community",mark:"E",group:"community",mode:"community",signup:"https://community.etsy.com/",publish:"https://community.etsy.com/",hint:"面向手作、珠宝与礼品卖家，逐题人工参与。"},
    {id:"discord",name:"Discord",mark:"D",group:"community",mode:"community",signup:"https://discord.com/register",publish:"https://discord.com/app",hint:"已有社群时才需要运营；不是公开曝光捷径。"},
    {id:"telegram",name:"Telegram Channel",mark:"Tg",group:"community",mode:"community",signup:"https://telegram.org/",publish:"https://web.telegram.org/",hint:"频道与消息分发，通常先在 App 注册。"},
    {id:"whatsapp",name:"WhatsApp Business",mark:"W",group:"community",mode:"manual",signup:"https://www.whatsapp.com/business/",publish:"https://www.whatsapp.com/business/",hint:"客户联系渠道；不是公共社媒帖子队列。"},
    {id:"vk",name:"VK",mark:"VK",group:"regional",mode:"manual",signup:"https://vk.com/",publish:"https://vk.com/",hint:"按俄罗斯及周边目标市场决定是否运营。"},
    {id:"line",name:"LINE",mark:"L",group:"regional",mode:"manual",signup:"https://line.me/en/",publish:"https://line.me/en/",hint:"按日本、泰国等目标市场决定是否运营。"},
    {id:"kakao",name:"KakaoTalk",mark:"K",group:"regional",mode:"manual",signup:"https://www.kakaocorp.com/page/service/service/KakaoTalk?lang=en",publish:"https://www.kakaocorp.com/",hint:"按韩国市场决定是否运营。"},
    {id:"zalo",name:"Zalo",mark:"Z",group:"regional",mode:"manual",signup:"https://zalo.me/",publish:"https://zalo.me/",hint:"按越南市场决定是否运营。"},
    {id:"kwai",name:"Kwai",mark:"Kw",group:"regional",mode:"manual",signup:"https://www.kwai.com/",publish:"https://www.kwai.com/",hint:"按巴西等目标市场决定是否运营。"},
    {id:"packaging-europe",name:"Packaging Europe",mark:"PE",group:"editorial",mode:"editorial",signup:"https://packagingeurope.com/submissions",publish:"https://packagingeurope.com/submissions",hint:"编辑投稿；该媒体要求人工撰写且保留采用权。"},
    {id:"packaging-digest",name:"Packaging Digest",mark:"PD",group:"editorial",mode:"editorial",signup:"https://www.packagingdigest.com/frequently-asked-questions-faqs",publish:"https://www.packagingdigest.com/",hint:"专家文章需编辑审核；不等于自动发布。"},
    {id:"dieline",name:"DIELINE",mark:"DL",group:"editorial",mode:"editorial",signup:"https://thedieline.com/submit/",publish:"https://thedieline.com/submit/",hint:"包装项目策展审核；提交前检查图片权属。"},
    {id:"packaging-world",name:"Packaging of the World",mark:"PW",group:"editorial",mode:"editorial",signup:"https://packagingoftheworld.com/faq",publish:"https://packagingoftheworld.com/",hint:"包装项目提交审核；概念图需准确标注。"}
  ];

  const STORAGE_KEY = "packrivo-social-desk-v1";
  const LABELS = {overview:"今日总览",studio:"内容工作室",queue:"发布日历与队列",library:"内容与素材库",accounts:"社媒账号",results:"结果记录"};
  const STATUS = {draft:"草稿",review:"待审核",ready:"可发布",pending:"已打开平台 · 待核实",published:"已发布",failed:"需处理"};
  const MODES = {manual:"人工交接",community:"社区逐帖审核",editorial:"编辑投稿"};
  const GOALS = {lead:"B2B 询盘",geo:"GEO / 品牌可见性"};
  const GROUPS = {core:"第一批",other:"其他主流",community:"社区与消息",regional:"地区平台",editorial:"行业投稿"};
  const BRAND_ICONS = {
    instagram:["instagram","#FF0069"],facebook:["facebook","#0866FF"],threads:["threads","#20242D"],tiktok:["tiktok","#20242D"],youtube:["youtube","#FF0000"],pinterest:["pinterest","#BD081C"],reddit:["reddit","#FF4500"],"google-business":["google","#4285F4"],x:["x","#20242D"],quora:["quora","#B92B27"],snapchat:["snapchat","#D9B600"],bluesky:["bluesky","#1185FE"],mastodon:["mastodon","#6364FF"],medium:["medium","#20242D"],substack:["substack","#FF6719"],tumblr:["tumblr","#36465D"],twitch:["twitch","#9146FF"],"shopify-community":["shopify","#7AB55C"],"etsy-community":["etsy","#F16521"],discord:["discord","#5865F2"],telegram:["telegram","#26A5E4"],whatsapp:["whatsapp","#25D366"],vk:["vk","#0077FF"],line:["line","#00C300"],kakao:["kakaotalk","#E2B900"],zalo:["zalo","#0068FF"]
  };
  const REVIEW_FIELDS = [
    ["facts","事实与来源已核对"],
    ["rights","素材权属与使用权限已核对"],
    ["disclosure","概念图和 AI 内容标注已核对"],
    ["cta","目标买家与行动提示已核对"]
  ];

  function byId(id){return document.getElementById(id);}
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});}
  function safeUrl(value){try{const u=new URL(String(value||""));return u.protocol==="https:"||u.protocol==="http:"?u.href:"";}catch{return "";}}
  function validDate(value){if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+"T12:00:00");return !Number.isNaN(d.getTime())&&d.getFullYear()===Number(value.slice(0,4))&&d.getMonth()+1===Number(value.slice(5,7))&&d.getDate()===Number(value.slice(8,10));}
  function validDateTime(value){return !value||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(String(value))&&!Number.isNaN(new Date(value).getTime())&&String(value).length<=35);}
  function publicationUrl(channelId,value){
    const clean=safeUrl(value);if(!clean)return "";
    const url=new URL(clean),host=url.hostname.toLowerCase().replace(/^www\./,"");
    if(channelId==="linkedin-company"||channelId==="linkedin-personal")return host==="linkedin.com"&&(/^\/posts\//.test(url.pathname)||/^\/feed\/update\//.test(url.pathname))?clean:"";
    const expected=new URL(channel(channelId).publish).hostname.toLowerCase().replace(/^www\./,"");
    if(channelId==="youtube")return (host==="youtube.com"||host==="youtu.be")&&url.pathname!=="/"?clean:"";
    if(channelId==="telegram")return (host==="t.me"||host==="telegram.me")&&url.pathname!=="/"?clean:"";
    return (host===expected||host.endsWith("."+expected))&&url.pathname!=="/"?clean:"";
  }
  function uid(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():"id-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);}
  function todayKey(offset){const d=new Date();d.setDate(d.getDate()+(offset||0));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function displayDate(value){if(!value)return"未排期";const d=new Date(value.length===10?value+"T12:00:00":value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat("zh-CN",{month:"short",day:"numeric"}).format(d);}
  function channel(id){return CHANNELS.find(x=>x.id===id)||CHANNELS[0];}
  function platformMark(c){const icon=BRAND_ICONS[c.id];return '<span class="platform-mark mark-'+esc(c.id)+'"'+(icon?' style="--brand-color:'+icon[1]+'"':'')+'>'+(icon?'<img src="./assets/brand-icons/'+icon[0]+'.svg" alt="" loading="lazy">':esc(c.mark))+'</span>';}
  function blankState(){return {schemaVersion:1,items:[],assets:[],accounts:{},experiments:[],logs:[]};}
  function normalize(raw){
    const base=blankState(),bad=message=>{throw new Error(message);},str=(value,label,max=12000)=>{if(typeof value!=="string"||value.length>max)bad(label+"格式不正确");return value;},optional=(value,label,max=12000)=>str(value==null?"":value,label,max),arr=(value,label,max=5000)=>{if(!Array.isArray(value)||value.length>max)bad(label+"格式不正确");return value;},oneOf=(value,allowed,label)=>{if(!allowed.includes(value))bad(label+"不受支持");return value;};
    if(!raw||raw.schemaVersion!==1)bad("备份版本不受支持");
    for(const field of ["items","assets","experiments","logs"])arr(raw[field],field);
    if(!raw.accounts||typeof raw.accounts!=="object"||Array.isArray(raw.accounts))bad("账号记录格式不正确");
    base.items=raw.items.map((content,i)=>{
      if(!content||typeof content!=="object")bad("第 "+(i+1)+" 条内容格式不正确");
      const itemCopy={id:str(content.id,"内容 ID",100),createdAt:optional(content.createdAt,"创建时间",35),updatedAt:optional(content.updatedAt,"更新时间",35),variants:[],review:{}};
      if(!validDateTime(itemCopy.createdAt)||!validDateTime(itemCopy.updatedAt))bad("内容时间无效");
      for(const field of ["title","audience","topic","hook","body","cta","sources","mediaRef"])itemCopy[field]=optional(content[field],field,field==="body"?30000:12000);
      if(!itemCopy.title)bad("内容标题不能为空");itemCopy.goal=oneOf(content.goal,["lead","geo"],"内容目标");
      for(const [key] of REVIEW_FIELDS)itemCopy.review[key]=content.review&&content.review[key]===true;
      itemCopy.variants=arr(content.variants,"平台版本",100).map((v,j)=>{
        if(!v||typeof v!=="object")bad("第 "+(i+1)+" 条内容的平台版本 "+(j+1)+" 无效");
        const copy={id:str(v.id,"版本 ID",100),channelId:str(v.channelId,"渠道 ID",100),caption:optional(v.caption,"平台文案",30000),hashtags:optional(v.hashtags,"标签",3000),altText:optional(v.altText,"替代文字",3000),scheduledAt:optional(v.scheduledAt,"排期日期",10),status:oneOf(v.status,Object.keys(STATUS),"发布状态"),publishedUrl:optional(v.publishedUrl,"公开链接",2000),publishedAt:optional(v.publishedAt,"发布时间",35),publishNote:optional(v.publishNote,"发布备注",3000),metrics:{}};
        if(!CHANNELS.some(c=>c.id===copy.channelId)||!validDate(copy.scheduledAt)||!validDateTime(copy.publishedAt))bad("渠道或日期无效");
        if(copy.publishedUrl&&!publicationUrl(copy.channelId,copy.publishedUrl))bad("公开帖子链接与渠道不匹配");
        if(copy.status==="published"&&(!copy.publishedUrl||!copy.publishedAt))bad("已发布版本缺少公开链接或时间");
        for(const key of ["views","clicks","inquiries"]){const n=Number(v.metrics&&v.metrics[key]||0);if(!Number.isFinite(n)||n<0||n>1e9)bad("表现数据无效");copy.metrics[key]=n;}
        return copy;
      });
      return itemCopy;
    });
    base.assets=raw.assets.map(a=>{if(!a||typeof a!=="object")bad("素材记录无效");return {id:str(a.id,"素材 ID",100),name:str(a.name,"素材名称",500),kind:oneOf(a.kind,["image","video","website","document"],"素材类型"),rights:oneOf(a.rights,["owned","public-reference","unknown"],"素材权属"),uri:optional(a.uri,"素材位置",2000),note:optional(a.note,"素材说明",3000)};});
    for(const [id,rec] of Object.entries(raw.accounts)){if(!CHANNELS.some(c=>c.id===id)||!rec||typeof rec!=="object")bad("账号记录无效");const profile=optional(rec.profile,"主页链接",2000);if(profile&&!safeUrl(profile))bad("主页链接无效");base.accounts[id]={status:oneOf(rec.status,["unregistered","registered","profile_ready"],"账号状态"),profile};}
    base.experiments=raw.experiments.map(e=>{if(!e||typeof e!=="object")bad("GEO 记录无效");const url=optional(e.url,"观察链接",2000),date=optional(e.date,"观察日期",35);if(url&&!safeUrl(url)||!validDateTime(date))bad("GEO 链接或日期无效");return {id:str(e.id,"观察 ID",100),question:str(e.question,"测试问题",3000),engine:optional(e.engine,"观察渠道",500),outcome:oneOf(e.outcome,["none","mention","citation"],"观察结果"),url,date};});
    base.logs=raw.logs.slice(0,100).map(x=>{if(!x||typeof x!=="object")bad("操作记录无效");return {id:str(x.id,"记录 ID",100),at:optional(x.at,"记录时间",35),action:optional(x.action,"操作",500),detail:optional(x.detail,"详情",3000)};});
    return base;
  }
  let storageReady=true,loadIssueRaw="",loadIssueMessage="";
  function load(){let saved="";try{saved=localStorage.getItem(STORAGE_KEY)||"";return saved?normalize(JSON.parse(saved)):blankState();}catch(error){storageReady=false;if(saved){loadIssueRaw=saved;loadIssueMessage=String(error.message||error);}return blankState();}}
  let state=load();
  const ui={view:"accounts",accountFilter:"core",accountSearch:"",queueFilter:"actionable",activeItemId:null,noticeTimer:null};
  function save(message){if(loadIssueRaw){toast("旧数据未通过校验。请先导出恢复备份并检查，当前记录不会覆盖旧数据。");return;}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageReady=true;byId("storage-alert").hidden=true;}catch{storageReady=false;const a=byId("storage-alert");a.hidden=false;a.textContent="此浏览器未允许本机保存。当前操作只在页面打开期间有效；请导出备份。";}if(message)toast(message);}
  function log(action,detail){state.logs.unshift({id:uid(),at:new Date().toISOString(),action:action,detail:detail});state.logs=state.logs.slice(0,100);}
  function toast(message){const box=byId("toast");box.textContent=message;box.classList.add("show");clearTimeout(ui.noticeTimer);ui.noticeTimer=setTimeout(()=>box.classList.remove("show"),3400);}
  function option(value,label,current){return '<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(label)+'</option>';}
  function pill(status){return '<span class="status-pill '+esc(status)+'">'+esc(STATUS[status]||status)+'</span>';}
  function item(id){return state.items.find(x=>x.id===id);}
  function variant(id){for(const content of state.items){const found=(content.variants||[]).find(x=>x.id===id);if(found)return {content:content,variant:found};}return null;}
  function variants(){return state.items.flatMap(content=>(content.variants||[]).map(v=>({content:content,variant:v})));}
  function reviewComplete(content){return REVIEW_FIELDS.every(x=>content.review&&content.review[x[0]]);}
  function invalidateReview(content){content.review={facts:false,rights:false,disclosure:false,cta:false};for(const v of content.variants||[])if(["ready","pending"].includes(v.status))v.status="review";}
  function hasUnsavedVariant(id){const found=variant(id),card=document.querySelector('[data-variant-card="'+id+'"]');return !!(found&&card&&["caption","hashtags","altText","scheduledAt"].some(key=>{const field=card.querySelector('[data-field="'+key+'"]');return field&&field.value.trim()!==String(found.variant[key]||"");}));}
  function publishPack(v){const tags=v.hashtags.trim().split(/[\s,]+/).filter(Boolean).map(tag=>tag.startsWith("#")?tag:"#"+tag).join(" ");return [v.caption.trim(),tags].filter(Boolean).join("\n\n");}
  function link(url,label,css){const safe=safeUrl(url);return safe?'<a class="'+(css||"button button-quiet")+'" href="'+esc(safe)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':"";}

  function render(){
    const route=LABELS[ui.view]?ui.view:"accounts";
    document.querySelectorAll(".nav-link").forEach(b=>{b.classList.toggle("active",b.dataset.view===route);b.setAttribute("aria-current",b.dataset.view===route?"page":"false");});
    byId("topbar-title").textContent=LABELS[route];
    const views={overview:renderOverview,studio:renderStudio,queue:renderQueue,library:renderLibrary,accounts:renderAccounts,results:renderResults};
    byId("view").innerHTML=views[route]();
    document.querySelectorAll('[data-action="copy-caption"]').forEach(button=>{
      const found=variant(button.dataset.id);button.dataset.action="copy-pack";button.textContent="复制发布包";
      if(found&&found.variant.altText){const alt=document.createElement("button");alt.type="button";alt.className="button button-outline";alt.dataset.action="copy-alt";alt.dataset.id=button.dataset.id;alt.textContent="复制图片说明";button.after(alt);}
    });
    document.querySelectorAll("[data-variant-card]").forEach(card=>{
      const found=variant(card.dataset.variantCard);if(!found||found.variant.status!=="published")return;
      card.querySelectorAll("textarea,input").forEach(field=>{field.disabled=true;});
      const saveButton=card.querySelector('[data-action="save-variant"]');if(saveButton)saveButton.remove();
    });
    const search=byId("account-search");
    if(search)search.addEventListener("input",function(){ui.accountSearch=this.value.toLocaleLowerCase();document.querySelectorAll(".account-card").forEach(card=>{card.hidden=!card.dataset.search.includes(ui.accountSearch);});});
  }

  function renderOverview(){
    const all=variants(),ready=all.filter(x=>x.variant.status==="ready"),review=all.filter(x=>x.variant.status==="review"),published=all.filter(x=>x.variant.status==="published");
    const due=all.filter(x=>x.variant.scheduledAt&&x.variant.scheduledAt<=todayKey(7)&&["review","ready","pending","failed"].includes(x.variant.status)).sort((a,b)=>a.variant.scheduledAt.localeCompare(b.variant.scheduledAt)).slice(0,5);
    return '<section class="hero"><div><span class="eyebrow">今天，从一条有证据的内容开始</span><h2>把 Packrivo 的专业判断<br>做成可追踪的公开内容。</h2><p>一份母稿，分别适配平台；事实、素材和发布结果都有记录。首个完整人工发布流程从 LinkedIn 公司主页开始。</p></div><div class="hero-side"><strong>'+esc(state.items.length)+'</strong><span>条真实内容母稿</span><br><button class="button button-primary" data-action="new-content">创建内容</button></div></section>'+
      '<section class="stat-grid"><div class="stat"><strong>'+state.items.length+'</strong><span>内容母稿</span></div><div class="stat"><strong>'+review.length+'</strong><span>待审核版本</span></div><div class="stat"><strong>'+ready.length+'</strong><span>可发布版本</span></div><div class="stat"><strong>'+published.length+'</strong><span>已回填公开链接</span></div></section>'+
      '<div class="section-head"><h2>接下来要处理</h2><p>数字仅来自本机记录。</p></div>'+
      (due.length?'<div class="queue-list">'+due.map(x=>queueRow(x)).join("")+'</div>':'<div class="empty"><strong>发布队列还是空的</strong><p>保存一条母稿，为 LinkedIn 创建平台版本，核对后再排期。</p><button class="button button-outline" data-action="new-content">建立第一条内容</button></div>')+
      '<div class="section-head"><h2>首次使用路线</h2></div><div class="panel panel-pad"><div class="row-meta"><span class="status-pill draft">1 · 登记账号</span><span class="status-pill review">2 · 建立母稿</span><span class="status-pill ready">3 · 审核版本</span><span class="status-pill pending">4 · 人工发布</span><span class="status-pill published">5 · 回填结果</span></div><p class="subtle" style="margin:12px 0 0">这个本地版本没有社媒授权。点击“打开平台”只是交接，不会替你公开发布。</p></div>';
  }

  function renderAccounts(){
    const filters=[["core","第一批"],["other","其他主流"],["community","社区与消息"],["editorial","行业投稿"],["regional","地区平台"]];
    const selected=CHANNELS.filter(x=>x.group===ui.accountFilter&&x.id!=="linkedin-company");
    const ready=Object.values(state.accounts).filter(x=>x.status==="profile_ready").length;
    return '<div class="view-title"><div><span class="eyebrow">连接之前，先登记</span><h1>社媒账号目录</h1><p class="lead">官方入口集中在这里。账号状态由你手工记录；“资料已完善”不等于已授权工作台发布。</p></div><div class="stat" style="min-width:146px"><strong>'+ready+'</strong><span>个主页资料已完善</span></div></div>'+
      '<div class="account-callout"><strong>当前是人工发布模式，未连接任何平台账号。</strong> 先按本人真实身份建立 LinkedIn 档案，再创建 Packrivo 公司主页。下面的状态完全由你手工标记，不代表系统已核验账号。</div>'+
      '<div class="section-head"><h2>第一步 · LinkedIn 公司主页</h2><p>注册后记录公开主页，再创建第一条内容。</p></div><div class="account-spotlight">'+accountCard(channel("linkedin-company"))+'<div class="account-spotlight-side"><span class="eyebrow">推荐先完成这一条</span><h3>从内容到公开帖子，走通一次完整流程</h3><p>① 注册或确认主页 → ② 手工记录状态 → ③ 创建内容 → ④ 审核后人工发布。</p><button class="button button-primary" data-action="new-content">创建第一条 LinkedIn 内容</button></div></div>'+
      '<div class="section-head"><h2>其他渠道入口</h2><p>按实际运营顺序逐步登记，无需一次配置全部。</p></div>'+
      '<div class="toolbar"><div class="tabs">'+filters.map(x=>'<button class="tab'+(x[0]===ui.accountFilter?' active':'')+'" data-action="account-filter" data-value="'+x[0]+'">'+x[1]+'</button>').join("")+'</div><input id="account-search" class="search-input" type="search" placeholder="搜索当前分类" value="'+esc(ui.accountSearch)+'" aria-label="搜索渠道"></div>'+
      '<div class="account-grid">'+selected.map(c=>accountCard(c)).join("")+'</div>'+
      '<div class="section-head"><h2>连接方式的含义</h2></div><div class="panel panel-pad"><div class="row-meta"><span class="status-pill draft">未登记</span><span class="status-pill review">已注册</span><span class="status-pill ready">资料已完善</span></div><p class="subtle" style="margin:12px 0 0">这些是你在本机填写的准备状态。平台 OAuth、API 资格和真实发帖权限尚未检测。编辑媒体与论坛始终按各自规则人工提交。</p></div>';
  }

  function accountCard(c){
    const rec=state.accounts[c.id]||{status:"unregistered",profile:""};
    const label=MODES[c.mode]||"人工交接";
    return '<article class="account-card'+(c.group==="core"?" priority":"")+'" data-search="'+esc((c.name+" "+c.hint).toLocaleLowerCase())+'"><div class="account-top">'+platformMark(c)+'<div class="account-name"><strong>'+esc(c.name)+'</strong><small>'+esc(GROUPS[c.group])+' · '+esc(label)+'</small></div></div><p>'+esc(c.hint)+'</p><div class="account-status"><select data-account-status="'+esc(c.id)+'" aria-label="'+esc(c.name)+'的账号状态">'+option("unregistered","未登记",rec.status)+option("registered","已注册",rec.status)+option("profile_ready","资料已完善",rec.status)+'</select></div><div class="account-actions">'+link(c.signup,"注册 / 官方入口")+'<button class="button button-outline" data-action="edit-profile" data-id="'+esc(c.id)+'">记录主页</button></div>'+(rec.profile?'<a class="account-profile" href="'+esc(safeUrl(rec.profile))+'" target="_blank" rel="noopener noreferrer">'+esc(rec.profile)+'</a>':'')+'</article>';
  }

  function renderStudio(){
    const content=item(ui.activeItemId),c=content||{title:"",goal:"lead",audience:"",topic:"",hook:"",body:"",cta:"",sources:"",mediaRef:"",review:{}};
    const assetOptions='<option value="">无关联素材</option>'+state.assets.map(a=>option(a.id,a.name,c.mediaRef)).join("");
    const selector='<option value="">选择渠道</option>'+CHANNELS.filter(ch=>ch.group!=="regional"&&ch.id!=="linkedin-personal").map(ch=>option(ch.id,ch.name,"")).join("");
    return '<div class="view-title"><div><span class="eyebrow">Content Studio</span><h1>'+(content?"编辑内容母稿":"创建第一条内容")+'</h1><p class="lead">先记录面向谁、解决什么问题，再制作各平台版本。AI 帮助起草时仍保持草稿状态。</p></div>'+(content?'<button class="button button-quiet" data-action="new-content">新建另一条</button>':'')+'</div>'+
      '<div class="two-col"><form id="content-form" class="panel panel-pad" autocomplete="off"><div class="form-grid"><label class="field wide">内容标题 <span>必填</span><input class="input" name="title" value="'+esc(c.title)+'" placeholder="例如：小型珠宝品牌如何准备包装询价资料" required></label><label class="field">目标<select name="goal">'+option("lead","B2B 询盘",c.goal)+option("geo","GEO / 品牌可见性",c.goal)+'</select></label><label class="field">目标买家<input class="input" name="audience" value="'+esc(c.audience)+'" placeholder="例如：小型珠宝品牌主理人"></label><label class="field wide">产品 / 话题<input class="input" name="topic" value="'+esc(c.topic)+'" placeholder="例如：flat-pack jewelry boxes"></label><label class="field wide">开头 / 问题<textarea name="hook" rows="2" placeholder="读者现在具体卡在哪一步？">'+esc(c.hook)+'</textarea></label><label class="field wide">母稿正文<textarea name="body" rows="8" placeholder="写出可核实的建议、条件与限制。">'+esc(c.body)+'</textarea></label><label class="field wide">行动提示<input class="input" name="cta" value="'+esc(c.cta)+'" placeholder="例如：整理尺寸、数量和材质后再询价"></label><label class="field wide">来源与核验记录<textarea name="sources" rows="3" placeholder="官方资料链接、本人观察或仍待确认的条件">'+esc(c.sources)+'</textarea></label><label class="field wide">关联素材<select name="mediaRef">'+assetOptions+'</select><small class="field-hint">先在素材库登记图片或视频引用；本地预览不上传媒体文件。</small></label></div><div class="form-actions"><button class="button button-primary" type="submit">保存母稿</button></div></form>'+
      '<aside class="panel panel-pad"><span class="eyebrow">人工核验</span><h2>完成后再标为可发布</h2><p class="muted" style="font-size:.77rem">这些勾选记录由运营负责，不由 AI 或平台自动证明。</p><div class="review-list">'+REVIEW_FIELDS.map(pair=>'<label class="review-item"><input type="checkbox" data-review-key="'+pair[0]+'" '+(c.review&&c.review[pair[0]]?"checked ":"")+(content?"":"disabled")+'> '+pair[1]+'</label>').join("")+'</div><p class="review-note">'+(content?"可随时修改，修改母稿后建议重新核对平台版本。":"先保存母稿，再填写审核项。")+'</p><div class="mini-divider"></div><div class="info-card"><h3>首条流程推荐</h3><p>LinkedIn 公司主页：母稿 → 审核 → 平台版 → 排期 → 复制并打开 → 回填公开 URL。</p><p style="margin-bottom:0">Reddit 则按具体社区问题写独立回复，不套用同一条广告文案。</p></div></aside></div>'+
      (content?'<div class="section-head"><h2>平台版本</h2><p>每个版本可以单独排期、审核与记录结果。</p></div><div class="toolbar"><div class="row-meta"><select id="new-variant-channel" aria-label="选择新增平台">'+selector+'</select><button class="button button-outline" data-action="add-variant">从母稿新建平台版</button></div><span class="subtle">保存的版本：'+(content.variants||[]).length+'</span></div>'+(content.variants&&content.variants.length?'<div class="variant-grid">'+content.variants.map(v=>variantCard(content,v)).join("")+'</div>':'<div class="empty compact"><strong>还没有平台版本</strong><p>先选择 LinkedIn 公司主页，建立第一条可发布的专业内容。</p></div>'):'');
  }

  function variantCard(content,v){
    const c=channel(v.channelId);
    return '<article class="variant-card'+(v.channelId==="linkedin-company"?" featured":"")+'" data-variant-card="'+esc(v.id)+'"><div class="variant-top"><div class="variant-channel">'+platformMark(c)+'<div><h3>'+esc(c.name)+'</h3><span class="subtle">'+esc(MODES[c.mode]||"人工交接")+'</span></div></div>'+pill(v.status)+'</div><label class="field">平台文案<textarea data-field="caption" rows="6">'+esc(v.caption)+'</textarea></label><div class="form-grid"><label class="field">标签 / 话题<input class="input" data-field="hashtags" value="'+esc(v.hashtags||"")+'"></label><label class="field">计划日期<input class="input" type="date" data-field="scheduledAt" value="'+esc(v.scheduledAt||"")+'"></label><label class="field wide">图片替代文字 / 说明<input class="input" data-field="altText" value="'+esc(v.altText||"")+'" placeholder="说明图片实际展示的内容"></label></div><div class="variant-actions"><button class="button button-quiet" data-action="save-variant" data-id="'+esc(v.id)+'">保存版本</button>'+(v.status==="draft"?'<button class="button button-outline" data-action="send-review" data-id="'+esc(v.id)+'">送审</button>':'')+(v.status==="review"||v.status==="failed"?'<button class="button button-outline" data-action="mark-ready" data-id="'+esc(v.id)+'">标为可发布</button>':'')+(v.status==="ready"||v.status==="pending"?'<button class="button button-outline" data-action="copy-caption" data-id="'+esc(v.id)+'">复制文案</button><button class="button button-outline" data-action="open-platform" data-id="'+esc(v.id)+'">打开平台</button><button class="button button-primary" data-action="record-publication" data-id="'+esc(v.id)+'">回填发布</button>':'')+(v.status==="published"?link(v.publishedUrl,"查看公开帖子","button button-outline"):'')+'</div></article>';
  }

  function renderQueue(){
    const all=variants(),filterOptions=[["actionable","待处理"],["all","全部"],["draft","草稿"],["review","待审核"],["ready","可发布"],["pending","待回填"],["published","已发布"],["failed","需处理"]];
    const priority={failed:0,review:1,ready:2,pending:3,draft:4,published:5};
    const filtered=all.filter(x=>ui.queueFilter==="all"||ui.queueFilter==="actionable"&&["failed","review","ready","pending"].includes(x.variant.status)||x.variant.status===ui.queueFilter).sort((a,b)=>ui.queueFilter==="actionable"?(priority[a.variant.status]-priority[b.variant.status]||(a.variant.scheduledAt||"9999").localeCompare(b.variant.scheduledAt||"9999")):(a.variant.scheduledAt||"9999").localeCompare(b.variant.scheduledAt||"9999"));
    const days=Array.from({length:7},(_,i)=>{const key=todayKey(i),events=all.filter(x=>x.variant.scheduledAt===key&&["ready","pending","published"].includes(x.variant.status));return '<div class="day'+(i===0?" today":"")+'"><strong>'+displayDate(key)+'</strong><small>周'+["日","一","二","三","四","五","六"][new Date(key+"T12:00:00").getDay()]+'</small>'+events.map(x=>'<button class="day-item '+esc(x.variant.status)+'" data-action="edit-content" data-id="'+esc(x.content.id)+'" title="'+esc(x.content.title)+'">'+esc(STATUS[x.variant.status])+' · '+esc(channel(x.variant.channelId).name)+'</button>').join("")+'</div>';}).join("");
    return '<div class="view-title"><div><span class="eyebrow">Publishing Queue</span><h1>发布日历与队列</h1><p class="lead">“已排期”只表示计划日期。只有公开链接回填后，才会进入“已发布”。</p></div></div><div class="calendar">'+days+'</div><div class="section-head"><h2>平台发布任务</h2><p>复制和打开平台均不会替你点击平台的发布按钮。</p></div><div class="toolbar"><div class="tabs">'+filterOptions.map(x=>'<button class="tab'+(x[0]===ui.queueFilter?" active":"")+'" data-action="queue-filter" data-value="'+x[0]+'">'+x[1]+'</button>').join("")+'</div><span class="subtle">当前 '+filtered.length+' 条</span></div>'+(filtered.length?'<div class="queue-list">'+filtered.map(x=>queueRow(x)).join("")+'</div>':'<div class="empty"><strong>该状态下没有内容</strong><p>在内容工作室创建平台版本并设置计划日期。</p><button class="button button-outline" data-action="new-content">创建内容</button></div>');
  }

  function queueRow(pair){
    const v=pair.variant,c=channel(v.channelId);
    return '<article class="queue-row"><div><div class="row-meta">'+platformMark(c)+pill(v.status)+'<span class="subtle">'+esc(displayDate(v.scheduledAt))+' · '+esc(MODES[c.mode]||"人工交接")+'</span></div><h3 style="margin-top:8px">'+esc(pair.content.title)+'</h3><p>'+esc(c.name)+' · '+esc(GOALS[pair.content.goal]||"")+(v.publishedUrl?" · "+esc(v.publishedUrl):"")+'</p></div><div class="row-actions"><button class="button button-quiet" data-action="edit-content" data-id="'+esc(pair.content.id)+'">编辑</button>'+(v.status==="ready"||v.status==="pending"?'<button class="button button-outline" data-action="copy-caption" data-id="'+esc(v.id)+'">复制</button><button class="button button-outline" data-action="open-platform" data-id="'+esc(v.id)+'">打开平台</button><button class="button button-primary" data-action="record-publication" data-id="'+esc(v.id)+'">回填发布</button>':'')+(v.status==="published"?link(v.publishedUrl,"查看帖子","button button-outline"):'')+'</div></article>';
  }

  function renderLibrary(){
    return '<div class="view-title"><div><span class="eyebrow">Content Library</span><h1>内容与素材库</h1><p class="lead">母稿与素材分别保存。媒体库只登记路径/链接、权属和概念状态；图片和视频文件本体仍在你的本机。</p></div><button class="button button-primary" data-action="new-content">新建内容</button></div><div class="section-head"><h2>内容母稿</h2><p>'+state.items.length+' 条</p></div>'+(state.items.length?'<div class="content-list">'+state.items.map(c=>'<article class="content-row"><div><h3>'+esc(c.title)+'</h3><p>'+esc(GOALS[c.goal]||"")+' · '+(c.variants||[]).length+' 个平台版本 · 更新于 '+displayDate(c.updatedAt)+'</p></div><div class="row-actions"><button class="button button-outline" data-action="edit-content" data-id="'+esc(c.id)+'">打开编辑</button><button class="button button-danger" data-action="archive-content" data-id="'+esc(c.id)+'">归档</button></div></article>').join("")+'</div>':'<div class="empty compact"><strong>还没有内容母稿</strong><p>建立一个真实买家问题，之后再做平台改写。</p></div>')+
      '<div class="section-head"><h2>素材引用</h2><p>本地预览不上传、复制或同步素材文件。</p></div><div class="two-col"><form id="asset-form" class="panel panel-pad"><div class="form-grid"><label class="field wide">素材名称<input class="input" name="name" placeholder="例如：折叠礼盒展开图" required></label><label class="field">类型<select name="kind">'+option("image","图片","image")+option("video","视频","")+option("website","官网文章/公开链接","")+option("document","文档","")+'</select></label><label class="field">素材状态<select name="rights">'+option("owned","本人制作/有授权","owned")+option("public-reference","仅公开参考","")+option("unknown","待核实权限","")+'</select></label><label class="field wide">本机路径或公开链接<input class="input" name="uri" placeholder="E:\\assets\\box.jpg 或 https://..."></label><label class="field wide">概念边界<textarea name="note" rows="2" placeholder="例如：AI-assisted concept / Not a physical sample"></textarea></label></div><div class="form-actions"><button class="button button-primary" type="submit">保存素材引用</button></div></form><div class="info-card"><h3>素材使用原则</h3><p>供应商样品、客户项目、库存与认证只能用已获授权且核实的资料。AI 概念图要明确标注为概念展示。</p><p>“仅公开参考”素材用于研究记录，不代表可直接复制到社媒帖子。</p></div></div>'+(state.assets.length?'<div class="section-head"><h2>已登记素材</h2></div><div class="asset-grid">'+state.assets.map(a=>'<article class="asset-card"><strong>'+esc(a.name)+'</strong><span>'+esc(a.kind)+' · '+esc(a.rights)+'</span><p>'+esc(a.uri||"未填位置")+'</p><span class="path-note">'+esc(a.note||"无附加说明")+'</span></article>').join("")+'</div>':'');
  }

  function renderResults(){
    const published=variants().filter(x=>x.variant.status==="published");
    const totals={views:0,clicks:0,inquiries:0};
    published.forEach(x=>{Object.keys(totals).forEach(k=>{totals[k]+=Number(x.variant.metrics&&x.variant.metrics[k]||0);});});
    return '<div class="view-title"><div><span class="eyebrow">Manual Results</span><h1>结果记录</h1><p class="lead">所有数字由你手工录入。品牌提及、明确来源引用与有效询盘分开记录。</p></div></div><div class="stat-grid"><div class="stat"><strong>'+published.length+'</strong><span>已发布帖子</span></div><div class="stat"><strong>'+totals.views+'</strong><span>手工记录浏览</span></div><div class="stat"><strong>'+totals.clicks+'</strong><span>手工记录点击</span></div><div class="stat"><strong>'+totals.inquiries+'</strong><span>有效询盘</span></div></div><div class="section-head"><h2>发布后数据</h2><p>没有数据时保持空白，不估算平台效果。</p></div>'+(published.length?'<div class="panel" style="overflow:auto"><table class="split-table"><thead><tr><th>内容与平台</th><th>浏览</th><th>点击</th><th>有效询盘</th><th>保存</th></tr></thead><tbody>'+published.map(x=>'<tr data-metric-row="'+esc(x.variant.id)+'"><td><strong>'+esc(x.content.title)+'</strong><br><span class="subtle">'+esc(channel(x.variant.channelId).name)+'</span></td><td><input class="metric-input" type="number" min="0" data-metric="views" value="'+Number(x.variant.metrics&&x.variant.metrics.views||0)+'"></td><td><input class="metric-input" type="number" min="0" data-metric="clicks" value="'+Number(x.variant.metrics&&x.variant.metrics.clicks||0)+'"></td><td><input class="metric-input" type="number" min="0" data-metric="inquiries" value="'+Number(x.variant.metrics&&x.variant.metrics.inquiries||0)+'"></td><td><button class="button button-outline" data-action="save-metrics" data-id="'+esc(x.variant.id)+'">保存</button></td></tr>').join("")+'</tbody></table></div>':'<div class="empty compact"><strong>还没有发布后数据</strong><p>回填一条真实公开帖子 URL 后，这里才能录入表现。</p></div>')+
      '<div class="section-head"><h2>GEO 实验记录</h2><p>只记录你实际观察到的答案，不把发帖本身当作 AI 引用。</p></div><div class="two-col"><form id="experiment-form" class="panel panel-pad"><div class="form-grid"><label class="field wide">测试问题<input class="input" name="question" placeholder="例如：small jewelry brand custom packaging MOQ" required></label><label class="field">观察渠道<input class="input" name="engine" placeholder="ChatGPT Search / Google AI Mode"></label><label class="field">结果<select name="outcome">'+option("none","未出现","none")+option("mention","仅品牌提及","")+option("citation","明确来源引用","")+'</select></label><label class="field wide">答案或来源链接<input class="input" name="url" type="url" placeholder="https://...（可选）"></label></div><div class="form-actions"><button class="button button-primary" type="submit">记录一次观察</button></div></form><div class="info-card"><h3>两个不同信号</h3><p><strong>品牌提及</strong>：答案正文出现 Packrivo 名称。</p><p><strong>来源引用</strong>：答案明确链接到 Packrivo 页面或帖子。</p><p style="margin-bottom:0">单次结果只是一条观察，不能当成稳定排名或转化。</p></div></div>'+(state.experiments.length?'<div class="section-head"><h2>最近观察</h2></div><div class="content-list">'+state.experiments.slice(0,8).map(e=>'<article class="content-row"><div><h3>'+esc(e.question)+'</h3><p>'+esc(e.engine||"未注明渠道")+' · '+esc(e.outcome==="citation"?"明确来源引用":e.outcome==="mention"?"仅品牌提及":"未出现")+' · '+displayDate(e.date)+'</p></div>'+link(e.url,"查看证据","button button-outline")+'</article>').join("")+'</div>':'');
  }

  function formValues(form){return Object.fromEntries(new FormData(form).entries());}
  function openView(view){ui.view=view;window.location.hash=view;render();window.scrollTo({top:0,behavior:"smooth"});}
  function createContent(){ui.activeItemId=null;openView("studio");}
  function saveVariantFromCard(id){const found=variant(id);if(!found||found.variant.status==="published")return null;const card=document.querySelector('[data-variant-card="'+id+'"]');if(!card)return found;const values={};for(const key of ["caption","hashtags","altText","scheduledAt"]){const field=card.querySelector('[data-field="'+key+'"]');values[key]=field?field.value.trim():String(found.variant[key]||"");}if(!validDate(values.scheduledAt)){toast("计划日期无效");return null;}const contentChanged=["caption","hashtags","altText"].some(key=>values[key]!==String(found.variant[key]||"")),needsRecheck=["review","ready","pending"].includes(found.variant.status);Object.assign(found.variant,values);if(contentChanged&&needsRecheck){invalidateReview(found.content);log("版本修改需复核",found.content.title);}found.content.updatedAt=new Date().toISOString();save();return found;}
  async function copyText(value){try{await navigator.clipboard.writeText(value);return true;}catch{const box=document.createElement("textarea");box.value=value;box.style.position="fixed";box.style.opacity="0";document.body.appendChild(box);box.select();const ok=document.execCommand("copy");box.remove();return ok;}}
  function openPublication(id){const found=variant(id);if(!found||!["ready","pending"].includes(found.variant.status)){toast("请先完成审核并标为可发布");return;}if(hasUnsavedVariant(id)){toast("先保存修改并重新审核，再回填发布");return;}const dialog=byId("publication-dialog");const form=byId("publication-form");form.reset();form.elements.variantId.value=id;const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());form.elements.publishedAt.value=d.toISOString().slice(0,16);dialog.showModal();}

  byId("view").addEventListener("click",async function(event){
    const target=event.target.closest("[data-action]");if(!target)return;
    const action=target.dataset.action,id=target.dataset.id;
    if(action==="new-content"){createContent();return;}
    if(action==="account-filter"){ui.accountFilter=target.dataset.value;ui.accountSearch="";render();return;}
    if(action==="queue-filter"){ui.queueFilter=target.dataset.value;render();return;}
    if(action==="edit-profile"){const rec=state.accounts[id]||{status:"unregistered",profile:""};const value=window.prompt("填写该账号的公开主页链接（不输入密码）：",rec.profile||"");if(value===null)return;if(value.trim()&&!safeUrl(value.trim())){toast("请输入 http 或 https 开头的主页链接");return;}state.accounts[id]={status:rec.status,profile:value.trim()};log("账号记录",channel(id).name);save("主页链接已记录");render();return;}
    if(action==="new-content-variant"||action==="add-variant"){const content=item(ui.activeItemId),select=byId("new-variant-channel"),channelId=select&&select.value;if(!content){toast("先保存内容母稿");return;}if(!channelId){toast("先选择渠道");return;}if((content.variants||[]).some(v=>v.channelId===channelId)){toast("该渠道已有一个版本，请直接编辑");return;}const caption=[content.hook,content.body,content.cta].filter(Boolean).join("\n\n");content.variants.push({id:uid(),channelId:channelId,caption:caption,hashtags:"",altText:"",scheduledAt:"",status:"draft",publishedUrl:"",publishedAt:"",metrics:{views:0,clicks:0,inquiries:0}});content.updatedAt=new Date().toISOString();log("新增平台版",channel(channelId).name);save("平台版本已建立");render();return;}
    if(action==="edit-content"){ui.activeItemId=id;openView("studio");return;}
    if(action==="save-variant"){const found=saveVariantFromCard(id);if(!found)return;toast(found.variant.status==="review"?"版本已保存，请重新审核":"平台版本已保存");render();return;}
    if(action==="send-review"){const found=saveVariantFromCard(id);if(!found)return;if(!found.variant.caption){toast("先填写平台文案");return;}found.variant.status="review";log("送审",found.content.title);save("已进入待审核");render();return;}
    if(action==="mark-ready"){const found=saveVariantFromCard(id);if(!found)return;if(!reviewComplete(found.content)){toast("请先完成右侧四项人工核验");return;}if(!found.variant.caption){toast("平台文案不能为空");return;}found.variant.status="ready";log("可发布",found.content.title+" / "+channel(found.variant.channelId).name);save("已标为可发布");render();return;}
    if(action==="copy-pack"||action==="copy-alt"){const found=variant(id);if(!found||!["ready","pending"].includes(found.variant.status))return;if(hasUnsavedVariant(id)){toast("先保存修改并重新审核，再复制发布内容");return;}const value=action==="copy-pack"?publishPack(found.variant):found.variant.altText.trim();if(!value){toast("没有可复制的内容");return;}const copied=await copyText(value);toast(copied?(action==="copy-pack"?"发布文案与标签已复制":"图片说明已复制"):"复制失败，请手动选中文案");return;}
    if(action==="open-platform"){const found=variant(id);if(!found)return;if(!["ready","pending"].includes(found.variant.status)){toast("此版本尚未进入发布队列");return;}if(hasUnsavedVariant(id)){toast("先保存修改并重新审核，再打开平台");return;}const url=safeUrl(channel(found.variant.channelId).publish);if(!url){toast("该平台入口无效，请从账号目录核对");return;}const opened=window.open("about:blank","_blank");if(!opened){toast("浏览器阻止了新窗口，状态未改变");return;}opened.opener=null;opened.location.replace(url);found.variant.status="pending";log("人工发布交接",channel(found.variant.channelId).name);save("平台已打开；只有真实发帖后才能回填链接");render();return;}
    if(action==="record-publication"){openPublication(id);return;}
    if(action==="archive-content"){const found=item(id);if(!found)return;const hasPublished=(found.variants||[]).some(v=>v.status==="published");if(hasPublished){toast("含已发布记录的内容不能从本地预览中归档");return;}if(!window.confirm("归档这条未发布母稿及其平台版本？导出的旧备份仍可恢复。"))return;state.items=state.items.filter(x=>x.id!==id);log("归档母稿",found.title);save("未发布母稿已归档");render();return;}
    if(action==="save-metrics"){const found=variant(id),row=document.querySelector('[data-metric-row="'+id+'"]');if(!found||!row)return;const values={};for(const key of ["views","clicks","inquiries"]){const input=row.querySelector('[data-metric="'+key+'"]');values[key]=Math.max(0,Number(input&&input.value||0));}found.variant.metrics=values;log("记录表现",found.content.title);save("结果已保存");render();return;}
  });

  byId("view").addEventListener("change",function(event){
    const key=event.target.dataset.reviewKey,accountId=event.target.dataset.accountStatus;
    if(key){const content=item(ui.activeItemId);if(!content)return;content.review=content.review||{};content.review[key]=event.target.checked;if(!event.target.checked)for(const v of content.variants||[])if(["ready","pending"].includes(v.status))v.status="review";content.updatedAt=new Date().toISOString();save();render();return;}
    if(accountId){const rec=state.accounts[accountId]||{status:"unregistered",profile:""};state.accounts[accountId]={status:event.target.value,profile:rec.profile};log("账号状态",channel(accountId).name+" / "+event.target.value);save("账号准备状态已保存");return;}
  });

  byId("view").addEventListener("submit",function(event){
    event.preventDefault();
    if(event.target.id==="content-form"){const data=formValues(event.target);if(!String(data.title||"").trim()){toast("请先填写标题");return;}let content=item(ui.activeItemId);const keys=["title","goal","audience","topic","hook","body","cta","sources","mediaRef"];if(!content){content={id:uid(),createdAt:new Date().toISOString(),variants:[],review:{facts:false,rights:false,disclosure:false,cta:false}};state.items.unshift(content);ui.activeItemId=content.id;}else if(keys.some(key=>String(content[key]||"")!==String(data[key]||"").trim())){invalidateReview(content);log("母稿修改需复核",content.title);}for(const key of keys)content[key]=String(data[key]||"").trim();content.updatedAt=new Date().toISOString();log("保存母稿",content.title);save("内容母稿已保存");render();return;}
    if(event.target.id==="asset-form"){const data=formValues(event.target);if(!String(data.name||"").trim()){toast("请填写素材名称");return;}state.assets.unshift({id:uid(),name:String(data.name).trim(),kind:String(data.kind||"image"),rights:String(data.rights||"unknown"),uri:String(data.uri||"").trim(),note:String(data.note||"").trim()});log("登记素材",String(data.name).trim());save("素材引用已保存");render();return;}
    if(event.target.id==="experiment-form"){const data=formValues(event.target);if(!String(data.question||"").trim()){toast("请填写测试问题");return;}if(data.url&&!safeUrl(data.url)){toast("证据链接须以 http 或 https 开头");return;}state.experiments.unshift({id:uid(),question:String(data.question).trim(),engine:String(data.engine||"").trim(),outcome:String(data.outcome||"none"),url:String(data.url||"").trim(),date:new Date().toISOString()});log("GEO 观察",String(data.question).trim());save("观察已记录");render();return;}
  });

  document.querySelectorAll(".nav-link").forEach(button=>button.addEventListener("click",()=>openView(button.dataset.view)));
  byId("new-content").addEventListener("click",createContent);
  document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>byId("publication-dialog").close()));
  byId("publication-form").addEventListener("submit",function(event){event.preventDefault();const data=formValues(this),found=variant(data.variantId);if(!found||!["ready","pending"].includes(found.variant.status)){toast("此版本未完成审核");return;}const url=publicationUrl(found.variant.channelId,data.publishedUrl),at=String(data.publishedAt||"");if(!url){toast("链接必须是对应平台的公开帖子地址；系统不会验证帖子是否存在");return;}if(!at||!validDateTime(at)){toast("请填写有效发布时间");return;}found.variant.status="published";found.variant.publishedUrl=url;found.variant.publishedAt=at;found.variant.publishNote=String(data.publishNote||"").trim();found.content.updatedAt=new Date().toISOString();log("人工回填发布",found.content.title+" / "+channel(found.variant.channelId).name);save("人工发布记录已保存，帖子存在性仍需你核对");byId("publication-dialog").close();render();});
  byId("export-data").addEventListener("click",function(){const blob=new Blob([loadIssueRaw||JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="packrivo-social-desk-"+(loadIssueRaw?"recovery-":"backup-")+todayKey()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast(loadIssueRaw?"旧数据恢复备份已下载":"本机备份已下载");});
  byId("import-data").addEventListener("change",function(){const file=this.files&&this.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(){try{const next=normalize(JSON.parse(String(reader.result)));if(!window.confirm("导入将覆盖当前浏览器内的工作台记录。是否继续？"))return;state=next;loadIssueRaw="";loadIssueMessage="";ui.activeItemId=null;log("导入备份",file.name);save("备份已导入");render();}catch(error){toast("备份无法读取："+error.message);}};reader.readAsText(file,"utf-8");this.value="";});
  window.addEventListener("hashchange",function(){const target=location.hash.slice(1);if(LABELS[target]&&target!==ui.view){ui.view=target;render();}});
  if(LABELS[location.hash.slice(1)])ui.view=location.hash.slice(1);
  if(!storageReady){const a=byId("storage-alert");a.hidden=false;a.textContent=loadIssueRaw?"旧数据格式需要检查："+loadIssueMessage+"。原始数据仍保留在本机，请先点击“导出备份”保存恢复文件。":"此浏览器未允许本机保存。请先导出备份，避免刷新后丢失内容。";}
  render();
})();
