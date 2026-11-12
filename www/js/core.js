/* QiPath Pro — Ganzhi core, Four Pillars, and Almanac (通勝) layer */
(function (global) {
  'use strict';
  var A = global.QPAstro;

  var STEMS  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var STEMS_EN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  var BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var BRANCHES_EN = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
  var ZODIAC = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
  var ZODIAC_CN = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

  // Five elements: 0 Wood 木, 1 Fire 火, 2 Earth 土, 3 Metal 金, 4 Water 水
  var ELEM = ['木','火','土','金','水'];
  var ELEM_EN = ['Wood','Fire','Earth','Metal','Water'];
  var STEM_ELEM = [0,0,1,1,2,2,3,3,4,4];
  var STEM_YIN  = [0,1,0,1,0,1,0,1,0,1]; // 0 = yang, 1 = yin
  var BRANCH_ELEM = [4,2,0,0,2,1,1,2,3,3,2,4];
  var BRANCH_YIN  = [0,1,0,1,0,1,0,1,0,1,0,1];

  // Hidden stems in each branch (藏干), main first
  var HIDDEN = [[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,4,6],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]];

  // 24 hour-branch labels
  var HOUR_RANGE = ['23:00–23:59','01:00–02:59','03:00–04:59','05:00–06:59','07:00–08:59',
                    '09:00–10:59','11:00–12:59','13:00–14:59','15:00–16:59','17:00–18:59',
                    '19:00–20:59','21:00–22:59'];

  // 纳音 60 pillar sounds
  var NAYIN = ['海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金',
               '山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木',
               '泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水',
               '砂中金','砂中金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金',
               '覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木',
               '大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'];

  function stemBranch(i) { i = ((i % 60) + 60) % 60; return { i: i, stem: i % 10, branch: i % 12,
    cn: STEMS[i % 10] + BRANCHES[i % 12], en: STEMS_EN[i % 10] + ' ' + BRANCHES_EN[i % 12], nayin: NAYIN[i] }; }

  // index in the 60 cycle from a stem index and branch index
  function sbIndex(stem, branch) {
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return 0;
  }

  /* ---------- Four Pillars (八字) ---------- */

  // Month branch by solar term index (0 = Lichun -> Yin month)
  function monthBranchFromTerm(termIndex) {
    // Each pair of terms (jie + qi) spans one month; Lichun(0),Yushui(1) -> Yin(2)
    return (2 + Math.floor(termIndex / 2)) % 12;
  }

  /**
   * Compute the four pillars for a local civil datetime.
   * The day changes at midnight (Compendium p.181-182). 23:00-23:59 is the Late Rat hour 夜子: still today's day pillar, with the Zi stem of the
   * next day, so a 庚 day at 23:30 is 戊子 and at 00:30 is 丙子. opts.lateZi false gives today's own Zi stem instead, as the Warcraft book's charts do.
   * opts.tz: this civil time's UTC offset in hours, for a birth elsewhere or in another era; defaults to the app timezone.
   * opts.lon: longitude for true solar time; null turns it off; defaults to the setting from setTrueSolar. The year, month and
   * solar term follow the actual moment. Only the day and hour pillars read the sun's local time.
   */
  var solarLon = null;
  /** Turn true solar time on for a longitude, or off with null. Birth charts carry their own setting and ignore this. */
  function setTrueSolar(lon) { solarLon = lon === undefined ? null : lon; }
  /** Birth pillars, optionally a number of minutes away from the recorded time. */
  function birthPillars(b, mins) {
    var t = new Date(Date.UTC(b.y, b.m - 1, b.d, b.hour, b.min) + (mins || 0) * 60000);
    return fourPillars(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), { tz: b.tz, lon: b.lon === undefined ? null : b.lon });
  }
  function fourPillars(y, m, d, hour, min, opts) {
    opts = opts || {};
    var lateZi = opts.lateZi !== false;
    hour = hour || 0; min = min || 0;

    var tz = opts.tz === undefined || opts.tz === null ? A.getTimezone() : opts.tz;
    var jd = A.localToJD(y, m, d, hour, min, tz);
    var term = A.termAt(jd, y);
    var termIndex = term.index;

    // Solar year for the year pillar: rolls over at Lichun.
    var lichunThis = A.termsForYear(y)[0].jd;
    var solarYear = jd >= lichunThis ? y : y - 1;
    var yearIdx = ((solarYear - 1984) % 60 + 60) % 60;

    // Month pillar
    var mBranch = monthBranchFromTerm(termIndex);
    var yStem = yearIdx % 10;
    // 五虎遁: Yin-month stem = (yearStem % 5) * 2 + 2
    var yinMonthStem = ((yStem % 5) * 2 + 2) % 10;
    var monthsFromYin = ((mBranch - 2) % 12 + 12) % 12;
    var mStem = (yinMonthStem + monthsFromYin) % 10;
    var monthIdx = sbIndex(mStem, mBranch);

    var lon = opts.lon === undefined ? solarLon : opts.lon, solar = null;
    if (lon !== null && lon !== undefined) {
      var shift = (lon - tz * 15) * 4 + A.equationOfTime(jd), sd = new Date(Date.UTC(y, m - 1, d, hour, min) + shift * 60000);
      y = sd.getUTCFullYear(); m = sd.getUTCMonth() + 1; d = sd.getUTCDate(); hour = sd.getUTCHours(); min = sd.getUTCMinutes();
      solar = { lon: lon, shift: Math.round(shift * 10) / 10, hour: hour, min: min };
    }

    // Day pillar. JDN is constant across the civil day.
    var jdn = A.civilJDN(y, m, d);
    var dayIdx = ((jdn + 49) % 60 + 60) % 60;

    // Hour pillar
    var hBranch = Math.floor((((hour + 1) % 24) + 24) % 24 / 2);
    var dStem = (dayIdx + (lateZi && hour >= 23 ? 1 : 0)) % 10;
    // 五鼠遁: Zi-hour stem = (dayStem % 5) * 2
    var hStem = (((dStem % 5) * 2) + hBranch) % 10;
    var hourIdx = sbIndex(hStem, hBranch);

    return {
      year: stemBranch(yearIdx), month: stemBranch(monthIdx),
      day: stemBranch(dayIdx), hour: stemBranch(hourIdx),
      term: term, termIndex: termIndex, solarYear: solarYear, solar: solar,
      jdn: A.civilJDN(y, m, d), dayJDN: jdn,
      hourBranch: hBranch, hourRange: hBranch === 0 && hour < 23 ? '00:00–00:59' : HOUR_RANGE[hBranch],
      zodiac: ZODIAC[yearIdx % 12], zodiacCn: ZODIAC_CN[yearIdx % 12]
    };
  }

  /* ---------- Relationships ---------- */

  function branchClash(b) { return (b + 6) % 12; }            // 六冲
  var SIX_HARMONY = [1,0,11,10,9,8,7,6,5,4,3,2];              // 六合 pairs
  function branchHarm(b) { return SIX_HARMONY[b]; }
  var THREE_HARMONY = { 0:[0,4,8], 4:[0,4,8], 8:[0,4,8], 1:[1,5,9], 5:[1,5,9], 9:[1,5,9],
                        2:[2,6,10], 6:[2,6,10], 10:[2,6,10], 3:[3,7,11], 7:[3,7,11], 11:[3,7,11] };

  // Element production / control
  function produces(a, b) { return (a + 1) % 5 === b; }        // Wood->Fire->Earth->Metal->Water->Wood
  function controls(a, b) { return (a + 2) % 5 === b; }        // Wood->Earth, Fire->Metal ...

  // Ten Gods (十神) of `other` stem relative to `dayMaster` stem
  var TEN_GODS = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];
  var TEN_GODS_EN = ['Friend','Rob Wealth','Eating God','Hurting Officer','Indirect Wealth',
                     'Direct Wealth','Seven Killings','Direct Officer','Indirect Resource','Direct Resource'];
  function tenGod(dayMaster, other) {
    var de = STEM_ELEM[dayMaster], oe = STEM_ELEM[other];
    var same = STEM_YIN[dayMaster] === STEM_YIN[other];
    var k;
    if (de === oe) k = 0; else if (produces(de, oe)) k = 2;
    else if (controls(de, oe)) k = 4; else if (controls(oe, de)) k = 6; else k = 8;
    return { i: k + (same ? 0 : 1), cn: TEN_GODS[k + (same ? 0 : 1)], en: TEN_GODS_EN[k + (same ? 0 : 1)] };
  }

  /* ---------- Almanac layer (通勝) ---------- */

  // 建除十二神 — the Twelve Day Officers
  var OFFICERS = ['建','除','满','平','定','执','破','危','成','收','开','闭'];
  var OFFICERS_EN = ['Establish','Remove','Full','Level','Stable','Initiate','Destruction',
                     'Danger','Success','Receive','Open','Close'];
  // Broad tendency of each officer: 2 good, 1 mixed, 0 poor
  var OFFICER_RANK = [1,2,1,1,2,1,0,0,2,2,2,1];
  var OFFICER_GOOD = [
    ['start a venture','apply for permits','set direction'],
    ['clear debts','medical treatment','remove obstacles','clean and declutter'],
    ['open a store','sign contracts','stock up','celebrate'],
    ['pave roads','routine maintenance','mediate disputes'],
    ['sign agreements','move in','plant','set foundations'],
    ['capture opportunity','hire staff','file claims'],
    ['demolish','end what is finished','cancel bad contracts'],
    ['quiet study','rest','prayer'],
    ['open business','marry','travel','launch'],
    ['collect payment','acquire assets','harvest','store'],
    ['open business','marry','travel','ground-breaking','study'],
    ['seal and store','burial','plug leaks','finish quietly']
  ];
  var OFFICER_BAD = [
    ['ground-breaking','moving house'],
    ['marriage ceremony','opening a business'],
    ['taking medicine','burial'],
    ['ground-breaking','digging'],
    ['litigation','travel'],
    ['moving house','travel','opening'],
    ['marriage','opening','signing','travel','launching'],
    ['travel','risk-taking','boating','climbing','major decisions'],
    ['litigation','disputes'],
    ['burial','medical procedures'],
    ['burial','plugging water'],
    ['opening a business','marriage','travel','medical treatment']
  ];

  function dayOfficer(monthBranch, dayBranch) {
    var i = ((dayBranch - monthBranch) % 12 + 12) % 12;
    return { i: i, cn: OFFICERS[i], en: OFFICERS_EN[i], rank: OFFICER_RANK[i],
             good: OFFICER_GOOD[i], bad: OFFICER_BAD[i] };
  }

  // 二十八宿 — the Twenty-Eight Lunar Mansions, in order from 角.
  var XIU = ['角','亢','氐','房','心','尾','箕','斗','牛','女','虚','危','室','壁',
             '奎','娄','胃','昴','毕','觜','参','井','鬼','柳','星','张','翼','轸'];
  var XIU_EN = ['Horn','Neck','Root','Room','Heart','Tail','Winnowing Basket','Dipper','Ox',
                'Girl','Emptiness','Rooftop','Encampment','Wall','Legs','Bond','Stomach',
                'Hairy Head','Net','Turtle Beak','Three Stars','Well','Ghost','Willow',
                'Star','Extended Net','Wings','Chariot'];
  // Traditional auspice: 1 = 吉 auspicious, 0 = 凶 inauspicious
  var XIU_AUSPICE = [1,0,0,1,0,1,1, 1,1,0,0,0,1,1, 1,1,1,1,1,0,1, 1,0,0,0,1,0,0];
  // Anchor: JDN 2451545 (2000-01-01, a Saturday) = 氐 (index 2). Earth-group mansions
  // always fall on Saturday, which this anchor satisfies. Adjust XIU_ANCHOR if your
  // preferred almanac uses a different epoch.
  var XIU_ANCHOR = 25;
  function lunarMansion(jdn) {
    var i = ((jdn + XIU_ANCHOR) % 28 + 28) % 28;
    var out = { i: i, cn: XIU[i], en: XIU_EN[i], auspicious: XIU_AUSPICE[i] === 1 };
    // Attach the classical activity lists when the ported almanac data is present.
    var D = global.QPData;
    if (D && D.CONSTELLATIONS_28 && D.CONSTELLATIONS_28[i]) {
      var c = D.CONSTELLATIONS_28[i];
      out.animal = c.animal; out.element = c.element;
      out.suitable = c.suitable ? c.suitable.split('、') : [];
      out.unsuitable = c.unsuitable ? c.unsuitable.split('、') : [];
      out.en = c.name || out.en;
    }
    return out;
  }

  // Translate a classical activity term into English where a gloss exists.
  function activityEn(cn) {
    var D = global.QPData;
    if (D && D.ACTIVITY_EN && D.ACTIVITY_EN[cn]) return D.ACTIVITY_EN[cn];
    var GLOSS = { '造作':'Build', '立柱':'Raise pillars', '播种':'Sow', '起土':'Break earth',
      '伐木':'Fell timber', '行船':'Sail', '安床':'Install bed', '开池':'Open a pond',
      '登船':'Board a vessel', '修造':'Repair or build', '出行':'Travel', '开市':'Open for business',
      '嫁娶':'Marry', '移徙':'Move house', '安葬':'Bury', '祭祀':'Make offerings',
      '祈福':'Pray for blessing', '放水':'Release water' };
    return GLOSS[cn] || cn;
  }

  // Dong Gong date-selection activities for a day officer.
  function officerActivities(officerCn) {
    var D = global.QPData;
    if (D && D.DONG_GONG && D.DONG_GONG[officerCn]) {
      var g = D.DONG_GONG[officerCn];
      return { suitable: g.suitable || [], unsuitable: g.unsuitable || [] };
    }
    return { suitable: [], unsuitable: [] };
  }

  // 十二值神 (黄道黑道) — Yellow Path / Black Path day spirits
  var DUTY = ['青龙','明堂','天刑','朱雀','金匮','天德','白虎','玉堂','天牢','玄武','司命','勾陈'];
  var DUTY_EN = ['Azure Dragon','Bright Hall','Heavenly Punishment','Vermilion Bird','Golden Coffer',
                 'Heavenly Virtue','White Tiger','Jade Hall','Heavenly Prison','Dark Warrior',
                 'Life Governor','Hooked Chen'];
  var DUTY_YELLOW = [1,1,0,0,1,1,0,1,0,0,1,0]; // 1 = yellow path (favourable)
  // Starting duty spirit for each month branch, indexed by month branch (Zi..Hai)
  var DUTY_START = [4,6,8,10,0,2,4,6,8,10,0,2];
  function dutySpirit(monthBranch, dayBranch) {
    var offset = ((dayBranch - monthBranch) % 12 + 12) % 12;
    var i = (DUTY_START[monthBranch] + offset) % 12;
    return { i: i, cn: DUTY[i], en: DUTY_EN[i], yellow: DUTY_YELLOW[i] === 1 };
  }

  // 空亡 (void/emptiness) branches for a pillar
  function voidBranches(sbIdx) {
    var xunHead = sbIdx - (sbIdx % 10);
    var b1 = (xunHead + 10) % 12, b2 = (xunHead + 11) % 12;
    return [b1, b2];
  }

  /* ---------- Hourly auspice ---------- */

  // Simple, transparent scoring of a double-hour against the day pillar.
  function hourQuality(dayPillar, hourBranchIdx, monthBranch) {
    var db = dayPillar.branch;
    var score = 5;
    var notes = [];
    if (hourBranchIdx === branchClash(db)) { score -= 3; notes.push('clashes the day branch'); }
    if (hourBranchIdx === branchHarm(db))  { score += 2; notes.push('harmonises with the day branch'); }
    if (THREE_HARMONY[db] && THREE_HARMONY[db].indexOf(hourBranchIdx) >= 0 && hourBranchIdx !== db) {
      score += 2; notes.push('part of the day\'s three-harmony group');
    }
    if (hourBranchIdx === db) { score += 1; notes.push('same branch as the day'); }
    var vb = voidBranches(dayPillar.i);
    if (vb.indexOf(hourBranchIdx) >= 0) { score -= 2; notes.push('falls in the void'); }
    if (hourBranchIdx === branchClash(monthBranch)) { score -= 1; notes.push('clashes the month branch'); }
    score = Math.max(0, Math.min(10, score));
    return { score: score, notes: notes };
  }

  global.QPCore = {
    STEMS: STEMS, STEMS_EN: STEMS_EN, BRANCHES: BRANCHES, BRANCHES_EN: BRANCHES_EN,
    ZODIAC: ZODIAC, ZODIAC_CN: ZODIAC_CN, ELEM: ELEM, ELEM_EN: ELEM_EN,
    STEM_ELEM: STEM_ELEM, STEM_YIN: STEM_YIN, BRANCH_ELEM: BRANCH_ELEM, BRANCH_YIN: BRANCH_YIN,
    HIDDEN: HIDDEN, HOUR_RANGE: HOUR_RANGE, NAYIN: NAYIN,
    stemBranch: stemBranch, sbIndex: sbIndex, fourPillars: fourPillars, setTrueSolar: setTrueSolar, birthPillars: birthPillars,
    branchClash: branchClash, branchHarm: branchHarm, THREE_HARMONY: THREE_HARMONY,
    produces: produces, controls: controls, tenGod: tenGod,
    TEN_GODS: TEN_GODS, TEN_GODS_EN: TEN_GODS_EN,
    dayOfficer: dayOfficer, lunarMansion: lunarMansion, dutySpirit: dutySpirit,
    voidBranches: voidBranches, hourQuality: hourQuality,
    activityEn: activityEn, officerActivities: officerActivities,
    OFFICERS: OFFICERS, XIU: XIU, XIU_EN: XIU_EN, XIU_AUSPICE: XIU_AUSPICE, DUTY: DUTY
  };
})(typeof window !== 'undefined' ? window : globalThis);
