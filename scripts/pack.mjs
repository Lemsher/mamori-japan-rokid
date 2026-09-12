import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativePreview} from './native-preview.mjs';
fs.mkdirSync('dist',{recursive:true});
const run=args=>{const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);};
run(['scripts/check-agent.mjs']);
const cli='node_modules/@yodaos-pkg/aix-cli/dist/cli.js';
const version=JSON.parse(fs.readFileSync('package.json')).version;
run([cli,'pack','agent','-o',`dist/mamori-japan-${version}.aix`,'--engine','0.17.0']);
run([cli,'list',`dist/mamori-japan-${version}.aix`]);
run([cli,'preview','agent','--html-out','preview/aiui-runtime.html']);
// Pin the browser engine, and use documented OpenBundleOptions for full-screen QA.
const previewPath='preview/aiui-runtime.html';
let html=fs.readFileSync(previewPath,'utf8').replace('https://esm.sh/@yodaos-pkg/ink"','https://esm.sh/@yodaos-pkg/ink@0.17.0"');
// Ink 0.17 requires a running frame loop to consume asynchronous input and IO.
html=html.replace('appFps: 30,','appFps: 30,\n          autoRender: true,').replace('scaleFactor: window.devicePixelRatio || 1','scaleFactor: 1');
const original='view.openBundle({\n          appId: state.appId,\n          files: bundleFiles(state.files),\n        });';
if(!html.includes(original))throw new Error('CLI preview mount changed: review the full-screen patch');
html=html.replace(original,`const launch = new URLSearchParams(location.search);
        view.openBundle({ appId: state.appId, files: bundleFiles(state.files),
          initialPage: ['home','location','alert','guide','shelters'].includes(launch.get('page')) ? 'pages/'+launch.get('page')+'/index' : 'pages/home/index',
          query: {hazard:launch.get('hazard') || 'prepare',lang:launch.get('lang') || 'ja',query:launch.get('query') || '',cityCode:launch.get('cityCode') || '',blocked:launch.get('blocked') || 'false',action:launch.get('action') || ''},
          hostOptions:{initialTarget:launch.get('target') === '_current' ? '_current' : '_blank', initialFocus:'focus'} });
        view.setInteractive(launch.get('interactive') !== 'false');
        view.focus();`);
// Match Studio's explicit Ink input dispatch. DOM keyboard events alone do not
// reliably activate the Ink navigation focus in CLI 0.8.2's static preview.
html=html.replace('triggerGlobalHook(key);\n            currentCanvas.focus();\n            dispatchKeyboardEvent("keydown", key);\n            dispatchKeyboardEvent("keyup", key);',`currentView.setInteractive(true);
            currentView.focus();
            currentView.notifyUserInteraction();
            const now = Date.now();
            currentView.dispatchInput("keydown", "GlobalHook", now);
            currentView.dispatchInput("keyup", "GlobalHook", now + 1);
            currentView.dispatchInput("keydown", key, now + 2);
            currentView.dispatchInput("keyup", key, now + 3);
            currentView.requestRender();
            currentCanvas.focus();`);
html=html.replace(/(<script id="aix-preview-config" type="application\/json">)([\s\S]*?)(<\/script>)/,(_,start,json,end)=>{const config=JSON.parse(json);config.initialState.version=version;config.initialState.files=config.initialState.files.filter(f=>!f.path.endsWith('.DS_Store'));return start+JSON.stringify(config)+end;});
fs.writeFileSync(previewPath,nativePreview(html));
// Refresh the complete offline shell whenever shipped UI/modules change.
const swPath='preview/sw.js';
const sw=fs.readFileSync(swPath,'utf8');
const assetPaths=[...sw.match(/const ASSETS=\[([^;]+)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const digest=createHash('sha256');
for(const asset of assetPaths)digest.update(fs.readFileSync(asset.startsWith('/modules/')?'agent'+asset:'preview'+(asset==='/'?'/index.html':asset)));
fs.writeFileSync(swPath,sw.replace(/const CACHE='[^']+';/,`const CACHE='mamori-shell-${version}-${digest.digest('hex').slice(0,12)}';`));
