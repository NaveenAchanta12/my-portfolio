/* DOMContentLoaded includes deferred scripts and the city module graph. Do not
 * wait for window.load: below-the-fold images must not delay the first scene. */
(() => {
  const root = document.documentElement;
  let finished = false, revealTimer;
  function finish() {
    if (finished) return;
    finished = true;
    root.classList.remove('portfolio-booting');
    const loader = document.querySelector('.portfolio-startup');
    if (loader) loader.setAttribute('aria-hidden', 'true');
    clearTimeout(window.portfolioBootTimeout);
    clearTimeout(revealTimer);
  }
  function reveal() {
    // Let module layout changes and the first city draw reach the compositor.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (finished) return;
      // Give the loader two more seconds after the original reveal point.
      // The independent head-script timeout still fails open at seven seconds.
      revealTimer = setTimeout(finish, 2000);
    }));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal, { once: true });
  } else if (document.readyState === 'complete') {
    reveal();
  } else {
    // A deferred script sees "interactive" before sibling modules complete.
    document.addEventListener('DOMContentLoaded', reveal, { once: true });
  }
  // A restored page must never replay or retain an old loading mask.
  window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
})();
