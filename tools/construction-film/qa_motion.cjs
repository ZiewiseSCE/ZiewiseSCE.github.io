/* Regression: the final camera framing must follow playback, not timeupdate. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SCE_QA_URL||'http://127.0.0.1:8766/';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const results=[];
  for(const [width,fallback] of [[1920,false],[390,false],[1920,true]]){
    const page=await browser.newPage({viewport:{width,height:width===390?844:1080},locale:'ko-KR'});
    if(fallback)await page.addInitScript(()=>{
      HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;
      HTMLVideoElement.prototype.cancelVideoFrameCallback=undefined;
    });
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('.hero-landscape').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#vision-film').currentTime>.1);
    const result=await page.evaluate(async()=>{
      const video=document.querySelector('#vision-film');video.pause();
      await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=59.8;});
      const samples=[];let done=false;
      function sample(now){
        if(done)return;
        const rect=video.getBoundingClientRect();
        samples.push({now,time:video.currentTime,width:rect.width,position:parseFloat(getComputedStyle(video).objectPosition)});
        requestAnimationFrame(sample);
      }
      const q0=video.getVideoPlaybackQuality();requestAnimationFrame(sample);await video.play();
      await new Promise(resolve=>setTimeout(resolve,3100));done=true;video.pause();
      const q1=video.getVideoPlaybackQuality();
      const tail=samples.filter(x=>x.time>=60&&x.time<62);
      const pairs=tail.slice(1).map((x,i)=>({width:Math.abs(x.width-tail[i].width),position:Math.abs(x.position-tail[i].position)}));
      const mediaTime=video.currentTime,rect=video.getBoundingClientRect();
      await new Promise(resolve=>setTimeout(resolve,300));
      return {samples:tail.length,maxWidthStep:Math.max(...pairs.map(x=>x.width)),maxPositionStep:Math.max(...pairs.map(x=>x.position)),
        dropped:q1.droppedVideoFrames-q0.droppedVideoFrames,looped:mediaTime<2,
        pausedStable:video.currentTime===mediaTime&&video.getBoundingClientRect().width===rect.width};
    });
    assert.ok(result.samples>30,'Enough samples to assess motion');
    assert.ok(result.maxWidthStep<12,'No large quarter-second desktop jumps');
    assert.ok(result.maxPositionStep<3,'No large quarter-second mobile pans');
    assert.equal(result.looped,true);assert.equal(result.pausedStable,true);
    results.push({width,fallback,...result});await page.close();
  }
  await browser.close();console.log(JSON.stringify({passed:true,results}));
})().catch(e=>{console.error(e);process.exit(1)});
