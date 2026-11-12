import assert from 'node:assert/strict';
import {GiftExperiment,EditExperiment} from './experiment-models.mjs';
const gift=new GiftExperiment();assert.deepEqual(gift.race().map(r=>r.ok),[true,false]);assert.equal(gift.owner,'Alex');assert.equal(gift.reserve('Sam'),false);assert.deepEqual(Object.keys(gift.view('recipient')),['gift','wish']);gift.reset();assert.equal(gift.reserve('Sam'),true);
const edit=new EditExperiment();edit.propose();edit.edit('newer work');assert.equal(edit.apply(),'stale');assert.equal(edit.code,'newer work');edit.propose();assert.equal(edit.apply(),'applied');assert.equal(edit.undo(),'undone');assert.equal(edit.code,'newer work');edit.propose();edit.apply();edit.edit('keep this');assert.equal(edit.undo(),'stale');assert.equal(edit.code,'keep this');edit.reset();assert.equal(edit.apply(),'missing');assert.equal(edit.undo(),'missing');
console.log('Reservation/privacy and stale-edit/apply/undo models passed.');
