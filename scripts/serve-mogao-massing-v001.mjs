import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../outputs/mogao-massing/v001');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'};
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost:4210').pathname);const file=resolve(root,`.${path==='/'?'/index.html':path}`);if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-cache','Content-Length':data.length});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(4210,'0.0.0.0',()=>console.log('莫高窟整山体量 http://localhost:4210'));
