/* QiPath Pro: Strategic Execution.
 * Picks the seat or direction for an activity on the hour plate, following the method in Joey Yap's Qi Men Dun Jia Strategic Executions: lay the chart over the
 * place, read the stem pair in each sector, and use the sector with good structures, door, deity and star. The book gives a written forecast for each pair and activity;
 * those are not reproduced. The ratings come from the Compendium's stem table, the notes are QiPath's own and so are the points used to rank the sectors.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems, D = global.QPData, Q = global.QPQimen;
  var OUTER = [1, 2, 3, 4, 6, 7, 8, 9], OPPOSITE = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
  var GOOD_DEITY = ['值符', '太阴', '六合', '九地', '九天'], BAD_DEITY = ['腾蛇', '白虎', '勾陈', '朱雀', '玄武'];
  var GOOD_STAR = ['天冲', '天辅', '天禽', '天心', '天任'], BAD_STAR = ['天蓬', '天芮', '天柱', '天英'];   // Warcraft, printed p.59
  var HAZARDS = ['zhan_ge', 'da_ge', 'tian_yi_fei_gong', 'tian_yi_fu_gong'];                          // Warcraft, printed p.298-303
  // Doors by activity, from each door's Suitable and Unsuitable lists in the Compendium and The Doors. Doors not listed use their general value.
  var ACTIVITIES = [
    { id: 'business', label: 'Business and investment', cn: '商業', good: ['生门', '开门'], bad: ['杜门', '景门', '死门', '惊门'], note: 'Suits meetings, negotiations and deals. Be open about the terms.' },
    { id: 'love', label: 'Love and relationships', cn: '感情', good: ['休门', '生门'], bad: ['伤门', '杜门', '死门', '惊门'], note: 'Suits dates, proposals and mending a relationship.' },
    { id: 'study', label: 'Scholarly pursuits', cn: '學業', good: ['休门', '景门', '开门', '生门'], bad: ['死门', '惊门'], note: 'Suits exams, interviews, research and learning from a teacher.' },
    { id: 'health', label: 'Health', cn: '健康', good: ['生门', '开门'], bad: ['死门', '惊门'], note: 'Suits rest and appointments. The Death and Fear Doors are listed as unsuitable for treatment.' },
    { id: 'leisure', label: 'Leisure and recreation', cn: '休閒', good: ['休门', '生门', '开门'], bad: ['死门', '惊门', '伤门'], note: 'Suits outings, gatherings and rest.' }
  ];
  // Pairs Strategic Executions marks the opposite way to the Compendium's table in all its activities. The app follows the Compendium and says so.
  var BOOKS_DIFFER = { '甲己': 'good', '乙壬': 'good', '丁庚': 'good', '戊壬': 'good', '辛丁': 'good', '壬辛': 'good', '壬甲': 'bad' };

  function activity(id) { return ACTIVITIES.filter(function (a) { return a.id === id; })[0] || ACTIVITIES[0]; }

  function sector(pa, act, forms, hazardNums) {
    var pair = D.stemCombo(pa.heavenStemCn, pa.earthStemCn), why = [], score = 0;
    if (pair) score += pair.rating === 'good' ? 2 : pair.rating === 'bad' ? -2 : 0;
    var dv = act.good.indexOf(pa.gate) >= 0 ? 2 : act.bad.indexOf(pa.gate) >= 0 ? -2 : pa.gateRank === 2 ? 1 : pa.gateRank === 0 ? -1 : 0;
    var key = pa.gatePalace && pa.gatePalace.key;
    // A compelled door delivers less, good or bad (Compendium p.299).
    if (key === 'door_compels' || key === 'palace_compels') { dv = dv / 2; why.push(pa.gate + ' is compelled here, so it delivers less.'); }
    score += dv;
    score += GOOD_DEITY.indexOf(pa.spirit) >= 0 ? 1 : BAD_DEITY.indexOf(pa.spirit) >= 0 ? -1 : 0;
    score += GOOD_STAR.indexOf(pa.starCn) >= 0 ? 1 : BAD_STAR.indexOf(pa.starCn) >= 0 ? -1 : 0;
    var here = forms.filter(function (f) { return (f.palaces || []).indexOf(pa.num) >= 0; });
    var good = here.filter(function (f) { return f.category === 'auspicious'; }), bad = here.filter(function (f) { return f.category === 'hostile'; });
    score += Math.max(-2, Math.min(2, (good.length - bad.length) * 0.5));
    var hazard = hazardNums.indexOf(pa.num) >= 0;
    if (hazard) why.push('A structure the book says to avoid is here, so do not sit or head this way.');
    // Emptiness makes a sector moot, good or bad, so it is neither chosen nor scored (Warcraft, printed p.206).
    if (pa.isEmpty) why.push('This sector is void, so what it offers may not hold.');
    var differ = pair && BOOKS_DIFFER[pa.heavenStemCn + pa.earthStemCn];
    return { num: pa.num, dir: pa.dir, name: pa.name, heaven: pa.heavenStemCn, earth: pa.earthStemCn, pair: pair, door: pa.gate, star: pa.starCn, deity: pa.spirit, score: pa.isEmpty ? -1 : Math.round(score * 10) / 10, isVoid: !!pa.isEmpty, hazard: hazard,
      usable: !pa.isEmpty && !hazard, goodForms: good.map(function (f) { return f.name; }), badForms: bad.map(function (f) { return f.name; }), why: why,
      differs: differ ? 'Strategic Executions marks this pair ' + differ + ', against the Compendium.' : null };
  }

  function read(when, actId) {
    var act = activity(actId), res = Q.chartFor('hour', when), ch = res.chart, p = res.pillars, forms = res.formations, hazardNums = [];
    forms.filter(function (f) { return HAZARDS.indexOf(f.id) >= 0; }).forEach(function (f) { (f.palaces || []).forEach(function (n) { hazardNums.push(n); }); });
    var list = OUTER.map(function (n) { return sector(ch.palacesByNumber[n], act, forms, hazardNums); }).sort(function (a, b) { return (b.usable - a.usable) || (b.score - a.score); });
    var best = list[0] && list[0].usable && list[0].score > 0 ? list[0] : null;
    var fanYin = forms.some(function (f) { return f.id === 'men_fan_yin'; }), dh = S.disharmony(p.day.stem, p.hour.stem), warnings = [];
    if (fanYin) warnings.push({ label: 'The doors are in Fan Yin 门反吟', text: 'The Compendium treats this hour as unusable, whatever a sector shows. Pick another hour if you can.' });
    if (dh) warnings.push({ label: dh.label, text: dh.text });
    return { when: when, activity: act, chart: ch, pillars: p, formations: forms, list: list, best: fanYin ? null : best, warnings: warnings, usableHour: !fanYin && !dh,
      care: act.id === 'health' ? S.HEALTH_CARE : null, hits: best ? [best.num] : [] };
  }

  /** The pit stop (Strategic Executions, printed p.30-31): to come from the good direction, reach a stopover half a day ahead, on the far side of the destination. */
  function pitStop(r, destNum) {
    var dest = r.list.filter(function (x) { return x.num === destNum; })[0], best = r.best;
    if (!dest) return null;
    if (!best) return { dest: dest, needed: false, ok: false, text: 'No sector is clean this hour, so a detour will not help. Try another hour.' };
    if (dest.num === best.num) return { dest: dest, needed: false, ok: true, text: 'Your destination already lies in the best direction, so you can go straight there.' };
    if (dest.usable && dest.score >= best.score - 1) return { dest: dest, needed: false, ok: true, text: 'Your destination\'s direction is close to the best on this plate, so you can go straight there.' };
    var from = new Date(r.when.y, r.when.m - 1, r.when.d, r.when.hour, r.when.min);
    from.setHours(from.getHours() - 12);
    var side = global.QPExec.dirOf(r, OPPOSITE[best.num]);
    return { dest: dest, needed: true, ok: true, stopSide: side, by: { y: from.getFullYear(), m: from.getMonth() + 1, d: from.getDate(), hour: from.getHours(), min: from.getMinutes() },
      text: 'Your destination\'s direction is weaker than ' + best.dir + '. Reach a stopover about half a day ahead, placed to the ' + side + ' of where you are going, and set out from there heading ' + best.dir + '.' };
  }

  /** Better hours for this activity in the next few days, waking hours only. Left out for health: nobody should wait to see a doctor. */
  function betterHours(when, actId, days) {
    if (actId === 'health') return [];
    var out = [], start = new Date(when.y, when.m - 1, when.d, when.hour, when.min);
    for (var i = 1; i <= (days || 3) * 12; i++) {
      var d = new Date(start.getTime() + i * 2 * 3600000);
      if (d.getHours() < 7 || d.getHours() > 22) continue;
      var w = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hour: d.getHours(), min: d.getMinutes() }, r = read(w, actId);
      if (r.best && r.usableHour) out.push({ when: w, range: r.pillars.hourRange, hour: r.pillars.hour.cn, dir: r.best.dir, score: r.best.score, door: r.best.door });
    }
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
  }

  function dirOf(r, num) { return r.chart.palacesByNumber[num].dir; }

  global.QPExec = { ACTIVITIES: ACTIVITIES, read: read, pitStop: pitStop, betterHours: betterHours, dirOf: dirOf };
})(typeof window !== 'undefined' ? window : this);
