// Keep the actual laptop/Arrival title in place and transform those same nodes.
// Font-size and font-weight never change during flight: a system font must not
// jump between discrete regular/bold faces or be re-shaped on every scroll frame.
export const ARRIVAL_IDENTITY_END = .06;
export function arrivalIdentityProgress(progress) {
  if (progress >= ARRIVAL_IDENTITY_END - .0001) return 1;
  const t = Math.max(0, Math.min(1, (progress - .003) / (ARRIVAL_IDENTITY_END - .003)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
const mix = (a, b, t) => a + (b - a) * t;
const number = value => parseFloat(value) || 0;
const color = value => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255];

export function createArrivalIdentity({header, heading, introduction, body}) {
  const sources = [...heading.children];
  const actions = introduction.querySelector('.arrival-actions');
  const targets = [header.querySelector('strong'), header.querySelector('span')];
  let geometry = null, lastKey = '', revision = 0;
  function invalidate() { geometry = null; lastKey = ''; revision++; }
  addEventListener('resize', invalidate);
  document.fonts?.ready.then(invalidate);
  function resetLines() {
    sources.forEach(line => {
      line.style.transform = '';
      line.style.letterSpacing = '';
      line.style.color = '';
      line.style.textShadow = '';
    });
  }
  function measure() {
    // Resize/reverse may occur while transformed. Measure the untouched layout,
    // then apply the new transform in this same synchronous frame.
    resetLines();
    const box = element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(element);
      const glyph = range.getBoundingClientRect();
      return {x:rect.left, y:rect.top, glyphX:glyph.left, glyphY:glyph.top,
        size:number(style.fontSize), spacing:number(style.letterSpacing), color:color(style.color)};
    };
    geometry = sources.map((source, i) => ({from:box(source), to:box(targets[i])}));
  }
  function update({progress, introProgress, reading, reduced}) {
    const active = !reading && !reduced;
    const t = active && introProgress >= .985 ? arrivalIdentityProgress(progress) : active ? 0 : 1;
    const pending = active && t < 1;
    const key = [progress, introProgress >= .985, reading, reduced, revision].join(':');
    if (key === lastKey) return;
    lastKey = key;
    body.classList.toggle('arrival-identity-pending', pending);
    header.inert = pending;
    if (actions) actions.inert = active && t > 0;
    header.setAttribute('aria-hidden', String(pending));
    heading.style.opacity = active && t === 1 ? '0' : '';
    introduction.style.setProperty('--arrival-details-opacity', active ? String(Math.max(0, 1 - t * 4)) : '1');
    if (!active || t === 0) { resetLines(); return; }
    if (!geometry) measure();
    sources.forEach((line, i) => {
      const {from, to} = geometry[i], scale = mix(1, to.size / from.size, t);
      // Align glyphs, not different line boxes (Arrival 1.03 vs header 1.6).
      const x = (to.glyphX - from.glyphX) * t + (from.glyphX - from.x) * (1 - scale);
      const y = (to.glyphY - from.glyphY) * t + (from.glyphY - from.y) * (1 - scale);
      line.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
      line.style.letterSpacing = `${mix(from.spacing, to.spacing, t) / scale}px`;
      line.style.color = `rgb(${from.color.map((v,j) => mix(v,to.color[j],t)).join(',')})`;
      line.style.textShadow = `0 2px 22px rgba(37,53,75,${(1-t)/3})`;
    });
  }
  return {update, invalidate};
}
