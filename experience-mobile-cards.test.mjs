import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const css = read('chapter-refinement.css');
const marker = '/* Let mobile role cards grow with wrapped labels';
const mobile = css.slice(css.indexOf(marker));
assert(css.includes(marker), 'Mobile card sizing override exists');
assert.equal(css, read('dist/chapter-refinement.css'), 'Source and deployment CSS match');
assert.match(mobile, /@media\(max-width:760px\),\(orientation:landscape\) and \(max-height:550px\)/,
  'Changes are scoped to phone widths and short landscape screens');
assert.match(mobile, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,170px\),1fr\)\)/,
  'Two-column cards collapse before their text columns become too narrow');
const selector = '.experience-section .project-refined .experience-details.project-topics';
const declaration = suffix => {
  const escaped = (selector + ' ' + suffix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...mobile.matchAll(new RegExp(escaped + '\\{([^}]+)\\}', 'g'))];
  assert(matches.length, 'Scoped declaration exists for ' + suffix);
  return matches.map(match => match[1]).join(';');
};
const trigger = declaration('.project-topic-trigger');
assert.match(trigger, /height:auto;/, 'Card height follows text instead of compressing grid tracks');
assert.match(trigger, /min-height:76px;/, 'Touch targets keep their existing comfortable minimum');
assert.match(trigger, /grid-template-rows:max-content max-content;/,
  'Title and hint each reserve their entire wrapped text height');
assert.match(trigger, /row-gap:4px;/, 'A real grid gap separates the title and hint');
assert.match(declaration('.project-topic-title'), /grid-column:2;grid-row:1/);
assert.match(declaration('.project-topic-hint'), /grid-column:2;grid-row:2/);
assert.match(mobile, /min-width:0;min-height:auto;margin:0;overflow-wrap:anywhere/,
  'Long or enlarged text wraps rather than overflowing or relying on margin track sizing');
assert(!/font-size|line-height|display:none|visibility:hidden|!important/.test(mobile),
  'The repair preserves typography and does not hide content or force unrelated styles');
assert.match(read('showcase-layout.js'), /role\.classList\.add\('project-refined'\)/,
  'The selector follows the actual role wrapper, not the Experience section itself');
assert(!mobile.includes('.experience-section.project-refined'),
  'Experience and project-refined are on different elements');
assert.match(css.slice(0, css.indexOf(marker)), /height:72px/,
  'The existing desktop card layout stays intact');
console.log('PASS mobile role cards use readable responsive columns, intrinsic text rows, explicit spacing and unchanged typography; desktop rule and source/dist parity preserved');
