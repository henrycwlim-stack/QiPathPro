/* QiPath Pro — divination engines: Bazi, Zi Wei Dou Shu, Qimen Dunjia, Yijing, Feng Shui, Date Selection */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ================= BAZI ANALYSIS ================= */

  // Strength of the day master, from month command, roots and support.
  var SEASON_SUPPORT = { // month branch -> element strength multipliers [Wood,Fire,Earth,Metal,Water]
    2:[1.4,1.1,0.7,0.6,0.9], 3:[1.5,1.1,0.7,0.6,0.9], 4:[1.0,1.0,1.3,0.9,0.8],
    5:[0.9,1.4,1.1,0.8,0.6], 6:[0.8,1.5,1.1,0.8,0.6], 7:[0.8,1.0,1.4,1.0,0.7],
    8:[0.7,0.8,0.9,1.4,1.2], 9:[0.6,0.7,0.9,1.5,1.2], 10:[0.8,0.9,1.4,1.1,0.8],
    11:[1.1,0.6,0.8,0.9,1.4], 0:[1.1,0.6,0.8,0.9,1.5], 1:[0.9,0.7,1.3,1.0,1.1]
  };

  function analyseBazi(p) {
    var dm = p.day.stem, dmElem = C.STEM_ELEM[dm];
    var counts = [0,0,0,0,0];
    var pillars = [p.year, p.month, p.day, p.hour];
    pillars.forEach(function (q) {
      counts[C.STEM_ELEM[q.stem]] += 1.0;
      var hid = C.HIDDEN[q.branch];
      hid.forEach(function (s, i) { counts[C.STEM_ELEM[s]] += (i === 0 ? 0.8 : 0.35); });
    });
    var season = SEASON_SUPPORT[p.month.branch] || [1,1,1,1,1];
    var weighted = counts.map(function (v, i) { return v * season[i]; });

    // Self party = same element + the element that produces it
    var resource = mod(dmElem - 1, 5);
    var self = weighted[dmElem] + weighted[resource];
    var total = weighted.reduce(function (a, b) { return a + b; }, 0);
    var ratio = self / total;
    var strong = ratio >= 0.45;

    // Favourable elements
    var output = mod(dmElem + 1, 5), wealth = mod(dmElem + 2, 5), officer = mod(dmElem + 3, 5);
    var favourable = strong ? [output, wealth, officer] : [resource, dmElem];
    var unfavourable = strong ? [resource, dmElem] : [wealth, officer, output];

    // Ten gods present
    var gods = pillars.map(function (q, i) {
      return { pillar: ['Year','Month','Day','Hour'][i],
               god: i === 2 ? { cn: '日主', en: 'Day Master' } : C.tenGod(dm, q.stem) };
    });

    return {
      dayMaster: dm, dayMasterElem: dmElem,
      dayMasterCn: C.STEMS[dm] + C.ELEM[dmElem], dayMasterEn: C.STEMS_EN[dm] + ' ' + C.ELEM_EN[dmElem],
      counts: weighted.map(function (v) { return Math.round(v * 10) / 10; }),
      strong: strong, ratio: Math.round(ratio * 100),
      favourable: favourable, unfavourable: unfavourable,
      favourableCn: favourable.map(function (e) { return C.ELEM[e]; }),
      favourableEn: favourable.map(function (e) { return C.ELEM_EN[e]; }),
      gods: gods,
      voids: C.voidBranches(p.day.i).map(function (b) { return C.BRANCHES[b]; })
    };
  }

  // 大运 — ten-year luck pillars.
  function adjacentJie(jd, after) {
    var g = A.jdToLocal(jd), pool = [];
    [g.y - 1, g.y, g.y + 1].forEach(function (yy) {
      A.termsForYear(yy).forEach(function (t, i) { if (i % 2 === 0) pool.push(t); });
    });
    pool.sort(function (a, b) { return a.jd - b.jd; });
    if (after) return pool.filter(function (t) { return t.jd > jd; })[0];
    return pool.filter(function (t) { return t.jd <= jd; }).pop();
  }
  function luckPillars(p, gender, birth) {
    var yangYear = C.STEM_YIN[p.year.stem] === 0;
    var male = gender === 'M';
    var forward = (yangYear && male) || (!yangYear && !male);
    // Days to the adjacent solar term boundary -> starting age (3 days = 1 year)
    var jd = A.localToJD(birth.y, birth.m, birth.d, birth.hour, birth.min, birth.tz);
    var target = forward ? adjacentJie(jd, true)
                         : adjacentJie(jd, false);
    var days = Math.abs(jd - target.jd);
    var startAge = Math.round((days / 3) * 10) / 10;
    var out = [];
    for (var i = 1; i <= 8; i++) {
      var idx = mod(p.month.i + (forward ? i : -i), 60);
      out.push({ from: Math.round(startAge + (i - 1) * 10),
                 to: Math.round(startAge + i * 10),
                 pillar: C.stemBranch(idx) });
    }
    return { forward: forward, startAge: startAge, pillars: out };
  }

  /* ================= ZI WEI DOU SHU ================= */

  var ZW_PALACES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];
  var ZW_PALACES_EN = ['Self','Siblings','Spouse','Children','Wealth','Health','Travel',
                       'Friends','Career','Property','Fortune','Parents'];
  var ZIWEI_SERIES = [['紫微',0],['天机',-1],['太阳',-3],['武曲',-4],['天同',-5],['廉贞',-8]];
  var TIANFU_SERIES = [['天府',0],['太阴',1],['贪狼',2],['巨门',3],['天相',4],['天梁',5],['七杀',6],['破军',10]];
  var STAR_EN = { '紫微':'Emperor','天机':'Strategist','太阳':'Sun','武曲':'General','天同':'Harmony',
    '廉贞':'Reformer','天府':'Treasurer','太阴':'Moon','贪狼':'Seeker','巨门':'Debater',
    '天相':'Minister','天梁':'Elder','七杀':'Warrior','破军':'Pioneer' };
  var JU_NAME = { 2:'水二局', 3:'木三局', 4:'金四局', 5:'土五局', 6:'火六局' };
  var JU_EN = { 2:'Water 2', 3:'Wood 3', 4:'Metal 4', 5:'Earth 5', 6:'Fire 6' };

  /* 庙旺利陷 — brightness of each major star by branch. Each row runs 寅卯辰巳午未申酉戌亥子丑.
     Taken from the open-source iztro library (MIT, src/data/stars.ts) and cross-checked against
     the 甲級星各宮廟旺利陷表 on 紫微斗數筆記; rows 子, 午 and 寅 agree in full. Schools differ
     in places — this table puts 紫微, 天府, 武曲 and 七杀 at 平 at worst, never 陷. */
  var BRIGHT = {
    '紫微':'旺旺得旺庙庙旺旺得旺平庙', '天机':'得旺利平庙陷得旺利平庙陷',
    '太阳':'旺庙旺旺旺得得平不陷陷不', '武曲':'得利庙平旺庙得利庙平旺庙',
    '天同':'利平平庙陷不旺平平庙旺不', '廉贞':'庙平利陷平利庙平利陷平利',
    '天府':'庙得庙得旺庙得旺庙得庙庙', '太阴':'旺陷陷陷不不利旺旺庙庙庙',
    '贪狼':'平利庙陷旺庙平利庙陷旺庙', '巨门':'庙庙陷旺旺不庙庙陷旺旺不',
    '天相':'庙陷得得庙得庙陷得得庙庙', '天梁':'庙庙庙陷庙旺陷得庙陷庙旺',
    '七杀':'庙旺庙平旺庙庙旺庙平旺庙', '破军':'得陷旺平庙旺得陷旺平庙旺',
    // Minor stars iztro grades ('.' = no grade given: 擎羊 and 陀罗 never land there).
    '文昌':'陷利得庙陷利得庙陷利得庙', '文曲':'平旺得庙陷旺得庙陷旺得庙',
    '火星':'庙利陷得庙利陷得庙利陷得', '铃星':'庙利陷得庙利陷得庙利陷得',
    '擎羊':'.陷庙.陷庙.陷庙.陷庙', '陀罗':'陷.庙陷.庙陷.庙陷.庙'
  };
  var BRIGHT_EN = { '庙':'Temple', '旺':'Prosperous', '得':'Gained', '利':'Beneficial',
                    '平':'Level', '不':'Unfavoured', '陷':'Fallen' };
  function brightness(star, branch) {
    var row = BRIGHT[star];
    var g = row ? row.charAt(mod(branch - 2, 12)) : '';
    return g === '.' ? '' : g;
  }

  /* ---------- the fourteen minor stars ----------
     Placement rules follow iztro (src/star/location.ts) and match the classical rhymes:
     左辅 from 辰 forward by lunar month, 右弼 from 戌 backward; 文昌 from 戌 backward by hour,
     文曲 from 辰 forward; 天魁/天钺 by year stem (甲戊庚牛羊, 乙己鼠猴乡, 丙丁猪鸡位, 壬癸兔蛇藏,
     六辛逢马虎); 禄存 by year stem with 擎羊 one palace ahead and 陀罗 one behind; 天马 by the
     year-branch triad; 火星/铃星 from a start set by the year-branch triad, forward by hour;
     地空 from 亥 backward by hour, 地劫 from 亥 forward. Branch indices are 子 = 0. */
  var MINOR_EN = { '左辅':'Left Assistant', '右弼':'Right Assistant', '文昌':'Literary Talent',
    '文曲':'Literary Arts', '天魁':'Heavenly Leader', '天钺':'Heavenly Halberd', '禄存':'Salary',
    '天马':'Heavenly Horse', '擎羊':'Ram', '陀罗':'Spinning Top', '火星':'Fire Star',
    '铃星':'Bell Star', '地空':'Earth Void', '地劫':'Earth Robbery' };
  var MINOR_ABBR = { '左辅':'辅', '右弼':'弼', '文昌':'昌', '文曲':'曲', '天魁':'魁', '天钺':'钺',
    '禄存':'存', '天马':'马', '擎羊':'羊', '陀罗':'陀', '火星':'火', '铃星':'铃', '地空':'空', '地劫':'劫' };
  var LUCUN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];                 // 甲…癸
  var KUI_YUE = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[1,7],[6,2],[3,5],[3,5]];
  // 天马 and 火铃 by year-branch triad: 寅午戌, 申子辰, 巳酉丑, 亥卯未.
  function triad(yb) { return [2,6,10].indexOf(yb) >= 0 ? 0 : [8,0,4].indexOf(yb) >= 0 ? 1
                            : [5,9,1].indexOf(yb) >= 0 ? 2 : 3; }
  var TIANMA = [8, 2, 11, 5];
  var HUO_START = [1, 2, 3, 9], LING_START = [3, 10, 10, 10];

  function placeMinors(lunarMonth, hb, yearStem, yearBranch) {
    var out = [];
    for (var i = 0; i < 12; i++) out.push([]);
    function put(star, b) { out[mod(b, 12)].push(star); }
    var lc = LUCUN[yearStem], tr = triad(yearBranch);
    put('左辅', 4 + (lunarMonth - 1));   put('右弼', 10 - (lunarMonth - 1));
    put('文昌', 10 - hb);                put('文曲', 4 + hb);
    put('天魁', KUI_YUE[yearStem][0]);   put('天钺', KUI_YUE[yearStem][1]);
    put('禄存', lc); put('擎羊', lc + 1); put('陀罗', lc - 1);
    put('天马', TIANMA[tr]);
    put('火星', HUO_START[tr] + hb);     put('铃星', LING_START[tr] + hb);
    put('地空', 11 - hb);                put('地劫', 11 + hb);
    return out;
  }

  function juFromNayin(nayin) {
    if (nayin.indexOf('水') >= 0) return 2;
    if (nayin.indexOf('木') >= 0) return 3;
    if (nayin.indexOf('金') >= 0) return 4;
    if (nayin.indexOf('土') >= 0) return 5;
    return 6; // 火
  }

  function ziweiPosition(ju, day) {
    for (var i = 1; i <= 40; i++) {
      var x = ju * i;
      if (x >= day) {
        var r = x - day;
        return r % 2 === 0 ? mod(2 + (i - 1) + r, 12) : mod(2 + (i - 1) - r, 12);
      }
    }
    return 2;
  }

  function zwds(lunar, hourBranch, yearStem, yearBranch) {
    var lm = lunar.month, ld = lunar.day;
    var ming = mod(2 + (lm - 1) - hourBranch, 12);
    var shen = mod(2 + (lm - 1) + hourBranch, 12);

    // Stem of the Ming palace via the Five Tigers rule
    var yinStem = mod((yearStem % 5) * 2 + 2, 10);
    var mingStem = mod(yinStem + mod(ming - 2, 12), 10);
    var ju = juFromNayin(C.NAYIN[C.sbIndex(mingStem, ming)]);

    var zw = ziweiPosition(ju, ld);
    var tf = mod(4 - zw, 12);

    var stars = [];
    for (var i = 0; i < 12; i++) stars.push([]);
    ZIWEI_SERIES.forEach(function (s) { stars[mod(zw + s[1], 12)].push(s[0]); });
    TIANFU_SERIES.forEach(function (s) { stars[mod(tf + s[1], 12)].push(s[0]); });

    var minors = placeMinors(lm, hourBranch, yearStem, yearBranch);

    // Palace names run counter-clockwise from Ming
    var palaces = [];
    for (var b = 0; b < 12; b++) {
      var offset = mod(ming - b, 12);
      var pStem = mod(yinStem + mod(b - 2, 12), 10);
      palaces.push({
        branch: b, branchCn: C.BRANCHES[b],
        stemCn: C.STEMS[pStem],
        name: ZW_PALACES[offset], nameEn: ZW_PALACES_EN[offset],
        stars: stars[b], starsEn: stars[b].map(function (s) { return STAR_EN[s]; }),
        bright: stars[b].map(function (s) { return brightness(s, b); }),
        minors: minors[b], minorBright: minors[b].map(function (s) { return brightness(s, b); }),
        isMing: b === ming, isShen: b === shen
      });
    }
    return { ming: ming, shen: shen, ju: ju, juCn: JU_NAME[ju], juEn: JU_EN[ju],
             ziwei: zw, tianfu: tf, palaces: palaces,
             mingStars: stars[ming], mingStarsEn: stars[ming].map(function (s) { return STAR_EN[s]; }) };
  }

  /* ---------- ZWDS timing: 大限, 流年 and 四化 ---------- */

  // 四化 by stem, in the order 禄 权 科 忌 (the common 中州 table; 庚 has variants).
  // 文昌, 文曲, 左辅 and 右弼 are placed with the minor stars, so all four always land.
  var SIHUA = [
    ['廉贞','破军','武曲','太阳'], ['天机','天梁','紫微','太阴'], ['天同','天机','文昌','廉贞'],
    ['太阴','天同','天机','巨门'], ['贪狼','太阴','右弼','天机'], ['武曲','贪狼','天梁','文曲'],
    ['太阳','武曲','太阴','天同'], ['巨门','太阳','文曲','文昌'], ['天梁','紫微','左辅','武曲'],
    ['破军','巨门','太阴','贪狼']
  ];
  var HUA = ['化禄','化权','化科','化忌'];
  var HUA_EN = ['Prosperity','Authority','Distinction','Obstruction'];
  var HUA_VAL = [3, 2, 1.5, -3];
  // A coarse temperament of each major star for timing, before brightness.
  var STAR_TONE = { '紫微':2, '天府':2, '太阳':1.5, '太阴':1.5, '天梁':1.5, '天相':1.5,
    '天同':1, '天机':1, '武曲':1, '贪狼':0, '廉贞':-0.5, '七杀':-0.5, '巨门':-1, '破军':-1 };

  /* Brightness turns temperament into effect, following the classical rule of thumb:
     庙 — 吉星极吉，凶星不凶; 陷 — 吉星无用，凶星最凶.
     A benign star is multiplied up when bright and falls to slightly negative when fallen.
     A volatile star is tamed into mild support at 庙, neutral at 旺, and at full force
     when 陷. 贪狼, neutral in temperament, takes its sign from brightness alone. */
  var BRIGHT_POS = { '庙':1.5, '旺':1.25, '得':1, '利':0.8, '平':0.5, '不':0.2, '陷':-0.25 };
  var BRIGHT_NEG = { '庙':-0.5, '旺':0, '得':0.5, '利':0.75, '平':1, '不':1.25, '陷':1.5 };
  var BRIGHT_ADD = { '庙':1, '旺':0.5, '得':0.25, '利':0, '平':0, '不':-0.5, '陷':-1 };
  // 四化 on a bright star acts more fully; 化忌 on a bright star is cushioned, on a fallen one aggravated.
  var HUA_BRIGHT_GOOD = { '庙':1.25, '旺':1.15, '得':1, '利':0.9, '平':0.8, '不':0.7, '陷':0.6 };
  var HUA_BRIGHT_JI   = { '庙':0.7, '旺':0.8, '得':0.9, '利':1, '平':1.1, '不':1.25, '陷':1.4 };

  // Minor stars: the six auspicious (六吉), 禄存 and 天马, and the six malefic (六煞).
  var MINOR_TONE = { '左辅':1, '右弼':1, '天魁':1, '天钺':1, '文昌':0.75, '文曲':0.75,
    '禄存':1.5, '天马':0.5, '擎羊':-1.5, '陀罗':-1.25, '火星':-1.25, '铃星':-1,
    '地空':-1.25, '地劫':-1.25 };
  var MINOR_WEIGHT = 0.75;   // a minor star counts three quarters of a major one

  function starEffect(star, branch) {
    var t = STAR_TONE[star] !== undefined ? STAR_TONE[star] : (MINOR_TONE[star] || 0);
    var g = brightness(star, branch);
    if (!g) return t;
    if (t > 0) return t * BRIGHT_POS[g];
    if (t < 0) return t * BRIGHT_NEG[g];
    return BRIGHT_ADD[g];
  }

  // 三方四正: the palace, its opposite and its two trines.
  function zwField(b) { return { self: b, opp: mod(b + 6, 12), trines: [mod(b + 4, 12), mod(b + 8, 12)] }; }

  /**
   * Score one period palace (a decade or a year) on the natal board: star temperament across
   * 三方四正, the period stem's 四化 landing in that field, and the natal 四化 at half weight.
   */
  function zwdsPeriod(z, branch, stemIdx, natalStem) {
    var where = {};
    z.palaces.forEach(function (p) {
      p.stars.concat(p.minors || []).forEach(function (s) { where[s] = p.branch; });
    });
    var f = zwField(branch), score = 0, notes = [];
    var fieldSet = [branch, f.opp].concat(f.trines);
    function tone(b) { return z.palaces[b].stars.reduce(function (a, s) { return a + starEffect(s, b); }, 0); }
    function minorTone(b) {
      return (z.palaces[b].minors || []).reduce(function (a, s) { return a + starEffect(s, b); }, 0);
    }
    var empty = !z.palaces[branch].stars.length;
    score += empty ? 0.8 * tone(f.opp) : tone(branch) + 0.6 * tone(f.opp);
    score += 0.4 * (tone(f.trines[0]) + tone(f.trines[1]));
    if (empty) notes.push('palace empty of major stars — borrows ' +
      (z.palaces[f.opp].stars.join('、') || 'nothing') + ' from the opposite palace');

    // Minor stars are not borrowed: each palace's own minors count in place, at 0.75 weight.
    score += MINOR_WEIGHT * (minorTone(branch) + 0.6 * minorTone(f.opp) +
                             0.4 * (minorTone(f.trines[0]) + minorTone(f.trines[1])));
    function inField(s) { return where[s] !== undefined && fieldSet.indexOf(where[s]) >= 0; }
    [['左辅','右弼','左右 meet in the field — help arrives from peers'],
     ['文昌','文曲','昌曲 meet in the field — credentials, writing, examinations favoured'],
     ['天魁','天钺','魁钺 meet in the field — patrons and senior help']].forEach(function (pr) {
      if (inField(pr[0]) && inField(pr[1])) { score += 0.5; notes.push(pr[2]); }
    });
    var own = z.palaces[branch].minors || [];
    var harsh = own.filter(function (s) { return (MINOR_TONE[s] || 0) < 0; });
    var kind = own.filter(function (s) { return (MINOR_TONE[s] || 0) > 0; });
    if (kind.length) notes.push('in the palace: ' + kind.join('、'));
    if (harsh.length) notes.push('煞 in the palace: ' + harsh.join('、'));

    var hua = [];
    function land(stem, weight, tag) {
      SIHUA[stem].forEach(function (star, i) {
        var b = where[star];
        var g = b === undefined ? '' : brightness(star, b);
        var entry = { hua: HUA[i], huaEn: HUA_EN[i], star: star, source: tag, bright: g,
                      palace: b === undefined ? null : z.palaces[b].name,
                      palaceEn: b === undefined ? null : z.palaces[b].nameEn, inField: false };
        if (b !== undefined) {
          var w = b === branch ? 1 : (b === f.opp || f.trines.indexOf(b) >= 0) ? 0.6 : 0;
          if (w) {
            entry.inField = true;
            var bm = g ? (i === 3 ? HUA_BRIGHT_JI[g] : HUA_BRIGHT_GOOD[g]) : 1;
            score += HUA_VAL[i] * w * weight * bm;
            notes.push(tag + ' ' + star + (g ? '(' + g + ')' : '') + HUA[i] +
              (b === branch ? ' in the period palace' : ' in its 三方四正'));
          }
        }
        hua.push(entry);
      });
    }
    land(stemIdx, 1, 'period');
    if (natalStem !== undefined && natalStem !== null) land(natalStem, 0.5, 'natal');

    // 禄马交驰: 天马 in the field with 禄存 or the period's 化禄 — gain through movement.
    var periodLu = hua.filter(function (h) { return h.source === 'period' && h.hua === '化禄' && h.inField; })[0];
    if (inField('天马') && (inField('禄存') || periodLu)) {
      score += 1;
      notes.push('禄马交驰 — 天马 meets ' + (inField('禄存') ? '禄存' : periodLu.star + '化禄') +
        ': gain through movement, travel or change');
    }
    return { score: Math.round(score * 10) / 10, notes: notes, hua: hua,
             palace: z.palaces[branch], field: f };
  }

  /** 大限: ten-year limits from the 局 number, forward for yang-male / yin-female. */
  function zwdsDecades(z, yearStem, gender) {
    var yang = C.STEM_YIN[yearStem] === 0;
    var forward = (yang && gender === 'M') || (!yang && gender !== 'M');
    var out = [];
    for (var i = 0; i < 12; i++) {
      var b = mod(z.ming + (forward ? i : -i), 12);
      var pal = z.palaces[b];
      out.push({ i: i, branch: b, palace: pal, stemIdx: C.STEMS.indexOf(pal.stemCn),
                 from: z.ju + i * 10, to: z.ju + i * 10 + 9 });
    }
    return { forward: forward, decades: out };
  }

  /* ================= QIMEN DUNJIA ================= */

  // Ju numbers per solar term for upper / middle / lower yuan.
  // Index matches QPAstro.TERM_NAMES (0 = Lichun).
  var QM_JU = {
    '冬至':[1,7,4],'小寒':[2,8,5],'大寒':[3,9,6],'立春':[8,5,2],'雨水':[9,6,3],'惊蛰':[1,7,4],
    '春分':[3,9,6],'清明':[4,1,7],'谷雨':[5,2,8],'立夏':[4,1,7],'小满':[5,2,8],'芒种':[6,3,9],
    '夏至':[9,3,6],'小暑':[8,2,5],'大暑':[7,1,4],'立秋':[2,5,8],'处暑':[1,4,7],'白露':[9,3,6],
    '秋分':[7,1,4],'寒露':[6,9,3],'霜降':[5,8,2],'立冬':[6,9,3],'小雪':[5,8,2],'大雪':[4,7,1]
  };
  // Yang dun runs from Winter Solstice to Grain in Ear; Yin dun from Summer Solstice to Major Snow.
  var YIN_TERMS = ['夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪'];

  var STARS9 = ['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'];
  var STARS9_EN = ['Grass','Ailment','Rush','Assistant','Bird','Heart','Pillar','Task','Hero'];
  var GATES8 = { 1:'休门', 2:'死门', 3:'伤门', 4:'杜门', 6:'开门', 7:'惊门', 8:'生门', 9:'景门' };
  var GATES8_EN = { 1:'Rest', 2:'Death', 3:'Harm', 4:'Delusion', 6:'Open', 7:'Fear', 8:'Life', 9:'Scenery' };
  var GATE_RANK = { 8:2, 6:2, 1:2, 9:1, 4:1, 3:0, 7:0, 2:0 }; // 2 auspicious, 1 neutral, 0 inauspicious
  var SPIRITS = ['值符','腾蛇','太阴','六合','白虎','玄武','九地','九天'];
  var SPIRITS_EN = ['Chief','Serpent','Moon','Harmony','Tiger','Warrior','Earth','Heaven'];
  var RING = [1,8,3,4,9,2,7,6]; // clockwise palace ring, excluding centre
  var YI_ORDER = [4,5,6,7,8,9,3,2,1]; // 戊己庚辛壬癸丁丙乙 as stem indices

  function ringIndex(p) { return RING.indexOf(p); }

  var PAL_NAME = { 1:'坎', 2:'坤', 3:'震', 4:'巽', 5:'中', 6:'乾', 7:'兑', 8:'艮', 9:'离' };
  var PAL_DIR = { 1:'North', 2:'Southwest', 3:'East', 4:'Southeast', 5:'Centre',
                  6:'Northwest', 7:'West', 8:'Northeast', 9:'South' };
  var PAL_ELEM = { 1:'water', 2:'earth', 3:'wood', 4:'wood', 5:'earth',
                   6:'metal', 7:'metal', 8:'earth', 9:'fire' };
  var STEM_ELEM_EN = ['wood','wood','fire','fire','earth','earth','metal','metal','water','water'];
  var STAR_ELEM = { '天蓬':'water','天芮':'earth','天冲':'wood','天辅':'wood','天禽':'earth',
                    '天心':'metal','天柱':'metal','天任':'earth','天英':'fire' };
  var GATE_ELEM = { '休门':'water','生门':'earth','伤门':'wood','杜门':'wood',
                    '景门':'fire','死门':'earth','惊门':'metal','开门':'metal' };
  var GATE_NATURE = { '休门':'auspicious','生门':'auspicious','开门':'auspicious',
                      '景门':'neutral','杜门':'neutral',
                      '伤门':'inauspicious','死门':'inauspicious','惊门':'inauspicious' };
  // Yang dun uses Hook and Phoenix; Yin dun substitutes Tiger and Tortoise.
  var SPIRITS_YANG = ['值符','腾蛇','太阴','六合','勾陈','朱雀','九地','九天'];
  var SPIRITS_YIN  = ['值符','腾蛇','太阴','六合','白虎','玄武','九地','九天'];
  var SPIRIT_ELEM = { '值符':'earth', '腾蛇':'fire', '太阴':'metal', '六合':'wood',
                      '勾陈':'earth', '朱雀':'fire', '白虎':'metal', '玄武':'water',
                      '九地':'earth', '九天':'metal' };
  var ELEM_CN_EN = { wood:'木 Wood', fire:'火 Fire', earth:'土 Earth',
                     metal:'金 Metal', water:'水 Water' };
  var SPIRIT_NATURE = { '值符':'auspicious','腾蛇':'deceptive','太阴':'auspicious','六合':'auspicious',
                        '勾陈':'hostile','朱雀':'deceptive','白虎':'hostile','玄武':'deceptive',
                        '九地':'neutral','九天':'auspicious' };

  // 旺相休囚死 — how strong a symbol is in the palace it occupies.
  var STRENGTH = [
    { key:'prosperous', cn:'旺', en:'Prosperous', note:'same element as the palace — at full power', rank:5 },
    { key:'supported',  cn:'相', en:'Supported',  note:'the palace feeds it — strong and rising',    rank:4 },
    { key:'resting',    cn:'休', en:'Resting',    note:'it feeds the palace — spending itself',      rank:3 },
    { key:'trapped',    cn:'囚', en:'Trapped',    note:'it controls the palace — effortful',         rank:2 },
    { key:'dead',       cn:'死', en:'Dead',       note:'the palace controls it — suppressed',        rank:1 }
  ];
  function strengthOf(symbolElem, palaceElem) {
    if (!symbolElem || !palaceElem) return null;
    if (symbolElem === palaceElem) return STRENGTH[0];
    if (PRODUCE_EN[palaceElem] === symbolElem) return STRENGTH[1];
    if (PRODUCE_EN[symbolElem] === palaceElem) return STRENGTH[2];
    if (CONTROL_EN[symbolElem] === palaceElem) return STRENGTH[3];
    return STRENGTH[4];
  }
  var PRODUCE_EN = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' };
  var CONTROL_EN = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' };

  /* ---------------- 九星四時旺相休囚: the stars by season ----------------
   * Stars take their strength from the solar month, not from their palace, and by their own cycle (compendium p.449-452):
   * a star that feeds the month is 旺, one of the month's element is 相, one that controls the month is 休, one the month
   * controls is 囚, and one the month feeds is 死 (the book's text also calls this Useless 廢).
   */
  var STAR_STAGE = [
    { key:'prosperous', cn:'旺', en:'Prosperous', note:'the star feeds the element of the month, so it is at its most influential', rank:5 },
    { key:'strong',     cn:'相', en:'Strong',     note:'the star shares the element of the month', rank:4 },
    { key:'weak',       cn:'休', en:'Weak',       note:'the star controls the element of the month', rank:3 },
    { key:'trapped',    cn:'囚', en:'Trapped',    note:'the element of the month controls the star', rank:2 },
    { key:'dead',       cn:'死', en:'Dead',       note:'the element of the month feeds the star, leaving it no role (also called Useless 廢)', rank:1 }
  ];
  var MONTH_ELEM = ['water','earth','wood','wood','earth','fire','fire','earth','metal','metal','earth','water'];   // by branch, 子 first
  function starSeason(starElem, monthBranch) {
    var m = MONTH_ELEM[monthBranch];
    if (!starElem || !m) return null;
    if (PRODUCE_EN[starElem] === m) return STAR_STAGE[0];
    if (starElem === m) return STAR_STAGE[1];
    if (CONTROL_EN[starElem] === m) return STAR_STAGE[2];
    if (CONTROL_EN[m] === starElem) return STAR_STAGE[3];
    return STAR_STAGE[4];
  }

  /* ---------------- 主客: Host and Guest ----------------
   * The heaven plate star is the Guest and the star native to the palace is the Host (compendium p.454-459). Countering or being
   * produced favours the side on top: 客克主 and 主生客 favour the Guest, 主克客 and 客生主 favour the Host. The book's own
   * paragraph on 主克客 repeats "Heavenly harming Earthly"; p.456 states the rule plainly, so that is what is followed here.
   * A 客克主 pair can never have both stars in season, so its Timely Host case is simply the out-of-season Guest.
   */
  var HOST_GUEST = {
    guest_controls: { cn:'客克主', en:'Guest Harming the Host', favours:'guest' },
    guest_produces: { cn:'客生主', en:'Guest Produces the Host', favours:'host' },
    host_controls:  { cn:'主克客', en:'Host Harming the Guest', favours:'host' },
    host_produces:  { cn:'主生客', en:'Host Producing the Guest', favours:'guest' },
    bi_he:          { cn:'比和', en:'Harmony', favours:'even' }
  };
  function hostGuest(heavenStar, earthStar, palaceElem, monthBranch, dayStem, hourStem) {
    var he = STAR_ELEM[heavenStar], ee = STAR_ELEM[earthStar];
    if (!he || !ee) return null;
    var h = starSeason(he, monthBranch), e = starSeason(ee, monthBranch), timely = function (x) { return x.rank >= 4; };
    var key = he === ee ? 'bi_he' : CONTROL_EN[he] === ee ? 'guest_controls' : PRODUCE_EN[he] === ee ? 'guest_produces' : CONTROL_EN[ee] === he ? 'host_controls' : 'host_produces';
    var r = HOST_GUEST[key], favours = r.favours, strong = false, note;
    if (key === 'guest_controls') {
      if (timely(h)) { strong = true; note = 'The Guest star is in season and the Host star is not. This is bad for a passive Host, so act first.'; }
      else if (timely(e)) { favours = 'host'; note = 'The Guest star is out of season and the Host star is in season, so the attack cannot land. The Host holds.'; }
      else { favours = 'even'; note = 'Both stars are out of season, so the Guest star cannot do real harm. Neither side has an edge.'; }
    } else if (key === 'guest_produces') {
      if (h.key === 'weak' && e.key === 'prosperous') { strong = true; note = 'A weak Guest star is feeding a prosperous Host star. The Host gains most, especially with quiet or hidden moves.'; }
      else note = 'The Guest star feeds the Host star. Being passive pays: plan and prepare.';
    } else if (key === 'host_controls') note = 'Good for the Host in travel, fame or a management role. Avoid elaborate planning, which is likely to be flawed and costly.';
    else if (key === 'host_produces') note = 'The Host star feeds the Guest star. Attack, show your strengths and plan soundly, but expect to contribute your own effort and resources.';
    else note = 'Both stars share an element, so there is harmony and no edge for either side.';
    // Dead and countered by both the Day and Hour Stems: the Qi is spent, and neither side will succeed.
    var ctl = function (s) { return s !== undefined && CONTROL_EN[STEM_ELEM_EN[s]] === he; };
    if (h.key === 'dead' && ctl(dayStem) && ctl(hourStem)) { favours = 'neither'; strong = false; note = 'The Guest star is Dead and countered by both the Day and Hour Stems. Neither side will succeed.'; }
    var fed = palaceElem === he || PRODUCE_EN[palaceElem] === he, hit = CONTROL_EN[palaceElem] === he;
    return { key: key, cn: r.cn, en: r.en, favours: favours, strong: strong, note: note,
      heaven: heavenStar, heavenStage: h, earth: earthStar, earthStage: e,
      doubled: timely(h) && fed,            // 喜上加喜: in season and supported as well
      worsened: h.rank <= 2 && hit };       // out of season and countered as well
  }

  /* ---------------- The eight doors by season, and against their palace ----------------
   * Each door takes one of eight states from the current eighth of the year, which starts at 冬至 and turns every three solar terms
   * (compendium p.305-306). The states step along the door order below, so one cycle gives the whole table. Separately, the door's
   * element against its palace gives 门迫, 宫迫, 和 or 义 (p.300-303). Ranks place the eight states on the five-step strength scale.
   */
  var DOOR_ORDER = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
  var DOOR_STATES = [
    { key:'prosperous', cn:'旺', en:'Prosperous', note:'this is the door\'s own season, so it is at full strength', rank:5 },
    { key:'abandoned',  cn:'廢', en:'Abandoned',  note:'its season has just passed, and it is out of use', rank:1 },
    { key:'weak',       cn:'休', en:'Weak',       note:'it is resting, some way past its season', rank:3 },
    { key:'trapped',    cn:'囚', en:'Trap',       note:'the season holds it down', rank:2 },
    { key:'death',      cn:'死', en:'Death',      note:'its season is opposite, so it is at its lowest', rank:1 },
    { key:'absent',     cn:'沒', en:'Absent',     note:'it has faded from the season', rank:2 },
    { key:'conceived',  cn:'胎', en:'Conceived',  note:'it is forming, and its season is still ahead', rank:3 },
    { key:'strong',     cn:'相', en:'Strong',     note:'its season comes next, so it is rising', rank:4 }
  ];
  function doorSeason(door, termIndex) {
    var d = DOOR_ORDER.indexOf(door);
    if (d < 0 || termIndex === undefined) return null;
    return DOOR_STATES[mod(Math.floor(mod(termIndex - 21, 24) / 3) - d, 8)];   // term 21 is 冬至
  }
  var DOOR_PALACE = {
    same:           { key:'same',           cn:'比和', en:'Same element', note:'the door and palace share an element' },
    harmony:        { key:'harmony',        cn:'和',   en:'Harmony',      note:'the door produces its palace' },
    justice:        { key:'justice',        cn:'义',   en:'Justice',      note:'the palace produces the door' },
    door_compels:   { key:'door_compels',   cn:'门迫', en:'Door Compelling', note:'the door counters its palace, the more severe case: a good door gives little, and a bad door does less harm' },
    palace_compels: { key:'palace_compels', cn:'宫迫', en:'Palace Compelling', note:'the palace counters the door: a good door is reduced, and a bad door is subdued' }
  };
  function doorVsPalace(doorElem, palaceElem) {
    if (!doorElem || !palaceElem) return null;
    if (doorElem === palaceElem) return DOOR_PALACE.same;
    if (PRODUCE_EN[doorElem] === palaceElem) return DOOR_PALACE.harmony;
    if (PRODUCE_EN[palaceElem] === doorElem) return DOOR_PALACE.justice;
    return CONTROL_EN[doorElem] === palaceElem ? DOOR_PALACE.door_compels : DOOR_PALACE.palace_compels;
  }

  /* 五不遇时: the hour stem counters the day stem at the same polarity. The compendium calls it highly unfavourable (p.754) but gives it
   * only minor influence on analysis and forecasting; it belongs mainly to date selection (p.163). So readings warn without rescoring,
   * and the tools that suggest a time leave these hours out. */
  function disharmony(dayStem, hourStem) {
    if (!C.controls(C.STEM_ELEM[hourStem], C.STEM_ELEM[dayStem]) || C.STEM_YIN[hourStem] !== C.STEM_YIN[dayStem]) return null;
    return { day: C.STEMS[dayStem], hour: C.STEMS[hourStem], label: 'Five Disharmony Hour 五不遇时',
      text: 'The hour stem ' + C.STEMS[hourStem] + ' counters the day stem ' + C.STEMS[dayStem] + ', which makes this a Five Disharmony Hour. Host and Guest are out of harmony and the situation is unstable. This matters most when you choose a time to act, so use another hour if you can.' };
  }

  /* 三奇入墓 (compendium p.742): a Noble on the heaven plate in one of its two grave palaces. The structure fires on most plates somewhere,
   * so readings only warn about a Noble they actually depend on. */
  var NOBLE_GRAVE = { '乙': ['Day Noble', 6, 2], '丙': ['Month Noble', 6, 1], '丁': ['Star Noble', 1, 8] };
  function nobleGrave(stem, palaceNum) {
    var g = NOBLE_GRAVE[stem];
    if (!g || (palaceNum !== g[1] && palaceNum !== g[2])) return null;
    return { stem: stem, noble: g[0], num: palaceNum, label: stem + ' ' + g[0] + ' in its grave 入墓',
      text: stem + ', the ' + g[0] + ', is in a grave palace (' + PAL_NAME[palaceNum] + ', palace ' + palaceNum + '). A Noble here loses strength, which points to setbacks and to supporters falling away.' };
  }

  // Shown with every health reading, whatever its verdict.
  var HEALTH_CARE = { label: 'Your health comes first', text: 'This reading is about timing and approach, not the state of your health. Whatever it says, good or bad, it is never a reason to delay, avoid or stop medical care. If you have a concern, see a doctor now and do not wait for a better time shown here.' };

  /* 马星 from the hour branch (chart legends, compendium p.159): 申子辰 to 寅, 寅午戌 to 申, 巳酉丑 to 亥, 亥卯未 to 巳. This gives the palace holding that branch. */
  function horsePalace(hourBranch) { return { 0: 8, 4: 8, 8: 8, 2: 2, 6: 2, 10: 2, 5: 6, 9: 6, 1: 6, 11: 4, 3: 4, 7: 4 }[hourBranch]; }

  /* White Tiger and Black Tortoise appear on Yin plates. On Yang plates Grappling Hook and Red Phoenix replace them (p.613). */
  var DEITY_SLOT = { '白虎': '勾陈', '勾陈': '白虎', '玄武': '朱雀', '朱雀': '玄武' };
  var RULE_ELEMS = ['wood', 'fire', 'earth', 'metal', 'water'], STEM_CHARS = '甲乙丙丁戊己庚辛壬癸';

  /* The compendium's Forecast panels (door pages p.316-430, star pages p.468-515, deity pages p.631-674), for each topic.
   * seats are the person's palaces: the Day Stem, and the birth-year stem when known, since the book reads either. The points are QiPath's own weights. */
  function forecastRules(chart, topic, seats, hourBranch, ctx) {
    var P = chart.palacesByNumber, out = [], horse = P[horsePalace(hourBranch)];
    var add = function (tone, score, label, text) { out.push({ tone: tone, score: score, label: label, text: text }); };
    var where = function (field, c) {
      for (var n = 1; n <= 9; n++) if (P[n] && P[n][field] === c) return P[n];
      return null;
    };
    var deity = function (c) { return where('spirit', c) || where('spirit', DEITY_SLOT[c]); };
    var mine = function (pa) { return !!pa && seats.indexOf(pa) >= 0; };
    var idx = function (pa) { return RULE_ELEMS.indexOf(pa.element); };
    var feeds = function (a, b) { return C.produces(idx(a), idx(b)); };
    var counters = function (a, b) { return C.controls(idx(a), idx(b)); };
    var feedsMe = function (a) { return seats.some(function (s) { return feeds(a, s); }); };
    var countersMe = function (a) { return seats.some(function (s) { return counters(a, s); }); };
    var timely = function (a) { return !!a.gateStrength && a.gateStrength.rank >= 4; };
    var ownSeat = function (field, c) { return seats.filter(function (s) { return s[field] === c; })[0] || null; };
    var harmony = function (a) {
      var h = STEM_CHARS.indexOf(a.heavenStemCn), e = STEM_CHARS.indexOf(a.earthStemCn);
      return h >= 0 && e >= 0 && Math.abs(h - e) === 5;
    };
    var lingers = function (a, what) {
      if (a && harmony(a)) add('danger', -1, 'A stem Harmony 相合 at ' + what, 'A Harmony usually brings people together, but in illness and disputes it means the trouble tends to linger.');
    };

    if (topic === 'marriage') {
      var he = where('spirit', '六合');
      if (he) {
        var g = he.gate;
        if (g === '开门') add('danger', -2, 'Six Harmony with the Open Door', 'The door of the marriage stands open, which points to a third person entering.');
        if (g === '伤门' || g === '杜门') add('danger', -2, 'Six Harmony with the ' + (g === '伤门' ? 'Harm' : 'Delusion') + ' Door', 'This points to an unhappy marriage and family life.');
        if (g === '死门') add('danger', countersMe(he) ? -3 : -2, 'Six Harmony with the Death Door', countersMe(he) ? 'This points to a marriage coming to an end. The palace also counters yours, so divorce is a real possibility.' : 'This points to a marriage coming to an end.');
        if (g === '景门' && countersMe(he)) add('danger', -3, 'Six Harmony with the Scenery Door', 'Together they counter your palace, which points to an unhappy marriage that may end in divorce.');
        var fe = where('gate', '惊门');
        if (mine(he) && fe && (fe === he || counters(fe, he))) add('danger', -3, 'Six Harmony with you, against the Fear Door', 'This points to a marriage breaking down. At worst it goes to court.');
        if (he.gateRank === 0 && (he.starCn === '天芮' || he.starCn === '天冲')) add('danger', -1, 'Six Harmony with ' + he.starCn + ' and a bad door', 'This adds to the signs of trouble in the marriage.');
        if (he.starCn === '天蓬' && (he.gateRank === 2 || he.isEmpty || he === horse)) add('danger', -2, 'Six Harmony with the Grass star 天蓬', 'The marriage is not running smoothly, and a third party may come into the picture.');
        if (mine(he) && he.gateRank === 2 && g !== '开门') add('good', 3, 'Six Harmony and a good door with you', 'This points to a happy and harmonious marriage.');
      }
      var re = where('gate', '休门');
      if (re && timely(re) && feedsMe(re)) add('good', 2, 'A timely Rest Door feeds you', 'This points to a happy family and a contented life.');
      else if (re && seats.some(function (s) { return counters(s, re); })) add('danger', -2, 'Your palace counters the Rest Door', 'This points to unhappiness at home.');
      var lf = where('gate', '生门');
      if (lf && timely(lf) && seats.some(function (s) { return feeds(lf, s) || feeds(s, lf); })) add('good', 2, 'A timely Life Door supports you', 'You and the Life Door feed each other, which points to a happy marriage.');
    }

    if (topic === 'career' || topic === 'promotion' || topic === 'job') {
      var op = where('gate', '开门');
      if (op) {
        var pk = op.gatePalace && op.gatePalace.key;
        if (topic !== 'job' && timely(op) && feedsMe(op)) add('good', 3, 'A timely Open Door feeds you', 'This points to career success and good luck with work.');
        if (op === horse && (op.isEmpty || pk === 'palace_compels')) add('danger', -3, 'The Open Door with the Horse Star 马星', 'The door is ' + (op.isEmpty ? 'void' : 'countered') + ' while the Horse Star moves it, which points to a real risk of losing the post.');
        else if (op === horse && pk === 'door_compels') add('neutral', -1, 'The Open Door with the Horse Star 马星', 'The door is compelled while the Horse Star moves it, so the job is likely to change.');
      }
    }

    if (topic === 'wealth') {
      var li = where('gate', '生门'), hm = where('gate', '伤门');
      if (li && timely(li) && seats.some(function (s) { return feeds(li, s) || feeds(s, li) || idx(s) === idx(li); })) add('good', li.gateStrength.rank >= 5 ? 3 : 1, 'A timely Life Door supports you', li.gateStrength.rank >= 5 ? 'You and the Life Door are in step, which points to good luck with money.' : 'You and the Life Door are in step, but it is only at its second-best stage, so expect modest gains.');
      if (hm && timely(hm) && feedsMe(hm)) add('good', 2, 'A timely Harm Door feeds you', 'This points to a chance of a windfall.');
      var tt = ownSeat('spirit', '玄武') || ownSeat('spirit', '朱雀');
      if (tt && tt.gateRank === 2 && tt.starCn === '天蓬') add('good', 3, 'The Grass star, a good door and the Black Tortoise with you', 'This points to luck with money.');
      if (tt && tt.gateRank === 0) add('danger', -3, 'The Black Tortoise and a bad door with you', 'This warns of unexpected loss through a dispute or fraud.');
    }

    if (topic === 'deal') {
      var hd = where('spirit', '六合');
      if (hd && hd.gate === '生门') add('good', 2, 'Six Harmony with the Life Door', 'This points to a favourable deal or agreement.');
      else if (hd && hd.gateRank === 0) add('danger', -2, 'Six Harmony with a bad door', 'This points to an unsuitable or uncooperative partner.');
    }

    if (topic === 'health') {
      var gr = where('starCn', '天芮');
      var sick = 'This is a chart symbol and not a diagnosis, so please see a doctor.';
      if (gr) {
        var tiger = gr.spirit === '白虎' || gr.spirit === '勾陈';
        if (mine(gr) && gr.gate === '死门') add('danger', -3, 'The Grain star and the Death Door with you', 'The book reads this as a serious illness that is hard to treat. ' + sick);
        else if (mine(gr) && tiger && gr.gateRank === 0) add('danger', -3, 'The Grain star, a bad door and the White Tiger with you', 'The book reads this as a serious illness that is hard to treat. ' + sick);
        else if (mine(gr) && gr.spirit === '六合') add('danger', -2, 'The Grain star and Six Harmony with you', 'The book reads this as several health problems at once. ' + sick);
        else if ((mine(gr) && gr.gateRank === 0) || countersMe(gr)) add('danger', -2, mine(gr) ? 'The Grain star and a bad door with you' : 'The Grain star counters you', 'The book reads this as a stubborn condition that is slow to clear. ' + sick);
      }
      var ot = where('gate', '开门');
      if (ot && (ot.spirit === '白虎' || ot.spirit === '勾陈') && (mine(ot) || ot === gr)) add('danger', -1, 'The Open Door with the White Tiger', 'In health matters the book reads this as the need for surgery. ' + sick);
      lingers(gr, 'the Grain star');
    }

    if (topic === 'travel') {
      var tg = seats.filter(function (s) { return (s.spirit === '白虎' || s.spirit === '勾陈') && s.gateRank === 0; })[0];
      if (tg) add('danger', -3, 'The White Tiger and a bad door with you', 'The book warns of serious misfortune on the road, such as a traffic accident.');
      var nh = ownSeat('spirit', '九天');
      if (nh && nh === horse) add('neutral', 0, 'Nine Heaven and the Horse Star 马星 with you', 'This points to a long journey by air.');
    }

    if (topic === 'exams') {
      var fu = where('starCn', '天辅');
      if (mine(fu)) add('good', 3, 'The Assistant star 天辅 with you', 'This points to good exam results.');
      else if (fu && countersMe(fu)) add('danger', -3, 'The Assistant star 天辅 counters you', 'This points to difficulty passing the exam.');
    }

    /* Below: Joey Yap's Forecasting Methods. Book 1 (FM1) covers wealth, career and exams; book 2 (FM2) covers marriage, health, law and lost things. */
    var at = function (stem) { return where('heavenStemCn', stem); };
    var rated = function (a, cat) { return !a ? 0 : ((ctx && ctx.forms) || []).filter(function (f) { return f.category === cat && (f.palaces || []).indexOf(a.num) >= 0; }).length; };
    var fine = function (a) { return rated(a, 'auspicious') > rated(a, 'hostile'); };
    var poor = function (a) { return rated(a, 'hostile') > rated(a, 'auspicious'); };
    var starGood = function (a) { return ['天辅', '天心', '天任', '天禽', '天冲'].indexOf(a.starCn) >= 0; };
    var starTimely = function (a) { return !!a.starStrength && a.starStrength.rank >= 4; };
    var nobleHere = function (a) { return ['乙', '丙', '丁'].indexOf(a.heavenStemCn) >= 0; };

    if (topic === 'travel') { // FM1 p.262-263 and p.279-280: Scenery is the road, Rest the sea route, and Nine Heaven with the Open Door the air route.
      var tv = seats[0], hs = ctx && ctx.hourStem ? at(ctx.hourStem) : null, rd = where('gate', '景门'), sr = where('gate', '休门'), oa = where('gate', '开门');
      if (tv && tv.gateRank === 2 && fine(tv)) add('good', 2, 'A good door and good structures with you', 'Whatever the transport, the trip should run smoothly.');
      if (hs && hs.isEmpty) add('danger', -2, 'The Hour Stem is void', 'The trip may do more harm than good, so it is better to wait.');
      if (rd && fine(rd)) add('neutral', 0, 'By land: the Scenery Door is well supported', 'This is a good time to travel by road or rail.');
      if (sr && fine(sr)) add('neutral', 0, 'By sea: the Rest Door is well supported', 'This is a good time to travel by water.');
      else if (sr && poor(sr)) add('neutral', 0, 'By sea: the Rest Door has bad structures', 'Avoid travelling by water if you can.');
      if (oa && fine(oa)) add('neutral', 0, 'By air: the Open Door is well supported', 'This is a good time to fly.');
    }

    if (topic === 'partnership') { // FM1 p.100: the Day Stem is you, the Hour Stem the partner and the Life Door the profit.
      var me = seats[0], pr = ctx && ctx.hourStem ? at(ctx.hourStem) : null, pfd = where('gate', '生门');
      if (me && pr) {
        if (me === pr || idx(me) === idx(pr)) add('good', 2, 'You and your partner stand level', 'This points to an alliance that benefits everyone, with agreement on most matters.');
        else if (feeds(pr, me) && fine(pr)) add('good', 3, 'Your partner\'s palace feeds yours', 'This points to a profitable partnership, so an offer is worth taking.');
        else if (feeds(me, pr)) add('danger', -2, 'Your palace feeds your partner\'s', 'You may lose out on the profit share and carry more of the work.');
        else if (counters(pr, me)) add('danger', -2, 'Your partner\'s palace counters yours', 'This partnership is not ideal for you, so look at other options.');
        else if (counters(me, pr)) add('danger', -2, 'Your palace counters your partner\'s', 'An unbalanced deal is likely to bring disputes and slow the business down.');
      }
      if (me && pfd && feeds(pfd, me)) add('good', 2, 'The Life Door feeds you', 'This points to a profitable partnership with a good return.');
      else if (me && pfd && counters(pfd, me)) add('danger', -2, 'The Life Door counters you', 'This points to obstacles and little profit for either partner.');
    }

    if (topic === 'loan') { // FM1 p.156-157: the Chief is the lender, and the Envoy the borrower.
      var ld2 = where('spirit', '值符'), ev = ctx && ctx.envoy ? where('gate', ctx.envoy) : null;
      if (ld2 && ev && ld2 !== ev) {
        if (feeds(ld2, ev) || counters(ev, ld2)) add('good', 2, 'The lender favours the borrower', 'The Chief feeds the Envoy, or the Envoy has the upper hand, which points to approval.');
        else if (counters(ld2, ev) || feeds(ev, ld2)) add('danger', -2, 'The lender does not favour the borrower', 'Expect obstacles, such as paperwork or criteria you may not meet.');
      }
      if ((ld2 && ld2.isEmpty) || (ev && ev.isEmpty)) add('danger', -2, 'The lender or borrower is void', 'Expect rejections before anything is approved.');
    }

    if (topic === 'marriage') { // FM2 p.30-41: 乙 is the wife and 庚 the husband.
      var wife = at('乙'), man = at('庚');
      if (wife && man && wife === man && (wife.gateRank === 0 || poor(wife))) add('danger', -3, '乙 and 庚 together with bad signs', 'The relationship has a shaky foundation and may crumble at the first sign of trouble.');
      if (wife && man && wife !== man) {
        if (counters(man, wife)) add('danger', -3, 'The husband\'s palace 庚 counters the wife\'s 乙', 'This points to constant argument and a possible divorce.');
        else if (counters(wife, man)) add('danger', -2, 'The wife\'s palace 乙 counters the husband\'s 庚', 'This points to a proposal being turned down, or the other side needing more time.');
        else if (feeds(wife, man) || feeds(man, wife)) add('good', 2, 'The palaces of 乙 and 庚 support each other', 'This points to a successful marriage with mutual respect.');
      }
      [wife, man].forEach(function (a, i) {
        if (!a || (i && a === wife)) return;
        var who = a === wife && a === man ? '乙 and 庚' : i ? '庚' : '乙';
        if (a.spirit === '腾蛇' || a.spirit === '朱雀') add('danger', -1, a.spirit + ' with ' + who, 'Be wary of a devious go-between and of unnecessary expense around the marriage.');
        if (a.spirit === '勾陈' || a.spirit === '白虎') add('danger', -2, a.spirit + ' with ' + who, 'This points to a match that turns out badly.');
        if (a.spirit === '九地') add('neutral', 0, 'Nine Earth with ' + who, 'Marriage is likely to come much later, after some disappointments.');
        if (a.spirit === '九天') add('neutral', -1, 'Nine Heaven with ' + who, 'This points to a sudden marriage on short notice, with the pressure that brings.');
      });
    }

    if (topic === 'promotion') { // FM1 p.164-165.
      var po = where('gate', '开门'), pl = where('gate', '生门'), duke = ctx && ctx.yearStem ? at(ctx.yearStem) : null;
      if (po && pl) {
        var bothTimely = timely(po) && timely(pl), bothFine = fine(po) && fine(pl);
        if (bothTimely && bothFine && duke && feedsMe(duke)) add('good', 3, 'Open and Life Doors timely, with the year stem feeding you', 'This points to a promotion, so it may be the right time to show what you can do.');
        else if (bothFine && !bothTimely) add('neutral', 1, 'Open and Life Doors well supported but not timely', 'A promotion is possible but not immediate. Keep showing your ability.');
        else if (bothTimely && !bothFine) add('danger', -2, 'Open and Life Doors timely but unsupported', 'A promotion is unlikely for now, because the backing for it is not there.');
      }
    }

    if (topic === 'job') { // FM1 p.181: the Open Door against the Day Stem or Life Stem.
      var jo = where('gate', '开门'), day = seats[0];
      if (jo && feedsMe(jo)) add('good', 3, 'The Open Door feeds you', 'This points to a successful application, and to a role that can be a good stepping stone.');
      else if (jo) add('danger', -2, 'The Open Door does not feed you', 'This points to not being offered this role.');
      if (day && nobleHere(day) && fine(day)) add('good', 2, 'A Noble and good structures with you', 'This points to a very desirable position.');
    }

    if (topic === 'wealth') { // FM1 p.76-77 and p.105: 戊 is the capital and the Life Door the profit.
      var wu = at('戊'), pf = where('gate', '生门');
      if (wu && pf && wu === pf) add(starGood(wu) ? 'good' : 'danger', starGood(wu) ? 3 : -2, '戊 and the Life Door together', starGood(wu) ? 'With a good star here, this is a good time for important business plans.' : 'With a poor star here, expect obstacles in business.');
      if (wu && pf && wu !== pf) {
        if (feeds(pf, wu) && fine(pf)) add('good', 2, 'The Life Door feeds your capital 戊', 'This points to a profitable investment.');
        else if (counters(pf, wu) && poor(pf)) add('danger', -3, 'The Life Door counters your capital 戊', 'This points to losses. The opportunities are there, but the timing is not.');
        else if (feeds(wu, pf)) add('neutral', 0, 'Your capital 戊 feeds the Life Door', 'Returns are more likely later, so manage what you have and wait.');
      }
      if (pf && pf === P[4] && poor(pf)) add('danger', -3, 'The Life Door in its grave', 'With bad structures here, this warns of heavy loss. Be patient and wait for the right time.');
    }

    if (topic === 'deal') { // FM1 p.108-110: the Day Stem is the buyer, the Hour Stem the seller and Six Harmony the agent.
      var seller = ctx && ctx.hourStem ? at(ctx.hourStem) : null, agent = where('spirit', '六合'), buyer = seats[0];
      if (seller && seller === buyer) add('good', 3, 'Day Stem and Hour Stem together', 'This points to a fair trade and a successful deal.');
      if ((seller && seller.isEmpty) || (buyer && buyer.isEmpty)) add('danger', -2, 'A party to the deal is void', 'This points to a deal that falls through after many disagreements.');
      if (agent && agent.isEmpty) add('danger', -2, 'The agent Six Harmony is void', 'Watch for dishonesty, and get everything in writing.');
    }

    if (topic === 'launch') { // FM1 p.92-94: the Open Door with each deity.
      var lo = where('gate', '开门'), LD = { '值符': [2, 'Smooth start, with support from helpful people.'], '太阴': [2, 'A good start that makes an impact on customers.'], '六合': [2, 'A warm reception, and it suits a partnership.'], '九天': [1, 'It suits building a strong name, with extra work.'],
        '腾蛇': [-2, 'An unsteady start.'], '白虎': [-2, 'Major obstacles after the start.'], '勾陈': [-2, 'Major obstacles after the start.'], '玄武': [-2, 'Chaos or internal threats that weaken the foundation.'], '朱雀': [-2, 'Chaos or internal threats that weaken the foundation.'], '九地': [-2, 'A period of inactivity after the start.'] };
      var ld = lo && LD[lo.spirit];
      if (ld) add(ld[0] > 0 ? 'good' : 'danger', ld[0], 'The Open Door with ' + lo.spirit, ld[1]);
    }

    if (topic === 'health') { // FM2 p.66 and p.81: the patient and the Grain star against the Life and Death Doors. Wording is softened on purpose.
      var pt = seats[0], ill = where('starCn', '天芮'), sk = 'This is a chart symbol and not a diagnosis, so please see a doctor.';
      if (pt && pt.gate === '生门') add('good', 3, 'You stand with the Life Door', 'The book reads this as good prospects of recovery, even if things do not look good yet. ' + sk);
      else if (pt && pt.gate === '死门') add('danger', poor(pt) ? -3 : -2, 'You stand with the Death Door', (poor(pt) ? 'The book reads this as a serious illness. ' : 'The book reads this as a stubborn illness, though you are still pulling through. ') + sk);
      else if (pt) add('neutral', -1, 'You stand with neither the Life nor the Death Door', 'The book reads this as an illness that may linger, with a better outcome if help comes early. ' + sk);
      if (ill) {
        var lf2 = where('gate', '生门'), dd = where('gate', '死门');
        if (ill === lf2 || (lf2 && feeds(lf2, ill))) add('good', 2, 'The Grain star with the Life Door', 'Recovery may be hard, but the book reads this as the strength to overcome it. ' + sk);
        else if (ill === dd || (dd && feeds(dd, ill))) add('danger', -2, 'The Grain star with the Death Door', 'The book reads this as the condition getting worse. ' + sk);
        if (ill === P[7] || ill === P[6]) add('danger', -2, 'The Grain star in a Metal palace', 'The book reads this as a condition that resists the usual treatment. ' + sk);
        if (ill === P[9]) add('danger', -1, 'The Grain star in the Li palace', 'The book reads this as a condition that may come back. ' + sk);
      }
    }

    if (topic === 'cure') { // FM2 p.73-75: the Heart star and 乙 are the doctor.
      var doc = where('starCn', '天心'), med = at('乙'), ig = where('starCn', '天芮');
      if (doc && starTimely(doc) && fine(doc)) add('good', 2, 'The Heart star is timely and well supported', 'This points to a skilled doctor and a suitable treatment.');
      else if (doc && (!starTimely(doc) || poor(doc))) add('neutral', -1, 'The Heart star is not well placed', 'Consider asking another doctor as well. This is not a reason to stop your treatment.');
      if (ig && ((doc && counters(doc, ig)) || (med && counters(med, ig)))) add('good', 2, 'The doctor counters the illness', 'This points to a skilled practitioner who can deal with the condition.');
    }

    if (topic === 'exams') { // FM1 p.231-232.
      var cf = where('spirit', '值符'), dg = at('丁');
      if (cf && countersMe(cf)) add('danger', -2, 'The Chief counters you', 'The examiners may be hard to impress, so do more than the standard answer.');
      else if (cf && feedsMe(cf)) add('good', 2, 'The Chief feeds you', 'Put in the effort and you should pass.');
      if (dg && countersMe(dg)) add('danger', -2, 'Ding 丁, the exam topic, counters you', 'Expect a challenging paper, and prepare well.');
      else if (dg && feedsMe(dg)) add('good', 1, 'Ding 丁, the exam topic, feeds you', 'The paper should be within reach.');
    }

    if (topic === 'learning') { // FM2 p.198: the Assistant star is the teacher and the Grain star the student.
      var tc = where('starCn', '天辅'), st = where('starCn', '天芮');
      if (tc && st && fine(tc) && feeds(tc, st)) add('good', 3, 'The teacher feeds the student', 'This points to a good teacher and a fruitful relationship.');
      else if (tc && st && fine(tc) && idx(tc) === idx(st)) add('neutral', 0, 'The teacher and student stand level', 'A great teacher may be hard to engage, but there is still plenty to learn.');
    }

    if (topic === 'lost_object') { // FM2 p.236-237: the deity with the Day Stem.
      var LS = { '九地': [-2, 'Someone may be hiding the item.'], '太阴': [-2, 'Someone may be hiding the item.'], '九天': [-2, 'The item may be far away, and getting it back would cost time and money.'], '玄武': [-3, 'The item has probably been stolen.'],
        '腾蛇': [-2, 'Someone has probably taken the item.'], '朱雀': [2, 'Someone may have borrowed it, and it should come back.'], '勾陈': [1, 'Someone may have taken it by accident, so it may be returned.'] };
      var os = seats[0] && LS[seats[0].spirit];
      if (os) add(os[0] > 0 ? 'good' : 'danger', os[0], seats[0].spirit + ' with you', os[1]);
    }

    if (topic === 'dispute') { // FM2 p.148: the Chief is the plaintiff and the earth star of its palace, the Heavenly Yi, is the defendant.
      var pl2 = where('spirit', '值符'), yiStar = pl2 && pl2.hostGuest ? pl2.hostGuest.earth : null, EA = function (s) { var e = STAR_ELEM[s]; return typeof e === 'number' ? e : RULE_ELEMS.indexOf(e); };
      if (pl2 && yiStar && pl2.starCn) {
        if (C.controls(EA(pl2.starCn), EA(yiStar))) add('neutral', 0, 'The Chief counters the Heavenly Yi', 'The court leans toward the plaintiff, the side that brought the case.');
        else if (C.controls(EA(yiStar), EA(pl2.starCn))) add('neutral', 0, 'The Heavenly Yi counters the Chief', 'The court leans toward the defendant.');
      }
    }

    if (topic === 'dispute') lingers(where('heavenStemCn', '庚'), 'your opponent');
    return out;
  }

  /** The plate's read: the star relation at the chief star, then the hour. Yang hours (甲 to 戊) favour the Guest, and Yin hours (己 to 癸) the Host. */
  function hostGuestRead(chart, useHour) {
    var P = chart.palacesByNumber, nums = [1, 2, 3, 4, 6, 7, 8, 9], chief = null, tally = { guest: 0, host: 0, even: 0, neither: 0 };
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n) { if (P[n] && P[n].isChief && P[n].hostGuest) chief = P[n]; });
    nums.forEach(function (n) { var x = P[n] && P[n].hostGuest; if (x) tally[x.favours]++; });
    var j = chief ? chief.hostGuest : null, jf = j && (j.favours === 'guest' || j.favours === 'host') ? j.favours : null;
    var idx = chart.meta.hourStemIdx, hf = useHour ? (idx < 5 ? 'guest' : 'host') : null, why = [];
    if (j) why.push('Chief star ' + j.heaven + ' ' + j.heavenStage.cn + ' over ' + j.earth + ' ' + j.earthStage.cn + ' in palace ' + chief.num + ': ' + j.cn + ' ' + j.en + '. ' + j.note);
    if (useHour) why.push(hf === 'guest'
      ? chart.meta.hourCn + ' is a Yang hour, which favours the Guest. It suits expeditions, travel and new ventures, not hiding or escape.'
      : chart.meta.hourCn + ' is a Yin hour, which favours the Host. It suits preparing, secret plans and escape, not taking office, moving, travel, marriage, new business or deals.');
    var dh = useHour ? disharmony(chart.meta.dayStemIdx, idx) : null;
    if (dh) why.push(dh.text);
    if (j && j.doubled) why.push('The chief star is also supported by its palace (喜上加喜), which adds to its strength.');
    if (j && j.worsened) why.push('The chief star is out of season and countered by its palace, which makes things worse.');
    var side = j && j.favours === 'neither' ? 'neither' : jf && hf && jf !== hf ? 'mixed' : jf || hf || 'even';
    return { side: side, chief: j, hour: hf, tally: tally, why: why,
      name: { guest: 'Guest: move first', host: 'Host: wait and respond', mixed: 'Mixed', neither: 'Neither side', even: 'Even' }[side],
      advice: { guest: 'Take the initiative. Make the first move, and favour distance and the outside world.',
        host: 'Hold your ground. Let the other side move first, prepare quietly, and favour what is close to you.',
        mixed: 'The star favours the ' + (jf === 'guest' ? 'Guest' : 'Host') + ', but the hour favours the ' + (hf === 'guest' ? 'Guest' : 'Host') + '. Prepare now and choose a better hour for the decisive step.',
        neither: 'Neither attacking nor defending will succeed now. Delay anything important.',
        even: 'The stars give neither side an edge, so choose your role by the other factors in the chart.' }[side] };
  }

  // Inner (near) palaces sit around the centre; the four cardinal seats are the outer ring.
  var PAL_RING = { 1:'outer', 9:'outer', 3:'outer', 7:'outer',
                   2:'inner', 4:'inner', 6:'inner', 8:'inner', 5:'centre' };

  /*
   * Two ways to set the hourly ju, chosen in Profile (setQimenOptions):
   *  - 置闰 Zhi Run (default): the ju runs in 15-day blocks, each starting on an upper-yuan 符头 day (甲子 己卯 甲午 己酉)
   *    with five days each of 上元 中元 下元. Blocks take the 24 terms in sequence; a block that starts before its term
   *    is 超神, after it 接气. A block of 芒种 or 大雪 is sometimes repeated (置闰) to catch up with the terms. The repeats from
   *    1947 to 2049 come from Joey Yap's Ten Thousand Year Calendar (LEAP_BLOCKS), because no single day count reproduces them.
   *    Outside those years the sequence is anchored on the latest 正授 block and repeats once 超神 reaches nine days.
   *  - 拆补 Chai Bu: the current solar term, with the yuan from the leading 甲/己 day.
   * The void (空亡) on an hourly plate is the hour's xun by default, as most charting software marks it; the day's
   * xun is the alternative. Both are always reported on the chart.
   */
  var QM_OPTS = { method: 'zhirun', voidBy: 'hour', longRule: 'yearly' };
  function setQimenOptions(o) { if (o && o.method) QM_OPTS.method = o.method; if (o && o.voidBy) QM_OPTS.voidBy = o.voidBy; if (o && o.longRule) QM_OPTS.longRule = o.longRule; }
  var UPPER_HEADS = [0, 15, 30, 45];      // 甲子 己卯 甲午 己酉
  var zhiRunCache = {};
  // Each block that the calendar repeats: the 符头 day (JDN) of its first copy, with M for 芒种 and D for 大雪.
  var LEAP_BLOCKS = (
    '2432336M 2433431M 2434346D 2435441D 2436536D 2437631D 2438726D 2439641M 2440736M 2441651D ' +
    '2442746D 2443841D 2444936D 2446031D 2446946M 2448041M 2449136M 2450051D 2451146D 2452241D ' +
    '2453336D 2454251M 2455346M 2456441M 2457356D 2458451D 2459546D 2460641D 2461736D 2462651M ' +
    '2463746M 2464661D 2465756D 2466851D 2467946D 2469041D 2469776D'
  ).split(' ').map(function (s) { return { f: +s.slice(0, -1), name: s.slice(-1) === 'M' ? '芒种' : '大雪' }; });
  // The term of block F, walked from the latest repeat in the table. Null outside the years the calendar covers.
  function termFromLeaps(F, pool) {
    var L = null;
    LEAP_BLOCKS.forEach(function (x) { if (x.f <= F) L = x; });
    if (!L || F > A.civilJDN(2051, 6, 1)) return null;
    var t = -1;
    pool.forEach(function (x, j) { if (x.name === L.name && (t < 0 || Math.abs(x.day - L.f) < Math.abs(pool[t].day - L.f))) t = j; });
    if (t < 0) return null;
    if (F === L.f) return { t: t, leap: false };
    if (F === L.f + 15) return { t: t, leap: true };
    return { t: t + 1 + (F - L.f - 30) / 15, leap: false };
  }
  function localDayJDN(jd) { var g = A.jdToLocal(jd); return A.civilJDN(g.y, g.m, Math.floor(g.d)); }
  function zhiRun(p) {
    var D = p.dayJDN, i0 = mod(p.day.i - D, 60), F = D - mod(mod(D + i0, 60), 15);
    if (zhiRunCache[F]) return zhiRunCache[F];
    var y = new Date().getFullYear(), g = A.jdToLocal(p.jdn || D);
    y = g && g.y ? g.y : y;
    var pool = [];
    [y - 3, y - 2, y - 1, y, y + 1].forEach(function (yy) {
      A.termsForYear(yy).forEach(function (t) { pool.push({ name: t.name, day: localDayJDN(t.jd) }); }); });
    pool.sort(function (a, b) { return a.day - b.day; });
    var known = termFromLeaps(F, pool);
    if (known && pool[known.t]) return (zhiRunCache[F] = { term: pool[known.t].name, start: F, drift: pool[known.t].day - F, leap: known.leap });
    // Anchor: the latest block at or before F whose 符头 day is a term's day (正授).
    var anchorF = null, anchorT = -1;
    for (var k = 0; k < 120 && anchorF === null; k++) {
      var f = F - 15 * k;
      for (var j = 0; j < pool.length; j++) if (pool[j].day === f) { anchorF = f; anchorT = j; break; }
    }
    if (anchorF === null) return null;
    var t = anchorT, repeated = false;
    for (var b = anchorF; b < F; b += 15) {
      var nm = pool[t].name;
      if (!repeated && (nm === '芒种' || nm === '大雪') && pool[t].day - b >= 9) { repeated = true; continue; }  // 置闰: repeat this term
      repeated = false; t++;
    }
    return (zhiRunCache[F] = { term: pool[t].name, start: F, drift: pool[t].day - F, leap: repeated });
  }

  function plateStem(q) { return C.STEMS[q.stem === 0 ? YI_ORDER[Math.floor(mod(q.i - (q.i % 10), 60) / 10)] : q.stem]; }
  function qimen(p) {
    var termName = p.term.name;
    var dayIdx = p.day.i, yuan, zr = null;
    if (QM_OPTS.method === 'zhirun' && !p.qmOverride) { try { zr = zhiRun(p); } catch (e) { zr = null; } }
    if (zr) {
      termName = zr.term;
      yuan = Math.floor(mod(p.dayJDN - zr.start, 15) / 5);
    } else {
      // Yuan via the Chai-bu method: the leading Jia/Ji day sets upper / middle / lower.
      var head = dayIdx;
      while (!(head % 10 === 0 || head % 10 === 5)) head = mod(head - 1, 60);
      var hb = head % 12;
      yuan = ([0,6,3,9].indexOf(hb) >= 0) ? 0 : ([2,8,5,11].indexOf(hb) >= 0) ? 1 : 2;
    }
    var yin = YIN_TERMS.indexOf(termName) >= 0;
    var juSet = QM_JU[termName] || [1,1,1];
    var ju = juSet[yuan];
    // Day / month / year plates fix their own dun and ju (see qmdj.js chartFor).
    var ov = p.qmOverride;
    if (ov) { yin = ov.yin; ju = ov.ju; yuan = ov.yuan === undefined ? yuan : ov.yuan; }
    var voidIdx = ov && ov.voidIdx !== undefined ? ov.voidIdx : (QM_OPTS.voidBy === 'hour' ? p.hour.i : p.day.i);

    // Earth plate: place the nine stems starting at the ju palace.
    var earth = {}; // palace -> stem index
    for (var i = 0; i < 9; i++) {
      var pal = yin ? mod(ju - 1 - i, 9) + 1 : mod(ju - 1 + i, 9) + 1;
      earth[pal] = YI_ORDER[i];
    }
    var stemPalace = {};
    Object.keys(earth).forEach(function (k) { stemPalace[earth[k]] = parseInt(k, 10); });

    // Xun head and its escorting yi
    var hourIdx = p.hour.i;
    var xunHead = hourIdx - (hourIdx % 10);
    var xunYi = YI_ORDER[Math.floor(mod(xunHead, 60) / 10)]; // 甲子->戊 ... 甲寅->癸
    var xunPalace = stemPalace[xunYi] || 1;     // the xun yi's own palace, centre included
    var dutyPalace = xunPalace === 5 ? 2 : xunPalace;

    // 值符 star: a xun yi in the centre makes 天禽 the chief, travelling lodged with 天芮.
    var chief = xunPalace === 5 ? STARS9[4] : STARS9[dutyPalace - 1];
    var envoyPalace = dutyPalace;           // 值使 gate origin

    // Where does the hour stem sit on the earth plate? 甲 never appears there: it hides under
    // its xun yi, so on a 甲 hour the chief stays on its own palace (伏吟). A stem that falls in
    // the centre is lodged in 坤 (2).
    var hourStem = p.hour.stem;
    var landing = hourStem === 0 ? xunPalace : stemPalace[hourStem];
    if (landing === undefined) landing = dutyPalace;
    if (landing === 5) landing = 2;

    // Rotate the heaven plate so the chief star lands on the hour-stem palace.
    // Each star carries its origin palace's stem with it, forming the heaven plate.
    var shift = mod(ringIndex(landing) - ringIndex(dutyPalace), 8);
    var heaven = {}, heavenStem = {}, gates = {}, spirits = {};
    for (var r = 0; r < 8; r++) {
      var from = RING[r], to = RING[mod(r + shift, 8)];
      heaven[to] = STARS9[from - 1];
      heavenStem[to] = earth[from];
    }
    // The centre takes no star or heaven stem: 天禽 and the centre's earth stem have no place on
    // the ring and ride with 天芮 instead (寄坤). Palace 5 keeps only its earth-plate stem.
    // The centre stem is lodged in 坤 on the earth plate and rides with 天芮 on the heaven plate.
    var riderPalace = RING[mod(ringIndex(2) + shift, 8)];

    // Gate rotation (值使随时): starting from the xun yi's palace, the envoy gate moves one palace
    // per hour since the xun head through the Lo Shu NUMBERS — 1→2→…→9 in Yang dun, 9→8→…→1 in
    // Yin dun — and a count that ends on the centre lodges in 坤 (2). The other seven gates keep
    // their ring order around it. (Counting along the outer ring, as before, put every gate in
    // the wrong palace on most hours.)
    var steps = mod(hourIdx - xunHead, 12);
    var gateNum = xunPalace;
    for (var st = 0; st < steps; st++) gateNum = yin ? (gateNum === 1 ? 9 : gateNum - 1) : (gateNum === 9 ? 1 : gateNum + 1);
    if (gateNum === 5) gateNum = 2;
    var envoyRing = ringIndex(envoyPalace);
    var gShift = mod(ringIndex(gateNum) - envoyRing, 8);
    for (var r2 = 0; r2 < 8; r2++) {
      var gFrom = RING[r2];
      var gTo = RING[mod(r2 + gShift, 8)];
      gates[gTo] = GATES8[gFrom];
    }
    // Eight spirits follow the chief, clockwise in Yang dun and anticlockwise in Yin dun.
    var spiritSet = yin ? SPIRITS_YIN : SPIRITS_YANG;
    for (var s = 0; s < 8; s++) {
      var sp = RING[mod(ringIndex(landing) + (yin ? -s : s), 8)];
      spirits[sp] = spiritSet[s];
    }

    var chartEnvoy = GATES8[envoyPalace] || '';
    var palaces = [], byNumber = {};
    for (var q = 1; q <= 9; q++) {
      var gate = gates[q];
      var gnum = null;
      Object.keys(GATES8).forEach(function (k) { if (GATES8[k] === gate) gnum = parseInt(k, 10); });
      var hs = heavenStem[q], es = earth[q];
      var star = heaven[q] || '';
      var spirit = spirits[q] || '';
      var starEl = star ? STAR_ELEM[star] : null;
      var gateEl = gate ? GATE_ELEM[gate] : null;
      var deityEl = spirit ? (SPIRIT_ELEM[spirit] || null) : null;
      var cell = {
        // shape consumed by the ported formation detectors
        number: q,
        element: PAL_ELEM[q],
        heavenStem: hs !== undefined ? { char: C.STEMS[hs], element: STEM_ELEM_EN[hs], yinYang: C.STEM_YIN[hs] ? 'yin' : 'yang' } : null,
        earthStem: es !== undefined ? { char: C.STEMS[es], element: STEM_ELEM_EN[es], yinYang: C.STEM_YIN[es] ? 'yin' : 'yang' } : null,
        door: gate ? { char: gate.charAt(0), element: GATE_ELEM[gate], nature: GATE_NATURE[gate] } : null,
        star: star ? { char: star, element: STAR_ELEM[star] } : null,
        deity: spirit ? { char: spirit, nature: SPIRIT_NATURE[spirit], element: SPIRIT_ELEM[spirit] || null } : null,
        isEmpty: C.voidBranches(voidIdx).some(function (b) {
          return (PAL_BRANCHES[q] || []).indexOf(b) >= 0; }),
        // display fields used by the UI
        num: q, name: PAL_NAME[q], dir: PAL_DIR[q],
        trigram: PAL_NAME[q], ring: PAL_RING[q],
        elementCn: ELEM_CN_EN[PAL_ELEM[q]],
        branches: (PAL_BRANCHES[q] || []).map(function (b) { return C.BRANCHES[b]; }),
        earthStemCn: es !== undefined ? C.STEMS[es] : '',
        heavenStemCn: hs !== undefined ? C.STEMS[hs] : '',
        heavenStem2Cn: q === riderPalace ? C.STEMS[earth[5]] : '',
        star2Cn: q === riderPalace ? STARS9[4] : '',
        earthStem2Cn: q === 2 ? C.STEMS[earth[5]] : '',
        heavenStemStrength: hs !== undefined ? strengthOf(STEM_ELEM_EN[hs], PAL_ELEM[q]) : null,
        earthStemStrength: es !== undefined ? strengthOf(STEM_ELEM_EN[es], PAL_ELEM[q]) : null,
        starCn: star, starEn: star ? STARS9_EN[STARS9.indexOf(star)] : '',
        starElement: starEl, starStrength: starSeason(starEl, p.month.branch), starPalace: strengthOf(starEl, PAL_ELEM[q]),
        hostGuest: star && STARS9[q - 1] ? hostGuest(star, STARS9[q - 1], PAL_ELEM[q], p.month.branch, p.day.stem, p.hour.stem) : null,
        gate: gate || '', gateEn: gnum ? GATES8_EN[gnum] : '',
        gateElement: gateEl, gateStrength: doorSeason(gate, p.term.index), gatePalace: doorVsPalace(gateEl, PAL_ELEM[q]),
        gateRank: gnum ? GATE_RANK[gnum] : 1,
        gateNature: gate ? GATE_NATURE[gate] : null,
        spirit: spirit, spiritEn: spirit,
        spiritElement: deityEl, spiritStrength: strengthOf(deityEl, PAL_ELEM[q]),
        spiritNature: spirit ? SPIRIT_NATURE[spirit] : null,
        isEnvoy: gate && chartEnvoy && gate === chartEnvoy,
        isChief: chief === STARS9[4] ? q === landing : !!star && star === chief,
        isDuty: q === landing
      };
      palaces.push(cell);
      byNumber[q] = cell;
    }

    // Best and worst directions this hour
    var ranked = palaces.filter(function (x) { return x.num !== 5 && x.gate; })
                        .sort(function (a, b) { return b.gateRank - a.gateRank; });

    var chart = {
      dun: yin ? '阴遁' : '阳遁', dunEn: yin ? 'Yin Dun' : 'Yang Dun',
      ju: ju, yuan: ['上元','中元','下元'][yuan], yuanEn: ['Upper','Middle','Lower'][yuan],
      term: termName, basis: ov ? ov.basis : null, chief: chief, chiefEn: STARS9_EN[STARS9.indexOf(chief)],
      method: ov ? 'scope' : zr ? 'zhirun' : 'chaibu', zhiRun: zr,
      hourVoid: C.voidBranches(p.hour.i).map(function (b) { return C.BRANCHES[b]; }),
      dayVoid: C.voidBranches(p.day.i).map(function (b) { return C.BRANCHES[b]; }),
      envoy: chartEnvoy, envoyPalace: envoyPalace,
      mansion: C.lunarMansion(p.jdn),
      voidBranches: C.voidBranches(voidIdx).map(function (b) { return C.BRANCHES[b]; }),
      palaces: palaces,
      best: ranked.slice(0, 2), worst: ranked.slice(-2),
      // detector-facing view
      palacesByNumber: byNumber,
      // The formation detectors read stems with element and yin/yang, and the plate-wide 伏吟 / 反吟: every star in its
      // home palace (the heaven plate unmoved, shift 0) or in the opposite one (shift 4).
      meta: {
        dun: yin ? '阴遁' : '阳遁', ju: ju, term: termName,
        dayPillar: { stem: { char: C.STEMS[p.day.stem], element: STEM_ELEM_EN[p.day.stem], yinYang: C.STEM_YIN[p.day.stem] ? 'yin' : 'yang' },
                     branch: { char: C.BRANCHES[p.day.branch] } },
        hourPillar: { stem: { char: C.STEMS[p.hour.stem], element: STEM_ELEM_EN[p.hour.stem], yinYang: C.STEM_YIN[p.hour.stem] ? 'yin' : 'yang' },
                      branch: { char: C.BRANCHES[p.hour.branch] } },
        fuYin: shift === 0, fanYin: shift === 4,
        solarTime: null, month: null,
        // What the structure tables read: the 符首, and each pillar's stem as it stands on a plate (甲 hides under its 六儀).
        fuShou: C.STEMS[xunYi], pillarBranches: [p.year.branch, p.month.branch, p.day.branch, p.hour.branch], hourCn: p.hour.cn, dayStemCn: C.STEMS[p.day.stem], dayStemIdx: p.day.stem, hourStemIdx: p.hour.stem,
        plateYear: plateStem(p.year), plateMonth: plateStem(p.month), plateDay: plateStem(p.day), plateHour: plateStem(p.hour)
      }
    };
    return chart;
  }

  /* ---------------- Flying Palace plate (飛宮) ----------------
   * The same 局, earth plate, xun chief and envoy as the rotating plate, but nothing is lodged and everything travels through all
   * nine palaces in Lo Shu number order, forwards in Yang dun and backwards in Yin dun. There are nine doors (中门 in the centre) and
   * nine deities (太常 added). Stars and heaven stems follow the chief to the hour stem's palace; doors follow the envoy's count.
   */
  var FLY_DOORS = ['休门', '死门', '伤门', '杜门', '中门', '开门', '惊门', '生门', '景门'];
  var FLY_DOORS_EN = ['Rest', 'Death', 'Harm', 'Delusion', 'Centre', 'Open', 'Fear', 'Life', 'Scenery'];
  var FLY_DEITIES = ['值符', '腾蛇', '太阴', '六合', '勾陈', '太常', '朱雀', '九地', '九天'];
  var FLY_ELEM = { '休门': 'water', '死门': 'earth', '伤门': 'wood', '杜门': 'wood', '中门': 'earth', '开门': 'metal', '惊门': 'metal', '生门': 'earth', '景门': 'fire' };
  function flyingQimen(p) {
    var base = qimen(p), yin = base.dun === '阴遁', ju = base.ju, dir = yin ? -1 : 1;
    var wrap = function (n) { return mod(n - 1, 9) + 1; };
    var earth = {}, stemPalace = {};
    for (var i = 0; i < 9; i++) { var pal = wrap(ju + (yin ? -i : i)); earth[pal] = YI_ORDER[i]; stemPalace[YI_ORDER[i]] = pal; }
    var hourIdx = p.hour.i, xunHead = hourIdx - (hourIdx % 10);
    var xunPalace = stemPalace[YI_ORDER[Math.floor(mod(xunHead, 60) / 10)]];
    var landing = p.hour.stem === 0 ? xunPalace : stemPalace[p.hour.stem];
    var doorPalace = wrap(xunPalace + dir * mod(hourIdx - xunHead, 12));
    var stars = {}, heaven = {}, doors = {}, deities = {};
    for (var k = 1; k <= 9; k++) {
      var to = wrap(landing + (k - xunPalace) * dir);
      stars[to] = STARS9[k - 1]; heaven[to] = earth[k];
      doors[wrap(doorPalace + (k - xunPalace) * dir)] = k;
    }
    FLY_DEITIES.forEach(function (d, s) { deities[wrap(landing + s * dir)] = d; });
    var byNumber = {}, palaces = base.palaces.map(function (c0) {
      var q = c0.num, cell = {}, door = FLY_DOORS[doors[q] - 1], star = stars[q], deity = deities[q], hs = heaven[q], e0 = earth[q];
      Object.keys(c0).forEach(function (key) { cell[key] = c0[key]; });
      var starEl = STAR_ELEM[star], doorEl = FLY_ELEM[door], deityEl = deity === '太常' ? 'earth' : SPIRIT_ELEM[deity];
      var nature = deity === '太常' ? 'auspicious' : SPIRIT_NATURE[deity], doorNature = door === '中门' ? 'neutral' : GATE_NATURE[door];
      cell.heavenStem = { char: C.STEMS[hs], element: STEM_ELEM_EN[hs], yinYang: C.STEM_YIN[hs] ? 'yin' : 'yang' };
      cell.earthStem = { char: C.STEMS[e0], element: STEM_ELEM_EN[e0], yinYang: C.STEM_YIN[e0] ? 'yin' : 'yang' };
      cell.door = { char: door.charAt(0), element: doorEl, nature: doorNature };
      cell.star = { char: star, element: starEl };
      cell.deity = { char: deity, nature: nature, element: deityEl };
      cell.earthStemCn = C.STEMS[e0]; cell.heavenStemCn = C.STEMS[hs]; cell.heavenStem2Cn = ''; cell.star2Cn = ''; cell.earthStem2Cn = '';
      cell.heavenStemStrength = strengthOf(STEM_ELEM_EN[hs], PAL_ELEM[q]); cell.earthStemStrength = strengthOf(STEM_ELEM_EN[e0], PAL_ELEM[q]);
      cell.starCn = star; cell.starEn = STARS9_EN[STARS9.indexOf(star)]; cell.starElement = starEl; cell.starStrength = starSeason(starEl, p.month.branch); cell.starPalace = strengthOf(starEl, PAL_ELEM[q]);
      cell.hostGuest = hostGuest(star, STARS9[q - 1], PAL_ELEM[q], p.month.branch, p.day.stem, p.hour.stem);
      cell.gate = door; cell.gateEn = FLY_DOORS_EN[doors[q] - 1]; cell.gateElement = doorEl; cell.gateStrength = doorSeason(door, p.term.index); cell.gatePalace = doorVsPalace(doorEl, PAL_ELEM[q]);
      cell.gateRank = door === '中门' ? 1 : GATE_RANK[doors[q]]; cell.gateNature = doorNature;
      cell.spirit = deity; cell.spiritEn = deity; cell.spiritElement = deityEl; cell.spiritStrength = strengthOf(deityEl, PAL_ELEM[q]); cell.spiritNature = nature;
      cell.isEnvoy = q === doorPalace; cell.isChief = q === landing; cell.isDuty = q === landing;
      byNumber[q] = cell;
      return cell;
    });
    var chart = {};
    Object.keys(base).forEach(function (key) { chart[key] = base[key]; });
    var fanYin = mod(landing - xunPalace, 9) !== 0 && landing + xunPalace === 10;
    chart.palaces = palaces; chart.palacesByNumber = byNumber; chart.method = 'flying'; chart.landing = landing; chart.doorPalace = doorPalace; chart.xunPalace = xunPalace;
    chart.chief = STARS9[xunPalace - 1]; chart.chiefEn = STARS9_EN[xunPalace - 1]; chart.envoy = FLY_DOORS[xunPalace - 1]; chart.envoyPalace = doorPalace;
    chart.meta = {}; Object.keys(base.meta).forEach(function (key) { chart.meta[key] = base.meta[key]; });
    chart.meta.fuYin = landing === xunPalace; chart.meta.fanYin = fanYin;
    return chart;
  }

  // Branches seated in each palace, used for the void (空亡) flag.
  var PAL_BRANCHES = { 1:[0], 2:[7,8], 3:[3], 4:[4,5], 5:[], 6:[10,11], 7:[9], 8:[1,2], 9:[6] };

  // Run the ported formation library against a computed chart.
  function formations(p, month) {
    var D = global.QPData;
    if (!D || !D.detectFormations) return [];
    var chart = qimen(p);
    chart.meta.solarTime = Date.UTC(2000, (month || 1) - 1, 1);
    var found = [];
    try {
      found = D.FORMATIONS.map(function (f) {
        var res;
        try { res = f.detect(chart.palaces, chart.meta); } catch (e) { return null; }
        if (res === null || res === undefined || (Array.isArray(res) && res.length === 0)) return null;
        return { id: f.id, name: f.name, nameEn: f.nameEn, category: f.category, source: f.source || null,
                 description: f.description, palaces: res,
                 seasonalStrength: D.formationSeasonalStrength(f, month || 1) };
      }).filter(Boolean);
    } catch (e) { found = []; }
    return found;
  }

  /* ================= YIJING (梅花易数) ================= */

  var TRIGRAMS = ['乾','兑','离','震','巽','坎','艮','坤'];
  var TRI_EN = ['Heaven','Lake','Fire','Thunder','Wind','Water','Mountain','Earth'];
  // Bit i = line i counted from the bottom; 1 = yang. 乾兑离震巽坎艮坤.
  var TRI_BITS = [7,3,5,1,6,2,4,0];
  // King Wen number and name, indexed [upper][lower] over 乾兑离震巽坎艮坤
  var HEX = [
    [[1,'乾'],[10,'履'],[13,'同人'],[25,'无妄'],[44,'姤'],[6,'讼'],[33,'遁'],[12,'否']],
    [[43,'夬'],[58,'兑'],[49,'革'],[17,'随'],[28,'大过'],[47,'困'],[31,'咸'],[45,'萃']],
    [[14,'大有'],[38,'睽'],[30,'离'],[21,'噬嗑'],[50,'鼎'],[64,'未济'],[56,'旅'],[35,'晋']],
    [[34,'大壮'],[54,'归妹'],[55,'丰'],[51,'震'],[32,'恒'],[40,'解'],[62,'小过'],[16,'豫']],
    [[9,'小畜'],[61,'中孚'],[37,'家人'],[42,'益'],[57,'巽'],[59,'涣'],[53,'渐'],[20,'观']],
    [[5,'需'],[60,'节'],[63,'既济'],[3,'屯'],[48,'井'],[29,'坎'],[39,'蹇'],[8,'比']],
    [[26,'大畜'],[41,'损'],[22,'贲'],[27,'颐'],[18,'蛊'],[4,'蒙'],[52,'艮'],[23,'剥']],
    [[11,'泰'],[19,'临'],[36,'明夷'],[24,'复'],[46,'升'],[7,'师'],[15,'谦'],[2,'坤']]
  ];
  var HEX_EN = {1:'The Creative',2:'The Receptive',3:'Difficulty at the Beginning',4:'Youthful Folly',
    5:'Waiting',6:'Conflict',7:'The Army',8:'Holding Together',9:'Small Taming',10:'Treading',
    11:'Peace',12:'Standstill',13:'Fellowship',14:'Great Possession',15:'Modesty',16:'Enthusiasm',
    17:'Following',18:'Work on the Decayed',19:'Approach',20:'Contemplation',21:'Biting Through',
    22:'Grace',23:'Splitting Apart',24:'Return',25:'Innocence',26:'Great Taming',27:'Nourishment',
    28:'Great Preponderance',29:'The Abysmal',30:'The Clinging',31:'Influence',32:'Duration',
    33:'Retreat',34:'Great Power',35:'Progress',36:'Darkening of the Light',37:'The Family',
    38:'Opposition',39:'Obstruction',40:'Deliverance',41:'Decrease',42:'Increase',43:'Breakthrough',
    44:'Coming to Meet',45:'Gathering Together',46:'Pushing Upward',47:'Oppression',48:'The Well',
    49:'Revolution',50:'The Cauldron',51:'The Arousing',52:'Keeping Still',53:'Development',
    54:'The Marrying Maiden',55:'Abundance',56:'The Wanderer',57:'The Gentle',58:'The Joyous',
    59:'Dispersion',60:'Limitation',61:'Inner Truth',62:'Small Preponderance',63:'After Completion',
    64:'Before Completion'};

  function trigramFrom(n) { var r = mod(n, 8); return r === 0 ? 7 : r - 1; }

  // Plum Blossom time method. Deterministic for a given moment, so it reproduces.
  function yijing(p, lunar, salt) {
    var yb = p.year.branch + 1, lm = lunar.month, ld = lunar.day, hb = p.hourBranch + 1;
    var extra = salt || 0;
    var upper = trigramFrom(yb + lm + ld + extra);
    var lower = trigramFrom(yb + lm + ld + hb + extra);
    var moving = mod(yb + lm + ld + hb + extra, 6); if (moving === 0) moving = 6;
    var h = HEX[upper][lower];

    // Changed hexagram: flip the moving line
    var ub = TRI_BITS[upper], lb = TRI_BITS[lower];
    var lines = [];
    for (var i = 0; i < 3; i++) lines.push((lb >> i) & 1);
    for (var j = 0; j < 3; j++) lines.push((ub >> j) & 1);
    // Keep the primary lines intact; flipping in place used to hand back the changed
    // hexagram's lines under the primary's name.
    var changed = lines.slice(0);
    changed[moving - 1] = changed[moving - 1] ? 0 : 1;
    var h2 = hexFromLines(changed);
    var nu = hexFromLines([lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]]);

    return {
      upper: TRIGRAMS[upper], upperEn: TRI_EN[upper],
      lower: TRIGRAMS[lower], lowerEn: TRI_EN[lower],
      upperIdx: upper, lowerIdx: lower,
      number: h[0], name: h[1], nameEn: HEX_EN[h[0]],
      moving: moving,
      changedNumber: h2.number, changedName: h2.name, changedNameEn: h2.nameEn,
      changedUpperIdx: h2.upperIdx, changedLowerIdx: h2.lowerIdx,
      // 互卦: lines 2-4 form the lower trigram, lines 3-5 the upper.
      nuclearNumber: nu.number, nuclearName: nu.name, nuclearNameEn: nu.nameEn,
      nuclearUpperIdx: nu.upperIdx, nuclearLowerIdx: nu.lowerIdx,
      castNumber: yb + lm + ld + hb + extra,
      lines: lines, changedLines: changed
    };
  }

  // lines bottom to top, 1 = yang -> King Wen hexagram with its trigram indices.
  function hexFromLines(l) {
    var lo = TRI_BITS.indexOf(l[0] | (l[1] << 1) | (l[2] << 2));
    var up = TRI_BITS.indexOf(l[3] | (l[4] << 1) | (l[5] << 2));
    var h = HEX[up][lo];
    return { number: h[0], name: h[1], nameEn: HEX_EN[h[0]], upperIdx: up, lowerIdx: lo,
             upper: TRIGRAMS[up], lower: TRIGRAMS[lo], upperEn: TRI_EN[up], lowerEn: TRI_EN[lo] };
  }

  // Qimen rim hexagram: the Star's home trigram above the Door's home trigram. Worked out from Thrive
  // charts (64 of 64 palaces). The two numbers are the Xuan Kong number of the upper trigram and the
  // period set by which lines differ between the lower and upper trigrams.
  var STAR_TRI = { '天蓬':5, '天芮':7, '天禽':7, '天冲':3, '天辅':4, '天心':0, '天柱':1, '天任':6, '天英':2 };
  var GATE_TRI = { '休门':5, '死门':7, '伤门':3, '杜门':4, '开门':0, '惊门':1, '生门':6, '景门':2 };
  var XK_TRI_NUM = [9, 4, 3, 8, 2, 7, 6, 1];
  var XK_PERIOD = { 0:1, 6:2, 5:3, 3:4, 4:6, 2:7, 1:8, 7:9 };
  function qimenRimHex(pa) {
    var up = STAR_TRI[pa && pa.starCn], lo = GATE_TRI[pa && pa.gate];
    if (up === undefined || lo === undefined) return null;
    var u = TRI_BITS[up], l = TRI_BITS[lo], h = HEX[up][lo], lines = [];
    for (var i = 0; i < 3; i++) lines.push((l >> i) & 1);
    for (i = 0; i < 3; i++) lines.push((u >> i) & 1);
    return { number: h[0], name: h[1], nameEn: HEX_EN[h[0]], upper: TRIGRAMS[up], lower: TRIGRAMS[lo], upperEn: TRI_EN[up], lowerEn: TRI_EN[lo],
             lines: lines, top: XK_TRI_NUM[up], period: XK_PERIOD[u ^ l] };
  }
  // The large palace number on a Thrive chart: the Ju sits in the centre and flies forward in Luo Shu order.
  function qimenFlownNumber(ju, palace) {
    return mod(ju - 1 + [5, 6, 7, 8, 9, 1, 2, 3, 4].indexOf(palace), 9) + 1;
  }

  /* ================= FENG SHUI ================= */

  var STAR_MEAN = {
    1:['一白贪狼','Career, travel, new beginnings','water feature, movement'],
    2:['二黑巨门','Illness and worry','keep still, add metal, avoid bedrooms here'],
    3:['三碧禄存','Arguments and litigation','keep quiet, add red or fire, avoid noise'],
    4:['四绿文曲','Study, writing, romance','books, plants, desk placement'],
    5:['五黄廉贞','Misfortune and disruption','do not renovate here, add heavy metal'],
    6:['六白武曲','Authority and mentors','metal objects, leadership work'],
    7:['七赤破军','Loss and gossip','guard valuables, add water carefully'],
    8:['八白左辅','Wealth and property','activate with light and activity'],
    9:['九紫右弼','Recognition and celebration','light, warmth, future opportunity']
  };
  var GRID_DIR = [['SE','S','SW'],['E','Centre','W'],['NE','N','NW']];
  var LOSHU = [[4,9,2],[3,5,7],[8,1,6]];

  function annualStar(solarYear) { return mod(2024 - solarYear + 2, 9) + 1; }

  function monthStar(solarYear, monthBranch) {
    // Month stars descend; base depends on the year branch group.
    var yb = mod(solarYear - 1984, 12);
    var base = ([0,3,6,9].indexOf(yb) >= 0) ? 8 : ([2,5,8,11].indexOf(yb) >= 0) ? 5 : 2;
    var mIdx = mod(monthBranch - 2, 12); // months from Yin
    return mod(base - 1 - mIdx, 9) + 1;
  }

  function flyingStars(centre) {
    var grid = [];
    for (var r = 0; r < 3; r++) {
      var row = [];
      for (var c = 0; c < 3; c++) {
        var star = mod(centre - 1 + (LOSHU[r][c] - 5), 9) + 1;
        row.push({ dir: GRID_DIR[r][c], star: star, name: STAR_MEAN[star][0],
                   meaning: STAR_MEAN[star][1], advice: STAR_MEAN[star][2] });
      }
      grid.push(row);
    }
    return grid;
  }

  // 八宅 — Eight Mansions personal directions from the Gua number.
  var GUA_NAME = {1:'坎',2:'坤',3:'震',4:'巽',6:'乾',7:'兑',8:'艮',9:'离'};
  var GUA_DIRS = {
    1:{good:['SE','E','S','N'],bad:['W','NE','NW','SW'],group:'East'},
    3:{good:['S','N','SE','E'],bad:['SW','NW','NE','W'],group:'East'},
    4:{good:['N','S','E','SE'],bad:['NW','SW','W','NE'],group:'East'},
    9:{good:['E','SE','N','S'],bad:['NE','W','SW','NW'],group:'East'},
    2:{good:['NE','W','NW','SW'],bad:['E','SE','S','N'],group:'West'},
    6:{good:['W','NE','SW','NW'],bad:['SE','E','N','S'],group:'West'},
    7:{good:['NW','SW','NE','W'],bad:['N','S','E','SE'],group:'West'},
    8:{good:['SW','NW','W','NE'],bad:['S','N','SE','E'],group:'West'}
  };

  function guaNumber(solarYear, gender) {
    var s = String(solarYear).split('').reduce(function (a, b) { return a + parseInt(b, 10); }, 0);
    while (s > 9) s = String(s).split('').reduce(function (a, b) { return a + parseInt(b, 10); }, 0);
    var g = gender === 'M' ? 11 - s : 4 + s;
    if (g > 9) g -= 9;
    if (g === 5) g = gender === 'M' ? 2 : 8;
    return g;
  }

  function eightMansions(solarYear, gender) {
    var g = guaNumber(solarYear, gender);
    var d = GUA_DIRS[g];
    return { gua: g, guaCn: GUA_NAME[g], group: d.group,
             best: d.good[0], good: d.good, avoid: d.bad, worst: d.bad[3] };
  }

  /* ================= DATE SELECTION (擇日) ================= */

  // A comprehensive TongShu activity list, grouped for the picker. `cn` terms match the
  // Dong Gong and 28-mansion tables so a day's own 宜/忌 lists can be matched directly.
  var ACTIVITIES = [
    // Business and money
    { key:'business',  cn:'開市', en:'Open a business or launch',      group:'Business & money' },
    { key:'contract',  cn:'立券', en:'Sign contracts and deeds',       group:'Business & money' },
    { key:'finance',   cn:'納財', en:'Collect money, take in wealth',   group:'Business & money' },
    { key:'store',     cn:'開倉', en:'Open stores, release inventory',  group:'Business & money' },
    { key:'trade',     cn:'交易', en:'Trade, buy and sell',            group:'Business & money' },
    { key:'invest',    cn:'求財', en:'Invest and seek profit',         group:'Business & money' },
    { key:'debt',      cn:'收債', en:'Collect debts owed to you',      group:'Business & money' },
    // Career and status
    { key:'office',    cn:'赴任', en:'Take up a post or new role',     group:'Career & standing' },
    { key:'seekpost',  cn:'求職', en:'Seek work, interview',           group:'Career & standing' },
    { key:'petition',  cn:'上書', en:'Submit a proposal or petition',  group:'Career & standing' },
    { key:'nobles',    cn:'謁貴', en:'Meet superiors and decision-makers', group:'Career & standing' },
    { key:'fame',      cn:'求名', en:'Seek recognition or promotion',  group:'Career & standing' },
    { key:'hire',      cn:'進人口', en:'Hire staff, add to household',  group:'Career & standing' },
    // Relationships
    { key:'wedding',   cn:'嫁娶', en:'Marriage ceremony',              group:'Relationships' },
    { key:'propose',   cn:'納采', en:'Propose, exchange gifts',        group:'Relationships' },
    { key:'betroth',   cn:'定盟', en:'Betrothal, formalise a bond',    group:'Relationships' },
    { key:'meeting',   cn:'會友', en:'Negotiation and meetings',       group:'Relationships' },
    { key:'coming',    cn:'冠帶', en:'Coming of age, formal induction', group:'Relationships' },
    // Home and property
    { key:'move',      cn:'移徙', en:'Move house',                     group:'Home & property' },
    { key:'build',     cn:'動土', en:'Ground-breaking',                group:'Home & property' },
    { key:'repair',    cn:'修造', en:'Build, renovate or repair',      group:'Home & property' },
    { key:'bed',       cn:'安床', en:'Install a bed',                  group:'Home & property' },
    { key:'stove',     cn:'安門', en:'Fit doors and gates',            group:'Home & property' },
    { key:'demolish',  cn:'破屋壞垣', en:'Demolish and clear',          group:'Home & property' },
    { key:'clean',     cn:'掃舍', en:'Deep clean and declutter',       group:'Home & property' },
    { key:'water',     cn:'放水', en:'Water works, drainage',          group:'Home & property' },
    { key:'channel',   cn:'開渠', en:'Dig channels, lay pipes',        group:'Home & property' },
    { key:'dyke',      cn:'築堤', en:'Build embankments and walls',     group:'Home & property' },
    { key:'road',      cn:'平整道路', en:'Level roads and paving',       group:'Home & property' },
    // Health
    { key:'medical',   cn:'求醫療病', en:'Medical treatment or surgery', group:'Health & wellbeing' },
    { key:'heal',      cn:'治病', en:'Begin a course of treatment',    group:'Health & wellbeing' },
    { key:'dispel',    cn:'解除', en:'Dispel bad luck, break a pattern', group:'Health & wellbeing' },
    { key:'bathe',     cn:'沐浴', en:'Ritual cleansing',               group:'Health & wellbeing' },
    // Travel
    { key:'travel',    cn:'出行', en:'Travel and long journeys',       group:'Travel & movement' },
    { key:'boat',      cn:'登舟', en:'Sea or air travel',              group:'Travel & movement' },
    // Study and ritual
    { key:'study',     cn:'入學', en:'Study, exams and training',      group:'Study & ritual' },
    { key:'pray',      cn:'祈福', en:'Pray, set an intention',         group:'Study & ritual' },
    { key:'sacrifice', cn:'祭祀', en:'Make offerings, honour ancestors', group:'Study & ritual' },
    { key:'burial',    cn:'安葬', en:'Burial and funerary matters',    group:'Study & ritual' },
    // Disputes
    { key:'lawsuit',   cn:'詞訟', en:'Litigation and formal disputes', group:'Disputes & risk' },
    { key:'capture',   cn:'捕捉', en:'Pursue, recover, enforce',       group:'Disputes & risk' },
    { key:'hunt',      cn:'畋獵', en:'Competitive or adversarial action', group:'Disputes & risk' },
    { key:'auspicious', cn:'一切吉事', en:'Any generally auspicious act', group:'General' }
  ];

  // Which officers favour which activity
  // Officers that favour / oppose each activity. Index matches OFFICERS
  // 0建 1除 2满 3平 4定 5执 6破 7危 8成 9收 10开 11闭
  var ACT_OFFICER = {
    business:[8,10,2], contract:[4,2,8], finance:[9,2,4], store:[10,2,8], trade:[9,2,8],
    invest:[9,2,8], debt:[9,5,8],
    office:[0,8,10], seekpost:[10,8,0], petition:[0,8,10], nobles:[8,10,4], fame:[8,10,0],
    hire:[9,2,4],
    wedding:[8,10,4], propose:[2,8,4], betroth:[4,8,2], meeting:[8,10,5], coming:[4,8,2],
    move:[4,10,8], build:[4,2,10], repair:[4,2,8], bed:[4,2,8], stove:[10,4,8],
    demolish:[6,1], clean:[1,6], water:[10,2], channel:[1,10,2], dyke:[4,2], road:[3,10],
    medical:[1,3], heal:[1,3], dispel:[1,6], bathe:[1,3],
    travel:[8,10,2], boat:[8,10,2],
    study:[10,1,4], pray:[8,10,2], sacrifice:[8,10,4], burial:[4,11,8],
    lawsuit:[7,5], capture:[5,7,6], hunt:[5,6],
    auspicious:[8,10,2]
  };
  var ACT_OFFICER_BAD = {
    business:[6,11,7], contract:[6,7], finance:[6,7], store:[6,11], trade:[6,7],
    invest:[6,7,11], debt:[6,11],
    office:[6,7,11], seekpost:[6,7], petition:[6,7], nobles:[6,7], fame:[6,7], hire:[6,11],
    wedding:[6,1,11], propose:[6,11], betroth:[6,11], meeting:[6,7], coming:[6,11],
    move:[0,1,6], build:[0,3,6], repair:[0,6], bed:[6,2], stove:[6,11], demolish:[0,4],
    clean:[0], water:[11,6], channel:[6,0], dyke:[6,0], road:[6],
    medical:[6,9,11], heal:[6,9,11], dispel:[0], bathe:[6],
    travel:[6,7,5], boat:[6,7,5],
    study:[6,7], pray:[6,7], sacrifice:[6,7], burial:[2,9,6],
    lawsuit:[8,0], capture:[6,11], hunt:[6,11],
    auspicious:[6,7]
  };

  function scoreDay(y, m, d, activity, profile) {
    var p = C.fourPillars(y, m, d, 12, 0);
    var off = C.dayOfficer(p.month.branch, p.day.branch);
    var mansion = C.lunarMansion(p.jdn);
    var duty = C.dutySpirit(p.month.branch, p.day.branch);
    var score = 50;
    var reasons = [];

    if ((ACT_OFFICER[activity] || []).indexOf(off.i) >= 0) { score += 18; reasons.push(off.cn + ' day supports this'); }
    if ((ACT_OFFICER_BAD[activity] || []).indexOf(off.i) >= 0) { score -= 25; reasons.push(off.cn + ' day works against this'); }
    if (duty.yellow) { score += 10; reasons.push(duty.cn + ' is a yellow-path day'); }
    else { score -= 8; reasons.push(duty.cn + ' is a black-path day'); }
    if (mansion.auspicious) { score += 8; reasons.push(mansion.cn + ' mansion is favourable'); }
    else { score -= 6; reasons.push(mansion.cn + ' mansion is unfavourable'); }

    // The ruling mansion's own lists for this activity.
    var actDef = ACTIVITIES.filter(function (x) { return x.key === activity; })[0];
    if (actDef && global.QPXiu) {
      var fit = global.QPXiu.activityFit(global.QPXiu.dayMansion(p.jdn), actDef.cn);
      if (fit > 0) { score += 8; reasons.push(mansion.cn + ' mansion favours this activity'); }
      if (fit < 0) { score -= 12; reasons.push(mansion.cn + ' mansion warns against this activity'); }
    }
    // Personal clash against the user's animal sign
    if (profile && profile.zodiacBranch !== undefined) {
      if (p.day.branch === C.branchClash(profile.zodiacBranch)) {
        score -= 30; reasons.push('clashes your ' + C.ZODIAC[profile.zodiacBranch] + ' sign');
      } else if (p.day.branch === C.branchHarm(profile.zodiacBranch)) {
        score += 12; reasons.push('harmonises with your sign');
      }
    }
    // Favourable element of the day stem
    if (profile && profile.favourable) {
      if (profile.favourable.indexOf(C.STEM_ELEM[p.day.stem]) >= 0) {
        score += 12; reasons.push('day stem carries your favourable element');
      }
    }
    var vb = C.voidBranches(p.day.i);
    if (vb.indexOf(p.day.branch) >= 0) { score -= 5; reasons.push('void day'); }

    score = Math.max(0, Math.min(100, score));
    return { y:y, m:m, d:d, score:score, officer:off, mansion:mansion, duty:duty,
             pillar:p.day, reasons:reasons };
  }

  function bestDates(startY, startM, startD, days, activity, profile) {
    var out = [];
    var jd0 = A.gregToJD(startY, startM, startD);
    for (var i = 0; i < days; i++) {
      var g = A.jdToGreg(jd0 + i);
      out.push(scoreDay(g.y, g.m, Math.floor(g.d), activity, profile));
    }
    return out;
  }

  global.QPSystems = {
    setQimenOptions: setQimenOptions, qimenOptions: function () { return { method: QM_OPTS.method, voidBy: QM_OPTS.voidBy, longRule: QM_OPTS.longRule }; },
    analyseBazi: analyseBazi, luckPillars: luckPillars,
    zwds: zwds, ZW_PALACES: ZW_PALACES, ZW_PALACES_EN: ZW_PALACES_EN,
    zwdsPeriod: zwdsPeriod, zwdsDecades: zwdsDecades, SIHUA: SIHUA, HUA: HUA, STAR_TONE: STAR_TONE,
    brightness: brightness, BRIGHT: BRIGHT, BRIGHT_EN: BRIGHT_EN, starEffect: starEffect,
    placeMinors: placeMinors, MINOR_EN: MINOR_EN, MINOR_ABBR: MINOR_ABBR, MINOR_TONE: MINOR_TONE,
    qimen: qimen, flyingQimen: flyingQimen, formations: formations, yijing: yijing, hexFromLines: hexFromLines, qimenRimHex: qimenRimHex, qimenFlownNumber: qimenFlownNumber,
    TRIGRAMS: TRIGRAMS, TRI_EN: TRI_EN,
    strengthOf: strengthOf, STRENGTH: STRENGTH, starSeason: starSeason, STAR_STAGE: STAR_STAGE, hostGuest: hostGuest, hostGuestRead: hostGuestRead, doorSeason: doorSeason, doorPalace: doorVsPalace, disharmony: disharmony, nobleGrave: nobleGrave, horsePalace: horsePalace, forecastRules: forecastRules, HEALTH_CARE: HEALTH_CARE,
    annualStar: annualStar, monthStar: monthStar, flyingStars: flyingStars,
    eightMansions: eightMansions, guaNumber: guaNumber, STAR_MEAN: STAR_MEAN,
    ACTIVITIES: ACTIVITIES, scoreDay: scoreDay, bestDates: bestDates
  };
})(typeof window !== 'undefined' ? window : globalThis);
