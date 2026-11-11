import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:(process.env.CHROME_ARGS||'').split(' ').filter(Boolean)})
const page=await browser.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const base='http://127.0.0.1:3701'
const clickText=async(text,selector='button')=>{
 await page.waitForFunction((t,s)=>Array.from(document.querySelectorAll(s)).some(e=>e.textContent?.trim()===t),{},text,selector)
 await page.evaluate((t,s)=>Array.from(document.querySelectorAll(s)).find(e=>e.textContent?.trim()===t).click(),text,selector)
}
const fill=async(selector,value)=>{await page.$eval(selector,(e,v)=>{const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set;setter.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},value)}
const clickPrefix=async(prefix,selector='button')=>{
 await page.waitForFunction((t,s)=>Array.from(document.querySelectorAll(s)).some(e=>e.textContent?.trim().startsWith(t)),{},prefix,selector)
 await page.evaluate((t,s)=>Array.from(document.querySelectorAll(s)).find(e=>e.textContent?.trim().startsWith(t)).click(),prefix,selector)
}
const clickCard=async(label)=>{
 await page.waitForFunction(l=>Array.from(document.querySelectorAll('button[aria-label]')).some(e=>e.getAttribute('aria-label').startsWith(l+':')&&!e.disabled),{},label)
 await page.evaluate(l=>Array.from(document.querySelectorAll('button[aria-label]')).find(e=>e.getAttribute('aria-label').startsWith(l+':')).click(),label)
}
const previousYear=()=>page.click('button[aria-label="Previous year"]')
const text=()=>page.$eval('body',e=>e.innerText)
const ready=()=>page.waitForFunction(()=>document.body.innerText.includes('Your reflection is ready.'),{timeout:20000})
try{
 await page.goto(base,{waitUntil:'networkidle0'})
 await previousYear(); await clickCard('August 2025');await clickPrefix('Reflect on');await ready()
 assert.ok((await text()).includes('Based on 3 recorded days across 31 calendar days'))
 await clickPrefix('Where this comes from (','summary')
 assert.ok((await text()).includes('A quiet evening'))
 assert.ok(!(await text()).includes('DO_NOT_INCLUDE_PRIVATE'))
 await page.evaluate(t=>Array.from(document.querySelectorAll('div')).find(d=>d.querySelector(':scope > p')?.textContent?.trim()===t).querySelector('button').click(),'Protect a quiet evening and notice what it gives you.')
 await page.waitForFunction(()=>document.body.innerText.includes('What you’re carrying forward'))
 await clickText('Add how it went')
 const outcome=await page.$('textarea[name=outcome]')
 assert.ok(outcome)
 await fill('textarea[name=outcome]','I tried this once and it gave me space.')
 await clickText('Save what I noticed')
 await page.waitForFunction(()=>document.body.innerText.includes('Your experience is saved'))
 await clickText('I see it differently')
 await fill('textarea[name=note]','The quiet time felt lonely, not restful.')
 await clickText('Save response')
 await page.waitForFunction(()=>document.body.innerText.includes('Your information has changed'))
 await clickText('Refresh reflection');await ready()
 assert.ok(!(await text()).includes('Does this feel accurate?'))
 await clickText('Quarterly')
 await previousYear();await clickCard('Q3 2025');await clickPrefix('Reflect on');await ready()
 assert.ok((await text()).includes('Q3 2025'))
 assert.ok((await text()).includes('across 92 calendar days'))
 await clickText('Yearly Unwrapped')
 await clickCard('2025 Unwrapped');await clickPrefix('Reflect on');await ready()
 assert.ok((await text()).includes('2025 Unwrapped'))
 assert.ok((await text()).includes('Chapters of your year'))
 assert.ok((await text()).includes('A letter to carry with you'))
 await clickText('Choose a moment to share')
 assert.equal(await page.$eval('textarea[maxlength="450"]',e=>e.value),'')
 await fill('textarea[maxlength="450"]','A year of making room for myself.')
 assert.ok((await text()).includes('A year of making room for myself.'))
 const downloadPath=resolve('node_modules/.cache/reflections-tests/downloads-'+Date.now())
 await mkdir(downloadPath,{recursive:true})
 const cdp=await page.createCDPSession()
 await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath})
 await clickText('Download private preview card')
 let png
 for(let attempt=0;attempt<40;attempt++){
  try{png=await readFile(resolve(downloadPath,'my-year-unwrapped.png'));break}catch{await delay(250)}
 }
 assert.ok(png,'share card downloads successfully')
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','valid PNG file')
 assert.equal(png.readUInt32BE(16),1080)
 assert.equal(png.readUInt32BE(20),1080)
 // The year under way: nothing recorded in it yet, so it is told from the sky; then written again once something is.
 const Y=new Date().getFullYear(), todayNY=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())
 await clickCard(`${Y} Unwrapped`);await clickPrefix(`Unwrap ${Y} so far`);await ready()
 assert.ok((await text()).includes(`${Y} so far, unwrapped`),'an open year is titled as so far')
 assert.ok((await text()).includes('This is the sky’s side of your year.'),'the sky story ends on what can be added')
 assert.ok((await text()).includes('Saturn opposite your Sun'))
 assert.ok(!(await text()).includes('Chapters of your year'),'no recorded-days chart for a year told from the sky')
 await page.screenshot({path:'node_modules/.cache/reflections-tests/unwrapped-so-far-sky.png',fullPage:true})
 const added=await page.evaluate(async(date)=>(await fetch('/rest/v1/journal_entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:'11111111-1111-4111-8111-111111111111',title:'First entry',body:'I started writing things down today.',entry_date:date,include_in_insights:true,include_in_stelloquy:true})})).status,todayNY)
 assert.equal(added,200)
 await page.goto(base+'/unwrapped',{waitUntil:'networkidle0'})
 await page.waitForFunction(()=>document.body.innerText.includes('You’ve added to your year since this was written.'))
 await clickText('Refresh reflection');await ready()
 assert.ok((await text()).includes('the 1 day you’ve recorded so far'),'the refreshed year is written from what was recorded')
 assert.ok((await text()).includes('Chapters of your year'))
 assert.ok(!(await text()).includes('This is the sky’s side of your year.'))
 await page.screenshot({path:'node_modules/.cache/reflections-tests/unwrapped-so-far-lived.png',fullPage:true})
 await page.setViewport({width:390,height:844})
 await page.screenshot({path:'node_modules/.cache/reflections-tests/mobile-unwrapped.png',fullPage:true})
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'no horizontal overflow')
 await clickText('Monthly')
 await previousYear();await clickCard('July 2025');await clickPrefix('Reflect on');await ready()
 assert.ok((await text()).includes('There isn’t enough shared information'))
 await page.screenshot({path:'node_modules/.cache/reflections-tests/empty.png',fullPage:true})
 // Requests go through the actual route/service and isolated Postgres via the test adapter.
 const wrong=await page.evaluate(async()=>{const r=await fetch('/api/reflections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',report_id:'22222222-2222-4222-8222-222222222222',claim_key:'rest',verdict:'dismissed',note:''})});return r.status})
 assert.equal(wrong,400)
 const future=await page.evaluate(async()=>{const r=await fetch('/api/reflections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',kind:'month',year:2099,index:1})});return r.status})
 assert.equal(future,400)
 await clickText('Weekly')
 for(let i=0;i<40&&await page.$eval('section[aria-label="Choose a period"] h2',e=>e.textContent)!=='August 2025';i++) await page.click('button[aria-label="Previous month"]')
 assert.equal(await page.$eval('section[aria-label="Choose a period"] h2',e=>e.textContent),'August 2025')
 await clickCard('Week of Aug 4, 2025');await clickPrefix('Reflect on');await ready()
 assert.ok((await text()).includes('across 7 calendar days'),'weekly reflection covers Monday to Sunday')
 assert.ok((await text()).includes('Week of Aug 4, 2025'))
 await page.reload({waitUntil:'networkidle0'})
 await page.waitForFunction(()=>document.body.innerText.includes('I tried this once and it gave me space.'))
 assert.equal(await page.$('textarea[name=outcome]'),null,'saved intentions read as text until edited')
 assert.deepEqual(errors,[])
 console.log('Browser/API/PostgreSQL flow passed: weekly, monthly, quarterly, annual, evidence, excluded data, correction, intention/outcome persistence, empty period, future denial, wrong-report denial, sharing opt-in, PNG export and mobile layout.')
}finally{await browser.close()}
