import assert from 'node:assert/strict'
import { periodFor, latestClosed, assertClosed, localBoundary, localDate } from '../lib/reflections/periods.ts'
import { analyzePeriod } from '../lib/reflections/analyze-period.ts'
import { reportSchema, validateReport, type Evidence } from '../lib/reflections/report-schema.ts'
import { reflectionShareCard } from '../lib/reflections/share-card.ts'
const tz='America/New_York'
assert.equal(periodFor('month',2024,2,tz).end,'2024-03-01')
assert.equal(latestClosed('quarter',tz,new Date('2026-01-01T06:00:00Z')).start,'2025-10-01')
assert.equal(latestClosed('month',tz,new Date('2026-09-01T03:59:59Z')).start,'2026-07-01')
assert.equal(latestClosed('year',tz,new Date('2026-01-01T06:00:00Z')).start,'2025-01-01')
assert.equal(localBoundary('2026-03-01',tz),'2026-03-01T05:00:00.000Z')
assert.equal(localBoundary('2026-04-01',tz),'2026-04-01T04:00:00.000Z')
assert.equal(localBoundary('2026-11-01',tz),'2026-11-01T04:00:00.000Z')
assert.equal(localBoundary('2026-12-01',tz),'2026-12-01T05:00:00.000Z')
assert.equal(localDate(new Date('2026-09-01T00:30:00Z'),tz),'2026-08-31')
assert.throws(()=>periodFor('quarter',2026,5,tz))
assert.throws(()=>periodFor('year',2026,2,tz))
assert.throws(()=>assertClosed(periodFor('month',2026,9,tz),new Date('2026-09-20')))
const p=periodFor('month',2026,8,tz)
const entry=(id:string,date:string,text:string,goalId:string|null=null):Evidence=>({id,kind:'journal',date,title:id,text,recordedAt:date,goalId,authored:true})
const evidence=[entry('a','2026-08-01','I rested after a long day'),entry('b','2026-08-08','Quiet time with a friend'),entry('c','2026-08-20','A break helped me think'),
entry('copy','2026-08-20','A break helped me think'),entry('future','2026-09-01','future'),entry('past','2026-07-31','past')]
const analysis=analyzePeriod(evidence,p)
assert.equal(analysis.evidence.length,3)
assert.equal(analysis.observedDays,3)
assert.equal(analysis.totalDays,31)
assert.equal(analysis.patterns.find(t=>t.key==='rest')?.recurring,true)
assert.equal(analyzePeriod([entry('a','2026-08-01','rest'),entry('b','2026-08-01','quiet'),entry('c','2026-08-02','break')],p).patterns[0].recurring,false)
const passage={text:'You recorded a quiet moment with room to rest and connect.',sources:['a']}
const base=()=>reportSchema.parse({opening:passage,moments:[passage],observations:[{...passage,key:'rest',kind:'recurrence',contradictingSources:[]}],rhythms:null,turningPoints:null,discoveries:null,goalThread:null,lookingAhead:{focus:passage,experiments:[passage,passage,passage]},letter:null})
assert.equal(validateReport(base(),analysis.evidence,p,[],[]).observations[0].kind,'observation')
assert.equal(validateReport(base(),analysis.evidence,p,[],['rest']).observations.length,0)
assert.equal(validateReport(base(),analysis.evidence,p,[],[]).lookingAhead.experiments.length,2)
const invalid=base(); invalid.opening.sources=['unowned']; assert.throws(()=>validateReport(invalid,analysis.evidence,p,[],[]))
const withGoal=base(); withGoal.goalThread={text:'This helped your writing.',sources:['a'],goalIds:['goal-1']}
assert.equal(validateReport(withGoal,analysis.evidence,p,[],[]).goalThread,null)
const allowed=base(); allowed.goalThread={text:'A writing thread.',sources:['g'],goalIds:['goal-1']}
assert.ok(validateReport(allowed,[...analysis.evidence,entry('g','2026-08-08','Writing practice','goal-1')],p,['goal-1'],[]).goalThread)
const oversized=base(); oversized.goalThread={text:'goal '.repeat(61),sources:['g'],goalIds:['goal-1']}
assert.equal(validateReport(oversized,[...analysis.evidence,entry('g','2026-08-08','Writing','goal-1')],p,['goal-1'],[]).goalThread,null)
const svg=reflectionShareCard('My year','<script>alert("secret")</script>')
assert.ok(!svg.includes('<script>'))
assert.ok(svg.includes('&lt;script&gt;'))
console.log('Reflection period, DST, coverage, deduplication, recurrence, source ownership, feedback, goal-balance and share-card checks passed.')
