/* Regression: solar entry and loop reset must never resize or pan the media. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SCE_QA_URL||'http://127.0.0.1:8766/';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const results=[];
  for(const [width,height] of [[1920,1080],[820,1180],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},locale:'ko-KR'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.hero-landscape').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#vision-film').currentTime>.1);
    for(const [phase,start] of [['solar-entry',35.5],['loop-reset',58.5]]){
      const result=await page.evaluate(async start=>{
        const video=document.querySelector('#vision-film');video.pause();
        await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=start;});
        const samples=[],presented=[];let done=false,frameId=0,waiting=0;
        const onWait=()=>waiting++;
        video.addEventListener('waiting',onWait);
        function sample(now){
          if(done)return;
          const rect=video.getBoundingClientRect(),style=getComputedStyle(video);
          samples.push({now,time:video.currentTime,x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,position:style.objectPosition});
          requestAnimationFrame(sample);
        }
        function frame(now,meta){
          if(done)return;
          presented.push({time:meta.mediaTime,at:meta.expectedDisplayTime});
          frameId=video.requestVideoFrameCallback(frame);
        }
        const q0=video.getVideoPlaybackQuality();requestAnimationFrame(sample);
        if(video.requestVideoFrameCallback)frameId=video.requestVideoFrameCallback(frame);
        await video.play();await new Promise(resolve=>setTimeout(resolve,4500));
        done=true;video.pause();video.removeEventListener('waiting',onWait);
        if(frameId)video.cancelVideoFrameCallback(frameId);
        const q1=video.getVideoPlaybackQuality();
        const spans=Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.max(...samples.map(s=>s[key]))-Math.min(...samples.map(s=>s[key]))]));
        const gaps=presented.slice(1).map((x,i)=>x.at-presented[i].at);
        const mediaTime=video.currentTime,rect=video.getBoundingClientRect();
        await new Promise(resolve=>setTimeout(resolve,250));
        return {samples:samples.length,presented:presented.length,spans,positions:[...new Set(samples.map(s=>s.position))],
          maxPresentationGapMs:Math.round(Math.max(0,...gaps)),waiting,
          dropped:q1.droppedVideoFrames-q0.droppedVideoFrames,
          crossedSolarEntry:samples.some(s=>s.time>=35&&s.time<36)&&samples.some(s=>s.time>39&&s.time<41),
          looped:samples.some(s=>s.time>61)&&samples.some(s=>s.time<2),
          pausedStable:video.currentTime===mediaTime&&video.getBoundingClientRect().width===rect.width};
      },start);
      console.log(JSON.stringify({width,phase,...result}));
      assert.ok(result.samples>50,'Enough samples to assess both transition boundaries');
      for(const [key,span] of Object.entries(result.spans))assert.ok(span<.01,phase+': media '+key+' must remain fixed');
      assert.equal(result.positions.length,1,phase+': no object-position pan');
      assert.equal(result[phase==='solar-entry'?'crossedSolarEntry':'looped'],true,phase+': boundary was played through');
      assert.equal(result.pausedStable,true);assert.deepEqual(errors,[]);
      results.push({width,phase,...result});
    }
    await page.close();
  }
  await browser.close();console.log(JSON.stringify({passed:true,results}));
})().catch(e=>{console.error(e);process.exit(1)});
