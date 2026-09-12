/* Run with NODE_PATH resolving Playwright. No requests are sent to the contact form. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.SCE_QA_URL||'http://127.0.0.1:8766/';
const out=process.env.SCE_QA_OUT||path.join(__dirname,'qa-output');
fs.mkdirSync(out,{recursive:true});
const errors=[],requests=[],results=[];
const pauseSeek=async(page,t)=>page.evaluate(t=>new Promise(resolve=>{
 const v=document.querySelector('#vision-film');v.pause();
 v.addEventListener('seeked',()=>resolve(),{once:true});v.currentTime=t;
}),t);
const stats=page=>page.locator('.impact-values').innerText();
(async()=>{
 const browser=await chromium.launch({channel:process.env.SCE_BROWSER_CHANNEL||'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#vision-film').currentTime>.1);
 const film=await page.locator('#vision-film').evaluate(v=>({muted:v.muted,loop:v.loop,controls:v.controls,width:v.videoWidth,height:v.videoHeight,duration:v.duration,src:v.currentSrc}));
 assert.equal(film.muted,true);assert.equal(film.loop,true);assert.equal(film.controls,false);
 assert.equal(film.width,1920);assert.ok(Math.abs(film.duration-38)<.1);
 assert.equal(await page.locator('.vision-band,#solar-scene,#scene-toggle').count(),0);
 const model=await page.evaluate(()=>window.SCE_IMPACT);
 assert.ok(Math.abs(model.capacityKw/1000-30.8793888889)<.000001);
 assert.equal(Math.round(model.annualTco2e),15463);
 assert.equal(Math.round(model.equivalentPines),2342903);
 await pauseSeek(page,16);
 const partialCapacity=Number(await page.locator('[data-impact="capacity"]').innerText());
 assert.ok(partialCapacity>0&&partialCapacity<30.9);
 await pauseSeek(page,30);const partialTrees=await page.locator('[data-impact="trees"]').innerText();
 assert.notEqual(partialTrees,'234.3만');
 await pauseSeek(page,35.75);
 assert.equal(await page.locator('[data-impact="capacity"]').innerText(),'30.9');
 assert.equal(await page.locator('[data-impact="carbon"]').innerText(),'15,463');
 assert.equal(await page.locator('[data-impact="trees"]').innerText(),'234.3만');
 await page.screenshot({path:path.join(out,'desktop.png')});
 await page.locator('[data-impact-open]').click();
 assert.ok((await page.locator('#impact-method').innerText()).includes('30.9MW'));
 assert.doesNotMatch(await page.locator('#impact-method').innerText(), /매출|집계 연도/);
 await page.screenshot({path:path.join(out,'calculation-basis.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#impact-method').isVisible(),false);
 for(const lang of ['en','ja','ko']){
  await page.locator('#language').selectOption(lang);
  assert.doesNotMatch(await page.locator('#impact-method').innerText(), /매출|revenue|売上/i);
  results.push({lang,stats:await stats(page)});
 }
 await page.locator('#language').blur();
 await pauseSeek(page,37.7);await page.locator('#vision-film').evaluate(v=>v.play());
 await page.waitForFunction(()=>document.querySelector('#vision-film').currentTime<3);
 assert.equal(await page.locator('[data-impact="trees"]').innerText(),'234.3만');
 const loopedAt=await page.locator('#vision-film').evaluate(v=>v.currentTime);
 for(const id of ['modules','rooftop','pvsyst','drone','cctv']){
  await page.evaluate(id=>location.hash=id,id);
  await page.waitForFunction(id=>document.body.dataset.serviceView===id,id);
  await page.waitForFunction(()=>document.querySelector('#vision-film').paused);
  assert.equal(await page.locator('#'+id).isVisible(),true);
  await page.locator('#'+id+' [data-scene]').first().waitFor({state:'visible'});
  await page.waitForFunction(id=>document.querySelector('#'+id+' [data-scene]').classList.contains('scene-ready'),id,{timeout:30000});
  results.push({service:id,canvas:true});
 }
 await page.evaluate(()=>location.hash='hero');
 await page.waitForFunction(()=>!document.querySelector('#vision-film').paused);
 const range=await ctx.request.get(film.src,{headers:{Range:'bytes=1024-2047'}});
 assert.equal(range.status(),206);assert.equal((await range.body()).length,1024);
 assert.ok(!requests.some(u=>/green-(intro|idle)-/.test(u)));
 await ctx.close();

 for(const mode of ['mobile','tablet','reduced','save-data','deep-route','failed-video']){
  const mobile=mode==='mobile',tablet=mode==='tablet';
  const c=await browser.newContext({viewport:{width:mobile?390:tablet?820:1440,height:tablet?1180:1000},locale:mode==='deep-route'?'ja-JP':'ko-KR',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const p=await c.newPage();const movies=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(r.url().includes('energy-construction-'))movies.push(r.url())});
  if(mode==='save-data')await p.addInitScript(()=>Object.defineProperty(navigator.connection,'saveData',{value:true}));
  if(mode==='failed-video')await p.route('**/energy-construction-*.mp4',route=>route.abort());
  await p.goto(base+(mode==='deep-route'?'#cctv':''),{waitUntil:'domcontentloaded'});
  if(mobile||tablet){
   await p.waitForFunction(()=>document.querySelector('#vision-film').currentTime>.1);
   assert.equal(await p.locator('#vision-film').evaluate(v=>v.videoWidth),mobile?960:1920);
   await pauseSeek(p,35.75);await p.screenshot({path:path.join(out,mode+'.png'),fullPage:false});
  }else if(mode==='failed-video'){
   await p.waitForFunction(()=>document.querySelector('#hero').dataset.visionState==='fallback');
   assert.equal(await p.locator('[data-impact="capacity"]').innerText(),'30.9');
  }else{
   await p.waitForTimeout(1200);
   assert.equal(movies.length,0);
   if(mode!=='deep-route')assert.equal(await p.locator('[data-impact="trees"]').innerText(),'234.3만');
   else assert.equal(await p.locator('html').getAttribute('lang'),'ja');
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  results.push({mode,movieRequests:movies.length});await c.close();
 }
 await browser.close();
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base,film,loopedAt,errors,results},null,2));
 console.log(JSON.stringify({passed:true,film,loopedAt,checks:results.length,errors}));
})().catch(e=>{console.error(e);process.exit(1)});
