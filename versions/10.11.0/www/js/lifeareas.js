/* QiPath Pro — the twelve life areas in plain English, across every system.
 *
 * Each system already reads the same twelve areas (QPBazi.AREAS): BaZi, Zi Wei and Qimen from the birth chart, BaZi relations,
 * and BaZi, Zi Wei and Qimen for a year. This module gathers them, weighs them, says where they agree and where they differ,
 * adds what the Ten Gods layer knows, and keeps a link to each technical source so the reader can check the working.
 */
(function (global) {
  'use strict';

  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  function mean(xs) { var w = 0, s = 0; xs.forEach(function (x) { s += x.score * x.w; w += x.w; }); return w ? Math.round(s / w * 10) / 10 : 0; }
  function level(score) { return score >= 1 ? 'Strong' : score <= -1 ? 'Weak' : 'Steady'; }
  function firstSentences(t, n) {
    var parts = String(t || '').split(/(?<=\.)\s+/).filter(Boolean);
    return parts.slice(0, n || 2).join(' ');
  }

  function sources(user, year) {
    var B = global.QPBazi, F = global.QPFib, Q = global.QPQimen;
    return {
      natal: [
        { sys: 'BaZi', w: 1, s: 'chart', k: 'bazi', title: 'Your twelve life areas', fn: function () { return B.areasNatal(user); } },
        { sys: 'Zi Wei', w: 1, s: 'chart', k: 'zwds', title: 'Your twelve life areas', fn: function () { return F.zwdsAreasNatal(user); } },
        { sys: 'Qimen', w: 1, s: 'chart', k: 'destiny', title: 'Your twelve life areas', fn: function () { return Q.areasDestiny(Q.chartFor('destiny', null, user.birth), user); } },
        { sys: 'BaZi relations', w: 0.5, s: 'chart', k: 'relations', title: 'Life areas these relations touch', fn: function () { return B.areasRelations(user); } }
      ],
      year: [
        { sys: 'BaZi', w: 1, s: 'chart', k: 'luck', title: 'Life areas in ' + year, fn: function () { return B.areasYear(user, B.annualForecast(user, year)); } },
        { sys: 'Zi Wei', w: 1, s: 'chart', k: 'zwperiods', title: 'Life areas in ' + year, fn: function () { return F.zwdsAreasYear(user, F.zwdsAnnual(user, year)); } },
        { sys: 'Qimen', w: 1, s: 'chart', k: 'qmseason', title: 'Life areas in ' + year, fn: function () { return Q.areasYearPlate(user, year); } }
      ]
    };
  }

  var LIFE_WORD = { Strong: 'a natural strength', Steady: 'steady, shaped more by your choices than by the chart', Weak: 'an area that needs more care than most' };
  var YEAR_WORD = { Strong: 'a good year to push it forward', Steady: 'an ordinary year for it, so keep it ticking over', Weak: 'a year to protect it and go carefully' };

  function agreement(list) {
    if (list.length < 2) return '';
    var lv = list.map(function (x) { return x.level; }), uniq = lv.filter(function (v, i) { return lv.indexOf(v) === i; });
    if (uniq.length === 1) return 'All ' + list.length + ' readings agree.';
    var by = {}; list.forEach(function (x) { (by[x.level] = by[x.level] || []).push(x.sys); });
    return 'The systems differ: ' + Object.keys(by).map(function (k) { return by[k].join(' and ') + ' read it as ' + k.toLowerCase(); }).join(', ') +
      '. Where they differ, the outcome depends more on what you do, so lean on the advice below.';
  }

  /** Extra plain-English points from the Ten Gods layer for some areas. */
  function extras(user, year) {
    var X = global.QPBaziPlus ? safe(function () { return global.QPBaziPlus.all(user, year); }) : null, out = {};
    if (!X) return out;
    var fam = function (who) { return (X.family.filter(function (f) { return f.who.indexOf(who) === 0; })[0] || {}).text; };
    out.career = 'Your strongest working style is ' + X.structures.primary.en + ' (' + X.structures.primary.cn + '): ' + X.structures.primary.atWork +
      ' You do best ' + X.work.best.en.toLowerCase() + '.';
    out.education = 'Your hidden talent from the month branch is ' + X.talents.main.en + ': ' + X.talents.main.gift + '.';
    out.spouse = X.day.spouse;
    out.marriage = X.day.spouse;
    out.relatives = 'Father: ' + (fam('Father') || '') + ' Mother: ' + (fam('Mother') || '');
    out.children = (fam('Sons') || '') + ' ' + (fam('Daughters') || '');
    out.finance = X.work.flow + ' ' + X.work.drive;
    out.wealth = (X.work.capacity ? X.work.capacity + ' ' : '') + X.work.earned;
    out.colleagues = X.work.partnersNote;
    return out;
  }

  function compute(user, year) {
    var src = sources(user, year), B = global.QPBazi, res = {};
    ['natal', 'year'].forEach(function (when) {
      res[when] = src[when].map(function (S) { var list = safe(S.fn); return list ? { S: S, list: list } : null; }).filter(Boolean);
    });
    var ex = extras(user, year);
    var areas = B.AREAS.map(function (A) {
      var pick = function (when) {
        return res[when].map(function (r) {
          var x = r.list.filter(function (a) { return a.key === A.key; })[0];
          return x ? { sys: r.S.sys, w: r.S.w, score: x.score, level: x.level, plain: x.plain, todo: x.todo, signals: x.signals || [],
                       link: { s: r.S.s, k: r.S.k, title: r.S.title, label: r.S.sys + (when === 'natal' ? ' · birth chart' : ' · ' + year) } } : null;
        }).filter(Boolean);
      };
      var natal = pick('natal'), yr = pick('year');
      var lifeScore = mean(natal), yearScore = mean(yr), life = level(lifeScore), now = level(yearScore);
      var natalSay = natal.filter(function (x) { return x.plain && !/No strong signal/.test(x.plain); })
        .sort(function (a, b) { return Math.abs(b.score) - Math.abs(a.score); }).slice(0, 3)
        .map(function (x) { return { sys: x.sys, text: firstSentences(x.plain, 2) }; });
      var yearSay = yr.filter(function (x) { return x.plain && !/No strong signal/.test(x.plain); })
        .sort(function (a, b) { return Math.abs(b.score) - Math.abs(a.score); }).slice(0, 3)
        .map(function (x) { return { sys: x.sys, text: firstSentences(x.plain, 2) }; });
      var lead = function (list, lvl) { var m = list.filter(function (x) { return x.sys === 'BaZi'; })[0] || list[0]; return m ? (B[list === natal ? 'AREA_ADVICE_NATAL' : 'AREA_ADVICE'][A.key] || {})[lvl] : ''; };
      return { key: A.key, label: A.label, cn: A.cn,
        life: life, lifeScore: lifeScore, year: now, yearScore: yearScore,
        lifeLine: A.label + ' is ' + LIFE_WORD[life] + ' for you.', yearLine: year + ' is ' + YEAR_WORD[now] + '.',
        lifeAgree: agreement(natal), yearAgree: agreement(yr), natalSay: natalSay, yearSay: yearSay,
        extra: ex[A.key] || '',
        doLife: lead(natal, life), doYear: lead(yr, now),
        links: natal.concat(yr).map(function (x) { return x.link; }),
        natal: natal, yearList: yr };
    });
    var byLife = areas.slice().sort(function (a, b) { return b.lifeScore - a.lifeScore; });
    var byYear = areas.slice().sort(function (a, b) { return b.yearScore - a.yearScore; });
    var names = function (xs) { return xs.map(function (x) { return x.label.toLowerCase(); }).join(', '); };
    var summary = [
      'Across your birth charts, your strongest areas are ' + names(byLife.slice(0, 3)) + '. These are where effort pays off most readily.',
      'The areas that need more care over your life are ' + names(byLife.slice(-3).reverse()) + '. Weak here means "give it more attention", not "it will go wrong".',
      'In ' + year + ', the areas with the most going for them are ' + names(byYear.slice(0, 3)) + '; the ones to protect are ' + names(byYear.slice(-3).reverse()) + '.',
      (function () {
        var both = areas.filter(function (a) { return a.life === 'Strong' && a.year === 'Strong'; });
        var risk = areas.filter(function (a) { return a.life === 'Weak' && a.year === 'Weak'; });
        return (both.length ? 'Your best bet this year is ' + names(both) + ': strong by nature and supported by the year. ' : '') +
          (risk.length ? 'Go most carefully with ' + names(risk) + ': it needs care by nature and the year adds pressure.' : 'No area is weak both by nature and this year.');
      })()
    ];
    return { year: year, areas: areas, summary: summary, sourcesUsed: { natal: res.natal.map(function (r) { return r.S.sys; }), year: res.year.map(function (r) { return r.S.sys; }) } };
  }

  global.QPLifeAreas = { compute: compute };
})(typeof window !== 'undefined' ? window : globalThis);
