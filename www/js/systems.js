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
  function luckPillars(p, gender, birth) {
    var yangYear = C.STEM_YIN[p.year.stem] === 0;
    var male = gender === 'M';
    var forward = (yangYear && male) || (!yangYear && !male);
    // Days to the adjacent solar term boundary -> starting age (3 days = 1 year)
    var jd = A.localToJD(birth.y, birth.m, birth.d, birth.hour, birth.min);
    var target = forward ? A.nextTerm(birth.y, birth.m, birth.d, birth.hour, birth.min)
                         : A.currentTerm(birth.y, birth.m, birth.d, birth.hour, birth.min);
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
  var GATES8_EN = { 1:'Rest', 2:'Death', 3:'Harm', 4:'Delusion', 6:'Open', 7:'Fright', 8:'Life', 9:'Scenery' };
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
    { key:'dead',       cn:'死', en:'Weak',       note:'the palace controls it — suppressed',        rank:1 }
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

  // Inner (near) palaces sit around the centre; the four cardinal seats are the outer ring.
  var PAL_RING = { 1:'outer', 9:'outer', 3:'outer', 7:'outer',
                   2:'inner', 4:'inner', 6:'inner', 8:'inner', 5:'centre' };

  /*
   * Two ways to set the hourly ju, chosen in Profile (setQimenOptions):
   *  - 置闰 Zhi Run (default): the ju runs in 15-day blocks, each starting on an upper-yuan 符头 day (甲子 己卯 甲午 己酉)
   *    with five days each of 上元 中元 下元. Blocks take the 24 terms in sequence; a block that starts before its term
   *    is 超神, after it 接气. When 超神 passes nine days at 芒种 or 大雪, that term's block is repeated (置闰). The
   *    sequence is anchored on the latest 正授 block — a 符头 on its term's own day — and walked forward from there.
   *  - 拆补 Chai Bu: the current solar term, with the yuan from the leading 甲/己 day.
   * The void (空亡) on an hourly plate is the hour's xun by default, as most charting software marks it; the day's
   * xun is the alternative. Both are always reported on the chart.
   */
  var QM_OPTS = { method: 'zhirun', voidBy: 'hour' };
  function setQimenOptions(o) { if (o && o.method) QM_OPTS.method = o.method; if (o && o.voidBy) QM_OPTS.voidBy = o.voidBy; }
  var UPPER_HEADS = [0, 15, 30, 45];      // 甲子 己卯 甲午 己酉
  var zhiRunCache = {};
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
      if (!repeated && (nm === '芒种' || nm === '大雪') && pool[t].day - b > 9) { repeated = true; continue; }  // 置闰: repeat this term
      repeated = false; t++;
    }
    return (zhiRunCache[F] = { term: pool[t].name, start: F, drift: pool[t].day - F, leap: repeated });
  }

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
        starElement: starEl, starStrength: strengthOf(starEl, PAL_ELEM[q]),
        gate: gate || '', gateEn: gnum ? GATES8_EN[gnum] : '',
        gateElement: gateEl, gateStrength: strengthOf(gateEl, PAL_ELEM[q]),
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
        solarTime: null, month: null
      }
    };
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
        return { id: f.id, name: f.name, nameEn: f.nameEn, category: f.category,
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
    setQimenOptions: setQimenOptions, qimenOptions: function () { return { method: QM_OPTS.method, voidBy: QM_OPTS.voidBy }; },
    analyseBazi: analyseBazi, luckPillars: luckPillars,
    zwds: zwds, ZW_PALACES: ZW_PALACES, ZW_PALACES_EN: ZW_PALACES_EN,
    zwdsPeriod: zwdsPeriod, zwdsDecades: zwdsDecades, SIHUA: SIHUA, HUA: HUA, STAR_TONE: STAR_TONE,
    brightness: brightness, BRIGHT: BRIGHT, BRIGHT_EN: BRIGHT_EN, starEffect: starEffect,
    placeMinors: placeMinors, MINOR_EN: MINOR_EN, MINOR_ABBR: MINOR_ABBR, MINOR_TONE: MINOR_TONE,
    qimen: qimen, formations: formations, yijing: yijing, hexFromLines: hexFromLines,
    TRIGRAMS: TRIGRAMS, TRI_EN: TRI_EN,
    strengthOf: strengthOf, STRENGTH: STRENGTH,
    annualStar: annualStar, monthStar: monthStar, flyingStars: flyingStars,
    eightMansions: eightMansions, guaNumber: guaNumber, STAR_MEAN: STAR_MEAN,
    ACTIVITIES: ACTIVITIES, scoreDay: scoreDay, bestDates: bestDates
  };
})(typeof window !== 'undefined' ? window : globalThis);
