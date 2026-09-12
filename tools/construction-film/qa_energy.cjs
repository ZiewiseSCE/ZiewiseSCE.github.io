/* Rendered media + caption integration. No contact form submission. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.SCE_QA_URL||'http://127.0.0.1:8766/';
const out=process.env.SCE_QA_OUT||path.join(__dirname,'qa-energy-output');
fs.mkdirSync(out,{recursive:true});
const seek=async(p,t)=>p.evaluate(t=>new Promise(resolve=>{
 const v=document.querySelector('#vision-film');v.pause();v.addEventListener('seeked',resolve,{once:true});v.currentTime=t;
}),t);
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const errors=[],results=[];
 for(const [w,h] of [[1366,768],[1920,1080],[2560,1440],[820,1180],[390,844],[320,740]]){
  const p=await b.newPage({viewport:{width:w,height:h},locale:'ko-KR'});
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base,{waitUntil:'domcontentloaded'});
  await p.locator('.hero-landscape').scrollIntoViewIfNeeded();
  await p.waitForFunction(()=>document.querySelector('#vision-film').currentTime>.1);
  assert.ok(Math.abs(await p.locator('#vision-film').evaluate(v=>v.duration)-62)<.01);
  for(const lang of ['ko','en','ja']){
   await p.locator('#language').selectOption(lang);await p.locator('#language').blur();
   const charges=[];
   for(const [t,phase] of [[41,'morning'],[47,'day'],[51.8,'day'],[54,'evening'],[59,'night']]){
    await seek(p,t);
    await p.waitForFunction(phase=>document.querySelector('#energy-cycle').dataset.phase===phase,phase);
    assert.equal(await p.locator('#energy-cycle').isVisible(),true);
    const soc=parseInt(await p.locator('[data-energy-percent]').innerText(),10);charges.push(soc);
    assert.ok(soc>=22&&soc<=92);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const card=await p.locator('#energy-cycle').boundingBox();assert.ok(card.x>=0&&card.x+card.width<=w);
    if(w>1100){
      const grid=await p.locator('.hero-grid').boundingBox(),copy=await p.locator('.hero-copy').boundingBox();
      assert.ok(Math.abs(copy.y+copy.height/2-grid.y-grid.height/2)<1);
      assert.ok(card.x>=copy.x+copy.width,`${w}-${lang} card obscures copy`);
    }else{
      const film=await p.locator('.hero-landscape').boundingBox();
      assert.ok(card.y>=film.y+film.height-2,`${w}-${lang} card obscures film`);
    }
    if(lang==='ko'&&[41,47,59].includes(t)){
      if(w<=1100)await p.locator('.hero-landscape').scrollIntoViewIfNeeded();
      await p.screenshot({path:path.join(out,`${w}-${phase}.png`)});
    }
   }
   assert.ok(charges[0]<charges[1]&&charges[1]<charges[2]);
   assert.ok(charges[2]>charges[3]&&charges[3]>charges[4]);
   const copy=await p.locator('#energy-cycle').innerText();
   assert.match(copy,lang==='ko'?/운영 예시/:lang==='en'?/Illustrative/:/運転イメージ/);
   if(lang!=='ko')assert.doesNotMatch(copy,/[가-힣]/);
   results.push({w,lang,charges});
  }
  await p.close();
 }
 for(const reduced of ['reduce','save-data','failure']){
  const p=await b.newPage({viewport:{width:1366,height:768},reducedMotion:reduced==='reduce'?'reduce':'no-preference',locale:'en-US'});
  const movies=[];p.on('request',r=>{if(r.url().includes('energy-construction-'))movies.push(r.url())});
  if(reduced==='save-data')await p.addInitScript(()=>Object.defineProperty(navigator.connection,'saveData',{value:true}));
  if(reduced==='failure')await p.route('**/energy-construction-*.mp4*',r=>r.abort());
  await p.goto(base,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#energy-cycle').dataset.phase==='still'&&!document.querySelector('#energy-cycle').hidden);
  assert.equal(await p.locator('[data-energy-percent]').innerText(),'ESS');
  assert.match(await p.locator('#energy-cycle').innerText(),/Store by day/);
  if(reduced!=='failure')assert.equal(movies.length,0);
  results.push({mode:reduced,movies:movies.length});await p.close();
 }
 await b.close();assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base,results,errors},null,2));
 console.log(JSON.stringify({passed:true,cases:results.length,errors}));
})().catch(e=>{console.error(e);process.exit(1)});
