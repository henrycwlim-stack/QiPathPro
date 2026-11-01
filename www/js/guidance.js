/* QiPath Pro — guidance synthesis across five time horizons, and the number module */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ---------- shared vocabulary ---------- */

  // What each Qimen gate encourages and discourages
  var GATE_ACTION = {
    '开门': { good:['start something new','open negotiations','apply or submit','meet decision-makers'],
             avoid:['secrecy','hesitating'] },
    '生门': { good:['money matters','buying and investing','asking for what you want','health routines'],
             avoid:['giving things away','ending arrangements'] },
    '休门': { good:['rest','planning','repair relationships','quiet study'],
             avoid:['confrontation','hard pushes','urgent launches'] },
    '景门': { good:['presenting','marketing','interviews','documents and design'],
             avoid:['believing appearances','signing without reading'] },
    '杜门': { good:['focused solo work','protecting information','hiding a plan','technical debugging'],
             avoid:['public launches','networking','asking favours'] },
    '伤门': { good:['debt collection','competition','sport','cutting losses'],
             avoid:['travel','contracts','delicate conversations'] },
    '惊门': { good:['legal filings','raising a complaint','tough truths'],
             avoid:['big commitments','investments','anything needing calm'] },
    '死门': { good:['closing accounts','clearing out','burial and endings','routine dull work'],
             avoid:['launching','marrying','investing','starting anything'] }
  };

  var ELEM_ACTION = {
    0: { do:['plan and expand','start growth work','learn something'], colour:'green', dir:'East' },
    1: { do:['present and persuade','network','make yourself visible'], colour:'red', dir:'South' },
    2: { do:['consolidate','organise','handle property and paperwork'], colour:'yellow', dir:'Centre' },
    3: { do:['decide and cut','negotiate hard','finish and enforce'], colour:'white', dir:'West' },
    4: { do:['research','communicate','move and travel','think laterally'], colour:'black', dir:'North' }
  };

  /* ---------- hourly ---------- */

  function hourly(dt, profile) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min);
    var q = S.qimen(p);
    var hq = C.hourQuality(p.day, p.hourBranch, p.month.branch);

    var duty = q.palaces.filter(function (x) { return x.isDuty; })[0] || q.palaces[0];
    var gate = duty.gate;
    var ga = GATE_ACTION[gate] || { good: [], avoid: [] };

    var score = hq.score;
    if (duty.gateRank === 2) score += 2; else if (duty.gateRank === 0) score -= 2;
    score = Math.max(0, Math.min(10, score));

    var dos = ga.good.slice(0, 3);
    var avoid = ga.avoid.slice(0, 2);

    // Personal overlay
    if (profile && profile.zodiacBranch !== undefined) {
      if (p.hourBranch === C.branchClash(profile.zodiacBranch)) {
        score = Math.max(0, score - 2);
        avoid.push('major personal decisions — this hour clashes your sign');
      }
    }
    if (profile && profile.favourable && profile.favourable.indexOf(C.STEM_ELEM[p.hour.stem]) >= 0) {
      score = Math.min(10, score + 1);
      dos.push('lean on ' + C.ELEM_EN[C.STEM_ELEM[p.hour.stem]].toLowerCase() + ' activities — your supportive element is present');
    }

    return {
      pillars: p, qimen: q, score: score,
      label: score >= 7 ? 'Favourable' : score >= 4 ? 'Mixed' : 'Guard',
      hourPillar: p.hour, range: p.hourRange,
      gate: gate, gateEn: duty.gateEn, star: duty.star, spirit: duty.spirit,
      direction: duty.dir, bestDirection: q.best[0] ? q.best[0].dir : '—',
      worstDirection: q.worst[0] ? q.worst[0].dir : '—',
      do: dos, avoid: avoid, notes: hq.notes
    };
  }

  // All twelve double-hours of a day, ranked.
  function dayHours(dt, profile) {
    var out = [];
    for (var b = 0; b < 12; b++) {
      var h = b === 0 ? 23 : (b * 2 - 1);
      var probe = { y: dt.y, m: dt.m, d: dt.d, hour: h, min: 30 };
      var r = hourly(probe, profile);
      out.push({ branch: b, branchCn: C.BRANCHES[b], range: C.HOUR_RANGE[b],
                 score: r.score, gate: r.gate, gateEn: r.gateEn, label: r.label,
                 direction: r.bestDirection });
    }
    return out;
  }

  /* ---------- daily ---------- */

  function daily(dt, profile) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, 12, 0);
    var lunar = A.toLunar(dt.y, dt.m, dt.d);
    var off = C.dayOfficer(p.month.branch, p.day.branch);
    var mansion = C.lunarMansion(p.jdn);
    var duty = C.dutySpirit(p.month.branch, p.day.branch);
    var hexagram = S.yijing(p, lunar);

    var score = 50;
    score += (off.rank - 1) * 12;
    score += duty.yellow ? 12 : -10;
    score += mansion.auspicious ? 8 : -6;

    // Classical layer: Dong Gong activities for the officer, tempered by the mansion.
    var dg = C.officerActivities(off.cn);
    var dos = [], avoid = [];
    var mansionBad = (mansion.unsuitable || []).slice(0);
    dg.suitable.forEach(function (a) {
      // An activity the officer favours but the mansion forbids is dropped, not promoted.
      if (mansionBad.indexOf(a) < 0) dos.push(C.activityEn(a) + ' (' + a + ')');
    });
    dg.unsuitable.forEach(function (a) { avoid.push(C.activityEn(a) + ' (' + a + ')'); });
    mansionBad.forEach(function (a) {
      var t = C.activityEn(a) + ' (' + a + ')';
      if (avoid.indexOf(t) < 0) avoid.push(t);
    });
    // Fall back to the plain-language lists when the classical tables are unavailable.
    if (!dos.length) dos = off.good.slice(0);
    if (!avoid.length) avoid = off.bad.slice(0);

    var classical = {
      officerSuitable: dg.suitable, officerUnsuitable: dg.unsuitable,
      mansionSuitable: mansion.suitable || [], mansionUnsuitable: mansion.unsuitable || []
    };

    var clashAnimal = C.ZODIAC[C.branchClash(p.day.branch)];
    if (profile && profile.zodiacBranch !== undefined) {
      if (p.day.branch === C.branchClash(profile.zodiacBranch)) {
        score -= 25;
        avoid.push('signing, launching or travelling — today clashes your ' + C.ZODIAC[profile.zodiacBranch] + ' sign');
      } else if (p.day.branch === C.branchHarm(profile.zodiacBranch)) {
        score += 12; dos.push('ask for support — the day harmonises with your sign');
      }
      if (S.ACTIVITIES && profile.favourable &&
          profile.favourable.indexOf(C.STEM_ELEM[p.day.stem]) >= 0) {
        score += 10;
        dos.push(ELEM_ACTION[C.STEM_ELEM[p.day.stem]].do[0]);
      }
    }
    score = Math.max(0, Math.min(100, score));

    var hours = dayHours(dt, profile);
    var ranked = hours.slice(0).sort(function (a, b) { return b.score - a.score; });

    return {
      pillars: p, lunar: lunar, officer: off, mansion: mansion, duty: duty,
      hexagram: hexagram, score: score, classical: classical,
      label: score >= 68 ? 'Strong day' : score >= 45 ? 'Workable day' : 'Low-key day',
      clashAnimal: clashAnimal,
      voids: C.voidBranches(p.day.i).map(function (b) { return C.BRANCHES[b]; }),
      do: dos.slice(0, 5), avoid: avoid.slice(0, 5),
      hours: hours, bestHours: ranked.slice(0, 3), worstHours: ranked.slice(-2),
      term: p.term, formations: S.formations(p, dt.m)
    };
  }

  /* ---------- weekly ---------- */

  function weekly(dt, profile) {
    var jd0 = A.gregToJD(dt.y, dt.m, dt.d);
    var days = [];
    for (var i = 0; i < 7; i++) {
      var g = A.jdToGreg(jd0 + i);
      var d = daily({ y: g.y, m: g.m, d: Math.floor(g.d) }, profile);
      days.push({ y: g.y, m: g.m, d: Math.floor(g.d),
                  weekday: A.weekday(A.civilJDN(g.y, g.m, Math.floor(g.d))),
                  score: d.score, officer: d.officer, label: d.label,
                  pillar: d.pillars.day, clash: d.clashAnimal,
                  do: d.do.slice(0, 2), avoid: d.avoid.slice(0, 2) });
    }
    var sorted = days.slice(0).sort(function (a, b) { return b.score - a.score; });
    var avg = Math.round(days.reduce(function (a, b) { return a + b.score; }, 0) / 7);
    return { days: days, best: sorted[0], worst: sorted[6], average: avg,
             theme: avg >= 60 ? 'Push forward this week' :
                    avg >= 45 ? 'Steady, selective week' : 'Consolidate and protect this week' };
  }

  /* ---------- monthly ---------- */

  function monthly(dt, profile) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, 12, 0);
    var star = S.monthStar(p.solarYear, p.month.branch);
    var grid = S.flyingStars(star);
    var elem = C.BRANCH_ELEM[p.month.branch];
    var next = A.nextTerm(dt.y, dt.m, dt.d, 12, 0);

    var dos = ELEM_ACTION[elem].do.slice(0);
    var avoid = [];
    grid.forEach(function (row) {
      row.forEach(function (c) {
        if (c.star === 5) avoid.push('avoid renovation or noise in the ' + c.dir + ' sector this month');
        if (c.star === 2) avoid.push('keep the ' + c.dir + ' sector quiet — health sector this month');
      });
    });

    var personal = null;
    if (profile && profile.dayMasterElem !== undefined) {
      var supports = C.produces(elem, profile.dayMasterElem) || elem === profile.dayMasterElem;
      var drains = C.controls(elem, profile.dayMasterElem);
      personal = supports ? 'The month element supports your day master — a good month to initiate.'
               : drains ? 'The month element pressures your day master — pace yourself and delegate.'
               : 'The month element is neutral for you — outcomes track your effort.';
    }

    return {
      monthPillar: p.month, elem: elem, elemCn: C.ELEM[elem], elemEn: C.ELEM_EN[elem],
      star: star, starName: S.STAR_MEAN[star][0], starMeaning: S.STAR_MEAN[star][1],
      grid: grid, term: p.term, nextTerm: next,
      do: dos, avoid: avoid.slice(0, 3), personal: personal
    };
  }

  /* ---------- yearly ---------- */

  function yearly(dt, profile) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, 12, 0);
    var star = S.annualStar(p.solarYear);
    var grid = S.flyingStars(star);
    var yb = p.year.branch;
    var elem = C.STEM_ELEM[p.year.stem];

    var taiSui = C.ZODIAC[yb];
    var clashSign = C.ZODIAC[C.branchClash(yb)];
    var personal = [];
    if (profile && profile.zodiacBranch !== undefined) {
      var pb = profile.zodiacBranch;
      if (pb === yb) personal.push('You are in your own zodiac year — traditionally a year to keep commitments modest and avoid unnecessary risk.');
      else if (pb === C.branchClash(yb)) personal.push('Your sign clashes the year. Expect movement and change; plan transitions deliberately rather than reacting.');
      else if (pb === C.branchHarm(yb)) personal.push('Your sign harmonises with the year — a supportive year for partnerships and joint ventures.');
      else personal.push('No direct conflict with the year branch. Outcomes will follow your own preparation.');
    }

    var dos = ELEM_ACTION[elem].do.slice(0);
    var avoid = [];
    grid.forEach(function (row) {
      row.forEach(function (c) {
        if (c.star === 5) avoid.push('no major ground-breaking in the ' + c.dir + ' sector this year');
        if (c.star === 3) avoid.push('guard against disputes originating from the ' + c.dir + ' sector');
      });
    });

    return {
      yearPillar: p.year, solarYear: p.solarYear, zodiac: p.zodiac, zodiacCn: p.zodiacCn,
      star: star, starName: S.STAR_MEAN[star][0], starMeaning: S.STAR_MEAN[star][1],
      grid: grid, taiSui: taiSui, clashSign: clashSign,
      elemCn: C.ELEM[elem], elemEn: C.ELEM_EN[elem],
      do: dos, avoid: avoid.slice(0, 3), personal: personal
    };
  }

  /* ---------- number module ---------- */
  /* These numbers are derived from the day's chart so they are reproducible.
     They carry no predictive power over a random draw. See the notice in the UI. */

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function chartSeed(dt, profile) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, 6, 0);
    var lunar = A.toLunar(dt.y, dt.m, dt.d);
    var q = S.qimen(p);
    var seed = p.jdn * 131 + p.day.i * 17 + p.hour.i * 7 + lunar.day * 13
             + q.ju * 29 + p.term.index * 11;
    if (profile && profile.name) {
      for (var i = 0; i < profile.name.length; i++) seed += profile.name.charCodeAt(i) * (i + 3);
    }
    if (profile && profile.zodiacBranch !== undefined) seed += profile.zodiacBranch * 101;
    return { seed: seed >>> 0, pillars: p, lunar: lunar, qimen: q };
  }

  // Singapore draw calendar: 4D on Wed, Sat, Sun. Toto on Mon, Thu.
  var FOURD_DAYS = [3, 6, 0];
  var TOTO_DAYS = [1, 4];

  function numbersFor(dt, profile) {
    var jdn = A.civilJDN(dt.y, dt.m, dt.d);
    var wd = A.weekday(jdn);
    var ctx = chartSeed(dt, profile);
    var rnd = mulberry32(ctx.seed);
    var out = { weekday: wd, fourD: null, toto: null, chart: ctx };

    if (FOURD_DAYS.indexOf(wd) >= 0) {
      var sets = [];
      for (var i = 0; i < 4; i++) {
        var n = '';
        for (var j = 0; j < 4; j++) n += Math.floor(rnd() * 10);
        sets.push(n);
      }
      out.fourD = { sets: sets, drawDay: ['Sunday','','','Wednesday','','','Saturday'][wd] };
    }
    if (TOTO_DAYS.indexOf(wd) >= 0) {
      var pool = [], picked = [];
      for (var k = 1; k <= 49; k++) pool.push(k);
      while (picked.length < 7) {
        var idx = Math.floor(rnd() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }
      picked.sort(function (a, b) { return a - b; });
      out.toto = { numbers: picked, drawDay: ['','Monday','','','Thursday'][wd] };
    }
    // What the chart contributed, shown so the derivation is transparent
    out.derivation = [
      'Day pillar ' + ctx.pillars.day.cn + ' (#' + ctx.pillars.day.i + ' of 60)',
      'Lunar day ' + ctx.lunar.day + ' of month ' + ctx.lunar.month,
      'Qimen ' + ctx.qimen.dun + ' ju ' + ctx.qimen.ju,
      'Solar term ' + ctx.pillars.term.name
    ];
    return out;
  }

  function nextDrawInfo(dt) {
    var jdn = A.civilJDN(dt.y, dt.m, dt.d);
    var res = { fourD: null, toto: null };
    for (var i = 0; i <= 7; i++) {
      var wd = A.weekday(jdn + i);
      if (!res.fourD && FOURD_DAYS.indexOf(wd) >= 0) res.fourD = i;
      if (!res.toto && TOTO_DAYS.indexOf(wd) >= 0) res.toto = i;
    }
    return res;
  }

  global.QPGuide = {
    hourly: hourly, dayHours: dayHours, daily: daily,
    weekly: weekly, monthly: monthly, yearly: yearly,
    numbersFor: numbersFor, nextDrawInfo: nextDrawInfo,
    GATE_ACTION: GATE_ACTION, ELEM_ACTION: ELEM_ACTION
  };
})(typeof window !== 'undefined' ? window : globalThis);
