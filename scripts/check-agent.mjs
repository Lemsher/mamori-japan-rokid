import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve('agent'),manifest=JSON.parse(fs.readFileSync(path.join(root,'app.json')));
assert(manifest.pages.length>0);
for(const route of manifest.pages){
  const file=path.join(root,route+'.ink'),s=fs.readFileSync(file,'utf8');
  for(const tag of ['script def','script setup','page','style'])assert(s.includes('<'+tag+'>'),file+' missing '+tag);
  JSON.parse(s.match(/<script def>([\s\S]*?)<\/script>/)[1]);
  const js=s.match(/<script setup>([\s\S]*?)<\/script>/)[1];
  const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:js,encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
  assert(js.includes('export default'),file+' must export page');
  for(const m of js.matchAll(/from ['"](\.[^'"]+)['"]/g))assert(fs.existsSync(path.resolve(path.dirname(file),m[1])),m[1]);
  const bindings=[...s.matchAll(/bind(?:tap|input)="([^"]+)"/g)].map(m=>m[1]);
  for(const name of bindings)assert(new RegExp('(?:async\\s+)?'+name+'\\s*\\(').test(js),'missing handler '+name);
}
const files=fs.readdirSync(root,{recursive:true}).filter(f=>fs.statSync(path.join(root,f)).isFile());
assert(!files.some(f=>/\.env|config\.local/.test(f)),'secrets in package source');
console.log('AIUI manifest, routes, SFC syntax, imports and event bindings passed.');
