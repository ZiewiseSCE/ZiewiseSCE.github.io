const {chromium}=require('playwright');
const {spawn,execFileSync}=require('node:child_process'),fs=require('fs'),path=require('path'),{once}=require('events');
const ffmpeg=execFileSync('python',['-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8',windowsHide:true}).trim();
const out=path.join(__dirname,'../../resources/media/green-vision');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const channel=process.env.SCE_BROWSER_CHANNEL||'msedge';
 const b=await chromium.launch({...(channel==='chromium'?{}:{channel}),headless:true,args:['--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1920,height:1080}});
 p.on('pageerror',e=>{throw e});await p.goto('http://127.0.0.1:8765/tools/green-vision/render.html');await p.waitForFunction(()=>window.ready,null,{timeout:90000});
 for(const [mode,duration] of [['intro',24],['idle',8]]){
  const enc=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,`green-${mode}-1080.mp4`)],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let err='';enc.stderr.on('data',d=>err+=d);const completion=once(enc,'close');
  for(let frame=0;frame<duration*24;frame++){
   const raw=await p.evaluate(({t,mode})=>window.renderFrame(t,mode),{t:frame/24,mode});
   const buffer=Buffer.from(raw.split(',')[1],'base64');if(!enc.stdin.write(buffer))await once(enc.stdin,'drain');
   if(frame%96===0)console.log(`${mode}: ${frame}/${duration*24}`);
  }
  enc.stdin.end();const [code]=await completion;if(code!==0)throw Error(err);console.log(`${mode}: encoded`);
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path.join(out,`green-${mode}-1080.mp4`),'-vf','scale=960:540','-an','-c:v','libx264','-preset','medium','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,`green-${mode}-540.mp4`)],{windowsHide:true});
 }
 const sharp=require('sharp');
 for(const [time,name] of [[0,'start'],[24,'forest']]){const img=await p.evaluate(time=>window.renderFrame(time),time);await sharp(Buffer.from(img.split(',')[1],'base64')).webp({quality:87}).toFile(path.join(out,`green-${name}.webp`))}
 await b.close();console.log(JSON.stringify(fs.readdirSync(out).map(file=>({file,bytes:fs.statSync(path.join(out,file)).size}))));
})().catch(e=>{console.error(e);process.exit(1)});
