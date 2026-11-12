const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const setup=fs.readFileSync('intro-hold.test.cjs','utf8').split('const at=')[0];
const box={require,__dirname:process.cwd(),console};vm.createContext(box);vm.runInContext(setup+';globalThis.context=ctx;globalThis.elementsForTest=q;',box);
const ctx=box.context,q=box.elementsForTest;
for(const [w,h] of [[1440,900],[390,844],[844,390],[1024,768]]){
 ctx.innerWidth=w;ctx.innerHeight=h;q('.stage').offsetHeight=h;q('.intro').offsetHeight=h*2.4;
 let before=null;for(let n=0;n<=100;n++){const p=n/100;ctx.scrollY=p*h*1.4;vm.runInContext('render()',ctx);if(p>=.32&&p<=.58)assert.equal(vm.runInContext('welcome.style.opacity',ctx),1);if(p>=.35&&p<=.9&&before)assert.notEqual(q('.laptop').style.transform,before);before=q('.laptop').style.transform;}
 ctx.scrollY=.4*h*1.4;vm.runInContext('render()',ctx);assert.equal(vm.runInContext('welcome.style.opacity',ctx),1);
 console.log(`${w}x${h}: welcome full-opacity distance ${Math.round(h*1.4*.26)}px vs ${Math.round(h*.06)}px before; total intro travel ${Math.round(h*1.4)}px.`);
}
console.log('PASS welcome window, continuous laptop motion, reverse at desktop/phone/landscape/tablet dimensions. VM layout tests, not physical device rendering.');
