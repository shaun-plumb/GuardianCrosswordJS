// ==UserScript==
// @name         Guardian Crossword Prev/Next
// @namespace    https://example.local/guardian-crossword-nav
// @version      1.1
// @description  Adds previous/next crossword links beside the PDF link on Guardian cryptic and prize crossword pages
// @match        https://www.theguardian.com/crosswords/cryptic/*
// @match        https://www.theguardian.com/crosswords/prize/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const m = location.pathname.match(/^\/crosswords\/(cryptic|prize)\/(\d+)/);
  if (!m) return;

  const type = m[1];
  const num = parseInt(m[2], 10);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Weekday of the current puzzle, from the dateline element.
  function readDay() {
    if (type === 'prize') return 'Sat';
    const el = document.querySelector('[data-gu-name="dateline"]');
    const d = el && el.textContent.trim().slice(0, 3);
    return DAYS.includes(d) ? d : null;
  }

  // The "PDF version" link, found by its target rather than the hashed class.
  function findPdfLink() {
    return document.querySelector(
      '[data-gu-name="standfirst"] a[href*="crosswords-static.guim.co.uk"]'
    );
  }

  // Where to insert: after the PDF link, else at the end of the standfirst.
  function findHost() {
    return findPdfLink() || document.querySelector('[data-gu-name="standfirst"]');
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
    const host = findHost();
    if (!host) return;

    const pdf = findPdfLink();
    const t = targets(day);

    const wrap = document.createElement('span');
    wrap.id = 'gu-xword-nav';
    wrap.setAttribute('data-print-layout', 'hide');
    Object.assign(wrap.style, {
      display: 'inline-flex',
      gap: '14px',
      marginLeft: '14px',
      whiteSpace: 'nowrap',
    });

    [['← Previous', t.prev], ['Next →', t.next]].forEach(([label, href]) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (pdf) a.className = pdf.className;   // match the PDF link's styling
      else a.style.textDecoration = 'underline';
      wrap.appendChild(a);
    });

    if (pdf) pdf.after(wrap);
    else host.appendChild(wrap);
  }

  function tryBuild(allowFallback) {
    if (!findHost()) return false;
    let day = readDay();
    if (!day) {
      if (!allowFallback) return false;
      console.warn('[Guardian Crossword Nav] Dateline not found; assuming midweek.');
      day = 'Wed';
    }
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
      console.warn('[Guardian Crossword Nav] Could not find the standfirst/PDF link.');
    }
  }, 10000);
})();
