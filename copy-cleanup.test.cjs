const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const section = id => html.match(new RegExp('<section id="' + id + '".*?</section>', 's'))[0];
const reading = html.match(/<div class="reading-view">(.*?)<\/main>/s)[1];
const ids = [...reading.matchAll(/<section id="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(ids.slice(-3), ['ai', 'engineering', 'contact'], 'The static fallback ends AI, Lab, Contact');
const nav = reading.match(/<nav class="reading-index".*?<\/nav>/s)[0];
assert.deepEqual([...nav.matchAll(/href="#([^"]+)"/g)].map(match => match[1]), ids, 'Static navigation follows chapter order');
assert(!/class="skills"|>BUILD<|>CONNECT<|>DELIVER</.test(section('engineering')), 'The requested Build / Connect / Deliver block is removed');
for (const retained of ['id="scenario"', 'id="run"', 'id="demo-status"', 'INTERACTIVE SIMULATION']) {
  assert(section('engineering').includes(retained), 'The working Lab retains ' + retained);
}
assert(!/ai-limitation|project-scope-note|project-action-unavailable|class="disclosure"/.test(html), 'No redundant disclaimer or unavailable-link placeholders');
for (const removed of ['not a live AI demo', 'do not establish successful live employer submissions', 'No verified public app link', 'current hosted deployment may use a different architecture', 'remains under development']) {
  assert(!html.includes(removed), 'Removed status disclaimer: ' + removed);
}
assert.equal((html.match(/ongoing development/g) || []).length, 2, 'Only the JobHunt biography in each view carries ongoing status');
for (const pattern of [/<section id="jobhunt".*?<\/section>/s, /<article[^>]*data-stop="jobhunt".*?<\/article>/s]) {
  const job = html.match(pattern)[0];
  const bio = job.match(/<p class="project-lede">(.*?)<\/p>/s)[1];
  assert(bio.split(/\.(?:\s|$)/)[0].includes('ongoing development'), 'Ongoing status stays in the visible first bio sentence');
  assert(job.includes('built the core architecture'), 'Completion claims remain limited to core architecture');
  assert(!job.includes('project-actions'), 'No empty or fabricated JobHunt links');
}
assert(html.includes('CodeTrail / SWOT &amp; Study · AI-assisted learning'), 'Current product identity is retained');
assert(!html.includes('SWOT &amp; Study · Original application'), 'Contradictory duplicate identity is removed');
assert(section('lumicare').includes('per-message request/response flow'), 'Amaya is not presented as a multi-turn memory system');
assert(section('codetrail').includes('OpenAI Responses API'), 'Server-side model integration is explicit');
assert.equal((html.match(/I design and support enterprise distributed applications across services, data and user interfaces\./g) || []).length, 2);
assert.equal(html, fs.readFileSync('dist/index.html', 'utf8'));
console.log('PASS concise portfolio copy, truthful implementation identities, visible ongoing JobHunt bio, available links only, static Lab before Contact, retained simulation and source/dist parity');
