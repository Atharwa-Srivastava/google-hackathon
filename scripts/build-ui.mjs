import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
await build({entryPoints:['src/main.tsx'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'dist/studio.js',define:{'process.env.NODE_ENV':'"production"'}});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/studio.css','-o','dist/studio.css','--minify'],{stdio:'inherit'});
console.log('Built React studio interface. Existing scanner modules are retained.');
