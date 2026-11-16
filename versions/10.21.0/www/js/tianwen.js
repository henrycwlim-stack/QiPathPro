/* QiPath Pro: planets on the Qimen plate, and the 7 Stars framework.
 * Planet overlay: true longitude -> Earthly Branch (the classical twelve palaces, where 子 runs from 300 to 330 degrees and the
 * branches run backwards from there) -> Palace, then compared with the plate for that hour. Needs QPEphem loaded.
 * 7 Stars: seven developmental stages with an audit and a multi-year map, and a finder for walking-practice windows.
 */
(function (global) {
  'use strict';
  var C = global.QPCore;
  var ALL = [1, 2, 3, 4, 6, 7, 8, 9];
  var BRANCH_PALACE = [1, 8, 8, 3, 4, 4, 9, 2, 2, 7, 6, 6];
  var PAL_ELEM = { 1: 4, 2: 2, 3: 0, 4: 0, 6: 3, 7: 3, 8: 2, 9: 1 };
  var BEARING = { 1: 0, 8: 45, 3: 90, 4: 135, 9: 180, 2: 225, 7: 270, 6: 315 };
  var PLANETS = [
    { key: 'jupiter', cn: '歲星', en: 'Jupiter', elem: 0, stems: ['甲', '乙'], means: 'growth, leadership and long-term momentum' },
    { key: 'mars', cn: '熒惑', en: 'Mars', elem: 1, stems: ['丙', '丁'], means: 'visibility, sudden breakthroughs and crisis' },
    { key: 'saturn', cn: '填星', en: 'Saturn', elem: 2, stems: ['戊', '己'], means: 'stability, boundaries and assets' },
    { key: 'venus', cn: '太白', en: 'Venus', elem: 3, stems: ['庚', '辛'], means: 'discipline, resistance and competitive edge' },
    { key: 'mercury', cn: '辰星', en: 'Mercury', elem: 4, stems: ['壬', '癸'], means: 'communication, hidden intelligence and logistics' }
  ];
  var WONDERS = ['乙', '丙', '丁'];

  function branchOf(lon) { return (((-Math.floor((lon - 300) / 30)) % 12) + 12) % 12; }
  function palaceHas(pa, stems) { return stems.indexOf(pa.heavenStemCn) >= 0 || stems.indexOf(pa.heavenStem2Cn) >= 0; }

  /** Where each visible planet stands on a plate at a moment, and how it meets that palace. */
  function overlay(chart, formations, jd) {
    var E = global.QPEphem, P = chart.palacesByNumber;
    return PLANETS.map(function (pl) {
      var lon = E.longitude(pl.key, jd);
      if (lon === null) return null;
      var b = branchOf(lon), num = BRANCH_PALACE[b], pa = P[num], pe = PAL_ELEM[num];
      var rel = pl.elem === pe ? 'home' : C.produces(pl.elem, pe) ? 'generates' : C.produces(pe, pl.elem) ? 'drawn' : C.controls(pl.elem, pe) ? 'presses' : 'pressed';
      var aligned = palaceHas(pa, pl.stems), forms = (formations || []).filter(function (f) { return f.category === 'auspicious' && (f.palaces || []).indexOf(num) >= 0; });
      var strong = pa.gateRank !== 0 && (WONDERS.indexOf(pa.heavenStemCn) >= 0 || pa.gateRank === 2 || forms.length > 0);
      var status = aligned && (rel === 'home' || rel === 'generates') && strong && !pa.isEmpty ? 'Super-structure' : rel === 'home' ? 'Amplified' : aligned ? 'Aligned' : rel === 'generates' ? 'Supporting' : rel === 'presses' || rel === 'pressed' ? 'In tension' : 'Neutral';
      return { key: pl.key, cn: pl.cn, en: pl.en, element: C.ELEM_EN[pl.elem], means: pl.means, stems: pl.stems, lon: Math.round(lon * 100) / 100, branch: C.BRANCHES[b], num: num, dir: pa.dir,
        relation: rel, aligned: aligned, void: !!pa.isEmpty, status: status, formations: forms.map(function (f) { return f.name; }), stemLanding: pl.stems.map(function (s) {
          var n = ALL.concat([5]).filter(function (x) { return palaceHas(P[x], [s]); })[0]; return { stem: s, dir: n ? (n === 5 ? 'Centre' : P[n].dir) : null }; }).filter(function (x) { return x.dir; }) };
    }).filter(Boolean);
  }
  function statusText(o) {
    var rel = { home: 'in its home element, so it amplifies this palace (True ' + o.element + ')', generates: 'feeding this palace', drawn: 'drawing on this palace', presses: 'pressing on this palace', pressed: 'held back by this palace' }[o.relation];
    return o.en + ' stands in ' + o.branch + ', the ' + o.dir + ' palace, ' + rel + '.' + (o.aligned ? ' Its own stem is on the heaven plate here.' : '') + (o.void ? ' This palace is void, so its effect is hollow for now.' : '') +
      (o.status === 'Super-structure' ? ' With a strong stem, door or structure in place, this is an astronomically backed window.' + (o.formations.length ? ' Structures here: ' + o.formations.join(', ') + '.' : '') : '');
  }
  function eachHour(from, days, fn) {
    for (var k = 0; k < days * 12; k++) {
      var d = new Date(from.y, from.m - 1, from.d, 1 + k * 2, 30);
      fn({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hour: d.getHours(), min: 30 });
    }
  }
  /** Double-hours in which a planet forms a super-structure. */
  function superWindows(from, days, limit) {
    var Q = global.QPQimen, A = global.QPAstro, out = [], perDay = {};
    eachHour(from, days, function (w) {
      if (w.hour < 7) return;
      var res = Q.chartFor('hour', w), jd = A.localToJD(w.y, w.m, w.d, w.hour, w.min), key = w.y + '-' + w.m + '-' + w.d;
      if (global.QPSystems.disharmony(res.pillars.day.stem, res.pillars.hour.stem)) return;
      overlay(res.chart, res.formations, jd).forEach(function (o) {
        // At most two a day, so one busy day does not fill the list.
        if (o.status === 'Super-structure' && (perDay[key] = (perDay[key] || 0) + 1) <= 2) out.push({ when: w, range: res.pillars.hourRange, pillar: res.pillars.hour.cn, planet: o.en, dir: o.dir, element: o.element, stem: res.chart.palacesByNumber[o.num].heavenStemCn, gate: res.chart.palacesByNumber[o.num].gate, relation: o.relation, formations: o.formations });
      });
    });
    return out.slice(0, limit || 8);
  }

  /* ---------------- the 7 Stars framework ---------------- */
  var STAGES = [
    { n: 1, star: '貪狼', en: 'Tanlang', title: 'The Root', focus: 'Foundation, security and getting your footing.', ask: 'Are you firefighting and securing your baseline?', move: 'Secure a stable base before you try to expand.', release: '' },
    { n: 2, star: '巨門', en: 'Jumen', title: 'The Network', focus: 'Alliances, communication and gathering resources.', ask: 'Is your energy going to stakeholders, negotiation and your network?', move: 'Build the relationships that will carry you through resistance.', release: 'Doing everything alone to survive.' },
    { n: 3, star: '祿存', en: 'Lucun', title: 'The Crucible', focus: 'Conflict, stress-testing and heavy resistance.', ask: 'Are you pushing through a bottleneck or opposition?', move: 'Treat the friction as a test of the system, and find out what it reveals.', release: 'Needing everyone to agree with you.' },
    { n: 4, star: '文曲', en: 'Wenqu', title: 'The Pivot', focus: 'Strategy, new skills and creative problem-solving.', ask: 'Are you designing new models or changing your approach through study?', move: 'Refine the approach instead of pushing harder on the old one.', release: 'Trying to win by force alone.' },
    { n: 5, star: '廉貞', en: 'Lianzhen', title: 'The Centre', focus: 'Leadership, holding the vision and keeping things intact under pressure.', ask: 'Are you the anchor or champion of a major initiative?', move: 'Hold the centre so others can act with confidence.', release: 'Endless analysis and keeping your options open.' },
    { n: 6, star: '武曲', en: 'Wuqu', title: 'Execution', focus: 'Delivering results, scaling and building repeatable systems.', ask: 'Are you driving delivery and hitting milestones?', move: 'Turn the vision into durable, repeatable routines.', release: 'Being personally needed for every decision.' },
    { n: 7, star: '破軍', en: 'Pojun', title: 'Completion', focus: 'Harvesting results, closing loops and preparing for the next cycle.', ask: 'Are you bringing a major phase to a close?', move: 'Close it well, then look for the next Root.', release: 'Holding on to what has already finished its work.' }
  ];
  /** statuses[i]: 'done', 'working', 'stuck' or 'none'. Finds the first star not yet secured, and whether the current stage has outrun it. */
  function audit(current, statuses) {
    var stuck = STAGES.filter(function (s, i) { return statuses[i] === 'stuck'; })[0] || null;
    var gap = STAGES.filter(function (s, i) { return s.n < current && statuses[i] !== 'done'; })[0] || null;
    var msg;
    if (gap) msg = 'You are working at Star ' + current + ', but Star ' + gap.n + ' (' + gap.title + ') is not yet secure. Go back and steady it before you ask more of this stage: ' + gap.move;
    else if (stuck) msg = 'Star ' + stuck.n + ' (' + stuck.title + ') is your bottleneck. ' + stuck.move + (stuck.n === 3 ? ' If the friction will not shift, look to Star 4: you may need a new approach, not more effort.' : '');
    else msg = 'Your earlier stages look secure. Keep your actions matched to Star ' + current + ': ' + STAGES[current - 1].move;
    return { gap: gap, stuck: stuck, message: msg };
  }
  /** Lays a multi-year chapter across the seven stars. */
  function horizon(startIso, years, today) {
    var a = startIso.split('-').map(Number), t0 = Date.UTC(a[0], a[1] - 1, a[2]), span = years * 365.25 * 864e5 / 7, now0 = Date.UTC(today.y, today.m - 1, today.d);
    var iso = function (ms) { return new Date(ms).toISOString().slice(0, 10); };
    return STAGES.map(function (s, i) { var lo = t0 + i * span, hi = lo + span; return { n: s.n, title: s.title, star: s.star, from: iso(lo), to: iso(hi - 864e5), current: now0 >= lo && now0 < hi }; });
  }

  /* ---------------- windows for the walking practice ---------------- */
  // For breakthroughs, each door serves a different purpose.
  var DOOR_USE = {
    '开门': 'Open Door: to crack open a closed system, launch something new or restart a stalled negotiation.',
    '景门': 'Scenery Door: for litigation, documents, audits, or when you need visibility and clarity.',
    '休门': 'Rest Door: for harmony, resting resources or soft diplomacy.'
  };
  var OBJECTIVES = {
    authority: { label: 'Authority or overcoming heavy adversity', fast: true, find: function (pa) { return pa.spirit === '值符'; }, sym: 'the Chief (值符)' },
    speed: { label: 'Speed, expansion, reach or visibility', fast: true, find: function (pa) { return pa.spirit === '九天'; }, sym: 'Nine Heavens (九天)' },
    breakthrough: { label: 'Breakthroughs, clearing disputes or quick wins', find: function (pa, door) { return palaceHas(pa, ['丁']) && (door ? pa.gate === door : !!DOOR_USE[pa.gate]); }, fast: true, sym: 'Ding (丁) with the Open, Scenery or Rest Door', note: 'Ding (丁) is the Star Noble (星奇), suited to stealthy breakthroughs, lateral solutions, precision intelligence and dissolving legal or administrative blockages.' }
  };
  var STEM_PAIR = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
  // Consolidation asks for a Noble or 戊, per the compendium's reading of 伏吟, without a harsh door.
  var ANCHORS = ['乙', '丙', '丁', '戊'];
  OBJECTIVES.consolidate = { label: 'Consolidating, protecting assets or holding ground', fast: false, find: function (pa) { return ANCHORS.indexOf(pa.heavenStemCn) >= 0 && pa.gateRank !== 0; }, sym: 'a Noble (乙, 丙, 丁) or Wu (戊) without a harsh door',
    note: 'A 伏吟 hour is allowed for this goal only, when the target palace holds a Noble or Wu (戊).' };
  var STEM_FUYIN = ['fan_yin'];   // the structures a Noble or 戊 can carry; 伏吟门 (Doors) is not among them
  // The Sage Path looks inward: a clean palace with 值符, 九地 or a Noble, ideally on the Rest or Scenery Door.
  var SAGE_SIGN = { '值符': 'The Chief (值符): centredness and steadiness.', '九地': 'Nine Earth (九地): patience, deep roots and silent observation.',
    '丁': 'Ding (丁), the Star Noble: clarity and sudden insight.', '丙': 'Bing (丙), the Moon Noble: illumination.', '乙': 'Yi (乙), the Sun Noble: adaptive, flowing wisdom.' };
  var SAGE_DOOR = { '休门': 'Rest Door: inner reflection and emotional recalibration.', '景门': 'Scenery Door: higher awareness and seeing underlying patterns.' };
  OBJECTIVES.sage = { label: 'Sage Path: inner clarity rather than an outcome', fast: false, sage: true,
    find: function (pa) { return pa.gateRank !== 0 && pa.spiritNature !== 'hostile' && pa.spiritNature !== 'deceptive' && !!(SAGE_SIGN[pa.spirit] || SAGE_SIGN[pa.heavenStemCn]); }, sym: 'the Chief (值符), Nine Earth (九地) or a Noble (乙, 丙, 丁), with the Rest or Scenery Door ranked first',
    note: 'Here you stop asking how to win, and ask instead what inner blockage or blind spot is shaping the situation.' };
  var SAGE_FUYIN = 'Fuyin chart: still and slow. That can suit quiet reflection, but do not expect movement from this hour.';
  var FUYIN_NOTE = 'Fuyin chart: Stable and positive for consolidation, but execution will be slow and deliberate. Allow extra runway.';
  /**
   * Clean double-hours for an objective: the target palace is not void and has no hostile structure, and the plate is never 反吟.
   * Fast goals also reject 伏吟. Consolidation accepts a stem and star 伏吟 with a warning, when the palace holds a Noble or 戊. The compendium
   * reads that as slow but positive, while Doors 伏吟 ("everything is inauspicious and stagnant") stays rejected through the hostile check.
   */
  function ritualWindows(objective, from, days, fav, limit, door) {
    var Q = global.QPQimen, O = OBJECTIVES[objective], out = [], rejected = { void: 0, hostile: 0, plate: 0, disharmony: 0 };
    eachHour(from, days, function (w) {
      if (w.hour < 7) return;
      var res = Q.chartFor('hour', w), ch = res.chart, dh = global.QPSystems.disharmony(res.pillars.day.stem, res.pillars.hour.stem);
      ALL.forEach(function (n) {
        var pa = ch.palacesByNumber[n];
        if (!O.find(pa, door)) return;
        if (pa.isEmpty) { rejected.void++; return; }
        if (dh) { rejected.disharmony++; return; }
        if (ch.meta.fanYin || (O.fast && ch.meta.fuYin)) { rejected.plate++; return; }
        var allowFu = !O.fast && ch.meta.fuYin;
        if (allowFu && ANCHORS.indexOf(pa.heavenStemCn) < 0) { rejected.plate++; return; }
        if (res.formations.some(function (f) { return f.category === 'hostile' && (f.palaces || []).indexOf(n) >= 0 && !(allowFu && STEM_FUYIN.indexOf(f.id) >= 0); })) { rejected.hostile++; return; }
        var start = new Date(w.y, w.m - 1, w.d, w.hour - 1 < 0 ? 23 : (w.hour % 2 ? w.hour : w.hour - 1), 0);
        out.push({ when: w, startHour: start.getHours(), range: res.pillars.hourRange, pillar: res.pillars.hour.cn, num: n, dir: pa.dir, bearing: BEARING[n], stem: pa.heavenStemCn, gate: pa.gate, star: pa.starCn, deity: pa.spirit, doorUse: objective === 'breakthrough' ? DOOR_USE[pa.gate] : null, plateNote: ch.meta.fuYin ? (O.sage ? SAGE_FUYIN : FUYIN_NOTE) : null, sage: O.sage ? [SAGE_SIGN[pa.spirit], SAGE_SIGN[pa.heavenStemCn], SAGE_DOOR[pa.gate]].filter(Boolean) : null, sageDoor: !!(O.sage && SAGE_DOOR[pa.gate]), combo: STEM_PAIR[pa.heavenStemCn] === pa.earthStemCn ? pa.heavenStemCn + pa.earthStemCn : null, score: Q.palaceQuality(ch, res.formations, n, fav).score });
      });
    });
    // For consolidation, an anchored 伏吟 hour suits the goal better than a fast-moving plate of the same quality.
    var rank = function (x) { return x.score + (x.plateNote && !x.sage ? 2 : 0) + (x.sageDoor ? 3 : 0); };
    out.sort(function (a, b) { return rank(b) - rank(a); });
    return { symbol: O.sym, note: O.note || '', windows: out.slice(0, limit || 6), found: out.length, rejected: rejected };
  }
  global.QPTianwen = { PLANETS: PLANETS, branchOf: branchOf, overlay: overlay, statusText: statusText, superWindows: superWindows, STAGES: STAGES, audit: audit, horizon: horizon, OBJECTIVES: OBJECTIVES, DOOR_USE: DOOR_USE, ritualWindows: ritualWindows };
})(typeof window !== 'undefined' ? window : globalThis);
