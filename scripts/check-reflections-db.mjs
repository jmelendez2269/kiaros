import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db=new PGlite()
const u1='11111111-1111-4111-8111-111111111111',u2='22222222-2222-4222-8222-222222222222'
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE user_profiles(id uuid PRIMARY KEY,clerk_user_id text);
CREATE FUNCTION app_current_clerk_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.clerk_id',true) $$;
GRANT SELECT ON user_profiles TO authenticated;
CREATE TABLE journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,body text,entry_date date,include_in_insights boolean,include_in_stelloquy boolean,memory_pinned boolean DEFAULT false,memory_importance int);
CREATE TABLE area_goals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,title text,status text);
CREATE TABLE quarterly_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE,wins jsonb,challenges jsonb,pivots text,next_quarter_intentions text,completed_at timestamptz,ai_summary text);
CREATE TABLE daily_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE);
CREATE TABLE oracle_captures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE);
CREATE TABLE curriculum_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE);
CREATE TABLE plan_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES user_profiles ON DELETE CASCADE);
INSERT INTO user_profiles VALUES('${u1}','user_one'),('${u2}','user_two');
`)
await db.exec(await readFile(new URL('../supabase/migrations/0047_reflections.sql',import.meta.url),'utf8'))
const query=async(sql,params=[]) => (await db.query(sql,params)).rows
for(const id of [u1,u2]) await query("select save_reflection_preferences($1,'America/New_York',true,true)",[id])
await query("insert into journal_entries(user_id,title,body,entry_date,include_in_insights,include_in_stelloquy) values($1,'Old relevant memory','Gardening with my sister','2020-01-02',true,true),($1,'New unrelated entry','Train schedules','2025-01-03',true,true),($1,'Private garden','Gardening secret','2025-01-04',false,false),($2,'Other user','Gardening secret too','2025-01-04',true,true)",[u1,u2])
const recalled=await query("select * from recall_journal_memories($1,'gardening')",[u1])
assert.equal(recalled.length,1); assert.equal(recalled[0].title,'Old relevant memory')
assert.equal((await query("select * from recall_journal_memories($1,'volcano')",[u1])).length,0)
const claim=async(id=u1,force=false) => (await query("select claim_reflection($1,'month','2025-01-01','2025-02-01','America/New_York',$2) as result",[id,force]))[0].result
const first=await claim()
await assert.rejects(claim(),/generation_in_progress/)
await assert.rejects(query("select claim_reflection($1,'month','2099-01-01','2099-02-01','America/New_York',false)",[u1]),/period_not_closed/)
const finish=async(c,id=u1)=> (await query("select finish_reflection($1,$2,$3,$4,'{\"opening\":\"private\"}','{}','[]','fixture') as ok",[id,c.id,c.token,c.revision]))[0].ok
assert.equal(await finish(first,u2),false)
assert.equal(await finish(first),true)
assert.equal((await claim()).cached,true)
await db.exec("SET ROLE authenticated; SELECT set_config('test.clerk_id','user_one',false)")
assert.equal((await query('select * from reflection_preferences')).length,1)
await assert.rejects(query('select * from reflection_report_versions'),/permission denied/)
await assert.rejects(query('select * from reflection_reports'),/permission denied/)
await assert.rejects(claim(),/permission denied/)
await db.exec('RESET ROLE')
await assert.rejects(query("insert into reflection_feedback(user_id,report_id,claim_key,verdict) values($1,$2,'rest','dismissed')",[u2,first.id]),/foreign key/)
await query("update journal_entries set include_in_insights=false where user_id=$1 and title='Old relevant memory'",[u1])
assert.ok((await query('select content from reflection_reports where id=$1',[first.id]))[0].content, 'unrelated periods stay intact')
await query("update journal_entries set include_in_insights=false where user_id=$1 and title='New unrelated entry'",[u1])
assert.equal((await query('select content from reflection_reports where id=$1',[first.id]))[0].content,null)
assert.equal((await query('select content from reflection_report_versions where report_id=$1',[first.id]))[0].content,null)
const stale=await claim()
await query("delete from journal_entries where user_id=$1 and title='New unrelated entry'",[u1])
assert.equal(await finish(stale),false)
const renewed=await claim()
assert.equal(await finish(renewed),true)
await query("insert into reflection_feedback(user_id,report_id,claim_key,verdict,note) values($1,$2,'rest','corrected','It was a different experience')",[u1,first.id])
assert.equal((await query('select status from reflection_reports where id=$1',[first.id]))[0].status,'stale')
await query("insert into area_goals(user_id,title,status) values($1,'Write','active')",[u1])
assert.equal((await query('select count(*)::int as n from reflection_goal_events where user_id=$1',[u1]))[0].n,1)
await query("update area_goals set status='completed' where user_id=$1",[u1])
const goalEvents=await query("select * from reflection_goal_events where user_id=$1 order by occurred_at",[u1])
assert.equal(goalEvents.length,2); assert.equal(goalEvents[1].new_status,'completed')
const c=await claim()
await query("update reflection_reports set lease_until=now()-interval '1 second' where id=$1",[c.id])
assert.equal(await finish(c),false)
const recovered=await claim()
assert.ok(recovered.token!==c.token)
await query("update reflection_reports set lease_until=now()-interval '1 second' where id=$1",[c.id])
await query("insert into reflection_generation_attempts(user_id) select $1 from generate_series(1,12)",[u1])
await assert.rejects(claim(),/generation_limit/)
await query("delete from user_profiles where id=$1",[u1])
assert.equal((await query('select count(*)::int as n from reflection_reports where user_id=$1',[u1]))[0].n,0)
await db.close()
console.log('PostgreSQL migration, two-user isolation, private versions, consent/deletion invalidation, stale-generation races, leases, retries, goal history and memory relevance checks passed.')
