/* QiPath Pro — Bazi depth engine.
 *
 * Implements the analytical frame of 滴天髓 (Di Tian Sui) together with the 調候 table
 * from 窮通寶鑑, the branch relations (刑冲合害會), the common 神煞, and a reading of the
 * five elements across the ordinary domains of a life.
 *
 * A caution kept in the code because it belongs in the reading too: these are interpretive
 * traditions with real internal logic, not predictive machinery. The engine reports what the
 * chart contains and what the classics say about that configuration. It does not claim to
 * know what will happen.
 */
(function (global) {
  'use strict';
  var C = global.QPCore;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ================= 十二長生 — the twelve stages ================= */

  var STAGES = ['長生','沐浴','冠帶','臨官','帝旺','衰','病','死','墓','絕','胎','養'];
  var STAGES_EN = ['Growth','Bathing','Capping','Office','Peak','Decline','Sickness',
                   'Death','Tomb','Extinction','Conception','Nurture'];
  // Strength each stage lends the stem sitting on it.
  var STAGE_POWER = [0.75, 0.35, 0.65, 1.00, 1.00, 0.45, 0.25, 0.15, 0.30, 0.10, 0.25, 0.45];
  // 長生 branch for each stem; yin stems run backwards through the cycle.
  var BIRTH_BRANCH = { 0:11, 1:6, 2:2, 3:9, 4:2, 5:9, 6:5, 7:0, 8:8, 9:3 };

  function stageOf(stem, branch) {
    var start = BIRTH_BRANCH[stem];
    var yin = C.STEM_YIN[stem] === 1;
    var i = yin ? mod(start - branch, 12) : mod(branch - start, 12);
    return { i: i, cn: STAGES[i], en: STAGES_EN[i], power: STAGE_POWER[i] };
  }

  /* ================= 調候 — climatic regulation (窮通寶鑑) ================= */
  /* Indexed [day master stem][month branch]. The first entry is the primary regulating
     god, the rest support it. This is what stops a technically balanced chart from being
     read as healthy when it is in fact frozen or parched. */
  var TIAO_HOU = {
    0: { 2:'丙癸', 3:'庚丙丁戊己', 4:'庚丁壬', 5:'癸丁庚', 6:'癸丁庚', 7:'癸丁庚',
         8:'庚丁壬', 9:'庚丁丙', 10:'庚甲丁壬癸', 11:'庚丁丙戊', 0:'丁庚丙', 1:'丁庚丙' },
    1: { 2:'丙癸', 3:'丙癸', 4:'癸丙戊', 5:'癸', 6:'癸丙', 7:'癸丙',
         8:'丙癸己', 9:'癸丙丁', 10:'癸辛', 11:'丙戊', 0:'丙', 1:'丙' },
    2: { 2:'壬庚', 3:'壬己', 4:'壬甲', 5:'壬庚癸', 6:'壬庚', 7:'壬庚',
         8:'壬戊', 9:'壬癸', 10:'甲壬', 11:'甲戊庚壬', 0:'壬戊己', 1:'壬甲' },
    3: { 2:'甲庚', 3:'庚甲', 4:'甲庚', 5:'甲庚', 6:'壬庚癸', 7:'甲壬庚',
         8:'甲丙庚戊', 9:'甲丙戊庚', 10:'甲庚戊', 11:'甲庚', 0:'甲庚', 1:'甲庚' },
    4: { 2:'丙甲癸', 3:'丙甲癸', 4:'甲丙癸', 5:'甲丙癸', 6:'壬甲丙', 7:'癸丙甲',
         8:'丙癸甲', 9:'丙癸', 10:'甲丙癸', 11:'甲丙', 0:'丙甲', 1:'丙甲' },
    5: { 2:'丙庚甲', 3:'甲癸丙', 4:'丙癸甲', 5:'癸丙', 6:'癸丙', 7:'癸丙',
         8:'丙癸', 9:'丙癸', 10:'甲丙癸', 11:'丙甲戊', 0:'丙甲戊', 1:'丙甲戊' },
    6: { 2:'戊甲丙丁', 3:'丁甲庚丙', 4:'甲丁壬癸', 5:'壬戊丙丁', 6:'壬癸', 7:'丁甲',
         8:'丁甲', 9:'丁甲丙', 10:'甲壬', 11:'丁丙', 0:'丁甲丙', 1:'丙丁甲' },
    7: { 2:'己壬庚', 3:'壬甲', 4:'壬甲', 5:'壬甲癸', 6:'壬己癸', 7:'壬庚甲',
         8:'壬甲戊', 9:'壬甲', 10:'壬甲', 11:'壬丙', 0:'丙戊壬甲', 1:'丙壬戊己' },
    8: { 2:'庚丙戊', 3:'戊辛庚', 4:'甲庚', 5:'壬辛庚癸', 6:'癸庚辛', 7:'辛甲',
         8:'戊丁', 9:'甲庚', 10:'甲丙', 11:'戊庚丙', 0:'戊丙', 1:'丙丁甲' },
    9: { 2:'辛丙', 3:'庚辛', 4:'丙辛甲', 5:'辛', 6:'庚壬癸', 7:'庚辛壬癸',
         8:'丁', 9:'辛丙', 10:'辛甲壬癸', 11:'庚辛戊丁', 0:'丙辛', 1:'丙丁' }
  };

  // Seasonal character of each month branch, which the regulating god is meant to correct.
  var CLIMATE = {
    2:['cold easing','Spring begins while the ground is still cold'],
    3:['temperate','Wood is at full strength and needs cutting or warming'],
    4:['damp','Earth is wet and heavy; drainage matters'],
    5:['warming','Fire rises; moisture is the check'],
    6:['hot','Peak Fire; water is the necessity'],
    7:['hot and damp','Scorched Earth; both water and ventilation are needed'],
    8:['drying','Metal begins; Fire tempers it'],
    9:['crisp','Metal at full strength; Fire refines, Water cleans'],
    10:['dry','Earth is parched; moisture is the necessity'],
    11:['cold beginning','Water rises; warmth is the necessity'],
    0:['cold','Deep winter; Fire is the necessity above all'],
    1:['frozen','Frozen Earth; Fire thaws before anything else can work']
  };

  /* ================= branch relations ================= */

  var SIX_CLASH = [6,7,8,9,10,11,0,1,2,3,4,5];         // 六冲, index = branch
  var SIX_HARM  = [7,6,5,4,3,2,1,0,11,10,9,8];         // 六害 (穿)
  var SIX_DESTRUCTION = [9,4,11,6,1,8,3,10,5,0,7,2];   // 六破: 子酉 午卯 巳申 寅亥 辰丑 戌未

  // The Four Harms (四害): what each does, and what each pillar governs, for the notes.
  var HARM_KIND = {
    clash:       { cn: '沖', en: 'Clash', note: 'Head-on collision — sudden change, movement, breaks and confrontation; also the force that breaks a deadlock.' },
    punishment:  { cn: '刑', en: 'Punishment', note: 'Prolonged entanglement — disputes, legal or compliance trouble, self-sabotage.' },
    destruction: { cn: '破', en: 'Destruction', note: 'Fracture from the inside — broken promises, structures that fail, sudden severances.' },
    harm:        { cn: '害', en: 'Harm', note: 'Undermining — hidden opposition, jealousy, office politics and quiet betrayal.' }
  };
  var PILLAR_DOMAIN = { Year: 'family, elders and roots', Month: 'career, parents and the working environment',
                        Day: 'yourself and your spouse', Hour: 'children, projects and later life' };
  var SIX_UNION = {0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6}; // 六合
  var UNION_ELEM = {'0-1':2,'2-11':0,'3-10':1,'4-9':3,'5-8':4,'6-7':2};  // resulting element

  var THREE_UNION = [                                   // 三合局
    { set:[8,0,4],  elem:4, cn:'申子辰水局', en:'Water frame' },
    { set:[11,3,7], elem:0, cn:'亥卯未木局', en:'Wood frame' },
    { set:[2,6,10], elem:1, cn:'寅午戌火局', en:'Fire frame' },
    { set:[5,9,1],  elem:3, cn:'巳酉丑金局', en:'Metal frame' }
  ];
  var THREE_MEET = [                                    // 三會方
    { set:[2,3,4],  elem:0, cn:'寅卯辰東方木', en:'Eastern Wood' },
    { set:[5,6,7],  elem:1, cn:'巳午未南方火', en:'Southern Fire' },
    { set:[8,9,10], elem:3, cn:'申酉戌西方金', en:'Western Metal' },
    { set:[11,0,1], elem:4, cn:'亥子丑北方水', en:'Northern Water' }
  ];

  var PUNISH_GROUPS = [
    { set:[2,5,8], cn:'寅巳申 無恩之刑', en:'Punishment of ingratitude',
      note:'Favours and effort go unreturned; partnerships sour over who owed whom.' },
    { set:[1,10,7], cn:'丑戌未 恃勢之刑', en:'Punishment of relying on power',
      note:'Overreach through position or leverage; the ground gives way under the weight.' },
    { set:[0,3], cn:'子卯 無禮之刑', en:'Punishment of discourtesy',
      note:'Friction over manners and respect; small rudeness costs more than it should.' }
  ];
  var SELF_PUNISH = [4,6,9,11];                         // 辰午酉亥 自刑

  var STEM_UNION = {0:5,5:0,1:6,6:1,2:7,7:2,3:8,8:3,4:9,9:4};  // 天干五合
  var STEM_UNION_ELEM = {'0-5':2,'1-6':3,'2-7':4,'3-8':0,'4-9':1};
  var STEM_CLASH = {0:6,6:0,1:7,7:1,2:8,8:2,3:9,9:3};          // 天干相冲

  /* ================= 神煞 — the stars ================= */

  var NOBLEMAN = { 0:[1,7], 4:[1,7], 6:[1,7], 1:[0,8], 5:[0,8],
                   2:[11,9], 3:[11,9], 8:[3,5], 9:[3,5], 7:[6,2] };
  var ACADEMIC = { 0:5, 1:6, 2:8, 4:8, 3:9, 5:9, 6:11, 7:0, 8:2, 9:3 };  // 文昌
  var PROSPERITY = { 0:2, 1:3, 2:5, 4:5, 3:6, 5:6, 6:8, 7:9, 8:11, 9:0 }; // 祿神
  var BLADE = { 0:3, 2:6, 4:6, 6:9, 8:0 };                                 // 羊刃, yang stems
  var GOLDEN_CART = { 0:4, 1:5, 2:7, 4:7, 3:8, 5:8, 6:10, 7:11, 8:1, 9:2 };// 金輿
  var HEAVEN_VIRTUE = { 2:'丁', 3:'申', 4:'壬', 5:'辛', 6:'亥', 7:'甲',
                        8:'癸', 9:'寅', 10:'丙', 11:'乙', 0:'巳', 1:'庚' };
  var MONTH_VIRTUE = { 2:'丙',6:'丙',10:'丙', 8:'壬',0:'壬',4:'壬',
                       11:'甲',3:'甲',7:'甲', 5:'庚',9:'庚',1:'庚' };

  function triadKey(b) {
    if ([8,0,4].indexOf(b) >= 0) return 'water';
    if ([2,6,10].indexOf(b) >= 0) return 'fire';
    if ([5,9,1].indexOf(b) >= 0) return 'metal';
    return 'wood';
  }
  // 太極貴人 by day stem: 甲乙 子午, 丙丁 卯酉, 戊己 辰戌丑未, 庚辛 寅亥, 壬癸 巳申.
  var TAIJI = { 0:[0,6], 1:[0,6], 2:[3,9], 3:[3,9], 4:[4,10,1,7], 5:[4,10,1,7],
                6:[2,11], 7:[2,11], 8:[5,8], 9:[5,8] };
  var PEACH   = { water:9, fire:3, metal:6, wood:0 };   // 桃花 / 咸池
  var HORSE   = { water:2, fire:8, metal:11, wood:5 };  // 驛馬
  var CANOPY  = { water:4, fire:10, metal:1, wood:7 };  // 華蓋
  var GENERAL = { water:0, fire:6, metal:9, wood:3 };   // 將星
  var ROBBERY = { water:5, fire:11, metal:2, wood:8 };  // 劫煞
  var LOSS    = { water:11, fire:5, metal:8, wood:2 };  // 亡神
  var LONELY  = { 11:[2,10], 0:[2,10], 1:[2,10], 2:[5,1], 3:[5,1], 4:[5,1],
                  5:[8,4], 6:[8,4], 7:[8,4], 8:[11,7], 9:[11,7], 10:[11,7] }; // 孤辰,寡宿

  var STAR_META = {
    nobleman:   { cn:'天乙貴人', en:'Heavenly Nobleman', tone:'good',
      note:'Help arrives through people. Difficulties tend to resolve through an intermediary rather than through force.' },
    academic:   { cn:'文昌貴人', en:'Academic Star', tone:'good',
      note:'Study, writing and examination come more easily. Favours qualifications and intellectual work.' },
    prosperity: { cn:'祿神', en:'Prosperity Star', tone:'good',
      note:'A steady seat for the day master — self-sufficiency, and income that comes from one\u2019s own capability.' },
    heavenVirtue:{ cn:'天德貴人', en:'Heavenly Virtue', tone:'good',
      note:'Protection in adversity; harm is softened rather than avoided.' },
    monthVirtue:{ cn:'月德貴人', en:'Monthly Virtue', tone:'good',
      note:'Quiet protection and good standing; supports reputation.' },
    goldenCart: { cn:'金輿', en:'Golden Carriage', tone:'good',
      note:'Comfort through marriage or partnership; material ease arriving with another person.' },
    general:    { cn:'將星', en:'General Star', tone:'good',
      note:'Command and organising ability. Suits leading rather than assisting.' },
    peach:      { cn:'桃花', en:'Peach Blossom', tone:'mixed',
      note:'Attractiveness and social magnetism. Helps public-facing work; complicates commitment when other markers agree.' },
    horse:      { cn:'驛馬', en:'Travelling Horse', tone:'mixed',
      note:'Movement — relocation, travel, changes of post. Restless when the chart is otherwise unsettled.' },
    canopy:     { cn:'華蓋', en:'Canopy Star', tone:'mixed',
      note:'Solitary talent: art, research, philosophy, faith. Can read as detachment from ordinary company.' },
    blade:      { cn:'羊刃', en:'Goat Blade', tone:'caution',
      note:'Sharp force. Decisive and capable under pressure; prone to injury or overreach when the day master is already strong.' },
    robbery:    { cn:'劫煞', en:'Robbery Star', tone:'caution',
      note:'Loss through others or through haste. Guard assets and agreements.' },
    loss:       { cn:'亡神', en:'Loss Spirit', tone:'caution',
      note:'Things slip away quietly — attention, money, opportunity. Rewards carefulness.' },
    lonely:     { cn:'孤辰', en:'Solitary Star', tone:'caution',
      note:'A tendency to stand apart. Not misfortune, but company must be chosen deliberately.' },
    widow:      { cn:'寡宿', en:'Widow Star', tone:'caution',
      note:'Emotional self-containment; closeness takes longer to build.' }
  };

  function findStars(p, gender) {
    var out = [];
    var branches = [p.year.branch, p.month.branch, p.day.branch, p.hour.branch];
    var labels = ['Year','Month','Day','Hour'];
    var dm = p.day.stem;

    function add(key, at) {
      var m = STAR_META[key];
      var e = out.filter(function (x) { return x.key === key; })[0];
      if (e) { if (e.at.indexOf(at) < 0) e.at.push(at); return; }
      out.push({ key: key, cn: m.cn, en: m.en, tone: m.tone, note: m.note, at: [at] });
    }

    branches.forEach(function (b, i) {
      if ((NOBLEMAN[dm] || []).indexOf(b) >= 0) add('nobleman', labels[i]);
      if (ACADEMIC[dm] === b) add('academic', labels[i]);
      if (PROSPERITY[dm] === b) add('prosperity', labels[i]);
      if (BLADE[dm] === b) add('blade', labels[i]);
      if (GOLDEN_CART[dm] === b) add('goldenCart', labels[i]);
    });

    // Triad-based stars are taken from the year and day branches, as is usual.
    [p.year.branch, p.day.branch].forEach(function (base) {
      var k = triadKey(base);
      branches.forEach(function (b, i) {
        if (PEACH[k] === b) add('peach', labels[i]);
        if (HORSE[k] === b) add('horse', labels[i]);
        if (CANOPY[k] === b) add('canopy', labels[i]);
        if (GENERAL[k] === b) add('general', labels[i]);
        if (ROBBERY[k] === b) add('robbery', labels[i]);
        if (LOSS[k] === b) add('loss', labels[i]);
      });
    });

    var lw = LONELY[p.year.branch] || [];
    branches.forEach(function (b, i) {
      if (lw[0] === b) add('lonely', labels[i]);
      if (lw[1] === b) add('widow', labels[i]);
    });

    // Virtue stars sit on the month branch and may appear as a stem or a branch.
    var hv = HEAVEN_VIRTUE[p.month.branch];
    var mv = MONTH_VIRTUE[p.month.branch];
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      if (C.STEMS[q.stem] === hv || C.BRANCHES[q.branch] === hv) add('heavenVirtue', labels[i]);
      if (C.STEMS[q.stem] === mv) add('monthVirtue', labels[i]);
    });

    var order = { good: 0, mixed: 1, caution: 2 };
    out.sort(function (a, b) { return order[a.tone] - order[b.tone]; });
    void gender;
    return out;
  }

  /* ================= the Four Harms against an incoming pillar ================= */

  /**
   * Which of the Four Harms an incoming branch (a luck pillar, a year) makes with each natal
   * pillar. A clash is softened when the incoming branch also combines with another natal branch
   * (貪合忘沖, greed for combination forgets the clash).
   */
  function fourHarms(p, branch) {
    var pil = [p.year, p.month, p.day, p.hour], labels = ['Year', 'Month', 'Day', 'Hour'];
    var br = pil.map(function (q) { return q.branch; }), hits = [];
    var unionWith = br.map(function (b, i) { return SIX_UNION[branch] === b ? labels[i] : null; }).filter(Boolean);
    br.forEach(function (b, i) {
      var kinds = [];
      if (SIX_CLASH[branch] === b) kinds.push('clash');
      var pun = PUNISH_GROUPS.some(function (g) { return branch !== b && g.set.indexOf(branch) >= 0 && g.set.indexOf(b) >= 0; }) ||
                (branch === b && SELF_PUNISH.indexOf(b) >= 0);
      if (pun) kinds.push('punishment');
      if (SIX_DESTRUCTION[branch] === b) kinds.push('destruction');
      if (SIX_HARM[branch] === b) kinds.push('harm');
      kinds.forEach(function (k) {
        var soft = k === 'clash' && unionWith.some(function (u) { return u !== labels[i]; });
        hits.push({ kind: k, cn: C.BRANCHES[branch] + C.BRANCHES[b] + ' ' + HARM_KIND[k].cn, en: HARM_KIND[k].en,
          pillar: labels[i], softened: soft,
          note: HARM_KIND[k].note + ' It touches the ' + labels[i] + ' pillar: ' + PILLAR_DOMAIN[labels[i]] + '.' +
            (soft ? ' Softened: the incoming branch also combines with the ' + unionWith.join(' and ') +
              ' pillar (貪合忘沖), which distracts the clash.' : '') });
      });
    });
    return hits;
  }

  /** The Four Harms from the current luck pillar, this year and next year. */
  function timingHarms(user, today) {
    var t = today || new Date(), out = [];
    var bf = global.QPFib ? global.QPFib.bazi(user) : null, cur = bf && bf.current;
    if (cur) out.push({ label: 'Luck pillar ' + cur.pillar.cn + ' (' + cur.start.slice(0, 4) + '–' + cur.end.slice(0, 4) + ')',
      pillar: cur.pillar.cn, hits: fourHarms(user.pillars, cur.pillar.branch) });
    [t.getFullYear(), t.getFullYear() + 1].forEach(function (y) {
      var yp = C.fourPillars(y, 6, 1, 12, 0).year;
      out.push({ label: y + ' ' + yp.cn + ' year', pillar: yp.cn, hits: fourHarms(user.pillars, yp.branch) });
    });
    return out;
  }

  /* ================= personalised annual forecast ================= */

  var ORGANS = ['liver, gallbladder, tendons and eyes', 'heart, small intestine and circulation',
                'stomach, spleen and digestion', 'lungs, large intestine and skin', 'kidneys, bladder, bones and ears'];
  function round1(x) { return Math.round(x * 10) / 10; }
  function verdictOf(x) { return x >= 3 ? 'Expansive' : x >= 1 ? 'Supportive' : x > -1 ? 'Mixed' : x > -3 ? 'Testing' : 'Adverse'; }
  function isoJD(jd) { var A = global.QPAstro, g = A.jdToLocal ? A.jdToLocal(jd) : A.jdToGreg(jd);
    return g.y + '-' + (g.m < 10 ? '0' : '') + g.m + '-' + (g.d < 10 ? '0' : '') + Math.floor(g.d); }
  function dateJD(jd) { var A = global.QPAstro, g = A.jdToLocal ? A.jdToLocal(jd) : A.jdToGreg(jd); return { y: g.y, m: g.m, d: Math.floor(g.d) }; }

  /**
   * A personalised forecast for one solar year (立春 to 立春): the year pillar and its ten gods,
   * the luck pillar it runs under, Tai Sui, the Four Harms and combinations against the natal
   * pillars, the stars it activates, domain scores and the twelve solar months.
   */
  function annualForecast(user, year) {
    var A = global.QPAstro, F = global.QPFib, p = user.pillars, D = user.deep || analyse(p, user.gender);
    var dm = p.day.stem, natal = [p.year, p.month, p.day, p.hour], labels = ['Year', 'Month', 'Day', 'Hour'];
    var terms = A.termsForYear(year), lichun = terms[0].jd, nextLichun = A.termsForYear(year + 1)[0].jd;
    var mid = dateJD(lichun + 150), yp = C.fourPillars(mid.y, mid.m, mid.d, 12, 0).year;
    var fav = D.favourable, unf = D.unfavourable;

    // Ten gods of the year: the stem, and every hidden stem in the branch (main qi first).
    var stemGod = C.tenGod(dm, yp.stem);
    var hidden = C.HIDDEN[yp.branch].map(function (h) { return { stem: C.STEMS[h], god: C.tenGod(dm, h) }; });

    // The luck pillar that governs the middle of the year.
    var bf = F.bazi(user), midIso = mid.y + '-' + (mid.m < 10 ? '0' : '') + mid.m + '-' + (mid.d < 10 ? '0' : '') + mid.d;
    var luck = bf.luck.filter(function (x) { return x.start <= midIso && midIso < x.end; })[0] || null;

    // Score: 0.618 x year pillar + 0.382 x luck pillar, as in the Fibonacci timeline.
    var ys = F.scorePillar(yp, user), ls = luck ? F.scorePillar(luck.pillar, user) : { score: 0, notes: [] };
    var score = round1(0.618 * ys.score + 0.382 * ls.score);

    // Tai Sui and the Four Harms against the natal pillars.
    var harms = fourHarms(p, yp.branch);
    var tsKinds = harms.filter(function (h) { return h.pillar === 'Year'; }).map(function (h) { return h.kind; });
    var taiSui = yp.branch === p.year.branch ? { cn: '值太歲', en: 'Your own Tai Sui year', note: 'The year of your own sign: keep commitments modest and expect more scrutiny than usual.' }
      : tsKinds.indexOf('clash') >= 0 ? { cn: '沖太歲', en: 'Clashing Tai Sui', note: 'The year clashes your sign: movement, change and upheaval; plan moves rather than resist them.' }
      : tsKinds.indexOf('punishment') >= 0 ? { cn: '刑太歲', en: 'Punishing Tai Sui', note: 'Friction that drags on — disputes, paperwork and self-made trouble.' }
      : tsKinds.indexOf('destruction') >= 0 ? { cn: '破太歲', en: 'Breaking Tai Sui', note: 'Agreements and plans that crack from inside; check commitments twice.' }
      : tsKinds.indexOf('harm') >= 0 ? { cn: '害太歲', en: 'Harming Tai Sui', note: 'Quiet undermining — watch for people working against you out of sight.' }
      : SIX_UNION[yp.branch] === p.year.branch ? { cn: '合太歲', en: 'Combining with Tai Sui', note: 'The year combines with your sign: support and goodwill come more easily.' }
      : null;

    // Combinations: six unions, frames completed by the year branch, and the year stem with the Day Master.
    var unions = [];
    natal.forEach(function (q, i) {
      if (SIX_UNION[yp.branch] === q.branch) unions.push(C.BRANCHES[yp.branch] + C.BRANCHES[q.branch] + ' 合 with the ' + labels[i] + ' pillar');
    });
    THREE_UNION.concat(THREE_MEET).forEach(function (g) {
      if (g.set.indexOf(yp.branch) < 0) return;
      var have = g.set.filter(function (x) { return x !== yp.branch && natal.some(function (q) { return q.branch === x; }); });
      if (have.length === 2) unions.push(g.cn + ' completed by the year (' + C.ELEM_EN[g.elem] + ' ' + (fav.indexOf(g.elem) >= 0 ? 'favourable' : unf.indexOf(g.elem) >= 0 ? 'unfavourable' : 'neutral') + ')');
    });
    if (STEM_UNION[yp.stem] === dm) unions.push(C.STEMS[yp.stem] + C.STEMS[dm] + ' — the year stem combines with your Day Master');

    // Stars switched on by the year branch.
    var tri = triadKey(p.day.branch), stars = [];
    if ((NOBLEMAN[dm] || []).indexOf(yp.branch) >= 0) stars.push({ cn: '天乙貴人', en: 'Noble People', note: 'help from people with standing' });
    if (ACADEMIC[dm] === yp.branch) stars.push({ cn: '文昌', en: 'Intelligence Star', note: 'study, exams and writing go well' });
    if ((TAIJI[dm] || []).indexOf(yp.branch) >= 0) stars.push({ cn: '太極貴人', en: 'Taiji Nobleman', note: 'insight and spiritual interests' });
    if (PEACH[tri] === yp.branch) stars.push({ cn: '桃花', en: 'Peach Blossom', note: 'attraction, romance and popularity' });
    if (HORSE[tri] === yp.branch) stars.push({ cn: '驛馬', en: 'Sky Horse', note: 'travel, relocation and change of post' });

    // Domains: simple, explicit rules so the AI and the person can see why.
    var g = stemGod.i, gb = hidden[0].god.i;
    var has = function (set) { return set.indexOf(g) >= 0 || set.indexOf(gb) >= 0; };
    var elemOf = function (godSet) { return C.STEM_ELEM[[yp.stem].concat(C.HIDDEN[yp.branch]).filter(function (s) {
      return godSet.indexOf(C.tenGod(dm, s).i) >= 0; })[0]]; };
    var onPillar = function (lab) { return harms.filter(function (h) { return h.pillar === lab && !h.softened; }); };
    function dom(key, label) { return { key: key, label: label, score: 0, why: [] }; }
    var career = dom('career', 'Career'), wealth = dom('wealth', 'Wealth'), love = dom('relationships', 'Relationships'),
        health = dom('health', 'Health'), study = dom('study', 'Study and growth');
    function add(d, v, why) { d.score += v; d.why.push(why); }

    if (has([6, 7])) { var oe = elemOf([6, 7]); add(career, fav.indexOf(oe) >= 0 ? 1.5 : unf.indexOf(oe) >= 0 ? -0.5 : 0.5,
      'Officer/Killing (官殺) arrives — authority, promotion or pressure from above' + (fav.indexOf(oe) >= 0 ? ', and it is favourable' : unf.indexOf(oe) >= 0 ? ', but it is unfavourable' : '')); }
    if (has([3])) add(career, -0.5, 'Hurting Officer (傷官) — sharp ideas, friction with superiors');
    if (has([2])) add(career, 0.5, 'Eating God (食神) — output and creative work are rewarded');
    onPillar('Month').forEach(function (h) { add(career, h.kind === 'clash' ? -1 : -0.5, h.cn + ' on the Month pillar — change or strain in work'); });
    if (stars.some(function (s) { return s.en === 'Noble People'; })) add(career, 1, 'Noble People help this year');

    if (has([4, 5])) { var we = elemOf([4, 5]); add(wealth, fav.indexOf(we) >= 0 ? 1.5 : D.strong ? 1 : -0.5,
      'Wealth star (財) arrives' + (fav.indexOf(we) >= 0 ? ' and is favourable' : D.strong ? ' and a strong Day Master can hold it' : ' but a weak Day Master struggles to hold it')); }
    if (has([1])) add(wealth, -1, 'Rob Wealth (劫財) — money goes out through others; avoid guarantees and loans');
    if (has([2, 3]) && D.strong) add(wealth, 0.5, 'output feeds wealth');

    var spouseGods = user.gender === 'M' ? [4, 5] : [6, 7];
    if (has(spouseGods)) add(love, 1, 'the spouse star (' + (user.gender === 'M' ? '財' : '官') + ') appears');
    if (stars.some(function (s) { return s.en === 'Peach Blossom'; })) add(love, 1, 'Peach Blossom is active');
    if (SIX_UNION[yp.branch] === p.day.branch) add(love, 1.5, 'the year combines with your spouse palace');
    onPillar('Day').forEach(function (h) { add(love, h.kind === 'clash' ? -1.5 : -1, h.cn + ' on the spouse palace'); add(health, -0.5, h.cn + ' on the Day pillar'); });

    [yp.stem].forEach(function (s) { var e = C.STEM_ELEM[s]; if (unf.indexOf(e) >= 0) add(health, -1, C.ELEM_EN[e] + ' (unfavourable) in the year stem'); if (fav.indexOf(e) >= 0) add(health, 0.5, C.ELEM_EN[e] + ' (favourable) in the year stem'); });
    var be = C.BRANCH_ELEM[yp.branch]; if (unf.indexOf(be) >= 0) add(health, -1, C.ELEM_EN[be] + ' (unfavourable) in the year branch');
    var stressed = [yp.stem].map(function (s) { return C.STEM_ELEM[s]; }).concat([be]).filter(function (e) { return unf.indexOf(e) >= 0; })[0];
    var watchElem = stressed !== undefined ? stressed : D.dayMasterElem;

    if (has([8, 9])) { var re = elemOf([8, 9]); add(study, fav.indexOf(re) >= 0 ? 1.5 : 0.5, 'Resource (印) arrives — learning, mentors and qualifications'); }
    if (stars.some(function (s) { return s.en === 'Intelligence Star'; })) add(study, 1.5, 'the Intelligence Star is active');

    var domains = [career, wealth, love, health, study].map(function (d) {
      d.score = round1(Math.max(-3, Math.min(3, d.score)));
      if (!d.why.length) d.why.push('no strong signal this year');
      return d;
    });

    // The twelve solar months of the year, each from the 節 that opens it.
    var months = [];
    for (var k = 0; k < 12; k++) {
      var t0 = terms[k * 2], t1 = k < 11 ? terms[k * 2 + 2] : { jd: nextLichun };
      var md = dateJD(t0.jd + 0.6), mp = C.fourPillars(md.y, md.m, md.d, 12, 0).month;
      var ms = F.scorePillar(mp, user), mh = fourHarms(p, mp.branch).filter(function (h) { return !h.softened; });
      months.push({ k: k, pillar: mp.cn, start: isoJD(t0.jd + 0.6), end: isoJD(t1.jd - 0.4), term: t0.name,
        god: C.tenGod(dm, mp.stem), score: round1(0.618 * ms.score + 0.382 * ys.score),
        notes: ms.notes.concat(mh.map(function (h) { return h.cn + ' on the ' + h.pillar + ' pillar'; })) });
    }
    var ranked = months.slice().sort(function (a, b) { return b.score - a.score; });

    // The same twelve solar months on the Qimen month plates: where the person's Day Stem sits each
    // month. Both series start at 立春, so they pair month for month (checked by the month pillar).
    var qimenYear = null;
    try {
      var qa = global.QPQimen.qimenAnnual(user, year);
      months.forEach(function (m, k) {
        var q = qa.months[k];
        if (!q || q.pillar !== m.pillar) return;
        m.qimen = { seat: q.seat, dir: q.dir, gate: q.gate, star: q.star, deity: q.deity, score: q.score, why: q.why };
        var b = m.score, s = q.score;
        m.agree = b >= 1 && s >= 1 ? 'both favour' : b <= -1 && s <= -1 ? 'both caution'
          : (b >= 1 && s <= -1) || (b <= -1 && s >= 1) ? 'they disagree' : 'mixed';
      });
      qimenYear = { seat: qa.seat.num, dir: qa.seat.dir, gate: qa.seat.gate, star: qa.seat.star, deity: qa.seat.deity,
        seatScore: qa.seat.score, score: qa.score, verdict: qa.verdict,
        bestDirs: qa.bestDirs.map(function (d) { return d.dir; }), worstDirs: qa.worstDirs.map(function (d) { return d.dir; }) };
    } catch (e) { qimenYear = null; }

    return {
      qimenYear: qimenYear,
      year: year, pillar: yp, pillarCn: yp.cn, nayin: C.NAYIN ? C.NAYIN[C.sbIndex ? C.sbIndex(yp.stem, yp.branch) : 0] : '',
      zodiac: C.ZODIAC ? C.ZODIAC[yp.branch] : '', lichun: isoJD(lichun), ends: isoJD(nextLichun - 1),
      stemGod: stemGod, hidden: hidden, luck: luck, score: score, yearScore: ys.score, luckScore: ls.score,
      verdict: verdictOf(score), notes: ys.notes, taiSui: taiSui, harms: harms, unions: unions, stars: stars,
      domains: domains, healthWatch: { elem: C.ELEM_EN[watchElem], organs: ORGANS[watchElem] },
      months: months, best: ranked.slice(0, 3), worst: ranked.slice(-2).reverse()
    };
  }

  /* ================= relations present in the chart ================= */

  function findRelations(p) {
    var pil = [p.year, p.month, p.day, p.hour];
    var labels = ['Year','Month','Day','Hour'];
    var br = pil.map(function (q) { return q.branch; });
    var out = { clashes: [], harms: [], destructions: [], unions: [], punishments: [], frames: [],
                stemUnions: [], stemClashes: [] };

    for (var i = 0; i < 4; i++) {
      for (var j = i + 1; j < 4; j++) {
        var a = br[i], b = br[j];
        if (SIX_CLASH[a] === b) {
          out.clashes.push({ pair: labels[i] + '–' + labels[j],
            cn: C.BRANCHES[a] + C.BRANCHES[b] + ' 沖', en: 'Clash',
            note: clashNote(labels[i], labels[j]) });
        }
        if (SIX_HARM[a] === b) {
          out.harms.push({ pair: labels[i] + '–' + labels[j],
            cn: C.BRANCHES[a] + C.BRANCHES[b] + ' 害', en: 'Harm',
            note: 'A quieter friction than a clash — resentment, small betrayals, wear rather than rupture.' });
        }
        if (SIX_DESTRUCTION[a] === b) {
          out.destructions.push({ pair: labels[i] + '–' + labels[j],
            cn: C.BRANCHES[a] + C.BRANCHES[b] + ' 破', en: 'Destruction',
            note: 'Fracture from the inside between ' + PILLAR_DOMAIN[labels[i]] + ' and ' + PILLAR_DOMAIN[labels[j]] +
              ' — agreements that do not hold and structures that crack under load.' +
              (SIX_UNION[a] === b ? ' The same pair is also a Six Union: the bond holds on the surface while it weakens underneath.' : '') });
        }
        if (SIX_UNION[a] === b) {
          var ke = [Math.min(a, b), Math.max(a, b)].join('-');
          var el = UNION_ELEM[ke];
          out.unions.push({ pair: labels[i] + '–' + labels[j],
            cn: C.BRANCHES[a] + C.BRANCHES[b] + ' 合', en: 'Six Union',
            elem: el, elemCn: el !== undefined ? C.ELEM[el] : '',
            note: 'These two pillars bind. Matters of both are entangled — helpful when the bound element is favourable, sticky when it is not.' });
        }
        if (a === b && SELF_PUNISH.indexOf(a) >= 0) {
          out.punishments.push({ pair: labels[i] + '–' + labels[j],
            cn: C.BRANCHES[a] + C.BRANCHES[b] + ' 自刑', en: 'Self-punishment',
            note: 'Self-inflicted difficulty: repeating a pattern that is known to be costly.' });
        }
        var sa = pil[i].stem, sb = pil[j].stem;
        if (STEM_UNION[sa] === sb) {
          var sk = [Math.min(sa, sb), Math.max(sa, sb)].join('-');
          out.stemUnions.push({ pair: labels[i] + '–' + labels[j],
            cn: C.STEMS[sa] + C.STEMS[sb] + ' 合', en: 'Stem union',
            elem: STEM_UNION_ELEM[sk], elemCn: C.ELEM[STEM_UNION_ELEM[sk]],
            note: 'The two stems are drawn to each other; each is less freely available for its own work.' });
        }
        if (STEM_CLASH[sa] === sb) {
          out.stemClashes.push({ pair: labels[i] + '–' + labels[j],
            cn: C.STEMS[sa] + C.STEMS[sb] + ' 沖', en: 'Stem clash',
            note: 'Open opposition at the visible level of the chart — argument rather than undercurrent.' });
        }
      }
    }

    PUNISH_GROUPS.forEach(function (g) {
      var hit = g.set.filter(function (x) { return br.indexOf(x) >= 0; });
      if (hit.length >= (g.set.length === 2 ? 2 : 2)) {
        out.punishments.push({
          pair: hit.map(function (x) { return labels[br.indexOf(x)]; }).join('–'),
          cn: g.cn, en: g.en, full: hit.length === g.set.length,
          note: g.note + (hit.length === g.set.length
            ? ' All three branches are present, so this reads strongly.'
            : ' Two of three are present — partial, and activated when the third appears in a luck pillar or year.') });
      }
    });

    THREE_UNION.concat(THREE_MEET).forEach(function (g) {
      var hit = g.set.filter(function (x) { return br.indexOf(x) >= 0; });
      if (hit.length >= 2) {
        out.frames.push({ cn: g.cn, en: g.en, elem: g.elem, elemCn: C.ELEM[g.elem],
          complete: hit.length === 3,
          at: hit.map(function (x) { return labels[br.indexOf(x)]; }),
          note: hit.length === 3
            ? 'Complete. The chart leans heavily toward ' + C.ELEM_EN[g.elem] + '; treat that element as dominant.'
            : 'Half frame. It pulls toward ' + C.ELEM_EN[g.elem] + ' and completes when the third branch arrives.' });
      }
    });
    return out;
  }

  function clashNote(a, b) {
    var k = a + '–' + b;
    var m = {
      'Year–Month': 'Early environment and upbringing were unsettled; a break from family or origin.',
      'Year–Day':   'Tension between origin and self; distance from family, literal or emotional.',
      'Year–Hour':  'Difference in outlook between the older and younger generation.',
      'Month–Day':  'Career and home pull against each other; the parents\u2019 palace clashes the spouse palace.',
      'Month–Hour': 'Work and children, or work and later life, compete for the same energy.',
      'Day–Hour':   'Strain in the marriage or with children; the domestic sphere does not settle easily.'
    };
    return m[k] || 'Two pillars oppose each other; the matters they govern do not sit quietly together.';
  }

  /* ================= strength, 滴天髓 style ================= */

  /**
   * 得令 (season), 得地 (root), 得勢 (allies) assessed separately, as the classic does,
   * rather than collapsed into one count. A chart can be weak by season and strong by
   * root, and the reading differs.
   */
  function assessStrength(p) {
    var dm = p.day.stem, de = C.STEM_ELEM[dm];
    var mb = p.month.branch;

    var season = stageOf(dm, mb);
    var commanding = season.power >= 0.65;

    // Root: does the day master appear in the hidden stems of any branch?
    var roots = [];
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      var lab = ['Year','Month','Day','Hour'][i];
      C.HIDDEN[q.branch].forEach(function (h, hi) {
        if (C.STEM_ELEM[h] === de) {
          roots.push({ at: lab, branch: C.BRANCHES[q.branch], stem: C.STEMS[h],
                       main: hi === 0, weight: hi === 0 ? 1.0 : 0.4 });
        }
      });
    });
    var rooted = roots.reduce(function (a, r) { return a + r.weight; }, 0);

    // Allies: visible stems of the same or producing element.
    var res = mod(de - 1, 5);
    var allies = 0, allyList = [];
    [p.year, p.month, p.hour].forEach(function (q, i) {
      var e = C.STEM_ELEM[q.stem];
      if (e === de || e === res) {
        allies += 1;
        allyList.push(['Year','Month','Hour'][i] + ' ' + C.STEMS[q.stem]);
      }
    });

    var score = season.power * 3 + rooted * 1.6 + allies * 0.8;
    var strong = score >= 3.0;
    var extreme = score >= 6.2 ? 'very strong' : score <= 1.2 ? 'very weak' : null;

    return {
      season: season, commanding: commanding,
      roots: roots, rooted: Math.round(rooted * 10) / 10,
      allies: allies, allyList: allyList,
      score: Math.round(score * 10) / 10, strong: strong, extreme: extreme,
      verdict: (commanding ? '得令' : '失令') + ' · ' + (rooted > 0 ? '得地' : '無根') +
               ' · ' + (allies > 0 ? '得勢' : '無助')
    };
  }

  /* ================= 從格 — following structures ================= */

  function checkFollowing(p, strength, counts) {
    if (strength.rooted > 0.4 || strength.commanding) return null;
    var de = C.STEM_ELEM[p.day.stem];
    var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    var res = mod(de - 1, 5), out = mod(de + 1, 5),
        wealth = mod(de + 2, 5), officer = mod(de + 3, 5);
    var selfShare = (counts[de] + counts[res]) / total;
    if (selfShare > 0.22) return null;
    var dom = [
      { e: out, cn: '從兒格', en: 'Following the Output', share: counts[out] / total,
        note: 'The chart abandons self-assertion and flows into what it produces — creativity, craft, teaching, children.' },
      { e: wealth, cn: '從財格', en: 'Following Wealth', share: counts[wealth] / total,
        note: 'The chart yields to the wealth element. Money and material matters set the direction of the life.' },
      { e: officer, cn: '從殺格', en: 'Following the Officer', share: counts[officer] / total,
        note: 'The chart yields to authority. Advancement comes through structure, service and accepting external order.' }
    ].sort(function (a, b) { return b.share - a.share; })[0];
    if (dom.share < 0.38) return null;
    return { cn: dom.cn, en: dom.en, elem: dom.e, elemCn: C.ELEM[dom.e],
             elemEn: C.ELEM_EN[dom.e], share: Math.round(dom.share * 100), note: dom.note,
             caution: 'A following structure inverts the usual advice: the element that would ' +
               'normally be a threat becomes the one to support. Treat this reading as provisional ' +
               'until checked against lived experience.' };
  }

  /* ================= 病藥 and 通關 ================= */

  function diagnose(counts, de, strength) {
    var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    var share = counts.map(function (v) { return v / total; });
    var out = { disease: null, cure: null, bridge: null };

    var maxI = 0, minI = 0;
    share.forEach(function (v, i) {
      if (v > share[maxI]) maxI = i;
      if (v < share[minI]) minI = i;
    });

    if (share[maxI] > 0.39) {
      var drain = mod(maxI + 1, 5), control = mod(maxI + 3, 5);
      // 母慈滅子: an over-abundant resource smothers rather than nourishes.
      var smother = (maxI === mod(de - 1, 5)) && share[maxI] > 0.45;
      out.disease = {
        elem: maxI, elemCn: C.ELEM[maxI], elemEn: C.ELEM_EN[maxI],
        share: Math.round(share[maxI] * 100),
        cn: smother ? '母慈滅子' : '偏枯',
        en: smother ? 'The over-kind mother smothers the child' : 'Excess of one element',
        note: smother
          ? 'Support has become suffocation. Too much of what feeds you leaves nothing to be done with it — ' +
            'the remedy is an outlet, not more help.'
          : C.ELEM_EN[maxI] + ' dominates the chart. What is over-supplied stops being useful and starts being a burden.'
      };
      out.cure = {
        primary: smother ? mod(de + 1, 5) : drain,
        secondary: control,
        primaryCn: C.ELEM[smother ? mod(de + 1, 5) : drain],
        secondaryCn: C.ELEM[control],
        note: smother
          ? 'Give it somewhere to go: the element the day master produces is the release.'
          : 'Two remedies: drain the excess into what it produces, or control it directly. Draining is gentler and usually holds better.'
      };
    }

    // 通關: two strong elements in a controlling relationship, with the mediator absent.
    for (var a = 0; a < 5; a++) {
      var b = mod(a + 2, 5);
      if (share[a] > 0.26 && share[b] > 0.26) {
        var mid = mod(a + 1, 5);
        if (share[mid] < 0.12) {
          out.bridge = {
            from: a, to: b, via: mid,
            fromCn: C.ELEM[a], toCn: C.ELEM[b], viaCn: C.ELEM[mid],
            fromEn: C.ELEM_EN[a], toEn: C.ELEM_EN[b], viaEn: C.ELEM_EN[mid],
            note: C.ELEM_EN[a] + ' and ' + C.ELEM_EN[b] + ' are both strong and locked against ' +
              'each other, with almost no ' + C.ELEM_EN[mid] + ' between them. ' + C.ELEM_EN[mid] +
              ' is the bridge (通關): it converts the conflict into a chain instead of a standoff, ' +
              'and is worth more here than any amount of extra support.'
          };
          break;
        }
      }
    }
    void strength;
    return out;
  }

  /* ================= domain analysis ================= */

  var DOMAIN_DEF = [
    { key:'career', label:'Career and standing', cn:'事業',
      gods:['officer','output'], palace:'Month' },
    { key:'wealth', label:'Wealth and money', cn:'財帛',
      gods:['wealth','output'], palace:'Month' },
    { key:'relationships', label:'Relationships and marriage', cn:'婚姻',
      gods:['spouse'], palace:'Day' },
    { key:'health', label:'Health and vitality', cn:'健康',
      gods:['self'], palace:'Day' },
    { key:'education', label:'Education and learning', cn:'學業',
      gods:['resource','output'], palace:'Year' },
    { key:'family', label:'Family and origin', cn:'家庭',
      gods:['resource','peer'], palace:'Year' },
    { key:'children', label:'Children and legacy', cn:'子女',
      gods:['output'], palace:'Hour' }
  ];

  function analyseDomains(p, counts, strength, gender, stars, rel) {
    var de = C.STEM_ELEM[p.day.stem];
    var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    var idx = {
      peer: de, resource: mod(de - 1, 5), output: mod(de + 1, 5),
      wealth: mod(de + 2, 5), officer: mod(de + 3, 5)
    };
    var share = {};
    Object.keys(idx).forEach(function (k) { share[k] = counts[idx[k]] / total; });
    var strong = strength.strong;

    function level(v) { return v > 0.30 ? 'abundant' : v > 0.16 ? 'present' : v > 0.06 ? 'thin' : 'absent'; }
    function starsFor(keys) {
      return stars.filter(function (s) { return keys.indexOf(s.key) >= 0; });
    }
    var clashOn = {};
    rel.clashes.concat(rel.punishments).forEach(function (c) {
      (c.pair || '').split('–').forEach(function (x) { clashOn[x] = true; });
    });

    return DOMAIN_DEF.map(function (d) {
      var text = [], score = 50, relevant = [];

      if (d.key === 'career') {
        var o = share.officer, u = share.output;
        relevant = starsFor(['nobleman','general','prosperity','monthVirtue','canopy']);
        text.push('Career is read from the Officer element (' + C.ELEM_EN[idx.officer] +
          ', ' + level(o) + ') and the Output element (' + C.ELEM_EN[idx.output] + ', ' + level(u) + ').');
        if (o > 0.22 && strong) { score += 18;
          text.push('Structure and authority are well represented and you have the strength to carry them — this suits formal organisations, professional standing and roles with defined responsibility.'); }
        else if (o > 0.22 && !strong) { score -= 12;
          text.push('Authority outweighs the day master. Responsibility tends to arrive before capacity is ready; growth comes from building support before accepting more of it.'); }
        else if (u > 0.22) { score += 12;
          text.push('Output dominates over Officer. This is the self-directed pattern — craft, creation, teaching, independent practice — rather than the institutional one.'); }
        else { text.push('Neither Officer nor Output is prominent. Direction is not fixed by the chart, so it will be set by circumstance and choice; that is freedom as much as drift.'); }
        if (clashOn.Month) { score -= 8; text.push('The Month pillar is disturbed, which in this reading points to instability in occupation or workplace rather than in ability.'); }
      }

      else if (d.key === 'wealth') {
        var w = share.wealth;
        relevant = starsFor(['goldenCart','prosperity','robbery','loss','peach']);
        text.push('Wealth is read from ' + C.ELEM_EN[idx.wealth] + ' (' + level(w) +
          ') and from the Output that generates it (' + C.ELEM_EN[idx.output] + ', ' + level(share.output) + ').');
        if (w > 0.20 && strong) { score += 20;
          text.push('A strong day master with visible wealth can hold it. Earning and keeping are both supported.'); }
        else if (w > 0.28 && !strong) { score -= 15;
          text.push('Wealth is abundant but the day master is not strong enough to command it. The classical caution is 財多身弱 — money passes through rather than accumulating, and overextension is the risk to watch.'); }
        else if (w < 0.10) { score -= 6;
          text.push('The wealth element is thin. Income tends to follow effort directly rather than compounding; systems and salaried structure suit better than speculation.'); }
        if (share.output > 0.20 && w > 0.12) { score += 10;
          text.push('Output feeds Wealth here (食神生財), the most workable earning pattern in the classics: make something, then let it pay.'); }
        if (share.peer > 0.34) { score -= 10;
          text.push('Peers are heavy, which competes for the same wealth — partnership terms and shared money need to be explicit.'); }
      }

      else if (d.key === 'relationships') {
        var spouseElem = gender === 'M' ? idx.wealth : idx.officer;
        var spouseName = gender === 'M' ? 'Wealth' : 'Officer';
        var sShare = gender === 'M' ? share.wealth : share.officer;
        relevant = starsFor(['peach','goldenCart','lonely','widow','nobleman']);
        text.push('The spouse palace is the Day branch (' + C.BRANCHES[p.day.branch] +
          '), and the spouse star for a ' + (gender === 'M' ? 'man' : 'woman') + ' is the ' +
          spouseName + ' element, ' + C.ELEM_EN[spouseElem] + ' (' + level(sShare) + ').');
        if (sShare > 0.16 && sShare < 0.34) { score += 15;
          text.push('The spouse star is present in workable measure — relationships have material to work with without dominating the chart.'); }
        else if (sShare >= 0.34) { score -= 8;
          text.push('The spouse star is over-abundant. Relationships take up a disproportionate share of attention, and choosing carefully matters more than usual.'); }
        else { score -= 8;
          text.push('The spouse star is thin. Partnership is built deliberately rather than falling into place; this is not an absence of prospects, it is an absence of automatic ones.'); }
        if (clashOn.Day) { score -= 14;
          text.push('The Day pillar is clashed or punished. The classics read this as friction in the marriage palace — the remedy in practice is deliberate communication, not fatalism.'); }
        rel.unions.forEach(function (u) {
          if (u.pair.indexOf('Day') >= 0) { score += 8;
            text.push('A Six Union touches the Day pillar (' + u.cn + '), which softens the palace and favours binding commitments.'); }
        });
      }

      else if (d.key === 'health') {
        relevant = starsFor(['blade','heavenVirtue','monthVirtue']);
        var weakest = 0;
        for (var i = 1; i < 5; i++) if (counts[i] < counts[weakest]) weakest = i;
        var ORGAN = { 0:'liver and gallbladder, tendons, eyes',
                      1:'heart and small intestine, circulation',
                      2:'spleen and stomach, digestion',
                      3:'lungs and large intestine, skin',
                      4:'kidneys and bladder, bones, ears' };
        text.push('The scarcest element is ' + C.ELEM_EN[weakest] + ', traditionally associated with the ' +
          ORGAN[weakest] + '. In this frame a scarce element marks where the system is least resilient, not a diagnosis.');
        if (strength.extreme) { score -= 12;
          text.push('The day master is ' + strength.extreme + ', and the classics treat either extreme as harder on the constitution than a middling chart. Regularity of sleep, food and exercise does more here than any adjustment of surroundings.'); }
        else { score += 10; text.push('The day master sits near the middle, which is the condition the classics call 中和 — the most forgiving configuration.'); }
        if (clashOn.Day) { score -= 8; text.push('The Day pillar is disturbed, which is read as bearing on the body and on rest.'); }
        text.push('Nothing here is medical advice. Take symptoms to a doctor; use this only as a prompt about habits.');
      }

      else if (d.key === 'education') {
        var r = share.resource;
        relevant = starsFor(['academic','nobleman','canopy']);
        text.push('Learning is read from the Resource element (' + C.ELEM_EN[idx.resource] +
          ', ' + level(r) + ') with Output as the means of expressing it.');
        if (r > 0.20) { score += 18;
          text.push('Resource is well represented — study comes naturally, and formal qualification suits this chart.'); }
        else if (r < 0.10) { score -= 8;
          text.push('Resource is thin. Learning sticks better through doing than through reading; apprenticeship suits better than lecture.'); }
        if (share.output > 0.24 && r > 0.14) { score += 12;
          text.push('Output with Resource behind it (傷官配印) is the classic scholar-craftsman pattern: original work that is nonetheless disciplined.'); }
        if (starsFor(['academic']).length) { score += 10;
          text.push('The Academic Star is present, which the tradition ties directly to examinations and written work.'); }
      }

      else if (d.key === 'family') {
        relevant = starsFor(['nobleman','lonely','widow','heavenVirtue']);
        text.push('Origin and family are read chiefly from the Year pillar (' + p.year.cn +
          ') and the Resource element, ' + C.ELEM_EN[idx.resource] + ' (' + level(share.resource) + ').');
        if (clashOn.Year) { score -= 12;
          text.push('The Year pillar is clashed or punished — distance from the family of origin, whether by geography or by temperament.'); }
        else { score += 8; text.push('The Year pillar is undisturbed, which reads as a settled base to have come from.'); }
        if (share.peer > 0.30) text.push('Peers are strong: siblings, cousins and chosen family carry real weight in this chart.');
      }

      else {
        relevant = starsFor(['canopy','academic','peach']);
        text.push('Children and later life are read from the Hour pillar (' + p.hour.cn +
          ') and the Output element, ' + C.ELEM_EN[idx.output] + ' (' + level(share.output) + ').');
        if (share.output > 0.20) { score += 14;
          text.push('Output is well represented — a productive later life, whether through children, students or work that outlasts you.'); }
        else if (share.output < 0.08) { score -= 6;
          text.push('Output is thin, which the classics read as fewer descendants or a legacy carried through work rather than family.'); }
        if (clashOn.Hour) { score -= 10;
          text.push('The Hour pillar is disturbed, pointing to strain with children or an unsettled later period.'); }
      }

      score = Math.max(5, Math.min(95, score));
      return { key: d.key, label: d.label, cn: d.cn, score: score,
               band: score >= 68 ? 'Supported' : score >= 45 ? 'Workable' : 'Needs care',
               text: text, stars: relevant };
    });
  }

  /* ================= entry point ================= */

  function analyse(p, gender) {
    var dm = p.day.stem, de = C.STEM_ELEM[dm];

    // Weighted element census: visible stems full weight, hidden stems by position,
    // each branch's contribution scaled by the day master's stage in it.
    var counts = [0,0,0,0,0];
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      var w = i === 1 ? 1.3 : 1.0;              // the month commands the chart
      counts[C.STEM_ELEM[q.stem]] += w;
      C.HIDDEN[q.branch].forEach(function (h, hi) {
        counts[C.STEM_ELEM[h]] += w * (hi === 0 ? 0.9 : hi === 1 ? 0.45 : 0.25);
      });
    });

    var strength = assessStrength(p);
    var following = checkFollowing(p, strength, counts);
    var diag = diagnose(counts, de, strength);
    var stars = findStars(p, gender);
    var rel = findRelations(p);

    // 調候 — the climatic regulator for this day master in this month.
    var th = (TIAO_HOU[dm] || {})[p.month.branch] || '';
    var thStems = th.split('').map(function (ch) { return C.STEMS.indexOf(ch); })
                    .filter(function (x) { return x >= 0; });
    var thPresent = thStems.filter(function (s) {
      var visible = [p.year.stem, p.month.stem, p.day.stem, p.hour.stem].indexOf(s) >= 0;
      var hidden = [p.year.branch, p.month.branch, p.day.branch, p.hour.branch]
        .some(function (b) { return C.HIDDEN[b].indexOf(s) >= 0; });
      return visible || hidden;
    });
    var climate = CLIMATE[p.month.branch] || ['', ''];

    // Favourable elements: strength first, then adjusted by the regulator and the cure.
    var res = mod(de - 1, 5), out = mod(de + 1, 5),
        wealth = mod(de + 2, 5), officer = mod(de + 3, 5);
    var fav, unfav;
    if (following) {
      // A following chart (從格) goes with the dominant element: favour it and the element that
      // produces it; the Day Master's own element and its resource fight the flow.
      fav = [following.elem, mod(following.elem + 4, 5)];
      unfav = [de, res];
    } else if (strength.strong) {
      fav = [out, wealth, officer]; unfav = [res, de];
    } else {
      fav = [res, de]; unfav = [wealth, officer, out];
    }
    if (diag.bridge && fav.indexOf(diag.bridge.via) < 0) fav = [diag.bridge.via].concat(fav);
    var thElems = thStems.map(function (s) { return C.STEM_ELEM[s]; });
    if (thElems.length && fav.indexOf(thElems[0]) < 0 && unfav.indexOf(thElems[0]) < 0) {
      fav = fav.concat([thElems[0]]);
    }
    fav = fav.filter(function (v, i, a) { return a.indexOf(v) === i; });
    unfav = unfav.filter(function (v, i, a) { return a.indexOf(v) === i && fav.indexOf(v) < 0; });   // never both

    var domains = analyseDomains(p, counts, strength, gender, stars, rel);

    var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    return {
      dayMaster: dm, dayMasterElem: de,
      dayMasterCn: C.STEMS[dm] + C.ELEM[de],
      dayMasterEn: C.STEMS_EN[dm] + ' ' + C.ELEM_EN[de],
      counts: counts.map(function (v) { return Math.round(v * 10) / 10; }),
      shares: counts.map(function (v) { return Math.round(v / total * 100); }),
      strength: strength, strong: strength.strong,
      following: following, diagnosis: diag,
      tiaoHou: { raw: th, stems: thStems.map(function (s) { return C.STEMS[s]; }),
                 present: thPresent.map(function (s) { return C.STEMS[s]; }),
                 satisfied: thPresent.length > 0,
                 climate: climate[0], climateNote: climate[1],
                 elems: thElems, elemsCn: thElems.map(function (e) { return C.ELEM[e]; }) },
      favourable: fav, unfavourable: unfav,
      favourableCn: fav.map(function (e) { return C.ELEM[e]; }),
      favourableEn: fav.map(function (e) { return C.ELEM_EN[e]; }),
      stars: stars, relations: rel, domains: domains,
      stages: ['Year','Month','Day','Hour'].map(function (lab, i) {
        var q = [p.year, p.month, p.day, p.hour][i];
        var st = stageOf(dm, q.branch);
        return { pillar: lab, branch: C.BRANCHES[q.branch], cn: st.cn, en: st.en, power: st.power };
      }),
      voids: C.voidBranches(p.day.i).map(function (b) { return C.BRANCHES[b]; })
    };
  }

  /* ================= 合婚 — two charts together ================= */

  /*
   * Compatibility of two people, read the classical way: the two Day Masters, whether each chart supplies
   * the other's favourable elements, the day branches (the spouse palace) and year branches, Peach Blossom
   * and the romance stars (紅鸞 天喜) across the charts, and the spouse star. Every finding carries what it
   * means in everyday words and what to do, because the person reading it is rarely a practitioner.
   * opts: { type: 'partner'|'family'|'friend'|'business', intimacy: bool, year }.
   */
  var ELEM_PLAIN = ['growth, plans and encouragement', 'warmth, enthusiasm and affection',
    'stability, reliability and patience', 'structure, decisiveness and keeping promises',
    'calm, adaptability and emotional depth'];
  // Everyday shared activities that bring an element into a relationship.
  var ELEM_ACT = ['time outdoors among trees and greenery, learning something new together',
    'sunshine, lively outings with friends, warm lighting and colours at home',
    'cooking and eating at home together, gardening, keeping steady shared routines',
    'tidying and planning together, music, clear agreements kept on both sides',
    'walks by water, quiet unhurried conversation, rest and good sleep'];
  var GOD_PLAIN = {
    '比肩': 'an equal and companion — easy understanding, side by side',
    '劫财': 'a lively equal — stimulating, sometimes competitive',
    '食神': 'someone you enjoy and relax with — easy, playful company',
    '伤官': 'someone who brings out your expressive, unconventional side',
    '偏财': 'someone exciting and generous, a little unpredictable',
    '正财': 'someone steady and loyal whom you care for and provide for',
    '七杀': 'someone intense and magnetic who challenges you',
    '正官': 'someone dependable who brings structure and respect',
    '偏印': 'an unconventional, thoughtful influence — deep but at times distant',
    '正印': 'a nurturing, protective presence who looks after you'
  };
  // 紅鸞 counts back from 卯 by the year branch; 天喜 sits opposite it.
  function romanceStars(yb) { var hl = mod(3 - yb, 12); return { hongLuan: hl, tianXi: mod(hl + 6, 12) }; }
  function peachOf(p) {
    return [PEACH[triadKey(p.year.branch)], PEACH[triadKey(p.day.branch)]].filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  // How two branches relate: the strongest single relation, best first, then the frictions.
  function branchLink(x, y) {
    if (SIX_UNION[x] === y) return { kind: 'union', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 六合' };
    if (x !== y && THREE_HARMONY_SET(x).indexOf(y) >= 0) return { kind: 'triad', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 三合' };
    if (SIX_CLASH[x] === y) return { kind: 'clash', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 沖' };
    if (SIX_HARM[x] === y) return { kind: 'harm', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 害' };
    if ((x === y && SELF_PUNISH.indexOf(x) >= 0) ||
        (x !== y && PUNISH_GROUPS.some(function (g) { return g.set.indexOf(x) >= 0 && g.set.indexOf(y) >= 0; }))) {
      return { kind: 'punish', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 刑' };
    }
    if (SIX_DESTRUCTION[x] === y) return { kind: 'destruction', cn: C.BRANCHES[x] + C.BRANCHES[y] + ' 破' };
    if (x === y) return { kind: 'same', cn: C.BRANCHES[x] + C.BRANCHES[y] };
    return null;
  }
  function THREE_HARMONY_SET(b) {
    var t = THREE_UNION.filter(function (u) { return u.set.indexOf(b) >= 0; })[0];
    return t ? t.set : [];
  }
  // Average share of a set of elements in a chart, in percent.
  function avgShare(D, elems) {
    if (!elems.length) return 0;
    return elems.reduce(function (s, e) { return s + D.shares[e]; }, 0) / elems.length;
  }

  /*
   * One person's desire and intimacy, read from the chart: drive (Fire, Peach Blossom, the output gods 食神/伤官 and the
   * Day Master's strength for stamina), who initiates (a yang Day Master leads, a yin one responds), pace (the dominant
   * element), what arouses and what cools them, the touch and setting that suit them, and their best hours of the day
   * (the double-hours of their favourable elements, kept to morning and evening). Frank and specific, never graphic.
   */
  var DESIRE_ELEM = [
    { pace: 'quick to warm and keen on spontaneity; build-up can be short but should feel playful',
      arouses: 'novelty and play — a new place, a surprise, being admired and encouraged, laughter before closeness',
      cools: 'routine, being pressured or rushed into a fixed script, and criticism of their ideas',
      touch: 'playful, exploratory touch; a light back or shoulder massage that turns into something more',
      setting: 'fresh air and green — an open window, plants, a weekend away or a different room',
      hours: 'early morning (05:00–09:00)' },
    { pace: 'fast and intense, but needs the fire kept fed — passion flares quickly and fades if ignored',
      arouses: 'open desire and admiration — eye contact, compliments on how they look, being wanted out loud, attractive clothes and lighting',
      cools: 'coldness, indifference, being ignored or criticised just before closeness',
      touch: 'warm, confident touch; kissing and closeness face to face; candlelight on skin',
      setting: 'warm low light, candles, red or pink fabrics, a warm room',
      hours: 'late morning to midday (09:00–13:00) or a lively evening' },
    { pace: 'slow to warm and needs a long, unhurried build-up and plenty of foreplay; once comfortable, very steady',
      arouses: 'comfort and security — a good meal together, being looked after, reassurance, familiar rituals',
      cools: 'rushing, insecurity, mess and worries left unspoken',
      touch: 'long, slow full-body massage with warm oil (sandalwood or vanilla), cuddling before anything else',
      setting: 'a tidy, comfortable bed, soft throws, warm earthy colours',
      hours: 'after a relaxed meal; the early evening (19:00–21:00)' },
    { pace: 'considered rather than spontaneous; enjoys anticipation — knowing in advance that time together is planned',
      arouses: 'respect, quality and care — clean sheets, a fresh scent, a thoughtful gift, being appreciated for what they do',
      cools: 'sloppiness, crude remarks, untidiness and broken promises',
      touch: 'precise, attentive touch; taking time over the neck, hands and back',
      setting: 'clean and uncluttered, white or silver tones, a fresh scent such as white musk or lily',
      hours: 'late afternoon to early evening (15:00–19:00)' },
    { pace: 'slow and deep; needs emotional connection before physical closeness, and lingering afterwards',
      arouses: 'emotional closeness and a little mystery — quiet talk, whispered words, being understood, a bath or shower together',
      cools: 'pressure, emotional distance, arguments left unresolved, bright harsh light',
      touch: 'slow, flowing, gentle touch; holding and stroking rather than hurry; staying close afterwards',
      setting: 'dim or dark, a bath or warm water, soft music, deep blue or black fabrics',
      hours: 'late night (21:00–01:00)' }
  ];
  var GOD_DESIRE = {
    '食神': 'enjoys pleasure for its own sake and is relaxed and sensual about it',
    '伤官': 'is adventurous and expressive, likes to try new things and to talk about what they want',
    '七杀': 'enjoys intensity, and is drawn to a partner who is confident and takes the lead',
    '正官': 'values privacy, trust and commitment first; closeness follows respect',
    '偏印': 'needs a mental and emotional connection before desire switches on',
    '正印': 'responds to tenderness, care and feeling safe',
    '偏财': 'is generous and spontaneous, enjoys spoiling and being spoiled',
    '正财': 'is loyal and steady, shows desire through consistent attention',
    '比肩': 'wants an equal partnership in closeness — give and take, neither leading all the time',
    '劫财': 'can be competitive and intense, enjoys playful challenge'
  };
  /*
   * One adult's sexual profile, read from the chart: libido (Fire, Peach Blossom 咸池, the output gods 食神/伤官, Day
   * Master strength), sexual style and what turns them on or off (the strongest element), whether they lead or follow
   * in bed (yang Day Master and the self/output gods lead; resource and officer gods follow), how vocal they are (食伤
   * talk, 官印 keep it private), foreplay needs and stamina. Frank about sex; never a description of acts or anatomy.
   */
  var SEX_ELEM = [
    { style: 'playful and experimental — likes variety, laughter and trying something new',
      on: 'novelty: a new place or a new idea, flirting through the day, being told they are desirable, a little challenge',
      off: 'sex that has become the same routine, being rushed or pressured, criticism',
      foreplay: 'a moderate build-up that feels playful rather than scripted' },
    { style: 'passionate and visual — intense, spontaneous, and turned on by being wanted',
      on: 'being openly desired: eye contact, compliments on their body, lingerie or attractive clothes, warm light, spontaneity',
      off: 'coldness, indifference, criticism of their looks, sex that feels like a duty',
      foreplay: 'a short build-up is fine, but heat has to be there from the start' },
    { style: 'sensual and slow — touch-led, comfort-seeking, steady once relaxed',
      on: 'being pampered: a long massage, a warm bed, a good meal first, slow undressing, feeling secure',
      off: 'rushing, an untidy room, worries left unspoken, feeling used',
      foreplay: 'a long, unhurried build-up — plenty of foreplay and touch before sex' },
    { style: 'controlled and discerning — reserved at first, intense once trust and anticipation are there',
      on: 'anticipation and quality: knowing in advance that the night is planned, clean sheets, a fresh scent, respect and appreciation',
      off: 'crude remarks, sloppiness, an untidy space, broken promises',
      foreplay: 'a deliberate build-up; anticipation through the day counts as foreplay' },
    { style: 'deep and emotional — sex is about merging, and connection comes first',
      on: 'emotional closeness: talking first, whispered words, dim light or darkness, a bath or shower together, tenderness',
      off: 'pressure, emotional distance, an argument left unresolved, harsh light',
      foreplay: 'a slow, emotionally connected build-up, and staying close afterwards' }
  ];
  function sexualProfile(x) {
    var D = x.deep, p = x.pillars, dm = p.day.stem, q = intimacyProfile(x);
    var top = D.shares.indexOf(Math.max.apply(null, D.shares)), el = SEX_ELEM[top];
    var gods = {};
    [p.year.stem, p.month.stem, p.hour.stem].concat([p.year, p.month, p.day, p.hour].map(function (r) { return C.HIDDEN[r.branch][0]; }))
      .forEach(function (s) { var g = C.tenGod(dm, s).cn; gods[g] = (gods[g] || 0) + 1; });
    var g = function (k) { return gods[k] || 0; };
    var lead = (C.STEM_YIN[dm] === 0 ? 1 : -0.5) + 0.5 * (g('比肩') + g('劫财') + g('伤官')) - 0.5 * (g('正印') + g('偏印') + g('正官'));
    var vocal = g('食神') + g('伤官') - g('正官') - g('正印');
    var peachSelf = D.stars.some(function (s) { return s.key === 'peach' && (s.at.indexOf('Day') >= 0 || s.at.indexOf('Hour') >= 0); });
    var libido = q.level === 'high' ? 'High' : q.level === 'moderate' ? 'Moderate' : 'Lower';
    return {
      name: x.name, element: C.ELEM_EN[top], level: q.level, lead: lead,
      libido: libido + ' libido — ' + (q.level === 'high' ? 'wants sex often and feels its absence quickly' : q.level === 'moderate' ? 'a steady appetite that rises with closeness'
        : 'desire comes when the mood and connection are right, rather than on its own') + ' (' + q.drivePlain.replace(/^[^(]*\(/, '').replace(/\)\.$/, '') + ').',
      style: upper1(el.style) + '.',
      on: upper1(el.on) + '.', off: upper1(el.off) + '.', foreplay: upper1(el.foreplay) + '.',
      role: lead >= 1 ? 'Tends to lead in bed — likes to initiate and set the pace.' : lead <= -0.5 ? 'Tends to follow in bed — enjoys a partner who takes the lead and sets the pace.'
        : 'Switches between leading and following, depending on the mood.',
      intensity: g('七杀') ? 'Enjoys intensity and a strong, confident partner (七杀).' : '',
      voice: vocal >= 1 ? 'Expressive — enjoys talking about sex, saying what they want, and hearing it.' : vocal <= -1 ? 'Private — prefers to show rather than say; needs trust before talking about sex.'
        : 'Talks about sex when asked, more easily in a relaxed moment than in the moment itself.',
      magnetism: peachSelf ? 'Strong sexual magnetism: Peach Blossom (咸池) sits close to the self, so being desired matters a great deal to them.' : '',
      stamina: q.stamina, hours: q.hours
    };
    function upper1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  }
  // Age in whole years on a date, from the birth record.
  function ageOn(b, t) { return t.getFullYear() - b.y - ((t.getMonth() + 1 < b.m || (t.getMonth() + 1 === b.m && t.getDate() < b.d)) ? 1 : 0); }

  function intimacyProfile(x) {
    var D = x.deep, p = x.pillars, dm = p.day.stem;
    var top = D.shares.indexOf(Math.max.apply(null, D.shares)), el = DESIRE_ELEM[top];
    // The strongest ten god among the visible stems and the branches' main qi.
    var gods = {};
    [p.year.stem, p.month.stem, p.hour.stem].concat([p.year, p.month, p.day, p.hour].map(function (q) { return C.HIDDEN[q.branch][0]; }))
      .forEach(function (s) { var g = C.tenGod(dm, s).cn; gods[g] = (gods[g] || 0) + 1; });
    var mainGod = Object.keys(gods).filter(function (g) { return GOD_DESIRE[g]; }).sort(function (u, v) { return gods[v] - gods[u]; })[0];
    var peach = D.stars.some(function (s) { return s.key === 'peach'; });
    var output = (gods['食神'] || 0) + (gods['伤官'] || 0);
    var drive = D.shares[1] / 10 + (peach ? 1 : 0) + output * 0.5 + (D.strong ? 0.5 : -0.5);
    var level = drive >= 3.5 ? 'high' : drive >= 2 ? 'moderate' : 'gentle';
    var yang = C.STEM_YIN[dm] === 0;
    // Favourable-element hours; a weaker Day Master tires late, so late night drops out when there is another choice.
    var hoursList = D.favourable.map(function (e) { return DESIRE_ELEM[e].hours; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    if (!D.strong && hoursList.length > 1) hoursList = hoursList.filter(function (h) { return h.indexOf('late night') < 0; });
    hoursList = hoursList.slice(0, 2);
    return {
      hoursList: hoursList,
      name: x.name, level: level, drive: Math.round(drive * 10) / 10, element: C.ELEM_EN[top], yang: yang,
      drivePlain: (level === 'high' ? 'Strong desire' : level === 'moderate' ? 'Moderate, steady desire' : 'Gentle desire that needs the right mood') +
        ' (Fire ' + D.shares[1] + '%' + (peach ? ', Peach Blossom' : '') + (output ? ', ' + output + ' output star' + (output > 1 ? 's' : '') + ' 食傷' : '') + ').',
      initiates: yang ? 'tends to initiate directly and likes to be asked plainly' : 'tends to respond rather than initiate, and likes to be invited and courted',
      pace: el.pace, arouses: el.arouses, cools: el.cools, touch: el.touch, setting: el.setting,
      hours: hoursList.join(' or '),
      god: mainGod ? x.name + ' ' + GOD_DESIRE[mainGod] + ' (' + mainGod + ').' : '',
      stamina: D.strong ? 'Good stamina — can enjoy longer, more energetic closeness.' :
        'Tires more easily — closeness works best when rested, earlier in the evening rather than late, and without pressure to perform.'
    };
  }

  function compatibility(a, b, opts) {
    opts = opts || {};
    var type = opts.type || 'partner', partner = type === 'partner';
    var A = a.deep, B = b.deep, pa = a.pillars, pb = b.pillars;
    var na = a.name, nb = b.name, items = [], intimacy = [], score = 0;
    function add(list, o) { list.push(o); return o; }
    var daily = partner ? 'home life' : 'day-to-day dealings';

    // 1. The two Day Masters: each person's core nature.
    var da = pa.day.stem, db = pb.day.stem, ea = A.dayMasterElem, eb = B.dayMasterElem, dm;
    if (STEM_UNION[da] === db) {
      score += 2;
      dm = { tone: 'good', plain: 'There is a natural pull between you: your core natures combine (' + C.STEMS[da] + C.STEMS[db] +
        ' 天干五合), one of the classic signs of a strong bond.', todo: 'Keep the pull alive with shared goals and shared routines.' };
    } else if (STEM_CLASH[da] === db) {
      score -= 2;
      dm = { tone: 'caution', plain: 'Your core natures pull in opposite directions (' + C.STEMS[da] + C.STEMS[db] +
        ' 天干相冲): different pace, different priorities.', todo: 'Agree who leads in which area, and let go of winning every decision.' };
    } else if (ea === eb) {
      score += 1;
      dm = { tone: 'good', plain: 'You share the same element (' + C.ELEM_EN[ea] + '), so you understand each other easily — but you can end up competing.',
        todo: 'Give each person an area where they lead and the other cheers them on.' };
    } else if (C.produces(ea, eb) || C.produces(eb, ea)) {
      var giver = C.produces(ea, eb) ? a : b, taker = giver === a ? b : a;
      score += 1;
      dm = { tone: 'good', plain: giver.name + ' naturally supports and nurtures ' + taker.name + ' (' + C.ELEM_EN[giver.deep.dayMasterElem] +
        ' feeds ' + C.ELEM_EN[taker.deep.dayMasterElem] + ').',
        todo: taker.name + ' should show appreciation and give back in other ways; ' + giver.name + ' should watch for running on empty.' };
    } else {
      var boss = C.controls(ea, eb) ? a : b, other = boss === a ? b : a;
      var holds = other.deep.strong;
      score += holds ? 0 : -1;
      dm = { tone: holds ? 'mixed' : 'caution', plain: boss.name + ' tends to direct or press on ' + other.name + ' (' + C.ELEM_EN[boss.deep.dayMasterElem] +
        ' controls ' + C.ELEM_EN[other.deep.dayMasterElem] + '). ' + (holds ? other.name + '\'s chart is strong enough to take it, so it reads as healthy challenge.'
        : other.name + '\'s chart is on the weaker side, so it can feel like pressure.'),
        todo: boss.name + ' softens how advice and decisions are delivered; ' + other.name + ' keeps their own sources of support — friends, rest, interests.' };
    }
    dm.title = 'Your core natures'; dm.cn = '日主 ' + C.STEMS[da] + ' · ' + C.STEMS[db];
    add(items, dm);

    // 2. Does each chart supply what the other needs? (favourable elements, 用神)
    function supply(x, y) {
      var s = Math.round(avgShare(x.deep, y.deep.favourable) - avgShare(x.deep, y.deep.unfavourable));
      var needs = y.deep.favourable.slice(0, 2).map(function (e) { return C.ELEM_EN[e] + ' (' + ELEM_PLAIN[e] + ')'; }).join(' and ');
      var acts = ELEM_ACT[y.deep.favourable[0]];
      var o = { title: 'What ' + x.name + ' brings ' + y.name, cn: '用神 ' + y.deep.favourableCn.join(''), net: s };
      if (s >= 8) {
        score += 2; o.tone = 'good';
        o.plain = x.name + ' is rich in what ' + y.name + ' needs most — ' + needs + '. Being together tends to steady and lift ' + y.name + '.';
        o.todo = 'Lean on it: ' + y.name + ' can bring decisions and worries to ' + x.name + ', who is naturally good for them.';
      } else if (s >= 0) {
        score += 1; o.tone = 'mixed';
        o.plain = x.name + ' brings some of what ' + y.name + ' needs (' + needs + '), though not strongly.';
        o.todo = 'Add the missing qualities on purpose with shared activities: ' + acts + '.';
      } else {
        score -= 1; o.tone = 'caution';
        o.plain = x.name + '\'s chart leans towards elements that tire ' + y.name + ', without meaning to. ' + y.name + ' may feel drained after long stretches together.';
        o.todo = y.name + ' needs regular time to recharge alone; together, choose activities that restore ' + y.name + ': ' + acts + '.';
      }
      return o;
    }
    add(items, supply(a, b)); add(items, supply(b, a));

    // 3. Day branches: the spouse palace, how daily life together feels.
    var dl = branchLink(pa.day.branch, pb.day.branch), dayItem = { title: partner ? 'Living together' : 'Day to day', cn: '日支 ' + C.BRANCHES[pa.day.branch] + ' · ' + C.BRANCHES[pb.day.branch] };
    var DAY_TEXT = {
      union: [2, 'good', 'Your ' + daily + ' fit together easily (' + (dl && dl.cn) + ').', 'Protect the easy routines you build; they are the backbone of the relationship.'],
      triad: [1, 'good', 'You work well as a team in ' + daily + ' (' + (dl && dl.cn) + ').', 'Take on shared projects — you do better together than apart.'],
      clash: [-2, 'caution', 'Friction in ' + daily + ' (' + (dl && dl.cn) + '): different routines and a strong need for personal space.',
        'Build in personal space and separate routines, and agree ground rules for shared matters before they become arguments.'],
      harm: [-1, 'caution', 'Quiet misunderstandings (' + (dl && dl.cn) + '): small hurts can build up unsaid.', 'Say things plainly rather than assuming; check in regularly.'],
      punish: [-1, 'caution', 'The same disagreements tend to come back (' + (dl && dl.cn) + ').', 'When an argument repeats, solve the underlying issue rather than the incident.'],
      destruction: [-1, 'mixed', 'Small cracks (' + (dl && dl.cn) + '): plans can come undone over small things.', 'Follow through on small promises; they matter more than usual.'],
      same: [1, 'mixed', 'Very similar habits in ' + daily + ' (' + (dl && dl.cn) + ').', 'Similar is comfortable; plan some variety so things do not go flat.']
    };
    if (dl) {
      var dt = DAY_TEXT[dl.kind]; score += dt[0];
      dayItem.tone = dt[1]; dayItem.plain = dt[2]; dayItem.todo = dt[3];
    } else {
      dayItem.tone = 'mixed'; dayItem.plain = 'Neither a special bond nor a clash in ' + daily + ' — it is what you make of it.';
      dayItem.todo = 'Create shared routines deliberately.';
    }
    add(items, dayItem);

    // 4. Year branches: families and social circles.
    var yl = branchLink(pa.year.branch, pb.year.branch);
    if (yl && yl.kind !== 'same') {
      var good = yl.kind === 'union' || yl.kind === 'triad';
      score += good ? 1 : yl.kind === 'clash' ? -1 : 0;
      add(items, { title: 'Families and friends', cn: '年支 ' + yl.cn, tone: good ? 'good' : 'caution',
        plain: good ? 'Your families and social circles tend to get on.' : 'Your families or social circles may not mix easily.',
        todo: good ? 'Include each other\'s families and friends — it strengthens the bond.' : 'Keep family matters calm and separate where needed; do not take sides in family disputes.' });
    }

    // 5. How each experiences the other: the partner's Day Master as a ten god.
    var ga = C.tenGod(da, db), gb = C.tenGod(db, da);
    add(items, { title: 'How you see each other', cn: ga.cn + ' · ' + gb.cn, tone: 'mixed',
      plain: na + ' experiences ' + nb + ' as ' + GOD_PLAIN[ga.cn] + '. ' + nb + ' experiences ' + na + ' as ' + GOD_PLAIN[gb.cn] + '.',
      todo: 'Knowing this helps you read each other\'s reactions kindly.' });

    // 6. Attraction across the charts (partner only): Peach Blossom, romance stars, spouse star.
    var attraction = [];
    if (partner) {
      var allB = [pb.year.branch, pb.month.branch, pb.day.branch, pb.hour.branch];
      var allA = [pa.year.branch, pa.month.branch, pa.day.branch, pa.hour.branch];
      if (peachOf(pa).some(function (x) { return allB.indexOf(x) >= 0; })) attraction.push(nb + ' carries ' + na + '\'s Peach Blossom (桃花)');
      if (peachOf(pb).some(function (x) { return allA.indexOf(x) >= 0; })) attraction.push(na + ' carries ' + nb + '\'s Peach Blossom (桃花)');
      var ra = romanceStars(pa.year.branch), rb = romanceStars(pb.year.branch);
      if (pb.day.branch === ra.hongLuan || pb.day.branch === ra.tianXi || pa.day.branch === rb.hongLuan || pa.day.branch === rb.tianXi) {
        attraction.push('a romance star (紅鸞/天喜) links your charts');
      }
      // Spouse star, classical convention: Wealth for a man, Officer for a woman.
      function spouseElem(x) { var de = x.deep.dayMasterElem; return x.gender === 'M' ? mod(de + 2, 5) : mod(de + 3, 5); }
      if (B.dayMasterElem === spouseElem(a)) attraction.push(nb + ' is ' + na + '\'s classical spouse star');
      if (A.dayMasterElem === spouseElem(b)) attraction.push(na + ' is ' + nb + '\'s classical spouse star');
      score += Math.min(3, attraction.length);
      add(items, { title: 'Attraction', cn: '桃花 紅鸞 夫妻星', tone: attraction.length ? 'good' : 'mixed',
        plain: attraction.length ? 'Classical markers of attraction between you: ' + attraction.join('; ') + '.'
          : 'No classical attraction markers link your charts — closeness here grows from friendship and shared life more than instant spark.',
        todo: attraction.length ? 'Attraction is a gift; protect it with attention and time alone together.' : 'Invest in shared experiences — they build the spark over time.' });
    }

    // 7. Intimacy (partner, opt-in): warmth, tenderness, each person's way of feeling close.
    if (partner && opts.intimacy) {
      var fire = (A.shares[1] + B.shares[1]) / 2, water = (A.shares[4] + B.shares[4]) / 2;
      add(intimacy, fire >= 26 && water <= 15
        ? { title: 'Warmth and passion', tone: 'mixed', plain: 'Together you run warm (Fire ' + Math.round(fire) + '%, Water ' + Math.round(water) + '%): strong passion that can flare and cool quickly.',
            todo: 'Keep warmth steady with small daily affection rather than only big moments, and allow cool-down time after arguments.' }
        : water >= 26 && fire <= 15
        ? { title: 'Warmth and passion', tone: 'mixed', plain: 'Together you run deep and tender (Water ' + Math.round(water) + '%, Fire ' + Math.round(fire) + '%), but the spark can fade into routine.',
            todo: 'Bring in novelty and play — new places, surprises, time set aside just for the two of you.' }
        : { title: 'Warmth and passion', tone: 'good', plain: 'Warmth and tenderness are in reasonable balance between you (Fire ' + Math.round(fire) + '%, Water ' + Math.round(water) + '%).',
            todo: 'Keep both alive: affection you show, and time to talk openly.' });
      if (dl && dl.kind === 'union') add(intimacy, { title: 'Physical ease', tone: 'good', plain: 'Your spouse palaces combine — physical closeness tends to come easily.', todo: 'Protect unhurried time together; do not let schedules crowd it out.' });
      if (dl && dl.kind === 'clash') add(intimacy, { title: 'Chemistry with friction', tone: 'caution', plain: 'Strong chemistry, but closeness can swing with your arguments.', todo: 'Make up properly after conflict — talk it through rather than using closeness to skip the conversation.' });
      if (dl && (dl.kind === 'harm' || dl.kind === 'punish')) add(intimacy, { title: 'Unspoken needs', tone: 'caution', plain: 'Your needs may differ more than either of you says.', todo: 'Talk openly and kindly about what each of you enjoys and needs; ask rather than guess.' });
      // Each person's way of feeling close, from their strongest element.
      var STYLE = ['shared plans and encouragement — growing together', 'warm words, touch and open affection',
        'steady presence and practical acts of care', 'reliability and kept promises; affection shown by doing',
        'emotional depth, reassurance and gentle attention'];
      [a, b].forEach(function (x) {
        var top = x.deep.shares.indexOf(Math.max.apply(null, x.deep.shares));
        var peachClose = x.deep.stars.some(function (s) { return s.key === 'peach' && (s.at.indexOf('Day') >= 0 || s.at.indexOf('Hour') >= 0); });
        var reserved = x.deep.stars.some(function (s) { return s.key === 'lonely' || s.key === 'widow'; });
        add(intimacy, { title: 'What helps ' + x.name + ' feel close', tone: 'mixed',
          plain: x.name + ' feels loved through ' + STYLE[top] + ' (' + C.ELEM_EN[top] + ' is strongest in their chart).' +
            (peachClose ? ' Their chart carries Peach Blossom close to the self, so attention and romance matter a lot to them.' : '') +
            (reserved ? ' Their chart also carries a solitary star, so they open up slowly and need patience.' : ''),
          todo: 'Show affection in this way, not only in your own.' });
      });
    }

    // 7b. Desire and intimacy in detail (partner, opt-in): each person's profile, then how the two fit.
    var desire = null;
    if (partner && opts.intimacy) {
      var qa = intimacyProfile(a), qb = intimacyProfile(b), couple = [];
      var LV = { gentle: 0, moderate: 1, high: 2 }, gap = LV[qa.level] - LV[qb.level];
      var hi = gap > 0 ? qa : qb, lo = gap > 0 ? qb : qa;
      couple.push(gap === 0
        ? { title: 'Matching desire', tone: 'good', plain: 'Your levels of desire are similar (' + qa.level + '), so frequency is rarely a source of friction.',
            todo: 'Protect it: keep regular time for each other, and talk if either of you notices it slipping.' }
        : { title: 'Different levels of desire', tone: Math.abs(gap) > 1 ? 'caution' : 'mixed',
            plain: hi.name + '\'s desire runs higher (' + hi.level + ') than ' + lo.name + '\'s (' + lo.level + '). Unspoken, this becomes pressure on one side and rejection on the other.',
            todo: 'Agree a rhythm together — some planned evenings plus room for spontaneity. ' + hi.name + ' initiates warmly and takes a "not tonight" without sulking; ' +
              lo.name + ' says what would put them in the mood (see their profile). Daily affectionate touch with no expectation keeps you close in between.' });
      couple.push(qa.yang === qb.yang
        ? (qa.yang ? { title: 'Who initiates', tone: 'mixed', plain: 'You both like to take the lead, which can turn into a tussle over who sets the pace.',
              todo: 'Take turns leading — one evening each — and say so openly; it adds anticipation.' }
            : { title: 'Who initiates', tone: 'caution', plain: 'You both tend to wait to be asked, so closeness can quietly drift.',
              todo: 'Agree that one of you will invite, or plan time together in advance so neither has to.' })
        : { title: 'Who initiates', tone: 'good', plain: (qa.yang ? qa : qb).name + ' naturally initiates; ' + (qa.yang ? qb : qa).name + ' prefers to be invited.',
            todo: (qa.yang ? qa : qb).name + ' invites clearly and warmly rather than assuming; ' + (qa.yang ? qb : qa).name + ' signals interest so the invitation feels welcome.' });
      var fast = function (q) { return q.element === 'Wood' || q.element === 'Fire'; };
      if (fast(qa) !== fast(qb)) {
        var f = fast(qa) ? qa : qb, s = f === qa ? qb : qa;
        couple.push({ title: 'Pace', tone: 'mixed', plain: f.name + ' warms up quickly; ' + s.name + ' needs a slower build-up.',
          todo: 'Start at ' + s.name + '\'s pace — ' + s.touch.split(';')[0] + ' — and let ' + f.name + '\'s energy take over once ' + s.name + ' is relaxed. Linger afterwards.' });
      } else {
        couple.push({ title: 'Pace', tone: 'good', plain: 'You warm up at a similar pace (' + qa.element + ' and ' + qb.element + ').',
          todo: fast(qa) ? 'Keep novelty and spontaneity coming; avoid letting it become routine.' : 'Give yourselves unhurried time; do not squeeze closeness into the end of a tiring day.' });
      }
      couple.push({ title: 'Setting the scene', tone: 'good', plain: 'For ' + qa.name + ': ' + qa.setting + '. For ' + qb.name + ': ' + qb.setting + '.',
        todo: 'Combine them: ' + qa.setting.split(',')[0] + ', with ' + qb.setting.split(',')[0] + '. Phones away, the room warm, and no work talk.' });
      var shared = qa.hoursList.filter(function (h) { return qb.hoursList.indexOf(h) >= 0; });
      couple.push({ title: 'Best time of day', tone: shared.length ? 'good' : 'mixed',
        plain: qa.name + ' is most receptive ' + qa.hours + '; ' + qb.name + ' ' + qb.hours + '.',
        todo: shared.length ? 'You share ' + shared.join(' and ') + ' — make that your time together. Avoid closeness when either of you is exhausted.'
          : 'Your best hours differ, so alternate: one evening at ' + qa.name + '\'s time, the next at ' + qb.name + '\'s. Avoid closeness when either of you is exhausted.' });
      desire = { profiles: [qa, qb], couple: couple };
    }

    // 7c. Sexual compatibility (partner, opt-in, both people 18 or over): frank about sex, never graphic.
    var sexual = null, today = new Date();
    if (partner && opts.intimacy && ageOn(a.birth, today) >= 18 && ageOn(b.birth, today) >= 18) {
      var sa = sexualProfile(a), sb = sexualProfile(b), sx = [];
      var fireAvg2 = (A.shares[1] + B.shares[1]) / 2;
      var chem = attraction.length + (dl ? ({ union: 2, triad: 1, clash: 1, same: 0.5, harm: -1, punish: -1, destruction: -0.5 }[dl.kind] || 0) : 0) +
        (fireAvg2 >= 22 ? 1 : fireAvg2 < 12 ? -1 : 0);
      var chemLevel = chem >= 4 ? 'Strong' : chem >= 2 ? 'Good' : 'Needs building';
      sx.push({ title: 'Sexual chemistry — ' + chemLevel, tone: chem >= 4 ? 'good' : chem >= 2 ? 'mixed' : 'caution',
        plain: (attraction.length ? 'Physical attraction markers link your charts (' + attraction.length + '). ' : 'No classical attraction markers link your charts. ') +
          (dl && dl.kind === 'union' ? 'Your spouse palaces combine — sex tends to feel natural and easy between you. ' :
           dl && dl.kind === 'clash' ? 'Your spouse palaces clash — strong physical heat, often strongest after an argument, but it can swing. ' :
           dl && (dl.kind === 'harm' || dl.kind === 'punish') ? 'Your spouse palaces rub — unspoken mismatches in what each wants in bed. ' : '') +
          'Fire, the element of sexual heat, averages ' + Math.round(fireAvg2) + '% across your charts.',
        todo: chem >= 4 ? 'The chemistry is there; protect it with regular time for sex that is not squeezed into the end of a tiring day.'
          : chem >= 2 ? 'Good foundations; keep it alive with novelty and by telling each other plainly what you enjoy.'
          : 'Chemistry here is built rather than given: see the counter-measures below, and give it time — it grows with trust and practice.' });
      var lv = { gentle: 0, moderate: 1, high: 2 }, gap2 = lv[sa.level] - lv[sb.level], hiS = gap2 > 0 ? sa : sb, loS = gap2 > 0 ? sb : sa;
      sx.push(gap2 === 0
        ? { title: 'Libido', tone: 'good', plain: 'Your sex drives are similar (' + sa.level + '), so how often you have sex is unlikely to become a fight.',
            todo: 'Keep a rhythm that suits you both, and say so if it drifts.' }
        : { title: 'Libido', tone: Math.abs(gap2) > 1 ? 'caution' : 'mixed',
            plain: hiS.name + ' wants sex more often (' + hiS.level + ') than ' + loS.name + ' (' + loS.level + '). Left unspoken, one feels rejected and the other pressured.',
            todo: 'Agree a baseline — for example set nights each week — and treat anything more as a bonus. ' + hiS.name + ' initiates warmly and accepts a no gracefully; ' +
              loS.name + ' suggests what would make sex appealing (see their profile). Closeness that does not end in sex still counts.' });
      var role = sa.lead >= 1 && sb.lead >= 1 ? { tone: 'mixed', plain: 'You both like to lead in bed.', todo: 'Take turns leading, and say whose night it is; the contrast keeps it interesting.' }
        : sa.lead <= -0.5 && sb.lead <= -0.5 ? { tone: 'caution', plain: 'You both prefer to follow, so sex can wait for an invitation neither gives.', todo: 'Decide who initiates this week, or plan nights in advance; leading can be learned and enjoyed.' }
        : { tone: 'good', plain: (sa.lead >= sb.lead ? sa : sb).name + ' tends to lead and ' + (sa.lead >= sb.lead ? sb : sa).name + ' to follow — a natural fit.',
            todo: (sa.lead >= sb.lead ? sa : sb).name + ' sets the pace but checks in; ' + (sa.lead >= sb.lead ? sb : sa).name + ' says what they want more of.' };
      role.title = 'Who leads in bed'; sx.push(role);
      var slow = function (s) { return s.element === 'Earth' || s.element === 'Water' || s.element === 'Metal'; };
      sx.push(slow(sa) === slow(sb)
        ? { title: 'Sexual style', tone: 'good', plain: 'Your styles are close: ' + sa.name + ' is ' + sa.style.toLowerCase().split(' — ')[0] + ', ' + sb.name + ' ' + sb.style.toLowerCase().split(' — ')[0] + '.',
            todo: slow(sa) ? 'Give sex time; long foreplay suits you both.' : 'Keep the spontaneity — and add new ideas before routine sets in.' }
        : { title: 'Sexual style', tone: 'mixed', plain: (slow(sa) ? sb : sa).name + ' is ' + (slow(sa) ? sb : sa).style.toLowerCase().split(' — ')[0] + '; ' + (slow(sa) ? sa : sb).name +
              ' is ' + (slow(sa) ? sa : sb).style.toLowerCase().split(' — ')[0] + '.',
            todo: 'Start at ' + (slow(sa) ? sa : sb).name + '\'s pace — a longer build-up and plenty of foreplay — then let ' + (slow(sa) ? sb : sa).name + '\'s heat take over.' });
      var quiet = [sa, sb].filter(function (s) { return /^Private/.test(s.voice); });
      sx.push({ title: 'Talking about sex', tone: quiet.length ? 'mixed' : 'good',
        plain: quiet.length ? quiet.map(function (s) { return s.name; }).join(' and ') + ' find' + (quiet.length > 1 ? '' : 's') + ' it hard to say what they want in bed.'
          : 'You can both talk about sex reasonably openly.',
        todo: quiet.length ? 'Use a private "yes / no / maybe" list: each of you marks it alone, then you compare only where you both said yes or maybe. Talk outside the bedroom, not in the moment.'
          : 'Keep talking — a short check-in now and then about what is working and what you would like more of.' });
      var counter = [];
      if (chem < 2 || Math.abs(gap2) > 0) {
        counter = [
          'Break the routine: a new place, a weekend away, or simply a different room or time of day.',
          'Warm the bedroom: candles or warm low light, red or pink fabrics, a scent of rose or ylang-ylang; keep work and phones out.',
          'Take the pressure off for a week: touch, massage and kissing with an agreement not to have sex — then let it build back up.',
          'Plan sex nights so desire has time to build through the day — a message in the afternoon counts as foreplay.',
          'Look after the basics: sleep, exercise and stress. If desire drops suddenly, or sex is painful or difficult, see a doctor — it is common and treatable.'
        ];
      }
      sexual = { profiles: [sa, sb], chemistry: chemLevel, items: sx, counter: counter };
    }

    // 8. Timing: both annual forecasts month by month.
    var year = opts.year || new Date().getFullYear(), timing = null;
    try {
      var fa = annualForecast(a, year), fb = annualForecast(b, year);
      var ra2 = romanceStars(pa.year.branch), rb2 = romanceStars(pb.year.branch);
      var pk = peachOf(pa).concat(peachOf(pb));
      var months = fa.months.map(function (m, k) {
        var mb = fb.months[k], br = C.BRANCHES.indexOf(m.pillar.charAt(1));
        var clashHome = SIX_CLASH[br] === pa.day.branch || SIX_CLASH[br] === pb.day.branch;
        var romance = partner && !clashHome && ([ra2.hongLuan, ra2.tianXi, rb2.hongLuan, rb2.tianXi].indexOf(br) >= 0 || pk.indexOf(br) >= 0);
        return { pillar: m.pillar, start: m.start, end: m.end, a: m.score, b: mb.score, sum: m.score + mb.score, clashHome: clashHome, romance: romance };
      });
      // Best and hardest are ranked within the year on the two scores together, as the annual forecast ranks its own
      // months: a chart whose whole year scores low still has better and worse stretches to choose between.
      var ranked = months.slice().sort(function (x, y) { return y.sum - x.sum; });
      ranked.slice(0, 3).forEach(function (m) { m.both = true; });
      ranked.slice(-2).forEach(function (m) { m.hard = true; });
      months.forEach(function (m) {
        m.plain = m.both ? 'One of your best months together — a time for joint plans and decisions.'
          : m.hard ? 'One of the harder months for the two of you' + (m.a < m.b - 1 ? ', mainly for ' + na : m.b < m.a - 1 ? ', mainly for ' + nb : '') +
            ' — be patient and avoid big joint decisions.'
          : 'An ordinary month for the two of you.';
        if (m.clashHome) m.plain += ' Expect more friction at home; give each other space.';
        if (m.romance) m.plain += ' A warm month for closeness — plan time together.';
      });
      timing = { year: year, pillarCn: fa.pillarCn, months: months,
        yearClash: [SIX_CLASH[fa.pillar.branch] === pa.day.branch ? na : null, SIX_CLASH[fa.pillar.branch] === pb.day.branch ? nb : null].filter(Boolean),
        yearRomance: partner && [ra2.hongLuan, ra2.tianXi, rb2.hongLuan, rb2.tianXi].indexOf(fa.pillar.branch) >= 0 };
    } catch (e) { timing = null; }

    // 9. Natal levels of attraction, desire and intimacy (partner only): the part of the picture the birth charts fix.
    //    Each is -2..+2 with its reasons; the Qimen plate of the month adds the part that moves.
    var natal = null;
    if (partner) {
      var fireAvg = (A.shares[1] + B.shares[1]) / 2, waterAvg = (A.shares[4] + B.shares[4]) / 2;
      var peachBoth = [A, B].filter(function (D) { return D.stars.some(function (s) { return s.key === 'peach'; }); }).length;
      var solitary = [a, b].filter(function (x) { return x.deep.stars.some(function (s) { return s.key === 'lonely' || s.key === 'widow'; }); });
      var clamp = function (x) { return Math.max(-2, Math.min(2, x)); };
      var att = clamp(attraction.length - 1 + (STEM_UNION[da] === db ? 1 : 0));
      var des = clamp((fireAvg >= 22 ? 1 : fireAvg < 12 ? -1 : 0) + (peachBoth === 2 ? 1 : peachBoth === 0 ? -1 : 0) + (dl && dl.kind === 'clash' ? 0.5 : 0));
      var intim = clamp((dl ? ({ union: 2, triad: 1, same: 0.5, clash: -1, harm: -1.5, punish: -1, destruction: -0.5 }[dl.kind] || 0) : 0) +
        (waterAvg < 10 ? -0.5 : 0) - 0.5 * solitary.length);
      natal = {
        attraction: { level: att, why: attraction.length ? attraction.join('; ') : 'no classical attraction markers link your charts' },
        desire: { level: des, why: 'Fire, the element of passion, averages ' + Math.round(fireAvg) + '% across your charts' +
          (peachBoth === 2 ? '; you both carry Peach Blossom' : peachBoth === 1 ? '; one of you carries Peach Blossom' : '; neither of you carries Peach Blossom') },
        intimacy: { level: intim, why: (dl ? 'your spouse palaces ' + ({ union: 'combine', triad: 'form a team', same: 'match', clash: 'clash', harm: 'harm each other',
            punish: 'punish each other', destruction: 'crack against each other' }[dl.kind]) : 'your spouse palaces are neutral to each other') +
          (waterAvg < 10 ? '; Water, the element of emotional depth, is low' : '') +
          (solitary.length ? '; ' + solitary.map(function (x) { return x.name; }).join(' and ') + (solitary.length > 1 ? ' open' : ' opens') +
            ' up slowly (solitary star)' : '') }
      };
    }

    var band = score >= 5 ? 'Naturally supportive' : score >= 1 ? 'Good, with some effort' : 'Needs deliberate care';
    var summary = band === 'Naturally supportive'
      ? 'Your charts support each other in several important ways. The work is mainly to protect what comes naturally.'
      : band === 'Good, with some effort'
      ? 'A workable match with real strengths and a few friction points. Knowing where the friction sits lets you handle it before it grows.'
      : 'Your charts ask more of you both than most. That is not a verdict on the relationship — it means the relationship does best with clear habits and deliberate care.';
    // The steps to strengthen the relationship: every caution first, then the strongest positives to lean on.
    var steps = items.filter(function (x) { return x.tone === 'caution'; }).concat(items.filter(function (x) { return x.tone === 'good'; }))
      .map(function (x) { return x.todo; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).slice(0, 6);
    return { a: na, b: nb, type: type, score: score, band: band, summary: summary, items: items, intimacy: intimacy,
             attraction: attraction, natal: natal, desire: desire, sexual: sexual, steps: steps, timing: timing };
  }

  global.QPBazi = {
    compatibility: compatibility,
    analyse: analyse, stageOf: stageOf, findStars: findStars, findRelations: findRelations,
    assessStrength: assessStrength, diagnose: diagnose,
    STAGES: STAGES, STAR_META: STAR_META, DOMAIN_DEF: DOMAIN_DEF, TIAO_HOU: TIAO_HOU,
    SIX_DESTRUCTION: SIX_DESTRUCTION, HARM_KIND: HARM_KIND, fourHarms: fourHarms, timingHarms: timingHarms,
    annualForecast: annualForecast,
    NOBLEMAN: NOBLEMAN, ACADEMIC: ACADEMIC, TAIJI: TAIJI, PEACH: PEACH, HORSE: HORSE, triadKey: triadKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
