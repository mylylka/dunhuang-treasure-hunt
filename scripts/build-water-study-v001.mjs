import {build} from 'vite';
import {copyFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'outputs/water-study/v001');
await build({configFile:false,root,base:'./',publicDir:false,build:{outDir:out,emptyOutDir:false,chunkSizeWarningLimit:1500,rollupOptions:{input:resolve(root,'water-study-v001.html')}}});
for(const asset of ['environment-sample/v002/tree-a.glb','environment-sample/v002/shrub-a.glb','music-pavilion/v005/music-pavilion.glb']){const target=resolve(out,'assets/world',asset);await mkdir(dirname(target),{recursive:true});await copyFile(resolve(root,'public/assets/world',asset),target);}
await copyFile(resolve(out,'water-study-v001.html'),resolve(out,'index.html'));
console.log(`静水小样构建完成：${out}`);
