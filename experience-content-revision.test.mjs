import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(f,'utf8'),html=read('index.html');
const roles=[...html.matchAll(/<article class="employment"[^>]*>(.*?)<\/article>/gs)].map(m=>m[1]);
assert.equal(roles.length,4);assert.equal(roles[0],roles[2]);assert.equal(roles[1],roles[3]);
const [deloitte,prudential]=roles;
assert.match(deloitte,/I design and support enterprise distributed applications across services, data and user interfaces\./);
assert.match(deloitte,/<li>Kubernetes<\/li>/);assert.match(deloitte,/<span>Kubernetes<\/span>/);
assert.match(deloitte,/<strong>Prompt engineering\.<\/strong>/);assert.match(deloitte,/<span>Prompt engineering<\/span>/);
assert.match(prudential,/<strong>AWS experience\.<\/strong>/);assert.match(prudential,/<span>AWS<\/span>/);assert.match(prudential,/MongoDB/);
assert(!deloitte.includes('<span>AWS</span>'),'AWS role attribution is Prudential only');
assert(!prudential.includes('Prompt engineering'),'Prompt engineering role attribution is Deloitte only');
for(const role of roles){assert.match(role,/<strong>Entity Framework and (data access|persistence)\.<\/strong>/);assert.match(role,/<span>Entity Framework<\/span>/);assert(!/Amazon (?:EC2|EKS|ECS|S3)|\bEC2\b|\bEKS\b|\bECS\b|\bLambda\b|\d+%|production Kubernetes/.test(role),'No unconfirmed AWS service, cluster, or quantified outcome');}
const toolkits=[html.match(/<section id="skills"[^>]*>(.*?)<\/section>/s)[1],html.match(/<article[^>]*data-stop="skills"[^>]*>(.*?)<\/article>/s)[1]];
for(const toolkit of toolkits){assert.match(toolkit,/<span>AWS<\/span>/);assert.match(toolkit,/<span>Kubernetes<\/span>/);assert.match(toolkit,/<span>MongoDB \(NoSQL\)<\/span>/);assert.match(toolkit,/<span>Entity Framework<\/span>/);}
assert.equal(html,read('dist/index.html'));
console.log('PASS role-specific user-confirmed AWS and prompting, existing MongoDB/Entity Framework evidence, no invented service or outcome, both-view parity');
