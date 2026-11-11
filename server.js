'use strict';
// Independent single-user project planner with calendar, scheduled tasks and events.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {pdfReport}=require('./report-pdf.js');
const { URL } = require('node:url');

const port = Number(process.env.PORT || 3000);
// Fixed personal PIN by request. APP_PASSWORD is deliberately ignored.
const password = '566218';
const production = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production');
// Session signing material is randomly generated on first boot and kept on the data volume,
// rather than deriving it from the short PIN (which would permit cookie forgery).
let secret;
const dataDir=path.resolve(process.env.DATA_DIR || path.join(__dirname,'storage'));
const dataFile=path.join(dataDir,'state.json');
const transitionSeedPath=path.join(__dirname,'transition-seed.json');
const messageUpdatesPath=path.join(__dirname,'message-updates.json');
const UPDATE_ID='tcg-november-updates-2026-11-10';
const CUSTOMS_UPDATE_ID='tcg-customs-followup-2026-11-10';
const customsUpdatePath=path.join(__dirname,'customs-follow-up.json');
async function customsUpdates(){
 const updates=JSON.parse(await fs.readFile(customsUpdatePath,'utf8'));
 if(updates?.updateMeta?.id!==CUSTOMS_UPDATE_ID||updates.projects?.length!==1||!Array.isArray(updates.tasks)||!Array.isArray(updates.events))throw new Error('Customs follow-up data is invalid');
 return updates;
}
async function messageUpdates(){
 const updates=JSON.parse(await fs.readFile(messageUpdatesPath,'utf8'));
 if(updates?.updateMeta?.id!==UPDATE_ID||!Array.isArray(updates.projects)||!Array.isArray(updates.tasks)||!Array.isArray(updates.events))throw new Error('Message update data is invalid');
 return updates;
}
// Add missing IDs only. User-edited records, notes and event exceptions always win.
function addPlanUpdates(current,updates,{fresh=false}={}){
 if((current.appliedPlanUpdates||[]).includes(updates.updateMeta.id))
  return {state:current,alreadyImported:true,projectsAdded:0,tasksAdded:0,eventsAdded:0};
 const projects=new Set(current.projects.map(x=>x.id)),tasks=new Set(current.tasks.map(x=>x.id)),events=new Set(current.events.map(x=>x.id));
 const p=updates.projects.filter(x=>!projects.has(x.id));
 const t=updates.tasks.filter(x=>!tasks.has(x.id));
 const e=updates.events.filter(x=>!events.has(x.id));
 const output={...current,projects:[...current.projects,...p],tasks:[...current.tasks,...t],events:[...current.events,...e],appliedPlanUpdates:[...(current.appliedPlanUpdates||[]),updates.updateMeta.id]};
 if(fresh){
  // Fresh installs can safely reconcile imported estimates. Existing estimates are left as edited.
  for(const [projectId,extra] of Object.entries(updates.updateMeta.projectDeltas||{})){
   const proj=output.projects.find(x=>x.id===projectId);
   if(proj)proj.estimatedHours=Number((Number(proj.estimatedHours)+Number(extra)).toFixed(2));
  }
 }
 return {state:output,alreadyImported:false,projectsAdded:p.length,tasksAdded:t.length,eventsAdded:e.length};
}

async function transitionSeed(){
 const seed=JSON.parse(await fs.readFile(transitionSeedPath,'utf8'));
 if(seed?.seedMeta?.id!=='tcg-transition-2026-11-16'||!Array.isArray(seed.projects)||!Array.isArray(seed.tasks)||!Array.isArray(seed.events)||!seed.settings)throw new Error('Transition seed is invalid');
 return seed;
}

function createSeedArchives(state){
 const stamp=new Date().toISOString();
 return state.projects.map((p,i)=>({
  id:`initial-${i+1}-${crypto.randomBytes(5).toString('hex')}`,
  projectId:p.id,
  generatedAt:stamp,
  title:p.name,
  kind:'baseline',
  summary:`Initial planning snapshot. ${p.description||''}`,
  tags:'TCG production, process, tasks, subtasks, transition',
  project:structuredClone(p),
  tasks:state.tasks.filter(t=>t.projectId===p.id).map(t=>structuredClone(t)),
  version:1
 }));
}
const defaultState=()=>({schema:1,projects:[],tasks:[],events:[],reports:[],settings:{
  workStart:'09:00',workEnd:'17:00',personalStart:'17:00',personalEnd:'21:00',
  weekendStart:'09:00',weekendEnd:'20:00',lunchStart:'12:00',lunchEnd:'12:30',
  weekdays:[1,2,3,4,5],autoPlan:true
}});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.png':'image/png','.svg':'image/svg+xml'};
const staticFiles=new Set(['/','/index.html','/styles.css','/app.js','/sw.js','/manifest.webmanifest','/manus-routes.json','/evnflo-wordmark-orange.png','/evnflo-192.png','/evnflo-512.png']);
const blocked=new Map();
let fileQueue=Promise.resolve();
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=')).filter(v=>v.length===2));
const sign=x=>crypto.createHmac('sha256',secret).update(x).digest('base64url');
const token=()=>{const part=`${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;return `${part}.${sign(part)}`;};
function authorized(req){
 if(!password)return true;
 const jar=cookies(req),t=jar.evnflw_projects_session;
 if(!t||t.length>256)return false;
 const idx=t.lastIndexOf('.');if(idx<0)return false;
 const data=t.slice(0,idx),sig=t.slice(idx+1),expected=sign(data);
 const age=Date.now()-Number(data.split('.')[0]);
 return Number.isFinite(age)&&age>=0&&age<30*86400000&&sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected));
}
const isHttps=req=>req.headers['x-forwarded-proto']==='https'||req.socket.encrypted;
const cookieOptions=req=>`Path=/; HttpOnly; SameSite=${isHttps(req)?'None':'Lax'}; Max-Age=2592000${isHttps(req)?'; Secure':''}`;
function send(res,code,data,headers={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...headers});res.end(JSON.stringify(data));}
function rejectOrigin(req){const origin=req.headers.origin;if(!origin)return false;try{return new URL(origin).host !== req.headers.host;}catch{return true;}}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8e6)throw new Error('Request too large');}return JSON.parse(raw||'{}');}
async function load(){return JSON.parse(await fs.readFile(dataFile,'utf8'));}
async function save(data){fileQueue=fileQueue.catch(()=>{}).then(async()=>{const tmp=`${dataFile}.${process.pid}.tmp`;await fs.writeFile(tmp,JSON.stringify(data,null,2));await fs.rename(tmp,dataFile);});await fileQueue;}
async function route(req,res){
 const url=new URL(req.url,'http://localhost');const endpoint=url.pathname;
 if(endpoint==='/api/health'&&(req.method==='GET'||req.method==='HEAD'))return send(res,200,{status:'ok'});
 if(endpoint==='/api/session'&&req.method==='GET')return send(res,200,{authenticated:authorized(req),protected:Boolean(password),storage:'file'});
 if(endpoint==='/api/login'&&req.method==='POST'){
  if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
  if(!password)return send(res,200,{ok:true});
  const ip=req.headers['x-forwarded-for']?.split(',')[0]?.trim()||req.socket.remoteAddress||'local',prev=blocked.get(ip)||{attempts:0,until:0};
  if(prev.until>Date.now())return send(res,429,{error:'Too many attempts. Try again in five minutes.'});
  const input=await body(req);const received=crypto.createHash('sha256').update(typeof input.password==='string'?input.password:'').digest();
  const expected=crypto.createHash('sha256').update(password).digest();
  if(!crypto.timingSafeEqual(received,expected)){
   prev.attempts++;if(prev.attempts>=6){prev.until=Date.now()+300000;prev.attempts=0;}blocked.set(ip,prev);
   return send(res,401,{error:'Incorrect password.'});
  }
  blocked.delete(ip);
  return send(res,200,{ok:true},{'Set-Cookie':`evnflw_projects_session=${token()}; ${cookieOptions(req)}`});
 }
 if(endpoint==='/api/logout'&&req.method==='POST'){
  if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
  const cleared=cookieOptions(req).replace('Max-Age=2592000','Max-Age=0');
  return send(res,200,{ok:true},{'Set-Cookie':[`evnflw_projects_session=; ${cleared}`,`evnflw_projects_session=; ${cleared}`]});
 }
 if(endpoint==='/api/seed-transition'&&req.method==='POST'){
  if(!authorized(req))return send(res,401,{error:'Please sign in.'});
  if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
  const seed=await transitionSeed(), current=await load();
  if(current.seedMeta?.id===seed.seedMeta.id)return send(res,200,{ok:true,alreadyImported:true,projectsAdded:0,tasksAdded:0});
  if(!Array.isArray(current.projects)||!Array.isArray(current.tasks)||!Array.isArray(current.events)||!current.settings)return send(res,400,{error:'Current planner data is invalid.'});
  const projectIds=new Set(current.projects.map(p=>p.id));const taskIds=new Set(current.tasks.map(t=>t.id));
  const projects=seed.projects.filter(p=>!projectIds.has(p.id));
  const tasks=seed.tasks.filter(t=>!taskIds.has(t.id));
  const merged={...current,seedMeta:seed.seedMeta,projects:[...current.projects,...projects],tasks:[...current.tasks,...tasks]};
  await save(merged);
  return send(res,200,{ok:true,alreadyImported:false,projectsAdded:projects.length,tasksAdded:tasks.length});
 }
 if(endpoint==='/api/seed-november-updates'&&req.method==='POST'){
  if(!authorized(req))return send(res,401,{error:'Please sign in.'});
  if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
  const current=await load();
  if(!Array.isArray(current.projects)||!Array.isArray(current.tasks)||!Array.isArray(current.events)||!current.settings)return send(res,400,{error:'Current planner data is invalid.'});
  const updates=await messageUpdates();
  let start=current;
  // If an older workspace never loaded the base plan, install it first as well.
  if(current.seedMeta?.id!=='tcg-transition-2026-11-16'){
   const base=await transitionSeed();
   const projectIds=new Set(current.projects.map(x=>x.id)),taskIds=new Set(current.tasks.map(x=>x.id));
   start={...current,seedMeta:base.seedMeta,projects:[...current.projects,...base.projects.filter(x=>!projectIds.has(x.id))],tasks:[...current.tasks,...base.tasks.filter(x=>!taskIds.has(x.id))]};
  }
  const out=addPlanUpdates(start,updates);
  if(!out.alreadyImported||start!==current)await save(out.state);
  return send(res,200,{ok:true,alreadyImported:out.alreadyImported,projectsAdded:out.projectsAdded,tasksAdded:out.tasksAdded,eventsAdded:out.eventsAdded});
 }
 if(endpoint==='/api/seed-customs-follow-up'&&req.method==='POST'){
  if(!authorized(req))return send(res,401,{error:'Please sign in.'});
  if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
  const current=await load();
  if(!Array.isArray(current.projects)||!Array.isArray(current.tasks)||!Array.isArray(current.events)||!current.settings)return send(res,400,{error:'Current planner data is invalid.'});
  const out=addPlanUpdates(current,await customsUpdates());
  if(!out.alreadyImported)await save(out.state);
  return send(res,200,{ok:true,alreadyImported:out.alreadyImported,projectsAdded:out.projectsAdded,tasksAdded:out.tasksAdded,eventsAdded:out.eventsAdded});
 }
 // Report PDFs are generated from archived snapshots, never from the changing live task state.
 const reportMatch=endpoint.match(/^\/api\/reports\/([a-zA-Z0-9-]{1,90})\/pdf$/);
 if(reportMatch && req.method==='GET'){
  if(!authorized(req))return send(res,401,{error:'Please sign in.'});
  const current=await load(),report=(current.reports||[]).find(r=>r.id===reportMatch[1]);
  if(!report)return send(res,404,{error:'Saved report not found.'});
  const pdf=pdfReport(report),filename=String(report.title||'Project_Report').replace(/[^a-z0-9_-]+/gi,'_').slice(0,60)||'Project_Report';
  res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${filename}_v${Number(report.version)||1}.pdf"`,'Content-Length':pdf.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  res.end(pdf);return;
 }
 if(endpoint==='/api/state'){
  if(!authorized(req))return send(res,401,{error:'Please sign in.'});
  if(req.method==='GET')return send(res,200,await load());
  if(req.method==='PUT'){
   if(rejectOrigin(req))return send(res,403,{error:'Origin not allowed'});
   const data=await body(req);
   if(!data||!Array.isArray(data.projects)||!Array.isArray(data.tasks)||!Array.isArray(data.events)||!data.settings||data.projects.length>3000||data.tasks.length>30000||data.events.length>30000||(data.reports!==undefined&&(!Array.isArray(data.reports)||data.reports.length>500)))return send(res,400,{error:'Invalid planner data.'});
   await save(data);return send(res,200,{ok:true});
  }
  return send(res,405,{error:'Method not allowed'});
 }
 if((req.method==='GET'||req.method==='HEAD')&&staticFiles.has(endpoint)){
   const full=path.join(__dirname,endpoint==='/'?'index.html':endpoint);
   const bytes=await fs.readFile(full);
   res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':endpoint==='/index.html'||endpoint==='/'?'no-cache':'public, max-age=300','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors *",'X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD')res.end();else res.end(bytes);return;
 }
 send(res,404,{error:'Not found'});
}
async function boot(){await fs.mkdir(dataDir,{recursive:true});
 const secretPath=path.join(dataDir,'.session-secret');
 try{secret=await fs.readFile(secretPath);}catch(e){
  if(e.code!=='ENOENT')throw e;
  const fresh=crypto.randomBytes(32);
  try{await fs.writeFile(secretPath,fresh,{flag:'wx',mode:0o600});secret=fresh;}
  catch(err){if(err.code!=='EEXIST')throw err;secret=await fs.readFile(secretPath);}
 }
 try{await fs.access(dataFile);}catch(e){
  if(e.code!=='ENOENT')throw e;
  // A new independent Projects installation comes prepopulated. Never modify an
  // existing user's state on a restart/redeploy; there is an explicit merge in Settings.
  const base=await transitionSeed(),updates=await messageUpdates();
  const withNovember=addPlanUpdates(base,updates,{fresh:true}).state;
  const fresh=addPlanUpdates(withNovember,await customsUpdates(),{fresh:true}).state;
  fresh.reports=createSeedArchives(fresh); // Searchable snapshots on a new install; never replace existing volume reports.
  try{await fs.writeFile(dataFile,JSON.stringify(fresh,null,2),{flag:'wx'});}catch(err){if(err.code!=='EEXIST')throw err;}
 }
 if(production&&!process.env.DATA_DIR)console.warn('IMPORTANT: DATA_DIR is not set. Add a Railway volume mounted at /data and set DATA_DIR=/data for persistent data.');
 http.createServer((req,res)=>route(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,e.message==='Request too large'?413:500,{error:'Server error. Check logs.'});})).listen(port,'0.0.0.0',()=>console.log(`EvnFlo Projects running on port ${port}. Data: ${dataFile}`));
}
boot().catch(e=>{console.error(e);process.exit(1);});
