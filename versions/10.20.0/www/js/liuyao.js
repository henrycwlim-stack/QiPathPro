/* QiPath Pro — six-line I Ching divination (六爻, the Na Jia method), and the hexagram tables the year and month readings share.
 *
 * A cast is six lines, each 6 7 8 or 9 (three coins: old yin, young yang, young yin, old yang; 6 and 9 move). The hexagram is
 * placed in its palace of the Eight Palaces (八宮), which sets the self line 世 and the other line 應, and the palace element.
 * Each line takes its Na Jia branch, and from the branch's element against the palace element one of the six relatives (六親).
 * The day stem sets the six spirits (六神). The question picks the line to watch (用神), judged by the month and day.
 * Every meaning here is QiPath's own wording.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems;
  function mod(a, n) { return ((a % n) + n) % n; }

  // Trigrams in QPSystems order 乾兑离震巽坎艮坤; bits: bit i = line i from the bottom, 1 = yang.
  var TRI = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  var TRI_BITS = [7, 3, 5, 1, 6, 2, 4, 0];
  var TRI_ELEM = [3, 3, 1, 0, 0, 4, 2, 2];              // Metal Metal Fire Wood Wood Water Earth Earth
  // 納甲 branches: inner (lines 1-3) and outer (lines 4-6).
  var NAJIA = [[[0, 2, 4], [6, 8, 10]], [[5, 3, 1], [11, 9, 7]], [[3, 1, 11], [9, 7, 5]], [[0, 2, 4], [6, 8, 10]],
               [[1, 11, 9], [7, 5, 3]], [[2, 4, 6], [8, 10, 0]], [[4, 6, 8], [10, 0, 2]], [[7, 5, 3], [1, 11, 9]]];
  var BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var SIX_UNION = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };

  function triOf(bits) { return TRI_BITS.indexOf(bits & 7); }
  function linesToBits(lines) { return lines.reduce(function (a, l, i) { return a | ((l & 1) << i); }, 0); }
  function hexInfo(lines) {
    var h = S.hexFromLines(lines);
    return { number: h.number, name: h.name, nameEn: h.nameEn, upper: h.upper, lower: h.lower, upperEn: h.upperEn, lowerEn: h.lowerEn,
      upperIdx: h.upperIdx, lowerIdx: h.lowerIdx, theme: HEX_THEME[h.number] || '' };
  }

  /* ---------- the Eight Palaces: palace, self line and other line for all 64 ---------- */
  var PALACE = {};   // bits -> { palace (trigram idx), self (1-6), stage }
  (function build() {
    var STAGES = ['本宮', '一世', '二世', '三世', '四世', '五世', '遊魂', '歸魂'];
    var SELF = [6, 1, 2, 3, 4, 5, 4, 3];
    TRI_BITS.forEach(function (tb, t) {
      var b = tb | (tb << 3), seq = [b];
      for (var k = 0; k < 5; k++) { b ^= (1 << k); seq.push(b); }
      b ^= (1 << 3); seq.push(b);                                     // 遊魂: line 4 back
      b = (b & 0x38) | tb; seq.push(b);                               // 歸魂: inner trigram back to the palace's
      seq.forEach(function (x, i) { PALACE[x] = { palace: t, self: SELF[i], stage: STAGES[i] }; });
    });
  })();

  var RELATIVES = [
    { cn: '兄弟', en: 'Siblings', role: 'peers, rivals and competition for the same thing; spending' },
    { cn: '子孫', en: 'Offspring', role: 'children, ease, joy, protection and recovery; it removes pressure' },
    { cn: '妻財', en: 'Wealth', role: 'money, assets, profit, and for a man his partner' },
    { cn: '官鬼', en: 'Officer', role: 'career, authority, pressure and illness; for a woman her partner' },
    { cn: '父母', en: 'Parents', role: 'documents, contracts, home, study, news, and parents' }
  ];
  function relativeOf(palaceElem, branchElem) {
    var d = mod(branchElem - palaceElem, 5);
    return d === 0 ? 0 : d === 1 ? 1 : d === 2 ? 2 : d === 3 ? 3 : 4;
  }
  var SPIRITS = [
    { cn: '青龍', en: 'Green Dragon', note: 'good news, celebration and generosity' },
    { cn: '朱雀', en: 'Red Phoenix', note: 'words, documents, gossip and arguments' },
    { cn: '勾陳', en: 'Hook', note: 'delays, property, things that drag on' },
    { cn: '螣蛇', en: 'Flying Serpent', note: 'worry, strange events and false alarms' },
    { cn: '白虎', en: 'White Tiger', note: 'force, temper, injury and urgency' },
    { cn: '玄武', en: 'Black Tortoise', note: 'secrecy, deception and hidden dealings' }
  ];
  var SPIRIT_START = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];   // by day stem

  var TOPICS = [
    { key: 'money', en: 'Money, profit, a sale or an investment', rel: 2 },
    { key: 'career', en: 'Career, a job, promotion or authority', rel: 3 },
    { key: 'partnerM', en: 'A relationship (asked by a man)', rel: 2 },
    { key: 'partnerF', en: 'A relationship (asked by a woman)', rel: 3 },
    { key: 'documents', en: 'A contract, exam, document, home or news', rel: 4 },
    { key: 'children', en: 'Children, peace of mind or recovery', rel: 1 },
    { key: 'rival', en: 'A rival, competitor or a friend', rel: 0 },
    { key: 'self', en: 'Myself in general (read the self line)', rel: -1 }
  ];

  /* ---------- a cast ---------- */

  function coin() {
    var c = global.crypto && global.crypto.getRandomValues ? global.crypto.getRandomValues(new Uint8Array(1))[0] & 1 : (Math.random() < 0.5 ? 1 : 0);
    return c ? 3 : 2;   // heads 3, tails 2
  }
  function tossLine() { return coin() + coin() + coin(); }   // 6, 7, 8 or 9
  function tossCoins() { return [coin(), coin(), coin()]; }   // each 3 (heads) or 2 (tails)
  function castRandom() { var v = []; for (var i = 0; i < 6; i++) v.push(tossLine()); return v; }

  function strengthIn(elem, monthBranch, dayBranch) {
    var me = BRANCH_ELEM[monthBranch], de = BRANCH_ELEM[dayBranch], s = 0, why = [];
    var dm = mod(elem - me, 5);
    if (dm === 0) { s += 2; why.push('in season with the month (旺)'); }
    else if (dm === 1) { s += 1; why.push('fed by the month (相)'); }
    else if (dm === 2) { s -= 1; why.push('weakened by the month (囚)'); }
    else if (dm === 3) { s -= 2; why.push('controlled by the month (死)'); }
    else { s -= 0.5; why.push('spent by the month (休)'); }
    var dd = mod(elem - de, 5);
    if (dd === 0 || dd === 1) { s += 1; why.push('supported by the day'); }
    else if (dd === 3) { s -= 1; why.push('controlled by the day'); }
    return { score: s, why: why };
  }

  /**
   * Read a cast. values: six numbers bottom to top (6 7 8 9). when: {y,m,d,hour,min}. topicKey from TOPICS.
   */
  function read(values, when, topicKey) {
    var lines = values.map(function (v) { return v === 7 || v === 9 ? 1 : 0; });
    var moving = values.map(function (v) { return v === 6 || v === 9; });
    var changed = lines.map(function (l, i) { return moving[i] ? 1 - l : l; });
    var bits = linesToBits(lines), pal = PALACE[bits], palElem = TRI_ELEM[pal.palace];
    var lo = triOf(bits), up = triOf(bits >> 3);
    var p = C.fourPillars(when.y, when.m, when.d, when.hour, when.min || 0);
    var voids = C.voidBranches(p.day.i), sp0 = SPIRIT_START[p.day.stem];
    var other = pal.self > 3 ? pal.self - 3 : pal.self + 3;
    var bitsC = linesToBits(changed), loC = triOf(bitsC), upC = triOf(bitsC >> 3);
    var L = lines.map(function (l, i) {
      var br = i < 3 ? NAJIA[lo][0][i] : NAJIA[up][1][i - 3], el = BRANCH_ELEM[br], r = relativeOf(palElem, el);
      var o = { n: i + 1, yang: !!l, value: values[i], moving: moving[i], branch: br, branchCn: C.BRANCHES[br], elem: el, elemCn: C.ELEM[el],
        rel: r, relCn: RELATIVES[r].cn, relEn: RELATIVES[r].en, spirit: SPIRITS[(sp0 + i) % 6], self: i + 1 === pal.self, other: i + 1 === other,
        proper: (i % 2 === 0) === !!l, void: voids.indexOf(br) >= 0, monthClash: mod(br + 6, 12) === p.month.branch, dayClash: mod(br + 6, 12) === p.day.branch };
      if (moving[i]) {
        var br2 = i < 3 ? NAJIA[loC][0][i] : NAJIA[upC][1][i - 3], r2 = relativeOf(palElem, BRANCH_ELEM[br2]);
        o.to = { branch: br2, branchCn: C.BRANCHES[br2], rel: r2, relCn: RELATIVES[r2].cn, relEn: RELATIVES[r2].en,
          produces: mod(BRANCH_ELEM[br2] - el, 5) === 4, controls: mod(el - BRANCH_ELEM[br2], 5) === 2 };
      }
      return o;
    });

    var topic = TOPICS.filter(function (t) { return t.key === topicKey; })[0] || TOPICS[0];
    var useLines = topic.rel < 0 ? L.filter(function (x) { return x.self; }) : L.filter(function (x) { return x.rel === topic.rel; });
    var hidden = !useLines.length;
    if (hidden) useLines = L.filter(function (x) { return x.self; });
    var use = useLines.slice().sort(function (a, b) { return (b.moving - a.moving) || (b.self - a.self); })[0];
    var st = strengthIn(use.elem, p.month.branch, p.day.branch);
    var score = st.score, notes = st.why.slice();
    if (use.void) { score -= 1.5; notes.push('void (空亡): not yet real, or arrives late'); }
    if (use.monthClash) { score -= 1.5; notes.push('broken by the month (月破)'); }
    if (use.dayClash && st.score > 0) { score += 0.5; notes.push('stirred by the day (暗動): it is already moving'); }
    else if (use.dayClash) { score -= 1; notes.push('clashed by the day (日破)'); }
    if (use.moving && use.to) {
      if (use.to.produces) { score += 1; notes.push('it moves and turns into something that feeds it (回頭生)'); }
      if (use.to.controls) { score -= 1.5; notes.push('it moves and turns into something that controls it (回頭剋)'); }
    }
    L.forEach(function (x) {
      if (!x.moving || x === use) return;
      var d = mod(use.elem - x.elem, 5);
      if (d === 1) { score += 1; notes.push('a moving ' + x.relEn + ' line feeds it'); }
      if (d === 3) { score -= 1; notes.push('a moving ' + x.relEn + ' line attacks it'); }
    });
    var self = L.filter(function (x) { return x.self; })[0], oth = L.filter(function (x) { return x.other; })[0];
    var su = mod(self.elem - use.elem, 5), link = use === self ? 'The matter rests on you.' :
      su === 1 ? 'What you ask about feeds you: it comes toward you.' : su === 3 ? 'What you ask about presses on you: it costs effort or carries pressure.' :
      su === 0 ? 'What you ask about stands level with you.' : su === 4 ? 'You feed what you ask about: you put in more than you take out at first.' : 'You hold what you ask about in your hands: you can control it.';
    var so = mod(self.elem - oth.elem, 5);
    var otherLink = so === 1 ? 'The other side is inclined to help you.' : so === 3 ? 'The other side pushes against you.' : so === 0 ? 'The other side meets you as an equal.' :
      so === 4 ? 'You give more to the other side than you get back.' : 'You have the upper hand over the other side.';
    if (SIX_UNION[self.branch] === oth.branch) otherLink += ' Your self and other lines combine: agreement is possible.';
    if (mod(self.branch + 6, 12) === oth.branch) otherLink += ' Your self and other lines clash: expect friction or reversal.';
    var verdict = score >= 2 ? 'Favourable' : score >= 0.5 ? 'Leaning favourable' : score > -1 ? 'Mixed' : score > -2.5 ? 'Leaning against' : 'Unfavourable';

    return { values: values, lines: L, hex: hexInfo(lines), changed: moving.some(Boolean) ? hexInfo(changed) : null,
      palace: TRI[pal.palace], palaceElem: C.ELEM[palElem], palaceElemEn: C.ELEM_EN[palElem], stage: pal.stage, selfLine: pal.self, otherLine: other,
      pillars: { month: p.month.cn, day: p.day.cn }, voids: voids.map(function (b) { return C.BRANCHES[b]; }),
      topic: topic, use: use, useHidden: hidden, score: Math.round(score * 10) / 10, verdict: verdict, notes: notes, link: link, otherLink: otherLink,
      movingCount: moving.filter(Boolean).length,
      spiritNote: use.spirit.cn + ' ' + use.spirit.en + ' on the line you watch: ' + use.spirit.note + '.' };
  }

  /* ---------- 64 hexagram themes, by King Wen number (QiPath's own wording) ---------- */
  var HEX_THEME = {
    1: 'Pure drive and leadership: act with integrity and keep going.', 2: 'Receptive support: follow a good lead and let things grow.',
    3: 'A difficult start: organise, get help, and push through the first knots.', 4: 'Inexperience: ask, learn and take guidance before acting.',
    5: 'Waiting: prepare and stay nourished until the timing opens.', 6: 'Conflict: avoid escalation, seek mediation, do not push to the end.',
    7: 'Organisation: discipline, a clear leader and a shared aim.', 8: 'Alliance: join with the right people, early rather than late.',
    9: 'Small restraint: gather slowly, small gains before the big one.', 10: 'Careful conduct: tread lightly around power and keep manners.',
    11: 'Harmony: things flow between top and bottom; build while it lasts.', 12: 'Blockage: lie low, keep your integrity, wait out the standstill.',
    13: 'Fellowship: work openly with like-minded people toward one aim.', 14: 'Great possession: abundance that asks for modesty and generosity.',
    15: 'Modesty: steady, humble effort earns lasting respect.', 16: 'Enthusiasm: rally people and prepare, then move together.',
    17: 'Following: adapt to the times and follow what is worth following.', 18: 'Repair: fix what was spoiled, especially what was inherited.',
    19: 'Approach: growth is arriving; meet it, but plan for the turn.', 20: 'Observation: step back, look widely, and lead by example.',
    21: 'Biting through: remove the obstacle decisively and fairly.', 22: 'Grace: presentation matters, but substance carries the day.',
    23: 'Stripping away: something wears down; protect the base and wait.', 24: 'Return: a turning point; begin again, gently and steadily.',
    25: 'Sincerity: act without hidden motives and avoid scheming.', 26: 'Great restraint: hold power in, study, and store strength.',
    27: 'Nourishment: watch what you take in and what you feed others.', 28: 'Overload: too much weight on a weak frame; lighten or reinforce.',
    29: 'Danger repeated: stay true, keep moving like water, learn the route.', 30: 'Clarity: attach to what is right and let your light be seen.',
    31: 'Attraction: mutual influence and openness draw people together.', 32: 'Endurance: keep a steady course and a lasting commitment.',
    33: 'Retreat: withdraw strategically before you are forced to.', 34: 'Great power: strength is high; use it with restraint.',
    35: 'Progress: rising recognition and advancement in daylight.', 36: 'Hidden light: protect yourself, keep your gifts out of sight for now.',
    37: 'Family: clear roles at home and in the team keep things in order.', 38: 'Opposition: differences; find small agreements first.',
    39: 'Obstruction: pause, seek help, and look for another way round.', 40: 'Release: tension lifts; settle things and forgive quickly.',
    41: 'Decrease: give up something now to gain later; simplify.', 42: 'Increase: help flows in; use it to grow and to help others.',
    43: 'Breakthrough: make the decision public and act resolutely.', 44: 'Encounter: a sudden meeting or influence; be careful who you let in.',
    45: 'Gathering: people come together around a centre; organise them.', 46: 'Rising: steady upward growth by effort and the right patrons.',
    47: 'Exhaustion: under pressure; speak less, stay firm, wait for relief.', 48: 'The well: a lasting source; maintain it and share it.',
    49: 'Reform: change what has outlived its time, when the moment is right.', 50: 'The cauldron: renewal, new structures, and nourishing talent.',
    51: 'Shock: a sudden jolt; stay calm and it becomes a wake-up call.', 52: 'Stillness: stop, quiet the mind, and do not overreach.',
    53: 'Gradual progress: step by step, properly, and it lasts.', 54: 'A subordinate position: know your place and avoid rash commitments.',
    55: 'Abundance: a peak; enjoy it, use it, and prepare for the decline.', 56: 'The traveller: on unfamiliar ground; be modest and careful.',
    57: 'Gentle penetration: persistent, quiet influence gets in everywhere.', 58: 'Joy: open, sincere communication and shared pleasure.',
    59: 'Dispersal: dissolve rigidity and division; reunite around a purpose.', 60: 'Limits: set sensible boundaries and keep to them.',
    61: 'Inner truth: sincerity that others can feel builds trust.', 62: 'Small excess: attend to details; aim low rather than high.',
    63: 'After completion: done, but order slips easily; stay alert.', 64: 'Before completion: almost there; finish carefully.'
  };

  /* ---------- the year hexagram (皇極經世 值年卦) ---------- */

  // Fu Xi order 0..63 (乾 0 ... 坤 63). Line k (1-6) of index i is bit (6-k) of 63-i.
  function fuxiLines(i) { var v = 63 - i, out = []; for (var k = 1; k <= 6; k++) out.push((v >> (6 - k)) & 1); return out; }
  // Around the round diagram from 鼎 (1984), skipping 乾 坤 坎 離. Covers the 世 of 鼎, 1984-2043.
  var YEAR_SEQ = (function () {
    var s = [], i;
    for (i = 34; i <= 63; i++) s.push(i);
    for (i = 31; i >= 0; i--) s.push(i);
    s.push(32, 33);
    return s.filter(function (x) { return [0, 18, 45, 63].indexOf(x) < 0; });
  })();
  var LINE_MONTHS = ['Dec–Jan', 'Feb–Mar', 'Apr–May', 'Jun–Jul', 'Aug–Sep', 'Oct–Nov'];
  var LINE_STAGE = ['foundations: make the base solid', 'reading the ground: prepare and wait for the right moment',
    'a risky transition: validate before you move', 'the threshold: let go of regrets and rebuild credibility',
    'the leader\'s line: decisive, informed action is rewarded', 'the culmination: change from within, deep rather than superficial'];
  function yearHexagram(solarYear) {
    if (solarYear < 1984 || solarYear > 2043) return null;
    var lines = fuxiLines(YEAR_SEQ[solarYear - 1984]), info = hexInfo(lines), bits = linesToBits(lines);
    var lo = triOf(bits), up = triOf(bits >> 3);
    return { year: solarYear, hex: info, lines: lines.map(function (l, i) {
      var br = i < 3 ? NAJIA[lo][0][i] : NAJIA[up][1][i - 3], partner = SIX_UNION[br], clash = mod(br + 6, 12);
      return { n: i + 1, yang: !!l, months: LINE_MONTHS[i], stage: LINE_STAGE[i], branch: br, branchCn: C.BRANCHES[br],
        signs: [C.ZODIAC[br], C.ZODIAC[partner]], signBranches: [br, partner], clash: C.ZODIAC[clash], clashBranch: clash };
    }) };
  }
  /** Which lines of the year hexagram speak to a person: their natal branches and the current luck pillar. */
  function yearHexagramFor(user, solarYear) {
    var yh = yearHexagram(solarYear);
    if (!yh) return null;
    var p = user.pillars, mine = [['Year', p.year.branch], ['Month', p.month.branch], ['Day', p.day.branch], ['Hour', p.hour.branch]];
    var age = solarYear - user.birth.y;
    (user.luck && user.luck.pillars || []).forEach(function (l) { if (age >= l.from && age < l.to) mine.push(['Luck pillar', l.pillar.branch]); });
    yh.lines.forEach(function (ln) {
      ln.yours = mine.filter(function (m) { return ln.signBranches.indexOf(m[1]) >= 0; }).map(function (m) { return m[0] + ' ' + C.BRANCHES[m[1]]; });
      ln.caution = mine.filter(function (m) { return m[1] === ln.clashBranch; }).map(function (m) { return m[0] + ' ' + C.BRANCHES[m[1]]; });
    });
    return yh;
  }

  /* ---------- the month's sovereign hexagram (十二消息卦) ---------- */
  var SOVEREIGN = { 0: 24, 1: 19, 2: 11, 3: 34, 4: 43, 5: 1, 6: 44, 7: 33, 8: 12, 9: 20, 10: 23, 11: 2 };
  function monthHexagram(monthBranch) {
    var num = SOVEREIGN[monthBranch], found = null;
    for (var u = 0; u < 8 && !found; u++) for (var l = 0; l < 8; l++) {
      var lines = []; for (var k = 0; k < 3; k++) lines.push((TRI_BITS[l] >> k) & 1); for (k = 0; k < 3; k++) lines.push((TRI_BITS[u] >> k) & 1);
      var h = hexInfo(lines); if (h.number === num) { found = h; break; }
    }
    return found;
  }

  global.QPLiuYao = { TOPICS: TOPICS, RELATIVES: RELATIVES, SPIRITS: SPIRITS, HEX_THEME: HEX_THEME, castRandom: castRandom, tossLine: tossLine, tossCoins: tossCoins,
    read: read, yearHexagram: yearHexagram, yearHexagramFor: yearHexagramFor, monthHexagram: monthHexagram, PALACE: PALACE };
})(typeof window !== 'undefined' ? window : globalThis);
