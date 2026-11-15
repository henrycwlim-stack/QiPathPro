/* QiPath Pro: Qimen structures (格局) rebuilt from the tables in Section H of Joey Yap's Qi Men Dun Jia Compendium.
 * Each rule below is one row of a table: heaven stem, earth stem, door, deity, palace. Empty means any. A stem also counts when it is
 * lodged in a palace from the centre. The descriptions are QiPath's own wording.
 * Tokens: F = 符首, the 六儀 leading the hour's xun. Y, M, D, H = that year, month, day or hour stem. ENV = the envoy door.
 * Where the book's table and the reference charts disagree, the code says so beside the rule.
 */
(function (global) {
  'use strict';
  var D = global.QPData;
  var PAL = { '坎': 1, '坤': 2, '震': 3, '巽': 4, '乾': 6, '兑': 7, '艮': 8, '离': 9 };
  var NOBLES = ['乙', '丙', '丁'], GOOD = ['休门', '生门', '开门'], EARTH_YIN_HE = ['九地', '太阴', '六合'], FAKE = ['丁', '己', '癸'];

  function has(list, v, v2) { return list.indexOf(v) >= 0 || (!!v2 && list.indexOf(v2) >= 0); }
  function resolve(list, m) {
    return list.map(function (s) { return s === 'F' ? m.fuShou : s === 'Y' ? m.plateYear : s === 'M' ? m.plateMonth : s === 'D' ? m.plateDay : s === 'H' ? m.plateHour : s; });
  }
  function rowHits(r, x, m) {
    if (!x.number || x.number === 5) return false;
    if (r.h && !has(resolve(r.h, m), x.heavenStemCn, x.heavenStem2Cn)) return false;
    if (r.e && !has(resolve(r.e, m), x.earthStemCn, x.earthStem2Cn)) return false;
    if (r.d) { if (r.d[0] === 'ENV' ? !x.isEnvoy : r.d.indexOf(x.gate) < 0) return false; }
    if (r.s && r.s.indexOf(x.spirit) < 0) return false;
    if (r.p && r.p.indexOf(x.number) < 0) return false;
    return true;
  }
  function R(h, e, d, s, p) { return { h: h && [].concat(h), e: e && [].concat(e), d: d && [].concat(d), s: s && [].concat(s), p: p && [].concat(p).map(function (n) { return PAL[n]; }) }; }
  function S0(id, name, en, cat, desc, rows) {
    return { id: id, name: name, nameEn: en, category: cat, source: 'compendium', description: desc,
      detect: function (p, m) { return p.filter(function (x) { return rows.some(function (r) { return rowHits(r, x, m); }); }).map(function (x) { return x.number; }); } };
  }
  function Plate(id, name, en, cat, desc, test) {
    return { id: id, name: name, nameEn: en, category: cat, source: 'compendium', description: desc, detect: function (p, m) { return test(m) ? [0] : null; } };
  }
  function byDoor(test) { return function (p) { return p.filter(function (x) { return x.number !== 5 && x.gate && test(x); }).map(function (x) { return x.number; }); }; }

  var A = 'auspicious', H = 'hostile', N = 'special';
  var LIST = [
    S0('qing_long_hui', '青龙返首', 'Green Dragon Returns', A, 'One of the best structures: help from people of standing, good partnerships, marriage and profit.', [R(['F', '戊'], '丙')]),
    S0('fei_niao_die', '飞鸟跌穴', 'Flying Bird Falls into Cave', A, 'Excellent for major undertakings: business, moves, travel, lending, launching a campaign and winning a case.', [R('丙', ['F', '戊'])]),
    // The tables list 丁 in the heaven column too, but the dated charts and Warcraft's example mark 丁 on the earth plate with the envoy door.
    S0('yu_nv_shou', '玉女守门', 'Jade Maiden Watches the Door', A, 'Favours relationships, connection, mediation, study and exams.', [R(null, '丁', 'ENV')]),

    S0('yun_dun', '云遁', 'Cloud Dun', A, 'Suits quiet self-cultivation, low-profile success, long journeys and changing old habits.', [R('乙', '辛', GOOD), R('乙', null, ['休门', '开门'], null, '坤')]),
    S0('long_dun', '龙遁', 'Dragon Dun', A, 'Suits business growth, water and travel work, large projects, marriage and childbirth.', [R('乙', null, GOOD, null, '坎'), R('乙', null, '开门', null, '乾')]),
    S0('tian_dun', '天遁', 'Heavenly Dun', A, 'Good for most matters: steady progress, keeping wealth, promotion, announcements, new deals and moves.', [R('丙', '丁', '生门'), R('丙', '戊', '生门'), R('丙', null, '开门')]),
    S0('di_dun', '地遁', 'Earthly Dun', A, 'Suits building foundations and systems, property, mining, retreat and soul-searching.', [R('乙', '己', '开门')]),
    S0('ren_dun', '人遁', 'Man Dun', A, 'Suits hiring, finding talent and seeking the right leader.', [R('丁', null, '休门', '太阴')]),
    S0('feng_dun', '风遁', 'Wind Dun', A, 'Suits publicity, advertising, relationships, long journeys and matters from the north-west.', [R('乙', null, GOOD, null, '巽'), R('丙', null, '开门', null, '巽')]),
    S0('hu_dun', '虎遁', 'Tiger Dun', A, 'Gets results by force of presence: asking for promotion, taking a new role, pressing rivals, and construction.', [R('乙', '辛', '休门', null, '艮'), R('乙', null, '生门', null, '艮'), R('辛', null, '生门', null, '艮'), R('庚', null, '开门', null, '兑')]),
    S0('shen_dun', '神遁', 'Deity Dun', A, 'Favours prayer, wishes, religious gatherings and meditation.', [R('丙', null, '生门', '九天'), R('乙', null, '休门', '九天')]),
    S0('gui_dun', '鬼遁', 'Ghost Dun', A, 'Suits surprise moves, investigation and covert work.', [R('乙', null, '杜门', '九地'), R('乙', null, '开门', '九地'), R('乙', null, '生门', '九地', '艮'), R('丁', null, '开门', '九地'), R('丁', null, '休门', '九地'), R('丁', null, '生门', '九地', '艮')]),

    S0('yi_de_shi', '日奇得使', 'Yi Noble Receives Envoy', A, 'Good for major steps: a new post, marriage, a new business or closing deals. The right talent finds its place.', [R('乙', null, null, null, ['乾', '离'])]),
    S0('bing_de_shi', '月奇得使', 'Bing Noble Receives Envoy', A, 'Good for major steps: a new post, marriage, a new business or closing deals. The right talent finds its place.', [R('丙', null, null, null, ['坎', '坤'])]),
    S0('ding_de_shi', '星奇得使', 'Ding Noble Receives Envoy', A, 'Good for major steps: a new post, marriage, a new business or closing deals. The right talent finds its place.', [R('丁', null, null, null, ['巽', '艮'])]),
    S0('yi_qi_sheng', '日奇升殿', 'Yi Noble Rising Palace', A, 'Good for confronting wrongdoing, travel, marriage, trade, expansion and moving house.', [R('乙', null, null, null, '震')]),
    S0('bing_qi_sheng', '月奇升殿', 'Bing Noble Rising Palace', A, 'Good for confronting wrongdoing, travel, marriage, trade, expansion and moving house.', [R('丙', null, null, null, '离')]),
    S0('ding_qi_sheng', '星奇升殿', 'Ding Noble Rising Palace', A, 'Good for confronting wrongdoing, travel, marriage, trade, expansion and moving house.', [R('丁', null, null, null, '兑')]),

    S0('zhen_zha', '真诈', 'Real Deception', A, 'Suits discreet progress, retreat, spiritual work and worship.', [R(NOBLES, null, GOOD, '太阴')]),
    S0('chong_zha', '重诈', 'Double Deception', A, 'Suits self-development, earning, dealing with officials, a new role and conceiving.', [R(NOBLES, null, GOOD, '九地')]),
    S0('xiu_zha', '休诈', 'Nobility Deception', A, 'Suits subtle connection and bonding, seeking treatment and asking for help.', [R(NOBLES, null, GOOD, '六合')]),

    S0('wu_jia_tian', '天假', 'Heavenly Fake', N, 'Suits planning, elections, exams, gaining public support and promotion.', [R(NOBLES, null, '景门', '九天')]),
    S0('wu_jia_di', '地假', 'Earthly Fake', N, 'Suits stealth, a low profile, confidential information and getting out of a binding situation.', [R(FAKE, null, '杜门', EARTH_YIN_HE)]),
    S0('wu_jia_ren', '人假', 'Man Fake', N, 'Suits investigation, catching wrongdoers and avoiding trouble by knowing more.', [R('壬', null, '惊门', '九天')]),
    S0('wu_jia_shen', '神假', 'Deity Fake', N, 'Suits meditation, spiritual practice, prayer and burial.', [R(FAKE, null, '伤门', EARTH_YIN_HE)]),
    S0('wu_jia_gui', '鬼假', 'Ghost Fake', N, 'Suits calming the mind, easing anger and letting go of bad intentions.', [R(FAKE, null, '死门', EARTH_YIN_HE)]),

    // Palaces from the Compendium 2nd Edition (p.843-845). The first edition printed 乙 in 震, which only repeats 日奇升殿; the dated charts in the books mark 日旺 with 乙 in 巽 or 坎.
    S0('yi_wang', '日旺', 'Sun Prosperity', A, 'Good for a new post or job, expansion and wealth, especially with an auspicious door.', [R('乙', null, null, null, ['巽', '坎'])]),
    S0('bing_wang', '月旺', 'Moon Prosperity', A, 'Good for a new post or job, expansion and wealth, especially with an auspicious door.', [R('丙', null, null, null, ['巽', '震'])]),
    S0('ding_wang', '星旺', 'Star Prosperity', A, 'Good for a new post or job, expansion and wealth, especially with an auspicious door.', [R('丁', null, null, null, ['巽', '离'])]),
    S0('xiang_zuo', '相佐格', 'Super Assisting', A, 'Suits finding a mentor, business deals, long business trips and building a team. With 生门 it favours collecting money; with 休门, asking for help.', [R('F', NOBLES)]),
    // The table prints this like 相佐格, but the 4 Feb 2025 chart marks it on 丙 over 符首, so the Noble goes on the heaven plate.
    S0('quan_yi', '欢怡/权怡', 'Huan Yi / Quan Yi', A, 'Suits hands-on skills, training, seminars and finding a teacher.', [R(NOBLES, 'F')]),
    S0('jiao_tai', '交泰格', 'Mutually Peaceful', A, 'With an auspicious door, good for both sides in most matters.', [R('乙', ['丙', '丁'])]),
    S0('tian_yu_chang', '天遇昌气格', 'Prosperous Spirit', A, 'Excellent for education. With an auspicious door, lasting good results for both sides.', [R('丁', '乙')]),
    S0('que_han_hua', '雀含花格', 'Sparrow with a Flower', A, 'Suits marriage and teamwork.', [R('丙', '乙')]),
    S0('san_qi_zhi_ling', '三奇之灵', 'Three Noble Spirit', A, 'Brings clarity and peace of mind, so most matters go well.', [R(NOBLES, null, GOOD, EARTH_YIN_HE)]),
    S0('san_qi_li_he', '三奇利合物', 'Three Noble Compilation', A, 'Your abilities are well used, with a satisfying result.', [R('丁', 'F')]),
    S0('xing_sui_yue', '星随月转', 'Star Follows Moon', A, 'Good for promotion, though with some worry amid the happiness.', [R('丁', '丙')]),
    S0('qi_yi_xiang_he', '奇仪相合', 'Harmony of Noble and Crest', A, 'With an auspicious door, good for reconciliation and mending relationships.', [R('乙', '庚'), R('丙', '辛'), R('丁', '壬'), R('戊', '癸'), R('F', '己')]),
    S0('san_qi_ji_men', '三奇上吉门格', 'Three Nobles with an Auspicious Door', A, 'Good fortune and opportunity for career and wealth.', [R(NOBLES, null, GOOD)]),
    S0('san_sheng', '三胜宫', 'Three Victory Palaces', N, 'The palaces of the Chief, Nine Heaven and the Life Door. Traditionally the positions of victory.', [R(null, null, null, '值符'), R(null, null, null, '九天'), R(null, null, '生门')]),
    S0('wu_bu_ji', '五不击', 'Five Non-Striking', N, 'Do not strike towards the Chief, Nine Heaven, the Life Door, Nine Earth or the envoy door.', [R(null, null, null, '值符'), R(null, null, null, '九天'), R(null, null, '生门'), R(null, null, null, '九地'), R(null, null, 'ENV')]),

    S0('xin_yi', '白虎猖狂', 'Ferocious White Tiger', H, 'A volatile situation. Poor for marriage, building and business, with fear and possible danger.', [R('辛', '乙')]),
    S0('wu_jia_xin_ge', '腾蛇妖娇', 'Tangling Snake', H, 'Long, messy arguments and constant trouble. Not for starting a lawsuit.', [R('癸', '丁')]),
    S0('qing_long_tao', '青龙逃走', 'Green Dragon Escapes', H, 'Financial loss and unhappiness. Poor for change or important matters.', [R('乙', '辛')]),
    S0('ding_gui', '朱雀投江', 'Red Phoenix Dives into Water', H, 'Arguments, bad temper, disputes and lawsuits.', [R('丁', '癸')]),
    S0('ying_ru_tai_bai', '荧惑入白', 'Shimmering Enters White', H, 'Serious obstacles. Better to retreat than attack.', [R('丙', '庚')]),
    S0('tai_bai_ru_ying', '太白入荧', 'Great White Enters Darkness', H, 'Favours the Guest. The Host should guard against loss, treachery and theft.', [R('庚', '丙')]),
    S0('xing_ge', '刑格', 'Punishment', H, 'Damaged reputation, loss, lawsuits and illness.', [R('庚', '己')]),
    S0('zhan_ge', '战格', 'War', H, 'Injury and loss, with failure for both sides.', [R('庚', '庚')]),
    S0('bei_ge', '悖格', 'Rebel', H, 'Offensive conduct, indiscipline and disrespect for elders.', [R('丙', ['Y', 'M', 'D', 'H'])]),
    S0('qi_ge', '奇格', 'Noble Structure', H, 'Poor for important matters, especially money. 庚 over 丙 or 丁 favours the Host; over 乙, the Guest.', [R('庚', NOBLES)]),
    S0('fei_duan_ge', '飞干格', 'Flying Stem', H, 'Sudden setbacks arising together.', [R('D', '庚')]),
    S0('fu_duan_ge', '伏干格', 'Hidden Stem', H, 'Problems from carelessness. Opportunities are lost, so do not press on.', [R('庚', 'D')]),
    S0('da_ge', '大格', 'Big Structure', H, 'Poor for all major activity: setbacks, little help from relatives and financial loss.', [R('庚', '癸')]),
    S0('shang_ge', '小格', 'Small Structure', H, 'Uncertainty, a failed job search, business losses and illness when travelling.', [R('庚', '壬')]),
    S0('sui_ge', '年格', 'Year Structure', H, 'Hardship within the year. Not the time for new ventures.', [R('庚', 'Y')]),
    S0('yue_ge', '月格', 'Month Structure', H, 'Trouble within the month. Avoid new actions.', [R('庚', 'M')]),
    S0('ri_ge', '日格', 'Day Structure', H, 'Trouble within the day. Avoid new and immediate actions.', [R('庚', 'D')]),
    S0('shi_ge', '时格', 'Hour Structure', H, 'Strange circumstances, setbacks and hidden danger. Avoid new actions.', [R('庚', 'H')]),
    S0('tian_yi_fei_gong', '天乙飞宫格', 'Flying Palace', H, 'Bad for both Host and Guest, with harmful outside influences.', [R(['F', '戊'], '庚')]),
    S0('tian_yi_fu_gong', '天乙伏宫格', 'Sitting Palace', H, 'The loss of a leader. Defend firmly and avoid hasty decisions.', [R('庚', ['F', '戊'])]),
    S0('qi_mu', '奇墓', 'Noble Grave', H, 'The Nobles lose strength, along with trust and support.', [R('乙', null, null, null, '坤')]),
    S0('san_qi_ru_mu', '三奇入墓', 'Three Nobles Enter Graves', H, 'Setbacks for most matters. Mentors and supporters are leaving.', [R('乙', null, null, null, ['乾', '坤']), R('丙', null, null, null, ['乾', '坎']), R('丁', null, null, null, ['坎', '艮'])]),
    S0('san_qi_shou_zhi', '三奇受制', 'Three Nobles Restricted', H, 'Take great care with important decisions. Too slow or too fast can both cause setbacks.', [R(['丙', '丁'], null, null, null, '坎'), R('乙', null, null, null, ['乾', '兑']), R(['丙', '丁'], null, null, null, ['乾', '兑']), R(['庚', '辛'], null, null, null, ['震', '巽']), R('乙', null, null, null, ['坤', '艮'])]),
    S0('liu_yi_ji_xing', '六仪击刑', 'Six Crests Strike Punishment', H, 'Vicious pressure and fear.', [R('戊', null, null, null, '震'), R('己', null, null, null, '坤'), R('庚', null, null, null, '艮'), R('辛', null, null, null, '离'), R('壬', null, null, null, '巽'), R('癸', null, null, null, '巽')]),
    S0('tian_wang_si_zhang', '天网四张', 'Heavenly Net Spreads', H, 'Traps ahead. Do not advance.', [R('癸', 'H')]),
    S0('di_wang_zhe_bi', '地网遮蔽', 'Earthly Net', H, 'Poor for outdoor activity. Plans have flaws, and there may be spies.', [R('壬', 'H')]),
    { id: 'men_sheng_gong', name: '门宫和义', nameEn: 'Door and Palace in Harmony', category: A, source: 'compendium', description: 'An auspicious door and its palace feed each other, which adds to the good fortune.',
      detect: byDoor(function (x) { return GOOD.indexOf(x.gate) >= 0 && (rel(x) === 'produces' || rel(x) === 'produced'); }) },
    { id: 'men_po', name: '门迫格', nameEn: 'Door Forcing', category: H, source: 'compendium', description: 'An auspicious door controls its palace, so its benefits cannot be relied on.',
      detect: byDoor(function (x) { return GOOD.concat(['景门']).indexOf(x.gate) >= 0 && rel(x) === 'controls'; }) },
    { id: 'gong_po', name: '宫迫格', nameEn: 'Palace Forcing', category: H, source: 'compendium', description: 'The palace controls an auspicious door, which reduces its benefits, though less severely than Door Forcing.',
      detect: byDoor(function (x) { return GOOD.concat(['景门']).indexOf(x.gate) >= 0 && rel(x) === 'controlled'; }) },
    { id: 'shi_mu', name: '时墓', nameEn: 'Hour Grave', category: H, source: 'compendium', description: 'What you seek at this hour will be hard to obtain.',
      detect: graveRows({ '乙未': ['乙', 2], '丙戌': ['丙', 6], '戊戌': ['戊', 6], '辛丑': ['辛', 8], '壬辰': ['壬', 4] }) },
    { id: 'shi_gan_ru_mu', name: '时干入墓', nameEn: 'Hour Stem Enters Grave', category: H, source: 'compendium', description: 'The matter you ask about loses much of its strength and is unlikely to succeed.',
      detect: graveRows({ '丙戌': ['丙', 6], '壬辰': ['壬', 4], '癸未': ['癸', 2], '戊戌': ['戊', 6], '己丑': ['己', 8], '丁丑': ['丁', 8] }) },
    { id: 'you_san', name: '游三避五', nameEn: 'Swaying 3, Evading 5', category: A, source: 'compendium', description: 'The Chief or envoy door reaches the East, so most matters go well: pursue wealth and begin plans.',
      detect: function (p) { return p.filter(function (x) { return x.number === 3 && (x.isEnvoy || x.spirit === '值符'); }).map(function (x) { return x.number; }); } },
    Plate('tian_xian_shi', '天显时格', 'Heavenly Display Hour', A, 'Also called 天辅时. A generally good hour for quick date selection: wealth, journeys, deals, a new position and launches.', function (m) {
      var T = { '甲': ['甲子', '甲戌'], '己': ['甲子', '甲戌'], '乙': ['甲申'], '庚': ['甲申'], '丙': ['甲午'], '辛': ['甲午'], '丁': ['甲辰'], '壬': ['甲辰'], '戊': ['甲寅'], '癸': ['甲寅'] };
      return (T[m.dayStemCn] || []).indexOf(m.hourCn) >= 0;
    }),
    Plate('wu_bu_yu', '五不遇时', 'Five Disharmony Hour', H, 'The hour stem counters the day stem. Very unfavourable: Host and Guest are out of harmony and the situation is unstable.', function (m) { return !!global.QPSystems.disharmony(m.dayStemIdx, m.hourStemIdx); }),
    Plate('yang_dong', '阳动', 'Dynamic Yang', N, 'A Yang hour stem favours bold action, pursuing wealth and starting something new.', function (m) { return global.QPCore.STEM_YIN[m.hourStemIdx] === 0; }),
    Plate('yin_jing', '阴静', 'Static Yin', N, 'A Yin hour stem favours planning, strategy, creativity and inward work.', function (m) { return global.QPCore.STEM_YIN[m.hourStemIdx] === 1; })
  ];
  function rel(x) {
    var e = ['wood', 'fire', 'earth', 'metal', 'water'], C = global.QPCore, a = e.indexOf(x.gateElement), b = e.indexOf(x.element);
    if (a < 0 || b < 0 || a === b) return 'same';
    return C.produces(a, b) ? 'produces' : C.produces(b, a) ? 'produced' : C.controls(a, b) ? 'controls' : 'controlled';
  }
  function graveRows(T) {
    return function (p, m) {
      var row = T[m.hourCn];
      if (!row) return null;
      return p.filter(function (x) { return x.number === row[1] && has([row[0]], x.heavenStemCn, x.heavenStem2Cn); }).map(function (x) { return x.number; });
    };
  }

  // Entries with no table in Section H, or a table that cannot be told apart from another structure. Listed, but never detected.
  var NOT_DETECTED = [
    ['符勃格', 'Same table as 飞鸟跌穴 (丙 over 符首), which is auspicious, while this one is hostile'],
    ['飞勃格', 'Same table as 青龙返首 (符首 over 丙), which is auspicious, while this one is hostile'],
    ['天三门、地四户', 'Needs the twelve Month Generals, which the app does not compute'], ['太冲天马', 'Needs the twelve Month Generals'], ['地私门', 'Needs the twelve Heavenly Generals'],
    ['亭亭白奸', 'No table or rule given'], ['阴贵', 'Needs the twelve Heavenly Generals'], ['阳贵', 'Needs the twelve Heavenly Generals'],
    ['天网高格', 'No rule given'], ['天网低格', 'No rule given'], ['伏错休囚', 'No rule given'], ['六庚同宫', 'Described only as 伏干格 with 飞干格, which are detected']
  ];
  /* ---------------- 十干剋應: every heaven stem over every earth stem ----------------
   * Ratings from the compendium's table (p.279, unchanged in the 2nd edition p.790). Names follow the 2nd edition's stem chapters. Rows are the earth stem, and each row runs across the heaven stems 甲 to 癸.
   * + is auspicious 吉, o moderate 半吉 and x inauspicious 凶. Lookups cover all 100 pairs. Only the pairs in STEM_PAIR_IDS are also
   * structures, because a rating for every pair would give each palace a structure and swamp the counts.
   */
  var STEM_ORDER = '甲乙丙丁戊己庚辛壬癸';
  var COMBO_RATE = { '甲': 'oo++xoxx++', '乙': 'oo++oooxoo', '丙': '++x++xx+x+', '丁': '+++++ooxox', '戊': 'oo++xoxx++',
                     '己': 'xooxxxxxxx', '庚': 'xxxxxxxxxx', '辛': 'xx+xxxxxxx', '壬': 'xxx+xxxxxx', '癸': 'ooxxoxxxxx' };
  var COMBO_NAME = {
    '甲': ['双木成林|Forest Formation', '利阴害阳|Maxes Yin, Suppresses Yang', '飞鸟跌穴|Flying Bird Falls into Cave', '青龙吐珠|Green Dragon Salivating the Pearl', '巨石压木|Huge Rock Crushes Wood', '犬遇青龙|Dog Meets Green Dragon', '太乙伏宫|Great Yi Hidden Palace', '龙争虎斗|Dragon Tiger Fight', '青龙入狱|Green Dragon Enters Prison', '青龙入地|Green Dragon Enters Earth'],
    '乙': ['青龙合灵|Green Dragon Combines Spirit', '日奇伏吟|Day Noble Fu Yin', '日月并明|Bright Sun and Moon', '天运昌气格|Heavenly Flourish Formation', '青龙合灵|Green Dragon Combines Spirit', '墓神不明|Hidden Grave Deity', '太白逢星|Great White Meets Star', '白虎猖狂|Ferocious White Tiger', '小蛇日奇|Small Snake Day Noble', '华盖逢星|Elegant Seal Meets Star'],
    '丙': ['青龙返首|Green Dragon Returns', '奇仪顺遂|Noble Crest in Position', '月奇悖师|Month Noble Rebelling Officer', '星随月转|Star Follows Moon Turn', '青龙返首|Green Dragon Returns', '火悖地户|Fire Rebelling Earth Door', '太白入荧|Great White Enters Shimmer', '干合悖师|Stem Combine Rebelling Officer', '水蛇入火|Water Snake Enters Fire', '华盖悖师|Elegant Seal Rebelling Officer'],
    '丁': ['木火通明|Wood Fire Brilliance Formation', '奇助玉女|Noble Assisting Jade Maiden', '月奇朱雀|Month Noble Red Phoenix', '奇入太阴|Noble Enters Great Yin', '青龙耀明|Shining Green Dragon Formation', '朱雀入墓|Red Phoenix Enters Grave', '亭亭之格|White Pavilion of Deceit', '白虎受制|Restricted White Tiger', '干合蛇刑|Stem Combine Snake Punishment', '腾蛇妖娇|Demon Snake'],
    '戊': ['青龙明耀|Shining Green Dragon Formation', '奇入天门|Noble Enters Heavenly Door', '飞鸟跌穴|Flying Bird Falls into Cave', '青龙转光|Green Dragon Turns Bright', '伏吟|Fu Yin', '犬遇青龙|Dog Meets Green Dragon', '天乙伏宫|Sitting Palace Structure', '困龙受制|Trapped Dragon Receives Punishment', '小蛇化龙|Small Snake Dragon Force', '天乙会合|Heavenly Yi Combine'],
    '己': ['贵人入狱|Nobleman Enters Prison', '日奇入雾|Day Noble Enters Mist', '太悖入刑|Great Rebel Enters Punishment', '火入勾陈|Fire Enters Grappling Hook', '贵人入狱|Nobleman Enters Prison', '地户逢鬼|Earth Door Meets Ghost', '刑格|Punishment Structure', '入狱自刑|Enter Prison, Self Punishment', '凶蛇入狱|Fierce Snake Enters Prison', '华盖地户|Elegant Seal Earth Door'],
    '庚': ['值符飞宫|Leader Flying Palace', '日奇被刑|Day Noble Punishment', '荧入太白|Shimmering Enters Great White', '星奇受阻|Star Noble Enters Obstacles', '值符飞宫|Leader Flying Palace', '明堂伏杀|Bright Hall Hidden', '太白同宫|Great White Same Palace', '白虎出刀|White Tiger Carrying Blade', '太白擒蛇|Great White Catches Snake', '太白入网|Great White Enters Net'],
    '辛': ['青龙折足|Green Dragon Broken Feet', '青龙逃走|Green Dragon Escape', '日月相会|Sun Moon Meeting', '朱雀入狱|Red Phoenix Enters Prison', '青龙折足|Green Dragon Broken Feet', '游魂入墓|Spirit Enters Grave', '白虎干格|White Tiger Stem Formation', '伏吟天庭|The Grand Heavens Fu Yin', '腾蛇相缠|Flying Snake Awakens', '华盖受恩|Elegant Seal Receives Grace'],
    '壬': ['青龙入天牢|Green Dragon Enters Heavenly Prison', '日奇入地|Day Noble Enters Earth', '火入天罗|Fire Enters Heavenly Web', '五神互合|Five Deities Mutual Combine', '龙入天牢|Dragon Enters Prison', '地网高张|Earthly Net High Stretch', '小格|Small Structure', '凶蛇入狱|Menacing Snake Enters Prison', '蛇入地网|Snake Enters Earth Net', '天网终狱|Heaven Web Ends Prison'],
    '癸': ['青龙华盖|Green Dragon Elegant Seal', '华盖逢星|Elegant Seal Meets Star', '月奇地网|Moon Noble Entering Earth Net', '朱雀投江|Red Phoenix Diving Water', '青龙华盖|Green Dragon Elegant Seal', '地刑玄武|Earthly Punishment Black Tortoise', '大格|Big Structure', '天牢华盖|Heavenly Prison Elegant Seal', '幼女奸淫|Young Maiden Commits Adultery', '天网四张|Heavenly Net Four Spreads']
  };
  var COMBO_LEVEL = { '+': { key: 'good', cn: '吉', en: 'Auspicious', category: 'auspicious' }, 'o': { key: 'mid', cn: '半吉', en: 'Moderate', category: 'special' }, 'x': { key: 'bad', cn: '凶', en: 'Inauspicious', category: 'hostile' } };
  function stemCombo(heaven, earth) {
    var i = STEM_ORDER.indexOf(heaven), row = COMBO_NAME[earth];
    if (i < 0 || !row) return null;
    var n = row[i].split('|'), l = COMBO_LEVEL[COMBO_RATE[earth].charAt(i)];
    return { heaven: heaven, earth: earth, cn: n[0], en: n[1], rating: l.key, ratingCn: l.cn, ratingEn: l.en, category: l.category };
  }
  // The older pair rules, now named and rated from the tables above.
  var STEM_PAIR_IDS = { ji_ding: '己丁', ji_bing: '己丙', ren_ding: '壬丁', ren_bing: '壬丙', xin_gui: '辛癸', geng_xin: '庚辛', wu_xin: '戊辛', wu_ren: '戊壬', wu_ji: '戊己', wu_yi: '戊乙', wu_ding: '戊丁', yi_gui: '乙癸', yi_ren: '乙壬', yi_ji: '乙己', bing_ren: '丙壬', ding_xin: '丁辛', geng_ji_geng: '庚戊', xin_ren: '辛壬', ren_xin: '壬辛', ren_yi: '壬乙', ren_geng: '壬庚', gui_yi: '癸乙', gui_bing: '癸丙', gui_geng: '癸庚', gui_ren: '癸壬', she_yao_jiao: '癸辛' };

  // Replaced by the rules above, or a stem pair already covered by a named structure.
  var REPLACED = ['san_qi_de_shi', 'san_qi_sheng_dian', 'san_zha', 'xiao_ge', 'bing_jia', 'ding_jia', 'wu_bing', 'yi_geng', 'bing_xin', 'ding_ren', 'tian_yi_di_wang', 'yi_jia', 'xin_ding', 'geng_ji_xing', 'xin_ji_xing', 'wu_ji_xing', 'ji_ji_xing', 'ren_ji_xing', 'gui_ji_xing', 'gan_he-xing', 'men_xing_xiang', 'zei_ge',
    // Not in the compendium. These could never fire, were true of almost any plate, or repeated another rule (星伏吟 and 星反吟 are always the same as 伏吟格 and 反吟格).
    'long_yin', 'wu_xing_que', 'fei_xing_ge', 'zhi_fu_yin', 'zhi_shi_yin', 'yin_yang_dao', 'xing_fu_yin', 'xing_fan_yin',
    // QiPath's own background signals that hold on 70% or more of plates, so they say nothing about this one.
    'ji_men_dao', 'ji_men_he_ji_xing', 'deity_harmony', 'zhi_shi_xiang_sheng', 'san_qi_you_liu_yi', 'xing_men_xiang_sheng', 'san_he', 'men_kong', 'ji_xing_lin', 'ge_dou', 'deity_clash', 'xiong_xing_lin', 'xing_zhi', 'star_kong', 'stem_kong'];
  // Not in the compendium's structure tables. Kept as background signals, but they no longer count as auspicious or hostile.
  var SIGNALS = ['zhi_fu_xiang_sheng', 'fei_dun_cheng', 'fei_niao_ru_long', 'huan_xi', 'jiu_tian_tong_ling', 'san_qi_gui_lu',
    'xuan_wu', 'zhi_fu_xiong', 'zhi_fu_kong', 'jiu_di_xiong', 'jiu_tian_xiong', 'liu_he_xiong', 'tai_yin_xiong', 'kong_wang', 'bai_hu', 'teng_she'];

  if (D && D.FORMATIONS) {
    var ids = LIST.map(function (f) { return f.id; });
    var kept = D.FORMATIONS.filter(function (f) { return ids.indexOf(f.id) < 0 && REPLACED.indexOf(f.id) < 0; });
    kept.forEach(function (f) {
      f.source = SIGNALS.indexOf(f.id) >= 0 ? 'signal' : 'stems';
      if (f.source === 'signal') f.category = 'special';
      var pair = STEM_PAIR_IDS[f.id], c = pair && stemCombo(pair.charAt(0), pair.charAt(1));
      if (c) { f.source = 'stem_table'; f.category = c.category; f.name = c.cn; f.nameEn = c.en; f.description = pair.charAt(0) + '加' + pair.charAt(1) + ': ' + c.en + '. The compendium rates this pair ' + c.ratingEn.toLowerCase() + '.'; }
    });
    D.FORMATIONS = LIST.concat(kept);
    D.NOT_DETECTED = NOT_DETECTED;
    D.COMPENDIUM_STRUCTURES = ids;
    D.stemCombo = stemCombo;
  }
})(typeof window !== 'undefined' ? window : globalThis);
