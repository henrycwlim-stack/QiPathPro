/* QiPath Pro: the twelve-sign forecast for a year.
 * Each animal branch collects what the year puts on it: its Grand Duke position (counted from the year branch),
 * the year stem's growth stage there, its relation to the year branch, and the common stars set by the year stem
 * and year branch. Checked against the 2027 sign slides. A sign's markers are read wherever that branch sits in a
 * person's chart, and the pillar says which part of life they touch.
 */
(function (global) {
  'use strict';
  var C = global.QPCore;
  var ANIMALS = [['Rat', '鼠'], ['Ox', '牛'], ['Tiger', '虎'], ['Rabbit', '兔'], ['Dragon', '龍'], ['Snake', '蛇'],
                 ['Horse', '馬'], ['Goat', '羊'], ['Monkey', '猴'], ['Rooster', '雞'], ['Dog', '狗'], ['Pig', '豬']];

  // Twelve positions from the year branch: 0 is the year's own branch.
  var DUKE = [
    { en: 'Grand Duke', cn: '太歲', tone: -1, note: 'The year sits on this sign. Prominence and pressure arrive together, so keep commitments deliberate and avoid needless confrontation.' },
    { en: 'Sun', cn: '太陽', tone: 1, note: 'A visible year. Support tends to come from people in senior or public roles.' },
    { en: 'Funeral Door', cn: '喪門', tone: -1, note: 'A heavier emotional year. Make time for family and do not take on risky commitments while drained.' },
    { en: 'Moon', cn: '太陰', tone: 1, note: 'Quiet help, often from women or behind the scenes. Steady work gains more than display.' },
    { en: 'Five Ghost', cn: '五鬼', tone: -1, note: 'Gossip and office politics are the risk. Keep agreements in writing and stay out of factions.' },
    { en: 'Death Charm', cn: '死符', tone: -1, note: 'Plans can stall or end. Finish what is open before starting something large.' },
    { en: 'Year Breaker', cn: '歲破', tone: -2, note: 'The sign faces the year directly. Expect change and disruption, and leave room in plans and money.' },
    { en: 'Dragon Virtue', cn: '龍德', tone: 2, note: 'A protected year. Problems tend to find a solution, often through someone with standing.' },
    { en: 'White Tiger', cn: '白虎', tone: -1, note: 'Sudden events and sharp disputes are the risk. Take care with safety and avoid hasty confrontation.' },
    { en: 'Fortune Virtue', cn: '福德', tone: 2, note: 'A favoured year with good chances for gains and goodwill. Use it for what matters.' },
    { en: 'Sky Dog', cn: '天狗', tone: -1, note: 'Unexpected upsets and worries over people close to you. Be careful with safety and spending.' },
    { en: 'Sickness Charm', cn: '病符', tone: -1, note: 'Energy can run low. Protect sleep, keep up check-ups and see a doctor about any symptom.' }
  ];
  var STAGE_NOTE = ['A fresh start with momentum.', 'Unsettled and exploring, so stay disciplined.', 'Growing confidence and a wish to be seen.',
    'Capable and in position to deliver.', 'At full strength, so guard against overreach.', 'Experience outweighs energy, so consolidate.',
    'Low energy, so pace yourself.', 'Something is ending, so let go of what no longer works.', 'Resources are stored or locked up, so review what you hold.',
    'A clean break before a new cycle.', 'Ideas are forming, so plan rather than launch.', 'Nurture what is young and build slowly.'];

  var STEM_STARS = [
    { en: 'Heavenly Noble', cn: '天乙', tone: 1, note: 'help from people in a position to give it', at: [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [5, 3], [5, 3]] },
    { en: 'Intelligence', cn: '文昌', tone: 1, note: 'study, writing and exams', at: [[5], [6], [8], [9], [8], [9], [11], [0], [2], [3]] },
    { en: 'Tai Ji Nobleman', cn: '太極', tone: 1, note: 'insight and reflective study', at: [[0, 6], [0, 6], [3, 9], [3, 9], [4, 10, 1, 7], [4, 10, 1, 7], [2, 11], [2, 11], [5, 8], [5, 8]] }
  ];
  // [name, cn, tone, offset from the triad's general branch, note]
  var TRIAD_STARS = [
    ['General Star', '將星', 1, 0, 'authority and leading others'], ['Sky Horse', '驛馬', 0, 2, 'travel, moves and change'],
    ['Elegant Seal', '華蓋', 0, 4, 'solitary study and spiritual interest'], ['Peach Blossom', '咸池', 0, 9, 'attraction and social pull'],
    ['Robbery Sha', '劫煞', -1, 5, 'loss through others'], ['Calamity Sha', '災煞', -1, 6, 'accidents and disruption'], ['Death God', '亡神', -1, 11, 'scattered focus and quiet losses']
  ];
  var COMBINE = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  var HARM = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
  var PUNISH = { 0: [3], 3: [0], 2: [5, 8], 5: [2, 8], 8: [2, 5], 1: [10, 7], 10: [1, 7], 7: [1, 10] };
  var GENERAL = { 0: 0, 4: 0, 8: 0, 2: 6, 6: 6, 10: 6, 5: 9, 9: 9, 1: 9, 11: 3, 3: 3, 7: 3 };

  function mod(a, n) { return ((a % n) + n) % n; }
  function bladeOf(stem) {
    for (var b = 0; b < 12; b++) if (global.QPBazi.stageOf(stem, b).i === 4) return b;
    return 0;
  }

  function signsFor(y) {
    var p = C.fourPillars(y, 7, 1, 12, 0), yp = p.year, ys = yp.stem, yb = yp.branch, blade = bladeOf(ys), general = GENERAL[yb];
    var signs = ANIMALS.map(function (a, b) {
      var duke = DUKE[mod(b - yb, 12)], stage = global.QPBazi.stageOf(ys, b), marks = [];
      function add(en, cn, tone, note) { marks.push({ en: en, cn: cn, tone: tone, note: note }); }
      if (b !== yb && COMBINE[yb] === b) add('Grand Duke Combination', '六合', 1, 'cooperation and useful alliances');
      if (HARM[yb] === b) add('Six Harm', '六害', -1, 'friction with people close to you');
      if ((PUNISH[yb] || []).indexOf(b) >= 0) add('Year Punishment', '刑', -1, 'legal or disciplinary strain');
      STEM_STARS.forEach(function (s) { if (s.at[ys].indexOf(b) >= 0) add(s.en, s.cn, s.tone, s.note); });
      if (b === blade) add('Goat Blade', '羊刃', -1, 'sharpness, so take care with risk');
      if (b === (blade + 6) % 12) add('Flying Blade', '飛刃', -1, 'sudden conflict');
      TRIAD_STARS.forEach(function (t) { if (mod(general + t[3], 12) === b) add(t[0], t[1], t[2], t[4]); });
      var score = duke.tone + marks.reduce(function (s, m) { return s + m.tone * 0.5; }, 0) + (stage.power - 0.5);
      return { branch: b, branchCn: C.BRANCHES[b], en: a[0], cn: a[1], duke: duke, stage: { en: stage.en, cn: stage.cn, note: STAGE_NOTE[stage.i] }, marks: marks,
               score: Math.round(score * 10) / 10, outlook: score >= 1.5 ? 'Supported' : score >= 0 ? 'Balanced' : score >= -1.25 ? 'Mixed' : 'Pressured' };
    });
    return { year: y, pillar: yp.cn, signs: signs };
  }

  var PILLARS = [['year', 'Year', 'family background, early life and public standing'], ['month', 'Month', 'career, parents and your working environment'],
                 ['day', 'Day', 'yourself, your partner and private life'], ['hour', 'Hour', 'children, long-term plans and later life']];

  function personal(user, y) {
    var r = signsFor(y);
    r.pillars = PILLARS.map(function (x) {
      var pil = user.pillars[x[0]], sign = r.signs[pil.branch];
      return { pillar: x[1], area: x[2], cn: pil.cn, sign: sign };
    });
    return r;
  }

  global.QPZodiac = { signsFor: signsFor, personal: personal };
})(typeof window !== 'undefined' ? window : globalThis);
