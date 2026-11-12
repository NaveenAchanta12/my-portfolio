const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('startup.js', 'utf8');
const boot = html.match(/<script>(document.documentElement.classList.add\('portfolio-booting'\)[\s\S]*?)<\/script>/)[1];
function harness(readyState='loading') {
  const classes = new Set(), events = {}, windowEvents = {}, frames = [], timers = new Map();
  let now = 100, nextID = 0;
  const loader = { attributes: {}, setAttribute(key,value) { this.attributes[key] = value; } };
  const context = {
    performance: { now: () => now },
    document: {
      readyState, documentElement: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } },
      querySelector: () => loader,
      addEventListener: (event, cb) => { events[event] = cb; }
    },
    window: { addEventListener: (event, cb) => { windowEvents[event] = cb; } },
    setTimeout: (cb,delay) => { const id = ++nextID; timers.set(id,{cb,at:now+delay}); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: cb => frames.push(cb)
  };
  function advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.cb(); }
  }
  vm.createContext(context);
  vm.runInContext(boot, context);
  return { context, classes, events, windowEvents, frames, timers, loader, advance };
}
for (const state of ['loading', 'interactive', 'complete']) {
  const h = harness(state);
  h.advance(100); // The extra duration begins after readiness, not initial boot.
  vm.runInContext(script,h.context);
  assert(h.classes.has('portfolio-booting'));
  if (state !== 'complete') {
    assert.equal(h.frames.length,0,'Module graph must settle before reveal');
    h.events.DOMContentLoaded();
  }
  h.frames.shift()();
  assert(h.classes.has('portfolio-booting'),'Keep mask through first painting opportunity');
  h.frames.shift()();
  assert(h.classes.has('portfolio-booting'),'Fast initialization keeps the loader legible');
  h.advance(1999);
  assert(h.classes.has('portfolio-booting'),'Full two-second extension follows the original reveal point');
  h.advance(1);
  assert(!h.classes.has('portfolio-booting'));
  assert.equal(h.loader.attributes['aria-hidden'],'true');
  assert.equal(h.timers.size,0);
}
const slow = harness();
vm.runInContext(script,slow.context);
slow.advance(1500);
assert(slow.classes.has('portfolio-booting'),'Cannot reveal an unready page');
slow.events.DOMContentLoaded();
slow.frames.shift()(); slow.frames.shift()();
slow.advance(1999);
assert(slow.classes.has('portfolio-booting'),'Slow readiness also receives the requested extension');
slow.advance(1);
assert(!slow.classes.has('portfolio-booting'));
assert.equal(slow.timers.size,0);
const capped = harness();
vm.runInContext(script,capped.context);
capped.advance(6000);
capped.events.DOMContentLoaded();
capped.frames.shift()(); capped.frames.shift()();
capped.advance(999);
assert(capped.classes.has('portfolio-booting'));
capped.advance(1);
assert(!capped.classes.has('portfolio-booting'),'Seven-second fail-open cap wins over added delay');
capped.advance(1000);
assert(!capped.classes.has('portfolio-booting'),'Late reveal timer cannot re-open loader');
const failed = harness(); // external startup/module fetch failed
failed.advance(7000);
assert(!failed.classes.has('portfolio-booting'),'Fail open without external JS');
for (const pendingFrames of [true,false]) {
  const restored = harness();
  vm.runInContext(script, restored.context);
  restored.events.DOMContentLoaded();
  if (!pendingFrames) { restored.frames.shift()(); restored.frames.shift()(); }
  restored.windowEvents.pageshow({persisted:true});
  assert(!restored.classes.has('portfolio-booting'),'Restored page dismisses immediately');
  while(restored.frames.length) restored.frames.shift()();
  assert.equal(restored.timers.size,0,'No delay survives restoration');
}
assert.match(fs.readFileSync('startup.css','utf8'), /prefers-reduced-motion: reduce/);
assert(html.indexOf('portfolio-startup-critical') < html.indexOf('<body>'));
assert.match(html, /modulepreload" href="vendor\/three.js/);
assert.equal(fs.readFileSync('dist/startup.js','utf8'),script);
assert(fs.readFileSync('dist/index.html','utf8').includes(boot));
console.log('PASS startup: two-second extension after fast and slow readiness, two frames, 7s failure, immediate cached restore, reduced motion');
