/* QiPath Pro: Qi Zheng Si Yu (七政四餘), Chinese horoscopic astrology.
 * The seven bodies come from the Swiss Ephemeris tables. 羅睺 is the mean descending node and 計都 the mean ascending node,
 * as astrologers kept them; 月孛 is the mean lunar apogee; 紫氣 has no astronomical object and follows a conventional
 * 28-year circuit from 女二度 on 14 Dec 1280. Palaces are the 中氣 divisions of the ecliptic; the Life palace is set by
 * placing the birth hour on the Sun's palace and counting to 卯. Schools differ on palaces and on 紫氣.
 */
(function (global) {
  'use strict';
  var BODIES = {
    sun:     { cn: '太陽', en: 'Sun',          tone: 1,  note: 'standing, vitality and recognition' },
    moon:    { cn: '太陰', en: 'Moon',         tone: 1,  note: 'feeling, home and support' },
    mercury: { cn: '水星', en: 'Mercury',      tone: 0,  note: 'thinking, speech and trade' },
    venus:   { cn: '金星', en: 'Venus',        tone: 1,  note: 'affection, taste and ease' },
    mars:    { cn: '火星', en: 'Mars',         tone: -1, note: 'drive, conflict and haste' },
    jupiter: { cn: '木星', en: 'Jupiter',      tone: 1,  note: 'growth, generosity and good counsel' },
    saturn:  { cn: '土星', en: 'Saturn',       tone: -1, note: 'duty, delay and endurance' },
    luohou:  { cn: '羅睺', en: 'Luo Hou',      tone: -1, note: 'upheaval and heated ambition (fire remainder)' },
    jidu:    { cn: '計都', en: 'Ji Du',        tone: -1, note: 'obstruction and hidden trouble (earth remainder)' },
    ziqi:    { cn: '紫氣', en: 'Purple Qi',    tone: 1,  note: 'quiet good fortune (wood remainder)' },
    yuebei:  { cn: '月孛', en: 'Yue Bei',      tone: -1, note: 'restlessness and entanglement (water remainder)' }
  };
  var ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'luohou', 'jidu', 'ziqi', 'yuebei'];
  var PALACES = [
    ['命宮', 'Life', 'character and the overall course of life'], ['財帛', 'Wealth', 'income and how money is held'],
    ['兄弟', 'Siblings', 'brothers, sisters and peers'], ['田宅', 'Property', 'home, land and family assets'],
    ['男女', 'Children', 'children and what you create'], ['奴僕', 'Staff', 'employees and helpers'],
    ['夫妻', 'Marriage', 'partner and marriage'], ['疾厄', 'Health', 'stamina and general wellbeing, never a diagnosis, so keep up your medical care'],
    ['遷移', 'Travel', 'moves, travel and life away from home'], ['官祿', 'Career', 'work, rank and reputation'],
    ['福德', 'Fortune', 'contentment and inner life'], ['相貌', 'Appearance', 'looks, bearing and first impressions']
  ];
  var RULER = ['saturn', 'saturn', 'jupiter', 'mars', 'venus', 'mercury', 'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter'];
  // 授時曆 mansion widths, 角 first: they sum to one circuit, 365.2575.
  var WIDTH = [12.1, 9.2, 16.3, 5.6, 6.5, 19.1, 10.4, 25.2, 7.2, 11.35, 8.9575, 15.4, 17.1, 8.6, 16.6, 11.8, 15.6, 11.3, 17.4, 0.05, 11.1, 33.3, 2.2, 13.3, 6.3, 17.25, 18.75, 17.3];
  var ZI_EPOCH = 2188796.5625, ZI_RATE = 13.05046 / 365.2425, NU = 9, CIRCUIT = 365.2575;   // 1280-12-14 01:30; 女 is mansion 9

  function mod(a, n) { return ((a % n) + n) % n; }
  function branchOf(lon) { return mod(10 - Math.floor(mod(lon, 360) / 30), 12); }
  function round1(x) { return Math.round(x * 10) / 10; }

  function meanNodes(jd) {
    var T = (jd - 2451545) / 36525;
    var asc = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
    var perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T * T * T / 80053 + T * T * T * T / 18999000;
    return { ascending: mod(asc, 360), descending: mod(asc + 180, 360), apogee: mod(perigee + 180, 360) };
  }

  // 紫氣 walks the mansions by its own convention; the result is placed on the ecliptic through the mansion stars.
  function purpleQi(jd) {
    var X = global.QPXiu, pos = 2, i;
    for (i = 0; i < NU; i++) pos += WIDTH[i];
    pos = mod(pos + (jd - ZI_EPOCH) * ZI_RATE, CIRCUIT);
    var m = 0;
    while (pos >= WIDTH[m]) { pos -= WIDTH[m]; m = (m + 1) % 28; }
    return { lon: X.lonInMansion(m, pos / WIDTH[m], jd), mansion: m, deg: pos };
  }

  /** birth: { y, m, d, hour, min, tz }. hourBranch from the pillars. Null outside 1900 to 2100 or before the tables load. */
  function chart(birth, hourBranch) {
    var E = global.QPEphem, A = global.QPAstro, X = global.QPXiu;
    var jd = A.localToJD(birth.y, birth.m, birth.d, birth.hour, birth.min || 0, birth.tz), pos = E.positions(jd);
    if (!pos) return null;
    var nodes = meanNodes(jd), pq = purpleQi(jd), lons = {}, retro = {};
    pos.forEach(function (p) { lons[p.key] = p.lon; retro[p.key] = p.retro; });
    lons.luohou = nodes.descending; lons.jidu = nodes.ascending; lons.yuebei = nodes.apogee; lons.ziqi = pq.lon;
    var ming = mod(branchOf(lons.sun) + 3 - hourBranch, 12), shen = branchOf(lons.moon), C = global.QPCore;
    var palaceAt = {};
    var palaces = PALACES.map(function (x, i) {
      var b = mod(ming - i, 12), p = { i: i, cn: x[0], en: x[1], note: x[2], branch: b, branchCn: C.BRANCHES[b], ruler: BODIES[RULER[b]], bodies: [] };
      palaceAt[b] = p;
      return p;
    });
    var bodies = ORDER.map(function (k) {
      var B = BODIES[k], b = branchOf(lons[k]), place = k === 'ziqi' ? { item: X.item(pq.mansion), deg: pq.deg } : X.mansionDegree(lons[k], jd);
      var o = { key: k, cn: B.cn, en: B.en, tone: B.tone, note: B.note, lon: round1(lons[k]), branch: b, branchCn: C.BRANCHES[b], palace: palaceAt[b],
                mansion: place.item, deg: round1(place.deg), retro: !!retro[k] };
      palaceAt[b].bodies.push(o);
      return o;
    });
    function ruler(p) {
      var key = ORDER.filter(function (k) { return BODIES[k] === p.ruler; })[0];
      return bodies.filter(function (o) { return o.key === key; })[0];
    }
    palaces.forEach(function (p) { var t = p.bodies.reduce(function (s, o) { return s + o.tone; }, 0); p.tone = t; });
    return { palaces: palaces, bodies: bodies, ming: palaceAt[ming], shen: palaceAt[shen], mingRuler: ruler(palaceAt[ming]), shenRuler: ruler(palaceAt[shen]) };
  }

  global.QPQiZheng = { chart: chart, branchOf: branchOf, meanNodes: meanNodes, purpleQi: purpleQi };
})(typeof window !== 'undefined' ? window : globalThis);
