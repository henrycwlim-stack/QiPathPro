/* QiPath Pro — Palm reading (手相) and Face reading (面相) reference and photo handling.
 *
 * The readings themselves are written by the AI from the photos (QPAI.analysePalm / analyseFace). This module holds what the
 * app can know without looking: the traditional map of ages on the face (流年部位), the three zones (三停), the five hand
 * shapes by element, the palm lines and the Eight Trigram palm palaces, and how an element sits with the Day Master.
 * Photos are shrunk in the browser before they are sent, and they are never stored.
 */
(function (global) {
  'use strict';

  /* ================= face: 流年部位, the common hundred-year chart (schools differ in detail) ================= */

  // [from age, to age, position, area in English]. Nominal (虚岁) ages, as the chart is read.
  var FACE_AGES = [
    [1, 7, '左耳 天輪', 'left ear'], [8, 14, '右耳 天輪', 'right ear'],
    [15, 15, '火星', 'top of the forehead at the hairline'], [16, 16, '天中', 'upper forehead, centre'],
    [17, 18, '日角 月角', 'upper forehead, either side of centre'], [19, 19, '天庭', 'forehead, upper centre'],
    [20, 21, '輔角', 'forehead corners'], [22, 22, '司空', 'forehead, centre'],
    [23, 24, '邊城', 'forehead edges near the temples'], [25, 25, '中正', 'mid-forehead'],
    [26, 27, '丘陵 塚墓', 'above the outer brows'], [28, 28, '印堂', 'between the brows'],
    [29, 30, '山林', 'temples above the brow ends'], [31, 32, '凌雲 紫氣', 'the eyebrows, inner part'],
    [33, 34, '繁霞 彩霞', 'the eyebrows, outer part'], [35, 40, '太陽 太陰 中陽 中陰 少陽 少陰', 'the eyes'],
    [41, 41, '山根', 'root of the nose between the eyes'], [42, 43, '精舍 光殿', 'inner corners of the eyes'],
    [44, 45, '年上 壽上', 'bridge of the nose'], [46, 47, '顴骨', 'the cheekbones'],
    [48, 48, '準頭', 'tip of the nose'], [49, 50, '蘭台 廷尉', 'the wings of the nose'],
    [51, 51, '人中', 'the philtrum'], [52, 53, '仙庫', 'either side of the philtrum'],
    [54, 55, '食倉 祿倉', 'above the corners of the mouth'], [56, 57, '法令', 'the smile lines'],
    [58, 59, '虎耳', 'below the cheekbones toward the ears'], [60, 60, '水星', 'the mouth'],
    [61, 61, '承漿', 'below the lower lip'], [62, 63, '地庫', 'either side of the chin'],
    [64, 65, '陂池 鵝鴨', 'beside the chin'], [66, 67, '金縷', 'along the lower jaw'],
    [68, 69, '歸來', 'the jaw below the mouth corners'], [70, 70, '頌堂', 'above the chin'],
    [71, 71, '地閣', 'the chin'], [72, 73, '奴僕', 'the chin\'s sides'], [74, 75, '腮骨', 'the jaw angles']
  ];
  var ZONES = [
    { cn: '上停', en: 'Upper zone', area: 'hairline to the brows', ages: '15–30', governs: 'early life, upbringing, learning and the start of a career' },
    { cn: '中停', en: 'Middle zone', area: 'brows to the tip of the nose', ages: '31–50', governs: 'the working years, drive, wealth-building and standing' },
    { cn: '下停', en: 'Lower zone', area: 'below the nose to the chin', ages: '51 on', governs: 'later life, home, those who support you, and what you keep' }
  ];
  function ageArea(xu) {
    if (xu > 75) return { from: 76, to: 99, cn: '地閣 子至亥', en: 'the ring around the chin and jaw, read by the twelve branches', zone: ZONES[2] };
    for (var i = 0; i < FACE_AGES.length; i++) {
      var a = FACE_AGES[i];
      if (xu >= a[0] && xu <= a[1]) {
        return { from: a[0], to: a[1], cn: a[2], en: a[3], zone: xu < 15 ? null : xu <= 30 ? ZONES[0] : xu <= 50 ? ZONES[1] : ZONES[2] };
      }
    }
    return null;
  }
  // The next few positions, so a reading can say what comes after this year.
  function agesAhead(xu, n) {
    var out = [], seen = {}, cur = ageArea(xu);
    if (cur) seen[cur.cn] = 1;
    for (var y = xu + 1; y <= xu + 12 && out.length < (n || 3); y++) {
      var a = ageArea(y); if (a && !seen[a.cn]) { seen[a.cn] = 1; out.push({ age: y, cn: a.cn, en: a.en }); }
    }
    return out;
  }

  var FACE_SHAPES = [
    { element: 'Wood', cn: '木形', look: 'long and upright, a tall forehead, narrower jaw' },
    { element: 'Fire', cn: '火形', look: 'narrow forehead or pointed crown, broader jaw, sharp features' },
    { element: 'Earth', cn: '土形', look: 'broad, thick and square-set, a full jaw and fleshy nose' },
    { element: 'Metal', cn: '金形', look: 'square, firm and clearly drawn, even proportions' },
    { element: 'Water', cn: '水形', look: 'round and soft, full cheeks, a rounded chin' }
  ];
  var FACE_FEATURES = ['Eyebrows 保壽官', 'Eyes 監察官', 'Nose 審辨官', 'Mouth 出納官', 'Ears 採聽官', 'Forehead 天庭', 'Chin and jaw 地閣'];
  // The twelve palaces most readers name on the face. 疾厄 is read only as the tradition's vitality and resilience, never as a diagnosis.
  var FACE_PALACES = ['命宮 Life (between the brows)', '財帛宮 Wealth (the nose)', '官祿宮 Career (centre of the forehead)',
    '兄弟宮 Siblings and friends (the brows)', '田宅宮 Property (between brow and eye)', '夫妻宮 Partner (outer corners of the eyes)',
    '子女宮 Children (below the eyes)', '奴僕宮 Helpers (the chin\'s sides)', '遷移宮 Travel (the temples)',
    '福德宮 Fortune (above the outer brows)', '父母宮 Parents (above the brows on the forehead)',
    '疾厄宮 Health and vitality (山根, the root of the nose between the eyes, down to 年上 壽上 on the bridge)'];

  /* ================= palm ================= */

  var HAND_SHAPES = [
    { element: 'Wood', cn: '木形手', look: 'long palm and long fingers, slim, visible knuckles' },
    { element: 'Fire', cn: '火形手', look: 'palm wider at the base, pointed or tapering fingertips, lively colour' },
    { element: 'Earth', cn: '土形手', look: 'thick, square palm, short strong fingers, firm flesh' },
    { element: 'Metal', cn: '金形手', look: 'square palm, square fingertips, straight firm fingers' },
    { element: 'Water', cn: '水形手', look: 'soft, plump and rounded, smooth fingers that taper' }
  ];
  var PALM_LINES = [
    { cn: '天紋', en: 'Heart line', where: 'the upper crease, running from below the little finger toward the index' },
    { cn: '人紋', en: 'Head line', where: 'the middle crease, starting between thumb and index and crossing the palm' },
    { cn: '地紋', en: 'Life line', where: 'the curve around the base of the thumb' },
    { cn: '玉柱紋', en: 'Fate line', where: 'the vertical line up the centre toward the middle finger, if present' },
    { cn: '太陽紋', en: 'Sun line', where: 'a vertical line toward the ring finger, if present' }
  ];
  // The Eight Trigram palaces of the palm (掌中八卦) and the centre 明堂.
  var PALM_BAGUA = [
    '巽 below the index finger (wealth)', '離 below the middle and ring fingers (reputation)', '坤 below the little finger (partner, home)',
    '兌 the outer edge, middle (children, creativity)', '乾 the outer edge, low (mentors, father)', '坎 the base of the palm, centre (roots, ancestry)',
    '艮 the base of the thumb, low (learning, siblings)', '震 the thumb mound (vitality, mother)', '明堂 the hollow in the centre (the present)'];
  // Where the palm's Health palace 疾厄 is read: vitality and resilience only, never a diagnosis.
  var PALM_HEALTH = ['地紋 the Life line (depth, clarity, how fully it curves around the thumb)',
    '震 the thumb mound (fullness and firmness, the store of vitality)',
    '健康紋 the Health line, rising from the base of the palm toward the little finger, where one shows (many palms have none, which is read as good)'];

  /* ================= elements against the Day Master ================= */

  var ELEMS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  var STEM_ELEM = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
  function relation(dm, el) {
    var a = ELEMS.indexOf(dm), b = ELEMS.indexOf(el);
    if (a < 0 || b < 0) return null;
    var d = (b - a + 5) % 5;
    return [{ cn: '比和', en: 'the same element as your Day Master: it confirms your own nature' },
            { cn: '我生', en: 'produced by your Day Master: it spends your energy into output and expression' },
            { cn: '我剋', en: 'controlled by your Day Master: it shows what you work on and earn' },
            { cn: '剋我', en: 'controls your Day Master: it shows pressure, discipline and rank' },
            { cn: '生我', en: 'produces your Day Master: it shows support and resources' }][d];
  }

  /** Nominal age (虚岁) as the face chart reads it, and the Day Master's element. */
  function context(user, now) {
    var C = global.QPCore, p = C.fourPillars(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0);
    var xu = p.solarYear - user.pillars.solarYear + 1;
    return { xu: xu, age: ageArea(xu), ahead: agesAhead(xu, 3),
             dayMaster: C.STEMS[user.pillars.day.stem], dmElement: STEM_ELEM[user.pillars.day.stem],
             gender: user.gender === 'M' ? 'male' : 'female' };
  }

  /* ================= photos ================= */

  /**
   * Read a chosen or captured image, shrink it to at most `max` px on the long side and re-encode as JPEG.
   * Phones take 12 MP photos; a reading needs about 1 MP, and the smaller upload is faster and cheaper.
   */
  function prepareImage(file, max) {
    max = max || 1280;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || 'image/')) { reject(new Error('That file is not an image.')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        var dataUrl = cv.toDataURL('image/jpeg', 0.85);
        resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl, width: cv.width, height: cv.height });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('The photo could not be opened. Try another one.')); };
      img.src = url;
    });
  }

  global.QPPhysio = {
    FACE_AGES: FACE_AGES, ZONES: ZONES, FACE_SHAPES: FACE_SHAPES, FACE_FEATURES: FACE_FEATURES, FACE_PALACES: FACE_PALACES,
    HAND_SHAPES: HAND_SHAPES, PALM_LINES: PALM_LINES, PALM_BAGUA: PALM_BAGUA, PALM_HEALTH: PALM_HEALTH, STEM_ELEM: STEM_ELEM,
    ageArea: ageArea, agesAhead: agesAhead, relation: relation, context: context, prepareImage: prepareImage
  };
})(typeof window !== 'undefined' ? window : globalThis);
