/* QiPath Pro — Fibonacci timing layer for Bazi, Yijing and Qimen forecasting.
 *
 * The three systems each give a reading for one moment. This layer asks the question a
 * trader asks of a price chart: where are the pivots in time? It does that the same way —
 * Fibonacci time zones (1, 2, 3, 5, 8, 13, 21, 34, 55, 89 units out from an anchor) and
 * golden-section retracement levels (23.6, 38.2, 50, 61.8, 78.6 %) across the resulting
 * series — but every point on the series is a real chart, recast and rescored by the
 * system's own engine. Nothing here is a lookup table.
 *
 * Weighting uses the golden ratio throughout: a near window outweighs a far one by φ per
 * step, and a foreground cycle outweighs its background cycle 0.618 to 0.382.
 *
 * This is a QiPath synthesis, not a classical method. The readings say so.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  var PHI = (1 + Math.sqrt(5)) / 2;          // 1.618…
  var INV = 1 / PHI;                          // 0.618…
  var FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  var LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786];
  var YEAR_DAYS = 365.2422;

  function isFib(n) { return FIB.indexOf(n) >= 0; }

  // Zeckendorf: every positive integer is a unique sum of non-consecutive Fibonacci numbers.
  function zeckendorf(n) {
    var out = [], seq = [1, 2];
    while (seq[seq.length - 1] <= n) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
    for (var i = seq.length - 1; i >= 0 && n > 0; i--) {
      if (seq[i] <= n) { out.push(seq[i]); n -= seq[i]; i--; }
    }
    return out;
  }

  function nearestFib(n) {
    var best = FIB[0];
    FIB.forEach(function (f) { if (Math.abs(f - n) < Math.abs(best - n)) best = f; });
    return best;
  }

  function round1(x) { return Math.round(x * 10) / 10; }
  function pad2(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function isoOf(dt) { return dt.y + '-' + pad2(dt.m) + '-' + pad2(dt.d); }
  function dtFromJD(jd) { return A.jdToLocal(jd); }

  /* ---------------- shared series statistics ---------------- */

  /**
   * Golden-section retracement over a scored series. Each point is placed by where its
   * score falls in the series' own range, so "strong" means strong relative to the other
   * windows actually on offer rather than against an arbitrary absolute bar.
   */
  function retrace(points) {
    var scores = points.map(function (p) { return p.score; });
    var lo = Math.min.apply(null, scores), hi = Math.max.apply(null, scores);
    var span = hi - lo;
    var levels = LEVELS.map(function (r) { return { ratio: r, value: round1(lo + span * r) }; });
    points.forEach(function (p) {
      var pos = span ? (p.score - lo) / span : 0.5;
      p.position = Math.round(pos * 1000) / 10;
      p.zone = pos >= 0.786 ? 'peak' : pos >= 0.618 ? 'golden' : pos >= 0.382 ? 'balanced'
             : pos >= 0.236 ? 'retracement' : 'trough';
    });
    return { lo: lo, hi: hi, levels: levels };
  }

  var ZONE_LABEL = { peak: 'Peak (≥78.6%)', golden: 'Golden (61.8–78.6%)',
    balanced: 'Balanced (38.2–61.8%)', retracement: 'Retracement (23.6–38.2%)',
    trough: 'Trough (<23.6%)' };

  // φ-decay weights: the anchor counts 1, each later window 0.618 of the one before.
  function phiConsensus(points) {
    var num = 0, den = 0;
    points.forEach(function (p, i) { var w = Math.pow(INV, i); num += w * p.score; den += w; });
    return den ? num / den : 0;
  }

  // Least-squares slope over the window index, so the trend is not hostage to one point.
  function slope(points) {
    var n = points.length; if (n < 2) return 0;
    var sx = 0, sy = 0, sxy = 0, sxx = 0;
    points.forEach(function (p, i) { sx += i; sy += p.score; sxy += i * p.score; sxx += i * i; });
    var d = n * sxx - sx * sx;
    return d ? (n * sxy - sx * sy) / d : 0;
  }

  function trendWord(s, unit) {
    return s > 0.25 ? 'Rising — conditions improve as the ' + unit + ' unfold'
         : s < -0.25 ? 'Falling — the opening is nearest now and narrows with time'
         : 'Flat — time alone does not change the picture much';
  }

  // pivot: the score that separates supportive from unsupportive (0 for signed scores).
  function summarise(points, verdictOf, unit, pivot) {
    pivot = pivot || 0;
    var r = retrace(points);
    var cons = phiConsensus(points);
    var anchor = points[0].score;
    var refined = INV * anchor + (1 - INV) * cons;
    var best = points.slice(0).sort(function (a, b) { return b.score - a.score || a.k - b.k; })[0];
    var worst = points.slice(0).sort(function (a, b) { return a.score - b.score || a.k - b.k; })[0];
    var sign = refined >= pivot ? 1 : -1;
    var agree = points.filter(function (p) { return (p.score >= pivot ? 1 : -1) === sign; }).length;
    var s = slope(points);
    return {
      points: points, range: r,
      anchorScore: round1(anchor), consensus: round1(cons), refined: round1(refined),
      verdict: verdictOf(refined), anchorVerdict: verdictOf(anchor),
      best: best, worst: worst,
      golden: points.filter(function (p) { return p.zone === 'peak' || p.zone === 'golden'; }),
      agreement: { agree: agree, of: points.length,
                   pct: Math.round(agree / points.length * 100) },
      slope: round1(s), trend: trendWord(s, unit)
    };
  }

  /* ================= BAZI ================= */

  // A pillar against the natal chart: favourable elements, branch clashes and unions.
  function scorePillar(sb, user) {
    var fav = user.favourable || (user.bazi && user.bazi.favourable) || [];
    var unf = (user.deep && user.deep.unfavourable) || (user.bazi && user.bazi.unfavourable) || [];
    var p = user.pillars, s = 0, notes = [];
    var se = C.STEM_ELEM[sb.stem], be = C.BRANCH_ELEM[sb.branch];
    if (fav.indexOf(se) >= 0) { s += 2; notes.push('stem ' + C.ELEM_EN[se] + ' favourable'); }
    if (unf.indexOf(se) >= 0) { s -= 2; notes.push('stem ' + C.ELEM_EN[se] + ' unfavourable'); }
    if (fav.indexOf(be) >= 0) { s += 1.5; notes.push('branch ' + C.ELEM_EN[be] + ' favourable'); }
    if (unf.indexOf(be) >= 0) { s -= 1.5; notes.push('branch ' + C.ELEM_EN[be] + ' unfavourable'); }
    if (sb.branch === C.branchClash(p.day.branch)) { s -= 2; notes.push('clashes the spouse palace ' + C.BRANCHES[p.day.branch]); }
    if (sb.branch === C.branchClash(p.year.branch)) { s -= 1; notes.push('clashes the year branch (Tai Sui)'); }
    if (sb.branch === C.branchClash(p.month.branch)) { s -= 1; notes.push('clashes the month command'); }
    if (sb.branch === C.branchHarm(p.day.branch)) { s += 1.5; notes.push('six-harmony with the day branch'); }
    var tri = C.THREE_HARMONY[p.day.branch];
    if (tri && tri.indexOf(sb.branch) >= 0 && sb.branch !== p.day.branch) { s += 1; notes.push('three-harmony frame with the day branch'); }
    if (mod(sb.stem - p.day.stem, 10) === 5) { s += 1; notes.push('stem combines with the Day Master'); }
    return { score: round1(s), notes: notes, god: C.tenGod(p.day.stem, sb.stem) };
  }

  function baziVerdict(x) {
    return x >= 3 ? 'Expansive' : x >= 1 ? 'Supportive' : x > -1 ? 'Mixed' : x > -3 ? 'Testing' : 'Adverse';
  }

  function yearPillar(y) { return C.stemBranch(mod(y - 1984, 60)); }

  function luckAt(user, ageExact) {
    var l = user.luck;
    var start = l.startAge;
    if (ageExact < start) return null;
    var i = Math.floor((ageExact - start) / 10);
    return l.pillars[Math.min(i, l.pillars.length - 1)] || null;
  }

  /**
   * opts.today: {y,m,d} — defaults to the current date.
   */
  function bazi(user, opts) {
    opts = opts || {};
    var t = opts.today || (function () { var d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; })();
    var b = user.birth, l = user.luck;
    var birthJD = A.localToJD(b.y, b.m, b.d, b.hour, b.min, b.tz);
    var todayJD = A.localToJD(t.y, t.m, t.d, 12, 0);
    var ageNow = (todayJD - birthJD) / YEAR_DAYS;
    function jdAtAge(a) { return birthJD + a * YEAR_DAYS; }

    // 1. Luck pillars with exact handover dates and their golden sections.
    var luck = l.pillars.map(function (x, i) {
      var a0 = l.startAge + i * 10, a1 = a0 + 10;
      var sc = scorePillar(x.pillar, user);
      var marks = [['0.382', 0.382], ['0.5 stem→branch', 0.5], ['0.618', 0.618]].map(function (m) {
        var jd = jdAtAge(a0 + 10 * m[1]);
        return { label: m[0], date: isoOf(dtFromJD(jd)), past: jd < todayJD };
      });
      return { pillar: x.pillar, from: round1(a0), to: round1(a1),
               start: isoOf(dtFromJD(jdAtAge(a0))), end: isoOf(dtFromJD(jdAtAge(a1))),
               score: sc.score, notes: sc.notes, god: sc.god, marks: marks,
               current: ageNow >= a0 && ageNow < a1 };
    });
    var cur = luck.filter(function (x) { return x.current; })[0] || null;
    var phase = cur ? (ageNow - cur.from) / 10 : null;

    // 2. Fibonacci ages: life pivots counted from birth.
    var ages = FIB.slice(0, 10).map(function (a) {
      var y = b.y + a;
      var yp = yearPillar(y);
      var sc = scorePillar(yp, user);
      return { age: a, year: y, pillar: yp, score: sc.score, notes: sc.notes,
               date: isoOf(dtFromJD(jdAtAge(a))), past: a < ageNow };
    });
    var nextAge = ages.filter(function (x) { return !x.past; })[0] || null;

    // 3. Fibonacci time zones in months from the current luck-pillar handover.
    var zones = [];
    if (cur) {
      var anchorJD = jdAtAge(cur.from);
      FIB.forEach(function (n) {
        var jd = anchorJD + n * YEAR_DAYS / 12;
        if (jd > jdAtAge(cur.to) + 1) return;
        var g = dtFromJD(jd);
        var p = C.fourPillars(g.y, g.m, g.d, 12, 0);
        var ms = scorePillar(p.month, user), ys = scorePillar(p.year, user);
        zones.push({ months: n, date: isoOf(g), monthPillar: p.month, yearPillar: p.year,
          score: round1(INV * ms.score + (1 - INV) * ys.score),
          notes: ms.notes, past: jd < todayJD });
      });
    }

    // 4. Annual projection, 8 years (F6): year foreground 0.618, luck background 0.382.
    var years = [];
    for (var i = 0; i < 8; i++) {
      var y = t.y + i;
      var yp = yearPillar(y);
      var lp = luckAt(user, (A.localToJD(y, 7, 1, 12, 0) - birthJD) / YEAR_DAYS);
      var ys = scorePillar(yp, user), ls = lp ? scorePillar(lp.pillar, user) : { score: 0 };
      years.push({ k: i, label: String(y), year: y, pillar: yp, luck: lp ? lp.pillar : null,
        annual: ys.score, luckScore: ls.score,
        score: round1(INV * ys.score + (1 - INV) * ls.score), notes: ys.notes,
        god: ys.god });
    }
    var yearSum = summarise(years, baziVerdict, 'years');

    // 5. Solar-month projection, 13 months (F7), from the 節 that opens each month.
    var months = [];
    var pool = A.termsForYear(t.y - 1).concat(A.termsForYear(t.y), A.termsForYear(t.y + 1),
                                              A.termsForYear(t.y + 2));
    var jie = pool.filter(function (x) { return x.index % 2 === 0; })
                  .sort(function (a, c) { return a.jd - c.jd; });
    var startIdx = 0;
    for (var j = 0; j < jie.length; j++) { if (jie[j].jd <= todayJD) startIdx = j; }
    for (var k = 0; k < 13 && startIdx + k < jie.length; k++) {
      var term = jie[startIdx + k];
      var g2 = dtFromJD(term.jd + 0.5);
      var p2 = C.fourPillars(g2.y, g2.m, g2.d, 12, 0);
      var endT = jie[startIdx + k + 1];
      var ms2 = scorePillar(p2.month, user), ys2 = scorePillar(p2.year, user);
      months.push({ k: k, label: p2.month.cn + ' ' + isoOf(g2), start: isoOf(g2),
        end: endT ? isoOf(dtFromJD(endT.jd - 0.5)) : '', term: term.name,
        pillar: p2.month, year: p2.year,
        score: round1(INV * ms2.score + (1 - INV) * ys2.score), notes: ms2.notes,
        god: ms2.god });
    }
    var monthSum = summarise(months, baziVerdict, 'months');

    return {
      ageNow: round1(ageNow), luck: luck, current: cur,
      phase: phase === null ? null : Math.round(phase * 1000) / 10,
      phaseZone: phase === null ? '' : phase < 0.382 ? 'opening (stem-led, before 0.382)'
        : phase < 0.5 ? 'first golden section (0.382–0.5)'
        : phase < 0.618 ? 'handover band (0.5–0.618), branch taking over'
        : 'closing (branch-led, past 0.618)',
      ages: ages, nextAge: nextAge, zones: zones,
      years: yearSum, months: monthSum
    };
  }

  /* ================= QIMEN ================= */

  // Double-hour offsets on the Fibonacci sequence, then day offsets past the last one.
  var QM_STEPS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map(function (n) {
    return { k: n, hours: n * 2, label: n === 0 ? 'Cast hour' : '+' + n + ' double-hour' +
             (n > 1 ? 's' : '') + ' (' + (n * 2 < 48 ? n * 2 + 'h' : round1(n * 2 / 24) + 'd') + ')' };
  }).concat([13, 21, 34].map(function (d) {
    return { k: d * 12, hours: d * 24, label: '+' + d + ' days, same hour' };
  }));

  function qmVerdict(x) {
    return x >= 5 ? 'Favourable' : x >= 1 ? 'Workable' : x >= -3 ? 'Guarded' : 'Unfavourable';
  }

  function stepFrom(dt, hours) {
    var jd = A.localToJD(dt.y, dt.m, dt.d, dt.hour, dt.min === undefined ? 30 : dt.min) + hours / 24;
    var g = dtFromJD(jd);
    if (g.hour >= 24) { g.hour = 23; g.min = 30; }
    return g;
  }

  function qimen(dt, scenarioId, question, opts) {
    var Q = global.QPQimen;
    opts = opts || {};
    var points = QM_STEPS.map(function (st, i) {
      var w = stepFrom(dt, st.hours);
      var r = Q.forecast(w, scenarioId, question, opts);
      var prim = r.resolved[(r.scenario.asker || [])[0]];
      return { k: i, label: st.label, when: w, date: isoOf(w), range: r.hourRange,
        pillar: r.pillars.hour.cn, dayPillar: r.pillars.day.cn,
        score: r.score, verdict: r.verdict, direction: r.direction,
        matterPalace: r.poles && r.poles.matter ? r.poles.matter.num : null,
        palace: prim && prim.pal ? prim.pal.num : null,
        voidHit: !!(prim && prim.pal && prim.pal.isEmpty),
        method: r.methodReading ? r.methodReading.text : '',
        ausp: r.auspicious.length, hostile: r.hostile.length };
    });
    var sum = summarise(points, qmVerdict, 'hours');
    var firstGood = points.filter(function (p) { return p.k > 0 && p.score >= 5; })[0] || null;
    sum.firstFavourable = firstGood;
    sum.horizon = 'Cast hour through +34 days';
    return sum;
  }

  /* ================= YIJING (Plum Blossom 体用) ================= */

  // 乾兑离震巽坎艮坤 -> element index (0 Wood 1 Fire 2 Earth 3 Metal 4 Water)
  var TRI_ELEM = [3, 3, 1, 0, 0, 4, 2, 2];
  var XIANTIAN = [1, 2, 3, 4, 5, 6, 7, 8];
  var SEASON = ['旺 Prosperous', '相 Strengthening', '休 Resting', '囚 Confined', '死 Dead'];

  function elRel(a, b) {          // a toward b
    if (a === b) return 'same';
    if ((a + 1) % 5 === b) return 'produces';
    if ((a + 2) % 5 === b) return 'controls';
    if ((b + 1) % 5 === a) return 'produced_by';
    return 'controlled_by';
  }

  // Strength of an element in the month whose branch is given.
  function seasonOf(elem, monthBranch) {
    var se = C.BRANCH_ELEM[monthBranch];
    if (elem === se) return 0;
    if ((se + 1) % 5 === elem) return 1;
    if ((elem + 1) % 5 === se) return 2;
    if ((elem + 2) % 5 === se) return 3;
    return 4;
  }

  var YONG_TI = {
    produces:     [3, '用生体 — the matter feeds you. Classically the most auspicious relation.'],
    same:         [2, '体用比和 — matter and self are of one element. Smooth, things go as planned.'],
    controlled_by:[1.5, '体克用 — you master the matter. Achievable, at the cost of effort.'],
    produced_by:  [-1.5, '体生用 — you feed the matter. It drains you; expect outlay before return.'],
    controls:     [-3, '用克体 — the matter overcomes you. Classically the least auspicious relation.']
  };

  /** 体用 reading of one cast: score, notes and the parts the timeline needs. */
  function tiYong(hx, monthBranch) {
    var movingLower = hx.moving <= 3;
    var tiIdx = movingLower ? hx.upperIdx : hx.lowerIdx;
    var yongIdx = movingLower ? hx.lowerIdx : hx.upperIdx;
    var ti = TRI_ELEM[tiIdx], yong = TRI_ELEM[yongIdx];
    var r = elRel(yong, ti), base = YONG_TI[r];
    var score = base[0], notes = [base[1]];

    // 互卦 develops the middle of the matter: each nuclear trigram toward 体.
    [hx.nuclearLowerIdx, hx.nuclearUpperIdx].forEach(function (ix) {
      var rr = elRel(TRI_ELEM[ix], ti);
      if (rr === 'produces' || rr === 'same') { score += 0.75; }
      else if (rr === 'controls') { score -= 0.75; }
    });
    // 变卦: the changed trigram on the 用 side is the outcome.
    var outIdx = movingLower ? hx.changedLowerIdx : hx.changedUpperIdx;
    var ro = elRel(TRI_ELEM[outIdx], ti);
    var outTone = ro === 'produces' || ro === 'same' ? 1.5 : ro === 'controls' ? -1.5
                : ro === 'controlled_by' ? 0.5 : -0.5;
    score += outTone;
    notes.push('Outcome trigram ' + S.TRIGRAMS[outIdx] + ' toward 体: ' +
      (outTone > 0 ? 'supports the asker' : 'works against the asker') + '.');
    // Seasonal strength of 体 in the cast month.
    var sea = seasonOf(ti, monthBranch);
    if (sea <= 1) score += 1; else if (sea >= 3) score -= 1;
    notes.push('体 is ' + SEASON[sea] + ' in the month.');

    return { tiIdx: tiIdx, yongIdx: yongIdx, ti: S.TRIGRAMS[tiIdx], yong: S.TRIGRAMS[yongIdx],
      tiElem: C.ELEM_EN[ti], yongElem: C.ELEM_EN[yong], relation: r,
      relationText: base[1], season: SEASON[sea], outcome: S.TRIGRAMS[outIdx],
      score: round1(score), notes: notes };
  }

  function yjVerdict(x) {
    return x >= 4 ? 'Auspicious' : x >= 1.5 ? 'Favourable' : x > -1.5 ? 'Balanced'
         : x > -4 ? 'Obstructed' : 'Inauspicious';
  }

  function yijing(dt, hx, p) {
    var ty = tiYong(hx, p.month.branch);

    // Recast on the Fibonacci double-hours and score each with its own 体用.
    var steps = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    var points = steps.map(function (n, i) {
      var w = stepFrom(dt, n * 2);
      var pw = C.fourPillars(w.y, w.m, w.d, w.hour, w.min);
      var hw = n === 0 ? hx : S.yijing(pw, A.toLunar(w.y, w.m, w.d));
      var t = n === 0 ? ty : tiYong(hw, pw.month.branch);
      return { k: i, label: n === 0 ? 'Cast hour' : '+' + n + ' double-hour' + (n > 1 ? 's' : '') +
               ' (' + (n * 2 < 48 ? n * 2 + 'h' : round1(n * 2 / 24) + 'd') + ')',
        when: w, date: isoOf(w), range: pw.hourRange, pillar: pw.hour.cn,
        hexagram: hw.number + ' ' + hw.name, changed: hw.changedNumber + ' ' + hw.changedName,
        relation: t.relation, score: t.score };
    });
    var sum = summarise(points, yjVerdict, 'hours');

    // 應期: the Xiantian numbers of the trigrams and the cast total, read on Fibonacci.
    var yn = XIANTIAN[ty.yongIdx], tn = XIANTIAN[ty.tiIdx];
    var zk = zeckendorf(hx.castNumber);
    var timing = [
      { basis: '用 ' + ty.yong + ' Xiantian number', n: yn },
      { basis: '体 + 用 (' + tn + ' + ' + yn + ')', n: tn + yn },
      { basis: 'Cast total ' + hx.castNumber + ' → Fibonacci ' + nearestFib(hx.castNumber), n: nearestFib(hx.castNumber) }
    ].map(function (x) {
      var dd = stepFrom(dt, x.n * 24);
      return { basis: x.basis, n: x.n, fib: isFib(x.n),
               days: isoOf(dd), months: (function () {
                 var mm = dt.m - 1 + x.n, yy = dt.y + Math.floor(mm / 12);
                 return yy + '-' + pad2(mod(mm, 12) + 1); })() };
    });

    return { tiYong: ty, verdict: yjVerdict(ty.score), timeline: sum,
             zeckendorf: zk, castNumber: hx.castNumber, timing: timing };
  }

  /* ================= SAN CAI ================= */

  function scVerdict(x) {
    return x >= 78 ? 'Exceptional' : x >= 68 ? 'Strong' : x >= 56 ? 'Workable' : 'Marginal';
  }
  function branchHour(b) { return b === 0 ? 23 : b * 2 - 1; }
  function hourBranch(h) { return Math.floor((((h + 1) % 24) + 24) % 24 / 2); }

  /**
   * Follow-through of one candidate window: the same goal's Man layer recast on the
   * Fibonacci double-hours after it. A window whose plate collapses an hour later is a
   * worse bet than one whose support carries on, even at the same composite, because the
   * matter started in it has to keep moving. The refined composite swaps the window's own
   * Man score for the φ-consensus at 0.382 weight:
   *   refined = composite + 0.382 × W_man × (consensus − own Man score)
   */
  function sancaiFollowThrough(w, user) {
    var SC = global.QPSanCai;
    var base = { y: w.date.y, m: w.date.m, d: w.date.d, hour: branchHour(w.hourBranch), min: 30 };
    var points = [{ k: 0, label: 'Window', date: w.iso, range: w.range, score: w.layers.man,
                    face: w.face.dir }];
    [1, 2, 3, 5, 8, 13].forEach(function (n, i) {
      var g = stepFrom(base, n * 2);
      var b = hourBranch(g.hour);
      var man = SC.manLayer({ y: g.y, m: g.m, d: g.d }, b, w.goal, user);
      points.push({ k: i + 1, label: '+' + n + ' double-hour' + (n > 1 ? 's' : ''),
        date: isoOf(g), range: man.range, score: Math.round(SC.normMan(man.score)),
        face: man.pick ? man.pick.palace.dir : '—',
        door: !!(man.pick && man.pick.matched.door) });
    });
    var sum = summarise(points, scVerdict, 'hours', 56);
    sum.momentum = round1(sum.consensus - w.layers.man);
    sum.refinedComposite = Math.round(w.composite + (1 - INV) * SC.WEIGHT.man * (sum.consensus - w.layers.man));
    return sum;
  }

  /**
   * Follow-up dates after a chosen window: Fibonacci days at the same hour, every layer
   * rescored. Days that clash the user's sign are kept but marked, so the schedule shows
   * why a date is missing rather than silently skipping it.
   */
  function sancaiFollowUps(w, user) {
    var SC = global.QPSanCai;
    var jd0 = A.gregToJD(w.date.y, w.date.m, w.date.d);
    var points = [{ k: 0, label: 'Window', date: w.iso, range: w.range, score: w.composite,
                    face: w.face.dir, sector: w.sector.dir, officer: w.heaven.officer.cn, clash: false }];
    [1, 2, 3, 5, 8, 13, 21].forEach(function (n, i) {
      var g = A.jdToGreg(jd0 + n);
      var dt = { y: g.y, m: g.m, d: Math.floor(g.d) };
      var h = SC.heavenLayer(dt, w.goal, user);
      var e = SC.earthLayer(dt, w.goal, user);
      var m = SC.manLayer(dt, w.hourBranch, w.goal, user);
      var comp = Math.round(h.score * SC.WEIGHT.heaven + SC.normEarth(e.best.score) * SC.WEIGHT.earth +
                            SC.normMan(m.score) * SC.WEIGHT.man);
      if (h.clash) comp = Math.min(comp, 30);
      points.push({ k: i + 1, label: '+' + n + ' day' + (n > 1 ? 's' : ''), date: isoOf(dt),
        range: w.range, score: comp, face: m.pick ? m.pick.palace.dir : '—', sector: e.best.dir,
        officer: h.officer.cn, clash: h.clash,
        door: !!(m.pick && m.pick.matched.door) });
    });
    return summarise(points, scVerdict, 'days', 56);
  }

  /* ================= ZI WEI DOU SHU ================= */

  function zwVerdict(x) {
    return x >= 3 ? 'Flourishing' : x >= 1 ? 'Supported' : x > -1 ? 'Mixed' : x > -3 ? 'Strained' : 'Obstructed';
  }

  /**
   * 大限 and 流年 from the natal board, each scored by zwdsPeriod, then read through the same
   * Fibonacci frame as Bazi. Ages are nominal (虚岁), as ZWDS counts them.
   */
  /**
   * Zi Wei annual forecast (流年) for one year. The flow-year Life palace sits on the year branch,
   * and the other flow palaces follow anticlockwise from it (流年官禄 = year branch - 8, …). Each is
   * scored by zwdsPeriod with the year stem's 四化, and the year is read under its 大限.
   */
  var ZW_FLOW = [[0, 'self', 'Self 命'], [8, 'career', 'Career 官禄'], [4, 'wealth', 'Wealth 财帛'],
                 [2, 'relationships', 'Spouse 夫妻'], [5, 'health', 'Health 疾厄'], [6, 'travel', 'Travel 迁移'],
                 [9, 'property', 'Property 田宅'], [10, 'wellbeing', 'Wellbeing 福德'],
                 [1, 'siblings', 'Siblings 兄弟'], [3, 'children', 'Children 子女'], [7, 'friends', 'Friends 交友'],
                 [11, 'parents', 'Parents 父母']];

  /*
   * The twelve life areas from Zi Wei palaces (birth board, or the flow-year palaces): each area reads one palace, or a
   * main palace with a second at half weight. A palace score is centred on the median of 3,600 palaces (300 random
   * charts) and scaled so the 70th percentile reads Strong and the 30th Weak, as the Bazi areas do. Legal matters come
   * from the harsh stars and 化忌 in the Career and Parents (authority, documents) fields.
   */
  var ZW_AREA = { career: ['career'], education: ['career', 'parents'], spouse: ['relationships'], marriage: ['relationships', 'wellbeing'],
    relatives: ['siblings', 'parents'], children: ['children'], colleagues: ['friends', 'parents'], health: ['health'],
    finance: ['wealth'], wealth: ['property', 'wealth'], travel: ['travel'] };
  var ZW_KEY_OF = { '命宫': 'self', '兄弟': 'siblings', '夫妻': 'relationships', '子女': 'children', '财帛': 'wealth', '疾厄': 'health',
    '迁移': 'travel', '交友': 'friends', '官禄': 'career', '田宅': 'property', '福德': 'wellbeing', '父母': 'parents' };
  var ZW_PLAIN_NAME = { career: 'Career palace (官禄)', parents: 'Parents palace (父母, authority and documents)', relationships: 'Spouse palace (夫妻)',
    wellbeing: 'Fortune palace (福德)', siblings: 'Siblings palace (兄弟)', children: 'Children palace (子女)', friends: 'Friends palace (交友, colleagues)',
    health: 'Health palace (疾厄)', wealth: 'Wealth palace (财帛)', property: 'Property palace (田宅)', travel: 'Travel palace (迁移)', self: 'Life palace (命)' };
  // The notes zwdsPeriod writes, in everyday words.
  function zwNotePlain(n) {
    if (/化禄/.test(n)) return 'prosperity and ease (化禄)';
    if (/化权/.test(n)) return 'power and control (化权)';
    if (/化科/.test(n)) return 'reputation and help (化科)';
    if (/化忌/.test(n)) return 'obstruction and worry (化忌)';
    if (/^煞/.test(n)) return 'harsh stars bring friction (' + n.replace(/^煞 in the palace: /, '') + ')';
    if (/左右/.test(n)) return 'help from peers';
    if (/昌曲/.test(n)) return 'credentials, study and writing favoured';
    if (/魁钺/.test(n)) return 'patrons and senior help';
    if (/禄马/.test(n)) return 'gain through movement';
    if (/empty/.test(n)) return 'no major star of its own, so it leans on circumstances';
    return '';
  }
  function zwAreas(pal, centre, natal) {
    var s = {}, S0 = function (k, v, plain, tech) { (s[k] = s[k] || []).push({ v: v, plain: plain, tech: tech }); };
    var vOf = function (raw) { return Math.max(-2, Math.min(2, (raw - centre) / 1.6)); };
    Object.keys(ZW_AREA).forEach(function (k) {
      ZW_AREA[k].forEach(function (key, i) {
        var p = pal[key]; if (!p) return;
        var w = i === 0 ? 1 : 0.5, v = vOf(p.score) * w;
        var good = (p.notes || []).filter(function (n) { return /化禄|化权|化科|左右|昌曲|魁钺|禄马/.test(n); }).map(zwNotePlain).filter(Boolean);
        var bad = (p.notes || []).filter(function (n) { return /化忌|^煞|empty/.test(n); }).map(zwNotePlain).filter(Boolean);
        var tone = v >= 0.6 ? 'is well supported' : v <= -0.6 ? 'is under strain' : 'is mixed';
        // Cite only what points the same way as the rating; a mixed palace shows one of each.
        var why = v >= 0.6 ? (good.length ? good : ['its stars are bright and well placed'])
          : v <= -0.6 ? (bad.length ? bad : ['its stars are dim or poorly placed']) : good.slice(0, 1).concat(bad.slice(0, 1));
        why = why.slice(0, 2);
        S0(k, v, 'your ' + ZW_PLAIN_NAME[key] + ' ' + tone + (why.length ? ' — ' + why.join('; ') : ''),
          ZW_PLAIN_NAME[key] + ' score ' + p.score + (p.stars && p.stars.length ? ' [' + p.stars.join('、') + ']' : '') + (p.notes && p.notes.length ? ': ' + p.notes.slice(0, 4).join('; ') : ''));
      });
    });
    ['career', 'parents'].forEach(function (key) {
      var p = pal[key]; if (!p) return;
      (p.notes || []).forEach(function (n) {
        if (/化忌/.test(n)) S0('legal', -1, 'obstruction around authority and paperwork (化忌 in the ' + ZW_PLAIN_NAME[key] + ')', n);
        else if (/^煞/.test(n) && /擎羊|陀罗|天刑/.test(n)) S0('legal', -1, 'friction with rules and officials (' + n.replace(/^煞 in the palace: /, '') + ')', n);
        else if (/化科|魁钺/.test(n)) S0('legal', 0.75, 'help and good standing with authority', n);
      });
    });
    return global.QPBazi.areaResults(s, null, natal);
  }
  /** The birth board's twelve areas: each palace scored with the birth year's 四化. */
  function zwdsAreasNatal(user) {
    var z = user.zwds, pal = {};
    z.palaces.forEach(function (p, b) {
      var sc = S.zwdsPeriod(z, b, user.pillars.year.stem, null);
      pal[ZW_KEY_OF[p.name]] = { score: sc.score, notes: sc.notes, stars: p.stars };
    });
    return zwAreas(pal, 4.1, true);
  }
  /** A flow year's twelve areas, from zwdsAnnual's twelve flow palaces. */
  function zwdsAreasYear(user, a) {
    var pal = {};
    a.palaces.forEach(function (p) { pal[p.key] = p; });
    return zwAreas(pal, 4.6, false);
  }
  function zwdsAnnual(user, year) {
    var z = user.zwds, natalStem = user.pillars.year.stem, birthYear = user.pillars.solarYear;
    var yp = yearPillar(year), age = year - birthYear + 1;
    var dec = S.zwdsDecades(z, natalStem, user.gender).decades;
    var d = dec.filter(function (x) { return age >= x.from && age <= x.to; })[0] || null;
    var ds = d ? S.zwdsPeriod(z, d.branch, d.stemIdx, natalStem) : null;
    var life = S.zwdsPeriod(z, yp.branch, yp.stem, natalStem);
    var palaces = ZW_FLOW.map(function (f) {
      var b = mod(yp.branch - f[0], 12), sc = f[0] === 0 ? life : S.zwdsPeriod(z, b, yp.stem, natalStem), np = z.palaces[b];
      return { key: f[1], label: f[2], branch: C.BRANCHES[b], natal: np.name + ' ' + np.nameEn,
        stars: np.stars.map(function (s, i) { return s + (np.bright && np.bright[i] ? '(' + np.bright[i] + ')' : ''); }),
        minors: np.minors || [], score: sc.score, notes: sc.notes };
    });
    // The year's own 四化, with the natal palace each lands in and the flow palace that covers it.
    var hua = life.hua.filter(function (h) { return h.source === 'period'; }).map(function (h) {
      var nb = null; z.palaces.forEach(function (p) { if (p.name === h.palace) nb = p.branch; });
      var flowIdx = nb === null ? null : mod(yp.branch - nb, 12);
      return { hua: h.hua, star: h.star, bright: h.bright, natal: h.palace, flow: flowIdx === null ? null : S.ZW_PALACES ? S.ZW_PALACES[flowIdx] : flowIdx };
    });
    var score = round1(INV * life.score + (1 - INV) * (ds ? ds.score : 0));

    // 流月 by 斗君: from the year branch (as month 1) count back to the birth month, then forward to
    // the birth hour; that palace is lunar month 1, and each later month moves one palace clockwise.
    // Each month takes its own stem (五虎遁 from the year stem) for its 四化. A leap month shares the
    // palace and stem of the month it follows.
    var lm = user.lunar.month, hb = user.pillars.hourBranch;
    var douJun = mod(yp.branch - (lm - 1) + hb, 12);
    // The two tables overlap by a few months; keep each month once.
    var lunar = A.lunarMonths(year).concat(A.lunarMonths(year + 1)).filter(function (x, i, arr) {
      return arr.findIndex ? arr.findIndex(function (y) { return y.startJDN === x.startJDN; }) === i
        : arr.filter(function (y, j) { return j < i && y.startJDN === x.startJDN; }).length === 0; });
    var startIdx = -1;
    for (var li = 0; li < lunar.length; li++) {
      var g0 = A.jdToGreg(lunar[li].startJDN);
      if (lunar[li].monthNum === 1 && !lunar[li].leap && g0.y === year) { startIdx = li; break; }
    }
    var months = [];
    for (var mi = startIdx; startIdx >= 0 && mi < lunar.length; mi++) {
      var lmEntry = lunar[mi];
      if (mi > startIdx && lmEntry.monthNum === 1 && !lmEntry.leap) break;
      var k = lmEntry.monthNum, mb = mod(douJun + (k - 1), 12);
      var mStem = mod((yp.stem % 5) * 2 + 2 + (k - 1), 10);
      var mp = S.zwdsPeriod(z, mb, mStem, natalStem), np2 = z.palaces[mb];
      var mlu = mp.hua.filter(function (h) { return h.source === 'period' && h.hua === '化禄'; })[0];
      var mji = mp.hua.filter(function (h) { return h.source === 'period' && h.hua === '化忌'; })[0];
      var gs = A.jdToGreg(lmEntry.startJDN), ge = A.jdToGreg(lmEntry.endJDN - 1);
      months.push({ num: k, leap: lmEntry.leap, label: (lmEntry.leap ? '闰' : '') + k + '月',
        start: gs.y + '-' + pad2(gs.m) + '-' + pad2(Math.floor(gs.d)), end: ge.y + '-' + pad2(ge.m) + '-' + pad2(Math.floor(ge.d)),
        pillar: C.STEMS[mStem] + C.BRANCHES[mod(2 + k - 1, 12)], stem: C.STEMS[mStem], branch: C.BRANCHES[mb],
        natal: np2.name + ' ' + np2.nameEn,
        stars: np2.stars.map(function (s, i) { return s + (np2.bright && np2.bright[i] ? '(' + np2.bright[i] + ')' : ''); }),
        lu: mlu ? mlu.star + '化禄→' + (mlu.palace || 'off-board') : '', ji: mji ? mji.star + '化忌→' + (mji.palace || 'off-board') : '',
        monthScore: mp.score, score: round1(INV * mp.score + (1 - INV) * life.score), notes: mp.notes });
    }
    var mRanked = months.slice().sort(function (a, b) { return b.score - a.score; });

    return {
      douJun: { branch: C.BRANCHES[douJun], natal: z.palaces[douJun].name + ' ' + z.palaces[douJun].nameEn },
      months: months, bestMonths: mRanked.slice(0, 3), worstMonths: mRanked.slice(-2).reverse(),
      year: year, pillar: yp, pillarCn: yp.cn, age: age, score: score, verdict: zwVerdict(score),
      lifeScore: life.score, decadeScore: ds ? ds.score : 0,
      decade: d ? { from: d.from, to: d.to, palace: d.palace.name + ' ' + d.palace.nameEn + ' ' + d.palace.stemCn + d.palace.branchCn,
                    stars: d.palace.stars, score: ds.score } : null,
      lifePalace: palaces[0], palaces: palaces, hua: hua,
      best: palaces.slice(1).slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 2),
      worst: palaces.slice(1).slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 2)
    };
  }

  function zwds(user, opts) {
    opts = opts || {};
    var z = user.zwds, natalStem = user.pillars.year.stem;
    var thisYear = opts.year || new Date().getFullYear();
    var birthYear = user.pillars.solarYear;
    var ageNow = thisYear - birthYear + 1;
    var dec = S.zwdsDecades(z, natalStem, user.gender);

    var decades = dec.decades.map(function (d) {
      var sc = S.zwdsPeriod(z, d.branch, d.stemIdx, natalStem);
      return { i: d.i, from: d.from, to: d.to, startYear: birthYear + d.from - 1,
        endYear: birthYear + d.to - 1, palace: d.palace, stemIdx: d.stemIdx,
        score: sc.score, notes: sc.notes, hua: sc.hua,
        current: ageNow >= d.from && ageNow <= d.to };
    });
    var cur = decades.filter(function (d) { return d.current; })[0] || null;
    function decadeAt(age) {
      return decades.filter(function (d) { return age >= d.from && age <= d.to; })[0] || null;
    }
    function yearRead(y) {
      var yp = yearPillar(y), age = y - birthYear + 1;
      var an = S.zwdsPeriod(z, yp.branch, yp.stem, natalStem);
      var dd = decadeAt(age);
      var ji = an.hua.filter(function (h) { return h.hua === '化忌' && h.source === 'period'; })[0];
      var lu = an.hua.filter(function (h) { return h.hua === '化禄' && h.source === 'period'; })[0];
      return { year: y, age: age, pillar: yp, palace: an.palace, annual: an.score,
        decadeScore: dd ? dd.score : 0, decade: dd,
        score: round1(INV * an.score + (1 - INV) * (dd ? dd.score : 0)),
        notes: an.notes, lu: lu, ji: ji };
    }

    var phase = null, marks = [], zones = [];
    if (cur) {
      phase = Math.min(1, Math.max(0, (ageNow - cur.from + 0.5) / 10));
      marks = [['0.382', 0.382], ['0.5', 0.5], ['0.618', 0.618]].map(function (m) {
        var yf = cur.startYear + 10 * m[1];
        var y = Math.floor(yf), mo = Math.min(12, Math.floor((yf - y) * 12) + 1);
        return { label: m[0], year: y, month: mo, past: yf < thisYear + 0.5 };
      });
      [1, 2, 3, 5, 8].forEach(function (n) {
        var r = yearRead(cur.startYear + n);
        r.offset = n; r.past = r.year < thisYear;
        zones.push(r);
      });
    }

    var years = [];
    for (var i = 0; i < 8; i++) {
      var r = yearRead(thisYear + i);
      r.k = i; r.label = String(r.year);
      years.push(r);
    }
    var ages = FIB.slice(0, 10).map(function (a) {
      var r = yearRead(birthYear + a - 1);
      r.past = r.year < thisYear;
      return r;
    });

    return { ageNow: ageNow, forward: dec.forward, decades: decades, current: cur,
      phase: phase === null ? null : Math.round(phase * 1000) / 10,
      marks: marks, zones: zones, ages: ages,
      nextAge: ages.filter(function (a) { return !a.past; })[0] || null,
      years: summarise(years, zwVerdict, 'years') };
  }

  /* ---------------- prompt serialisation ---------------- */

  function pointLine(p) {
    var when = p.date && p.label.indexOf(p.date) < 0 ? p.date + (p.range ? ' ' + p.range : '') : '';
    var extra = p.pillar && p.pillar.cn ? p.pillar.cn : (typeof p.pillar === 'string' ? p.pillar + ' hour' : '');
    if (p.hexagram) extra += (extra ? ', ' : '') + 'hexagram ' + p.hexagram + ' → ' + p.changed;
    if (p.direction) extra += (extra ? ', ' : '') + 'direction ' + p.direction;
    return [p.label, when, extra, 'score ' + p.score,
            (p.zone || '') + (p.position !== undefined ? ' ' + p.position + '%' : '')]
      .filter(Boolean).join(' · ');
  }

  function seriesText(sum) {
    return '  Anchor score ' + sum.anchorScore + ' (' + sum.anchorVerdict + '); φ-weighted consensus ' +
      sum.consensus + '; refined (0.618 anchor + 0.382 consensus) ' + sum.refined +
      ' → ' + sum.verdict + '\n' +
      '  Agreement: ' + sum.agreement.agree + ' of ' + sum.agreement.of + ' windows (' +
      sum.agreement.pct + '%) share the refined sign. Trend slope ' + sum.slope + ': ' + sum.trend + '\n' +
      '  Retracement levels over range ' + sum.range.lo + '…' + sum.range.hi + ': ' +
      sum.range.levels.map(function (l) { return (l.ratio * 100).toFixed(1) + '%=' + l.value; }).join(', ') + '\n' +
      '  Best: ' + pointLine(sum.best) + '\n  Worst: ' + pointLine(sum.worst) + '\n' +
      '  Windows:\n' + sum.points.map(function (p) { return '   - ' + pointLine(p); }).join('\n');
  }

  global.QPFib = {
    zwdsAreasNatal: zwdsAreasNatal, zwdsAreasYear: zwdsAreasYear,
    FIB: FIB, PHI: PHI, LEVELS: LEVELS, ZONE_LABEL: ZONE_LABEL,
    zeckendorf: zeckendorf, nearestFib: nearestFib, isFib: isFib,
    retrace: retrace, phiConsensus: phiConsensus,
    scorePillar: scorePillar, tiYong: tiYong,
    bazi: bazi, qimen: qimen, yijing: yijing, zwds: zwds, zwdsAnnual: zwdsAnnual,
    sancaiFollowThrough: sancaiFollowThrough, sancaiFollowUps: sancaiFollowUps,
    seriesText: seriesText, pointLine: pointLine
  };
})(typeof window !== 'undefined' ? window : globalThis);
