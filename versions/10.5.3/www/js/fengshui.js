/* QiPath Pro — Feng Shui engine (玄空飛星 + 八宅 + 二十四山).
 *
 * Implements the specification in docs/fengshui-spec.md. Two geometries are used and must
 * not be confused: star sectors are 15°/45° pie wedges from the plan centre, while shape
 * deficiency (缺角) is judged on the 3×3 九宮格 over the bounding rectangle. Using wedges
 * for the latter scores a perfect rectangle at 51–76% and flags every flat as defective.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;
  var norm = function (d) { return ((d % 360) + 360) % 360; };
  var m9 = function (n) { return ((n - 1) % 9 + 9) % 9 + 1; };

  /* ================= periods ================= */

  var PERIOD_INFO = {
    1: { trigram:'坎', en:'Kan',  elem:'Water', from:1864 },
    2: { trigram:'坤', en:'Kun',  elem:'Earth', from:1884 },
    3: { trigram:'震', en:'Zhen', elem:'Wood',  from:1904 },
    4: { trigram:'巽', en:'Xun',  elem:'Wood',  from:1924 },
    5: { trigram:'中', en:'Centre', elem:'Earth', from:1944 },
    6: { trigram:'乾', en:'Qian', elem:'Metal', from:1964 },
    7: { trigram:'兌', en:'Dui',  elem:'Metal', from:1984 },
    8: { trigram:'艮', en:'Gen',  elem:'Earth', from:2004 },
    9: { trigram:'離', en:'Li',   elem:'Fire',  from:2024 }
  };

  /** Period from a civil date. The boundary is Lichun, not 1 January. */
  function periodFor(y, m, d) {
    var p = C.fourPillars(y, m || 1, d || 1, 12, 0);
    var sy = p.solarYear;                       // already rolled at Lichun
    var n = Math.floor((sy - 1864) / 20);
    var per = ((n % 9) + 9) % 9 + 1;
    var startYear = 1864 + n * 20;
    return { period: per, solarYear: sy, startYear: startYear, endYear: startYear + 19,
             info: PERIOD_INFO[per] };
  }
  function currentPeriod() {
    var t = new Date();
    return periodFor(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  /* ================= 24 mountains ================= */

  // char, palace, yuan rank (0 地 1 天 2 人), yang
  var MOUNTAINS = [
    ['壬',1,0,1],['子',1,1,0],['癸',1,2,0], ['丑',8,0,0],['艮',8,1,1],['寅',8,2,1],
    ['甲',3,0,1],['卯',3,1,0],['乙',3,2,0], ['辰',4,0,0],['巽',4,1,1],['巳',4,2,1],
    ['丙',9,0,1],['午',9,1,0],['丁',9,2,0], ['未',2,0,0],['坤',2,1,1],['申',2,2,1],
    ['庚',7,0,1],['酉',7,1,0],['辛',7,2,0], ['戌',6,0,0],['乾',6,1,1],['亥',6,2,1]
  ];
  var PAL_DIR  = { 1:'N', 2:'SW', 3:'E', 4:'SE', 5:'C', 6:'NW', 7:'W', 8:'NE', 9:'S' };
  var PAL_NAME = { 1:'坎', 2:'坤', 3:'震', 4:'巽', 5:'中', 6:'乾', 7:'兌', 8:'艮', 9:'離' };
  var PAL_FULL = { N:'North', NE:'Northeast', E:'East', SE:'Southeast', S:'South',
                   SW:'Southwest', W:'West', NW:'Northwest', C:'Centre' };
  var YUAN = ['地元','天元','人元'];

  /**
   * Degrees to mountain. The table starts at 壬 = 337.5°, so the offset is +22.5.
   * Using +7.5 puts every reading one mountain out and silently corrupts the chart.
   */
  function mountainIndex(deg) {
    if (typeof deg !== 'number' || !isFinite(deg)) return -1;
    return Math.floor((norm(deg) + 22.5) % 360 / 15);
  }
  function mountainFor(deg) {
    var i = mountainIndex(deg);
    if (i < 0 || i > 23) return null;          // a bad bearing must not crash the caller
    var m = MOUNTAINS[i];
    var start = norm(337.5 + i * 15);
    return { index:i, char:m[0], palace:m[1], yuan:m[2], yang:!!m[3],
             yuanName:YUAN[m[2]], dir:PAL_DIR[m[1]], dirFull:PAL_FULL[PAL_DIR[m[1]]],
             trigram:PAL_NAME[m[1]], start:start, end:norm(start + 15),
             centre:norm(start + 7.5) };
  }
  /** How far the reading sits from the nearest sector boundary, in degrees. */
  function boundaryDistance(deg) {
    var off = norm(norm(deg) + 22.5) % 15;
    return Math.min(off, 15 - off);
  }
  function mountainByPalaceYuan(pal, yuan) {
    for (var i = 0; i < MOUNTAINS.length; i++) {
      if (MOUNTAINS[i][1] === pal && MOUNTAINS[i][2] === yuan) return MOUNTAINS[i];
    }
    return null;
  }

  /* ================= flying star natal chart ================= */

  var PATH = [5,6,7,8,9,1,2,3,4];   // 中 乾 兌 艮 離 坎 坤 震 巽
  function fly(start, forward) {
    var out = {};
    PATH.forEach(function (pal, i) { out[pal] = m9(start + (forward ? i : -i)); });
    return out;
  }

  /**
   * Build the natal chart. `fiveMode` selects the convention for star 5's polarity,
   * where schools differ: 'period' (default) borrows the period star's palace.
   */
  function natalChart(period, facingDeg, fiveMode) {
    var f = mountainFor(facingDeg);
    if (!f) throw new Error('A facing bearing between 0 and 359.9 is needed before a chart can be cast.');
    var facingPal = f.palace, sittingPal = 10 - facingPal;
    var sittingM = mountainByPalaceYuan(sittingPal, f.yuan);
    var periodGrid = fly(period, true);
    var waterBase = periodGrid[facingPal];
    var mtnBase = periodGrid[sittingPal];

    function direction(star) {
      var pal = star === 5 ? (fiveMode === 'opposite' ? 10 - period : period) : star;
      var mm = mountainByPalaceYuan(pal, f.yuan);
      return mm ? !!mm[3] : true;
    }
    var water = fly(waterBase, direction(waterBase));
    var mountain = fly(mtnBase, direction(mtnBase));

    var type, typeEn, typeNote;
    if (mountain[sittingPal] === period && water[facingPal] === period) {
      type = '旺山旺向'; typeEn = 'Prosperous mountain and facing';
      typeNote = 'The best configuration: people and money are both supported by the building itself.';
    } else if (mountain[facingPal] === period && water[facingPal] === period) {
      type = '雙星到向'; typeEn = 'Double star to facing';
      typeNote = 'Money and opportunity are supported at the front. Health and relationships, ' +
                 'governed by the mountain star, need help at the back of the property.';
    } else if (mountain[sittingPal] === period && water[sittingPal] === period) {
      type = '雙星到坐'; typeEn = 'Double star to sitting';
      typeNote = 'People, health and relationships are supported. Income needs activating at the ' +
                 'front — water, movement and activity toward the facing side.';
    } else if (mountain[facingPal] === period && water[sittingPal] === period) {
      type = '上山下水'; typeEn = 'Reversed';
      typeNote = 'Mountain and water stars are each in the wrong half. The strongest corrections ' +
                 'are needed, and the property suits a tenant more than a long purchase.';
    } else { type = '其他'; typeEn = 'Mixed'; typeNote = 'Neither half carries the period star cleanly.'; }

    var palaces = [1,2,3,4,5,6,7,8,9].map(function (n) {
      return {
        palace: n, dir: PAL_DIR[n], dirFull: PAL_FULL[PAL_DIR[n]], trigram: PAL_NAME[n],
        mountain: mountain[n], water: water[n], period: periodGrid[n],
        isFacing: n === facingPal, isSitting: n === sittingPal,
        combo: comboFor(mountain[n], water[n], period)
      };
    });

    return {
      period: period, facing: f,
      sitting: sittingM ? { char: sittingM[0], palace: sittingPal, dir: PAL_DIR[sittingPal],
                            dirFull: PAL_FULL[PAL_DIR[sittingPal]] } : null,
      facingPal: facingPal, sittingPal: sittingPal,
      periodGrid: periodGrid, mountainStars: mountain, waterStars: water,
      type: type, typeEn: typeEn, typeNote: typeNote,
      palaces: palaces, byPalace: palaces.reduce(function (a, p) { a[p.palace] = p; return a; }, {}),
      fiveMode: fiveMode || 'period'
    };
  }

  /* ================= star meanings and combinations ================= */

  var STAR = {
    1: { name:'一白貪狼', elem:'Water', good:'career, travel, fresh starts, scholarship',
         bad:'isolation, kidney and ear trouble' },
    2: { name:'二黑巨門', elem:'Earth', good:'property, steady accumulation',
         bad:'illness, worry, chronic complaints' },
    3: { name:'三碧祿存', elem:'Wood', good:'drive, growth, initiative',
         bad:'argument, litigation, theft' },
    4: { name:'四綠文曲', elem:'Wood', good:'study, writing, romance, reputation',
         bad:'scandal, indecision' },
    5: { name:'五黃廉貞', elem:'Earth', good:'—',
         bad:'misfortune, accident, serious illness; the most disruptive star' },
    6: { name:'六白武曲', elem:'Metal', good:'authority, mentors, promotion, heaven-sent help',
         bad:'stubbornness, head and lung trouble' },
    7: { name:'七赤破軍', elem:'Metal', good:'eloquence, negotiation',
         bad:'loss, gossip, robbery, betrayal' },
    8: { name:'八白左輔', elem:'Earth', good:'wealth, property, steady prosperity',
         bad:'spinal and joint trouble when weakened' },
    9: { name:'九紫右弼', elem:'Fire', good:'recognition, celebration, future prosperity',
         bad:'eye trouble, fire risk, over-exposure' }
  };
  var TIMELY = { 9:[9,1,8], 8:[8,9,1], 7:[7,8,9], 6:[6,7,8] };  // current, next, next again

  // Combinations the classics single out. Key is 'mountain-water'.
  var COMBOS = {
    '1-4':'登科 scholarship and writing — the best study combination',
    '4-1':'登科 scholarship, with romance alongside; guard against indiscretion',
    '1-6':'Authority supporting talent; good for professional advancement',
    '6-1':'Mentors and recognition; favourable for office and rank',
    '8-6':'Wealth with authority — one of the strongest wealth pairings',
    '6-8':'Authority converting into property and money',
    '8-9':'Prosperity now and prosperity coming; strongest pair in Period 9',
    '9-8':'Recognition turning into wealth; excellent in this period',
    '9-9':'Doubled Fire — brilliant but volatile. Superb in Period 9, needs Earth to steady it',
    '8-8':'Doubled Earth wealth. Strong in Period 8, now retiring',
    '1-8':'Water feeding Earth wealth; steady accumulation',
    '4-9':'Fame through writing and intellect',
    '2-5':'鬥牛煞 the most serious illness pairing; keep quiet, add Metal, never a bedroom',
    '5-2':'Serious illness and misfortune; the sector to leave undisturbed',
    '3-7':'穿心煞 robbery and litigation; guard valuables and contracts',
    '7-3':'Litigation and betrayal; avoid negotiating here',
    '2-3':'鬥牛煞 disputes within the household, often between generations',
    '3-2':'Household argument; keep the kitchen and bedroom out of it',
    '5-9':'Fire feeding the Five Yellow — magnifies misfortune; no red, no lighting',
    '9-5':'The Five Yellow inflamed; the worst sector to renovate',
    '2-7':'Illness with loss; guard health and money together',
    '7-9':'Fire melting Metal — accident and fire risk',
    '6-7':'交劍煞 clashing swords; conflict between people of similar rank',
    '7-6':'交劍煞 clashing swords; disputes over authority',
    '4-3':'Instability and indecision; poor for a study despite the 4',
    '5-5':'Doubled Five Yellow; the single worst sector in the chart'
  };

  function comboFor(mtn, water, period) {
    var key = mtn + '-' + water;
    var timely = TIMELY[period] || [period];
    var mtnTimely = timely.indexOf(mtn) >= 0, waterTimely = timely.indexOf(water) >= 0;
    var note = COMBOS[key] || null;
    var tone;
    if (mtn === 5 || water === 5) tone = 'bad';
    else if (mtnTimely && waterTimely) tone = 'good';
    else if (mtnTimely || waterTimely) tone = 'mixed';
    else if ([2,3,7].indexOf(mtn) >= 0 && [2,3,7].indexOf(water) >= 0) tone = 'bad';
    else tone = 'neutral';
    return {
      key: key, note: note, tone: tone,
      mountainTimely: mtnTimely, waterTimely: waterTimely,
      text: note || (STAR[mtn].name + ' over ' + STAR[water].name + '. Mountain star ' + mtn +
        ' governs people and health here; water star ' + water + ' governs money and opportunity.')
    };
  }

  /* ================= annual layer and afflictions ================= */

  var TRIAD = { water:[8,0,4], wood:[11,3,7], fire:[2,6,10], metal:[5,9,1] };
  function triadOf(branch) {
    if (TRIAD.water.indexOf(branch) >= 0) return 'water';
    if (TRIAD.wood.indexOf(branch) >= 0) return 'wood';
    if (TRIAD.fire.indexOf(branch) >= 0) return 'fire';
    return 'metal';
  }
  // Three Killings occupies the 90° arc opposite the year branch's triad.
  var THREE_KILL = {
    water: { dirs:['SE','S','SW'], mountains:['巳','丙','午','丁','未'], cn:'南方三煞' },
    fire:  { dirs:['NE','N','NW'], mountains:['亥','壬','子','癸','丑'], cn:'北方三煞' },
    wood:  { dirs:['SW','W','NW'], mountains:['申','庚','酉','辛','戌'], cn:'西方三煞' },
    metal: { dirs:['NE','E','SE'], mountains:['寅','甲','卯','乙','辰'], cn:'東方三煞' }
  };
  // The year branch's own mountain (天元 rank).
  var BRANCH_MOUNTAIN = { 0:'子',1:'丑',2:'寅',3:'卯',4:'辰',5:'巳',
                          6:'午',7:'未',8:'申',9:'酉',10:'戌',11:'亥' };

  function afflictions(solarYear) {
    var branch = ((solarYear - 1984) % 12 + 12) % 12;
    var taiSuiChar = BRANCH_MOUNTAIN[branch];
    var taiSui = MOUNTAINS.filter(function (m) { return m[0] === taiSuiChar; })[0];
    var breakChar = BRANCH_MOUNTAIN[(branch + 6) % 12];
    var brk = MOUNTAINS.filter(function (m) { return m[0] === breakChar; })[0];
    var tk = THREE_KILL[triadOf(branch)];
    var annual = S.annualStar(solarYear);
    var grid = S.flyingStars(annual);
    var fiveDir = null;
    grid.forEach(function (row) { row.forEach(function (c) { if (c.star === 5) fiveDir = c.dir; }); });

    return {
      year: solarYear, zodiac: C.ZODIAC[branch],
      taiSui: { char: taiSuiChar, dir: PAL_DIR[taiSui[1]],
                dirFull: PAL_FULL[PAL_DIR[taiSui[1]]], cn:'太歲',
                rule:'Do not disturb — no digging, demolition or heavy renovation in this sector. ' +
                     'You may sit with your back to it; do not face it directly.' },
      yearBreaker: { char: breakChar, dir: PAL_DIR[brk[1]],
                dirFull: PAL_FULL[PAL_DIR[brk[1]]], cn:'歲破',
                rule:'The mountain opposite Tai Sui. Avoid facing this direction for important ' +
                     'work, and avoid major renovation here.' },
      threeKillings: { dirs: tk.dirs, mountains: tk.mountains, cn: tk.cn,
                rule:'Do not disturb this 90° arc. You may face it; do not sit with your back ' +
                     'to it. This is the distinction most often reversed.' },
      fiveYellow: { dir: fiveDir, dirFull: PAL_FULL[fiveDir], cn:'五黃',
                rule:'No renovation, drilling or noise. Add heavy static metal. Keep the sector ' +
                     'quiet and unused where possible.' },
      annualStar: annual, annualGrid: grid
    };
  }

  /** Natal, annual and monthly layers for one sector. */
  function sectorLayers(natal, solarYear, monthBranch) {
    var annual = S.annualStar(solarYear);
    var aGrid = S.flyingStars(annual);
    var monthly = monthBranch !== undefined ? S.monthStar(solarYear, monthBranch) : null;
    var mGrid = monthly ? S.flyingStars(monthly) : null;
    var aff = afflictions(solarYear);
    var byDir = {};
    aGrid.forEach(function (row, r) {
      row.forEach(function (c, i) {
        byDir[c.dir] = { annual: c.star, monthly: mGrid ? mGrid[r][i].star : null };
      });
    });
    return natal.palaces.filter(function (p) { return p.palace !== 5; }).map(function (p) {
      var o = byDir[p.dir] || {};
      var flags = [];
      if (aff.taiSui.dir === p.dir) flags.push({ cn:'太歲', en:'Tai Sui', rule: aff.taiSui.rule });
      if (aff.yearBreaker.dir === p.dir) flags.push({ cn:'歲破', en:'Year Breaker', rule: aff.yearBreaker.rule });
      if (aff.threeKillings.dirs.indexOf(p.dir) >= 0) flags.push({ cn:'三煞', en:'Three Killings', rule: aff.threeKillings.rule });
      if (aff.fiveYellow.dir === p.dir) flags.push({ cn:'五黃', en:'Five Yellow', rule: aff.fiveYellow.rule });
      return { palace: p.palace, dir: p.dir, dirFull: p.dirFull, trigram: p.trigram,
               natalMountain: p.mountain, natalWater: p.water, natalPeriod: p.period,
               combo: p.combo, annual: o.annual, monthly: o.monthly,
               isFacing: p.isFacing, isSitting: p.isSitting, afflictions: flags };
    });
  }

  /* ================= remedies ================= */

  var REMEDY = {
    Water:{ add:'Water — a small moving water feature, blue or black, glass',
            drain:'Wood — living plants',   control:'Earth — ceramic, stone, still weight' },
    Wood: { add:'Wood — living plants, green, tall vertical forms',
            drain:'Fire — light, red, warmth', control:'Metal — a heavy metal object, white' },
    Fire: { add:'Fire — lamps, red, triangular forms',
            drain:'Earth — ceramic, stone',   control:'Water — a still bowl of water, blue' },
    Earth:{ add:'Earth — ceramic, crystal, salt, square forms',
            drain:'Metal — brass, copper, a six-rod metal chime',
            control:'Wood — plants, green' },
    Metal:{ add:'Metal — brass or copper, white, round forms',
            drain:'Water — a small water feature', control:'Fire — light and warmth' }
  };
  function remedyFor(star, period) {
    var timely = (TIMELY[period] || [period]).indexOf(star) >= 0;
    var e = STAR[star].elem;
    if (star === 5 || star === 2) {
      return { action:'weaken', text:'Drain it with ' + REMEDY.Earth.drain +
        '. Never add Fire here — red, lighting and heat feed an Earth affliction.' };
    }
    if (star === 3 || star === 7) {
      return { action:'weaken', text:'Control it with ' + REMEDY[e].control + '.' };
    }
    if (timely) return { action:'activate', text:'Activate it with ' + REMEDY[e].add +
      ', and with use — this sector rewards activity.' };
    return { action:'support', text:'Neutral in this period. Support with ' + REMEDY[e].add +
      ' if the room matters to you, otherwise leave it be.' };
  }

  /* ================= floor plan geometry ================= */

  /**
   * Bearing of an image point from the plan centre.
   * planNorth is the true bearing that the image's "up" direction corresponds to.
   */
  function bearingOf(px, py, cx, cy, planNorth) {
    var dx = px - cx, dy = -(py - cy);          // image y grows downward
    var a = Math.atan2(dx, dy) * 180 / Math.PI; // 0 = image-up, clockwise positive
    return norm(a + (planNorth || 0));
  }
  function sectorOf(px, py, cx, cy, planNorth) {
    if ([px, py, cx, cy].some(function (v) { return typeof v !== 'number' || !isFinite(v); })) {
      return { bearing: null, mountain: null, palace: null, dir: '?', dirFull: 'unknown', yuan: null };
    }
    var b = bearingOf(px, py, cx, cy, planNorth);
    var m = mountainFor(b);
    if (!m) return { bearing: b, mountain: null, palace: null, dir: '?', dirFull: 'unknown', yuan: null };
    return { bearing: b, mountain: m.char, palace: m.palace,
             dir: m.dir, dirFull: m.dirFull, yuan: m.yuanName };
  }

  function pointInPoly(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function centroid(poly) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      a += f; cx += (poly[j][0] + poly[i][0]) * f; cy += (poly[j][1] + poly[i][1]) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-9) {
      var sx = 0, sy = 0;
      poly.forEach(function (p) { sx += p[0]; sy += p[1]; });
      return [sx / poly.length, sy / poly.length];
    }
    return [cx / (6 * a), cy / (6 * a)];
  }

  var GRID_BASE = [[315,0,45],[270,null,90],[225,180,135]];
  var DIR8 = ['N','NE','E','SE','S','SW','W','NW'];
  function cellDir(row, col, planNorth) {
    var b = GRID_BASE[row][col];
    if (b === null) return 'C';
    return DIR8[Math.round(norm(b + (planNorth || 0)) / 45) % 8];
  }

  /**
   * Shape deficiency on the 3×3 九宮格 over the bounding rectangle. This is deliberately
   * NOT the pie-wedge geometry: sampling wedges scores a perfect rectangle at 51–76% and
   * would flag every rectangular home as defective.
   */
  function gridCoverage(poly, planNorth, samples) {
    samples = samples || 60;
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    poly.forEach(function (p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    var w = (maxX - minX) / 3, h = (maxY - minY) / 3, out = {};
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        var hit = 0, tot = 0;
        for (var i = 0; i < samples; i++) {
          for (var j = 0; j < samples; j++) {
            var x = minX + c * w + (i + 0.5) / samples * w;
            var y = minY + r * h + (j + 0.5) / samples * h;
            tot++; if (pointInPoly(poly, x, y)) hit++;
          }
        }
        out[cellDir(r, c, planNorth)] = Math.round(hit / tot * 100);
      }
    }
    return out;
  }

  var DEFICIENCY = [
    { min:90, cn:'完整', en:'Complete' },
    { min:67, cn:'凹',   en:'Slight recess' },
    { min:34, cn:'缺角', en:'Missing corner' },
    { min:0,  cn:'嚴重缺角', en:'Severely missing' }
  ];
  function deficiencyOf(pct) {
    for (var i = 0; i < DEFICIENCY.length; i++) if (pct >= DEFICIENCY[i].min) return DEFICIENCY[i];
    return DEFICIENCY[3];
  }
  // Whom the tradition associates with each palace.
  var PALACE_PERSON = {
    NW:'the father or the head of the household', SW:'the mother',
    E:'the eldest son', SE:'the eldest daughter', N:'the middle son',
    S:'the middle daughter', NE:'the youngest son', W:'the youngest daughter',
    C:'the household as a whole'
  };

  function analyseShape(poly, planNorth) {
    var cov = gridCoverage(poly, planNorth);
    var out = [];
    Object.keys(cov).forEach(function (dir) {
      if (dir === 'C') return;
      var d = deficiencyOf(cov[dir]);
      out.push({ dir: dir, dirFull: PAL_FULL[dir], coverage: cov[dir],
                 level: d.en, cn: d.cn, deficient: cov[dir] < 67,
                 person: PALACE_PERSON[dir],
                 note: cov[dir] >= 90 ? 'Complete.'
                   : cov[dir] >= 67 ? 'A slight recess. Noted, but not treated as a defect.'
                   : 'A missing corner. The tradition associates this palace with ' +
                     PALACE_PERSON[dir] + '. Read it as a place the building does not support, ' +
                     'not as a prediction about anyone.' });
    });
    return { coverage: cov, sectors: out,
             deficient: out.filter(function (x) { return x.deficient; }) };
  }

  /* ================= placement ================= */

  var ROOM_TYPES = [
    { id:'bedroom', label:'Bedroom', wants:['mountain'], avoid:[5,2,3,7] },
    { id:'study',   label:'Study or desk', wants:['water','4'], avoid:[5,2,3] },
    { id:'living',  label:'Living room', wants:['water'], avoid:[5,2] },
    { id:'office',  label:'Home office', wants:['water','6'], avoid:[5,2,3,7] },
    { id:'kitchen', label:'Kitchen or stove', wants:[], avoid:[] },
    { id:'bath',    label:'Bathroom or toilet', wants:[], avoid:[] },
    { id:'entrance',label:'Main entrance', wants:['water'], avoid:[5,2] },
    { id:'store',   label:'Storage', wants:[], avoid:[] }
  ];

  function scoreSector(layer, roomType, mansions, period) {
    var score = 50, why = [];
    var rt = ROOM_TYPES.filter(function (r) { return r.id === roomType; })[0] || ROOM_TYPES[0];
    var timely = TIMELY[period] || [period];

    if (timely.indexOf(layer.natalWater) >= 0) { score += 16;
      why.push('natal water star ' + layer.natalWater + ' is timely — supports money and opportunity'); }
    if (timely.indexOf(layer.natalMountain) >= 0) { score += 14;
      why.push('natal mountain star ' + layer.natalMountain + ' is timely — supports people and health'); }
    if (layer.combo.tone === 'bad') { score -= 22; why.push('the natal pair ' + layer.combo.key + ' is an afflicted combination'); }
    if (layer.combo.tone === 'good') { score += 10; why.push('the natal pair ' + layer.combo.key + ' is favourable'); }

    rt.avoid.forEach(function (st) {
      if (layer.natalMountain === st || layer.natalWater === st) {
        score -= 14; why.push('star ' + st + ' present, which this room type should avoid');
      }
      if (layer.annual === st) { score -= 10; why.push('annual star ' + st + ' visits this year'); }
    });
    if (layer.annual === 8 || layer.annual === 9 || layer.annual === 1) { score += 8;
      why.push('annual star ' + layer.annual + ' is favourable this year'); }

    layer.afflictions.forEach(function (f) {
      score -= (f.cn === '五黃' ? 20 : 12);
      why.push(f.cn + ' ' + f.en + ' falls here this year');
    });

    if (mansions) {
      if (mansions.good.indexOf(layer.dir) >= 0) { score += 12;
        why.push('one of your Eight Mansions supportive directions'); }
      if (mansions.avoid.indexOf(layer.dir) >= 0) { score -= 10;
        why.push('an Eight Mansions direction you should avoid'); }
      if (mansions.best === layer.dir) { score += 6; why.push('your single best personal direction'); }
    }
    // A bathroom in a strong sector wastes it; in a weak sector it helps.
    if (roomType === 'bath') { score = 100 - score;
      why.push('for a bathroom the scoring is inverted — a wet room suppresses whatever sector it occupies'); }

    score = Math.max(3, Math.min(97, score));
    return { dir: layer.dir, dirFull: layer.dirFull, score: score, why: why,
             band: score >= 68 ? 'Recommended' : score >= 45 ? 'Workable' : 'Avoid' };
  }

  function placementFor(natal, solarYear, monthBranch, mansions, roomType) {
    var layers = sectorLayers(natal, solarYear, monthBranch);
    return layers.map(function (l) { return scoreSector(l, roomType, mansions, natal.period); })
      .sort(function (a, b) { return b.score - a.score; });
  }


  /* ================= property audit and cures ================= */

  /* Deterministic findings computed from the chart, the rooms and the shape. The AI layer
     expands these into prose; it does not invent them. Anything the app cannot see from
     numbers — what the door faces, beams, the road outside — is named as unseen rather
     than guessed at. */

  var TIMELY_NOW = function (period) { return TIMELY[period] || [period]; };

  // Which room types must not sit on which stars, and why.
  var ROOM_RISK = {
    bedroom:  { stars:{ 5:'the Five Yellow over a bed is the classic illness placement',
                        2:'the Illness star over a bed brings chronic, low-grade complaints',
                        3:'the Argument star in a bedroom disturbs sleep and the relationship',
                        7:'the Loss star in a bedroom brings gossip and betrayal' },
                wants:'a timely mountain star, which governs people and health' },
    entrance: { stars:{ 5:'the Five Yellow at the main door admits misfortune to the whole house',
                        2:'the Illness star at the door affects everyone entering',
                        3:'the Argument star at the door invites disputes and litigation',
                        7:'the Loss star at the door invites theft and gossip' },
                wants:'a timely water star, which governs income and opportunity' },
    kitchen:  { stars:{ 5:'a stove over the Five Yellow is the most serious kitchen placement',
                        2:'a stove over the Illness star carries into the family\u2019s food' },
                wants:'a settled sector; the stove position matters more than the room' },
    study:    { stars:{ 5:'the Five Yellow disrupts concentration and results',
                        3:'the Argument star scatters attention',
                        2:'the Illness star dulls the mind' },
                wants:'a 4 or a 1, the scholarship stars' },
    office:   { stars:{ 5:'', 2:'', 3:'the Argument star brings disputes into your work',
                        7:'the Loss star brings betrayal and lost contracts' },
                wants:'a timely water star, or a 6 for authority' }
  };

  function isTimely(star, period) { return TIMELY_NOW(period).indexOf(star) >= 0; }

  /**
   * Cure for a star, by element logic rather than by ornament.
   * The one that is most often got wrong: an Earth affliction (2 or 5) must be drained
   * with Metal, never fed with Fire. Red and lighting make it worse.
   */
  function cureFor(star, period, context) {
    var e = STAR[star].elem;
    if (star === 5) return {
      element:'Metal', severity:'high',
      what:'Drain the Five Yellow with heavy, still metal — brass or copper, a six-rod metal ' +
           'chime, a metal-cased clock. Keep the sector quiet and as unused as possible.',
      avoid:'No red, no bright lighting, no candles, no renovation or drilling. Fire feeds Earth ' +
            'and makes this worse, which is the most commonly reversed piece of advice here.'
    };
    if (star === 2) return {
      element:'Metal', severity:'high',
      what:'Drain the Illness star with metal — brass, copper, white. A metal wind chime hung ' +
           'still, or a heavy metal object left in place.',
      avoid:'No Fire element: no red, no strong lighting, no heat source. Avoid using this sector ' +
            'as a bedroom or a sickroom.'
    };
    if (star === 3) return {
      element:'Fire', severity:'medium',
      what:'Control the Argument star by exhausting Wood into Fire — a small steady lamp, warm ' +
           'light, a touch of red. Keep the sector quiet.',
      avoid:'No water feature and no blue here; Water feeds Wood and inflames the dispute.'
    };
    if (star === 7) return {
      element:'Water', severity:'medium',
      what:'Drain the Loss star with Water — a small still bowl, blue or black.',
      avoid:'Avoid Earth here, which would strengthen it. Secure valuables and read contracts twice.'
    };
    if (isTimely(star, period)) return {
      element:STAR[star].elem, severity:'opportunity',
      what:'This star is timely. Activate it with ' + REMEDY[e].add + ' and, more importantly, ' +
           'with use — an activated sector is one you spend time in.',
      avoid:'Do not leave it as a storeroom or a corridor. An unused good sector does nothing.'
    };
    return {
      element:STAR[star].elem, severity:'low',
      what:'Neutral in this period. Support with ' + REMEDY[e].add + ' if the room matters to you.',
      avoid:'Nothing specific.'
    };
    void context;
  }

  var ROOM_KIND = {
    bedroom:'bedroom', master:'bedroom', bed:'bedroom',
    entrance:'entrance', door:'entrance', foyer:'entrance',
    kitchen:'kitchen', stove:'kitchen',
    bath:'wet', toilet:'wet', wc:'wet', shower:'wet', ensuite:'wet',
    study:'study', office:'office', desk:'study',
    living:'living', lounge:'living', dining:'living',
    stair:'stairs', store:'store'
  };
  function classifyRoom(label) {
    var l = String(label || '').toLowerCase();
    var keys = Object.keys(ROOM_KIND);
    for (var i = 0; i < keys.length; i++) if (l.indexOf(keys[i]) >= 0) return ROOM_KIND[keys[i]];
    return 'other';
  }

  /**
   * Full audit. Returns findings ordered by severity, each naming the sector, the cause
   * and the cure. `rooms` is optional — without a plan the audit covers the chart only.
   */
  function auditProperty(natal, layers, aff, shape, rooms, mansions) {
    var period = natal.period;
    var findings = [];
    var byDir = {};
    layers.forEach(function (l) { byDir[l.dir] = l; });

    function add(sev, title, sector, cause, cure, unseen) {
      findings.push({ severity: sev, title: title, sector: sector, cause: cause,
                      cure: cure, unseen: !!unseen });
    }

    // --- chart-level ---
    if (natal.type === '上山下水') {
      add('high', 'Reversed chart 上山下水', natal.facing.dirFull,
        'The mountain star sits at the facing and the water star at the sitting, so neither half ' +
        'of the building supports what it should.',
        'The classical correction is a water feature at the sitting side and a solid, tall mass ' +
        'at the facing side — reversing the built form to match the chart. In a flat this usually ' +
        'means keeping the back of the home still and occupied, and the front bright and active.');
    } else if (natal.type === '雙星到向') {
      var sitL = byDir[natal.sitting.dirFull.slice(0, 2).toUpperCase()] ||
                 layers.filter(function (l) { return l.isSitting; })[0];
      add('medium', 'Double star to facing 雙星到向', natal.sitting ? natal.sitting.dirFull : '',
        'Both period stars sit at the front, so money and opportunity are supported but the ' +
        'mountain star — people, health and relationships — is weak at the back.',
        'Put a solid still mass at the sitting side: a heavy headboard, a bookcase, a stone or ' +
        'ceramic object. Avoid water at the back. Bedrooms want the settled half of the home.');
      void sitL;
    } else if (natal.type === '雙星到坐') {
      add('medium', 'Double star to sitting 雙星到坐', natal.facing.dirFull,
        'Both period stars sit at the back, so the household is supported but income is not ' +
        'activated at the front.',
        'Activate the facing side with movement, light and use — an aquarium or small water ' +
        'feature at the front, the main living activity toward the facing half.');
    }
    if (period === 9) {
      add('low', 'Period 9 has no perfect chart', '',
        'No facing produces 旺山旺向 in this period — the base stars always land in ' +
        'complementary palaces and can never both fly reverse.',
        'Do not spend money chasing a better facing. Work with whichever half your chart ' +
        'supports and correct the other.');
    }

    // --- sector-level ---
    layers.forEach(function (l) {
      var pair = [l.natalMountain, l.natalWater];
      if (pair.indexOf(5) >= 0) {
        add('high', 'Five Yellow in the natal chart', l.dirFull,
          'The natal ' + (l.natalMountain === 5 ? 'mountain' : 'water') + ' star here is 5, the ' +
          'most disruptive star. It is permanent, not annual.', cureFor(5, period));
      }
      if (l.combo.tone === 'bad' && l.combo.note) {
        add('medium', 'Afflicted combination ' + l.combo.key, l.dirFull,
          l.combo.note, cureFor(Math.max(l.natalMountain, l.natalWater), period));
      }
      if (l.annual === 5) {
        add('high', 'Annual Five Yellow visits', l.dirFull,
          'The Five Yellow is in this sector for ' + aff.year + '. It leaves at Lichun next year.',
          cureFor(5, period));
      }
      if (l.annual === 2 && l.natalWater !== 5 && l.natalMountain !== 5) {
        add('medium', 'Annual Illness star visits', l.dirFull,
          'The 2 is in this sector for ' + aff.year + '.', cureFor(2, period));
      }
      l.afflictions.forEach(function (f) {
        if (f.cn === '五黃') return;   // already covered
        add(f.cn === '三煞' ? 'medium' : 'low', f.cn + ' ' + f.en, l.dirFull, f.rule,
          { element:'—', severity:'timing',
            what:'This is a timing restriction, not a cure. Leave the sector undisturbed for the ' +
                 'year — no renovation, drilling or heavy moving.',
            avoid:'Note the direction of the rule: ' +
              (f.cn === '三煞' ? 'Three Killings may be faced but not sat against.'
                               : 'Tai Sui may be sat against but not faced.') });
      });
    });

    // --- shape ---
    if (shape) {
      shape.deficient.forEach(function (x) {
        add(x.coverage < 34 ? 'high' : 'medium', 'Missing corner ' + x.cn, x.dirFull,
          'Only ' + x.coverage + '% of this palace is enclosed by the building. The tradition ' +
          'associates this palace with ' + x.person + '.',
          { element:'—', severity:'structural',
            what:'The classical corrections are to extend the building, to place a mirror on the ' +
                 'inner walls of the recess so the space reads as complete, or to place the ' +
                 'element of that palace there — a crystal for an Earth palace, metal for a ' +
                 'Metal palace, a plant for a Wood palace.',
            avoid:'Do not read this as a statement about a person. It is a description of the ' +
                  'building\u2019s shape.' });
      });
    }

    // --- rooms ---
    (rooms || []).forEach(function (r) {
      var L = byDir[r.sector];
      if (!L) return;
      var kind = classifyRoom(r.label);
      var risk = ROOM_RISK[kind];
      if (risk) {
        [L.natalMountain, L.natalWater, L.annual].forEach(function (st) {
          if (!st || !risk.stars[st]) return;
          add(st === 5 ? 'high' : 'medium',
            r.label + ' on star ' + st, L.dirFull, risk.stars[st], cureFor(st, period));
        });
      }
      // A wet room suppresses whatever it sits on, which is a problem only over a good star.
      if (kind === 'wet') {
        if (isTimely(L.natalWater, period)) {
          add('high', 'Bathroom over the timely water star', L.dirFull,
            'The water star here is ' + L.natalWater + ', the wealth star of this period, and a ' +
            'wet room suppresses whatever sector it occupies. This is the classic ' +
            '"flushing away the wealth" placement.',
            { element:'Earth and Wood', severity:'high',
              what:'Keep the door shut and the lid down. Add Earth (ceramic, stone, a large ' +
                   'crystal) to stabilise, and plants to absorb the water element. Keep it dry ' +
                   'and well ventilated.',
              avoid:'Do not add more water: no blue, no mirrors facing the toilet, no fountains.' });
        }
        if (L.dir === 'C' || r.sector === 'C') {
          add('high', 'Bathroom in the centre', 'Centre',
            'The centre 天心 governs the household as a whole, and a wet room here affects ' +
            'everything that passes through the home.',
            { element:'Earth', severity:'high',
              what:'Heavy Earth to stabilise — stone, ceramic, salt. Keep it scrupulously dry, ' +
                   'ventilated and the door closed.',
              avoid:'This is a structural placement that cannot be fully corrected. Weigh it ' +
                    'honestly if you are choosing whether to buy.' });
        }
      }
      if (kind === 'stairs' && r.sector === 'C') {
        add('medium', 'Stairs in the centre', 'Centre',
          'A staircase through the centre disturbs the heart of the home.',
          { element:'Earth', severity:'medium',
            what:'Ground it with Earth at the foot of the stairs and keep the area well lit and ' +
                 'uncluttered.', avoid:'Avoid storing things under the stairs.' });
      }
      if (kind === 'bedroom' && mansions && mansions.avoid.indexOf(r.sector) >= 0) {
        add('low', r.label + ' in a personally unfavourable direction', L.dirFull,
          'This sector is one of your Eight Mansions directions to avoid (Gua ' + mansions.gua +
          ' ' + mansions.guaCn + ').',
          { element:'—', severity:'personal',
            what:'The bed position matters more than the room. Turn the head of the bed toward ' +
                 mansions.best + ' or another of your supportive directions.',
            avoid:'Do not move house over this alone — it is the weakest of the layers here.' });
      }
    });

    var order = { high:0, medium:1, low:2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity]; });
    return {
      findings: findings,
      counts: { high: findings.filter(function (f) { return f.severity === 'high'; }).length,
                medium: findings.filter(function (f) { return f.severity === 'medium'; }).length,
                low: findings.filter(function (f) { return f.severity === 'low'; }).length },
      // Stated so the reading is not mistaken for a complete consultation.
      unseen: [
        'What the main door faces from outside — a road, a corner, a pole, another door',
        'Landform: slope, water, the shape and height of what surrounds the building',
        'Beams, columns and sloped ceilings, which a plan rarely shows',
        'The stove and bed positions within their rooms, which matter more than the room itself',
        'Whether the facing bearing was measured accurately'
      ]
    };
  }

  global.QPFengShui = {
    auditProperty: auditProperty, cureFor: cureFor, classifyRoom: classifyRoom,
    PERIOD_INFO: PERIOD_INFO, MOUNTAINS: MOUNTAINS, STAR: STAR, COMBOS: COMBOS,
    PAL_DIR: PAL_DIR, PAL_NAME: PAL_NAME, PAL_FULL: PAL_FULL, ROOM_TYPES: ROOM_TYPES,
    periodFor: periodFor, currentPeriod: currentPeriod,
    mountainFor: mountainFor, mountainIndex: mountainIndex, boundaryDistance: boundaryDistance,
    natalChart: natalChart, comboFor: comboFor,
    afflictions: afflictions, sectorLayers: sectorLayers, remedyFor: remedyFor,
    bearingOf: bearingOf, sectorOf: sectorOf, centroid: centroid, pointInPoly: pointInPoly,
    gridCoverage: gridCoverage, analyseShape: analyseShape, deficiencyOf: deficiencyOf,
    placementFor: placementFor, scoreSector: scoreSector, norm: norm
  };
})(typeof window !== 'undefined' ? window : globalThis);
