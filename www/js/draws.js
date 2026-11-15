/* QiPath Pro — Singapore Pools draw archive.
 *
 * Two supply routes, because they have different constraints:
 *
 *   1. The community dataset on GitHub — every prize-winning 4D and TOTO number since
 *      31 May 1986. raw.githubusercontent.com sends `access-control-allow-origin: *`,
 *      so the app downloads it directly, with no proxy and no pasting.
 *
 *   2. Singapore Pools itself sends no CORS header, so no browser or WebView can read it.
 *      That is a property of their server, not something a client-side fix can work around.
 *      The bundled Python scraper (tools/sp_scraper.py) runs outside the browser, where the
 *      restriction does not apply, and writes CSV in the same schema the importer accepts.
 *
 * Honest framing, because it matters here: lottery draws are independent random events.
 * Frequency analysis describes what HAS happened; it cannot change what WILL happen.
 */
(function (global) {
  'use strict';

  var KEY_4D = 'qipath.draws.4d';
  var KEY_TOTO = 'qipath.draws.toto';
  var KEY_META = 'qipath.draws.meta';

  var GH_USER = 'foooooooooooooooooooooooooootw';
  var GH_REPO = 'Singapore-Pools-Dataset';
  var GH_BASE = 'https://raw.githubusercontent.com/' + GH_USER + '/' + GH_REPO + '/main/';
  var REPO_URL = 'https://github.com/' + GH_USER + '/' + GH_REPO;

  var DATASET = {
    fourD: { file: '4d_prizes.csv', label: '4D prizes' },
    toto:  { file: 'toto_prizes',   label: 'TOTO prizes' }
  };
  var OFFICIAL = {
    fourD: 'https://www.singaporepools.com.sg/en/product/Pages/4d_results.aspx',
    toto:  'https://www.singaporepools.com.sg/en/product/Pages/toto_results.aspx'
  };


  /* ---------------- exact statistics and game facts ---------------- */

  // TOTO moved from 6/45 to 6/49 with the draw of 9 October 2014 (first draw after 7 October).
  var TOTO_49_FROM = '2014-10-07';
  function totoPool(date) { return date >= TOTO_49_FROM ? 49 : 45; }
  function comb(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }
  /** Two-sided exact binomial p-value: the chance of a hit count at least as unlikely as k in n tries at rate p. */
  function binomP(k, n, p) {
    if (!n || p <= 0 || p >= 1) return 1;
    var logC = function (nn, kk) { var s = 0; for (var i = 0; i < kk; i++) s += Math.log((nn - i) / (i + 1)); return s; };
    var pmf = function (kk) { return Math.exp(logC(n, kk) + kk * Math.log(p) + (n - kk) * Math.log(1 - p)); };
    var obs = pmf(k), tot = 0;
    for (var i = 0; i <= n; i++) { var v = pmf(i); if (v <= obs * (1 + 1e-9)) tot += v; }
    return Math.min(1, tot);
  }
  /** Chance that `picks` numbers chosen from `pool` include at least `need` of the 6 drawn. */
  function totoAtLeast(picks, pool, need) {
    var t = 0; for (var m = need; m <= 6; m++) t += comb(6, m) * comb(pool - 6, picks - m) / comb(pool, picks);
    return t;
  }

  // Official prize structures (GRA-approved game rules: 4D effective 30 Dec 2024, TOTO effective 2 Mar 2026).
  var GAME_FACTS = {
    source: 'Singapore Pools game rules approved by the Gambling Regulatory Authority: 4D effective 30 December 2024, TOTO effective 2 March 2026.',
    totoPoolShare: 0.54,
    toto: [
      { group: 1, match: '6 numbers', prize: '38% of the prize pool, at least $1,000,000', ways: function () { return 1; } },
      { group: 2, match: '5 + additional', prize: '8% of the prize pool', ways: function () { return comb(6, 5); } },
      { group: 3, match: '5 numbers', prize: '5.5% of the prize pool', ways: function () { return comb(6, 5) * comb(42, 1); } },
      { group: 4, match: '4 + additional', prize: '3% of the prize pool', ways: function () { return comb(6, 4) * comb(42, 1); } },
      { group: 5, match: '4 numbers', prize: '$50 fixed', ways: function () { return comb(6, 4) * comb(42, 2); } },
      { group: 6, match: '3 + additional', prize: '$25 fixed', ways: function () { return comb(6, 3) * comb(42, 2); } },
      { group: 7, match: '3 numbers', prize: '$10 fixed', ways: function () { return comb(6, 3) * comb(42, 3); } }
    ],
    fourDBig: [['1st', 1, 2000], ['2nd', 1, 1000], ['3rd', 1, 490], ['Starter', 10, 250], ['Consolation', 10, 60]],
    fourDSmall: [['1st', 1, 3000], ['2nd', 1, 2000], ['3rd', 1, 800]]
  };
  function odds() {
    var total = comb(49, 6), groups = GAME_FACTS.toto.map(function (g) { var w = g.ways(); return { group: g.group, match: g.match, prize: g.prize, oneIn: total / w }; });
    var anyWays = GAME_FACTS.toto.reduce(function (a, g) { return a + g.ways(); }, 0);
    var big = GAME_FACTS.fourDBig.reduce(function (a, x) { return a + x[1] * x[2]; }, 0) / 10000;
    var small = GAME_FACTS.fourDSmall.reduce(function (a, x) { return a + x[1] * x[2]; }, 0) / 10000;
    return { toto: groups, totoAnyOneIn: total / anyWays, totoReturn: GAME_FACTS.totoPoolShare,
      fourDBig: GAME_FACTS.fourDBig, fourDSmall: GAME_FACTS.fourDSmall, fourDBigReturn: big, fourDSmallReturn: small,
      fourDBigAnyOneIn: 10000 / 23, fourDSmallAnyOneIn: 10000 / 3, source: GAME_FACTS.source };
  }

  /**
   * How likely a TOTO set is to be shared if it wins. Odds never change; only Groups 1 to 4 are split between winners,
   * and popular patterns (birthdays, runs, lines, past results) are picked by more people.
   */
  function sharing(numbers) {
    var ns = (numbers || []).map(Number).filter(function (n) { return n >= 1 && n <= 49; }).sort(function (a, b) { return a - b; });
    if (!ns.length) return null;
    var notes = [], score = 0;
    var low = ns.filter(function (n) { return n <= 31; }).length;
    if (low === ns.length) { score += 2; notes.push('every number is 31 or under, like a birthday, which many players choose'); }
    else if (low >= ns.length - 1) { score += 1; notes.push('almost every number is 31 or under'); }
    var run = 1, best = 1;
    for (var i = 1; i < ns.length; i++) { run = ns[i] === ns[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
    if (best >= 3) { score += 2; notes.push('it has a run of ' + best + ' consecutive numbers'); }
    var gaps = ns.slice(1).map(function (n, i) { return n - ns[i]; });
    if (gaps.length >= 3 && gaps.every(function (g) { return g === gaps[0]; })) { score += 2; notes.push('the numbers are evenly spaced, a pattern people like'); }
    var decades = {}; ns.forEach(function (n) { decades[Math.floor(n / 10)] = 1; });
    if (Object.keys(decades).length <= 2) { score += 1; notes.push('the numbers bunch into one or two decades'); }
    var lucky = ns.filter(function (n) { return [8, 18, 28, 38, 48, 6, 9, 3].indexOf(n) >= 0; }).length;
    if (lucky >= 3) { score += 1; notes.push('several are commonly chosen "lucky" numbers'); }
    var past = drawsToto().filter(function (r) { return r.numbers.every(function (n) { return ns.indexOf(n) >= 0; }); });
    if (past.length) { score += 1; notes.push('it contains a past winning combination (' + past[0].date + '), which some players replay'); }
    var level = score >= 4 ? 'High' : score >= 2 ? 'Medium' : 'Low';
    return { level: level, score: score, notes: notes,
      text: level === 'Low' ? 'Few common patterns: if it won a shared prize, it would likely be split between fewer people.'
        : level === 'Medium' ? 'Some popular patterns: a shared prize could be split more than average.'
        : 'Very popular patterns: a shared prize would likely be split between many winners.' };
  }

  /* ---------------- storage ---------------- */

  function load(k) {
    try { var v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function store(k, list) {
    try { localStorage.setItem(k, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function meta() {
    try { return JSON.parse(localStorage.getItem(KEY_META) || '{}') || {}; } catch (e) { return {}; }
  }
  function setMeta(patch) {
    var m = meta();
    Object.keys(patch).forEach(function (k) { m[k] = patch[k]; });
    try { localStorage.setItem(KEY_META, JSON.stringify(m)); } catch (e) {}
    return m;
  }

  // Stored compactly: 4D as {d,n,p} with p a comma-joined prize string.
  function draws4D() {
    return load(KEY_4D).map(function (r) {
      var p = r.p ? r.p.split(',') : [];
      return { date: r.d, drawNumber: r.n, prizes: p,
               first: p[0], second: p[1], third: p[2],
               starters: p.slice(3, 13), consolation: p.slice(13) };
    });
  }
  function drawsToto() {
    return load(KEY_TOTO).map(function (r) {
      return { date: r.d, drawNumber: r.n, numbers: r.w, additional: r.a };
    });
  }

  /* ---------------- CSV parsing ---------------- */

  function splitRow(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  var MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  function p2(n) { return String(n).length < 2 ? '0' + n : String(n); }

  function normDate(v) {
    if (!v) return null;
    v = String(v).trim();
    if (/^nan$/i.test(v)) return null;
    var m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      // Known upstream error: a block of early TOTO draws is dated year 0001.
      if (+m[1] < 1980) return null;
      return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
    }
    m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return m[3] + '-' + p2(m[2]) + '-' + p2(m[1]);
    m = v.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
    if (m) {
      var mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mo) return m[3] + '-' + p2(mo) + '-' + p2(m[1]);
    }
    return null;
  }

  /**
   * 4D dataset: one row per prize-winning number.
   *   draw_number,number,date
   * Rows group by draw and stay in prize order: 1st, 2nd, 3rd, starters, consolation.
   */
  function parse4DCsv(text) {
    var lines = String(text).split(/\r?\n/);
    var head = splitRow(lines[0] || '').map(function (h) { return h.trim().toLowerCase(); });
    var iDraw = head.indexOf('draw_number'), iNum = head.indexOf('number'), iDate = head.indexOf('date');
    if (iNum < 0 || iDate < 0) return [];
    var byDraw = {}, order = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      var c = splitRow(lines[i]);
      var num = (c[iNum] || '').trim();
      var date = normDate(c[iDate]);
      if (!date || !/^\d{4}$/.test(num)) continue;
      var dn = iDraw >= 0 ? (c[iDraw] || '').trim() : date;
      var key = dn + '|' + date;
      if (!byDraw[key]) { byDraw[key] = { d: date, n: dn, list: [] }; order.push(key); }
      byDraw[key].list.push(num);
    }
    return order.map(function (k) {
      var r = byDraw[k];
      return { d: r.d, n: r.n, p: r.list.join(',') };
    });
  }

  /**
   * TOTO dataset: the number column holds a Python-style list of seven zero-padded
   * strings — six winning numbers plus the additional number.
   *   draw_number,"['01', '12', '27', '32', '35', '39', '19']",1997/07/03
   */
  function parseTotoCsv(text) {
    var lines = String(text).split(/\r?\n/);
    var head = splitRow(lines[0] || '').map(function (h) { return h.trim().toLowerCase(); });
    var iDraw = head.indexOf('draw_number'), iNum = head.indexOf('number'), iDate = head.indexOf('date');
    if (iNum < 0 || iDate < 0) return [];
    var out = [], undated = 0;
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      var c = splitRow(lines[i]);
      var date = normDate(c[iDate]);
      if (!date) { undated++; continue; }        // drops the year-0001 block and NaN rows
      var nums = ((c[iNum] || '').match(/\d{1,2}/g) || []).map(Number)
                   .filter(function (n) { return n >= 1 && n <= 49; });
      if (nums.length < 7) continue;
      var win = nums.slice(0, 6), uniq = {};
      if (win.some(function (n) { if (uniq[n]) return true; uniq[n] = 1; return false; })) continue;
      out.push({ d: date, n: iDraw >= 0 ? (c[iDraw] || '').trim() : '',
                 w: win.slice(0).sort(function (a, b) { return a - b; }), a: nums[6] });
    }
    out.undated = undated;
    return out;
  }

  /* ---------------- merging ---------------- */

  function mergeInto(key, incoming) {
    var existing = load(key), seen = {};
    existing.forEach(function (r) { seen[r.d] = 1; });
    var added = incoming.filter(function (r) { return !seen[r.d]; });
    var merged = existing.concat(added).sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    if (store(key, merged)) return { added: added.length, total: merged.length, trimmed: false, ok: true };
    // Storage full — keep the most recent draws, which is what analysis mostly uses.
    var keep = merged.slice(0, Math.floor(merged.length * 0.6));
    var ok = store(key, keep);
    return { added: added.length, total: keep.length, trimmed: true, ok: ok };
  }

  /* ---------------- import routes ---------------- */

  /** Download the full historical dataset straight from GitHub. */
  function fetchDataset(kind, onStage) {
    var spec = kind === 'toto' ? DATASET.toto : DATASET.fourD;
    if (onStage) onStage('Downloading ' + spec.label + '…');
    return fetch(GH_BASE + spec.file, { method: 'GET' }).then(function (r) {
      if (!r.ok) throw new Error('GitHub returned HTTP ' + r.status + ' for ' + spec.file + '.');
      return r.text();
    }, function () {
      throw new Error('Could not reach raw.githubusercontent.com. Check the device is online. ' +
        'If this page was opened from a file:// address the browser blocks the request — serve ' +
        'the folder over http, or use the Android app.');
    }).then(function (text) {
      if (onStage) onStage('Parsing ' + Math.round(text.length / 1024) + ' KB…');
      var rows = kind === 'toto' ? parseTotoCsv(text) : parse4DCsv(text);
      if (!rows.length) throw new Error('The file downloaded but no draws could be read from it. ' +
        'The dataset format may have changed.');
      if (onStage) onStage('Storing ' + rows.length + ' draws…');
      var undatedRows = rows.undated || 0;
      var res = mergeInto(kind === 'toto' ? KEY_TOTO : KEY_4D, rows);
      res.undated = undatedRows;
      setMeta(kind === 'toto' ? { totoSynced: new Date().toISOString(), totoSource: 'GitHub dataset' }
                              : { fourDSynced: new Date().toISOString(), fourDSource: 'GitHub dataset' });
      res.parsed = rows.length;
      res.source = REPO_URL;
      return res;
    });
  }

  /** Import CSV from the Python scraper, or text pasted from anywhere. */
  function importText(kind, text) {
    var t = String(text || '').trim();
    if (!t) return { error: 'Nothing to import. Paste CSV or results text first.' };
    var rows = kind === 'toto' ? parseTotoCsv(t) : parse4DCsv(t);
    if (!rows.length) rows = kind === 'toto' ? parseTotoLoose(t) : parse4DLoose(t);
    if (!rows.length) {
      return { error: 'No draws could be read. Expected CSV with a header row of ' +
        'draw_number,number,date — which is what the bundled scraper writes — or a results ' +
        'table copied from the Singapore Pools page.' };
    }
    var undatedRows = rows.undated || 0;
    var res = mergeInto(kind === 'toto' ? KEY_TOTO : KEY_4D, rows);
    res.undated = undatedRows;
    setMeta(kind === 'toto' ? { totoSynced: new Date().toISOString(), totoSource: 'manual import' }
                            : { fourDSynced: new Date().toISOString(), fourDSource: 'manual import' });
    res.parsed = rows.length;
    return res;
  }

  /* --- loose parsers, for text copied off a results page rather than CSV --- */

  function dateMarks(clean) {
    var re = /(\d{1,2})[\/\-\s](?:(\d{1,2})|([A-Za-z]{3,9}))[\/\-\s](\d{4})/g;
    var marks = [], m;
    while ((m = re.exec(clean)) !== null) marks.push({ i: m.index, m: m });
    return marks;
  }
  function isoFromMark(m) {
    var d = parseInt(m[1], 10), y = parseInt(m[4], 10);
    var mo = m[2] ? parseInt(m[2], 10) : MONTHS[String(m[3]).slice(0, 3).toLowerCase()];
    if (!mo || mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1980 || y > 2100) return null;
    return y + '-' + p2(mo) + '-' + p2(d);
  }
  function parse4DLoose(text) {
    var clean = String(text).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');
    var marks = dateMarks(clean), out = [];
    for (var k = 0; k < marks.length; k++) {
      var seg = clean.slice(marks[k].i, k + 1 < marks.length ? marks[k + 1].i : clean.length)
                     .slice(marks[k].m[0].length);
      var nums = seg.match(/\b\d{4}\b/g) || [];
      var d = isoFromMark(marks[k].m);
      if (!d || nums.length < 3) continue;
      out.push({ d: d, n: '', p: nums.slice(0, 23).join(',') });
    }
    return out;
  }
  function parseTotoLoose(text) {
    var clean = String(text).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');
    var marks = dateMarks(clean), out = [];
    for (var k = 0; k < marks.length; k++) {
      var seg = clean.slice(marks[k].i, k + 1 < marks.length ? marks[k + 1].i : clean.length)
                     .slice(marks[k].m[0].length);
      var nums = (seg.match(/\b\d{1,2}\b/g) || []).map(Number)
                   .filter(function (n) { return n >= 1 && n <= 49; });
      var d = isoFromMark(marks[k].m);
      if (!d || nums.length < 7) continue;
      var win = nums.slice(0, 6), uniq = {};
      if (win.some(function (n) { if (uniq[n]) return true; uniq[n] = 1; return false; })) continue;
      out.push({ d: d, n: '', w: win.slice(0).sort(function (a, b) { return a - b; }), a: nums[6] });
    }
    return out;
  }

  function clear(kind) { store(kind === 'toto' ? KEY_TOTO : KEY_4D, []); }

  /* ---------------- analysis ---------------- */

  /**
   * Singapore TOTO changed format from 6/45 to 6/49 in October 2014. Pooling both eras
   * compares 49 numbers against a uniform expectation when four of them did not exist for
   * most of the archive — which makes 46-49 look ice cold and drives the chi-square through
   * the roof for a perfectly fair draw. The boundary is detected from the data rather than
   * hard-coded, and analysis defaults to the current format.
   */
  function detectEras() {
    var list = drawsToto();
    if (!list.length) return [];
    var firstHigh = null;
    list.forEach(function (r) {
      if (r.numbers.some(function (n) { return n > 45; })) {
        if (!firstHigh || r.date < firstHigh) firstHigh = r.date;
      }
    });
    var oldest = list[list.length - 1].date, newest = list[0].date;
    // The change date is known; the data is only trusted over it if a 46-49 appears earlier (an upstream error).
    var cut = firstHigh && firstHigh < TOTO_49_FROM ? firstHigh : TOTO_49_FROM;
    if (newest < cut) return [{ id: '45', pool: 45, from: oldest, to: newest, label: '6 from 45' }];
    if (oldest >= cut) return [{ id: '49', pool: 49, from: oldest, to: newest, label: '6 from 49 (current format)' }];
    var before = list.filter(function (r) { return r.date < cut; })[0];
    return [
      { id: '45', pool: 45, from: oldest, to: before ? before.date : oldest, label: '6 from 45 (until Oct 2014)' },
      { id: '49', pool: 49, from: cut, to: newest, label: '6 from 49 (current format)' }
    ];
  }

  function totoFrequency(eraId) {
    var eras = detectEras();
    var era = eras.filter(function (e) { return e.id === eraId; })[0]
              || eras[eras.length - 1] || { id: 'all', pool: 49, from: '0000', to: '9999', label: 'all draws' };
    var pool = era.pool;
    var list = drawsToto().filter(function (r) {
      return r.date >= era.from && r.date <= era.to;
    });
    var counts = {}, i;
    for (i = 1; i <= pool; i++) counts[i] = 0;
    var usable = 0;
    list.forEach(function (r) {
      if (r.numbers.some(function (n) { return n > pool; })) return;
      usable++;
      r.numbers.forEach(function (n) { counts[n]++; });
    });
    var draws = usable;
    var expected = draws * 6 / pool;
    var sd = Math.sqrt(draws * (6 / pool) * (1 - 6 / pool));
    var rows = [];
    for (i = 1; i <= pool; i++) {
      rows.push({ n: i, count: counts[i], expected: expected,
                  z: sd > 0 ? (counts[i] - expected) / sd : 0 });
    }
    var sorted = rows.slice(0).sort(function (a, b) { return b.count - a.count; });
    var chiRaw = 0;
    if (expected > 0) rows.forEach(function (r) { chiRaw += Math.pow(r.count - expected, 2) / expected; });
    // Six numbers are drawn without replacement, so the plain statistic averages pool - 6, not pool - 1, for a fair draw.
    // Scaling by (pool - 1) / (pool - 6) restores the chi-square reference distribution.
    var chi = chiRaw * (pool - 1) / (pool - 6);
    var df = pool - 1;
    // Wilson-Hilferty normal approximation to the chi-square upper tail.
    var crit5 = df * Math.pow(1 - 2 / (9 * df) + 1.645 * Math.sqrt(2 / (9 * df)), 3);
    var crit1 = df * Math.pow(1 - 2 / (9 * df) + 2.326 * Math.sqrt(2 / (9 * df)), 3);
    return {
      era: era, eras: eras, pool: pool,
      draws: draws, expected: expected, sd: sd, rows: rows,
      hot: sorted.slice(0, 8), cold: sorted.slice(-8).reverse(),
      maxZ: draws ? Math.max.apply(null, rows.map(function (r) { return Math.abs(r.z); })) : 0,
      chiSquare: chi, chiRaw: chiRaw, chiDf: df,
      chiCrit5: crit5, chiCrit1: crit1,
      chiVerdict: !draws ? 'no data'
                : chi < crit5 ? 'consistent with a fair draw'
                : chi < crit1 ? 'mildly unusual, still within normal ranges'
                : 'unusual for a fair draw at this sample size',
      span: draws ? { from: list[list.length - 1].date, to: list[0].date } : null
    };
  }

  function fourDFrequency() {
    var list = draws4D();
    var pos = [[], [], [], []], all = {}, numbers = 0, top3 = {};
    for (var p = 0; p < 4; p++) for (var d = 0; d < 10; d++) pos[p][d] = 0;
    for (var d2 = 0; d2 < 10; d2++) all[d2] = 0;
    list.forEach(function (r) {
      r.prizes.forEach(function (v, idx) {
        if (!v || v.length !== 4) return;
        numbers++;
        if (idx < 3) top3[v] = (top3[v] || 0) + 1;
        for (var i = 0; i < 4; i++) { var dg = +v[i]; pos[i][dg]++; all[dg]++; }
      });
    });
    var repeats = Object.keys(top3).map(function (k) { return { n: k, count: top3[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 10);
    var crit5 = 16.92, crit1 = 21.67;   // chi-square, 9 degrees of freedom
    var posChi = pos.map(function (row) {
      var e = numbers / 10, c = 0; row.forEach(function (v) { c += e > 0 ? Math.pow(v - e, 2) / e : 0; });
      return { chi: c, verdict: !numbers ? 'no data' : c < crit5 ? 'consistent with chance' : c < crit1 ? 'mildly unusual' : 'unusual for a fair draw' };
    });
    return { draws: list.length, numbers: numbers, positions: pos, overall: all, positionChi: posChi, chiCrit5: crit5,
             expectedPerDigit: numbers / 10, topPrizeRepeats: repeats,
             span: list.length ? { from: list[list.length - 1].date, to: list[0].date } : null };
  }

  function backtest(generatorFn, kind, sample) {
    var list = kind === 'toto' ? drawsToto() : draws4D();
    if (!list.length) return null;
    var checked = 0, hits = 0, matchDist = {};
    list.slice(0, sample || 300).forEach(function (r) {
      var parts = r.date.split('-').map(Number), gen;
      try { gen = generatorFn({ y: parts[0], m: parts[1], d: parts[2] }); } catch (e) { return; }
      if (!gen) return;
      if (kind === 'toto' && gen.toto) {
        checked++;
        var overlap = gen.toto.numbers.filter(function (n) { return r.numbers.indexOf(n) >= 0; }).length;
        matchDist[overlap] = (matchDist[overlap] || 0) + 1;
        if (overlap >= 3) hits++;
      } else if (kind === '4d' && gen.fourD) {
        checked++;
        if (gen.fourD.sets.some(function (s) { return r.prizes.indexOf(s) >= 0; })) hits++;
      }
    });
    return { checked: checked, hits: hits, matchDist: matchDist,
             rate: checked ? hits / checked : 0 };
  }

  function summary() {
    var t = drawsToto(), f = draws4D(), m = meta();
    return {
      toto: { count: t.length, latest: t[0] || null, oldest: t[t.length - 1] || null,
              synced: m.totoSynced || null, source: m.totoSource || null },
      fourD: { count: f.length, latest: f[0] || null, oldest: f[f.length - 1] || null,
               synced: m.fourDSynced || null, source: m.fourDSource || null }
    };
  }


  /* ---------------- automatic sync ---------------- */

  /* Your own repository, if you fork this project and enable the update-draws workflow.
     Set OWN_REPO to the raw base of your fork and the app will prefer it, since it carries
     the freshest draws that the scheduled scraper committed. */
  var OWN_REPO = null;   // e.g. 'https://raw.githubusercontent.com/you/QiPathPro/main/data/'

  function setOwnRepo(base) {
    OWN_REPO = base ? String(base).replace(/\/?$/, '/') : null;
    setMeta({ ownRepo: OWN_REPO });
  }
  function ownRepo() {
    if (OWN_REPO) return OWN_REPO;
    var m = meta();
    return m.ownRepo || null;
  }

  var STALE_HOURS = 20;

  function isStale(kind) {
    var m = meta();
    var t = kind === 'toto' ? m.totoSynced : m.fourDSynced;
    if (!t) return true;
    return (Date.now() - new Date(t).getTime()) > STALE_HOURS * 3600 * 1000;
  }

  /**
   * Pull the newest draws without the user asking. Tries the fork's data/ folder first
   * (updated by the scheduled scraper), then the community dataset. Failures are silent:
   * a stale archive is not worth an error banner on launch.
   */
  function autoSync(onDone) {
    var jobs = [];
    ['toto', 'fourD'].forEach(function (kind) {
      var k = kind === 'toto' ? 'toto' : 'fourD';
      if (!isStale(k === 'toto' ? 'toto' : '4d')) return;
      jobs.push(syncOne(kind).catch(function () { return null; }));
    });
    if (!jobs.length) { if (onDone) onDone({ skipped: true }); return Promise.resolve({ skipped: true }); }
    return Promise.all(jobs).then(function (res) {
      var added = res.reduce(function (a, r) { return a + (r && r.added ? r.added : 0); }, 0);
      var out = { added: added, ran: jobs.length };
      if (onDone) onDone(out);
      return out;
    });
  }

  function syncOne(kind) {
    var file = kind === 'toto' ? 'toto_prizes' : '4d_prizes.csv';
    var own = ownRepo();
    var chain = own
      ? fetchAndMerge(own + (kind === 'toto' ? 'toto_prizes.csv' : '4d_prizes.csv'), kind, 'fork')
          .catch(function () { return fetchAndMerge(GH_BASE + file, kind, 'GitHub dataset'); })
      : fetchAndMerge(GH_BASE + file, kind, 'GitHub dataset');
    return chain;
  }

  function fetchAndMerge(url, kind, sourceLabel) {
    return fetch(url, { method: 'GET' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      var rows = kind === 'toto' ? parseTotoCsv(text) : parse4DCsv(text);
      if (!rows.length) throw new Error('no draws parsed');
      var res = mergeInto(kind === 'toto' ? KEY_TOTO : KEY_4D, rows);
      setMeta(kind === 'toto'
        ? { totoSynced: new Date().toISOString(), totoSource: sourceLabel }
        : { fourDSynced: new Date().toISOString(), fourDSource: sourceLabel });
      res.parsed = rows.length;
      return res;
    });
  }

  /* ---------------- prediction versus actual ---------------- */

  /**
   * Replays the app's own number derivation against every stored draw and compares it with
   * what was actually drawn, alongside the rate pure chance would produce.
   *
   * The comparison is the point. If a derivation had any predictive power it would beat the
   * chance baseline; this ledger exists so that claim can be checked rather than assumed.
   */
  function ledger(generatorFn, kind, limit) {
    var list = kind === 'toto' ? drawsToto() : draws4D();
    if (!list.length) return null;
    var rows = [], dist = {}, checked = 0, hits = 0, sumP = 0, sumMatch = 0;

    list.slice(0, limit || 60).forEach(function (r) {
      var parts = r.date.split('-').map(Number);
      var gen;
      try { gen = generatorFn({ y: parts[0], m: parts[1], d: parts[2] }); } catch (e) { return; }
      if (!gen) return;

      if (kind === 'toto' && gen.toto) {
        checked++;
        var pred = gen.toto.numbers, pool = totoPool(r.date);
        sumP += totoAtLeast(pred.length, pool, 3); sumMatch += 6 * pred.length / pool;
        var overlap = pred.filter(function (n) { return r.numbers.indexOf(n) >= 0; });
        var addHit = pred.indexOf(r.additional) >= 0;
        dist[overlap.length] = (dist[overlap.length] || 0) + 1;
        if (overlap.length >= 3) hits++;
        rows.push({ date: r.date, predicted: pred, actual: r.numbers, additional: r.additional,
                    matched: overlap, matchCount: overlap.length, additionalHit: addHit });
      } else if (kind === '4d' && gen.fourD) {
        checked++;
        var won = gen.fourD.sets.filter(function (x) { return r.prizes.indexOf(x) >= 0; });
        // The chance for this draw, from its own distinct prize numbers and the distinct sets held.
        var uP = {}, uS = {}; r.prizes.forEach(function (x) { uP[x] = 1; }); gen.fourD.sets.forEach(function (x) { uS[x] = 1; });
        var nP = Object.keys(uP).length, nS = Object.keys(uS).length;
        sumP += 1 - comb(10000 - nP, nS) / comb(10000, nS);
        var top = gen.fourD.sets.filter(function (x) {
          return x === r.first || x === r.second || x === r.third; });
        if (won.length) hits++;
        rows.push({ date: r.date, predicted: gen.fourD.sets,
                    actual: [r.first, r.second, r.third], allPrizes: r.prizes.length,
                    matched: won, topMatched: top, matchCount: won.length });
      }
    });

    var stats = kind === 'toto'
      ? totoBaseline(checked, dist, hits, sumP, sumMatch)
      : fourDBaseline(checked, hits, rows, sumP);

    return { kind: kind, checked: checked, hits: hits, rows: rows, dist: dist, stats: stats };
  }

  // Hypergeometric: choosing 7 of 49, how many of the 6 drawn do we expect to hit?
  function totoBaseline(checked, dist, hits, sumP, sumMatch) {
    function C(n, k) {
      if (k < 0 || k > n) return 0;
      var r = 1;
      for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1);
      return r;
    }
    var probs = {}, expected3plus = 0;
    for (var m = 0; m <= 6; m++) {
      var p = C(6, m) * C(43, 7 - m) / C(49, 7);
      probs[m] = p;
      if (m >= 3) expected3plus += p;
    }
    var obs = checked ? hits / checked : 0;
    // Chance worked out draw by draw (6/45 before October 2014, 6/49 after), then judged with the exact binomial test.
    var chance = checked && sumP ? sumP / checked : expected3plus;
    var se = checked ? Math.sqrt(chance * (1 - chance) / checked) : 0;
    var z = se > 0 ? (obs - chance) / se : 0, p = checked ? binomP(hits, checked, chance) : 1;
    return {
      label: 'Toto, 7 numbers against the 6 drawn',
      expectedMatch: checked && sumMatch ? sumMatch / checked : 6 * 7 / 49,
      chanceRate: chance, observedRate: obs, z: z, p: p,
      probs: probs,
      verdict: !checked ? 'no data'
             : p >= 0.05 ? 'indistinguishable from chance'
             : obs > chance ? 'above chance in this sample (exact p ' + p.toFixed(3) + ') — needs a far larger sample before it means anything'
             : 'below chance in this sample (exact p ' + p.toFixed(3) + '), which is also just noise'
    };
  }

  function fourDBaseline(checked, hits, rows, sumP) {
    // Chance from each draw's own prize numbers (usually 23, fewer or more in some early draws).
    var chanceRate = checked && sumP ? sumP / checked : 1 - Math.pow(1 - 23 / 10000, 4);
    var obs = checked ? hits / checked : 0;
    var se = checked ? Math.sqrt(chanceRate * (1 - chanceRate) / checked) : 0;
    var z = se > 0 ? (obs - chanceRate) / se : 0, p = checked ? binomP(hits, checked, chanceRate) : 1;
    var topHits = rows.filter(function (r) { return (r.topMatched || []).length; }).length;
    return {
      label: '4D, 4 sets against each draw\'s prize numbers',
      chanceRate: chanceRate, observedRate: obs, z: z, p: p, topHits: topHits,
      verdict: !checked ? 'no data'
             : p >= 0.05 ? 'indistinguishable from chance'
             : obs > chanceRate ? 'above chance in this sample (exact p ' + p.toFixed(3) + ') — treat with heavy scepticism until replicated'
             : 'below chance in this sample (exact p ' + p.toFixed(3) + '), which is also just noise'
    };
  }

  /** The forthcoming draw, so the ledger can be extended once the result is known. */
  function pendingDraw(kind) {
    var list = kind === 'toto' ? drawsToto() : draws4D();
    return { lastRecorded: list[0] ? list[0].date : null, count: list.length };
  }

  global.QPDraws = {
    autoSync: autoSync, isStale: isStale, setOwnRepo: setOwnRepo, ownRepo: ownRepo,
    ledger: ledger, pendingDraw: pendingDraw,
    draws4D: draws4D, drawsToto: drawsToto, summary: summary,
    fetchDataset: fetchDataset, importText: importText, clear: clear,
    parse4DCsv: parse4DCsv, parseTotoCsv: parseTotoCsv,
    totoFrequency: totoFrequency, fourDFrequency: fourDFrequency, backtest: backtest,
    detectEras: detectEras, binomP: binomP, totoPool: totoPool, odds: odds, sharing: sharing, GAME_FACTS: GAME_FACTS,
    REPO_URL: REPO_URL, OFFICIAL: OFFICIAL, GH_BASE: GH_BASE, DATASET: DATASET
  };
})(typeof window !== 'undefined' ? window : globalThis);
