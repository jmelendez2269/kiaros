import assert from 'node:assert/strict'
import { periodFor, latestClosed, assertClosed, localBoundary, localDate, periodLabel, weekOf, weeksInYear, closedPeriodsSince, catchUpOrder } from '../lib/reflections/periods.ts'
import { analyzePeriod } from '../lib/reflections/analyze-period.ts'
import { reportSchema, validateReport, type Evidence } from '../lib/reflections/report-schema.ts'
import { reflectionShareCard } from '../lib/reflections/share-card.ts'
const tz='America/New_York'
assert.equal(periodFor('month',2024,2,tz).end,'2024-03-01')
// Weeks run Monday to Sunday, numbered as ISO weeks.
assert.deepEqual(periodFor('week',2026,1,tz),{kind:'week',start:'2025-12-29',end:'2026-01-05',timezone:tz})
assert.equal(weeksInYear(2026),53); assert.equal(weeksInYear(2025),52)
assert.throws(()=>periodFor('week',2025,53,tz))
assert.deepEqual(weekOf('2027-01-01'),{year:2026,index:53})
assert.deepEqual(weekOf('2025-12-29'),{year:2026,index:1})
assert.deepEqual(weekOf('2026-11-08'),weekOf('2026-11-02'))
assert.equal(latestClosed('week',tz,new Date('2026-11-04T17:00:00Z')).start,'2026-10-26')
assert.equal(latestClosed('week',tz,new Date('2026-11-09T04:59:59Z')).start,'2026-10-26')
assert.equal(latestClosed('week',tz,new Date('2026-11-09T05:00:00Z')).start,'2026-11-02')
assert.equal(periodLabel(periodFor('week',2025,32,tz)),'Week of Aug 4, 2025')
assert.throws(()=>assertClosed(periodFor('week',2026,45,tz),new Date('2026-11-08T12:00:00Z')))
// Catch-up: every ended period since joining, newest first, interleaved across kinds.
const nowNov=new Date('2026-11-04T17:00:00Z')
const months=closedPeriodsSince('month','2026-05-20',tz,nowNov)
assert.deepEqual(months.map(m=>m.start),['2026-10-01','2026-09-01','2026-08-01','2026-07-01','2026-06-01','2026-05-01'])
const weeks=closedPeriodsSince('week','2026-05-20',tz,nowNov)
assert.equal(weeks[0].start,'2026-10-26'); assert.equal(weeks.at(-1)!.start,'2026-05-18'); assert.equal(weeks.length,24)
assert.deepEqual(closedPeriodsSince('quarter','2026-05-20',tz,nowNov).map(q=>q.start),['2026-07-01','2026-04-01'])
assert.equal(closedPeriodsSince('year','2026-05-20',tz,nowNov).length,0,'a year that has not ended is not prepared')
assert.deepEqual(closedPeriodsSince('week','1999-01-01',tz,new Date('2000-01-20T12:00:00Z')).map(w=>w.start),['2000-01-10','2000-01-03'],'stops at the supported range')
const order=catchUpOrder([weeks.slice(0,2),months.slice(0,2)])
assert.deepEqual(order.map(p=>p.kind+':'+p.start),['week:2026-10-26','month:2026-10-01','week:2026-10-19','month:2026-09-01'])
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
assert.equal(validateReport(base(),analysis.evidence,{...p,kind:'week'},[],[]).lookingAhead.experiments.length,1)
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
