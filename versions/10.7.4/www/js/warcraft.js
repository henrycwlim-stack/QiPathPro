/* QiPath Pro: Warcraft.
 * Reads an hour plate through the 13 chapters of Sun Tzu, following Joey Yap's Qi Men Dun Jia Sun Tzu Warcraft: the Day Stem is you, the Month Stem
 * your rival, the Hour Stem the matter, the Year Stem the leadership. The book says what to compare for each of the 7 Criteria but gives no scoring,
 * so the leans and the verdict below are QiPath's own. All wording is QiPath's own too; page numbers are the PDF's, one past the printed page.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, S = global.QPSystems, Q = global.QPQimen;
  var OUTER = [1, 2, 3, 4, 6, 7, 8, 9], ELEMS = ['wood', 'fire', 'earth', 'metal', 'water'];
  var YI = ['戊', '己', '庚', '辛', '壬', '癸'];

  // Good and bad components for this system (p.60). Its door list differs from the Compendium's: only Death and Fear count as bad.
  var GOOD = { deity: ['值符', '太阴', '六合', '九地', '九天'], star: ['天冲', '天辅', '天禽', '天心', '天任'], door: ['开门', '休门', '生门', '伤门', '杜门', '景门'], stem: ['甲', '乙', '丙', '丁', '戊'] };
  var BAD = { deity: ['腾蛇', '白虎', '勾陈', '朱雀', '玄武'], star: ['天蓬', '天芮', '天柱', '天英'], door: ['死门', '惊门'], stem: ['己', '庚', '辛', '壬', '癸'] };
  var CLIMATE = { '天蓬': 'cloud and rain', '天芮': 'mist and gloom', '天冲': 'lightning and storms', '天辅': 'pleasant wind', '天禽': 'very strong winds', '天柱': 'sunshine', '天心': 'frost and cold', '天任': 'dust and dry wind', '天英': 'sun and heat' };
  var DEITY_USE = { '值符': 'help from someone with authority', '太阴': 'wise counsel and quiet moves', '六合': 'relationships and allies', '九地': 'patience, money matters and steady growth', '九天': 'foresight and bold moves' };

  // [structure id, what it is good for in competition], from the chapters on Deception (p.233-237), the Nine Dun (p.255-269), Fire (p.411-415) and Information (p.436-438).
  var DECEPTIONS = [['zhen_zha', 'Look weak or unready, so your rival grows complacent. It also suits working out of sight.'], ['chong_zha', 'Look stronger than you are, so your rival second-guesses you.'], ['xiu_zha', 'Look harmless and uninterested, so your rival misreads your next move. It also suits winning trust.']];
  var DUNS = [['tian_dun', 'Holding what you have, official announcements, promotions and new deals.'], ['di_dun', 'Building foundations and bringing order to chaos.'], ['ren_dun', 'Hiring, recruiting and finding the right people.'], ['shen_dun', 'Prayer, meditation and focusing your intention.'], ['gui_dun', 'Surprise moves and investigation.'], ['long_dun', 'Growing wealth, business strategy and water-related work.'], ['yun_dun', 'Succeeding quietly and improving yourself.'], ['hu_dun', 'Getting what you want through firmness, or asking for a promotion.'], ['feng_dun', 'Publicity, reputation and spreading news.']];
  var HAZARDS = [['zhan_ge', 'Loss and disarray.'], ['da_ge', 'Support fails when you need it, and the ground is treacherous.'], ['tian_yi_fei_gong', 'Sudden changes in the market or environment that are out of your hands.'], ['tian_yi_fu_gong', 'Trouble with leadership, or your people losing faith.']];
  var FIRE = [['qing_long_hui', 'Excellent for wealth and career, and for turning rivals into friends.'], ['fei_niao_die', 'Good fortune and influential help come to you.'], ['yu_nv_shou', 'Good for relationships, mediation and clever planning.']];
  var SPIES = [['yi_de_shi', 'Access to important people and information, and good for negotiating and closing deals.'], ['yi_qi_sheng', 'Finding information, research, sales campaigns and opening new markets.']];

  function plateStem(q) { return q.stem === 0 ? YI[Math.floor((q.i - q.i % 10) / 10) % 6] : C.STEMS[q.stem]; }
  function idx(pa) { return ELEMS.indexOf(pa.element); }
  // How much palace a helps palace b, by the five elements: producing helps, countering hurts, and feeding someone else costs a little (p.72, p.102).
  function support(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 2;
    var x = idx(a), y = idx(b);
    if (x === y) return 1;
    if (C.produces(x, y)) return 2;
    if (C.controls(x, y)) return -2;
    return -1;
  }
  function relText(a, b) {
    if (a === b) return 'shares a palace with';
    var x = idx(a), y = idx(b);
    return x === y ? 'stands level with' : C.produces(x, y) ? 'feeds' : C.controls(x, y) ? 'counters' : C.produces(y, x) ? 'is fed by' : 'is countered by';
  }

  /** Internal palaces are close and short-term, and external ones far and long-term (p.96-97). They swap between Yang and Yin plates. */
  function isInternal(chart, n) {
    var yang = [1, 8, 3, 4].indexOf(n) >= 0;
    return String(chart.dun).indexOf('阳') >= 0 ? yang : !yang;
  }

  function read(when) {
    var res = Q.chartFor('hour', when), ch = res.chart, p = res.pillars, forms = res.formations, P = ch.palacesByNumber;
    function at(stem) {
      for (var i = 0; i < OUTER.length; i++) { var a = P[OUTER[i]]; if (a.heavenStemCn === stem || a.heavenStem2Cn === stem) return a; }
      return P[2];
    }
    function withDoor(d) { for (var i = 0; i < OUTER.length; i++) if (P[OUTER[i]].gate === d) return P[OUTER[i]]; return null; }
    function formsIn(n) { return forms.filter(function (f) { return (f.palaces || []).indexOf(n) >= 0; }); }
    // A palace's contents: each part counts one way or the other, with its structures on top. Emptiness makes the palace moot, good or bad (p.207).
    function quality(pa) {
      var good = [], bad = [];
      [['deity', pa.spirit], ['star', pa.starCn], ['door', pa.gate], ['stem', pa.heavenStemCn]].forEach(function (x) {
        if (GOOD[x[0]].indexOf(x[1]) >= 0) good.push(x[1]);
        else if (BAD[x[0]].indexOf(x[1]) >= 0) bad.push(x[1]);
      });
      var fs = formsIn(pa.num), fg = fs.filter(function (f) { return f.category === 'auspicious'; }), fb = fs.filter(function (f) { return f.category === 'hostile'; });
      var score = good.length - bad.length + Math.max(-3, Math.min(3, fg.length - fb.length));
      if (pa.isEmpty) score = 0;
      return { score: score, isVoid: !!pa.isEmpty, good: good, bad: bad, goodForms: fg.map(function (f) { return f.name; }), badForms: fb.map(function (f) { return f.name; }),
        label: pa.isEmpty ? 'Void' : score >= 2 ? 'Strong' : score <= -2 ? 'Weak' : 'Mixed' };
    }
    function place(pa) { return pa.dir + ' (' + pa.num + ')'; }
    function found(list) {
      var out = [];
      list.forEach(function (x) {
        forms.filter(function (f) { return f.id === x[0]; }).forEach(function (f) {
          var ps = (f.palaces || []).filter(function (n) { return n >= 1; });
          out.push({ id: f.id, name: f.name, en: f.nameEn, use: x[1], dirs: ps.map(function (n) { return P[n].dir; }), isVoid: ps.length > 0 && ps.every(function (n) { return P[n].isEmpty; }) });
        });
      });
      return out;
    }

    var you = at(plateStem(p.day)), rival = at(plateStem(p.month)), matter = at(plateStem(p.hour)), year = at(plateStem(p.year));
    var lead = at(ch.meta.fuShou), wu = at('戊'), geng = at('庚'), yi = at('乙'), bing = at('丙'), ding = at('丁'), delusion = withDoor('杜门'), fear = withDoor('惊门'), envoy = withDoor(ch.envoy && ch.envoy.length === 1 ? ch.envoy + '门' : ch.envoy);
    var qYou = quality(you), qRival = quality(rival), qMatter = quality(matter), qYear = quality(year), qLead = quality(lead);

    function lean(a, b) { return a > b ? 'you' : b > a ? 'rival' : 'even'; }
    function viaPalace(pa, what) {
      if (!pa) return { lean: 'even', why: 'This symbol is not on the outer plate this hour.' };
      return { lean: lean(support(pa, you), support(pa, rival)), why: what + ' sits in the ' + place(pa) + ' palace. It ' + relText(pa, you) + ' your palace and ' + relText(pa, rival) + ' your rival\'s.' };
    }
    // The 7 Criteria, each compared the way chapter 1 describes (p.63-69).
    var criteria = [];
    function add(cn, en, r) { criteria.push({ cn: cn, en: en, lean: r.lean, why: r.why }); }
    var c1 = viaPalace(year, 'The Year Stem, the vision of the leadership,');
    add('主孰有道', 'Whose leader has the better compass?', { lean: c1.lean, why: c1.why + ' That palace reads ' + qYear.label.toLowerCase() + ', and it ' + relText(year, matter) + ' the matter.' });
    var ab = qYou.score - qRival.score + (support(you, rival) === -2 ? 2 : support(rival, you) === -2 ? -2 : 0);
    add('將孰有能', 'Whose general is more able?', { lean: lean(ab, 0), why: 'Your palace reads ' + qYou.label.toLowerCase() + ' and your rival\'s ' + qRival.label.toLowerCase() + '. Your palace ' + relText(you, rival) + ' theirs. The hidden Jia, the commander, is in the ' + place(lead) + ' palace, which reads ' + qLead.label.toLowerCase() + '.' });
    var part = function (pa) { return (GOOD.star.indexOf(pa.starCn) >= 0 ? 1 : BAD.star.indexOf(pa.starCn) >= 0 ? -1 : 0) + (GOOD.door.indexOf(pa.gate) >= 0 ? 1 : BAD.door.indexOf(pa.gate) >= 0 ? -1 : 0); };
    add('天地孰得', 'Who has Heaven and Earth?', { lean: lean(part(you), part(rival)), why: 'You have ' + you.starCn + ' and ' + you.gate + ', and your rival ' + rival.starCn + ' and ' + rival.gate + '. The climate around the matter is ' + (CLIMATE[matter.starCn] || 'unsettled') + '.' });
    add('法令孰行', 'Whose discipline holds?', viaPalace(envoy, 'The Envoy, how well actions land,'));
    add('兵眾孰強', 'Whose army is stronger?', viaPalace(matter, 'The Hour Stem, your people and their ability to act,'));
    add('士卒孰練', 'Whose people are better trained?', viaPalace(delusion, 'The Delusion Door, which governs training,'));
    add('賞罰孰明', 'Whose rewards and penalties are clearer?', viaPalace(fear, 'The Fear Door, which governs reward and fear,'));
    var youN = criteria.filter(function (c) { return c.lean === 'you'; }).length, rivalN = criteria.filter(function (c) { return c.lean === 'rival'; }).length;

    // The verdict. Sun Tzu's rule is to fight only the battles you can win; a door 反吟 plate is "unusable" whatever else it holds (Compendium p.304).
    // The book's worked examples rest on the generals and the armies (p.71-76), so those two count double here.
    var weigh = function (who) { return criteria.reduce(function (s, c, i) { return s + (c.lean === who ? (i === 1 || i === 4 ? 2 : 1) : 0); }, 0); };
    var fanYin = forms.some(function (f) { return f.id === 'men_fan_yin'; }), dh = S.disharmony(p.day.stem, p.hour.stem), gap = weigh('you') - weigh('rival'), verdict;
    if (fanYin) verdict = { key: 'avoid', tone: 'danger', title: 'Do not act in this hour', text: 'The doors are in Fan Yin, which the Compendium treats as unusable. Pick another hour and assess again.' };
    else if (gap >= 3 && qMatter.score >= 0) verdict = { key: 'advance', tone: 'good', title: 'Advance', text: 'You hold the main advantages, and the matter itself is sound. Move while they last.' };
    else if (gap >= 1) verdict = { key: 'careful', tone: 'good', title: 'Advance with care', text: 'You have the edge, but it is not decisive. Use your strengths, and shore up what the criteria below show as weak.' };
    else if (gap === 0) verdict = { key: 'even', tone: 'neutral', title: 'An even contest', text: 'Neither side has a clear edge. A direct fight would be costly, so look for an alliance, an indirect move or a better hour.' };
    else if (gap >= -2) verdict = { key: 'hold', tone: 'danger', title: 'Hold your position', text: 'Your rival has the edge for now. Build up, and do not press unless you can change the ground.' };
    else verdict = { key: 'avoid', tone: 'danger', title: 'Avoid this contest for now', text: 'Your rival holds the main advantages. Sun Tzu would not fight here, so wait or find another way to win.' };

    // Host and Guest: the earth stem is the Host and the heaven stem the Guest. The palace helps whichever stem it feeds (p.124-126).
    function hostGuest(pa) {
      var h = C.STEM_ELEM[C.STEMS.indexOf(pa.earthStemCn)], g = C.STEM_ELEM[C.STEMS.indexOf(pa.heavenStemCn)], e = idx(pa);
      if (h === undefined || g === undefined) return { favours: 'neither' };
      var v = function (s, o) { return (C.produces(e, s) ? 2 : s === e ? 1 : (C.controls(e, s) || C.controls(s, e)) ? -1 : 0) + (C.produces(o, s) ? 1 : 0); };
      var a = v(h, g), b = v(g, h);
      return { host: pa.earthStemCn, guest: pa.heavenStemCn, favours: a > b ? 'host' : b > a ? 'guest' : 'neither' };
    }
    // The door against its palace describes the ground: door feeds palace favours the Host, door counters palace the Guest, and the same element suits both (p.392-396).
    function ground(pa) {
      if (!pa.door) return null;
      var d = ELEMS.indexOf(pa.door.element), e = idx(pa);
      return d === e ? 'both' : C.produces(d, e) ? 'host' : C.controls(d, e) ? 'guest' : null;
    }
    var yourSeat = hostGuest(you), yourGround = ground(you), seatText = function (x) { return x === 'host' ? 'Be the Host: hold it on your ground and let them come to you.' : x === 'guest' ? 'Be the Guest: go to them and take the initiative.' : x === 'both' ? 'Both sides can gain here, so look for a win without a fight.' : 'Neither role has a clear edge.'; };

    // Quick results follow the deities and lasting ones the doors (p.153).
    var hazardsFound = found(HAZARDS), hazardDirs = {};
    hazardsFound.forEach(function (h) { h.dirs.forEach(function (d) { hazardDirs[d] = 1; }); });
    var map = OUTER.map(function (n) { var pa = P[n], q = quality(pa); return { num: n, dir: pa.dir, name: pa.name, door: pa.gate, deity: pa.spirit, star: pa.starCn, stem: pa.heavenStemCn, isVoid: !!pa.isEmpty, ground: ground(pa), score: q.score, label: q.label, hazard: !!hazardDirs[pa.dir], internal: isInternal(ch, n), you: pa === you, rival: pa === rival, matter: pa === matter }; });
    var usable = map.filter(function (m) { return !m.isVoid && !m.hazard; }), best = function (list) { return list.slice().sort(function (a, b) { return b.score - a.score; })[0] || null; };
    var quick = best(usable.filter(function (m) { return GOOD.deity.indexOf(m.deity) >= 0; })), lasting = best(usable.filter(function (m) { return ['开门', '休门', '生门'].indexOf(m.door) >= 0; }));

    var nobleHere = function (pa) { return ['乙', '丙', '丁'].indexOf(pa.heavenStemCn) >= 0; };
    var force = nobleHere(matter) ? 'The matter sits on a Noble, ' + matter.heavenStemCn + ', so the extraordinary force 奇 is available. An unconventional move can win here.'
      : nobleHere(you) ? 'You sit on a Noble, ' + you.heavenStemCn + ', so you can bring the extraordinary force 奇 yourself, even though the matter is ordinary.'
      : 'Neither you nor the matter sits on a Noble, so this is the direct force 正: expect ordinary results from ordinary effort.' + (['壬', '辛'].indexOf(matter.heavenStemCn) >= 0 ? ' ' + matter.heavenStemCn + ' on the matter makes the direct route a poor one.' : '');

    var voids = map.filter(function (m) { return m.isVoid; }).map(function (m) { return m.dir; });
    var substance = rival.isEmpty && !you.isEmpty ? 'Your rival\'s palace is void and yours is solid: pit your strength against their weakness.'
      : you.isEmpty && !rival.isEmpty ? 'Your palace is void and your rival\'s is solid: their strength meets your weakness, so avoid a direct clash.'
      : you.isEmpty ? 'Both palaces are void, so neither side has much behind it right now.' : 'Both palaces are solid, so neither side has an empty flank to exploit.';

    var wuFeeds = support(wu, you) === 2 && wu !== you;
    var resources = { dir: wu.dir, label: quality(wu).label, text: (wu.isEmpty ? 'Your capital 戊 is void, which points to financial strain. ' : wuFeeds ? 'Your capital 戊 feeds your palace, so resources are available. ' : 'Your capital 戊 ' + relText(wu, you) + ' your palace. ') +
      (isInternal(ch, wu.num) ? 'It is in the internal plate, so it is close at hand.' : 'It is in the external plate, so it is distant and may be costly to reach.') };

    var fireOn = [bing, ding].filter(function (a) { return C.controls(idx(a), idx(geng)); }).length;
    var yiGeng = yi === geng ? '乙 and 庚 share a palace, so a rival can become an ally here.' : '乙 ' + relText(yi, geng) + ' 庚. An alliance needs 乙 to have the leverage shown below.';

    return {
      when: when, chart: ch, pillars: p, formations: forms, you: { pa: you, q: qYou }, rival: { pa: rival, q: qRival }, matter: { pa: matter, q: qMatter }, lead: { pa: lead, q: qLead }, year: { pa: year, q: qYear },
      stems: { day: plateStem(p.day), month: plateStem(p.month), hour: plateStem(p.hour), year: plateStem(p.year) },
      criteria: criteria, youN: youN, rivalN: rivalN, verdict: verdict, disharmony: dh, fanYin: fanYin,
      seat: { stems: yourSeat, ground: yourGround, stemsText: seatText(yourSeat.favours), groundText: seatText(yourGround) },
      quick: quick, lasting: lasting, deityUse: quick ? DEITY_USE[quick.deity] : null, map: map, force: force, voids: voids, substance: substance, resources: resources,
      deceptions: found(DECEPTIONS), duns: found(DUNS), hazards: hazardsFound, punish: found([['liu_yi_ji_xing', 'Disorder and pressure on this ground.']]), fire: found(FIRE), spies: found(SPIES),
      geng: { dir: geng.dir, fireOn: fireOn, text: 'The danger 庚 sits in the ' + place(geng) + ' palace, so expect trouble from that side. ' + (fireOn ? 'The Fire of a Noble can counter it, which is a good sign.' : 'Neither 丙 nor 丁 sits in a palace that counters it.') }, yiGeng: yiGeng,
      hits: [you.num, rival.num, matter.num]
    };
  }

  global.QPWar = { read: read, isInternal: isInternal, GOOD: GOOD, BAD: BAD };
})(typeof window !== 'undefined' ? window : this);
