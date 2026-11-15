/* QiPath Pro: the QiMen Oracle.
 * A quick reading for one question, cast on the Flying Palace plate for the moment of asking. The Day Stem is the
 * person asking and the Hour Stem is the matter; each topic adds its own symbols. All of it is read from the five-element
 * relation between each symbol's palace and the person's, and answers what is happening, why, and what to do.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems;
  var ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var YI = ['戊', '己', '庚', '辛', '壬', '癸'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var DOOR = {
    '休门': ['rest and good relations', 'Approach people, ask for help and keep things friendly.'],
    '死门': ['endings and things that have stopped', 'Do not start anything. Close out what is finished.'],
    '伤门': ['conflict, injury and hard pursuit', 'Avoid confrontation. Check your safety, and do not force the issue.'],
    '杜门': ['blockage and secrecy', 'Keep your plans private, and wait for the way to clear.'],
    '中门': ['a pause at the centre, neither open nor closed', 'Hold your position, and gather more facts before you move.'],
    '开门': ['openings, work and new starts', 'Begin, apply or make the approach.'],
    '惊门': ['alarm, rumour and disputes', 'Stay calm, check what you hear, and put agreements in writing.'],
    '生门': ['growth, profit and vitality', 'Invest your effort here. It can grow.'],
    '景门': ['visibility, documents and appearances', 'Present your case, but check whether the facts match the image.']
  };
  var STAR = {
    '天蓬': 'bold risk-taking, with a chance of hidden loss', '天芮': 'a problem needing patient attention, often health or a learner\'s stage',
    '天冲': 'fast, impulsive action', '天辅': 'learning, culture and good advice', '天禽': 'steadiness at the centre of things',
    '天心': 'skilled planning, and healing', '天柱': 'worry, criticism and being held up', '天任': 'slow, reliable progress', '天英': 'fame, heat and quick tempers'
  };
  var DEITY = {
    '值符': 'authority and protection', '腾蛇': 'anxiety, illusion and tangled situations', '太阴': 'quiet help behind the scenes', '六合': 'partnership and agreements',
    '勾陈': 'delay, entanglement and legal friction', '太常': 'routine, food and formal occasions', '朱雀': 'talk, arguments and paperwork', '九地': 'stillness, patience and staying low', '九天': 'ambition, travel and bold moves'
  };
  var HOSTILE = ['腾蛇', '勾陈', '朱雀'], KIND = ['值符', '太阴', '六合', '九天', '太常'];

  // Each symbol: [kind, character, name, meaning, +1 helps / -1 threatens].
  var TOPICS = {
    health: { label: 'Health', cn: '健康', symbols: function () { return [['star', '天芮', 'the Grain star (天芮)', 'the illness', -1], ['star', '天心', 'the Heart star (天心)', 'the doctor and treatment', 1], ['stem', '乙', 'Yi (乙)', 'the medicine', 1]]; },
      note: 'This is for reflection. It cannot diagnose anything, so please see a doctor about any health concern.' },
    career: { label: 'Career', cn: '事業', symbols: function () { return [['door', '开门', 'the Open Door (开门)', 'the job or opportunity', 1], ['deity', '值符', 'the Chief (值符)', 'your boss or those in authority', 1], ['stem', '丁', 'Ding (丁)', 'the offer, letter or good news', 1]]; } },
    business: { label: 'Business', cn: '商業', symbols: function () { return [['door', '生门', 'the Life Door (生门)', 'the profit', 1], ['stem', '戊', 'Wu (戊)', 'your capital', 1], ['deity', '六合', 'Harmony (六合)', 'the partner or deal', 1]]; },
      note: 'This is for reflection. It is not financial advice.' },
    relationships: { label: 'Relationships', cn: '感情', symbols: function (user) {
      var M = user.gender === 'M';
      return [['deity', '六合', 'Harmony (六合)', 'the match and the relationship', 1], ['stem', M ? '乙' : '庚', M ? 'Yi (乙)' : 'Geng (庚)', 'your partner', 1], ['stem', '丙', 'Bing (丙)', 'warmth and attraction', 1]]; } }
  };

  function locate(ch, kind, c) {
    return ALL.filter(function (n) {
      var pa = ch.palacesByNumber[n];
      return kind === 'door' ? pa.gate === c : kind === 'star' ? pa.starCn === c : kind === 'deity' ? pa.spirit === c : pa.heavenStemCn === c;
    })[0] || null;
  }
  // 甲 hides under the 六儀 that leads its xun.
  function stemOf(q) { return q.stem === 0 ? YI[Math.floor((q.i - q.i % 10) / 10) % 6] : C.STEMS[q.stem]; }
  var ELEMS = ['wood', 'fire', 'earth', 'metal', 'water'];
  function relation(from, to) {
    var a = ELEMS.indexOf(from), b = ELEMS.indexOf(to);
    if (a === b) return 'same';
    if (C.produces(a, b)) return 'feeds';
    if (C.produces(b, a)) return 'drains';
    return C.controls(a, b) ? 'presses' : 'yields';
  }
  var HELP_V = { feeds: 2, same: 1, yields: 0.5, drains: -0.5, presses: -2 };
  var HELP_T = { feeds: 'supports you, so it comes to you', same: 'stands level with you, so it is within reach', yields: 'is within your control, though it costs effort', drains: 'takes more from you than it gives', presses: 'presses on you, so you will meet resistance' };
  var HARM_V = { feeds: -1, same: -0.5, yields: 2, drains: -1, presses: -2 };
  var HARM_T = { feeds: 'is being fed, so it may linger', same: 'is level with you, so it will not shift without effort', yields: 'is under your control, so it can be overcome', drains: 'is drawing on your energy', presses: 'presses on you, so take it seriously' };

  var ORACLE_RULES = { health: 'health', career: 'career', business: 'wealth', relationships: 'marriage' };
  function read(user, topic, when) {
    var p = C.fourPillars(when.y, when.m, when.d, when.hour, when.min), ch = S.flyingQimen(p), P = ch.palacesByNumber;
    var T = TOPICS[topic], askerStem = stemOf(p.day), matterStem = stemOf(p.hour);
    var seat = locate(ch, 'stem', askerStem) || ch.landing, me = P[seat], matter = locate(ch, 'stem', matterStem) || ch.landing, score = 0, why = [], hits = [seat], graves = [];
    // A Noble this reading depends on, in its grave. Each Noble counts once.
    var graveOf = function (stem, n) { var g = graves.some(function (x) { return x.stem === stem; }) ? null : S.nobleGrave(stem, n); if (g) graves.push(g); return g; };
    var symbols = T.symbols(user).map(function (s) {
      var n = locate(ch, s[0], s[1]);
      if (!n) return null;
      var pa = P[n], r = n === seat ? 'same' : relation(pa.element, me.element), v = (s[4] > 0 ? HELP_V : HARM_V)[r];
      var txt = (s[4] > 0 ? HELP_T : HARM_T)[r];
      if (pa.isEmpty) { v = s[4] > 0 ? -1 : 1; txt = s[4] > 0 ? 'is void, so it is promised but hollow for now' : 'is void, so the threat has little substance for now'; }
      if (s[4] > 0 && KIND.indexOf(pa.spirit) >= 0) v += 0.25;
      if (s[4] > 0 && HOSTILE.indexOf(pa.spirit) >= 0) v -= 0.25;
      if (s[0] === 'stem' && graveOf(s[1], n)) v -= s[4] > 0 ? 0.5 : -0.5;
      score += v;
      hits.push(n);
      return { name: s[2], meaning: s[3], num: n, dir: pa.dir, door: pa.gate, value: v, text: cap(s[2]) + ', ' + s[3] + ', is in the ' + pa.dir + ' and ' + txt + '.' };
    }).filter(Boolean);
    symbols.forEach(function (s) { why.push(s.text); });
    if (matter === seat) { score += 1; why.push('You and the matter share a palace, so this is in your hands.'); }
    else {
      var mr = relation(P[matter].element, me.element), mv = { feeds: 1, same: 0.5, yields: 0.5, drains: -0.5, presses: -1 }[mr];
      score += mv;
      why.push('The matter itself (the Hour Stem, ' + matterStem + ') ' + { feeds: 'supports you.', same: 'stands level with you.', yields: 'is within your control.', drains: 'draws on your energy.', presses: 'works against you for now.' }[mr]);
    }
    if (graveOf(askerStem, seat)) score -= 0.5;
    if (graveOf(matterStem, matter)) score -= 0.5;
    // The book's Forecast panels, at half the Forecast weight because Oracle scores run on a smaller scale.
    var ruleNet = 0;
    S.forecastRules(ch, ORACLE_RULES[topic], [me], p.hour.branch).forEach(function (f) { ruleNet += f.score; why.push(f.label + ': ' + f.text); });
    score += Math.max(-2, Math.min(2, ruleNet * 0.5));
    if (me.isEmpty) { score -= 1; why.push('Your own palace is void, so you may be less sure or less committed than you think.'); }
    if (ch.meta.fuYin) { score -= 0.5; why.push('Every star is at home (伏吟), so things are stuck. Patience will serve better than force.'); }
    if (ch.meta.fanYin) { score -= 0.5; why.push('The stars stand opposite their homes (反吟), so expect reversals and a change of plan.'); }
    return { p: p, chart: ch, topic: topic, score: Math.round(score * 10) / 10, seat: seat, matter: matter, symbols: symbols, why: why, hits: hits, me: me, graves: graves };
  }
  function verdictOf(v) { return v >= 2.5 ? 'Favourable' : v >= 0.75 ? 'Leans favourable' : v > -0.75 ? 'Balanced' : v > -2.5 ? 'Leans against' : 'Unfavourable'; }
  function addHours(w, h) {
    var d = new Date(w.y, w.m - 1, w.d, w.hour, w.min);
    d.setTime(d.getTime() + h * 36e5);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hour: d.getHours(), min: d.getMinutes() };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function whenLabel(w) { return w.d + ' ' + MON[w.m - 1] + ', ' + pad(w.hour) + ':' + pad(w.min); }

  /** Cast the Oracle: topic is health, career, business or relationships; when is the moment of asking. */
  function cast(user, topic, when) {
    var r = read(user, topic, when), ch = r.chart, me = r.me, main = r.symbols[0], P = ch.palacesByNumber;
    var what = ['You stand in the ' + (me.dir || 'centre') + ' palace with ' + me.gate + ': ' + DOOR[me.gate][0] + '. The star ' + me.starCn + ' adds ' + STAR[me.starCn] + ', and the deity ' + me.spirit + ' points to ' + DEITY[me.spirit] + '.'];
    if (main) { var mp = P[main.num]; what.push(cap(main.name) + ', ' + main.meaning + ', sits with ' + mp.gate + ': ' + DOOR[mp.gate][0] + '. The star ' + mp.starCn + ' adds ' + STAR[mp.starCn] + ', and the deity ' + mp.spirit + ' points to ' + DEITY[mp.spirit] + '.'); }
    var quality = function (n) {
      var pa = P[n], s = pa.gateRank === 2 ? 2 : pa.gateRank === 0 ? -2 : 0;
      if (KIND.indexOf(pa.spirit) >= 0) s += 1;
      if (HOSTILE.indexOf(pa.spirit) >= 0) s -= 1;
      if (pa.isEmpty) s -= 1.5;
      return s;
    };
    var outer = [1, 2, 3, 4, 6, 7, 8, 9].sort(function (a, b) { return quality(b) - quality(a); });
    var todo = [DOOR[me.gate][1]];
    var aid = r.symbols.filter(function (s) { return s.value > 0 && s.num !== r.seat; }).sort(function (a, b) { return b.value - a.value; })[0];
    if (aid) todo.push('Look to the ' + aid.dir + ' for ' + aid.meaning + '. It is your strongest help in this reading.');
    todo.push('Better direction now: ' + P[outer[0]].dir + ' (' + P[outer[0]].gate + '). Avoid: ' + P[outer[7]].dir + ' (' + P[outer[7]].gate + ').');
    // A better moment in the next 24 hours, if there is one.
    var best = null;
    for (var k = 1; k <= 12; k++) {
      var w = addHours(when, k * 2), x = read(user, topic, w);
      if (w.hour >= 7 && !S.disharmony(x.p.day.stem, x.p.hour.stem) && (!best || x.score > best.score)) best = { score: x.score, when: w, label: whenLabel(w), verdict: verdictOf(x.score) };
    }
    if (best && best.score >= r.score + 1 && topic !== 'health') todo.push('If you can wait, ' + best.label + ' reads better for this (' + best.verdict.toLowerCase() + ').');
    var pull = r.symbols.filter(function (s) { return s.value > 0; }).length, push = r.symbols.filter(function (s) { return s.value < 0; }).length;
    return { topic: topic, label: TOPICS[topic].label, cn: TOPICS[topic].cn, when: when, whenText: whenLabel(when), p: r.p, chart: ch, score: r.score, verdict: verdictOf(r.score),
      clarity: pull && push ? 'The signs are mixed.' : 'The signs mostly agree.', what: what, why: r.why, todo: todo, hits: r.hits, seat: r.seat, symbols: r.symbols, better: best, disharmony: S.disharmony(r.p.day.stem, r.p.hour.stem), graves: r.graves, care: topic === 'health' ? S.HEALTH_CARE : null, note: TOPICS[topic].note || null };
  }
  global.QPOracle = { cast: cast, TOPICS: TOPICS, verdictOf: verdictOf };
})(typeof window !== 'undefined' ? window : globalThis);
