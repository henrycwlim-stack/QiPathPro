/* QiPath Pro — astronomical core
 * Julian Day, apparent solar longitude, 24 solar terms, new moons, Chinese lunisolar calendar.
 * Algorithms follow Jean Meeus, "Astronomical Algorithms" (2nd ed), ch. 7, 25, 49.
 * All civil dates are interpreted in the app timezone (default UTC+8, Singapore).
 */
(function (global) {
  'use strict';

  var TZ = 8; // hours east of UTC. Singapore / China standard time.
  var RAD = Math.PI / 180;

  function setTimezone(h) { TZ = h; }
  function getTimezone() { return TZ; }

  /* ---------- Julian Day ---------- */

  // Gregorian calendar date -> Julian Day (day may be fractional). Meeus 7.1
  function gregToJD(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // Julian Day -> Gregorian {y,m,d} where d is fractional. Meeus 7.
  function jdToGreg(jd) {
    var z = Math.floor(jd + 0.5);
    var f = jd + 0.5 - z;
    var A = z;
    if (z >= 2299161) {
      var alpha = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + alpha - Math.floor(alpha / 4);
    }
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var D = Math.floor(365.25 * C);
    var E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + f;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    return { y: year, m: month, d: day };
  }

  // Julian Day Number for a local civil date (integer, constant across the whole civil day).
  function civilJDN(y, m, d) {
    return Math.floor(gregToJD(y, m, d) + 0.5);
  }

  // Local civil datetime -> JD (in UT)
  function localToJD(y, m, d, hour, min) {
    var frac = ((hour || 0) + (min || 0) / 60 - TZ) / 24;
    return gregToJD(y, m, d) + frac;
  }

  // JD (UT) -> local civil {y,m,d,hour,min}
  function jdToLocal(jd) {
    var g = jdToGreg(jd + TZ / 24);
    var day = Math.floor(g.d);
    var frac = (g.d - day) * 24;
    var hour = Math.floor(frac);
    var min = Math.round((frac - hour) * 60);
    if (min === 60) { min = 0; hour += 1; }
    return { y: g.y, m: g.m, d: day, hour: hour, min: min };
  }

  // Day of week, 0 = Sunday
  function weekday(jdn) { return ((jdn + 1) % 7 + 7) % 7; }

  /* ---------- Solar position ---------- */

  // Apparent geocentric longitude of the Sun in degrees. Meeus 25. Accuracy ~0.01 deg.
  function solarLongitude(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * RAD;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    return ((apparent % 360) + 360) % 360;
  }

  // JD of the moment solar longitude reaches `target` degrees, searching near `jdGuess`.
  function solarTermJD(target, jdGuess) {
    var lo = jdGuess - 20, hi = jdGuess + 20;
    function delta(jd) {
      var diff = solarLongitude(jd) - target;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return diff;
    }
    if (delta(lo) > 0) lo -= 30;
    if (delta(hi) < 0) hi += 30;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (delta(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // The 24 solar terms, index 0 = 立春 (longitude 315), stepping +15 deg.
  var TERM_NAMES = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至',
                    '小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪',
                    '大雪','冬至','小寒','大寒'];
  var TERM_PINYIN = ['Start of Spring','Rain Water','Awakening of Insects','Spring Equinox',
                     'Pure Brightness','Grain Rain','Start of Summer','Grain Full','Grain in Ear',
                     'Summer Solstice','Minor Heat','Major Heat','Start of Autumn','End of Heat',
                     'White Dew','Autumn Equinox','Cold Dew','Frost Descent','Start of Winter',
                     'Minor Snow','Major Snow','Winter Solstice','Minor Cold','Major Cold'];

  // Longitude for term index i (0 = Lichun = 315 deg)
  function termLongitude(i) { return (315 + i * 15) % 360; }

  var _termCache = {};
  // All 24 term moments (JD, UT) whose local date falls in Gregorian year y, plus neighbours.
  function termsForYear(y) {
    if (_termCache[y]) return _termCache[y];
    var out = [];
    for (var i = 0; i < 24; i++) {
      // Lichun ~ Feb 4 of year y; each term ~15.2 days later.
      var guess = gregToJD(y, 2, 4) + i * 15.22;
      out.push({ index: i, name: TERM_NAMES[i], en: TERM_PINYIN[i],
                 jd: solarTermJD(termLongitude(i), guess) });
    }
    _termCache[y] = out;
    return out;
  }

  // The most recent solar term at or before local datetime; returns {index,name,jd,...}
  function currentTerm(y, m, d, hour, min) {
    var jd = localToJD(y, m, d, hour || 0, min || 0);
    var pool = termsForYear(y - 1).concat(termsForYear(y), termsForYear(y + 1));
    pool.sort(function (a, b) { return a.jd - b.jd; });
    var found = pool[0];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].jd <= jd) found = pool[i]; else break;
    }
    return found;
  }

  // Next solar term strictly after the given local datetime.
  function nextTerm(y, m, d, hour, min) {
    var jd = localToJD(y, m, d, hour || 0, min || 0);
    var pool = termsForYear(y - 1).concat(termsForYear(y), termsForYear(y + 1));
    pool.sort(function (a, b) { return a.jd - b.jd; });
    for (var i = 0; i < pool.length; i++) if (pool[i].jd > jd) return pool[i];
    return null;
  }

  /* ---------- Lunar phase / new moon ---------- */

  // JD of the k-th mean new moon after 2000 Jan 6, with periodic corrections. Meeus 49.
  function newMoonJD(k) {
    var T = k / 1236.85;
    var T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2
            - 0.000000150 * T3 + 0.00000000073 * T4;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var M  = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;      // Sun anomaly
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2
             + 0.00001238 * T3 - 0.000000058 * T4) * RAD;                              // Moon anomaly
    var F  = (160.7108 + 390.67050284 * k - 0.0016118 * T2
             - 0.00000227 * T3 + 0.000000011 * T4) * RAD;                              // argument of latitude
    var O  = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;     // ascending node

    var c = -0.40720 * Math.sin(Mp)
          + 0.17241 * E * Math.sin(M)
          + 0.01608 * Math.sin(2 * Mp)
          + 0.01039 * Math.sin(2 * F)
          + 0.00739 * E * Math.sin(Mp - M)
          - 0.00514 * E * Math.sin(Mp + M)
          + 0.00208 * E * E * Math.sin(2 * M)
          - 0.00111 * Math.sin(Mp - 2 * F)
          - 0.00057 * Math.sin(Mp + 2 * F)
          + 0.00056 * E * Math.sin(2 * Mp + M)
          - 0.00042 * Math.sin(3 * Mp)
          + 0.00042 * E * Math.sin(M + 2 * F)
          + 0.00038 * E * Math.sin(M - 2 * F)
          - 0.00024 * E * Math.sin(2 * Mp - M)
          - 0.00017 * Math.sin(O)
          - 0.00007 * Math.sin(Mp + 2 * M);

    var A1 = (299.77 +  0.107408 * k - 0.009173 * T2) * RAD;
    var A2 = (251.88 +  0.016321 * k) * RAD;
    var A3 = (251.83 + 26.651886 * k) * RAD;
    var A4 = (349.42 + 36.412478 * k) * RAD;
    var A5 = ( 84.66 + 18.206239 * k) * RAD;
    var A6 = (141.74 + 53.303771 * k) * RAD;
    var A7 = (207.14 +  2.453732 * k) * RAD;
    var A8 = (154.84 +  7.306860 * k) * RAD;
    var A9 = ( 34.52 + 27.261239 * k) * RAD;
    var A10= (207.19 +  0.121824 * k) * RAD;
    var A11= (291.34 +  1.844379 * k) * RAD;
    var A12= (161.72 + 24.198154 * k) * RAD;
    var A13= (239.56 + 25.513099 * k) * RAD;
    var A14= (331.55 +  3.592518 * k) * RAD;

    var add = 0.000325 * Math.sin(A1) + 0.000165 * Math.sin(A2) + 0.000164 * Math.sin(A3)
            + 0.000126 * Math.sin(A4) + 0.000110 * Math.sin(A5) + 0.000062 * Math.sin(A6)
            + 0.000060 * Math.sin(A7) + 0.000056 * Math.sin(A8) + 0.000047 * Math.sin(A9)
            + 0.000042 * Math.sin(A10) + 0.000040 * Math.sin(A11) + 0.000037 * Math.sin(A12)
            + 0.000035 * Math.sin(A13) + 0.000023 * Math.sin(A14);

    return jde + c + add - deltaT(k) / 86400;
  }

  // Rough Delta-T (TD - UT) in seconds, adequate 1900-2100.
  function deltaT(k) {
    var year = 2000 + k / 12.3685;
    var t;
    if (year >= 2005 && year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (year >= 1986 && year < 2005) { t = year - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t
             + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (year >= 1961 && year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (year >= 1941 && year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (year >= 1900 && year < 1941) { t = year - 1900;
      return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * Math.pow(t, 4); }
    if (year >= 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    return 0;
  }

  // Local civil JDN of the day containing the k-th new moon.
  function newMoonJDN(k) {
    var loc = jdToLocal(newMoonJD(k));
    return civilJDN(loc.y, loc.m, loc.d);
  }

  /* ---------- Chinese lunisolar calendar ---------- */

  // Winter solstice (longitude 270) preceding or on the given year's start; returns JD.
  function winterSolsticeJD(y) {
    return solarTermJD(270, gregToJD(y, 12, 22));
  }

  var _lunarCache = {};
  // Build the lunar month table for the sui containing Gregorian year y.
  // Returns array of {startJDN, monthNum, leap}.
  function lunarMonths(y) {
    if (_lunarCache[y]) return _lunarCache[y];

    // Month 11 of the previous suo-year contains the winter solstice of y-1.
    var ws = winterSolsticeJD(y - 1);
    var wsLoc = jdToLocal(ws);
    var wsJDN = civilJDN(wsLoc.y, wsLoc.m, wsLoc.d);

    // k index of the new moon starting the month containing that solstice
    var kApprox = Math.round((ws - 2451550.09766) / 29.530588861);
    var k0 = kApprox;
    while (newMoonJDN(k0) > wsJDN) k0--;
    while (newMoonJDN(k0 + 1) <= wsJDN) k0++;

    // Collect 15 successive months so we always span the whole of year y.
    var starts = [];
    for (var i = 0; i <= 15; i++) starts.push(newMoonJDN(k0 + i));

    // Next winter solstice month start
    var ws2 = winterSolsticeJD(y);
    var ws2Loc = jdToLocal(ws2);
    var ws2JDN = civilJDN(ws2Loc.y, ws2Loc.m, ws2Loc.d);
    var k1 = k0;
    while (newMoonJDN(k1 + 1) <= ws2JDN) k1++;
    var monthsInSui = k1 - k0; // 12 = normal, 13 = leap year

    // A month is a "zhongqi" month if it contains a major term (longitude multiple of 30).
    function hasZhongqi(startJDN, endJDN) {
      for (var lon = 0; lon < 360; lon += 30) {
        var guess = (startJDN + endJDN) / 2; // JDN ~ JD, close enough to seed the search
        var tjd = solarTermJD(lon, guess);
        var tLoc = jdToLocal(tjd);
        var tJDN = civilJDN(tLoc.y, tLoc.m, tLoc.d);
        if (tJDN >= startJDN && tJDN < endJDN) return true;
      }
      return false;
    }

    var months = [];
    var monthNum = 11;   // number to give the next ordinary month
    var lastNum = 10;    // number of the most recently pushed month
    var leapAssigned = false;
    for (var j = 0; j < 15; j++) {
      var leap = false;
      if (monthsInSui === 13 && !leapAssigned && j > 0) {
        if (!hasZhongqi(starts[j], starts[j + 1])) { leap = true; leapAssigned = true; }
      }
      // A leap month repeats the number of the month it follows and does not advance the count.
      var num = leap ? lastNum : monthNum;
      months.push({ startJDN: starts[j], endJDN: starts[j + 1], monthNum: num, leap: leap });
      if (!leap) { lastNum = monthNum; monthNum = monthNum === 12 ? 1 : monthNum + 1; }
    }
    _lunarCache[y] = months;
    return months;
  }

  // Local civil date -> {month, day, leap, monthDays}
  function toLunar(y, m, d) {
    var jdn = civilJDN(y, m, d);
    var table = lunarMonths(y).concat(lunarMonths(y + 1));
    for (var i = 0; i < table.length; i++) {
      var t = table[i];
      if (jdn >= t.startJDN && jdn < t.endJDN) {
        return { month: t.monthNum, day: jdn - t.startJDN + 1, leap: t.leap,
                 monthDays: t.endJDN - t.startJDN };
      }
    }
    return null;
  }

  global.QPAstro = {
    setTimezone: setTimezone, getTimezone: getTimezone,
    gregToJD: gregToJD, jdToGreg: jdToGreg, civilJDN: civilJDN,
    localToJD: localToJD, jdToLocal: jdToLocal, weekday: weekday,
    solarLongitude: solarLongitude, solarTermJD: solarTermJD,
    termsForYear: termsForYear, currentTerm: currentTerm, nextTerm: nextTerm,
    TERM_NAMES: TERM_NAMES, TERM_PINYIN: TERM_PINYIN,
    newMoonJD: newMoonJD, toLunar: toLunar, lunarMonths: lunarMonths
  };
})(typeof window !== 'undefined' ? window : globalThis);
