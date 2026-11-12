// No live announcements per keystroke; the visible line is presentation-only.
export const contactPhrases=['I build software with purpose.','I take ownership from idea to delivery.','I keep learning and improving.'];
export function createContactTyping(output){
 let index=0,count=contactPhrases[0].length,deleting=true,remaining=2600,last=null,paused=false;
 const paint=()=>{output.textContent=contactPhrases[index].slice(0,count)};paint();
 return {setPaused(value){paused=value;last=null;return paused},update(now,active,reduced=false){
  if(reduced){index=0;count=contactPhrases[0].length;paint();last=null;return;}
  if(!active||paused){last=null;return;}if(last===null){last=now;return;}
  const dt=Math.min(100,Math.max(0,now-last));last=now;remaining-=dt;if(remaining>0)return;
  if(deleting){count--;remaining=36;if(count<=0){count=0;index=(index+1)%contactPhrases.length;deleting=false;remaining=350;}}
  else{count++;remaining=65;if(count>=contactPhrases[index].length){count=contactPhrases[index].length;deleting=true;remaining=2600;}}
  paint();
 }};
}
