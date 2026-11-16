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

  function navigate(user, now, typeKey, count, goalOverride) {
    var T = typeOf(typeKey), goalKey = goalOverride || T.goal, Q = global.QPQimen, G = global.QPGuide, natal = user && user.pillars ? user.pillars : null;
    var list = windows(now, count || 7).map(function (w, i) {
      var dt = w.mid, fc = null;
      try { fc = Q.forecast(dt, T.scenario, ''); } catch (e) { fc = null; }
      var p = fc ? fc.pillars : C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min);
      var ss = S.shenShaHour(p, natal, goalKey), wby = S.disharmony(p.day.stem, p.hour.stem, p.hour.branch), sr = stemRel(p.day.stem, p.hour.stem);
      var dun = (fc && fc.formations ? fc.formations : []).filter(function (f) { return /_dun$/.test(f.id); }).map(function (f) {
        return { name: f.name, en: f.nameEn, desc: f.description, dirs: (f.palaces || []).map(function (n) { return fc.chart.palacesByNumber[n] ? fc.chart.palacesByNumber[n].dir : ''; }).filter(Boolean) };
      });
      var hr = G.hourly(dt, user);
      var q = fc ? fc.score : 0, total = Math.round((q + ss.score * 1.5 - (wby ? 4 : 0) + (sr ? sr.v : 0)) * 10) / 10;
      var call = wby ? 'Hold' : total >= 4 ? 'Act' : total >= 0 ? 'Prepare' : 'Hold';
      return { i: i, start: w.start, label: (i === 0 ? 'Now · ' : '') + pad(w.start.getHours()) + ':00–' + pad((w.start.getHours() + 1) % 24) + ':59',
        hourPillar: p.hour.cn, dayPillar: p.day.cn, qimen: q, verdict: fc ? fc.verdict : '—', advice: fc ? fc.advice : '', direction: fc ? fc.direction : hr.bestDirection,
        bestDirection: hr.bestDirection, worstDirection: hr.worstDirection, gate: hr.gate, shenSha: ss, wuBuYu: !!wby, stemRel: sr, dun: dun, total: total, call: call };
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
    // A move the Travelling Horse calls for waits for a window whose hour stem combines with the day stem.
    if (goalKey === 'opportunity' || T.key === 'travel' || T.key === 'job' || T.key === 'business') {
      var mv = list.filter(function (x) { return x.stemRel && x.stemRel.kind === 'combine' && x.call !== 'Hold'; })[0];
      plan.push(mv ? 'For the move itself (the restructure, reassignment or dispatch), use ' + mv.label.replace('Now · ', '') + ' (' + mv.hourPillar + '): its hour stem combines with the day stem, so the change meets the least friction.'
        : 'No window in the next hours has the hour stem combining with the day stem; if the move can wait, look further ahead rather than forcing it.');
    }
    if (T.key === 'travel' || T.key === 'job' || T.key === 'business') plan.push('To get moving, the Horse points ' + [horseDay].concat(horseMine).map(function (h) { return h.dir + ' (' + h.branchCn + ' hour)'; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' or ') + '.');
    plan.push('Avoid ' + now0.worstDirection + ' this window: the plate is weakest that way.');
    return { type: T, goal: goalKey, now: now0, list: list, nextAct: nextAct, bestAhead: bestAhead, plan: plan, steady: T.steady,
      noble: { day: nobleDay, mine: nobleMine }, horse: { day: horseDay, mine: horseMine } };
  }

  /* ---------- Phase 1: the natal baseline under today's pillars ---------- */

  var STEM_UNION = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 }, STEM_CLASH = { 0:6, 6:0, 1:7, 7:1, 2:8, 8:2, 3:9, 9:3 };
  /** How the hour stem meets the day stem: a combination (合) eases cooperation, a clash (冲) brings friction. */
  function stemRel(dayStem, hourStem) {
    if (STEM_UNION[dayStem] === hourStem) return { kind: 'combine', cn: '合', v: 1.5, text: 'the hour stem combines with the day stem: moves go through smoothly' };
    if (STEM_CLASH[dayStem] === hourStem) return { kind: 'clash', cn: '冲', v: -1.5, text: 'the hour stem clashes the day stem: friction and pushback' };
    return null;
  }

  /** The stars, clashes and Ten God frictions that the luck pillar, year, month and day switch on in the person's chart. */
  function triggers(user, t) {
    var B = global.QPBazi, X = global.QPBaziPlus, natal = user.pillars, p0 = C.fourPillars(t.y, t.m, t.d, 12, 0), out = { stars: [], conflicts: [], friction: [] };
    var age = p0.solarYear - user.birth.y, lp = null;
    (user.luck && user.luck.pillars || []).forEach(function (l) { if (age >= l.from && age < l.to) lp = l; });
    var src = [{ label: 'Year ' + p0.year.cn, q: p0.year }, { label: 'Month ' + p0.month.cn, q: p0.month }, { label: 'Day ' + p0.day.cn, q: p0.day }];
    if (lp) src.unshift({ label: 'Luck pillar ' + lp.pillar.cn, q: lp.pillar });
    var labs = ['Year', 'Month', 'Day', 'Hour'];
    src.forEach(function (s) {
      (B.starsOnBranch ? B.starsOnBranch(natal, s.q.branch) : []).forEach(function (st) { st.via = s.label; out.stars.push(st); });
      labs.forEach(function (lab) {
        var nb = natal[lab.toLowerCase()].branch;
        (X ? X.branchRels(s.q.branch, nb) : []).forEach(function (k) {
          if (k === 'union') return;
          out.conflicts.push({ kind: k, cn: X.REL_MEAN[k].cn, en: X.REL_MEAN[k].en, with: lab + ' ' + C.BRANCHES[nb], via: s.label, text: X.REL_MEAN[k].text });
        });
      });
    });
    if ((p0.year.branch + 6) % 12 === natal.year.branch) out.conflicts.unshift({ kind: 'suipo', cn: '歲破', en: 'Year Breaker',
      with: 'Year ' + C.BRANCHES[natal.year.branch], via: 'Year ' + p0.year.cn, text: 'the year clashes your birth year: direct confrontation with authorities or stakeholders' });
    var dm = natal.day.stem, has = function (g) {
      return [natal.year, natal.month, natal.hour].some(function (q) { return C.tenGod(dm, q.stem).i === g; }) ||
        [natal.year, natal.month, natal.day, natal.hour].some(function (q) { return C.tenGod(dm, C.HIDDEN[q.branch][0]).i === g; });
    };
    var seen = {}, fr = function (cn, en, via, text) { if (seen[cn + via]) return; seen[cn + via] = 1; out.friction.push({ cn: cn, en: en, via: via, text: text }); };
    src.forEach(function (s) {
      var g = C.tenGod(dm, s.q.stem).i;
      if (g === 3 && has(7)) fr('傷官見官', 'Hurting Officer meets Direct Officer', s.label, 'outspokenness collides with authority and rules: a legal or political deadlock');
      if (g === 7 && has(3)) fr('官見傷官', 'Direct Officer meets Hurting Officer', s.label, 'authority presses on your outspoken side: compliance or political friction');
      if (g === 6 && user.deep && !user.deep.strong) fr('七殺攻身', 'Seven Killings on a weak Day Master', s.label, 'heavy pressure and hostile competition');
      if (g === 1) fr('劫財', 'Rob Wealth active', s.label, 'money drains through others: partners, rivals or impulsive spending');
    });
    return out;
  }

  /** The objective the active stars point to, strongest first. */
  function objectives(tr) {
    var key = function (k) { return tr.stars.some(function (s) { return s.key === k; }); };
    var fric = function (cn) { return tr.friction.some(function (f) { return f.cn === cn; }); };
    var out = [];
    if (key('nobleman')) out.push({ goal: 'noble', text: 'Secure backing: patronage, alignment with decision-makers, or a regulator\'s sign-off.', why: 'the Heavenly Nobleman is active' });
    if (fric('傷官見官') || fric('官見傷官')) out.push({ goal: 'truce', text: 'Defuse the legal or internal political deadlock.', why: 'Hurting Officer and Direct Officer are in friction' });
    if (tr.conflicts.some(function (c) { return c.kind === 'suipo' || c.kind === 'clash'; })) out.push({ goal: 'truce', text: 'Manage the confrontation with stakeholders without escalating it.', why: 'a clash is active against your chart' });
    if (key('horse')) out.push({ goal: 'opportunity', text: 'Make the pivot: restructure, reassign or relocate, cleanly and in a verified window.', why: 'the Travelling Horse is active' });
    if (fric('劫財') || key('robbery') || key('zaiSha') || key('loss')) out.push({ goal: 'protection', text: 'Protect cash, assets and information first.', why: 'a draining star is active' });
    if (fric('七殺攻身')) out.push({ goal: 'courage', text: 'Hold your ground under pressure and choose the battles worth fighting.', why: 'Seven Killings presses a weak Day Master' });
    if (key('academic') || key('xueTang')) out.push({ goal: 'clarity', text: 'Get the facts straight and put your case clearly in writing.', why: 'a learning star is active' });
    return out;
  }

  /* ---------- Phase 2 and 3: the live hour plate ---------- */

  var AUSPICIOUS_STEMS = ['乙', '丙', '丁', '戊'];
  function hourPlate(user, t, goal) {
    var Q = global.QPQimen, r = Q.chartFor('hour', { y: t.y, m: t.m, d: t.d, hour: t.hour, min: t.min || 0 }), ch = r.chart, p = r.pillars;
    var you = Q.askerPalace(ch, p), opp = Q.askerPalace(ch, { day: p.hour });
    var pals = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) { return ch.palacesByNumber[n]; }).filter(Boolean);
    var chief = pals.filter(function (x) { return x.isChief || x.spirit === '值符'; })[0] || null;
    var open = pals.filter(function (x) { return (x.gate || '').charAt(0) === '开'; })[0] || null;
    var goodStem = function (x) { return x && [x.heavenStemCn, x.heavenStem2Cn].some(function (s) { return AUSPICIOUS_STEMS.indexOf(s) >= 0; }); };
    var face = null, faceWhy = '';
    if (chief && open && chief.num === open.num) { face = chief; faceWhy = 'the Chief (值符) and the Open Door (开门) share this palace'; }
    else if (chief && goodStem(chief) && !chief.isEmpty) { face = chief; faceWhy = 'the Chief (值符) sits here with ' + chief.heavenStemCn; }
    else if (open && !open.isEmpty) { face = open; faceWhy = 'the Open Door (开门) sits here' + (goodStem(open) ? ' with ' + open.heavenStemCn : ''); }
    else if (chief) { face = chief; faceWhy = 'the Chief (值符) sits here'; }
    var harm = pals.filter(function (x) { return (x.gate || '').charAt(0) === '伤'; })[0] || null;
    var death = pals.filter(function (x) { return (x.gate || '').charAt(0) === '死'; })[0] || null;
    var hostile = (r.formations || []).filter(function (f) { return f.category === 'hostile'; }).map(function (f) {
      return { name: f.name, en: f.nameEn, dirs: (f.palaces || []).map(function (n) { return ch.palacesByNumber[n] ? ch.palacesByNumber[n].dir : ''; }).filter(Boolean) };
    });
    return { res: r, chart: ch, pillars: p, you: you, opp: opp, chief: chief, open: open, face: face, faceWhy: faceWhy, harm: harm, death: death, hostile: hostile,
      youOpp: you && opp ? Q.rel(you.element, opp.element) : null };
  }


  /* ---------- the execution window: when to strike if the other side is void or in its tomb ----------
   * Step 1 finds the branch that releases the trap: a clash (冲) or a fill (填實) of the void branch, or the clash that opens the tomb.
   * Step 2 scans the coming hours for that branch where the Day Stem has the edge over the incoming hour stem, without the hour
   * clashing or self-punishing the person's own pillars. Step 3 checks the Open or Rest Door and the Chief or Nine Heavens. */
  var TOMB_BRANCH = [7, 7, 10, 10, 10, 10, 1, 1, 4, 4];   // storage branch of each stem's element: Wood 未, Fire/Earth 戌, Metal 丑, Water 辰
  var SELF_PUNISH = [4, 6, 9, 11];
  function trapOf(hp) {
    if (!hp || !hp.opp) return null;
    var C2 = C, opp = hp.opp, p = hp.pillars, keys = [], kinds = [];
    if (opp.isEmpty) {
      var vb = (hp.chart.voidBranches || []).map(function (c) { return C2.BRANCHES.indexOf(c); });
      var palB = (opp.branches || []).map(function (c) { return C2.BRANCHES.indexOf(c); });
      var hit = palB.filter(function (b) { return vb.indexOf(b) >= 0; });
      (hit.length ? hit : vb).forEach(function (b) {
        keys.push({ branch: (b + 6) % 12, how: 'clashes the void branch ' + C2.BRANCHES[b] + ' (冲空)' });
        keys.push({ branch: b, how: 'fills the void branch ' + C2.BRANCHES[b] + ' (填實)' });
      });
      kinds.push('void');
    }
    var tb = TOMB_BRANCH[p.hour.stem];
    if ((opp.branches || []).indexOf(C2.BRANCHES[tb]) >= 0) {
      keys.push({ branch: (tb + 6) % 12, how: 'clashes open the tomb ' + C2.BRANCHES[tb] + ' (冲墓)' });
      kinds.push('tomb');
    }
    if (!kinds.length) return null;
    return { kinds: kinds, opponent: p.hour.cn.charAt(0), palace: opp.dir, keys: keys };
  }
  function executionWindows(user, t, hp, days) {
    var Q = global.QPQimen, natal = user && user.pillars ? user.pillars : null, trap = trapOf(hp), out = [];
    var natalB = natal ? [natal.year.branch, natal.month.branch, natal.day.branch, natal.hour.branch] : [];
    var start = windows(t, 1)[0].start;
    for (var i = 1; i <= (days || 3) * 12; i++) {
      var w = new Date(start.getTime() + i * 7200000), mid = new Date(w.getTime() + 3600000);
      var dt = { y: mid.getFullYear(), m: mid.getMonth() + 1, d: mid.getDate(), hour: mid.getHours(), min: 0 };
      var r; try { r = Q.chartFor('hour', dt); } catch (e) { continue; }
      var p = r.pillars, hb = p.hour.branch, db = p.day.branch;
      if (S.disharmony(p.day.stem, p.hour.stem, p.hour.branch)) continue;
      // Do not strike in an hour that clashes or self-punishes your own pillars.
      if (natalB.some(function (b) { return (b + 6) % 12 === hb; })) continue;
      if (SELF_PUNISH.indexOf(hb) >= 0 && natalB.indexOf(hb) >= 0) continue;
      var why = [], score = 0;
      var key = trap ? trap.keys.filter(function (k) { return k.branch === hb; })[0] : null;
      var dayKey = trap ? trap.keys.filter(function (k) { return k.branch === db; })[0] : null;
      if (trap && !key && !dayKey) continue;
      if (key) { score += 3; why.push('the hour ' + C.BRANCHES[hb] + ' ' + key.how); }
      if (dayKey) { score += 1.5; why.push('the day ' + C.BRANCHES[db] + ' ' + dayKey.how); }
      var dyn = Q.stemDynamics(r.chart, p);
      var dv = { control: 2, combine: 1.5, produced: 1, same: -0.5, produce: -0.5, controlled: -2 }[dyn.kind];
      if (dv < 0 && dyn.kind === 'controlled') continue;
      score += dv; why.push(dyn.cn + ' ' + dyn.en.toLowerCase());
      var pals = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) { return r.chart.palacesByNumber[n]; }).filter(Boolean);
      var door = pals.filter(function (x) { var g = (x.gate || '').charAt(0); return (g === '开' || g === '休') && !x.isEmpty; })
        .sort(function (a, b) { return (a.gate.charAt(0) === '开' ? 0 : 1) - (b.gate.charAt(0) === '开' ? 0 : 1); })[0];
      if (door) { score += door.gate.charAt(0) === '开' ? 1.2 : 0.8; why.push(door.gate + ' in the ' + door.dir + ' palace'); }
      var backed = dyn.you && (dyn.you.spirit === '值符' || dyn.you.spirit === '九天');
      if (backed) { score += 1.5; why.push(dyn.you.spirit + ' supports your palace (' + dyn.you.dir + ')'); }
      if (dyn.you && dyn.you.isEmpty) { score -= 1; why.push('your own palace is void: be sure of your facts'); }
      var cf = formsIn(r, 'san_qi_ni_you'), youN = dyn.you && (dyn.you.number || dyn.you.num);
      if (cf && youN && (cf.palaces || []).indexOf(youN) >= 0) { score -= 1; why.push('counter-flow 奇加仪 in your palace: your hand is exposed'); }
      out.push({ start: w, label: w.toDateString().slice(0, 10) + ' · ' + pad(w.getHours()) + ':00–' + pad((w.getHours() + 1) % 24) + ':59',
        hourPillar: p.hour.cn, dayPillar: p.day.cn, score: Math.round(score * 10) / 10, why: why, door: door ? door.dir : null, face: door ? door.dir : (dyn.you ? dyn.you.dir : '') });
    }
    out.sort(function (a, b) { return b.score - a.score || a.start - b.start; });
    return { trap: trap, list: out.slice(0, 5), searched: (days || 3) * 12 };
  }


  /* ---------- concealment: hiding the stem, the wandering Wonders, and the Earth Door ----------
   * 遁甲: 甲 never shows on the plate; it hides under the 六儀 that leads its xun, which the Chief (值符) carries. That palace is where
   * the commander sits unseen. 三奇游六仪 follows the Bao Jian rule (see structures.js); the Jade Maiden Guards the Door (玉女守门,
   * 丁 with the duty door) is the hour the commentaries tie to the wandering, for confidential and protective moves. 六己 is the
   * Earth Door (地户): the sector for a low profile. */

  /* ---------- Void and Tomb as modifiers on the two wandering states ----------
   * 儀加奇 (the formation) and 奇加儀 (the counter-flow) are read separately, and so are their modifiers. Void: the palace is 空亡.
   * Tomb: a stem sits in the palace holding its tomb branch by the Twelve Growth Phases (yin stems counted in reverse), so
   * 甲 未, 乙 戌, 丙 戌, 丁 丑, 戊 戌, 己 丑, 庚 丑, 辛 辰, 壬 辰, 癸 未. A tomb is opened by the branch that clashes it. */
  var QI_PAIR = { '乙': ['己', '辛'], '丙': ['戊', '庚'], '丁': ['壬', '癸'] };
  var TOMB_BR12 = { '甲': 7, '乙': 10, '丙': 10, '丁': 1, '戊': 10, '己': 1, '庚': 1, '辛': 4, '壬': 4, '癸': 7 };
  var MOD_TEXT = {
    strict: {
      normal: 'Structured control: protection and administrative alignment hold.',
      void: 'Hollow protocol: the arrangement looks sound but has no real leverage, and plans stall. Useful only for keeping a weakness out of sight.',
      tombTop: 'The rule or pressure above (the Yi) is boxed in and temporarily suspended.',
      tombBase: 'The resource or adviser below (the Wonder) is locked away; it exists but cannot be used until it is released.'
    },
    counter: {
      normal: 'Exposure: your move is visible and meets friction against a heavy structure.',
      void: 'Impotent ingenuity: a clever move with no anchor. Expect false starts, empty promises and appearances that deceive.',
      tombTop: 'Trapped agility: the manoeuvre (the Wonder above) is blinded and self-defeating in this setting.',
      tombBase: 'The base below (the Yi) is decayed; any hard push makes it cave in.'
    }
  };
  function qiYiState(chart, num, kind) {
    var x = chart.palacesByNumber[num];
    if (!x) return null;
    var hs = [x.heavenStemCn, x.heavenStem2Cn].filter(Boolean), es = [x.earthStemCn, x.earthStem2Cn].filter(Boolean), top = null, base = null;
    hs.forEach(function (h) { es.forEach(function (e) {
      if (top) return;
      if (kind === 'strict' ? (QI_PAIR[e] && QI_PAIR[e].indexOf(h) >= 0) : (QI_PAIR[h] && QI_PAIR[h].indexOf(e) >= 0)) { top = h; base = e; }
    }); });
    if (!top) return null;
    var C2 = C, brs = (x.branches || []).map(function (b) { return C2.BRANCHES.indexOf(b); });
    var tombed = function (s) { return brs.indexOf(TOMB_BR12[s]) >= 0; };
    var T = MOD_TEXT[kind], mods = [], release = [];
    if (x.isEmpty) mods.push({ cn: '空亡', en: 'Void', text: T.void });
    if (tombed(top)) { mods.push({ cn: '入墓', en: top + ' above in its tomb', text: T.tombTop }); release.push((TOMB_BR12[top] + 6) % 12); }
    if (tombed(base)) { mods.push({ cn: '入墓', en: base + ' below in its tomb', text: T.tombBase }); release.push((TOMB_BR12[base] + 6) % 12); }
    release = release.filter(function (b, i) { return release.indexOf(b) === i; });
    return { kind: kind, dir: x.dir, top: top, base: base, isVoid: !!x.isEmpty, mods: mods, normal: T.normal,
      potency: mods.length ? (x.isEmpty ? 'neutralised' : 'constrained') : 'active',
      releaseBy: release.map(function (b) { return C2.BRANCHES[b]; }) };
  }
  var XUN_HEAD = { '戊': '甲子', '己': '甲戌', '庚': '甲申', '辛': '甲午', '壬': '甲辰', '癸': '甲寅' };
  function formsIn(r, id) { return (r.formations || []).filter(function (f) { return f.id === id; })[0] || null; }
  function palDirs(ch, f) { return ((f && f.palaces) || []).map(function (n) { return ch.palacesByNumber[n] ? ch.palacesByNumber[n].dir : ''; }).filter(Boolean); }
  function concealment(user, t, hp, days) {
    if (!hp) return null;
    var Q = global.QPQimen, ch = hp.chart, p = hp.pillars, fu = ch.meta && ch.meta.fuShou;
    var pals = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) { return ch.palacesByNumber[n]; }).filter(Boolean);
    var hide = fu ? { stem: fu, xun: XUN_HEAD[fu] || '', palace: hp.chief ? hp.chief.dir : null, youAreJia: p.day.stem === 0 } : null;
    var ji = pals.filter(function (x) { return x.heavenStemCn === '己' || x.heavenStem2Cn === '己'; })[0] || null;
    var diJia = formsIn(hp.res, 'wu_jia_di');
    var now = { wander: formsIn(hp.res, 'san_qi_you_liu_yi'), maiden: formsIn(hp.res, 'yu_nv_shou') };
    var stateOf = function (chart, f, kind) { return f && f.palaces && f.palaces.length ? qiYiState(chart, f.palaces[0], kind) : null; };
    var wanderState = stateOf(ch, now.wander, 'strict'), counterState = stateOf(ch, formsIn(hp.res, 'san_qi_ni_you'), 'counter');
    // The next hours ahead when each forms.
    var next = { wander: null, maiden: null }, start = windows(t, 1)[0].start;
    for (var i = 1; i <= (days || 3) * 12 && !(next.wander && next.maiden); i++) {
      var w = new Date(start.getTime() + i * 7200000), mid = new Date(w.getTime() + 3600000), r;
      try { r = Q.chartFor('hour', { y: mid.getFullYear(), m: mid.getMonth() + 1, d: mid.getDate(), hour: mid.getHours(), min: 0 }); } catch (e) { continue; }
      if (S.disharmony(r.pillars.day.stem, r.pillars.hour.stem, r.pillars.hour.branch)) continue;
      ['wander', 'maiden'].forEach(function (k) {
        var f = next[k] ? null : formsIn(r, k === 'wander' ? 'san_qi_you_liu_yi' : 'yu_nv_shou');
        if (f) next[k] = { start: w, label: w.toDateString().slice(0, 10) + ' · ' + pad(w.getHours()) + ':00–' + pad((w.getHours() + 1) % 24) + ':59',
          hourPillar: r.pillars.hour.cn, dirs: palDirs(r.chart, f), state: k === 'wander' ? stateOf(r.chart, f, 'strict') : null };
      });
    }
    return { hide: hide, ji: ji ? { dir: ji.dir, gate: ji.gate, spirit: ji.spirit, isEmpty: ji.isEmpty } : null, diJia: diJia ? palDirs(ch, diJia) : null,
      now: { wander: now.wander ? palDirs(ch, now.wander) : null, maiden: now.maiden ? palDirs(ch, now.maiden) : null,
        counter: formsIn(hp.res, 'san_qi_ni_you') ? palDirs(ch, formsIn(hp.res, 'san_qi_ni_you')) : null },
      state: { wander: wanderState, counter: counterState }, next: next };
  }

  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }

  global.QPCrisis = { TYPES: TYPES, navigate: navigate, triggers: triggers, objectives: objectives, hourPlate: hourPlate, stemRel: stemRel, executionWindows: executionWindows, trapOf: trapOf, concealment: concealment, qiYiState: qiYiState, TOMB_BR12: TOMB_BR12 };
})(typeof window !== 'undefined' ? window : globalThis);
