import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
assert.equal(html,fs.readFileSync('dist/index.html','utf8'));
for(const old of ['React and Node.js application','SWOT &amp; Study · Original application','Earlier on-device tutor implementation','In an earlier CodeTrail implementation'])assert(!html.includes(old),old);
for(const pattern of [/<section id="codetrail".*?<\/section>/s,/<article[^>]+data-stop="codetrail".*?<\/article>/s]){
 const content=html.match(pattern)?.[0];assert(content);
 for(const phrase of ['Google OAuth / OpenID Connect','OpenAI Responses API','139-test regression suite','Cloudflare Workers','D1 / SQLite','WebLLM (optional)'])assert(content.includes(phrase),phrase);
}
for(const pattern of [/<section id="ai".*?<\/section>/s,/<article[^>]+data-stop="ai".*?<\/article>/s]){
 const content=html.match(pattern)?.[0];assert(content);
 assert.equal((content.match(/CodeTrail \/ SWOT &amp; Study/g)||[]).length,1);
 const product=content.match(/<details[^>]*><summary>CodeTrail \/ SWOT.*?<\/details>/s)?.[0];assert(product);
 for(const phrase of ['vanilla JavaScript','Google','OpenAI Responses API','139-test regression suite'])assert(product.includes(phrase),phrase);
 assert(!/React|MongoDB|Node\.js/.test(product));
}
console.log('PASS current CodeTrail identity in city/reading projects and AI cards; source/dist parity');
