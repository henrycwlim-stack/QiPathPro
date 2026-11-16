/* QiPath Pro — BaZi, the Ten Gods layer (十神).
 *
 * What the Four Pillars say once every stem is read as a Ten God of the Day Master:
 *   - the ten-god profile, each god scored and ranked;
 *   - the five structure groups (比劫 食傷 財 官殺 印), primary and secondary, and whether one is extreme;
 *   - hidden talents from the month branch's hidden stems;
 *   - the Life Palace 命宮 and Conception Palace 胎元, and the six houses they complete with the four pillars;
 *   - the useful god as it actually exists in the chart, not only in theory;
 *   - family members read through their Ten Gods (六親);
 *   - work style and wealth capacity;
 *   - how a year's stem and branch meet the chart;
 *   - a reading of the day pillar (日柱).
 * Every description is QiPath's own wording. Scores are heuristics on the same weighted census as QPBazi.analyse.
 */
(function (global) {
  'use strict';
  var C = global.QPCore;
  function mod(a, n) { return ((a % n) + n) % n; }
  function r0(x) { return Math.round(x); }

  /* ================= the ten gods ================= */

  // Index matches QPCore.TEN_GODS: 比肩 劫财 食神 伤官 偏财 正财 七杀 正官 偏印 正印.
  var GOD_ABBR = ['F', 'RW', 'EG', 'HO', 'IW', 'DW', '7K', 'DO', 'IR', 'DR'];
  var GOD_CN_TRAD = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];
  var GOD_TEXT = [
    { gift: 'steadiness, self-reliance and loyalty to peers', work: 'work alongside equals: teams, cooperatives, peer coaching, sport',
      watch: 'stubbornness and sharing credit or money too freely' },
    { gift: 'drive, competitiveness and the nerve to go after what others want', work: 'sales, deal-making, ventures and turnarounds',
      watch: 'risk-taking with money and rivalry with friends' },
    { gift: 'ease, taste and a talent for making things people enjoy', work: 'food, design, teaching, hospitality, content and craft',
      watch: 'comfort over effort and drifting without a deadline' },
    { gift: 'brilliance, persuasion and the urge to improve on the rules', work: 'performing, advocacy, marketing, innovation, consulting',
      watch: 'sharp words with authority and restlessness' },
    { gift: 'spotting opportunity and handling several income streams at once', work: 'trading, investment, business development, entrepreneurship',
      watch: 'spending as fast as it comes and spreading too thin' },
    { gift: 'diligence, budgeting and turning effort into steady income', work: 'finance, operations, management, property and anything with a payroll',
      watch: 'being too careful to take the chance in front of you' },
    { gift: 'courage, decisiveness and coming alive under pressure', work: 'crisis work, enforcement, surgery, military, competitive leadership',
      watch: 'pushing people too hard and taking on too much at once' },
    { gift: 'order, fairness and a reputation people can rely on', work: 'administration, law, government, governance and corporate roles',
      watch: 'caution, rigidity and worrying about what others think' },
    { gift: 'intuition, unusual ideas and depth in specialist or hidden knowledge', work: 'research, strategy, metaphysics, therapy, writing, niche expertise',
      watch: 'suspicion, isolation and ideas that never meet a market' },
    { gift: 'learning, patience and the wisdom to advise and protect', work: 'education, research, advisory, healthcare support, publishing',
      watch: 'waiting for permission and leaning on others to act' }
  ];

  /* ================= the five structure groups ================= */

  var GROUPS = [
    { key: 'companion', cn: '比劫', en: 'Companion', gods: [0, 1],
      nature: 'You work through people. Networks, loyalty and belonging matter; you persuade, gather and stand up for your circle.',
      atWork: 'Best where relationships are the product: sales, partnerships, community, business development.',
      shadow: 'Can lose focus chasing the next connection, or put the group before your own results.' },
    { key: 'output', cn: '食傷', en: 'Output', gods: [2, 3],
      nature: 'You work by making and expressing. Ideas come quickly; you want to put your own mark on things.',
      atWork: 'Best where originality is paid: creative work, product, marketing, teaching, performance.',
      shadow: 'Can resist structure, start more than you finish, and clash with rules you find pointless.' },
    { key: 'wealth', cn: '財', en: 'Wealth', gods: [4, 5],
      nature: 'You work by taking charge of resources. Practical and goal-driven, you like to see what effort turns into.',
      atWork: 'Best where you control a budget, a team or an outcome: management, business, finance, operations.',
      shadow: 'Can be impatient, quick to judge, and measure people by what they deliver.' },
    { key: 'authority', cn: '官殺', en: 'Authority', gods: [6, 7],
      nature: 'You work by holding things together. Steady, dutiful and fair, you keep a system running and people safe.',
      atWork: 'Best inside a structure with clear roles: organisations, government, compliance, service.',
      shadow: 'Can hesitate without a mandate, avoid conflict, and carry stress quietly.' },
    { key: 'resource', cn: '印', en: 'Resource', gods: [8, 9],
      nature: 'You work by understanding. Thoughtful and careful, you gather knowledge before you move.',
      atWork: 'Best where expertise is valued: research, analysis, advisory, education, strategy.',
      shadow: 'Can over-think, retreat into theory, and become critical of others or yourself.' }
  ];

  // Seasonal state of an element in a month branch: 旺 相 休 囚 死.
  var SEASON_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];   // ruling element of each month branch
  var STATE = [['旺', 1.2], ['相', 1.1], ['休', 1.0], ['囚', 0.9], ['死', 0.8]];
  function stateOf(elem, monthBranch) {
    var ruler = SEASON_ELEM[monthBranch], d = mod(elem - ruler, 5);
    // same = 旺, produced by ruler = 相, produces ruler = 休, controls ruler = 囚, controlled by ruler = 死
    var k = d === 0 ? 0 : d === 1 ? 1 : d === 4 ? 2 : d === 2 ? 3 : 4;
    return STATE[k];
  }

  /** Every non-Day-Master stem, visible and hidden, scored as a Ten God. */
  function profile(p) {
    var dm = p.day.stem, score = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], where = [[], [], [], [], [], [], [], [], [], []];
    var labels = ['Year', 'Month', 'Day', 'Hour'];
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      var w = i === 1 ? 1.3 : 1.0;
      if (i !== 2) {
        var g = C.tenGod(dm, q.stem).i, f = stateOf(C.STEM_ELEM[q.stem], p.month.branch)[1];
        score[g] += w * f; where[g].push(labels[i] + ' stem ' + C.STEMS[q.stem]);
      }
      C.HIDDEN[q.branch].forEach(function (h, hi) {
        var g2 = C.tenGod(dm, h).i, f2 = stateOf(C.STEM_ELEM[h], p.month.branch)[1];
        score[g2] += w * f2 * (hi === 0 ? 0.9 : hi === 1 ? 0.45 : 0.25);
        where[g2].push(labels[i] + ' branch ' + C.BRANCHES[q.branch] + (hi === 0 ? '' : ' (hidden)'));
      });
    });
    var max = Math.max.apply(null, score) || 1, total = score.reduce(function (a, b) { return a + b; }, 0) || 1;
    var gods = score.map(function (s, i) {
      return { i: i, cn: GOD_CN_TRAD[i], en: C.TEN_GODS_EN[i], abbr: GOD_ABBR[i],
               score: Math.round(s * 100) / 100, pct: r0(s / max * 100), share: r0(s / total * 100), present: s > 0,
               where: where[i], gift: GOD_TEXT[i].gift, work: GOD_TEXT[i].work, watch: GOD_TEXT[i].watch };
    });
    // element of each god relative to the Day Master: 比劫 same, 食傷 produced, 財 controlled, 官殺 controlling, 印 producing
    var off = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    gods.forEach(function (g) { g.elem = mod(C.STEM_ELEM[dm] + off[g.i], 5); g.elemCn = C.ELEM[g.elem]; g.elemEn = C.ELEM_EN[g.elem]; });
    var ranked = gods.slice().sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    return { gods: gods, ranked: ranked, total: total };
  }

  function structures(prof) {
    var total = prof.total;
    var gs = GROUPS.map(function (G) {
      var s = G.gods.reduce(function (a, i) { return a + prof.gods[i].score; }, 0);
      return { key: G.key, cn: G.cn, en: G.en, score: s, share: r0(s / total * 100), nature: G.nature, atWork: G.atWork, shadow: G.shadow,
               lead: prof.gods[G.gods[0]].score >= prof.gods[G.gods[1]].score ? prof.gods[G.gods[0]] : prof.gods[G.gods[1]] };
    }).sort(function (a, b) { return b.score - a.score; });
    var primary = gs[0], secondary = gs[1];
    var extreme = primary.share >= 45 || (secondary.score > 0 ? primary.score / secondary.score >= 2 : true);
    var missing = gs.filter(function (g) { return g.score === 0; });
    return { groups: gs, primary: primary, secondary: secondary, extreme: extreme, missing: missing,
      extremeNote: extreme ? 'One group far outweighs the rest, so its shadow side shows more readily. Balance comes from the groups you are short of, ' +
        'through the people you work with, your luck pillars and deliberate habits.' : 'No single group dominates, so you can switch styles when the situation calls for it.' };
  }

  /* ================= hidden talents: the month branch ================= */

  function talents(p) {
    var dm = p.day.stem, mb = p.month.branch, hs = C.HIDDEN[mb];
    var list = hs.map(function (h, i) {
      var g = C.tenGod(dm, h).i;
      return { stem: C.STEMS[h], god: GOD_CN_TRAD[g], en: C.TEN_GODS_EN[g], i: g, main: i === 0, gift: GOD_TEXT[g].gift, work: GOD_TEXT[g].work };
    });
    var revealed = list.filter(function (t) {
      return [p.year.stem, p.month.stem, p.hour.stem].indexOf(C.STEMS.indexOf(t.stem)) >= 0;
    }).map(function (t) { return t.stem; });
    return { branch: C.BRANCHES[mb], main: list[0], subs: list.slice(1), revealed: revealed,
      note: 'The month branch holds the talents you grow into through work. ' +
        (revealed.length ? 'Those whose stem also shows on top of the chart (' + revealed.join(' ') + ') are visible to others early; the rest stay latent until education, ' +
          'experience or a luck pillar brings them out.' : 'None of them shows on top of the chart, so they stay latent until education, experience or a luck pillar brings them out.') };
  }

  /* ================= Life Palace 命宮 and Conception Palace 胎元 ================= */

  // 命宮: the month counts from the mid-month term (中氣), so a birth past it uses the next branch. Count the month back from
  // 子, set the birth hour there and count forward to 卯. Stem by 五虎遁 from the year stem.
  function lifePalace(p) {
    var mb = mod(p.month.branch + (p.termIndex % 2 === 1 ? 1 : 0), 12);
    var M = mod(mb - 2, 12) + 1, H = p.hour.branch;
    var b = mod(4 - M - H, 12);
    var s = mod(((p.year.stem % 5) * 2 + 2) + mod(b - 2, 12), 10);
    return C.stemBranch(C.sbIndex(s, b));
  }
  function conceptionPalace(p) { return C.stemBranch(C.sbIndex(mod(p.month.stem + 1, 10), mod(p.month.branch + 3, 12))); }

  var NAYIN_REALM = ['thinking and growth', 'feeling and drive', 'body and stability', 'duty and discipline', 'inner life and intuition'];
  function nayinElem(n) { return '木火土金水'.indexOf((n || '').charAt(2)); }
  var HOUSES = [
    { key: 'year', cn: '年柱', en: 'Social house', stem: 'elders, mentors and the help you are given', branch: 'friends, community and where you come from' },
    { key: 'month', cn: '月柱', en: 'Work house', stem: 'career and the role you are seen in', branch: 'money, working conditions and parents' },
    { key: 'day', cn: '日柱', en: 'Self house', stem: 'you, your choices and direction', branch: 'your partner and closest bond' },
    { key: 'hour', cn: '時柱', en: 'Legacy house', stem: 'children, plans and what you produce', branch: 'assets, later life and what you keep' },
    { key: 'life', cn: '命宮', en: 'Life Palace', stem: 'outlook and the way you think things through', branch: 'what life teaches you through experience' },
    { key: 'conception', cn: '胎元', en: 'Conception Palace', stem: 'inner drive and what you were born carrying', branch: 'vitality and the reserves you draw on' }
  ];
  function sixHouses(p) {
    var dm = p.day.stem, lp = lifePalace(p), cp = conceptionPalace(p);
    var pil = [p.year, p.month, p.day, p.hour, lp, cp];
    return HOUSES.map(function (H, i) {
      var q = pil[i], ne = nayinElem(q.nayin);
      return { key: H.key, cn: H.cn, en: H.en, pillar: q.cn, stemMeans: H.stem, branchMeans: H.branch,
        stemGod: i === 2 ? 'Day Master' : C.TEN_GODS_EN[C.tenGod(dm, q.stem).i],
        branchGod: C.TEN_GODS_EN[C.tenGod(dm, C.HIDDEN[q.branch][0]).i],
        nayin: q.nayin, nayinElem: ne, realm: ne >= 0 ? NAYIN_REALM[ne] : '' };
    });
  }

  /* ================= the useful god inside the chart ================= */

  var ACTION = [
    { cn: '待運', en: 'Waiting', text: 'You wait for a luck pillar or year to bring it. Results come when the timing arrives and fade when it passes.' },
    { cn: '用', en: 'Using', text: 'You use it when work or life asks you to. Steady results, but it depends on circumstance.' },
    { cn: '養', en: 'Building', text: 'You build it on purpose: the habits, roles and people that carry this god, every week.' },
    { cn: '成', en: 'Living it', text: 'You organise your work and life around it. Its effects compound and outlast bad years.' }
  ];
  function usefulGod(user, prof) {
    var fav = user.deep.favourable || [];
    var cand = prof.gods.filter(function (g) { return fav.indexOf(g.elem) >= 0; });
    var present = cand.filter(function (g) { return g.present; }).sort(function (a, b) { return b.score - a.score; });
    var absentElems = fav.filter(function (e) { return !present.some(function (g) { return g.elem === e; }); });
    var focus = present[0] || null;
    var luckBring = null;
    if (user.luck && user.luck.pillars && absentElems.length) {
      var age = new Date().getFullYear() - user.birth.y;
      user.luck.pillars.forEach(function (l) {
        if (!luckBring && l.to > age && absentElems.indexOf(C.STEM_ELEM[l.pillar.stem]) >= 0) luckBring = { from: l.from, to: l.to, pillar: l.pillar.cn };
      });
    }
    return { focus: focus, present: present, absentElems: absentElems.map(function (e) { return C.ELEM[e] + ' ' + C.ELEM_EN[e]; }), luckBring: luckBring, actions: ACTION,
      note: focus ? 'Of your favourable elements, the one the chart already holds most of is ' + focus.cn + ' ' + focus.en + ' (' + focus.elemEn + '). That is the one you can ' +
        'work with every day, without waiting for timing: ' + focus.gift + '.' : 'None of your favourable elements is in the birth chart itself, so they reach you through luck pillars, years, people and surroundings.' };
  }

  /* ================= family through the Ten Gods (六親) ================= */

  var KIN = {
    M: [['Father', '父', [4]], ['Mother', '母', [9]], ['Wife or partner', '妻', [5]], ['Other romantic interests', '偏緣', [4]],
        ['Sons', '子', [6]], ['Daughters', '女', [7]], ['Brothers', '兄弟', [0]], ['Sisters', '姐妹', [1]], ['Mother-in-law', '岳母', [2, 3]]],
    F: [['Father', '父', [4]], ['Mother', '母', [9]], ['Husband or partner', '夫', [7]], ['Other romantic interests', '偏緣', [6]],
        ['Sons', '子', [3]], ['Daughters', '女', [2]], ['Sisters', '姐妹', [0]], ['Brothers', '兄弟', [1]], ['Mother-in-law', '婆婆', [4, 5]]]
  };
  var KIN_PALACE = { 'Father': 'Year and Month pillars', 'Mother': 'Month pillar', 'Wife or partner': 'Day branch', 'Husband or partner': 'Day branch',
    'Sons': 'Hour pillar', 'Daughters': 'Hour pillar', 'Brothers': 'Month pillar', 'Sisters': 'Month pillar' };
  function family(user, prof) {
    var fav = user.deep.favourable || [], unfav = user.deep.unfavourable || [];
    return (KIN[user.gender === 'M' ? 'M' : 'F']).map(function (k) {
      var gs = k[2].map(function (i) { return prof.gods[i]; });
      var pct = Math.max.apply(null, gs.map(function (g) { return g.pct; }));
      var g0 = gs[0], tone = fav.indexOf(g0.elem) >= 0 ? 'supportive' : unfav.indexOf(g0.elem) >= 0 ? 'demanding' : 'neutral';
      var presence = pct >= 60 ? 'strong' : pct >= 25 ? 'present' : pct > 0 ? 'faint' : 'absent';
      return { who: k[0], cn: k[1], gods: gs.map(function (g) { return g.cn + ' ' + g.en; }).join(' / '), pct: pct, presence: presence, tone: tone,
        palace: KIN_PALACE[k[0]] || '', where: gs.reduce(function (a, g) { return a.concat(g.where); }, []).slice(0, 4),
        text: presence === 'absent' ? 'Their star does not appear in the chart: the bond is shaped more by the years when a luck pillar or year brings it.'
          : 'Their star is ' + presence + ' in the chart and ' + (tone === 'supportive' ? 'favourable to you, so the bond tends to help and steady you.'
          : tone === 'demanding' ? 'not among your favourable elements, so the bond asks more of you and teaches through effort.' : 'neutral, so the bond is what both of you make it.') };
    });
  }

  /* ================= work style and wealth capacity ================= */

  function workWealth(user, prof, st) {
    var D = user.deep, fav = D.favourable || [], share = {};
    st.groups.forEach(function (g) { share[g.key] = g.share; });
    var favG = function (key) { var G = GROUPS.filter(function (x) { return x.key === key; })[0]; return fav.indexOf(prof.gods[G.gods[0]].elem) >= 0; };
    var modes = [
      { key: 'owner', cn: '自營', en: 'Running your own business', score: (D.strong ? 2 : 0) + share.wealth / 15 + (favG('wealth') ? 1.5 : 0) + share.output / 30,
        why: 'a Day Master strong enough to hold wealth, with the Wealth stars present and favourable' },
      { key: 'partner', cn: '合夥', en: 'In partnership', score: (!D.strong ? 1.5 : 0) + share.companion / 15 + (favG('companion') ? 1.5 : 0),
        why: 'Companion stars that help a Day Master who should not carry everything alone' },
      { key: 'employed', cn: '受僱', en: 'Inside an organisation', score: share.authority / 15 + share.resource / 25 + (favG('authority') ? 1.5 : 0) + (favG('resource') ? 0.8 : 0),
        why: 'Authority and Resource stars that do best with a clear role, rank and backing' },
      { key: 'independent', cn: '自由業', en: 'Independent specialist or creative', score: share.output / 15 + (favG('output') ? 1.5 : 0) + (D.strong ? 0.5 : 0),
        why: 'Output stars that are paid for skill and originality rather than position' }
    ].sort(function (a, b) { return b.score - a.score; });
    var dw = prof.gods[5].score, iw = prof.gods[4].score, wealthTot = dw + iw;
    var visibleW = [user.pillars.year, user.pillars.month, user.pillars.hour].some(function (q) { var g = C.tenGod(user.pillars.day.stem, q.stem).i; return g === 4 || g === 5; });
    var rootedW = [user.pillars.year, user.pillars.month, user.pillars.day, user.pillars.hour].some(function (q) { var g = C.tenGod(user.pillars.day.stem, C.HIDDEN[q.branch][0]).i; return g === 4 || g === 5; });
    var flow = wealthTot === 0 ? 'No Wealth star in the chart: money follows your skill and your timing more than any natural pull.'
      : dw >= iw * 1.5 ? 'Direct Wealth leads: steady, earned income, salary, savings and assets you build slowly.'
      : iw >= dw * 1.5 ? 'Indirect Wealth leads: irregular income in bursts from deals, ventures, commission and investment, so cash-flow discipline matters.'
      : 'Both kinds of Wealth: a steady base with room for side income and opportunistic deals.';
    var drive = visibleW && rootedW ? 'Driven: Wealth shows on top and is rooted below, so you pursue money with real follow-through.'
      : visibleW ? 'Wanting: Wealth shows on top but has no root beneath it, so the wish for money is stronger than the habits that build it. Systems and a partner who tracks the numbers help.'
      : rootedW ? 'Quietly capable: Wealth is rooted but hidden, so money is built steadily and privately rather than chased.'
      : 'Not money-led: other things motivate you more, and wealth comes as a by-product of doing those well.';
    var capacity = wealthTot === 0 ? '' : D.strong ? (share.wealth < 15 ? 'Your Day Master can hold more than the chart offers, so create wealth through Output: products, services, ideas.' :
        'Your Day Master is strong enough to hold the wealth the chart shows.')
      : (share.wealth >= 25 ? 'The chart shows more wealth than a weak Day Master can hold alone: partners, a team and good advisers turn it into kept money.' :
        'Wealth and Day Master are in proportion: grow both together, skill first.');
    var earned = prof.gods[2].present || prof.gods[3].present ? 'Output feeds your Wealth, so your best money is earned by skill and effort.' :
      'There is little Output to feed Wealth, so money tends to arrive through position, timing and other people. Build a skill that produces it.';
    return { modes: modes, best: modes[0], second: modes[1], flow: flow, drive: drive, capacity: capacity, earned: earned,
      partnersNote: favG('companion') ? 'Companions are favourable: sharing work and profit tends to multiply rather than divide.' :
        'Companions are not favourable: keep partnerships clear on paper, and keep money decisions your own.' };
  }

  /* ================= a year against the chart ================= */

  var REL_MEAN = {
    union: { cn: '合', en: 'Combination', text: 'openings, help and people drawn to you' },
    clash: { cn: '沖', en: 'Clash', text: 'change, movement and something shaken loose' },
    punish: { cn: '刑', en: 'Punishment', text: 'expectations let down and friction that tests patience' },
    harm: { cn: '害', en: 'Harm', text: 'feeling stuck, slowed by something you did or left undone' },
    destroy: { cn: '破', en: 'Destruction', text: 'taking something apart so it can be rebuilt better' }
  };
  var HARM = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
  var PUNISH = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]];
  function branchRels(a, b) {
    var out = [], B = global.QPBazi;
    if (B.SIX_UNION[a] === b) out.push('union');
    if (mod(a + 6, 12) === b) out.push('clash');
    if (a === b && [4, 6, 9, 11].indexOf(a) >= 0) out.push('punish');
    if (PUNISH.some(function (x) { return (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a); })) out.push('punish');
    if (HARM[a] === b) out.push('harm');
    if (B.SIX_DESTRUCTION[a] === b) out.push('destroy');
    return out;
  }
  var GOD_YEAR = [
    'a year about standing your ground and the people beside you',
    'a year of competition, bold moves and money that comes and goes',
    'a year to create, enjoy and let your work speak for itself',
    'a year to speak up, innovate and challenge what no longer works',
    'a year of opportunity, deals and income from new directions',
    'a year to work steadily, budget and build what lasts',
    'a year of pressure and challenge that rewards decisive action',
    'a year of responsibility, recognition and working within the rules',
    'a year to study, reflect and follow your intuition',
    'a year of learning, support and help from mentors'
  ];
  var AREA = ['roots, elders and your wider circle', 'career, parents and working life', 'yourself and your partner', 'children, plans and your team'];
  function yearAgainst(user, year) {
    var p = user.pillars, yp = C.stemBranch(mod(year - 1984, 60)), g = C.tenGod(p.day.stem, yp.stem).i;
    var natal = [p.year, p.month, p.day, p.hour], links = [];
    natal.forEach(function (q, i) {
      branchRels(yp.branch, q.branch).forEach(function (k) {
        links.push({ kind: k, cn: REL_MEAN[k].cn, en: REL_MEAN[k].en, with: ['Year', 'Month', 'Day', 'Hour'][i] + ' ' + C.BRANCHES[q.branch],
          text: REL_MEAN[k].text + ', in ' + AREA[i] });
      });
    });
    var age = year - user.birth.y, lp = null;
    (user.luck.pillars || []).forEach(function (l) { if (age >= l.from && age < l.to) lp = l; });
    if (lp) branchRels(yp.branch, lp.pillar.branch).forEach(function (k) {
      links.push({ kind: k, cn: REL_MEAN[k].cn, en: REL_MEAN[k].en, with: 'Luck pillar ' + lp.pillar.cn, text: REL_MEAN[k].text + ', in the direction of this ten-year phase' });
    });
    var fav = user.deep.favourable || [];
    return { year: year, pillar: yp.cn, god: GOD_CN_TRAD[g], godEn: C.TEN_GODS_EN[g], theme: GOD_YEAR[g],
      favourable: fav.indexOf(C.STEM_ELEM[yp.stem]) >= 0, branchGod: C.TEN_GODS_EN[C.tenGod(p.day.stem, C.HIDDEN[yp.branch][0]).i],
      links: links, quiet: !links.length };
  }

  /* ================= the day pillar 日柱 ================= */

  var STEM_NATURE = [
    'Jia Wood is the tall tree: upright, principled and growing steadily toward a goal, slow to bend.',
    'Yi Wood is the vine and flower: adaptable, persuasive and graceful, finding a way around every obstacle.',
    'Bing Fire is the sun: generous, open and warm, happiest lighting up a room and lifting others.',
    'Ding Fire is the candle: focused, attentive and quietly devoted, a guiding light up close.',
    'Wu Earth is the mountain: dependable, steady and protective, the one others lean on.',
    'Ji Earth is the field: nurturing, practical and versatile, turning what it is given into growth.',
    'Geng Metal is the axe and the ore: direct, tough and loyal, made stronger by hardship.',
    'Xin Metal is the jewel: refined, perceptive and proud of standards, shining once polished.',
    'Ren Water is the ocean and the river: bold, restless and resourceful, always moving toward the bigger picture.',
    'Gui Water is rain and mist: gentle, intuitive and imaginative, reaching places force cannot.'
  ];
  var SPOUSE_GOD = [
    'Your partner palace holds a Friend: you want a partner who is an equal and a companion, and you share decisions.',
    'Your partner palace holds Rob Wealth: the bond is lively and competitive, and money in the marriage needs clear agreement.',
    'Your partner palace holds the Eating God: you look for ease, good food and enjoyment together, and give affection freely.',
    'Your partner palace holds the Hurting Officer: you are expressive and exacting with a partner, so tone matters more than content.',
    'Your partner palace holds Indirect Wealth: a charming, sociable bond, with romance that can come from unexpected places.',
    'Your partner palace holds Direct Wealth: you value a steady, practical partnership and look after the household well.',
    'Your partner palace holds the Seven Killings: an intense, passionate bond with strong wills on both sides.',
    'Your partner palace holds the Direct Officer: you look for a respectable, reliable partner and keep your commitments.',
    'Your partner palace holds Indirect Resource: you need space and understanding, and a partner who respects your inner world.',
    'Your partner palace holds Direct Resource: the bond is caring and protective, and you look for support and kindness.'
  ];
  var STAGE_TEXT = {
    '長生': 'You sit on Growth: born with momentum and the ability to start again.',
    '沐浴': 'You sit on Bathing: charming and curious, with a restless, romantic streak.',
    '冠帶': 'You sit on Capping: image-conscious and ambitious, keen to prove yourself.',
    '臨官': 'You sit on Office: self-reliant, capable and rooted in your own ability.',
    '帝旺': 'You sit on Peak: forceful and confident, at your strongest when leading.',
    '衰': 'You sit on Decline: experienced and measured, wiser than you look.',
    '病': 'You sit on Sickness: sensitive and caring, with a mind that worries ahead.',
    '死': 'You sit on Death: calm and still on the surface, deep and settled within.',
    '墓': 'You sit on the Tomb: thrifty and private, a keeper of resources and secrets.',
    '絕': 'You sit on Extinction: you reinvent yourself, often after a clean break.',
    '胎': 'You sit on Conception: full of plans and potential that take time to show.',
    '養': 'You sit on Nurture: cared for and caring, growing best with patient support.'
  };
  function dayPillar(p) {
    var d = C.stemBranch(p.day.i), st = global.QPBazi.stageOf(p.day.stem, p.day.branch);
    var sg = C.tenGod(p.day.stem, C.HIDDEN[p.day.branch][0]).i;
    var img = (global.QPDayPillars || {})[d.cn] || '';
    return { cn: d.cn, en: d.en, nayin: d.nayin, image: img, nature: STEM_NATURE[p.day.stem], stage: st.cn, stageText: STAGE_TEXT[st.cn] || '',
      spouse: SPOUSE_GOD[sg], spouseGod: GOD_CN_TRAD[sg] + ' ' + C.TEN_GODS_EN[sg] };
  }

  /* ================= everything at once ================= */

  function all(user, year) {
    var p = user.pillars, prof = profile(p), st = structures(prof);
    return { profile: prof, structures: st, talents: talents(p), houses: sixHouses(p), lifePalace: lifePalace(p), conceptionPalace: conceptionPalace(p),
      useful: usefulGod(user, prof), family: family(user, prof), work: workWealth(user, prof, st), day: dayPillar(p),
      year: yearAgainst(user, year || new Date().getFullYear()), nextYear: yearAgainst(user, (year || new Date().getFullYear()) + 1) };
  }

  /** Plain text for the AI reading. */
  function aiText(user) {
    var x = all(user), L = [];
    L.push('TEN GODS PROFILE (ranked, % of the strongest): ' + x.profile.ranked.map(function (g) { return g.cn + ' ' + g.en + ' ' + g.pct + '%'; }).join(', '));
    L.push('STRUCTURE GROUP: primary ' + x.structures.primary.cn + ' ' + x.structures.primary.en + ' (' + x.structures.primary.share + '%), secondary ' +
      x.structures.secondary.cn + ' ' + x.structures.secondary.en + ' (' + x.structures.secondary.share + '%)' + (x.structures.extreme ? ', extreme' : '') +
      (x.structures.missing.length ? '; missing ' + x.structures.missing.map(function (g) { return g.en; }).join(', ') : ''));
    L.push('HIDDEN TALENTS (month branch ' + x.talents.branch + '): main ' + x.talents.main.god + ' ' + x.talents.main.en +
      (x.talents.subs.length ? ', sub ' + x.talents.subs.map(function (t) { return t.god + ' ' + t.en; }).join(', ') : '') +
      (x.talents.revealed.length ? '; revealed on the stems: ' + x.talents.revealed.join(' ') : '; none revealed'));
    L.push('DAY PILLAR ' + x.day.cn + ' (' + x.day.nayin + '): sits on ' + x.day.stage + '; partner palace holds ' + x.day.spouseGod + '.');
    L.push('LIFE PALACE 命宮 ' + x.lifePalace.cn + ' (' + x.lifePalace.nayin + '), CONCEPTION PALACE 胎元 ' + x.conceptionPalace.cn + ' (' + x.conceptionPalace.nayin + ').');
    L.push('USEFUL GOD IN THE CHART: ' + (x.useful.focus ? x.useful.focus.cn + ' ' + x.useful.focus.en + ' (' + x.useful.focus.elemEn + ')' : 'none present') +
      (x.useful.absentElems.length ? '; favourable but absent from the chart: ' + x.useful.absentElems.join(', ') + (x.useful.luckBring ? ', first brought by the luck pillar ' + x.useful.luckBring.pillar + ' at ages ' + x.useful.luckBring.from + '-' + x.useful.luckBring.to : '') : ''));
    L.push('FAMILY STARS (六親): ' + x.family.map(function (f) { return f.who + ' ' + f.gods + ' ' + f.presence + ', ' + f.tone; }).join('; '));
    L.push('WORK STYLE: best ' + x.work.best.en + ', then ' + x.work.second.en + '. Wealth: ' + x.work.flow + ' ' + x.work.drive);
    L.push('THIS YEAR ' + x.year.pillar + ': stem ' + x.year.god + ' ' + x.year.godEn + ' (' + x.year.theme + ')' +
      (x.year.links.length ? '; branch ' + x.year.links.map(function (l) { return l.cn + ' ' + l.en + ' with ' + l.with; }).join(', ') : '; branch quiet against the chart'));
    return L.join('\n');
  }

  global.QPBaziPlus = { GROUPS: GROUPS, GOD_TEXT: GOD_TEXT, REL_MEAN: REL_MEAN, profile: profile, structures: structures, talents: talents,
    lifePalace: lifePalace, conceptionPalace: conceptionPalace, sixHouses: sixHouses, usefulGod: usefulGod, family: family,
    workWealth: workWealth, yearAgainst: yearAgainst, dayPillar: dayPillar, branchRels: branchRels, all: all, aiText: aiText };
})(typeof window !== 'undefined' ? window : globalThis);
