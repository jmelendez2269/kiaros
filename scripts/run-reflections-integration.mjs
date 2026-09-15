// Runs the isolated integration suite; refuses to reuse an unrelated server.
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
const base='http://127.0.0.1:3701'
try { await fetch(base); throw new Error('Port 3701 is already in use. Stop that server before running this suite.') }
catch(error){ if(error.message?.includes('already in use')) throw error }
const run=(file)=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[file],{stdio:'inherit',windowsHide:true})
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(file+' exited '+code)))
})
const server=spawn(process.execPath,['scripts/reflections-test-server.mjs'],{stdio:'inherit',windowsHide:true})
try{
 let ready=false
 for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Fixture server stopped');try{const r=await fetch(base+'/api/reflections');if(r.ok){ready=true;break}}catch{}await delay(500)}
 if(!ready)throw new Error('Fixture server did not become ready')
 await run('scripts/check-reflections-browser.mjs')
 await run('scripts/check-reflections-api.mjs')
}finally{server.kill()}
