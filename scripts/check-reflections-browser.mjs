import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const page=await browser.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message))
const base='http://127.0.0.1:3701'
const clickText=async(text,selector='button')=>{
 await page.waitForFunction((t,s)=>Array.from(document.querySelectorAll(s)).some(e=>e.textContent?.trim()===t),{},text,selector)
 await page.evaluate((t,s)=>Array.from(document.querySelectorAll(s)).find(e=>e.textContent?.trim()===t).click(),text,selector)
}
const fill=async(selector,value)=>{await page.$eval(selector,(e,v)=>{const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value').set;setter.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},value)}
const text=()=>page.$eval('body',e=>e.innerText)
const ready=()=>page.waitForFunction(()=>document.body.innerText.includes('Your reflection is ready.'),{timeout:20000})
try{
 await page.goto(base,{waitUntil:'networkidle0'})
 await fill('input[type=number]','2025'); await page.select('section[aria-label="Create a reflection"] select','8')
 await clickText('Reflect on this period');await ready()
 assert.ok((await text()).includes('Based on 3 recorded days across 31 calendar days'))
 await clickText('Why am I seeing this?','summary')
 assert.ok((await text()).includes('A quiet evening'))
 assert.ok(!(await text()).includes('DO_NOT_INCLUDE_PRIVATE'))
 await clickText('Protect a quiet evening and notice what it gives you.','summary')
 await clickText('Carry this forward')
 await page.waitForFunction(()=>document.body.innerText.includes('What you’re carrying forward'))
 const outcome=await page.$('textarea[name=outcome]')
 assert.ok(outcome)
 await fill('textarea[name=outcome]','I tried this once and it gave me space.')
 await clickText('Save what I noticed')
 await page.waitForFunction(()=>document.body.innerText.includes('Your experience is saved'))
 await clickText('Does this feel accurate?','summary')
 await page.select('select[name=verdict]','corrected')
 await fill('textarea[name=note]','The quiet time felt lonely, not restful.')
 await clickText('Save response')
 await page.waitForFunction(()=>document.body.innerText.includes('Your information has changed'))
 await clickText('Refresh reflection');await ready()
 assert.ok(!(await text()).includes('Does this feel accurate?'))
 await clickText('Quarterly')
 await fill('input[type=number]','2025');await page.select('section[aria-label="Create a reflection"] select','3')
 await clickText('Reflect on this period');await ready()
 assert.ok((await text()).includes('Q3 2025'))
 assert.ok((await text()).includes('across 92 calendar days'))
 await clickText('Yearly Unwrapped')
 await fill('input[type=number]','2025');await clickText('Reflect on this period');await ready()
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
 await page.setViewport({width:390,height:844})
 await page.screenshot({path:'node_modules/.cache/reflections-tests/mobile-unwrapped.png',fullPage:true})
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'no horizontal overflow')
 await clickText('Monthly')
 await fill('input[type=number]','2025');await page.select('section[aria-label="Create a reflection"] select','7')
 await clickText('Reflect on this period');await ready()
 assert.ok((await text()).includes('There isn’t enough shared information'))
 await page.screenshot({path:'node_modules/.cache/reflections-tests/empty.png',fullPage:true})
 // Requests go through the actual route/service and isolated Postgres via the test adapter.
 const wrong=await page.evaluate(async()=>{const r=await fetch('/api/reflections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',report_id:'22222222-2222-4222-8222-222222222222',claim_key:'rest',verdict:'dismissed',note:''})});return r.status})
 assert.equal(wrong,400)
 const future=await page.evaluate(async()=>{const r=await fetch('/api/reflections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',kind:'month',year:2099,index:1})});return r.status})
 assert.equal(future,400)
 await page.reload({waitUntil:'networkidle0'})
 assert.equal(await page.$eval('textarea[name=outcome]',e=>e.value),'I tried this once and it gave me space.')
 assert.deepEqual(errors,[])
 console.log('Browser/API/PostgreSQL flow passed: monthly, quarterly, annual, evidence, excluded data, correction, intention/outcome persistence, empty period, future denial, wrong-report denial, sharing opt-in, PNG export and mobile layout.')
}finally{await browser.close()}
