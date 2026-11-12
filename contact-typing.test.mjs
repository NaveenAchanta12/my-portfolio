import assert from 'node:assert/strict';
import {createContactTyping,contactPhrases} from './contact-typing.mjs';
const output={textContent:''},t=createContactTyping(output);assert.equal(output.textContent,contactPhrases[0]);
let sawBlank=false,sawSecond=false;for(let ms=0;ms<12000;ms+=40){t.update(ms,true);if(!output.textContent)sawBlank=true;if(output.textContent===contactPhrases[1])sawSecond=true;assert(contactPhrases.some(p=>p.startsWith(output.textContent)));}assert(sawBlank&&sawSecond);
t.setPaused(true);const frozen=output.textContent;t.update(15000,true);assert.equal(output.textContent,frozen);t.setPaused(false);t.update(16000,false);assert.equal(output.textContent,frozen);t.update(17000,true,true);assert.equal(output.textContent,contactPhrases[0]);console.log('PASS contact type/delete rotation, pause, hidden freeze, reduced-motion static phrase');
