const assert=require('node:assert/strict');
const changes=require('./copy-cleanup-v75.json');
function applyCopyChanges(html){
 for(const {before,after,count} of changes){
  assert.equal(html.split(before).length-1,count,'Exact requested copy replacement count: '+before.slice(0,95));
  html=html.split(before).join(after);
 }
 // Later authorized landing-only markup is applied after the V75 copy edits.
 for(const {before,after,count} of require('./landing-black-v76.json')){
  assert.equal(html.split(before).length-1,count,'Exact requested landing markup count: '+before.slice(0,95));
  html=html.split(before).join(after);
 }
 return html;
}
module.exports={applyCopyChanges};
