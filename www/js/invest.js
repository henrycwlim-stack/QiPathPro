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
    var verdict = ph.capital.status === 'BLOCKED' ? 'Stand aside' : ph.yield.status === 'ZERO' ? 'No real yield' : bestS && bestS.score >= 60 ? 'Favourable set-up' : 'Neutral';
    return { style: style, posture: style === 'technical' ? 'Guest 客 · hour plate' : 'Host 主 · day plate', chart: ch, pillars: r.pillars, phases: ph,
      strategies: st, sectors: sec, verdict: verdict };
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

  global.QPInvest = { read: read, windows: windows, phases: phases, sectors: sectors, strategies: strategies, SECTORS: SECTORS, STRATEGIES: STRATEGIES, SEASON_MULT: SEASON_MULT };
})(typeof window !== 'undefined' ? window : globalThis);
