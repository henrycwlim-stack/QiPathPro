/* QiPath Pro — using the year.
 *
 *   - the annual flying stars by purpose: what each sector is good for this year, how to use it, and what to leave alone;
 *   - the 24 sectors of the year, rated for where a door sits (its location in the plan, not the way it faces);
 *   - the year in a person's chart: the year's elements against their structure groups, where they land, the industries
 *     each element carries, and how each investment element sits with their chart;
 *   - the year's Qimen palaces by purpose.
 * Ratings are QiPath's own method and every description is QiPath's own wording.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems;
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ================= annual flying stars by purpose (Period 9) ================= */

  var STAR_USE = {
    1: { tone: 'good', purpose: 'Advancement and closing', use: 'Promotion, interviews, signing and collecting. Do the paperwork and the follow-up calls here; a good spot to plan a new line inside your current company.',
         activate: 'Water or a small moving feature; work here with the door or window open.' },
    9: { tone: 'good', purpose: 'Leads, celebration and future wealth', use: 'The strongest star of Period 9. Use it to generate leads and launch; plan the profit-making side of your work here.',
         activate: 'Light and warmth: lamps, candles, red or purple; keep it bright and lived in.' },
    8: { tone: 'good', purpose: 'Steady growth and being indispensable', use: 'Savings, property and the work that makes you hard to replace. Slow, solid gains rather than leaps.',
         activate: 'Keep it clean and in use; earth tones, crystals or a heavy stable object.' },
    6: { tone: 'good', purpose: 'Authority, mentors and recovery', use: 'Meetings with seniors, asking for backing, and resting while you recover. Good for leadership decisions.',
         activate: 'Metal objects and a clear, orderly desk; meet your mentors here.' },
    4: { tone: 'mixed', purpose: 'Study, writing and building a following', use: 'Learning, copywriting, persuasion and community. Good for content that teaches and for growing an audience.',
         activate: 'Plants, books and a writing desk; avoid clutter.' },
    7: { tone: 'mixed', purpose: 'Attention and word of mouth', use: 'Use it for content, stories and talks that get people talking. Keep it to communication; it turns to argument and loss if pushed into conflict.',
         activate: 'Keep it calm; still water helps. Avoid heavy metal here.' },
    2: { tone: 'caution', purpose: 'Efficiency and slow-building projects', use: 'Systems, routines and the side project that pays later. If anyone in the home is unwell, keep them out of this area and see a doctor.',
         activate: 'Do not energise it. Metal (brass or copper objects, a metal wind chime) settles it.' },
    3: { tone: 'caution', purpose: 'Competition and negotiation prep', use: 'Prepare arguments and competitive plans here, but do not hold the meeting here; it breeds disputes.',
         activate: 'Calm it with red, warm light and quiet; avoid water and plants.' },
    5: { tone: 'avoid', purpose: 'Leave alone', use: 'No renovation, drilling or new projects here this year. Sleeping or working quietly is fine; avoid it for major projects and when unwell.',
         activate: 'Do not activate. Metal (brass, copper, pewter, a six-rod metal chime) and stillness settle it.' }
  };
  var DIR_PAL = { N: 1, SW: 2, E: 3, SE: 4, C: 5, Centre: 5, NW: 6, W: 7, NE: 8, S: 9 };
  var PAL_FULL = { 1: 'North', 2: 'South-west', 3: 'East', 4: 'South-east', 5: 'Centre', 6: 'North-west', 7: 'West', 8: 'North-east', 9: 'South' };

  function annualStars(solarYear) {
    var star = S.annualStar(solarYear), grid = S.flyingStars(star), cells = [];
    grid.forEach(function (row) { row.forEach(function (c) { cells.push(c); }); });
    var byPal = {};
    cells.forEach(function (c) { byPal[DIR_PAL[c.dir]] = c.star; });
    return { centre: star, byPalace: byPal };
  }
  function starPurposes(user, solarYear) {
    var a = annualStars(solarYear), gua = user && user.mansions ? user.mansions.gua : null;
    var guaPal = gua === 5 ? (user.gender === 'M' ? 2 : 8) : gua;
    var list = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
      var s = a.byPalace[n], u = STAR_USE[s];
      return { palace: n, dir: PAL_FULL[n], star: s, tone: u.tone, purpose: u.purpose, use: u.use, activate: u.activate, yours: n === guaPal };
    });
    var order = { good: 0, mixed: 1, caution: 2, avoid: 3 };
    list.sort(function (x, y) { return order[x.tone] - order[y.tone] || [9, 1, 8, 6, 4, 7, 2, 3, 5].indexOf(x.star) - [9, 1, 8, 6, 4, 7, 2, 3, 5].indexOf(y.star); });
    var mine = guaPal ? list.filter(function (x) { return x.yours; })[0] : null;
    return { year: solarYear, centre: a.centre, list: list, gua: gua, guaPalace: guaPal, mine: mine,
      principles: [
        'Pick the sector for the outcome you want, not only for wealth: activating a wealth sector when what you need is rest or recovery just makes you busier.',
        'Use the sector awake, for the activity itself: plan, meet, write and make calls there. Sleeping in it is not activation.',
        'Inside one room, divide the floor into the same nine squares and the year\'s stars fall in the same pattern, so a single room can carry the plan.',
        'Your own Life Gua sector is where personal activations land best; check what star sits there this year.'
      ] };
  }

  /* ================= the 24 sectors of the year, by door location ================= */

  var BASE = { 9: 5, 1: 5, 8: 4, 6: 4, 4: 3, 7: 2, 3: 2, 2: 1.5, 5: 1 };
  var DOOR_THEME = {
    9: 'things come together: recognition, celebration and strong leads',
    1: 'advancement seeks you out: promotion, offers and new openings',
    8: 'steady gain: savings, property and dependable progress',
    6: 'backing from above: mentors, authority and help with recovery',
    4: 'learning and connection: study, writing and a growing circle',
    7: 'talk and attention: word of mouth, but sharp words and small losses',
    3: 'friction: disputes, competition and legal irritations',
    2: 'slow going: fatigue and delay; look after your health and see a doctor if unwell',
    5: 'detours: obstacles and setbacks; avoid starting major works here'
  };
  function doorSectors(solarYear) {
    var F = global.QPFengShui, a = annualStars(solarYear), af = F.afflictions(solarYear), yp = C.stemBranch(mod(solarYear - 1984, 60));
    var B = global.QPBazi, noble = (B.NOBLEMAN[yp.stem] || []).map(function (b) { return C.BRANCHES[b]; });
    var BRANCH_LU = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 };
    var lu = C.BRANCHES[BRANCH_LU[yp.stem]];
    var tk = (af.threeKillings.mountains || '');
    return F.MOUNTAINS.map(function (m, i) {
      var pal = m[1], star = a.byPalace[pal], r = BASE[star], notes = [];
      if (m[0] === af.taiSui.char) { r -= 1; notes.push('Tai Sui 太歲 sits here: do not disturb it'); }
      if (m[0] === af.yearBreaker.char) { r -= 1.5; notes.push('Year Breaker 歲破: avoid major works or important starts'); }
      if (tk.indexOf(m[0]) >= 0) { r -= 1; notes.push('Three Killings 三煞: keep it quiet'); }
      if (noble.indexOf(m[0]) >= 0) { r += 0.75; notes.push('the year\'s Nobleman 貴人 mountain: help arrives'); }
      if (m[0] === lu) { r += 0.5; notes.push('the year\'s Prosperity 祿 mountain'); }
      var stars = Math.max(1, Math.min(5, Math.round(r)));
      return { char: m[0], palace: pal, dir: PAL_FULL[pal], sub: m[2] + 1, label: PAL_FULL[pal].replace('South-', 'S').replace('North-', 'N').replace('east', 'E').replace('west', 'W')
          .replace('North', 'N').replace('South', 'S').replace('East', 'E').replace('West', 'W') + (m[2] + 1),
        star: star, stars: stars, theme: DOOR_THEME[star], notes: notes };
    });
  }

  /* ================= the year in your chart ================= */

  var INDUSTRY = [
    'education, publishing, design, fashion, agriculture, health and wellness, green energy',
    'technology, AI and digital media, energy, food and beverage, entertainment, marketing, beauty',
    'property, construction, logistics, mining, insurance, consultancy, storage',
    'finance, banking, engineering, machinery, automotive, metals, legal and compliance',
    'trade, shipping, travel, communications, beverages, cleaning, cold chain and fluids'
  ];
  var ASSET = [
    { cn: '木', en: 'Wood', what: 'property, land, rentals and anything that grows on land' },
    { cn: '火', en: 'Fire', what: 'digital assets, intellectual property, technology and media' },
    { cn: '土', en: 'Earth', what: 'physical assets: gold, commodities, collectibles and real goods' },
    { cn: '金', en: 'Metal', what: 'equities, funds and stakes in companies' },
    { cn: '水', en: 'Water', what: 'fixed income, deposits and money-market funds, the safest route' }
  ];
  var PILLAR_AREA = { Year: 'your network, industry and the circles you move in', Month: 'your job, career and business',
    Day: 'yourself and your closest relationship', Hour: 'investments, plans and the people who work for you' };

  /** The Lichun moment's four pillars: the year's own chart. */
  function yearChart(solarYear) {
    var A = global.QPAstro, t = A.termsForYear(solarYear)[0], g = A.jdToLocal(t.jd + 2 / 1440);   // two minutes after the term
    return C.fourPillars(g.y, g.m, g.d, g.hour, g.min);
  }
  function census(p) {
    var counts = [0, 0, 0, 0, 0];
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      var w = i === 1 ? 1.3 : 1.0;
      counts[C.STEM_ELEM[q.stem]] += w;
      C.HIDDEN[q.branch].forEach(function (h, hi) { counts[C.STEM_ELEM[h]] += w * (hi === 0 ? 0.9 : hi === 1 ? 0.45 : 0.25); });
    });
    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    return counts.map(function (v) { return Math.round(v / total * 100); });
  }
  function yearInChart(user, solarYear) {
    var yc = yearChart(solarYear), ys = census(yc), ns = user.deep.shares || census(user.pillars), de = user.deep.dayMasterElem;
    var GROUPS = ['Companion 比劫', 'Output 食傷', 'Wealth 財', 'Authority 官殺', 'Resource 印'];
    var groups = GROUPS.map(function (g, k) { var e = mod(de + k, 5); return { group: g, elem: C.ELEM[e] + ' ' + C.ELEM_EN[e], natal: ns[e], year: ys[e] }; });
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return ys[b] - ys[a]; });
    var p = user.pillars, labels = ['Year', 'Month', 'Day', 'Hour'];
    var lands = order.slice(0, 2).map(function (e) {
      var at = [];
      [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
        if (C.STEM_ELEM[q.stem] === e && i !== 2) at.push(labels[i]);
        if (C.STEM_ELEM[C.HIDDEN[q.branch][0]] === e) at.push(labels[i]);
      });
      at = at.filter(function (v, i, a) { return a.indexOf(v) === i; });
      var god = global.QPBaziPlus ? ['Companion', 'Output', 'Wealth', 'Authority', 'Resource'][mod(e - de, 5)] : '';
      return { elem: C.ELEM[e] + ' ' + C.ELEM_EN[e], share: ys[e], god: god, at: at,
        text: at.length ? 'It lands in your ' + at.map(function (l) { return l + ' pillar (' + PILLAR_AREA[l] + ')'; }).join(' and ') + ': put your time there.'
          : 'It does not sit in your own chart, so you meet it through the people and places around you.' };
    });
    var maxN = Math.max.apply(null, ns) || 1;
    var invest = ASSET.map(function (a, e) {
      var rel = Math.round(ns[e] / maxN * 100), fav = (user.deep.favourable || []).indexOf(e) >= 0;
      var verdict = ns[e] === 0 ? 'avoid' : rel < 50 ? 'caution' : fav ? 'suits' : 'neutral';
      return { elem: a.cn + ' ' + a.en, what: a.what, natal: ns[e], rel: rel, favourable: fav, yearShare: ys[e], verdict: verdict,
        text: verdict === 'avoid' ? 'Missing from your chart: the riskiest kind for you; learn it before you touch it.'
          : verdict === 'caution' ? 'Weak in your chart: go small and get advice before committing.'
          : verdict === 'suits' ? 'Strong and favourable in your chart: the kind you understand most naturally.'
          : 'Strong in your chart but not a favourable element: workable, with discipline.' };
    });
    return { year: solarYear, pillars: [yc.year, yc.month, yc.day, yc.hour].map(function (q) { return q.cn; }), yearShares: ys, natalShares: ns,
      groups: groups, lands: lands,
      rising: order.slice(0, 2).map(function (e) { return { elem: C.ELEM[e] + ' ' + C.ELEM_EN[e], industries: INDUSTRY[e] }; }),
      fading: order.slice(-2).map(function (e) { return { elem: C.ELEM[e] + ' ' + C.ELEM_EN[e], industries: INDUSTRY[e] }; }),
      invest: invest,
      focus: 'With one year, build on strength rather than fixing every flaw: put the most time into the area where the year\'s strongest element meets your chart.' };
  }

  /* ================= the year's Qimen palaces by purpose ================= */

  var DEITY_USE = {
    '值符': { purpose: 'Clear path', goal: 'obstacles', text: 'remove an obstacle and get the backing of people in charge' },
    '九天': { purpose: 'Wisdom and vision', goal: 'wisdom', text: 'think big, see the long game and speak at the right moment' },
    '九地': { purpose: 'Stability', goal: 'stability', text: 'settle down, stop the roller coaster and build a base' },
    '太阴': { purpose: 'Intuition', goal: 'intuition', text: 'sharpen your instincts and quiet planning' },
    '六合': { purpose: 'Charisma and connection', goal: 'charisma', text: 'draw people to you and build partnerships' },
    '白虎': { purpose: 'Courage', goal: 'courage', text: 'find the nerve to make the change, ask or confront' },
    '玄武': { purpose: 'Clear observation', goal: 'clarity', text: 'see people and problems as they really are' },
    '腾蛇': { purpose: 'Turning adversity round', goal: 'turnaround', text: 'turn a setback or a strange situation to your advantage' },
    '螣蛇': { purpose: 'Turning adversity round', goal: 'turnaround', text: 'turn a setback or a strange situation to your advantage' },
    '朱雀': { purpose: 'Voice and truth', goal: 'truth', text: 'speak up, publish and bring the truth out' },
    '勾陈': { purpose: 'Stability', goal: 'stability', text: 'hold ground and slow things down' }
  };
  function qimenYearPurposes(solarYear) {
    var Q = global.QPQimen, r = Q.chartFor('year', { y: solarYear, m: 6, d: 15, hour: 12, min: 0 }), out = [];
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var pa = r.chart.palacesByNumber[n]; if (!pa) return;
      var u = DEITY_USE[pa.spirit] || { purpose: 'General', goal: null, text: 'general use' };
      out.push({ palace: n, dir: pa.dir || PAL_FULL[n], deity: pa.spirit, star: pa.starCn, door: pa.gate, purpose: u.purpose, goal: u.goal, text: u.text,
        isVoid: !!pa.isEmpty });
    });
    return { year: solarYear, pillar: r.pillars.year.cn, list: out };
  }

  global.QPYear = { STAR_USE: STAR_USE, starPurposes: starPurposes, doorSectors: doorSectors, yearChart: yearChart, yearInChart: yearInChart,
    qimenYearPurposes: qimenYearPurposes, ASSET: ASSET, INDUSTRY: INDUSTRY };
})(typeof window !== 'undefined' ? window : globalThis);
