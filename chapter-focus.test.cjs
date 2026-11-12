const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('styles.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(css, /\.city-portal \.city-stop:focus:not\(:focus-visible\)\{outline:none\}/,
  'Only pointer-focused city chapters suppress the native frame');
assert.match(css, /\.city-portal \.city-stop:focus-visible\{outline:2px solid #a9cfff;outline-offset:4px\}/,
  'Keyboard-focused city chapters retain a visible indicator');
assert.match(css, /button:focus-visible,a:focus-visible,select:focus-visible\{outline:2px solid var\(--blue\);outline-offset:6px\}/,
  'Interactive controls retain their existing keyboard outlines');
const chapters = [...html.matchAll(/<article\b[^>]*class="[^"]*city-stop[^>]*>/g)];
assert.equal(chapters.length, 10);
assert(chapters.every(([tag]) => tag.includes('tabindex="-1"')),
  'Chapters remain available as programmatic focus targets without new Tab stops');
assert.equal(css, fs.readFileSync('dist/styles.css', 'utf8'), 'Published CSS matches source');
console.log('PASS pointer-only chapter focus reset, explicit keyboard focus, unchanged control outlines, all ten focus targets, source/dist parity');
