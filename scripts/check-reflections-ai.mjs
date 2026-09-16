// Optional paid model smoke test using fictional records only. No database reads/writes.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
process.loadEnvFile('.env.local')
assert.ok(process.env.ANTHROPIC_API_KEY,'ANTHROPIC_API_KEY is required for the fictional model smoke test')
const temp=resolve('node_modules/.cache/reflections-tests');await mkdir(temp,{recursive:true})
await writeFile(resolve(temp,'ai-usage.cjs'),'exports.recordUsage=async()=>{};')
await writeFile(resolve(temp,'empty.cjs'),'module.exports={};')
await build({entryPoints:['lib/ai/reflection-generator.ts'],outfile:resolve(temp,'ai.cjs'),bundle:true,platform:'node',format:'cjs',packages:'external',
 alias:{'server-only':resolve(temp,'empty.cjs'),'@/lib/ai/usage':resolve(temp,'ai-usage.cjs')}})
const {generateReflectionContent}=createRequire(import.meta.url)(resolve(temp,'ai.cjs'))
const evidence=Array.from({length:12},(_,i)=>({id:'journal:fiction-'+i,kind:'journal',date:'2025-08-'+String(i*2+1).padStart(2,'0'),recordedAt:'2025-08-30T12:00:00Z',title:'Fictional journal '+i,text:[
'I left a quiet evening free and read a few pages. I felt settled afterward.',
'A walk with my friend gave us space for a conversation I had been missing.',
'I tried to write tonight, but I was tired and chose to stop. I was glad to rest.',
'I made a little time for my writing project. It felt satisfying to work slowly.',
][i%4],goalId:null,authored:true}))
evidence.push({id:'task:fiction-writing',kind:'task',date:'2025-08-24',recordedAt:'2025-08-24T12:00:00Z',title:'A little writing time',text:'Completed a short writing session for my personal essay project.',goalId:'fiction-writing',authored:true})
const annual=process.argv.includes('--annual')
if(annual){ evidence.length=0; for(let month=1;month<=12;month++) for(let day=1;day<=6;day++) evidence.push({id:'journal:fiction-'+month+'-'+day,kind:'journal',date:'2025-'+String(month).padStart(2,'0')+'-'+String(day*4).padStart(2,'0'),recordedAt:'2025-12-31T12:00:00Z',title:'Fictional moment',text:'On this day in month '+month+' I '+(day%2?'made time for a quiet walk with a friend. We spoke about the books we were reading.':'rested after a busy day. I chose a quiet evening at home and felt settled afterward.'),goalId:null,authored:true}) }
const analysis={evidence,observedDays:annual?72:12,totalDays:annual?365:31,counts:{journal:12,task:1},patterns:[],months:[{month:'2025-08',days:12}]}
const period=annual?{kind:'year',start:'2025-01-01',end:'2026-01-01',timezone:'America/New_York'}:{kind:'month',start:'2025-08-01',end:'2025-09-01',timezone:'America/New_York'}
const result=await generateReflectionContent('fictional-no-database',period,analysis,[],!annual)
assert.ok(result.content.opening.text.length>0)
assert.ok(result.sources.every(s=>evidence.some(e=>e.id===s.id)))
assert.ok(result.content.lookingAhead.experiments.length<=(annual?3:2))
await writeFile(resolve(temp,annual?'fictional-ai-year.json':'fictional-ai-month.json'),JSON.stringify(result,null,2))
if(annual) assert.equal(result.content.goalThread,null)
console.log('Fictional '+(annual?'annual batch':'monthly')+' AI generation passed schema, source-reference and goal-balance validation.')
console.log(JSON.stringify({goalIncluded:Boolean(result.content.goalThread),observations:result.content.observations.length,experiments:result.content.lookingAhead.experiments.length}))
