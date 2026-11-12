const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const harness=fs.readFileSync('test.cjs','utf8').split('(async()=>')[0];
function measure(source){let setup=harness.replace("fs.readFileSync(__dirname+'/app.js','utf8')",'SOURCE');const box={require,__dirname:process.cwd(),SOURCE:source,console};vm.createContext(box);vm.runInContext(setup+`;globalThis.testContext=ctx;`,box);const ctx=box.testContext;let draws=0;ctx.window.syncCitySurface=()=>draws++;ctx.scrollY=4000;vm.runInContext('render()',ctx);draws=0;for(let i=0;i<120;i++){ctx.scrollY=4000+i;vm.runInContext('render()',ctx)}return draws;}
const old=measure(cp.execFileSync('git',['show','005b4160fb29ce5df4974401561f0a4a9f7f6c35:app.js'],{encoding:'utf8'}));const now=measure(fs.readFileSync('app.js','utf8'));assert.equal(old,120);assert.equal(now,0);console.log(`PASS 120 city-scroll events: redundant intro-driven city draws ${old} → ${now}. Deterministic scheduling count, not FPS.`);
const source=fs.readFileSync('city-controller.js','utf8');assert(source.includes("p>=.985&&settledSurfaceKey===viewportKey"));assert(source.includes('current===lastUIProgress&&reading===lastUIReading'));assert(fs.readFileSync('city-route-v18.js','utf8').includes('nextProgress===lastCameraProgress'));for(const file of ['app.js','city-controller.js','city-route-v18.js'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('dist/'+file,'utf8'));console.log('PASS settled surface/UI/camera guards and source/dist parity.');
function measureReading(source){
 let setup=harness.replace("fs.readFileSync(__dirname+'/app.js','utf8')",'SOURCE');const box={require,__dirname:process.cwd(),SOURCE:source,console};vm.createContext(box);vm.runInContext(setup+`;globalThis.testContext=ctx;`,box);const ctx=box.testContext;let geometryReads=0,scheduled=0,laptopDraws=0;
 for(const selector of ['.intro','.stage'])Object.defineProperty(ctx.document.querySelector(selector),'offsetHeight',{get(){geometryReads++;return selector==='.intro'?3960:900;}});
 ctx.window.renderLaptop=()=>laptopDraws++;ctx.requestAnimationFrame=()=>scheduled++;ctx.document.body.classList.add('reading-mode');
 for(let i=0;i<120;i++){ctx.scrollY=100+i;vm.runInContext('render();requestRender()',ctx);}
 return {geometryReads,scheduled,laptopDraws};
}
const readingBefore=measureReading(cp.execFileSync('git',['show','2ea36d54733c8dc457320a0a5d8255cd0f87f182:app.js'],{encoding:'utf8'})),readingAfter=measureReading(fs.readFileSync('app.js','utf8'));
assert(readingBefore.geometryReads>=240);assert.deepEqual(readingAfter,{geometryReads:0,scheduled:0,laptopDraws:0});
console.log('PASS Reading bypasses the hidden introduction: '+JSON.stringify(readingBefore)+' → '+JSON.stringify(readingAfter)+' over 120 simulated scroll updates. Counts, not FPS.');
