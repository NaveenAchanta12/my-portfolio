const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('city-controller.js','utf8');
const fn=code.slice(code.indexOf('function renderCitySurface('),code.indexOf('\nwindow.syncCitySurface='));
const events=[],ctx={window:{introProgress:.85},performance:{now:()=>100},reading:false,document:{hidden:false},current:.6,target:.7,syncCitySurface:p=>events.push(['resize',p]),draw:t=>events.push(['draw',t])};vm.createContext(ctx);vm.runInContext(fn,ctx);
for(const p of [.1,.75,.76,.77,.86,.985,1,.86,.75,0]){events.length=0;ctx.window.introProgress=p;vm.runInContext('renderCitySurface()',ctx);assert.deepEqual(events,[['resize',p],['draw',100]]);if(p<1){assert.equal(ctx.current,0);assert.equal(ctx.target,0)}}
assert(!code.includes('syncCitySurface();draw(time)'));
assert.match(code,/readTarget\(\);renderCitySurface\(\);wake\(\)/);
console.log('PASS atomic resize/redraw forward/reverse including handoff and orientation handler; zero early city travel');
