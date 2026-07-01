/**
 * theznprojects - megaZN post likes (client)
 * ------------------------------------------------------------------
 * Reads and increments per-post like counts from the Apps Script
 * Web App (see apps-script/likes.gs). Apps Script Web Apps don't send
 * CORS headers, so we talk to it via JSONP (injected <script> tags),
 * which is not subject to CORS and lets us read the response.
 *
 * Markup it drives (one per post):
 *   <div class="post-like" data-slug="post-slug"> ... </div>
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwLcCm4RWVVLILxNYaBDHpRmEwj3qvwRhh7GlUL3Y_Hl18tbJrUusjwfUpdbkXEBV6c/exec';

  function jsonp(params, cb) {
    var name = 'lk_' + Math.random().toString(36).slice(2);
    var s = document.createElement('script');
    var done = false;

    function cleanup() {
      done = true;
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }

    var timer = setTimeout(function () { if (!done) { cleanup(); cb(null); } }, 8000);
    window[name] = function (data) { if (!done) { cleanup(); cb(data); } };

    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    s.src = ENDPOINT + '?' + qs + '&callback=' + name;
    s.onerror = function () { if (!done) { cleanup(); cb(null); } };
    document.head.appendChild(s);
  }

  function fmt(n) {
    return (n === null || n === undefined || isNaN(n)) ? '–' : String(n);
  }

  function initWidget(widget) {
    var slug = (widget.getAttribute('data-slug') || '').trim();
    if (!slug) return;

    var btn = widget.querySelector('.post-like-btn');
    var countEl = widget.querySelector('.post-like-count');
    if (!btn || !countEl) return;

    var storeKey = 'znliked:' + slug;
    var pending = false;

    if (localStorage.getItem(storeKey) === '1') markLiked();

    // Initial read of the current count.
    jsonp({ action: 'likes', slug: slug }, function (data) {
      countEl.textContent = (data && data.ok) ? fmt(data.likes) : fmt(0);
    });

    btn.addEventListener('click', function () {
      if (pending || localStorage.getItem(storeKey) === '1') return;
      pending = true;

      var base = parseInt(countEl.textContent, 10);
      if (isNaN(base)) base = 0;

      markLiked();
      countEl.textContent = fmt(base + 1); // optimistic

      jsonp({ action: 'like', slug: slug }, function (data) {
        pending = false;
        if (data && data.ok) {
          localStorage.setItem(storeKey, '1');   // persist only on success
          countEl.textContent = fmt(data.likes); // authoritative count
        } else {
          countEl.textContent = fmt(base);       // revert; allow retry
          unmarkLiked();
        }
      });
    });

    function markLiked() {
      btn.classList.add('liked');
      btn.setAttribute('aria-pressed', 'true');
    }
    function unmarkLiked() {
      btn.classList.remove('liked');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function init() {
    var widgets = document.querySelectorAll('.post-like');
    for (var i = 0; i < widgets.length; i++) initWidget(widgets[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
