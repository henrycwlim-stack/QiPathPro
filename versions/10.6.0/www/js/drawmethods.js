/* QiPath Pro — chart-driven number methods, built to be tested.
 *
 * Four methods proposed for "forecasting" 4D and TOTO, implemented faithfully so they can be
 * judged on evidence rather than argument:
 *
 *   bayes   Bayesian updating + Monte Carlo — Bazi and Zi Wei elements as the likelihood
 *   crt     Modular residues + the Chinese Remainder Theorem — San Cai's three tiers
 *   tda     Persistent homology (H₀) — Qimen palaces as a point cloud across two scales
 *   mdp     Markov decision process + value iteration — past draws modulated by the Qimen plate
 *
 * Every method returns the same shape as QPGuide.numbersFor, so QPDraws.ledger can replay it
 * against the archive and compare it with the exact chance baseline. Each is deterministic for
 * a given draw and profile, so a backtest reproduces.
 *
 * What the mathematics cannot change: in a fair draw every 4D number and every TOTO combination
 * has the same probability. A method can only choose WHICH equally likely tickets to hold. The
 * backtest exists to show that, method by method, on the real archive.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems, G = global.QPGuide;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  // Draw times in Singapore: 4D at 18:30, TOTO at 21:30.
  var DRAW_TIME = { fourD: [18, 30], toto: [21, 30] };

  // He Tu digit pairs, as in the proposal: Water 1/6, Fire 2/7, Wood 3/8, Metal 4/9, Earth 0/5.
  // Core element order: 0 Wood, 1 Fire, 2 Earth, 3 Metal, 4 Water.
  var ELEM_DIGITS = [[3, 8], [2, 7], [0, 5], [4, 9], [1, 6]];
  var DIGIT_ELEM = []; ELEM_DIGITS.forEach(function (pair, e) { pair.forEach(function (d) { DIGIT_ELEM[d] = e; }); });

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashSeed() {
    var h = 2166136261 >>> 0, s = Array.prototype.join.call(arguments, '|');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function pad4(n) { return ('000' + n).slice(-4); }
  function iso(dt) { return dt.y + '-' + ('0' + dt.m).slice(-2) + '-' + ('0' + dt.d).slice(-2); }

  // Which games draw on this date, using the app's own draw calendar.
  function games(dt, user) {
    var base = G.numbersFor(dt, user);
    return { fourD: !!base.fourD, toto: !!base.toto };
  }

  function drawPillars(dt, game) {
    var t = DRAW_TIME[game];
    return C.fourPillars(dt.y, dt.m, dt.d, t[0], t[1]);
  }

  /* ================= 1. BAYES + MONTE CARLO (Bazi, Zi Wei) ================= */

  // Element weights of the draw moment: stems 1.0, branch main qi 0.8, other hidden stems 0.35.
  function momentElements(p) {
    var w = [0, 0, 0, 0, 0];
    [p.day, p.hour].forEach(function (q) {
      w[C.STEM_ELEM[q.stem]] += 1;
      C.HIDDEN[q.branch].forEach(function (s, i) { w[C.STEM_ELEM[s]] += i === 0 ? 0.8 : 0.35; });
    });
    return w;
  }

  /**
   * Likelihood over the five elements: the draw's Day and Hour pillars (Bazi), the user's Day
   * Master interaction (favourable +, unfavourable −), and the Zi Wei palace that the draw day's
   * 化禄 flies into (its branch element). Posterior over digits ∝ uniform prior × likelihood.
   */
  function bayesPosterior(dt, user, game) {
    var p = drawPillars(dt, game), w = momentElements(p);
    var lik = [1, 1, 1, 1, 1];
    for (var e = 0; e < 5; e++) lik[e] *= 1 + 0.25 * w[e];
    (user.favourable || []).forEach(function (e) { lik[e] *= 1.3; });
    ((user.deep && user.deep.unfavourable) || []).forEach(function (e) { lik[e] *= 0.8; });
    var notes = ['Day ' + p.day.cn + ', hour ' + p.hour.cn];
    if (user.zwds) {
      var luStar = S.SIHUA[p.day.stem][0], where = null;
      user.zwds.palaces.forEach(function (pa) { if (pa.stars.concat(pa.minors || []).indexOf(luStar) >= 0) where = pa; });
      if (where) { lik[C.BRANCH_ELEM[where.branch]] *= 1.25; notes.push(luStar + '化禄 → ' + where.name); }
    }
    var tot = lik.reduce(function (a, b) { return a + b; }, 0);
    var post = lik.map(function (x) { return x / tot; });
    var digitP = []; for (var d = 0; d < 10; d++) digitP.push(post[DIGIT_ELEM[d]] / 2);
    return { element: post, digit: digitP, notes: notes };
  }

  function sampleIndex(probs, r) {
    var u = r(), c = 0;
    for (var i = 0; i < probs.length; i++) { c += probs[i]; if (u < c) return i; }
    return probs.length - 1;
  }

  function bayes(dt, user) {
    var g = games(dt, user), out = { method: 'bayes', fourD: null, toto: null };
    var N = 4000;
    if (g.fourD) {
      var pf = bayesPosterior(dt, user, 'fourD'), r = mulberry32(hashSeed('bayes4', iso(dt), user.id || ''));
      var counts = {};
      for (var i = 0; i < N; i++) {           // Monte Carlo: N tickets drawn digit by digit from the posterior
        var s = ''; for (var k = 0; k < 4; k++) s += sampleIndex(pf.digit, r);
        counts[s] = (counts[s] || 0) + 1;
      }
      var sets = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); }).slice(0, 4);
      out.fourD = { sets: sets, posterior: pf };
    }
    if (g.toto) {
      var pt = bayesPosterior(dt, user, 'toto'), r2 = mulberry32(hashSeed('bayesT', iso(dt), user.id || ''));
      var np = []; for (var n = 1; n <= 49; n++) np.push(pt.digit[n % 10]);
      var s2 = np.reduce(function (a, b) { return a + b; }, 0); np = np.map(function (x) { return x / s2; });
      var cnt = new Array(50).fill(0), keys = new Float64Array(49), NT = 1500;
      for (var j = 0; j < NT; j++) {
        // NT seven-number tickets drawn without replacement from the posterior, by the
        // Efraimidis–Spirakis method: key −ln(u)/w per number, keep the seven smallest
        // (a seven-pass partial selection, cheaper than sorting 49 keys).
        for (var q = 0; q < 49; q++) keys[q] = -Math.log(r2() || 1e-12) / np[q];
        for (var z = 0; z < 7; z++) {
          var mi = 0; for (var q2 = 1; q2 < 49; q2++) if (keys[q2] < keys[mi]) mi = q2;
          cnt[mi + 1]++; keys[mi] = Infinity;
        }
      }
      var nums = []; for (var m = 1; m <= 49; m++) nums.push(m);
      nums.sort(function (a, b) { return cnt[b] - cnt[a] || a - b; });
      out.toto = { numbers: nums.slice(0, 7).sort(function (a, b) { return a - b; }), posterior: pt };
    }
    return out;
  }

  /* ================= 2. MODULAR RESIDUES + CRT (San Cai) ================= */

  // x ≡ a_i (mod m_i) for pairwise-coprime moduli — the Chinese Remainder Theorem.
  function crt(res, mods) {
    var M = mods.reduce(function (a, b) { return a * b; }, 1), x = 0;
    mods.forEach(function (m, i) {
      var Mi = M / m, inv = 1;
      while ((Mi * inv) % m !== 1) inv++;       // tiny moduli, so a search is fine
      x += res[i] * Mi * inv;
    });
    return { x: mod(x, M), M: M };
  }

  /**
   * Heaven = the draw day's pillar index (0–59), Earth = the Qimen palace holding the chief star
   * at the draw hour (1–9), Man = the user's Day Master stem (0–9). Their residues mod 10 define
   * the allowed digit classes; the CRT solution of (H mod 7, E mod 9, M mod 10) indexes into the
   * restricted set, which is where the proposal says the "high-probability subset" lives.
   */
  function tiers(dt, user, game) {
    var p = drawPillars(dt, game), ch = S.qimen(p), E = 5;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) { var pa = ch.palacesByNumber[n];
      if (pa && pa.starCn === ch.chief) E = n; });
    return { H: p.day.i, E: E, M: user.pillars.day.stem, p: p };
  }

  function crtMethod(dt, user) {
    var g = games(dt, user), out = { method: 'crt', fourD: null, toto: null };
    if (g.fourD) {
      var t = tiers(dt, user, 'fourD');
      var R = [mod(t.H, 10), mod(t.E, 10), mod(t.M, 10), mod(t.H + t.E + t.M, 10)]
        .filter(function (d, i, a) { return a.indexOf(d) === i; }).sort();
      var space = []; R.forEach(function (a) { R.forEach(function (b) { R.forEach(function (c) { R.forEach(function (d) {
        space.push('' + a + b + c + d); }); }); }); });
      var x = crt([mod(t.H, 7), mod(t.E, 9), mod(t.M, 10)], [7, 9, 10]).x;
      var sets = []; for (var k = 0; k < 4; k++) sets.push(space[mod(x + k * 97, space.length)]);
      out.fourD = { sets: sets, residues: R, crt: x, subset: space.length };
    }
    if (g.toto) {
      var t2 = tiers(dt, user, 'toto');
      var cls = [mod(t2.H, 7), mod(t2.E, 7), mod(t2.M, 7)].filter(function (d, i, a) { return a.indexOf(d) === i; });
      var subset = []; for (var n = 1; n <= 49; n++) if (cls.indexOf(n % 7) >= 0) subset.push(n);
      var x2 = crt([mod(t2.H, 7), mod(t2.E, 9), mod(t2.M, 10)], [7, 9, 10]).x, picked = [];
      for (var j = 0; picked.length < 7 && j < 200; j++) { var v = subset[mod(x2 + j * 11, subset.length)];
        if (picked.indexOf(v) < 0) picked.push(v); }
      out.toto = { numbers: picked.sort(function (a, b) { return a - b; }), classes: cls, subset: subset.length };
    }
    return out;
  }

  /* ================= 3. PERSISTENT HOMOLOGY (Qimen) ================= */

  // Each palace as a point: Lo Shu position plus one-hot elements of heaven stem, earth stem, star and door.
  var POS = { 4:[0,0], 9:[0,1], 2:[0,2], 3:[1,0], 5:[1,1], 7:[1,2], 8:[2,0], 1:[2,1], 6:[2,2] };
  var EI = { wood: 0, fire: 1, earth: 2, metal: 3, water: 4 };
  function cloud(chart) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
      var pa = chart.palacesByNumber[n] || {}, v = [POS[n][0], POS[n][1]];
      [pa.heavenStem && pa.heavenStem.element, pa.earthStem && pa.earthStem.element,
       pa.starElement || (pa.star && pa.star.element), pa.gateElement || (pa.door && pa.door.element)]
        .forEach(function (el) { for (var e = 0; e < 5; e++) v.push(EI[el] === e ? 0.6 : 0); });
      return { n: n, v: v, pa: pa };
    });
  }

  /**
   * H₀ persistence of the Vietoris–Rips filtration: every point is born at 0; edges are added
   * in order of length, and when two components merge the smaller one dies (elder rule). A
   * palace's bar is the death time of the component it rooted; long bars are the structure
   * that survives across scale.
   */
  function h0(points) {
    var n = points.length, parent = [], size = [], death = [];
    for (var i = 0; i < n; i++) { parent.push(i); size.push(1); death.push(Infinity); }
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    var E = [];
    for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) {
      var s = 0; for (var k = 0; k < points[a].v.length; k++) s += Math.pow(points[a].v[k] - points[b].v[k], 2);
      E.push({ a: a, b: b, d: Math.sqrt(s) });
    }
    E.sort(function (x, y) { return x.d - y.d || x.a - y.a || x.b - y.b; });
    E.forEach(function (e) {
      var ra = find(e.a), rb = find(e.b); if (ra === rb) return;
      var young = size[ra] < size[rb] || (size[ra] === size[rb] && ra > rb) ? ra : rb, old = young === ra ? rb : ra;
      death[young] = e.d; parent[young] = old; size[old] += size[young];
    });
    return points.map(function (p, i) { return { n: p.n, bar: death[i] }; });
  }

  function tdaFeatures(dt, game) {
    var p = drawPillars(dt, game);
    var hour = S.qimen(p);
    var Q = global.QPQimen, day = null;
    try { day = Q.chartFor('day', dt).chart; } catch (e) { day = hour; }
    var bh = h0(cloud(hour)), bd = h0(cloud(day));
    var longest = function (bars) { return bars.slice(0).sort(function (x, y) { return y.bar - x.bar || x.n - y.n; })
      .slice(0, 4).map(function (b) { return b.n; }); };
    var lh = longest(bh), ld = longest(bd);
    var persistent = lh.filter(function (n) { return ld.indexOf(n) >= 0; });
    // Named features the proposal tracks: the chief (值符) and 六合, kept if they hold the same palace at both scales.
    function seat(ch, deity) { for (var n = 1; n <= 9; n++) { var pa = ch.palacesByNumber[n];
      if (pa && pa.spirit === deity) return n; } return null; }
    ['值符', '六合'].forEach(function (dn) { var a = seat(hour, dn), b = seat(day, dn);
      if (a && a === b && persistent.indexOf(a) < 0) persistent.push(a); });
    if (!persistent.length) persistent = lh.slice(0, 2);
    return { persistent: persistent, hourBars: bh, dayBars: bd, longestHour: lh, longestDay: ld };
  }

  function tda(dt, user) {
    var g = games(dt, user), out = { method: 'tda', fourD: null, toto: null };
    if (g.fourD) {
      var f = tdaFeatures(dt, 'fourD'), core = f.persistent.concat(f.longestHour).filter(function (d, i, a) { return a.indexOf(d) === i; });
      var sets = [];
      for (var k = 0; k < 4; k++) { var s = '';
        for (var j = 0; j < 4; j++) s += core[mod(k + j * (k + 1), core.length)] % 10;
        sets.push(s); }
      out.fourD = { sets: sets.filter(function (s, i, a) { return a.indexOf(s) === i; }).concat(
        [pad4(Number(sets[0]) + 1111), pad4(Number(sets[0]) + 2222)]).slice(0, 4), features: f };
    }
    if (g.toto) {
      var f2 = tdaFeatures(dt, 'toto'), core2 = f2.persistent.concat(f2.longestDay, f2.longestHour)
        .filter(function (d, i, a) { return a.indexOf(d) === i; }), nums = [];
      core2.forEach(function (a) { if (nums.indexOf(a) < 0) nums.push(a); });
      core2.forEach(function (a) { core2.forEach(function (b) { var v = a * 10 + b; if (v >= 1 && v <= 49 && nums.indexOf(v) < 0) nums.push(v); }); });
      for (var x = 1; nums.length < 7; x++) if (nums.indexOf(x) < 0) nums.push(x);
      out.toto = { numbers: nums.slice(0, 7).sort(function (a, b) { return a - b; }), features: f2 };
    }
    return out;
  }

  /* ================= 4. MDP + VALUE ITERATION ================= */

  /**
   * States are digits 0–9 (4D) or last digits of TOTO numbers. Transition probabilities are
   * estimated from consecutive digits in past winning numbers — ONLY draws before the target
   * date, so the backtest never sees the answer. The reward for landing on a digit is the share
   * of its element in the draw-hour Qimen plate (the "elemental alignment"). Value iteration
   * (γ = 0.9) gives each digit's long-run value; the policy walks from the best digits.
   */
  function history(game, beforeIso, limit) {
    var D = global.QPDraws; if (!D) return [];
    var list = game === 'toto' ? D.drawsToto() : D.draws4D();
    return list.filter(function (r) { return r.date < beforeIso; }).slice(0, limit || 200);
  }

  function plateReward(dt, game) {
    var p = drawPillars(dt, game), ch = S.qimen(p), w = [0, 0, 0, 0, 0];
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) { var pa = ch.palacesByNumber[n]; if (!pa) return;
      [pa.heavenStem && pa.heavenStem.element, pa.earthStem && pa.earthStem.element,
       pa.starElement, pa.gateElement].forEach(function (el) { if (EI[el] !== undefined) w[EI[el]]++; }); });
    var t = w.reduce(function (a, b) { return a + b; }, 0) || 1;
    var r = []; for (var d = 0; d < 10; d++) r.push(w[DIGIT_ELEM[d]] / t);
    return r;
  }

  function valueIteration(P, R, gamma) {
    var V = new Array(10).fill(0), pol = new Array(10).fill(0);
    for (var it = 0; it < 200; it++) {
      var nv = new Array(10).fill(0);
      for (var s = 0; s < 10; s++) {
        var best = -Infinity, arg = 0;
        // Action a = "aim for digit a next": succeeds with the empirical P(s → a), otherwise the
        // chain moves by its own transition law.
        for (var a = 0; a < 10; a++) {
          var q = 0;
          for (var s2 = 0; s2 < 10; s2++) {
            var pr = 0.5 * (s2 === a ? 1 : 0) + 0.5 * P[s][s2];
            q += pr * (R[s2] + gamma * V[s2]);
          }
          if (q > best) { best = q; arg = a; }
        }
        nv[s] = best; pol[s] = arg;
      }
      V = nv;
    }
    return { V: V, policy: pol };
  }

  function mdp(dt, user) {
    var g = games(dt, user), out = { method: 'mdp', fourD: null, toto: null }, today = iso(dt);
    function transitions(seqs) {
      var Cn = []; for (var i = 0; i < 10; i++) Cn.push(new Array(10).fill(0.5));
      seqs.forEach(function (sq) { for (var k = 1; k < sq.length; k++) Cn[sq[k - 1]][sq[k]]++; });
      return Cn.map(function (row) { var s = row.reduce(function (a, b) { return a + b; }, 0); return row.map(function (x) { return x / s; }); });
    }
    if (g.fourD) {
      var hist = history('4d', today, 200);
      var seqs = hist.map(function (r) { return (r.first || '').split('').map(Number); }).filter(function (s) { return s.length === 4; });
      var P = transitions(seqs), R = plateReward(dt, 'fourD'), vi = valueIteration(P, R, 0.9);
      var starts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(function (a, b) { return vi.V[b] - vi.V[a] || a - b; });
      var sets = [];
      for (var k = 0; sets.length < 4 && k < 10; k++) { var s = starts[k], str = '' + s;
        for (var j = 1; j < 4; j++) { s = vi.policy[s]; str += s; }
        if (sets.indexOf(str) < 0) sets.push(str); }
      while (sets.length < 4) sets.push(pad4((Number(sets[0]) + 1234 * sets.length) % 10000));
      out.fourD = { sets: sets, trainedOn: hist.length, values: vi.V };
    }
    if (g.toto) {
      var hist2 = history('toto', today, 200);
      var seqs2 = hist2.map(function (r) { return r.numbers.slice(0).sort(function (a, b) { return a - b; }).map(function (n) { return n % 10; }); });
      var P2 = transitions(seqs2), R2 = plateReward(dt, 'toto'), vi2 = valueIteration(P2, R2, 0.9);
      // "Hot" numbers in the recent history, weighted by the value of their last digit.
      var freq = new Array(50).fill(0); hist2.slice(0, 50).forEach(function (r) { r.numbers.forEach(function (n) { if (n <= 49) freq[n]++; }); });
      var nums = []; for (var n = 1; n <= 49; n++) nums.push(n);
      nums.sort(function (a, b) { return (vi2.V[b % 10] * (1 + freq[b])) - (vi2.V[a % 10] * (1 + freq[a])) || a - b; });
      out.toto = { numbers: nums.slice(0, 7).sort(function (a, b) { return a - b; }), trainedOn: hist2.length };
    }
    return out;
  }

  /* ================= registry and evaluation ================= */

  var METHODS = [
    { id: 'chart', name: 'Chart seed (original)', system: 'Bazi + Qimen', fn: function (dt, user) { return G.numbersFor(dt, user); },
      summary: 'The app\'s existing derivation: a seed from the day pillar, lunar day and Qimen plate drives a uniform draw.' },
    { id: 'bayes', name: 'Bayesian + Monte Carlo', system: 'Bazi + Zi Wei', fn: bayes,
      summary: 'Uniform prior over digits, updated by the draw moment\'s elements, your Day Master and the day\'s 化禄 palace; 4,000 simulated tickets, most frequent kept.' },
    { id: 'crt', name: 'Residues + CRT', system: 'San Cai', fn: crtMethod,
      summary: 'Heaven (day pillar), Earth (chief star\'s palace) and Man (Day Master) as residues; the Chinese Remainder Theorem indexes the restricted subset.' },
    { id: 'tda', name: 'Persistent homology', system: 'Qimen', fn: tda,
      summary: 'Palaces as a point cloud; H₀ bars of the hour and day plates; palaces persistent across both scales supply the digits.' },
    { id: 'mdp', name: 'MDP + value iteration', system: 'Qimen + archive', fn: mdp,
      summary: 'Digit transitions learned from earlier draws only, rewarded by the draw plate\'s elements; value iteration picks the path.' }
  ];

  /**
   * Replay every method through QPDraws.ledger. With 5 methods × 2 games = 10 tests, a z beyond
   * ±2 turns up by chance about 40% of the time, so significance uses the Bonferroni threshold
   * for α = 0.05 / 10 (two-sided, |z| > 2.81).
   */
  var Z_BONF = 2.807, ALPHA_BONF = 0.005;

  // Exact two-sided binomial p-value: the probability, under chance, of a hit count at least as
  // far from expectation as the one observed. Hit counts for 4D are small (≈3 expected in 300
  // draws), where a z-score is a poor approximation.
  function binomP(k, n, p) {
    var logC = function (nn, kk) { var s = 0; for (var i = 0; i < kk; i++) s += Math.log((nn - i) / (i + 1)); return s; };
    var pmf = function (kk) { return Math.exp(logC(n, kk) + kk * Math.log(p) + (n - kk) * Math.log(1 - p)); };
    var obs = pmf(k), tot = 0;
    for (var i = 0; i <= n; i++) { var v = pmf(i); if (v <= obs * (1 + 1e-9)) tot += v; }
    return Math.min(1, tot);
  }
  function evaluate(user, limit) {
    var D = global.QPDraws, results = [];
    METHODS.forEach(function (m) {
      ['toto', '4d'].forEach(function (kind) {
        var L = D.ledger(function (dt) { return m.fn(dt, user); }, kind, limit || 300);
        if (!L || !L.checked) return;
        var z = L.stats.z, pv = binomP(L.hits, L.checked, L.stats.chanceRate);
        results.push({ method: m.id, name: m.name, system: m.system, kind: kind, checked: L.checked, hits: L.hits,
          expected: L.checked * L.stats.chanceRate,
          chance: L.stats.chanceRate, observed: L.stats.observedRate, z: z, p: pv,
          significant: pv < ALPHA_BONF, ledger: L });
      });
    });
    // Pooled across methods, per game: does the whole family do anything at all?
    var pooled = ['toto', '4d'].map(function (kind) {
      var rs = results.filter(function (r) { return r.kind === kind && r.method !== 'chart'; });
      if (!rs.length) return null;
      var n = rs.reduce(function (s, r) { return s + r.checked; }, 0), h = rs.reduce(function (s, r) { return s + r.hits; }, 0);
      var p0 = rs[0].chance, obs = h / n, se = Math.sqrt(p0 * (1 - p0) / n);
      return { kind: kind, checked: n, hits: h, chance: p0, observed: obs, z: se ? (obs - p0) / se : 0,
               p: binomP(h, n, p0), expected: n * p0 };
    }).filter(Boolean);
    return { results: results, pooled: pooled, threshold: Z_BONF, alpha: ALPHA_BONF, tests: results.length };
  }

  /* The same evaluation run one method-and-game at a time, yielding to the UI between steps so a
     phone does not freeze. onStep(done, total, label); onDone(result). */
  function evaluateAsync(user, limit, onStep, onDone) {
    var D = global.QPDraws, jobs = [], results = [];
    METHODS.forEach(function (m) { ['toto', '4d'].forEach(function (k) { jobs.push({ m: m, k: k }); }); });
    var i = 0;
    function next() {
      if (i >= jobs.length) {
        var res = evaluate.finish(results);
        onDone(res); return;
      }
      var j = jobs[i++];
      if (onStep) onStep(i, jobs.length, j.m.name + ' · ' + (j.k === 'toto' ? 'TOTO' : '4D'));
      setTimeout(function () {
        var L = D.ledger(function (dt) { return j.m.fn(dt, user); }, j.k, limit || 300);
        if (L && L.checked) {
          var pv = binomP(L.hits, L.checked, L.stats.chanceRate);
          results.push({ method: j.m.id, name: j.m.name, system: j.m.system, kind: j.k, checked: L.checked, hits: L.hits,
            expected: L.checked * L.stats.chanceRate, chance: L.stats.chanceRate, observed: L.stats.observedRate,
            z: L.stats.z, p: pv, significant: pv < ALPHA_BONF, ledger: L });
        }
        next();
      }, 30);
    }
    next();
  }
  evaluate.finish = function (results) {
    var pooled = ['toto', '4d'].map(function (kind) {
      var rs = results.filter(function (r) { return r.kind === kind && r.method !== 'chart'; });
      if (!rs.length) return null;
      var n = rs.reduce(function (s, r) { return s + r.checked; }, 0), h = rs.reduce(function (s, r) { return s + r.hits; }, 0);
      var p0 = rs[0].chance, obs = h / n, se = Math.sqrt(p0 * (1 - p0) / n);
      return { kind: kind, checked: n, hits: h, chance: p0, observed: obs, z: se ? (obs - p0) / se : 0,
               p: binomP(h, n, p0), expected: n * p0 };
    }).filter(Boolean);
    return { results: results, pooled: pooled, threshold: Z_BONF, alpha: ALPHA_BONF, tests: results.length };
  };

  /**
   * Out-of-sample replication: replay one method on older draws it was not scored on (skipping
   * the `skip` most recent), in the same game format — for TOTO only the current 6-from-49 era,
   * since the chance baseline assumes 49 numbers. A real edge repeats; a lucky streak regresses.
   */
  function replicate(user, methodId, kind, skip, count) {
    var D = global.QPDraws, m = METHODS.filter(function (x) { return x.id === methodId; })[0];
    if (!m) return null;
    var list = kind === 'toto' ? D.drawsToto() : D.draws4D();
    if (kind === 'toto') {
      var eras = D.detectEras(), cur = eras.filter(function (e) { return e.pool === 49; })[0];
      list = list.filter(function (r) { return (!cur || r.date >= cur.from) && Math.max.apply(null, r.numbers) <= 49; });
    }
    var hold = list.slice(skip, skip + (count || 900)), checked = 0, hits = 0;
    hold.forEach(function (r) {
      var pr = r.date.split('-').map(Number), out;
      try { out = m.fn({ y: pr[0], m: pr[1], d: pr[2] }, user); } catch (e) { return; }
      if (!out) return;
      if (kind === 'toto' && out.toto) {
        checked++; if (out.toto.numbers.filter(function (n) { return r.numbers.indexOf(n) >= 0; }).length >= 3) hits++;
      } else if (kind === '4d' && out.fourD) {
        checked++; if (out.fourD.sets.some(function (s) { return r.prizes.indexOf(s) >= 0; })) hits++;
      }
    });
    var chance = kind === 'toto' ? (function () {
      var Cn = function (n, k) { var r = 1; for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }, s = 0;
      for (var mm = 3; mm <= 6; mm++) s += Cn(6, mm) * Cn(43, 7 - mm) / Cn(49, 7); return s; })()
      : 1 - Math.pow(1 - 23 / 10000, 4);
    var obs = checked ? hits / checked : 0, se = checked ? Math.sqrt(chance * (1 - chance) / checked) : 0;
    return { method: methodId, name: m.name, kind: kind, checked: checked, hits: hits, expected: checked * chance,
      chance: chance, observed: obs, z: se ? (obs - chance) / se : 0, p: checked ? binomP(hits, checked, chance) : 1,
      from: hold.length ? hold[hold.length - 1].date : null, to: hold.length ? hold[0].date : null };
  }

  global.QPDrawMethods = {
    replicate: replicate,
    METHODS: METHODS, evaluate: evaluate, evaluateAsync: evaluateAsync, Z_BONF: Z_BONF, binomP: binomP,
    bayes: bayes, crt: crtMethod, tda: tda, mdp: mdp,
    h0: h0, crtSolve: crt, valueIteration: valueIteration, ELEM_DIGITS: ELEM_DIGITS
  };
})(typeof window !== 'undefined' ? window : globalThis);
