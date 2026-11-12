/* QiPath Pro: true planetary longitudes.
 * Reads tables generated from the Swiss Ephemeris (tools/build-ephemeris.py), interpolated with a four-point Lagrange fit.
 * The table is large, so it loads the first time it is needed. Positions are for display: nothing here feeds a chart or score.
 */
(function (global) {
  'use strict';
  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  var BODIES = [
    { key: 'sun', cn: '太陽', en: 'Sun' }, { key: 'moon', cn: '太陰', en: 'Moon' },
    { key: 'mercury', cn: '水星', en: 'Mercury', elem: 'Water' }, { key: 'venus', cn: '金星', en: 'Venus', elem: 'Metal' },
    { key: 'mars', cn: '火星', en: 'Mars', elem: 'Fire' }, { key: 'jupiter', cn: '木星', en: 'Jupiter', elem: 'Wood' },
    { key: 'saturn', cn: '土星', en: 'Saturn', elem: 'Earth' }
  ];

  function load(done) {
    if (global.QP_PLANETS) { done(true); return; }
    var s = global.document.createElement('script');
    s.src = 'js/ephem-planets.js';
    s.onload = function () { done(!!global.QP_PLANETS); };
    s.onerror = function () { done(false); };
    global.document.head.appendChild(s);
  }
  function longitude(key, jd) {
    var T = global.QP_PLANETS, b = T.bodies[key], x = (jd - T.start) / b.step, i = Math.floor(x), v = b.lon;
    if (i < 1 || i + 2 >= v.length) return null;
    var y0 = v[i - 1] / 1000, y1 = v[i] / 1000, y2 = v[i + 1] / 1000, y3 = v[i + 2] / 1000, t = x - i;
    var near = function (a, ref) { return a + 360 * Math.round((ref - a) / 360); };
    y1 = near(y1, y0); y2 = near(y2, y1); y3 = near(y3, y2);
    var r = -t * (t - 1) * (t - 2) / 6 * y0 + (t + 1) * (t - 1) * (t - 2) / 2 * y1 - (t + 1) * t * (t - 2) / 2 * y2 + (t + 1) * t * (t - 1) / 6 * y3;
    return ((r % 360) + 360) % 360;
  }
  /** Each body's longitude at a moment (JD, UT), or null outside the table (1900 to 2100). Call load() first. */
  function positions(jd) {
    if (!global.QP_PLANETS) return null;
    var out = BODIES.map(function (B) {
      var l = longitude(B.key, jd), l2 = longitude(B.key, jd + 0.5), l1 = longitude(B.key, jd - 0.5);
      if (l === null || l1 === null || l2 === null) return null;
      var s = Math.floor(l / 30), deg = l - s * 30, whole = Math.floor(deg), speed = ((l2 - l1 + 540) % 360) - 180;
      return { key: B.key, cn: B.cn, en: B.en, elem: B.elem || null, lon: Math.round(l * 1000) / 1000, sign: SIGNS[s], deg: whole,
               min: Math.floor((deg - whole) * 60), speed: Math.round(speed * 1000) / 1000, retro: speed < 0 };
    });
    return out.indexOf(null) >= 0 ? null : out;
  }
  global.QPEphem = { load: load, positions: positions, longitude: longitude };
})(typeof window !== 'undefined' ? window : globalThis);
