/* QiPath Pro — crisis navigation: the Qimen hour plate and the person's Shen Sha, read together for right now and the next hours.
 *
 * For a chosen kind of crisis it reads every two-hour window from the current one onward:
 *   - the Qimen forecast for the matching scenario (the plate's verdict, the direction of the useful symbol),
 *   - the Shen Sha the hour carries for the day and for the person, weighted for what the crisis needs,
 *   - the Five Disharmony Hour, which is never suggested for action,
 * and gives a plain plan: steady now, the next window to act, where to turn for help and which way to move.
 * Physical danger and health are never timed: the screen sends those straight to emergency services.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems;

  var TYPES = [
    { key: 'cash', label: 'Cash-flow or money emergency', scenario: 'direct_wealth', goal: 'wealth',
      steady: ['List what must be paid in the next seven days and what can wait.', 'Call the people you owe before they call you; ask for time in writing.', 'Pause every non-essential spend today.'] },
    { key: 'funding', label: 'Funding, loan or payment blocked', scenario: 'budget', goal: 'collect',
      steady: ['Write down exactly what is blocked, by whom and why.', 'Gather the documents the other side needs before you ask again.', 'Line up one alternative source, however small.'] },
    { key: 'dispute', label: 'Dispute, complaint or legal threat', scenario: 'dispute', goal: 'truce',
      steady: ['Stop replying in anger; acknowledge receipt and say you will respond properly.', 'Keep every message and note what happened, with times.', 'Speak to a lawyer or adviser before you sign or admit anything.'] },
    { key: 'negotiation', label: 'High-pressure negotiation', scenario: 'negotiate', goal: 'agreement',
      steady: ['Decide your walk-away point before you talk again.', 'Ask for the offer in writing and for time to consider it.', 'Do not concede anything in the first call.'] },
    { key: 'job', label: 'Job loss or career shock', scenario: 'finding_job', goal: 'opportunity',
      steady: ['Get the terms in writing and check what you are owed.', 'Tell three people who could help, today.', 'Update your CV or profile before the weekend.'] },
    { key: 'relationship', label: 'Relationship crisis', scenario: 'marriage', goal: 'truce',
      steady: ['Take a break from the argument; agree a time to talk again.', 'Say what you feel, not what they did.', 'If you feel unsafe at any point, leave and call for help.'] },
    { key: 'business', label: 'Business shake-up or restructuring', scenario: 'restructure', goal: 'obstacles',
      steady: ['Separate what you can control from what you cannot.', 'Tell your key people what you know and when you will know more.', 'Protect cash and core customers first.'] },
    { key: 'travel', label: 'Stranded or travel disrupted', scenario: 'travel', goal: 'opportunity',
      steady: ['Make sure you are somewhere safe, charged and with water.', 'Contact the carrier and your insurer; keep receipts.', 'Tell someone where you are and your plan.'] }
  ];

  function typeOf(key) { return TYPES.filter(function (t) { return t.key === key; })[0] || TYPES[0]; }

  /** The start of the two-hour window containing a time, and the windows that follow. */
  function windows(start, count) {
    var out = [], d = new Date(start.y, start.m - 1, start.d, start.hour, start.min || 0);
    // The current window: hours are 23-01, 01-03, ... so a window starts on an odd hour.
    var h = d.getHours(), back = h % 2 === 1 ? 0 : 1;
    var w0 = new Date(d.getTime() - back * 3600000); w0.setMinutes(0, 0, 0);
    for (var i = 0; i < count; i++) {
      var t = new Date(w0.getTime() + i * 7200000), mid = new Date(t.getTime() + 3600000);
      out.push({ start: t, mid: { y: mid.getFullYear(), m: mid.getMonth() + 1, d: mid.getDate(), hour: mid.getHours(), min: 0 } });
    }
    return out;
  }

  function navigate(user, now, typeKey, count) {
    var T = typeOf(typeKey), Q = global.QPQimen, G = global.QPGuide, natal = user && user.pillars ? user.pillars : null;
    var list = windows(now, count || 7).map(function (w, i) {
      var dt = w.mid, fc = null;
      try { fc = Q.forecast(dt, T.scenario, ''); } catch (e) { fc = null; }
      var p = fc ? fc.pillars : C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min);
      var ss = S.shenShaHour(p, natal, T.goal), wby = S.disharmony(p.day.stem, p.hour.stem, p.hour.branch);
      var hr = G.hourly(dt, user);
      var q = fc ? fc.score : 0, total = Math.round((q + ss.score * 1.5 - (wby ? 4 : 0)) * 10) / 10;
      var call = wby ? 'Hold' : total >= 4 ? 'Act' : total >= 0 ? 'Prepare' : 'Hold';
      return { i: i, start: w.start, label: (i === 0 ? 'Now · ' : '') + pad(w.start.getHours()) + ':00–' + pad((w.start.getHours() + 1) % 24) + ':59',
        hourPillar: p.hour.cn, dayPillar: p.day.cn, qimen: q, verdict: fc ? fc.verdict : '—', advice: fc ? fc.advice : '', direction: fc ? fc.direction : hr.bestDirection,
        bestDirection: hr.bestDirection, worstDirection: hr.worstDirection, gate: hr.gate, shenSha: ss, wuBuYu: !!wby, total: total, call: call };
    });
    var now0 = list[0], nextAct = list.slice(1).filter(function (x) { return x.call === 'Act'; })[0] || null;
    var bestAhead = list.slice(1).filter(function (x) { return !x.wuBuYu; }).sort(function (a, b) { return b.total - a.total; })[0] || null;
    var p0 = C.fourPillars(now.y, now.m, now.d, now.hour, now.min || 0);
    var nobleDay = S.noblemen(p0.day.stem), nobleMine = natal ? S.noblemen(natal.day.stem) : [];
    var horseDay = S.horseOf(p0.day.branch), horseMine = natal ? S.myHorses(natal) : [];
    var plan = [];
    plan.push(now0.call === 'Act' ? 'This window supports action: make the key call or move now, while it lasts (until ' + pad((now0.start.getHours() + 1) % 24) + ':59).' :
      now0.call === 'Prepare' ? 'This window is workable but not strong: steady things now and prepare the move for the next good window.' :
      'Hold: this window works against you' + (now0.wuBuYu ? ' (it is the day\'s Five Disharmony Hour)' : '') + '. Steady things, do not escalate, and wait for the next window.');
    if (nextAct) plan.push('Next window to act: ' + nextAct.label.replace('Now · ', '') + ' (' + nextAct.hourPillar + '), facing or heading ' + nextAct.direction + '.');
    else if (bestAhead) plan.push('No strong window in the next hours; the best of them is ' + bestAhead.label + ' (' + bestAhead.hourPillar + '). Use it for the most important step.');
    plan.push('For help, turn ' + nobleDay.concat(nobleMine).map(function (n) { return n.dir; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' or ') +
      ' and call someone senior or experienced in the Nobleman hours (' + nobleDay.concat(nobleMine).map(function (n) { return n.branchCn; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + ').');
    if (T.key === 'travel' || T.key === 'job' || T.key === 'business') plan.push('To get moving, the Horse points ' + [horseDay].concat(horseMine).map(function (h) { return h.dir + ' (' + h.branchCn + ' hour)'; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' or ') + '.');
    plan.push('Avoid ' + now0.worstDirection + ' this window: the plate is weakest that way.');
    return { type: T, now: now0, list: list, nextAct: nextAct, bestAhead: bestAhead, plan: plan, steady: T.steady,
      noble: { day: nobleDay, mine: nobleMine }, horse: { day: horseDay, mine: horseMine } };
  }
  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }

  global.QPCrisis = { TYPES: TYPES, navigate: navigate };
})(typeof window !== 'undefined' ? window : globalThis);
