// Execute the Reading controller and real input controller together. Geometry is
// deterministic here; responsive rendering still needs separate browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const readingSource = fs.readFileSync('reading-experience.js', 'utf8');
const pacingSource = fs.readFileSync('scroll-pacing.js', 'utf8');

function fixture({width = 1440, height = 900, coarse = false, reduced = false, legacyMedia = false, contentHeights = null, chapterIds = null, navIncludesLab = false} = {}) {
  let now = 0, sequence = 0, modal = false;
  const timers = new Map(), resizeCallbacks = [], frames = new Map(), mediaQueries = [], windowEvents = {}, documentEvents = {};
  const scrollWrites = [], warnings = [];
  let box, view;
  const heights = contentHeights || [580, 560, 1100, 680];
  const ids = chapterIds || ['about', 'skills', 'experience', 'contact'];
  const addListener = (events, name, callback) => (events[name] ??= []).push(callback);
  const fire = (events, name, event = {}) => {
    event.type = name;
    event.prevented = false;
    event.preventDefault = () => { event.prevented = true; };
    for (const callback of events[name] || []) callback(event);
    return event;
  };

  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.parentElement = null;
      this.attributes = {};
      this.dataset = {};
      this.listeners = {};
      this.classes = new Set();
      this.inert = false;
      this.hidden = false;
      this.style = {
        setProperty(name, value) { this[name] = value; },
        removeProperty(name) { delete this[name]; }
      };
      this.classList = {
        contains: name => this.classes.has(name),
        add: (...names) => names.forEach(name => this.classes.add(name)),
        remove: (...names) => names.forEach(name => this.classes.delete(name)),
        toggle: (name, force) => {
          const enabled = force === undefined ? !this.classes.has(name) : force;
          if (enabled) this.classes.add(name); else this.classes.delete(name);
          return enabled;
        }
      };
    }
    get className() { return [...this.classes].join(' '); }
    set className(value) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
    get childNodes() { return this.children; }
    get hash() { return this.href?.startsWith('#') ? this.href : ''; }
    get clientHeight() { return this.classList.contains('reading-stage') ? box.innerHeight : 100; }
    get scrollHeight() { return this.clientHeight; }
    get offsetHeight() {
      const section = this.closest('section');
      return section ? heights[ids.indexOf(section.id)] : 100;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { addListener(this.listeners, name, callback); }
    append(...children) {
      for (const child of children) {
        if (child.parentElement) child.parentElement.children.splice(child.parentElement.children.indexOf(child), 1);
        this.children.push(child);
        child.parentElement = this;
      }
    }
    prepend(child) { this.append(child); this.children.unshift(this.children.pop()); }
    insertBefore(child, next) {
      this.append(child);
      this.children.pop();
      const index = this.children.indexOf(next);
      this.children.splice(index < 0 ? this.children.length : index, 0, child);
    }
    matches(selector) {
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector === 'a[href^="#"]') return this.tagName === 'A' && !!this.hash;
      if (selector === '[contenteditable="true"]') return this.getAttribute('contenteditable') === 'true';
      const href = selector.match(/^\[href="([^"]+)"\]$/);
      if (href) return this.href === href[1];
      return this.tagName === selector.toUpperCase();
    }
    closest(selector) {
      for (let element = this; element; element = element.parentElement) {
        if (selector.split(',').some(part => element.matches(part.trim()))) return element;
      }
      return null;
    }
    querySelectorAll(selector) {
      const direct = selector.startsWith(':scope > ');
      if (direct) selector = selector.slice(9);
      const found = [];
      for (const child of this.children) {
        if (child.matches(selector)) found.push(child);
        if (!direct) found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    contains(target) { return this === target || this.children.some(child => child.contains(target)); }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    scrollIntoView(options) {
      const index = ids.indexOf(this.id);
      assert(index >= 0, 'Only a chapter is explicitly scrolled into view');
      scrollWrites.push({kind: 'chapter', index, ...options});
      box.scrollY = documentTop(index);
    }
    getBoundingClientRect() {
      let top = -box.scrollY;
      const section = this.closest('section');
      if (section) {
        top = view.classList.contains('reading-pinned') ? 0 : documentTop(ids.indexOf(section.id)) - box.scrollY;
        if (this.classList.contains('reading-scene-content')) {
          const translate = this.style.transform?.match(/translate3d\(0,([-.\d]+)px,0\)/);
          top += 120 + Number(translate?.[1] || 0);
        }
      }
      return {top, bottom: top + this.offsetHeight, height: this.offsetHeight, left: 0, right: box.innerWidth};
    }
  }

  const document = {
    hidden: false,
    readyState: 'complete',
    body: new Element('body'),
    activeElement: null,
    createElement: tag => new Element(tag),
    querySelector: selector => selector === 'dialog[open]' ? (modal ? {} : null) : document.body.querySelector(selector),
    addEventListener: (name, callback) => addListener(documentEvents, name, callback)
  };
  document.activeElement = document.body;
  document.body.classList.add('reading-mode');
  view = new Element();
  view.className = 'reading-view';
  document.body.append(view);
  const nav = new Element('nav');
  nav.className = 'reading-index';
  view.append(nav);
  const sections = ids.map(id => {
    const section = new Element('section');
    section.id = id;
    section.append(new Element('h2'));
    view.append(section);
    const link = new Element('a');
    link.href = '#' + id;
    link.textContent = id;
    if (id !== 'engineering' || navIncludesLab) nav.append(link);
    return section;
  });
  const footer = new Element('footer');
  view.append(footer);
  const documentTop = index => {
    const order = view.querySelectorAll('.reading-scene');
    const position = order.findIndex(section => section.id === ids[index]);
    return order.slice(0, position).reduce((sum, section) => sum + Math.max(box.innerHeight, heights[ids.indexOf(section.id)] + 152), 0);
  };
  const matchesMedia = query => query.includes('prefers-reduced-motion') ? reduced :
    query.includes('max-width: 1024px') && (box.innerWidth <= 1024 || (query.includes('pointer: coarse') && coarse));
  box = {
    Element, document,
    console: {warn: (...args) => warnings.push(args)},
    performance: {now: () => now},
    innerWidth: width, innerHeight: height, scrollY: 0,
    getComputedStyle: () => ({paddingTop: '120', paddingBottom: '32', overflowY: 'visible'}),
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { timers.set(++sequence, {callback, due: now + delay}); return sequence; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, callback) => addListener(windowEvents, name, callback),
    scrollTo: options => { scrollWrites.push({kind: 'window', ...options}); box.scrollY = options.top; },
    history: {replaceState(_state, _title, hash) { this.hash = hash; }},
    matchMedia: query => {
      const callbacks = [];
      const media = {media: query, matches: matchesMedia(query), callbacks};
      if (legacyMedia) media.addListener = callback => callbacks.push(callback);
      else media.addEventListener = (name, callback) => { if (name === 'change') callbacks.push(callback); };
      mediaQueries.push(media);
      return media;
    },
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
    ResizeObserver: class { constructor(callback) { resizeCallbacks.push(callback); } observe() {} }
  };
  box.window = box;
  vm.createContext(box);
  vm.runInContext(pacingSource, box);
  vm.runInContext(readingSource, box);

  const flush = () => {
    for (let count = 0; frames.size; count++) {
      assert(count < 500, 'Animations settle without a runaway frame loop');
      now += 16;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
    }
  };
  const advance = ms => {
    const end = now + ms;
    while (now < end) {
      now += Math.min(16, end - now);
      for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.callback(); }
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
    }
  };
  flush();
  return {
    box, view, sections, nav, footer, scrollWrites, warnings, windowEvents,
    get button() { return view.querySelector('.reading-layout-toggle'); },
    get current() { return nav.querySelectorAll('a').findIndex(link => link.getAttribute('aria-current') === 'location'); },
    get pendingFrames() { return frames.size; },
    flush, advance,
    setHeight(index, height) { heights[index] = height; resizeCallbacks.forEach(callback => callback()); flush(); },
    emit: (name, event = {}) => fire(windowEvents, name, {target: document.body, ...event}),
    wheel(delta = 400) { return this.emit('wheel', {deltaX: 0, deltaY: delta, deltaMode: 0, cancelable: true}); },
    navigate(index) {
      fire(view.listeners, 'click', {target: nav.querySelectorAll('a')[index]});
      flush();
    },
    nativeScroll(index, offset = 0) {
      box.scrollY = documentTop(index) + offset;
      fire(windowEvents, 'scroll');
      flush();
    },
    resize({width = box.innerWidth, height = box.innerHeight, pointer = coarse, motion = reduced} = {}) {
      box.innerWidth = width;
      box.innerHeight = height;
      coarse = pointer;
      reduced = motion;
      for (const media of mediaQueries) {
        const next = matchesMedia(media.media);
        if (next !== media.matches) {
          media.matches = next;
          media.callbacks.forEach(callback => callback({matches: next, media: media.media}));
        }
      }
      fire(windowEvents, 'resize');
      fire(windowEvents, 'orientationchange');
      flush();
    },
    openModal() { modal = true; },
    closeModal() { modal = false; fire(documentEvents, 'close'); flush(); }
  };
}

function assertDocument(f) {
  assert(!f.view.classList.contains('reading-pinned'), 'Native document has no pinned layout');
  assert(!f.view.classList.contains('reading-stage-ready'), 'Native document has no stale ready marker');
  assert.equal(f.view.style.height, '', 'Native document has no synthetic timeline height');
  assert.equal(f.button, null, 'No document-layout toggle is created');
  for (const section of f.sections) {
    assert.equal(section.inert, false, 'Every native chapter is accessible');
    assert.equal(section.getAttribute('inert'), null);
    assert.equal(section.getAttribute('aria-hidden'), null);
    assert(!section.classList.contains('is-current'));
    assert(!section.classList.contains('is-on-stage'));
    assert(!('opacity' in section.style), 'No pinned opacity remains');
    assert(!('transform' in section.querySelector('.reading-scene-content').style), 'No pinned content shift remains');
  }
  const position = f.box.scrollY;
  assert(!f.wheel().prevented, 'Document wheel input is never intercepted');
  assert(!f.emit('touchstart').prevented);
  assert(!f.emit('keydown', {key: 'PageDown'}).prevented);
  assert.equal(f.windowEvents.touchmove, undefined, 'Touch scrolling and momentum remain native');
  f.flush();
  assert.equal(f.box.scrollY, position, 'Native input does not start a scripted scroll');
  assert.deepEqual(f.warnings, [], 'No unexpected fail-open exceptions');
}

function assertPinned(f) {
  assert(f.view.classList.contains('reading-pinned'));
  assert(f.view.classList.contains('reading-stage-ready'));
  assert.equal(f.button, null, 'No document-layout toggle is created');
  assert(Number.parseFloat(f.view.style.height) > f.box.innerHeight);
  assert.equal(f.sections.filter(section => !section.inert).length, 1, 'Only the active desktop chapter accepts focus');
  assert.deepEqual(f.warnings, []);
}

for (const options of [
  {width: 390, height: 844, coarse: true},
  {width: 844, height: 390, coarse: true},
  {width: 1024, height: 1366, coarse: false},
  {width: 1366, height: 1024, coarse: true},
  {width: 1440, height: 900, reduced: true},
  {width: 390, height: 844, legacyMedia: true}
]) {
  const f = fixture(options);
  assertDocument(f);
  f.nativeScroll(2, 110);
  assert.equal(f.current, 2, 'Native scrolling updates the current chapter');
  f.navigate(3);
  assert.equal(f.current, 3);
  assert.equal(f.box.document.activeElement, f.sections[3]);
  assert.equal(f.box.history.hash, '#contact');
  assertDocument(f);
}
console.log('PASS phone, landscape, tablet, touch-first desktop and reduced-motion native layouts, native input and chapter navigation');
const expectedOrder = ['about', 'skills', 'experience', 'codetrail', 'lumicare', 'golivescore', 'wishlist', 'jobhunt', 'ai', 'engineering', 'contact'];
const chapterHeights = {about: 580, skills: 560, experience: 1100, codetrail: 520, lumicare: 520, golivescore: 520, wishlist: 900, jobhunt: 520, ai: 700, engineering: 540, contact: 980};
const chapterLabels = ['About me', 'Engineering toolkit', 'Experience', 'Selected work · 01', 'Selected work · 02', 'Selected work · 03', 'Selected work · 04', 'Selected work · 05', 'AI engineering', 'Engineering lab', 'Start a conversation'];
for (const chapterIds of [
  ['about', 'skills', 'experience', 'codetrail', 'lumicare', 'golivescore', 'wishlist', 'jobhunt', 'engineering', 'ai', 'contact'],
  [...expectedOrder.slice(0, -2), 'contact', 'engineering'],
  expectedOrder
]) for (const options of [{}, {width: 390, height: 844, coarse: true}, {reduced: true}, {height: 640}]) for (const navIncludesLab of [false, true]) {
  const ordered = fixture({...options, chapterIds, contentHeights: chapterIds.map(id => chapterHeights[id]), navIncludesLab});
  const actualOrder = ordered.view.querySelectorAll('.reading-scene');
  assert.deepEqual(actualOrder.map(section => section.id), expectedOrder);
  assert.deepEqual(ordered.nav.querySelectorAll('a').map(link => link.hash.slice(1)), expectedOrder, 'Index order matches chapters and never duplicates an existing Lab link');
  const contact = actualOrder[actualOrder.length - 1];
  const content = contact.querySelector('.reading-scene-content');
  assert.equal(ordered.footer.closest('section'), contact, 'Replay/footer remain last, inside the final Contact chapter');
  assert.equal(content.children[content.children.length - 1], ordered.footer);
  for(let i = 0; i < actualOrder.length; i++) {
    const next = actualOrder[i].querySelector('.reading-next-chapter');
    if(i === actualOrder.length - 1) assert.equal(next, null, 'Contact is the endpoint, with no next chapter');
    else assert.equal(next.hash, '#' + expectedOrder[i + 1]);
    const eyebrow = actualOrder[i].querySelector('.reading-chapter');
    assert.equal(eyebrow.children[0].textContent, String(i + 1).padStart(2, '0'));
    assert.equal(eyebrow.children[1].textContent, chapterLabels[i], 'Labels stay associated with their chapter after reordering');
  }
  const pinned = ordered.view.classList.contains('reading-pinned');
  if(pinned) assertPinned(ordered); else assertDocument(ordered);
  for(const index of [9, 10, 9, 10]) {
    ordered.navigate(index);
    assert.equal(ordered.current, index, 'Lab/Contact navigation and reverse navigation select the correct final chapters');
    assert.equal(ordered.box.document.activeElement, actualOrder[index]);
    assert.equal(ordered.box.history.hash, '#' + expectedOrder[index]);
  }
  if(pinned) {
    ordered.box.scrollY = Number.parseFloat(ordered.view.style.height) - ordered.box.innerHeight;
    ordered.emit('scroll');ordered.flush();
    assert.equal(ordered.current, 10, 'The full timeline ends on Contact');
    assert.equal(contact.inert, false);
    assert.equal(content.style.transform, 'translate3d(0,-232.00px,0)', 'The full Contact/footer tail remains reachable');
    ordered.resize({width: 390, pointer: true});
    assertDocument(ordered);
    assert.equal(ordered.current, 10, 'Switching to native flow keeps the closing Contact chapter');
    ordered.resize({width: 1440, pointer: false});
    assertPinned(ordered);
    assert.equal(ordered.current, 10, 'Restoring pinned flow also keeps Contact');
  } else {
    ordered.nativeScroll(chapterIds.indexOf('engineering'), 100);
    assert.equal(ordered.current, 9, 'Native Lab position follows the final DOM order');
    ordered.nativeScroll(chapterIds.indexOf('contact'), 200);
    assert.equal(ordered.current, 10, 'Native flow finishes on Contact');
  }
  const chapterCount = actualOrder.length, linkCount = ordered.nav.querySelectorAll('a').length;
  vm.runInContext(readingSource, ordered.box);
  assert.equal(ordered.view.querySelectorAll('.reading-scene').length, chapterCount, 'Repeated enhancement does not add chapters');
  assert.equal(ordered.nav.querySelectorAll('a').length, linkCount, 'Repeated enhancement does not add index links');
  assert.equal(ordered.button, null);
}
console.log('PASS Lab then Contact ending, correct nav/labels/next links, final Contact/footer reachability, native/reduced/fit fallback, breakpoint retention and repeat-safe enhancement');

for (const legacyMedia of [false, true]) {
  const f = fixture({width: 1025, legacyMedia});
  assertPinned(f);
  assert(f.wheel().prevented, 'Desktop retains existing wheel pacing');
  f.emit('touchstart');
  f.flush();
  f.navigate(2);
  assert.equal(f.current, 2);
  f.resize({width: 1024});
  assertDocument(f);
  assert.equal(f.current, 2, 'Desktop to small layout preserves the visible chapter');
  f.nativeScroll(3, 70);
  f.resize({width: 1440, height: 900});
  assertPinned(f);
  assert.equal(f.current, 3, 'Small to desktop layout preserves the native-scroll chapter');
  assert.equal(f.sections[3].inert, false);
  f.resize({width: 390, height: 844, pointer: true});
  assertDocument(f);
  assert.equal(f.current, 3);
  f.resize({width: 1366, height: 1024});
  assertDocument(f);
  assert.equal(f.current, 3, 'Touch-first tablet remains native after landscape orientation');
  f.resize({pointer: false});
  assertPinned(f);
  assert.equal(f.current, 3, 'Pointer breakpoint changes retain the chapter too');
  f.resize({motion: true});
  assertDocument(f);
  assert.equal(f.current, 3);
  f.resize({motion: false});
  assertPinned(f);
  assert.equal(f.current, 3);
}
console.log('PASS bidirectional width/pointer/orientation changes, chapter retention, reduced-motion changes and legacy Safari media listeners');

const fitted = fixture();
fitted.navigate(1);
fitted.setHeight(1, 1800);
assertDocument(fitted);
assert.equal(fitted.current, 1, 'Unfittable expanded content preserves its chapter in native flow');
fitted.setHeight(1, 560);
assertDocument(fitted);
assert.equal(fitted.current, 1, 'Collapsing content cannot oscillate the current layout');
fitted.resize({width: 1450});
assertPinned(fitted);
assert.equal(fitted.current, 1, 'A later suitable resize restores the same pinned chapter');
const shortDesktop = fixture({width: 1440, height: 640});
assertDocument(shortDesktop);
shortDesktop.navigate(2);
shortDesktop.resize({height: 900});
assertPinned(shortDesktop);
assert.equal(shortDesktop.current, 2);

// The Lab is a fitted chapter too, including future status wrapping or larger text.
const labFit = fixture({width: 1280, height: 720, chapterIds: ['about','engineering','contact'], contentHeights: [500,540,520]});
assertPinned(labFit);
labFit.navigate(1);
assert.equal(labFit.current, 1);
labFit.setHeight(1, 720);
assertDocument(labFit);
assert.equal(labFit.current, 1, 'An expanded Lab retains focus in document flow');
labFit.setHeight(1, 540);
assertDocument(labFit);
labFit.resize({height: 900});
assertPinned(labFit);
assert.equal(labFit.current, 1, 'The same Lab is restored when the viewport fits');
labFit.resize({height: 650});
assertDocument(labFit);
labFit.navigate(2);
assert.equal(labFit.current, 2, 'Contact remains reachable after Lab fit fallback');
console.log('PASS Engineering Lab fit, expanded-content fallback, stable restoration and closing Contact access');

const interrupted = fixture();
interrupted.navigate(1);
assert(interrupted.wheel(600).prevented);
interrupted.resize({width: 390});
assertDocument(interrupted);
assert.equal(interrupted.current, 1, 'Resizing cancels an outstanding paced-wheel animation');

for (const startsSmall of [false, true]) {
  const modal = fixture({width: startsSmall ? 390 : 1440});
  modal.navigate(2);
  modal.openModal();
  const before = modal.scrollWrites.length;
  const focused = modal.box.document.activeElement;
  modal.resize({width: startsSmall ? 1440 : 390});
  assert.equal(modal.scrollWrites.length, before, 'A responsive layout change does not scroll behind an open modal');
  assert.equal(modal.box.document.activeElement, focused, 'Responsive changes do not move focus while a modal is open');
  assert(!modal.wheel().prevented, 'The modal keeps native input authority');
  modal.closeModal();
  assert.equal(modal.scrollWrites.length, before + 1, 'The deferred breakpoint change restores its chapter once after close');
  assert.equal(modal.current, 2, 'A deferred breakpoint change preserves the chapter');
  if (!startsSmall) assertDocument(modal);
  else assertPinned(modal);
  for (let repeat = 0; repeat < 3; repeat++) {
    const writes = modal.scrollWrites.length;
    modal.openModal();
    assert(!modal.wheel().prevented);
    modal.closeModal();
    assert.equal(modal.scrollWrites.length, writes, 'Ordinary modal close never issues a scroll command');
    assert.equal(modal.current, 2);
  }
}
console.log('PASS fit fallback, resize restoration, interrupted pacing cancellation, modal-safe deferred resizing and repeated ordinary close without scroll writes');

const css = fs.readFileSync('reading-experience.css', 'utf8');
assert.match(css, /@media\(max-width:1024px\),\(pointer:coarse\)/, 'CSS and JavaScript cover the same small/touch-first devices');
const nativeCSS = css.slice(css.lastIndexOf('@media(max-width:1024px),(pointer:coarse)'));
assert.match(nativeCSS, /height:auto!important/, 'Native flow removes the synthetic timeline height immediately');
assert.match(nativeCSS, /position:static;height:auto;overflow:visible/, 'Native stage cannot clip document content');
assert.match(nativeCSS, /position:relative!important/, 'Native chapters cannot overlap as absolute-positioned panels');
assert.match(nativeCSS, /visibility:visible!important;opacity:1!important/, 'Native chapters are fully visible before the JavaScript media callback');
assert.match(nativeCSS, /transform:none!important/, 'Native content has no leftover pinned transforms');
assert(!readingSource.includes('reading-layout-toggle'), 'The manual document toggle is removed, not merely hidden');

// V71 already removed the requested arrival sentence. This change must preserve
// every other deployed file, apart from the separately tested City Contact timing request.
const baseline = '89e5b2cfd341ba3c40d445e1b54c794b0216bf6a';
const changedFiles = new Set(['dist/reading-experience.js', 'dist/reading-experience.css', 'dist/city-controller.js', 'dist/scroll-pacing.js', 'dist/showcase-layout.css', 'dist/index.html', 'dist/reading-demo.js', 'dist/chapter-refinement.css']);
const productionFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, 'dist'], {encoding: 'utf8'}).trim().split('\n');
for (const file of productionFiles) {
  if (changedFiles.has(file)) continue;
  const expected = execFileSync('git', ['show', `${baseline}:${file}`], {maxBuffer: 50 * 1024 * 1024});
  assert(fs.readFileSync(file).equals(expected), `Unrelated production bytes remain exactly V71: ${file}`);
}
assert.equal(readingSource, fs.readFileSync('dist/reading-experience.js', 'utf8'));
assert.equal(css, fs.readFileSync('dist/reading-experience.css', 'utf8'));
console.log('PASS native-flow CSS safeguards, exact V71 production parity except Reading layout and authorized Contact timing, and source/dist parity');
