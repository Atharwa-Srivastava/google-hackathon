import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {publicFiles} from './public-files.mjs';
await mkdir('.cloudflare/assets',{recursive:true});
for(const name of publicFiles)await copyFile('dist/'+name,'.cloudflare/assets/'+name);
await writeFile('.cloudflare/assets/_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Prepared allowlisted static assets; no keys or private data copied.');
