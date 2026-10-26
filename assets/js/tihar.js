/* =====================================================================
   TIHAR 2083 – side decorations (both sides) + greeting banner
   - Side decorations appear on every page that loads this file.
   - The banner appears where the page has <div id="tiharBanner"></div>.
   ===================================================================== */
(function () {
  'use strict';

  var TIHAR = {
    enabled: true,
    showUntil: '2026-11-20',   // festival look switches itself off after this date (YYYY-MM-DD)
    sides: true,
    banner: true
  };

  if (!TIHAR.enabled) return;
  if (TIHAR.showUntil && new Date() > new Date(TIHAR.showUntil + 'T23:59:59')) return;

  var BULB_COLORS = ['#ff3b3b', '#ff9f1a', '#ffe14d', '#3ddc84', '#3fd0ff', '#ff5fa8'];
  var STAR4 = 'M0-1L.26-.26L1 0L.26 .26L0 1L-.26 .26L-1 0L-.26-.26Z';
  var r1 = function (v) { return Math.round(v * 10) / 10; };

  /* ---------------- Side decorations ---------------- */
  function bez(p, t) {                                    // point on a cubic Bézier
    var m = 1 - t;
    return [
      m * m * m * p[0][0] + 3 * m * m * t * p[1][0] + 3 * m * t * t * p[2][0] + t * t * t * p[3][0],
      m * m * m * p[0][1] + 3 * m * m * t * p[1][1] + 3 * m * t * t * p[2][1] + t * t * t * p[3][1]
    ];
  }
  function pathOf(p) {
    return 'M' + r1(p[0][0]) + ' ' + r1(p[0][1]) + 'C' + r1(p[1][0]) + ' ' + r1(p[1][1]) + ' ' + r1(p[2][0]) + ' ' + r1(p[2][1]) + ' ' + r1(p[3][0]) + ' ' + r1(p[3][1]);
  }
  function layer(cls, H, inner) {
    return '<svg class="th-layer ' + cls + '" viewBox="0 0 200 ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + inner + '</svg>';
  }

  // A hanging string of fairy lights. Returns markup for: static part, lit layer A, lit layer B
  function lightString(x, len, H, offset) {
    var p = [[x, 0], [x + 24, len * 0.25], [x - 22, len * 0.58], [x + 2, len]];
    var n = Math.max(6, Math.floor(len / 40)), base = '', a = '', b = '';
    base += '<path class="th-wire" d="' + pathOf(p) + '"/>';
    for (var i = 0; i < n; i++) {
      var pt = bez(p, (i + 0.5) / n), cx = r1(pt[0]), cy = r1(pt[1] + 7);
      var col = BULB_COLORS[(i + offset) % BULB_COLORS.length];
      base += '<rect x="' + r1(pt[0] - 2) + '" y="' + r1(pt[1]) + '" width="4" height="4" rx="1" fill="#5a4630"/>' +
              '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + col + '" fill-opacity=".38"/>';
      var lit = '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + col + '" fill-opacity=".2"/>' +
                '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="' + col + '" fill-opacity=".32"/>' +
                '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + col + '"/>' +
                '<circle cx="' + r1(cx - 1.4) + '" cy="' + r1(cy - 1.6) + '" r="1.5" fill="#fff" fill-opacity=".9"/>';
      if (i % 2) b += lit; else a += lit;
    }
    return { base: base, a: a, b: b };
  }

  // A hanging marigold (sayapatri) garland
  function marigoldGarland(x, len) {
    var p = [[x, 0], [x + 22, len * 0.3], [x - 20, len * 0.66], [x + 4, len]];
    var n = Math.max(10, Math.floor(len / 13)), out = '<path d="' + pathOf(p) + '" fill="none" stroke="#7a4a00" stroke-width=".9"/>';
    for (var i = 0; i <= n; i++) {
      var pt = bez(p, i / n), cx = r1(pt[0] + (i % 2 ? 1.5 : -1.5)), cy = r1(pt[1]);
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="7.6" fill="#ff8a00"/>' +
             '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#ffb400"/>' +
             '<circle cx="' + cx + '" cy="' + cy + '" r="1.8" fill="#c45a00"/>';
    }
    // a little tassel at the end
    var e = bez(p, 1);
    out += '<path d="M' + r1(e[0]) + ' ' + r1(e[1] + 6) + 'l-4 14M' + r1(e[0]) + ' ' + r1(e[1] + 6) + 'l0 17M' + r1(e[0]) + ' ' + r1(e[1] + 6) + 'l4 14" stroke="#e8a000" stroke-width="2" stroke-linecap="round"/>';
    return out;
  }

  var LANTERNS = {
    left:  [{ x: '30%', w: 20, d: 28, delay: -4 }, { x: '66%', w: 16, d: 34, delay: -19 }],
    right: [{ x: '52%', w: 19, d: 30, delay: -9 }, { x: '24%', w: 16, d: 36, delay: -24 }]
  };

  function buildSide(side, el) {
    var nav = document.getElementById('header');
    var navBottom = nav ? Math.max(0, Math.min(120, Math.round(nav.getBoundingClientRect().bottom))) : 0;
    el.style.top = navBottom + 'px';
    var w = el.clientWidth || 170;
    var H = Math.round((window.innerHeight - navBottom) * 200 / w);
    var mirror = side === 'right' ? 1 : 0;                      // right strip uses slightly different lengths/colours
    var lights = lightString(26, H * (0.7 - 0.08 * mirror), H, mirror * 2);
    var garland = marigoldGarland(76, H * (0.44 - 0.08 * mirror));

    var lanterns = LANTERNS[side].map(function (l) {
      return '<div class="th-lantern" style="--x:' + l.x + ';--w:' + l.w + 'px;--d:' + l.d + 's;--delay:' + l.delay + 's"></div>';
    }).join('');

    // the twinkling layers only cover the light string itself (small layers = cheap animation)
    var f = w / 200, x0 = 26 - 36, vw = 72;
    var litBox = ' style="inset:auto;top:0;left:' + r1(x0 * f) + 'px;width:' + r1(vw * f) + 'px;height:100%"';
    function lit(cls, inner) {
      return '<svg class="th-layer ' + cls + '" viewBox="' + x0 + ' 0 ' + vw + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"' + litBox + '>' + inner + '</svg>';
    }
    el.innerHTML =
      layer('th-static', H, garland + lights.base) +
      lit('th-lit-a', lights.a) +
      lit('th-lit-b', lights.b) +
      lanterns;
  }

  function initSides() {
    if (!TIHAR.sides || document.querySelector('.tihar-side')) return;
    var els = {};
    ['left', 'right'].forEach(function (side) {
      var el = document.createElement('div');
      el.className = 'tihar-side ' + side;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      els[side] = el;
    });
    function buildAll() { buildSide('left', els.left); buildSide('right', els.right); }
    var t, lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener('resize', function () {
      // ignore tiny height changes (mobile address bar) so the strips don't rebuild while scrolling
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      clearTimeout(t); t = setTimeout(buildAll, 200);
    });
    buildAll();
  }

  /* ---------------- Greeting banner ---------------- */
  function rangoli(size, cls) {
    var out = '', i, a;
    for (i = 0; i < 12; i++) {                                 // outer petals + dots
      a = i * 30;
      out += '<ellipse cx="0" cy="-31" rx="5.2" ry="13" transform="rotate(' + a + ')" fill="' + (i % 2 ? '#ffb400' : '#ff3d81') + '"/>';
      out += '<circle cx="0" cy="-45" r="2" transform="rotate(' + (a + 15) + ')" fill="' + (i % 2 ? '#fff3b0' : '#3fd0ff') + '"/>';
    }
    for (i = 0; i < 8; i++) {                                  // inner petals
      out += '<ellipse cx="0" cy="-17" rx="4.2" ry="10" transform="rotate(' + (i * 45) + ')" fill="' + (i % 2 ? '#ff7a1a' : '#17c3b2') + '"/>';
    }
    out += '<circle r="9" fill="#fff3b0"/><circle r="5.5" fill="#d4142b"/><circle r="2" fill="#ffe27a"/>';
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="-50 -50 100 100" aria-hidden="true">' +
      '<circle r="48" fill="#2b1259" fill-opacity=".55" stroke="#ffcf5a" stroke-width="1.6"/>' + out + '</svg>';
  }

  function diya() {
    return '<svg class="th-diya" viewBox="0 0 54 44" aria-hidden="true">' +
      '<g class="th-flame"><circle cx="27" cy="16" r="13" fill="#ffb347" fill-opacity=".28"/>' +
      '<path d="M27 3C34 12 37 17 27 25C17 17 20 12 27 3Z" fill="#ffb300"/>' +
      '<path d="M27 11C31 15 31 19 27 22C23 19 23 15 27 11Z" fill="#fff3b0"/></g>' +
      '<path d="M3 26Q27 48 51 26Q27 31 3 26Z" fill="#c25a1c"/>' +
      '<path d="M3 26Q27 33 51 26Q27 21 3 26Z" fill="#8b3a0e"/></svg>';
  }

  // Fairy-light tiles for the banner's top edge (generated, so no external files)
  function lightsTile(mode) {                                   // mode: 'base' | 'a' | 'b'
    var xs = [10, 30, 50, 70, 90, 110], body = '';
    if (mode === 'base') body += '<path d="M0 6Q60 26 120 6" fill="none" stroke="#d9a441" stroke-opacity=".9" stroke-width="1.3"/>';
    xs.forEach(function (x, i) {
      var t = x / 120, y = 6 + 40 * t * (1 - t), col = BULB_COLORS[i % BULB_COLORS.length], cy = r1(y + 7.5);
      if (mode === 'base') {
        body += '<rect x="' + (x - 2) + '" y="' + r1(y) + '" width="4" height="4" rx="1" fill="#8a6a3a"/>' +
                '<circle cx="' + x + '" cy="' + cy + '" r="4.5" fill="' + col + '" fill-opacity=".4"/>';
      } else if ((i % 2 === 0) === (mode === 'a')) {
        body += '<circle cx="' + x + '" cy="' + cy + '" r="12" fill="' + col + '" fill-opacity=".22"/>' +
                '<circle cx="' + x + '" cy="' + cy + '" r="8" fill="' + col + '" fill-opacity=".34"/>' +
                '<circle cx="' + x + '" cy="' + cy + '" r="4.5" fill="' + col + '"/>' +
                '<circle cx="' + (x - 1.3) + '" cy="' + r1(cy - 1.5) + '" r="1.4" fill="#fff" fill-opacity=".9"/>';
      }
    });
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="38" viewBox="0 0 120 38">' + body + '</svg>';
    // single quotes inside the style attribute; encodeURIComponent leaves ' alone, so escape it too
    return "url('data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, '%27') + "')";
  }

  var CLOSE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';

  function initBanner() {
    var host = document.getElementById('tiharBanner');
    if (!TIHAR.banner || !host) return;
    var closed = false;
    try { closed = sessionStorage.getItem('tiharBannerClosed') === '1'; } catch (e) {}
    if (closed) { host.hidden = true; return; }

    var sky = '';
    [[8, 26, 7, 0], [30, 80, 6, -1.2], [58, 22, 8, -2], [74, 70, 6, -0.6], [90, 28, 8, -1.6], [47, 50, 5, -0.3]].forEach(function (p) {
      sky += '<span style="left:' + p[0] + '%;top:' + p[1] + '%;--s:' + p[2] + 'px;animation-delay:' + p[3] + 's"></span>';
    });

    host.className = 'tihar-banner';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Tihar greeting');
    host.innerHTML =
      '<div class="th-sky" aria-hidden="true">' + sky + '</div>' +
      '<div class="th-diyas" aria-hidden="true">' + diya() + diya() + diya() + '</div>' +
      '<div class="th-body">' +
        rangoli(96, 'th-badge') +
        '<div class="th-copy">' +
          '<p class="th-nep" lang="ne">शुभ तिहार २०८३</p>' +
          '<p class="th-en">Happy Tihar 2083!</p>' +
          '<p class="th-sub">May the glow of diyas fill your home with light, joy and success.</p>' +
          '<ul class="th-chips" lang="ne" aria-hidden="true"><li>दीपावली</li><li>लक्ष्मी पूजा</li><li>भाइटीका</li></ul>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="th-close" aria-label="Close Tihar greeting">' + CLOSE_SVG + '</button>';

    host.querySelector('.th-close').addEventListener('click', function () {
      host.hidden = true;
      try { sessionStorage.setItem('tiharBannerClosed', '1'); } catch (e) {}
    });
  }

  /* ---------------- Navbar: gold accent line + a light string hanging below it ---------------- */
  function initNav() {
    var nav = document.getElementById('header');
    if (!nav || nav.querySelector('.th-navlights')) return;
    var d = document.createElement('div');
    d.className = 'th-navlights';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML =
      '<i style="background-image:' + lightsTile('base') + '"></i>' +
      '<i class="lit-a" style="background-image:' + lightsTile('a') + '"></i>' +
      '<i class="lit-b" style="background-image:' + lightsTile('b') + '"></i>';
    nav.appendChild(d);
  }

  /* ---------------- Speed guard ---------------- */
  // If the page can't keep up (old phone, busy page), freeze the festive animation into a static
  // decoration so the website itself always stays fast and responsive.
  function perfGuard() {
    var root = document.documentElement;
    var conn = navigator.connection || {};
    if (conn.saveData) { root.classList.add('tihar-lite'); return; }
    var frames = 0, start = 0, last = 0;
    function tick(t) {
      if (document.hidden || (last && t - last > 400)) { frames = 0; start = 0; last = 0; }   // tab was hidden/throttled: restart
      if (!start) start = t;
      frames++; last = t;
      if (t - start < 2200) { requestAnimationFrame(tick); return; }
      if (frames / ((t - start) / 1000) < 28) root.classList.add('tihar-lite');
    }
    setTimeout(function () { requestAnimationFrame(tick); }, 1500);
  }

  function init() {
    document.body.classList.add('tihar-on');
    initNav();
    initSides();
    initBanner();
    perfGuard();
    document.addEventListener('visibilitychange', function () {   // pause all animation while the tab is hidden
      document.documentElement.classList.toggle('tihar-paused', document.hidden);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
