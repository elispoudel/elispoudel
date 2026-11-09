/* =====================================================================
   DASHAIN 2083 – kites (both sides) + greeting banner
   - Kites appear on every page that loads this file.
   - The banner appears where the page has <div id="dashainBanner"></div>.
   ===================================================================== */
(function () {
  'use strict';

  var DASHAIN = {
    enabled: true,
    showUntil: '2026-11-05',   // festival look switches itself off after this date (YYYY-MM-DD)
    kites: true,
    banner: true
  };

  if (!DASHAIN.enabled) return;
  if (DASHAIN.showUntil && new Date() > new Date(DASHAIN.showUntil + 'T23:59:59')) return;

  /* ---------------- Kites ---------------- */
  // Two kites per side. Colours: [panel1, panel2, panel3, panel4, accent]
  var SETS = {
    left: [
      { c: ['#7b2cbf', '#ffd23f', '#ff7b00', '#e01e37', '#fff1a8'], x: 8,  drift: 55, swing: 6.0, tilt: 4.6, delay: 0 },
      { c: ['#0f8b6d', '#b5e02b', '#ffc300', '#d90429', '#ffffff'], x: 62, drift: 70, swing: 7.2, tilt: 5.4, delay: -2 }
    ],
    right: [
      { c: ['#e63946', '#ffd166', '#7209b7', '#f77f00', '#ffffff'], x: 58, drift: 60, swing: 6.6, tilt: 5.0, delay: -1 },
      { c: ['#ff4d8d', '#ffe066', '#00b4d8', '#e01e37', '#fff1a8'], x: 8,  drift: 45, swing: 7.6, tilt: 4.2, delay: -3 }
    ]
  };
  var BOW_COLORS = ['#e01e37', '#ffd23f', '#ff4d8d', '#ffffff', '#e01e37'];
  var BOW_POS = [[-4, 30], [3, 60], [-4, 120], [2, 150], [-2, 182]];
  var SPARKS = [[36, 32, 0], [86, 36, -0.7], [38, 92, -1.4], [82, 96, -0.4], [60, 18, -1.1]];
  var STAR = 'M0-4L1.2-1.2L4 0L1.2 1.2L0 4L-1.2 1.2L-4 0L-1.2-1.2Z';
  var r1 = function (v) { return Math.round(v * 10) / 10; };

  // Shining stars placed OUTSIDE the kite outline: [x, y, size, delay] in kite-local coordinates
  var KITE_STARS = [
    [8, 18, 9, 0], [118, 20, 10, -0.8], [126, 98, 7.5, -1.6], [6, 100, 7, -0.4],
    [60, -14, 8, -1.2], [100, 134, 6, -2], [22, 136, 6, -0.9], [134, 58, 5.5, -1.4], [2, 60, 5.5, -2.2]
  ];
  var STAR4 = 'M0-1L.26-.26L1 0L.26 .26L0 1L-.26 .26L-1 0L-.26-.26Z';

  function kiteStars(halo) {
    return KITE_STARS.map(function (p) {
      return '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + p[2] + ')">' +
        '<g class="dk-star" style="animation-delay:' + p[3] + 's">' +
          '<circle r="2.8" fill="url(#' + halo + ')"/>' +
          '<path d="' + STAR4 + '" fill="#ffcf2e" stroke="#e08a00" stroke-width=".12" stroke-linejoin="round"/>' +
          '<path d="' + STAR4 + '" fill="#fffbe0" transform="scale(.5)"/>' +
        '</g></g>';
    }).join('');
  }

  // Small drifting stars scattered along the strip (deterministic, so no jumping on resize)
  function ambientStars(H, halo) {
    var out = '', n = Math.round(H / 55), seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < n; i++) {
      var x = 8 + rnd() * 184, y = 10 + rnd() * (H - 20), sz = 2 + rnd() * 2.6, d = -rnd() * 3;
      out += '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(sz) + ')"><g class="dk-amb" style="animation-delay:' + r1(d) + 's">' +
        '<path d="' + STAR4 + '" fill="#ffe27a" stroke="#f59f00" stroke-width=".16"/></g></g>';
    }
    return out;
  }

  function bows() {
    return BOW_POS.map(function (p, i) {
      return '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><g class="dk-bow" style="animation-delay:' + (i * -0.35) + 's">' +
        '<path d="M0 0L-10-6.5V6.5Z" fill="' + BOW_COLORS[i] + '"/><path d="M0 0L10-6.5V6.5Z" fill="' + BOW_COLORS[i] + '"/>' +
        '<circle r="2.8" fill="#fff" fill-opacity=".9"/></g></g>';
    }).join('');
  }

  function art(k, gid) {
    var c = k.c;
    return (
      '<polygon points="60,6 112,56 60,56" fill="' + c[0] + '"/>' +
      '<polygon points="60,6 8,56 60,56" fill="' + c[1] + '"/>' +
      '<polygon points="60,56 112,56 60,140" fill="' + c[2] + '"/>' +
      '<polygon points="60,56 8,56 60,140" fill="' + c[3] + '"/>' +
      '<polygon points="60,28 90,56 60,94 30,56" fill="' + c[4] + '" fill-opacity=".92"/>' +
      '<polygon points="60,40 78,56 60,78 42,56" fill="' + c[0] + '"/>' +
      '<circle cx="60" cy="56" r="4.2" fill="#fff"/>' +
      '<polygon points="60,6 112,56 60,140 8,56" fill="url(#' + gid + ')"/>' +
      '<path d="M60 6V140M8 56H112" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>' +
      '<polygon points="60,6 112,56 60,140 8,56" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>' +
      kiteStars(gid + 'h') +
      '<path d="M112 56C124 46 134 52 138 62" stroke="' + c[4] + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 56C-4 46 -14 52 -18 62" stroke="' + c[4] + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      SPARKS.map(function (s) {
        return '<g transform="translate(' + s[0] + ' ' + s[1] + ')"><path class="dk-spark" style="animation-delay:' + s[2] + 's" d="' + STAR + '" fill="#fff"/></g>';
      }).join('') +
      '<g transform="translate(60 140)"><g class="dk-tail" style="animation-delay:' + (k.delay / 2) + 's">' +
        '<path d="M0 0C-16 30 16 60 0 90C-16 120 14 150 -2 180" stroke="' + c[2] + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
        bows() +
      '</g></g>'
    );
  }

  function kite(k, x, y, s, H, gid) {
    var ax = x + 60 * s, ay = y + 98 * s, bx = Math.max(10, ax - k.drift);
    return (
      '<g class="dk-swing" style="transform-origin:' + r1(bx) + 'px ' + r1(H) + 'px;animation-duration:' + k.swing + 's;animation-delay:' + k.delay + 's">' +
        '<path class="dk-string" d="M' + r1(ax) + ' ' + r1(ay) + ' Q' + r1(ax - k.drift * 0.25) + ' ' + r1(ay + (H - ay) * 0.55) + ' ' + r1(bx) + ' ' + r1(H) + '"/>' +
        '<g class="dk-tilt" style="transform-origin:' + r1(ax) + 'px ' + r1(ay) + 'px;animation-duration:' + k.tilt + 's;animation-delay:' + (k.delay / 2) + 's">' +
          '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') scale(' + r1(s) + ')">' + art(k, gid) + '</g>' +
        '</g>' +
      '</g>'
    );
  }

  function buildSide(side, el) {
    var nav = document.getElementById('header');
    var navBottom = nav ? Math.max(0, Math.min(120, Math.round(nav.getBoundingClientRect().bottom))) : 0;
    el.style.top = navBottom + 'px';
    var w = el.clientWidth || 170;
    var H = Math.round((window.innerHeight - navBottom) * 200 / w);
    var s = Math.min(1, Math.max(0.7, H / 950));
    var top = side === 'left' ? 6 : H * 0.09;                                     // upper kite
    var low = Math.max(H * (side === 'left' ? 0.46 : 0.55), top + 335 * s + 8);    // lower kite, always below the upper
    low = Math.min(low, H - 150 * s);
    var gid = 'dkgloss-' + side;
    el.innerHTML =
      '<svg viewBox="0 0 200 ' + H + '" preserveAspectRatio="xMinYMin meet">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>' +
        '<radialGradient id="' + gid + 'h"><stop offset="0" stop-color="#ffd23f" stop-opacity=".95"/><stop offset=".4" stop-color="#ffb300" stop-opacity=".38"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient></defs>' +
        ambientStars(H, gid + 'h') +
        kite(SETS[side][0], SETS[side][0].x, top, s, H, gid) +
        kite(SETS[side][1], SETS[side][1].x, low, s, H, gid) +
      '</svg>';
  }

  function initKites() {
    if (!DASHAIN.kites || document.querySelector('.dashain-kites')) return;
    var els = {};
    ['left', 'right'].forEach(function (side) {
      var el = document.createElement('div');
      el.className = 'dashain-kites ' + side;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      els[side] = el;
    });
    function buildAll() { buildSide('left', els.left); buildSide('right', els.right); }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(buildAll, 150); });
    buildAll();
  }

  /* ---------------- Greeting banner ---------------- */
  var TIKA_SVG =
    '<svg class="dashain-tika" viewBox="0 0 92 92" aria-hidden="true">' +
      '<circle cx="46" cy="46" r="43" fill="#fff4d6" stroke="#ffcf5a" stroke-width="4"/>' +
      // jamara (barley sprouts)
      '<g stroke-linecap="round" fill="none" stroke-width="4.5">' +
        '<path d="M46 30C46 20 44 14 42 9" stroke="#e8d84a"/>' +
        '<path d="M38 32C34 24 30 19 25 16" stroke="#c9d93a"/>' +
        '<path d="M54 32C58 24 62 19 67 16" stroke="#c9d93a"/>' +
        '<path d="M32 38C26 33 21 31 16 31" stroke="#a9c93a"/>' +
        '<path d="M60 38C66 33 71 31 76 31" stroke="#a9c93a"/>' +
      '</g>' +
      // red tika with rice grains
      '<ellipse cx="46" cy="52" rx="19" ry="21" fill="#d4142b"/>' +
      '<ellipse cx="40" cy="43" rx="5" ry="8" fill="#fff" opacity=".22"/>' +
      '<g fill="#fff8e6">' +
        '<ellipse cx="40" cy="48" rx="2.2" ry="1.3" transform="rotate(-30 40 48)"/>' +
        '<ellipse cx="50" cy="45" rx="2.2" ry="1.3" transform="rotate(20 50 45)"/>' +
        '<ellipse cx="46" cy="55" rx="2.2" ry="1.3" transform="rotate(-10 46 55)"/>' +
        '<ellipse cx="37" cy="58" rx="2.2" ry="1.3" transform="rotate(35 37 58)"/>' +
        '<ellipse cx="55" cy="58" rx="2.2" ry="1.3" transform="rotate(-25 55 58)"/>' +
        '<ellipse cx="46" cy="65" rx="2.2" ry="1.3"/>' +
      '</g>' +
    '</svg>';

  function initBanner() {
    var host = document.getElementById('dashainBanner');
    if (!DASHAIN.banner || !host) return;
    var closed = false;
    try { closed = sessionStorage.getItem('dashainBannerClosed') === '1'; } catch (e) {}
    if (closed) { host.hidden = true; return; }

    host.className = 'dashain-banner';
    var sparkles = '';
    [[58, 16, 14, 0], [66, 62, 9, -1], [74, 24, 11, -2], [82, 70, 8, -0.5], [90, 18, 12, -1.5], [95, 58, 9, -2.4],
     [48, 78, 7, -1.2], [86, 42, 7, -0.3], [70, 84, 10, -1.8]].forEach(function (p) {
      sparkles += '<span class="dashain-star" style="left:' + p[0] + '%;top:' + p[1] + '%;--s:' + p[2] + 'px;animation-delay:' + p[3] + 's"></span>';
    });
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Dashain greeting');
    host.innerHTML =
      '<div class="dashain-garland" aria-hidden="true"></div>' +
      '<div class="dashain-sparkles" aria-hidden="true">' + sparkles + '</div>' +
      '<div class="dashain-body">' +
        TIKA_SVG +
        '<div class="dashain-copy">' +
          '<p class="dashain-nep" lang="ne">शुभ दशैं २०८३</p>' +
          '<p class="dashain-en">Happy Dashain 2083!</p>' +
          '<p class="dashain-sub">May tika, jamara and the blessings of elders fill your home with joy, health and success in your studies.</p>' +
          '<ul class="dashain-chips" lang="ne" aria-hidden="true"><li>टीका</li><li>जमरा</li><li>आशीर्वाद</li><li>चङ्गा</li></ul>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="dashain-close" aria-label="Close Dashain greeting"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg></button>';

    host.querySelector('.dashain-close').addEventListener('click', function () {
      host.hidden = true;
      try { sessionStorage.setItem('dashainBannerClosed', '1'); } catch (e) {}
    });
  }

  function init() { document.body.classList.add('dashain-on'); initKites(); initBanner(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
