/* QiPath Pro: the annual planner.
 * Twelve solar months from a chosen start, each read from the month pillar against the birth chart and from
 * the Qimen month plate around the person's Day Stem, then laid out as an A4 PDF. Pages are drawn on a canvas
 * and stored as JPEG images, so Chinese text needs no embedded font and the same code runs in the app and a browser.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, A = global.QPAstro, S = global.QPSystems;
  var PALACES = [1, 2, 3, 4, 6, 7, 8, 9];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var GOOD_DAY = 78, AVOID_DAY = 36;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateOf(jd) { var g = A.jdToLocal(jd); return { y: g.y, m: g.m, d: Math.floor(g.d) }; }
  function iso(g) { return g.y + '-' + pad(g.m) + '-' + pad(g.d); }
  function pretty(s) { var a = s.split('-'); return +a[2] + ' ' + MON[+a[1] - 1] + ' ' + a[0]; }
  function toScore(v) { return Math.round(50 + (v / 3) * 50); }

  // What each ten god brings when it rules a month, in plain words.
  function godPlain(i) {
    if (i === 0) return 'A month about yourself: confidence and independence rise, and so does stubbornness.';
    if (i === 1) return 'Competition and shared costs. Money can leave through other people, so hold off on loans and guarantees.';
    if (i === 2) return 'A relaxed, productive month. Ideas, teaching and creative work are rewarded.';
    if (i === 3) return 'Sharp ideas and a sharp tongue. Good for pitching and performing, but pick your words with seniors.';
    if (i === 4 || i === 5) return 'Money and practical results come into focus. Work on income, deals and what you own.';
    if (i === 6) return 'Pressure and high stakes. Deadlines and rivals push you, and disciplined action pays.';
    if (i === 7) return 'Duty and recognition. Rules, titles and responsibility take centre stage, so be dependable.';
    return 'Support and learning. Mentors, study, paperwork and rest all go better than usual.';
  }

  /** Combine the Bazi and Qimen readings of the twelve areas into one reading. */
  function mergeAreas(bazi, qimen) {
    var first = function (x) { return x.plain.split(/\.\s+/)[0].replace(/\.$/, '') + '.'; };
    return bazi.map(function (b, i) {
      var q = qimen[i], hasB = b.signals.length > 0, hasQ = q.signals.length > 0;
      var v = hasB && hasQ ? (b.score + q.score) / 2 : hasB ? b.score : q.score;
      v = Math.round(v * 10) / 10;
      var level = global.QPBazi.areaLevel(v), text = [hasB ? first(b) : '', hasQ ? first(q) : ''].filter(Boolean).join(' ');
      return { key: b.key, label: b.label, cn: b.cn, score: v, pct: toScore(v), level: level,
               plain: text || 'No strong signal this period.', todo: global.QPBazi.AREA_ADVICE[b.key][level] };
    });
  }
  function overallOf(areas) { return toScore(areas.reduce(function (t, x) { return t + x.score; }, 0) / areas.length); }

  /** Best and worst directions on a plate. */
  function directions(res, fav) {
    var Q = global.QPQimen, P = res.chart.palacesByNumber;
    var all = PALACES.map(function (n) {
      var pa = P[n];
      return { num: n, dir: pa.dir, gate: pa.gate, star: pa.starCn, deity: pa.spirit, isEmpty: !!pa.isEmpty,
               score: Q.palaceQuality(res.chart, res.formations, n, fav).score };
    }).sort(function (a, b) { return b.score - a.score; });
    return { all: all, best: all.filter(function (x) { return !x.isEmpty; }).slice(0, 2), avoid: all.slice(-2).reverse() };
  }
  function seatOn(res, user, fav) {
    var Q = global.QPQimen, seat = Q.natalSeat(res.chart, user), pa = res.chart.palacesByNumber[seat.num];
    var q = Q.palaceQuality(res.chart, res.formations, seat.num, fav).score;
    return { num: seat.num, dir: pa.dir, gate: pa.gate, star: pa.starCn, deity: pa.spirit, isEmpty: !!pa.isEmpty, score: q,
      word: pa.isEmpty ? 'void: efforts can feel hollow, so confirm before you commit' : q >= 2 ? 'well placed: you can act with confidence' :
        q <= -2 ? 'under pressure: protect your energy and avoid big bets' : 'neutral: results follow your effort' };
  }
  /** What the month pillar does to the birth chart. */
  function forces(user, mp) {
    var B = global.QPBazi, p = user.pillars, out = [], labels = ['Year', 'Month', 'Day', 'Hour'];
    B.fourHarms(p, mp.branch).forEach(function (h) {
      out.push({ tone: 'bad', title: h.cn + ' · ' + h.en + ' on your ' + h.pillar + ' pillar', text: h.note });
    });
    [p.year, p.month, p.day, p.hour].forEach(function (q, i) {
      if (B.SIX_UNION[mp.branch] === q.branch) out.push({ tone: 'good', title: C.BRANCHES[mp.branch] + C.BRANCHES[q.branch] + ' 合 · Combination with your ' + labels[i] + ' pillar',
        text: 'The month draws this part of your life closer: cooperation and agreements come more easily.' });
    });
    if (B.STEM_UNION[mp.stem] === p.day.stem) out.push({ tone: 'good', title: C.STEMS[mp.stem] + C.STEMS[p.day.stem] + ' 合 · The month stem combines with you',
      text: 'People and offers are drawn to you, though you may also be pulled away from your own plans.' });
    B.branchStars(p, mp.branch).forEach(function (s) {
      out.push({ tone: 'good', title: s.cn + ' · ' + s.en, text: s.note.charAt(0).toUpperCase() + s.note.slice(1) + '.' });
    });
    return out;
  }
  function dayList(start, end, user) {
    var s = start.split('-').map(Number), e = end.split('-').map(Number), out = [];
    var jd0 = A.civilJDN(s[0], s[1], s[2]), jd1 = A.civilJDN(e[0], e[1], e[2]);
    for (var j = 0; j <= jd1 - jd0; j++) {
      var g = A.jdToGreg(A.gregToJD(s[0], s[1], s[2]) + j);
      out.push(S.scoreDay(g.y, g.m, Math.floor(g.d), '', user));
    }
    return out;
  }
  function solarMonths(start) {
    var jd = A.localToJD(start.y, start.m, start.d, 23, 59), all = [];
    for (var yr = start.y - 1; yr <= start.y + 2; yr++) {
      var terms = A.termsForYear(yr), next = A.termsForYear(yr + 1)[0].jd;
      for (var k = 0; k < 12; k++) all.push({ year: yr, k: k, t0: terms[k * 2].jd, t1: k < 11 ? terms[k * 2 + 2].jd : next, term: terms[k * 2].name });
    }
    var from = 0;
    all.forEach(function (x, i) { if (x.t0 <= jd && jd < x.t1) from = i; });
    return all.slice(from, from + 12);
  }
  /** The twelve solar months that can open a planner, starting with the one containing the date. */
  function startOptions(today) {
    return solarMonths(today).map(function (x) {
      var s = iso(dateOf(x.t0));
      return { value: s, label: pretty(s) };
    });
  }

  function buildMonth(user, x) {
    var Q = global.QPQimen, B = global.QPBazi, fav = user.deep.favourable;
    var md = dateOf(x.t0 + 7), res = Q.chartFor('month', { y: md.y, m: md.m, d: md.d, hour: 12, min: 0 });
    var mp = res.pillars.month, start = iso(dateOf(x.t0)), end = iso(dateOf(x.t1 - 1));
    var seat = Q.natalSeat(res.chart, user).num;
    var areas = mergeAreas(B.areasMonth(user, mp), Q.areasOnPlate(res, user, seat, false));
    var days = dayList(start, end, user), byScore = days.slice().sort(function (a, b) { return b.score - a.score; });
    var god = C.tenGod(user.pillars.day.stem, mp.stem);
    return { year: x.year, k: x.k, term: x.term, start: start, end: end, res: res, pillar: mp, god: god, godText: godPlain(god.i),
      elem: C.ELEM_EN[C.STEM_ELEM[mp.stem]], branchElem: C.ELEM_EN[C.BRANCH_ELEM[mp.branch]],
      seat: seatOn(res, user, fav), dirs: directions(res, fav), areas: areas, score: overallOf(areas), forces: forces(user, mp),
      formations: res.formations.filter(function (f) { return f.category === 'auspicious' || f.category === 'hostile'; }),
      days: days, goodDays: byScore.slice(0, 5), avoidDays: byScore.slice(-3).reverse() };
  }
  function buildYear(user, year) {
    var Q = global.QPQimen, B = global.QPBazi, a = B.annualForecast(user, year), fav = user.deep.favourable;
    var mid = dateOf(A.termsForYear(year)[0].jd + 150), res = Q.chartFor('year', { y: mid.y, m: mid.m, d: mid.d, hour: 12, min: 0 });
    return { year: year, a: a, res: res, seat: seatOn(res, user, fav), dirs: directions(res, fav),
      areas: mergeAreas(B.areasYear(user, a), Q.areasYearPlate(user, year)) };
  }
  /** The whole planner: opts.start { y, m, d } falls inside the first solar month. */
  function build(user, start) {
    var Q = global.QPQimen, list = solarMonths(start), months = list.map(function (x) { return buildMonth(user, x); });
    var years = list.map(function (x) { return x.year; }).filter(function (y, i, l) { return l.indexOf(y) === i; }).map(function (y) { return buildYear(user, y); });
    var destiny = Q.chartFor('destiny', null, user.birth);
    return { user: user, months: months, years: years, destiny: destiny, profile: Q.destinyProfile(destiny, user),
      natalAreas: global.QPBazi.areasNatal(user), seat: Q.natalSeat(destiny.chart, user),
      luck: global.QPFib.bazi(user).luck, from: months[0].start, to: months[11].end };
  }

  /* ---------------- drawing ---------------- */
  var W = 595, H = 842, M = 42, SCALE = 2;
  var FONT = '"Noto Serif CJK SC","Noto Serif SC","Source Han Serif SC","Songti SC","Microsoft YaHei",Georgia,"Times New Roman",serif';
  var INK = '#2A211A', SOFT = '#6D6053', RULE = '#D8CDB9', PAPER = '#FBF7EE', RED = '#A8341F', GREEN = '#3E7355', BRASS = '#96742A', LACQUER = '#17120E';

  function Doc(user, onPage) {
    var cv = global.document.createElement('canvas');
    cv.width = W * SCALE; cv.height = H * SCALE;
    this.cv = cv; this.g = cv.getContext('2d'); this.user = user; this.onPage = onPage; this.n = 0; this.y = 0; this.open = false;
    this.g.scale(SCALE, SCALE); this.g.textBaseline = 'alphabetic';
  }
  Doc.prototype.finish = function () { if (this.open) { this.footer(); this.onPage(this.cv); this.open = false; } };
  Doc.prototype.page = function (noFooter) {
    this.finish();
    this.g.fillStyle = PAPER; this.g.fillRect(0, 0, W, H);
    this.n++; this.y = M; this.open = true; this.noFooter = !!noFooter;
  };
  Doc.prototype.footer = function () {
    if (this.noFooter) return;
    this.line(M, H - 34, W - M, H - 34, RULE);
    this.text((this.footerTitle || 'QiPath Annual Planner') + ' · ' + this.user.name, M, H - 22, 7.5, SOFT);
    this.text(String(this.n), W - M, H - 22, 7.5, SOFT, 'right');
  };
  Doc.prototype.ensure = function (h) { if (!this.open || this.y + h > H - 44) this.page(); };
  Doc.prototype.text = function (s, x, y, size, color, align, bold) {
    var g = this.g;
    g.font = (bold ? 'bold ' : '') + size + 'px ' + FONT; g.fillStyle = color || INK; g.textAlign = align || 'left';
    g.fillText(s, x, y);
  };
  Doc.prototype.line = function (x0, y0, x1, y1, color, w) {
    var g = this.g; g.strokeStyle = color || RULE; g.lineWidth = w || 0.5;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  Doc.prototype.rect = function (x, y, w, h, fill) { this.g.fillStyle = fill; this.g.fillRect(x, y, w, h); };
  /** Word wrap that also breaks between Chinese characters. */
  Doc.prototype.wrap = function (s, width, size, bold) {
    var g = this.g; g.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    var tokens = String(s).match(/[⺀-鿿]|[^\s⺀-鿿]+|\s+/g) || [], lines = [], cur = '';
    tokens.forEach(function (t) {
      var next = cur + t;
      if (g.measureText(next).width > width && cur.trim()) { lines.push(cur.trim()); cur = /^\s+$/.test(t) ? '' : t; } else cur = next;
    });
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  };
  Doc.prototype.para = function (s, opt) {
    opt = opt || {};
    var size = opt.size || 9.5, lh = opt.lh || size * 1.45, x = opt.x || M, width = opt.width || W - M - x, self = this;
    var lines = this.wrap(s, width, size, opt.bold);
    this.ensure(lines.length * lh + 2);
    lines.forEach(function (l) { self.y += lh; self.text(l, x, self.y - lh * 0.28, size, opt.color, 'left', opt.bold); });
    this.y += opt.after === undefined ? 4 : opt.after;
  };
  Doc.prototype.title = function (s, sub) {
    this.ensure(60);
    this.text(s, M, this.y + 18, 20, INK, 'left', true); this.y += 26;
    if (sub) { this.text(sub, M, this.y + 10, 9.5, SOFT); this.y += 15; }
    this.line(M, this.y + 3, W - M, this.y + 3, RED, 1.2); this.y += 13;
  };
  Doc.prototype.h2 = function (s, sub) {
    this.ensure(44);
    this.y += 5;
    this.text(s, M, this.y + 11, 12, RED, 'left', true);
    if (sub) this.text(sub, W - M, this.y + 11, 8, SOFT, 'right');
    this.y += 16; this.line(M, this.y, W - M, this.y); this.y += 4;
  };
  Doc.prototype.kv = function (k, v, labelW) {
    labelW = labelW || 118;
    var lines = this.wrap(v, W - 2 * M - labelW, 9), h = lines.length * 13 + 2, self = this;
    this.ensure(h);
    this.text(k, M, this.y + 10, 8.5, SOFT);
    lines.forEach(function (l, i) { self.text(l, M + labelW, self.y + 10 + i * 13, 9); });
    this.y += h;
  };
  /** The nine palaces in Lo Shu layout. */
  Doc.prototype.plate = function (chart, seat, cellH) {
    var order = [[4, 9, 2], [3, 5, 7], [8, 1, 6]], cw = (W - 2 * M) / 3, ch = cellH || 76, x0 = M, y0, self = this;
    this.ensure(ch * 3 + 8);
    y0 = this.y;
    order.forEach(function (row, r) {
      row.forEach(function (n, c) {
        var pa = chart.palacesByNumber[n], x = x0 + c * cw, y = y0 + r * ch;
        if (n !== 5 && pa.gateRank === 2) self.rect(x, y, cw, ch, '#EAF0E4');
        else if (n !== 5 && pa.gateRank === 0) self.rect(x, y, cw, ch, '#F6E7DF');
        else if (n === 5) self.rect(x, y, cw, ch, '#F1EADB');
        self.g.strokeStyle = RULE; self.g.lineWidth = 0.6; self.g.strokeRect(x, y, cw, ch);
        self.text(n + ' ' + (pa.name || '') + ' · ' + (pa.dir || 'Centre'), x + 6, y + 12, 7.5, SOFT);
        if (pa.isEmpty) self.text('空 void', x + cw - 6, y + 12, 7.5, RED, 'right', true);
        var heaven = (pa.heavenStemCn || '·') + (pa.heavenStem2Cn || ''), earth = (pa.earthStemCn || '·') + (pa.earthStem2Cn || '');
        self.text(heaven, x + 6, y + 34, 15, INK, 'left', true);
        self.text(earth, x + 6, y + 54, 12, SOFT);
        self.text(pa.starCn || '', x + cw - 6, y + 31, 10, INK, 'right');
        self.text(pa.gate || '', x + cw - 6, y + 47, 10, INK, 'right', true);
        self.text(pa.spirit || '', x + cw - 6, y + 63, 10, INK, 'right');
        if (n === seat) {
          self.g.strokeStyle = BRASS; self.g.lineWidth = 2; self.g.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
          self.text('YOU', x + 6, y + ch - 7, 7, BRASS, 'left', true);
        }
      });
    });
    this.y += ch * 3 + 4;
    this.text('Large character: heaven stem. Below it: earth stem. Right: star, door, deity. Green: auspicious door. Red: harsh door.', M, this.y + 8, 7, SOFT);
    this.y += 14;
  };
  Doc.prototype.area = function (x) {
    var lines = this.wrap(x.plain, W - 2 * M, 8.5), todo = x.level === 'Steady' ? [] : this.wrap('What to do: ' + x.todo, W - 2 * M, 8.5);
    var h = 15 + (lines.length + todo.length) * 11.5 + 5, self = this, tone = x.level === 'Strong' ? GREEN : x.level === 'Weak' ? RED : SOFT, bx = W - M - 150;
    this.ensure(h);
    this.text(x.label + '  ' + x.cn, M, this.y + 10, 9.5, INK, 'left', true);
    this.rect(bx, this.y + 4, 100, 6, '#E9E0CF');
    this.rect(bx, this.y + 4, Math.max(2, x.pct), 6, tone);
    this.text(x.level + ' ' + x.pct, W - M, this.y + 10, 8.5, tone, 'right', true);
    this.y += 15;
    lines.forEach(function (l) { self.y += 11.5; self.text(l, M, self.y - 3, 8.5); });
    todo.forEach(function (l) { self.y += 11.5; self.text(l, M, self.y - 3, 8.5, SOFT); });
    this.y += 5;
  };

  function pillarTable(d, p, dm) {
    var cols = [['Hour 時', p.hour], ['Day 日', p.day], ['Month 月', p.month], ['Year 年', p.year]], cw = (W - 2 * M) / 4, y0 = d.y;
    d.ensure(112);
    y0 = d.y;
    cols.forEach(function (c, i) {
      var x = M + i * cw + cw / 2, q = c[1], isDay = i === 1;
      d.g.strokeStyle = RULE; d.g.lineWidth = 0.6; d.g.strokeRect(M + i * cw, y0, cw, 106);
      d.text(c[0], x, y0 + 13, 8, SOFT, 'center');
      d.text(isDay ? 'You · Day Master' : C.tenGod(dm, q.stem).en, x, y0 + 26, 7.5, isDay ? BRASS : SOFT, 'center');
      d.text(C.STEMS[q.stem], x, y0 + 48, 20, INK, 'center', true);
      d.text(C.BRANCHES[q.branch], x, y0 + 72, 20, INK, 'center', true);
      d.text(q.en + ' · ' + C.ZODIAC[q.branch], x, y0 + 86, 7.5, SOFT, 'center');
      d.text('Hidden ' + C.HIDDEN[q.branch].map(function (h) { return C.STEMS[h]; }).join(' '), x, y0 + 98, 7.5, SOFT, 'center');
    });
    d.y += 112;
  }
  function cover(d, plan) {
    var u = plan.user, g = d.g;
    d.page(true);
    d.rect(0, 0, W, H, LACQUER);
    g.strokeStyle = BRASS; g.lineWidth = 1; g.strokeRect(24, 24, W - 48, H - 48);
    d.rect(M + 6, 226, 54, 3, RED);
    d.text('QiPath', M + 6, 280, 46, '#E9DFCC', 'left', true);
    d.text('Annual Planner', M + 6, 330, 34, '#C8A24A');
    d.text(u.name, M + 6, 410, 20, '#E9DFCC', 'left', true);
    d.text(pretty(plan.from) + ' to ' + pretty(plan.to), M + 6, 436, 12, '#C8A24A');
    var b = u.birth;
    d.text('Born ' + b.d + ' ' + MON[b.m - 1] + ' ' + b.y + ', ' + pad(b.hour) + ':' + pad(b.min) + ' · ' + (u.gender === 'M' ? 'Male' : 'Female'), M + 6, 456, 10, '#8A7A66');
    d.text('Twelve solar months, read from your birth chart and the Qimen plates.', M + 6, H - 70, 9, '#8A7A66');
  }
  function howTo(d, plan) {
    d.page();
    d.title('How to use this planner');
    ['Each chapter runs from one solar month to the next, so months begin around the 4th to the 8th of the calendar month rather than on the 1st.',
     'Every month has a score from 0 to 100, where 50 is neutral. It averages twelve life areas, each read twice: from how the month pillar meets your birth chart (Bazi), and from where your Day Stem sits on that month\'s Qimen plate. The scale is QiPath\'s own and only compares your months with each other.',
     'Strong means the signs favour pushing ahead. Steady means results follow effort. Weak means protect what you have. A weak score is a prompt to prepare, not a prediction that something bad will happen.',
     'Good and avoid days come from the traditional almanac (day officer, yellow and black path, lunar mansion) adjusted for your zodiac sign and favourable elements. They are general days; use Consult › Plan a task to pick a date for one specific activity.',
     'This planner is for reflection and planning. It is not medical, legal, financial or psychological advice, so see a qualified professional for decisions in those fields.'
    ].forEach(function (s) { d.para(s, { size: 10.5, after: 9 }); });
    d.h2('Your year at a glance');
    chart(d, plan);
    var ranked = plan.months.slice().sort(function (a, b) { return b.score - a.score; });
    d.y += 4;
    d.para('Strongest months: ' + ranked.slice(0, 3).map(monthName).join(', ') + '.', { size: 10 });
    d.para('Months to pace yourself: ' + ranked.slice(-3).reverse().map(monthName).join(', ') + '.', { size: 10 });
  }
  function monthName(m) { return m.pillar.cn + ' ' + pretty(m.start).replace(/ \d{4}$/, ''); }
  function chart(d, plan) {
    var h = 120, y0, cw = (W - 2 * M) / 12, mid;
    d.ensure(h + 34);
    y0 = d.y + 4; mid = y0 + h / 2;
    plan.months.forEach(function (m, i) {
      var x = M + i * cw, v = (m.score - 50) / 50 * (h / 2) * 2.2;
      v = Math.max(-h / 2, Math.min(h / 2, v));
      d.rect(x + cw * 0.22, v >= 0 ? mid - v : mid, cw * 0.56, Math.max(1.5, Math.abs(v)), m.score >= 50 ? GREEN : RED);
      d.text(String(m.score), x + cw / 2, v >= 0 ? mid - v - 3 : mid - v + 9, 8, INK, 'center', true);
      var s = m.start.split('-');
      d.text(MON[+s[1] - 1], x + cw / 2, y0 + h + 13, 8, SOFT, 'center');
      d.text(m.pillar.cn, x + cw / 2, y0 + h + 24, 7.5, SOFT, 'center');
    });
    d.line(M, mid, W - M, mid, SOFT, 0.7);
    d.y = y0 + h + 30;
  }
  function natal(d, plan) {
    var u = plan.user, D = u.deep, p = u.pillars;
    d.page();
    d.title('Your birth chart', 'The fixed pattern every month below is read against');
    pillarTable(d, p, p.day.stem);
    d.y += 4;
    d.kv('Day Master', C.STEMS[p.day.stem] + ' · ' + D.dayMasterEn + (D.strong ? ' (strong)' : ' (weak)') + ' · ' + D.strength.verdict);
    d.kv('Favourable elements', D.favourableCn.join(' ') + ' · ' + D.favourableEn.join(', '));
    d.kv('Life gua', u.mansions.gua + ' ' + u.mansions.guaCn + ' · ' + u.mansions.group + ' group');
    d.kv('Good directions', u.mansions.good.join(', '));
    d.kv('Directions to limit', u.mansions.avoid.join(', '));
    var ny = global.QPBazi.nayinAssessment(u, { y: +plan.from.slice(0, 4), m: +plan.from.slice(5, 7), d: +plan.from.slice(8, 10) });
    d.h2('Nayin 納音', 'a macro view, separate from Day Master strength');
    d.para(ny.summary, { size: 9, after: 3 });
    d.para(ny.advice, { size: 9, color: SOFT, after: 4 });
    ny.others.forEach(function (x) { d.kv(x.pillar + ' ' + x.cn, x.en + ' · ' + x.relLabel + ': ' + x.relText + '.'); });
    d.kv('Self sound', ny.self.cn + ' · ' + ny.self.en + '. ' + ny.dialogue.label + ': ' + ny.dialogue.text);
    d.kv('Life stages', ny.harmony + ' · ' + ny.links.map(function (l) { return l.label; }).join(', '));
    d.kv('Resilience', ny.resilience + ' · ' + ny.resilienceText);
    d.h2('Stars in your chart');
    D.stars.forEach(function (s) { d.kv(s.cn, s.en + ': ' + s.note); });
    d.h2('Ten-year luck pillars');
    plan.luck.forEach(function (l) {
      d.kv(l.pillar.cn + (l.current ? ' · now' : ''), 'Age ' + Math.floor(l.from) + ' to ' + Math.floor(l.to) + ' (' + l.start.slice(0, 4) + ' to ' + l.end.slice(0, 4) + ') · ' + l.god.en + ' · ' + (l.score >= 1 ? 'supportive' : l.score <= -1 ? 'demanding' : 'mixed'));
    });
  }
  function destiny(d, plan) {
    var dp = plan.profile, ds = dp.destiny, ch = plan.destiny.chart;
    d.page();
    d.title('Your Qimen birth plate', 'The Qimen chart for the moment you were born');
    d.plate(ch, plan.seat.num, 84);
    d.y += 4;
    d.kv('Destiny palace', ds.palace + ' ' + ds.name + ' · ' + ds.dir + ' · ' + ds.element);
    d.kv('Life stem', ds.lifeStem + ' · ' + ds.lifeStemEn);
    d.kv('Door', ds.door + ' · ' + ds.doorEn);
    d.kv('Star', ds.star + ' · ' + ds.starEn);
    d.kv('Deity', ds.guardian);
    if (dp.mindPalace) d.kv(dp.mindPalace.cn, dp.mindPalace.pillar + ' · ' + dp.mindPalace.dir);
    if (dp.soulPalace) d.kv(dp.soulPalace.cn, dp.soulPalace.pillar + ' · ' + dp.soulPalace.dir);
    d.page();
    d.title('Your twelve life areas', 'The lifelong pattern, before any year or month is added');
    plan.natalAreas.forEach(function (x) { d.area({ label: x.label, cn: x.cn, level: x.level, pct: toScore(x.score), plain: x.plain, todo: x.todo }); });
  }
  function yearPages(d, y, plan) {
    var a = y.a;
    d.page();
    d.title(a.pillar.cn + ' solar year ' + y.year, pretty(a.lichun) + ' to ' + pretty(a.ends) + ' · outlook: ' + a.verdict);
    d.kv('Year stem brings', a.stemGod.en + ' · ' + godPlain(a.stemGod.i).replace('A month', 'A year').replace('month', 'year'));
    if (a.taiSui) d.kv('Your sign and the year', a.taiSui.cn + ' · ' + a.taiSui.en + ': ' + a.taiSui.note);
    a.stars.forEach(function (s) { d.kv(s.cn, s.en + ': ' + s.note); });
    a.harms.filter(function (h) { return !h.softened; }).forEach(function (h) { d.kv(h.cn, h.en + ' on your ' + h.pillar + ' pillar. ' + h.note); });
    d.h2('The year plate', 'your Day Stem is marked YOU');
    d.plate(y.res.chart, y.seat.num, 70);
    d.kv('Your position', y.seat.dir + ' · ' + y.seat.gate + ' ' + y.seat.star + ' ' + y.seat.deity + ' · ' + y.seat.word);
    d.kv('Directions that help', y.dirs.best.map(function (x) { return x.dir; }).join(', '));
    d.kv('Directions to limit', y.dirs.avoid.map(function (x) { return x.dir; }).join(', '));
    d.page();
    d.title('Life areas in ' + y.year);
    y.areas.forEach(function (x) { d.area(x); });
  }
  function monthPages(d, m) {
    var dayName = function (x) { return x.d + ' ' + MON[x.m - 1] + ' ' + x.pillar.cn; };
    d.page();
    d.title(m.pillar.cn + ' month', pretty(m.start) + ' to ' + pretty(m.end) + ' · opens at ' + m.term + ' · overall score ' + m.score);
    d.kv('Theme', m.god.en + ' ' + m.god.cn + ' · ' + m.godText);
    d.kv('Elements', m.elem + ' over ' + m.branchElem);
    d.h2('The month plate', 'your Day Stem is marked YOU');
    d.plate(m.res.chart, m.seat.num, 70);
    d.kv('Your position', m.seat.dir + ' · ' + [m.seat.gate, m.seat.star, m.seat.deity].filter(Boolean).join(' ') + ' · ' + m.seat.word);
    d.kv('Directions that help', m.dirs.best.map(function (x) { return x.dir + ' (' + x.gate + ')'; }).join(', '));
    d.kv('Directions to limit', m.dirs.avoid.map(function (x) { return x.dir + ' (' + x.gate + ')'; }).join(', '));
    d.h2('The month and your birth chart');
    if (!m.forces.length) d.para('No clash or combination with your pillars this month. It is a quiet month for the birth chart, so timing rests on the plate above.', { size: 9 });
    m.forces.forEach(function (f) {
      d.para(f.title, { size: 9, bold: true, color: f.tone === 'good' ? GREEN : RED, after: 0 });
      d.para(f.text, { size: 8.5, after: 4 });
    });
    d.h2('Days');
    d.kv('Best days', m.goodDays.map(dayName).join(', '));
    d.kv('Days to go easy', m.avoidDays.map(dayName).join(', '));
    d.page();
    d.title('Life areas', m.pillar.cn + ' month · ' + pretty(m.start) + ' to ' + pretty(m.end));
    m.areas.forEach(function (x) { d.area(x); });
  }
  /** One calendar grid per Gregorian month in the period. */
  function calendar(d, plan) {
    var map = {}, keys = [];
    plan.months.forEach(function (m) { m.days.forEach(function (x) {
      var k = x.y + '-' + pad(x.m); if (!map[k]) { map[k] = {}; keys.push(k); } map[k][x.d] = x.score; }); });
    d.page();
    d.title('Good days calendar', 'Filled: good days (score ' + GOOD_DAY + ' or more). Crossed: days to go easy (' + AVOID_DAY + ' or less).');
    var cols = 4, rowsPer = 4, gap = 12, bw = (W - 2 * M - gap * (cols - 1)) / cols, cell = bw / 7, bh = cell * 7 + 26, y0 = d.y;
    keys.forEach(function (k, i) {
      var pos = i % (cols * rowsPer), c = pos % cols, r = Math.floor(pos / cols);
      if (i && pos === 0) { d.page(); y0 = d.y; }
      var x = M + c * (bw + gap), y = y0 + r * bh, py = +k.slice(0, 4), pm = +k.slice(5);
      d.text(MON[pm - 1] + ' ' + py, x, y + 10, 9.5, RED, 'left', true);
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (w, j) { d.text(w, x + j * cell + cell / 2, y + 21, 6.5, SOFT, 'center'); });
      var first = A.weekday(A.civilJDN(py, pm, 1)), n = new Date(py, pm, 0).getDate();
      for (var day = 1; day <= n; day++) {
        var at = first + day - 1, cx = x + (at % 7) * cell, cy = y + 24 + Math.floor(at / 7) * cell, sc = map[k][day];
        if (sc === undefined) { d.text(String(day), cx + cell / 2, cy + cell * 0.68, 7, RULE, 'center'); continue; }
        if (sc >= GOOD_DAY) { d.rect(cx + 1, cy + 1, cell - 2, cell - 2, GREEN); d.text(String(day), cx + cell / 2, cy + cell * 0.68, 7.5, '#FFFFFF', 'center', true); }
        else {
          d.text(String(day), cx + cell / 2, cy + cell * 0.68, 7.5, sc <= AVOID_DAY ? RED : INK, 'center');
          if (sc <= AVOID_DAY) d.line(cx + 3, cy + cell - 3, cx + cell - 3, cy + 3, RED, 0.8);
        }
      }
    });
  }

  /** Draw every page; onPage(canvas) is called as each page is finished. */
  function draw(plan, onPage) {
    var d = new Doc(plan.user, onPage);
    cover(d, plan); howTo(d, plan); natal(d, plan); destiny(d, plan);
    plan.years.forEach(function (y) { yearPages(d, y, plan); });
    plan.months.forEach(function (m) { monthPages(d, m); });
    calendar(d, plan);
    d.finish();
    return d.n;
  }

  /* ---------------- PDF ---------------- */
  function latin1(s) { var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; }
  /** A PDF whose pages are full-page JPEGs. images: Uint8Array[] */
  function pdfFromJpegs(images, title, pxW, pxH) {
    var parts = [], size = 0, offsets = [];
    var put = function (b) { if (typeof b === 'string') b = latin1(b); parts.push(b); size += b.length; };
    var obj = function (n, body) { offsets[n] = size; put(n + ' 0 obj\n' + body + '\nendobj\n'); };
    var count = images.length, kids = [];
    for (var i = 0; i < count; i++) kids.push((4 + i * 3) + ' 0 R');
    put('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + count + ' /Kids [' + kids.join(' ') + '] >>');
    obj(3, '<< /Title (' + String(title).replace(/[^\x20-\x7E]/g, '').replace(/([()\\])/g, '\\$1') + ') /Producer (QiPath Pro) >>');
    images.forEach(function (jpg, i) {
      var n = 4 + i * 3, content = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im Do Q';
      obj(n, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Contents ' + (n + 1) + ' 0 R /Resources << /XObject << /Im ' + (n + 2) + ' 0 R >> >> >>');
      obj(n + 1, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
      offsets[n + 2] = size;
      put((n + 2) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pxW + ' /Height ' + pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
      put(jpg); put('\nendstream\nendobj\n');
    });
    var xref = size, total = 4 + count * 3, x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var k = 1; k < total; k++) x += ('0000000000' + offsets[k]).slice(-10) + ' 00000 n \n';
    put(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var out = new Uint8Array(size), at = 0;
    parts.forEach(function (b) { out.set(b, at); at += b.length; });
    return out;
  }
  function canvasJpeg(cv) {
    var bin = global.atob(cv.toDataURL('image/jpeg', 0.82).split(',')[1]), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  /** The finished PDF as bytes, with its page count and a file name. */
  function toPdf(plan) {
    var images = [], pages = draw(plan, function (cv) { images.push(canvasJpeg(cv)); });
    var safe = String(plan.user.name || 'Profile').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Profile';
    return { bytes: pdfFromJpegs(images, 'QiPath Annual Planner', W * SCALE, H * SCALE), pages: pages,
             name: 'QiPath-Planner-' + safe + '-' + plan.from.slice(0, 7) + '.pdf' };
  }

  global.QPPlanner = { build: build, startOptions: startOptions, toPdf: toPdf, draw: draw, pdfFromJpegs: pdfFromJpegs,
    Doc: Doc, canvasJpeg: canvasJpeg, solarMonths: solarMonths, buildMonth: buildMonth, godPlain: godPlain, GOOD_DAY: GOOD_DAY, AVOID_DAY: AVOID_DAY };
})(typeof window !== 'undefined' ? window : globalThis);
