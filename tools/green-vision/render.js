import * as THREE from '../../resources/vendor/three.module.min.js';
const data=await fetch('tracking.json').then(r=>r.json());
const video=document.getElementById('plate');
await new Promise(resolve=>{if(video.readyState>=2)resolve();else video.addEventListener('loadeddata',resolve,{once:true})});
const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1920,1080);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-640,640,360,-360,.1,3000);
camera.position.z=1000;camera.lookAt(0,0,0);
const videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;
const plate=new THREE.Mesh(new THREE.PlaneGeometry(1280,720),new THREE.MeshBasicMaterial({map:videoTexture,toneMapped:false}));plate.position.z=-100;scene.add(plate);
scene.add(new THREE.HemisphereLight(0xdbe8eb,0x5a6750,1.25));
const sun=new THREE.DirectionalLight(0xffe9b8,1.8);sun.position.set(250,550,450);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-530,right:370,top:510,bottom:-480,near:.5,far:2200});sun.shadow.bias=-.0002;sun.shadow.normalBias=.1;scene.add(sun);
const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
let seed=1673;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
// Leaf sprigs preserve irregular silhouettes and lit leaf surfaces at landscape scale.
const leafCanvas=document.createElement('canvas');leafCanvas.width=128;leafCanvas.height=128;
const lc=leafCanvas.getContext('2d');lc.strokeStyle='#647744';lc.lineWidth=2;lc.beginPath();lc.moveTo(61,125);lc.lineTo(66,9);lc.stroke();
[[49,92,-.7],[79,83,.65],[46,65,-.8],[83,53,.7],[55,34,-.5],[68,15,.1],[87,105,.9]].forEach(([x,y,a],i)=>{lc.save();lc.translate(x,y);lc.rotate(a);const g=lc.createLinearGradient(-13,0,15,0);g.addColorStop(0,'#426044');g.addColorStop(.46,i%2?'#98a566':'#81985a');g.addColorStop(.53,'#506d38');g.addColorStop(1,'#314b31');lc.fillStyle=g;lc.beginPath();lc.moveTo(0,-19);lc.bezierCurveTo(15,-9,14,9,0,20);lc.bezierCurveTo(-12,8,-15,-7,0,-19);lc.fill();lc.restore()});
const leafTexture=new THREE.CanvasTexture(leafCanvas);leafTexture.colorSpace=THREE.SRGBColorSpace;
const roots=new Float32Array(32*32*4),rootTexture=new THREE.DataTexture(roots,32,32,THREE.RGBAFormat,THREE.FloatType);rootTexture.needsUpdate=true;
const uniforms={uRoots:{value:rootTexture},uWind:{value:0}};
function animatedMaterial(mat,foliage=false){
 mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute float treeId; uniform sampler2D uRoots; uniform float uWind;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition = vec4( transformed, 1.0 );
 mvPosition = instanceMatrix * mvPosition;
 vec4 root = texture2D(uRoots, (vec2(mod(treeId,32.0),floor(treeId/32.0))+0.5)/32.0);
 float growth = root.w;
 ${foliage?'mvPosition.x += sin(uWind * 1.8 + treeId * 0.7 + mvPosition.y * 3.0) * 0.012 * max(0.0,mvPosition.y-0.6);':''}
 mvPosition.xyz *= root.z * vec3(pow(growth,0.7),growth,pow(growth,0.7));
 mvPosition.xy += root.xy;
 mvPosition.z += root.y * -0.018;
 mvPosition = modelViewMatrix * mvPosition;
 gl_Position = projectionMatrix * mvPosition;`);
 };mat.customProgramCacheKey=()=>foliage?'forest-leaves-v1':'forest-bark-v1';return mat;
}
const leafMatrices=[],branchMatrices=[],leafIds=[],branchIds=[],leafColors=[];
const obj=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
data.trees.forEach((tree,index)=>{
 const turn=tree.turn;
 // Root and five tapering scaffold branches form a true three dimensional crown.
 function branch(start,end,radius){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end);obj.position.copy(a).lerp(b,.5);obj.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());obj.scale.set(radius,a.distanceTo(b),radius);obj.updateMatrix();branchMatrices.push(obj.matrix.clone());branchIds.push(index)}
 branch([0,0,0],[.025,1.25,0],.042);
 for(let j=0;j<6;j++){const a=j*2.399+turn;branch([0,.45+j*.1,0],[Math.cos(a)*.31,1.12+j*.10,Math.sin(a)*.25],.012)}
 for(let j=0;j<340;j++){
  const angle=j*2.399+turn,v=rand(),radius=Math.sqrt(rand())*.49*Math.sqrt(Math.max(.1,1-Math.pow((v-.46)*1.65,2)));
  obj.position.set(Math.cos(angle)*radius,(.52+v*1.32),Math.sin(angle)*radius*.85);
  obj.rotation.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI);
  obj.scale.setScalar(.19+rand()*.11);obj.updateMatrix();leafMatrices.push(obj.matrix.clone());leafIds.push(index);
  leafColors.push(new THREE.Color().setHSL(.22+rand()*.06,.06+rand()*.1,.65+rand()*.19));
 }
});
function instanced(geometry,mat,matrices,ids,colors){geometry.setAttribute('treeId',new THREE.InstancedBufferAttribute(new Float32Array(ids),1));const mesh=new THREE.InstancedMesh(geometry,mat,matrices.length);matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(colors)mesh.setColorAt(i,colors[i])});mesh.frustumCulled=false;scene.add(mesh);return mesh}
instanced(new THREE.PlaneGeometry(1,1),animatedMaterial(material(0xffffff,{map:leafTexture,alphaTest:.38,side:THREE.DoubleSide,roughness:1}),true),leafMatrices,leafIds,leafColors);
instanced(new THREE.CylinderGeometry(.63,1,1,5),animatedMaterial(material(0x756b55)),branchMatrices,branchIds);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const sc=shadowCanvas.getContext('2d'),shadowGradient=sc.createRadialGradient(64,64,5,64,64,62);shadowGradient.addColorStop(0,'rgba(18,29,28,.48)');shadowGradient.addColorStop(.45,'rgba(18,29,28,.23)');shadowGradient.addColorStop(1,'rgba(18,29,28,0)');sc.fillStyle=shadowGradient;sc.fillRect(0,0,128,128);
const shadows=[];const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
data.trees.forEach(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}));m.position.z=-20;scene.add(m);shadows.push(m)});
const greenCanvas=document.createElement('canvas');greenCanvas.width=128;greenCanvas.height=128;const gc=greenCanvas.getContext('2d'),gg=gc.createRadialGradient(64,64,2,64,64,63);gg.addColorStop(0,'rgba(56,84,45,.4)');gg.addColorStop(.4,'rgba(56,84,45,.19)');gg.addColorStop(1,'rgba(56,84,45,0)');gc.fillStyle=gg;gc.fillRect(0,0,128,128);const groundTexture=new THREE.CanvasTexture(greenCanvas),ground=[];
data.trees.forEach(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:groundTexture,transparent:true,depthWrite:false,toneMapped:false}));scene.add(m);ground.push(m)});
// Physical equipment occupies prepared terraces; the original hero campus is separate.
const mats={white:material(0xe4e6e2,{metalness:.22,roughness:.52}),edge:material(0x9caaa7,{metalness:.58,roughness:.37}),dark:material(0x24363a,{roughness:.46}),glass:material(0x243f49,{metalness:.45,roughness:.12}),concrete:material(0x8e938a),green:material(0x426b51),red:material(0x9f2820),solar:material(0x183341,{metalness:.5,roughness:.23}),tire:material(0x1e2524)};
function box(parent,w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function cylinder(parent,r,h,mat,x,y,z){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function cable(parent,points,r=.035){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,20,r,5,false),mats.dark);parent.add(m)}
function sign(parent,text,x,y,z,w,h){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#dce1d9';ctx.fillRect(0,0,512,128);ctx.fillStyle='#243e35';ctx.font='bold 63px Arial';ctx.textAlign='center';ctx.fillText(text,256,87);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.7}));m.position.set(x,y,z);parent.add(m)}
const ess=new THREE.Group(),ev=new THREE.Group();scene.add(ess,ev);
const facilityShadows=[];
for(const group of [ess,ev]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false,opacity:.65}));m.position.z=-15;scene.add(m);facilityShadows.push(m);group.rotation.set(.33,-.35,0)}
box(ess,15,.2,6.5,mats.concrete,0,0,0);
for(let k=0;k<3;k++){
 const x=(k-1)*4.5;box(ess,4,2.75,2.7,mats.white,x,1.5,0);box(ess,4.12,.13,2.82,mats.edge,x,2.92,0);
 for(let j=0;j<13;j++)box(ess,.038,2.5,.028,mats.edge,x-1.86+j*.3,1.55,1.363);
 box(ess,1.01,2.37,.065,mats.white,x-.5,1.48,1.405);box(ess,1.01,2.37,.065,mats.white,x+.54,1.48,1.405);
 for(const dx of [-.5,.54]){box(ess,.05,.43,.06,mats.dark,x+dx+.27,1.32,1.465);for(let j=0;j<6;j++)box(ess,.68,.035,.03,mats.dark,x+dx,2.26+j*.075,1.461)}
 box(ess,2.4,.36,1.2,mats.edge,x,3.14,-.28);for(let j=0;j<2;j++)cylinder(ess,.39,.1,mats.dark,x-.65+j*1.3,3.37,-.28);
 sign(ess,k===1?'SCE ENERGY':'ESS',x,2.72,1.466,2,.35);
}
for(let i=0;i<3;i++){box(ess,.88,1.55,.86,mats.white,-4+i*1.16,.9,2.1);box(ess,.4,.2,.03,mats.glass,-4+i*1.16,1.29,2.55)}
box(ev,17,.18,8,mats.concrete,0,0,0);
for(const x of [-6,6])for(const z of [-2.5,2.5])box(ev,.16,3.5,.16,mats.edge,x,1.78,z);
box(ev,16,.14,7,mats.edge,0,3.58,0);
for(let row=0;row<3;row++)for(let col=0;col<8;col++){const x=-7+col*2,z=-2.6+row*2;box(ev,1.92,.065,1.9,mats.solar,x,3.71,z);for(let line=1;line<6;line++)box(ev,.012,.003,1.86,mats.edge,x-.94+line*.31,3.746,z)}
sign(ev,'SCE  •  EV CHARGING',0,3.37,3.53,8,.52);
for(let i=0;i<3;i++){
 const x=-5+i*5;box(ev,.94,1.92,.55,mats.white,x,1.07,-1.9);box(ev,.6,.71,.04,mats.glass,x,1.42,-1.604);box(ev,.66,.14,.06,mats.green,x,1.99,-1.60);
 cable(ev,[[x+.5,1.72,-1.8],[x+1.1,1.18,-1.55],[x+1.05,.42,-1.25],[x+.52,.66,-1.59]]);
 const car=new THREE.Group();ev.add(car);car.position.set(x,.13,1.08);
 box(car,2.08,.68,3.5,i===1?mats.green:mats.white,0,.68,0);box(car,1.7,.61,1.92,mats.glass,0,1.24,-.16);box(car,1.75,.07,1.45,i===1?mats.green:mats.white,0,1.58,-.24);
 for(const xx of [-1.02,1.02])for(const z of [-1.14,1.09]){const wheel=cylinder(car,.38,.18,mats.tire,xx,.4,z);wheel.rotation.z=Math.PI/2;const hub=cylinder(car,.2,.192,mats.edge,xx,.4,z);hub.rotation.z=Math.PI/2}
 box(car,1.64,.12,.025,mats.white,0,.88,1.765);box(car,1.4,.1,.026,mats.red,0,.88,-1.765);
}
const energyPoints=Array.from({length:18},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1.25,8,6),new THREE.MeshBasicMaterial({color:0xd5dfac,transparent:true,opacity:.7,toneMapped:false}));scene.add(m);return m});
function positionAt(index,source){const f=Math.max(0,Math.min(data.tracks.length-1,(source-2)*12)),a=Math.floor(f),b=Math.min(data.tracks.length-1,a+1),u=f-a;return [data.tracks[a][index][0]*(1-u)+data.tracks[b][index][0]*u,data.tracks[a][index][1]*(1-u)+data.tracks[b][index][1]*u]}
function update(t,mode){
 const grown=mode==='idle';const source=grown?2+.6*(1-Math.cos(2*Math.PI*t/8))/2:2+3*(1-Math.cos(2*Math.PI*t/24))/2;
 data.trees.forEach((tree,i)=>{const p=positionAt(i,source),g=grown?1:smooth(tree.delay,tree.delay+3.8,t),scale=tree.size/1.88;
  roots[i*4]=p[0]-640;roots[i*4+1]=360-p[1];roots[i*4+2]=scale;roots[i*4+3]=Math.max(.0001,g);
  const shadow=shadows[i];shadow.position.set(p[0]-640-tree.size*.23,360-p[1]-tree.size*.04,-20);shadow.scale.set(tree.size*.9*g,tree.size*.27*g,1);shadow.visible=g>.005;
  const patch=ground[i];patch.position.set(p[0]-640,360-p[1],-25);patch.scale.set(tree.size*1.7*g,tree.size*.8*g,1);patch.visible=g>.01;
 });rootTexture.needsUpdate=true;uniforms.uWind.value=grown?t:Math.min(t,20);
 const a=positionAt(data.trees.length,source),b=positionAt(data.trees.length+1,source);
 [[ess,a,11.4,grown?1:smooth(10,13.4,t)],[ev,b,9.8,grown?1:smooth(13.2,16.8,t)]].forEach(([g,p,s,v],i)=>{g.position.set(p[0]-640,360-p[1],25);g.scale.set(s*Math.max(.001,v),s*Math.max(.001,v),s*Math.max(.001,v));g.visible=v>.001;const sh=facilityShadows[i];sh.position.set(p[0]-656,355-p[1],-15);sh.scale.set(s*22*v,s*5*v,1);sh.visible=v>.01});
 energyPoints.forEach((m,i)=>{const visible=grown||t>16.8;const u=((grown?t:t-17)*.14+i/18)%1;const x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u+17+Math.sin(u*Math.PI)*16;m.position.set(x-640,360-y,55);m.visible=visible;m.material.opacity=(.25+Math.sin(u*Math.PI)*.4)* (grown?1:smooth(16.8,18,t))});
 return source;
}
window.renderFrame=async(t=0,mode='intro')=>{const source=update(t,mode);if(Math.abs(video.currentTime-source)>.001){await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=source})}if(Math.abs(video.currentTime-source)>.015)throw Error('Source seek failed: serve this project with HTTP byte-range support.');videoTexture.needsUpdate=true;renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')};
window.renderInfo={trees:data.trees.length,leaves:leafMatrices.length};
await window.renderFrame(0);window.ready=true;
