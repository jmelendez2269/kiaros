// Isolated browser/API fixture: real routes, services, Supabase client and migration;
// fictional Clerk identity and deterministic model output. Never connects to live services.
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { PGlite } from '@electric-sql/pglite'
import { createRequire } from 'node:module'
const root=process.cwd(), temp=resolve('node_modules/.cache/reflections-tests')
await mkdir(temp,{recursive:true})
execFileSync(process.execPath,[resolve('node_modules/tailwindcss/lib/cli.js'),'-i',resolve('app/globals.css'),'-o',resolve(temp,'styles.css'),'--minify'],{windowsHide:true,stdio:'pipe'})
const db=new PGlite()
const uid='11111111-1111-4111-8111-111111111111'
globalThis.__reflectionTestUser=uid
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE user_profiles(id uuid PRIMARY KEY,clerk_user_id text);
CREATE FUNCTION app_current_clerk_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.clerk_id',true) $$;
CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,body text,entry_date date,created_at timestamptz DEFAULT now(),include_in_insights boolean,include_in_stelloquy boolean,memory_pinned boolean DEFAULT false,memory_importance int);
CREATE TABLE area_goals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,status text);
CREATE TABLE quarterly_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,plan_year int,quarter int,wins jsonb,challenges jsonb,pivots text,next_quarter_intentions text,completed_at timestamptz,created_at timestamptz DEFAULT now(),ai_summary text);
CREATE TABLE daily_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,log_date date,notes text,mood_tag text,energy_level int,"values" jsonb,created_at timestamptz DEFAULT now());
CREATE TABLE oracle_captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,captured_text text,source_role text,include_in_insights boolean,created_at timestamptz DEFAULT now());
CREATE TABLE curriculum_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,status text,scheduled_for date,created_at timestamptz DEFAULT now());
CREATE TABLE plan_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,area_goal_id uuid,completed_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE product_entitlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,source text DEFAULT 'stripe',source_order_id text DEFAULT 'fixture',product_tier text DEFAULT 'planner',planner_year int DEFAULT 2026,oracle_enabled boolean DEFAULT false,starts_at date DEFAULT '2020-01-01',ends_at date DEFAULT '2099-12-31',status text DEFAULT 'active',created_at timestamptz DEFAULT now(),access_plan text DEFAULT 'yearly');
INSERT INTO user_profiles VALUES('${uid}','fixture'),('22222222-2222-4222-8222-222222222222','second');
INSERT INTO product_entitlements(user_id) VALUES('${uid}');
`)
await db.exec(await readFile('supabase/migrations/0047_reflections.sql','utf8'))
await db.query("select save_reflection_preferences($1,'America/New_York',false,true)",[uid])
await db.query(`insert into journal_entries(user_id,title,body,entry_date,include_in_insights,include_in_stelloquy) values
($1,'A quiet evening','I rested with a book and felt settled.','2025-08-02',true,true),
($1,'Room to breathe','I took a quiet break after a busy afternoon.','2025-08-10',true,true),
($1,'Time together','A walk with my friend gave us space to talk.','2025-08-24',true,true),
($1,'Excluded private memory','DO_NOT_INCLUDE_PRIVATE','2025-08-25',false,false)`,[uid])
const empty=resolve(temp,'empty.cjs'),auth=resolve(temp,'auth.cjs'),usage=resolve(temp,'usage.cjs'),admin=resolve(temp,'admin.cjs'),model=resolve(temp,'model.cjs')
await writeFile(empty,'module.exports={};')
await writeFile(auth,'exports.auth=async()=>({userId:globalThis.__reflectionTestUser});')
await writeFile(usage,'exports.getUserProfileId=async id=>id;exports.recordUsage=async()=>{};')
await writeFile(admin,`exports.createAdminSupabase=()=>require('@supabase/supabase-js').createClient('http://127.0.0.1:3701','fixture',{auth:{persistSession:false}});`)
await writeFile(model,`exports.generateReflectionContent=async (userId,period,analysis,history,includeGoals)=>{
 const source=analysis.evidence.find(e=>e.kind==='journal'); const p={text:'You made room for rest and connection. A quiet evening and a walk gave this time its own shape.',sources:[source.id]};
 const o={...p,key:'rest',kind:'observation',contradictingSources:[]};
 return {model:'deterministic-browser-fixture',sources:[source],content:{opening:p,moments:[p],observations:history.some(f=>f.claim_key==='rest'&&f.verdict!=='confirmed')?[]:[o],rhythms:period.kind==='year'?p:null,turningPoints:period.kind==='year'?p:null,discoveries:period.kind==='year'?p:null,goalThread:null,lookingAhead:{focus:{...p,text:'You might leave room for one unhurried evening next month.'},experiments:[{...p,text:'Protect a quiet evening and notice what it gives you.'}]},letter:period.kind==='year'?p:null}};
};`)
await build({entryPoints:['app/api/reflections/route.ts'],outfile:resolve(temp,'api.cjs'),bundle:true,platform:'node',format:'cjs',packages:'external',
 alias:{'server-only':empty,'@clerk/nextjs/server':auth,'@/lib/ai/usage':usage,'@/lib/supabase/admin':admin,'@/lib/ai/reflection-generator':model}})
const api=createRequire(import.meta.url)(resolve(temp,'api.cjs'))
await build({entryPoints:['app/api/cron/reflections/route.ts'],outfile:resolve(temp,'cron.cjs'),bundle:true,platform:'node',format:'cjs',packages:'external',
 alias:{'server-only':empty,'@clerk/nextjs/server':auth,'@/lib/ai/usage':usage,'@/lib/supabase/admin':admin,'@/lib/ai/reflection-generator':model}})
const cron=createRequire(import.meta.url)(resolve(temp,'cron.cjs'))
process.env.CRON_SECRET='local-reflection-fixture-only'
let failureTable=null
const link=resolve(temp,'link.tsx'),entry=resolve(temp,'entry.tsx')
await writeFile(link,"import React from 'react'; export default function Link(props){return <a {...props}/>}")
await writeFile(entry,`import React from 'react';import {createRoot} from 'react-dom/client';import {ReflectionsHub} from '${resolve('components/reflections/ReflectionsHub.tsx').replaceAll('\\','/')}';createRoot(document.getElementById('root')).render(<ReflectionsHub initialKind={location.pathname.includes('unwrapped')?'year':'month'}/>);`)
await build({entryPoints:[entry],outfile:resolve(temp,'app.js'),bundle:true,platform:'browser',jsx:'automatic',alias:{'next/link':link},define:{'process.env.NODE_ENV':'"development"'}})
const ident=s=>{if(!/^[a-z_][a-z0-9_]*$/i.test(s))throw Error('Invalid SQL identifier');return '"'+s+'"'}
async function rest(req,url,body){
 const name=url.pathname.split('/').pop(),params=[]
 if(url.pathname.includes('/rpc/')){
  const args=Object.entries(body).map(([key,value])=>{params.push(value);return ident(key)+'=> $'+params.length})
  const result=await db.query('SELECT public.'+ident(name)+'('+args.join(',')+') as result',params)
  return result.rows[0]?.result??null
 }
 if(name===failureTable) throw new Error('Injected fixture source outage')
 const table=ident(name),where=[]
 for(const [key,value] of url.searchParams){
  if(['select','order','limit','offset','on_conflict','columns'].includes(key))continue
  const match=/^(eq|neq|gte|gt|lt|lte|is|not\.is|not\.eq)\.(.*)$/.exec(value)
  if(!match)throw Error('Unsupported fixture filter '+value)
  const [,op,val]=match,col=ident(key)
  if(op==='is'||op==='not.is'){where.push(col+(op==='is'?' IS ':' IS NOT ')+(val==='null'?'NULL':val==='true'?'TRUE':'FALSE'));continue}
  params.push(val);where.push(col+' '+({eq:'=',neq:'<>',gte:'>=',gt:'>',lt:'<',lte:'<=','not.eq':'<>'}[op])+' $'+params.length)
 }
 const condition=where.length?' WHERE '+where.join(' AND '):''
 const columns=url.searchParams.get('select')||'*',selection=columns==='*'?'*':columns.split(',').map(ident).join(',')
 let sql
 if(req.method==='GET'){
  sql='SELECT '+selection+' FROM '+table+condition
  const order=url.searchParams.get('order')
  if(order)sql+=' ORDER BY '+order.split(',').map(o=>{const[k,d]=o.split('.');return ident(k)+(d==='desc'?' DESC':' ASC')}).join(',')
  sql+=' LIMIT '+Math.min(2000,Number(url.searchParams.get('limit')||2000))+' OFFSET '+Number(url.searchParams.get('offset')||0)
 }else if(req.method==='PATCH'){
  const updates=Object.entries(body).map(([k,v])=>{params.push(v);return ident(k)+'=$'+params.length})
  sql='UPDATE '+table+' SET '+updates.join(',')+condition+' RETURNING '+selection
 }else if(req.method==='POST'){
  const keys=Object.keys(body);params.length=0
  const values=keys.map(k=>{params.push(body[k]);return '$'+params.length})
  sql='INSERT INTO '+table+'('+keys.map(ident).join(',')+') VALUES('+values.join(',')+')'
  if((req.headers.prefer||'').includes('resolution=merge-duplicates')){
   const conflict=url.searchParams.get('on_conflict')||(name==='reflection_feedback'?'user_id,report_id,claim_key':'id')
   sql+=' ON CONFLICT('+conflict.split(',').map(ident).join(',')+') DO UPDATE SET '+keys.map(k=>ident(k)+'=EXCLUDED.'+ident(k)).join(',')
  }
  sql+=' RETURNING '+selection
 }else throw Error('Unsupported fixture method')
 const result=await db.query(sql,params)
 const rows=result.rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?(k.endsWith('_date')||['period_start','period_end','entry_date','log_date','scheduled_for','starts_at','ends_at'].includes(k)?v.toISOString().slice(0,10):v.toISOString()):v])))
 return (req.headers.accept||'').includes('vnd.pgrst.object')?(rows[0]??null):rows
}
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:3701')
 try {
  const chunks=[];for await(const c of req)chunks.push(c);const text=Buffer.concat(chunks).toString()
  if(url.pathname==='/__test__/identity') {globalThis.__reflectionTestUser=url.searchParams.get('id');res.end('ok');return}
  if(url.pathname==='/__test__/failure') {failureTable=url.searchParams.get('table');res.end('ok');return}
  if(url.pathname==='/api/cron/reflections') {
    const response=await cron.GET(new Request(url,{headers:req.headers}));
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return
  }
  if(url.pathname.startsWith('/rest/v1/')){
   try{const result=await rest(req,url,text?JSON.parse(text):{});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result))}
   catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:e.message,code:e.code??'fixture_error'}))}
   return
  }
  if(url.pathname==='/api/reflections'){
   const request=new Request(url,{method:req.method,headers:req.headers,...(text?{body:text}:{})})
   const response=req.method==='GET'?await api.GET(request):await api.POST(request)
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return
  }
  if(url.pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await readFile(resolve(temp,'app.js')));return}
  if(url.pathname==='/styles.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(await readFile(resolve(temp,'styles.css')));return}
  res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reflections verification</title><link rel="stylesheet" href="/styles.css"></head><body style="background:#191b20"><div id="root"></div><script src="/app.js"></script></body></html>')
 }catch(e){console.error(e.message);res.writeHead(500);res.end(JSON.stringify({error:e.message}))}
})
server.listen(3701,'127.0.0.1',()=>console.log('Reflection fixture ready at http://127.0.0.1:3701 (isolated PostgreSQL; fictional data/model)'))
