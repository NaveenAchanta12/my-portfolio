import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline = '8058761290ce468f5e85f04198926473ee9b3a26';
const changes = JSON.parse(fs.readFileSync('landing-black-v76.json', 'utf8'));
const read = file => fs.readFileSync(file, 'utf8');
const original = file => execFileSync('git', ['show', `${baseline}:${file}`], {encoding: 'utf8', maxBuffer: 50 * 1024 * 1024});
for (const file of ['index.html', 'dist/index.html']) {
  let expected = original(file);
  for (const {before, after, count} of changes) {
    assert.equal(expected.split(before).length - 1, count, `Unique authorized markup change: ${before}`);
    expected = expected.replaceAll(before, after);
  }
  assert.equal(read(file), expected, `${file} has only one stylesheet link and decorative name spans`);
}
assert.equal(read('landing-black.css'), read('dist/landing-black.css'));
for (const file of ['app.js', 'styles.css', 'laptop-premium.js', 'city-controller.js', 'city-route-v18.js', 'scroll-pacing.js', 'startup.js', 'startup.css']) {
  assert.equal(read(file), original(file), `${file} remains exactly V75`);
  assert.equal(read(`dist/${file}`), original(`dist/${file}`), `dist/${file} remains exactly V75`);
}
const css = read('landing-black.css');
assert.match(css, /\.hero-name__light\s*\{/);
assert.match(css, /background: #000 !important/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /forced-colors: active/);
assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''), /(?:transform|font-size|font-family|font-weight|letter-spacing|line-height|width|height|top|left|right|bottom|perspective|position|z-index|transition|opacity)\s*:/);
assert.doesNotMatch(css, /@keyframes/);
const selectors = css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g);
for (const [,group] of selectors) {
  if (group.trim().startsWith('@')) continue;
  for (const selector of group.split(',')) assert(selector.trim().startsWith('.intro '), `Style stays inside the landing: ${selector}`);
}
assert.match(read('index.html'), /class="hero-name__light">ANTA<\/span>/);
assert.match(read('index.html'), /class="hero-name" aria-hidden="true"/);
console.log('PASS landing-only black surface and ANTA reflection; exact V75 laptop, layout, scroll, City, loader, and accessibility contract preserved; separate Lab changes tested independently.');
