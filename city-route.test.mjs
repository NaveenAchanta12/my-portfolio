import assert from 'node:assert/strict';
import{journeyMetrics,journeyProgress,sceneProgress,stationFor,smoother,stops,activeStop,nextStop}from'./city-route.js';
assert.deepEqual(journeyMetrics(4400,1000,18000),{start:3400,distance:17000});assert.equal(journeyProgress(3400,3400,18000),0);assert.equal(journeyProgress(21400,3400,18000),1);assert.equal(stationFor(0),'arrival');assert.equal(stops.length,10);
for(const stop of stops){assert.equal(activeStop(stop.p).id,stop.id);assert.equal(stationFor(stop.p),stop.id);assert.equal(sceneProgress(stop.p),stop.p);assert(Math.abs(sceneProgress(stop.p-.02)-(stop.p-.02))<1e-10);assert(Math.abs(sceneProgress(stop.p+.02)-(stop.p+.02))<1e-10)}
assert.equal(activeStop(1).id,'contact');assert.equal(nextStop(.15).id,'skills');assert.equal(nextStop(.65).id,'jobhunt');assert.equal(smoother(0),0);assert.equal(smoother(1),1);
let prev=-1;for(let i=0;i<=1000;i++){const p=i/1000,mapped=sceneProgress(p);assert(mapped>=prev);prev=mapped;assert(Math.abs(journeyProgress(3400+p*18000,3400,18000)-p)<1e-10)}
console.log('PASS ten destinations, reversible monotonic path, continuous 1:1 travel, next stop, route bounds and easing');

for(let i=1;i<=10000;i++){const before=(i-1)/10000,after=i/10000;assert(Math.abs((sceneProgress(after)-sceneProgress(before))-.0001)<1e-12)}
console.log("PASS no stationary scroll intervals, constant mapping speed across every station, reversible endpoints");

assert.equal(activeStop(.865).id,"ai"); assert.equal(nextStop(.83).id,"ai");
for(let i=1;i<stops.length;i++) assert(stops[i].p-stops[i-1].p>.054,"non-overlapping station windows");

assert.deepEqual(stops.slice(0,4).map(x=>x.id),['about','skills','experience','codetrail']);
