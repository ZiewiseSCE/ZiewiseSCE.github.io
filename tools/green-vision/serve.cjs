const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../..'));
const port=Number(process.argv[3]||8765);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp4':'video/mp4','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
 let file;try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p))}catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return}
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416).end();return}start=m[1]?Number(m[1]):Math.max(0,stat.size-Number(m[2]));end=m[1]&&m[2]?Math.min(Number(m[2]),stat.size-1):stat.size-1;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')res.end();else{const stream=fs.createReadStream(file,{start,end});stream.pipe(res);res.on('close',()=>stream.destroy())}
 });
}).listen(port,'127.0.0.1',()=>console.log(`Preview with video ranges: http://127.0.0.1:${port}/`));
