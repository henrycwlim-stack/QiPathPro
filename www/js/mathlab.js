/* QiPath Pro — quantitative layer.
 *
 *   Qimen  · matrix algebra and tensor transformation of the nine-palace plate
 *   Qimen  · Markov chain over the verdict states of a question, hour by hour
 *   Bazi   · graph theory on the eight characters as a weighted network
 *   Both   · Fourier analysis and harmonic oscillators on the temporal score series
 *
 * Everything here operates on what the existing engines compute — palace contents, verdict
 * scores, pillar scores — so the mathematics describes the symbolic system rather than
 * adding claims to it. Bazi and Qimen are built from 10-, 12- and 60-unit cycles, so the
 * Fourier layer largely recovers those cycles; what it adds is which of them dominates for
 * this chart or question, and where the present sits in its phase. The Markov chain is
 * estimated from the engine's own deterministic sequence: it summarises how the reading
 * tends to move from one double-hour to the next, it does not inject randomness.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;
  var mod = function (n, m) { return ((n % m) + m) % m; };
  function r2(x) { return Math.round(x * 100) / 100; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function pad2(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function isoOf(dt) { return dt.y + '-' + pad2(dt.m) + '-' + pad2(dt.d); }

  /* ---------------- small linear-algebra kit ---------------- */

  function zeros(r, c) { var m = []; for (var i = 0; i < r; i++) { m.push([]); for (var j = 0; j < c; j++) m[i].push(0); } return m; }
  function matVec(M, v) { return M.map(function (row) { return row.reduce(function (a, x, j) { return a + x * v[j]; }, 0); }); }
  function vecMat(v, M) { var out = []; for (var j = 0; j < M[0].length; j++) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i] * M[i][j]; out.push(s); } return out; }
  function matMul(X, Y) { var out = zeros(X.length, Y[0].length);
    for (var i = 0; i < X.length; i++) for (var k = 0; k < Y.length; k++) { var x = X[i][k]; if (!x) continue;
      for (var j = 0; j < Y[0].length; j++) out[i][j] += x * Y[k][j]; } return out; }
  function dot(a, b) { return a.reduce(function (s, x, i) { return s + x * b[i]; }, 0); }
  function norm(v) { return Math.sqrt(dot(v, v)); }
  function frob(M) { return Math.sqrt(M.reduce(function (s, row) { return s + row.reduce(function (t, x) { return t + x * x; }, 0); }, 0)); }

  // Dominant eigenpair by power iteration; `deflate` removes a known eigenvector first.
  function powerIter(M, iters, deflate) {
    var n = M.length, v = []; for (var i = 0; i < n; i++) v.push(1 / Math.sqrt(n) + i * 1e-3);
    var lambda = 0;
    for (var k = 0; k < (iters || 200); k++) {
      var w = matVec(M, v);
      if (deflate) { var p = dot(w, deflate.v); w = w.map(function (x, i) { return x - p * deflate.v[i]; }); }
      var nw = norm(w); if (!nw) break;
      lambda = dot(v, w);
      v = w.map(function (x) { return x / nw; });
    }
    return { lambda: lambda, v: v };
  }

  // Gaussian elimination with partial pivoting: solve M x = b.
  function solve(M, b) {
    var n = b.length, a = M.map(function (row, i) { return row.slice(0).concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var piv = c; for (var r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
      var t = a[c]; a[c] = a[piv]; a[piv] = t;
      if (Math.abs(a[c][c]) < 1e-12) return null;
      for (var r2_ = c + 1; r2_ < n; r2_++) { var f = a[r2_][c] / a[c][c];
        for (var k = c; k <= n; k++) a[r2_][k] -= f * a[c][k]; }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) { var s = a[i][n]; for (var j = i + 1; j < n; j++) s -= a[i][j] * x[j]; x[i] = s / a[i][i]; }
    return x;
  }

  /* ================= QIMEN · MATRIX AND TENSOR ================= */

  var ELEMS = ['wood', 'fire', 'earth', 'metal', 'water'];
  var ELEM_CN = ['木', '火', '土', '金', '水'];
  var LAYERS = ['Heaven stem', 'Earth stem', 'Star', 'Door', 'Deity'];
  var LAYER_W = [1.0, 0.8, 0.8, 1.0, 0.6];
  var OUTER = [1, 8, 3, 4, 9, 2, 7, 6];                  // clockwise ring from 坎
  // Lo Shu grid coordinates for adjacency: 4 9 2 / 3 5 7 / 8 1 6
  var POS = { 4:[0,0], 9:[0,1], 2:[0,2], 3:[1,0], 5:[1,1], 7:[1,2], 8:[2,0], 1:[2,1], 6:[2,2] };
  var STAR_HOME = { '天蓬':1, '天任':8, '天冲':3, '天辅':4, '天英':9, '天芮':2, '天柱':7, '天心':6, '天禽':5 };
  var DOOR_HOME = { '休':1, '生':8, '伤':3, '杜':4, '景':9, '死':2, '惊':7, '开':6 };

  // Five-element interaction matrix M[a][b]: a generates b (+1), a controls b (−1), same (+0.5).
  var M5 = (function () { var m = zeros(5, 5);
    for (var a = 0; a < 5; a++) { m[a][a] = 0.5; m[a][(a + 1) % 5] = 1; m[a][(a + 2) % 5] = -1; } return m; })();

  function ei(name) { return ELEMS.indexOf(name); }

  /**
   * The plate as a rank-3 tensor T[palace][layer][element] (9 × 5 × 5, one-hot per layer).
   * Contracting the layer mode with the layer weights gives the palace-element matrix V (9 × 5);
   * contracting the palace mode gives the layer-element unfolding L (5 × 5).
   */
  function plateTensor(chart) {
    var nums = [1, 2, 3, 4, 5, 6, 7, 8, 9], T = [];
    nums.forEach(function (n) {
      var pa = chart.palacesByNumber[n], slab = zeros(5, 5);
      if (pa) {
        var layerEls = [pa.heavenStem && pa.heavenStem.element, pa.earthStem && pa.earthStem.element,
                        pa.starElement || (pa.star && pa.star.element), pa.gateElement || (pa.door && pa.door.element),
                        pa.spiritElement];
        layerEls.forEach(function (e, l) { var k = ei(e); if (k >= 0) slab[l][k] = 1; });
      }
      T.push(slab);
    });
    var V = T.map(function (slab, i) {
      var v = vecMat(LAYER_W, slab);
      var pe = ei(chart.palacesByNumber[nums[i]] && chart.palacesByNumber[nums[i]].element);
      if (pe >= 0) v[pe] += 0.5;                       // the palace's own element, as ground
      return v;
    });
    var L = zeros(5, 5);
    T.forEach(function (slab) { for (var l = 0; l < 5; l++) for (var k = 0; k < 5; k++) L[l][k] += slab[l][k]; });
    return { T: T, V: V, L: L, nums: nums };
  }

  function adjacency(a, b) {
    if (a === b) return 0;
    var p = POS[a], q = POS[b], dr = Math.abs(p[0] - q[0]), dc = Math.abs(p[1] - q[1]);
    return (dr + dc === 1) ? 1 : (dr === 1 && dc === 1) ? 0.5 : 0;
  }

  // Ring rotation that best maps one layer onto another: the 转盘 as a permutation matrix R^k.
  function ringRotation(chart, homeOf, getChar) {
    var best = { k: 0, hits: -1 };
    for (var k = 0; k < 8; k++) {
      var hits = 0, total = 0;
      OUTER.forEach(function (n, i) {
        var ch = getChar(chart.palacesByNumber[n]); if (!ch) return;
        var home = homeOf[ch]; if (!home || home === 5) return;
        total++;
        if (OUTER[mod(OUTER.indexOf(home) + k, 8)] === n) hits++;
      });
      if (hits > best.hits) best = { k: k, hits: hits, total: total };
    }
    return best;
  }

  /**
   * opts.favourable: element indices (core order wood..water) to contract against.
   */
  function qimenTensor(chart, opts) {
    opts = opts || {};
    var t = plateTensor(chart), V = t.V, nums = t.nums;
    // Influence matrix A = (V M Vᵀ) ⊙ W, W the Lo Shu adjacency.
    var Araw = matMul(matMul(V, M5), transpose(V));
    var A9 = zeros(9, 9), Apos = zeros(9, 9), pressure = new Array(9).fill(0), support = new Array(9).fill(0);
    for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) {
      var w = adjacency(nums[i], nums[j]);
      A9[i][j] = Araw[i][j] * w;
      if (A9[i][j] > 0) { Apos[i][j] = A9[i][j]; support[j] += A9[i][j]; }
      else pressure[j] += -A9[i][j];
    }
    // Eigenvector centrality on the symmetrised support graph (A₊ + A₊ᵀ)/2: real spectrum,
    // orthogonal eigenvectors, so deflating for λ₂ is valid. The Perron vector marks where the
    // plate's supportive energy pools; λ₁/λ₂ measures how concentrated it is. A small identity
    // shift keeps the iteration convergent on a bipartite-like grid.
    var shifted = Apos.map(function (row, i) { return row.map(function (x, j) {
      return (x + Apos[j][i]) / 2 + (i === j ? 0.1 : 0); }); });
    var e1 = powerIter(shifted, 400);
    var e2 = powerIter(shifted, 400, e1);
    var cent = e1.v.map(function (x) { return Math.abs(x); });
    var cs = cent.reduce(function (a, b) { return a + b; }, 0) || 1;
    cent = cent.map(function (x) { return x / cs; });

    var fav = opts.favourable || [], unf = opts.unfavourable || [];
    // Map core element order (木火土金水) — same as ELEMS here.
    var f = [0, 0, 0, 0, 0];
    fav.forEach(function (e) { f[e] = 1; }); unf.forEach(function (e) { f[e] = -1; });
    var palaces = nums.map(function (n, i) {
      var pa = chart.palacesByNumber[n];
      return { num: n, name: pa ? pa.name : '', dir: pa ? pa.dir : '',
        vector: V[i].map(r2), centrality: r2(cent[i] * 100), support: r2(support[i]),
        pressure: r2(pressure[i]), net: r2(support[i] - pressure[i]),
        personal: norm(V[i]) ? r2(dot(V[i], f) / norm(V[i])) : 0 };
    });
    var balance = [0, 0, 0, 0, 0]; V.forEach(function (v) { v.forEach(function (x, k) { balance[k] += x; }); });
    var bt = balance.reduce(function (a, b) { return a + b; }, 0) || 1;

    var starRot = ringRotation(chart, STAR_HOME, function (p) { return p && p.starCn; });
    var doorRot = ringRotation(chart, DOOR_HOME, function (p) { return p && p.gate && p.gate.charAt(0); });

    var rankC = palaces.filter(function (p) { return p.num !== 5; }).slice(0).sort(function (a, b) { return b.centrality - a.centrality; });
    var rankP = palaces.filter(function (p) { return p.num !== 5; }).slice(0).sort(function (a, b) { return b.personal - a.personal || b.net - a.net; });
    return {
      palaces: palaces, layerElement: t.L, layers: LAYERS, elementsCn: ELEM_CN,
      balance: balance.map(function (x) { return r1(x / bt * 100); }),
      lambda1: r2(e1.lambda - 0.1), lambda2: r2(e2.lambda - 0.1),
      // λ₂ of a symmetric matrix may be negative; concentration is λ₁ over |λ₂|.
      dominance: Math.abs(e2.lambda - 0.1) > 1e-6 ? r2((e1.lambda - 0.1) / Math.abs(e2.lambda - 0.1)) : null,
      conflict: r2(frob(A9.map(function (row) { return row.map(function (x) { return x < 0 ? x : 0; }); }))),
      harmony: r2(frob(Apos)),
      hub: rankC[0], personalBest: rankP[0], personalWorst: rankP[rankP.length - 1],
      starRotation: starRot, doorRotation: doorRot
    };
  }
  function transpose(M) { return M[0].map(function (_, j) { return M.map(function (row) { return row[j]; }); }); }
  function transposeM(M) { return transpose(M); }

  /* ================= QIMEN · MARKOV CHAIN ================= */

  var STATES = ['Favourable', 'Workable', 'Guarded', 'Unfavourable'];
  function stateOf(score) { return score >= 5 ? 0 : score >= 1 ? 1 : score >= -3 ? 2 : 3; }

  function stepFrom(dt, hours) {
    var jd = A.localToJD(dt.y, dt.m, dt.d, dt.hour, dt.min === undefined ? 30 : dt.min) + hours / 24;
    var g = A.jdToLocal(jd); if (g.hour >= 24) { g.hour = 23; g.min = 30; }
    return g;
  }

  /** The question's score at the cast hour and each of the next n−1 double-hours. */
  function qimenSeries(dt, scenarioId, question, opts, n) {
    var Q = global.QPQimen, out = [];
    for (var i = 0; i < (n || 120); i++) {
      var w = stepFrom(dt, i * 2), r = Q.forecast(w, scenarioId, question, opts);
      out.push({ t: i, when: w, date: isoOf(w), range: r.hourRange, score: r.score, state: stateOf(r.score),
                 pillar: r.pillars.hour.cn });
    }
    return out;
  }

  /**
   * Estimate the 4-state transition matrix from the sequence (Laplace smoothing α = 0.5),
   * then derive the stationary distribution, n-step forecasts from the present state,
   * expected first-passage time to Favourable, mean sojourn per state and the entropy rate.
   */
  function markov(series) {
    var k = 4, alpha = 0.5, N = zeros(k, k);
    for (var t = 1; t < series.length; t++) N[series[t - 1].state][series[t].state] += 1;
    var P = N.map(function (row) { var s = row.reduce(function (a, b) { return a + b; }, 0) + alpha * k;
      return row.map(function (x) { return (x + alpha) / s; }); });
    var pi = [0.25, 0.25, 0.25, 0.25];
    for (var it = 0; it < 500; it++) pi = vecMat(pi, P);
    var cur = series[0].state, e = [0, 0, 0, 0]; e[cur] = 1;
    var horizons = [1, 3, 6, 12], steps = {}, v = e.slice(0), Pn = e.slice(0);
    for (var n = 1; n <= 12; n++) { Pn = vecMat(Pn, P); if (horizons.indexOf(n) >= 0) steps[n] = Pn.map(function (x) { return r1(x * 100); }); }
    // Hitting time to state 0: h_i = 1 + Σ_{j≠0} P_ij h_j for i ≠ 0.
    var Mh = [[1 - P[1][1], -P[1][2], -P[1][3]], [-P[2][1], 1 - P[2][2], -P[2][3]], [-P[3][1], -P[3][2], 1 - P[3][3]]];
    var h = solve(Mh, [1, 1, 1]);
    var hit = [0].concat(h || [null, null, null]);
    // From the present state: if already Favourable, the expected return time 1/π₀.
    var expectedToFav = cur === 0 ? (pi[0] ? 1 / pi[0] : null) : hit[cur];
    var sojourn = P.map(function (row, i) { return r1(1 / Math.max(1e-6, 1 - row[i])); });
    var H = 0; for (var i = 0; i < k; i++) for (var j = 0; j < k; j++) if (P[i][j] > 0) H -= pi[i] * P[i][j] * Math.log(P[i][j]) / Math.LN2;
    var firstActual = null;
    for (var t2 = 1; t2 < series.length; t2++) if (series[t2].state === 0) { firstActual = series[t2]; break; }
    var occupancy = [0, 0, 0, 0]; series.forEach(function (s) { occupancy[s.state]++; });
    return {
      states: STATES, counts: N, P: P.map(function (row) { return row.map(r2); }),
      stationary: pi.map(function (x) { return r1(x * 100); }),
      occupancy: occupancy.map(function (x) { return r1(x / series.length * 100); }),
      current: cur, steps: steps,
      expectedToFavourable: expectedToFav === null ? null : r1(expectedToFav),
      expectedHours: expectedToFav === null ? null : r1(expectedToFav * 2),
      hitting: hit.map(function (x) { return x === null ? null : r1(x); }),
      sojourn: sojourn, entropy: r2(H), maxEntropy: 2,
      firstActualFavourable: firstActual, transitions: series.length - 1
    };
  }

  /* ================= FOURIER · HARMONIC OSCILLATORS ================= */

  /**
   * DFT of a real series (mean removed). Returns the strongest oscillators by power with
   * amplitude, phase and period, the share of variance each carries (Parseval), and a
   * reconstruction from the top K that can be evaluated at any t, including beyond the window.
   */
  function fourier(values, K) {
    var N = values.length, mean = values.reduce(function (a, b) { return a + b; }, 0) / N;
    // Remove the least-squares linear trend first. Without this a slow drift across the window
    // (luck pillars rising decade by decade, say) shows up as a spurious full-window "cycle".
    var tm = (N - 1) / 2, sxy = 0, sxx = 0;
    values.forEach(function (v, t) { sxy += (t - tm) * (v - mean); sxx += (t - tm) * (t - tm); });
    var slope = sxx ? sxy / sxx : 0;
    var x = values.map(function (v, t) { return v - mean - slope * (t - tm); });
    var comps = [], total = 0;
    // k = 1 (period N) is the window's own length — what remains of the trend, not a cycle.
    for (var k = 2; k <= Math.floor(N / 2); k++) {
      var re = 0, im = 0;
      for (var t = 0; t < N; t++) { var a = 2 * Math.PI * k * t / N; re += x[t] * Math.cos(a); im -= x[t] * Math.sin(a); }
      var nyq = (N % 2 === 0 && k === N / 2);
      var amp = (nyq ? 1 : 2) * Math.sqrt(re * re + im * im) / N;
      var power = (nyq ? 1 : 2) * (re * re + im * im) / (N * N);
      total += power;
      comps.push({ k: k, period: N / k, amp: amp, phase: Math.atan2(im, re), power: power });
    }
    comps.sort(function (a, b) { return b.power - a.power; });
    // A cycle that falls between bins leaks into its neighbour; keep one per neighbourhood.
    var top = [];
    for (var ci = 0; ci < comps.length && top.length < (K || 4); ci++) {
      var cc = comps[ci];
      if (top.some(function (q) { return Math.abs(q.k - cc.k) <= 1; })) continue;
      top.push(cc);
    }
    top.forEach(function (c) { c.share = total ? c.power / total : 0; });
    function recon(t) {
      return mean + slope * (t - tm) +
        top.reduce(function (s, c) { return s + c.amp * Math.cos(2 * Math.PI * c.k * t / N + c.phase); }, 0);
    }
    var explained = top.reduce(function (s, c) { return s + c.share; }, 0);
    return { N: N, mean: mean, slope: slope, top: top, explained: explained, recon: recon, variance: total };
  }

  // Next local maximum / minimum of the reconstruction after t0, scanning `span` steps.
  function nextExtrema(recon, t0, span, step) {
    step = step || 1;
    var peak = null, trough = null, prev = recon(t0), dir = recon(t0 + step) - prev;
    for (var t = t0 + step; t <= t0 + span; t += step) {
      var v = recon(t), nd = recon(t + step) - v;
      if (!peak && dir > 0 && nd <= 0) peak = { t: t, value: v };
      if (!trough && dir < 0 && nd >= 0) trough = { t: t, value: v };
      if (peak && trough) break;
      dir = nd;
    }
    return { peak: peak, trough: trough };
  }

  function phaseWord(c, tNow, N) {
    var ang = mod(2 * Math.PI * c.k * tNow / N + c.phase, 2 * Math.PI);
    var deg = ang * 180 / Math.PI;
    return { deg: Math.round(deg),
      word: deg < 45 || deg >= 315 ? 'at its crest' : deg < 135 ? 'past the crest, descending'
          : deg < 225 ? 'in its trough' : 'past the trough, rising' };
  }

  /** Bazi: 120 years from birth (two sexagenary cycles), annual 0.618 + luck pillar 0.382. */
  function baziHarmonics(user, opts) {
    opts = opts || {};
    var F = global.QPFib, inv = 0.6180339887;
    var birthY = user.birth.y, thisY = opts.year || new Date().getFullYear();
    var values = [], years = [];
    var l = user.luck;
    for (var i = 0; i < 120; i++) {
      var y = birthY + i, yp = C.stemBranch(mod(y - 1984, 60));
      var age = i, lp = null;
      if (age >= l.startAge) lp = l.pillars[Math.min(l.pillars.length - 1, Math.floor((age - l.startAge) / 10))];
      var s = inv * F.scorePillar(yp, user).score + (1 - inv) * (lp ? F.scorePillar(lp.pillar, user).score : 0);
      values.push(s); years.push(y);
    }
    var fr = fourier(values, 4), tNow = thisY - birthY;
    var ex = nextExtrema(fr.recon, tNow, 30, 1);
    return {
      unit: 'year', fr: fr, values: values, years: years, tNow: tNow, origin: birthY, trend: r2(fr.slope * 10),
      oscillators: fr.top.map(function (c) {
        var ph = phaseWord(c, tNow, fr.N);
        return { period: r1(c.period), amp: r2(c.amp), share: r1(c.share * 100), phaseDeg: ph.deg, phase: ph.word,
          label: cycleName(c.period, 'year') };
      }),
      explained: r1(fr.explained * 100),
      nextPeak: ex.peak ? { year: birthY + ex.peak.t, value: r2(ex.peak.value) } : null,
      nextTrough: ex.trough ? { year: birthY + ex.trough.t, value: r2(ex.trough.value) } : null
    };
  }

  /** Qimen: the question's double-hour series, typically the 120 used by the Markov chain. */
  function qimenHarmonics(series) {
    var values = series.map(function (s) { return s.score; });
    var fr = fourier(values, 4);
    var ex = nextExtrema(fr.recon, 0, 24, 1);
    var at = function (t) { return series[Math.min(series.length - 1, Math.round(t))]; };
    return {
      unit: 'double-hour', fr: fr, values: values, series: series, tNow: 0, trend: r2(fr.slope * 12),
      oscillators: fr.top.map(function (c) {
        var ph = phaseWord(c, 0, fr.N);
        return { period: r1(c.period), periodHours: r1(c.period * 2), amp: r2(c.amp), share: r1(c.share * 100),
          phaseDeg: ph.deg, phase: ph.word, label: cycleName(c.period, 'double-hour') };
      }),
      explained: r1(fr.explained * 100),
      nextPeak: ex.peak ? { t: ex.peak.t, when: at(ex.peak.t), value: r2(ex.peak.value) } : null,
      nextTrough: ex.trough ? { t: ex.trough.t, when: at(ex.trough.t), value: r2(ex.trough.value) } : null
    };
  }

  function cycleName(T, unit) {
    var near = function (x) { return Math.abs(T - x) / x < 0.06; };
    if (unit === 'year') {
      if (near(60)) return 'sexagenary cycle (60)';
      if (near(12)) return 'branch / zodiac cycle (12)';
      if (near(10)) return 'stem cycle and luck-pillar decade (10)';
      if (near(30)) return 'half sexagenary (30)';
      if (near(20)) return 'third of the sexagenary (20)';
      if (near(6)) return 'clash half-cycle (6)';
      if (near(5)) return 'stem-pair cycle (5)';
      if (near(4)) return 'three-harmony spacing (4)';
      if (near(15)) return 'quarter sexagenary (15)';
      if (near(24)) return 'double branch cycle (24)';
      return Math.round(T * 10) / 10 + '-year cycle';
    }
    if (near(12)) return 'daily cycle (12 double-hours = 1 day)';
    if (near(60)) return 'five-day 元 (60 double-hours)';
    if (near(6)) return 'half-day (6 double-hours)';
    if (near(120)) return 'ten-day span (120)';
    if (near(30)) return 'two-and-a-half days (30)';
    if (near(24)) return 'two-day cycle (24)';
    if (near(4)) return 'eight-hour cycle (4)';
    if (near(20)) return 'stem-day cycle (20 double-hours)';
    return r1(T) + ' double-hours (' + r1(T * 2) + 'h)';
  }

  /* ================= BAZI · GRAPH THEORY ================= */

  var NODE_LABEL = ['Year stem', 'Month stem', 'Day stem', 'Hour stem',
                    'Year branch', 'Month branch', 'Day branch', 'Hour branch'];
  var HARM6 = { 0:7, 7:0, 1:6, 6:1, 2:5, 5:2, 3:4, 4:3, 8:11, 11:8, 9:10, 10:9 };    // 六害
  var LIUHE = { 0:1, 1:0, 2:11, 11:2, 3:10, 10:3, 4:9, 9:4, 5:8, 8:5, 6:7, 7:6 };    // 六合
  var PUNISH = [[2,5],[5,8],[8,2],[1,10],[10,7],[7,1],[0,3],[3,0]];                    // 刑 (pairs)
  var SELF_PUNISH = [4, 6, 9, 11];                                                    // 自刑

  // Proximity on the 2 × 4 grid: same pillar or adjacent in a row is close, distance weakens.
  function proximity(a, b) {
    var ra = a < 4 ? 0 : 1, ca = a % 4, rb = b < 4 ? 0 : 1, cb = b % 4;
    var dc = Math.abs(ca - cb);
    if (ra !== rb && dc === 0) return 1;            // stem over its own branch
    if (ra === rb && dc === 1) return 1;            // neighbours in the row
    if (ra !== rb && dc === 1) return 0.6;          // diagonal neighbours
    if (dc === 2) return 0.5;
    return 0.25;                                    // remote (隔位)
  }

  function baziGraph(p, user) {
    var pil = [p.year, p.month, p.day, p.hour];
    var nodes = [];
    pil.forEach(function (q, i) { nodes.push({ id: i, kind: 'stem', ch: C.STEMS[q.stem], idx: q.stem, elem: C.STEM_ELEM[q.stem], label: NODE_LABEL[i] }); });
    pil.forEach(function (q, i) { nodes.push({ id: 4 + i, kind: 'branch', ch: C.BRANCHES[q.branch], idx: q.branch, elem: C.BRANCH_ELEM[q.branch], label: NODE_LABEL[4 + i] }); });
    var n = 8, edges = [];
    var TAG = ['Y', 'M', 'D', 'H', 'Y', 'M', 'D', 'H'];
    function pos(a, b) { return ' (' + TAG[a] + '–' + TAG[b] + ')'; }
    function add(a, b, type, w, directed, note) { edges.push({ a: a, b: b, type: type, w: r2(w), directed: directed, note: note }); }

    for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) {
      if (a === b) continue;
      var ea = nodes[a].elem, eb = nodes[b].elem, px = proximity(a, b);
      if ((ea + 1) % 5 === eb) add(a, b, 'generates', px, true, C.ELEM_EN[ea] + ' feeds ' + C.ELEM_EN[eb]);
      if ((ea + 2) % 5 === eb) add(a, b, 'controls', px, true, C.ELEM_EN[ea] + ' controls ' + C.ELEM_EN[eb]);
      if (a < b && ea === eb) add(a, b, 'peer', px * 0.5, false, 'same element');
    }
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
      var si = nodes[i].idx, sj = nodes[j].idx;
      if (mod(si - sj, 10) === 5) add(i, j, 'combines', 1.5 * proximity(i, j), false, '天干五合 ' + nodes[i].ch + nodes[j].ch + pos(i, j));
      if (Math.abs(si - sj) === 6) add(i, j, 'clashes', 1.5 * proximity(i, j), false, '天干相冲 ' + nodes[i].ch + nodes[j].ch + pos(i, j));
      var bi = nodes[4 + i].idx, bj = nodes[4 + j].idx, pb = proximity(4 + i, 4 + j);
      if (LIUHE[bi] === bj) add(4 + i, 4 + j, 'combines', 1.5 * pb, false, '六合 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
      if (C.THREE_HARMONY[bi] && C.THREE_HARMONY[bi].indexOf(bj) >= 0 && bi !== bj)
        add(4 + i, 4 + j, 'combines', 1.0 * pb, false, '三合 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
      if (mod(bi - bj, 12) === 6) add(4 + i, 4 + j, 'clashes', 2 * pb, false, '六冲 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
      if (HARM6[bi] === bj) add(4 + i, 4 + j, 'harms', 1 * pb, false, '六害 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
      if (PUNISH.some(function (pp) { return pp[0] === bi && pp[1] === bj || pp[0] === bj && pp[1] === bi; }))
        add(4 + i, 4 + j, 'punishes', 1 * pb, false, '刑 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
      if (bi === bj && SELF_PUNISH.indexOf(bi) >= 0) add(4 + i, 4 + j, 'punishes', 0.8 * pb, false, '自刑 ' + nodes[4 + i].ch + nodes[4 + j].ch + pos(4 + i, 4 + j));
    }

    // PageRank on the generating flow — where qi accumulates when it moves along 相生.
    var W = zeros(n, n);
    edges.forEach(function (e) { if (e.type === 'generates') W[e.a][e.b] += e.w;
      if (e.type === 'combines' || e.type === 'peer') { W[e.a][e.b] += e.w * 0.5; W[e.b][e.a] += e.w * 0.5; } });
    var d = 0.85, pr = new Array(n).fill(1 / n);
    for (var it = 0; it < 100; it++) {
      var nx = new Array(n).fill((1 - d) / n);
      for (var u = 0; u < n; u++) {
        var out = W[u].reduce(function (s, x) { return s + x; }, 0);
        if (!out) { for (var v = 0; v < n; v++) nx[v] += d * pr[u] / n; continue; }
        for (var v2 = 0; v2 < n; v2++) if (W[u][v2]) nx[v2] += d * pr[u] * W[u][v2] / out;
      }
      pr = nx;
    }

    // Betweenness (Brandes, Dijkstra) on the undirected relation graph, distance = 1 / weight.
    var adj = zeros(n, n);
    edges.forEach(function (e) { var w = e.w; if (w <= 0) return;
      var dd = 1 / w; if (!adj[e.a][e.b] || dd < adj[e.a][e.b]) { adj[e.a][e.b] = dd; adj[e.b][e.a] = dd; } });
    var bc = new Array(n).fill(0);
    for (var s = 0; s < n; s++) {
      var dist = new Array(n).fill(Infinity), sigma = new Array(n).fill(0), preds = [], order = [], done = new Array(n).fill(false);
      for (var q0 = 0; q0 < n; q0++) preds.push([]);
      dist[s] = 0; sigma[s] = 1;
      for (var step = 0; step < n; step++) {
        var uu = -1; for (var c2 = 0; c2 < n; c2++) if (!done[c2] && (uu < 0 || dist[c2] < dist[uu])) uu = c2;
        if (uu < 0 || dist[uu] === Infinity) break;
        done[uu] = true; order.push(uu);
        for (var vv = 0; vv < n; vv++) { if (!adj[uu][vv]) continue;
          var nd = dist[uu] + adj[uu][vv];
          if (nd < dist[vv] - 1e-9) { dist[vv] = nd; sigma[vv] = sigma[uu]; preds[vv] = [uu]; }
          else if (Math.abs(nd - dist[vv]) < 1e-9) { sigma[vv] += sigma[uu]; preds[vv].push(uu); } }
      }
      var delta = new Array(n).fill(0);
      for (var oi = order.length - 1; oi >= 0; oi--) { var wv = order[oi];
        preds[wv].forEach(function (pv) { delta[pv] += sigma[pv] / sigma[wv] * (1 + delta[wv]); });
        if (wv !== s) bc[wv] += delta[wv]; }
    }
    var norm_ = (n - 1) * (n - 2); bc = bc.map(function (x) { return x / norm_; });   // undirected, counted twice

    // Harmony components (union–find on 相生 + combinations + peers).
    var parent = []; for (var z = 0; z < n; z++) parent.push(z);
    function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
    // Close contact only: 相生 between touching characters, any combination, touching peers.
    edges.forEach(function (e) {
      if ((e.type === 'generates' && e.w >= 1) || e.type === 'combines' || (e.type === 'peer' && e.w >= 0.5))
        parent[find(e.a)] = find(e.b); });
    var groups = {}; for (var g = 0; g < n; g++) (groups[find(g)] = groups[find(g)] || []).push(g);
    var components = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (x, y) { return y.length - x.length; });

    // Articulation points of the full relation graph.
    // Articulation points of the close-contact graph (any relation between touching characters,
    // plus every combination and conflict): the characters whose removal splits the chart.
    var close = zeros(n, n);
    edges.forEach(function (e) {
      if (e.w >= 1 || ['combines', 'clashes', 'harms', 'punishes'].indexOf(e.type) >= 0) { close[e.a][e.b] = 1; close[e.b][e.a] = 1; } });
    function compCount(skip) {
      var seen = new Array(n).fill(false), cnt = 0;
      for (var st = 0; st < n; st++) { if (st === skip || seen[st]) continue; cnt++;
        var stack = [st]; seen[st] = true;
        while (stack.length) { var x = stack.pop(); for (var y = 0; y < n; y++) if (y !== skip && !seen[y] && close[x][y]) { seen[y] = true; stack.push(y); } } }
      return cnt;
    }
    var base = compCount(-1), cut = [];
    for (var cv = 0; cv < n; cv++) if (compCount(cv) > base) cut.push(cv);

    // Day Master's net flow: generated into it and peers, minus what controls it and what it feeds.
    var DM = 2, inGen = 0, inCtl = 0, outGen = 0, outCtl = 0, peers = 0;
    edges.forEach(function (e) {
      if (e.type === 'generates' && e.b === DM) inGen += e.w;
      if (e.type === 'controls' && e.b === DM) inCtl += e.w;
      if (e.type === 'generates' && e.a === DM) outGen += e.w;
      if (e.type === 'controls' && e.a === DM) outCtl += e.w;
      if (e.type === 'peer' && (e.a === DM || e.b === DM)) peers += e.w;
    });

    // Element-level flow matrix (5 × 5) aggregated over the generating and controlling edges.
    var EF = zeros(5, 5);
    edges.forEach(function (e) { if (e.type === 'generates') EF[nodes[e.a].elem][nodes[e.b].elem] += e.w;
      if (e.type === 'controls') EF[nodes[e.a].elem][nodes[e.b].elem] -= e.w; });

    var possible = n * (n - 1) / 2, undirectedPairs = {};
    edges.forEach(function (e) { undirectedPairs[Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b)] = 1; });
    var conflicts = edges.filter(function (e) { return ['clashes', 'harms', 'punishes'].indexOf(e.type) >= 0; });
    var combos = edges.filter(function (e) { return e.type === 'combines'; });

    nodes.forEach(function (nd2, i) {
      nd2.pagerank = r1(pr[i] * 100); nd2.betweenness = r2(bc[i]);
      nd2.degree = edges.filter(function (e) { return e.a === i || e.b === i; }).length;
      nd2.strength = r2(edges.filter(function (e) { return e.a === i || e.b === i; }).reduce(function (s, e) {
        return s + (['clashes', 'harms', 'punishes', 'controls'].indexOf(e.type) >= 0 ? -e.w : e.w); }, 0));
    });
    var byPR = nodes.slice(0).sort(function (x, y) { return y.pagerank - x.pagerank; });
    var byBC = nodes.slice(0).sort(function (x, y) { return y.betweenness - x.betweenness; });
    return {
      nodes: nodes, edges: edges, conflicts: conflicts, combos: combos,
      sink: byPR[0], source: byPR[byPR.length - 1], bridge: byBC[0],
      components: components.map(function (cp) { return cp.map(function (i) { return nodes[i].ch + ' (' + nodes[i].label + ')'; }); }),
      componentCount: components.length, cutVertices: cut.map(function (i) { return nodes[i]; }),
      // Every pair of characters has some element relation, so density counts only the
      // structural ones: combinations, clashes, harms and punishments.
      density: r2(Object.keys(edges.filter(function (e) { return ['combines','clashes','harms','punishes'].indexOf(e.type) >= 0; })
        .reduce(function (o, e) { o[Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b)] = 1; return o; }, {})).length / possible),
      dayMaster: { inflow: r2(inGen + peers), pressure: r2(inCtl), drain: r2(outGen + outCtl),
                   net: r2(inGen + peers - inCtl - outGen - outCtl), pagerank: nodes[DM].pagerank },
      elementFlow: EF.map(function (row) { return row.map(r2); })
    };
  }

  /* ================= SHANNON ENTROPY ================= */

  // H(p) = −Σ p log₂ p, and the same normalised by log₂ n so 0 = fully determined, 1 = uniform.
  function entropy(weights) {
    var w = weights.filter(function (x) { return x > 0; }), s = w.reduce(function (a, b) { return a + b; }, 0);
    if (!s || weights.length < 2) return { H: 0, norm: 0, max: 0 };
    var H = w.reduce(function (a, x) { var p = x / s; return a - p * Math.log(p) / Math.LN2; }, 0);
    var max = Math.log(weights.length) / Math.LN2;
    return { H: r2(H), norm: r2(H / max), max: r2(max) };
  }
  /* Reference quantiles (0th, 5th … 100th percentile) of the mean normalised entropy, from
     tools/calibrate-entropy.js: 3000 Bazi charts and 3000 Zi Wei boards (births 1940–2010) and 400 Qimen casts
     (2020–2030, random scenario and method), seed 20261018. Raw entropy of five near-equal
     element shares is close to 1 for most charts, so only the rank says clear or muddy. */
  var ENTROPY_REF = {
    bazi:  [0.44,0.55,0.58,0.62,0.73,0.81,0.84,0.86,0.87,0.88,0.89,0.9,0.91,0.92,0.93,0.94,0.94,0.96,0.97,0.98,1],
    zwds:  [0.79,0.85,0.87,0.87,0.88,0.89,0.89,0.9,0.9,0.9,0.91,0.91,0.91,0.91,0.92,0.92,0.92,0.93,0.93,0.94,0.97],
    qimen: [0.75,0.85,0.87,0.89,0.89,0.9,0.91,0.91,0.92,0.92,0.93,0.93,0.93,0.94,0.94,0.95,0.95,0.95,0.96,0.97,0.99]
  };
  function percentile(x, q) {
    if (x <= q[0]) return 0; if (x >= q[q.length - 1]) return 100;
    for (var i = 1; i < q.length; i++) if (x <= q[i]) {
      var lo = q[i - 1], hi = q[i], f = hi > lo ? (x - lo) / (hi - lo) : 0.5;
      return Math.round((i - 1 + f) * 5); }
    return 100;
  }
  function clarityWord(pct) {
    return pct < 33 ? 'clear — clearer than most, one direction dominates'
         : pct < 67 ? 'typical — a lead with ordinary cross-currents'
         : 'diffuse — muddier than most, forces evenly spread and outcomes volatile';
  }

  function qimenEntropy(tz, mk) {
    var outer = tz.palaces.filter(function (p) { return p.num !== 5; });
    var parts = [
      { name: 'Plate elements', e: entropy(tz.balance), of: '5 elements' },
      { name: 'Supportive flow', e: entropy(outer.map(function (p) { return Math.max(0, p.net); })), of: '8 palaces' },
      { name: 'Verdicts, 10 days', e: entropy(mk.occupancy), of: '4 states' }
    ];
    var mean = parts.reduce(function (a, p) { return a + p.e.norm; }, 0) / parts.length;
    var pct = percentile(mean, ENTROPY_REF.qimen);
    return { parts: parts, uncertainty: r2(mean), clarity: r2(1 - mean), percentile: pct, word: clarityWord(pct) };
  }

  function baziEntropy(deep, graph) {
    var conflicts = graph.conflicts.length, combos = graph.combos.length;
    var parts = [
      { name: 'Element shares', e: entropy(deep.shares), of: '5 elements' },
      { name: 'Qi distribution', e: entropy(graph.nodes.map(function (n) { return n.pagerank; })), of: '8 characters' }
    ];
    // With no combinations and no conflicts the mix is undefined, not perfectly clear — leave it out.
    if (combos + conflicts) parts.push({ name: 'Combos vs conflicts', e: entropy([combos, conflicts]), of: '2 kinds' });
    var mean = parts.reduce(function (a, p) { return a + p.e.norm; }, 0) / parts.length;
    var pct = percentile(mean, ENTROPY_REF.bazi);
    return { parts: parts, uncertainty: r2(mean), clarity: r2(1 - mean), percentile: pct, word: clarityWord(pct),
             combos: combos, conflicts: conflicts };
  }

  /* ================= FUZZY LOGIC: SEASONAL ELEMENT STRENGTH ================= */

  /* Crisp Bazi gives each month one ruling element and switches at the 節. Here each element
     has a trapezoidal membership over solar longitude λ: Wood 315°–27°, Fire 45°–117°,
     Metal 135°–207°, Water 225°–297°, and Earth the four 18° 土用 windows before each 立. Every
     boundary is softened over FUZZ degrees (≈ days), and the memberships form a partition of
     unity — they sum to 1 at every λ. 旺相休囚死 then become degrees, not labels. */
  var FUZZ = 8;
  var SEASON_WIN = [ [[315, 387]], [[45, 117]], [[27, 45], [117, 135], [207, 225], [297, 315]],
                     [[135, 207]], [[225, 297]] ];       // 木 火 土 金 水, degrees (387 = 27 + 360)
  function trap(L, a, b) {
    var h = FUZZ / 2, up, down;
    var x = L; if (x < a - 180) x += 360; if (x > b + 180) x -= 360;
    up = x <= a - h ? 0 : x >= a + h ? 1 : (x - (a - h)) / FUZZ;
    down = x >= b + h ? 0 : x <= b - h ? 1 : ((b + h) - x) / FUZZ;
    return Math.max(0, Math.min(up, down));
  }
  function seasonMembership(L) {
    var mu = SEASON_WIN.map(function (wins) {
      return Math.min(1, wins.reduce(function (s, w) { return s + trap(L, w[0], w[1]); }, 0)); });
    var tot = mu.reduce(function (a, b) { return a + b; }, 0) || 1;
    return mu.map(function (x) { return x / tot; });
  }
  var STATE_VAL = [1, 0.75, 0.5, 0.25, 0];      // 旺 相 休 囚 死
  var STATE_CN = ['旺', '相', '休', '囚', '死'];
  // Degrees of 旺相休囚死 for element e, given the seasonal memberships.
  function fuzzyStates(e, mu) {
    return [mu[e], mu[(e + 4) % 5], mu[(e + 1) % 5], mu[(e + 2) % 5], mu[(e + 3) % 5]];
  }
  function fuzzyStrength(e, mu) {
    return fuzzyStates(e, mu).reduce(function (s, d, i) { return s + d * STATE_VAL[i]; }, 0);
  }
  // The crisp equivalent from the month branch alone.
  function crispStrength(e, monthBranch) {
    var se = C.BRANCH_ELEM[monthBranch];
    var st = e === se ? 0 : (se + 1) % 5 === e ? 1 : (e + 1) % 5 === se ? 2 : (e + 2) % 5 === se ? 3 : 4;
    return STATE_VAL[st];
  }

  function fuzzyAt(jd, monthBranch) {
    var L = A.solarLongitude(jd), mu = seasonMembership(L);
    var s = [0, 1, 2, 3, 4].map(function (e) { return fuzzyStrength(e, mu); });
    // Effective interactions: a generates b with force s_a; a controls b with force s_a·(1 − s_b)
    // (a strong controller over a weak element bites hardest) — product t-norm.
    var gen = [], ctl = [];
    for (var a = 0; a < 5; a++) {
      gen.push({ from: a, to: (a + 1) % 5, force: r2(s[a]) });
      ctl.push({ from: a, to: (a + 2) % 5, force: r2(s[a] * (1 - s[(a + 2) % 5])) });
    }
    return { longitude: r1(L), membership: mu.map(r2), strength: s.map(r2),
      crisp: monthBranch === undefined ? null : [0, 1, 2, 3, 4].map(function (e) { return crispStrength(e, monthBranch); }),
      generate: gen.sort(function (x, y) { return y.force - x.force; }),
      control: ctl.sort(function (x, y) { return y.force - x.force; }) };
  }

  /** Day Master: fuzzy against crisp at birth, and the year's continuous curve. */
  function baziFuzzy(user, opts) {
    opts = opts || {};
    var b = user.birth, dm = C.STEM_ELEM[user.pillars.day.stem];
    var jdB = A.localToJD(b.y, b.m, b.d, b.hour, b.min, b.tz);
    var atBirth = fuzzyAt(jdB, user.pillars.month.branch);
    var y = opts.year || new Date().getFullYear(), jd0 = A.localToJD(y, 1, 1, 12, 0);
    var xs = [], fz = [], cr = [], notes = [];
    for (var d = 0; d < 366; d += 4) {
      var jd = jd0 + d, g = A.jdToLocal(jd), p = C.fourPillars(g.y, g.m, g.d, 12, 0);
      var mu = seasonMembership(A.solarLongitude(jd));
      xs.push(isoOf(g).slice(5)); fz.push(fuzzyStrength(dm, mu)); cr.push(crispStrength(dm, p.month.branch));
      notes.push(p.month.cn + ' month');
    }
    var statesB = fuzzyStates(dm, atBirth.membership);
    // Distance from birth to the nearest season boundary, in degrees of solar longitude ≈ days.
    var Lb = atBirth.longitude, bounds = [315, 27, 45, 117, 135, 207, 225, 297];
    var nearest = bounds.reduce(function (best, x) { var dd = Math.abs(((Lb - x + 540) % 360) - 180);
      return dd < best ? dd : best; }, 999);
    return { dm: dm, dmCn: C.ELEM[dm], dmEn: C.ELEM_EN[dm], birth: atBirth,
      fuzzy: r2(atBirth.strength[dm]), crisp: atBirth.crisp[dm],
      states: statesB.map(function (x, i) { return { cn: STATE_CN[i], degree: r2(x) }; }),
      boundaryDays: r1(nearest), inTransition: nearest < FUZZ / 2,
      curve: { xs: xs, fuzzy: fz, crisp: cr, notes: notes, year: y } };
  }

  /* ================= CHAOS & NON-LINEAR DYNAMICS ================= */

  /* What chaos theory can honestly measure here. The engines are discrete maps of time, so the
     butterfly effect shows up at boundaries: a few minutes across a double-hour, a solar term or
     the midnight day change re-cast the whole plate or pillar. We measure (1) that sensitivity
     directly, (2) a largest-Lyapunov estimate from the score series (Rosenstein's method on a
     delay embedding) and (3) bifurcations — single-step jumps of two or more verdict bands —
     and regime shifts, by binary segmentation of the series' mean. */

  function lyapunov(values, m, tau, kmax) {
    m = m || 3; tau = tau || 1; kmax = kmax || 6;
    var N = values.length - (m - 1) * tau, emb = [];
    for (var i = 0; i < N; i++) { var v = []; for (var j = 0; j < m; j++) v.push(values[i + j * tau]); emb.push(v); }
    var sd = Math.sqrt(values.reduce(function (s, x) { return s + x * x; }, 0) / values.length -
      Math.pow(values.reduce(function (s, x) { return s + x; }, 0) / values.length, 2)) || 1;
    var eps = 1e-3 * sd, sums = new Array(kmax + 1).fill(0), cnt = new Array(kmax + 1).fill(0);
    var dist = function (a, b) { var s = 0; for (var q = 0; q < m; q++) s += (a[q] - b[q]) * (a[q] - b[q]); return Math.sqrt(s); };
    for (var a = 0; a < N - kmax; a++) {
      var best = -1, bd = Infinity;
      for (var b = 0; b < N - kmax; b++) { if (Math.abs(a - b) <= 6) continue;
        var d0 = dist(emb[a], emb[b]); if (d0 < bd) { bd = d0; best = b; } }
      if (best < 0) continue;
      for (var k = 0; k <= kmax; k++) { var dk = dist(emb[a + k], emb[best + k]);
        sums[k] += Math.log(dk + eps); cnt[k]++; }
    }
    var ys = sums.map(function (s, k) { return cnt[k] ? s / cnt[k] : 0; });
    // Slope of ⟨ln d(k)⟩ over the first steps, per step.
    var n = Math.min(4, kmax) + 1, sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (var k2 = 0; k2 < n; k2++) { sx += k2; sy += ys[k2]; sxy += k2 * ys[k2]; sxx += k2 * k2; }
    var lam = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { lambda: r2(lam), word: lam > 0.15 ? 'sensitive — nearby states diverge quickly, small timing shifts matter'
      : lam > -0.05 ? 'neutral — quasi-periodic, neither converging nor diverging'
      : 'convergent — nearby states stay close, timing is forgiving' };
  }

  // Binary segmentation of the mean: up to `maxCp` change points, each cutting SSE by a clear margin.
  function regimes(values, maxCp, minLen, minShare) {
    maxCp = maxCp || 3; minLen = minLen || 6; minShare = minShare || 0.05;
    var segs = [[0, values.length]], cps = [];
    function sse(a, b) { var n = b - a, m = 0, s = 0; for (var i = a; i < b; i++) m += values[i]; m /= n;
      for (var j = a; j < b; j++) s += (values[j] - m) * (values[j] - m); return { s: s, m: m }; }
    var total = sse(0, values.length).s || 1;
    for (var it = 0; it < maxCp; it++) {
      var best = null;
      segs.forEach(function (sg, si) {
        var whole = sse(sg[0], sg[1]).s;
        for (var c = sg[0] + minLen; c <= sg[1] - minLen; c++) {
          var gain = whole - sse(sg[0], c).s - sse(c, sg[1]).s;
          if (!best || gain > best.gain) best = { gain: gain, c: c, si: si };
        }
      });
      if (!best || best.gain / total < minShare) break;   // too small a share of variance: not a regime
      var sg2 = segs[best.si];
      segs.splice(best.si, 1, [sg2[0], best.c], [best.c, sg2[1]]);
      cps.push({ t: best.c, share: r1(best.gain / total * 100) });
    }
    segs.sort(function (x, y) { return x[0] - y[0]; });
    return { cps: cps.sort(function (x, y) { return x.t - y.t; }),
      segments: segs.map(function (sg) { return { from: sg[0], to: sg[1] - 1, mean: r2(sse(sg[0], sg[1]).m) }; }) };
  }

  function qimenChaos(series, dt) {
    var vals = series.map(function (s) { return s.score; });
    var steps = []; for (var i = 1; i < vals.length; i++) steps.push(Math.abs(vals[i] - vals[i - 1]));
    var typical = steps.reduce(function (a, b) { return a + b; }, 0) / steps.length || 1;
    var local = Math.abs(vals[1] - vals[0]);
    var bif = [];
    for (var t = 1; t < series.length && bif.length < 6; t++)
      if (Math.abs(series[t].state - series[t - 1].state) >= 2) bif.push({ t: t, when: series[t],
        from: STATES[series[t - 1].state], to: STATES[series[t].state] });
    var rg = regimes(vals, 3, 6);
    var jd = A.localToJD(dt.y, dt.m, dt.d, dt.hour, dt.min === undefined ? 30 : dt.min);
    var nt = A.nextTerm(dt.y, dt.m, dt.d, dt.hour, dt.min === undefined ? 30 : dt.min);
    var hoursToTerm = nt ? (nt.jd - jd) * 24 : null;
    return {
      nextFlip: { score: vals[1], state: STATES[series[1].state], when: series[1] },
      localJump: r1(local), typicalJump: r2(typical), sensitivity: r2(local / typical),
      hoursToTerm: hoursToTerm === null ? null : r1(hoursToTerm), termName: nt ? nt.name : '',
      lyapunov: lyapunov(vals, 3, 1, 6),
      bifurcations: bif,
      regimes: rg.segments.map(function (sg) { return { from: series[sg.from], to: series[sg.to], mean: sg.mean,
        length: sg.to - sg.from + 1 }; }),
      changePoints: rg.cps.map(function (c) { return { when: series[c.t], share: c.share }; })
    };
  }

  /** Bazi: what a small error in the recorded birth time would change. */
  function baziChaos(user) {
    var b = user.birth, base = user.pillars;
    var baseDeep = user.deep || global.QPBazi.analyse(base, user.gender);
    function chartAt(mins) {
      var jd = A.localToJD(b.y, b.m, b.d, b.hour, b.min, b.tz) + mins / 1440, g = A.jdToLocal(jd + ((b.tz === undefined ? A.getTimezone() : b.tz) - A.getTimezone()) / 24);
      if (g.hour >= 24) { g.hour = 23; g.min = 59; }
      var p = C.birthPillars(b, mins);
      return { p: p, g: g };
    }
    var tests = [-120, -60, -30, -10, 10, 30, 60, 120].map(function (mins) {
      var c = chartAt(mins), p = c.p;
      var flips = ['year', 'month', 'day', 'hour'].filter(function (k) { return p[k].i !== base[k].i; });
      var d = flips.length ? global.QPBazi.analyse(p, user.gender) : baseDeep;
      return { mins: mins, flips: flips, pillars: [p.year.cn, p.month.cn, p.day.cn, p.hour.cn].join(' '),
        strongFlip: d.strong !== baseDeep.strong,
        favFlip: d.favourable.slice(0).sort().join() !== baseDeep.favourable.slice(0).sort().join(),
        favourableEn: d.favourableEn };
    });
    // Minutes to the hour-branch boundaries (odd hours) and to the nearest 節 (month change).
    var minsOfDay = b.hour * 60 + b.min;
    var sinceB = (minsOfDay - 60 + 1440) % 120, toNext = 120 - sinceB;
    var jdB = A.localToJD(b.y, b.m, b.d, b.hour, b.min, b.tz);
    // Month pillars change only on 節 (even term index): the last one before birth and the next after.
    var pool = A.termsForYear(b.y - 1).concat(A.termsForYear(b.y), A.termsForYear(b.y + 1))
      .filter(function (t) { return t.index % 2 === 0; }).sort(function (x, y) { return x.jd - y.jd; });
    var before = null, after = null;
    pool.forEach(function (t) { if (t.jd <= jdB) before = t; else if (!after) after = t; });
    var jieDist = [before, after].filter(Boolean)
      .map(function (t) { return { name: t.name, hours: r1((t.jd - jdB) * 24) }; });
    var dayEdge = Math.min(minsOfDay, 1440 - minsOfDay);
    var structural = tests.filter(function (t) { return t.strongFlip || t.favFlip; });
    var within30 = tests.filter(function (t) { return Math.abs(t.mins) <= 30 && t.flips.length; });
    return {
      tests: tests, minutesSinceHourBoundary: sinceB, minutesToHourBoundary: toNext,
      jie: jieDist, minutesToDayEdge: dayEdge,
      luckShiftPerHourDays: r1(365.2422 / 72),
      fragile: within30.length > 0,
      structuralFlip: structural.length ? structural[0] : null,
      word: within30.length ? 'fragile — a 30-minute error in the birth time changes a pillar'
        : structural.length ? 'robust to small errors, but a larger one changes the strength verdict or favourable elements'
        : 'robust — two hours either way leaves the strength verdict and favourable elements unchanged'
    };
  }

  /* ================= GAME THEORY: HOST AGAINST GUEST ================= */

  /* Qimen reads competition as 主 (host, the earth plate, the side that holds) against 客 (guest,
     the heaven plate, the side that moves first). The payoff model, from your side, zero-sum:

                   they Attack       they Hold        they Maneuver
       Attack      a                 a + t − d        a + ½
       Hold        a − t + d         0                −m′
       Maneuver    a − ½             m                m − m′

     a  your seat against theirs: element relation of the two palaces plus their net support
     t  guest-over-host tilt: heaven-plate strength (stem, star) minus earth-plate (stem, door)
     d  ½, the host's rest advantage (主逸客劳)
     ½  striking a side in transit (半渡而击) is worth half a band either way
     m, m′  what you and they gain by moving to a better-aligned palace
     The table is antisymmetric under swapping sides (a → −a), as a zero-sum game must be.
     Mixed equilibrium by fictitious play, which converges for two-player zero-sum games. */
  var MOVES = ['Attack', 'Hold', 'Maneuver'];
  function relOf(fromEl, toEl) {
    var f = ei(fromEl), t = ei(toEl); if (f < 0 || t < 0) return 0;
    if (f === t) return 0;
    if ((f + 1) % 5 === t) return 'gen'; if ((f + 2) % 5 === t) return 'ctl';
    if ((t + 1) % 5 === f) return 'genBy'; return 'ctlBy';
  }

  function fictitious(U, iters) {
    var n = U.length, m = U[0].length, rc = new Array(n).fill(0), cc = new Array(m).fill(0);
    var rowSum = new Array(n).fill(0), colSum = new Array(m).fill(0);
    var r = 0, c = 0;
    for (var it = 0; it < (iters || 20000); it++) {
      rc[r]++; cc[c]++;
      for (var i = 0; i < n; i++) rowSum[i] += U[i][c];
      for (var j = 0; j < m; j++) colSum[j] += U[r][j];
      r = rowSum.indexOf(Math.max.apply(null, rowSum));
      c = colSum.indexOf(Math.min.apply(null, colSum));
    }
    var N = rc.reduce(function (a, b) { return a + b; }, 0);
    var p = rc.map(function (x) { return x / N; }), q = cc.map(function (x) { return x / N; });
    var v = 0; for (var i2 = 0; i2 < n; i2++) for (var j2 = 0; j2 < m; j2++) v += p[i2] * q[j2] * U[i2][j2];
    return { p: p, q: q, value: v };
  }

  function qimenGame(r, tz) {
    var ch = r.chart, self = r.poles && r.poles.self, them = r.poles && r.poles.matter;
    if (!self || !them) return null;
    var outer = OUTER.map(function (n) { return ch.palacesByNumber[n]; }).filter(Boolean);
    var rk = function (o) { return o && o.rank ? o.rank : 3; };
    var guest = outer.reduce(function (s, p) { return s + rk(p.heavenStemStrength) + rk(p.starStrength); }, 0) / (2 * outer.length);
    var host = outer.reduce(function (s, p) { return s + rk(p.earthStemStrength) + rk(p.gateStrength); }, 0) / (2 * outer.length);
    var t = (guest - host) / 2, d = 0.5;
    var tzOf = function (n) { return tz.palaces.filter(function (p) { return p.num === n; })[0]; };
    var ps = tzOf(self.num), pt = tzOf(them.num);
    var rel = relOf(them.element, self.element);          // their palace toward yours
    var relV = { gen: 1, ctl: -1.5, genBy: -0.5, ctlBy: 1.5 }[rel] || 0;
    var relText = { gen: 'their palace feeds yours', ctl: 'their palace controls yours',
      genBy: 'your palace feeds theirs', ctlBy: 'your palace controls theirs' }[rel] || 'same element — parity';
    var a = relV + ((ps ? ps.net : 0) - (pt ? pt.net : 0)) / 10 - (self.isEmpty ? 1.5 : 0) + (them.isEmpty ? 1.5 : 0);
    var outerTz = tz.palaces.filter(function (p) { return p.num !== 5; });
    var m = Math.max(0, tz.personalBest.personal - (ps ? ps.personal : 0));
    var mo = Math.max(0, (Math.max.apply(null, outerTz.map(function (p) { return p.net; })) - (pt ? pt.net : 0)) / 10);
    var g = buildGame(a, t, m, mo);
    g.guest = r2(guest); g.host = r2(host); g.relText = relText;
    g.selfPalace = self.num + ' ' + self.dir; g.themPalace = them.num + ' ' + them.dir;
    g.selfLabel = r.poles.selfLabel; g.themLabel = r.poles.matterLabel;
    g.initiative = t > 0.15 ? 'the guest plate is stronger — the side that moves first is favoured (利客)'
      : t < -0.15 ? 'the host plate is stronger — the side that holds is favoured (利主)'
      : 'host and guest are evenly balanced';
    return g;
  }

  /** The shared 3 × 3 zero-sum game (see the table above) solved for its equilibrium. */
  function buildGame(a, t, m, mo) {
    var d = 0.5;
    var U = [[a, a + t - d, a + 0.5], [a - t + d, 0, -mo], [a - 0.5, m, m - mo]];
    U = U.map(function (row) { return row.map(r2); });
    // Pure saddle point: an entry that is the minimum of its row and the maximum of its column.
    var saddle = null;
    for (var i = 0; i < 3 && !saddle; i++) for (var j = 0; j < 3; j++) {
      var rowMin = Math.min.apply(null, U[i]), colMax = Math.max(U[0][j], U[1][j], U[2][j]);
      if (U[i][j] === rowMin && U[i][j] === colMax) { saddle = { you: MOVES[i], them: MOVES[j], value: U[i][j] }; break; }
    }
    var eq = fictitious(U, 60000);
    var best = eq.p.indexOf(Math.max.apply(null, eq.p));
    var bestResp = [0, 1, 2].map(function (j) { var col = [U[0][j], U[1][j], U[2][j]];
      return { them: MOVES[j], you: MOVES[col.indexOf(Math.max.apply(null, col))], payoff: Math.max.apply(null, col) }; });
    var maximin = U.map(function (row) { return Math.min.apply(null, row); });
    var safe = maximin.indexOf(Math.max.apply(null, maximin));
    return {
      moves: MOVES, U: U, a: r2(a), t: r2(t), d: d, m: r2(m), mo: r2(mo),
      saddle: saddle, mixed: { you: eq.p.map(function (x) { return r1(x * 100); }), them: eq.q.map(function (x) { return r1(x * 100); }) },
      value: r2(eq.value), stance: MOVES[best], safe: MOVES[safe], safeValue: r2(maximin[safe]),
      bestResponse: bestResp
    };
  }

  /* ================= ZI WEI DOU SHU ================= */

  var INV = 0.6180339887;

  function zwdsDecadeAt(dec, age) {
    return dec.filter(function (d) { return age >= d.from && age <= d.to; })[0] || null;
  }

  /** Annual series over nominal ages 1..n: flow year 0.618 + decade 0.382, as in the timing layer. */
  function zwdsSeries(user, n) {
    var z = user.zwds, ns = user.pillars.year.stem, by = user.pillars.solarYear;
    var dec = S.zwdsDecades(z, ns, user.gender).decades.map(function (d) {
      d.score = S.zwdsPeriod(z, d.branch, d.stemIdx, ns).score; return d; });
    var out = [];
    for (var age = 1; age <= (n || 120); age++) {
      var y = by + age - 1, yp = C.stemBranch(mod(y - 1984, 60));
      var an = S.zwdsPeriod(z, yp.branch, yp.stem, ns).score, dd = zwdsDecadeAt(dec, age);
      out.push({ age: age, year: y, annual: an, decade: dd ? dd.score : 0,
        score: INV * an + (1 - INV) * (dd ? dd.score : 0) });
    }
    return { series: out, decades: dec };
  }

  function zwdsEntropy(user) {
    var z = user.zwds, w = [], grades = {}, ji = 0, sha = 0;
    z.palaces.forEach(function (p) {
      var t = 0;
      p.stars.forEach(function (s, i) { t += S.starEffect(s, p.branch); var g = p.bright && p.bright[i]; if (g) grades[g] = (grades[g] || 0) + 1; });
      (p.minors || []).forEach(function (s, i) {
        var e = S.starEffect(s, p.branch); t += 0.75 * e;
        var g = p.minorBright && p.minorBright[i]; if (g) grades[g] = (grades[g] || 0) + 1;
        var tone = S.MINOR_TONE[s] || 0; if (tone > 0) ji += tone; else sha -= tone;
      });
      w.push(Math.abs(t));
    });
    var gradeCounts = ['庙', '旺', '得', '利', '平', '不', '陷'].map(function (g) { return grades[g] || 0; });
    var parts = [
      { name: 'Weight across palaces', e: entropy(w), of: '12 palaces' },
      { name: 'Brightness mix', e: entropy(gradeCounts), of: '7 grades' },
      { name: '吉 against 煞', e: entropy([ji, sha]), of: '2 kinds' }
    ];
    var mean = parts.reduce(function (a, p) { return a + p.e.norm; }, 0) / parts.length;
    var pct = percentile(mean, ENTROPY_REF.zwds);
    return { parts: parts, uncertainty: r2(mean), clarity: r2(1 - mean), percentile: pct, word: clarityWord(pct) };
  }

  /* Fuzzy decade handover. Crisply, a 大限 switches on a birthday. Here each decade's membership
     ramps over two years centred on its boundaries (trapezoids that sum to 1), so the outgoing and
     incoming decades share the handover years. */
  function zwdsFuzzy(user, zs) {
    var dec = zs.decades, soft = 2, ages = [], crisp = [], fuzzy = [], notes = [];
    function mu(d, age) {
      var a = d.from - 0.5, b = d.to + 0.5, h = soft / 2;
      var up = age <= a - h ? 0 : age >= a + h ? 1 : (age - (a - h)) / soft;
      var dn = age >= b + h ? 0 : age <= b - h ? 1 : ((b + h) - age) / soft;
      return Math.max(0, Math.min(up, dn));
    }
    var first = dec[0].from;
    for (var age = 1; age <= 100; age++) {
      var c = zwdsDecadeAt(dec, age);
      var ws = dec.map(function (d) { return mu(d, age); }), tot = ws.reduce(function (s, x) { return s + x; }, 0);
      var f = tot ? dec.reduce(function (s, d, i) { return s + ws[i] * d.score; }, 0) / tot : 0;
      ages.push('age ' + age); crisp.push(c ? c.score : 0); fuzzy.push(age < first - 1 ? 0 : f);
      notes.push(String(zs.series[age - 1].year) + (c ? ' · ' + c.palace.name + ' 大限' : ''));
    }
    var now = new Date().getFullYear() - user.pillars.solarYear + 1;
    var cur = zwdsDecadeAt(dec, now), next = cur ? dec[cur.i + 1] : null;
    var toNext = cur ? cur.to + 0.5 - now : null;
    return { xs: ages, crisp: crisp, fuzzy: fuzzy, notes: notes, ageNow: now,
      handover: toNext !== null && (toNext <= 1 || now - (cur.from - 0.5) <= 1),
      current: cur ? { palace: cur.palace.name, score: cur.score } : null,
      next: next ? { palace: next.palace.name, score: next.score, inYears: r1(toNext) } : null,
      fuzzyNow: r2(fuzzy[Math.min(99, Math.max(0, now - 1))]), crispNow: cur ? cur.score : 0 };
  }

  /** Birth-time sensitivity: the hour picks the Life palace, so Zi Wei is far more fragile than Bazi. */
  function zwdsChaos(user, zs) {
    var b = user.birth, z0 = user.zwds;
    function boardAt(mins) {
      var jd = A.localToJD(b.y, b.m, b.d, b.hour, b.min, b.tz) + mins / 1440, g = A.jdToLocal(jd + ((b.tz === undefined ? A.getTimezone() : b.tz) - A.getTimezone()) / 24);
      if (g.hour >= 24) { g.hour = 23; g.min = 59; }
      var p = C.birthPillars(b, mins), lun = A.toLunar(g.y, g.m, g.d);
      return S.zwds(lun, p.hourBranch, p.year.stem, p.year.branch);
    }
    var tests = [-120, -60, -30, -10, 10, 30, 60, 120].map(function (mins) {
      var z = boardAt(mins), ch = [];
      if (z.ming !== z0.ming) ch.push('Life palace ' + C.BRANCHES[z0.ming] + '→' + C.BRANCHES[z.ming]);
      if (z.ju !== z0.ju) ch.push('局 ' + z0.juCn + '→' + z.juCn);
      if (z.ziwei !== z0.ziwei) ch.push('紫微 moves');
      if (z.shen !== z0.shen) ch.push('Body palace moves');
      return { mins: mins, changes: ch, ming: C.BRANCHES[z.ming], stars: z.mingStars.join('、') || 'empty' };
    });
    var minsOfDay = b.hour * 60 + b.min, sinceB = (minsOfDay - 60 + 1440) % 120;
    var vals = zs.series.map(function (x) { return x.score; });
    // Chapters are segmented on a 5-year centred moving average: year-to-year noise would
    // otherwise swamp the decade-scale shifts that make a chapter.
    var smooth = vals.map(function (_, i) { var s = 0, n = 0;
      for (var k = i - 2; k <= i + 2; k++) if (k >= 0 && k < vals.length) { s += vals[k]; n++; } return s / n; });
    var rg = regimes(smooth.slice(0, 100), 6, 8, 0.03);
    var within30 = tests.filter(function (t) { return Math.abs(t.mins) <= 30 && t.changes.length; });
    var within120 = tests.filter(function (t) { return t.changes.length; });
    return { tests: tests, minutesToHourBoundary: 120 - sinceB, minutesSinceHourBoundary: sinceB,
      minutesToMidnight: 1440 - minsOfDay,
      lyapunov: lyapunov(vals, 3, 1, 6),
      chapters: rg.segments.map(function (sg) { var a = zs.series[sg.from], e = zs.series[sg.to];
        return { from: a.age, to: e.age, fromYear: a.year, toYear: e.year, mean: sg.mean }; }),
      fragile: within30.length > 0,
      word: within30.length ? 'fragile — a 30-minute error moves the Life palace or the frame; confirm the birth time'
        : within120.length ? 'sensitive — a one- to two-hour error re-draws the board'
        : 'robust — two hours either way keeps the same board' };
  }

  /* Game for the current flow year: you (the flow-year Life palace field) against others (the
     flow-year 交友 palace — friends, rivals, subordinates). Initiative comes from the year's 化权
     (authority) and 化忌 (obstruction): 化权 in your field hands you the move, in theirs hands it
     to them. Maneuver is valued by each side's 迁移 (movement) palace. Same payoff table as Qimen. */
  function zwdsGame(user, year) {
    var z = user.zwds, ns = user.pillars.year.stem, y = year || new Date().getFullYear();
    var yp = C.stemBranch(mod(y - 1984, 60)), fb = yp.branch, friends = mod(fb - 7, 12);
    var you = S.zwdsPeriod(z, fb, yp.stem, ns), them = S.zwdsPeriod(z, friends, yp.stem, ns);
    var moveYou = S.zwdsPeriod(z, mod(fb + 6, 12), yp.stem, ns), moveThem = S.zwdsPeriod(z, mod(friends + 6, 12), yp.stem, ns);
    var inF = function (pr, star) { var h = pr.hua.filter(function (x) { return x.source === 'period' && x.star === star; })[0];
      return !!(h && h.inField); };
    var quan = SIHUA_STAR(yp.stem, 1), jiS = SIHUA_STAR(yp.stem, 3), t = 0, why = [];
    if (inF(you, quan)) { t += 0.75; why.push(quan + '化权 in your field'); }
    if (inF(them, quan)) { t -= 0.75; why.push(quan + '化权 in theirs'); }
    if (you.palace && you.palace.stars.concat(you.palace.minors || []).indexOf(jiS) >= 0) { t -= 0.5; why.push(jiS + '化忌 in your palace'); }
    if (them.palace && them.palace.stars.concat(them.palace.minors || []).indexOf(jiS) >= 0) { t += 0.5; why.push(jiS + '化忌 in theirs'); }
    var a = Math.max(-3, Math.min(3, (you.score - them.score) / 3));
    var m = Math.max(0, (moveYou.score - you.score) / 3), mo = Math.max(0, (moveThem.score - them.score) / 3);
    var g = buildGame(a, t, m, mo);
    g.year = y; g.selfLabel = '流年命宫 in natal ' + you.palace.name; g.themLabel = '流年交友 in natal ' + them.palace.name;
    g.selfPalace = C.BRANCHES[fb]; g.themPalace = C.BRANCHES[friends];
    g.relText = 'your field ' + you.score + ' against theirs ' + them.score;
    g.initiative = (why.join('; ') || 'neither side holds the year’s 化权') +
      (t > 0.15 ? ' — you hold the initiative' : t < -0.15 ? ' — the initiative is theirs' : ' — initiative balanced');
    return g;
  }
  function SIHUA_STAR(stem, i) { return S.SIHUA[stem][i]; }

  /* ================= SAN CAI ================= */

  var OPP = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

  // Entropy of the choice: how decisive the winner is among the candidates (Boltzmann, τ = 4 points),
  // and how evenly the three layers carry the chosen window.
  function sancaiEntropy(res, w) {
    var pool = (res.pool || []).slice(0, 20).map(function (p) { return p.score; });
    var top = Math.max.apply(null, pool.concat([w.composite]));
    var wts = pool.map(function (s) { return Math.exp((s - top) / 4); });
    var choice = entropy(wts);
    var layers = entropy([w.layers.heaven, w.layers.earth, w.layers.man]);
    var sorted = pool.slice(0).sort(function (a, b) { return b - a; });
    return { choice: choice, decisiveness: r2(1 - choice.norm), layers: layers,
      lead: sorted.length > 1 ? r1(sorted[0] - sorted[1]) : null, candidates: pool.length,
      word: choice.norm < 0.5 ? 'decisive — the top window clearly beats the field'
        : choice.norm < 0.8 ? 'competitive — a few windows are close; the alternatives are real options'
        : 'flat — many windows are nearly as good; choose on practicality' };
  }

  // Fuzzy AND across the three layers: San Cai's premise is that all three must align, so the
  // weakest layer should cap the result rather than be averaged away.
  function sancaiFuzzy(w, user) {
    var tr = function (x, a, b) { return x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); };
    var mu = { heaven: tr(w.layers.heaven, 40, 70), earth: tr(w.layers.earth, 40, 70), man: tr(w.layers.man, 40, 70) };
    var keys = ['heaven', 'earth', 'man'];
    var minK = keys.reduce(function (k, x) { return mu[x] < mu[k] ? x : k; }, 'heaven');
    var godel = mu[minK], product = mu.heaven * mu.earth * mu.man;
    var strong = tr(w.composite, 56, 78);
    var hh = w.hourBranch === 0 ? 23 : w.hourBranch * 2 - 1;
    var fz = fuzzyAt(A.localToJD(w.date.y, w.date.m, w.date.d, hh, 30));
    var favS = user.favourable.length ? user.favourable.reduce(function (s, e) { return s + fz.strength[e]; }, 0) / user.favourable.length : null;
    var LBL = { heaven: '天 Heaven', earth: '地 Earth', man: '人 Man' };
    return { membership: { heaven: r2(mu.heaven), earth: r2(mu.earth), man: r2(mu.man) },
      and: r2(godel), product: r2(product), strong: r2(strong), weakest: LBL[minK], weakestKey: minK,
      masked: strong - godel > 0.35, season: fz, favourableStrength: favS === null ? null : r2(favS) };
  }

  function sancaiChaos(w, user) {
    var SC = global.QPSanCai;
    var base = { y: w.date.y, m: w.date.m, d: w.date.d, hour: w.hourBranch === 0 ? 23 : w.hourBranch * 2 - 1, min: 30 };
    var vals = [], states = [], pts = [];
    for (var i = 0; i < 60; i++) {
      var g = stepFrom(base, i * 2), b = Math.floor((((g.hour + 1) % 24) + 24) % 24 / 2);
      var mn = SC.normMan(SC.manLayer({ y: g.y, m: g.m, d: g.d }, b, w.goal, user).score);
      vals.push(mn); states.push(mn >= 70 ? 0 : mn >= 55 ? 1 : mn >= 40 ? 2 : 3);
      pts.push({ date: isoOf(g), range: C.HOUR_RANGE[b] });
    }
    var bif = [];
    for (var t = 1; t < 60 && bif.length < 5; t++) if (Math.abs(states[t] - states[t - 1]) >= 2)
      bif.push({ when: pts[t], from: Math.round(vals[t - 1]), to: Math.round(vals[t]) });
    // A 節 changes the monthly flying star — the Earth layer can re-route overnight.
    var jd = A.localToJD(base.y, base.m, base.d, base.hour, 30);
    var pool = A.termsForYear(base.y - 1).concat(A.termsForYear(base.y), A.termsForYear(base.y + 1))
      .filter(function (x) { return x.index % 2 === 0; }).sort(function (x, y) { return x.jd - y.jd; });
    var near = pool.reduce(function (best, x) { return Math.abs(x.jd - jd) < Math.abs(best.jd - jd) ? x : best; }, pool[0]);
    var jieHours = r1((near.jd - jd) * 24), sectorFlip = null;
    if (Math.abs(jieHours) < 72) {
      var other = A.jdToLocal(near.jd + (jieHours > 0 ? 1 : -1));
      var e2 = SC.earthLayer({ y: other.y, m: other.m, d: other.d }, w.goal, user);
      sectorFlip = { other: isoOf(other), sector: e2.best.dir, changes: e2.best.dir !== w.sector.dir };
    }
    return { slipNext: { score: Math.round(vals[1]), drop: Math.round(vals[0] - vals[1]), when: pts[1] },
      lyapunov: lyapunov(vals, 3, 1, 6), bifurcations: bif,
      jie: { name: near.name, hours: jieHours }, sectorFlip: sectorFlip };
  }

  // In a meeting the counterpart faces you, i.e. the opposite direction: their palace is OPP[yours].
  function sancaiGame(w, user) {
    var ch = w.man.chart, self = w.face, them = ch.palacesByNumber[OPP[self.num]];
    if (!them) return null;
    var tz = qimenTensor(ch, { favourable: user.favourable, unfavourable: (user.deep || user.bazi).unfavourable });
    var g = qimenGame({ chart: ch, poles: { self: self, matter: them,
      selfLabel: 'You, facing ' + self.dir, matterLabel: 'Counterpart, facing ' + them.dir } }, tz);
    return g;
  }

  /* ================= THIRD WAVE: tensor, graph, Markov, Fourier for Zi Wei and San Cai ================= */

  var HUA_W = [3, 2, 1.5, -3];
  var HUA_CN = ['禄', '权', '科', '忌'];

  /**
   * Flying-star tensor (宫干飞化). Each palace's stem flies its four transformations to the
   * palaces holding those stars: T[src][tgt][hua] = 1. Contracting the hua mode with the weights
   * (禄 +3, 权 +2, 科 +1.5, 忌 −3) gives the 12 × 12 flow matrix F.
   */
  function zwdsFlying(user) {
    var z = user.zwds, where = {};
    z.palaces.forEach(function (p) { p.stars.concat(p.minors || []).forEach(function (s) { where[s] = p.branch; }); });
    var T = [], F = zeros(12, 12), edges = [];
    for (var a = 0; a < 12; a++) {
      var slab = zeros(12, 4), stem = C.STEMS.indexOf(z.palaces[a].stemCn);
      S.SIHUA[stem].forEach(function (star, i) {
        var b = where[star]; if (b === undefined) return;
        slab[b][i] = 1; F[a][b] += HUA_W[i];
        edges.push({ a: a, b: b, hua: i, star: star, w: HUA_W[i] });
      });
      T.push(slab);
    }
    var name = function (b) { return z.palaces[b].name; };
    var inflow = [], luIn = [], jiIn = [];
    for (var b2 = 0; b2 < 12; b2++) {
      var col = 0, lu = 0, ji = 0;
      for (var a2 = 0; a2 < 12; a2++) { col += F[a2][b2]; lu += T[a2][b2][0]; ji += T[a2][b2][3]; }
      inflow.push(r2(col)); luIn.push(lu); jiIn.push(ji);
    }
    // PageRank on the supportive flows (禄 权 科): where support accumulates.
    var W = zeros(12, 12); edges.forEach(function (e) { if (e.w > 0) W[e.a][e.b] += e.w; });
    var d = 0.85, pr = new Array(12).fill(1 / 12);
    for (var it = 0; it < 100; it++) {
      var nx = new Array(12).fill((1 - d) / 12);
      for (var u = 0; u < 12; u++) { var out = W[u].reduce(function (s, x) { return s + x; }, 0);
        if (!out) { for (var v = 0; v < 12; v++) nx[v] += d * pr[u] / 12; continue; }
        for (var v2 = 0; v2 < 12; v2++) if (W[u][v2]) nx[v2] += d * pr[u] * W[u][v2] / out; }
      pr = nx;
    }
    // Eigenvector centrality of the symmetrised supportive matrix, and its concentration.
    var Sym = zeros(12, 12); for (var i = 0; i < 12; i++) for (var j = 0; j < 12; j++) Sym[i][j] = (W[i][j] + W[j][i]) / 2 + (i === j ? 0.1 : 0);
    var e1 = powerIter(Sym, 400), e2 = powerIter(Sym, 400, e1);
    // Betweenness (Brandes, unweighted) on the undirected flow graph.
    var adj = zeros(12, 12); edges.forEach(function (e) { if (e.a !== e.b) { adj[e.a][e.b] = 1; adj[e.b][e.a] = 1; } });
    var bc = new Array(12).fill(0);
    for (var s0 = 0; s0 < 12; s0++) {
      var dist = new Array(12).fill(-1), sigma = new Array(12).fill(0), preds = [], order = [], q = [s0];
      for (var k = 0; k < 12; k++) preds.push([]);
      dist[s0] = 0; sigma[s0] = 1;
      while (q.length) { var x = q.shift(); order.push(x);
        for (var y = 0; y < 12; y++) if (adj[x][y]) {
          if (dist[y] < 0) { dist[y] = dist[x] + 1; q.push(y); }
          if (dist[y] === dist[x] + 1) { sigma[y] += sigma[x]; preds[y].push(x); } } }
      var delta = new Array(12).fill(0);
      for (var oi = order.length - 1; oi >= 0; oi--) { var wv = order[oi];
        preds[wv].forEach(function (pv) { delta[pv] += sigma[pv] / sigma[wv] * (1 + delta[wv]); });
        if (wv !== s0) bc[wv] += delta[wv]; }
    }
    bc = bc.map(function (x) { return x / (11 * 10); });
    // 自化 (self-transformation) and 互化 (mutual exchange).
    var selfHua = edges.filter(function (e) { return e.a === e.b; }).map(function (e) {
      return name(e.a) + ' 自化' + HUA_CN[e.hua] + ' (' + e.star + ')'; });
    var mutual = [];
    for (var p = 0; p < 12; p++) for (var q2 = p + 1; q2 < 12; q2++) if (F[p][q2] && F[q2][p])
      mutual.push(name(p) + ' ⇄ ' + name(q2) + ' (' + r1(F[p][q2]) + ' / ' + r1(F[q2][p]) + ')');
    // 忌转忌: follow the 忌 from the Life palace until a palace repeats.
    var chain = [], seen = {}, cur = z.ming, cycle = null;
    while (chain.length < 13) {
      if (seen[cur] !== undefined) { cycle = chain.slice(seen[cur]); break; }
      seen[cur] = chain.length; chain.push(cur);
      var je = edges.filter(function (e) { return e.a === cur && e.hua === 3; })[0];
      if (!je) break; cur = je.b;
    }
    var nodes = z.palaces.map(function (pa, b) {
      return { branch: b, name: pa.name, nameEn: pa.nameEn, inflow: inflow[b], lu: luIn[b], ji: jiIn[b],
        pagerank: r1(pr[b] * 100), centrality: r1(Math.abs(e1.v[b]) * 100), betweenness: r2(bc[b]) };
    });
    var byPR = nodes.slice(0).sort(function (a3, b3) { return b3.pagerank - a3.pagerank; });
    var byIn = nodes.slice(0).sort(function (a3, b3) { return a3.inflow - b3.inflow; });
    var byBC = nodes.slice(0).sort(function (a3, b3) { return b3.betweenness - a3.betweenness; });
    return { nodes: nodes, edges: edges, F: F.map(function (r) { return r.map(r1); }),
      lambda1: r2(e1.lambda - 0.1), lambda2: r2(e2.lambda - 0.1),
      dominance: Math.abs(e2.lambda - 0.1) > 1e-6 ? r2((e1.lambda - 0.1) / Math.abs(e2.lambda - 0.1)) : null,
      supportHub: byPR[0], jiSink: byIn[0], bridge: byBC[0], richest: byIn[byIn.length - 1],
      selfHua: selfHua, mutual: mutual,
      jiChain: chain.map(name), jiCycle: cycle ? cycle.map(name) : null };
  }

  /* Generic Markov over any series whose items carry .state; `fit` (optional) is the series the
     transition matrix is estimated from, `series` starts at the present. */
  function markovGeneric(series, fit, labels) {
    var saveStates = STATES;
    var mk = markov(fit || series);
    // Re-anchor the present-state quantities on `series`.
    if (fit) {
      var P = mk.P, cur = series[0].state, e = [0, 0, 0, 0]; e[cur] = 1;
      var steps = {}, Pn = e.slice(0);
      for (var n = 1; n <= 12; n++) { Pn = vecMat(Pn, P); if ([1, 3, 6, 12].indexOf(n) >= 0) steps[n] = Pn.map(function (x) { return r1(x * 100); }); }
      var hit = mk.hitting, pi0 = mk.stationary[0] / 100;
      mk.current = cur; mk.steps = steps;
      mk.expectedToFavourable = cur === 0 ? (pi0 ? r1(1 / pi0) : null) : hit[cur];
      mk.firstActualFavourable = null;
      for (var t = 1; t < series.length; t++) if (series[t].state === 0) { mk.firstActualFavourable = series[t]; break; }
    }
    mk.states = labels || saveStates;
    return mk;
  }

  function zwdsDynamics(user, zs) {
    var LBL = ['Flourishing', 'Supported', 'Mixed', 'Strained'];
    var st = function (x) { return x >= 3 ? 0 : x >= 1 ? 1 : x > -1 ? 2 : 3; };
    var all = zs.series.map(function (x, i) { return { t: i, age: x.age, year: x.year, date: String(x.year), range: '',
      score: x.score, state: st(x.score) }; });
    var now = new Date().getFullYear() - user.pillars.solarYear;     // index of this year's age
    var mk = markovGeneric(all.slice(Math.max(0, now)), all, LBL);
    var fr = fourier(all.map(function (x) { return x.score; }), 4);
    var ex = nextExtrema(fr.recon, now, 30, 1);
    var harm = { unit: 'year', fr: fr, values: all.map(function (x) { return x.score; }), tNow: now,
      origin: user.pillars.solarYear, ageOffset: 1, trend: r2(fr.slope * 10),
      oscillators: fr.top.map(function (c) { var ph = phaseWord(c, now, fr.N);
        var lbl = cycleName(c.period, 'year');
        if (Math.abs(c.period - 12) / 12 < 0.06) lbl = 'flow-year palace rotation (12)';
        if (Math.abs(c.period - 10) / 10 < 0.06) lbl = '四化 stem cycle and 大限 decade (10)';
        if (Math.abs(c.period - 2) / 2 < 0.06) lbl = 'yin–yang year alternation (2): the 四化 alternate with the stem';
        return { period: r1(c.period), amp: r2(c.amp), share: r1(c.share * 100), phaseDeg: ph.deg, phase: ph.word, label: lbl }; }),
      explained: r1(fr.explained * 100),
      nextPeak: ex.peak ? { year: user.pillars.solarYear + ex.peak.t, value: r2(ex.peak.value) } : null,
      nextTrough: ex.trough ? { year: user.pillars.solarYear + ex.trough.t, value: r2(ex.trough.value) } : null };
    return { markov: mk, harmonics: harm };
  }

  /* ---- San Cai ---- */

  // The goal's Man layer, normalised 0–100, for n double-hours from the window.
  function sancaiSeries(w, user, n) {
    var SC = global.QPSanCai, out = [];
    var base = { y: w.date.y, m: w.date.m, d: w.date.d, hour: w.hourBranch === 0 ? 23 : w.hourBranch * 2 - 1, min: 30 };
    for (var i = 0; i < (n || 120); i++) {
      var g = stepFrom(base, i * 2), b = Math.floor((((g.hour + 1) % 24) + 24) % 24 / 2);
      var man = SC.manLayer({ y: g.y, m: g.m, d: g.d }, b, w.goal, user), sc = Math.round(SC.normMan(man.score));
      out.push({ t: i, date: isoOf(g), range: C.HOUR_RANGE[b], pillar: man.pillars.hour.cn, score: sc,
        state: sc >= 70 ? 0 : sc >= 55 ? 1 : sc >= 40 ? 2 : 3 });
    }
    return out;
  }

  function sancaiDynamics(series) {
    var mk = markovGeneric(series, null, ['Strong', 'Workable', 'Marginal', 'Weak']);
    var h = qimenHarmonics(series);
    return { markov: mk, harmonics: h };
  }

  /**
   * Principal components of the candidate × layer matrix (Heaven, Earth, Man). The covariance
   * eigenvectors say which layer actually separates the candidates, and the correlations say
   * whether the layers agree or trade off against each other.
   */
  function sancaiPCA(res) {
    var X = (res.pool || []).filter(function (p) { return p.layers; }).map(function (p) {
      return [p.layers.heaven, p.layers.earth, p.layers.man]; });
    var n = X.length; if (n < 4) return null;
    var mu = [0, 1, 2].map(function (j) { return X.reduce(function (s, r) { return s + r[j]; }, 0) / n; });
    var Cv = zeros(3, 3);
    X.forEach(function (r) { for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) Cv[i][j] += (r[i] - mu[i]) * (r[j] - mu[j]) / (n - 1); });
    var sd = [0, 1, 2].map(function (i) { return Math.sqrt(Cv[i][i]) || 1; });
    // A layer that barely varies across the candidates (Earth within one month, typically) cannot
    // separate them; its correlations are undefined, not zero.
    var flat = [0, 1, 2].map(function (i) { return Math.sqrt(Cv[i][i]) < 2; });
    var R = Cv.map(function (row, i) { return row.map(function (c, j) {
      return (flat[i] || flat[j]) && i !== j ? null : r2(c / (sd[i] * sd[j])); }); });
    var tot = Cv[0][0] + Cv[1][1] + Cv[2][2] || 1, comps = [], defl = null, M = Cv.map(function (r) { return r.slice(0); });
    for (var k = 0; k < 3; k++) {
      var e = powerIter(M, 300);
      comps.push({ share: r1(Math.max(0, e.lambda) / tot * 100), loadings: e.v.map(r2) });
      // Deflate: M ← M − λ v vᵀ (valid, the covariance is symmetric).
      M = M.map(function (row, i) { return row.map(function (x, j) { return x - e.lambda * e.v[i] * e.v[j]; }); });
    }
    var L = ['天 Heaven', '地 Earth', '人 Man'];
    var pc1 = comps[0].loadings.map(Math.abs), drv = pc1.indexOf(Math.max.apply(null, pc1));
    var pairs = [[0, 1], [0, 2], [1, 2]].map(function (pp) { return { a: L[pp[0]], b: L[pp[1]], r: R[pp[0]][pp[1]] }; });
    var trade = pairs.filter(function (pp) { return pp.r !== null && pp.r < -0.3; });
    return { n: n, means: mu.map(r1), sd: sd.map(r1), corr: R, components: comps, labels: L,
      driver: L[drv], pairs: pairs, tradeoffs: trade,
      flat: L.filter(function (_, i) { return flat[i]; }) };
  }

  /**
   * Campaign path: candidate windows as nodes in a time-ordered DAG, an edge from i to j when j
   * falls 1–7 days after i. Dynamic programming finds the three-step path (open, follow up,
   * close) with the highest total score — the best sequence rather than the best single window.
   */
  function sancaiCampaign(res, steps) {
    steps = steps || 3;
    var C2 = (res.pool || []).filter(function (p) { return p.date; }).map(function (p) {
      var hh = p.hourBranch === 0 ? 23 : p.hourBranch * 2 - 1;
      return { p: p, jd: A.localToJD(p.date.y, p.date.m, p.date.d, hh, 30) }; })
      .sort(function (a, b) { return a.jd - b.jd; });
    var n = C2.length; if (n < steps) return null;
    var edgeOk = function (i, j) { var dd = C2[j].jd - C2[i].jd; return dd >= 1 - 1e-6 && dd <= 7 + 1e-6; };
    var best = [], prev = [];
    for (var k = 0; k < steps; k++) { best.push(new Array(n).fill(-Infinity)); prev.push(new Array(n).fill(-1)); }
    for (var j = 0; j < n; j++) best[0][j] = C2[j].p.score;
    for (var k2 = 1; k2 < steps; k2++) for (var j2 = 0; j2 < n; j2++) for (var i = 0; i < j2; i++)
      if (edgeOk(i, j2) && best[k2 - 1][i] > -Infinity && best[k2 - 1][i] + C2[j2].p.score > best[k2][j2]) {
        best[k2][j2] = best[k2 - 1][i] + C2[j2].p.score; prev[k2][j2] = i; }
    var endJ = -1, endV = -Infinity;
    for (var j3 = 0; j3 < n; j3++) if (best[steps - 1][j3] > endV) { endV = best[steps - 1][j3]; endJ = j3; }
    if (endJ < 0) return { path: null, edges: 0, nodes: n };
    var path = [], at = endJ;
    for (var k3 = steps - 1; k3 >= 0; k3--) { path.unshift(C2[at].p); at = prev[k3][at]; }
    var edgeCount = 0; for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) if (edgeOk(a, b)) edgeCount++;
    var ROLE = ['Open', 'Follow up', 'Close'];
    return { nodes: n, edges: edgeCount, total: r1(endV), mean: r1(endV / steps),
      path: path.map(function (p, i) { return { role: ROLE[i] || ('Step ' + (i + 1)), iso: p.iso, range: p.range,
        score: p.score, face: p.face, sector: p.sector }; }) };
  }

  global.QPMath = {
    zwdsFlying: zwdsFlying, zwdsDynamics: zwdsDynamics, markovGeneric: markovGeneric,
    sancaiSeries: sancaiSeries, sancaiDynamics: sancaiDynamics, sancaiPCA: sancaiPCA, sancaiCampaign: sancaiCampaign,
    zwdsSeries: zwdsSeries, zwdsEntropy: zwdsEntropy, zwdsFuzzy: zwdsFuzzy, zwdsChaos: zwdsChaos, zwdsGame: zwdsGame,
    sancaiEntropy: sancaiEntropy, sancaiFuzzy: sancaiFuzzy, sancaiChaos: sancaiChaos, sancaiGame: sancaiGame,
    buildGame: buildGame,
    // second wave
    entropy: entropy, qimenEntropy: qimenEntropy, baziEntropy: baziEntropy,
    fuzzyAt: fuzzyAt, baziFuzzy: baziFuzzy, seasonMembership: seasonMembership,
    lyapunov: lyapunov, regimes: regimes, qimenChaos: qimenChaos, baziChaos: baziChaos,
    qimenGame: qimenGame, fictitious: fictitious,
    // kit
    matMul: matMul, matVec: matVec, vecMat: vecMat, powerIter: powerIter, solve: solve, fourier: fourier,
    // Qimen
    qimenTensor: qimenTensor, plateTensor: plateTensor, qimenSeries: qimenSeries, markov: markov,
    qimenHarmonics: qimenHarmonics, STATES: STATES, M5: M5, ELEM_CN: ELEM_CN, LAYERS: LAYERS,
    // Bazi
    baziGraph: baziGraph, baziHarmonics: baziHarmonics, NODE_LABEL: NODE_LABEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
