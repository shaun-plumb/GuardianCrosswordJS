// ==UserScript==
// @name         Guardian Crossword Prev/Next
// @namespace    https://github.com/shaun-plumb/GuardianCrosswordJS
// @version      1.2
// @description  Adds previous/next crossword buttons beside the Share button on Guardian cryptic and prize crossword pages
// @match        https://www.theguardian.com/crosswords/cryptic/*
// @match        https://www.theguardian.com/crosswords/prize/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shaun-plumb/GuardianCrosswordJS/main/guardian-crossword-nav.user.js
// @downloadURL  https://raw.githubusercontent.com/shaun-plumb/GuardianCrosswordJS/main/guardian-crossword-nav.user.js
// ==/UserScript==

(function () {
  'use strict';

  const m = location.pathname.match(/^\/crosswords\/(cryptic|prize)\/(\d+)/);
  if (!m) return;

  const type = m[1];
  const num = parseInt(m[2], 10);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function findDateline() {
    return document.querySelector('[data-gu-name="dateline"]');
  }

  // Weekday of the current puzzle, from the dateline element.
  function readDay() {
    if (type === 'prize') return 'Sat';
    const el = findDateline();
    const d = el && el.textContent.trim().slice(0, 3);
    return DAYS.includes(d) ? d : null;
  }

  // The Share button, found by its visible label rather than a hashed class.
  function findShare() {
    const nav = document.getElementById('gu-xword-nav');
    return Array.from(document.querySelectorAll('button, a')).find(
      (el) => !(nav && nav.contains(el)) && el.textContent.trim().toLowerCase() === 'share'
    );
  }

  // Mon-Fri are cryptic, Sat is prize, no Sunday; numbers are consecutive.
  function targets(day) {
    let next = 'cryptic';
    let prev = 'cryptic';
    if (day === 'Fri') next = 'prize';   // Friday -> Saturday
    if (day === 'Mon') prev = 'prize';   // Monday -> previous Saturday
    return {
      prev: `/crosswords/${prev}/${num - 1}`,
      next: `/crosswords/${next}/${num + 1}`,
    };
  }

  function build(day) {
    if (document.getElementById('gu-xword-nav')) return;
    const share = findShare();
    const anchor = share || findDateline();
    if (!anchor) return;

    const t = targets(day);

    const wrap = document.createElement('span');
    wrap.id = 'gu-xword-nav';
    wrap.setAttribute('data-print-layout', 'hide');
    Object.assign(wrap.style, {
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: '8px',
      margin: share ? '0 0 0 8px' : '8px 0 0 0',
      verticalAlign: 'middle',
    });

    [['← Previous', t.prev], ['Next →', t.next]].forEach(([label, href]) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (share) a.className = share.className;   // match the Share pill's styling
      Object.assign(a.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      });
      if (!share) {
        // Fallback pill if the Share button can't be found
        Object.assign(a.style, {
          border: '1px solid currentColor',
          borderRadius: '22px',
          padding: '8px 16px',
          color: 'inherit',
          font: 'bold 15px sans-serif',
        });
      }
      wrap.appendChild(a);
    });

    anchor.after(wrap);
  }

  function tryBuild(allowFallback) {
    if (!findShare() && !findDateline()) return false;
    let day = readDay();
    if (!day) {
      if (!allowFallback) return false;
      console.warn('[Guardian Crossword Nav] Dateline not found; assuming midweek.');
      day = 'Wed';
    }
    // Give the Share button a chance to render before settling for the dateline.
    if (!findShare() && !allowFallback) return false;
    build(day);
    return true;
  }

  if (tryBuild(false)) return;

  // Wait for the page to render (up to 10s).
  const obs = new MutationObserver(() => {
    if (tryBuild(false)) obs.disconnect();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    obs.disconnect();
    if (!document.getElementById('gu-xword-nav') && !tryBuild(true)) {
      console.warn('[Guardian Crossword Nav] Could not find a place to insert the buttons.');
    }
  }, 10000);
})();
