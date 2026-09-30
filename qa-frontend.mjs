import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const folder=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(join(folder,'app.js'),'utf8');
const instrumented=source.replace(/\n  render\(\);\s*\n\}\)\(\);\s*$/, `
  globalThis.__audit={normalize,esc,ui,ai,service,approvals,briefSignature,approvalSignature,freshlyReviewed,
    stageBlockReason,publishPack,reviewComplete,invalidateReview,saveVariantFromCard,hasUnsavedContent,
    serviceAvailable,connectService,generateDraft,cancelGeneration,acceptGeneratedDraft,openStagePreview,confirmStage,
    renderAiPanel,renderService,renderJobsPanel,openView,save,log,setState(value){state=value;},getState(){return state;}};
})();`);
assert.notEqual(instrumented,source,'test instrumentation must match the app entrypoint');

function harness({protocol='http:',fetcher}={}){
  const listeners=new Map(),nodes=new Map(),cards=new Map(),saved=[];
  const element=id=>({id,innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,open:false,elements:null,
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},
    addEventListener(type,fn){listeners.set(id+':'+type,fn);},
    showModal(){this.open=true;},close(){this.open=false;}});
  for(const id of ['view','new-content','publication-dialog','publication-form','stage-dialog','stage-form','confirm-stage','stage-title','stage-text','stage-target','stage-error','export-data','import-data','storage-alert','toast','topbar-title'])nodes.set(id,element(id));
  let count=0;
  const context={URL,AbortController,FormData:class {constructor(form){this.values=form._values||{};}entries(){return Object.entries(this.values);}},
    localStorage:{getItem(){return null;},setItem(key,value){saved.push({key,value});}},
    document:{getElementById(id){return nodes.get(id)||null;},querySelectorAll(){return [];},querySelector(selector){const id=selector.match(/data-variant-card="([^"]+)"/)?.[1];return cards.get(id)||null;}},
    window:{addEventListener(){},crypto:{randomUUID(){return 'generated-'+ ++count;}},location:{hash:''},scrollTo(){}},
    location:{hash:'',protocol},navigator:{},crypto:{randomUUID(){return 'generated-'+ ++count;}},
    setTimeout(){return 1;},clearTimeout(){},
  };
  if(fetcher)context.fetch=fetcher;
  vm.runInNewContext(instrumented,context,{filename:'app.js'});
  return {api:context.__audit,nodes,cards,listeners,saved,element,context};
}
function fixture(){
  const content={id:'content-1',title:'Packaging brief',goal:'lead',audience:'Jewelry brands',topic:'Boxes',hook:'A real question',body:'Verified advice',cta:'Prepare dimensions',sources:'https://example.com/source',mediaRef:'',createdAt:'2026-09-30T01:00:00.000Z',updatedAt:'2026-09-30T01:00:00.000Z',review:{facts:true,rights:true,disclosure:true,cta:true},variants:[{id:'variant-1',channelId:'linkedin-company',caption:'Saved text',hashtags:'packaging #jewelry',altText:'',scheduledAt:'',status:'ready',publishedUrl:'',publishedAt:'',metrics:{views:0,clicks:0,inquiries:0}}]};
  return {schemaVersion:1,items:[content],assets:[],accounts:{},experiments:[],logs:[]};
}
function mount(h,state=fixture()){
  h.api.setState(state);h.api.ui.view='studio';h.api.ui.activeItemId=state.items[0].id;
  return {content:state.items[0],variant:state.items[0].variants[0],state};
}
function connect(h){Object.assign(h.api.service,{status:'connected',csrfToken:'test-csrf',capabilities:{generation:{configured:true,provider:'openai',model:'test-model',channels:['linkedin-company','instagram','facebook','x']},publishing:{'linkedin-company':{supported:true,format:'text',liveEnabled:false,status:'blocked',target:null,reason:'Live publishing is disabled'}},livePublishEnabled:false},jobs:[]});}
function grant(h,c,v){h.api.approvals.set(v.id,h.api.approvalSignature(c,v));}
function response(data){return {ok:true,json:async()=>data};}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function draft(caption='AI draft'){return {draft:{channelId:'linkedin-company',caption,provider:'openai',model:'test-model',generatedAt:'2026-09-30T02:00:00.000Z'},warnings:[]};}
function cardFor(v,overrides={}){const values={...v,...overrides};return {querySelector(selector){const key=selector.match(/data-field="([^"]+)"/)?.[1];return key?{value:values[key]||''}:null;}};}
function submit(h,id,values){const form={id,_values:values};return h.listeners.get('view:submit')({target:form,preventDefault(){}});}
function action(h,name,id){return h.listeners.get('view:click')({target:{closest(){return {dataset:{action:name,id}};}}});}

// No implicit service call, no fetch requirement, no network attempts from file://.
{
  let calls=0;const h=harness({protocol:'file:',fetcher:async()=>{calls++;}});
  assert.equal(h.api.serviceAvailable(),false);await h.api.connectService();assert.equal(calls,0);
  vm.runInNewContext(source,h.context,{filename:'app.js'});assert.match(h.nodes.get('view').innerHTML,/社媒账号目录/);assert.equal(calls,0,'normal file-mode startup must also make zero requests');
  assert.match(h.api.renderAiPanel(null),/node server\.mjs/);
  assert.equal(harness().api.serviceAvailable(),false,'VM / offline mode works without global fetch');
}
// Escaping covers untrusted generated text, warnings, target names, and job reasons.
{
  const h=harness();const {content}=mount(h);const malicious='</textarea><script>alert("bad")</script>';
  h.api.ai.preview={contentId:content.id,caption:malicious,channelId:'linkedin-company',provider:'openai',model:malicious,warnings:[malicious]};
  assert.ok(!h.api.renderAiPanel(content).includes('<script>'));
  assert.match(h.api.renderAiPanel(content),/&lt;script&gt;/);
  h.api.service.jobs=[{id:malicious,text:malicious,reason:malicious,target:malicious,status:malicious}];
  assert.ok(!h.api.renderJobsPanel().includes('<script>'));
  assert.equal(h.api.esc(`"'&<>`),'&quot;&#39;&amp;&lt;&gt;');
}
// Fresh, exact per-variant approval is mandatory, including after imports.
{
  const h=harness();const {content,variant,state}=mount(h);
  assert.match(h.api.stageBlockReason(content,variant),/四项人工核验/);
  grant(h,content,variant);assert.equal(h.api.stageBlockReason(content,variant),'');
  variant.caption+=' changed';assert.equal(h.api.freshlyReviewed(content,variant),false);
  variant.caption='Saved text';content.body+=' changed';assert.equal(h.api.freshlyReviewed(content,variant),false);
  const imported=h.api.normalize({...state,approvalSnapshot:'forged',items:[{...content,review:{facts:false,rights:true,disclosure:true,cta:true},variants:[{...variant,approvalSnapshot:'forged',provenance:{provider:'openai',model:'test-model',generatedAt:'2026-09-30T02:00:00.000Z',secret:'must-not-survive'}}]}]});
  assert.equal(imported.items[0].variants[0].status,'ready','preserve historical status');
  assert.equal(imported.items[0].variants[0].approvalSnapshot,undefined);
  assert.equal(imported.items[0].variants[0].provenance.secret,undefined);
  assert.notEqual(h.api.stageBlockReason(imported.items[0],imported.items[0].variants[0]),'');
  const fresh=harness();fresh.api.setState(imported);assert.equal(fresh.api.freshlyReviewed(imported.items[0],imported.items[0].variants[0]),false);
  assert.throws(()=>h.api.normalize({...state,items:[{...content,id:'bad"id'}]}),/无效或重复/);
  assert.throws(()=>h.api.normalize({...state,items:[{...content,variants:[{...variant,id:content.id}]}]}),/无效或重复/);
  assert.throws(()=>h.api.normalize({...state,items:[content,{...content}]}),/无效或重复/);
}
// Block wrong platform, published copies, linked media, alt text, and unsaved parent/variant fields.
{
  const h=harness();const {content,variant}=mount(h);grant(h,content,variant);
  assert.match(h.api.stageBlockReason(content,{...variant,channelId:'instagram'}),/LinkedIn/);
  assert.match(h.api.stageBlockReason(content,{...variant,status:'published'}),/已发布/);
  assert.match(h.api.stageBlockReason({...content,mediaRef:'asset-1'},variant),/纯文字/);
  assert.match(h.api.stageBlockReason(content,{...variant,altText:'An image'}),/纯文字/);
  h.nodes.set('content-form',{elements:{body:{value:'Unsaved mother text'}}});
  assert.match(h.api.stageBlockReason(content,variant),/保存所有/);
  h.nodes.delete('content-form');h.cards.set(variant.id,cardFor(variant,{caption:'Unsaved variant'}));
  assert.match(h.api.stageBlockReason(content,variant),/保存所有/);
}
// Draft edits and newly added variants invalidate already checked mother review.
{
  const h=harness();const {content,variant}=mount(h);variant.status='draft';grant(h,content,variant);
  h.cards.set(variant.id,cardFor(variant,{caption:'Edited draft'}));h.api.saveVariantFromCard(variant.id);
  assert.equal(h.api.reviewComplete(content),false);assert.equal(h.api.approvals.has(variant.id),false);
  content.review={facts:true,rights:true,disclosure:true,cta:true};variant.status='ready';grant(h,content,variant);h.cards.clear();
  h.nodes.set('new-variant-channel',{value:'instagram'});await action(h,'add-variant');
  assert.equal(content.variants.length,2);assert.equal(h.api.reviewComplete(content),false);assert.equal(variant.status,'review');
}
// Checking review must not discard edits or falsely approve unsaved text.
{
  const h=harness();const {content}=mount(h);h.nodes.set('content-form',{elements:{body:{value:'Keep this unsaved'}}});
  const checkbox={dataset:{reviewKey:'facts'},checked:false};
  h.listeners.get('view:change')({target:checkbox});
  assert.equal(h.nodes.get('content-form').elements.body.value,'Keep this unsaved');
  assert.equal(content.review.facts,true);assert.equal(checkbox.checked,true);
  assert.equal(h.nodes.get('view').innerHTML,'','no full render on review change');
}
// Only clicked generation sends brief text; returned suggestions stay unsaved until acceptance.
{
  const calls=[];const h=harness({fetcher:async(path,options)=>{calls.push({path,options});return response(draft());}});
  const {content,variant,state}=mount(h);connect(h);grant(h,content,variant);
  await h.api.generateDraft();assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/generate');
  const request=JSON.parse(calls[0].options.body);assert.equal(request.brief.sources,content.sources);assert.equal(request.brief.mediaRef,undefined);
  assert.equal(calls[0].options.headers['X-Packrivo-CSRF'],'test-csrf');assert.equal(calls[0].options.credentials,'same-origin');
  assert.equal(content.variants.length,1);assert.equal(h.saved.length,0);assert.equal(h.api.ai.preview.caption,'AI draft');
  h.api.acceptGeneratedDraft();assert.equal(content.variants.length,2);assert.equal(content.variants[1].status,'draft');
  assert.equal(content.variants[1].provenance.provider,'openai');assert.equal(h.api.reviewComplete(content),false);assert.equal(h.api.approvals.size,0);
  assert.ok(!JSON.stringify(state).includes('test-csrf'));assert.ok(!h.saved[0].value.includes('test-csrf'));
}
// Disabled / failed providers never synthesize a template draft.
{
  let calls=0;const h=harness({fetcher:async()=>{calls++;throw new Error('network fail');}});const {content}=mount(h);connect(h);
  h.api.service.capabilities.generation.configured=false;await h.api.generateDraft();assert.equal(calls,0);assert.equal(h.api.ai.preview,null);
  h.api.service.capabilities.generation.configured=true;await h.api.generateDraft();assert.equal(calls,1);assert.equal(h.api.ai.preview,null);assert.equal(content.variants.length,1);assert.match(h.api.ai.error,/无法连接/);
}
// Late generation after navigation, cancellation, or changed mother content is ignored.
for(const change of ['navigate','cancel','edit']){
  const pending=deferred();const h=harness({fetcher:()=>pending.promise});const {content}=mount(h);connect(h);
  const work=h.api.generateDraft();assert.equal(h.api.ai.busy,true);
  if(change==='navigate')h.api.openView('accounts');
  if(change==='cancel')h.api.cancelGeneration();
  if(change==='edit')content.body='Newly saved different brief';
  pending.resolve(response(draft('Late result')));await work;
  assert.equal(h.api.ai.preview,null,change+' discards stale generation');assert.equal(content.variants.length,1);
}
// A second generation wins even when an aborted request still resolves later.
{
  const first=deferred(),second=deferred();let calls=0;const h=harness({fetcher:()=>++calls===1?first.promise:second.promise});mount(h);connect(h);
  const a=h.api.generateDraft();h.api.cancelGeneration();const b=h.api.generateDraft();
  second.resolve(response(draft('Newest')));await b;first.resolve(response(draft('Older')));await a;
  assert.equal(h.api.ai.preview.caption,'Newest');
}
// Previews show exact saved payload; staging deduplicates without publishing or altering status.
{
  const calls=[];const h=harness({fetcher:async(path,options)=>{calls.push({path,options});return response({job:{id:'job-1',status:'blocked',text:'Saved text\n\n#packaging #jewelry',target:null,reason:'Live blocked'},duplicate:calls.length>1});}});
  const {content,variant}=mount(h);connect(h);grant(h,content,variant);
  h.api.openStagePreview(variant.id);assert.equal(h.nodes.get('stage-dialog').open,true);
  assert.equal(h.nodes.get('stage-text').textContent,'Saved text\n\n#packaging #jewelry');
  await h.api.confirmStage();assert.equal(calls[0].path,'/api/jobs');assert.equal(JSON.parse(calls[0].options.body).reviewed,true);
  assert.equal(variant.status,'ready');assert.equal(variant.publishedUrl,'');assert.equal(h.api.service.jobs.length,1);
  h.api.openStagePreview(variant.id);await h.api.confirmStage();assert.equal(h.api.service.jobs.length,1);assert.match(h.nodes.get('toast').textContent,/已存在/);
  assert.ok(!calls.some(call=>call.path.includes('/publish')));
}
// Changes between preview and final confirmation cannot send the old payload.
{
  let calls=0;const h=harness({fetcher:async()=>{calls++;return response({});}});const {content,variant}=mount(h);connect(h);grant(h,content,variant);
  h.api.openStagePreview(variant.id);variant.caption='Changed after preview';await h.api.confirmStage();assert.equal(calls,0);assert.match(h.nodes.get('stage-error').textContent,/核验|变化/);
}
// Oversized LinkedIn text is stopped before the preview or network call.
{
  const h=harness();const {content,variant}=mount(h);variant.caption='x'.repeat(3001);grant(h,content,variant);
  assert.match(h.api.stageBlockReason(content,variant),/3,000/);
}
// Invalid local records never overwrite the last valid disk backup or replace live object identities.
{
  const h=harness();const {content,variant}=mount(h);assert.equal(h.api.save(),true);assert.equal(h.saved.length,1);
  content.body='x'.repeat(30001);assert.equal(h.api.save(),false);assert.equal(h.saved.length,1);
  assert.equal(h.api.getState().items[0],content);assert.equal(h.api.getState().items[0].variants[0],variant);
  assert.match(h.nodes.get('storage-alert').textContent,/原本的浏览器记录未覆盖/);
  content.body='Corrected';assert.equal(h.api.save(),true);assert.equal(h.saved.length,2);assert.equal(h.nodes.get('storage-alert').hidden,true);
}
// Metrics reject non-finite, negative, and over-limit values before assignment.
for(const value of ['Infinity','NaN','-1','1000000001']){
  const h=harness();const {variant}=mount(h);const original={...variant.metrics};
  h.context.document.querySelector=()=>({querySelector(){return {value};}});
  await action(h,'save-metrics',variant.id);assert.deepEqual(variant.metrics,original);assert.equal(h.saved.length,0);
}
// AI form limits match the service, without limiting longer offline mother documents.
{
  let calls=0;const h=harness({fetcher:async()=>{calls++;return response(draft());}});const {content}=mount(h);connect(h);
  h.api.ai.instructions='x'.repeat(2001);await h.api.generateDraft();assert.equal(calls,0);
  h.api.ai.instructions='';content.body='x'.repeat(12001);await h.api.generateDraft();assert.equal(calls,0);
  assert.match(h.api.renderAiPanel(content),/maxlength="2000"/);
  assert.match(h.api.renderService(),/尚未验证/);
}
// Oversized assets never enter state, clear the form, or poison later valid saves.
for(const [field,value] of [['name','x'.repeat(501)],['uri','x'.repeat(2001)],['note','x'.repeat(3001)]]){
  const h=harness();const {state}=mount(h);h.nodes.get('view').innerHTML='Keep form';
  submit(h,'asset-form',{name:'A sample',kind:'image',rights:'owned',uri:'',note:'',[field]:value});
  assert.equal(state.assets.length,0);assert.equal(state.logs.length,0);assert.equal(h.saved.length,0);
  assert.equal(h.nodes.get('view').innerHTML,'Keep form');assert.equal(h.api.save(),true);
}
// Long schema-valid titles remain valid because internal logs are bounded independently.
{
  const h=harness();const {content,state}=mount(h);
  submit(h,'content-form',{...content,title:'T'.repeat(4000)});
  assert.equal(content.title.length,4000);assert.equal(h.saved.length,1);
  assert.ok(state.logs.every(entry=>entry.detail.length<=3000));assert.doesNotThrow(()=>h.api.normalize(state));
  h.api.log('a'.repeat(600),'d'.repeat(4000));assert.equal(state.logs[0].action.length,500);assert.equal(state.logs[0].detail.length,3000);
  assert.equal(h.api.save(),true);
}
// Mother, variant, and GEO form length violations are rejected before mutation.
{
  const h=harness();const {content,variant,state}=mount(h);grant(h,content,variant);const before=JSON.stringify(state);
  submit(h,'content-form',{...content,title:'x'.repeat(12001)});assert.equal(JSON.stringify(state),before);
  submit(h,'content-form',{...content,body:'x'.repeat(30001)});assert.equal(JSON.stringify(state),before);
  for(const [key,max] of [['caption',30000],['hashtags',3000],['altText',3000]]){
    h.cards.set(variant.id,cardFor(variant,{[key]:'x'.repeat(max+1)}));assert.equal(h.api.saveVariantFromCard(variant.id),null);assert.equal(JSON.stringify(state),before);
  }
  h.cards.clear();
  for(const [key,max] of [['question',3000],['engine',500],['url',2000]]){
    submit(h,'experiment-form',{question:'A question',engine:'A channel',outcome:'none',url:'',[key]:'x'.repeat(max+1)});assert.equal(JSON.stringify(state),before);
  }
  assert.equal(h.saved.length,0);assert.equal(h.api.freshlyReviewed(content,variant),true);
}
// A long combined mother draft does not create an invalid platform version or clear review.
{
  const h=harness();const {content,variant}=mount(h);content.body='x'.repeat(30000);grant(h,content,variant);
  h.nodes.set('new-variant-channel',{value:'instagram'});await action(h,'add-variant');
  assert.equal(content.variants.length,1);assert.equal(h.api.reviewComplete(content),true);assert.equal(h.saved.length,0);
}
// Collection limits are checked before appending any entry.
for(const kind of ['items','assets','experiments','variants']){
  const h=harness();const {content,state}=mount(h);
  if(kind==='variants'){
    content.variants=Array.from({length:100},(_,i)=>({...content.variants[0],id:'v-'+i}));h.nodes.set('new-variant-channel',{value:'instagram'});await action(h,'add-variant');assert.equal(content.variants.length,100);
  }else{
    state[kind]=Array.from({length:5000},()=>({}));
    if(kind==='items'){h.api.ui.activeItemId=null;submit(h,'content-form',{...content,title:'New'});}
    if(kind==='assets')submit(h,'asset-form',{name:'New',kind:'image',rights:'owned'});
    if(kind==='experiments')submit(h,'experiment-form',{question:'New',outcome:'none'});
    assert.equal(state[kind].length,5000);
  }
  assert.equal(h.saved.length,0);assert.equal(state.logs.length,0);
}
// Publication and profile inputs cannot create immutable poisoned records.
for(const field of ['publishNote','publishedUrl']){
  const h=harness();const {content,variant}=mount(h);grant(h,content,variant);
  const values={variantId:variant.id,publishedAt:'2026-09-30T12:00',publishedUrl:'https://www.linkedin.com/posts/example',publishNote:''};
  values[field]=field==='publishNote'?'x'.repeat(3001):'https://www.linkedin.com/posts/'+'x'.repeat(2000);
  const form={_values:values};h.listeners.get('publication-form:submit').call(form,{preventDefault(){}});
  assert.equal(variant.status,'ready');assert.equal(variant.publishedUrl,'');assert.equal(h.saved.length,0);
}
{
  const h=harness();const {state}=mount(h);h.context.window.prompt=()=> 'https://example.com/'+'x'.repeat(2000);
  await action(h,'edit-profile','linkedin-company');assert.equal(state.accounts['linkedin-company'],undefined);assert.equal(h.saved.length,0);
}
console.log('Packrivo frontend checks passed (offline, review snapshots, imports, escaping, generation races, preview and staging)');
