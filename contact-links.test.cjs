const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),css=fs.readFileSync(__dirname+'/contact-links.css','utf8');
assert.equal((html.match(/class="direct-contact contact-links"/g)||[]).length,2);
for(const k of ['linkedin','gmail','github','resume'])assert.equal((html.match(new RegExp(`data-contact="${k}"`,'g'))||[]).length,2);
assert.equal((html.match(/href="https:\/\/github.com\/NaveenAchanta12\?tab=repositories"/g)||[]).length,2);
assert.equal((html.match(/download="Naveen-Achanta-Resume.pdf"/g)||[]).length,3);
assert(!html.includes('data-contact="whatsapp"'));assert(!html.includes('https://wa.me/'));

assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);
const pdf=fs.readFileSync(__dirname+'/assets/documents/Naveen-Achanta-Resume.pdf');assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
console.log('PASS contact links, accessible labels, verified destinations, WhatsApp removed in both modes, local PDF download and motion/focus styles.');
