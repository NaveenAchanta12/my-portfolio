export const clamp01=n=>Math.max(0,Math.min(1,n));
export const stops=[{"id": "about", "label": "About me", "p": 0.09}, {"id": "skills", "label": "Skills", "p": 0.18}, {"id": "experience", "label": "Experience", "p": 0.27}, {"id": "codetrail", "label": "CodeTrail", "p": 0.36}, {"id": "lumicare", "label": "Lumicare", "p": 0.45}, {"id": "golivescore", "label": "GoLivescore", "p": 0.54}, {"id": "wishlist", "label": "MyWishlist", "p": 0.63}, {"id": "jobhunt", "label": "JobHunt AI", "p": 0.72}, {"id": "ai", "label": "AI engineering", "p": 0.865}, {"id": "contact", "label": "Contact", "p": 0.92}];
export function journeyMetrics(introHeight,viewportHeight,routeHeight){return{start:Math.max(0,introHeight-viewportHeight),distance:Math.max(1,routeHeight-viewportHeight)}}
export function journeyProgress(scroll,start,distance){return clamp01((scroll-start)/distance)}
export function activeStop(p){return stops.find(s=>Math.abs(p-s.p)<=.027)||(p>.947?stops.at(-1):null)}
export function nextStop(p){return stops.find(s=>s.p>p+.027)||stops.at(-1)}
// Native scroll maps continuously to camera travel: no forced station dwell or catch-up.
export function sceneProgress(p){return clamp01(p)}
export function stationFor(p){return activeStop(p)?.id||(p<.07?'arrival':'travel')}
export function smoother(t){t=clamp01(t);return t*t*t*(t*(t*6-15)+10)}
