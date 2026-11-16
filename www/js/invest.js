/* QiPath Pro: Qi Men for investing (投资奇门).
 * Two postures. Technical investing is the Guest (客): speed, momentum, read on the HOUR plate. Value investing is the Host (主):
 * accumulation and endurance, read on the DAY plate. Each plate goes through the same three phases:
 *   1. Void (空亡): the palaces holding this xun's two missing branches are illusions this period.
 *   2. Capital, 戊: void = value trap / fake volume; in its tomb (戌, the Qian palace) = frozen capital; 戊 over 庚 = capital
 *      flight; 庚 over 戊 = suppressed capital. Any of these blocks new positions.
 *   3. Yield, the Life Door (生门): void = no real yield; then the relation between the capital palace and the profit palace.
 * Then the strategy patterns for the chosen posture, the sector of each Nine Star (strongest in the Life Door), the star's
 * seasonal state, and the person's BaZi favourable and unfavourable elements.
 * Star seasons follow the Smoky Fisherman's Song as quoted in Joey Yap's The Stars (p.21): a star that produces the month's
 * element is Prosperous, the same element Strong, one it controls Weak, one that controls it Trapped, one that produces it Dead.
 * This is traditional symbolic timing. It knows nothing about prices, companies or fundamentals, and it is not financial advice.
 */
(function (global) {
  'use strict';
  var C = global.QPCore;
  var EL = ['wood', 'fire', 'earth', 'metal', 'water'];
  var EL_EN = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  var STAR_EL = { '天蓬': 4, '天芮': 2, '天冲': 0, '天辅': 0, '天禽': 2, '天心': 3, '天柱': 3, '天任': 2, '天英': 1 };
  var SLOT = { '白虎': '勾陈', '勾陈': '白虎', '朱雀': '玄武', '玄武': '朱雀' };   // the same deity slot on Yang and Yin plates

  var SECTORS = {
    '天英': { en: 'Heavenly Hero', sector: 'Tech and energy: AI, semiconductors, oil and gas, solar, media and marketing.', style: 'High volatility; momentum. Ride the trend with tight trailing stops.' },
    '天心': { en: 'Heavenly Heart', sector: 'Traditional finance: banks, insurance, wealth management, leading pharma, government-backed bonds.', style: 'Stable accumulation; blue-chip dividends.' },
    '天蓬': { en: 'Heavenly Grass', sector: 'High risk and maritime: crypto, shipping, logistics, distressed debt, high-yield bonds.', style: 'Extreme risk and reward; speculative money only.' },
    '天芮': { en: 'Heavenly Grain', sector: 'Real estate and medical: REITs, healthcare services, distressed assets, agriculture.', style: 'Value; buy during sector-wide panic.' },
    '天冲': { en: 'Heavenly Destructor', sector: 'Rapid growth: start-ups, aviation, defence and aerospace, sports and entertainment.', style: 'Breakout trading; do not hold overnight if momentum stalls.' },
    '天辅': { en: 'Heavenly Assistant', sector: 'ESG and consulting: green energy, education technology, consulting, forestry.', style: 'Slow, steady, policy-driven growth.' },
    '天柱': { en: 'Heavenly Pillar', sector: 'Commodities and communications: gold and silver, telecoms, legal services, broadcasting.', style: 'Inflation hedge; safe havens.' },
    '天任': { en: 'Heavenly Ambassador', sector: 'Infrastructure: copper and iron, construction, long government bonds, property development.', style: 'Deep moat; long-term holding, low volatility.' },
    '天禽': { en: 'Heavenly Bird', sector: 'Central authorities: sovereign funds, central-bank money, mega-cap conglomerates.', style: 'Market-moving; follow institutional flows.' }
  };
  var SEASON_MULT = { prosperous: 2.0, strong: 1.5, weak: 0.8, trapped: 0.5, dead: 0 };
  var SEASON_READ = { prosperous: 'peak season for this sector', strong: 'well supported by the season', weak: 'past its peak; capital rotating out',
    trapped: 'fighting the macro headwind', dead: 'crushed by the season: leave it alone' };

  // Strategy patterns: a door, a deity and a star (or stem) together in one palace.
  var STRATEGIES = {
    technical: [
      { key: 'momentum', name: 'Momentum and breakout', cn: '伤门 · 九天 · 天冲', door: '伤门', deity: '九天', star: ['天冲'],
        read: 'Explosive momentum: the fast strike. Quick entry and exit; do not hold overnight.', overnight: true },
      { key: 'chart', name: 'Chart patterns and tape reading', cn: '景门 · 朱雀 · 天英', door: '景门', deity: '朱雀', star: ['天英'],
        read: 'Clear data and news catalysts: trade on indicators (RSI, MACD) or earnings moves.' },
      { key: 'short', name: 'Short selling and volatility', cn: '死门 · 白虎 · 庚', door: '死门', deity: '白虎', stem: '庚',
        read: 'Downward pressure and capitulation. Only for a short position in a falling market.', short: true }
    ],
    value: [
      { key: 'core', name: 'Blue-chip core accumulation', cn: '生门 · 值符 · 天心/天任', door: '生门', deity: '值符', star: ['天心', '天任'],
        read: 'Market leaders with a moat and steady compounding. Fails in a void palace: a value trap.' },
      { key: 'deep', name: 'Deep value and distressed assets', cn: '死门 · 九地 · 天芮', door: '死门', deity: '九地', star: ['天芮'],
        read: 'Bottom-fishing: discounted, out-of-favour assets in a panic. Needs a holding period of more than a year.', longOnly: true },
      { key: 'dividend', name: 'Dividends and passive yield', cn: '休门 · 六合 · 戊 feeds 生门', door: '休门', deity: '六合', wuFeedsLife: true,
        read: 'Passive accumulation and compounding income.' }
    ]
  };

  function pals(chart) { return [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) { return chart.palacesByNumber[n]; }).filter(Boolean); }
  function num(x) { return x ? (x.number || x.num) : null; }
  function elIdx(x) { return EL.indexOf(String(x && x.element || '').toLowerCase()); }
  function heav(x) { return [x.heavenStemCn, x.heavenStem2Cn].filter(Boolean); }
  function earth(x) { return [x.earthStemCn, x.earthStem2Cn].filter(Boolean); }
  function stars(x) { return [x.starCn, x.star2Cn].filter(Boolean); }
  function deityIs(x, d) { return x.spirit === d || x.spirit === SLOT[d]; }
  function relEl(a, b) {   // how element a stands to element b
    if (a < 0 || b < 0) return null;
    return a === b ? 'same' : (a + 1) % 5 === b ? 'produces' : (b + 1) % 5 === a ? 'produced_by' : (a + 2) % 5 === b ? 'controls' : 'controlled_by';
  }

  /* ---------- Phase 1, 2, 3 on one plate ---------- */
  function phases(chart, style) {
    var P = pals(chart);
    var voids = P.filter(function (x) { return x.isEmpty; }).map(num);
    var wu = P.filter(function (x) { return heav(x).indexOf('戊') >= 0; })[0] || null;
    var life = P.filter(function (x) { return x.gate === '生门'; })[0] || null;
    var alerts = [];
    if (wu && wu.isEmpty) alerts.push({ code: 'VALUE_TRAP', cn: '戊落空亡', title: 'Capital in a void palace',
      text: style === 'technical' ? 'The breakout volume is likely fake: a bull trap. Do not chase it.' : 'The fundamentals may be hollow: a value trap. Verify everything before buying.', block: true });
    if (wu && (wu.branches || []).indexOf('戌') >= 0) alerts.push({ code: 'FROZEN_CAPITAL', cn: '戊入墓', title: 'Capital in its tomb (Qian, Northwest)',
      text: 'Money put in now is likely to be locked up: poor liquidity or a long drawdown. No new positions.', block: true });
    if (wu && earth(wu).indexOf('庚') >= 0) alerts.push({ code: 'CAPITAL_FLIGHT', cn: '戊加庚', title: 'Capital over 庚: capital changing hands',
      text: style === 'technical' ? 'A stop-loss signal: protect open positions and take risk off.' : 'A macro shift: consider hedging what you hold rather than adding.', block: style === 'technical', exit: true });
    var gw = P.filter(function (x) { return heav(x).indexOf('庚') >= 0 && earth(x).indexOf('戊') >= 0; })[0];
    if (gw) alerts.push({ code: 'SUPPRESSED_CAPITAL', cn: '庚加戊', title: '庚 over capital (' + gw.dir + ')',
      text: 'Heavy resistance from above: do not open new long positions.', block: true, longOnly: true });
    var capital = { palace: wu ? wu.dir : null, num: num(wu), element: wu ? EL_EN[elIdx(wu)] : null, alerts: alerts,
      status: alerts.some(function (a) { return a.block; }) ? 'BLOCKED' : alerts.length ? 'CAUTION' : 'SECURE' };
    var y = { palace: life ? life.dir : null, num: num(life), element: life ? EL_EN[elIdx(life)] : null, star: life ? stars(life) : [] };
    if (!life) { y.status = 'UNKNOWN'; y.text = 'The Life Door could not be placed.'; }
    else if (life.isEmpty) { y.status = 'ZERO'; y.text = 'The Life Door is void: the promised yield is unlikely to be real. Projections, dividends or targets may fall short.'; }
    else {
      var r = wu ? (num(wu) === num(life) ? 'together' : relEl(elIdx(life), elIdx(wu))) : null;
      y.relation = r;
      y.status = { together: 'DIRECT', produces: 'HIGH_YIELD', produced_by: 'HIGH_EFFORT', controls: 'FRICTIONAL', controlled_by: 'FRICTIONAL', same: 'ALIGNED' }[r] || 'UNKNOWN';
      y.text = { DIRECT: 'Capital and profit sit in the same palace: returns come straight from what you put in.',
        HIGH_YIELD: 'The profit palace feeds the capital palace: money flows to you with little effort. Suits dividends and value holding.',
        HIGH_EFFORT: 'The capital palace feeds the profit palace: returns come only with active effort and capital. Suits active trading or venture money.',
        FRICTIONAL: 'Capital and profit clash: profit is possible but costs, fees and volatility squeeze the margin.',
        ALIGNED: 'Capital and profit share an element: a straightforward, moderate return.', UNKNOWN: 'The capital or profit palace could not be read.' }[y.status];
    }
    return { voids: voids, voidDirs: P.filter(function (x) { return x.isEmpty; }).map(function (x) { return x.dir; }), capital: capital, yield: y, wu: wu, life: life, P: P };
  }

  /* ---------- the strategy patterns for a posture ---------- */
  function strategies(chart, style, ph, opts) {
    return STRATEGIES[style].map(function (s) {
      var best = null;
      ph.P.forEach(function (x) {
        var hits = [], miss = [];
        (x.gate === s.door ? hits : miss).push(s.door);
        (deityIs(x, s.deity) ? hits : miss).push(s.deity + (SLOT[s.deity] ? '/' + SLOT[s.deity] : ''));
        if (s.star) (stars(x).some(function (t) { return s.star.indexOf(t) >= 0; }) ? hits : miss).push(s.star.join('/'));
        if (s.stem) (heav(x).indexOf(s.stem) >= 0 ? hits : miss).push(s.stem);
        if (s.wuFeedsLife) (ph.wu && ph.life && relEl(elIdx(ph.wu), elIdx(ph.life)) === 'produces' ? hits : miss).push('戊 feeds 生门');
        if (!best || hits.length > best.hits.length) best = { x: x, hits: hits, miss: miss };
      });
      var n = best.hits.length, score = n === 3 ? 100 : n === 2 ? 60 : 0, flags = [];
      if (best.x.isEmpty && n >= 2) { score = 0; flags.push('Void palace: an illusion this period' + (s.key === 'core' ? ' (a value trap)' : '') + '.'); }
      if (s.short && opts.direction !== 'short') { flags.push('Only for a short position.'); score = Math.min(score, 0); }
      if (s.short && opts.trend !== 'falling') { flags.push('Only when the market is falling.'); score = Math.min(score, 0); }
      if (s.longOnly && opts.horizon !== 'long') { flags.push('Needs a holding period of more than a year.'); score = Math.min(score, 0); }
      if (s.overnight && n >= 2) flags.push('Exit the same session; holding overnight is heavily penalised.');
      if (ph.capital.status === 'BLOCKED' && score > 0) { flags.push('Capital is blocked this period, so no new entries.'); score = Math.round(score * 0.2); }
      return { key: s.key, name: s.name, cn: s.cn, read: s.read, palace: best.x.dir, hits: best.hits, miss: best.miss, matched: n, score: score, flags: flags };
    });
  }

  /* ---------- sectors: every star, the Life Door's first ---------- */
  var DOOR_BASE = { '生门': 100, '开门': 60, '休门': 60, '景门': 40, '杜门': 30, '伤门': 30, '惊门': 20, '死门': 10 };
  function tenGodRole(e, de) {
    if (e === de) return 'companion';
    if ((de + 1) % 5 === e) return 'output';
    if ((de + 2) % 5 === e) return 'wealth';
    if ((e + 2) % 5 === de) return 'officer';
    return 'resource';
  }
  var ROLE = { wealth: 'Wealth 財', output: 'Output 食傷', resource: 'Resource 印', officer: 'Officer 官殺', companion: 'Companion 比劫' };
  function sectors(chart, ph, pillars, user) {
    var S = global.QPSystems, mb = pillars.month.branch, deep = user && user.deep, de = deep ? deep.dayMasterElem : null;
    var fav = deep ? deep.favourable || [] : [], unf = deep ? deep.unfavourable || [] : [];
    var out = [];
    Object.keys(SECTORS).forEach(function (star) {
      var x = ph.P.filter(function (p) { return stars(p).indexOf(star) >= 0; })[0];
      if (!x) return;
      var e = STAR_EL[star], seas = S && S.starSeason ? S.starSeason(EL[e], mb) : null, key = seas ? seas.key : 'weak';
      var base = DOOR_BASE[x.gate] || 20, mult = SEASON_MULT[key], macro = base * mult, flags = [], status = 'OK';
      if (x.isEmpty) { macro = 0; status = 'ILLUSION'; flags.push('Void palace: a hype bubble or fake breakout this period.'); }
      var fr = ph.wu ? relEl(elIdx(ph.wu), elIdx(x)) : null;
      if (status === 'OK' && (fr === 'controls' || fr === 'controlled_by')) { status = 'HIGH_FRICTION'; macro *= 0.7; flags.push('Your capital palace clashes with this one: fees, rules or currency make it hard to reach.'); }
      if (status === 'OK' && key === 'dead') status = 'DO_NOT_TRADE';
      var role = de === null ? null : tenGodRole(e, de), pm = 1, fit = 'Neutral fit';
      if (role) {
        if (unf.indexOf(e) >= 0) { pm = 0; fit = 'Poor personal fit: skip'; }
        else if (fav.indexOf(e) >= 0 && role === 'wealth') { pm = 2.0; fit = 'Strongest personal fit (favourable Wealth)'; }
        else if (fav.indexOf(e) >= 0 && role === 'output') { pm = 1.5; fit = 'Good fit, but hands-on (favourable Output)'; }
        else if (fav.indexOf(e) >= 0 && role === 'resource') { pm = 1.2; fit = 'Defensive fit: hold for safety and income (favourable Resource)'; }
        else if (fav.indexOf(e) >= 0) { pm = 1.0; fit = 'Favourable element, ' + ROLE[role].split(' ')[0].toLowerCase() + ' role'; }
      }
      out.push({ star: star, en: SECTORS[star].en, element: EL_EN[e], sector: SECTORS[star].sector, style: SECTORS[star].style, palace: x.dir, door: x.gate,
        isLife: x.gate === '生门', season: seas ? seas.cn + ' ' + seas.en : '—', seasonKey: key, seasonRead: SEASON_READ[key], seasonMult: mult,
        role: role ? ROLE[role] : null, personal: pm, fit: fit, status: status, flags: flags,
        macro: Math.round(macro), score: Math.round(macro * pm) });
    });
    out.sort(function (a, b) { return b.score - a.score || (b.isLife ? 1 : 0) - (a.isLife ? 1 : 0); });
    return out;
  }


  /* ---------- the Eight Deities: who is moving the market, and how ----------
   * Read for the deity sharing the Life Door's palace (profit) and 戊's palace (capital), and for each sector's palace.
   * On Yang plates the 白虎 and 玄武 slots are shown as 勾陈 and 朱雀; the slot is what is read. */
  var DEITY = {
    '太阴': { en: 'Great Moon', group: 'smart', code: 'SHADOW_ACCUMULATE', title: 'The dark-pool signal',
      market: 'Quiet accumulation: block trades and insiders buying while the price is held in a tight range.',
      tech: 'No breakout yet; do not chase. If you trade it, build slowly and expect waiting.', value: 'Build a position slowly over time; expect a long wait before any mark-up.' },
    '九地': { en: 'Nine Earth', group: 'smart', code: 'LONG_TERM_ACCUMULATE', title: 'The deep-value moat',
      market: 'Bottomed out: volatility has died and patient money is buying at distressed prices.',
      tech: 'Little momentum to trade here.', value: 'A multi-quarter accumulation: ignore short-term noise.' },
    '值符': { en: 'Chief', group: 'smart', code: 'TREND_FOLLOW', title: 'The market maker',
      market: 'Large institutions driving the trend in plain sight: the most liquid, best-backed setting.',
      tech: 'Follow the trend with your normal position size and stops.', value: 'Quality assets with strong backing.' },
    '螣蛇': { en: 'Soaring Snake', group: 'trap', code: 'CAUTION_TIGHTEN_STOPS', title: 'The volatility trap',
      market: 'Spoofing, wash trading, fake catalysts and squeezes, built to trigger fear of missing out and stop-losses at once.',
      tech: 'Do not trust the trend: halve holding times and keep stops tight.', value: 'Skip it entirely.', skipValue: true },
    '玄武': { en: 'Black Tortoise', group: 'trap', code: 'FRAUD_FLAG', title: 'The fraud signal', fraud: true,
      market: 'Deception: hidden debt, dilution, rug pulls, profits that are a mirage designed to catch incoming money.',
      tech: 'Overrides every bullish signal: do not open a position; if you hold one, review it urgently.', value: 'Do not invest; if you hold, review the position urgently.' },
    '六合': { en: 'Six Harmony', group: 'mover', code: 'DEAL_ARBITRAGE', title: 'Mergers and crowded trades',
      market: 'Pending mergers, joint ventures or a crowded consensus trade.',
      good: 'With favourable stems: a deal in the making; patience can be rewarded.', bad: 'With unfavourable stems: a crowded retail trade that institutions may dump.' },
    '九天': { en: 'Nine Heavens', group: 'mover', code: 'TRAILING_STOP_TAKE_PROFIT', title: 'The parabolic blow-off',
      market: 'Gone parabolic: hype at its peak, overbought.',
      tech: 'Stop adding; protect gains with a tight trailing stop.', value: 'Do not buy at the peak; consider taking some profit.' },
    '白虎': { en: 'White Tiger', group: 'mover', code: 'DEFEND_OR_HEDGE', title: 'The hostile attack',
      market: 'Short-seller reports, hostile bids, forced liquidations and panic selling.',
      tech: 'Downward momentum: stand aside, or hedge if that is part of your plan.', value: 'Step aside until the selling exhausts itself.' }
  };
  var SLOT_NAME = { '勾陈': '白虎', '朱雀': '玄武', '腾蛇': '螣蛇' };   // a Yang-plate name back to its slot; 腾蛇 is the plate's spelling of 螣蛇
  function deityRead(x, style) {
    if (!x || !x.spirit) return null;
    var key = DEITY[x.spirit] ? x.spirit : SLOT_NAME[x.spirit], d = DEITY[key];
    if (!d) return null;
    var combo = global.QPData && global.QPData.stemCombo ? global.QPData.stemCombo(x.heavenStemCn, x.earthStemCn) : null;
    var action = d.group === 'mover' && key === '六合' ? (combo && combo.rating === 'bad' ? d.bad : d.good) : (style === 'technical' ? d.tech : d.value);
    return { deity: key, shown: x.spirit, en: d.en, group: d.group, code: d.code, title: d.title, market: d.market, action: action,
      fraud: !!d.fraud, skip: style === 'value' && !!d.skipValue, combo: combo ? combo.cn + ' ' + combo.ratingEn : null, palace: x.dir };
  }
  /** A Rob Wealth (劫财) ten-year luck pillar or year for this person. */
  function robWealthPeriod(user, pillars) {
    if (!user || !user.pillars) return null;
    var dm = user.pillars.day.stem, out = [], yr = pillars.year.stem;
    if (C.tenGod(dm, yr).i === 1) out.push('this year (' + pillars.year.cn + ')');
    var age = (pillars && user.birth) ? (new Date().getFullYear() - user.birth.y) : null;
    (user.luck && user.luck.pillars || []).forEach(function (l) { if (age !== null && age >= l.from && age < l.to && C.tenGod(dm, l.pillar.stem).i === 1) out.push('your luck pillar ' + l.pillar.cn); });
    return out.length ? out : null;
  }


  /* ---------- crash protocol: 白虎 → 值符 → 九天 ----------
   * Convergence: the White Tiger at profit or capital, in a Seven Killings (七杀) luck pillar or year, in a falling market.
   * Countermeasure: the hours when the Chief (值符) sits over 戊 or over the Day Stem, and its direction.
   * Handoff: stabilised when the White Tiger has left capital and the Chief anchors 戊 on the day plate; the gate is the
   * Nine Heavens with the Open or Life Door. */
  function slotOf(x) { return x && x.spirit ? (SLOT_NAME[x.spirit] || x.spirit) : null; }
  function tenGodPeriod(user, pillars, god) {
    if (!user || !user.pillars) return null;
    var dm = user.pillars.day.stem, out = [];
    if (C.tenGod(dm, pillars.year.stem).i === god) out.push('this year (' + pillars.year.cn + ')');
    var age = user.birth ? new Date().getFullYear() - user.birth.y : null;
    (user.luck && user.luck.pillars || []).forEach(function (l) { if (age !== null && age >= l.from && age < l.to && C.tenGod(dm, l.pillar.stem).i === god) out.push('your luck pillar ' + l.pillar.cn); });
    return out.length ? out : null;
  }
  function slotLabel(w, i) { return (i === 0 ? 'Now · ' : '') + w.toDateString().slice(0, 10) + ' · ' + pad(w.getHours() - (w.getHours() % 2 === 0 ? 1 : 0)) + ':00'; }
  function hourAt(start, i) {
    var w = new Date(start.getTime() + i * 7200000);
    try { return { w: w, r: global.QPQimen.chartFor('hour', { y: w.getFullYear(), m: w.getMonth() + 1, d: w.getDate(), hour: w.getHours(), min: 30 }) }; } catch (e) { return null; }
  }
  function dayAt(t, k) {
    var d = new Date(t.y, t.m - 1, t.d + k, 12);
    try { return { w: d, r: global.QPQimen.chartFor('day', { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hour: 12, min: 0 }) }; } catch (e) { return null; }
  }
  function crashProtocol(user, t, opts) {
    var Q = global.QPQimen, g = godSets(user), start = new Date(t.y, t.m - 1, t.d, t.hour, 0);
    var hr = Q.chartFor('hour', { y: t.y, m: t.m, d: t.d, hour: t.hour, min: t.min || 0 }), dy = Q.chartFor('day', { y: t.y, m: t.m, d: t.d, hour: 12, min: 0 });
    var phH = phases(hr.chart, 'technical'), phD = phases(dy.chart, 'value');
    var tigerAt = [phH.wu && slotOf(phH.wu) === '白虎' ? 'capital' : null, phH.life && slotOf(phH.life) === '白虎' ? 'profit' : null].filter(Boolean);
    var sk = tenGodPeriod(user, hr.pillars, 6), falling = opts.trend === 'falling';
    var canHold = g ? (g.strong && g.fav.indexOf(6) >= 0) : false;
    var convergence = tigerAt.length && sk && falling ? { at: tigerAt, sk: sk, mode: canHold ? 'DISCIPLINED' : 'HARD_LOCKDOWN' } : null;
    var chiefHours = [];
    for (var i = 0; i < 12 && chiefHours.length < 3; i++) {
      var h = hourAt(start, i); if (!h) continue;
      var chief = pals(h.r.chart).filter(function (x) { return x.spirit === '值符'; })[0];
      if (!chief) continue;
      var ds = null; try { ds = Q.askerPalace(h.r.chart, h.r.pillars); } catch (e) {}
      var overWu = heav(chief).indexOf('戊') >= 0, overYou = !!ds && num(ds) === num(chief);
      if (overWu || overYou) chiefHours.push({ label: slotLabel(h.w, i), pillar: h.r.pillars.hour.cn, dir: chief.dir, isVoid: !!chief.isEmpty,
        over: [overWu ? 'capital (戊)' : null, overYou ? 'your Day Stem' : null].filter(Boolean).join(' and ') });
    }
    var chiefNow = phH.P.filter(function (x) { return x.spirit === '值符'; })[0];
    var tigerDay = !!(phD.wu && slotOf(phD.wu) === '白虎') || !!(phD.life && slotOf(phD.life) === '白虎');
    var stabilised = !tigerDay && !!(phD.wu && phD.wu.spirit === '值符');
    var nineGate = function (chart) { return pals(chart).filter(function (x) { return x.spirit === '九天' && (x.gate === '开门' || x.gate === '生门') && !x.isEmpty; })[0]; };
    var dayGate = null, hourGate = null, k;
    for (k = 0; k < 14 && !dayGate; k++) { var d = dayAt(t, k); if (!d) continue; var gx = nineGate(d.r.chart);
      if (gx) dayGate = { label: d.w.toDateString().slice(0, 10), pillar: d.r.pillars.day.cn, dir: gx.dir, door: gx.gate }; }
    for (k = 0; k < 24 && !hourGate; k++) { var hh = hourAt(start, k); if (!hh) continue; var hx = nineGate(hh.r.chart);
      if (hx) hourGate = { label: slotLabel(hh.w, k), pillar: hh.r.pillars.hour.cn, dir: hx.dir, door: hx.gate }; }
    var phase = tigerAt.length || tigerDay ? 'TIGER' : stabilised ? 'CHIEF_FLOOR' : 'WAITING';
    return { tigerAt: tigerAt, sevenKillings: sk, falling: falling, canHold: canHold, convergence: convergence,
      chiefNow: chiefNow ? { dir: chiefNow.dir, isVoid: !!chiefNow.isEmpty } : null, chiefHours: chiefHours, stabilised: stabilised,
      dayGate: dayGate, hourGate: hourGate, phase: phase };
  }

  /* ---------- Nine Earth accumulation (九地): the compressed spring ----------
   * Setup: 九地 with the Life Door or with 戊, on the style's plate or the day plate. Rejected if 戊 is in its tomb (Qian) or the
   * palace is void. Confirmed when 戊 is in season (旺 or 相 by the stem rule). The catalyst: the Nine Heavens or the
   * Traveling Horse arriving in that palace on a later day or month plate; 杜门 (Delusion), 惊门 (Fear) or 螣蛇 there make it a fake-out. */
  var EARTH_SEASON = { 0: 'dead', 1: 'xiang', 2: 'wang', 3: 'xiu', 4: 'qiu' };   // 戊 (earth) by the month element: wood 死, fire 相, earth 旺, metal 休, water 囚
  var MONTH_EL_IDX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  function nineEarth(user, t, opts) {
    var Q = global.QPQimen, S = global.QPSystems, style = opts.style === 'value' ? 'value' : 'technical';
    var cands = [];
    var look = function (r, label) {
      var ph = phases(r.chart, style);
      [['profit', ph.life], ['capital', ph.wu]].forEach(function (p) { if (p[1] && p[1].spirit === '九地') cands.push({ at: p[0], x: p[1], ph: ph, r: r, plate: label }); });
    };
    try { look(Q.chartFor(style === 'technical' ? 'hour' : 'day', { y: t.y, m: t.m, d: t.d, hour: t.hour, min: t.min || 0 }), style === 'technical' ? 'hour' : 'day'); } catch (e) {}
    if (style === 'technical') try { look(Q.chartFor('day', { y: t.y, m: t.m, d: t.d, hour: 12, min: 0 }), 'day'); } catch (e) {}
    if (!cands.length) return { found: false };
    var c = cands[0], wu = c.ph.wu, mEl = MONTH_EL_IDX[c.r.pillars.month.branch], season = EARTH_SEASON[mEl];
    var rejected = [];
    if (wu && num(wu) === 6) rejected.push('戊 is in its tomb (Qian, Northwest): dead or frozen, not accumulating.');
    if (c.x.isEmpty) rejected.push('The palace is void: a value trap.');
    var status = rejected.length ? 'REJECTED' : (season === 'wang' || season === 'xiang') ? 'DEEP_VALUE_ACCUMULATION' : 'RESTING';
    var sector = stars(c.x).filter(function (s) { return SECTORS[s]; })[0];
    // Catalyst: the Nine Heavens or the Horse arriving in this palace, on the next 14 day plates and the next 6 month plates.
    var target = num(c.x), catalysts = [];
    var check = function (r, label, branch) {
      var P = pals(r.chart), x = P.filter(function (p) { return num(p) === target; })[0];
      if (!x) return;
      var horse = S && S.horseOf ? S.horseOf(branch) : null, horseHere = horse && (x.branches || []).indexOf(horse.branchCn) >= 0;
      if (x.spirit === '九天' || horseHere) {
        var fake = [x.gate === '杜门' ? '杜门 Delusion Door' : null, x.gate === '惊门' ? '惊门 Fear Door' : null, slotOf(x) === '螣蛇' || x.spirit === '螣蛇' ? '螣蛇' : null].filter(Boolean);
        catalysts.push({ label: label, by: [x.spirit === '九天' ? 'Nine Heavens 九天' : null, horseHere ? 'Traveling Horse 驛馬' : null].filter(Boolean).join(' and '), fake: fake });
      }
    };
    for (var k = 1; k <= 14 && catalysts.length < 2; k++) { var d = dayAt(t, k); if (d) check(d.r, d.w.toDateString().slice(0, 10) + ' (' + d.r.pillars.day.cn + ' day)', d.r.pillars.day.branch); }
    var monthCat = null;
    var P2 = global.QPPlanner, A = global.QPAstro;
    if (P2 && A) P2.solarMonths({ y: t.y, m: t.m, d: t.d }).slice(1, 7).some(function (m) {
      var md = A.jdToLocal(m.t0 + 7), r; try { r = Q.chartFor('month', { y: md.y, m: md.m, d: Math.floor(md.d), hour: 12, min: 0 }); } catch (e) { return false; }
      var before = catalysts.length; check(r, r.pillars.month.cn + ' month (from ' + Math.floor(A.jdToLocal(m.t0).d) + '/' + A.jdToLocal(m.t0).m + ')', r.pillars.month.branch);
      if (catalysts.length > before) { monthCat = catalysts.pop(); return true; } return false;
    });
    return { found: true, at: c.at, plate: c.plate, palace: c.x.dir, door: c.x.gate, star: sector || null, sector: sector ? SECTORS[sector].sector : null,
      season: { wang: '旺 Prosperous', xiang: '相 Supported', xiu: '休 Resting', qiu: '囚 Trapped', dead: '死 Dead' }[season], status: status, rejected: rejected,
      catalysts: catalysts, monthCatalyst: monthCat };
  }

  /* ---------- the whole reading, and the windows ahead ---------- */
  function plateFor(style, dt) {
    var Q = global.QPQimen;
    return Q.chartFor(style === 'technical' ? 'hour' : 'day', { y: dt.y, m: dt.m, d: dt.d, hour: dt.hour, min: dt.min || 0 });
  }
  function read(user, dt, opts) {
    opts = opts || {};
    var style = opts.style === 'value' ? 'value' : 'technical';
    var r = plateFor(style, dt), ch = r.chart, ph = phases(ch, style);
    var st = strategies(ch, style, ph, opts), sec = sectors(ch, ph, r.pillars, user);
    var bestS = st.slice().sort(function (a, b) { return b.score - a.score; })[0];
    var deities = { life: deityRead(ph.life, style), capital: deityRead(ph.wu, style) };
    var rob = robWealthPeriod(user, r.pillars), fraudAt = [deities.capital && deities.capital.fraud ? 'capital' : null, deities.life && deities.life.fraud ? 'profit' : null].filter(Boolean);
    var lockdown = rob && fraudAt.length ? { rob: rob, at: fraudAt, palace: fraudAt[0] === 'capital' ? ph.wu.dir : ph.life.dir } : null;
    sec.forEach(function (s) {
      var x = ph.P.filter(function (p) { return stars(p).indexOf(s.star) >= 0; })[0], d = deityRead(x, style);
      s.deity = d;
      if (d && d.fraud) { s.flags.push('Black Tortoise here: a fraud signal' + (rob ? ', and a Rob Wealth period makes it a lockdown' : '') + '.'); s.status = rob ? 'HARD_LOCKDOWN' : 'FRAUD_FLAG'; s.score = 0; }
      else if (d && d.skip) { s.flags.push('Soaring Snake: a volatility trap; value investors skip it.'); s.status = 'SKIP'; s.score = 0; }
    });
    sec.sort(function (a, b) { return b.score - a.score; });
    var verdict = lockdown ? 'Fraud lockdown' : fraudAt.length ? 'Stand aside' : ph.capital.status === 'BLOCKED' ? 'Stand aside' : ph.yield.status === 'ZERO' ? 'No real yield' : bestS && bestS.score >= 60 ? 'Favourable set-up' : 'Neutral';
    return { style: style, posture: style === 'technical' ? 'Guest 客 · hour plate' : 'Host 主 · day plate', chart: ch, pillars: r.pillars, phases: ph,
      strategies: st, sectors: sec, verdict: verdict, deities: deities, robWealth: rob, lockdown: lockdown, fraudAt: fraudAt };
  }
  function windows(user, dt, opts, count) {
    var style = opts.style === 'value' ? 'value' : 'technical', step = style === 'technical' ? 7200000 : 86400000, n = count || (style === 'technical' ? 12 : 14);
    var t0 = new Date(dt.y, dt.m - 1, dt.d, style === 'technical' ? dt.hour : 12, 0), out = [];
    for (var i = 1; i <= n; i++) {
      var w = new Date(t0.getTime() + i * step), r;
      try { r = read(user, { y: w.getFullYear(), m: w.getMonth() + 1, d: w.getDate(), hour: w.getHours(), min: 30 }, opts); } catch (e) { continue; }
      var bs = r.strategies.slice().sort(function (a, b) { return b.score - a.score; })[0], top = r.sectors[0];
      out.push({ when: w, label: style === 'technical' ? w.toDateString().slice(0, 10) + ' · ' + pad(w.getHours() - (w.getHours() % 2 === 0 ? 1 : 0)) + ':00' : w.toDateString().slice(0, 10),
        pillar: style === 'technical' ? r.pillars.hour.cn : r.pillars.day.cn, capital: r.phases.capital.status, yieldStatus: r.phases.yield.status,
        best: bs, topSector: top, verdict: r.verdict });
    }
    return out;
  }
  function pad(n) { n = (n + 24) % 24; return (n < 10 ? '0' : '') + n; }


  /* ================= BaZi for investing: instruments, the monthly circuit breaker, and the all-clear ================= */
  // Ten God index: 0 比肩 1 劫财 2 食神 3 伤官 4 偏财 5 正财 6 七杀 7 正官 8 偏印 9 正印. Its element is the Day Master's plus floor(i/2) steps.
  var INSTRUMENTS = [
    { cn: '比肩', en: 'Friend', cat: 'Cooperative and pooled equity', why: 'Equals sharing risk and reward.', vehicles: 'Joint ventures, standard index funds, syndicated property deals.', risk: 'medium' },
    { cn: '劫财', en: 'Rob Wealth', cat: 'Zero-sum and hype cycles', why: 'Fierce competition: taking from others or being taken from.', vehicles: 'Meme stocks, crowded retail trades, same-day (0DTE) options, speculative crowdfunding.', risk: 'extreme' },
    { cn: '食神', en: 'Eating God', cat: 'Steady growth and compounding', why: 'Output that produces wealth smoothly, process-driven.', vehicles: 'Mutual funds, low-frequency rules-based investing, dividend reinvestment plans, value stocks.', risk: 'low' },
    { cn: '伤官', en: 'Hurting Officer', cat: 'Volatility and disruption', why: 'Output that attacks the establishment: profiting from friction.', vehicles: 'Short selling, disruptive tech, volatile options strategies (straddles, strangles), high-frequency trading.', risk: 'high' },
    { cn: '偏财', en: 'Indirect Wealth', cat: 'Windfall and asymmetric risk', why: 'Entrepreneurial, variable, sudden returns.', vehicles: 'Venture capital, directional options, growth stocks, cryptocurrencies.', risk: 'high' },
    { cn: '正财', en: 'Direct Wealth', cat: 'Predictable cash flow', why: 'Steady, recurring, controlled income.', vehicles: 'Blue-chip dividend stocks, REITs, investment-grade corporate bonds.', risk: 'low' },
    { cn: '七杀', en: 'Seven Killings', cat: 'Leverage and margin', why: 'Extreme pressure and high stakes: other people\'s money.', vehicles: 'Margin trading, futures, leveraged ETFs, deep out-of-the-money options, junk bonds.', risk: 'extreme' },
    { cn: '正官', en: 'Direct Officer', cat: 'Regulated debt and utilities', why: 'Law, regulation and institutional discipline.', vehicles: 'Utility stocks, AAA-rated bonds, tightly regulated index funds.', risk: 'low' },
    { cn: '偏印', en: 'Indirect Resource', cat: 'Alternative and esoteric assets', why: 'Unconventional backing that needs specialist knowledge.', vehicles: 'Niche thematic ETFs, royalties and IP, art and collectibles, DeFi staking.', risk: 'high' },
    { cn: '正印', en: 'Direct Resource', cat: 'Safe haven and institutional', why: 'Orthodox safety, guarantees, tangible backing.', vehicles: 'Treasury bills, sovereign bonds, broad-market index ETFs, physical property.', risk: 'low' }
  ];
  function godSets(user) {
    var D = user && user.deep;
    if (!D) return null;
    var de = D.dayMasterElem, fav = D.favourable || [], unf = D.unfavourable || [], G = [];
    for (var i = 0; i < 10; i++) { var e = (de + Math.floor(i / 2)) % 5; G.push({ i: i, elem: e, fav: fav.indexOf(e) >= 0, unf: unf.indexOf(e) >= 0 }); }
    return { de: de, strong: !!D.strong, gods: G, fav: G.filter(function (g) { return g.fav; }).map(function (g) { return g.i; }), unf: G.filter(function (g) { return g.unf; }).map(function (g) { return g.i; }) };
  }
  /** Phase 1 and 2 of the instrument map: which instruments suit the chart and which to avoid, with the four gates. */
  function instruments(user) {
    var g = godSets(user);
    if (!g) return null;
    var list = INSTRUMENTS.map(function (x, i) {
      return { cn: x.cn, en: x.en, cat: x.cat, why: x.why, vehicles: x.vehicles, risk: x.risk, element: EL_EN[g.gods[i].elem],
        status: g.gods[i].unf ? 'avoid' : g.gods[i].fav ? 'suits' : 'neutral' };
    });
    var has = function (arr, i) { return arr.indexOf(i) >= 0; }, gates = [];
    gates.push(has(g.unf, 6) ? { key: 'leverage', cn: '七杀', title: 'Leverage gate: closed', tone: 'bad',
        text: 'Seven Killings is unfavourable for you: avoid margin, futures and leveraged funds. Debt-fuelled pressure works against your chart.' }
      : has(g.fav, 6) ? { key: 'leverage', cn: '七杀', title: 'Leverage gate: tolerated, not recommended', tone: 'mid',
        text: 'Seven Killings is favourable, so you handle pressure well. Leverage can still lose more than you put in: only with experience, strict limits and a licensed adviser.' }
      : { key: 'leverage', cn: '七杀', title: 'Leverage gate: neutral', tone: 'mid', text: 'No strong sign either way. Treat margin and leveraged products with great care.' });
    gates.push(has(g.fav, 3) ? { key: 'volatility', cn: '伤官', title: 'Volatility gate: open, capped', tone: 'good',
        text: 'Hurting Officer is favourable: you can cope with active, volatile strategies. Keep them to a small, capped slice you can afford to lose.' }
      : has(g.unf, 3) ? { key: 'volatility', cn: '伤官', title: 'Volatility gate: closed', tone: 'bad',
        text: 'Hurting Officer is unfavourable: avoid day-trading and short selling, which invite emotional, contrarian trades. Favour funds (食神) and broad index funds (正印).' }
      : { key: 'volatility', cn: '伤官', title: 'Volatility gate: neutral', tone: 'mid', text: 'Volatile strategies are neither favoured nor flagged; size them modestly.' });
    gates.push(g.strong ? { key: 'yield', cn: '財', title: 'Yield engine: direct wealth', tone: 'good',
        text: 'A strong Day Master can hold wealth directly: dividend stocks (正财) and growth (偏财) suit you more than parking money.' }
      : { key: 'yield', cn: '印', title: 'Yield engine: protective assets', tone: 'good',
        text: 'A weak Day Master should not chase yield directly: accumulate protective assets (正印) such as T-bills, broad index funds and property that grow quietly.' });
    if (has(g.unf, 1)) gates.push({ key: 'hype', cn: '劫财', title: 'Hype avoidance', tone: 'bad',
      text: 'Rob Wealth is unfavourable: stay out of trending meme stocks and retail hype. Your chart is the one left holding the bag.' });
    return { strong: g.strong, list: list, gates: gates, favGods: g.fav.map(function (i) { return INSTRUMENTS[i].cn; }), unfGods: g.unf.map(function (i) { return INSTRUMENTS[i].cn; }) };
  }

  /* ---------- the monthly circuit breaker and the all-clear ---------- */
  var THREAT = {
    6: { key: 'Seven_Killings', title: 'Leverage kill switch', risk: 'Sudden crashes, margin calls and systemic shocks.',
      steps: ['Bring margin and leveraged positions down before the month starts.', 'No new futures, leveraged funds or high-beta crypto this month.'] },
    1: { key: 'Rob_Wealth', title: 'Volatility quarantine', risk: 'Retail traps, pump-and-dumps, revenge trading, money siphoned by others.',
      steps: ['Review speculative and high-beta holdings; consider moving them to cash or T-bills.', 'No meme stocks, same-day options or new speculative coins this month.'] },
    3: { key: 'Hurting_Officer', title: 'Volatility quarantine', risk: 'Regulatory crackdowns, leadership scandals, support levels breaking.',
      steps: ['Review short-term options and disruptive names under regulatory scrutiny; consider moving them to cash.', 'No new speculative positions this month.'] },
    8: { key: 'Indirect_Resource', title: 'Liquidity check', risk: 'False information, data errors, being trapped in illiquid or misunderstood assets.',
      steps: ['Avoid illiquid micro-caps and products with lock-ups; start unstaking in time if needed.', 'Verify every piece of information twice before acting.'] }
  };
  var THREAT_ORDER = [6, 1, 3, 8];
  function monthsAhead(user, t, count) {
    var P = global.QPPlanner, A = global.QPAstro, g = godSets(user);
    if (!P || !A || !g) return [];
    var ms = P.solarMonths({ y: t.y, m: t.m, d: t.d }).slice(0, count || 12), prev = null;
    // The month before the first, so the first can be read as an all-clear.
    var before = P.solarMonths((function () { var d = A.jdToLocal(ms[0].t0 - 2); return { y: d.y, m: d.m, d: Math.floor(d.d) }; })())[0];
    return [before].concat(ms).map(function (x) {
      var d0 = A.jdToLocal(x.t0), d1 = A.jdToLocal(x.t1 - 1), mid = A.jdToLocal(x.t0 + 7);
      var p = C.fourPillars(mid.y, mid.m, Math.floor(mid.d), 12, 0), ms_ = p.month.stem, mb = p.month.branch, mq = C.HIDDEN[mb][0];
      var sg = C.tenGod(user.pillars.day.stem, ms_).i, bg = C.tenGod(user.pillars.day.stem, mq).i;
      var hit = [sg, bg].filter(function (i, k, a) { return g.unf.indexOf(i) >= 0 && a.indexOf(i) === k; });
      var cat = THREAT_ORDER.filter(function (i) { return hit.indexOf(i) >= 0; })[0];
      var mode = hit.length ? 'DEFENSIVE_LOCKDOWN' : prev === 'DEFENSIVE_LOCKDOWN' ? 'ALL_CLEAR_TRANCHING' : 'OFFENSIVE';
      var r = { t0: x.t0, t1: x.t1, start: { y: d0.y, m: d0.m, d: Math.floor(d0.d) }, end: { y: d1.y, m: d1.m, d: Math.floor(d1.d) }, pillar: p.month.cn,
        stemGod: INSTRUMENTS[sg].cn + ' ' + INSTRUMENTS[sg].en, branchGod: INSTRUMENTS[bg].cn + ' ' + INSTRUMENTS[bg].en + ' (' + C.STEMS[mq] + ' main qi)',
        threats: hit.map(function (i) { return INSTRUMENTS[i].cn + ' ' + INSTRUMENTS[i].en; }), mode: mode,
        threat: cat !== undefined ? THREAT[cat] : hit.length ? { key: 'General', title: 'Extra caution', risk: 'An unfavourable influence for you rules the month.',
          steps: ['No new speculative or leveraged positions this month.', 'Keep to your plan and review stop-losses.'] } : null,
        source: hit.length ? (hit.indexOf(sg) >= 0 && hit.indexOf(bg) >= 0 ? 'stem and branch' : hit.indexOf(sg) >= 0 ? 'stem (visible news and volatility)' : 'branch (deep, institutional shifts)') : null };
      prev = mode;
      return r;
    }).slice(1);
  }
  /** The staged re-entry for an all-clear month: three thirds, each waiting for its Qi Men gate. */
  function allClearPlan(user, month) {
    var Q = global.QPQimen, A = global.QPAstro, g = godSets(user);
    if (!Q || !A || !g || !month) return null;
    var fav = g.fav.map(function (i) { return g.gods[i].elem; }).filter(function (e, k, a) { return a.indexOf(e) === k; });
    var wealthOut = [(g.de + 1) % 5, (g.de + 2) % 5].filter(function (e) { return fav.indexOf(e) >= 0; });
    var relaxed = !wealthOut.length, want2 = relaxed ? fav : wealthOut;
    var dayAt = function (k) { var d = A.jdToLocal(month.t0 + k); return { y: d.y, m: d.m, d: Math.floor(d.d) }; };
    var label = function (d, h) { return d.d + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.m - 1] + (h !== undefined ? ' · ' + pad(h - 1) + ':00–' + pad(h) + ':59' : ''); };
    var palEl = function (x) { return elIdx(x); };
    var find1 = null, find2 = null, find3 = null, k, h, r;
    for (k = 0; k < 5 && !find1; k++) {
      var d1 = dayAt(k + 0.5);
      try { r = Q.chartFor('day', { y: d1.y, m: d1.m, d: d1.d, hour: 12, min: 0 }); } catch (e) { continue; }
      var od = pals(r.chart).filter(function (x) { return x.gate === '开门'; })[0];
      if (od && !od.isEmpty && fav.indexOf(palEl(od)) >= 0) find1 = { when: label(d1), why: 'Open Door in the ' + od.dir + ' (' + EL_EN[palEl(od)] + ', favourable for you)' };
    }
    for (k = 5; k < 10 && !find2; k++) {
      var d2 = dayAt(k + 0.5);
      for (h = 1; h < 24 && !find2; h += 2) {
        try { r = Q.chartFor('hour', { y: d2.y, m: d2.m, d: d2.d, hour: h, min: 30 }); } catch (e) { continue; }
        var ch2 = pals(r.chart).filter(function (x) { return (x.spirit === '值符' || x.spirit === '九天') && !x.isEmpty && want2.indexOf(palEl(x)) >= 0; })[0];
        if (ch2) find2 = { when: label(d2, h + 1), why: ch2.spirit + ' over ' + EL_EN[palEl(ch2)] + ' in the ' + ch2.dir + (relaxed ? ' (a favourable element; neither your Wealth nor Output element is favourable)' : ' (your favourable ' + ((g.de + 2) % 5 === palEl(ch2) ? 'Wealth' : 'Output') + ' element)') };
      }
    }
    for (k = 10; k < 20 && !find3; k++) {
      var d3 = dayAt(k + 0.5);
      for (h = 1; h < 24 && !find3; h += 2) {
        try { r = Q.chartFor('hour', { y: d3.y, m: d3.m, d: d3.d, hour: h, min: 30 }); } catch (e) { continue; }
        var ld = pals(r.chart).filter(function (x) { return x.gate === '生门'; })[0];
        if (ld && !ld.isEmpty && fav.indexOf(palEl(ld)) >= 0) find3 = { when: label(d3, h + 1), why: 'Life Door in the ' + ld.dir + ' (' + EL_EN[palEl(ld)] + ', favourable for you)' };
      }
    }
    return [
      { level: 1, name: 'Vanguard', days: 'days 1–5', gate: 'Open Door (开门) in a palace of your favourable element, on the day plate', found: find1,
        action: 'Move the first third back into core holdings and low-risk growth.' },
      { level: 2, name: 'Main force', days: 'days 6–10', gate: 'Chief (值符) or Nine Heavens (九天) over your favourable Wealth or Output element, on the hour plate', found: find2,
        action: 'Move the second third back into your normal growth positions.' },
      { level: 3, name: 'Full return', days: 'day 11 onwards', gate: 'Life Door (生门) in a palace of your favourable element, on the hour plate, once markets have calmed (your judgement)', found: find3,
        action: 'Return to your normal allocation. Leverage only if it was already part of a plan agreed with an adviser.' }
    ];
  }

  global.QPInvest = { crashProtocol: crashProtocol, nineEarth: nineEarth, tenGodPeriod: tenGodPeriod, DEITY: DEITY, deityRead: deityRead, robWealthPeriod: robWealthPeriod, instruments: instruments, monthsAhead: monthsAhead, allClearPlan: allClearPlan, godSets: godSets, INSTRUMENTS: INSTRUMENTS, THREAT: THREAT, read: read, windows: windows, phases: phases, sectors: sectors, strategies: strategies, SECTORS: SECTORS, STRATEGIES: STRATEGIES, SEASON_MULT: SEASON_MULT };
})(typeof window !== 'undefined' ? window : globalThis);
