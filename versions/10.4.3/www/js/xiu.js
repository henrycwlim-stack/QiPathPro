/* QiPath Pro: the 28 constellations (二十八宿).
 * Day mansion: the unbroken 28-day cycle (QPCore.lunarMansion). Hour mansion: 七元禽星, where each weekday's Zi hour starts
 * from 虛 鬼 箕 畢 氐 奎 翼 and one mansion passes per double-hour. Compass: the classical widths (古度) laid on the luo pan with 虛 at
 * due north. Sky: each mansion's determinative star (距星) by right ascension.
 * The harmony, posture and profile readings below are QiPath's own synthesis of these traditional attributes.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, A = global.QPAstro, RAD = Math.PI / 180;
  var LUM = ['Wood', 'Metal', 'Earth', 'Sun', 'Moon', 'Fire', 'Water'], LUM_CN = ['木', '金', '土', '日', '月', '火', '水'];
  var LUM_ELEM = [0, 3, 2, 1, 4, 1, 4];    // the Sun counts as Fire and the Moon as Water
  var GROUPS = [['青龍', 'Azure Dragon', 'East'], ['玄武', 'Black Tortoise', 'North'], ['白虎', 'White Tiger', 'West'], ['朱雀', 'Vermilion Bird', 'South']];
  var ANIMAL = ['Dragon', 'Dragon', 'Badger', 'Rabbit', 'Fox', 'Tiger', 'Leopard', 'Unicorn', 'Ox', 'Bat', 'Rat', 'Swallow', 'Pig', 'Porcupine', 'Wolf', 'Dog', 'Pheasant', 'Rooster', 'Crow', 'Monkey', 'Ape', 'Tapir', 'Goat', 'Muntjac', 'Horse', 'Deer', 'Snake', 'Worm'];
  var DEG = [12, 9, 15, 5, 5, 18, 11, 26, 8, 12, 10, 17, 16, 9, 18, 12, 15, 11, 17, 1, 10, 33, 2, 13, 7, 18, 19, 17];   // 古度
  var RA = [13.420, 14.215, 14.848, 15.980, 16.353, 16.864, 18.097, 18.761, 20.350, 20.795, 21.526, 22.097, 23.079, 0.221, 0.789, 1.911, 2.725, 3.736, 4.477, 5.585, 5.679, 6.383, 8.525, 8.627, 9.460, 9.854, 10.996, 12.263];   // 距星 J2000, hours
  var HOUR_START = [10, 22, 6, 18, 2, 14, 26];   // Zi hour by weekday, Sunday first: 虛 鬼 箕 畢 氐 奎 翼
  var WIND = [6, 13, 26, 27];                     // 箕 壁 翼 軫, the traditional wind mansions

  // For each mansion: inner inclination, work that suits, and the hidden theme to watch. QiPath's own wording from each mansion's image.
  var READ = [
    ['Quick to begin and keen to be first.', 'Pioneering roles, launches and anything that needs a first move.', 'Starting well is easy; seeing things through is the lesson.'],
    ['Upright and firm in what you think is right.', 'Law, inspection and roles that hold a standard.', 'Being right can cost you allies, so choose your stands.'],
    ['Patient and rooted, with deep attachment to home and people.', 'Long-term building, land, agriculture and stewardship.', 'Loyalty can harden into holding on too long.'],
    ['Warm and sociable, an easy bridge between people.', 'Hospitality, mediation, and public or client-facing work.', 'You may keep the peace at your own expense.'],
    ['Intense and perceptive, with strong feelings kept close.', 'Strategy, investigation, counselling and the arts.', 'Learning to trust others with what you really feel.'],
    ['Bold and persistent, staying with a task long after others stop.', 'Engineering, medicine and demanding long-haul work.', 'Your drive can overrun your need for rest.'],
    ['Free-spirited, outspoken and restless.', 'Trade, travel, media and anything that moves.', 'Careless words can scatter what you have gathered.'],
    ['Measured and ambitious, with an eye on the long term.', 'Finance, planning, administration and senior office.', 'Calculation can crowd out spontaneity and rest.'],
    ['Steady and hard-working, happiest when useful.', 'Agriculture, production and work that rewards endurance.', 'Heavy loads taken on without complaint.'],
    ['Careful and modest, noticing what others miss.', 'Craft, accounts, editing and careful service.', 'Worrying over small things, and doubting your own worth.'],
    ['Reflective and quiet, drawn to meaning more than show.', 'Research, philosophy, spiritual work and writing.', 'Periods of emptiness that turn out to be preparation.'],
    ['Alert and cautious, sensing risk before others do.', 'Risk management, safety, security and turnarounds.', 'Anxiety about what may go wrong.'],
    ['Practical and generous, a builder of shelter for others.', 'Construction, property, and running a household or team.', 'Caring for everyone before yourself.'],
    ['Scholarly and reserved, with a love of order.', 'Teaching, publishing, libraries and institutions.', 'Hiding behind walls of knowledge or routine.'],
    ['Graceful and independent, with strong ideas of your own.', 'Culture, design, literature and leadership in the arts.', 'A proud streak that makes it hard to ask for help.'],
    ['Thoughtful about people and careful with resources.', 'Gathering people or goods: HR, supply and events.', 'Too much giving, or keeping score of what is given.'],
    ['Practical and full of appetite for life.', 'Food, storage, logistics, and managing supplies.', 'Taking in more than you can use.'],
    ['Clear-eyed and direct, with a sense of justice.', 'Law, judgement, public affairs and leadership.', 'Exacting standards applied to yourself and others.'],
    ['Reliable and thorough, catching what others let slip.', 'Hunting down results: sales, research and project delivery.', 'Holding on too tightly once you have caught something.'],
    ['Quick-witted and persuasive, sharp with words.', 'Negotiation, communication and teaching.', 'Clever talk that can outrun real commitment.'],
    ['Decisive and courageous, at your best in a crisis.', 'Command, the military, emergency work and surgery.', 'Force used where patience would do.'],
    ['Deep and principled, with strong emotions under calm.', 'Water, engineering, law, and anything needing rigour.', 'Rigid rules that leave little room for people.'],
    ['Solitary and sensitive to unseen things.', 'Healing, ceremony, research and care of the dying.', 'Loneliness, and carrying other people\'s grief.'],
    ['Gentle and flexible, with a fine sense of taste.', 'Cooking, design, craft and service.', 'Bending until you lose your own shape.'],
    ['Bright and visible, drawn to being of service in public.', 'Public roles, education, and anything needing a figurehead.', 'Rising fast, then needing to pace yourself.'],
    ['Expansive and hospitable, enjoying a full table and full house.', 'Events, sales, entertainment and diplomacy.', 'Spreading yourself too thinly.'],
    ['Cultured and imaginative, with far-reaching ideas.', 'Arts, music, teaching and travel.', 'Soaring ideas that need a place to land.'],
    ['Mobile and practical, happiest on the way somewhere.', 'Transport, logistics, trade and field work.', 'Always moving on before something is finished.']
  ];

  function item(i) {
    var D = global.QPData, g = Math.floor(i / 7);
    var x = D && D.CONSTELLATIONS_28 && D.CONSTELLATIONS_28[i];
    return { i: i, cn: C.XIU[i], en: x ? x.name : C.XIU_EN[i], animal: ANIMAL[i], luminary: LUM[i % 7], luminaryCn: LUM_CN[i % 7], elem: LUM_ELEM[i % 7], elemEn: C.ELEM_EN[LUM_ELEM[i % 7]],
      group: GROUPS[g][1], groupCn: GROUPS[g][0], quarter: GROUPS[g][2], auspicious: C.XIU_AUSPICE[i] === 1, wind: WIND.indexOf(i) >= 0, degrees: DEG[i],
      suitable: x && x.suitable ? x.suitable.split('、') : [], unsuitable: x && x.unsuitable ? x.unsuitable.split('、') : [], mind: READ[i][0], work: READ[i][1], theme: READ[i][2] };
  }
  function dayMansion(jdn) { return item(C.lunarMansion(jdn).i); }
  /** The mansion ruling a double-hour, from a set of pillars. */
  function hourMansion(p) { return item((HOUR_START[A.weekday(p.dayJDN)] + p.hourBranch) % 28); }
  function ofPillars(p) { return { day: dayMansion(p.dayJDN), hour: hourMansion(p) }; }

  // Activity names in the date picker are traditional; the mansion lists are simplified.
  var SIMPLE = { '開': '开', '納': '纳', '倉': '仓', '財': '财', '動': '动', '門': '门', '舟': '船', '築': '筑', '渠': '池' };
  function simple(s) { return String(s).split('').map(function (c) { return SIMPLE[c] || c; }).join(''); }
  /** +1 if the mansion favours an activity, -1 if it warns against it, 0 if it is silent. */
  function activityFit(m, cn) {
    var s = simple(cn) === '动土' ? '起土' : simple(cn);
    if (m.suitable.indexOf(s) >= 0) return 1;
    return m.unsuitable.indexOf(s) >= 0 ? -1 : 0;
  }

  /* ---------------- the luo pan ---------------- */
  var _ring = null;
  function ring() {
    if (_ring) return _ring;
    var total = DEG.reduce(function (a, b) { return a + b; }, 0), k = 360 / total, out = [];
    for (var n = 0; n < 28; n++) out.push({ i: (10 + n) % 28, width: DEG[(10 + n) % 28] * k });
    // Lay them anticlockwise from 虛 at due north, so 危 falls north-west of it, 胃 and 昴 west, 柳 and 星 south, and 房 east.
    var from = DEG[10] * k / 2;
    _ring = out.map(function (o) { var hi = (360 + from) % 360, lo = (hi - o.width + 720) % 360; from = (from - o.width + 720) % 360; return { i: o.i, lo: lo, hi: hi, width: o.width }; });
    return _ring;
  }
  function mansionAt(deg) {
    var d = ((deg % 360) + 360) % 360, r = ring();
    for (var n = 0; n < r.length; n++) {
      var x = r[n], inside = x.lo <= x.hi ? d >= x.lo && d < x.hi : d >= x.lo || d < x.hi;
      if (inside) {
        var fromLo = ((d - x.lo) + 360) % 360, fromHi = ((x.hi - d) + 360) % 360;
        return { mansion: item(x.i), from: x.lo, to: x.hi, edge: Math.min(fromLo, fromHi) };
      }
    }
    return { mansion: item(10), from: 0, to: 0, edge: 0 };
  }
  /** The mansions that overlap a palace's 45-degree sector. */
  function palaceMansions(num) {
    var centre = { 1: 0, 8: 45, 3: 90, 4: 135, 9: 180, 2: 225, 7: 270, 6: 315 }[num];
    if (centre === undefined) return [];
    var seen = {}, out = [];
    for (var t = -21; t <= 21; t += 1) {
      var m = mansionAt(centre + t).mansion;
      if (!seen[m.i]) { seen[m.i] = 1; out.push(m); }
    }
    return out;
  }
  var PAL_ELEM = { 1: 4, 2: 2, 3: 0, 4: 0, 6: 3, 7: 3, 8: 2, 9: 1 };
  function facing(deg) {
    var f = mansionAt(deg), s = mansionAt(deg + 180), F = f.mansion, B = s.mansion, score = 0, why = [];
    var FS = global.QPFengShui, mt = FS.mountainFor(deg), pe = PAL_ELEM[mt.palace];
    score += F.auspicious ? 1.5 : -1.5;
    why.push('The facing mansion, ' + F.cn + ' ' + F.en + ', is traditionally ' + (F.auspicious ? 'auspicious.' : 'inauspicious.'));
    score += B.auspicious ? 0.75 : -0.75;
    why.push('The sitting mansion, ' + B.cn + ' ' + B.en + ', is traditionally ' + (B.auspicious ? 'auspicious, which steadies the back of the property.' : 'inauspicious, so the support behind the property is weaker.'));
    if (F.elem === pe) { score += 0.5; why.push(F.cn + ' (' + F.elemEn + ') matches the element of the ' + mt.dirFull + ' sector.'); }
    else if (C.produces(F.elem, pe)) { score += 1; why.push(F.cn + ' (' + F.elemEn + ') feeds the ' + C.ELEM_EN[pe] + ' of the ' + mt.dirFull + ' sector.'); }
    else if (C.produces(pe, F.elem)) { score -= 0.25; why.push('The ' + C.ELEM_EN[pe] + ' of the sector feeds ' + F.cn + ' (' + F.elemEn + '), which is a slight drain.'); }
    else if (C.controls(F.elem, pe)) { score -= 1; why.push(F.cn + ' (' + F.elemEn + ') presses on the ' + C.ELEM_EN[pe] + ' of the sector.'); }
    else { score -= 0.5; why.push('The ' + C.ELEM_EN[pe] + ' of the sector presses on ' + F.cn + ' (' + F.elemEn + ').'); }
    if (F.elem !== B.elem) {
      if (C.produces(B.elem, F.elem)) { score += 0.5; why.push('The sitting mansion feeds the facing mansion, so support flows from back to front.'); }
      else if (C.controls(B.elem, F.elem) || C.controls(F.elem, B.elem)) { score -= 0.5; why.push('The sitting and facing mansions are in conflict.'); }
    }
    if (f.edge < 1.5) { score -= 0.5; why.push('The bearing is within ' + f.edge.toFixed(1) + '° of the edge of its mansion, so its influence is mixed. Check the bearing carefully.'); }
    return { deg: deg, facing: F, sitting: B, from: f.from, to: f.to, edge: f.edge, score: Math.round(score * 100) / 100, verdict: score >= 1.5 ? 'Harmonious' : score <= -1 ? 'Disruptive' : 'Mixed', why: why };
  }

  /* ---------------- the sky ---------------- */
  function lst(jd, lon) {
    var T = (jd - 2451545) / 36525, g = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T;
    return (((g + lon) % 360) + 360) % 360;
  }
  function raNow(i, jd) { return ((RA[i] * 15 + ((jd - 2451545) / 36525) * 1.396) % 360 + 360) % 360; }   // general precession in RA, enough here
  /** Which mansion culminates now, and which mansion star stands nearest a bearing, above the horizon. */
  function sky(jd, lat, lon, bearing) {
    var L = lst(jd, lon), overhead = null, best = null, bestGap = 999;
    // A mansion runs from its own star to the next one's, so the meridian falls in the last star to have crossed it.
    var least = 999;
    for (var i = 0; i < 28; i++) {
      var ha = ((L - raNow(i, jd)) % 360 + 360) % 360;
      if (ha < least) { least = ha; overhead = i; }
      if (bearing !== undefined && bearing !== null) {
        var H = ha * RAD, dec = 0, phi = lat * RAD;
        // Mansion stars lie near the equator, so declination is taken from the ecliptic at that right ascension.
        dec = Math.atan(Math.tan(23.44 * RAD) * Math.sin(raNow(i, jd) * RAD));
        var alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
        var az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H)) / RAD;
        var gap = Math.abs(((az - bearing + 540) % 360) - 180);
        if (alt > 0 && gap < bestGap) { bestGap = gap; best = { i: i, altitude: alt / RAD, azimuth: (az + 360) % 360 }; }
      }
    }
    return { overhead: item(overhead), aligned: best ? { mansion: item(best.i), altitude: Math.round(best.altitude), azimuth: Math.round(best.azimuth), gap: Math.round(bestGap) } : null };
  }
  /** The mansion holding the Moon, from a true Moon longitude. */
  function moonMansion(longitude, jd) {
    var ra = Math.atan2(Math.sin(longitude * RAD) * Math.cos(23.44 * RAD), Math.cos(longitude * RAD)) / RAD, best = 0, least = 999;
    ra = (ra + 360) % 360;
    for (var i = 0; i < 28; i++) { var d = ((ra - raNow(i, jd)) % 360 + 360) % 360; if (d < least) { least = d; best = i; } }
    return item(best);
  }
  function raOfLongitude(longitude) { return (Math.atan2(Math.sin(longitude * RAD) * Math.cos(23.44 * RAD), Math.cos(longitude * RAD)) / RAD + 360) % 360; }
  /** The mansion holding an ecliptic longitude, and the degrees past its star. */
  function mansionDegree(longitude, jd) {
    var ra = raOfLongitude(longitude), best = 0, least = 999;
    for (var i = 0; i < 28; i++) { var d = ((ra - raNow(i, jd)) % 360 + 360) % 360; if (d < least) { least = d; best = i; } }
    return { item: item(best), deg: least };
  }
  /** The ecliptic longitude at a fraction of the way through a mansion, between its star and the next. */
  function lonInMansion(i, frac, jd) {
    var a = raNow(i, jd), b = raNow((i + 1) % 28, jd), span = ((b - a) % 360 + 360) % 360, ra = (a + span * frac) * RAD;
    return (Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(23.44 * RAD)) / RAD + 360) % 360;
  }
  /** The next days a mansion rules, within about two cycles. */
  function nextDays(i, from, count) {
    var jd0 = A.civilJDN(from.y, from.m, from.d), out = [];
    for (var k = 0; k < 90 && out.length < (count || 2); k++) {
      if (C.lunarMansion(jd0 + k).i === i) { var g = A.jdToGreg(A.gregToJD(from.y, from.m, from.d) + k); out.push({ y: g.y, m: g.m, d: Math.floor(g.d) }); }
    }
    return out;
  }

  /* ---------------- profile and posture ---------------- */
  /** Birth mansions: the hour shows the inner inclination, and the day the life themes. */
  function profile(user) {
    var day = dayMansion(user.pillars.dayJDN), hour = hourMansion(user.pillars), same = day.group === hour.group;
    return { day: day, hour: hour, summary: 'Born under ' + hour.cn + ' ' + hour.en + ' in the hour and ' + day.cn + ' ' + day.en + ' on the day. ' + hour.mind + ' ' +
      (same ? 'Both belong to the ' + day.group + ', which gives your character one clear direction.' : 'They belong to the ' + hour.group + ' and ' + day.group + ', so you have two different modes to draw on.') };
  }
  var QUARTER_V = { East: 1, South: 1, West: 0.5, North: -1 }, LUM_V = [0.5, 0.5, 0, 1, -1, 1, -1];
  /** Whether a moment leans towards an assertive move or a defensive posture. */
  function posture(p, chart) {
    var m = ofPillars(p), v = function (x) { return QUARTER_V[x.quarter] + LUM_V[x.i % 7] + (x.auspicious ? 1 : -1); };
    var s = v(m.day) * 0.4 + v(m.hour) * 0.6, why = [];
    why.push('The day mansion is ' + m.day.cn + ' ' + m.day.en + ': ' + m.day.group + ', ' + m.day.luminary + ', ' + (m.day.auspicious ? 'auspicious.' : 'inauspicious.'));
    why.push('The hour mansion is ' + m.hour.cn + ' ' + m.hour.en + ': ' + m.hour.group + ', ' + m.hour.luminary + ', ' + (m.hour.auspicious ? 'auspicious.' : 'inauspicious.'));
    if (chart && chart.meta && chart.meta.fuYin) { s -= 1; why.push('The plate is at rest (伏吟), which argues against moving first.'); }
    if (chart && chart.meta && chart.meta.fanYin) { s -= 0.5; why.push('The plate is reversed (反吟), so expect the situation to turn. Keep your options open.'); }
    if (m.day.wind || m.hour.wind) why.push('A wind mansion is active, so conditions can change quickly. Favour speed and flexibility.');
    var name = s >= 1 ? 'Assertive' : s <= -0.75 ? 'Defensive' : 'Measured';
    return { name: name, score: Math.round(s * 100) / 100, why: why, day: m.day, hour: m.hour,
      advice: { Assertive: 'Conditions favour taking the initiative: make the first move, set the terms and press an advantage.',
        Measured: 'Conditions favour preparation and selective moves. Act where you are already strong, and keep reserves back.',
        Defensive: 'Conditions favour holding your position: protect what you have, gather information and let others show their hand.' }[name] };
  }

  /* ---------------- 7 Stars Path ---------------- */
  // The compendium's equivalence between the nine Qimen stars and the Northern Dipper.
  var DIPPER = [['天蓬', '貪狼', 'Greedy Wolf'], ['天芮', '巨門', 'Huge Door'], ['天冲', '祿存', 'Fortune Treasures'], ['天辅', '文曲', 'Literary Arts'], ['天禽', '廉貞', 'Chastity'], ['天心', '武曲', 'Military Arts'], ['天柱', '破軍', 'Broken Soldier']];
  /** Follows the seven Dipper stars across a plate, in order, from 貪狼 to 破軍. */
  function sevenStars(chart, forms, fav) {
    var Q = global.QPQimen, P = chart.palacesByNumber;
    var steps = DIPPER.map(function (d, k) {
      var n = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (x) { return P[x].starCn === d[0] || P[x].star2Cn === d[0]; })[0];
      var pa = n ? P[n] : null;
      return { step: k + 1, star: d[0], dipper: d[1], dipperEn: d[2], num: n || null, dir: pa ? (n === 5 ? 'Centre' : pa.dir) : '', gate: pa ? pa.gate : '', deity: pa ? pa.spirit : '', isEmpty: !!(pa && pa.isEmpty),
        quality: n && n !== 5 ? Q.palaceQuality(chart, forms || [], n, fav).score : 0 };
    });
    var open = steps.filter(function (s) { return s.num && !s.isEmpty; }).sort(function (a, b) { return b.quality - a.quality; });
    return { steps: steps, route: steps.map(function (s) { return s.dir; }), blocked: steps.filter(function (s) { return s.isEmpty; }).length, strongest: open[0] || null, weakest: open[open.length - 1] || null };
  }

  global.QPXiu = { item: item, dayMansion: dayMansion, hourMansion: hourMansion, ofPillars: ofPillars, activityFit: activityFit, mansionAt: mansionAt, ring: ring, palaceMansions: palaceMansions,
    facing: facing, sky: sky, moonMansion: moonMansion, mansionDegree: mansionDegree, lonInMansion: lonInMansion, nextDays: nextDays, profile: profile, posture: posture, sevenStars: sevenStars };
})(typeof window !== 'undefined' ? window : globalThis);
