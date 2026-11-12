/* QiPath Pro: He Luo Li Shu (河洛理數), the birth chart turned into hexagrams.
 * Stems and branches become Ho Tu numbers; the odd total gives the heaven trigram and the even total the earth trigram.
 * The hour picks the 元堂 line. Changing it and swapping the trigrams gives the later-heaven hexagram. Each line then rules
 * nine years if yang and six if yin, counted upward from the 元堂.
 * Schools differ on details. This follows the common modern statement of the method; the zhi zun exceptions are included.
 */
(function (global) {
  'use strict';
  var STEM_NUM = [6, 2, 8, 7, 1, 9, 3, 4, 6, 2];
  var BRANCH_NUM = [[1, 6], [5, 10], [3, 8], [3, 8], [5, 10], [2, 7], [2, 7], [5, 10], [4, 9], [4, 9], [5, 10], [1, 6]];
  var TRI = { 1: [0, 1, 0], 2: [0, 0, 0], 3: [1, 0, 0], 4: [0, 1, 1], 6: [1, 1, 1], 7: [1, 1, 0], 8: [0, 0, 1], 9: [1, 0, 1] };
  // Positive: the nth yang line from the bottom. Negative: the nth yin line. Indexed by yang lines, then hour branch.
  var TANG = [
    [-1, -2, -3, -1, -2, -3, -4, -5, -6, -4, -5, -6],
    [1, 1, -1, -2, -3, -4, -1, -2, -3, -4, -5, 1],
    [1, 2, 1, 2, -1, -2, -1, -2, -3, -4, 1, 2],
    [1, 2, 3, 1, 2, 3, -1, -2, -3, -1, -2, -3],
    [1, 2, 3, 4, -1, -2, -1, -2, -1, -2, 1, 2],
    [1, 2, 3, 4, 5, -1, -1, -1, 1, 2, 3, 4],
    [1, 2, 3, 1, 2, 3, 4, 5, 6, 4, 5, 6]
  ];
  var REVERSED = [6, 5, 4, 6, 5, 4, 3, 2, 1, 3, 2, 1];   // 乾 for women born in the rising half of the year, 坤 for men in the falling half
  var RISING = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '驚蟄', '春分', '清明', '谷雨', '穀雨', '立夏', '小满', '小滿', '芒种', '芒種'];
  var POS = ['初', '二', '三', '四', '五', '上'];
  var SPECIAL = [29, 3, 39];   // 坎 屯 蹇

  function mod(a, n) { return ((a % n) + n) % n; }
  function reduce(sum, base) {
    var x = mod(sum - 1, base) + 1;
    return x % 10 === 0 ? x / 10 : x % 10;
  }
  function lineName(pos, yang) {
    var n = yang ? '九' : '六';
    return pos === 1 ? '初' + n : pos === 6 ? '上' + n : n + POS[pos - 1];
  }

  function numbers(p) {
    var odd = 0, even = 0, list = [];
    function add(n) { if (n % 2) odd += n; else even += n; }
    [p.year, p.month, p.day, p.hour].forEach(function (x) {
      add(STEM_NUM[x.stem]); list.push(STEM_NUM[x.stem]);
      BRANCH_NUM[x.branch].forEach(add); list.push(BRANCH_NUM[x.branch].join('/'));
    });
    return { heaven: odd, earth: even, list: list };
  }

  function fiveTrigram(year, male, heavenOnTop) {
    var yuan = Math.floor(mod(year - 1864, 180) / 60);
    if (yuan === 0) return male ? 8 : 2;
    if (yuan === 1) return heavenOnTop ? 8 : 2;
    return male ? 9 : 7;
  }

  function tangLine(lines, hourBranch, male, rising) {
    var yang = lines.reduce(function (a, b) { return a + b; }, 0), v;
    if (yang === 6 && !male && rising) v = REVERSED[hourBranch];
    else if (yang === 0 && male && !rising) v = -REVERSED[hourBranch];
    else v = TANG[yang][hourBranch];
    var want = v > 0 ? 1 : 0, count = Math.abs(v), seen = 0;
    for (var i = 0; i < 6; i++) if (lines[i] === want && ++seen === count) return i + 1;
    return 1;
  }

  function periods(hex, lines, tang, stage, fromAge, birthYear) {
    var out = [], age = fromAge;
    for (var k = 0; k < 6; k++) {
      var pos = mod(tang - 1 + k, 6) + 1, yang = lines[pos - 1] === 1, years = yang ? 9 : 6;
      out.push({ stage: stage, hex: hex, pos: pos, line: lineName(pos, yang), yang: yang, years: years, fromAge: age, toAge: age + years - 1,
                 fromYear: birthYear + age - 1, toYear: birthYear + age + years - 2 });
      age += years;
    }
    return out;
  }

  /** p: four pillars with term and solarYear. male: boolean. */
  function compute(p, male) {
    var S = global.QPSystems, N = numbers(p), yangYear = p.year.stem % 2 === 0, heavenOnTop = yangYear === male;
    var hn = reduce(N.heaven, 25), en = reduce(N.earth, 30), five = fiveTrigram(p.solarYear, male, heavenOnTop);
    var ht = hn === 5 ? five : hn, et = en === 5 ? five : en;
    var up = heavenOnTop ? ht : et, lo = heavenOnTop ? et : ht, lines = TRI[lo].concat(TRI[up]);
    var rising = RISING.indexOf(p.term && p.term.name) >= 0, tang = tangLine(lines, p.hour.branch, male, rising), first = S.hexFromLines(lines);
    var changed = lines.slice();
    changed[tang - 1] = 1 - changed[tang - 1];
    var oddMonth = mod(p.month.branch - 2, 12) % 2 === 0, swap = true;
    if (SPECIAL.indexOf(first.number) >= 0 && tang >= 5) swap = tang === 5 ? oddMonth : !oddMonth;
    var later = swap ? changed.slice(3).concat(changed.slice(0, 3)) : changed;
    var laterTang = swap ? (tang <= 3 ? tang + 3 : tang - 3) : tang, second = S.hexFromLines(later);
    var a = periods(first, lines, tang, 'Early', 1, p.solarYear);
    var b = periods(second, later, laterTang, 'Later', a[5].toAge + 1, p.solarYear);
    return { numbers: N, heavenNum: hn, earthNum: en, heavenOnTop: heavenOnTop, usedFive: hn === 5 || en === 5, swap: swap,
             first: { hex: first, lines: lines, tang: tang, line: lineName(tang, lines[tang - 1] === 1) },
             second: { hex: second, lines: later, tang: laterTang, line: lineName(laterTang, later[laterTang - 1] === 1) },
             periods: a.concat(b) };
  }

  global.QPHeLuo = { compute: compute };
})(typeof window !== 'undefined' ? window : globalThis);
