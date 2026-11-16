/* QiPath Pro: one combined reading of the birth chart across Bazi, Zi Wei, Qimen Destiny, Qi Zheng Si Yu and He Luo Li Shu.
 * Each system scores a life area from -3 to +3 only where it has something of its own to say, and explains why in plain words.
 * The combined level is the plain average of the systems that speak, and agreement says whether they lean the same way.
 * The weighing is this app's own: no classical text prescribes it. He Luo describes the course of a life rather than its
 * departments, so it speaks only on Self, Luck, Later life and Purpose.
 */
(function (global) {
  'use strict';
  // Sources. a: a computed life area. p: a Zi Wei palace. l: a Qimen life palace. d: a Qimen door or deity. s: a Qimen stem.
  // star: a Bazi symbolic star. share: a Bazi element group. Qi Zheng uses its own palace names. xVia names the nearest
  // area when system x has no direct symbol for this one.
  var GROUPS = [['person', 'You', '自身'], ['money', 'Money and assets', '財'], ['work', 'Work and standing', '業'], ['love', 'Love and marriage', '情'], ['people', 'Family and people', '親'], ['path', 'Life path', '運']];
  var AREAS = [
    { key: 'self', group: 'person', label: 'Destiny (Self)', cn: '命', bazi: ['self'], zw: ['p:self'], qm: ['l:destiny'], qz: ['命宮'], hl: 'self' },
    { key: 'vitality', group: 'person', label: 'Vitality', cn: '元氣', bazi: ['self'], baziVia: 'Self', zw: ['p:health'], qm: ['d:fear'], qz: ['命宮'], qzVia: 'Life' },
    { key: 'health', group: 'person', label: 'Health', cn: '健康', bazi: ['a:health'], zw: ['a:health'], qm: ['a:health'], qz: ['疾厄'] },
    { key: 'emotions', group: 'person', label: 'Emotional wellbeing', cn: '情緒', isNew: true, bazi: ['self'], baziVia: 'Self', zw: ['p:wellbeing'], qm: ['d:moon'], qz: ['福德'] },
    { key: 'knowledge', group: 'person', label: 'Knowledge', cn: '智慧', bazi: ['a:education'], baziVia: 'Education', zw: ['a:education'], zwVia: 'Education', qm: ['l:knowledge'] },
    { key: 'education', group: 'person', label: 'Education', cn: '學業', bazi: ['a:education'], zw: ['a:education'], qm: ['a:education'] },
    { key: 'creativity', group: 'person', label: 'Creativity', cn: '才華', isNew: true, bazi: ['share:output'], zw: ['p:children'], zwVia: 'Children', qm: ['d:scenery'], qz: ['男女'], qzVia: 'Children' },
    { key: 'wealth', group: 'money', label: 'Wealth (assets)', cn: '財富', bazi: ['a:wealth'], zw: ['a:wealth'], qm: ['a:wealth'], qz: ['財帛'] },
    { key: 'finance', group: 'money', label: 'Finances (cash flow)', cn: '財務', bazi: ['a:finance'], zw: ['a:finance'], qm: ['a:finance'], qz: ['財帛'] },
    { key: 'investments', group: 'money', label: 'Investments', cn: '投資', isNew: true, bazi: ['a:wealth'], baziVia: 'Wealth', zw: ['p:wealth'], qm: ['s:戊'], qz: ['財帛'], qzVia: 'Wealth' },
    { key: 'property', group: 'money', label: 'Property', cn: '田宅', bazi: ['a:wealth'], baziVia: 'Wealth', zw: ['p:property'], qm: ['l:property'], qz: ['田宅'] },
    { key: 'career', group: 'work', label: 'Career', cn: '事業', bazi: ['a:career'], zw: ['a:career'], qm: ['a:career'], qz: ['官祿'] },
    { key: 'business', group: 'work', label: 'Business', cn: '創業', isNew: true, bazi: ['a:career', 'a:finance'], baziVia: 'Career and Finance', zw: ['p:career', 'p:wealth'], qm: ['l:wealth', 'l:career'], qz: ['官祿', '財帛'] },
    { key: 'reputation', group: 'work', label: 'Reputation', cn: '名聲', isNew: true, bazi: ['a:career'], baziVia: 'Career', zw: ['p:career'], zwVia: 'Career', qm: ['d:scenery'], qz: ['官祿', '相貌'] },
    { key: 'bosses', group: 'work', label: 'Bosses', cn: '上司', bazi: ['a:colleagues'], baziVia: 'Colleagues', zw: ['p:parents'], qm: ['d:chief'], qz: ['官祿'], qzVia: 'Career' },
    { key: 'colleagues', group: 'work', label: 'Colleagues', cn: '同事', bazi: ['a:colleagues'], zw: ['a:colleagues'], qm: ['a:colleagues'], qz: ['奴僕'] },
    { key: 'rivals', group: 'work', label: 'Rivals and gossip', cn: '小人', isNew: true, bazi: ['a:legal'], baziVia: 'Legal', zw: ['p:friends'], zwVia: 'Friends', qm: ['d:tiger'], qz: ['奴僕'], qzVia: 'Staff' },
    { key: 'legal', group: 'work', label: 'Legal matters', cn: '官非', bazi: ['a:legal'], zw: ['a:legal'], qm: ['a:legal'] },
    { key: 'relationships', group: 'love', label: 'Relationships', cn: '感情', bazi: ['a:spouse', 'a:colleagues'], zw: ['p:relationships', 'p:friends'], qm: ['l:relationships'], qz: ['夫妻', '奴僕'] },
    { key: 'romance', group: 'love', label: 'Romance', cn: '桃花', isNew: true, bazi: ['star:peach'], zw: ['p:relationships'], zwVia: 'Spouse', qm: ['l:relationships'], qmVia: 'Relationships', qz: ['夫妻'], qzVia: 'Marriage' },
    { key: 'spouse', group: 'love', label: 'Spouse', cn: '配偶', bazi: ['a:spouse'], zw: ['a:spouse'], qm: ['a:spouse'], qz: ['夫妻'] },
    { key: 'marriage', group: 'love', label: 'Marriage', cn: '婚姻', bazi: ['a:marriage'], zw: ['a:marriage'], qm: ['a:marriage'], qz: ['夫妻'] },
    { key: 'family', group: 'people', label: 'Family', cn: '家庭', bazi: ['a:relatives'], baziVia: 'Relatives', zw: ['a:relatives'], zwVia: 'Relatives', qm: ['l:family'], qz: ['田宅'], qzVia: 'Home' },
    { key: 'parents', group: 'people', label: 'Parents', cn: '父母', bazi: ['a:relatives'], baziVia: 'Relatives', zw: ['p:parents'], qm: ['a:relatives'], qmVia: 'Relatives' },
    { key: 'siblings', group: 'people', label: 'Siblings', cn: '兄弟', bazi: ['a:relatives'], baziVia: 'Relatives', zw: ['p:siblings'], qm: ['a:relatives'], qmVia: 'Relatives', qz: ['兄弟'] },
    { key: 'children', group: 'people', label: 'Children', cn: '子女', bazi: ['a:children'], zw: ['a:children'], qm: ['a:children'], qz: ['男女'] },
    { key: 'relatives', group: 'people', label: 'Relatives', cn: '親戚', bazi: ['a:relatives'], zw: ['a:relatives'], qm: ['a:relatives'], qz: ['兄弟'] },
    { key: 'friends', group: 'people', label: 'Friends', cn: '朋友', bazi: ['a:colleagues'], baziVia: 'Colleagues', zw: ['p:friends'], qz: ['奴僕'] },
    { key: 'mentors', group: 'people', label: 'Mentors and helpers', cn: '貴人', isNew: true, bazi: ['star:nobleman'], zw: ['p:parents'], zwVia: 'Parents', qm: ['d:chief'], qz: ['福德'], qzVia: 'Fortune' },
    { key: 'luck', group: 'path', label: 'Luck', cn: '運', bazi: ['luck'], zw: ['luck'], qm: ['luck'], hl: 'luck' },
    { key: 'fortune', group: 'path', label: 'Fortune', cn: '福德', zw: ['p:wellbeing'], qz: ['福德'] },
    { key: 'travel', group: 'path', label: 'Travel', cn: '出行', bazi: ['a:travel'], zw: ['a:travel'], qm: ['a:travel'], qz: ['遷移'] },
    { key: 'purpose', group: 'path', label: 'Purpose', cn: '因果', isNew: true, bazi: ['star:canopy'], zw: ['p:wellbeing'], zwVia: 'Fortune', qm: ['l:karmic'], qz: ['福德'], qzVia: 'Fortune', hl: 'self' },
    { key: 'laterlife', group: 'path', label: 'Later life', cn: '晚年', isNew: true, bazi: ['a:children'], baziVia: 'Children', zw: ['p:wellbeing'], zwVia: 'Fortune', qm: ['h:hour'], qz: ['福德'], qzVia: 'Fortune', hl: 'later' }
  ];
  var SYSTEMS = [['bazi', 'BaZi'], ['zw', 'Zi Wei'], ['qm', 'Qimen'], ['qz', 'Qi Zheng'], ['hl', 'He Luo']];
  var ZW_LABEL = { self: 'Life', siblings: 'Siblings', relationships: 'Spouse', children: 'Children', wealth: 'Wealth', health: 'Health', travel: 'Travel', friends: 'Friends', career: 'Career', property: 'Property', wellbeing: 'Fortune', parents: 'Parents' };
  var DEITY_EN = { '值符': 'Chief', '腾蛇': 'Snake', '太阴': 'Great Moon', '六合': 'Harmony', '白虎': 'Tiger', '勾陈': 'Hook', '玄武': 'Tortoise', '朱雀': 'Phoenix', '九地': 'Nine Earth', '九天': 'Nine Heaven' };
  var LP_LABEL = { destiny: 'Destiny', wealth: 'Wealth', property: 'Property', relationships: 'Relationships', knowledge: 'Knowledge', family: 'Family', career: 'Career', karmic: 'Karmic' };

  function clamp(v) { return Math.max(-3, Math.min(3, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function byKey(list) { var o = {}; list.forEach(function (x) { o[x.key] = x; }); return o; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function reads(v) { return v >= 1 ? 'supportive' : v <= -1 ? 'difficult' : 'mixed'; }
  function joinNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function sources(user, year, qz, hl) {
    var S = global.QPSystems, B = global.QPBazi, F = global.QPFib, Q = global.QPQimen, z = user.zwds, C = global.QPCore, D = user.deep || {};
    var ba = byKey(B.areasNatal(user)), za = byKey(F.zwdsAreasNatal(user)), pal = {};
    var names = { '命宫': 'self', '兄弟': 'siblings', '夫妻': 'relationships', '子女': 'children', '财帛': 'wealth', '疾厄': 'health', '迁移': 'travel', '交友': 'friends', '官禄': 'career', '田宅': 'property', '福德': 'wellbeing', '父母': 'parents' };
    z.palaces.forEach(function (p, b) {
      var sc = S.zwdsPeriod(z, b, user.pillars.year.stem, null), k = names[p.name];
      pal[k] = { v: clamp((sc.score - 4.1) / 1.6 * 1.5), stars: p.stars.map(function (x, i) { return (p.starsEn && p.starsEn[i] ? p.starsEn[i] + ' ' : '') + x; }), name: ZW_LABEL[k] };
    });
    var res = Q.chartFor('destiny', null, user.birth), ch = res.chart, fav = D.favourable || null;
    var dp = Q.destinyProfile(res, user), qa = byKey(Q.areasDestiny(res, user)), lp = byKey(Q.lifePalaces(ch, dp).list);
    function palaceText(c, n, title, forms) {
      var pa = c.palacesByNumber[n], v = clamp(Q.palaceQuality(c, forms, n, fav).score);
      return { v: v, why: title + ' sits in the ' + pa.dir + ' with the ' + (pa.gateEn || pa.gate) + ' Door, ' + (pa.starEn || pa.starCn) + ' star and ' + (DEITY_EN[pa.spirit] ? DEITY_EN[pa.spirit] + ' deity' : pa.spirit) + ', which reads as ' + reads(v) + (pa.isEmpty ? ', though the palace is void, so results may feel hollow' : '') + '.' };
    }
    var nat = function (n, title) { return n ? palaceText(ch, n, title, res.formations) : null; };
    function find(test) { return [1, 2, 3, 4, 6, 7, 8, 9].filter(function (n) { return test(ch.palacesByNumber[n]); })[0]; }
    var bf = F.bazi(user), zf = F.zwds(user), yr = Q.chartFor('year', { y: year, m: 7, d: 1, hour: 12, min: 0 }, user.birth), st = D.strength || null;
    var hasStar = function (k) { return (D.stars || []).filter(function (x) { return x.key === k; })[0] || null; };
    var STAR_TEXT = {
      peach: [1, 'A Peach Blossom star in your chart gives you natural social appeal.'],
      nobleman: [1.5, 'A Nobleman star in your chart suggests help tends to arrive through people with standing.'],
      canopy: [1, 'A Canopy star in your chart points to a reflective, spiritual streak.']
    };
    var values = {
      bazi: function (t) {
        if (t === 'self') {
          if (!st) return null;
          return { v: st.extreme ? -1.5 : clamp(1 - Math.abs(st.score - 3.7) / 1.25), why: 'Your Day Master is ' + (st.extreme || (st.strong ? 'on the strong side' : 'on the gentle side')) + (st.extreme ? ', which makes your chart less balanced.' : ', so your chart is fairly workable.') };
        }
        if (t === 'luck') {
          var c = bf.current; if (!c) return null;
          var v = clamp(c.score / 2);
          return { v: v, why: 'Your current ten-year luck pillar, ' + (c.pillar.cn || c.pillar) + ' from age ' + Math.floor(c.from) + ' to ' + Math.floor(c.to) + ', reads as ' + reads(v) + ' for your chart.' };
        }
        if (t.indexOf('star:') === 0) { var k = t.slice(5); return hasStar(k) ? { v: STAR_TEXT[k][0], why: STAR_TEXT[k][1] } : null; }
        if (t === 'share:output') {
          var el = (D.dayMasterElem + 1) % 5, sh = (D.shares || [])[el];
          if (sh === undefined) return null;
          var w = sh >= 30 ? 1.5 : sh >= 20 ? 1 : sh <= 8 ? -1 : 0;
          return { v: w, why: 'Your Output element, the part of a chart that expresses ideas, makes up ' + sh + '% of your chart.' };
        }
        var x = ba[t.slice(2)];
        return { v: x.score, why: x.plain };
      },
      zw: function (t) {
        if (t === 'luck') {
          var c = zf.current; if (!c) return null;
          var v = clamp((c.score - 4.1) / 1.6 * 1.5);
          return { v: v, why: 'Your current ten-year period runs through the ' + c.palace.nameEn + ' ' + c.palace.name + ' palace from age ' + c.from + ' to ' + c.to + ', which reads as ' + reads(v) + '.' };
        }
        if (t.charAt(0) === 'p') {
          var p = pal[t.slice(2)];
          return { v: p.v, why: 'Your ' + p.name + ' palace ' + (p.stars.length ? 'holds ' + p.stars.join(', ') : 'has no major star') + ' and reads as ' + reads(p.v) + '.' };
        }
        var a = za[t.slice(2)];
        return { v: a.score, why: a.plain };
      },
      qm: function (t) {
        if (t === 'luck') { var seat = Q.natalSeat(yr.chart, user); return palaceText(yr.chart, seat.num, 'This year, your seat', yr.formations); }
        if (t === 'd:chief') return nat(find(function (p) { return p.deity.char === '值符'; }), 'The Chief, which stands for senior people and patrons,');
        if (t === 'd:fear') return nat(find(function (p) { return p.door.char === '惊'; }), 'Your wellness palace, the Fear Door,');
        if (t === 'd:scenery') return nat(find(function (p) { return p.door.char === '景'; }), 'The Scenery Door, which stands for visibility and ideas,');
        if (t === 'd:moon') return nat(find(function (p) { return p.deity.char === '太阴'; }), 'The Great Moon, which stands for your private inner life,');
        if (t === 'd:tiger') return nat(find(function (p) { return p.deity.char === '白虎' || p.deity.char === '勾陈'; }), 'The deity of conflict and pressure');
        if (t === 's:戊') return nat(find(function (p) { return p.heavenStem.char === '戊' || p.heavenStem2Cn === '戊'; }), 'Your capital stem, Wu,');
        if (t === 'h:hour') {
          var cn = C.STEMS[user.pillars.hour.stem];
          return nat(find(function (p) { return p.heavenStem.char === cn || p.heavenStem2Cn === cn; }), 'Your hour stem, linked to later life,');
        }
        if (t.charAt(0) === 'l') { var key = t.slice(2); return nat(lp[key].palace, 'Your ' + LP_LABEL[key] + ' palace'); }
        var q = qa[t.slice(2)];
        return { v: q.score, why: q.plain };
      }
    };
    var qzPal = {};
    if (qz) qz.palaces.forEach(function (p) { qzPal[p.cn] = p; });
    function hlValue(t) {
      if (!hl) return null;
      var line = function (pos, yang) { return ((pos % 2 === 1) === yang ? 1 : -1) + (pos === 2 || pos === 5 ? 1 : 0); };
      var state = function (pos, yang) { return ((pos % 2 === 1) === yang ? 'well placed' : 'out of its natural place') + (pos === 2 || pos === 5 ? ' and central' : ''); };
      if (t === 'self') { var y = hl.first.lines[hl.first.tang - 1] === 1; return { v: line(hl.first.tang, y), why: 'Your key line in ' + hl.first.hex.nameEn + ' ' + hl.first.hex.name + ' is ' + hl.first.line + ', which is ' + state(hl.first.tang, y) + '.' }; }
      var age = year - user.pillars.solarYear + 1;
      var cur = t === 'later' ? hl.periods[hl.periods.length - 1] : hl.periods.filter(function (p) { return age >= p.fromAge && age <= p.toAge; })[0];
      if (!cur) return null;
      return { v: line(cur.pos, cur.yang), why: (t === 'later' ? 'Your final life period, from age ' + cur.fromAge + ',' : 'Your current period, to age ' + cur.toAge + ',') + ' is ruled by ' + cur.hex.nameEn + ' ' + cur.hex.name + ', line ' + cur.line + ', which is ' + state(cur.pos, cur.yang) + '.' };
    }
    return { values: values, qzPal: qzPal, hlValue: hlValue };
  }

  /** qz is QPQiZheng.chart's result, or null when the planetary tables do not cover this birth. */
  function compute(user, year, qz) {
    var hl = global.QPHeLuo.compute(user.pillars, user.gender === 'M'), src = sources(user, year, qz, hl), TX = global.QPCombinedText;
    function read(A, sys) {
      if (sys === 'hl') { var h = A.hl ? src.hlValue(A.hl) : null; return h ? { v: h.v, via: null, why: h.why } : null; }
      if (sys === 'qz') {
        if (!A.qz || !qz) return null;
        var occ = A.qz.map(function (n) { return src.qzPal[n]; }), who = occ.reduce(function (a, p) { return a.concat(p.bodies); }, []);
        if (!who.length) return null;
        var txt = who.map(function (o) { return o.en + ' ' + o.cn + ' (' + o.note + ')'; });
        return { v: clamp(mean(occ.map(function (p) { return p.tone; }))), via: A.qzVia || null, who: who.map(function (o) { return o.cn; }).join(''),
                 why: joinNames(txt) + (who.length > 1 ? ' sit' : ' sits') + ' in your ' + joinNames(occ.map(function (p) { return p.en; })) + ' palace' + (occ.length > 1 ? 's' : '') + '.' };
      }
      if (!A[sys]) return null;
      var got = A[sys].map(src.values[sys]).filter(Boolean);
      if (!got.length) return null;
      return { v: clamp(mean(got.map(function (g) { return g.v; }))), via: A[sys + 'Via'] || null, why: got.map(function (g) { return g.why; }).join(' ') };
    }
    var nameOf = {};
    SYSTEMS.forEach(function (s) { nameOf[s[0]] = s[1]; });
    var areas = AREAS.map(function (A) {
      var per = {}, vals = [], ups = [], downs = [];
      SYSTEMS.forEach(function (s) {
        var r = read(A, s[0]);
        if (r) { r.v = round1(r.v); per[s[0]] = r; vals.push(r.v); if (r.v >= 0.5) ups.push(s[1]); else if (r.v <= -0.5) downs.push(s[1]); }
      });
      var score = vals.length ? round1(mean(vals)) : 0, up = ups.length, down = downs.length;
      var level = score >= 0.8 ? 'Strong' : score <= -0.8 ? 'Weak' : 'Steady', T = TX[A.key], L = T[{ Strong: 1, Steady: 2, Weak: 3 }[level]];
      var agree = up && down ? 'Split' : up >= 2 || down >= 2 ? 'Agree' : 'Quiet';
      var sure = agree === 'Agree' ? cap(joinNames(up ? ups : downs)) + ' point the same way, so this is one of your firmer readings.'
        : agree === 'Split' ? joinNames(ups) + (up > 1 ? ' lean' : ' leans') + ' positive while ' + joinNames(downs) + (down > 1 ? ' lean' : ' leans') + ' negative. Treat this area as conditional: it may go well in some parts of your life and poorly in others.'
        : vals.length < 2 ? 'Only one system has a reading here, so hold this lightly.' : 'The signals here are mild, so your own choices will count for more than the chart.';
      return { key: A.key, group: A.group, isNew: !!A.isNew, label: A.label, cn: A.cn, score: score, level: level, agree: agree, count: vals.length, up: up, down: down, per: per,
               covers: T[0], meaning: L[0], steps: L.slice(1), sure: sure };
    });
    var sorted = areas.slice().sort(function (a, b) { return b.score - a.score; });
    return { areas: areas, groups: GROUPS, systems: SYSTEMS, usedQiZheng: !!qz, top: sorted.slice(0, 5), low: sorted.slice(-5).reverse(), split: areas.filter(function (a) { return a.agree === 'Split'; }) };
  }

  global.QPCombined = { compute: compute, AREAS: AREAS, SYSTEMS: SYSTEMS, GROUPS: GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
