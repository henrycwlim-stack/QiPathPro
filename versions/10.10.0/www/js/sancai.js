/* QiPath Pro — 三才 San Cai execution engine.
 *
 * Orchestrates the three existing engines into a single mandate:
 *
 *   Heaven 天  Date Selection (擇日)   — which day, filtered against the user's own Bazi
 *   Earth  地  Flying Stars (飛星)     — which sector of the building to be physically in
 *   Man    人  Qimen Dunjia (奇門遁甲) — which hour, and which direction to face within it
 *
 * The three answer different questions, so they are scored separately and then combined.
 * The sector you sit in and the direction you face are deliberately distinct: Earth places
 * the body, Man orients the action.
 *
 * This is a timing and positioning framework from a long tradition, not a guarantee. It is
 * most useful as a way of committing to a considered window instead of acting at random.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;

  /* ---------- direction vocabulary ---------- */
  // Flying stars and Eight Mansions use abbreviations; Qimen uses full words.
  var ABBR = { North:'N', Northeast:'NE', East:'E', Southeast:'SE',
               South:'S', Southwest:'SW', West:'W', Northwest:'NW', Centre:'Centre' };
  var FULL = {};
  Object.keys(ABBR).forEach(function (k) { FULL[ABBR[k]] = k; });
  function abbr(d) { return ABBR[d] || d; }
  function full(d) { return FULL[d] || d; }

  /* ---------- goal definitions ---------- */
  /* Each goal names what the three layers must supply. The Qimen requirements are the
     classical activators for that kind of undertaking; the flying stars are the sectors
     whose energy the goal needs; the activity keys drive the date-selection scoring. */
  var GOALS = [
    {
      id: 'wealth', label: 'Wealth Manifestation', cn: '財富顯化',
      blurb: 'Money that arrives and stays — closing revenue, releasing capital, asking for a rate.',
      doors: ['生', '開'], stars: ['天任', '天禽'], deities: ['值符', '太陰', '六合'],
      stems: ['戊', '己'],
      flyingStars: [8, 1, 6], activity: 'finance',
      action: 'Conduct the money conversation, sign, invoice or transfer inside this window. ' +
              'Ask for a specific figure rather than a range.',
      manifest: 'growth that compounds rather than a single windfall'
    },
    {
      id: 'career', label: 'Career Advancement', cn: '事業晉升',
      blurb: 'Promotion, visibility with decision-makers, a formal step up.',
      doors: ['開', '生'], stars: ['天心', '天輔'], deities: ['值符', '九天'],
      stems: ['丙', '丁'],
      flyingStars: [6, 9, 1], activity: 'office',
      action: 'Put yourself in front of the person who decides. Make the request directly and ' +
              'in person, not by message.',
      manifest: 'an opening, and the standing to walk through it'
    },
    {
      id: 'conflict', label: 'Conflict Resolution', cn: '化解爭端',
      blurb: 'De-escalating a dispute, repairing a relationship, settling terms.',
      doors: ['休', '杜'], stars: ['天輔', '天心'], deities: ['六合', '太陰'],
      stems: ['乙', '丁'],
      flyingStars: [1, 4, 6], activity: 'meeting',
      action: 'Open the conversation yourself and speak first. Aim to reduce the temperature ' +
              'before settling anything; do not force a resolution in the same sitting.',
      manifest: 'the settling of something agitated'
    },
    {
      id: 'pitch', label: 'Pitching a Pilot Initiative', cn: '提案試行',
      blurb: 'Presenting a proposal, launching a trial, winning approval for something new.',
      doors: ['景', '開'], stars: ['天英', '天輔'], deities: ['九天', '值符'],
      stems: ['丁', '丙'],
      flyingStars: [9, 4, 6], activity: 'petition',
      action: 'Present, demonstrate, make it visible. Lead with the result you are promising ' +
              'and keep the ask small enough to be approved in the room.',
      manifest: 'to be seen accurately, and believed'
    },
    {
      id: 'academic', label: 'Academic / Certification Success', cn: '學業考證',
      blurb: 'Examinations, accreditation, qualifying, defending work.',
      doors: ['景', '休'], stars: ['天輔', '天心'], deities: ['太陰', '值符'],
      stems: ['丁', '乙'],
      flyingStars: [4, 1, 9], activity: 'study',
      action: 'Sit the paper, submit the work, or do the final consolidation in this window. ' +
              'Revise rather than learn new material.',
      manifest: 'preparation showing itself clearly under examination'
    },
    {
      id: 'negotiate', label: 'High-Stakes Negotiation', cn: '重大談判',
      blurb: 'Contract terms, valuation, anything adversarial with real money on it.',
      doors: ['開', '景', '生'], stars: ['天心', '天禽'], deities: ['值符', '六合'],
      stems: ['庚', '戊'],
      flyingStars: [6, 8, 1], activity: 'contract',
      action: 'Table your number first if the window is strong; hold and let them move if it ' +
              'is merely workable. Do not sign outside the hour.',
      manifest: 'terms that hold after the room empties'
    },
    {
      id: 'launch', label: 'Launching or Opening', cn: '開市開創',
      blurb: 'Going live, opening a business, starting something publicly.',
      doors: ['開', '生', '景'], stars: ['天心', '天英'], deities: ['值符', '九天'],
      stems: ['丙', '戊'],
      flyingStars: [8, 9, 6], activity: 'business',
      action: 'Cross the threshold inside the window — publish, open the doors, take the first ' +
              'order. Symbolic first action counts.',
      manifest: 'a beginning that carries its own momentum'
    },
    {
      id: 'closing', label: 'Ending or Restructuring', cn: '結束改革',
      blurb: 'Closing a line, exiting, cutting what is finished.',
      doors: ['死', '驚'], stars: ['天芮', '天柱'], deities: ['九地', '白虎', '勾陳'],
      stems: ['庚', '辛'],
      flyingStars: [7, 3, 2], activity: 'demolish',
      action: 'Make the cut cleanly and once. Communicate the decision as settled, not open ' +
              'for negotiation.',
      manifest: 'release from what is already over'
    }
  ];

  // Double-hours that fall inside a workable part of the day. 辰 through 戌 spans
  // 07:00 to 21:00. Every goal here describes a human action taken with other people,
  // so a technically perfect 03:00 window is not an actionable one.
  var DAY_BRANCHES = [4, 5, 6, 7, 8, 9, 10];

  var TIMEFRAMES = [
    { id: '7',  days: 7,  label: 'Next 7 days' },
    { id: '14', days: 14, label: 'Next 14 days' },
    { id: '30', days: 30, label: 'Next 30 days' },
    { id: '60', days: 60, label: 'Next 60 days' }
  ];

  /* ---------- Earth: the sector to occupy ---------- */

  var STAR_ROLE = {
    1: 'career movement and fresh starts', 2: 'illness — keep quiet',
    3: 'argument and litigation', 4: 'study, writing and romance',
    5: 'misfortune — do not disturb', 6: 'authority, mentors and heaven-sent help',
    7: 'loss and gossip', 8: 'wealth and property', 9: 'recognition and future opportunity'
  };
  var HOSTILE_STARS = [5, 2, 3, 7];

  function earthLayer(dt, goal, user) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, 12, 0);
    var annual = S.annualStar(p.solarYear);
    var monthly = S.monthStar(p.solarYear, p.month.branch);
    var aGrid = S.flyingStars(annual);
    var mGrid = S.flyingStars(monthly);
    var em = user.mansions;

    var cells = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        var a = aGrid[r][c], m = mGrid[r][c];
        if (a.dir === 'Centre') continue;
        var score = 0, why = [];
        var gi = goal.flyingStars.indexOf(a.star);
        var gm = goal.flyingStars.indexOf(m.star);
        if (gi >= 0) { score += 30 - gi * 6; why.push('annual ' + a.star + ' — ' + STAR_ROLE[a.star]); }
        if (gm >= 0) { score += 24 - gm * 5; why.push('monthly ' + m.star + ' — ' + STAR_ROLE[m.star]); }
        if (HOSTILE_STARS.indexOf(a.star) >= 0) { score -= 26; why.push('annual ' + a.star + ' is hostile here'); }
        if (HOSTILE_STARS.indexOf(m.star) >= 0) { score -= 18; why.push('monthly ' + m.star + ' is hostile here'); }
        if (em.good.indexOf(a.dir) >= 0) {
          score += 14;
          why.push('one of your Eight Mansions supportive directions (Gua ' + em.gua + ' ' + em.guaCn + ')');
        }
        if (em.avoid.indexOf(a.dir) >= 0) { score -= 12; why.push('an Eight Mansions direction you should avoid'); }
        if (a.dir === em.best) { score += 8; why.push('your single best personal direction'); }
        cells.push({ dir: a.dir, dirFull: full(a.dir), annual: a.star, monthly: m.star,
                     annualName: a.name, monthlyName: m.name,
                     score: score, why: why });
      }
    }
    cells.sort(function (x, y) { return y.score - x.score; });
    return { annual: annual, monthly: monthly, cells: cells,
             best: cells[0], worst: cells[cells.length - 1] };
  }

  /* ---------- Man: the hour and the direction to face ---------- */

  function manLayer(dt, hourBranch, goal, user) {
    var hh = hourBranch === 0 ? 23 : (hourBranch * 2 - 1);
    var p = C.fourPillars(dt.y, dt.m, dt.d, hh, 30);
    var chart = S.qimen(p);
    var forms = S.formations(p, dt.m);
    var byPalace = {};
    forms.forEach(function (f) {
      (f.palaces || []).forEach(function (n) { (byPalace[n] = byPalace[n] || []).push(f); });
    });

    var best = null;
    [1,2,3,4,6,7,8,9].forEach(function (n) {
      var pa = chart.palacesByNumber[n];
      if (!pa) return;
      var score = 0, why = [], matched = { door: false, star: false, deity: false, stem: false };

      var di = pa.gate ? goal.doors.indexOf(pa.gate.charAt(0)) : -1;
      if (di >= 0) { score += 34 - di * 7; matched.door = true;
        why.push(pa.gate + ' is a required door for this goal'); }
      var si = pa.starCn ? goal.stars.indexOf(pa.starCn) : -1;
      if (si >= 0) { score += 20 - si * 5; matched.star = true;
        why.push(pa.starCn + ' turns here'); }
      var ei = pa.spirit ? goal.deities.indexOf(pa.spirit) : -1;
      if (ei >= 0) { score += 20 - ei * 5; matched.deity = true;
        why.push(pa.spirit + ' keeps this palace'); }
      var stems = [pa.heavenStemCn, pa.earthStemCn].filter(Boolean);
      var sm = stems.filter(function (x) { return goal.stems.indexOf(x) >= 0; });
      if (sm.length) { score += 8 * sm.length; matched.stem = true;
        why.push('stem ' + sm.join(' and ') + ' present'); }

      score += (pa.gateRank === 2 ? 10 : pa.gateRank === 0 ? -14 : 0);
      if (pa.isEmpty) { score -= 24; why.push('the palace is void (空亡) — commitments made here tend not to hold'); }
      if (pa.isChief) { score += 6; why.push('the chief star sits here'); }
      if (pa.isEnvoy) { score += 4; why.push('the envoy gate sits here'); }

      var pf = byPalace[n] || [];
      var good = pf.filter(function (f) { return f.category === 'auspicious'; });
      var bad = pf.filter(function (f) { return f.category === 'hostile'; });
      score += Math.min(14, good.length * 5) - Math.min(30, bad.length * 10);

      if (!best || score > best.score) {
        best = { palace: pa, score: score, why: why, matched: matched,
                 formations: pf, good: good.length, hostile: bad.length };
      }
    });

    var hq = C.hourQuality(p.day, hourBranch, p.month.branch);
    var total = (best ? best.score : 0) + (hq.score - 5) * 3;
    return {
      hourBranch: hourBranch, range: C.HOUR_RANGE[hourBranch],
      pillars: p, chart: chart, formations: forms,
      pick: best, hourQuality: hq,
      score: total,
      voidBranches: chart.voidBranches
    };
  }

  /* ---------- Heaven: the day ---------- */

  function heavenLayer(dt, goal, user) {
    var d = S.scoreDay(dt.y, dt.m, dt.d, goal.activity, user);
    var p = C.fourPillars(dt.y, dt.m, dt.d, 12, 0);
    var clash = p.day.branch === C.branchClash(user.zodiacBranch);
    var harm = p.day.branch === C.branchHarm(user.zodiacBranch);
    var favElem = user.favourable.indexOf(C.STEM_ELEM[p.day.stem]) >= 0;
    return {
      score: d.score, day: d, pillar: p.day, officer: d.officer,
      duty: d.duty, mansion: d.mansion,
      clash: clash, harm: harm, favourableStem: favElem,
      reasons: d.reasons
    };
  }

  /* ---------- orchestration ---------- */

  var WEIGHT = { heaven: 0.34, earth: 0.22, man: 0.44 };

  /**
   * Scan the window and return the strongest execution windows.
   * Days that clash the user's own sign are excluded outright rather than merely penalised:
   * the whole point of filtering against the natal chart is that a personally clashed day is
   * not a candidate however good the hour looks.
   */
  function findWindows(startDt, days, goalId, user, opts) {
    opts = opts || {};
    var goal = GOALS.filter(function (g) { return g.id === goalId; })[0] || GOALS[0];
    var jd0 = A.gregToJD(startDt.y, startDt.m, startDt.d);
    var results = [], excluded = [];
    var nowH = startDt.hour !== undefined ? startDt.hour : 0;
    var dayOnly = opts.dayOnly !== false;

    for (var i = 0; i < days; i++) {
      var g = A.jdToGreg(jd0 + i);
      var dt = { y: g.y, m: g.m, d: Math.floor(g.d) };
      var heaven = heavenLayer(dt, goal, user);

      if (heaven.clash) {
        excluded.push({ date: iso(dt), reason: 'clashes your ' + C.ZODIAC[user.zodiacBranch] +
          ' sign (' + heaven.pillar.cn + ' day)' });
        continue;
      }
      if (heaven.score < (opts.minHeaven || 38)) {
        excluded.push({ date: iso(dt), reason: heaven.officer.cn + ' day scores ' +
          heaven.score + '/100 for ' + goal.label.toLowerCase() });
        continue;
      }

      var earth = earthLayer(dt, goal, user);

      for (var b = 0; b < 12; b++) {
        if (dayOnly && DAY_BRANCHES.indexOf(b) < 0) continue;
        // Skip hours already past on the first day.
        if (i === 0 && b !== 0 && (b * 2 - 1) + 2 <= nowH) continue;
        var man = manLayer(dt, b, goal, user);
        if (!man.pick || !man.pick.matched.door) continue;   // no required door, no window

        // Each layer is mapped onto 0-100 with enough headroom that a top score is
        // genuinely hard to reach. Clipping the raw sums at 100 made every winner a 99.
        var eN = normEarth(earth.best.score);
        var mN = normMan(man.score);
        var composite = Math.round(
          heaven.score * WEIGHT.heaven + eN * WEIGHT.earth + mN * WEIGHT.man);

        results.push({
          goal: goal, date: dt, iso: iso(dt),
          weekday: WD[A.weekday(A.civilJDN(dt.y, dt.m, dt.d))],
          hourBranch: b, range: man.range,
          heaven: heaven, earth: earth, man: man,
          composite: composite,
          layers: { heaven: Math.round(heaven.score), earth: Math.round(eN), man: Math.round(mN) },
          sector: earth.best, face: man.pick.palace
        });
      }
    }

    results.sort(function (a, b) { return b.composite - a.composite; });

    // Fibonacci follow-through: re-rank the strongest candidates by whether the plate keeps
    // supporting the goal on the Fibonacci double-hours after each window.
    if (opts.fib !== false && global.QPFib) {
      var head = results.slice(0, opts.fibPool || 15);
      head.forEach(function (r) {
        r.fib = global.QPFib.sancaiFollowThrough(r, user);
        r.refined = r.fib.refinedComposite;
      });
      head.sort(function (a, b) { return b.refined - a.refined || b.composite - a.composite; });
      results = head.concat(results.slice(head.length));
    }

    // Prefer variety: at most two windows from any one day in the top set.
    var perDay = {}, top = [];
    for (var k = 0; k < results.length && top.length < (opts.limit || 3); k++) {
      var r = results[k];
      perDay[r.iso] = (perDay[r.iso] || 0) + 1;
      if (perDay[r.iso] > 2) continue;
      top.push(r);
    }
    return { goal: goal, windows: top, considered: results.length,
             // The strongest candidates' scores, for measuring how decisive the winner is.
             pool: results.slice(0, 60).map(function (r) {
               return { iso: r.iso, date: r.date, range: r.range, hourBranch: r.hourBranch,
                        score: r.refined !== undefined ? r.refined : r.composite, layers: r.layers,
                        face: r.face.dir, sector: r.sector.dir }; }),
             excluded: excluded.slice(0, 8), excludedCount: excluded.length };
  }

  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function normEarth(raw) { return clamp((raw + 52) / 1.55); }
  function normMan(raw) { return clamp((raw + 55) / 1.85); }

  var WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function iso(dt) {
    return dt.y + '-' + p2(dt.m) + '-' + p2(dt.d);
  }
  function p2(n) { return String(n).length < 2 ? '0' + n : String(n); }

  /* ---------- the mandate, in words ---------- */

  function mandate(w) {
    var pa = w.face, g = w.goal;
    var band = w.composite >= 78 ? 'Exceptional' : w.composite >= 68 ? 'Strong'
             : w.composite >= 56 ? 'Workable' : 'Marginal';
    return {
      band: band,
      when: w.weekday + ', ' + w.date.d + ' ' + MON[w.date.m - 1] + ' ' + w.date.y +
            ', ' + w.range,
      hourLabel: C.BRANCHES[w.hourBranch] + ' hour (' + w.man.pillars.hour.cn + ')',
      where: 'Position yourself in the ' + w.sector.dirFull + ' sector' +
             (w.sector.annual ? ' — annual star ' + w.sector.annual : '') +
             (w.sector.monthly ? ', monthly star ' + w.sector.monthly : '') + '.',
      whereWhy: w.sector.why,
      facing: 'Face ' + pa.dir + ' to align with ' +
              [pa.spirit && (pa.spirit + (pa.spiritEn ? '' : '')),
               pa.gate].filter(Boolean).join(' and ') +
              (pa.starCn ? ', under ' + pa.starCn : '') + '.',
      facingWhy: w.man.pick.why,
      action: g.action,
      manifestFor: g.manifest,
      heavenLine: w.heaven.officer.cn + ' ' + w.heaven.officer.en + ' day · ' +
        w.heaven.pillar.cn + ' · ' + (w.heaven.duty.yellow ? 'yellow path' : 'black path') +
        ' · 宿' + w.heaven.mansion.cn,
      manLine: w.man.chart.dun + ' ju ' + w.man.chart.ju + ' · palace ' + pa.num + ' ' + pa.name +
        ' · 天' + (pa.heavenStemCn || '—') + ' 地' + (pa.earthStemCn || '—'),
      cautions: buildCautions(w)
    };
  }
  var MON = ['January','February','March','April','May','June','July','August','September',
             'October','November','December'];

  function buildCautions(w) {
    var out = [];
    if (w.face.isEmpty) out.push('The facing palace is void this hour. Use the window for ' +
      'preparation or for releasing something, not for acquiring or committing.');
    if (w.man.pick.hostile) out.push(w.man.pick.hostile + ' hostile structure' +
      (w.man.pick.hostile > 1 ? 's' : '') + ' also ' +
      (w.man.pick.hostile > 1 ? 'sit' : 'sits') + ' in the facing palace — keep a fallback ready.');
    if (w.heaven.harm === false && w.heaven.favourableStem === false)
      out.push('The day stem carries none of your favourable elements, so the day supports the ' +
        'act rather than supporting you personally. Bring your own energy to it.');
    if (w.earth.best.score < 10) out.push('No sector this month strongly carries the energy this ' +
      'goal wants. The chosen sector is the least compromised rather than genuinely favourable.');
    var badSector = w.earth.cells.filter(function (c) {
      return c.dir === abbr(w.face.dir) && HOSTILE_STARS.indexOf(c.annual) >= 0; })[0];
    if (badSector) out.push('The direction you face (' + w.face.dir + ') carries the hostile ' +
      'annual star ' + badSector.annual + '. Face it for the action, but do not sit in it.');
    if (!out.length) out.push('Nothing in the three layers contradicts the others here, which is ' +
      'the condition this whole calculation is looking for.');
    return out;
  }

  global.QPSanCai = {
    GOALS: GOALS, TIMEFRAMES: TIMEFRAMES,
    findWindows: findWindows, mandate: mandate,
    heavenLayer: heavenLayer, earthLayer: earthLayer, manLayer: manLayer,
    abbr: abbr, full: full, STAR_ROLE: STAR_ROLE, WEIGHT: WEIGHT,
    DAY_BRANCHES: DAY_BRANCHES, normEarth: normEarth, normMan: normMan
  };
})(typeof window !== 'undefined' ? window : globalThis);
