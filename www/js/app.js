/* QiPath Pro — profiles, routing, rendering */
(function () {
  'use strict';
  var A = window.QPAstro, C = window.QPCore, S = window.QPSystems, G = window.QPGuide;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); };
  var mod = function (n, m) { return ((n % m) + m) % m; };
  var WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var MON = ['January','February','March','April','May','June','July','August','September',
             'October','November','December'];

  /* ---------------- storage ---------------- */
  var KEY = 'qipath.profiles.v1';
  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function saveProfiles(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  // Not cryptography — this only stops a casual glance at localStorage.
  function hashPin(pin, salt) {
    var h = 2166136261 >>> 0;
    var s = salt + '|' + pin;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
  }

  var user = null;      // active profile, enriched with chart data
  var current = 'now';

  /* ---------------- profile chart ---------------- */
  /* ---------------- time zone at birth ---------------- */
  // A named zone brings its own history (Singapore was UTC+7:30 until 1982). Blank means this device's current offset.
  var BIRTH_ZONES = [['', 'This device\'s time zone (default)'], ['Asia/Singapore', 'Singapore'], ['Asia/Kuala_Lumpur', 'Malaysia (Peninsular)'], ['Asia/Kuching', 'Malaysia (Sabah, Sarawak)'],
    ['Asia/Hong_Kong', 'Hong Kong'], ['Asia/Shanghai', 'China'], ['Asia/Taipei', 'Taiwan'], ['Asia/Jakarta', 'Indonesia (Jakarta)'], ['Asia/Bangkok', 'Thailand'], ['Asia/Manila', 'Philippines'],
    ['Asia/Ho_Chi_Minh', 'Vietnam'], ['Asia/Tokyo', 'Japan'], ['Asia/Seoul', 'South Korea'], ['Asia/Kolkata', 'India'], ['Australia/Perth', 'Australia (Perth)'], ['Australia/Sydney', 'Australia (Sydney)'],
    ['Europe/London', 'United Kingdom'], ['America/New_York', 'US Eastern'], ['America/Los_Angeles', 'US Pacific'], ['America/Vancouver', 'Canada (Vancouver)']];
  function zoneOptions(sel) {
    return BIRTH_ZONES.map(function (z) { return '<option value="' + z[0] + '"' + (z[0] === (sel || '') ? ' selected' : '') + '>' + z[1] + '</option>'; }).join('');
  }
  /** The UTC offset in hours of a named zone at a civil time, with that zone's history. Undefined if it cannot be read. */
  function zoneOffset(zone, b) {
    if (!zone) return undefined;
    try {
      var fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
      var civil = Date.UTC(b.y, b.m - 1, b.d, b.hour, b.min), off = 0;
      for (var i = 0; i < 3; i++) {
        var o = {}; fmt.formatToParts(new Date(civil - off * 36e5)).forEach(function (x) { o[x.type] = +x.value; });
        off = (Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - (civil - off * 36e5)) / 36e5;
      }
      return Math.round(off * 3600) / 3600;
    } catch (e) { return undefined; }
  }
  function enrich(p) {
    var b = {}; Object.keys(p.birth).forEach(function (k) { b[k] = p.birth[k]; });
    b.tz = zoneOffset(b.zone, b);
    var pillars = C.birthPillars(b);
    var bazi = S.analyseBazi(pillars);
    var lunar = A.toLunar(b.y, b.m, b.d);
    var luck = S.luckPillars(pillars, p.gender, b);
    var zw = S.zwds(lunar, pillars.hourBranch, pillars.year.stem, pillars.year.branch);
    var em = S.eightMansions(pillars.solarYear, p.gender);
    var deep = window.QPBazi.analyse(pillars, p.gender);
    return {
      deep: deep,
      id: p.id, name: p.name, gender: p.gender, birth: b, salt: p.salt, pin: p.pin,
      pillars: pillars, bazi: bazi, lunar: lunar, luck: luck, zwds: zw, mansions: em,
      zodiacBranch: pillars.year.branch,
      favourable: deep.favourable, dayMasterElem: deep.dayMasterElem
    };
  }

  /* ---------------- login ---------------- */
  var pendingId = null;

  function renderGate() {
    var list = loadProfiles();
    var host = $('gateProfiles');
    if (!list.length) { host.innerHTML = ''; showNew(); return; }
    host.innerHTML =
      '<div class="profiles">' + list.map(function (p) {
        return '<button data-id="' + p.id + '">' + esc(p.name) +
               '<small>Born ' + p.birth.y + '-' + String(p.birth.m).padStart(2,'0') + '-' +
               String(p.birth.d).padStart(2,'0') + '</small></button>';
      }).join('') + '</div>' +
      '<button class="btn ghost" id="addNew">Add another profile</button>';
    host.querySelectorAll('[data-id]').forEach(function (b) {
      b.onclick = function () { pendingId = b.dataset.id; showSignIn(); };
    });
    $('addNew').onclick = showNew;
  }
  function showSignIn() {
    $('gateProfiles').hidden = true; $('gateNew').hidden = true;
    $('gateSignIn').hidden = false; $('pin').value = ''; $('pinErr').textContent = '';
    $('pin').focus();
  }
  function showNew() {
    $('gateProfiles').hidden = true; $('gateSignIn').hidden = true; $('gateNew').hidden = false;
  }
  function showList() {
    $('gateSignIn').hidden = true; $('gateNew').hidden = true;
    $('gateProfiles').hidden = false; renderGate();
  }

  function signIn() {
    var list = loadProfiles();
    var p = list.filter(function (x) { return x.id === pendingId; })[0];
    if (!p) { showList(); return; }
    if (hashPin($('pin').value, p.salt) !== p.pin) {
      $('pinErr').textContent = 'That PIN does not match. Try again.'; return;
    }
    user = enrich(p);
    $('gate').hidden = true; $('app').hidden = false;
    boot();
  }

  function createProfile() {
    var name = $('nName').value.trim();
    var date = $('nDate').value, time = $('nTime').value || '12:00';
    var pin = $('nPin').value;
    var err = $('newErr');
    if (!name) { err.textContent = 'Add a name so the app can address you.'; return; }
    if (!date) { err.textContent = 'A date of birth is required to build your chart.'; return; }
    if (!/^\d{4,6}$/.test(pin)) { err.textContent = 'The PIN must be 4 to 6 digits.'; return; }
    var dp = date.split('-').map(Number), tp = time.split(':').map(Number);
    if (dp[0] < 1900 || dp[0] > 2100) { err.textContent = 'Enter a birth year between 1900 and 2100.'; return; }
    var salt = Math.random().toString(36).slice(2);
    var p = { id: 'p' + Date.now(), name: name, gender: $('nGender').value,
              birth: { y: dp[0], m: dp[1], d: dp[2], hour: tp[0], min: tp[1], zone: $('nZone').value || undefined },
              salt: salt, pin: hashPin(pin, salt) };
    var list = loadProfiles(); list.push(p); saveProfiles(list);
    pendingId = p.id;
    user = enrich(p);
    $('gate').hidden = true; $('app').hidden = false;
    boot();
  }

  /* ---------------- helpers ---------------- */
  function now() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(),
             hour: d.getHours(), min: d.getMinutes() };
  }
  function fmt(dt) { return dt.y + '-' + String(dt.m).padStart(2,'0') + '-' + String(dt.d).padStart(2,'0'); }
  function longDate(dt) {
    var wd = A.weekday(A.civilJDN(dt.y, dt.m, dt.d));
    return WD[wd] + ', ' + dt.d + ' ' + MON[dt.m - 1] + ' ' + dt.y;
  }
  function rows(pairs) {
    return '<div class="rows">' + pairs.map(function (p) {
      return '<div class="row"><span class="k">' + p[0] + '</span><span class="v">' + p[1] + '</span></div>';
    }).join('') + '</div>';
  }
  /* ---------------- Qimen chart method (Profile › Qimen charts) ---------------- */
  // 置闰 or 拆补 for the hourly ju, and the hour's or the day's xun for the void. Device-wide, applied before any chart.
  var QM_OPTS_KEY = 'qipath.qm.opts';
  function loadQmOpts() {
    var o = null; try { o = JSON.parse(localStorage.getItem(QM_OPTS_KEY) || 'null'); } catch (e) { o = null; }
    return { method: o && o.method === 'chaibu' ? 'chaibu' : 'zhirun', voidBy: o && o.voidBy === 'day' ? 'day' : 'hour', longRule: o && o.longRule === 'era' ? 'era' : 'yearly',
      trueSolar: !!(o && o.trueSolar), lon: o && typeof o.lon === 'number' ? o.lon : 103.85 };
  }
  function applyQmOpts(o) { if (S && S.setQimenOptions) S.setQimenOptions(o); C.setTrueSolar(o.trueSolar ? o.lon : null); }
  applyQmOpts(loadQmOpts());
  function qmMethodLabel(ch) {
    return ch.method === 'zhirun' ? ' <small>置闰 Zhi Run' + (ch.zhiRun && ch.zhiRun.leap ? ', 闰 repeat' : '') + '</small>'
      : ch.method === 'chaibu' ? ' <small>拆补 Chai Bu</small>' : '';
  }
  function qmTermLabel(ch, p) {
    var actual = p && p.term ? p.term.name : ch.term;
    if (ch.method !== 'zhirun' || actual === ch.term) return ch.term;
    var dr = ch.zhiRun ? ch.zhiRun.drift : 0;
    return ch.term + ' <small>ju taken from ' + ch.term + ' (' + (dr > 0 ? '超神, ' + dr + ' days early' : '接气, ' + (-dr) + ' days late') +
      '); the solar term itself is ' + actual + '</small>';
  }
  function qmVoidLabel(ch) {
    if (!ch.hourVoid) return ch.voidBranches.join(' ');
    return ch.voidBranches.join(' ') + ' <small>hour ' + ch.hourVoid.join('') + ' · day ' + ch.dayVoid.join('') + '</small>';
  }

  /* ---------------- the twelve life areas (Bazi, Zi Wei, Qimen) ---------------- */
  // Each area: its level, what it means in plain words, what to do, and the chart signals behind it.
  function lifeAreasHtml(list, title, note) {
    var cls = { Strong: 'good-t', Steady: '', Weak: 'bad-t' };
    return block(title, note, '<div class="stack-sm">' + rows(list.map(function (x) {
      return ['<span class="' + cls[x.level] + '">' + esc(x.label) + ' — ' + x.level + '</span><small>' + x.cn + '</small>',
        '<div class="plain">' + esc(x.plain) + '<div class="todo"><b>What to do:</b> ' + esc(x.todo) + '</div></div>' +
        (x.signals.length ? '<details class="tech"><summary>Technical detail</summary>' + x.signals.map(esc).join('<br>') +
          '<br>score ' + x.score + '</details>' : '')];
    })) + '</div>');
  }
  function areasSafe(fn) { try { return fn(); } catch (e) { return null; } }

  function block(title, note, body) {
    return '<div class="block"><h2>' + title + (note ? '<em>' + note + '</em>' : '') + '</h2>' + body + '</div>';
  }
  function advice(dos, avoids) {
    return '<div class="advice">' +
      '<section class="do"><h3>Favoured now</h3><ul>' +
        (dos.length ? dos.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
                    : '<li>Nothing strongly indicated. Ordinary work is fine.</li>') +
      '</ul></section>' +
      '<section class="avoid"><h3>Hold back from</h3><ul>' +
        (avoids.length ? avoids.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('')
                       : '<li>No specific caution today.</li>') +
      '</ul></section></div>';
  }
  function pillarCols(p, dm) {
    var cols = [['Year', p.year], ['Month', p.month], ['Day', p.day], ['Hour', p.hour]];
    return '<div class="pillars">' + cols.map(function (c) {
      var isDM = dm && c[0] === 'Day';
      var god = c[0] === 'Day' ? 'Day Master' : C.tenGod(p.day.stem, c[1].stem).en;
      return '<div class="pillar' + (isDM ? ' dm' : '') + '">' +
        '<div class="lab">' + c[0] + '</div>' +
        '<div class="gz"><b>' + C.STEMS[c[1].stem] + '</b><b>' + C.BRANCHES[c[1].branch] + '</b></div>' +
        '<div class="sub">' + god + '</div></div>';
    }).join('') + '</div>';
  }


  /* ---------------- shared UI helpers ---------------- */

  var R = window.QPRecords;

  function pad2(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function isoOf(dt) { return dt.y + '-' + pad2(dt.m) + '-' + pad2(dt.d); }
  function fromISO(v) {
    var a = String(v || '').split('-').map(Number);
    return (a.length === 3 && a[0]) ? { y: a[0], m: a[1], d: a[2] } : now();
  }
  // The picker's value 12 is the Early Rat hour after midnight; 0 is the Late Rat hour before the next midnight.
  function branchToHour(b) { return b === 12 ? 0 : b === 0 ? 23 : (b * 2 - 1); }
  function hourToBranch(h) { return Math.floor((((h + 1) % 24) + 24) % 24 / 2); }

  function hourOptions(sel) {
    var out = '<option value="12"' + (sel === 12 ? ' selected' : '') + '>' + C.BRANCHES[0] + ' 00:00–00:59</option>';
    for (var b = 1; b < 12; b++) {
      out += '<option value="' + b + '"' + (b === sel ? ' selected' : '') + '>' +
             C.BRANCHES[b] + ' ' + C.HOUR_RANGE[b] + '</option>';
    }
    return out + '<option value="0"' + (sel === 0 ? ' selected' : '') + '>' + C.BRANCHES[0] + ' ' + C.HOUR_RANGE[0] + '</option>';
  }

  // Date + double-hour picker, defaulted to the current day and hour.
  function whenPicker(idDate, idHour, dt, label) {
    var hr = dt.hour === undefined ? now().hour : dt.hour, b = hr === 0 ? 12 : hourToBranch(hr);
    return '<div class="picker">' +
      '<div><label for="' + idDate + '">' + (label || 'Date') + '</label>' +
      '<input id="' + idDate + '" type="date" value="' + isoOf(dt) + '"></div>' +
      '<div><label for="' + idHour + '">Hour range</label>' +
      '<select id="' + idHour + '">' + hourOptions(b) + '</select></div></div>';
  }
  function readWhen(idDate, idHour) {
    var d = fromISO($(idDate).value);
    d.hour = branchToHour(parseInt($(idHour).value, 10));
    d.min = 30;
    return d;
  }

  /* ---- modal sheet ---- */
  function closeSheet() { $('sheetHost').innerHTML = ''; }
  function openSheet(title, sub, bodyHtml, onReady) {
    $('sheetHost').innerHTML =
      '<div class="sheet-bg" id="sheetBg"><div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-head"><div><h3>' + title + '</h3>' +
      (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      '<button id="sheetX" aria-label="Close">&times;</button></div>' +
      '<div class="sheet-body" id="sheetBody">' + bodyHtml + '</div></div></div>';
    $('sheetX').onclick = closeSheet;
    $('sheetBg').onclick = function (e) { if (e.target === $('sheetBg')) closeSheet(); };
    if (onReady) onReady();
  }

  /* ---- save to profile records ---- */
  function saveBar(id, label) {
    return '<div class="savebar"><button class="btn ghost" id="' + id + '">' +
           (label || 'Save to my records') + '</button></div><div id="' + id + '-msg"></div>';
  }
  function wireSave(id, build) {
    var b = $(id);
    if (!b) return;
    b.onclick = function () {
      var rec = build();
      if (!rec) return;
      if (!rec.ai && currentAI) rec.ai = currentAI;   // narrative generated before saving
      var saved = R.save(user.id, rec);
      $(id + '-msg').innerHTML = saved
        ? '<div class="saved-tick">Saved to your records' +
          (saved.ai ? ', with the AI reading' : '') +
          '. Find it under Journal &rsaquo; Saved Readings.</div>'
        : '<div class="err">Could not save — this browser is blocking storage.</div>';
      if (saved) { b.textContent = 'Saved'; lastSavedId = saved.id; }
    };
  }
  var lastSavedId = null;
  var currentAI = null;      // the narrative on screen, so a later save carries it

  // Wraps aiPanel so the generated narrative is also attached to a saved record.
  /**
   * Wraps aiPanel so the narrative and the record end up together whichever order the
   * person does them in: attached to an already-saved record, or held for a later save.
   */
  function aiPanelSaving(hostId, kind, stamp, runner, sections) {
    aiPanel(hostId, kind, stamp, function (cfg) {
      return runner(cfg).then(function (data) {
        currentAI = data;
        if (lastSavedId) R.attachAI(user.id, lastSavedId, data);
        return data;
      });
    }, sections, function (cached) { currentAI = cached; });
  }

  function strengthTag(st) {
    if (!st) return '';
    return '<span class="str r' + st.rank + '" title="' + st.note + '">' + st.cn + ' ' + st.en + '</span>';
  }

  // The compendium's rating for each stem pair in a palace.
  function stemComboHtml(pa) {
    var D = window.QPData, list = [D.stemCombo(pa.heavenStemCn, pa.earthStemCn)];
    if (pa.heavenStem2Cn) list.push(D.stemCombo(pa.heavenStem2Cn, pa.earthStemCn));
    if (pa.earthStem2Cn) list.push(D.stemCombo(pa.heavenStemCn, pa.earthStem2Cn));
    return list.filter(Boolean).map(function (c) {
      return '<div><b>' + c.heaven + '加' + c.earth + '</b> ' + c.cn + ' <small>' + esc(c.en) + '</small> <span class="' + c.rating + '-t">' + c.ratingCn + ' ' + c.ratingEn + '</span></div>';
    }).join('');
  }

  // Full detail card for one palace.
  function palaceCard(pa, mansion, highlight, life) {
    if (!pa) return '';
    var areas = life && life[pa.num], rim = window.QPSystems.qimenRimHex(pa);
    return '<div class="pcard ' + (pa.ring || '') + (highlight ? ' hit' : '') + '">' +
      '<h4>Palace ' + pa.num + ' ' + pa.name + ' &middot; ' + pa.dir +
      '<span>' + pa.elementCn + ' &middot; ' + (pa.ring === 'inner' ? 'inner' : 'outer') + ' palace</span></h4>' +
      '<div class="pgrid">' +
      (areas ? '<div><b>Life area</b> ' + areas.map(function (a) { return a.en + ' ' + a.cn; }).join(' &middot; ') + '</div>' : '') +
      '<div><b>Heaven stem</b> ' + (pa.heavenStemCn || '—') + ' ' + strengthTag(pa.heavenStemStrength) +
        (pa.heavenStem2Cn ? ' <small>+ ' + pa.heavenStem2Cn + ' (centre stem, rides with 天芮)</small>' : '') + '</div>' +
      '<div><b>Earth stem</b> ' + (pa.earthStemCn || '—') + ' ' + strengthTag(pa.earthStemStrength) +
        (pa.earthStem2Cn ? ' <small>+ ' + pa.earthStem2Cn + ' (centre stem, lodged in 坤)</small>' : '') + '</div>' +
      stemComboHtml(pa) +
      '<div><b>Star</b> ' + (pa.starCn || '—') + ' ' + strengthTag(pa.starStrength) +
        (pa.star2Cn ? ' <small>+ ' + pa.star2Cn + ' (centre star, rides with 天芮)</small>' : '') + '</div>' +
      (pa.hostGuest ? '<div><b>Host and Guest</b> ' + pa.hostGuest.cn + ' ' + pa.hostGuest.en + ' <small>' + pa.hostGuest.earth + ' ' + pa.hostGuest.earthStage.cn + ' at home. ' + esc(pa.hostGuest.note) + '</small></div>' : '') +
      '<div><b>Door</b> ' + (pa.gate || '—') + ' ' + strengthTag(pa.gateStrength) +
        (pa.gate && pa.gatePalace ? ' <small>' + pa.gatePalace.cn + ' ' + pa.gatePalace.en + ': ' + esc(pa.gatePalace.note) + '</small>' : '') + '</div>' +
      '<div><b>Deity</b> ' + (pa.spirit || '—') + ' ' + strengthTag(pa.spiritStrength) + '</div>' +
      (rim ? '<div><b>Rim hexagram</b> ' + rim.name + ' ' + esc(rim.nameEn) + ' <small>' + rim.number + ' of 64. ' + pa.starCn + ' ' + rim.upper + ' ' + rim.upperEn + ' over ' + pa.gate + ' ' + rim.lower + ' ' + rim.lowerEn + '. Numbers ' + rim.top + ' and ' + rim.period + '.</small></div>' : '') +
      '<div><b>House branch</b> ' + (pa.branches.join(' ') || '—') + '</div>' +
      '<div><b>Void 空亡</b> ' + (pa.isEmpty ? '<span style="color:var(--cinnabar)">yes</span>' : 'no') + '</div>' +
      '<div><b>Envoy 值使</b> ' + (pa.isEnvoy ? '<span style="color:var(--brass)">yes</span>' : 'no') + '</div>' +
      (mansion ? '<div><b>Constellation</b> ' + mansion.cn + '宿 ' + mansion.en + '</div>' : '') +
      '<div><b>Chief star</b> ' + (pa.isChief ? '<span style="color:var(--celadon)">yes</span>' : 'no') + '</div>' +
      '</div></div>';
  }

  // The Qimen plate: pillar header, hexagram rim, direction frame and nine palaces.
  var QB_TRAD = { '济':'濟','谦':'謙','随':'隨','过':'過','壮':'壯','损':'損','蛊':'蠱','丰':'豐','观':'觀','遁':'遯','离':'離','兑':'兌','剥':'剝','归':'歸','涣':'渙','复':'復','贲':'賁','颐':'頤','无':'無','讼':'訟','师':'師','临':'臨','晋':'晉','节':'節','渐':'漸','畜':'畜','辅':'輔','伤':'傷','惊':'驚','开':'開','门':'','阴':'陰' };
  function qbT(s) { return String(s || '').split('').map(function (c) { return QB_TRAD[c] === undefined ? c : QB_TRAD[c]; }).join(''); }
  var QB_DEITY = { '值符':['符','Chief',1], '腾蛇':['蛇','Snake',0], '太阴':['陰','Moon',1], '六合':['合','Harmony',1], '白虎':['虎','Tiger',0], '玄武':['玄','Tortoise',0], '九地':['地','Earth',1], '九天':['天','Heaven',1], '勾陈':['陳','Hook',1], '朱雀':['雀','Phoenix',0] };
  var QB_STEM_PY = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'], QB_ELEM = ['Wood','Fire','Earth','Metal','Water'];
  var QB_BR_PY = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'], QB_BR_AN = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
  var QB_BR_EL = ['Yang Water','Yin Earth','Yang Wood','Yin Wood','Yang Earth','Yin Fire','Yang Fire','Yin Earth','Yang Metal','Yin Metal','Yang Earth','Yin Water'];
  var QB_DIR = { 4:['SE','巽','4木'], 9:['S','離','9火'], 2:['SW','坤','2土'], 3:['E','震','3木'], 7:['W','兌','7金'], 8:['NE','艮','8土'], 1:['N','坎','1水'], 6:['NW','乾','6金'] };
  var QB_MONTH = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  function qbStemPy(ch) { return QB_STEM_PY[C.STEMS.indexOf(ch)] || ''; }
  function qbStemRed(ch) { return '乙丙丁戊'.indexOf(ch) >= 0 && ch !== ''; }
  function qbFig(r) {
    return '<span class="qhex">' + [5, 4, 3, 2, 1, 0].map(function (i) { return '<i' + (r.lines[i] ? '' : ' class="y"') + '></i>'; }).join('') + '</span>';
  }
  // Soft hyphens for the long hexagram words, so the narrow side rims break them at a syllable
  // even where the browser has no hyphenation dictionary.
  var QB_HY = 'Crea-tive Recep-tive Diffi-culty Begin-ning Youth-ful Con-flict To-gether Tread-ing Stand-still Fellow-ship Posses-sion Enthu-siasm Follow-ing Ap-proach Contem-plation Split-ting Inno-cence Nourish-ment Prepon-derance Cling-ing Influ-ence Dura-tion Prog-ress Darken-ing Oppo-sition Obstruc-tion Deliver-ance De-crease In-crease Break-through Gather-ing Oppres-sion Revolu-tion Caul-dron Arous-ing Develop-ment Marry-ing Abun-dance Wander-er Disper-sion Limita-tion Comple-tion'.split(' ');
  function qbHy(s) {
    return esc(s).split(' ').map(function (w) {
      for (var i = 0; i < QB_HY.length; i++) if (QB_HY[i].replace('-', '') === w) return QB_HY[i].replace('-', '­');
      return w;
    }).join(' ');
  }
  function qbRim(chart, n, cls) {
    var r = S.qimenRimHex(chart.palacesByNumber[n]);
    if (!r) return '<div class="qrim ' + cls + '"></div>';
    return '<div class="qrim ' + cls + '"><span class="qfig"><b>' + r.top + '</b>' + qbFig(r) + '<b>' + r.period + '</b></span>' +
      '<span class="qnm">' + qbT(r.name) + '<small lang="en">' + qbHy(r.nameEn) + '</small></span></div>';
  }
  function qbTags(chart, res) {
    var out = {};
    if (!res) return out;
    function seat(stem) {
      var ch = C.STEMS[stem], hit = null;
      [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
        var p = chart.palacesByNumber[n];
        if (ch === '甲' ? p.isChief : (p.heavenStemCn === ch || p.heavenStem2Cn === ch)) hit = hit || n;
      });
      return hit;
    }
    function put(pil, t) { var n = seat(pil.stem); if (n) out[n] = (out[n] || '') + t; }
    if (res.type === 'hour' || res.type === 'day') put(res.pillars.day, '<i class="qtg d">日</i>');
    if (res.type === 'hour') put(res.pillars.hour, '<i class="qtg h">時</i>');
    return out;
  }

  function plateHtml(chart, formations, highlight, onClickAttr, life, ctx) {
    var byPalace = {}, res = ctx && ctx.res, tags = qbTags(chart, res);
    var horse = res && res.basis ? S.horsePalace(res.basis.hourBranch) : 0;
    (formations || []).forEach(function (f) {
      (f.palaces || []).forEach(function (n) { (byPalace[n] = byPalace[n] || []).push(f); });
    });
    function marks(n) {
      var p = chart.palacesByNumber[n];
      return (p.isEmpty ? '<i class="qmk" title="Void (DE)">空</i>' : '') + (horse === n ? '<i class="qmk" title="Horse Star (HS)">馬</i>' : '');
    }
    function lab(n) { var d = QB_DIR[n]; return '<b>' + d[0] + '</b><span>' + d[1] + '</span><small>' + d[2] + '</small>'; }
    function cell(n) {
      var pa = chart.palacesByNumber[n];
      if (n === 5) {
        return '<div class="qc qmid"' + (onClickAttr ? ' data-pal="5"' : '') + '><span class="qi"><b>' + (pa.heavenStemCn || pa.earthStemCn || '') + '</b></span>' +
          '<div class="qju"><b>' + chart.ju + '</b><small>' + (chart.dun === '阴遁' ? 'Yin' : 'Yang') + ' Ju</small></div>' +
          '<span class="qi"><b>' + (pa.earthStemCn || '') + '</b></span></div>';
      }
      var d = QB_DEITY[pa.spirit] || [pa.spirit || '', '', 0], star = (pa.starCn || '').slice(1);
      var fs = (byPalace[n] || []).filter(function (f) { return f.category === 'auspicious' || f.category === 'hostile'; });
      var cls = 'qc' + ([1, 8, 3, 4].indexOf(n) >= 0 ? ' sh' : '') + (highlight && highlight.indexOf(n) >= 0 ? ' hit' : '');
      var red = function (x) { return x ? ' r' : ''; }, starRed = '英辅心任'.indexOf(star) >= 0, doorRed = pa.gateRank === 2 || pa.gate === '景门';
      // Glyphs on the first line; the star's English centred on the next; the deity's right-aligned below it,
      // so the labels never share a line in a narrow palace.
      return '<div class="' + cls + '"' + (onClickAttr ? ' data-pal="' + n + '"' : '') + '>' +
        '<div class="qr qtop">' +
          '<span class="qg g1' + red(qbStemRed(pa.heavenStemCn)) + '">' + (pa.heavenStemCn || '') + '</span>' +
          '<span class="qg g2' + red(starRed) + '">' + qbT(star) + (pa.star2Cn ? '<em>禽</em>' : '') + '</span>' +
          '<span class="qg g3' + red(d[2]) + '">' + d[0] + '</span>' +
          '<small class="qen s' + red(starRed) + '">' + esc(pa.starEn || '') + (pa.star2Cn ? ' + Bird' : '') + '</small>' +
          '<span class="qsub">' + (pa.heavenStem2Cn ? '<em>' + pa.heavenStem2Cn + '</em>' : '') + (tags[n] || '') + (pa.isChief ? '<i class="qtg j">甲</i>' : '') + '</span>' +
          '<small class="qen d' + red(d[2]) + '">' + d[1] + '</small>' +
        '</div>' +
        (fs.length ? '<div class="qfs">' + fs.slice(0, 5).map(function (f) {
          return '<span class="' + (f.category === 'auspicious' ? 'r' : '') + '" title="' + esc(f.nameEn || '') + '">' + qbT(f.name) + '</span>'; }).join('') + '</div>' : '') +
        (life && life[n] ? '<div class="qlf">' + life[n].map(function (a) {
          return '<span' + (a.key === 'destiny' ? ' class="me"' : '') + '>' + a.en + '</span>'; }).join('') + '</div>' : '') +
        '<div class="qr qbot">' +
          '<span class="qg g1' + red(qbStemRed(pa.earthStemCn)) + '">' + (pa.earthStemCn || '') + '</span>' +
          '<span class="qg g2' + red(doorRed) + '">' + (pa.isEnvoy ? '<i class="qtg e">使</i>' : '') + qbT(pa.gate) + '</span>' +
          '<span class="qno">' + S.qimenFlownNumber(chart.ju, n) + '</span>' +
          '<span class="qsub">' + (pa.earthStem2Cn ? '<em>' + pa.earthStem2Cn + '</em>' : '') + '</span>' +
          '<small class="qen s' + red(doorRed) + '">' + esc(pa.gateEn || '') + '</small>' +
        '</div>' +
        '</div>';
    }
    var theme = ctx && ctx.natal ? ' natal' : res && res.type === 'day' ? ' day' : '';
    return '<div class="qwrap" lang="en"><div class="qb' + theme + '">' +
      qbRim(chart, 9, 't') +
      '<div class="qside">' + qbRim(chart, 4, 'c') + qbRim(chart, 3, 'm') + qbRim(chart, 8, 'c') + '</div>' +
      '<div class="qf">' +
        '<div class="qst"><div>' + lab(4) + marks(4) + '</div><div class="ct">' + marks(9) + lab(9) + '</div><div class="rt">' + marks(2) + lab(2) + '</div></div>' +
        '<div class="qmidrow"><div class="qsd">' + lab(3) + marks(3) + '</div><div class="qg">' + [4, 9, 2, 3, 5, 7, 8, 1, 6].map(cell).join('') + '</div><div class="qsd">' + lab(7) + marks(7) + '</div></div>' +
        '<div class="qst"><div>' + lab(8) + marks(8) + '</div><div class="ct">' + marks(1) + lab(1) + '</div><div class="rt">' + marks(6) + lab(6) + '</div></div>' +
      '</div>' +
      '<div class="qside">' + qbRim(chart, 2, 'c') + qbRim(chart, 7, 'm') + qbRim(chart, 6, 'c') + '</div>' +
      qbRim(chart, 1, 'b') +
      '</div></div>' +
      '<div class="hint plate-key">Red marks the favourable symbols and black the harder ones. Rim hexagram: the Star over the Door. Large number: the Ju in the centre, flown through the palaces. 空 on the frame marks a void palace, 馬 the Horse Star.</div>';
  }

  function qbClock(t) {
    var m = /^(\d+):(\d+)$/.exec(t); if (!m) return t;
    var h = +m[1], mi = m[2];
    return (h % 12 || 12) + (mi === '00' ? '' : ':' + mi) + (h < 12 ? ' AM' : ' PM');
  }
  // Date banner and pillars above the plate.
  function qbHead(res, natal) {
    var w = res.when, p = res.pillars, type = res.type, when = '';
    var date = ('0' + w.d).slice(-2) + ' ' + QB_MONTH[w.m - 1] + ' ' + w.y;
    if (natal) when = date + ' | ' + qbClock(('0' + w.hour).slice(-2) + ':' + ('0' + w.min).slice(-2));
    else if (type === 'hour') when = date + ' | ' + p.hourRange.split('–').map(qbClock).join(' - ');
    else if (type === 'day') when = date;
    else if (type === 'month') when = QB_MONTH[w.m - 1] + ' ' + w.y + ' | ' + p.month.cn + ' MONTH';
    else when = p.solarYear + ' | ' + p.year.cn + ' YEAR';
    var cols = type === 'hour' ? [['時','HOUR',p.hour,'Children / Investments'],['日','DAY',p.day,'Self'],['月','MONTH',p.month,'Career / Parents'],['年','YEAR',p.year,'Friends / Grandparents']]
      : type === 'day' ? [['日','DAY',p.day,'']] : type === 'month' ? [['月','MONTH',p.month,'']] : [['年','YEAR',p.year,'']];
    var showGod = type === 'hour';
    return '<div class="qwrap"><div class="qhd' + (type === 'day' && !natal ? ' day' : '') + '"><div class="qban">' + when + '</div>' +
      '<div class="qpil" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,' + (cols.length > 1 ? '1fr' : '12em') + ')) 2em;justify-content:center">' +
      cols.map(function (c) { return '<div class="qph"><b>' + c[0] + '</b> ' + c[1] + '</div>'; }).join('') + '<div class="qph qcap"></div>' +
      cols.map(function (c) {
        var god = showGod && c[2] !== p.day ? C.tenGod(p.day.stem, c[2].stem) : null;
        return '<div class="qpc">' + (god ? '<span class="qgod">' + god.cn + '<small>' + esc(god.en) + '</small></span>' : '') +
          '<small>' + c[3] + '</small><b>' + C.STEMS[c[2].stem] + '</b><small>' + QB_STEM_PY[c[2].stem].toUpperCase() + '<br>' + QB_ELEM[Math.floor(c[2].stem / 2)].toUpperCase() + '</small></div>'; }).join('') +
      '<div class="qcap v">天干<small>STEM</small></div>' +
      cols.map(function (c) {
        return '<div class="qpc"><b>' + C.BRANCHES[c[2].branch] + '</b><small>' + QB_BR_PY[c[2].branch].toUpperCase() + '<br>' + QB_BR_AN[c[2].branch].toUpperCase() + '<br>' + QB_BR_EL[c[2].branch].toUpperCase() + '</small></div>'; }).join('') +
      '<div class="qcap v">地支<small>BRANCH</small></div>' +
      '</div></div></div>';
  }
  // Asker (day stem) and Focus Point (hour stem) panels for an hour chart.
  function qbFocus(res) {
    var ch = res.chart, p = res.pillars;
    function seat(stem) {
      var c = C.STEMS[stem], hit = null;
      [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) { var x = ch.palacesByNumber[n]; if (c === '甲' ? x.isChief : (x.heavenStemCn === c || x.heavenStem2Cn === c)) hit = hit || x; });
      return hit;
    }
    function panel(title, stem) {
      var pa = seat(stem), d = pa && (QB_DEITY[pa.spirit] || []), r = pa && S.qimenRimHex(pa);
      if (!pa) return '';
      return '<div class="qfp"><h5>' + title + '</h5><div class="qfst"><b>' + C.STEMS[stem] + '</b><small>' + QB_STEM_PY[stem].toUpperCase() + ' ' + QB_ELEM[Math.floor(stem / 2)].toUpperCase() + '</small></div>' +
        [['Direction', QB_DIR[pa.num][1] + ' ' + pa.dir], ['Deity', (d[0] || '') + ' ' + (d[1] || '')], ['Star', qbT((pa.starCn || '').slice(1)) + ' ' + (pa.starEn || '')],
         ['Door', qbT(pa.gate) + ' ' + (pa.gateEn || '')], ['Hexagram', r ? qbT(r.name) + ' ' + r.nameEn : '']].map(function (x) {
          return '<div class="qfr"><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div>';
    }
    var a = Math.floor(p.day.stem / 2), b = Math.floor(p.hour.stem / 2), A0 = C.STEMS[p.day.stem] + ' ' + QB_ELEM[a], B0 = C.STEMS[p.hour.stem] + ' ' + QB_ELEM[b];
    var rel = a === b ? A0 + ' and ' + B0 + ' are the same element' : C.controls(a, b) ? A0 + ' controls ' + B0 : C.controls(b, a) ? B0 + ' controls ' + A0 : C.produces(a, b) ? A0 + ' feeds ' + B0 : B0 + ' feeds ' + A0;
    return '<div class="qwrap"><div class="qfoc"><div class="qft">FOCUS POINT</div><div class="qfgrid">' + panel('ASKER', p.day.stem) + '<div class="qfrel">' + esc(rel) + '</div>' + panel('FOCUS POINT', p.hour.stem) + '</div></div></div>';
  }


  var ELEM_COLOR = ['#7EA88C', '#C8452F', '#C8A24A', '#D9D2C4', '#5B7FA6'];

  function elemBar(shares) {
    return '<div class="dbar">' + shares.map(function (v, i) {
      return '<i style="width:' + v + '%;background:' + ELEM_COLOR[i] + '"></i>'; }).join('') + '</div>' +
      '<div class="dlegend">' + shares.map(function (v, i) {
        return '<span><span class="dot" style="background:' + ELEM_COLOR[i] + '"></span>' +
          C.ELEM[i] + ' ' + C.ELEM_EN[i] + ' <b>' + v + '%</b></span>'; }).join('') + '</div>';
  }
  function classic(title, body, warn) {
    return '<div class="classic' + (warn ? ' warn' : '') + '"><b>' + title + '</b><span>' +
           esc(body) + '</span></div>';
  }

  /* ---------------- dial ---------------- */
  function drawDial(h) {
    var svg = $('dial');
    var cx = 150, cy = 150, rOuter = 132, rText = 112;
    var cur = h.pillars.hourBranch;
    var parts = ['<title id="dialTitle">The twelve double-hours, with the present hour marked</title>'];
    parts.push('<circle class="ring-bg" cx="150" cy="150" r="132"/>');
    parts.push('<circle class="ring-bg" cx="150" cy="150" r="92"/>');

    parts.push('<g class="sweep">');
    for (var i = 0; i < 12; i++) {
      // Zi (0) at the top, moving clockwise
      var ang = (i / 12) * 2 * Math.PI - Math.PI / 2 + Math.PI / 12;
      var a2 = ang - Math.PI / 12;
      var x1 = cx + Math.cos(a2) * 92, y1 = cy + Math.sin(a2) * 92;
      var x2 = cx + Math.cos(a2) * rOuter, y2 = cy + Math.sin(a2) * rOuter;
      parts.push('<line class="tick' + (i === cur ? ' now' : '') + '" x1="' + x1.toFixed(1) +
                 '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>');
      var tx = cx + Math.cos(ang) * rText, ty = cy + Math.sin(ang) * rText;
      var cls = i === cur ? 'branch now' : (i < cur ? 'branch past' : 'branch');
      parts.push('<text class="' + cls + '" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '">' +
                 C.BRANCHES[i] + '</text>');
    }
    parts.push('</g>');
    svg.innerHTML = parts.join('');

    var v = h.score >= 7 ? 'good' : h.score >= 4 ? 'mixed' : 'guard';
    $('dialCore').innerHTML =
      '<div class="gz">' + C.STEMS[h.hourPillar.stem] + C.BRANCHES[h.hourPillar.branch] + '</div>' +
      '<div class="range">' + h.range + '</div>' +
      '<div class="verdict ' + v + '">' + h.label + ' · ' + h.score + '/10</div>';
  }

  /* ---------------- screens ---------------- */
  function renderNow() {
    var dt = now();
    var h = G.hourly(dt, user);
    var d = G.daily(dt, user);
    drawDial(h);

    var strip = '<div class="hours">' + d.hours.map(function (x) {
      var cls = x.score >= 7 ? 'g' : x.score >= 4 ? 'm' : 'b';
      var isNow = x.branch === h.pillars.hourBranch;
      return '<div class="hr ' + cls + (isNow ? ' now' : '') + '">' +
             '<div class="b">' + x.branchCn + '</div>' +
             '<div class="s">' + x.range.slice(0, 5) + '</div>' +
             '<div class="bar" style="width:' + (x.score * 10) + '%"></div></div>';
    }).join('') + '</div>';

    var q = h.qimen;
    var html =
      advice(h.do, h.avoid) +
      block('This hour in the Qimen plate', h.qimen.dun + ' · ju ' + q.ju + ' · ' + q.yuanEn + ' yuan',
        rows([
          ['Gate', h.gate + ' <small>' + h.gateEn + ' Gate</small>'],
          ['Star', h.star + ' <small>' + (q.palaces.filter(function(x){return x.isDuty;})[0]||{}).starEn + '</small>'],
          ['Spirit', h.spirit],
          ['Face this way', '<b style="color:var(--celadon)">' + h.bestDirection + '</b>' +
            '<small>' + (q.best[0] ? q.best[0].gate + ' sits here' : '') + '</small>'],
          ['Avoid this way', '<b style="color:var(--cinnabar)">' + h.worstDirection + '</b>' +
            '<small>' + (q.worst[0] ? q.worst[0].gate + ' sits here' : '') + '</small>']
        ])) +
      block('The day around this hour', longDate(dt),
        strip + '<div class="panel" style="margin-top:10px">' +
        '<div style="font-size:.9rem;line-height:1.7">Strongest hours today: <b style="color:var(--celadon)">' +
        d.bestHours.map(function (x) { return x.branchCn + ' ' + x.range; }).join(' · ') +
        '</b><br>Weakest: <b style="color:var(--cinnabar)">' +
        d.worstHours.map(function (x) { return x.branchCn + ' ' + x.range; }).join(' · ') + '</b></div></div>');

    $('nowBody').innerHTML = html;
  }

  var almanacH = 'day';
  var almanacDate = null;      // null = today; set by the picker

  function almanacWhen() {
    if (!almanacDate) return now();
    var d = fromISO(almanacDate);
    var t = now();
    // Keep the live clock only when reading today, so "now" stays meaningful.
    if (isoOf(d) === isoOf(t)) return t;
    d.hour = 12; d.min = 0;
    return d;
  }

  function almanacPicker(dt) {
    var isToday = isoOf(dt) === isoOf(now());
    return '<div class="panel" style="margin-bottom:14px">' +
      '<div class="picker"><div><label for="alDate">Reading for</label>' +
      '<input id="alDate" type="date" value="' + isoOf(dt) + '"></div>' +
      '<div><label>&nbsp;</label><button class="btn ghost" id="alToday"' +
      (isToday ? ' disabled style="opacity:.45"' : '') + ' style="margin-top:0;padding:11px">' +
      'Back to today</button></div></div>' +
      '<div class="hint">' + (isToday
        ? 'Showing today. Pick another date to read the day, the seven days from it, its solar month and its year.'
        : 'Showing ' + longDate(dt) + '. The week runs seven days from this date; the month and year are the ones containing it.') +
      '</div></div>';
  }

  function wireAlmanacPicker() {
    if ($('alDate')) $('alDate').onchange = function () {
      almanacDate = $('alDate').value || null; renderAlmanac();
    };
    if ($('alToday')) $('alToday').onclick = function () {
      almanacDate = null; renderAlmanac();
    };
  }

  function renderAlmanac() {
    var dt = almanacWhen(), host = $('almanacBody');
    if (almanacH === 'day') {
      var d = G.daily(dt, user);
      var p = d.pillars;
      host.innerHTML = almanacPicker(dt) +
        block(longDate(dt), 'Lunar ' + d.lunar.month + '/' + d.lunar.day + (d.lunar.leap ? ' (leap)' : ''),
          pillarCols(p, false) +
          '<div class="meter ' + (d.score >= 68 ? 'good' : d.score < 45 ? 'bad' : '') +
          '"><i style="width:' + d.score + '%"></i></div>' +
          '<div style="font-size:.85rem;color:var(--muted);margin-top:7px">' + d.label +
          ' · ' + d.score + '/100</div>') +
        advice(d.do, d.avoid) +
        block('Almanac reading', '',
          rows([
            ['Day officer', d.officer.cn + ' <small>' + d.officer.en + '</small>'],
            ['Duty spirit', d.duty.cn + ' <small>' + (d.duty.yellow ? 'Yellow path — favourable' : 'Black path — guarded') + '</small>'],
            ['Lunar mansion', d.mansion.cn + '宿 <small>' + d.mansion.en +
              (d.mansion.auspicious ? ' — auspicious' : ' — inauspicious') + '</small>'],
            ['Solar term', d.term.name + ' <small>' + d.term.en + '</small>'],
            ['Clashes', d.clashAnimal + ' <small>people of this sign take extra care</small>'],
            ['Void branches', d.voids.join(' ') + ' <small>matters begun here tend not to hold</small>'],
            ['Day sound', p.day.nayin]
          ])) +
        block('Classical date selection', 'Dong Gong activities and the ruling mansion',
          '<div class="advice"><section class="do"><h3>宜 Suitable</h3><ul>' +
          (d.classical.officerSuitable.length
            ? d.classical.officerSuitable.map(function (a) {
                return '<li>' + a + ' <span style="color:var(--muted)">' + C.activityEn(a) + '</span></li>'; }).join('')
            : '<li>—</li>') +
          '</ul></section><section class="avoid"><h3>忌 Avoid</h3><ul>' +
          (d.classical.officerUnsuitable.length
            ? d.classical.officerUnsuitable.map(function (a) {
                return '<li>' + a + ' <span style="color:var(--muted)">' + C.activityEn(a) + '</span></li>'; }).join('')
            : '<li>—</li>') +
          '</ul></section></div>' +
          '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' +
          '<b style="color:var(--brass)">' + d.mansion.cn + '宿</b> — ' + d.mansion.en +
          (d.mansion.animal ? ' · ' + d.mansion.animal + ' group' : '') + '<br>' +
          '宜 ' + (d.classical.mansionSuitable.join('、') || '—') + '<br>' +
          '忌 ' + (d.classical.mansionUnsuitable.join('、') || '—') + '</div>') +
        block('Today\'s hexagram', 'cast from the day\'s time numbers',
          '<div class="panel"><div style="font-size:1.5rem;color:var(--brass)">' +
          d.hexagram.name + ' · ' + d.hexagram.nameEn + '</div>' +
          '<div style="font-size:.86rem;color:var(--muted);margin-top:6px">Hexagram ' +
          d.hexagram.number + ' — ' + d.hexagram.upper + ' over ' + d.hexagram.lower +
          ', line ' + d.hexagram.moving + ' moving, changing to ' + d.hexagram.changedName +
          ' (' + d.hexagram.changedNameEn + ').</div></div>') +
        block('AI reading of the day', 'manifestation, date selection, strategic execution',
          '<div id="aiDaily"></div>');
      wireAlmanacPicker();

      var hNow = G.hourly(dt, user);
      var dyWhen = { y: dt.y, m: dt.m, d: dt.d, hour: now().hour, min: 30 };
      var dyCt = mountCounter('aiDaily', 'daily', { when: dyWhen, year: dt.y, subtitle: 'the year\'s threats on this day\'s plate, at this hour' });
      aiPanel('aiDaily', 'daily', fmt(dt) + '.ct', function (cfg) {
        return window.QPAI.withCounter(dyCt ? counterText(dyCt) : null, function () { return window.QPAI.analyseDaily(cfg, {
          daily: d, qimen: hNow.qimen, hourPillar: hNow.hourPillar,
          hourRange: hNow.range, user: user
        }); });
      }, [
        { label: 'Manifestation 显化', path: 'manifestation.type' },
        { label: 'What to say', path: 'manifestation.whatToSay' },
        { label: 'Why this arises', path: 'manifestation.explanation' },
        { label: 'Date selection 择日', path: 'dataSelection.assessment' },
        { label: 'Suitable for', path: 'dataSelection.suitableFor' },
        { label: 'Defer today', path: 'dataSelection.avoid' },
        { label: 'Best hours', path: 'dataSelection.bestHours' },
        { label: 'Strategic posture', path: 'strategicExecution.posture' },
        { label: 'Tactics', path: 'strategicExecution.tactics' },
        { label: 'Risk notes', path: 'strategicExecution.riskNotes' }
      ]);
    }
    else if (almanacH === 'week') {
      var w = G.weekly(dt, user);
      host.innerHTML = almanacPicker(dt) +
        block(isoOf(dt) === isoOf(now()) ? 'The next seven days' : 'Seven days from ' + longDate(dt),
          w.theme,
          '<div class="rows">' + w.days.map(function (x) {
            var cls = x.score >= 68 ? 'good' : x.score < 45 ? 'bad' : '';
            return '<div class="row"><span class="k">' + WD[x.weekday].slice(0,3) + ' ' + x.d + ' ' +
              MON[x.m-1].slice(0,3) + '<br><small style="color:var(--muted)">' +
              x.pillar.cn + ' · ' + x.officer.cn + '</small></span>' +
              '<span class="v" style="flex:1"><div class="meter ' + cls +
              '"><i style="width:' + x.score + '%"></i></div>' +
              '<small>' + esc(x.do[0] || '—') + '</small></span></div>';
          }).join('') + '</div>') +
        block('Where to place the week', '',
          rows([
            ['Best day', WD[w.best.weekday] + ' ' + w.best.d + ' <small>' + esc(w.best.do.join(', ')) + '</small>'],
            ['Weakest day', WD[w.worst.weekday] + ' ' + w.worst.d + ' <small>' + esc(w.worst.avoid.join(', ')) + '</small>'],
            ['Week average', w.average + '/100']
          ]));
      wireAlmanacPicker();
    }
    else if (almanacH === 'month') {
      var m = G.monthly(dt, user);
      host.innerHTML = almanacPicker(dt) +
        block('Month of ' + m.monthPillar.cn, m.elemEn + ' month · ' + m.term.name,
          rows([
            ['Month pillar', m.monthPillar.cn + ' <small>' + m.monthPillar.en + '</small>'],
            ['Governing star', m.star + ' ' + m.starName + ' <small>' + m.starMeaning + '</small>'],
            ['Next solar term', m.nextTerm ? m.nextTerm.name + ' <small>' +
              fmt(A.jdToLocal(m.nextTerm.jd)) + '</small>' : '—']
          ]) +
          (m.personal ? '<div class="panel" style="margin-top:10px;font-size:.9rem">' +
            esc(m.personal) + '</div>' : '')) +
        advice(m.do, m.avoid) +
        block('Monthly flying stars', 'sectors of your home or office', starGrid(m.grid));
      wireAlmanacPicker();
    }
    else {
      var y = G.yearly(dt, user);
      host.innerHTML = almanacPicker(dt) +
        block('Year of the ' + y.zodiac, y.yearPillar.cn + ' · ' + y.solarYear,
          rows([
            ['Year pillar', y.yearPillar.cn + ' <small>' + y.elemEn + '</small>'],
            ['Governing star', y.star + ' ' + y.starName + ' <small>' + y.starMeaning + '</small>'],
            ['Tai Sui sign', y.taiSui + ' <small>this sign hosts the year</small>'],
            ['Clashing sign', y.clashSign + ' <small>this sign opposes the year</small>']
          ]) +
          '<div class="panel" style="margin-top:10px;font-size:.9rem">' +
            y.personal.map(esc).join('<br>') + '</div>') +
        advice(y.do, y.avoid) +
        block('Annual flying stars', 'holds from Lichun to Lichun', starGrid(y.grid));
      wireAlmanacPicker();
    }
  }

  function starGrid(grid) {
    return '<div class="grid3">' + grid.map(function (row) {
      return row.map(function (c) {
        var cls = [8,9,1,6].indexOf(c.star) >= 0 ? 'good' : [5,2,3,7].indexOf(c.star) >= 0 ? 'bad' : 'mid';
        return '<div class="cell ' + cls + '"><div class="d">' + c.dir + '</div>' +
          '<div class="star">' + c.star + '</div>' +
          '<div class="x">' + c.meaning + '</div></div>';
      }).join('');
    }).join('') + '</div>';
  }

  /* ---------------- Annual forecasts for Zi Wei and Qimen ---------------- */
  var yearSel = { zwds: new Date().getFullYear(), qimen: new Date().getFullYear() };
  var YEAR_SECTIONS = [
    { label: 'The year', path: 'headline' }, { label: 'What the year brings', path: 'theme' },
    { label: 'Career', path: 'career' }, { label: 'Wealth', path: 'wealth' }, { label: 'Relationships', path: 'relationships' },
    { label: 'Health', path: 'health' }, { label: 'Timing', path: 'timing' }, { label: 'Key dates', path: 'keyDates' },
    { label: 'Life areas', path: 'lifeAreas', list: 'areas' }, { label: 'Do', path: 'doList' }, { label: 'Avoid', path: 'avoidList' }, { label: 'What would change this', path: 'caution' }];
  function yearPicker(prefix, year) {
    var now = new Date().getFullYear(), ys = []; for (var y = now; y <= now + 9; y++) ys.push(y);
    return '<div class="chips">' + ys.map(function (y) {
      return '<button class="chip" data-' + prefix + 'yr="' + y + '"' + (y === year ? ' aria-selected="true"' : '') + '>' + y + '</button>'; }).join('') +
      '</div><div class="row" style="gap:8px;align-items:center;margin-bottom:8px"><span class="k">Other year</span><span class="v">' +
      '<input id="' + prefix + 'YearIn" type="number" min="1900" max="2200" value="' + year + '" style="width:110px"> ' +
      '<button class="btn ghost" id="' + prefix + 'YearGo" style="width:auto;display:inline-block;padding:6px 14px;margin:0">Show</button></span></div>';
  }
  function wireYearPicker(prefix, host, go) {
    host.querySelectorAll('[data-' + prefix + 'yr]').forEach(function (b) { b.onclick = function () { go(+b.getAttribute('data-' + prefix + 'yr')); }; });
    $(prefix + 'YearGo').onclick = function () { var y = parseInt($(prefix + 'YearIn').value, 10); if (y >= 1900 && y <= 2200) go(y); };
  }
  // Saves an annual forecast with whatever AI reading exists, and attaches one written later.
  function wireAnnualSave(btnId, kind, stamp, build) {
    var savedId = null;
    $(btnId).onclick = function () {
      var rec = build(); rec.ai = loadNarr(kind, stamp) || null;
      var saved = R.save(user.id, rec);
      $(btnId + '-msg').innerHTML = saved ? '<div class="saved-tick">Saved to your records' + (saved.ai ? ', with the AI reading' : '') +
        '. Find it under Journal &rsaquo; Saved Readings.</div>' : '<div class="err">Could not save — this browser is blocking storage.</div>';
      if (saved) { savedId = saved.id; $(btnId).textContent = 'Saved'; }
    };
    return function (data) { if (savedId) R.attachAI(user.id, savedId, data); };
  }
  var yCls = function (x) { return x >= 1 ? 'good' : x > -1 ? 'mid' : 'bad'; };
  var ySg = function (x) { return '<b class="' + yCls(x) + '-t">' + (x > 0 ? '+' : '') + x + '</b>'; };

  function renderZwdsAnnual(year) {
    var host = $('zwAnnualHost'); if (!host) return;
    yearSel.zwds = year;
    var a = window.QPFib.zwdsAnnual(user, year);
    var zwTm = []; try { zwTm = window.QPQimen.threatMonths(user, year).concat(window.QPQimen.threatMonths(user, year + 1)); } catch (e) { zwTm = []; }
    a.months.forEach(function (m) {
      var d = new Date(m.start + 'T12:00:00'); d.setDate(d.getDate() + 14);
      m.counter = ctMonthFor(zwTm, d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()));
    });
    host.innerHTML = yearPicker('zw', year) +
      '<div class="verdictbar"><span class="big ' + yCls(a.score) + '">' + a.verdict + '</span><span class="sub">' + a.year + ' ' + a.pillarCn +
        ' &middot; nominal age ' + a.age + '<br>flow Life ' + a.lifeScore + ' &middot; decade ' + a.decadeScore + ' &middot; score ' + ySg(a.score) + '</span></div>' +
      rows([['大限 in force', a.decade ? 'Age ' + a.decade.from + '–' + a.decade.to + ' <small>' + esc(a.decade.palace) + ' [' + (a.decade.stars.join('、') || 'empty') + ']</small>' : '—'],
            ['四化 this year', a.hua.map(function (h) { return h.star + h.hua + ' <small>→ natal ' + esc(h.natal || 'off-board') + (h.flow ? ' (flow ' + h.flow + ')' : '') + '</small>'; }).join('<br>')]]) +
      (function () { var ar = areasSafe(function () { return window.QPFib.zwdsAreasYear(user, a); });
        return ar ? lifeAreasHtml(ar, 'Life areas in ' + a.year, 'from the twelve flow-year palaces') : ''; })() +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Flow-year palaces 流年</div>' +
      rows(a.palaces.map(function (p) {
        return [p.label + '<small>' + p.branch + ' &middot; natal ' + esc(p.natal) + '</small>', ySg(p.score) + ' ' + (p.stars.join('、') || '<span style="color:var(--muted)">no major star</span>') +
          (p.notes.length ? '<small>' + esc(p.notes.slice(0, 3).join('; ')) + '</small>' : '')]; })) +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Month by month 流月 &middot; 斗君 in ' + a.douJun.branch +
        ' <small style="color:var(--muted)">(natal ' + esc(a.douJun.natal) + ')</small></div>' +
      rows(a.months.map(function (m) {
        var tag = a.bestMonths.indexOf(m) >= 0 ? ' <small class="good-t">best</small>' : a.worstMonths.indexOf(m) >= 0 ? ' <small class="bad-t">hardest</small>' : '';
        return ['Lunar ' + m.label + ' ' + m.pillar + tag + '<small>' + m.start + ' → ' + m.end + '</small>',
          ySg(m.score) + ' ' + m.branch + ' &middot; natal ' + esc(m.natal.split(' ')[0]) + ' ' + (m.stars.join('、') || '') +
          '<small>' + esc([m.lu, m.ji].filter(Boolean).join(' · ')) + '</small>' + ctMonthHtml(m.counter)];
      })) +
      '<div class="hint">斗君: from the year branch as lunar month 1, count back to your birth month, then forward to your birth ' +
        'hour; that palace is lunar month 1 and each month moves one palace on. A leap month shares the palace of the month before. ' +
        'Score = 0.618 × the month palace (with the month stem\'s 四化) + 0.382 × the flow-year Life palace.</div>' +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Threat check 反制</div><div id="zwThreat"></div>' +
      saveBar('zwAnnSave', 'Save this annual forecast') +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">AI reading of ' + a.year + '</div><div id="aiZwYear"></div>';
    wireYearPicker('zw', host, renderZwdsAnnual);
    renderThreatSummary('zwThreat', year);
    var stamp = 'zw.' + a.year + '.v3';
    var attach = wireAnnualSave('zwAnnSave', 'sysyear', stamp, function () {
      return { kind: 'annual', title: a.year + ' ' + a.pillarCn + ' Zi Wei annual forecast', subtitle: 'Zi Wei 流年 · ' + a.verdict + ' · score ' + a.score,
        when: { date: a.year + '-01-01', range: String(a.year) },
        payload: { system: 'zwds', year: a.year, pillar: a.pillarCn, verdict: a.verdict, score: a.score,
          rows: [['大限', a.decade ? a.decade.palace + ' (' + a.decade.from + '–' + a.decade.to + ')' : '—'],
                 ['四化', a.hua.map(function (h) { return h.star + h.hua + ' → ' + (h.natal || 'off-board'); }).join('; ')]]
            .concat(a.palaces.map(function (p) { return ['流年 ' + p.label, p.score + ' · natal ' + p.natal + ' [' + (p.stars.join('、') || 'empty') + ']']; }))
            .concat([['斗君', a.douJun.branch + ' (natal ' + a.douJun.natal + ')']]),
          months: a.months.map(function (m) { return { pillar: 'Lunar ' + m.label + ' ' + m.pillar, start: m.start, score: m.score,
            god: m.branch + ' ' + m.natal.split(' ')[0] + (m.ji ? ' · ' + m.ji : '') }; }) } };
    });
    aiPanel('aiZwYear', 'sysyear', stamp, function (cfg) { return window.QPAI.analyseZwdsYear(cfg, user, a); }, YEAR_SECTIONS, attach);
  }

  function renderQimenAnnual(year) {
    var host = $('qmAnnualHost'); if (!host) return;
    yearSel.qimen = year;
    var a = window.QPQimen.qimenAnnual(user, year), s = a.seat;
    try { a.threatMonths = window.QPQimen.threatMonths(user, year); } catch (e) { a.threatMonths = null; }
    var qmTm = {}; (a.threatMonths || []).forEach(function (m) { qmTm[m.pillar] = m; });
    host.innerHTML = yearPicker('qm', year) +
      '<div class="verdictbar"><span class="big ' + yCls(a.score) + '">' + a.verdict + '</span><span class="sub">' + a.year + ' ' + a.pillarCn +
        ' year plate &middot; ' + a.plate.dun + ' ju ' + a.plate.ju + '<br>chief ' + a.plate.chief + ' &middot; envoy ' + a.plate.envoy + ' &middot; score ' + ySg(a.score) + '</span></div>' +
      rows([['Your seat', 'Palace ' + s.num + ' ' + s.name + ' &middot; ' + s.dir + '<small>' + s.stem + ' over ' + s.earthStem +
              (s.hidden ? ' (甲 hidden)' : '') + (s.rider ? ' (rides with 天芮)' : '') + '</small>'],
            ['Door / star / deity', (s.gate || '—') + ' &middot; ' + (s.star || '—') + ' &middot; ' + (s.deity || '—') + (s.isEmpty ? ' <small class="bad-t">void</small>' : '')],
            ['Seat quality', ySg(s.score) + '<small>' + esc(s.why.join(', ')) + '</small>'],
            ['The year itself', a.yearStemSeat ? 'Year stem in palace ' + a.yearStemSeat.num + ' ' + a.yearStemSeat.dir + '<small>' + esc(a.yearStemSeat.relation) + '</small>' : '—'],
            ['Best directions', a.bestDirs.map(function (d) { return d.dir + ' ' + ySg(d.score) + ' <small>' + esc(d.why.slice(0, 3).join(', ')) + '</small>'; }).join('<br>')],
            ['Directions to avoid', a.worstDirs.map(function (d) { return d.dir + ' ' + ySg(d.score) + ' <small>' + esc(d.why.slice(0, 3).join(', ')) + '</small>'; }).join('<br>')]]) +
      (function () { var ar = areasSafe(function () { return window.QPQimen.areasYearPlate(user, a.year); });
        return ar ? lifeAreasHtml(ar, 'Life areas in ' + a.year, 'the symbol for each area on the year plate, against where you sit') : ''; })() +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Month plates — where you sit each month</div>' +
      rows(a.months.map(function (m) {
        var isBest = a.best.indexOf(m) >= 0, isWorst = a.worst.indexOf(m) >= 0;
        var tag = isBest ? ' <small class="good-t">best</small>' : isWorst ? ' <small class="bad-t">hardest</small>' : '';
        var ct = ctMonth(qmTm[m.pillar]);
        return [m.pillar + tag + '<small>' + m.start + ' → ' + m.end + '</small>',
          '<div class="plain"><b>In plain words:</b> ' + monthOutlookPlain(m.score, null, isBest ? 'best' : isWorst ? 'worst' : '') + ct.plain + '</div>' +
          '<details class="tech"><summary>Technical detail</summary>' + ySg(m.score) + ' ' + m.dir +
          '<small>' + (m.gate || '—') + ' &middot; ' + (m.star || '—') + ' &middot; ' + (m.deity || '—') + '</small>' + ct.tech + '</details>'];
      })) +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Threat check 反制</div><div id="qmThreat"></div>' +
      saveBar('qmAnnSave', 'Save this annual forecast') +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">AI reading of ' + a.year + '</div><div id="aiQmYear"></div>';
    wireYearPicker('qm', host, renderQimenAnnual);
    renderThreatSummary('qmThreat', year);
    var stamp = 'qm.' + a.year + '.v2';
    var attach = wireAnnualSave('qmAnnSave', 'sysyear', stamp, function () {
      return { kind: 'annual', title: a.year + ' ' + a.pillarCn + ' Qimen annual forecast', subtitle: 'Qimen year plate · ' + a.verdict + ' · score ' + a.score,
        when: { date: a.year + '-01-01', range: String(a.year) },
        payload: { system: 'qimen', year: a.year, pillar: a.pillarCn, verdict: a.verdict, score: a.score,
          rows: [['Plate', a.plate.dun + ' ju ' + a.plate.ju + ', chief ' + a.plate.chief + ', envoy ' + a.plate.envoy],
                 ['Your seat', 'P' + s.num + ' ' + s.dir + ': ' + (s.gate || '-') + ' ' + (s.star || '-') + ' ' + (s.deity || '-') + ' (' + s.score + ')'],
                 ['Best directions', a.bestDirs.map(function (d) { return d.dir + ' ' + d.score; }).join(', ')],
                 ['Avoid', a.worstDirs.map(function (d) { return d.dir + ' ' + d.score; }).join(', ')]],
          months: a.months.map(function (m) { return { pillar: m.pillar, start: m.start, score: m.score, god: m.dir + ' ' + (m.gate || '') }; }) } };
    });
    aiPanel('aiQmYear', 'sysyear', stamp, function (cfg) { return window.QPAI.analyseQimenYear(cfg, user, a); }, YEAR_SECTIONS, attach);
  }

  /* ---------------- Threat check, shared by Strategy › Counter and the annual forecasts ---------------- */
  // 60-JiaZi timing casts many pilot plates, so every check fills it in from this queue after the page has
  // drawn: one job at a time, with a pause between, skipping jobs whose element has left the page.
  var jzQueue = [], jzBusy = false;
  function jzEnqueue(fn) { jzQueue.push(fn); if (!jzBusy) jzNext(); }
  function jzNext() {
    if (!jzQueue.length) { jzBusy = false; return; }
    jzBusy = true;
    setTimeout(function () { var fn = jzQueue.shift(); try { fn(); } catch (e) {} jzNext(); }, 60);
  }

  // The counter check for one month, as a line under the month's row. Months with live threats get a button
  // that works out their 60-JiaZi timing on demand (it casts many pilot plates, so not at page load).
  var jzMonths = {};
  // The month's counter check in two parts sharing one timing job: plain (what to do, in everyday words) and
  // tech (the working). The plain part's timing line fills in when the 60-JiaZi job finishes.
  function ctMonth(m) {
    if (!m) return { plain: '', tech: '' };
    var jzKey = m.year + '-' + m.k + '-' + Math.random().toString(36).slice(2, 7);
    return { plain: ctMonthPlain(m) + (m.live.length ? '<div class="jzPlain" data-jz="' + jzKey + '">' + jiaziPlain(m) + '</div>' : ''),
             tech: ctMonthHtml(m, jzKey) };
  }
  function ctMonthHtml(m, jzKey) {
    if (!m) return '';
    jzKey = jzKey || m.year + '-' + m.k + '-' + Math.random().toString(36).slice(2, 7);
    jzMonths[jzKey] = m;
    var jzBtn = m.live.length ? (m.jiazi ? '<div class="jzOut">' + monthJiaziHtml(m) + '</div>'
      : '<div class="jzOut"><a href="#" class="jzBtn" data-jz="' + jzKey + '" style="font-size:.8rem">60-JiaZi timing for this month (working…)</a></div>') : '';
    if (m.live.length && !m.jiazi) jzEnqueue(function () {
      var a = document.querySelector('.jzBtn[data-jz="' + jzKey + '"]');
      if (!a || m.jiazi) return;
      window.QPQimen.monthJiazi(user, m);
      a.parentNode.innerHTML = monthJiaziHtml(m);
      fillJzPlain(jzKey, m);
    });
    var vcls = { Confirmed: 'bad-t', Flare: 'bad-t', Latent: '', Clear: 'good-t' };
    return '<div style="margin-top:4px;font-size:.8rem">Counter: ' + (m.live.length ? m.live.map(function (h) {
        return '<span class="' + vcls[h.verdict] + '">' + esc(h.label) + ' ' + h.verdict.toLowerCase() + '</span>' +
          (h.dir ? ' <small style="display:inline">' + esc(h.symbol) + ' ' + h.dir + (h.pressing ? ', presses on you' : '') + '</small>' : ''); }).join(' &middot; ') +
        '<small>Hide Door ' + (m.hideDoor ? m.hideDoor.dir + (m.hideDoor.compromised ? ' (compromised)' : '') : '—') + ' &middot; work from ' + (m.workFrom || '—') + '</small>'
      : '<span class="good-t">clear</span> <small style="display:inline">work from ' + (m.workFrom || '—') + '</small>') + jzBtn + '</div>';
  }
  function monthJiaziHtml(m) {
    return (m.jiazi || []).map(function (x) {
      return '<div style="margin-top:6px"><b style="font-size:.8rem">' + esc(x.label) + '</b>' + jiaziHtml(x.timing).replace('60-JiaZi timing 甲子擇時', '60-JiaZi timing') + '</div>';
    }).join('');
  }
  // One delegated handler for every month's timing link, on any page.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('.jzBtn') : null;
    if (!a) return;
    e.preventDefault();
    var m = jzMonths[a.getAttribute('data-jz')], box = a.parentNode;
    if (!m) return;
    box.innerHTML = '<small>Working out the days and hours for this month…</small>';
    setTimeout(function () {
      try { window.QPQimen.monthJiazi(user, m); box.innerHTML = monthJiaziHtml(m) +
        '<small>Regenerate the AI reading of the year to include this month\'s timing.</small>';
        fillJzPlain(a.getAttribute('data-jz'), m); }
      catch (err) { box.innerHTML = '<small class="bad-t">' + esc(err.message) + '</small>'; }
    }, 30);
  });
  // 60-JiaZi timing of a counter-strategy: the defect, the day mechanism, and verified days and hours.
  function jiaziHtml(j) {
    if (!j) return '';
    var head = '<div style="font-size:.82rem;color:var(--brass);margin:10px 0 4px">60-JiaZi timing 甲子擇時</div>';
    if (!j.days) return head + '<div class="hint" style="margin:0">' + esc(j.type === 'Contained' ? 'Contained: ' + j.why : 'No timing intervention: ' + j.why) + '</div>';
    return head + rows([
      ['Defect', j.type + ' <small>' + esc(j.why) + '</small>'],
      ['Mechanism', j.mechanism + ' <small>target palace ' + j.target.dir + ' (' + j.target.branches.join('') + ') &middot; day branches ' + j.dayBranches.join('') +
        ' &middot; hour aims for ' + esc(j.intent) + '</small>'],
      ['Days (' + (j.scope || 'next ' + j.scanned) + ')', j.days.length ? j.days.map(function (d) {
        var fl = d.flags.concat(d.hour ? d.hour.flags : []);
        return d.date.slice(5) + ' ' + d.dayPillar + (d.hour ? ' &middot; ' + d.hour.pillar + ' hour ' + d.hour.range : '') +
          (d.ok ? ' <small class="good-t" style="display:inline">verified</small>' : '') +
          '<small>' + esc(d.mechanism) + (d.hour && d.hour.why.length ? ' &middot; ' + esc(d.hour.why.join('; ')) : '') + '</small>' +
          (fl.length ? '<small class="bad-t">' + esc(fl.join('; ')) + '</small>' : '');
      }).join('<br>') + (j.clean ? '' : '<small class="bad-t">No day in the period passes every check — the best flagged days are shown; weigh the flags or extend the search.</small>')
        : '<small>No matching day in the period scanned.</small>']
    ]);
  }

  /* ---------------- Plain-language layer for the annual forecasts ---------------- */
  // The month rows carry the working (pillars, plates, defects). These turn it into what the month means for the
  // person and whether to take counter-measures, in everyday words, so the technical detail can sit behind a toggle.
  var THREAT_PLAIN = {
    financial:    { risk: 'money going out — losses, poor deals or unexpected costs',
                    act: 'hold off on big purchases, lending, guarantees and new investments, and check bills and contracts twice' },
    legal:        { risk: 'disputes, complaints or trouble with officials and paperwork',
                    act: 'read everything before you sign, keep records of what was agreed, and settle disagreements early and calmly' },
    friction:     { risk: 'clashes with a boss, a client or someone senior',
                    act: 'keep a low profile at work, put decisions in writing and avoid open arguments' },
    health:       { risk: 'tiredness or a dip in health',
                    act: 'rest well, avoid risky or exhausting activities, and see a doctor about anything that does not clear up' },
    relationship: { risk: 'arguments or strain with a partner, family or close friends',
                    act: 'talk things through in private, avoid arguing in public or in writing, and do not make big relationship decisions in a hurry' },
    upheaval:     { risk: 'sudden change and disruption — moves, travel problems, plans falling through',
                    act: 'avoid moves and changes you cannot undo, keep plans flexible and leave spare time when travelling' }
  };
  var VERDICT_PLAIN = {
    Confirmed: 'a real risk right now — take the precautions',
    Latent: 'a risk for this year that is quiet at the moment — a good time to get ahead of it',
    Flare: 'a brief disturbance, likely to pass — postpone what you can and check again later',
    Clear: 'no sign of this risk — nothing to do'
  };
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function upperFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // What the month is like, from the Bazi score (the person's own energy) and the Qimen score (the surroundings).
  function monthOutlookPlain(b, q, tag) {
    var s;
    if (q === null || q === undefined) {
      s = b >= 1 ? 'A supportive month — a good time to move plans forward.'
        : b <= -1 ? 'A harder month — keep things steady and avoid big new commitments.'
        : 'An ordinary month — no strong push either way; routine work is fine.';
    } else if (b >= 1 && q >= 1) {
      s = 'A good month. Your own energy and your surroundings both support you — a good time to push plans forward.';
    } else if (b <= -1 && q <= -1) {
      s = 'A difficult month. Both your own energy and your surroundings point to resistance — keep things steady and avoid big commitments.';
    } else if (b >= 1 && q <= -1) {
      s = 'You have the energy, but your surroundings work against you. Push on with what is in your own hands; be careful in dealings with others.';
    } else if (b <= -1 && q >= 1) {
      s = 'Your surroundings are helpful, but your own energy is low. Lean on help and good opportunities from others; do not over-stretch yourself.';
    } else {
      s = 'An ordinary month — no strong push either way. Routine work is fine; save big moves for a better month.';
    }
    // With both scores, the best/hardest ranking is the Bazi one, so say so where the surroundings may disagree.
    var by = q === null || q === undefined ? ' of the year. ' : ' this year by your own chart. ';
    if (tag === 'best') s = 'One of your strongest months' + by + s;
    if (tag === 'worst') s = 'One of your weakest months' + by + s;
    return s;
  }

  // Whether to take counter-measures this month, and which, from the month's counter check.
  function ctMonthPlain(m) {
    if (!m) return '';
    if (!m.live.length) {
      return '<div class="todo"><b>Counter-measures:</b> none needed this month.' +
        (m.workFrom ? ' For important work or meetings, the ' + m.workFrom + ' side of your home or office is the most supportive.' : '') + '</div>';
    }
    var lines = m.live.map(function (h) {
      var p = THREAT_PLAIN[h.key] || { risk: h.label.toLowerCase(), act: 'be careful in this area' };
      return '<li><b>' + esc(h.label) + '</b> — ' + (h.verdict === 'Confirmed' ? 'a real risk this month' : 'a brief flare-up, likely to pass') +
        (h.pressing ? ', and aimed at you personally' : '') + ': ' + p.risk + '. ' + upperFirst(p.act) + '.' + '</li>';
    }).join('');
    var dirs = [];
    if (m.workFrom) dirs.push('do important work and hold meetings from the ' + m.workFrom + ' side of your home or office');
    var away = m.live.filter(function (h) { return h.dir; }).map(function (h) { return h.dir; })
      .filter(function (d, i, a) { return a.indexOf(d) === i && d !== m.workFrom; });
    if (away.length) dirs.push('keep sensitive matters away from the ' + away.join(' and ') + (away.length > 1 ? ' sides' : ' side') + ', where the trouble sits');
    var hide = m.hideDoor ? (m.hideDoor.compromised
      ? 'This month\'s "hiding" direction (the Hide Door, used to stay out of trouble) is weak, so rely on careful behaviour rather than direction.'
      : 'To keep a low profile, the ' + m.hideDoor.dir + ' is this month\'s "hiding" direction (the Hide Door) — good for private or sensitive work.') : '';
    var real = m.live.some(function (h) { return h.verdict === 'Confirmed'; });
    return '<div class="todo"><b>Counter-measures: ' + (real ? 'yes.' : 'light — brief risks only.') + '</b><ul>' + lines + '</ul>' +
      (dirs.length ? upperFirst(dirs.join('; ')) + '. ' : '') + hide + '</div>';
  }

  // The 60-JiaZi result in everyday words: the best time to deal with each threat, or that it is best left alone.
  function jiaziPlain(m) {
    if (!m.jiazi) return m.live.length ? '<small>Working out the best days to act…</small>' : '';
    var out = m.jiazi.map(function (x) {
      var t = x.timing, label = esc(x.label);
      if (!t || t.type === 'None') return '';
      if (t.type === 'Contained') return '<li>' + label + ': the risk is weak this month — leave it alone rather than stir it up.</li>';
      if (!t.days || !t.days.length) return '<li>' + label + ': no good day to tackle it this month — postpone action on it.</li>';
      var d = t.days.filter(function (x) { return x.ok; })[0] || t.days[0];
      return '<li>' + label + ': if you have to deal with it, the best time is <b>' + d.date + (d.hour ? ', ' + d.hour.range : '') + '</b>' +
        (d.ok ? '.' : ' (no day passes every check; this is the closest).') + '</li>';
    }).join('');
    return out ? '<div class="todo"><b>Best timing:</b><ul>' + out + '</ul></div>' : '';
  }
  function fillJzPlain(jzKey, m) {
    var el = document.querySelector('.jzPlain[data-jz="' + jzKey + '"]');
    if (el) el.innerHTML = jiaziPlain(m);
  }

  // The year in a few plain sentences: overall, the best and hardest months, and the months that need counter-measures.
  function yearPlain(a) {
    var fmt = function (m) { return m.start.slice(5) + ' → ' + m.end.slice(5); };
    var tm = a.threatMonths || [];
    var risky = tm.filter(function (m) { return m.live.some(function (h) { return h.verdict === 'Confirmed'; }); });
    var watch = {};
    risky.forEach(function (m) { m.live.forEach(function (h) { if (h.verdict === 'Confirmed') watch[h.key] = h.label; }); });
    var overall = a.score >= 1 ? 'Overall a supportive year — more doors open than close.'
      : a.score <= -1 ? 'Overall a demanding year — progress comes from care and patience rather than bold moves.'
      : 'Overall a mixed year — good stretches and hard ones, so timing matters more than usual.';
    return '<div class="panel plain"><b>The year at a glance</b>' +
      '<p>' + overall + '</p>' +
      '<p><b>Best months:</b> ' + a.best.map(function (m) { return m.pillar + ' (' + fmt(m) + ')'; }).join(', ') + ' — use these for important moves.</p>' +
      '<p><b>Hardest months:</b> ' + a.worst.map(function (m) { return m.pillar + ' (' + fmt(m) + ')'; }).join(', ') + ' — keep things steady and avoid big commitments.</p>' +
      (risky.length
        ? '<p><b>Counter-measures needed in:</b> ' + risky.map(function (m) { return m.pillar + ' (' + fmt(m) + ')'; }).join(', ') +
          '. Watch for ' + Object.keys(watch).map(function (k) { return lowerFirst((THREAT_PLAIN[k] || { risk: watch[k] }).risk); }).join('; ') +
          '. Each month below says what to do.</p>'
        : '<p><b>Counter-measures:</b> no month shows a confirmed risk this year.</p>') +
      '</div>';
  }

  // The solar month (立春-based) that contains a date, for lunar months.
  function ctMonthFor(tm, isoDate) {
    var hit = null; tm.forEach(function (m) { if (m.start <= isoDate && isoDate <= m.end) hit = m; }); return hit;
  }
  var counterPrefill = null;     // { year } handed to Strategy › Counter by "Open the full check"
  function counterRecord(r, yr, when) {
    return { kind: 'counter', title: 'Threat check ' + yr + ' · ' + isoOf(when) + ' ' + r.hourRange,
      subtitle: r.threats.filter(function (t) { return t.verdict === 'Confirmed'; }).map(function (t) { return t.label; }).join(', ') ||
        'No confirmed threats',
      when: { date: isoOf(when), range: r.hourRange },
      payload: { year: yr, cast: isoOf(when) + ' ' + r.hourRange, plate: r.chart.dun + ' ju ' + r.chart.ju, sources: r.macroSource,
        asker: r.asker.stem + ' in ' + r.asker.dir + ' (P' + r.asker.num + ')',
        hideDoor: r.hideDoor ? r.hideDoor.dir + ' (P' + r.hideDoor.num + ')' + (r.hideDoor.compromised ? ', compromised' : ', usable') : '—',
        workFrom: r.workFrom.map(function (d) { return d.dir; }), avoid: r.avoid.map(function (d) { return d.dir; }),
        threats: r.threats.map(function (t) { var a = t.active; return { label: t.label, cn: t.cn, verdict: t.verdict, severity: t.severity,
          level: t.level, evidence: t.evidence, board: a ? a.symbol + ' in ' + a.dir + ' (' + [a.gate, a.star, a.deity].filter(Boolean).join(', ') +
          ', quality ' + a.quality + (a.pressing ? ', presses on you' : '') + ')' : '—', override: t.override,
          remedy: t.remedy && t.verdict !== 'Clear' ? t.remedy.element + ' — ' + t.remedy.why : null,
          windows: t.windows.map(function (w) { return w.at + ' (' + w.range + ')'; }),
          jiazi: t.jiazi ? (t.jiazi.days ? t.jiazi.type + ' → ' + t.jiazi.mechanism + ' at ' + t.jiazi.target.dir + ' (' + t.jiazi.target.branches.join('') + '): ' +
            t.jiazi.days.map(function (d) { return d.date + ' ' + d.dayPillar + (d.hour ? ' ' + d.hour.pillar + ' hour ' + d.hour.range : '') + (d.ok ? ' ✓' : ' (flagged)'); }).join('; ')
            : t.jiazi.type + ': ' + t.jiazi.why) : null,
          jiaziData: t.jiazi ? JSON.parse(JSON.stringify(t.jiazi)) : null }; }) } };
  }
  // Which threats a question or matter bears on, from the Qimen scenario, the San Cai goal and keywords.
  var FOCUS_SCEN = { direct_wealth: ['financial'], indirect_wealth: ['financial'], budget: ['financial'], promotion: ['friction'],
    finding_job: ['friction'], marriage: ['relationship'], romance: ['relationship'], diagnose: ['health'], cure: ['health'],
    travel: ['upheaval'], logistics: ['upheaval'], exams: ['friction'], learning: ['friction'], dispute: ['legal'],
    negotiate: ['legal', 'financial'], launch: ['financial', 'friction'], restructure: ['friction', 'upheaval'],
    lost_object: ['financial'], lost_person: ['relationship'],
    wealth: ['financial'], career: ['friction'], conflict: ['legal', 'relationship'], pitch: ['friction', 'financial'],
    academic: ['friction'], closing: ['upheaval', 'financial'] };
  var FOCUS_WORDS = [[/money|invest|loan|debt|pay|price|fund|cash|profit|wealth|financ|business|sale/i, 'financial'],
    [/court|legal|law|contract|sue|lawsuit|claim|dispute|police|tax|audit|complian/i, 'legal'],
    [/boss|job|career|promot|work|manager|colleague|office|resign|interview|exam/i, 'friction'],
    [/health|ill|sick|doctor|hospital|surgery|pain|disease|symptom/i, 'health'],
    [/love|marri|wife|husband|partner|relationship|divorce|date|romance|spouse/i, 'relationship'],
    [/move|relocat|travel|migrat|overseas|emigrat|house|property|change/i, 'upheaval']];
  function focusFor(text, id) {
    var f = (FOCUS_SCEN[id] || []).slice();
    FOCUS_WORDS.forEach(function (w) { if (w[0].test(text || '') && f.indexOf(w[1]) < 0) f.push(w[1]); });
    return f;
  }
  // The check as plain lines, for the module's AI prompt.
  function counterText(r, focus) {
    focus = focus || [];
    var ts = r.threats.filter(function (t) { return t.verdict !== 'Clear' || focus.indexOf(t.key) >= 0; });
    return (ts.length ? ts.map(function (t) {
      var a = t.active, w = t.windows[0];
      return '- ' + t.label + (focus.indexOf(t.key) >= 0 ? ' [BEARS ON THIS QUESTION]' : '') + ': ' + t.verdict + ', annual severity ' + t.severity +
        (a ? '; ' + a.symbol + ' in ' + a.dir + ' (' + [a.gate, a.deity].filter(Boolean).join(', ') + (a.pressing ? ', presses on the asker' : '') + ')' : '') +
        '; ' + t.override.split(' — ')[0] + (t.remedy && t.verdict !== 'Clear' ? '; remedy ' + t.remedy.element : '') + (w ? '; next window ' + w.at + ' (' + w.range + ')' : '') +
        (t.jiazi ? '; 60-JIAZI: ' + (t.jiazi.days ? t.jiazi.type + ' → ' + t.jiazi.mechanism + ' at ' + t.jiazi.target.dir + ': ' + (t.jiazi.days.map(function (d) {
          return d.date + ' ' + d.dayPillar + (d.hour ? ' ' + d.hour.pillar + ' hour ' + d.hour.range : '') + (d.ok ? ' verified' : ' flagged'); }).join(', ') || 'no matching day')
          : t.jiazi.type + ' — ' + t.jiazi.why) : '');
    }).join('\n') : '- No threat is live.') + '\n' +
      'Hide Door 杜门: ' + (r.hideDoor ? r.hideDoor.dir + (r.hideDoor.compromised ? ' (compromised)' : '') : '—') +
      '; work from ' + (r.workFrom.map(function (d) { return d.dir; }).join(', ') || '—') + '; avoid ' + (r.avoid.map(function (d) { return d.dir; }).join(', ') || '—') + '.';
  }
  // Adds a counter-check block after the block that holds `anchorId`, and returns the check (or null).
  function mountCounter(anchorId, key, opts) {
    var anchor = $(anchorId); if (!anchor) return null;
    var blk = (anchor.closest ? anchor.closest('.block') : null) || anchor;
    var hostId = 'ct_' + key;
    blk.insertAdjacentHTML('afterend', block('Counter check 反制', opts.subtitle || 'the year\'s threats on this moment\'s plate', '<div id="' + hostId + '"></div>'));
    return renderThreatSummary(hostId, opts.year || (opts.when || now()).y, opts);
  }

  // A compact threat check for one forecast year, against the plate of a moment (default: this double-hour).
  // opts: { when, focus: [threat keys] }. Returns the check, so a screen can pass it to its AI reading.
  function renderThreatSummary(hostId, year, opts) {
    opts = opts || {};
    var host = $(hostId); if (!host) return null;
    var when = opts.when || now(), r, focus = opts.focus || [];
    try { r = window.QPQimen.threatBridge(user, year, when, { days: 5 }); }
    catch (e) { host.innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return null; }
    var vcls = { Confirmed: 'bad', Latent: 'mid', Flare: 'mid', Clear: 'good' };
    var live = r.threats.filter(function (t) { return t.verdict !== 'Clear'; }), hd = r.hideDoor, btn = hostId + 'Save';
    var ordered = r.threats.slice().sort(function (a, b) { return (focus.indexOf(b.key) >= 0) - (focus.indexOf(a.key) >= 0); });
    host.innerHTML =
      '<div class="hint" style="margin-top:0">' + year + '\'s vulnerabilities from Bazi, Zi Wei and the Qimen year plate, tested ' +
        'against the plate of ' + (opts.when ? 'this moment' : 'this double-hour') + ' (' + isoOf(when) + ' ' + r.hourRange + ').' +
        (focus.length ? ' Threats bearing on this matter are marked and listed first.' : '') +
        (!opts.when && year !== when.y ? ' For a later year, open the full check and pick an hour in that year.' : '') + '</div>' +
      rows(ordered.map(function (t) {
        var a = t.active, w = t.windows[0];
        return ['<span class="' + vcls[t.verdict] + '-t">' + t.verdict + '</span>' + (focus.indexOf(t.key) >= 0 ? ' <small class="bad-t" style="display:inline">this matter</small>' : '') +
          '<small>' + esc(t.label) + ' ' + t.cn + ' &middot; severity ' + t.severity + '</small>',
          (a ? esc(a.symbol) + ' in ' + a.dir + ' <small>' + [a.gate, a.deity].filter(Boolean).join(' · ') + (a.pressing ? ' · presses on you' : '') + '</small>' : '—') +
          (t.verdict !== 'Clear' ? '<small>' + esc(t.override.split(' — ')[0]) + (t.remedy ? ' &middot; remedy ' + t.remedy.element : '') +
            (w ? ' &middot; next window ' + w.at.slice(5, 10) + ' ' + w.range : '') + '</small>' : '') +
          (t.verdict !== 'Clear' ? '<div class="plain">' + upperFirst(VERDICT_PLAIN[t.verdict]) + '. ' +
            (THREAT_PLAIN[t.key] ? 'Watch for ' + THREAT_PLAIN[t.key].risk + '. ' +
              (t.verdict === 'Latent' ? 'Use this quiet spell to prepare: ' : 'What to do: ') + THREAT_PLAIN[t.key].act + '.' : '') + '</div>' : '')];
      })) +
      '<details class="tech"><summary>What the verdicts mean</summary>' + ['Confirmed', 'Latent', 'Flare', 'Clear'].map(function (v) {
        return '<div><b class="' + vcls[v] + '-t">' + v + '</b> — ' + VERDICT_PLAIN[v] + '.</div>'; }).join('') +
        '<div style="margin-top:6px"><b>Hide Door</b> — the direction that helps you stay out of trouble: use it for private or sensitive work. ' +
        '<b>Work from</b> — the most supportive directions for important work and meetings. <b>Avoid</b> — directions where the trouble sits.</div></details>' +
      (live.length ? rows([
        ['Hide Door 杜门', hd ? hd.dir + (hd.compromised ? ' <small class="bad-t">compromised</small>' : ' <small>usable</small>') : '—'],
        ['Work from', r.workFrom.map(function (d) { return d.dir; }).join(', ') || '—'],
        ['Avoid', r.avoid.map(function (d) { return d.dir; }).join(', ') || '—']]) : '') +
      (live.length ? '<div id="' + hostId + 'Jz" style="margin:8px 0"><a href="#" id="' + hostId + 'JzGo" style="font-size:.85rem">' +
        '60-JiaZi timing for these threats (next 30 days)</a></div>' : '') +
      '<button class="btn ghost" id="' + hostId + 'Open">Open the full check, with the AI counter-measure plan</button>' +
      saveBar(btn, 'Save this threat check');
    $(hostId + 'Open').onclick = function () {
      // Select the Counter tab first, so the Consult screen renders once, with the year filled in.
      counterPrefill = { year: year }; consultK = 'counter';
      $('segConsult').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.k === 'counter')); });
      show('consult');
    };
    wireAnnualSave(btn, 'threat', year + '.' + isoOf(when) + '.' + r.pillars.hour.i + '.5.q', function () { return counterRecord(r, year, when); });
    if ($(hostId + 'JzGo')) $(hostId + 'JzGo').onclick = function (e) {
      e.preventDefault();
      var box = $(hostId + 'Jz');
      box.innerHTML = '<small>Working out the days and hours…</small>';
      setTimeout(function () {
        try {
          var r2 = window.QPQimen.threatBridge(user, year, when, { days: 5, jiazi: true, jiaziDays: 30 });
          // Carry the timing onto the check already shown, so the screen's AI reading and a save include it.
          r2.threats.forEach(function (t2) { r.threats.forEach(function (t) { if (t.key === t2.key) t.jiazi = t2.jiazi; }); });
          var withJz = r.threats.filter(function (t) { return t.jiazi; });
          box.innerHTML = withJz.length ? withJz.map(function (t) {
            return '<div style="margin-top:6px"><b style="font-size:.82rem">' + esc(t.label) + ' ' + t.cn + '</b>' + jiaziHtml(t.jiazi) + '</div>'; }).join('') +
            '<small>Regenerate this screen\'s AI reading, or save the check, to include this timing.</small>'
            : '<small>No live threat needs a timing intervention.</small>';
        } catch (err) { box.innerHTML = '<small class="bad-t">' + esc(err.message) + '</small>'; }
      }, 30);
    };
    if ($(hostId + 'JzGo')) {
      $(hostId + 'JzGo').textContent = '60-JiaZi timing for these threats (next 30 days) — working…';
      jzEnqueue(function () { var a = $(hostId + 'JzGo'); if (a) a.onclick({ preventDefault: function () {} }); });
    }
    r.focus = focus;
    return r;
  }

  /* ---------------- Seasons › BaZi Luck: personalised annual forecast ---------------- */
  var annualYear = new Date().getFullYear();
  function renderAnnual(year) {
    var host = $('annualHost'); if (!host) return;
    annualYear = year;
    var now = new Date().getFullYear(), a;
    try { a = window.QPBazi.annualForecast(user, year); }
    catch (e) { host.innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
    try { a.threatMonths = window.QPQimen.threatMonths(user, year); } catch (e) { a.threatMonths = null; }
    var tmByPillar = {}; (a.threatMonths || []).forEach(function (m) { tmByPillar[m.pillar] = m; });
    var cls = function (x) { return x >= 1 ? 'good' : x > -1 ? 'mid' : 'bad'; };
    var sg = function (x) { return '<b class="' + cls(x) + '-t">' + (x > 0 ? '+' : '') + x + '</b>'; };
    var years = []; for (var y = now; y <= now + 9; y++) years.push(y);
    lastSavedId = null; currentAI = null;
    host.innerHTML =
      '<div class="chips" id="annChips">' + years.map(function (y) {
        return '<button class="chip" data-yr="' + y + '"' + (y === year ? ' aria-selected="true"' : '') + '>' + y + '</button>'; }).join('') +
      '</div>' +
      '<div class="row" style="gap:8px;align-items:center;margin-bottom:8px"><span class="k">Other year</span>' +
      '<span class="v"><input id="annYear" type="number" min="1900" max="2200" value="' + year + '" style="width:110px">' +
      ' <button class="btn ghost" id="annGo" style="width:auto;display:inline-block;padding:6px 14px;margin:0">Show</button></span></div>' +
      '<div class="verdictbar"><span class="big ' + cls(a.score) + '">' + a.verdict + '</span><span class="sub">' + a.year + ' ' +
        a.pillarCn + ' &middot; ' + esc(a.nayin) + ' &middot; ' + a.zodiac + '<br>' + a.lichun + ' → ' + a.ends + ' &middot; score ' + sg(a.score) +
        '</span></div>' +
      rows([
        ['Year stem', a.pillarCn.charAt(0) + ' ' + a.stemGod.cn + ' <small>' + a.stemGod.en + '</small>'],
        ['Hidden stems', a.hidden.map(function (h) { return h.stem + ' ' + h.god.cn; }).join(' &middot; ') + '<small>main qi first</small>'],
        ['Luck pillar', a.luck ? a.luck.pillar.cn + ' <small>' + a.luck.god.en + ' &middot; ' + a.luck.start + ' → ' + a.luck.end + '</small>' : '—'],
        ['Tai Sui 太歲', a.taiSui ? a.taiSui.cn + ' ' + esc(a.taiSui.en) + '<small>' + esc(a.taiSui.note) + '</small>' : 'No special relation to your sign'],
        ['Four Harms', a.harms.length ? a.harms.map(function (h) { return h.cn + ' <small>' + h.pillar + (h.softened ? ', softened' : '') + '</small>'; }).join('<br>') : 'None'],
        ['Combinations', a.unions.length ? a.unions.map(esc).join('<br>') : 'None'],
        ['Stars', a.stars.length ? a.stars.map(function (s) { return s.cn + ' ' + s.en + ' <small>' + esc(s.note) + '</small>'; }).join('<br>') : 'None'],
        ['Health watch', a.healthWatch.elem + ' <small>' + esc(a.healthWatch.organs) + '</small>'],
        ['Qimen year plate', a.qimenYear ? a.qimenYear.verdict + ' ' + sg(a.qimenYear.score) + '<small>your Day Stem sits ' + a.qimenYear.dir + ' with ' +
          (a.qimenYear.gate || '—') + ', ' + (a.qimenYear.star || '—') + ', ' + (a.qimenYear.deity || '—') + ' &middot; best ' + a.qimenYear.bestDirs.join(', ') +
          ' &middot; avoid ' + a.qimenYear.worstDirs.join(', ') + '</small>' : '—']
      ]) +
      (function () { var ar = areasSafe(function () { return window.QPBazi.areasYear(user, a); });
        return ar ? lifeAreasHtml(ar, 'Life areas in ' + a.year, a.pillarCn + ' year against your chart') : ''; })() +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Month by month &middot; Bazi and Qimen</div>' +
      yearPlain(a) +
      rows(a.months.map(function (m) {
        var isBest = a.best.indexOf(m) >= 0, isWorst = a.worst.indexOf(m) >= 0;
        var tag = isBest ? ' <small class="good-t">best</small>' : isWorst ? ' <small class="bad-t">hardest</small>' : '';
        var ag = m.agree === 'both favour' ? 'good-t' : m.agree === 'both caution' || m.agree === 'they disagree' ? 'bad-t' : '';
        var ct = ctMonth(tmByPillar[m.pillar]);
        return [m.pillar + tag + '<small>' + m.start + ' → ' + m.end + '</small>' + (m.agree ? '<small class="' + ag + '">' + m.agree + '</small>' : ''),
          '<div class="plain"><b>In plain words:</b> ' + monthOutlookPlain(m.score, m.qimen ? m.qimen.score : null, isBest ? 'best' : isWorst ? 'worst' : '') +
            ct.plain + '</div>' +
          '<details class="tech"><summary>Technical detail</summary>' +
          'Bazi ' + sg(m.score) + ' ' + m.god.cn + (m.notes.length ? '<small>' + esc(m.notes.join('; ')) + '</small>' : '') +
          (m.qimen ? '<div style="margin-top:4px">Qimen ' + sg(m.qimen.score) + ' ' + m.qimen.dir + '<small>' + (m.qimen.gate || '—') + ' &middot; ' +
            (m.qimen.star || '—') + ' &middot; ' + (m.qimen.deity || '—') + '</small></div>' : '') + ct.tech + '</details>'];
      })) +
      '<div class="hint">Bazi reads the month\'s pillar against your chart (your own fortune and energy); Qimen reads where your ' +
        'Day Stem sits on that month\'s plate (the environment and the best direction to act). Months where both agree are the ' +
        'firmest calls.</div>' +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Threat check 反制</div><div id="bzThreat"></div>' +
      saveBar('annSave', 'Save this annual forecast') +
      '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">AI reading of ' + a.year + '</div><div id="aiYear"></div>';

    host.querySelectorAll('[data-yr]').forEach(function (b) { b.onclick = function () { renderAnnual(+b.dataset.yr); }; });
    renderThreatSummary('bzThreat', year);
    $('annGo').onclick = function () {
      var y = parseInt($('annYear').value, 10);
      if (y >= 1900 && y <= 2200) renderAnnual(y);
    };
    wireSave('annSave', function () {
      return { kind: 'annual', title: a.year + ' ' + a.pillarCn + ' annual forecast',
        subtitle: a.verdict + ' · score ' + a.score + ' · ' + a.lichun + ' → ' + a.ends,
        when: { date: a.lichun, range: a.lichun + ' → ' + a.ends },
        payload: { year: a.year, pillar: a.pillarCn, nayin: a.nayin, zodiac: a.zodiac, verdict: a.verdict, score: a.score,
          stemGod: a.stemGod.cn + ' ' + a.stemGod.en, hidden: a.hidden.map(function (h) { return h.stem + ' ' + h.god.cn; }),
          luck: a.luck ? a.luck.pillar.cn + ' (' + a.luck.god.en + ')' : null,
          taiSui: a.taiSui ? a.taiSui.cn + ' ' + a.taiSui.en : null,
          harms: a.harms.map(function (h) { return h.cn + ' on ' + h.pillar + (h.softened ? ' (softened)' : ''); }),
          unions: a.unions, stars: a.stars.map(function (s) { return s.cn + ' ' + s.en; }),
          domains: a.domains.map(function (d) { return { label: d.label, score: d.score, why: d.why.join('; ') }; }),
          healthWatch: a.healthWatch.elem + ' — ' + a.healthWatch.organs,
          qimenYear: a.qimenYear ? a.qimenYear.verdict + ' (' + a.qimenYear.score + '), seat ' + a.qimenYear.dir : null,
          months: a.months.map(function (m) { return { pillar: m.pillar, start: m.start, end: m.end, score: m.score,
            god: m.god.cn + (m.qimen ? ' · Qimen ' + (m.qimen.score > 0 ? '+' : '') + m.qimen.score + ' ' + m.qimen.dir + ' ' + (m.qimen.gate || '') : '') +
              (m.agree ? ' · ' + m.agree : '') }; }) } };
    });
    aiPanelSaving('aiYear', 'baziyear', a.year + '.' + a.pillarCn + '.v3',
      function (cfg) { return window.QPAI.analyseBaziYear(cfg, user, a); }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
        { label: 'The year', path: 'headline' },
        { label: 'Counter-measures: are they needed?', path: 'countermeasures' },
        { label: 'What the year brings', path: 'theme' },
        { label: 'Tai Sui and the Four Harms', path: 'taiSui' },
        { label: 'Career', path: 'career' },
        { label: 'Wealth', path: 'wealth' },
        { label: 'Relationships', path: 'relationships' },
        { label: 'Health', path: 'health' },
        { label: 'Study and growth', path: 'study' },
        { label: 'Month by month', path: 'months' },
        { label: 'Key dates', path: 'keyDates' },
        { label: 'Do', path: 'doList' },
        { label: 'Avoid', path: 'avoidList' },
        { label: 'What would change this', path: 'caution' }
      ]);
  }

  function paintNarrStats() {
    var host = $('narrHost'); if (!host) return;
    var s = narrStats();
    host.innerHTML = '<div class="panel" style="font-size:.88rem;line-height:1.7">Every AI reading is kept on this device for this ' +
      'profile and shown again when you reopen it. Regenerating adds a new version and keeps the last ' + NARR_KEEP + '. If storage runs ' +
      'short, the readings written longest ago are removed first. Saved records keep their own copy.</div>' +
      rows([['Readings stored', String(s.readings)], ['Versions in total', String(s.versions)], ['Space used', s.kb + ' KB']]) +
      (s.readings ? '<button class="btn ghost" id="narrClear">Delete all stored AI readings for this profile</button><div id="narrMsg"></div>' : '');
    if ($('narrClear')) $('narrClear').onclick = function () {
      if ($('narrClear').dataset.armed !== '1') {
        $('narrClear').dataset.armed = '1'; $('narrClear').textContent = 'Tap again to delete ' + s.readings + ' readings (saved records are kept)'; return; }
      var n = clearNarr(); paintNarrStats(); $('narrHost').insertAdjacentHTML('beforeend', '<div class="saved-tick">Deleted ' + n + ' stored readings.</div>');
    };
  }

  /* ---------------- Strategy › Forecast: the Question Oracle ---------------- */
  var qFrame = null;      // { protocol, timeframe, options } applied to the next cast
  function strHash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36); }
  function askedKey() { return 'qipath.asked.' + user.id; }
  // Records a cast question; returns the date it was last cast within three days, if it was.
  function noteAsked(q, scen) {
    var norm = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!norm) return null;
    var list = []; try { list = JSON.parse(localStorage.getItem(askedKey()) || '[]'); } catch (e) { list = []; }
    var now = Date.now(), prev = list.filter(function (x) { return x.q === norm && x.s === scen && now - x.t < 3 * 864e5; })[0];
    list = [{ q: norm, s: scen, t: now }].concat(list.filter(function (x) { return now - x.t < 30 * 864e5; })).slice(0, 60);
    try { localStorage.setItem(askedKey(), JSON.stringify(list)); } catch (e) {}
    if (!prev) return null;
    var d = new Date(prev.t);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function paintFrame() {
    var P = window.QPAI.PROTOCOLS;
    if (!$('qFrameBadge')) return;
    $('qFrameBadge').innerHTML = qFrame && P[qFrame.protocol] ? '<div class="hint" style="color:var(--brass)">Framed as ' +
      P[qFrame.protocol].label + (qFrame.timeframe ? ' &middot; ' + esc(qFrame.timeframe) : '') +
      (qFrame.options && qFrame.options.length === 2 ? ' &middot; A: ' + esc(qFrame.options[0]) + ' / B: ' + esc(qFrame.options[1]) : '') +
      ' <a href="#" id="qFrameClear">clear</a></div>' : '';
    if ($('qFrameClear')) $('qFrameClear').onclick = function (e) { e.preventDefault(); qFrame = null; paintFrame(); };
    document.querySelectorAll('#qProto .chip').forEach(function (c) {
      c.setAttribute('aria-selected', String(!!qFrame && c.dataset.proto === qFrame.protocol)); });
  }
  function applyFrame(question, frame, scenario, method) {
    $('qText').value = question;
    qFrame = frame;
    if (scenario && window.QPQimen.SCENARIOS.some(function (s) { return s.id === scenario; })) $('qScen').value = scenario;
    if (method && window.QPQimen.METHODS.some(function (m) { return m.id === method; })) {
      $('qMethod').value = method;
      if ($('qMethod').onchange) $('qMethod').onchange();     // refresh the method note under the list
    }
    paintFrame();
  }
  function wireOracle() {
    var P = window.QPAI.PROTOCOLS;
    document.querySelectorAll('#qProto .chip').forEach(function (c) {
      c.onclick = function () {
        var k = c.dataset.proto;
        $('qProtoNote').textContent = P[k].blurb + ' Fill in the brackets, or type your own and tap Sharpen.';
        if (!$('qText').value.trim() || /\[.*\]/.test($('qText').value)) $('qText').value = P[k].template;
        qFrame = { protocol: k, timeframe: qFrame ? qFrame.timeframe : '', options: [] };
        paintFrame(); $('qText').focus();
      };
    });
    paintFrame();
    $('qSharpen').onclick = function () {
      var raw = $('qText').value.trim(), out = $('qOracle');
      if (raw.length < 6 || /\[.*\]/.test(raw)) {
        out.innerHTML = '<div class="err">Type your question first (fill in any brackets).</div>'; return; }
      if (!aiReady()) {
        out.innerHTML = '<div class="hint">The Question Oracle needs a Gemini or Claude key (Profile screen). Without one, use a ' +
          'question type above: one matter, one time frame with an end date, and for a choice, two real options.</div>';
        return;
      }
      var t = new Date(), today = t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
      $('qSharpen').disabled = true;
      out.innerHTML = '<div class="panel"><div class="empty">Sharpening the question…</div></div>';
      window.QPAI.sharpenQuestion(loadAI(), raw, window.QPQimen.SCENARIOS, user, today, window.QPQimen.METHODS).then(function (o) {
        $('qSharpen').disabled = false;
        var proto = P[o.protocol] ? o.protocol : 'development';
        var sc = window.QPQimen.SCENARIOS.filter(function (s) { return s.id === o.scenario; })[0];
        var mt = window.QPQimen.METHODS.filter(function (m) { return m.id === o.method; })[0];
        var frame = { protocol: proto, timeframe: o.timeframe || '', options: (o.options || []).slice(0, 2) };
        out.innerHTML = '<div class="panel">' +
          '<div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">Question Oracle &middot; ' + P[proto].label +
            ' <small style="color:var(--muted)">' + esc(P[proto].blurb) + '</small></div>' +
          '<div style="font-size:1rem;line-height:1.6;margin-bottom:6px">' + esc(o.question) + '</div>' +
          rows([['Time frame', esc(o.timeframe || '—')], ['Matter type', sc ? sc.nameEn + ' &middot; ' + sc.name : '—'],
                ['Best method', mt ? mt.label + ' &middot; ' + mt.name + (o.methodWhy ? '<small>' + esc(o.methodWhy) + '</small>' : '') : '—']]
            .concat(frame.options.length === 2 ? [['Options', 'A: ' + esc(frame.options[0]) + '<br>B: ' + esc(frame.options[1])]] : [])) +
          '<div class="hint">' + esc(o.why || '') + '</div>' +
          ((o.missing || []).length ? '<div class="hint" style="color:var(--cinnabar)">To sharpen further: ' +
            o.missing.map(esc).join(' &middot; ') + '</div>' : '') +
          '<button class="btn" id="qUse">Use this question</button>' +
          (o.alternatives || []).filter(function (a) { return a && a.question; }).map(function (a, i) {
            return '<button class="btn ghost" data-alt="' + i + '" style="text-align:left;font-size:.85rem;font-weight:400">' +
              esc((P[a.protocol] || P.survey).label) + ': ' + esc(a.question) + '</button>'; }).join('') +
          '</div>';
        $('qUse').onclick = function () { applyFrame(o.question, frame, o.scenario, mt && mt.id); out.innerHTML = ''; };
        out.querySelectorAll('[data-alt]').forEach(function (b) {
          b.onclick = function () {
            var a = o.alternatives[+b.dataset.alt];
            applyFrame(a.question, { protocol: P[a.protocol] ? a.protocol : 'survey', timeframe: o.timeframe || '', options: [] }, o.scenario, mt && mt.id);
            out.innerHTML = '';
          };
        });
      }).catch(function (err) {
        $('qSharpen').disabled = false;
        out.innerHTML = '<div class="notice"><b>The Question Oracle did not run.</b><br>' + esc(err.message) + '</div>';
      });
    };
  }

  /* ---------------- Strategy › Forecast: deep dive on the same chart ---------------- */
  // The thread lives with the cast (its stamp), on the device, so it survives the app closing.
  function deepKey(stamp) { return 'qipath.deep.' + user.id + '.' + stamp; }
  function loadDeep(stamp) { try { return JSON.parse(localStorage.getItem(deepKey(stamp)) || '[]'); } catch (e) { return []; } }
  function saveDeep(stamp, t) { try { localStorage.setItem(deepKey(stamp), JSON.stringify(t)); } catch (e) {} }

  function renderDeepDive(r, stamp) {
    var host = $('fcDeep'); if (!host) return;
    var MAX = window.QPAI.DEEP_MAX, thread = loadDeep(stamp);
    // If this cast has been saved, the record follows the thread as it grows or is cleared.
    function syncRecord() {
      if (!lastSavedId) return false;
      var rec = R.get(user.id, lastSavedId);
      if (!rec || rec.kind !== 'forecast' || (rec.payload || {}).stamp !== stamp) return false;
      return !!R.updatePayload(user.id, lastSavedId, { deepDive: thread });
    }

    function suggestions() {
      var main = loadNarr('forecast', stamp), last = thread[thread.length - 1];
      var list = last ? (last.a.askNext || []) : main ? (main.followUps || []) : [];
      return list.filter(function (q) { return q && !thread.some(function (t) { return t.q === q; }); }).slice(0, 3);
    }
    function paint() {
      var done = thread.length >= MAX;
      host.innerHTML = thread.map(function (t, i) {
        var a = t.a;
        return '<div class="panel"><div style="font-size:.82rem;color:var(--brass);margin-bottom:4px">Deep dive ' + (i + 1) +
          ' &middot; ' + esc(t.q) + '</div>' +
          '<div style="font-size:.95rem;line-height:1.7;white-space:pre-wrap">' + esc(a.answer || '') + '</div>' +
          rows([['On the chart', '<small style="white-space:pre-wrap">' + esc(a.chart || '') + '</small>'],
                ['What to do', '<small style="white-space:pre-wrap">' + esc(a.whatToDo || '') + '</small>'],
                ['Watch out for', '<small style="white-space:pre-wrap">' + esc(a.watchOut || '') + '</small>'],
                ['Next step', '<small style="white-space:pre-wrap">' + esc(a.nextStep || '') + '</small>']]
            .concat(i === thread.length - 1 && a.askAgain ? [['Ask again', '<small>' + esc(a.askAgain) + '</small>']] : [])) +
          notesUsedHtml(a) + '</div>';
      }).join('') +
      (done ? '<div class="notice">This chart has taken ' + MAX + ' follow-ups, which is as far as one cast should go. ' +
          'Act on it, then recast when the reading says to ask again.</div>' :
        '<div class="panel">' +
        (suggestions().length ? '<div style="font-size:.82rem;color:var(--brass);margin-bottom:4px">Suggested follow-ups</div>' +
          suggestions().map(function (q) {
            return '<button class="btn ghost" data-deepq="' + esc(q) + '" style="text-align:left;margin:4px 0;font-size:.85rem;' +
              'font-weight:400;line-height:1.5">' + esc(q) + '</button>'; }).join('') : '') +
        '<label for="deepQ">' + (thread.length ? 'Go deeper' : 'Ask a follow-up on this chart') + '</label>' +
        '<textarea id="deepQ" rows="2" maxlength="300" placeholder="e.g. What does this ask my husband to give up?"></textarea>' +
        '<div class="err" id="deepMsg"></div>' +
        '<button class="btn" id="deepGo">Ask on this chart</button>' +
        (thread.length ? '<button class="btn ghost" id="deepClear">Clear the deep dive</button>' : '') +
        '<div class="hint">Follow-ups are read on the same plate, so they stay tied to your original question. ' +
        'Up to ' + MAX + ' per cast. Saving the cast saves the thread, and follow-ups asked after saving are added to the record.</div></div>');
      host.querySelectorAll('[data-deepq]').forEach(function (b) {
        b.onclick = function () { $('deepQ').value = b.dataset.deepq; $('deepQ').focus(); };
      });
      if ($('deepClear')) $('deepClear').onclick = function () { thread = []; saveDeep(stamp, thread); syncRecord(); paint(); };
      if ($('deepGo')) $('deepGo').onclick = ask;
    }
    function ask() {
      var q = $('deepQ').value.trim();
      if (q.length < 6) { $('deepMsg').textContent = 'Type a follow-up question first.'; return; }
      if (!aiReady()) { $('deepMsg').textContent = 'The deep dive needs a Gemini or Claude key (Profile screen).'; return; }
      $('deepGo').disabled = true; $('deepMsg').textContent = '';
      $('deepGo').insertAdjacentHTML('afterend', '<div class="empty" id="deepWait">Reading the same chart for this follow-up…</div>');
      window.QPAI.deepDive(loadAI(), r, user, loadNarr('forecast', stamp), thread, q).then(function (a) {
        thread.push({ q: q, a: a }); saveDeep(stamp, thread);
        var synced = syncRecord(); paint();
        if (synced) host.insertAdjacentHTML('beforeend', '<div class="saved-tick">Added to your saved record.</div>');
      }).catch(function (err) {
        if ($('deepWait')) $('deepWait').remove();
        $('deepGo').disabled = false; $('deepMsg').textContent = err.message;
      });
    }
    paint();
    // Suggested follow-ups come from the first reading, which may arrive after this panel is drawn.
    var ai = $('aiFc');
    if (ai && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        if (!$('fcDeep')) { mo.disconnect(); return; }
        if (!thread.length && !$('deepGo').disabled) {
          var keep = $('deepQ') ? $('deepQ').value : ''; paint(); if ($('deepQ')) $('deepQ').value = keep; }
      });
      mo.observe(ai, { childList: true });
    }
  }

  /* ---------------- Destiny › Ask: a typed question read against all the charts ---------------- */
  var ASK_EXAMPLES = [
    'What specific area of health should I take care of this year, and how do you recommend that I do it?',
    'I intend to resign this year and look for a new job. I have not found one yet. Should I?',
    'Is this a good year to start a business or a side venture? Which months are best?',
    'When in the next twelve months is the best time to sign a lease or buy property?',
    'What should I focus on in my relationship this year?'
  ];
  var ASK_SECTIONS = [
    { label: 'Bazi', path: 'bazi' }, { label: 'Zi Wei', path: 'zwds' }, { label: 'Qi Men', path: 'qimen' },
    { label: 'Timing', path: 'timing' }, { label: 'What to do', path: 'recommendations' }, { label: 'Caution', path: 'caution' }
  ];
  function askKey() { return 'qipath.ask.' + user.id; }
  function loadAsks() { try { return JSON.parse(localStorage.getItem(askKey()) || '[]'); } catch (e) { return []; } }
  function saveAsks(list) { try { localStorage.setItem(askKey(), JSON.stringify(list.slice(0, 20))); } catch (e) {} }

  function askContext() {
    var Q = window.QPQimen, t = new Date(), now = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate(),
      hour: t.getHours(), min: t.getMinutes() };
    var dRes = Q.chartFor('destiny', null, user.birth);
    return { now: now, bf: window.QPFib.bazi(user), zf: window.QPFib.zwds(user),
      dRes: dRes, dp: Q.destinyProfile(dRes, user), yRes: Q.chartFor('year', now), mRes: Q.chartFor('month', now) };
  }

  function askAnswerHtml(entry) {
    var d = entry.data;
    return '<div class="panel"><div style="font-size:.82rem;color:var(--muted);margin-bottom:6px">' + esc(entry.at) +
      ' &middot; ' + esc(entry.q) + '</div>' +
      '<div class="verdictbar"><span class="big mid">' + esc(d.verdict || '') + '</span>' +
      '<span class="sub">' + esc(d.confidence || '') + '</span></div>' +
      '<div style="font-size:.95rem;line-height:1.75;white-space:pre-wrap;margin-top:10px">' + esc(d.answer || '') + '</div></div>' +
      actionPlanHtml(d) +
      ASK_SECTIONS.map(function (s) {
        var v = d[s.path]; if (!v || (Array.isArray(v) && !v.length)) return '';
        return '<div class="panel"><div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">' + s.label + '</div>' +
          '<div style="font-size:.9rem;line-height:1.75;white-space:pre-wrap">' +
          (Array.isArray(v) ? v.map(function (x, i) { return (i + 1) + '. ' + esc(x); }).join('\n') : esc(v)) + '</div></div>';
      }).join('') +
      conflictsHtml(d) + notesUsedHtml(d) +
      ((d.followUps || []).length ? '<div class="panel"><div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">' +
        'Ask next</div>' + d.followUps.map(function (f) {
          return '<button class="btn ghost askEx" data-q="' + esc(f) + '" style="text-align:left;margin:4px 0;font-size:.85rem;font-weight:400;line-height:1.5">' + esc(f) + '</button>';
        }).join('') + '</div>' : '');
  }

  function renderAsk(host) {
    var asks = loadAsks();
    host.innerHTML =
      block('Ask your charts', 'one question, read against Bazi, Zi Wei and Qi Men',
        '<div class="panel">' +
        '<label for="askQ">Your question</label>' +
        '<textarea id="askQ" rows="4" maxlength="600" placeholder="e.g. ' + esc(ASK_EXAMPLES[1]) + '"></textarea>' +
        '<div class="hint">Add the facts that matter: an offer in hand, savings, symptoms you already know about. ' +
        'The reading uses your natal charts, your current luck periods and this year\'s and this month\'s Qi Men plates.</div>' +
        '<div class="err" id="askMsg"></div>' +
        '<button class="btn" id="askGo">Ask</button></div>' +
        '<div class="panel"><div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">Examples</div>' +
        ASK_EXAMPLES.map(function (q) {
          return '<button class="btn ghost askEx" data-q="' + esc(q) + '" style="text-align:left;margin:4px 0;font-size:.85rem;font-weight:400;line-height:1.5">' + esc(q) + '</button>';
        }).join('') + '</div>') +
      '<div id="askOut"></div>' +
      (asks.length ? block('Earlier questions', 'kept on this device, newest first',
        '<div class="rows">' + asks.map(function (a, i) {
          return '<div class="row" data-ask="' + i + '" style="cursor:pointer"><span class="k">' + esc(a.at) + '</span>' +
            '<span class="v">' + esc(a.q) + '<small>' + esc(a.data.verdict || '') + '</small></span></div>';
        }).join('') + '</div><button class="btn ghost" id="askClear">Clear history</button>') : '');

    function wireExamples(root) {
      root.querySelectorAll('.askEx').forEach(function (b) {
        b.onclick = function () { $('askQ').value = b.dataset.q; $('askQ').focus(); window.scrollTo(0, 0); };
      });
    }
    function showEntry(entry) { $('askOut').innerHTML = askAnswerHtml(entry); wireExamples($('askOut')); }
    wireExamples(host);
    host.querySelectorAll('[data-ask]').forEach(function (r) {
      r.onclick = function () { showEntry(asks[+r.dataset.ask]); $('askOut').scrollIntoView(); };
    });
    if ($('askClear')) $('askClear').onclick = function () { saveAsks([]); renderAsk(host); };

    $('askGo').onclick = function () {
      var q = $('askQ').value.trim();
      $('askMsg').textContent = '';
      if (q.length < 8) { $('askMsg').textContent = 'Type a question first.'; return; }
      if (!aiReady()) {
        $('askOut').innerHTML = '<div class="panel"><div style="font-size:.9rem;line-height:1.7">' +
          'Add a Gemini or Claude API key on the Profile screen to ask a question.</div>' +
          '<button class="btn ghost" id="askProfile">Open Profile</button></div>';
        $('askProfile').onclick = function () { show('profile'); };
        return;
      }
      var btn = $('askGo'); btn.disabled = true;
      $('askOut').innerHTML = '<div class="panel"><div class="empty">Reading your charts for this question. ' +
        'This takes a few seconds.</div><div class="meter"><i style="width:40%"></i></div></div>';
      var ctx;
      try { ctx = askContext(); } catch (e) {
        btn.disabled = false; $('askOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
      var akCt = null, akFocus = focusFor(q, null);
      try { akCt = window.QPQimen.threatBridge(user, now().y, now(), { days: 5, jiazi: true, jiaziDays: 30 }); } catch (e) { akCt = null; }
      window.QPAI.withCounter(akCt ? counterText(akCt, akFocus) : null, function () { return window.QPAI.askCharts(loadAI(), q, user, ctx); }).then(function (data) {
        var t = new Date(), entry = { q: q, at: t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()), data: data };
        asks = [entry].concat(loadAsks()); saveAsks(asks);
        renderAsk(host); $('askQ').value = ''; showEntry(entry); $('askOut').scrollIntoView();
      }).catch(function (err) {
        btn.disabled = false;
        $('askOut').innerHTML = '<div class="notice"><b>The question did not run.</b><br>' + esc(err.message) + '</div>';
      });
    };
  }

  var chartK = 'bazi';
  function renderChart() {
    var host = $('chartBody'), p = user.pillars, b = user.bazi;
    if (chartK === 'bazi') {
      var elemBars = user.deep.counts.map(function (v, i) {
        var max = Math.max.apply(null, user.deep.counts) || 1;
        return '<div class="row"><span class="k">' + C.ELEM[i] + ' ' + C.ELEM_EN[i] + '</span>' +
          '<span class="v" style="flex:1"><div class="meter"><i style="width:' +
          Math.round(v / max * 100) + '%"></i></div><small>' + v + '</small></span></div>';
      }).join('');
      host.innerHTML =
        block('Four Pillars', user.birth.y + '-' + String(user.birth.m).padStart(2,'0') + '-' +
          String(user.birth.d).padStart(2,'0') + ' ' + String(user.birth.hour).padStart(2,'0') + ':' +
          String(user.birth.min).padStart(2,'0'),
          pillarCols(p, true)) +
        block('Day master', b.dayMasterEn,
          rows([
            ['Day master', b.dayMasterCn + ' <small>' + b.dayMasterEn + '</small>'],
            ['Strength', (user.deep.strong ? 'Strong' : 'Weak') + ' <small>' +
              user.deep.strength.verdict + ' · score ' + user.deep.strength.score + '</small>'],
            ['Month command 得令', user.deep.strength.season.cn + ' <small>' +
              user.deep.strength.season.en + (user.deep.strength.commanding ? ' — commands' : ' — does not command') + '</small>'],
            ['Favourable elements', user.deep.favourableCn.join(' ') + ' <small>' +
              user.deep.favourableEn.join(', ') + '</small>'],
            ['Void branches', b.voids.join(' ')],
            ['Animal sign', p.zodiac + ' <small>' + p.zodiacCn + '</small>']
          ])) +
        block('Elemental balance', 'weighted for the birth season', '<div class="rows">' + elemBars + '</div>') +
        (function () {
          var n = areasSafe(function () { return window.QPBazi.nayinAssessment(user, now()); });
          if (!n) return '';
          var tone = function (x) { return x.value > 0 ? 'good-t' : x.value <= -2 ? 'bad-t' : ''; };
          var row = function (x) {
            return [esc(x.pillar) + '<small>' + x.ganzhi + '</small>',
              x.cn + ' <small>' + esc(x.en) + ' · ' + esc(x.area) + '</small><div class="plain">' + esc(x.plain) + '</div>' +
              '<div class="plain"><span class="' + tone(x) + '">' + esc(x.relLabel) + ':</span> ' + esc(x.relText) + '.</div>'];
          };
          var linkTone = function (l) { return l.value > 0 ? 'good-t' : 'bad-t'; };
          return block('Nayin 納音', 'a macro view of your whole life',
            '<div class="plain" style="margin-bottom:8px">' + esc(n.summary) + '</div>' +
            '<div class="plain" style="margin-bottom:8px">' + esc(n.selfText) + '</div>' +
            '<div class="plain" style="margin-bottom:8px"><span class="' + (n.dialogue.value > 0 ? 'good-t' : 'bad-t') + '">Year and Day: ' + esc(n.dialogue.label) + '.</span> ' + esc(n.dialogue.text) + '</div>' +
            '<div class="plain" style="margin-bottom:10px"><b>What to do:</b> ' + esc(n.advice) + '</div>' +
            rows([[ 'Year · life sound<small>' + user.pillars.year.cn + '</small>', n.life.cn + ' <small>' + esc(n.life.en) + ' · ' + esc(n.life.elemEn) + '</small>' ]].concat(n.others.map(row))) +
            '<h3 style="margin:14px 0 6px;font-size:.9rem">Harmony between life stages: ' + esc(n.harmony) + '</h3>' +
            rows(n.links.map(function (l) { return [esc(l.fromStage) + '<small>' + esc(l.from) + ' to ' + esc(l.to) + '</small>', l.fromCn + ' → ' + l.toCn + '<div class="plain"><span class="' + linkTone(l) + '">' + esc(l.label) + ':</span> ' + esc(l.text) + '.</div>']; })) +
            '<h3 style="margin:14px 0 6px;font-size:.9rem">Constitutional resilience: ' + esc(n.resilience) + '</h3>' +
            '<div class="plain">' + esc(n.resilienceText) + (n.missing.length ? ' Missing from your four Nayin: ' + esc(n.missing.join(', ')) + '.' : '') + '</div>' +
            '<h3 style="margin:14px 0 6px;font-size:.9rem">Ten-year phases</h3>' +
            rows(n.phases.map(function (x) { return [esc(x.pillar) + (x.current ? ' <span class="good-t">now</span>' : '') + '<small>' + x.ganzhi + '</small>', x.cn + ' <small>' + esc(x.en) + '</small><div class="plain"><span class="' + tone(x) + '">' + esc(x.relLabel) + '</span></div>']; })) +
            '<div class="hint">Nayin pairs each of the 60 stem and branch combinations with a sound element and an image, following the classical table in texts such as the 三命通會. The Year is your life sound, used for background, life structure and long phases. The Day is your self sound, used for temperament and inner constitution. It plays no part in your Day Master strength, favourable elements or Ten Gods, and it is not used for yearly or daily timing. The plain-English descriptions are QiPath\'s own.' +
            (n.others.concat(n.phases).some(function (x) { return x.rel === 'refined'; }) ? ' "Refines you" comes from a traditional saying we have not confirmed in a classical text, yet it still counts towards your support and resilience results.' : '') + '</div>');
        })() +
        (function () {
          var x = areasSafe(function () { return window.QPXiu.profile(user); });
          if (!x) return '';
          var one = function (m, tag) { return [tag + '<small>' + m.cn + '宿 ' + esc(m.en) + '</small>', '<div class="plain"><b>Inclination:</b> ' + esc(m.mind) + '</div><div class="plain"><b>Work that suits:</b> ' + esc(m.work) + '</div><div class="plain"><b>Hidden theme:</b> ' + esc(m.theme) + '</div>']; };
          return block('Birth mansions 二十八宿', 'inclinations and themes', '<div class="plain" style="margin-bottom:8px">' + esc(x.summary) + '</div>' + rows([one(x.hour, 'Birth hour'), one(x.day, 'Birth day')]) +
            '<div class="hint">The day mansion follows the unbroken 28-day cycle, and the hour mansion follows 七元禽星. The descriptions are QiPath\'s own, drawn from each mansion\'s traditional image, and they sit alongside your Bazi rather than changing it.</div>');
        })() +
        block('滴天髓 reading', 'the classical frame',
          (function () {
            var D = user.deep, out = '';
            out += classic('強弱 Strength — ' + D.strength.verdict,
              'The day master is ' + (D.strong ? 'strong' : 'weak') +
              (D.strength.extreme ? ' (' + D.strength.extreme + ')' : '') +
              '. Season: ' + D.strength.season.cn + ' ' + D.strength.season.en +
              ' in the ' + C.BRANCHES[user.pillars.month.branch] + ' month' +
              (D.strength.commanding ? ', which commands' : ', which does not command') +
              '. Roots: ' + (D.strength.roots.length
                ? D.strength.roots.map(function (r) { return r.at + ' ' + r.branch; }).join(', ')
                : 'none — the day master has no branch to stand on') +
              '. Allies: ' + (D.strength.allyList.join(', ') || 'none') + '.');

            out += classic('調候 Climatic regulation — ' + (D.tiaoHou.satisfied ? 'satisfied' : 'unmet'),
              'Born in a ' + D.tiaoHou.climate + ' month. ' + D.tiaoHou.climateNote +
              '. The 窮通寶鑑 regulator for ' + C.STEMS[D.dayMaster] + ' here is ' +
              D.tiaoHou.stems.join('\u3001') + '. ' +
              (D.tiaoHou.satisfied
                ? 'Present in the chart: ' + D.tiaoHou.present.join('\u3001') +
                  ' — the chart is climatically workable, which matters more than a tidy element count.'
                : 'None of these appear. A chart can be numerically balanced and still be frozen or ' +
                  'parched; supplying ' + D.tiaoHou.stems[0] + ' is the first priority, ahead of ' +
                  'ordinary strength adjustment.'), !D.tiaoHou.satisfied);

            if (D.diagnosis.disease) {
              out += classic('病 The illness — ' + D.diagnosis.disease.cn,
                D.diagnosis.disease.note + ' (' + D.diagnosis.disease.share + '% of the chart.)', true);
              if (D.diagnosis.cure) {
                out += classic('藥 The cure',
                  D.diagnosis.cure.note + ' Primary: ' + D.diagnosis.cure.primaryCn +
                  '. Secondary: ' + D.diagnosis.cure.secondaryCn + '.');
              }
            } else {
              out += classic('中和 Balance',
                'No single element overwhelms the chart. The classics treat this as the most ' +
                'workable condition — outcomes follow effort rather than being forced by the structure.');
            }

            if (D.diagnosis.bridge) {
              out += classic('通關 The bridge — ' + D.diagnosis.bridge.viaCn + ' ' + D.diagnosis.bridge.viaEn,
                D.diagnosis.bridge.note);
            }
            if (D.following) {
              out += classic('從格 Following structure — ' + D.following.cn + ' ' + D.following.en,
                D.following.note + ' ' + D.following.elemEn + ' holds ' + D.following.share +
                '% of the chart. ' + D.following.caution, true);
            }
            return out;
          })()) +

        (function () {
          var QM = window.QPMath, g = QM.baziGraph(user.pillars, user);
          var en = QM.baziEntropy(user.deep, g), fz = QM.baziFuzzy(user), bc = QM.baziChaos(user);
          return quantGroup('Quantitative analysis',
            'clarity ' + ordinal(en.percentile) + ' pct &middot; DM flow ' + g.dayMaster.net + ' &middot; fuzzy strength ' +
            fz.fuzzy + ' &middot; birth time ' + (bc.fragile ? 'fragile' : bc.structuralFlip ? 'sensitive' : 'robust'),
            block('Network topology', 'graph theory on the eight characters', baziGraphHtml(g)) +
            block('Chart clarity', 'Shannon entropy', entropyHtml(en, 'charts')) +
            block('Fuzzy seasonal strength', 'graduated 旺相休囚死 instead of a month-branch switch', fuzzyHtml(fz)) +
            block('Birth-time sensitivity', 'non-linear dynamics — the butterfly effect at the boundaries', baziChaosHtml(bc)));
        })() +

        block('How to use this', '',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">Your favourable elements are <b>' +
          user.deep.favourableEn.join(' and ') + '</b>. Days and hours whose stem carries these elements ' +
          'are scored higher for you throughout the app, and the date picker weights them automatically. ' +
          'Directions, colours and timing that reinforce these elements are the practical lever.</div>') +
        block('AI reading of your Bazi', '', '<div id="aiBazi"></div>');

      wireCharts();
      var bzCt = mountCounter('aiBazi', 'bazi', { subtitle: 'this year\'s threats on the plate of this double-hour' });
      aiPanel('aiBazi', 'bazi', 'math2.ct', function (cfg) {
        return window.QPAI.withCounter(bzCt ? counterText(bzCt) : null, function () { return window.QPAI.analyseBazi(cfg, user); });
      }, [
        { label: 'Character', path: 'character' },
        { label: 'Strengths', path: 'strengths' },
        { label: 'Challenges', path: 'challenges' },
        { label: 'Network topology', path: 'network' },
        { label: 'Clarity, fuzzy strength and birth-time sensitivity', path: 'quantitative' },
        { label: 'Career', path: 'career' },
        { label: 'Relationships', path: 'relationships' },
        { label: 'Current period', path: 'currentPeriod' },
        { label: 'Guidance', path: 'guidance' }
      ]);
    }
    else if (chartK === 'elements') {
      var D = user.deep;
      host.innerHTML =
        block('Five elements in the chart', 'weighted for the month command and hidden stems',
          elemBar(D.shares) +
          '<div class="panel" style="margin-top:12px;font-size:.9rem;line-height:1.7">' +
          'Day master <b style="color:var(--brass)">' + D.dayMasterCn + '</b> — ' +
          (D.strong ? 'strong' : 'weak') + ' (' + D.strength.verdict + ', score ' +
          D.strength.score + ').<br>Favourable: <b style="color:var(--celadon)">' +
          D.favourableCn.join(' ') + '</b> · ' + D.favourableEn.join(', ') + '</div>') +

        block('How the elements land on your life', 'each domain read from its governing gods and palace',
          D.domains.map(function (d) {
            var cls = d.score >= 68 ? 'good' : d.score >= 45 ? 'mid' : 'bad';
            return '<div class="domain"><h4>' + d.label +
              '<span class="band ' + cls + '">' + d.band + '</span></h4>' +
              '<em style="font-style:normal;font-size:.76rem;color:var(--muted)">' + d.cn + '</em>' +
              '<div class="meter ' + (cls === 'good' ? 'good' : cls === 'bad' ? 'bad' : '') +
              '"><i style="width:' + d.score + '%"></i></div>' +
              d.text.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
              (d.stars.length ? '<div class="st">' + d.stars.map(function (st) {
                return '<span class="tag' + (st.tone === 'good' ? ' on' :
                  st.tone === 'caution' ? ' off' : '') + '">' + st.cn + ' ' + st.en + '</span>';
              }).join('') + '</div>' : '') + '</div>';
          }).join('')) +

        (function () { var ar = areasSafe(function () { return window.QPBazi.areasNatal(user); });
          return ar ? lifeAreasHtml(ar, 'Your twelve life areas', 'from your birth chart — a lifelong pattern') : ''; })() +
        block('AI reading of the elements', '', '<div id="aiElem"></div>');

      var elCt = mountCounter('aiElem', 'elements', { subtitle: 'this year\'s threats on the plate of this double-hour' });
      aiPanel('aiElem', 'elements', 'v2.ct',
        function (cfg) { return window.QPAI.withCounter(elCt ? counterText(elCt) : null, function () { return window.QPAI.analyseElements(cfg, user); }); }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
          { label:'Overall shape', path:'overview' },
          { label:'Career', path:'career' },
          { label:'Wealth', path:'wealth' },
          { label:'Relationships', path:'relationships' },
          { label:'Health', path:'health' },
          { label:'Education', path:'education' },
          { label:'What to do with this', path:'guidance' }
        ]);
    }

    else if (chartK === 'relations') {
      var Dr = user.deep, rel = Dr.relations;

      function relList(arr, empty) {
        if (!arr.length) return '<div class="empty">' + empty + '</div>';
        return '<div class="rows">' + arr.map(function (x) {
          return '<div class="row"><span class="k" style="flex:0 0 38%">' + x.cn +
            '<br><small style="color:var(--muted)">' + (x.pair || (x.at || []).join(', ')) +
            '</small></span><span class="v"><small>' + esc(x.note) + '</small></span></div>';
        }).join('') + '</div>';
      }

      var dests = rel.destructions || [], th = window.QPBazi.timingHarms(user);
      var fourCount = [['沖 Clash', rel.clashes.length + rel.stemClashes.length], ['刑 Punishment', rel.punishments.length],
        ['破 Destruction', dests.length], ['害 Harm', rel.harms.length]];
      host.innerHTML =
        block('The Four Harms 四害', 'clash, punishment, destruction and harm',
          rows(fourCount.map(function (x) {
            return [x[0], x[1] ? '<b class="bad-t">' + x[1] + '</b> in the natal chart' : '<span class="good-t">none</span>']; })) +
          '<div class="hint">Each is friction of a different kind: a clash is head-on collision, a punishment prolonged ' +
          'entanglement, a destruction a fracture from inside, a harm quiet undermining. A combination with the same branch ' +
          'softens a clash (貪合忘沖).</div>') +
        block('Four Harms in your timing', 'set off by your current luck pillar and the coming years',
          th.map(function (t) {
            return '<div style="font-size:.85rem;color:var(--brass);margin:8px 0 4px">' + esc(t.label) + '</div>' +
              (t.hits.length ? relList(t.hits.map(function (h) {
                return { cn: h.cn + (h.softened ? ' <small>softened</small>' : ''), pair: h.pillar + ' pillar', note: h.note }; }), '')
                : '<div class="empty">None of the Four Harms against your natal pillars.</div>');
          }).join('')) +
        block('Clashes 沖', 'direct opposition between pillars',
          relList(rel.clashes.concat(rel.stemClashes), 'No clash in this chart. The pillars sit without direct opposition.')) +
        block('Punishments 刑', 'the friction the classics treat as self-generated',
          relList(rel.punishments, 'No punishment present.')) +
        block('Destructions 破', 'fracture from the inside',
          relList(dests, 'No destruction present.')) +
        block('Harms 害', 'quieter friction than a clash',
          relList(rel.harms, 'No harm present.')) +
        block('Unions and frames 合會', 'branches that bind or combine',
          relList(rel.unions.concat(rel.stemUnions), 'No union between pillars.') +
          (rel.frames.length ? '<div style="margin-top:10px">' + relList(rel.frames, '') + '</div>' : '')) +

        block('Stars 神煞', Dr.stars.length + ' present',
          Dr.stars.length
            ? '<div class="panel">' + Dr.stars.map(function (st) {
                return '<div class="star ' + st.tone + '"><span class="g">' + st.cn +
                  '<small>' + st.en + '</small></span><span class="d">' + esc(st.note) +
                  '<em>At: ' + st.at.join(', ') + ' pillar' + (st.at.length > 1 ? 's' : '') +
                  '</em></span></div>';
              }).join('') + '</div>'
            : '<div class="empty">No major star falls in this chart.</div>') +

        block('Twelve stages 十二長生', 'the day master\u2019s condition in each branch',
          '<div class="rows">' + Dr.stages.map(function (st) {
            return '<div class="row"><span class="k">' + st.pillar + ' ' + st.branch +
              '</span><span class="v">' + st.cn + ' <small>' + st.en + ' · strength ' +
              Math.round(st.power * 100) + '%</small></span></div>';
          }).join('') + '</div>') +

        (function () { var ar = areasSafe(function () { return window.QPBazi.areasRelations(user); });
          return ar ? lifeAreasHtml(ar, 'Life areas these relations touch', 'each pillar governs areas of life; timing adds what your luck pillar and the coming years set off') : ''; })() +
        block('AI reading of the relations', '', '<div id="aiRel"></div>');

      var rlCt = mountCounter('aiRel', 'relations', { focus: ['relationship', 'legal'], subtitle: 'this year\'s threats on the plate of this double-hour' });
      aiPanel('aiRel', 'relations', 'v3.ct',
        function (cfg) { return window.QPAI.withCounter(rlCt ? counterText(rlCt, rlCt.focus) : null, function () { return window.QPAI.analyseRelations(cfg, user); }); }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
          { label:'What these relations mean together', path:'overview' },
          { label:'Clashes', path:'clashes' },
          { label:'Punishments and harms', path:'punishments' },
          { label:'Destructions', path:'destructions' },
          { label:'The Four Harms in your timing', path:'timing' },
          { label:'Stars', path:'stars' },
          { label:'Living with it', path:'guidance' }
        ]);
    }

    else if (chartK === 'luck') {
      var l = user.luck;
      var bf = window.QPFib.bazi(user);
      var bh = window.QPMath.baziHarmonics(user);
      var bzCls = function (x) { return x >= 1 ? 'good' : x > -1 ? 'mid' : 'bad'; };
      var signNote = function (yp) {
        return yp.branch === C.branchClash(user.zodiacBranch) ? 'clashes your sign — expect movement'
          : yp.branch === user.zodiacBranch ? 'your own sign year — keep commitments modest'
          : yp.branch === C.branchHarm(user.zodiacBranch) ? 'harmonises with your sign — good for partnership'
          : user.favourable.indexOf(C.STEM_ELEM[yp.stem]) >= 0 ? 'carries your favourable element'
          : 'neutral to your sign';
      };
      var sgn = function (x) { return '<b class="' + bzCls(x) + '-t">' + (x > 0 ? '+' : '') + x + '</b>'; };
      var cur = bf.current;
      host.innerHTML =
        block('Annual forecast 流年', 'your year, personalised — pick a year', '<div id="annualHost" class="stack-sm"></div>') +
        block('Luck pillars', (l.forward ? 'forward' : 'reverse') + ' sequence, starting at age ' + l.startAge,
          '<div class="rows">' + bf.luck.map(function (x) {
            return '<div class="row"' + (x.current ? ' style="background:var(--raised-2)"' : '') + '>' +
              '<span class="k">Age ' + x.from + '–' + x.to + (x.current ? ' <b style="color:var(--cinnabar)">now</b>' : '') +
              '<small>' + x.start + ' → ' + x.end + '</small></span>' +
              '<span class="v">' + x.pillar.cn + ' ' + sgn(x.score) + '<small>' + x.god.en + ' · ' +
              x.pillar.nayin + '</small></span></div>';
          }).join('') + '</div>') +

        (cur ? block('Inside the current pillar', cur.pillar.cn + ' · ' + bf.phase + '% elapsed',
          '<div class="fibbar big"><i style="width:' + bf.phase + '%"></i>' +
          '<s style="left:38.2%"></s><s style="left:50%"></s><s style="left:61.8%"></s></div>' +
          rows([
            ['Phase', '<small>' + esc(bf.phaseZone) + '</small>'],
            ['Handover dates', '<small>' + cur.start + ' → ' + cur.end + '</small>']
          ].concat(cur.marks.map(function (m) {
            return ['Golden point ' + m.label, m.date + (m.past ? ' <small>passed</small>' : ' <small>ahead</small>')];
          })).concat([['Why it scores ' + cur.score, '<small>' +
            esc(cur.notes.join('; ') || 'no strong contacts with the natal chart') + '</small>']])) +
          (bf.zones.length ? '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">' +
            'Fibonacci time zones — months from the handover on ' + cur.start + '</div>' +
            '<div class="rows" style="margin-top:6px">' + bf.zones.map(function (z) {
              return '<div class="row' + (z.past ? ' fib-past' : '') + '"><span class="k">+' + z.months +
                ' months<small>' + z.date + '</small></span><span class="v">' + sgn(z.score) + ' ' +
                z.monthPillar.cn + ' month · ' + z.yearPillar.cn + ' year<small>' +
                esc(z.notes.join('; ') || '—') + '</small></span></div>';
            }).join('') + '</div>' : '')) : '') +

        block('Year ahead · Fibonacci projection', '8 years, annual 0.618 + luck pillar 0.382',
          fibSummaryHtml(bf.years, bzCls) +
          '<div style="margin-top:10px">' + fibRowsHtml(bf.years.points, {
            mark: function (p) { return p === bf.years.best; },
            extra: function (p) { return p.pillar.cn + ' ' + C.ZODIAC[p.pillar.branch] + ' · ' +
              p.god.en + ' · ' + signNote(p.pillar); } }) + '</div>') +

        block('Harmonic cycles', 'Fourier analysis of 120 years of your annual scores',
          harmonicsHtml(bh, { id: 'bazi', window: [Math.max(0, bh.tNow - 15), Math.min(119, bh.tNow + 20)],
            note: 'The series runs from birth over two sexagenary cycles (annual 0.618 + luck pillar 0.382). ' +
              'Bazi is built from 10-, 12- and 60-year cycles, so the spectrum recovers them; what it adds is which ' +
              'dominates your chart and where you are in its phase.' })) +

        block('Month by month', '13 solar months (F7), each opened by its 節',
          fibSummaryHtml(bf.months, bzCls) +
          '<div style="margin-top:10px">' + fibRowsHtml(bf.months.points.map(function (m) {
            m.label = m.pillar.cn + ' · ' + m.term; m.date = m.start + ' → ' + m.end; return m; }), {
            mark: function (p) { return p === bf.months.best; },
            extra: function (p) { return p.god.en + (p.notes.length ? ' · ' + esc(p.notes.join('; ')) : ''); } }) +
          '</div>') +

        block('Fibonacci ages', 'life pivots at 1, 2, 3, 5, 8, 13, 21, 34, 55, 89',
          '<div class="rows">' + bf.ages.map(function (a) {
            var nx = bf.nextAge && a.age === bf.nextAge.age;
            return '<div class="row' + (a.past ? ' fib-past' : '') + (nx ? ' fib-hot' : '') + '"><span class="k">Age ' +
              a.age + (nx ? ' <b style="color:var(--cinnabar)">next</b>' : '') + '<small>' + a.date + '</small></span>' +
              '<span class="v">' + a.pillar.cn + ' ' + sgn(a.score) + '<small>' +
              esc(a.notes.join('; ') || '—') + '</small></span></div>';
          }).join('') + '</div>') +

        block('Reading the sequence', '',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">Each pillar governs roughly ten years. ' +
          'A pillar carrying your favourable elements (<b>' + (user.deep || user.bazi).favourableEn.join(', ') +
          '</b>) tends to be a period where effort converts more easily into result. A pillar carrying ' +
          'the opposing elements asks for consolidation rather than expansion.<br><br>' +
          'The Fibonacci layer scores every year, month and pivot against your natal chart — favourable ' +
          'and unfavourable elements, clashes with the day, month and year branches, harmonies and ' +
          'stem unions — then places each by golden-section retracement across the series, so ' +
          'golden means strong relative to the other windows actually ahead of you. It is a QiPath ' +
          'synthesis on classical Bazi, and these are tendencies in a traditional model, not ' +
          'predictions of events.</div>') +
        block('AI forecast', 'luck pillars, Fibonacci timing and your natal chart', '<div id="aiLuck"></div>');

      wireCharts();
      renderAnnual(annualYear);
      aiPanel('aiLuck', 'baziforecast', 'math1.' + new Date().getFullYear() + '.' + pad2(new Date().getMonth() + 1) + '.ct',
        function (cfg) { var lkCt = null; try { lkCt = window.QPQimen.threatBridge(user, now().y, now(), { days: 5, jiazi: true, jiaziDays: 30 }); } catch (e) {}
          return window.QPAI.withCounter(lkCt ? counterText(lkCt) : null, function () { return window.QPAI.analyseBaziForecast(cfg, user, bf, bh); }); }, [
          { label:'The headline', path:'headline' },
          { label:'Confidence', path:'confidence' },
          { label:'The current luck pillar', path:'currentPillar' },
          { label:'Fibonacci timing', path:'fibonacci' },
          { label:'Harmonic cycles', path:'harmonics' },
          { label:'Year by year', path:'years' },
          { label:'Month by month', path:'months' },
          { label:'Precise windows', path:'windows' },
          { label:'Career and wealth', path:'career' },
          { label:'Relationships', path:'relationships' },
          { label:'Health and energy', path:'health' },
          { label:'Strategy', path:'strategy' },
          { label:'What would change this', path:'caution' }
        ]);
    }
    else if (chartK === 'together') { renderTogether(host); }
    else if (chartK === 'compass') { host.innerHTML = '<div id="fsCompass"></div>'; paintCompass(); }
    else if (chartK === 'property') { renderProperty(); }
    else if (chartK === 'plan') { renderPlan(); }
    else if (chartK === 'ask') { renderAsk(host); }

    else if (chartK === 'destiny') {
      var Q2 = window.QPQimen;
      var res, err = null;
      try { res = Q2.chartFor('destiny', null, user.birth); }
      catch (e) { err = e.message; }
      if (err) { host.innerHTML = '<div class="notice">' + esc(err) + '</div>'; return; }
      var ch = res.chart;
      var dp = Q2.destinyProfile(res, user);
      var life = Q2.lifePalaces(ch, dp);
      lastSavedId = null; currentAI = null;

      host.innerHTML =
        block('Qimen destiny chart 奇門命盤',
          'cast from ' + user.birth.y + '-' + pad2(user.birth.m) + '-' + pad2(user.birth.d) +
          ' ' + pad2(user.birth.hour) + ':' + pad2(user.birth.min),
          '<div class="panel" style="font-size:.88rem;line-height:1.7;color:var(--muted)">' +
          'This plate is fixed for life. It is read as a natal chart — the standing configuration ' +
          'you work from — not as a timing chart. Compare it against the hourly plates in Seasons, ' +
          'which change every two hours.</div>' +
          rows([
            ['Four pillars', res.pillars.year.cn + ' ' + res.pillars.month.cn + ' ' +
              res.pillars.day.cn + ' ' + res.pillars.hour.cn],
            ['Plate', ch.dun + ' &middot; ju ' + ch.ju + ' &middot; ' + ch.yuan + qmMethodLabel(ch)],
            ['Solar term at birth', qmTermLabel(ch, res.pillars)],
            ['Chief star 值符', ch.chief + ' <small>' + ch.chiefEn + '</small>'],
            ['Envoy gate 值使', ch.envoy + ' <small>palace ' + ch.envoyPalace + '</small>'],
            ['Constellation 宿', ch.mansion.cn + ' <small>' + ch.mansion.en + '</small>'],
            ['Void 空亡', qmVoidLabel(ch)],
            ['Structures', '<span style="color:var(--celadon)">+' +
              res.formations.filter(function (f) { return f.category === 'auspicious'; }).length +
              '</span> / <span style="color:var(--cinnabar)">\u2212' +
              res.formations.filter(function (f) { return f.category === 'hostile'; }).length +
              '</span>']
          ])) +

        destinyProfileHtml(dp) +

        block('Your natal nine palaces', 'tap a palace for full detail',
          qbHead(res, true) + plateHtml(ch, res.formations, [], true, life.byPalace, { res: res, natal: true }) +
          rows(life.list.map(function (a) {
            return [a.en + ' <small>' + a.cn + '</small>', a.palace + ' ' + a.name + ' &middot; ' + a.dir + ' <small>' + a.basis + '</small>']; })) +
          saveBar('dsSave', 'Save this chart')) +

        block('Standing structures', res.formations.length + ' in the natal plate',
          res.formations.length
            ? '<div class="rows">' + res.formations.slice(0, 12).map(function (f) {
                return '<div class="row"><span class="k" style="flex:0 0 42%">' + f.name +
                  '<br><small style="color:var(--muted)">' + f.nameEn + '</small></span>' +
                  '<span class="v"><small>' + esc(f.description) + '</small>' +
                  '<small style="color:' + (f.category === 'auspicious' ? 'var(--celadon)'
                    : f.category === 'hostile' ? 'var(--cinnabar)' : 'var(--brass)') + '">' +
                  f.category + ' &middot; palaces ' + (f.palaces.join(', ') || 'chart') +
                  '</small></span></div>';
              }).join('') + '</div>' +
              (res.formations.length > 12 ? '<div class="hint">Showing 12 of ' +
                res.formations.length + '. The full set is in the saved record.</div>' : '')
            : '<div class="empty">No formation lands in the natal plate.</div>') +

        block('All palaces in full', '',
          [4,9,2,3,7,8,1,6].map(function (n) {
            return palaceCard(ch.palacesByNumber[n], ch.mansion, false, life.byPalace); }).join('')) +

        (function () { var ar = areasSafe(function () { return Q2.areasDestiny(res, user); });
          return ar ? lifeAreasHtml(ar, 'Your twelve life areas', 'the classical symbol for each area on your destiny chart, against your own seat') : ''; })() +
        block('AI reading of your destiny chart', '', '<div id="aiDestiny"></div>');

      wirePlateTaps('chartBody', ch, res.formations, life.byPalace);
      wireSave('dsSave', function () {
        return { kind:'chart',
          title: 'Qimen destiny chart \u00b7 ' + res.pillars.day.cn,
          subtitle: 'Natal \u00b7 ' + ch.dun + ' ju ' + ch.ju + ' \u00b7 ' + ch.term,
          when: { date: user.birth.y + '-' + pad2(user.birth.m) + '-' + pad2(user.birth.d),
                  range: res.pillars.hourRange },
          payload: { type:'destiny', typeLabel:'Qimen destiny chart', scope:'natal, fixed for life',
            pillars: [res.pillars.year.cn, res.pillars.month.cn, res.pillars.day.cn, res.pillars.hour.cn],
            dun: ch.dun, ju: ch.ju, yuan: ch.yuan, term: ch.term,
            chief: ch.chief, envoy: ch.envoy, envoyPalace: ch.envoyPalace,
            mansion: ch.mansion.cn, voids: ch.voidBranches,
            plate: snapshotPlate(ch),
            destiny: dp.destiny, lifeStar: dp.lifeStar, lifeGua: dp.lifeGua, dayMaster: dp.dayMaster,
            lifePalaces: life.list,
            dmStars: dp.stars.map(function (s) { return { en: s.en, cn: s.cn, branches: s.branches.map(function (b) {
              return b.branch + ' P' + b.palace + ' ' + b.dir; }) }; }).concat([dp.mindPalace, dp.soulPalace].map(function (m) {
              return { en: m.en, cn: m.cn, branches: [m.pillar + ' ' + m.name + ' P' + m.palace + ' ' + m.dir] }; })),
            formations: res.formations.map(fmtForm) } };
      });
      aiPanelSaving('aiDestiny', 'destiny', 'v4.ct',
        function (cfg) { var dsCt = null; try { dsCt = window.QPQimen.threatBridge(user, now().y, now(), { days: 5, jiazi: true, jiaziDays: 30 }); } catch (e) {}
          return window.QPAI.withCounter(dsCt ? counterText(dsCt) : null, function () { return window.QPAI.analyseDestiny(cfg, res, user, dp); }); }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
          { label:'The standing configuration', path:'overview' },
          { label:'Your destiny palace', path:'destinyPalace' },
          { label:'Day Master stars', path:'dayMasterStars' },
          { label:'Chief star and envoy gate', path:'chiefEnvoy' },
          { label:'Strengths in the plate', path:'strengths' },
          { label:'Where it snags', path:'weaknesses' },
          { label:'How to work with it', path:'guidance' }
        ]);
    }
    else if (chartK === 'zodiac') { renderZodiac(host); }
    else if (chartK === 'qizheng') { renderQiZheng(host); }
    else if (chartK === 'heluo') { renderHeLuo(host); }
    else if (chartK === 'combined') { renderCombined(host); }
    else if (chartK === 'mobility') { renderMobility(host); }
    else if (chartK === 'qmseason') {
      host.innerHTML = block('Annual forecast 年盘', 'your Day Stem on each year\'s and month\'s plate', '<div id="qmAnnualHost" class="stack-sm"></div>');
      renderQimenAnnual(yearSel.qimen);
    }

    else if (chartK === 'zwds' || chartK === 'zwperiods') {
      var zwPeriods = chartK === 'zwperiods';
      var z = user.zwds;
      var zf = window.QPFib.zwds(user);
      var QMz = window.QPMath, zser = QMz.zwdsSeries(user, 120);
      var zen = QMz.zwdsEntropy(user), zfz = QMz.zwdsFuzzy(user, zser), zch = QMz.zwdsChaos(user, zser),
          zgm = QMz.zwdsGame(user), zfl = QMz.zwdsFlying(user), zdy = QMz.zwdsDynamics(user, zser);
      // Board order: branches laid out clockwise starting Si at top-left
      var layout = [[5,6,7,8],[4,null,null,9],[3,null,null,10],[2,1,0,11]];
      var cells = '';
      for (var r = 0; r < 4; r++) {
        for (var c2 = 0; c2 < 4; c2++) {
          var bi = layout[r][c2];
          if (bi === null) { continue; }
          var pal = z.palaces[bi];
          cells += '<div class="pal' + (pal.isMing ? ' ming' : '') + (pal.isShen ? ' shen' : '') +
            '" style="grid-column:' + (c2+1) + ';grid-row:' + (r+1) + '">' +
            '<div class="st">' + (pal.stars.length ? pal.stars.map(function (s, si) {
                var g = pal.bright ? pal.bright[si] : '';
                return s + (g ? '<i class="br br-' + g + '">' + g + '</i>' : ''); }).join('<br>') :
              '<span style="color:var(--muted)">—</span>') + '</div>' +
            ((pal.minors || []).length ? '<div class="mn">' + pal.minors.map(function (s) {
                return '<span class="' + (S.MINOR_TONE[s] < 0 ? 'sha' : 'ji') + '" title="' + s + '">' +
                  S.MINOR_ABBR[s] + '</span>'; }).join('') + '</div>' : '') +
            '<div><div class="nm">' + pal.name + (pal.isShen ? ' · 身' : '') + '</div>' +
            '<div class="bz">' + pal.stemCn + pal.branchCn + '</div></div></div>';
        }
      }
      cells += '<div class="mid"><div class="big">' + (z.mingStars.join(' ') || '空宫') + '</div>' +
        '<div class="sm">' + z.juCn + ' · ' + z.juEn + '<br>Life palace in ' + C.BRANCHES[z.ming] +
        '<br>Body palace in ' + C.BRANCHES[z.shen] + '</div></div>';
      host.innerHTML = zwPeriods ?
        zwdsForecastHtml(zf) +
        quantGroup('Quantitative analysis',
          (zgm ? 'This year <b>' + zgm.stance + '</b> &middot; ' : '') + 'decade ' + (zfz.handover ? 'in handover' : 'settled'),
          block('This year&rsquo;s stance', 'game theory — you against others, ' + new Date().getFullYear(),
            gameHtml(zgm, 'You are this flow year&rsquo;s Life palace field; others are its 交友 palace (friends, rivals, ' +
              'subordinates). Initiative t comes from where the year&rsquo;s 化权 and 化忌 fall; Maneuver is valued by each ' +
              'side&rsquo;s 迁移 (movement) palace; a is the difference of the two fields&rsquo; scores.')) +
          block('Fuzzy decade handover', 'graduated 大限 transitions', zwdsFuzzyHtml(zfz)) +
          block('Year-to-year dynamics', 'Markov chain over the 120-year flow-year series',
            markovHtml(zdy.markov, { short: ['Flour', 'Supp', 'Mixed', 'Strain'], unit: 'years', unitOne: 'year',
              target: 'Flourishing', horizon: 'the series',
              hint: 'P is estimated from the ' + zdy.markov.transitions + ' year-to-year transitions of the whole 120-year flow-year ' +
                'series, and anchored on this year' })) +
          block('Harmonic cycles', 'Fourier analysis of the flow-year series',
            harmonicsHtml(zdy.harmonics, { id: 'zwds', window: [Math.max(0, zdy.harmonics.tNow - 15), Math.min(119, zdy.harmonics.tNow + 20)],
              note: 'The flow-year Life palace rotates through all twelve palaces, and the 四化 follow the ten stems, so 12- and ' +
                '10-year cycles are built in; a strong 2-year term is the yin–yang alternation of the year stems.' }))) +
        block('AI forecast', '大限, 流年, 四化 and Fibonacci timing', '<div id="aiZwFc"></div>')
        :
        block('Zi Wei Dou Shu', 'lunar ' + user.lunar.month + '/' + user.lunar.day +
          (user.lunar.leap ? ' leap' : '') + ' · hour ' + C.BRANCHES[user.pillars.hourBranch],
          '<div class="board">' + cells + '</div>') +
        block('Life palace', z.mingStarsEn.join(', ') || 'No major star — read the opposite palace',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
          (z.mingStars.length
            ? 'Your life palace holds <b>' + starsBright(z.palaces[z.ming]) + '</b> (' + z.mingStarsEn.join(', ') +
              '), sitting in ' + C.BRANCHES[z.ming] + '. The Five Element frame is ' + z.juCn + '.' +
              '<br><br><span style="color:var(--muted)">Brightness 庙旺得利平不陷 runs from Temple (strongest) ' +
              'to Fallen. 庙 — a benign star at its best, a harsh one tamed; 陷 — a benign star ' +
              'ineffective, a harsh one at its harshest.</span>'
            : 'Your life palace is empty of major stars, which in this tradition means the opposite palace ' +
              'is read instead and the personality takes its colour more from environment than from a fixed pattern.') +
          '</div>') +
        block('Palaces', 'major stars with brightness, then minor stars',
          '<div class="rows">' + z.palaces.map(function (x) {
              return '<div class="row"><span class="k">' + x.name + ' <small>' + x.nameEn + ' &middot; ' +
                x.stemCn + x.branchCn + '</small></span>' +
                '<span class="v">' + (starsBright(x) || '<span style="color:var(--muted)">no major star</span>') +
                (minorsLine(x) ? '<small>' + minorsLine(x) + '</small>' : '') + '</span></div>';
            }).join('') + '</div>') +
        quantGroup('Quantitative analysis',
          'clarity ' + ordinal(zen.percentile) + ' pct &middot; birth time ' +
          (zch.fragile ? 'fragile' : zch.tests.some(function (t) { return t.changes.length; }) ? 'sensitive' : 'robust') +
          ' &middot; support pools in ' + zfl.supportHub.name + ', 忌 sink ' + zfl.jiSink.name,
          block('Board clarity', 'Shannon entropy', entropyHtml(zen, 'boards')) +
          block('Birth-time sensitivity and life chapters', 'non-linear dynamics', zwdsChaosHtml(zch)) +
          block('Flying-star network', 'tensor, matrix and graph theory on 宫干飞化', zwdsFlyingHtml(zfl))) +
        (function () { var ar = areasSafe(function () { return window.QPFib.zwdsAreasNatal(user); });
          return ar ? lifeAreasHtml(ar, 'Your twelve life areas', 'from the palaces of your birth board') : ''; })() +
        block('AI reading of your Zi Wei chart', '', '<div id="aiZwds"></div>');

      wireCharts();
      var zwCt = null;
      if (zwPeriods) {
      zwCt = mountCounter('aiZwFc', 'zwds', { subtitle: 'this year\'s threats on the plate of this double-hour' });
      aiPanel('aiZwFc', 'zwdsforecast', 'math3.' + new Date().getFullYear() + '.ct',
        function (cfg) { return window.QPAI.withCounter(zwCt ? counterText(zwCt) : null, function () { return window.QPAI.analyseZwdsForecast(cfg, user, zf,
          { entropy: zen, fuzzy: zfz, chaos: zch, game: zgm, flying: zfl, dynamics: zdy }); }); }, [
          { label:'The headline', path:'headline' },
          { label:'This year’s stance', path:'stance' },
          { label:'Clarity, handover and sensitivity', path:'uncertainty' },
          { label:'Flying-star network', path:'flying' },
          { label:'Year-to-year dynamics and cycles', path:'cycles' },
          { label:'Confidence', path:'confidence' },
          { label:'The current decade 大限', path:'decade' },
          { label:'Fibonacci timing', path:'fibonacci' },
          { label:'Year by year 流年', path:'years' },
          { label:'Precise windows', path:'windows' },
          { label:'Career 官禄', path:'career' },
          { label:'Wealth 财帛', path:'wealth' },
          { label:'Relationships 夫妻', path:'relationships' },
          { label:'Health 疾厄', path:'health' },
          { label:'Strategy', path:'strategy' },
          { label:'What would change this', path:'caution' }
        ]);
      host.insertAdjacentHTML('beforeend', block('Annual forecast 流年', 'the flow-year palaces and the year\'s 四化', '<div id="zwAnnualHost" class="stack-sm"></div>'));
      renderZwdsAnnual(yearSel.zwds);
      } else {
      try { zwCt = window.QPQimen.threatBridge(user, now().y, now(), { days: 5 }); } catch (e) { zwCt = null; }
      aiPanel('aiZwds', 'zwds', 'v1.ct', function (cfg) {
        return window.QPAI.withCounter(zwCt ? counterText(zwCt) : null, function () { return window.QPAI.analyseZwds(cfg, user); });
      }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
        { label: 'Life palace 命宫', path: 'lifePalace' },
        { label: 'Career 官禄', path: 'career' },
        { label: 'Wealth 财帛', path: 'wealth' },
        { label: 'Relationships 夫妻', path: 'relationships' },
        { label: 'Guidance', path: 'guidance' }
      ]);
      }
    }
    else {
      var em = user.mansions;
      var prop = activeProperty();
      var natal = natalOf(prop);
      var dtN = now();
      var pN = C.fourPillars(dtN.y, dtN.m, dtN.d, 12, 0);
      var sy = pN.solarYear;
      var aff = FS.afflictions(sy);
      var per = FS.currentPeriod();
      lastSavedId = null; currentAI = null;

      if (!natal) {
        host.innerHTML =
          block('Feng Shui', 'Period ' + per.period + ' \u00b7 ' + per.info.trigram + ' ' +
            per.info.en + ' \u00b7 ' + per.startYear + '\u2013' + per.endYear,
            '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
            (prop ? '<b>' + esc(prop.name) + '</b> has no facing bearing yet. A flying star chart ' +
              'is a chart of a building, and the facing is the measurement everything else follows ' +
              'from.<br><br>Take it on the <b>Compass</b> tab standing at the main door facing out, ' +
              'or type a bearing on the <b>Property</b> tab.'
             : 'No property saved yet. Add one on the <b>Property</b> tab, then take its facing ' +
               'bearing on the <b>Compass</b> tab.') + '</div>' +
            '<div class="two"><button class="btn" id="fsGoComp">Compass</button>' +
            '<button class="btn ghost" id="fsGoProp">Property</button></div>') +
          block('Your Eight Mansions', 'Gua ' + em.gua + ' ' + em.guaCn + ' \u00b7 ' + em.group + ' group',
            rows([
              ['Best direction', '<b style="color:var(--celadon)">' + em.best + '</b>' +
                '<small>face your desk and bed head this way</small>'],
              ['Supportive', em.good.join(' \u00b7 ')],
              ['Avoid', '<b style="color:var(--cinnabar)">' + em.avoid.join(' \u00b7 ') + '</b>']
            ])) +
          block('This year', sy + ' \u00b7 ' + aff.zodiac,
            starGrid(S.flyingStars(aff.annualStar)));
        $('fsGoComp').onclick = function () { switchChart('compass'); };
        $('fsGoProp').onclick = function () { switchChart('property'); };
        return;
      }

      var layers = FS.sectorLayers(natal, sy, pN.month.branch);
      var byDir = {}; layers.forEach(function (l) { byDir[l.dir] = l; });
      var shape = (prop.plan && prop.plan.outline && prop.plan.outline.length >= 3)
        ? FS.analyseShape(prop.plan.outline, prop.plan.planNorth) : null;

      var order = [['NW','N','NE'],['W','C','E'],['SW','S','SE']];
      var gridHtml = '<div class="fsgrid">' + order.map(function (row) {
        return row.map(function (d) {
          if (d === 'C') {
            var c = natal.byPalace[5];
            return '<div class="fscell centre"><div class="d">Centre</div>' +
              '<div class="pair">' + c.mountain + '-<b>' + c.water + '</b></div>' +
              '<div class="per">period ' + c.period + '</div></div>';
          }
          var L = byDir[d];
          var cls = L.combo.tone === 'good' ? 'good' : L.combo.tone === 'bad' ? 'bad' : '';
          if (L.isFacing) cls += ' facing';
          if (L.isSitting) cls += ' sitting';
          return '<div class="fscell ' + cls + '" data-fsd="' + d + '">' +
            '<div class="d">' + d + (L.isFacing ? ' \u5411' : L.isSitting ? ' \u5750' : '') + '</div>' +
            '<div class="pair">' + L.natalMountain + '-<b>' + L.natalWater + '</b></div>' +
            '<div class="per">period ' + L.natalPeriod + '</div>' +
            '<div class="ann">year ' + L.annual + (L.monthly ? ' \u00b7 mo ' + L.monthly : '') + '</div>' +
            L.afflictions.map(function (f) { return '<span class="flag">' + f.cn + '</span>'; }).join('') +
            '</div>';
        }).join('');
      }).join('') + '</div>';

      host.innerHTML =
        block(esc(prop.name), 'Period ' + natal.period + ' \u00b7 ' + natal.facing.char +
          ' facing ' + natal.facing.dirFull,
          rows([
            ['Chart type', '<b style="color:var(--brass)">' + natal.type + '</b> <small>' +
              natal.typeEn + '</small>'],
            ['Facing', natal.facing.char + ' ' + prop.facingDegrees.toFixed(1) + '\u00b0 <small>' +
              natal.facing.dirFull + ' \u00b7 ' + natal.facing.trigram + ' \u00b7 ' +
              natal.facing.yuanName + '</small>'],
            ['Sitting', natal.sitting.char + ' <small>' + natal.sitting.dirFull + '</small>'],
            ['Period', natal.period + ' <small>' + FS.PERIOD_INFO[natal.period].trigram + ' ' +
              FS.PERIOD_INFO[natal.period].en + ', ' + FS.PERIOD_INFO[natal.period].elem + '</small>']
          ]) +
          '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
          esc(natal.typeNote) + '</div>' +
          (natal.period === 9
            ? '<div class="warnbar">Period 9 admits <b>no 旺山旺向 chart at any facing</b>. The two ' +
              'base stars always land in complementary palaces, which always carry opposite ' +
              'polarity, so they can never both fly reverse. Every building in this period is one ' +
              'of the two double-star types — so the question is not whether you have the best ' +
              'chart, but which half of yours needs the help.</div>' : '')) +

        block('The nine palaces', 'mountain-water, period, annual \u00b7 tap for detail',
          gridHtml +
          '<div class="panel" style="margin-top:10px;font-size:.8rem;line-height:1.7;color:var(--muted)">' +
          'Left number is the mountain star (山星) — people, health, relationships. ' +
          'Right number in gold is the water star (向星) — money and opportunity. ' +
          '\u5411 marks the facing palace, \u5750 the sitting palace.</div>' +
          saveBar('fsSave', 'Save this chart')) +

        block('This year', sy + ' \u00b7 ' + aff.zodiac + ' \u00b7 annual star ' + aff.annualStar,
          rows([
            ['\u592A\u6B72 Tai Sui', aff.taiSui.char + ' ' + aff.taiSui.dirFull +
              ' <small>may be sat against, not faced</small>'],
            ['\u6B72\u7834 Year Breaker', aff.yearBreaker.char + ' ' + aff.yearBreaker.dirFull +
              ' <small>do not face for important work</small>'],
            ['\u4E09\u715E Three Killings', aff.threeKillings.dirs.join(', ') +
              ' <small>may be faced, not sat against</small>'],
            ['\u4E94\u9EC3 Five Yellow', aff.fiveYellow.dirFull +
              ' <small>no renovation; add heavy metal</small>']
          ])) +

        (shape ? block('Shape 缺角', 'from the imported plan',
          '<div class="rows">' + shape.sectors.map(function (x) {
            return '<div class="row"><span class="k">' + x.dirFull + '</span><span class="v"><b style="color:' +
              (x.coverage >= 90 ? 'var(--celadon)' : x.coverage >= 67 ? 'var(--brass)' : 'var(--cinnabar)') +
              '">' + x.coverage + '%</b> <small>' + x.cn + ' ' + x.level + '</small></span></div>';
          }).join('') + '</div>') : '') +

        block('Where to put things', 'natal, annual, affliction and your own directions combined',
          '<div class="panel"><label for="fsRoom">Room type</label>' +
          '<select id="fsRoom">' + FS.ROOM_TYPES.map(function (r) {
            return '<option value="' + r.id + '">' + r.label + '</option>'; }).join('') +
          '</select></div><div id="fsPlace"></div>') +

        block('Your Eight Mansions', 'Gua ' + em.gua + ' ' + em.guaCn + ' \u00b7 ' + em.group + ' group',
          rows([
            ['Best direction', '<b style="color:var(--celadon)">' + em.best + '</b>'],
            ['Supportive', em.good.join(' \u00b7 ')],
            ['Avoid', '<b style="color:var(--cinnabar)">' + em.avoid.join(' \u00b7 ') + '</b>']
          ])) +

        block('AI reading of the property', '', '<div id="aiFS"></div>');

      host.querySelectorAll('[data-fsd]').forEach(function (cell) {
        cell.onclick = function () { openSector(byDir[cell.dataset.fsd], natal, prop); };
      });
      function paintPlace() {
        var rt = $('fsRoom').value;
        var ranked = FS.placementFor(natal, sy, pN.month.branch, em, rt);
        $('fsPlace').innerHTML = '<div class="rows" style="margin-top:10px">' +
          ranked.map(function (r) {
            var col = r.band === 'Recommended' ? 'var(--celadon)'
                    : r.band === 'Workable' ? 'var(--brass)' : 'var(--cinnabar)';
            return '<div class="row"><span class="k">' + r.dirFull + '</span><span class="v">' +
              '<b style="color:' + col + '">' + r.score + '</b> <small>' + r.band + '</small>' +
              '<small>' + esc(r.why.slice(0, 2).join('; ')) + '</small></span></div>';
          }).join('') + '</div>';
      }
      paintPlace();
      $('fsRoom').onchange = paintPlace;

      wireSave('fsSave', function () {
        return { kind:'chart',
          title: 'Feng Shui \u00b7 ' + prop.name,
          subtitle: 'Period ' + natal.period + ' \u00b7 ' + natal.facing.char + ' facing \u00b7 ' + natal.type,
          when: { date: isoOf(dtN) },
          payload: { type:'fengshui', typeLabel:'Flying star natal chart',
            property: prop.name, propertyType: prop.type,
            period: natal.period, facing: natal.facing.char,
            facingDegrees: prop.facingDegrees, facingDir: natal.facing.dirFull,
            sitting: natal.sitting.char, chartType: natal.type + ' ' + natal.typeEn,
            scope: natal.typeNote,
            sectors: layers.map(function (l) {
              return { dir: l.dirFull, mountain: l.natalMountain, water: l.natalWater,
                       period: l.natalPeriod, annual: l.annual, monthly: l.monthly,
                       combo: l.combo.text,
                       afflictions: l.afflictions.map(function (f) { return f.cn; }) }; }),
            afflictions: { taiSui: aff.taiSui.dirFull, yearBreaker: aff.yearBreaker.dirFull,
                           threeKillings: aff.threeKillings.dirs, fiveYellow: aff.fiveYellow.dirFull },
            shape: shape ? shape.coverage : null } };
      });
      var fsCt = mountCounter('aiFS', 'fengshui', { focus: ['upheaval', 'health', 'financial'],
        subtitle: 'this year\'s threats on the plate of this double-hour — the directions bear on the home' });
      aiPanelSaving('aiFS', 'fengshui', prop.id + '.' + sy + '.ct',
        function (cfg) { return window.QPAI.withCounter(fsCt ? counterText(fsCt, fsCt.focus) : null, function () {
          return window.QPAI.analyseFengShui(cfg, prop, natal, layers, aff, shape, em, user); }); }, [
          { label:'Overview', path:'overview' },
          { label:'Facing and sitting', path:'facing' },
          { label:'The sectors that matter', path:'sectors' },
          { label:'This year', path:'thisYear' },
          { label:'Remedies', path:'remedies' },
          { label:'What this reading cannot see', path:'limits' }
        ]);
    }
  }

  var consultK = 'sancai';
  var manifestPick = null;
  var manifestDetails = { aspects: '', returns: '', stage: 'prime', goal: 'wealth', ask: null };   // kept when the form is rebuilt
  var manifestSearch = { days: 14, daytime: true, from: null, found: null, scroll: false };
  var searchState = { ids: [], from: null, to: null, results: null, picked: null, cat: 'auspicious', waking: true, sort: 'best' };

  function toneCls(t) { return t === 'good' ? 'good' : t === 'danger' ? 'danger' : 'neutral'; }

  /* ---------------- Fibonacci timing layer ---------------- */

  // One row per window: label, when, score, and a bar placed by golden-section position.
  function fibRowsHtml(points, opts) {
    opts = opts || {};
    return '<div class="rows fib">' + points.map(function (p) {
      var hot = opts.mark && opts.mark(p);
      return '<div class="row fz-' + p.zone + (hot ? ' fib-hot' : '') + (p.past ? ' fib-past' : '') + '">' +
        '<span class="k">' + esc(p.label) +
        (p.date && p.label.indexOf(p.date) < 0 ? '<small>' + p.date + (p.range ? ' ' + p.range : '') + '</small>' : '') +
        '</span><span class="v"><b>' + (p.score > 0 && !opts.unsigned ? '+' : '') + p.score + '</b>' +
        (opts.extra ? ' <small>' + opts.extra(p) + '</small>' : '') +
        '<span class="fibbar"><i style="width:' + Math.max(3, p.position) + '%"></i></span>' +
        '<small>' + window.QPFib.ZONE_LABEL[p.zone] + '</small></span></div>';
    }).join('') + '</div>';
  }

  function fibSummaryHtml(sum, verdictCls) {
    return '<div class="verdictbar"><span class="big ' + verdictCls(sum.refined) + '">' + sum.verdict +
      '</span><span class="sub">refined score ' + sum.refined + ' &middot; ' + sum.agreement.pct +
      '% of windows agree<br>anchor ' + sum.anchorScore + ' &middot; &phi;-consensus ' + sum.consensus +
      '</span></div>' +
      rows([
        ['Strongest window', esc(sum.best.label) + ' <small>' + (sum.best.date || '') + ' ' +
          (sum.best.range || '') + ' &middot; score ' + sum.best.score + '</small>'],
        ['Weakest window', esc(sum.worst.label) + ' <small>' + (sum.worst.date || '') + ' ' +
          (sum.worst.range || '') + ' &middot; score ' + sum.worst.score + '</small>'],
        ['Trend', '<small>' + esc(sum.trend) + ' (slope ' + sum.slope + ')</small>'],
        ['Golden levels', '<small>' + sum.range.levels.map(function (l) {
          return (l.ratio * 100).toFixed(1) + '% = ' + l.value; }).join(' &middot; ') + '</small>']
      ]);
  }

  // A compact copy of a series for saved records: no Date objects, no engine internals.
  function fibSnapshot(sum) {
    if (!sum) return null;
    return { refined: sum.refined, verdict: sum.verdict, consensus: sum.consensus,
      anchor: sum.anchorScore, agreement: sum.agreement.pct, trend: sum.trend,
      best: sum.best.label + ' ' + (sum.best.date || '') + ' ' + (sum.best.range || ''),
      worst: sum.worst.label + ' ' + (sum.worst.date || '') + ' ' + (sum.worst.range || ''),
      windows: sum.points.map(function (p) {
        return { label: p.label, date: p.date || '', range: p.range || '', score: p.score, zone: p.zone }; }) };
  }

  function fibRecordHtml(f) {
    if (!f) return '';
    return '<div class="block"><h2>Fibonacci timing</h2>' +
      rows([['Refined verdict', esc(f.verdict + ' (' + f.refined + ')')],
          ['Agreement', f.agreement + '% of windows'], ['Strongest', esc(f.best)],
          ['Weakest', esc(f.worst)], ['Trend', esc(f.trend)]]) +
      '<div class="rows" style="margin-top:8px">' + (f.windows || []).map(function (w) {
        return '<div class="row fz-' + w.zone + '"><span class="k">' + esc(w.label) + '<small>' +
          esc(w.date + ' ' + w.range) + '</small></span><span class="v">' + w.score +
          ' <small>' + esc(w.zone) + '</small></span></div>'; }).join('') + '</div></div>';
  }

  /* ---------------- quantitative layer: charts, tensor, Markov, harmonics, network ---------------- */

  var LC = {};   // line-chart registry, wired after the host's HTML is in place

  /**
   * Two-series line chart: the engine's actual scores (solid) against the harmonic
   * reconstruction (dashed). cfg: { xs: labels[], actual: [], fit: [], now: index, unit }.
   */
  function lineChart(id, cfg) {
    LC[id] = cfg;
    var W = 340, H = 150, L = 30, R = 46, T = 10, B = 22;
    var all = cfg.actual.concat(cfg.fit).filter(function (v) { return v !== null && !isNaN(v); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    var n = cfg.actual.length;
    var x = function (i) { return L + (W - L - R) * (n > 1 ? i / (n - 1) : 0.5); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    cfg.geom = { W: W, L: L, R: R, n: n, y: y };
    var path = function (arr) { var d = '', pen = false;
      arr.forEach(function (v, i) { if (v === null || isNaN(v)) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true; }); return d; };
    var ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
    var lastA = cfg.actual[n - 1], lastF = cfg.fit[n - 1];
    var lab = function (v, cls, dy) { return '<text x="' + (W - R + 4) + '" y="' + (y(v) + dy).toFixed(1) +
      '" class="lc-lab">' + cls + '</text>'; };
    var gap = Math.abs(y(lastA) - y(lastF)) < 12 ? (y(lastA) < y(lastF) ? [-4, 8] : [8, -4]) : [4, 4];
    return '<div class="lc" id="' + id + '">' +
      '<div class="lc-legend"><span><i class="sw a"></i>' + esc(cfg.actualLabel || 'Engine score') + '</span>' +
      '<span><i class="sw f"></i>' + esc(cfg.fitLabel || 'Harmonic fit') + '</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.title || 'chart') + '">' +
      ticks.map(function (t) { return '<line class="lc-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t).toFixed(1) +
        '" y2="' + y(t).toFixed(1) + '"/><text class="lc-ax" x="' + (L - 4) + '" y="' + (y(t) + 3).toFixed(1) +
        '" text-anchor="end">' + (Math.round(t * 10) / 10) + '</text>'; }).join('') +
      (cfg.now !== undefined && cfg.now >= 0 && cfg.now < n ? '<line class="lc-now" x1="' + x(cfg.now).toFixed(1) + '" x2="' +
        x(cfg.now).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="lc-ax" x="' + (x(cfg.now) + 3).toFixed(1) +
        '" y="' + (T + 8) + '">now</text>' : '') +
      '<path class="lc-f" d="' + path(cfg.fit) + '"/><path class="lc-a" d="' + path(cfg.actual) + '"/>' +
      lab(lastA, cfg.endA || 'score', gap[0]) + lab(lastF, cfg.endF || 'fit', gap[1]) +
      '<text class="lc-ax" x="' + L + '" y="' + (H - 6) + '">' + esc(cfg.xs[0]) + '</text>' +
      '<text class="lc-ax" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(cfg.xs[n - 1]) + '</text>' +
      '<line class="lc-cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" visibility="hidden"/>' +
      '<circle class="lc-dot a" r="4" visibility="hidden"/><circle class="lc-dot f" r="4" visibility="hidden"/>' +
      '<rect class="lc-hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '"/></svg>' +
      '<div class="lc-tip" hidden></div>' +
      '<details class="lc-table"><summary>Show data table</summary><div class="rows">' +
      cfg.actual.map(function (v, i) { return '<div class="row"><span class="k">' + esc(cfg.xs[i]) + '</span><span class="v">' +
        (Math.round(v * 10) / 10) + ' <small>fit ' + (Math.round(cfg.fit[i] * 10) / 10) + '</small></span></div>'; }).join('') +
      '</div></details></div>';
  }

  function wireCharts() {
    Object.keys(LC).forEach(function (id) {
      var el = document.getElementById(id); if (!el || el.dataset.wired) return;
      el.dataset.wired = '1';
      var cfg = LC[id], svg = el.querySelector('svg'), tip = el.querySelector('.lc-tip');
      var cross = el.querySelector('.lc-cross'), da = el.querySelector('.lc-dot.a'), df = el.querySelector('.lc-dot.f');
      var g = cfg.geom, hit = el.querySelector('.lc-hit'), yy = g.y;
      function at(evt) {
        var r = svg.getBoundingClientRect(), px = (evt.clientX - r.left) / r.width * g.W;
        var i = Math.max(0, Math.min(g.n - 1, Math.round((px - g.L) / (g.W - g.L - g.R) * (g.n - 1))));
        var xx = g.L + (g.W - g.L - g.R) * (g.n > 1 ? i / (g.n - 1) : 0.5);
        cross.setAttribute('x1', xx); cross.setAttribute('x2', xx); cross.setAttribute('visibility', 'visible');
        da.setAttribute('cx', xx); da.setAttribute('cy', yy(cfg.actual[i])); da.setAttribute('visibility', 'visible');
        df.setAttribute('cx', xx); df.setAttribute('cy', yy(cfg.fit[i])); df.setAttribute('visibility', 'visible');
        tip.hidden = false;
        tip.innerHTML = '<b>' + esc(cfg.xs[i]) + '</b>' + (cfg.notes && cfg.notes[i] ? '<small>' + esc(cfg.notes[i]) + '</small>' : '') +
          '<span><i class="sw a"></i>score ' + (Math.round(cfg.actual[i] * 10) / 10) + '</span>' +
          '<span><i class="sw f"></i>fit ' + (Math.round(cfg.fit[i] * 10) / 10) + '</span>';
        var left = (xx / g.W) * r.width; tip.style.left = Math.max(0, Math.min(r.width - 150, left - 75)) + 'px';
      }
      function hide() { tip.hidden = true; [cross, da, df].forEach(function (e) { e.setAttribute('visibility', 'hidden'); }); }
      hit.addEventListener('pointermove', at); hit.addEventListener('pointerdown', at);
      hit.addEventListener('pointerleave', hide);
    });
  }

  function harmonicsHtml(h, opts) {
    opts = opts || {};
    var unitWord = h.unit === 'year' ? 'years' : 'double-hours';
    var chartId = 'lc-' + (opts.id || h.unit) + '-' + Math.floor(Math.random() * 1e6);
    var lo = opts.window ? opts.window[0] : 0, hi = opts.window ? opts.window[1] : h.values.length - 1;
    var xs = [], actual = [], fit = [], notes = [];
    for (var t = lo; t <= hi; t++) {
      actual.push(h.values[t]); fit.push(h.fr.recon(t));
      xs.push(h.unit === 'year' ? String(h.origin + t) : (h.series[t].date.slice(5) + ' ' + h.series[t].range.slice(0, 5)));
      notes.push(h.unit === 'year' ? 'age ' + (t + (h.ageOffset || 0)) : h.series[t].pillar + ' hour');
    }
    return rows(h.oscillators.map(function (o, i) {
      return ['Oscillator ' + (i + 1), '<b>' + (h.unit === 'year' ? o.period + ' yr' : o.period + ' &times; 2h') + '</b> ' +
        '<small>' + esc(o.label) + ' &middot; amplitude ' + o.amp + ' &middot; ' + o.share + '% of variance &middot; ' +
        esc(o.phase) + ' (' + o.phaseDeg + '&deg;)</small>'];
    }).concat([
      ['Trend', (h.trend > 0 ? '+' : '') + h.trend + ' <small>score per ' + (h.unit === 'year' ? 'decade' : 'day') +
        ', removed before the transform and added back to the fit</small>'],
      ['Explained', h.explained + '% <small>of the detrended variance (Parseval)</small>'],
      ['Next peak', h.nextPeak ? (h.unit === 'year' ? h.nextPeak.year : h.nextPeak.when.date + ' ' + h.nextPeak.when.range) +
        ' <small>fit ' + h.nextPeak.value + '</small>' : '—'],
      ['Next trough', h.nextTrough ? (h.unit === 'year' ? h.nextTrough.year : h.nextTrough.when.date + ' ' + h.nextTrough.when.range) +
        ' <small>fit ' + h.nextTrough.value + '</small>' : '—']
    ])) +
    '<div style="margin-top:12px">' + lineChart(chartId, { xs: xs, actual: actual, fit: fit, notes: notes,
      now: h.tNow - lo, title: 'Score against harmonic fit', fitLabel: 'Top-4 harmonic fit' }) + '</div>' +
    '<div class="hint">x(t) = mean + &Sigma; A&#8342; cos(2&pi;kt/N + &phi;&#8342;) over the four strongest frequencies of a ' +
    h.fr.N + '-' + unitWord.replace(/s$/, '') + ' DFT. ' + esc(opts.note || '') + '</div>';
  }

  function tensorHtml(tz) {
    var heat = function (v, max) { var a = max ? Math.max(0, v) / max : 0;
      return 'style="background:rgba(184,137,42,' + (0.08 + a * 0.6).toFixed(2) + ')"'; };
    var maxL = Math.max.apply(null, tz.layerElement.map(function (r) { return Math.max.apply(null, r); }));
    var maxC = Math.max.apply(null, tz.palaces.map(function (p) { return p.centrality; }));
    return rows([
      ['Energy hub', 'Palace ' + tz.hub.num + ' ' + tz.hub.name + ' &middot; ' + tz.hub.dir +
        '<small>centrality ' + tz.hub.centrality + '% &middot; net flow ' + tz.hub.net + '</small>'],
      ['Best for you', 'Palace ' + tz.personalBest.num + ' ' + tz.personalBest.dir +
        '<small>contraction with your elements: ' + tz.personalBest.personal + '</small>'],
      ['Least aligned', 'Palace ' + tz.personalWorst.num + ' ' + tz.personalWorst.dir +
        '<small>alignment ' + tz.personalWorst.personal + '</small>'],
      ['λ₁ / |λ₂|', (tz.dominance === null ? '—' : tz.dominance) + '<small>λ₁ ' + tz.lambda1 + ', λ₂ ' + tz.lambda2 +
        ' &middot; above 2 the plate has one clear centre; near 1 its energy is split</small>'],
      ['‖A₊‖ / ‖A₋‖', tz.harmony + ' / ' + tz.conflict + '<small>Frobenius norms of the supportive and ' +
        'controlling parts of the influence matrix</small>'],
      ['转盘', 'stars = R<sup>' + tz.starRotation.k + '</sup> &middot; doors = R<sup>' + tz.doorRotation.k + '</sup>' +
        '<small>' + tz.starRotation.hits + '/' + tz.starRotation.total + ' stars and ' + tz.doorRotation.hits + '/' +
        tz.doorRotation.total + ' doors sit exactly where a ring permutation of their home palaces puts them</small>']
    ]) +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Element balance of the plate</div>' +
    '<div class="ebal">' + tz.balance.map(function (v, i) {
      return '<div><span>' + tz.elementsCn[i] + '</span><i style="width:' + (v * 2.5) + '%"></i><b>' + v + '%</b></div>'; }).join('') + '</div>' +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Layer &times; element unfolding of the tensor</div>' +
    '<table class="heat"><tr><th></th>' + tz.elementsCn.map(function (e) { return '<th>' + e + '</th>'; }).join('') + '</tr>' +
    tz.layerElement.map(function (row, l) { return '<tr><th>' + tz.layers[l] + '</th>' + row.map(function (v) {
      return '<td ' + heat(v, maxL) + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Palaces</div>' +
    '<div class="rows">' + tz.palaces.map(function (p) {
      return '<div class="row"><span class="k">' + p.num + ' ' + p.name + '<small>' + p.dir + '</small></span>' +
        '<span class="v">centrality ' + p.centrality + '%<span class="fibbar"><i style="width:' +
        (maxC ? p.centrality / maxC * 100 : 0) + '%"></i></span><small>support ' + p.support + ' &middot; pressure ' +
        p.pressure + ' &middot; yours ' + p.personal + '</small></span></div>'; }).join('') + '</div>' +
    '<div class="hint">The plate is a 9 &times; 5 &times; 5 tensor T[palace][layer][element]. Weighting the layers gives ' +
    'V (9 &times; 5); A = (V&middot;M&middot;V&#7488;) &#8857; W is the palace influence matrix, with M the five-element ' +
    'interaction matrix (generates +1, controls &minus;1, same +0.5) and W the Lo Shu adjacency. Centrality is the Perron ' +
    'vector of the symmetrised supportive part. The centre palace is adjacent to all eight, so it scores high by ' +
    'construction and is left out of the rankings.</div>';
  }

  /**
   * opts: { short: 4 labels, unit: 'double-hours' | 'years', unitOne, target (state 0 name),
   *         hoursPer (2 for double-hours, 0 for none), horizon text, hint }
   */
  function markovHtml(mk, opts) {
    opts = opts || {};
    var S_ = mk.states, cur = mk.current;
    var unit = opts.unit || 'double-hours', one = opts.unitOne || 'double-hour', target = opts.target || S_[0];
    var cell = function (v) { return '<td style="background:rgba(79,143,196,' + (0.06 + v * 0.7).toFixed(2) + ')">' +
      Math.round(v * 100) + '%</td>'; };
    var short = opts.short || ['Fav', 'Work', 'Guard', 'Unfav'];
    var fa = mk.firstActualFavourable;
    return rows([
      ['Now', '<b>' + S_[cur] + '</b>'],
      ['Expected wait', mk.expectedToFavourable === null ? '—' :
        mk.expectedToFavourable + ' ' + unit + ' <small>to ' + target +
        (opts.hoursPer ? ', &asymp; ' + Math.round(mk.expectedToFavourable * opts.hoursPer * 10) / 10 + ' hours' : '') +
        (cur === 0 ? ' (mean return time 1/π₀)' : ' (first-passage time)') + '</small>'],
      [cur === 0 ? 'Next return' : 'First actual', fa ? fa.date + (fa.range ? ' ' + fa.range : '') +
        ' <small>' + (cur === 0 ? 'next ' + target + ' after this one' : 'first ' + target) +
        ' in the actual sequence, ' + fa.t + ' ' + unit + ' ahead</small>' : 'none in ' + (opts.horizon || 'range')],
      ['Long run π', S_.map(function (s, i) { return short[i] + ' ' + mk.stationary[i] + '%'; }).join(' &middot; ')],
      ['Mean stay', S_.map(function (s, i) { return short[i] + ' ' + mk.sojourn[i]; }).join(' &middot; ') +
        ' <small>' + unit + ', 1/(1&minus;P&#7522;&#7522;)</small>'],
      ['Entropy', mk.entropy + ' bits <small>of a maximum ' + mk.maxEntropy + ' — lower is more predictable</small>']
    ]) +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Transition matrix P (from row to column, one ' + one + ')</div>' +
    '<table class="heat"><tr><th></th>' + short.map(function (s) { return '<th>' + s + '</th>'; }).join('') + '</tr>' +
    mk.P.map(function (row, i) { return '<tr><th>' + short[i] + (i === cur ? ' &bull;' : '') + '</th>' +
      row.map(cell).join('') + '</tr>'; }).join('') + '</table>' +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Probability of each state n ' + unit + ' ahead, from now</div>' +
    '<table class="heat"><tr><th>n</th>' + short.map(function (s) { return '<th>' + s + '</th>'; }).join('') + '</tr>' +
    Object.keys(mk.steps).map(function (n) { return '<tr><th>+' + n + '</th>' + mk.steps[n].map(function (v) {
      return cell(v / 100); }).join('') + '</tr>'; }).join('') + '</table>' +
    '<div class="hint">' + (opts.hint || ('P is estimated from ' + mk.transitions + ' consecutive transitions of this question\'s ' +
    'verdict over the next ten days')) + ' (Laplace smoothing &alpha; = 0.5); π solves &pi;P = &pi;; first-passage times solve ' +
    'h = 1 + P&#8320;h on the other states. The engine is deterministic, so the chain is a summary of how the ' +
    'reading tends to move, not a claim that the outcome is random.</div>';
  }

  // The eight characters as a network: stems on top, branches below, Year → Hour left to right.
  function baziGraphSvg(g) {
    var X = [55, 135, 215, 295], Y = [46, 160], pos = function (i) { return [X[i % 4], Y[i < 4 ? 0 : 1]]; };
    var shown = g.edges.filter(function (e) {
      return ['combines', 'clashes', 'harms', 'punishes'].indexOf(e.type) >= 0 ||
        ((e.type === 'generates' || e.type === 'controls') && e.w >= 1); });
    var paths = shown.map(function (e) {
      var a = pos(e.a), b = pos(e.b), same = a[1] === b[1], far = same && Math.abs(a[0] - b[0]) > 90;
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (far) my += (a[1] < 100 ? -1 : 1) * (18 + Math.abs(a[0] - b[0]) / 6);
      else if (e.type === 'controls' || e.type === 'harms' || e.type === 'punishes') {
        if (same) my += (a[1] < 100 ? 14 : -14); else mx += 12; }
      // Trim both ends to the node rims so arrowheads land on the circle, not under it.
      var rad = function (i) { return 13 + g.nodes[i].pagerank / 3; };
      var trim = function (p, c, r) { var dx = c[0] - p[0], dy = c[1] - p[1], L2 = Math.sqrt(dx * dx + dy * dy) || 1;
        return [p[0] + dx / L2 * r, p[1] + dy / L2 * r]; };
      var s0 = trim(a, [mx, my], rad(e.a)), s1 = trim(b, [mx, my], rad(e.b) + (e.directed ? 2 : 0));
      var d = 'M' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1) + ' Q' + mx + ' ' + my + ' ' +
              s1[0].toFixed(1) + ' ' + s1[1].toFixed(1);
      return '<path class="ge ge-' + e.type + '" d="' + d + '"' + (e.directed ? ' marker-end="url(#arr-' + e.type + ')"' : '') +
        '><title>' + esc(e.note) + ' · weight ' + e.w + '</title></path>';
    }).join('');
    var nodes = g.nodes.map(function (n2, i) {
      var p = pos(i), r = 13 + n2.pagerank / 3;
      return '<g class="gn' + (i === 2 ? ' dm' : '') + '"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r.toFixed(1) +
        '" class="el-' + n2.elem + '"/><text x="' + p[0] + '" y="' + (p[1] + 5) + '" text-anchor="middle" class="gch">' + n2.ch +
        '</text><text x="' + p[0] + '" y="' + (p[1] + (i < 4 ? -r - 5 : r + 13)) + '" text-anchor="middle" class="gsub">' +
        n2.pagerank + '%</text><title>' + esc(n2.label + ' ' + n2.ch + ' · PageRank ' + n2.pagerank + '% · betweenness ' +
        n2.betweenness) + '</title></g>';
    }).join('');
    var mk = function (t) { return '<marker id="arr-' + t + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" ' +
      'markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" class="ga-' + t + '"/></marker>'; };
    return '<svg class="bgraph" viewBox="0 0 350 206" role="img" aria-label="Bazi character network">' +
      '<defs>' + mk('generates') + mk('controls') + '</defs>' +
      ['Year', 'Month', 'Day', 'Hour'].map(function (l, i) { return '<text x="' + X[i] + '" y="103" text-anchor="middle" class="gax">' +
        l + '</text>'; }).join('') + paths + nodes + '</svg>' +
      '<div class="glegend"><span><i class="lg lg-generates"></i>generates (touching)</span>' +
      '<span><i class="lg lg-controls"></i>controls (touching)</span><span><i class="lg lg-combines"></i>combines</span>' +
      '<span><i class="lg lg-clashes"></i>clash</span><span><i class="lg lg-harms"></i>harm / punishment</span>' +
      '<span>node size and % = PageRank</span></div>';
  }

  function baziGraphHtml(g) {
    var dm = g.dayMaster;
    return baziGraphSvg(g) + rows([
      ['Qi sink', g.sink.ch + ' <small>' + g.sink.label + ' &middot; PageRank ' + g.sink.pagerank + '%</small>'],
      ['Weakest', g.source.ch + ' <small>' + g.source.label + ' &middot; PageRank ' + g.source.pagerank + '%</small>'],
      ['Bridge', g.bridge.ch + ' <small>' + g.bridge.label + ' &middot; ' + g.bridge.betweenness +
        ' — the character most shortest paths run through</small>'],
      ['DM flow', '<b class="' + (dm.net >= 0 ? 'good' : 'bad') + '-t">' + (dm.net > 0 ? '+' : '') + dm.net + '</b>' +
        '<small>in ' + dm.inflow + ' (generated + peers) &minus; pressure ' + dm.pressure + ' &minus; drain ' + dm.drain + '</small>'],
      ['Clusters', g.componentCount + '<small>' + g.components.map(function (c) { return c.join(', '); })
        .map(esc).join(' &nbsp;|&nbsp; ') + '</small>'],
      ['Cut vertices', g.cutVertices.length ? g.cutVertices.map(function (v) { return v.ch + ' (' + v.label + ')'; }).join(', ') +
        '<small>removing it splits the close-contact graph</small>' : 'none <small>the chart stays connected without any one character</small>'],
      ['Density', Math.round(g.density * 100) + '% <small>of the 28 pairs are linked by a combination, clash, harm or punishment</small>'],
      ['Combinations', g.combos.length ? '<small>' + g.combos.map(function (e) { return esc(e.note); }).join(', ') + '</small>' : 'none'],
      ['Conflicts', g.conflicts.length ? '<small>' + g.conflicts.map(function (e) { return esc(e.note); }).join(', ') + '</small>' : 'none']
    ]) +
    '<div class="hint">Nodes are the eight characters; edges are 相生 and 相克 flows weighted by proximity (same pillar or ' +
    'touching 1.0, diagonal 0.6, two apart 0.5, remote 0.25), stem and branch combinations, clashes, harms and ' +
    'punishments. PageRank runs on the generating and combining flow; betweenness uses Brandes&rsquo; algorithm with ' +
    'distance = 1/weight. The diagram draws only touching flows and every structural relation; the metrics use all edges.</div>';
  }

  /* ---------------- second wave: entropy, game theory, chaos, fuzzy logic ---------------- */

  function ordinal(n) {
    var t = n % 100, u = n % 10;
    return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
  }

  function entropyHtml(en, population) {
    return '<div class="verdictbar"><span class="big ' + (en.percentile < 33 ? 'good' : en.percentile < 67 ? 'mid' : 'bad') +
      '">' + en.percentile + '<small style="font-size:.6em">' + ordinal(en.percentile).replace(String(en.percentile), '') + ' pct</small></span><span class="sub">' + esc(en.word) +
      '<br>mean normalised entropy ' + en.uncertainty + '</span></div>' +
      rows(en.parts.map(function (p) {
        return [esc(p.name), p.e.H + ' bits <small>of a maximum ' + p.e.max + ' (' + p.of + ') &middot; normalised ' +
          p.e.norm + '</small>'];
      })) +
    '<div class="hint">H = &minus;&Sigma; p log&#8322; p, normalised by log&#8322; n so 0 means one outcome and 1 an even spread. ' +
    'Most ' + population + ' sit close to 1, so the figure that matters is the percentile against ' +
    ({ charts: '3,000 reference charts', boards: '3,000 reference boards', casts: '400 reference casts' }[population]) +
    ' (tools/calibrate-entropy.js): ' +
    'a high percentile means more evenly spread, conflicting forces than usual.</div>';
  }

  function gameHtml(gm, hint) {
    if (!gm) return '<div class="empty">This method does not place both sides on the outer plate, so there is no game to solve.</div>';
    var cell = function (v) {
      var a = Math.min(0.75, Math.abs(v) / 3 + 0.08);
      return '<td style="background:' + (v >= 0 ? 'rgba(79,143,196,' : 'rgba(200,69,47,') + a.toFixed(2) + ')">' +
        (v > 0 ? '+' : '') + v + '</td>'; };
    var vc = gm.value >= 0.3 ? 'good' : gm.value > -0.3 ? 'mid' : 'bad';
    return '<div class="verdictbar"><span class="big ' + vc + '">' + gm.stance + '</span><span class="sub">equilibrium stance &middot; game value ' +
      (gm.value > 0 ? '+' : '') + gm.value + '<br>safest (maximin): ' + gm.safe + ', never worse than ' + gm.safeValue + '</span></div>' +
      (gm.value < -0.3 ? '<div class="panel" style="margin-top:8px;font-size:.86rem;line-height:1.6">The value is negative: ' +
        'with best play on both sides you still lose ground here. ' + gm.stance + ' is damage limitation, not a winning ' +
        'move — if the contest can be postponed to a better window, that beats every option on this table.</div>' : '') +
      rows([
        ['You / them', esc(gm.selfLabel) + ' in ' + gm.selfPalace + ' <small>against ' + esc(gm.themLabel) + ' in ' + gm.themPalace + '</small>'],
        ['Initiative', '<small>' + esc(gm.initiative) + (gm.guest !== undefined ? ' (guest ' + gm.guest + ' vs host ' +
          gm.host + ', t = ' + gm.t + ')' : ' (t = ' + gm.t + ')') + '</small>'],
        ['Seat advantage a', gm.a + ' <small>' + esc(gm.relText) + ', plus net palace support</small>'],
        ['Mixed equilibrium', '<small>you: ' + gm.moves.map(function (mv, i) { return mv + ' ' + gm.mixed.you[i] + '%'; }).join(', ') +
          '<br>them: ' + gm.moves.map(function (mv, i) { return mv + ' ' + gm.mixed.them[i] + '%'; }).join(', ') + '</small>'],
        ['Pure saddle point', gm.saddle ? gm.saddle.you + ' against ' + gm.saddle.them + ' <small>value ' + gm.saddle.value + '</small>'
          : 'none <small>no single move is safe against every reply — mix, or read their move first</small>']
      ]) +
      '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Payoff to you (rows) against their move (columns)</div>' +
      '<table class="heat"><tr><th></th>' + gm.moves.map(function (mv) { return '<th>' + mv + '</th>'; }).join('') + '</tr>' +
      gm.U.map(function (row, i) { return '<tr><th>' + gm.moves[i] + '</th>' + row.map(cell).join('') + '</tr>'; }).join('') + '</table>' +
      '<div style="margin-top:10px">' + rows(gm.bestResponse.map(function (b) {
        return ['If they ' + b.them.toLowerCase(), b.you + ' <small>payoff ' + b.payoff + '</small>']; })) + '</div>' +
      '<div class="hint">' + (hint ? hint + ' ' : '主 host = earth plate, the side that holds; 客 guest = heaven plate, the side that moves first. ') +
      'Zero-sum: Attack/Attack = a; Attack/Hold = a + t &minus; &frac12; (the host&rsquo;s rest advantage, 主逸客劳); ' +
      'Attack/Maneuver = a + &frac12; (半渡而击); Hold/Hold = 0; Maneuver gains m by moving to your best-aligned palace, ' +
      'and they gain m&prime;. The table is antisymmetric under swapping sides. Equilibrium by fictitious play, checked ' +
      'by indifference. Most meaningful for negotiation, litigation and competitive questions.</div>';
  }

  function qimenChaosHtml(qc) {
    var sv = qc.sensitivity;
    return rows([
      ['Lyapunov λ', (qc.lyapunov.lambda > 0 ? '+' : '') + qc.lyapunov.lambda + ' <small>' + esc(qc.lyapunov.word) + '</small>'],
      ['Next plate', qc.nextFlip.when.date + ' ' + qc.nextFlip.when.range + ' <small>becomes ' + qc.nextFlip.state +
        ' (score ' + qc.nextFlip.score + ')</small>'],
      ['Step sensitivity', sv + '&times; <small>this cast&rsquo;s next step jumps ' + qc.localJump + ' against a typical ' +
        qc.typicalJump + (sv > 1.5 ? ' — you are at a tipping edge; a short delay changes the reading' :
          sv < 0.5 ? ' — locally stable; a short delay changes little' : '') + '</small>'],
      ['Next solar term', qc.hoursToTerm === null ? '—' : esc(qc.termName) + ' in ' + qc.hoursToTerm + ' h <small>' +
        (qc.hoursToTerm < 24 ? 'the ju changes within a day — the whole plate re-casts, a regime boundary' :
          'the plate keeps its ju until then') + '</small>'],
      ['Bifurcations', qc.bifurcations.length ? '<small>' + qc.bifurcations.map(function (b) { return b.when.date.slice(5) +
        ' ' + b.when.range.slice(0, 5) + ' ' + b.from + '&rarr;' + b.to; }).join('<br>') + '</small>' : 'none <small>no two-band jumps</small>'],
      ['Regimes', '<small>' + qc.regimes.map(function (sg) { return sg.from.date.slice(5) + ' &rarr; ' + sg.to.date.slice(5) +
        ': mean ' + sg.mean + ' (' + sg.length + ' double-hours)'; }).join('<br>') + '</small>']
    ]) +
    '<div class="hint">Fitting Lorenz equations to chart scores would be decoration: the chart has no differential equations ' +
    'for them to describe. What does apply: the engine is a discrete map of time, so its butterfly effect sits at boundaries ' +
    '(double-hour, solar term) where a few minutes re-cast the plate. λ is the largest Lyapunov exponent by Rosenstein&rsquo;s ' +
    'method on a 3-dimensional delay embedding (it returns 0 for a periodic signal and ≈ ln 2 for the chaotic logistic map); ' +
    'bifurcations are single-step jumps of two or more verdict bands; regimes come from binary segmentation of the mean.</div>';
  }

  function baziChaosHtml(bc) {
    return '<div class="verdictbar"><span class="big ' + (bc.fragile ? 'bad' : bc.structuralFlip ? 'mid' : 'good') + '">' +
      (bc.fragile ? 'Fragile' : bc.structuralFlip ? 'Sensitive' : 'Robust') + '</span><span class="sub">' + esc(bc.word) + '</span></div>' +
      rows([
        ['Hour boundary', bc.minutesToHourBoundary + ' min ahead <small>' + bc.minutesSinceHourBoundary + ' min since the last</small>'],
        ['Month boundary 節', '<small>' + bc.jie.map(function (j) { return esc(j.name) + ' ' + (j.hours < 0 ? Math.abs(j.hours) + ' h before birth'
          : j.hours + ' h after'); }).join(' &middot; ') + '</small>'],
        ['Day boundary', bc.minutesToDayEdge + ' min <small>from midnight</small>'],
        ['Luck-pillar start', '&plusmn;' + bc.luckShiftPerHourDays + ' days <small>per hour of birth-time error (3 days of the solar ' +
          'term = 1 year of age)</small>']
      ]) +
      '<div class="rows" style="margin-top:10px">' + bc.tests.map(function (t) {
        var flag = t.strongFlip || t.favFlip;
        return '<div class="row' + (flag ? ' fib-hot' : '') + '"><span class="k">' + (t.mins > 0 ? '+' : '') + t.mins + ' min</span>' +
          '<span class="v">' + t.pillars + '<small>' + (t.flips.length ? t.flips.join(', ') + ' pillar changes' : 'unchanged') +
          (t.strongFlip ? ' &middot; strength verdict flips' : '') + (t.favFlip ? ' &middot; favourable becomes ' +
          esc(t.favourableEn.join(', ')) : '') + '</small></span></div>'; }).join('') + '</div>' +
      '<div class="hint">Sensitivity to initial conditions, measured directly: the chart is recomputed with the birth time ' +
      'shifted by up to two hours either way. A pillar change that also flips the strength verdict or the favourable ' +
      'elements is a tipping point: if the recorded time is uncertain by that much, the reading itself is uncertain.</div>';
  }

  function fuzzyHtml(fz, opts) {
    opts = opts || {};
    var EL = ['木 Wood', '火 Fire', '土 Earth', '金 Metal', '水 Water'], CN = ['木', '火', '土', '金', '水'];
    var at = fz.birth || fz;
    var html = '<div style="font-size:.82rem;color:var(--brass)">Seasonal membership at λ = ' + at.longitude + '&deg;' +
      (opts.when ? ' (' + esc(opts.when) + ')' : '') + '</div>' +
      '<div class="ebal">' + at.membership.map(function (v, i) {
        return '<div><span>' + CN[i] + '</span><i style="width:' + (v * 60) + '%"></i><b>' + Math.round(v * 100) + '% &middot; strength ' +
          at.strength[i] + (at.crisp ? ' <small>(crisp ' + at.crisp[i] + ')</small>' : '') + '</b></div>'; }).join('') + '</div>' +
      '<div style="margin-top:10px">' + rows([
        ['Strongest generation', '<small>' + at.generate.slice(0, 2).map(function (g) { return CN[g.from] + '&rarr;' + CN[g.to] +
          ' ' + g.force; }).join(' &middot; ') + '</small>'],
        ['Strongest control', '<small>' + at.control.slice(0, 2).map(function (c) { return CN[c.from] + '&#8867;' + CN[c.to] +
          ' ' + c.force; }).join(' &middot; ') + ' — force s<sub>a</sub>&middot;(1 &minus; s<sub>b</sub>)</small>']
      ]) + '</div>';
    if (fz.curve) {
      html = '<div class="verdictbar"><span class="big ' + (fz.fuzzy >= 0.6 ? 'good' : fz.fuzzy >= 0.4 ? 'mid' : 'bad') + '">' +
        fz.fuzzy + '</span><span class="sub">Day Master ' + fz.dmCn + ' seasonal strength at birth (fuzzy)<br>crisp month-branch ' +
        'model: ' + fz.crisp + (fz.inTransition ? ' &middot; born inside a seasonal transition' : ' &middot; ' + fz.boundaryDays +
        '&deg; from the nearest season boundary') + '</span></div>' +
        rows([['旺相休囚死 degrees', fz.states.map(function (s) { return s.cn + ' ' + s.degree; }).join(' &middot; ')]]) +
        '<div style="margin-top:12px">' + html + '</div>' +
        '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">' + fz.dmCn + ' Day Master through ' + fz.curve.year + '</div>' +
        lineChart('lc-fuzzy-' + Math.floor(Math.random() * 1e6), { xs: fz.curve.xs, actual: fz.curve.fuzzy, fit: fz.curve.crisp,
          notes: fz.curve.notes, title: 'Fuzzy against crisp seasonal strength', actualLabel: 'Fuzzy strength',
          fitLabel: 'Crisp (month branch)', endA: 'fuzzy', endF: 'crisp' });
    }
    return html + '<div class="hint">Each element has a trapezoidal membership over solar longitude — Wood 315&deg;&ndash;27&deg;, ' +
      'Fire 45&deg;&ndash;117&deg;, Metal 135&deg;&ndash;207&deg;, Water 225&deg;&ndash;297&deg;, Earth the four 18&deg; 土用 windows — ' +
      'softened over 8&deg; (about 8 days) at every boundary, and summing to 1 at every point. 旺相休囚死 become degrees, and ' +
      'strength is their weighted mean (1, 0.75, 0.5, 0.25, 0). Where the crisp model jumps on the day of a 節, the fuzzy ' +
      'one cross-fades.</div>';
  }

  /* ---- Zi Wei ---- */

  function zwdsFuzzyHtml(zf) {
    return '<div class="verdictbar"><span class="big ' + (zf.handover ? 'mid' : 'good') + '">' + (zf.handover ? 'Handover' : 'Settled') +
      '</span><span class="sub">' + (zf.current ? 'in the ' + zf.current.palace + ' 大限 (crisp ' + zf.crispNow + ', fuzzy ' + zf.fuzzyNow + ')' : '') +
      (zf.next ? '<br>next: ' + zf.next.palace + ' (' + zf.next.score + ') in ' + zf.next.inYears + ' years' : '') + '</span></div>' +
      '<div style="margin-top:12px">' + lineChart('lc-zwfz-' + Math.floor(Math.random() * 1e6), { xs: zf.xs, actual: zf.fuzzy,
        fit: zf.crisp, notes: zf.notes, now: zf.ageNow - 1, title: 'Decade score, fuzzy against crisp',
        actualLabel: 'Fuzzy (cross-faded)', fitLabel: 'Crisp (switch on the birthday)', endA: 'fuzzy', endF: 'crisp' }) + '</div>' +
      '<div class="hint">Crisply, a 大限 switches on a birthday. Here each decade&rsquo;s membership ramps over two years ' +
      'centred on its boundaries — trapezoids that sum to 1 — so the outgoing and incoming decades share the handover ' +
      'years, and a large swing between them arrives as a slope rather than a cliff.</div>';
  }

  function zwdsChaosHtml(zc) {
    return '<div class="verdictbar"><span class="big ' + (zc.fragile ? 'bad' : zc.tests.some(function (t) { return t.changes.length; }) ? 'mid' : 'good') +
      '">' + (zc.fragile ? 'Fragile' : zc.tests.some(function (t) { return t.changes.length; }) ? 'Sensitive' : 'Robust') +
      '</span><span class="sub">' + esc(zc.word) + '</span></div>' +
      rows([
        ['Hour boundary', zc.minutesToHourBoundary + ' min ahead <small>' + zc.minutesSinceHourBoundary + ' min since the last — the hour picks the Life palace</small>'],
        ['Midnight', zc.minutesToMidnight + ' min <small>a day change moves the lunar day, and with it 紫微</small>'],
        ['Lyapunov λ', (zc.lyapunov.lambda > 0 ? '+' : '') + zc.lyapunov.lambda + ' <small>of the 120-year flow-year series — ' + esc(zc.lyapunov.word) + '</small>']
      ]) +
      '<div class="rows" style="margin-top:10px">' + zc.tests.map(function (t) {
        return '<div class="row' + (t.changes.length ? ' fib-hot' : '') + '"><span class="k">' + (t.mins > 0 ? '+' : '') + t.mins + ' min</span>' +
          '<span class="v">命 ' + t.ming + ' <small>' + (t.changes.length ? esc(t.changes.join('; ')) : 'same board') + '</small></span></div>';
      }).join('') + '</div>' +
      '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Life chapters — regime shifts in the flow-year series</div>' +
      '<div class="rows" style="margin-top:6px">' + zc.chapters.map(function (c) {
        return '<div class="row"><span class="k">Age ' + c.from + '–' + c.to + '<small>' + c.fromYear + '–' + c.toYear + '</small></span>' +
          '<span class="v"><b class="' + (c.mean >= 3 ? 'good' : c.mean >= 1 ? 'mid' : 'bad') + '-t">' + c.mean + '</b> <small>mean score</small></span></div>';
      }).join('') + '</div>' +
      '<div class="hint">The board is recomputed with the birth time shifted up to two hours either way. Chapters come from ' +
      'binary segmentation of a five-year moving average of the flow-year score, so each marks a lasting change of level ' +
      'rather than a single good or bad year.</div>';
  }

  /* ---- San Cai ---- */

  function sancaiEntropyHtml(se) {
    return '<div class="verdictbar"><span class="big ' + (se.choice.norm < 0.5 ? 'good' : se.choice.norm < 0.8 ? 'mid' : 'bad') + '">' +
      Math.round(se.decisiveness * 100) + '%</span><span class="sub">decisiveness &middot; ' + esc(se.word) + '</span></div>' +
      rows([
        ['Choice entropy', se.choice.H + ' bits <small>of ' + se.choice.max + ' over the top ' + se.candidates + ' candidates; normalised ' + se.choice.norm + '</small>'],
        ['Lead over runner-up', se.lead === null ? '—' : se.lead + ' points']
      ]) +
      '<div class="hint">Candidates are weighted p &prop; exp((score &minus; best)/4), a Boltzmann distribution with a 4-point ' +
      'temperature, so windows within a few points of the best share the probability. Low entropy means the winner is ' +
      'clearly the right choice; high entropy means several windows are effectively equivalent.</div>';
  }

  function sancaiFuzzyHtml(sf) {
    var L = { heaven: '天 Heaven', earth: '地 Earth', man: '人 Man' };
    return '<div class="verdictbar"><span class="big ' + (sf.and >= 0.6 ? 'good' : sf.and >= 0.3 ? 'mid' : 'bad') + '">' + sf.and +
      '</span><span class="sub">fuzzy AND of the three layers (weakest link: ' + sf.weakest + ')<br>membership of the composite ' +
      'in &ldquo;strong&rdquo;: ' + sf.strong + '</span></div>' +
      (sf.masked ? '<div class="panel" style="margin-top:8px;font-size:.86rem;line-height:1.6">The weighted composite looks ' +
        'strong, but ' + sf.weakest + ' is weak: the average is hiding a layer that does not align. San Cai assumes all three ' +
        'agree — shore up the ' + sf.weakest + ' side, or treat this window as weaker than its score.</div>' : '') +
      '<div class="ebal" style="margin-top:10px">' + ['heaven', 'earth', 'man'].map(function (k) {
        return '<div><span style="width:58px">' + L[k] + '</span><i style="width:' + (sf.membership[k] * 55) + '%"></i><b>' +
          sf.membership[k] + '</b></div>'; }).join('') + '</div>' +
      rows([['Product t-norm', sf.product + ' <small>stricter than the minimum: every shortfall compounds</small>'],
            ['Your elements in season', sf.favourableStrength === null ? '—' : sf.favourableStrength +
              ' <small>mean fuzzy seasonal strength of your favourable elements at the window</small>']]) +
      '<div class="hint">Each layer score maps to membership in &ldquo;aligned&rdquo; by a ramp from 40 (0) to 70 (1). The fuzzy ' +
      'AND is the minimum (Gödel t-norm): the window is only as aligned as its weakest layer, which is San Cai&rsquo;s own ' +
      'premise. The crisp composite is a weighted average, which lets a strong layer mask a weak one.</div>';
  }

  function sancaiChaosHtml(sc) {
    return rows([
      ['If it slips', sc.slipNext.when.date + ' ' + sc.slipNext.when.range + ' <small>Man layer ' + sc.slipNext.score +
        (sc.slipNext.drop > 0 ? ', down ' + sc.slipNext.drop + ' — start inside the window, a late start costs real alignment' :
          ', no worse — some slippage is tolerable') + '</small>'],
      ['Lyapunov λ', (sc.lyapunov.lambda > 0 ? '+' : '') + sc.lyapunov.lambda + ' <small>' + esc(sc.lyapunov.word) + '</small>'],
      ['Nearest 節', esc(sc.jie.name) + ' ' + (sc.jie.hours < 0 ? Math.abs(sc.jie.hours) + ' h before' : sc.jie.hours + ' h after') +
        ' <small>' + (sc.sectorFlip ? (sc.sectorFlip.changes ? 'the monthly flying star changes: on ' + sc.sectorFlip.other +
          ' the best sector becomes ' + sc.sectorFlip.sector + ' — do not move the window across it' :
          'the monthly star changes but the best sector holds') : 'far enough that the monthly stars hold') + '</small>'],
      ['Bifurcations', sc.bifurcations.length ? '<small>' + sc.bifurcations.map(function (b) {
        return b.when.date.slice(5) + ' ' + b.when.range.slice(0, 5) + ': ' + b.from + '&rarr;' + b.to; }).join('<br>') + '</small>' :
        'none in five days']
    ]) +
    '<div class="hint">The goal&rsquo;s Man layer is recast for 60 double-hours from the window. λ is the largest Lyapunov ' +
    'exponent of that series; bifurcations are jumps of two or more bands (70 / 55 / 40). A 節 changes the monthly flying ' +
    'star, so a window near one can lose its sector overnight.</div>';
  }

  /* ---- Qimen destiny profile ---- */

  function destinyProfileHtml(dp) {
    var d = dp.destiny;
    var palaceBlock = d ? block('Destiny palace 命宮', 'where your Day Stem sits on the heaven plate',
      '<div class="verdictbar"><span class="big good">' + d.palace + ' ' + d.name + '</span><span class="sub">' +
        esc(d.dir) + ' &middot; ' + esc(d.element) + (d.isEmpty ? ' &middot; void (空亡)' : '') +
        (d.lodged ? '<br>centre palace, read from 坤 where the centre lodges' : '') + '</span></div>' +
      rows([
        ['Direction', esc(d.dir) + ' <small>palace ' + d.palace + ' ' + d.name + '</small>'],
        ['Life Stem', d.lifeStem + ' <small>' + esc(d.lifeStemEn) + (d.hiddenUnder ? ' — 甲 hides under ' + d.hiddenUnder : '') +
          ' &middot; over earth stem ' + d.earthStem + '</small>'],
        ['Door of Destiny', esc(d.door) + ' <small>' + esc(d.doorEn) + (d.doorStrength ? ' &middot; ' + d.doorStrength.cn + ' ' +
          d.doorStrength.en : '') + (d.doorPalace ? ' &middot; ' + d.doorPalace.cn + ' ' + d.doorPalace.en : '') + '</small>'],
        ['Star of Destiny', esc(d.star) + ' <small>' + esc(d.starEn) + (d.starStrength ? ' &middot; ' + d.starStrength.cn + ' ' +
          d.starStrength.en : '') + '</small>'],
        ['Guardian of Destiny', esc(d.guardian) + ' <small>the deity seated with your Life Stem</small>'],
        ['Life Star', dp.lifeStar.num + ' ' + esc(dp.lifeStar.en) + ' <small>本命星 — Nine Star Ki star of your solar birth year</small>'],
        ['Life Gua', dp.lifeGua.num + ' ' + esc(dp.lifeGua.cn) + ' <small>命卦 — ' + dp.lifeGua.group + ' group &middot; best ' +
          dp.lifeGua.best + ' &middot; favourable ' + dp.lifeGua.good.join(', ') + ' &middot; avoid ' + dp.lifeGua.avoid.join(', ') + '</small>']
      ])) : '';
    var starsBlock = block('Day Master stars', 'Day Master ' + dp.dayMaster.stem + ' ' + esc(dp.dayMaster.en),
      rows([['Day Master stem', dp.dayMaster.stem + ' <small>' + esc(dp.dayMaster.en) + '</small>']].concat(
        dp.stars.map(function (s) {
          return [esc(s.en) + ' <small>' + s.cn + '</small>', s.branches.map(function (b) {
            return b.branch + ' ' + esc(b.animal) + ' <small>palace ' + b.palace + ' ' + esc(b.dir) + ' &middot; ' + esc(b.door || '—') +
              ', ' + esc(b.deity || '—') + (b.isEmpty ? ' &middot; void' : '') +
              (b.inPillars.length ? ' &middot; in your ' + b.inPillars.join(' and ') + ' pillar' : '') + '</small>';
          }).join('<br>') + '<small>' + esc(s.basis) + '</small>'];
        })).concat([dp.mindPalace, dp.soulPalace].map(function (m) {
          return [esc(m.en) + ' <small>' + m.cn + '</small>', m.pillar + ' ' + esc(m.name) + ' <small>palace ' + m.palace + ' ' +
            esc(m.dir) + ' &middot; ' + esc(m.door || '—') + ', ' + esc(m.deity || '—') + (m.isEmpty ? ' &middot; void' : '') +
            '</small><small>' + esc(m.rule) + '</small>'];
        }))) +
      '<div class="hint">Each star is taken from your Day Master (or, for Peach Blossom and Sky Horse, your day branch), ' +
      'using the same tables as Destiny › Relations, and placed on the plate by its branch. &ldquo;In your … pillar&rdquo; ' +
      'means the branch also appears in your Four Pillars.</div>');
    return palaceBlock + starsBlock;
  }

  /* ---- Zi Wei flying stars: tensor and network ---- */

  function zwdsFlyingSvg(fl) {
    var cx = 175, cy = 150, R = 112, n = 12;
    var pos = function (b) { var a = -Math.PI / 2 + (b / n) * 2 * Math.PI; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; };
    var rad = function (b) { return 9 + fl.nodes[b].pagerank / 3; };
    var cls = ['ge-lu', 'ge-quan', 'ge-ke', 'ge-ji'];
    var paths = fl.edges.map(function (e) {
      var a = pos(e.a), b = pos(e.b);
      if (e.a === e.b) { var ox = (a[0] - cx) * 0.18, oy = (a[1] - cy) * 0.18;
        return '<circle class="fl ' + cls[e.hua] + '" cx="' + (a[0] + ox).toFixed(1) + '" cy="' + (a[1] + oy).toFixed(1) +
          '" r="7" fill="none"><title>' + esc(fl.nodes[e.a].name + ' 自化' + ['禄', '权', '科', '忌'][e.hua] + ' ' + e.star) + '</title></circle>'; }
      var mx = (a[0] + b[0]) / 2 + (cy - (a[1] + b[1]) / 2) * 0.25, my = (a[1] + b[1]) / 2 + ((a[0] + b[0]) / 2 - cx) * 0.25;
      var trim = function (p, c, r) { var dx = c[0] - p[0], dy = c[1] - p[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        return [p[0] + dx / L * r, p[1] + dy / L * r]; };
      var s0 = trim(a, [mx, my], rad(e.a)), s1 = trim(b, [mx, my], rad(e.b) + 2);
      return '<path class="fl ' + cls[e.hua] + '" d="M' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1) + ' Q' + mx.toFixed(1) + ' ' +
        my.toFixed(1) + ' ' + s1[0].toFixed(1) + ' ' + s1[1].toFixed(1) + '" marker-end="url(#fa-' + e.hua + ')"><title>' +
        esc(fl.nodes[e.a].name + ' → ' + fl.nodes[e.b].name + ' ' + e.star + '化' + ['禄', '权', '科', '忌'][e.hua]) + '</title></path>';
    }).join('');
    var nodes = fl.nodes.map(function (nd, b) { var p = pos(b), r = rad(b);
      return '<g class="gn"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '" class="fn' +
        (nd.inflow < 0 ? ' neg' : '') + '"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) +
        '" text-anchor="middle" class="fch">' + nd.name + '</text><title>' + esc(nd.name + ' · net inflow ' + nd.inflow + ' · PageRank ' +
        nd.pagerank + '%') + '</title></g>'; }).join('');
    var mk = function (i, c) { return '<marker id="fa-' + i + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" ' +
      'orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" class="' + c + '"/></marker>'; };
    return '<svg class="bgraph" viewBox="0 0 350 300" role="img" aria-label="Flying-star network">' +
      '<defs>' + mk(0, 'fa-lu') + mk(1, 'fa-quan') + mk(2, 'fa-ke') + mk(3, 'fa-ji') + '</defs>' + paths + nodes + '</svg>' +
      '<div class="glegend"><span><i class="lg lg-lu"></i>化禄</span><span><i class="lg lg-qk"></i>化权 / 化科</span>' +
      '<span><i class="lg lg-ji"></i>化忌</span><span>circle on a node = 自化 · node size = PageRank</span></div>';
  }

  function zwdsFlyingHtml(fl) {
    return zwdsFlyingSvg(fl) + rows([
      ['Support pools in', fl.supportHub.name + ' <small>' + fl.supportHub.nameEn + ' · PageRank ' + fl.supportHub.pagerank +
        '% on the 禄权科 flows</small>'],
      ['Richest net inflow', fl.richest.name + ' <small>' + (fl.richest.inflow > 0 ? '+' : '') + fl.richest.inflow + ' (' +
        fl.richest.lu + ' 禄 in)</small>'],
      ['Obstruction sink', fl.jiSink.name + ' <small>net ' + fl.jiSink.inflow + ', ' + fl.jiSink.ji + ' 忌 in — the palace other ' +
        'palaces push their troubles into</small>'],
      ['Bridge', fl.bridge.name + ' <small>betweenness ' + fl.bridge.betweenness + '</small>'],
      ['忌转忌 from 命宫', esc(fl.jiChain.join(' → ')) + (fl.jiCycle ? ' <small>closes a cycle at ' + esc(fl.jiCycle.join(' → ')) +
        ' — trouble that circulates rather than discharges</small>' : '')],
      ['自化', fl.selfHua.length ? '<small>' + fl.selfHua.map(esc).join('<br>') + '</small>' : 'none'],
      ['互化', fl.mutual.length ? '<small>' + fl.mutual.map(esc).join('<br>') + '</small>' : 'none'],
      ['λ₁ / |λ₂|', (fl.dominance === null ? '—' : fl.dominance) + ' <small>λ₁ ' + fl.lambda1 + ', λ₂ ' + fl.lambda2 +
        ' — how concentrated the supportive flow is</small>']
    ]) +
    '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Net inflow by palace (column sums of F)</div>' +
    '<div class="rows" style="margin-top:6px">' + fl.nodes.slice(0).sort(function (a, b) { return b.inflow - a.inflow; }).map(function (nd) {
      return '<div class="row"><span class="k">' + nd.name + '<small>' + nd.nameEn + '</small></span><span class="v"><b class="' +
        (nd.inflow > 0 ? 'good' : nd.inflow < 0 ? 'bad' : 'mid') + '-t">' + (nd.inflow > 0 ? '+' : '') + nd.inflow + '</b> <small>' +
        nd.lu + ' 禄 · ' + nd.ji + ' 忌 in · PageRank ' + nd.pagerank + '%</small></span></div>'; }).join('') + '</div>' +
    '<div class="hint">Flying stars (宫干飞化): each palace&rsquo;s stem sends its 禄, 权, 科 and 忌 to the palaces holding those ' +
    'stars. That is a rank-3 tensor T[source][target][transformation] (12 &times; 12 &times; 4); contracting the transformation ' +
    'mode with 禄 +3, 权 +2, 科 +1.5, 忌 &minus;3 gives the 12 &times; 12 flow matrix F. Graph metrics run on the same flows: ' +
    'PageRank on 禄权科, betweenness on the undirected graph, and the 忌 chain traced from the Life palace until it repeats.</div>';
  }

  /* ---- San Cai: components and campaign ---- */

  function sancaiPCAHtml(pc) {
    if (!pc) return '<div class="empty">Too few candidates to analyse.</div>';
    var fmt = function (v) { return v === null ? '—' : (v > 0 ? '+' : '') + v; };
    return rows([
      ['Deciding layer', '<b>' + pc.driver + '</b> <small>the layer loading most on the first principal ' +
        'component (' + pc.components[0].share + '% of the variance)</small>'],
      ['Components', '<small>' + pc.components.map(function (c, i) { return 'PC' + (i + 1) + ' ' + c.share + '%: ' +
        c.loadings.map(function (v, j) { return pc.labels[j].split(' ')[0] + ' ' + v; }).join(', '); }).join('<br>') + '</small>'],
      ['Trade-offs', pc.tradeoffs.length ? '<small>' + pc.tradeoffs.map(function (t) { return t.a + ' vs ' + t.b + ' r = ' + t.r; })
        .join('; ') + ' — across the candidates, a better one tends to come with a worse other</small>' : 'none <small>no pair of layers works against each other</small>'],
      ['Flat layers', pc.flat.length ? pc.flat.join(', ') + ' <small>barely varies across the ' + pc.n + ' candidates (often the month&rsquo;s ' +
        'flying stars) — it cannot change the ranking, only the overall level</small>' : 'none']
    ]) +
    '<table class="heat" style="margin-top:10px"><tr><th>r</th>' + pc.labels.map(function (l) { return '<th>' + l.split(' ')[0] + '</th>'; }).join('') + '</tr>' +
    pc.corr.map(function (row, i) { return '<tr><th>' + pc.labels[i].split(' ')[0] + '</th>' + row.map(function (v) {
      var a = v === null ? 0.05 : Math.min(0.7, Math.abs(v) * 0.7 + 0.05);
      return '<td style="background:' + (v !== null && v < 0 ? 'rgba(200,69,47,' : 'rgba(79,143,196,') + a.toFixed(2) + ')">' + fmt(v) + '</td>';
    }).join('') + '</tr>'; }).join('') + '</table>' +
    '<div class="hint">The top ' + pc.n + ' candidate windows form an n &times; 3 matrix of Heaven, Earth and Man scores. Its ' +
    'covariance is eigendecomposed by power iteration with deflation (valid, since a covariance matrix is symmetric). The ' +
    'first component names the layer that actually decides between windows; a negative correlation is a genuine trade-off.</div>';
  }

  function sancaiCampaignHtml(cp) {
    if (!cp || !cp.path) return '<div class="empty">No three-window sequence fits the 1–7 day spacing inside this search window. ' +
      'Widen the window to plan a campaign.</div>';
    return '<div class="verdictbar"><span class="big good">' + cp.mean + '</span><span class="sub">mean score of the best three-step ' +
      'sequence (total ' + cp.total + ')</span></div>' +
      '<div class="rows" style="margin-top:10px">' + cp.path.map(function (p) {
        return '<div class="row fib-hot"><span class="k">' + p.role + '<small>' + p.iso + ' ' + p.range + '</small></span>' +
          '<span class="v">' + p.score + ' <small>sit ' + esc(p.sector) + ' &middot; face ' + esc(p.face) + '</small></span></div>';
      }).join('') + '</div>' +
      '<div class="hint">' + cp.nodes + ' candidate windows are nodes of a time-ordered directed acyclic graph, with an edge ' +
      'wherever the next window falls 1–7 days later (' + cp.edges + ' edges). Dynamic programming finds the longest path of ' +
      'three nodes: the best opening, follow-up and close as a sequence, which is not always three of the top single windows.</div>';
  }

  // Collapsible group with a headline row, so the reading stays readable above it.
  function quantGroup(title, headline, inner) {
    return '<details class="quant"><summary><b>' + title + '</b><span>' + headline + '</span></summary>' + inner + '</details>';
  }

  /* ---------------- Zi Wei timing: 大限, 流年, 四化 and Fibonacci ---------------- */

  // 紫微(庙)、贪狼(平) — stars with their 庙旺利陷 grade.
  function starsBright(pal) {
    return pal.stars.map(function (s, i) {
      return s + (pal.bright && pal.bright[i] ? '(' + pal.bright[i] + ')' : ''); }).join('、');
  }

  // 左辅、文昌(得)、擎羊(陷) — minor stars, auspicious first, with any grade.
  function minorsLine(pal) {
    return (pal.minors || []).map(function (s, i) {
      var g = pal.minorBright ? pal.minorBright[i] : '';
      return '<span class="' + (S.MINOR_TONE[s] < 0 ? 'bad-t' : 'good-t') + '">' + s + (g ? '(' + g + ')' : '') + '</span>';
    }).join('、');
  }

  function zwdsForecastHtml(zf) {
    var cls = function (x) { return x >= 1 ? 'good' : x > -1 ? 'mid' : 'bad'; };
    var sgn = function (x) { return '<b class="' + cls(x) + '-t">' + (x > 0 ? '+' : '') + x + '</b>'; };
    var huaLine = function (r) {
      return (r.lu ? r.lu.star + '化禄 → ' + (r.lu.palace || 'off-board') : '') +
        (r.ji ? ' &middot; ' + r.ji.star + '化忌 → ' + (r.ji.palace || 'off-board') : '');
    };
    var cur = zf.current;
    return block('大限 Decade limits', (zf.forward ? 'forward' : 'reverse') + ' from the Life palace, nominal ages',
        '<div class="rows">' + zf.decades.slice(0, 9).map(function (d) {
          return '<div class="row"' + (d.current ? ' style="background:var(--raised-2)"' : '') + '>' +
            '<span class="k">Age ' + d.from + '–' + d.to + (d.current ? ' <b style="color:var(--cinnabar)">now</b>' : '') +
            '<small>' + d.startYear + '–' + d.endYear + '</small></span>' +
            '<span class="v">' + d.palace.name + ' ' + d.palace.stemCn + d.palace.branchCn + ' ' + sgn(d.score) +
            '<small>' + (starsBright(d.palace) || 'empty — borrows opposite') + ' &middot; ' +
            esc(d.notes.filter(function (n) { return n.indexOf('period') === 0; }).join('; ') || 'no 四化 in field') +
            '</small></span></div>';
        }).join('') + '</div>') +

      (cur ? block('Inside the current decade', cur.palace.name + ' 大限 · ' + zf.phase + '% elapsed',
        '<div class="fibbar big"><i style="width:' + zf.phase + '%"></i>' +
        '<s style="left:38.2%"></s><s style="left:50%"></s><s style="left:61.8%"></s></div>' +
        rows(zf.marks.map(function (m) {
          return ['Golden point ' + m.label, m.year + '-' + pad2(m.month) +
            (m.past ? ' <small>passed</small>' : ' <small>ahead</small>')];
        }).concat([['Why it scores ' + cur.score, '<small>' + esc(cur.notes.join('; ') || '—') + '</small>']])) +
        '<div style="margin-top:12px;font-size:.82rem;color:var(--brass)">Fibonacci years from the decade start (' +
          cur.startYear + ')</div>' +
        '<div class="rows" style="margin-top:6px">' + zf.zones.map(function (r) {
          return '<div class="row' + (r.past ? ' fib-past' : '') + '"><span class="k">+' + r.offset +
            ' &middot; ' + r.year + '<small>' + r.pillar.cn + ' 流年 in ' + r.palace.name + '</small></span>' +
            '<span class="v">' + sgn(r.score) + '<small>' + huaLine(r) + '</small></span></div>';
        }).join('') + '</div>') : '') +

      block('流年 Year ahead · Fibonacci projection', '8 years, annual 0.618 + decade 0.382',
        fibSummaryHtml(zf.years, cls) +
        '<div style="margin-top:10px">' + fibRowsHtml(zf.years.points, {
          mark: function (p) { return p === zf.years.best; },
          extra: function (p) { return p.pillar.cn + ' 流年 in ' + p.palace.name + ' &middot; ' + huaLine(p); }
        }) + '</div>') +

      block('Fibonacci ages', 'flow-year palace at nominal ages 1, 2, 3, 5 … 89',
        '<div class="rows">' + zf.ages.map(function (a) {
          var nx = zf.nextAge && a.age === zf.nextAge.age;
          return '<div class="row' + (a.past ? ' fib-past' : '') + (nx ? ' fib-hot' : '') + '"><span class="k">Age ' +
            a.age + (nx ? ' <b style="color:var(--cinnabar)">next</b>' : '') + '<small>' + a.year + '</small></span>' +
            '<span class="v">' + a.palace.name + ' ' + sgn(a.score) + '<small>' + huaLine(a) + '</small></span></div>';
        }).join('') + '</div>' +
        '<div class="hint">大限, 流年 and 四化 are classical Zi Wei timing. Periods are scored from the ' +
        'fourteen major stars across 三方四正, each weighted by its brightness (庙旺得利平不陷: a bright ' +
        'benign star counts for more, a fallen one for nothing; a volatile star is tamed at 庙 and at ' +
        'its worst at 陷), and the 四化 landing there, scaled by the brightness of the star it lands ' +
        'on. The fourteen minor stars — 六吉 (左辅 右弼 文昌 文曲 天魁 天钺), 禄存, 天马 and 六煞 ' +
        '(擎羊 陀罗 火星 铃星 地空 地劫) — count at three quarters of a major star, with the 左右, 昌曲 ' +
        'and 魁钺 pairs and 禄马交驰 recognised. Other minor and miscellaneous stars are not placed. ' +
        'The Fibonacci projection and golden points are a QiPath synthesis on top.</div>');
  }

  /* ---------------- Strategy › Structures: the strongest palaces in the hourly charts ahead ---------------- */
  // The scan casts about 720 hourly plates, so it runs after the page draws and is kept for the day.
  var structCache = null, STRUCT_DAYS = 60;
  function structureScanToday() {
    var t = now(), key = user.id + '|' + fmt(t);
    if (!structCache || structCache.key !== key) {
      structCache = { key: key, res: window.QPQimen.structureScan({ y: t.y, m: t.m, d: t.d }, STRUCT_DAYS, user.deep.favourable) };
    }
    return structCache.res;
  }
  // The hour's chart as a 3×3 grid in Lo Shu order (4 9 2 / 3 5 7 / 8 1 6), the structure's palace highlighted.
  function structureGridHtml(grid) {
    return '<div class="qgrid">' + grid.map(function (g) {
      return '<div class="qcell' + (g.hl ? ' hl' : '') + (g.isEmpty ? ' void' : '') + '"><span class="d">' + g.num + ' ' + g.dir + '</span>' +
        (g.num === 5 ? '<span>' + esc(g.heaven + g.earth) + '</span>' :
          '<span>' + esc(g.heaven) + '<small>/' + esc(g.earth) + '</small></span><span>' + esc(g.star) + '</span><span>' + esc(g.gate) +
          '</span><span>' + esc(g.deity) + '</span>') + '</div>';
    }).join('') + '</div>';
  }
  function structureCard(s, i) {
    var major = s.formations.filter(function (f) { return f.major; });
    return '<div class="panel struct">' +
      '<div class="sh"><b>' + WD[new Date(s.dt.y, s.dt.m - 1, s.dt.d).getDay()].slice(0, 3) + ' ' + s.date + ' &middot; ' + s.range + '</b>' +
        '<span class="good-t">' + esc(s.palace.dir) + '</span></div>' +
      '<div class="plain">' + esc(s.summary) + '</div>' +
      '<div class="st" style="margin:8px 0">' + major.slice(0, 4).map(function (f) { return '<span class="tag on">' + esc(f.name) + '</span>'; }).join('') +
        '<span class="tag">' + esc(s.gate || '') + '</span><span class="tag">' + esc(s.deity || '') + '</span><span class="tag">' +
        esc((s.heaven || '') + '/' + (s.earth || '')) + '</span><span class="tag">' + esc(s.star || '') + '</span></div>' +
      '<details class="tech"><summary>Why it is strong, and the chart</summary>' +
        '<ul class="plain" style="margin:6px 0;padding-left:18px">' + major.map(function (f) {
          return '<li><b>' + esc(f.name) + '</b> ' + esc(f.nameEn) + ' — ' + esc(f.description) + '</li>'; }).join('') +
          s.goodFor.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' +
        structureGridHtml(s.grid) + '<div class="hint" style="margin-top:6px">' + s.hourPillar + ' hour, ' + s.dayPillar + ' day &middot; ' +
          s.dun + ' ju ' + s.ju + ' &middot; score ' + s.score + '</div></details>' +
      '<button class="btn ghost" data-struct="' + i + '">Open the manifestation script</button></div>';
  }
  function openManifestFor(s) {
    manifestPick = { dt: s.dt, palaceNum: s.palace.num, formation: s.formations[0] || null };
    consultK = 'manifest';
    $('segConsult').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.k === 'manifest')); });
    show('consult');
  }
  /* ---------------- annual planner ---------------- */
  var plannerState = null;   // { key, start, plan } for the active profile
  function plannerDate(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) }; }
  function plannerPretty(s) { return +s.slice(8, 10) + ' ' + MON[+s.slice(5, 7) - 1].slice(0, 3) + ' ' + s.slice(0, 4); }
  // Twelve months around the neutral 50, up in green and down in red, each bar carrying its own value.
  function plannerChart(months) {
    return '<div class="pl-chart" role="img" aria-label="Overall score for each of the twelve months; 50 is neutral">' + months.map(function (m) {
      var h = Math.min(50, Math.abs(m.score - 50) * 2.2);
      return '<div class="pl-col" title="' + plannerPretty(m.start) + ' to ' + plannerPretty(m.end) + ': ' + m.score + '">' +
        '<div class="pl-half">' + (m.score >= 50 ? '<b>' + m.score + '</b><i class="up" style="height:' + h + '%"></i>' : '') + '</div>' +
        '<div class="pl-half dn">' + (m.score < 50 ? '<i class="down" style="height:' + h + '%"></i><b>' + m.score + '</b>' : '') + '</div>' +
        '<small>' + MON[+m.start.slice(5, 7) - 1].slice(0, 3) + '</small></div>';
    }).join('') + '</div>';
  }
  function plannerMonthHtml(m) {
    var day = function (x) { return x.d + ' ' + MON[x.m - 1].slice(0, 3) + ' <small>' + x.pillar.cn + '</small>'; };
    return '<details class="tech pl-month"><summary><b>' + m.pillar.cn + '</b> ' + plannerPretty(m.start) + ' to ' + plannerPretty(m.end) +
        ' <span class="' + (m.score >= 50 ? 'good-t' : 'bad-t') + '">' + m.score + '</span></summary>' +
      '<div class="plain">' + esc(m.god.en + ': ' + m.godText) + '</div>' +
      block('Month plate', 'you are in the ' + esc(m.seat.dir) + ' palace', plateHtml(m.res.chart, m.res.formations, [m.seat.num], false, null, { res: m.res }) +
        '<div class="plain" style="margin-top:8px">' + esc('Your position is ' + m.seat.word + '.') + '</div>') +
      block('Directions and days', '', rows([
        ['Directions that help', esc(m.dirs.best.map(function (x) { return x.dir; }).join(', '))],
        ['Directions to limit', esc(m.dirs.avoid.map(function (x) { return x.dir; }).join(', '))],
        ['Best days', m.goodDays.map(day).join(', ')],
        ['Days to go easy', m.avoidDays.map(day).join(', ')]
      ])) +
      (m.forces.length ? block('The month and your birth chart', '', rows(m.forces.map(function (f) {
        return ['<span class="' + (f.tone === 'good' ? 'good-t' : 'bad-t') + '">' + esc(f.title) + '</span>', esc(f.text)]; }))) : '') +
      lifeAreasHtml(m.areas.map(function (x) { return { key: x.key, label: x.label, cn: x.cn, level: x.level, plain: x.plain, todo: x.todo, signals: [], score: x.score }; }), 'Life areas', '') +
      '</details>';
  }
  function plannerBytesToBase64(bytes, from, to) {
    var bin = '', step = 0x8000;
    for (var i = from; i < to; i += step) bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + step, to)));
    return btoa(bin);
  }
  // In the app: written to the cache in pieces, then offered through the share sheet. In a browser: a download.
  function plannerSave(pdf) {
    var FS = capPlugin('Filesystem'), SH = capPlugin('Share');
    if (!FS || !SH) {
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([pdf.bytes], { type: 'application/pdf' }));
      a.href = url; a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
      return Promise.resolve();
    }
    var CHUNK = 3 * 512 * 1024, total = pdf.bytes.length;   // a multiple of 3, so each piece is valid base64 on its own
    function part(at) {
      if (at >= total) return Promise.resolve();
      var end = Math.min(at + CHUNK, total), data = plannerBytesToBase64(pdf.bytes, at, end);
      var opt = { path: pdf.name, directory: 'CACHE', data: data };
      return (at === 0 ? FS.writeFile(opt) : FS.appendFile(opt)).then(function () { return part(end); });
    }
    return part(0).then(function () { return FS.getUri({ path: pdf.name, directory: 'CACHE' }); })
      .then(function (r) { return SH.share({ title: 'QiPath Annual Planner', files: [r.uri], dialogTitle: 'Save or send your planner' }); })
      .catch(function (e) { if (!/cancel/i.test(String(e && e.message))) throw e; });
  }
  function renderPlanner(host) {
    var t = now(), opts = window.QPPlanner.startOptions({ y: t.y, m: t.m, d: t.d });
    var st = plannerState && plannerState.key === user.id ? plannerState : null;
    var sel = st ? st.start : opts[0].value;
    host.innerHTML =
      '<div class="hint" style="margin-top:0">Twelve solar months for ' + esc(user.name) + ', read from your birth chart and the Qimen month plates, with a PDF you can keep.</div>' +
      block('Annual planner', 'generated on this device',
        '<div class="panel"><label for="plStart">First month</label><select id="plStart">' + opts.map(function (o) {
          return '<option value="' + o.value + '"' + (o.value === sel ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>' +
        '<button class="btn" id="plGo">Create planner</button></div>') +
      '<div id="plOut"></div>';
    function show(plan) {
      var ranked = plan.months.slice().sort(function (a, b) { return b.score - a.score; });
      $('plOut').innerHTML =
        block('Your twelve months', plannerPretty(plan.from) + ' to ' + plannerPretty(plan.to),
          plannerChart(plan.months) +
          '<div class="hint">Scores run from 0 to 100, with 50 as neutral. The scale is QiPath\'s own and only compares your months with each other.</div>' +
          rows([['Strongest', ranked.slice(0, 3).map(function (m) { return m.pillar.cn + ' ' + plannerPretty(m.start); }).join(', ')],
                ['Pace yourself', ranked.slice(-3).reverse().map(function (m) { return m.pillar.cn + ' ' + plannerPretty(m.start); }).join(', ')]]) +
          '<button class="btn" id="plPdf" style="margin-top:12px">Save as PDF</button><div class="hint" id="plMsg" role="status"></div>') +
        block('Month by month', 'tap a month to open it', plan.months.map(plannerMonthHtml).join(''));
      $('plPdf').onclick = function () {
        var btn = $('plPdf'), msg = $('plMsg');
        btn.disabled = true; msg.textContent = 'Creating your PDF…';
        setTimeout(function () {
          var p;
          try { p = window.QPPlanner.toPdf(plan); }
          catch (e) { btn.disabled = false; msg.textContent = 'Could not create the PDF: ' + e.message; return; }
          plannerSave(p).then(function () {
            btn.disabled = false; msg.textContent = p.pages + ' pages, ' + (p.bytes.length / 1048576).toFixed(1) + ' MB · ' + p.name;
          }).catch(function (e) {
            btn.disabled = false; msg.textContent = 'Could not save the PDF: ' + ((e && e.message) || e);
          });
        }, 30);
      };
    }
    $('plGo').onclick = function () {
      var start = $('plStart').value;
      $('plOut').innerHTML = '<div class="empty">Reading twelve months…</div>';
      setTimeout(function () {
        try {
          var plan = window.QPPlanner.build(user, plannerDate(start));
          plannerState = { key: user.id, start: start, plan: plan };
          show(plan);
        } catch (e) { $('plOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; }
      }, 30);
    };
    if (st) show(st.plan);
  }

  /* ---------------- the 28 constellations ---------------- */
  function xiuName(m) { return m.cn + '宿 <small>' + esc(m.en) + ' · ' + esc(m.group) + ' · ' + esc(m.luminary) + '</small>'; }
  function postureHtml(p, chart, noHour) {
    var t = window.QPXiu.posture(p, chart), hg = window.QPSystems.hostGuestRead(chart, !noHour);
    return block('Tactical posture', 'Host and Guest, from the compendium',
      '<div style="font-size:1.1rem;margin-bottom:4px" class="' + (hg.side === 'guest' ? 'good-t' : hg.side === 'neither' ? 'bad-t' : 'mid-t') + '">' + esc(hg.name) + '</div>' +
      '<div class="plain" style="margin-bottom:6px">' + esc(hg.advice) + '</div>' +
      hg.why.map(function (w) { return '<div class="plain" style="margin-bottom:4px">' + esc(w) + '</div>'; }).join('') +
      '<div class="hint">Across the eight outer palaces, ' + hg.tally.guest + ' favour the Guest and ' + hg.tally.host + ' favour the Host. The Guest star is on the heaven plate, and the Host star is the one native to the palace.</div>') +
      block('Mansion background', 'from the day and hour mansions',
      '<div style="font-size:1.1rem;margin-bottom:4px" class="' + (t.name === 'Assertive' ? 'good-t' : t.name === 'Defensive' ? 'bad-t' : 'mid-t') + '">' + t.name + '</div>' +
      '<div class="plain" style="margin-bottom:6px">' + esc(t.advice) + '</div>' +
      t.why.map(function (w) { return '<div class="plain" style="margin-bottom:4px">' + esc(w) + '</div>'; }).join('') +
      '<div class="hint">QiPath\'s own reading of the mansions\' quarter, luminary and traditional auspice. Take it as background context, not as a decision.</div>');
  }
  function xiuChartHtml(res, type) {
    var X = window.QPXiu, m = X.ofPillars(res.pillars), ch = res.chart, hourly = type === 'hour';
    var r = [['Day mansion', xiuName(m.day) + '<div class="plain ' + (m.day.auspicious ? 'good-t' : 'bad-t') + '">' + (m.day.auspicious ? 'Traditionally auspicious' : 'Traditionally inauspicious') + '</div>']];
    if (hourly) r.push(['Hour mansion', xiuName(m.hour) + '<div class="plain ' + (m.hour.auspicious ? 'good-t' : 'bad-t') + '">' + (m.hour.auspicious ? 'Traditionally auspicious' : 'Traditionally inauspicious') + '</div>']);
    var html = block('28 constellations 二十八宿', hourly ? 'ruling this day and hour' : 'ruling this day', rows(r)) +
      block('Constellations by palace', 'their fixed positions on the luo pan', rows([4, 9, 2, 3, 7, 8, 1, 6].map(function (n) {
        return [n + ' ' + ch.palacesByNumber[n].name + '<small>' + ch.palacesByNumber[n].dir + '</small>', X.palaceMansions(n).map(function (x) { return x.cn + ' <small>' + esc(x.en) + '</small>'; }).join(', ')];
      })));
    if (!hourly) return html;
    var fav = user.deep ? user.deep.favourable : null, sv = X.sevenStars(ch, res.formations, fav);
    return html + postureHtml(res.pillars, ch, !hourly) +
      block('7 Stars Path 七星', 'the Dipper across this plate', '<div class="plain" style="margin-bottom:8px"><b>Route:</b> ' + sv.route.map(esc).join(' → ') + '</div>' +
        rows(sv.steps.map(function (s) {
          return [s.step + ' ' + s.dipper + '<small>' + esc(s.dipperEn) + '</small>', esc(s.dir) + ' <small>' + s.star + ' · ' + s.gate + ' ' + s.deity + '</small>' + (s.isEmpty ? '<div class="plain bad-t">Void, so skip or pass through quickly</div>' : '')];
        })) +
        (sv.strongest ? '<div class="plain" style="margin-top:8px">Strongest stop: <span class="good-t">' + esc(sv.strongest.dir) + '</span> (' + sv.strongest.dipper + ').' + (sv.weakest && sv.weakest !== sv.strongest ? ' Weakest: <span class="bad-t">' + esc(sv.weakest.dir) + '</span> (' + sv.weakest.dipper + ').' : '') + '</div>' : '') +
        '<div class="hint">This follows the seven Dipper stars in order across the plate, using the compendium\'s pairing of the Qimen stars with the Northern Dipper (貪狼 is 天蓬, through to 破軍 as 天柱). It is QiPath\'s own route, not the steps of a taught Seven Stars Path practice.</div>');
  }
  function xiuFacingHtml(prop) {
    if (!prop || prop.facingDegrees === undefined || prop.facingDegrees === null) return '';
    var X = window.QPXiu, f = X.facing(prop.facingDegrees), t = now(), lat = typeof prop.lat === 'number' ? prop.lat : 1.35, lon = typeof prop.lon === 'number' ? prop.lon : 103.85;
    var sky = X.sky(A.localToJD(t.y, t.m, t.d, t.hour, t.min), lat, lon, prop.facingDegrees), nx = X.nextDays(f.facing.i, t, 3);
    var today = X.dayMansion(A.civilJDN(t.y, t.m, t.d)), MON3 = function (d) { return d.d + ' ' + MON[d.m - 1].slice(0, 3); };
    setTimeout(function () {
      if (!$('xfSave')) return;
      $('xfSave').onclick = function () {
        var a = parseFloat($('xfLat').value), b = parseFloat($('xfLon').value);
        if (!isFinite(a) || !isFinite(b)) return;
        prop.lat = a; prop.lon = b; PR.save(user.id, prop); renderProperty();
      };
    }, 0);
    return block('Stellar influence 二十八宿', esc(prop.name || '') + ' · ' + prop.facingDegrees.toFixed(1) + '°',
      '<div style="font-size:1.15rem;margin-bottom:6px" class="' + (f.verdict === 'Harmonious' ? 'good-t' : f.verdict === 'Disruptive' ? 'bad-t' : 'mid-t') + '">' + f.verdict + '</div>' +
      rows([['Facing mansion', xiuName(f.facing)], ['Sitting mansion', xiuName(f.sitting)], ['Mansion spans', f.from.toFixed(1) + '° to ' + f.to.toFixed(1) + '°']]) +
      '<div style="margin-top:8px">' + f.why.map(function (w) { return '<div class="plain" style="margin-bottom:4px">' + esc(w) + '</div>'; }).join('') + '</div>' +
      '<h3 style="margin:14px 0 6px;font-size:.9rem">In the sky right now</h3>' +
      rows([['Overhead', xiuName(sky.overhead)],
        ['Towards the facing', sky.aligned ? xiuName(sky.aligned.mansion) + '<div class="plain">' + (sky.aligned.gap <= 15 ? 'Aligned with this facing' : sky.aligned.gap + '° away from this facing') + ', ' + sky.aligned.altitude + '° up, ' + (sky.aligned.mansion.auspicious ? 'traditionally auspicious' : 'traditionally inauspicious') + '.</div>' : 'None above the horizon in that direction'],
        ['Today\'s mansion', xiuName(today) + (today.i === f.facing.i ? '<div class="plain good-t">Today matches the facing mansion.</div>' : '')],
        ['Next days ruled by ' + f.facing.cn, nx.map(MON3).join(', ')]]) +
      '<div class="panel" style="margin-top:10px"><label for="xfLat">Property latitude</label><input id="xfLat" type="number" step="0.01" value="' + lat + '">' +
      '<label for="xfLon">Property longitude</label><input id="xfLon" type="number" step="0.01" value="' + lon + '"><button class="btn ghost" id="xfSave">Update location</button></div>' +
      '<div class="hint">Mansion widths are the classical 古度, placed with 虛 at due north. Luo pans differ between schools, so compare this with your own. The verdict is QiPath\'s own weighing of each mansion\'s traditional auspice and element against the sector. Treat it as an extra layer alongside Flying Stars, not a replacement.</div>');
  }

  /* ---------------- planets on the plate ---------------- */
  function planetsBlock(hostId, res, when) {
    var E = window.QPEphem, T = window.QPTianwen;
    if (!E || !T || !$(hostId)) return;
    E.load(function (ok) {
      var box = $(hostId);
      if (!ok || !box) return;
      var jd = A.localToJD(when.y, when.m, when.d, when.hour, when.min || 0), list = T.overlay(res.chart, res.formations, jd);
      if (!list.length) return;
      var cls = function (s) { return s === 'Super-structure' || s === 'Amplified' ? 'good-t' : s === 'In tension' ? 'bad-t' : s === 'Neutral' ? '' : 'mid-t'; };
      box.innerHTML = block('Planets on this plate 七政', 'Swiss Ephemeris positions', rows(list.map(function (o) {
        return [o.cn + ' <small>' + esc(o.en) + ' · ' + esc(o.element) + ' · ' + o.stems.join('') + '</small>',
          '<span class="' + cls(o.status) + '">' + esc(o.status) + '</span><div class="plain">' + esc(T.statusText(o)) + '</div><small>Its stems land: ' + o.stemLanding.map(function (x) { return x.stem + ' ' + esc(x.dir); }).join(', ') + '</small>'];
      })) + '<button class="btn ghost" id="twScan" style="margin-top:10px">Find planet-backed windows, next 30 days</button><div id="twOut"></div>' +
        '<div class="hint">Longitude maps to the twelve classical palaces (子 runs from 300° to 330°, 戌 from 0° to 30°), then to the Lo Shu palace holding that branch. A super-structure means the planet\'s own stem is on the heaven plate, in a palace of its home or generated element, with a strong stem, door or structure, and not void. This overlay follows your method notes and does not change the chart\'s other scores.</div>');
      $('twScan').onclick = function () {
        var t = now(), out = $('twOut');
        out.innerHTML = '<div class="empty">Checking every double-hour…</div>';
        setTimeout(function () {
          var w = T.superWindows(t, 30, 8);
          out.innerHTML = w.length ? rows(w.map(function (x) {
            return [x.when.d + ' ' + MON[x.when.m - 1].slice(0, 3) + '<small>' + x.pillar + ' · ' + x.range + '</small>', esc(x.planet) + ' in the ' + esc(x.dir) + ' <small>' + x.stem + ' ' + x.gate + (x.formations.length ? ' · ' + esc(x.formations.slice(0, 2).join(', ')) : '') + '</small>'];
          })) : '<div class="empty">No planet-backed window in the next 30 days.</div>';
        }, 30);
      };
    });
  }

  /* ---------------- 7 Stars: a map of where you are, and windows for the walk ---------------- */
  function sevenLoad() { try { return JSON.parse(localStorage.getItem('qipath.seven.' + user.id)) || {}; } catch (e) { return {}; } }
  function sevenSave(o) { try { localStorage.setItem('qipath.seven.' + user.id, JSON.stringify(o)); } catch (e) {} }
  function renderSeven(host) {
    var T = window.QPTianwen, st = sevenLoad(), cur = st.current || 1, statuses = st.statuses || [], S0 = T.STAGES;
    var opt = function (v, label, sel) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + label + '</option>'; };
    function stageHtml() {
      var s = S0[cur - 1], next = S0[cur] || S0[0], a = T.audit(cur, statuses);
      return [['Focus', esc(s.focus)], ['Ask yourself', esc(s.ask)], ['Next step', 'Star ' + next.n + ', ' + esc(next.title) + ' (' + next.star + '): ' + esc(s.move)]].concat(s.release ? [['Leave behind', esc(s.release)]] : []).map(function (x) { return '<div class="plain" style="margin-bottom:6px"><b>' + x[0] + ':</b> ' + x[1] + '</div>'; }).join('') +
        '<div class="plain" style="margin-top:10px"><b>Your audit:</b> ' + esc(a.message) + '</div>';
    }
    host.innerHTML =
      '<div class="hint" style="margin-top:0">The seven Dipper stars used two ways: as a map of where you are in your own development, and as a way to choose the hour for a walking practice on your mat.</div>' +
      block('Where you are now', 'seven stages of development',
        '<div class="panel"><label for="ssCur">Which star takes up most of your attention?</label><select id="ssCur">' + S0.map(function (s) { return opt(s.n, s.n + ' ' + s.star + ' · ' + s.title, cur); }).join('') + '</select></div>' +
        '<div id="ssStage" style="margin-top:10px">' + stageHtml() + '</div>') +
      block('The audit', 'be honest about each stage', rows(S0.map(function (s, i) {
        return [s.n + ' ' + s.star + '<small>' + esc(s.title) + '</small>', '<select data-ss="' + i + '" aria-label="Status of star ' + s.n + '">' + opt('none', 'Not yet', statuses[i] || 'none') + opt('working', 'Working on it', statuses[i] || 'none') + opt('stuck', 'Stuck', statuses[i] || 'none') + opt('done', 'Secure', statuses[i] || 'none') + '</select>'];
      }))) +
      block('Your chapter across the seven stars', 'a multi-year map',
        '<div class="panel"><label for="ssStart">Chapter began</label><input id="ssStart" type="date" value="' + (st.start || '') + '">' +
        '<label for="ssYears">Length in years</label><input id="ssYears" type="number" min="1" max="30" value="' + (st.years || 7) + '"></div><div id="ssMap"></div>' +
        '<div class="hint">Resistance is built into the sequence. If Star 3 feels hard, that may be the stage doing its job rather than a sign that something has gone wrong.</div>') +
      block('Reflection', 'for quiet review',
        '<div class="plain" style="margin-bottom:8px">Which star fills your days? What does the next star ask of you? Which earlier lessons have you already taken in, and which old habits are you still carrying?</div>' +
        '<label for="ssNote">Your notes, kept on this device</label><textarea id="ssNote" rows="4" style="width:100%">' + esc(st.note || '') + '</textarea>') +
      block('Find a window for the walk', 'for a 7-step mat',
        '<div class="panel"><label for="ssObj">What is the walk for?</label><select id="ssObj">' + Object.keys(T.OBJECTIVES).map(function (k) { return opt(k, T.OBJECTIVES[k].label, st.objective || 'authority'); }).join('') + '</select>' +
        '<div id="ssDoorWrap"><label for="ssDoor">Which door?</label><select id="ssDoor">' + opt('', 'Any of the three', '') + Object.keys(T.DOOR_USE).map(function (d) { return opt(d, T.DOOR_USE[d], ''); }).join('') + '</select></div>' +
        '<label for="ssDays">Look ahead</label><select id="ssDays">' + opt(7, '7 days', 14) + opt(14, '14 days', 14) + opt(30, '30 days', 14) + '</select>' +
        '<button class="btn" id="ssFind">Find clean windows</button></div><div id="ssWin"></div>');
    function save() { st.current = cur; st.statuses = statuses; st.start = $('ssStart').value; st.years = parseFloat($('ssYears').value) || 7; st.note = $('ssNote').value; st.objective = $('ssObj').value; sevenSave(st); }
    function paintMap() {
      var v = $('ssStart').value, y = parseFloat($('ssYears').value), box = $('ssMap');
      if (!v || !(y > 0)) { box.innerHTML = '<div class="hint">Enter a start date to see your map.</div>'; return; }
      box.innerHTML = rows(T.horizon(v, y, now()).map(function (x) { return [x.n + ' ' + x.star + (x.current ? ' <span class="good-t">now</span>' : '') + '<small>' + esc(x.title) + '</small>', x.from + ' to ' + x.to]; }));
    }
    $('ssCur').onchange = function () { cur = +$('ssCur').value; save(); $('ssStage').innerHTML = stageHtml(); };
    host.querySelectorAll('[data-ss]').forEach(function (el) { el.onchange = function () { statuses[+el.dataset.ss] = el.value; save(); $('ssStage').innerHTML = stageHtml(); }; });
    $('ssStart').onchange = $('ssYears').onchange = function () { save(); paintMap(); };
    $('ssNote').onchange = save;
    paintMap();
    function doorVis() { $('ssDoorWrap').hidden = $('ssObj').value !== 'breakthrough'; }
    $('ssObj').onchange = doorVis;
    doorVis();
    $('ssFind').onclick = function () {
      var out = $('ssWin'), obj = $('ssObj').value, days = +$('ssDays').value, t = now();
      save();
      out.innerHTML = '<div class="empty">Checking every double-hour…</div>';
      setTimeout(function () {
        var r = T.ritualWindows(obj, t, days, user.deep.favourable, 6, obj === 'breakthrough' ? $('ssDoor').value : ''), rj = r.rejected;
        var head = (r.note ? '<div class="plain" style="margin:10px 0 4px">' + esc(r.note) + '</div>' : '') + '<div class="hint">Looking for ' + esc(r.symbol) + '. Found ' + r.found + ' clean windows. Set aside: ' + rj.void + ' void, ' + rj.hostile + ' with a hostile structure, ' + rj.disharmony + ' in a Five Disharmony Hour, ' + rj.plate + ' on the wrong kind of plate for this goal.</div>';
        if (!r.windows.length) { out.innerHTML = head + '<div class="empty">No clean window in this period. Try looking further ahead.</div>'; return; }
        out.innerHTML = head + rows(r.windows.map(function (x, i) {
          return [x.when.d + ' ' + MON[x.when.m - 1].slice(0, 3) + '<small>' + x.pillar + ' · ' + x.range + '</small>', esc(x.dir) + ' ' + x.bearing + '° <small>' + x.stem + ' ' + x.gate + ' ' + x.deity + '</small>' + (x.doorUse ? '<div class="plain">' + esc(x.doorUse) + '</div>' : '') + (x.sage ? x.sage.map(function (t) { return '<div class="plain">' + esc(t) + '</div>'; }).join('') : '') + (x.plateNote ? '<div class="plain mid-t">' + esc(x.plateNote) + '</div>' : '') + (x.combo ? '<div class="plain mid-t">' + x.combo + ' stem combination here: a Harmony in your compendium, though it may also tie things up. Allow extra time.</div>' : '') + '<button class="btn ghost" data-ssw="' + i + '" style="margin-top:6px;padding:7px">Prepare this walk</button>'];
        })) + '<div id="ssProto"></div>';
        out.querySelectorAll('[data-ssw]').forEach(function (b) {
          b.onclick = function () {
            var x = r.windows[+b.dataset.ssw], h0 = ('0' + x.startHour).slice(-2), steps = [
              ['Before the hour', 'Clear the space and silence your devices. Do this only when you feel calm, and save it for genuinely important moments.'],
              ['Set the mat', 'Lay the mat so that walking from Star 1 to Star 7 carries you towards the ' + x.dir + ' (' + x.bearing + '° on a compass).'],
              ['Start on time', 'Begin between ' + h0 + ':00 and ' + h0 + ':15, the first 15 minutes of this double-hour.'],
              ['State your intent', 'Stand before the mat and state exactly what you want to achieve, in writing or in your mind.'],
              ['Star 1, 貪狼', 'Step on, settle your weight and let distractions go.'],
              ['Stars 2 to 6', 'Walk one firm, unhurried step at a time: 巨門, 祿存, 文曲, 廉貞, 武曲. Keep this hour\'s ' + x.stem + ', ' + x.gate + ' and ' + x.deity + ' in mind.'],
              ['Star 7, 破軍', 'Stop completely. Stand tall, breathe evenly and direct your intent towards the ' + x.dir + '. Picture the outcome already done.'],
              ['Close', 'Hold this for 1 to 3 minutes, then step backwards off the mat.']];
            var sageWalk = obj === 'sage';
            if (sageWalk) steps = [
              ['Before the hour', 'Clear the space and silence your devices. Do this only when you feel calm.'],
              ['Set your intention', 'Write down a question about clarity, not an outcome. For example: "To clear my mental fog about this challenge, and align my actions with what is true in the long term."'],
              ['Set the mat', 'Lay the mat so that walking from Star 1 to Star 7 carries you towards the ' + x.dir + ' (' + x.bearing + '° on a compass).'],
              ['Start on time', 'Begin between ' + h0 + ':00 and ' + h0 + ':15, the first 15 minutes of this double-hour.'],
              ['Star 1, 貪狼: Grounding', 'Notice how you are, in body and mood, without judging it.'],
              ['Star 2, 巨門: Releasing noise', 'Let go of needing to control what other people think.'],
              ['Star 3, 祿存: Facing the shadow', 'Turn your attention to your own resistance, fears and attachments.'],
              ['Star 4, 文曲: Illumination', 'Stay open to new insight, and look at the problem from a wider view.'],
              ['Star 5, 廉貞: The centre', 'Rest in stillness, like the calm eye of a storm.'],
              ['Star 6, 武曲: Integration', 'Consider what calm, disciplined action this clarity asks of you.'],
              ['Star 7, 破軍: Release', 'Let go of the outcome. Step off the mat and carry on without forcing anything.']];
            $('ssProto').innerHTML = block(sageWalk ? 'Your Sage Path walk' : 'Your walk', x.when.d + ' ' + MON[x.when.m - 1].slice(0, 3) + ' · ' + x.range, (x.plateNote ? '<div class="plain mid-t" style="margin-bottom:8px">' + esc(x.plateNote) + '</div>' : '') +
              '<div class="panel" style="margin-bottom:12px"><label for="ssMatter">' + (sageWalk ? 'What do you want clarity about?' : 'What is this walk about?') + '</label>' +
              '<textarea id="ssMatter" rows="3" style="width:100%" placeholder="A sentence or two, in your own words">' + esc(st.matter || '') + '</textarea>' +
              '<button class="btn" id="ssWrite">Write my script with AI</button><div class="hint" id="ssWriteMsg" role="status"></div>' +
              '<label for="ssScript">Your script, which you can edit</label><textarea id="ssScript" rows="12" style="width:100%">' + esc(st.script || '') + '</textarea>' +
              '<div class="hint">What you type here is sent to your chosen AI provider. It is saved on this device.</div></div>' + steps.map(function (s) { return '<div class="plain" style="margin-bottom:8px"><b>' + esc(s[0]) + '.</b> ' + esc(s[1]) + '</div>'; }).join('') +
              '<div class="hint">This is a reflective practice from your method notes. On the mat you walk towards the target palace; in a seated practice, you sit with your back to it. It does not replace preparation or professional advice for the decision itself' + (sageWalk ? ', or support from a professional if you are struggling' : '') + '. Check how your own mat is meant to be laid out.</div>');
            $('ssProto').querySelector('#ssWrite').onclick = function () {
              var msg = $('ssWriteMsg'), matter = $('ssMatter').value.trim();
              if (matter.length < 6) { msg.textContent = 'First say what this is about, in a sentence or two.'; return; }
              if (!aiReady()) { msg.textContent = 'This needs a Gemini or Claude key, which you can add on the Profile screen. You can also write your own in the box below.'; return; }
              msg.textContent = 'Writing your script…';
              $('ssWrite').disabled = true;
              window.QPAI.writeWalkScript(loadAI(), user, { goal: T.OBJECTIVES[obj].label, sage: sageWalk, matter: matter, when: x.when.d + ' ' + MON[x.when.m - 1] + ', ' + x.range, pillar: x.pillar, dir: x.dir, stem: x.stem, gate: x.gate, star: x.star, deity: x.deity, plateNote: x.plateNote }).then(function (a) {
                $('ssWrite').disabled = false;
                msg.textContent = a.fit || '';
                $('ssScript').value = ['My intention', a.intention, '', 'Before the mat', a.opening, ''].concat((a.stars || []).map(function (s) { return s.star + ': ' + s.line; }), ['', 'To close', a.seal]).join('\n');
                st.matter = matter; st.script = $('ssScript').value; sevenSave(st);
              }).catch(function (e) {
                $('ssWrite').disabled = false;
                msg.textContent = 'The script could not be written: ' + ((e && e.message) || e) + ' You can write your own in the box below.';
              });
            };
            $('ssScript').onchange = function () { st.script = $('ssScript').value; sevenSave(st); };
            $('ssProto').scrollIntoView({ block: 'start' });
          };
        });
      }, 30);
    };
  }

  /* ---------------- the sky at a moment ---------------- */
  function skyBlock(hostId, when) {
    var E = window.QPEphem, h = $(hostId);
    if (!E || !h) return;
    E.load(function (ok) {
      var box = $(hostId), pos = ok ? E.positions(A.localToJD(when.y, when.m, when.d, when.hour, when.min || 0)) : null;
      if (!box || !pos) return;
      var moonX = window.QPXiu ? window.QPXiu.moonMansion(pos[1].lon, A.localToJD(when.y, when.m, when.d, when.hour, when.min || 0)) : null;
      box.innerHTML = block('Sky at this moment', 'Swiss Ephemeris positions', (moonX ? '<div class="plain" style="margin-bottom:8px">The Moon is passing through ' + moonX.cn + ' ' + esc(moonX.en) + ' in the sky. This is its true position, which is separate from the calendar\'s day mansion.</div>' : '') + rows(pos.map(function (x) {
        return [x.cn + ' <small>' + x.en + (x.elem ? ' · ' + x.elem : '') + '</small>',
          x.sign + ' ' + x.deg + '° ' + ('0' + x.min).slice(-2) + '\'' + (x.retro ? ' <span class="bad-t">retrograde</span>' : '') + '<small>' + x.lon.toFixed(2) + '° longitude</small>'];
      })) + '<div class="hint">True geocentric positions, shown for reference. They do not affect the scores on this chart.</div>');
    });
  }

  /* ---------------- QiMen Oracle ---------------- */
  var oracleLast = null;
  function renderOracle(host) {
    var O = window.QPOracle, t = now(), iso = function (w) { return w.y + '-' + ('0' + w.m).slice(-2) + '-' + ('0' + w.d).slice(-2) + 'T' + ('0' + w.hour).slice(-2) + ':' + ('0' + w.min).slice(-2); };
    var last = oracleLast && oracleLast.key === user.id ? oracleLast : null;
    host.innerHTML =
      '<div class="hint" style="margin-top:0">A quick answer to one question, read from the Flying Palace chart for the moment you ask. Works offline, with no AI key.</div>' +
      block('QiMen Oracle', 'what, why and what to do',
        '<div class="panel"><label for="orTopic">What is it about?</label><select id="orTopic">' + Object.keys(O.TOPICS).map(function (k) {
          return '<option value="' + k + '"' + (last && last.r.topic === k ? ' selected' : '') + '>' + O.TOPICS[k].label + ' · ' + O.TOPICS[k].cn + '</option>'; }).join('') + '</select>' +
        '<label for="orQ">Your question</label><input id="orQ" type="text" placeholder="One specific question, in plain words" value="' + (last ? esc(last.q) : '') + '">' +
        '<label for="orWhen">Moment of asking</label><input id="orWhen" type="datetime-local" value="' + iso(last ? last.r.when : t) + '">' +
        '<button class="btn" id="orGo">Ask the Oracle</button></div>') +
      '<div id="orOut"></div>';
    function show(r, q) {
      var list = function (a) { return a.map(function (s) { return '<div class="plain" style="margin-bottom:6px">' + esc(s) + '</div>'; }).join(''); };
      var cls = r.score >= 0.75 ? 'good-t' : r.score <= -0.75 ? 'bad-t' : 'mid-t';
      $('orOut').innerHTML =
        block(r.label + ' · ' + r.cn, esc(r.whenText),
          (q ? '<div class="hint" style="margin:0 0 8px">' + esc(q) + '</div>' : '') +
          '<div style="font-size:1.25rem;margin-bottom:2px" class="' + cls + '">' + r.verdict + '</div>' +
          '<div class="hint" style="margin:0 0 4px">' + esc(r.clarity) + '</div>' +
          (r.care ? '<div class="find ' + toneCls('neutral') + '" style="margin-top:10px"><b>' + esc(r.care.label) + '</b><span>' + esc(r.care.text) + '</span></div>' : '') +
          (r.disharmony ? [r.disharmony] : []).concat(r.graves || []).map(function (w) { return '<div class="find ' + toneCls('danger') + '" style="margin-top:10px"><b>' + esc(w.label) + '</b><span>' + esc(w.text) + '</span></div>'; }).join('')) +
        block('What is happening', '', list(r.what)) +
        block('Why', '', list(r.why)) +
        block('What to do', '', list(r.todo) + (r.note ? '<div class="hint">' + esc(r.note) + '</div>' : '')) +
        block('Flying Palace chart', r.chart.dun + ' ' + r.chart.ju + '局 · ' + r.p.hour.cn + ' hour', '<div class="fly">' + plateHtml(r.chart, null, r.hits) + '</div>' +
          postureHtml(r.p, r.chart) +
          (r.p.solar ? '<div class="hint">Read at true solar time ' + ('0' + r.p.solar.hour).slice(-2) + ':' + ('0' + r.p.solar.min).slice(-2) + '.</div>' : '') +
          '<div class="hint">Highlighted: your palace and the symbols for this topic. This chart has nine doors and nine deities, with 中门 and 太常 added, and uses the centre palace. Treat a reading as prompts for thinking, not as a prediction.</div>');
    }
    $('orGo').onclick = function () {
      var v = $('orWhen').value, q = $('orQ').value.trim(), topic = $('orTopic').value;
      if (!v) { $('orOut').innerHTML = '<div class="notice">Please choose a moment.</div>'; return; }
      try {
        var w = { y: +v.slice(0, 4), m: +v.slice(5, 7), d: +v.slice(8, 10), hour: +v.slice(11, 13), min: +v.slice(14, 16) };
        var r = O.cast(user, topic, w);
        oracleLast = { key: user.id, r: r, q: q };
        show(r, q);
      } catch (e) { $('orOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; }
    };
    if (last) show(last.r, last.q);
  }

  /* ---------------- Warcraft: Sun Tzu on the hour plate ---------------- */
  var warLast = null;
  function renderWar(host) {
    var W = window.QPWar, t = now(), iso = function (w) { return w.y + '-' + ('0' + w.m).slice(-2) + '-' + ('0' + w.d).slice(-2) + 'T' + ('0' + w.hour).slice(-2) + ':' + ('0' + w.min).slice(-2); };
    host.innerHTML =
      '<div class="hint" style="margin-top:0">Assess a contest the way Sun Tzu does, on the hour plate: you against a rival, in business, at work or in a negotiation. Works offline, with no AI key.</div>' +
      block('Warcraft 孫子', 'who has the edge, and how to use it',
        '<div class="panel"><label for="warQ">What is the contest?</label><input id="warQ" type="text" placeholder="For example: winning the tender against a competitor" value="' + (warLast ? esc(warLast.q) : '') + '">' +
        '<label for="warWhen">Moment of asking</label><input id="warWhen" type="datetime-local" value="' + iso(warLast ? warLast.r.when : t) + '">' +
        '<button class="btn" id="warGo">Assess the contest</button></div>') +
      '<div id="warOut"></div>';
    function show(r, q) {
      var leanTag = function (l) { return l === 'you' ? '<span class="good-t">You</span>' : l === 'rival' ? '<span class="bad-t">Rival</span>' : '<span class="mid-t">Even</span>'; };
      var plain = function (s) { return '<div class="plain" style="margin-bottom:6px">' + esc(s) + '</div>'; };
      var side = function (label, x) { return '<div class="plain" style="margin-bottom:6px"><b>' + label + ':</b> ' + esc(x.pa.dir) + ' palace, ' + esc(x.pa.heavenStemCn || '—') + ', ' + esc(x.pa.gate || '—') + ', ' + esc(x.pa.starCn || '—') + ', ' + esc(x.pa.spirit || '—') + ' <span class="' + (x.q.label === 'Strong' ? 'good-t' : x.q.label === 'Weak' ? 'bad-t' : 'mid-t') + '">' + x.q.label + '</span></div>'; };
      var formsHtml = function (list, none) {
        return list.length ? list.map(function (f) { return '<div class="plain" style="margin-bottom:6px"><b>' + esc(f.name) + ' ' + esc(f.en) + '</b> ' + esc(f.dirs.join(', ') || 'whole plate') + (f.isVoid ? ' <span class="mid-t">void, so its effect is muted</span>' : '') + '<br>' + esc(f.use) + '</div>'; }).join('') : '<div class="hint">' + esc(none) + '</div>';
      };
      var chapter = function (n, cn, en, body) { return '<details class="tech"><summary><b>' + n + ' ' + cn + '</b> ' + en + '</summary><div style="margin-top:8px">' + body + '</div></details>'; };
      var groundWord = { host: 'Favours the Host', guest: 'Favours the Guest', both: 'Good for both' };
      var mapRow = function (m) {
        return '<div class="plain" style="margin-bottom:6px"><b>' + esc(m.dir) + '</b> ' + esc(m.door || '—') + ' ' + esc(m.deity || '') + ' · ' + m.label +
          (m.you ? ' · <span class="good-t">you</span>' : '') + (m.rival ? ' · <span class="bad-t">rival</span>' : '') + (m.matter ? ' · the matter' : '') +
          (m.hazard ? ' · <span class="bad-t">avoid</span>' : '') + (m.ground ? '<br><small>' + groundWord[m.ground] + '</small>' : '') + '</div>';
      };
      var dirLine = function (label, m, extra) { return plain(label + ': ' + (m ? m.dir + ', with ' + (extra === 'door' ? m.door : m.deity) + '.' : 'nothing clean this hour.')); };
      $('warOut').innerHTML =
        block('The assessment', esc(r.chart.dun) + ' ' + r.chart.ju + '局 · ' + r.pillars.hour.cn + ' hour',
          (q ? '<div class="hint" style="margin:0 0 8px">' + esc(q) + '</div>' : '') +
          '<div style="font-size:1.25rem;margin-bottom:2px" class="' + (r.verdict.tone === 'good' ? 'good-t' : r.verdict.tone === 'danger' ? 'bad-t' : 'mid-t') + '">' + esc(r.verdict.title) + '</div>' +
          '<div class="hint" style="margin:0 0 8px">You lead ' + r.youN + ' of the 7 criteria, and your rival ' + r.rivalN + '.</div>' +
          plain(r.verdict.text) +
          (r.disharmony ? '<div class="find ' + toneCls('danger') + '" style="margin-top:10px"><b>' + esc(r.disharmony.label) + '</b><span>' + esc(r.disharmony.text) + '</span></div>' : '')) +
        block('Where each side stands', 'you are the Day Stem, your rival the Month Stem',
          side('You', r.you) + side('Your rival', r.rival) + side('The matter', r.matter) + side('The leadership', r.year) + plain(r.force)) +
        block('The 7 criteria', '七計',
          r.criteria.map(function (c) { return '<div class="plain" style="margin-bottom:10px"><b>' + esc(c.en) + '</b> ' + leanTag(c.lean) + '<br><small>' + c.cn + ' · ' + esc(c.why) + '</small></div>'; }).join('')) +
        block('How to play it', 'role and direction',
          plain('From your stems: ' + r.seat.stemsText) + plain('From the ground: ' + r.seat.groundText) +
          dirLine('For quick results, go by the deity', r.quick, 'deity') + (r.deityUse ? '<div class="hint" style="margin:-2px 0 6px">It lends ' + esc(r.deityUse) + '.</div>' : '') +
          dirLine('For lasting results, go by the door', r.lasting, 'door')) +
        block('The plate', 'highlighted: you, your rival and the matter', '<div>' + plateHtml(r.chart, r.formations, r.hits, true) + '</div>' + postureHtml(r.pillars, r.chart)) +
        block('The 13 chapters', 'what each one shows on this plate',
          chapter(2, '作戰', 'Resources', plain(r.resources.text)) +
          chapter(3, '謀攻', 'Winning without fighting', plain('Your palace ' + (r.you.pa === r.rival.pa ? 'is the same as your rival\'s.' : 'reads ' + r.you.q.label.toLowerCase() + ', and your rival\'s ' + r.rival.q.label.toLowerCase() + '.')) + plain(r.seat.groundText)) +
          chapter(4, '軍形', 'Deployment', dirLine('Quick', r.quick, 'deity') + dirLine('Lasting', r.lasting, 'door')) +
          chapter(5, '兵勢', 'Force', plain(r.force)) +
          chapter(6, '虛實', 'Substance and void', plain(r.substance) + plain('Void palaces: ' + (r.voids.join(', ') || 'none') + '. Emptiness mutes a palace, whether it is good or bad.')) +
          chapter(7, '軍爭', 'Deception', formsHtml(r.deceptions, 'None of the Three Deceptions is on this plate.')) +
          chapter(8, '九變', 'The Nine Dun', formsHtml(r.duns, 'None of the Nine Dun is on this plate.')) +
          chapter(9, '行軍', 'Ground to avoid', formsHtml(r.hazards, 'None of the four hazards is on this plate.')) +
          chapter(10, '地形', 'Terrain', formsHtml(r.punish, 'No Six Crest punishment on this plate.')) +
          chapter(11, '九地', 'The battleground', r.map.map(mapRow).join('')) +
          chapter(12, '火攻', 'Fire', plain(r.geng.text) + formsHtml(r.fire, 'None of the three Fire structures is on this plate.')) +
          chapter(13, '用間', 'Information and alliances', plain(r.yiGeng) + formsHtml(r.spies, 'Neither 乙 structure is on this plate.'))) +
        '<div class="hint">Chapter 1, Strategic Assessment, is the 7 criteria above. The method follows Joey Yap\'s Sun Tzu Warcraft, but the book gives no scoring, so the leans and the verdict are this app\'s own. Treat it as prompts for thinking, not as a prediction or as professional advice.</div>';
      wirePlateTaps('warOut', r.chart, r.formations);
    }
    $('warGo').onclick = function () {
      var v = $('warWhen').value, q = $('warQ').value.trim();
      if (!v) { $('warOut').innerHTML = '<div class="notice">Please choose a moment.</div>'; return; }
      try {
        var r = W.read({ y: +v.slice(0, 4), m: +v.slice(5, 7), d: +v.slice(8, 10), hour: +v.slice(11, 13), min: +v.slice(14, 16) });
        warLast = { r: r, q: q };
        show(r, q);
      } catch (e) { $('warOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; }
    };
    if (warLast) show(warLast.r, warLast.q);
  }

  /* ---------------- Strategic Execution: which seat or direction for an activity ---------------- */
  var execLast = null;
  function renderExec(host) {
    var X = window.QPExec, t = now(), iso = function (w) { return w.y + '-' + ('0' + w.m).slice(-2) + '-' + ('0' + w.d).slice(-2) + 'T' + ('0' + w.hour).slice(-2) + ':' + ('0' + w.min).slice(-2); };
    var DIRS = [[1, 'North'], [8, 'Northeast'], [3, 'East'], [4, 'Southeast'], [9, 'South'], [2, 'Southwest'], [7, 'West'], [6, 'Northwest']];
    var last = execLast;
    host.innerHTML =
      '<div class="hint" style="margin-top:0">Pick an activity and a moment, and see which seat or direction suits it best. Works offline, with no AI key.</div>' +
      block('Strategic Execution', 'the best sector for what you are doing',
        '<div class="panel"><label for="exAct">What are you doing?</label><select id="exAct">' + X.ACTIVITIES.map(function (a) {
          return '<option value="' + a.id + '"' + (last && last.r.activity.id === a.id ? ' selected' : '') + '>' + esc(a.label) + ' · ' + a.cn + '</option>'; }).join('') + '</select>' +
        '<label for="exWhen">When is it?</label><input id="exWhen" type="datetime-local" value="' + iso(last ? last.r.when : t) + '">' +
        '<label for="exDest">Which way is the place from you? (optional)</label><select id="exDest"><option value="0">Not going anywhere, or not sure</option>' + DIRS.map(function (d) {
          return '<option value="' + d[0] + '"' + (last && last.dest === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select>' +
        '<button class="btn" id="exGo">Find the best sector</button></div>') +
      '<div id="exOut"></div>';
    function show(r, dest) {
      var plain = function (s) { return '<div class="plain" style="margin-bottom:6px">' + esc(s) + '</div>'; };
      var warn = function (w, tone) { return '<div class="find ' + toneCls(tone) + '" style="margin-top:10px"><b>' + esc(w.label) + '</b><span>' + esc(w.text) + '</span></div>'; };
      var rateCls = function (x) { return x === 'good' ? 'good-t' : x === 'bad' ? 'bad-t' : 'mid-t'; };
      var row = function (x, i) {
        var tag = x.hazard ? ' · <span class="bad-t">avoid</span>' : x.isVoid ? ' · <span class="mid-t">void</span>' : '';
        return '<details class="tech"' + (i === 0 && x.usable ? ' open' : '') + '><summary><b>' + esc(x.dir) + '</b> ' + (x.pair ? '<span class="' + rateCls(x.pair.rating) + '">' + esc(x.pair.ratingEn) + '</span>' : '') + ' · ' + esc(x.door || '—') + tag + '</summary><div style="margin-top:8px">' +
          (x.pair ? '<div class="plain" style="margin-bottom:6px"><b>' + x.heaven + '加' + x.earth + '</b> ' + esc(x.pair.cn) + ' <small>' + esc(x.pair.en) + '</small></div>' : '') +
          plain('Star ' + (x.star || '—') + ', deity ' + (x.deity || '—') + '.') +
          (x.goodForms.length ? plain('Helping: ' + x.goodForms.slice(0, 4).join(', ') + '.') : '') + (x.badForms.length ? plain('Against: ' + x.badForms.slice(0, 4).join(', ') + '.') : '') +
          x.why.map(plain).join('') + (x.differs ? '<div class="hint">' + esc(x.differs) + '</div>' : '') + '</div></details>';
      };
      var stop = dest ? X.pitStop(r, dest) : null, better = r.best && r.usableHour ? [] : X.betterHours(r.when, r.activity.id, 3), whenText = function (w) { return w.d + ' ' + MON[w.m - 1].slice(0, 3) + ', ' + ('0' + w.hour).slice(-2) + ':' + ('0' + w.min).slice(-2); };
      $('exOut').innerHTML =
        block(esc(r.activity.label), esc(r.chart.dun) + ' ' + r.chart.ju + '局 · ' + r.pillars.hour.cn + ' hour · ' + esc(r.pillars.hourRange),
          (r.best ? '<div style="font-size:1.25rem;margin-bottom:2px" class="good-t">' + esc(r.best.dir) + '</div>' +
              plain('In a room, sit with your back to the ' + r.best.dir + ' the whole time. If you are going somewhere, head ' + r.best.dir + '.')
            : '<div style="font-size:1.25rem;margin-bottom:2px" class="bad-t">No clean sector</div>' + plain('Nothing on this plate stands out for this activity.')) +
          plain(r.activity.note) +
          (r.care ? warn(r.care, 'neutral') : '') + r.warnings.map(function (w) { return warn(w, 'danger'); }).join('')) +
        (stop ? block('Getting there', 'heading ' + esc(stop.dest.dir), plain(stop.text) + (stop.needed ? '<div class="hint">Arrive by about ' + esc(whenText(stop.by)) + '.</div>' : '')) : '') +
        (better.length ? block('Better hours', 'the next 3 days, waking hours', better.map(function (b) { return plain(whenText(b.when) + ' · ' + b.hour + ' hour · ' + b.dir + ', with ' + b.door); }).join('')) : '') +
        block('Every sector', 'best first', r.list.map(row).join('')) +
        block('The plate', 'highlighted: the best sector', '<div>' + plateHtml(r.chart, r.formations, r.hits, true) + '</div>') +
        '<div class="hint">Lay this chart over your floor plan, matching the compass directions. The method follows Joey Yap\'s Strategic Executions. Ratings come from the Compendium\'s stem table; the ranking and the notes are this app\'s own, and the book\'s written forecasts are not included. Treat it as prompts for thinking, not as a prediction or as professional advice.</div>';
      wirePlateTaps('exOut', r.chart, r.formations);
    }
    $('exGo').onclick = function () {
      var v = $('exWhen').value;
      if (!v) { $('exOut').innerHTML = '<div class="notice">Please choose a moment.</div>'; return; }
      try {
        var dest = parseInt($('exDest').value, 10) || 0, r = X.read({ y: +v.slice(0, 4), m: +v.slice(5, 7), d: +v.slice(8, 10), hour: +v.slice(11, 13), min: +v.slice(14, 16) }, $('exAct').value);
        execLast = { r: r, dest: dest };
        show(r, dest);
      } catch (e) { $('exOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; }
    };
    if (last) show(last.r, last.dest);
  }

  /* ---------------- monthly report ---------------- */
  var monthlyState = null;   // { key, start, report } for the active profile
  function monthlyThemeHtml(r, t) {
    var names = window.QPMonthly.LADDER, day = function (x) { return x.d + ' ' + MON[x.m - 1].slice(0, 3); };
    return '<details class="tech pl-month"><summary><b>' + esc(t.label) + '</b> <span class="' + (t.pct >= 0 ? 'good-t' : 'bad-t') + '">' + t.level + ' ' + (t.pct > 0 ? '+' : '') + t.pct + '</span></summary>' +
      '<div class="mr-ladder">' + names.map(function (n, i) { return '<span class="' + (i === t.step ? (i >= 3 ? 'on-good' : 'on-bad') : '') + '">' + n + '</span>'; }).join('') + '</div>' +
      '<div class="plain">' + esc(t.lead) + '</div>' +
      (t.key !== 'emotions' ? '<div class="hint">' + esc(t.note) + '</div>' : '') +
      (t.key === 'emotions' ? rows(r.energies.map(function (e) { return [esc(e.name) + ' <small>' + esc(e.element) + '</small>', 'Birth chart ' + e.natal + '% · this month ' + e.month + '%']; })) : '') +
      (t.key === 'wellbeing' ? rows(r.gauges.map(function (g) { return [g.name, g.word + ' <small>' + (g.pct > 0 ? '+' : '') + g.pct + '</small>']; }).concat([['Zone to watch', esc(r.zone)]])) : '') +
      '<div class="stack-sm" style="margin-top:8px">' + t.recs.map(function (x) { return '<div class="plain"><b>' + esc(x[0]) + '.</b> ' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
      '<div class="mr-days" role="img" aria-label="Score for each day of the month">' + t.series.map(function (v, i) {
        var dx = r.month.days[i], cls = t.best.indexOf(dx) >= 0 ? 'up' : t.worst.indexOf(dx) >= 0 ? 'down' : '';
        return '<i class="' + cls + '" style="height:' + Math.max(3, v) + '%" title="' + day(dx) + ': ' + v + '"></i>'; }).join('') + '</div>' +
      rows([['<span class="good-t">Best</span>', t.best.map(day).join(' and ') + '<small>' + esc(t.bestText) + '</small>'],
            ['<span class="bad-t">Hardest</span>', t.worst.map(day).join(' and ') + '<small>' + esc(t.worstText) + '</small>']]) +
      '</details>';
  }
  function renderMonthly(host) {
    var t = now(), opts = window.QPPlanner.startOptions({ y: t.y, m: t.m, d: t.d });
    var st = monthlyState && monthlyState.key === user.id ? monthlyState : null, sel = st ? st.start : opts[0].value;
    host.innerHTML =
      '<div class="hint" style="margin-top:0">One solar month for ' + esc(user.name) + ': seven themes, the best and hardest days for each, and good dates, with a PDF you can keep.</div>' +
      block('Monthly report', 'generated on this device',
        '<div class="panel"><label for="mrStart">Month beginning</label><select id="mrStart">' + opts.map(function (o) {
          return '<option value="' + o.value + '"' + (o.value === sel ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>' +
        '<button class="btn" id="mrGo">Create report</button></div>') +
      '<div id="mrOut"></div>';
    function show(r) {
      var m = r.month, day = function (x) { return x.d + ' ' + MON[x.m - 1].slice(0, 3); };
      var areaRow = function (cls) { return function (a) { return ['<span class="' + cls + '">' + esc(a.label) + '</span>', '<div class="plain">' + esc(a.plain) + '</div><small>' + esc(a.todo) + '</small>']; }; };
      $('mrOut').innerHTML =
        block(r.pillar.cn + ' month', plannerPretty(m.start) + ' to ' + plannerPretty(m.end),
          r.overview.map(function (s) { return '<div class="plain" style="margin-bottom:8px">' + esc(s) + '</div>'; }).join('') +
          '<div class="panel" style="margin-top:8px"><b>' + esc(r.reflect[0]) + '</b><div class="plain">' + esc(r.reflect[1]) + '</div></div>' +
          '<button class="btn" id="mrPdf" style="margin-top:12px">Save as PDF</button><div class="hint" id="mrMsg" role="status"></div>') +
        block('Seven themes', 'from -100 to +100, with 0 as neutral', '<div class="mr-bal">' + r.themes.map(function (x) {
          var w = Math.abs(x.pct) / 2;
          return '<div class="mr-row"><span>' + esc(x.label) + '</span><div class="mr-track"><i class="' + (x.pct >= 0 ? 'up' : 'down') + '" style="width:' + w + '%;' + (x.pct >= 0 ? 'left:50%' : 'right:50%') + '"></i></div><b>' + (x.pct > 0 ? '+' : '') + x.pct + '</b></div>'; }).join('') + '</div>' +
          r.themes.map(function (x) { return monthlyThemeHtml(r, x); }).join('')) +
        block('Where the month helps you', '', rows(r.opportunities.map(areaRow('good-t')))) +
        block('Where to take care', '', rows(r.watchOuts.map(areaRow('bad-t')))) +
        block('Good dates', '', rows([['Money days', r.money.map(day).join(', ') || 'None clear this month'], ['Reset days', r.reset.map(day).join(', ') || 'None clear this month']])) +
        block('Month plate', 'you are in the ' + esc(m.seat.dir) + ' palace', plateHtml(m.res.chart, m.res.formations, [m.seat.num], false, null, { res: m.res }));
      $('mrPdf').onclick = function () {
        var btn = $('mrPdf'), msg = $('mrMsg');
        btn.disabled = true; msg.textContent = 'Creating your PDF…';
        setTimeout(function () {
          var p;
          try { p = window.QPMonthly.toPdf(r); }
          catch (e) { btn.disabled = false; msg.textContent = 'Could not create the PDF: ' + e.message; return; }
          plannerSave(p).then(function () {
            btn.disabled = false; msg.textContent = p.pages + ' pages, ' + (p.bytes.length / 1048576).toFixed(1) + ' MB · ' + p.name;
          }).catch(function (e) { btn.disabled = false; msg.textContent = 'Could not save the PDF: ' + ((e && e.message) || e); });
        }, 30);
      };
    }
    $('mrGo').onclick = function () {
      var start = $('mrStart').value;
      $('mrOut').innerHTML = '<div class="empty">Reading the month…</div>';
      setTimeout(function () {
        try {
          var r = window.QPMonthly.build(user, plannerDate(start));
          monthlyState = { key: user.id, start: start, report: r };
          show(r);
        } catch (e) { $('mrOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; }
      }, 30);
    };
    if (st) show(st.report);
  }

  function renderStructures(host) {
    host.innerHTML = '<div class="empty">Scanning every hourly chart for the next ' + STRUCT_DAYS + ' days…</div>';
    setTimeout(function () {
      var r;
      try { r = structureScanToday(); } catch (e) { host.innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
      var list = r.today.concat(r.top);
      host.innerHTML =
        '<div class="hint" style="margin-top:0">Every double-hour plate from today for ' + STRUCT_DAYS + ' days, each palace scored on its auspicious ' +
          'formations (rare ones count most), door, deity, star and stems, and on your favourable elements. Waking hours only (07:00–00:59).</div>' +
        block('Today', r.today.length ? 'the strongest structures today' : '',
          r.today.length ? r.today.map(function (s, i) { return structureCard(s, i); }).join('') : '<div class="empty">No strong structure today.</div>') +
        block('The next ' + STRUCT_DAYS + ' days', 'the strongest structures, at most two a day',
          r.top.map(function (s, i) { return structureCard(s, r.today.length + i); }).join('')) +
        '<div class="hint">' + esc(DIGEST_NOTE) + '</div>';
      host.querySelectorAll('[data-struct]').forEach(function (b) { b.onclick = function () { openManifestFor(list[+b.dataset.struct]); }; });
    }, 30);
  }
  var DIGEST_NOTE = 'The daily notification (Profile › Daily structures) and the 06:00 email both point here; tap a structure\'s ' +
    'button to open its manifestation script.';

  /* ---------------- deep links and the daily notification ---------------- */
  // qipath://structures opens Strategy › Structures; qipath://manifest?d=2026-11-15&h=19&p=3&f=yu_nv_shou opens the
  // manifestation script for that hour and palace. A link that arrives before sign-in waits until the profile opens.
  var pendingLink = null;
  function capPlugin(name) { var Cp = window.Capacitor; return Cp && Cp.Plugins && Cp.Plugins[name] ? Cp.Plugins[name] : null; }
  function parseLink(url) {
    var m = /^qipath:\/\/([a-z]+)\/?(?:\?(.*))?$/i.exec(String(url || ''));
    if (!m) return null;
    var q = {}; (m[2] || '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || ''); });
    return { kind: m[1].toLowerCase(), q: q };
  }
  function applyLink(l) {
    if (!l) return;
    if (!user) { pendingLink = l; return; }
    pendingLink = null;
    if (l.kind === 'manifest' && /^\d{4}-\d{2}-\d{2}$/.test(l.q.d || '')) {
      var d = l.q.d.split('-').map(Number), dt = { y: d[0], m: d[1], d: d[2], hour: parseInt(l.q.h, 10) || 12, min: 30 };
      var form = null;
      try { form = window.QPQimen.chartFor('hour', dt).formations.filter(function (f) { return f.id === l.q.f; })[0] || null; } catch (e) { form = null; }
      openManifestFor({ dt: dt, palace: { num: parseInt(l.q.p, 10) || null }, formations: form ? [form] : [] });
      return;
    }
    consultK = 'structures';
    $('segConsult').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.k === 'structures')); });
    show('consult');
  }
  (function listenForLinks() {
    var App = capPlugin('App'), LN = capPlugin('LocalNotifications');
    if (App) {
      App.addListener('appUrlOpen', function (e) { applyLink(parseLink(e.url)); });
      if (App.getLaunchUrl) App.getLaunchUrl().then(function (r) { if (r && r.url) applyLink(parseLink(r.url)); }, function () {});
    }
    if (LN) LN.addListener('localNotificationActionPerformed', function (e) {
      applyLink(parseLink((e.notification && e.notification.extra && e.notification.extra.link) || 'qipath://structures'));
    });
  })();

  // Profile › Daily structures: a 06:00 notification each day naming that day's strongest structure. It is a rolling
  // window of 60 one-off notifications, rescheduled each time the app opens so the text stays current.
  var NOTIFY_BASE = 6000;
  function digestPrefs() { try { return JSON.parse(localStorage.getItem('qipath.digest.' + user.id) || '{}') || {}; } catch (e) { return {}; } }
  function saveDigestPrefs(p) { try { localStorage.setItem('qipath.digest.' + user.id, JSON.stringify(p)); } catch (e) {} }
  function scheduleDigest(on) {
    var LN = capPlugin('LocalNotifications');
    if (!LN) return Promise.resolve('This device cannot schedule notifications (they work in the Android app).');
    var ids = []; for (var i = 0; i < STRUCT_DAYS; i++) ids.push({ id: NOTIFY_BASE + i });
    return LN.cancel({ notifications: ids }).catch(function () {}).then(function () {
      if (!on) return 'Daily notification turned off.';
      return LN.requestPermissions().then(function (perm) {
        if (perm && perm.display && perm.display !== 'granted') return 'Notifications are blocked for QiPath Pro in Android settings.';
        var r = structureScanToday(), byDay = {}, t = now(), list = [];
        r.all.forEach(function (s) { if (!byDay[s.date] || s.score > byDay[s.date].score) byDay[s.date] = s; });
        for (var k = 0; k < STRUCT_DAYS; k++) {
          var at = new Date(t.y, t.m - 1, t.d + k, 6, 0, 0);
          if (at.getTime() <= Date.now()) continue;
          var iso = at.getFullYear() + '-' + String(at.getMonth() + 1).padStart(2, '0') + '-' + String(at.getDate()).padStart(2, '0'), s = byDay[iso];
          list.push({ id: NOTIFY_BASE + k, title: 'Today\'s Qimen structures',
            body: s ? s.range + ' ' + s.palace.dir + ' — ' + (s.formations[0] ? s.formations[0].name + '. ' : '') + s.summary
                    : 'No strong structure today. Tap to see the next ones.',
            schedule: { at: at, allowWhileIdle: true }, extra: { link: 'qipath://structures' } });
        }
        return LN.schedule({ notifications: list }).then(function () { return 'Scheduled for 06:00 each day — ' + list.length + ' days ahead.'; });
      });
    }).catch(function (e) { return 'Could not schedule: ' + (e && e.message || e); });
  }

  /* ================= COACH 教练 =================
   * A guided coaching session (QPCoach holds the stages, prompts and safety wording). Every message is screened on the device
   * before it goes to the AI. A safety case stops the session with fixed wording and local helplines. A session in progress is
   * kept as a draft on this device; a finished one is saved to the Journal. A session stopped for safety is not saved unless
   * the person chooses to keep it.
   */
  var coach = { session: null, profile: null, busy: false, breathe: false };
  function coachKey(k) { return 'qipath.coach.' + k + '.' + (user && user.id); }
  function coachGet(k) { try { return JSON.parse(localStorage.getItem(coachKey(k)) || 'null'); } catch (e) { return null; } }
  function coachSet(k, v) { try { if (v === null) localStorage.removeItem(coachKey(k)); else localStorage.setItem(coachKey(k), JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function coachCountry() {
    var c = null; try { c = localStorage.getItem('qipath.coach.country'); } catch (e) { c = null; }
    return c && window.QPCoach.HELPLINES[c] ? c : window.QPCoach.detectCountry();
  }

  function helplineHtml(kind, country) {
    var CO = window.QPCoach, H = CO.HELPLINES[country] || CO.HELPLINES.OTHER;
    var lines = (kind === 'abuse' ? H.abuse.concat(H.crisis) : kind === 'self_harm' ? H.crisis.concat(H.abuse.length ? [] : []) : []);
    var tel = function (n) { var main = n.split(/\s*ext\s*/i)[0]; return 'tel:' + main.replace(/[^\d+]/g, ''); };
    var opts = Object.keys(CO.HELPLINES).map(function (k) {
      return '<option value="' + k + '"' + (k === country ? ' selected' : '') + '>' + CO.HELPLINES[k].name + '</option>'; }).join('');
    return '<label for="coCountry">Helplines for</label><select id="coCountry">' + opts + '</select>' +
      '<div class="co-lines">' +
      '<div class="co-line em"><b>Emergency</b><span>' + esc(H.emergency) + '</span></div>' +
      lines.map(function (l) {
        return '<a class="co-line" href="' + tel(l[1]) + '"><b>' + esc(l[1]) + '</b><span>' + esc(l[0]) + (l[2] ? '<small>' + esc(l[2]) + '</small>' : '') + '</span></a>';
      }).join('') +
      '<a class="co-line" href="https://findahelpline.com" target="_blank" rel="noopener"><b>Other countries</b><span>findahelpline.com lists free, confidential helplines worldwide</span></a>' +
      '</div>';
  }

  function coachSafetyHtml(s) {
    var CO = window.QPCoach, sf = CO.SAFETY[s.safety], country = coachCountry(), crisis = s.safety !== 'health';
    return '<div class="co-safe ' + (crisis ? 'crisis' : 'health') + '">' +
      '<h3>' + esc(sf.title) + '</h3>' +
      '<p>' + esc(sf.message) + '</p>' +
      '<p class="danger">' + esc(sf.danger) + '</p>' +
      (crisis ? helplineHtml(s.safety, country) : '<div class="co-lines"><div class="co-line em"><b>Emergency</b><span>' + esc((CO.HELPLINES[country] || CO.HELPLINES.OTHER).emergency) + '</span></div></div>') +
      '<p>' + esc(sf.also) + '</p>' +
      '<details class="pp"><summary><span>If you are coaching someone through this</span><small>tips for the coach</small></summary>' +
        '<ul class="co-tips">' + sf.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>' +
      (crisis
        ? '<button class="btn" id="coDone">Close the session</button>' +
          '<button class="btn ghost" id="coKeep">Keep a private copy in the Journal</button>' +
          '<div class="hint">This session is not saved unless you choose to keep it. Closing removes it from this device.</div>'
        : '<button class="btn" id="coHealthEnd">End the session</button>' +
          '<button class="btn ghost" id="coHealthGo">Continue: I already have care, or this isn\'t a medical concern</button>') +
      '</div>';
  }

  function renderCoach(host) {
    var CO = window.QPCoach, s = coach.session, credit = '<div class="hint">Draws on mindfulness, Virginia Satir\'s iceberg model, systemic thinking and the five life principles of Chou Ting Wen (周鼎文). ' +
      'The Chinese metaphysics chart is used as a mirror for reflection, never as fate.</div>';

    if (!coachGet('consent')) {
      host.innerHTML = block('Coaching 教练', 'before your first session',
        '<div class="panel co-intro">' +
        '<p>A guided session that helps you look beneath a problem, notice what you really want, and choose your next step. Your charts are used as a mirror, and you decide what fits.</p>' +
        '<ul class="co-tips">' +
        '<li>This is coaching. It is not therapy, counselling, or medical, legal or financial advice.</li>' +
        '<li>What you write is sent to your AI provider with your own API key so it can write each question. Sessions stay on this device unless you save them.</li>' +
        '<li>If you mention a serious health problem, self-harm, suicidal thoughts or abuse, the session pauses and shows where to get help.</li>' +
        '<li>If you are in crisis right now, please contact a helpline instead of starting a session.</li></ul>' +
        '<button class="btn" id="coAgree">I understand, continue</button>' +
        '<button class="btn ghost" id="coHelpNow">Show helplines now</button><div id="coHelpBox"></div></div>' + credit);
      $('coAgree').onclick = function () { coachSet('consent', { at: new Date().toISOString() }); renderConsult(); };
      $('coHelpNow').onclick = function () { $('coHelpBox').innerHTML = '<div class="co-safe crisis" style="margin-top:10px">' + helplineHtml('self_harm', coachCountry()) + '</div>'; wireCountry(); };
      return;
    }

    if (!s) {
      var draft = coachGet('draft'), past = R.all(user.id).filter(function (r) { return r.kind === 'coaching'; }).length;
      host.innerHTML =
        (draft ? '<div class="panel" style="margin-bottom:12px"><b>You have an unfinished session</b><div class="hint" style="margin-top:4px">Started ' +
          esc(draft.started.slice(0, 10)) + (draft.topic ? ' &middot; ' + esc(draft.topic.slice(0, 80)) : '') + '</div>' +
          '<button class="btn" id="coResume">Resume it</button><button class="btn ghost" id="coDiscard">Discard it</button></div>' : '') +
        block('Coaching 教练', 'one question at a time',
          '<div class="panel">' +
          '<p class="co-lead">The session moves through nine stages: arrive, agree the focus, go beneath the surface, see the wider system around you, use your chart as a mirror, ' +
          'look through the five life principles, name your insight, choose a step, and close. Take your time with each answer.</p>' +
          '<label for="coTopic">What would you like to work on?</label>' +
          '<textarea id="coTopic" rows="3" maxlength="600" placeholder="For example: I keep putting off a difficult conversation with my business partner"></textarea>' +
          '<label for="coHope">What would you like to have by the end of the session?</label>' +
          '<input id="coHope" maxlength="200" placeholder="For example: clarity on what I actually want to say">' +
          (aiReady() ? '<button class="btn" id="coStart">Start the session</button>'
            : '<div class="notice">Coaching needs a Gemini or Claude API key. Add one on the Profile screen.</div><button class="btn ghost" id="coProfile">Open Profile</button>') +
          (past ? '<div class="hint">' + past + ' saved session' + (past > 1 ? 's' : '') + ' in Journal &rsaquo; Saved Readings.</div>' : '') +
          '</div>' + credit);
      if ($('coStart')) $('coStart').onclick = function () {
        var topic = $('coTopic').value, hit = CO.screen(topic + ' ' + $('coHope').value);
        coach.session = CO.newSession(topic, $('coHope').value);
        coach.session.turns.push({ who: 'coach', text: CO.OPENING, stage: 'arrive' });
        if (topic.trim()) coach.session.turns.push({ who: 'coachee', text: 'What I want to work on: ' + topic.trim() + ($('coHope').value.trim() ? '. By the end I would like: ' + $('coHope').value.trim() : ''), stage: 'arrive', intro: true });
        if (hit) { coachSafety(hit); return; }
        coach.profile = null; coachSet('draft', coach.session); renderConsult();
        coachSpeakLast(false);
      };
      if ($('coProfile')) $('coProfile').onclick = function () { show('profile'); };
      if ($('coResume')) $('coResume').onclick = function () { coach.session = CO.upgrade(draft); coach.profile = null; renderConsult(); };
      if ($('coDiscard')) $('coDiscard').onclick = function () { coachSet('draft', null); renderConsult(); };
      return;
    }

    var st = CO.STAGES[s.stage], layer = s.layer;
    var stageBar = '<div class="co-stages">' + CO.STAGES.map(function (x, i) {
      return '<span class="' + (i < s.stage ? 'done' : i === s.stage ? 'on' : '') + '" title="' + x.label + ' ' + x.cn + '">' + x.chip + '</span>'; }).join('') + '</div>';
    var depth = '<div class="co-depth"><span>Depth</span><i>' + CO.ICEBERG.map(function (l, i) { return '<b class="' + (i <= layer ? 'on' : '') + '"></b>'; }).join('') +
      '</i><small>' + (layer >= 0 ? CO.ICEBERG[layer].label + ' ' + CO.ICEBERG[layer].cn : 'Surface') + '</small></div>';
    var sysMap = (s.people && s.people.length) || (s.loops && s.loops.length)
      ? '<details class="pp co-sys"' + (s.stage === 3 ? ' open' : '') + '><summary><span>Your system 系统</span><small>' + (s.people || []).length + ' people &middot; ' + (s.loops || []).length + ' loop' + ((s.loops || []).length === 1 ? '' : 's') + '</small></summary>' +
        ((s.people || []).length ? '<div class="co-people">' + s.people.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
        ((s.loops || []).length ? '<ul class="co-loops">' + s.loops.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        '</details>' : '';
    var log = '<div class="co-log" id="coLog">' + s.turns.filter(function (t) { return !t.hidden; }).map(function (t) {
      return '<div class="co-msg ' + t.who + '">' + (t.who === 'coach' && t.reflection ? '<span class="refl">' + esc(t.reflection) + '</span>' : '') +
        esc(t.who === 'coach' && t.reflection ? t.question : t.text) +
        (t.chartLink ? '<small>From your chart: ' + esc(t.chartLink) + '</small>' : '') + '</div>';
    }).join('') + (coach.busy ? '<div class="co-msg coach typing">…</div>' : '') + '</div>';

    var foot;
    if (s.safety && s.ended === 'safety') foot = coachSafetyHtml(s);
    else if (s.ended === 'done') foot = coachSummaryHtml(s);
    else foot =
      (coach.breathe ? '<div class="co-breath"><i></i><span>Breathe in as the circle grows, out as it shrinks. Stay as long as you like.</span><button class="btn ghost" id="coBreathDone">I\'m ready</button></div>' : '') +
      coachVoiceHtml() +
      '<label for="coIn" class="sr">Your answer</label><textarea id="coIn" rows="3" maxlength="2000" placeholder="Take your time…"' + (coach.busy ? ' disabled' : '') + '></textarea>' +
      '<div class="co-acts"><button class="btn" id="coSend"' + (coach.busy ? ' disabled' : '') + '>Send</button>' +
      (ttsKey() ? '<button class="btn ghost" id="coHear">Read the question aloud</button>' : '') +
      '<button class="btn ghost" id="coBreathe">Pause and breathe</button><button class="btn ghost" id="coEnd">End the session</button></div>' +
      '<div id="coErr"></div>' + coachVoiceSettingsHtml();

    host.innerHTML = block('Coaching 教练', st.label + ' ' + st.cn, stageBar + depth + sysMap + log + foot);
    var lg = $('coLog'); if (lg) lg.scrollTop = lg.scrollHeight;
    wireCountry();
    if ($('coSend')) $('coSend').onclick = coachSend;
    wireCoachVoice();
    if ($('coIn')) $('coIn').focus();
    if ($('coBreathe')) $('coBreathe').onclick = function () { coach.breathe = true; renderConsult(); };
    if ($('coBreathDone')) $('coBreathDone').onclick = function () { coach.breathe = false; renderConsult(); };
    if ($('coEnd')) $('coEnd').onclick = function () { if (window.confirm('End the session now and write the summary?')) coachFinish(); };
    if ($('coDone')) $('coDone').onclick = function () { coachSet('draft', null); coach.session = null; renderConsult(); };
    if ($('coKeep')) $('coKeep').onclick = function () { coachSave(s, null); this.textContent = 'Kept in Journal › Saved Readings'; this.disabled = true; };
    if ($('coHealthEnd')) $('coHealthEnd').onclick = function () {
      s.turns.push({ who: 'coach', text: 'Thank you for the courage to share this. Please look after your health first. You can come back to coaching whenever you are ready.' });
      coachFinish();
    };
    if ($('coHealthGo')) $('coHealthGo').onclick = function () {
      s.safety = null; s.ended = null; s.healthNoted = true;
      s.turns.push({ who: 'coach', text: 'Thank you for letting me know. We can continue, and please do keep your doctor in the loop. What would be most useful for us to look at now?' });
      coachSet('draft', s); renderConsult();
    };
    if ($('coAgain')) $('coAgain').onclick = function () { coach.session = null; renderConsult(); };
    if ($('coJournal')) $('coJournal').onclick = function () { journalK = 'saved'; show('journal'); };
    if ($('coSumRetry')) $('coSumRetry').onclick = coachFinish;
  }

  function wireCountry() {
    var c = $('coCountry');
    if (!c) return;
    c.onchange = function () { try { localStorage.setItem('qipath.coach.country', this.value); } catch (e) { /* storage blocked */ } renderConsult(); };
  }

  /* ---- voice: push-to-talk answers and spoken questions (QPVoice) ---- */
  function coachGeminiCfg() {
    var c = loadAI();
    return { provider: 'gemini', key: ttsKey(), model: c.provider === 'gemini' && c.model ? c.model : window.QPAI.PROVIDERS.gemini.defaultModel };
  }
  function coachEngine() { return window.QPVoice.engine(!!ttsKey()); }
  function coachVoiceHtml() {
    var eng = coachEngine();
    if (!eng) return '<div class="hint">Voice answers need speech recognition on this phone or a Google Gemini key.</div>';
    return '<div class="co-voice"><button class="co-mic" id="coMic" type="button"' + (coach.busy ? ' disabled' : '') + '><i></i><span id="coMicTx">Hold to speak</span></button>' +
      '<div class="hint" id="coVoiceMsg">' + (eng === 'gemini' ? 'Gemini turns your recording into text with your key.' : 'Your phone turns your words into text.') +
      ' The words appear in the box below for you to check before sending.</div></div>';
  }
  function coachVoiceSettingsHtml() {
    var V = window.QPVoice, p = V.prefs(), dev = V.hasDevice(), gem = !!ttsKey() && V.canRecord();
    var opt = function (v, label, on, ok) { return '<option value="' + v + '"' + (on ? ' selected' : '') + (ok ? '' : ' disabled') + '>' + label + '</option>'; };
    return '<details class="pp co-vset"><summary><span>Voice settings</span><small>' + (p.speak ? 'questions read aloud' : 'questions on screen') + '</small></summary>' +
      '<label for="coVMode">Turn speech into text with</label><select id="coVMode">' +
        opt('auto', 'The best available', p.mode === 'auto', true) + opt('device', 'This phone (works offline)', p.mode === 'device', dev) +
        opt('gemini', 'Gemini, with your key', p.mode === 'gemini', gem) + '</select>' +
      '<label for="coVLang">Language you speak</label><select id="coVLang">' + V.LANGS.map(function (l) { return opt(l[0], l[1], l[0] === p.lang, true); }).join('') + '</select>' +
      '<label class="chk"><input type="checkbox" id="coVSpeak"' + (p.speak ? ' checked' : '') + (ttsKey() ? '' : ' disabled') + '> Read each question aloud</label>' +
      '<label for="coVPause">Quiet pause after a question is read</label><select id="coVPause">' +
        [0, 3, 5, 10, 20].map(function (n) { return opt(n, n ? n + ' seconds' : 'No pause', n === p.pause, true); }).join('') + '</select>' +
      '<div class="hint">Recordings are not stored. With Gemini, your recording goes to Google with your key to be transcribed; on-phone recognition keeps it on the phone. ' +
      'Questions are read aloud with the narration voice, which uses your Gemini key\'s quota.' + (ttsKey() ? '' : ' Reading aloud needs a Google Gemini key.') + '</div></details>';
  }

  function wireCoachVoice() {
    var V = window.QPVoice, b = $('coMic'), box = $('coIn');
    function setPref(k, v) { var p = V.prefs(); p[k] = v; V.setPrefs(p); }
    if ($('coVMode')) $('coVMode').onchange = function () { setPref('mode', this.value); renderConsult(); };
    if ($('coVLang')) $('coVLang').onchange = function () { setPref('lang', this.value); };
    if ($('coVSpeak')) $('coVSpeak').onchange = function () { setPref('speak', this.checked); if (!this.checked) V.stopSpeaking(); };
    if ($('coVPause')) $('coVPause').onchange = function () { setPref('pause', parseInt(this.value, 10)); };
    if ($('coHear')) $('coHear').onclick = function () { coachSpeakLast(true); };
    if (!b || !box) return;
    var eng = coachEngine(), active = false, base = '', timer = null;
    function msg(h) { var m = $('coVoiceMsg'); if (m) m.innerHTML = h; }
    function label(t) { var x = $('coMicTx'); if (x) x.textContent = t; }
    var CHECK = 'Check the words, change anything that is wrong, then press Send.';
    function begin() {
      if (active || b.disabled) return;
      active = true; V.stopSpeaking(); base = box.value.trim() ? box.value.trim() + ' ' : '';
      b.classList.add('on'); label('Listening… release to stop');
      var started = eng === 'device'
        ? V.startDevice(V.prefs().lang, function (t) { box.value = base + t; }, function () { if (active) end(); })
        : V.startRecording();
      started.catch(function (e) { active = false; clearTimeout(timer); b.classList.remove('on'); label('Hold to speak'); msg('<span class="bad-t">' + esc(e.message || 'The microphone could not start.') + '</span>'); });
      timer = setTimeout(function () { if (active) end(); }, V.MAX_SECONDS * 1000);
    }
    function end() {
      if (!active) return;
      active = false; clearTimeout(timer); b.classList.remove('on');
      if (eng === 'device') {
        label('Hold to speak');
        V.stopDevice().then(function (t) { if (t) box.value = base + t; box.focus(); msg(t ? CHECK : 'No words were heard. Try again, holding the button while you speak.'); });
        return;
      }
      b.disabled = true; label('Turning your words into text…');
      V.stopRecording().then(function (r) { return window.QPAI.transcribe(coachGeminiCfg(), r.b64, V.prefs().lang); }).then(function (res) {
        var t = String(res && res.text || '').trim();
        box.value = (base + t).trim();
        msg(t ? CHECK : 'No speech was heard. Try again, a little closer to the phone.');
      }).catch(function (e) { msg('<span class="bad-t">' + esc(e.message || 'The recording could not be transcribed.') + '</span>'); })
        .then(function () { b.disabled = false; label('Hold to speak'); box.focus(); });
    }
    b.oncontextmenu = function (e) { e.preventDefault(); };
    b.onpointerdown = function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } begin(); };
    b.onpointerup = b.onpointercancel = function () { end(); };
    b.onkeydown = function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); if (active) end(); else begin(); } };
  }

  // Read the latest question aloud, then hold the microphone for a quiet pause before the coachee answers.
  function coachSpeakLast(force) {
    var V = window.QPVoice, p = V.prefs(), key = ttsKey(), s = coach.session;
    if ((!p.speak && !force) || !key || !s || s.ended) return;
    var last = s.turns.filter(function (t) { return t.who === 'coach' && !t.hidden; }).pop();
    if (!last) return;
    var text = last.question ? (last.reflection ? last.reflection + ' ' : '') + last.question : last.text;
    var b = $('coMic'), hear = $('coHear');
    function hold(on, t) { if (b) { b.disabled = on; var x = $('coMicTx'); if (x) x.textContent = t || 'Hold to speak'; } }
    hold(true, 'Preparing the voice…'); if (hear) hear.disabled = true;
    V.speak(key, text, function () {
      if (hear) hear.disabled = false;
      var n = p.pause;
      if (!n) { hold(false); return; }
      var stop = Date.now() + n * 1000;
      (function tick() {
        var left = Math.ceil((stop - Date.now()) / 1000);
        if (left <= 0 || !$('coMic')) { hold(false); return; }
        hold(true, 'Take a moment… ' + left);
        setTimeout(tick, 250);
      })();
    }).then(function () { hold(true, 'Listening to the question…'); }).catch(function (e) {
      hold(false); if (hear) hear.disabled = false;
      var m = $('coVoiceMsg'); if (m) m.innerHTML = '<span class="bad-t">The question could not be read aloud: ' + esc(e.message || '') + '</span>';
    });
  }

  // A safety case stops the session at once with fixed wording; nothing more goes to the AI.
  function coachSafety(kind) {
    var s = coach.session, sf = window.QPCoach.SAFETY[kind];
    s.safety = kind; s.ended = 'safety';
    s.turns.push({ who: 'coach', text: sf.message, safetyKind: kind, hidden: true });   // shown in the card, kept in the record
    coach.busy = false;
    if (kind === 'health') coachSet('draft', s); else coachSet('draft', null);
    renderConsult();
  }

  function coachSend() {
    var CO = window.QPCoach, s = coach.session, box = $('coIn'), text = box ? box.value.trim() : '';
    if (!text || coach.busy) return;
    window.QPVoice.stopSpeaking();
    s.turns.push({ who: 'coachee', text: text, stage: CO.STAGES[s.stage].key });
    if (s.stage === 1 && !s.topic) s.topic = text.slice(0, 300);
    var hit = CO.screen(text);
    if (hit && !(hit === 'health' && s.healthNoted)) { coachSafety(hit); return; }
    // The closing question has been answered: write the summary.
    if (CO.STAGES[s.stage].key === 'close' && s.inStage >= 1) { coachFinish(); return; }
    coach.busy = true; coachSet('draft', s); renderConsult();
    if (!coach.profile) coach.profile = CO.profile(user, solarYearNow());
    window.QPAI.call(loadAI(), CO.turnPrompt(s, coach.profile), CO.TURN_SCHEMA).then(function (r) {
      coach.busy = false;
      var safe = String(r.safety || 'none');
      if (safe === 'self_harm' || safe === 'abuse' || (safe === 'health' && !s.healthNoted)) { coachSafety(safe); return; }
      var li = CO.ICEBERG.map(function (l) { return l.key; }).indexOf(r.layer), pi = CO.PRINCIPLES.map(function (p) { return p.key; }).indexOf(r.principle);
      if (li > s.layer) s.layer = li;
      if (pi >= 0) s.principle = pi;
      var lk = CO.SYSTEM_LENSES.map(function (l) { return l.key; }).indexOf(r.lens);
      s.people = s.people || []; s.loops = s.loops || []; s.lensesUsed = s.lensesUsed || [];
      if (lk >= 0) { s.lens = lk; if (s.lensesUsed.indexOf(lk) < 0) s.lensesUsed.push(lk); }
      (Array.isArray(r.people) ? r.people : []).forEach(function (x) {
        x = String(x || '').trim().slice(0, 40);
        if (x && s.people.length < 14 && !s.people.some(function (y) { return y.toLowerCase() === x.toLowerCase(); })) s.people.push(x);
      });
      if (r.loop && String(r.loop).trim() && s.loops.length < 6) s.loops.push(String(r.loop).trim().slice(0, 200));
      if (r.insight) s.insights.push(String(r.insight).slice(0, 300));
      var q = String(r.question || '').trim() || 'What feels most important to you right now?';
      s.turns.push({ who: 'coach', reflection: String(r.reflection || '').trim(), question: q, text: (r.reflection ? r.reflection + ' ' : '') + q,
        stage: CO.STAGES[s.stage].key, layer: r.layer, principle: r.principle, lens: r.lens, chartLink: r.chartLink || '' });
      CO.advance(s, !!r.readyToMoveOn);
      coachSet('draft', s); renderConsult();
      coachSpeakLast(false);
    }).catch(function (e) {
      coach.busy = false; s.turns.pop(); coachSet('draft', s); renderConsult();
      if ($('coIn')) $('coIn').value = text;
      if ($('coErr')) $('coErr').innerHTML = '<div class="notice"><b>The coach could not reply.</b><br>' + esc(e.message) + '<br>Your answer is still in the box; press Send to try again.</div>';
    });
  }

  function coachFinish() {
    var CO = window.QPCoach, s = coach.session;
    s.ended = 'done'; coach.busy = true; renderConsult();
    window.QPAI.call(loadAI(), CO.summaryPrompt(s), CO.SUMMARY_SCHEMA).then(function (r) {
      coach.busy = false; s.summary = r; s.summaryFailed = false; coachSave(s, r); coachSet('draft', null); renderConsult();
    }).catch(function (e) {
      coach.busy = false; s.summaryFailed = e.message; coachSave(s, null); coachSet('draft', null); renderConsult();
    });
  }

  function coachSave(s, sum) {
    var CO = window.QPCoach;
    var rec = { kind: 'coaching', title: 'Coaching · ' + (sum && sum.title ? sum.title : (s.topic || 'session').slice(0, 60)),
      subtitle: s.started.slice(0, 10) + ' · reached ' + CO.STAGES[s.stage].label + (s.layer >= 0 ? ' · depth ' + CO.ICEBERG[s.layer].label : ''),
      when: { date: s.started.slice(0, 10) },
      payload: { topic: s.topic, hope: s.hope, stage: CO.STAGES[s.stage].label, depth: s.layer >= 0 ? CO.ICEBERG[s.layer].label + ' ' + CO.ICEBERG[s.layer].cn : '',
        insights: s.insights, summary: sum, safety: s.safety || null, people: s.people || [], loops: s.loops || [],
        transcript: s.turns.map(function (t) { return { who: t.who, text: t.text }; }) } };
    if (s.savedId) { try { R.remove(user.id, s.savedId); } catch (e) { /* replaced below */ } }
    var saved = R.save(user.id, rec);
    if (saved) s.savedId = saved.id;
    return saved;
  }

  function coachSummaryHtml(s) {
    if (coach.busy) return '<div class="panel"><div class="empty">Writing your session summary&hellip;</div><div class="meter"><i style="width:40%"></i></div></div>';
    var m = s.summary;
    return '<div class="panel co-sum">' +
      (m ? '<h3>' + esc(m.title) + '</h3><p>' + esc(m.summary) + '</p>' +
        (m.insights && m.insights.length ? '<b>What you saw</b><ul class="co-tips">' + m.insights.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (m.yearning ? '<p><b>Your yearning 渴望</b><br>' + esc(m.yearning) + '</p>' : '') +
        (m.systemView ? '<p><b>The wider system 系统</b><br>' + esc(m.systemView) + '</p>' : '') +
        (m.principles ? '<p><b>Through the five principles 五大法则</b><br>' + esc(m.principles) + '</p>' : '') +
        (m.commitment ? '<p><b>Your step</b><br>' + esc(m.commitment) + '</p>' : '') +
        (m.followUp ? '<p><b>To reflect on before next time</b><br>' + esc(m.followUp) + '</p>' : '')
        : '<div class="notice">The summary could not be written' + (s.summaryFailed ? ': ' + esc(s.summaryFailed) : '') + '. The conversation itself is saved.</div><button class="btn ghost" id="coSumRetry">Try the summary again</button>') +
      '<div class="saved-tick">Saved to Journal &rsaquo; Saved Readings.</div>' +
      '<button class="btn" id="coAgain">Start a new session</button><button class="btn ghost" id="coJournal">Open the Journal</button></div>';
  }

  function renderConsult() {
    var host = $('consultBody'), dt = now();
    var Q = window.QPQimen;

    if (consultK === 'structures') { renderStructures(host); return; }
    if (consultK === 'planner') { renderPlanner(host); return; }
    if (consultK === 'monthly') { renderMonthly(host); return; }
    if (consultK === 'oracle') { renderOracle(host); return; }
    if (consultK === 'warcraft') { renderWar(host); return; }
    if (consultK === 'execution') { renderExec(host); return; }
    if (consultK === 'sevenstar') { renderSeven(host); return; }

    /* ================= SAN CAI EXECUTION ================= */
    if (consultK === 'sancai') {
      var SC = window.QPSanCai;
      var goalOpts = SC.GOALS.map(function (g) {
        return '<option value="' + g.id + '">' + g.label + ' &middot; ' + g.cn + '</option>'; }).join('');
      var tfOpts = SC.TIMEFRAMES.map(function (t) {
        return '<option value="' + t.days + '"' + (t.id === '14' ? ' selected' : '') + '>' +
          t.label + '</option>'; }).join('');

      host.innerHTML =
        block('San Cai execution 三才', 'Heaven, Earth and Man cross-referenced',
          '<div class="panel">' +
          '<label for="scGoal">What is the objective?</label>' +
          '<select id="scGoal">' + goalOpts + '</select>' +
          '<div class="hint" id="scBlurb"></div>' +
          '<label for="scWin">Window of execution</label>' +
          '<select id="scWin">' + tfOpts + '</select>' +
          '<label for="scDay">Hours to consider</label>' +
          '<select id="scDay"><option value="1">Workable hours only (07:00–21:00)</option>' +
          '<option value="0">All twelve double-hours</option></select>' +
          '<button class="btn" id="scGo">Calculate the mandate</button>' +
          '<div class="hint">The engine filters out days that clash your own chart, finds the ' +
          'sector carrying the energy the goal needs, then locates the hour whose Qimen plate ' +
          'puts the required door in a usable direction.</div></div>') +
        '<div class="tri h">' +
          '<div><div class="t">天 Heaven</div><div class="n">Date</div><div class="m">擇日 · Bazi filter</div></div>' +
          '<div><div class="t">地 Earth</div><div class="n">Sector</div><div class="m">飛星 · Flying Stars</div></div>' +
          '<div><div class="t">人 Man</div><div class="n">Facing</div><div class="m">奇門 · Hour plate</div></div>' +
        '</div>' +
        '<div id="scOut"></div>';

      function paintBlurb() {
        var g = SC.GOALS.filter(function (x) { return x.id === $('scGoal').value; })[0];
        $('scBlurb').textContent = g ? g.blurb : '';
      }
      paintBlurb();
      $('scGoal').onchange = paintBlurb;

      $('scGo').onclick = function () {
        var goalId = $('scGoal').value;
        var days = parseInt($('scWin').value, 10);
        var dayOnly = $('scDay').value === '1';
        var stages = [
          'Cross-referencing Date Selection with Personal Bazi\u2026',
          'Mapping Flying Stars to your Eight Mansions profile\u2026',
          'Calculating Qimen Hour Charts for alignment\u2026',
          'Orchestrating the three layers\u2026'
        ];
        var at = 0;
        function paintRun() {
          $('scOut').innerHTML = '<div class="panel sancai-run"><div class="ring"></div>' +
            '<div class="stage">' + stages.map(function (t, i) {
              return i < at ? '<b class="done">\u2713 ' + t + '</b>'
                   : i === at ? '<b>' + t + '</b>'
                   : '<span style="opacity:.35">' + t + '</span>';
            }).join('') + '</div></div>';
        }
        paintRun();
        // Stage the messages so the orchestration is visible rather than a silent freeze.
        var timer = setInterval(function () {
          at++; if (at >= stages.length) { clearInterval(timer); return; } paintRun();
        }, 320);

        setTimeout(function () {
          var res;
          try { res = SC.findWindows(dt, days, goalId, user, { dayOnly: dayOnly }); }
          catch (e) {
            clearInterval(timer);
            $('scOut').innerHTML = '<div class="notice">The calculation failed: ' +
              esc(e.message) + '</div>';
            return;
          }
          clearInterval(timer);
          paintResults(res, days, dayOnly);
        }, 1300);
      };

      function paintResults(res, days, dayOnly) {
        if (!res.windows.length) {
          $('scOut').innerHTML = block('No mandate found', res.goal.label,
            '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
            'Nothing in the next ' + days + ' days satisfies all three layers for this goal. ' +
            res.excludedCount + ' day' + (res.excludedCount === 1 ? ' was' : 's were') +
            ' filtered out before the hour scan even ran.<br><br>' +
            'Widen the window, or allow all twelve double-hours. A goal whose required door ' +
            'simply does not fall in a usable direction during working hours is a real answer, ' +
            'not a failure — it means waiting.</div>' +
            (res.excluded.length ? '<div class="rows" style="margin-top:10px">' +
              res.excluded.map(function (e) {
                return '<div class="row"><span class="k">' + e.date + '</span>' +
                  '<span class="v"><small>' + esc(e.reason) + '</small></span></div>';
              }).join('') + '</div>' : ''));
          return;
        }

        $('scOut').innerHTML =
          block('Execution mandate', res.goal.label + ' &middot; top ' + res.windows.length +
            ' of ' + res.considered + ' windows, ranked by Fibonacci follow-through',
            res.windows.map(function (w, i) {
              var m = SC.mandate(w);
              var bc = m.band === 'Exceptional' || m.band === 'Strong' ? 'var(--celadon)'
                     : m.band === 'Workable' ? 'var(--brass)' : 'var(--cinnabar)';
              return '<div class="mandate">' +
                '<div class="hd"><span class="w"><b>' + m.when + '</b>' +
                  '<small>' + m.hourLabel + ' &middot; ' + res.goal.cn + '</small></span>' +
                  '<span class="sc"><i>' + w.composite + '</i>' +
                  '<small style="color:' + bc + '">' + m.band + '</small>' +
                  (w.fib ? '<small>&phi; ' + w.refined + ' &middot; ' +
                    (w.fib.momentum >= 0 ? 'holds' : 'fades') + '</small>' : '') +
                  '</span></div>' +
                '<div class="row3">' +
                  '<div><div class="lb">\u5929 WHEN</div><div class="vl">' + w.range.slice(0,5) +
                    '</div><div class="sc2">H ' + w.layers.heaven + '</div></div>' +
                  '<div><div class="lb">\u5730 SIT IN</div><div class="vl">' + w.sector.dir +
                    '</div><div class="sc2">E ' + w.layers.earth + '</div></div>' +
                  '<div><div class="lb">\u4EBA FACE</div><div class="vl">' +
                    SC.abbr(w.face.dir) + '</div><div class="sc2">M ' + w.layers.man + '</div></div>' +
                '</div>' +
                '<div class="body">' +
                  '<span class="k">POSITION</span>' + esc(m.where) +
                  '<span class="k">ALIGNMENT</span>' + esc(m.facing) +
                  '<span class="k">ACTION</span>' + esc(m.action) +
                '</div>' +
                '<div style="padding:0 16px 14px"><button class="btn ghost" style="margin-top:4px" ' +
                  'data-md="' + i + '">Open the full mandate</button></div>' +
                '</div>';
            }).join('')) +
          (res.excludedCount ? block('Days filtered out', res.excludedCount + ' before scanning hours',
            '<div class="rows">' + res.excluded.map(function (e) {
              return '<div class="row"><span class="k">' + e.date + '</span>' +
                '<span class="v"><small>' + esc(e.reason) + '</small></span></div>';
            }).join('') + '</div>' +
            (res.excludedCount > res.excluded.length ? '<div class="hint">Showing ' +
              res.excluded.length + ' of ' + res.excludedCount + '.</div>' : '')) : '');

        $('scOut').querySelectorAll('[data-md]').forEach(function (b) {
          b.onclick = function () { openMandate(res, res.windows[parseInt(b.dataset.md, 10)]); };
        });
      }

      function openMandate(res, w) {
        var m = SC.mandate(w);
        lastSavedId = null; currentAI = null;
        var ft = w.fib || window.QPFib.sancaiFollowThrough(w, user);
        var fu = window.QPFib.sancaiFollowUps(w, user);
        var scCls = function (x) { return x >= 68 ? 'good' : x >= 56 ? 'mid' : 'bad'; };
        var QMs = window.QPMath;
        var sen = QMs.sancaiEntropy(res, w), sfz = QMs.sancaiFuzzy(w, user), sch = QMs.sancaiChaos(w, user),
            sgm = QMs.sancaiGame(w, user);
        var sser = QMs.sancaiSeries(w, user, 120), sdy = QMs.sancaiDynamics(sser),
            spca = QMs.sancaiPCA(res), scamp = QMs.sancaiCampaign(res, 3);
        openSheet(m.when, res.goal.label + ' &middot; ' + w.composite + '/100 ' + m.band,
          '<div class="tri h">' +
            '<div><div class="t">\u5929 Heaven</div><div class="n">' + w.layers.heaven +
              '</div><div class="m">' + w.heaven.officer.cn + ' ' + w.heaven.officer.en + '</div></div>' +
            '<div><div class="t">\u5730 Earth</div><div class="n">' + w.layers.earth +
              '</div><div class="m">' + w.sector.dirFull + ' sector</div></div>' +
            '<div><div class="t">\u4EBA Man</div><div class="n">' + w.layers.man +
              '</div><div class="m">face ' + w.face.dir + '</div></div>' +
          '</div>' +
          '<div class="block"><h2>The mandate</h2>' + rows([
            ['When', m.when + ' <small>' + m.hourLabel + '</small>'],
            ['Sit in', '<b style="color:var(--celadon)">' + w.sector.dirFull + ' sector</b>' +
              '<small>annual star ' + w.sector.annual + ', monthly ' + w.sector.monthly + '</small>'],
            ['Face', '<b style="color:var(--brass)">' + w.face.dir + '</b>' +
              '<small>' + (w.face.gate || '') + ' &middot; ' + (w.face.spirit || '') +
              ' &middot; ' + (w.face.starCn || '') + '</small>'],
            ['Ask for', m.manifestFor]
          ]) +
          '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
          '<b style="color:var(--brass)">Action</b><br>' + esc(m.action) + '</div></div>' +

          '<div class="block"><h2>\u5929 Heaven \u2014 why this day<em>' + m.heavenLine + '</em></h2>' +
            '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
            w.heaven.reasons.map(esc).join('<br>') +
            (w.heaven.harm ? '<br>The day harmonises with your ' +
              C.ZODIAC[user.zodiacBranch] + ' sign.' : '') +
            (w.heaven.favourableStem ? '<br>The day stem carries one of your favourable elements.' : '') +
            '</div></div>' +

          '<div class="block"><h2>\u5730 Earth \u2014 why this sector</h2>' +
            '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
            w.sector.why.map(esc).join('<br>') + '</div>' +
            '<div class="grid3" style="margin-top:10px">' +
            [[ 'SE','S','SW' ],[ 'E','Centre','W' ],[ 'NE','N','NW' ]].map(function (row) {
              return row.map(function (dd) {
                if (dd === 'Centre') return '<div class="cell centre"><div class="d">Centre</div></div>';
                var c = w.earth.cells.filter(function (x) { return x.dir === dd; })[0];
                if (!c) return '<div class="cell"></div>';
                var isPick = dd === w.sector.dir;
                var isFace = dd === SC.abbr(w.face.dir);
                return '<div class="cell ' + (isPick ? 'good' : c.score < 0 ? 'bad' : 'mid') +
                  (isPick ? ' hit' : '') + '"><div class="d">' + dd +
                  (isPick ? ' &middot; sit' : '') + (isFace ? ' &middot; face' : '') + '</div>' +
                  '<div class="star">' + c.annual + '</div>' +
                  '<div class="x">month ' + c.monthly + '</div></div>';
              }).join('');
            }).join('') + '</div></div>' +

          '<div class="block"><h2>\u4EBA Man \u2014 why this hour and direction' +
            '<em>' + m.manLine + '</em></h2>' +
            '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
            w.man.pick.why.map(esc).join('<br>') + '</div>' +
            '<div style="margin-top:10px">' + palaceCard(w.face, w.man.chart.mansion, true) + '</div>' +
            '<div style="margin-top:10px">' +
            plateHtml(w.man.chart, w.man.formations, [w.face.num], false) + '</div></div>' +

          '<div class="block"><h2>Fibonacci follow-through<em>the goal\'s Qimen plate on the ' +
            'Fibonacci double-hours after the window</em></h2>' +
            rows([
              ['Composite', w.composite + ' <small>' + m.band + '</small>'],
              ['&phi;-refined', '<b class="' + scCls(ft.refinedComposite) + '-t">' + ft.refinedComposite +
                '</b><small>composite + 0.382 &times; Man weight &times; (consensus ' + ft.consensus +
                ' &minus; window ' + w.layers.man + ')</small>'],
              ['Momentum', (ft.momentum > 0 ? '+' : '') + ft.momentum + ' <small>' +
                (ft.momentum >= 0 ? 'support carries on after the window opens'
                  : 'support fades after the window — finish the act inside it') + '</small>']
            ]) +
            '<div style="margin-top:10px">' + fibRowsHtml(ft.points, { unsigned: true,
              extra: function (p) { return 'Man ' + p.score + ' &middot; face ' + esc(p.face) +
                (p.k && !p.door ? ' &middot; no required door' : ''); } }) + '</div></div>' +

          '<div class="block"><h2>Follow-up dates<em>Fibonacci days after the window, same hour, ' +
            'all three layers rescored</em></h2>' +
            fibSummaryHtml(fu, scCls) +
            '<div style="margin-top:10px">' + fibRowsHtml(fu.points, { unsigned: true,
              mark: function (p) { return p.k > 0 && p === fu.points.slice(1).sort(function (a, b) {
                return b.score - a.score; })[0]; },
              extra: function (p) { return p.clash ? 'clashes your sign' : esc(p.officer) +
                ' &middot; sit ' + esc(p.sector) + ' &middot; face ' + esc(p.face) +
                (p.k && !p.door ? ' &middot; no required door' : ''); } }) + '</div>' +
            '<div class="hint">Use these for the second conversation, the signature after the ' +
            'verbal yes, or the check-in. The highlighted date is the strongest follow-up; ' +
            'dates that clash your sign are capped at 30. Follow-through and follow-ups are a ' +
            'QiPath Fibonacci synthesis over the classical three layers.</div></div>' +

          quantGroup('Quantitative analysis',
            (sgm ? 'Stance <b>' + sgm.stance + '</b> &middot; ' : '') + 'fuzzy alignment ' + sfz.and + ' (weakest ' + sfz.weakest +
            ') &middot; decisiveness ' + Math.round(sen.decisiveness * 100) + '% &middot; slip cost ' + sch.slipNext.drop +
            (spca ? ' &middot; decided by ' + spca.driver : '') + (scamp && scamp.path ? ' &middot; campaign ' + scamp.mean : ''),
            '<div class="block"><h2>Across the table<em>game theory — you face ' + w.face.dir + ', the counterpart faces you</em></h2>' +
              gameHtml(sgm, 'In a meeting the counterpart sits facing you, so their palace is the one opposite your facing ' +
                'palace on the same hour plate. a, t and the maneuver gains are read exactly as in Strategy › Forecast.') + '</div>' +
            '<div class="block"><h2>Layer alignment<em>fuzzy logic — the weakest link</em></h2>' + sancaiFuzzyHtml(sfz) + '</div>' +
            '<div class="block"><h2>How decisive is this window<em>Shannon entropy</em></h2>' + sancaiEntropyHtml(sen) + '</div>' +
            '<div class="block"><h2>Slippage and tipping points<em>non-linear dynamics</em></h2>' + sancaiChaosHtml(sch) + '</div>' +
            '<div class="block"><h2>Campaign path<em>graph theory — the best open, follow-up and close</em></h2>' +
              sancaiCampaignHtml(scamp) + '</div>' +
            '<div class="block"><h2>What decides the ranking<em>matrix algebra — principal components of the layers</em></h2>' +
              sancaiPCAHtml(spca) + '</div>' +
            '<div class="block"><h2>Hour-to-hour dynamics<em>Markov chain of the goal&rsquo;s Man layer, next 10 days</em></h2>' +
              markovHtml(sdy.markov, { short: ['Strong', 'Work', 'Marg', 'Weak'], hoursPer: 2, target: 'Strong', horizon: '10 days',
                hint: 'P is estimated from ' + sdy.markov.transitions + ' consecutive transitions of the goal&rsquo;s Man layer from ' +
                  'this window (bands 70 / 55 / 40)' }) + '</div>' +
            '<div class="block"><h2>Harmonic cycles<em>Fourier analysis of the same 120 double-hours</em></h2>' +
              harmonicsHtml(sdy.harmonics, { id: 'sancai', window: [0, 59], note: 'Chart shows the first five days from the window.' }) +
              '</div>') +

          '<div class="block"><h2>Cautions</h2><div class="panel" style="font-size:.88rem;' +
            'line-height:1.7">' + m.cautions.map(function (c) {
              return '&middot; ' + esc(c); }).join('<br>') + '</div></div>' +

          saveBar('scSave', 'Save this mandate') +
          '<div class="block"><h2>AI briefing</h2><div id="aiSC"></div></div>' +
          '<div class="block"><h2>How to hold this</h2><div class="panel" style="font-size:.86rem;' +
            'line-height:1.7;color:var(--muted)">This is a timing and positioning framework from a ' +
            'long tradition, not a guarantee. Its practical value is that it forces a considered ' +
            'window instead of acting whenever. Prepare the substance of the meeting as carefully ' +
            'as the hour.</div></div>',
          function () {
            wireCharts();
            wireSave('scSave', function () {
              return { kind:'sancai',
                title: res.goal.label + ' \u2014 ' + m.when,
                subtitle: w.composite + '/100 ' + m.band + ' \u00b7 sit ' + w.sector.dirFull +
                  ' \u00b7 face ' + w.face.dir,
                when: { date: w.iso, range: w.range },
                payload: { goal: res.goal.label, goalCn: res.goal.cn, goalId: res.goal.id,
                  composite: w.composite, band: m.band, layers: w.layers,
                  refined: ft.refinedComposite, momentum: ft.momentum,
                  math: { stance: sgm ? sgm.stance : null, gameValue: sgm ? sgm.value : null,
                          fuzzyAnd: sfz.and, weakest: sfz.weakest, decisiveness: sen.decisiveness,
                          slipDrop: sch.slipNext.drop, lyapunov: sch.lyapunov.lambda,
                          driver: spca ? spca.driver : null,
                          campaign: scamp && scamp.path ? scamp.path.map(function (p) { return p.role + ' ' + p.iso + ' ' + p.range + ' (' + p.score + ')'; }) : null,
                          strongShare: sdy.markov.stationary[0], waitToStrong: sdy.markov.expectedToFavourable },
                  fib: fibSnapshot(fu), followThrough: fibSnapshot(ft),
                  when: m.when, hourLabel: m.hourLabel,
                  sitIn: w.sector.dirFull, sectorAnnual: w.sector.annual,
                  sectorMonthly: w.sector.monthly, sectorWhy: w.sector.why,
                  face: w.face.dir, facingWhy: w.man.pick.why,
                  action: m.action, manifestFor: m.manifestFor,
                  heaven: { line: m.heavenLine, score: w.layers.heaven,
                            officer: w.heaven.officer.cn + ' ' + w.heaven.officer.en,
                            dayPillar: w.heaven.pillar.cn, reasons: w.heaven.reasons },
                  man: { line: m.manLine, score: w.layers.man,
                         palace: snapshotPalace(w.face),
                         plate: snapshotPlate(w.man.chart) },
                  cautions: m.cautions } };
            });
            var scWhen = fromISO(w.iso); scWhen.hour = branchToHour(w.hourBranch); scWhen.min = 30;
            var scCt = mountCounter('aiSC', 'sancai', { when: scWhen, year: scWhen.y, focus: focusFor('', res.goal.id),
              subtitle: 'the year\'s threats on the plate of the chosen window' });
            aiPanelSaving('aiSC', 'sancai', w.iso + '.' + w.hourBranch + '.' + res.goal.id + '.math3.ct',
              function (cfg) { return window.QPAI.withCounter(scCt ? counterText(scCt, scCt.focus) : null, function () {
                return window.QPAI.analyseSanCai(cfg, res.goal, w, m, user, ft, fu,
                { entropy: sen, fuzzy: sfz, chaos: sch, game: sgm, campaign: scamp, pca: spca, dynamics: sdy }); }); }, [
                { label:'The mandate in brief', path:'brief' },
                { label:'Confidence', path:'confidence' },
                { label:'\u5929 Why this day', path:'heaven' },
                { label:'\u5730 Why this sector', path:'earth' },
                { label:'\u4EBA Why this hour and facing', path:'man' },
                { label:'Fibonacci follow-through', path:'fibonacci' },
                { label:'Across the table', path:'stance' },
                { label:'Alignment, decisiveness and slippage', path:'uncertainty' },
                { label:'Campaign', path:'campaign' },
                { label:'Precise schedule', path:'windows' },
                { label:'How to execute it', path:'execution' },
                { label:'Risks and fallback', path:'risks' }
              ]);
          });
      }
    }

    /* ================= FORECAST ================= */
    else if (consultK === 'forecast') {
      var scOpts = Q.CATEGORIES.map(function (cat) {
        return '<optgroup label="' + cat.name + '">' +
          Q.SCENARIOS.filter(function (x) { return x.cat === cat.id; }).map(function (x) {
            return '<option value="' + x.id + '">' + x.nameEn + ' &middot; ' + x.name + '</option>';
          }).join('') + '</optgroup>';
      }).join('');

      host.innerHTML =
        block('Ask the chart', 'the hour you cast in is part of the answer',
          '<div class="panel">' +
          '<label for="qText">Your question</label>' +
          '<input id="qText" type="text" placeholder="Ask one specific thing, in plain words">' +
          '<div class="chips" id="qProto" style="margin-top:8px">' + Object.keys(window.QPAI.PROTOCOLS).map(function (k) {
            var P = window.QPAI.PROTOCOLS[k];
            return '<button class="chip" data-proto="' + k + '" title="' + esc(P.blurb) + '">' + P.label + '</button>'; }).join('') +
          '</div><div class="hint" id="qProtoNote">Tap a question type for a template, or type your question and let the ' +
          'Question Oracle sharpen it.</div>' +
          '<button class="btn ghost" id="qSharpen">Sharpen with the Question Oracle</button>' +
          '<div id="qOracle"></div><div id="qFrameBadge"></div>' +
          '<label for="qScen">What kind of matter is it?</label>' +
          '<select id="qScen">' + scOpts + '</select>' +
          '<label for="qMethod">Which method should read it?</label>' +
          '<select id="qMethod">' + Q.METHODS.map(function (mm) {
            return '<option value="' + mm.id + '">' + mm.label + ' &middot; ' + mm.name +
              '</option>'; }).join('') + '</select>' +
          '<div class="hint" id="qMethodNote"></div>' +
          whenPicker('qDate', 'qHour', dt, 'Cast for date') +
          '<button class="btn" id="qGo">Cast the chart</button>' +
          '<div class="hint">Ask about one matter at a time. The reading locates the symbol that ' +
          'governs your question and reports where it sits — it does not promise an outcome.</div></div>') +
        '<div id="fcOut"></div>';

      function paintMethodNote() {
        var mm = Q.METHODS.filter(function (x) { return x.id === $('qMethod').value; })[0];
        $('qMethodNote').textContent = mm ? mm.blurb + ' ' + mm.note : '';
      }
      paintMethodNote();
      $('qMethod').onchange = paintMethodNote;

      wireOracle();

      $('qGo').onclick = function () {
        var when = readWhen('qDate', 'qHour');
        var r = Q.forecast(when, $('qScen').value, $('qText').value.trim(),
                           { method: $('qMethod').value, user: user });
        r.frame = qFrame;
        var repeat = noteAsked($('qText').value.trim(), $('qScen').value);
        // The same question recast on the Fibonacci double-hours and days ahead.
        var fib = window.QPFib.qimen(when, $('qScen').value, $('qText').value.trim(),
                                     { method: $('qMethod').value, user: user });
        var qmCls = function (x) { return x >= 5 ? 'good' : x >= 1 ? 'mid' : 'bad'; };
        // Quantitative layer: the plate as a tensor, and 120 double-hours of this question as a
        // Markov chain and a Fourier spectrum.
        var QM = window.QPMath;
        var tz = QM.qimenTensor(r.chart, { favourable: user.favourable,
          unfavourable: (user.deep || user.bazi).unfavourable });
        var qser = QM.qimenSeries(when, $('qScen').value, $('qText').value.trim(),
                                  { method: $('qMethod').value, user: user }, 120);
        var mk = QM.markov(qser), qh = QM.qimenHarmonics(qser);
        var qen = QM.qimenEntropy(tz, mk), gm = QM.qimenGame(r, tz), qc = QM.qimenChaos(qser, when);
        var qfz = QM.fuzzyAt(A.localToJD(when.y, when.m, when.d, when.hour, when.min || 30), r.pillars.month.branch);
        var prim = r.resolved[(r.scenario.asker || [])[0]];
        manifestPick = { dt: when,
          palaceNum: (prim && prim.pal) ? prim.pal.num : (r.chart.best[0] ? r.chart.best[0].num : 1),
          formation: null };
        var vc = r.score >= 5 ? 'good' : r.score >= 1 ? 'mid' : 'bad';
        lastSavedId = null; currentAI = null;

        $('fcOut').innerHTML =
          block(r.question ? '&ldquo;' + esc(r.question) + '&rdquo;' : 'Reading',
            r.scenario.nameEn + ' &middot; ' + r.scenario.name + ' &middot; ' + r.method.label,
            '<div class="verdictbar"><span class="big ' + vc + '">' + r.verdict + '</span>' +
            '<span class="sub">' + r.pillars.hour.cn + ' hour &middot; ' + r.hourRange + '<br>' +
            r.chart.dun + ' ju ' + r.chart.ju + ' &middot; ' + r.chart.term + '</span></div>' +
            '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
            esc(r.advice) + '</div>' +
            (r.care ? '<div class="find ' + toneCls('neutral') + '" style="margin-top:10px"><b>' + esc(r.care.label) + '</b><span>' + esc(r.care.text) + '</span></div>' : '')) +
          block('Fibonacci timing', 'this question recast ' + fib.points.length + ' times, ' +
            fib.horizon.toLowerCase(),
            fibSummaryHtml(fib, qmCls) +
            (fib.firstFavourable
              ? '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' +
                'First Favourable window after the cast: <b style="color:var(--celadon)">' +
                esc(fib.firstFavourable.label) + '</b> &middot; ' + fib.firstFavourable.date + ' ' +
                fib.firstFavourable.range + ', face ' + esc(fib.firstFavourable.direction) + '.</div>'
              : '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' +
                'No later window reaches Favourable. If this matter must move, use the strongest ' +
                'window above, or recast after the horizon.</div>') +
            '<div style="margin-top:10px">' + fibRowsHtml(fib.points, {
              mark: function (p) { return p === fib.best; },
              extra: function (p) { return esc(p.verdict) + ' &middot; ' + p.pillar + ' &middot; ' +
                esc(p.direction) + (p.voidHit ? ' &middot; void' : ''); } }) + '</div>' +
            '<div class="hint">Each window is a full recast of the plate, rescored by the same ' +
            'method. Windows sit on the Fibonacci sequence of double-hours (1, 2, 3, 5 … 89), then ' +
            '13, 21 and 34 days. The refined verdict weighs the cast hour 0.618 against the ' +
            '&phi;-weighted consensus of every window at 0.382. This is a QiPath timing synthesis ' +
            'layered on classical Qimen, not a classical rule.</div>') +
          quantGroup('Quantitative analysis',
            (gm ? 'Stance <b>' + gm.stance + '</b> &middot; ' : '') + 'clarity ' + ordinal(qen.percentile) + ' pct &middot; ' +
            'wait to Favourable ' + (mk.expectedToFavourable === null ? '—' : mk.expectedToFavourable + ' &times; 2h') +
            ' &middot; λ ' + qc.lyapunov.lambda + ' &middot; hub palace ' + tz.hub.num,
            block('Strategic stance', 'game theory — host against guest', gameHtml(gm)) +
            block('Chart clarity', 'Shannon entropy', entropyHtml(qen, 'casts')) +
            block('Sensitivity and tipping points', 'non-linear dynamics', qimenChaosHtml(qc)) +
            block('Markov dynamics', 'how this question\'s verdict moves hour to hour, next 10 days',
              markovHtml(mk, { hoursPer: 2, horizon: '10 days' })) +
            block('Harmonic cycles', 'Fourier analysis of the same 120 double-hours',
              harmonicsHtml(qh, { id: 'qimen', window: [0, 59],
                note: 'Chart shows the first five days. Qimen turns on the 12-double-hour day and the 60-double-hour ' +
                  '元, so those cycles are expected; a low share explained means the hour-to-hour detail matters more ' +
                  'than any rhythm.' })) +
            block('Fuzzy seasonal strength', 'graduated 旺相休囚死 at the cast moment',
              fuzzyHtml(qfz, { when: isoOf(when) + ' ' + r.hourRange })) +
            block('Plate tensor', 'matrix algebra on the nine palaces', tensorHtml(tz))) +
          block('Method', r.method.name + ' &middot; ' + r.method.label,
            '<div class="panel" style="font-size:.88rem;line-height:1.7">' + esc(r.method.blurb) +
            '<br><br><span style="color:var(--muted)">' + esc(r.method.note) + '</span>' +
            '<br><br>Reading <b style="color:var(--brass)">' + esc(r.poles.matterLabel || '—') +
            '</b> against <b style="color:var(--celadon)">' + esc(r.poles.selfLabel || '—') +
            '</b>.</div>') +
          block('Useful god', r.scenario.yong,
            '<div class="panel" style="font-size:.88rem;line-height:1.7;color:var(--muted)">' +
            esc(r.scenario.desc) + '</div><div style="margin-top:12px">' +
            r.findings.map(function (f) {
              return '<div class="find ' + toneCls(f.tone) + '"><b>' + esc(f.label) + '</b>' +
                '<span>' + esc(f.text) + '</span></div>';
            }).join('') + '</div>') +
          block('The cast chart', 'tap a palace for full detail',
            plateHtml(r.chart, r.formations, prim && prim.pal ? [prim.pal.num] : [], true) +
            '<div class="panel" style="margin-top:10px;font-size:.85rem;line-height:1.7">' +
            'Direction to act: <b style="color:var(--celadon)">' + r.direction + '</b> &middot; ' +
            'chief ' + r.chart.chief + ' &middot; envoy ' + r.chart.envoy + ' &middot; ' +
            '宿' + r.chart.mansion.cn + ' &middot; void ' + r.chart.voidBranches.join('') + '</div>' +
            '<div class="savebar"><button class="btn ghost" id="fcManifest">Build a manifestation for this window</button></div>' +
            saveBar('fcSave', 'Save this question and cast')) +
          block('AI reading of this cast', '', '<div id="aiFc"></div>') +
          block('Deep dive on this chart', 'follow-up questions read on the same cast, not a new one', '<div id="fcDeep"></div>');

        wirePlateTaps('fcOut', r.chart, r.formations);
        wireCharts();
        $('fcManifest').onclick = function () { switchConsult('manifest'); };
        wireSave('fcSave', function () {
          return { kind:'forecast',
            title: r.question || r.scenario.nameEn,
            subtitle: r.scenario.nameEn + ' · ' + r.method.label + ' · ' + r.verdict +
              ' · ' + isoOf(when) + ' ' + r.hourRange,
            when: { date: isoOf(when), range: r.hourRange },
            payload: { question: r.question, scenarioId: r.scenario.id,
              scenarioName: r.scenario.nameEn, yong: r.scenario.yong,
              method: r.method.label, methodCn: r.method.name,
              poles: { self: r.poles.selfLabel, matter: r.poles.matterLabel,
                       selfPalace: r.poles.self ? r.poles.self.num : null,
                       matterPalace: r.poles.matter ? r.poles.matter.num : null },
              verdict: r.verdict, score: r.score, advice: r.advice, direction: r.direction,
              pillars: [r.pillars.year.cn, r.pillars.month.cn, r.pillars.day.cn, r.pillars.hour.cn],
              dun: r.chart.dun, ju: r.chart.ju, term: r.chart.term,
              chief: r.chart.chief, envoy: r.chart.envoy, mansion: r.chart.mansion.cn,
              voids: r.chart.voidBranches,
              findings: r.findings,
              fib: fibSnapshot(fib),
              math: { hub: tz.hub.num + ' ' + tz.hub.dir, personalBest: tz.personalBest.num + ' ' + tz.personalBest.dir,
                      concentration: tz.dominance, stationary: mk.stationary,
                      expectedToFavourable: mk.expectedToFavourable, entropy: mk.entropy,
                      cycles: qh.oscillators.map(function (o) { return o.label + ' (' + o.share + '%)'; }),
                      clarityPercentile: qen.percentile, stance: gm ? gm.stance : null,
                      gameValue: gm ? gm.value : null, lyapunov: qc.lyapunov.lambda },
              plate: snapshotPlate(r.chart),
              formations: r.formations.map(fmtForm),
              frame: qFrame, stamp: fcStamp, deepDive: loadDeep(fcStamp) } };
        });
        if (repeat) $('fcOut').insertAdjacentHTML('afterbegin', '<div class="notice">You cast this same question on ' +
          esc(repeat) + '. Act on that reading before asking again: repeating a question until the answer changes only ' +
          'muddies it. The earlier reading is in Records if you saved it.</div>');
        var fcStamp = isoOf(when) + '.' + r.scenario.id + '.' + r.method.id + '.' + r.pillars.hour.i + '.' +
            strHash($('qText').value.trim() + '|' + (qFrame ? qFrame.protocol + qFrame.timeframe : '')) + '.math3';
        var fcCt = mountCounter('aiFc', 'forecast', { when: when, year: when.y,
          focus: focusFor($('qText').value + ' ' + (qFrame && qFrame.options ? qFrame.options.join(' ') : ''), r.scenario.id),
          subtitle: 'the year\'s threats on the plate you cast' });
        aiPanelSaving('aiFc', 'forecast', fcStamp + '.ct',
          function (cfg) { return window.QPAI.withCounter(fcCt ? counterText(fcCt, fcCt.focus) : null, function () { return window.QPAI.analyseForecast(cfg, r, user, fib,
            { tensor: tz, markov: mk, harmonics: qh, entropy: qen, game: gm, chaos: qc, fuzzy: qfz }); }); }, [
            { label:'Direct answer', path:'answer' },
            { label:'Confidence', path:'confidence' },
            { label:'What the chart shows', path:'reading' },
            { label:'Fibonacci timing', path:'fibonacci' },
            { label:'Strategic stance', path:'strategy' },
            { label:'Clarity and sensitivity', path:'uncertainty' },
            { label:'Dynamics: Markov, harmonics and plate tensor', path:'dynamics' },
            { label:'Precise windows', path:'windows' },
            { label:'What to do', path:'action' },
            { label:'Timing', path:'timing' },
            { label:'What would change this', path:'caution' },
            { label:'Ask next', path:'followUps' },
            { label:'When to ask again', path:'askAgain' }
          ]);
        renderDeepDive(r, fcStamp);
      };
    }

    /* ================= SEARCH ================= */
    else if (consultK === 'search') {
      var cat = Q.formationCatalogue();
      if (!searchState.from) {
        searchState.from = isoOf(dt);
        var j = A.gregToJD(dt.y, dt.m, dt.d) + 30, g = A.jdToGreg(j);
        searchState.to = isoOf({ y:g.y, m:g.m, d:Math.floor(g.d) });
      }
      var CATS = [['auspicious', 'Good'], ['special', 'Special'], ['hostile', 'Challenging'], ['all', 'All']];
      var mo = dt.m;
      host.innerHTML =
        block('Choose formations', 'pick one or more, then a date range to scan',
          '<div class="panel">' +
          '<div class="chips" id="fCats">' + CATS.map(function (c) {
            return '<button class="chip" data-fcat="' + c[0] + '"' + (searchState.cat === c[0] ? ' aria-selected="true"' : '') + '>' + c[1] +
              ' <small>' + (c[0] === 'all' ? cat.length : cat.filter(function (f) { return f.category === c[0]; }).length) + '</small></button>'; }).join('') + '</div>' +
          '<input class="fsearch" id="fFilter" type="text" placeholder="Filter by name or purpose, e.g. dragon, wealth, negotiation">' +
          '<div class="flist" id="fList"></div>' +
          '<div class="selcount" id="fCount">Nothing selected yet.</div>' +
          '<div id="fDesc"></div>' +
          '<div class="picker"><div><label for="sFrom">Search from</label>' +
          '<input id="sFrom" type="date" value="' + searchState.from + '"></div>' +
          '<div><label for="sTo">Search to</label>' +
          '<input id="sTo" type="date" value="' + searchState.to + '"></div></div>' +
          '<label class="tg-toggle"><input type="checkbox" id="sWake"' + (searchState.waking ? ' checked' : '') + '> Waking hours only (07:00–00:59)</label>' +
          '<label for="sSort">Order the results</label><select id="sSort">' +
            '<option value="best"' + (searchState.sort === 'best' ? ' selected' : '') + '>Strongest first</option>' +
            '<option value="date"' + (searchState.sort === 'date' ? ' selected' : '') + '>By date</option></select>' +
          '<div class="hint">Every double-hour in the range is cast and checked, up to a year at a time. Strength is the palace\'s ' +
            'quality (door, star, deity, void, your favourable elements) plus how rare the formation is.</div>' +
          '<button class="btn" id="sGo">Find when these occur</button></div>') +
        '<div id="srchOut"></div>';

      function paintList() {
        var q = ($('fFilter').value || '').toLowerCase();
        var shown = cat.filter(function (f) {
          return (searchState.cat === 'all' || f.category === searchState.cat) &&
            (!q || (f.nameEn + ' ' + f.name + ' ' + f.description).toLowerCase().indexOf(q) >= 0);
        });
        $('fList').innerHTML = shown.map(function (f) {
          var on = searchState.ids.indexOf(f.id) >= 0, inf = Q.formationInfo(f, mo);
          return '<label class="frow' + (on ? ' sel' : '') + '">' +
            '<input type="checkbox" data-fid="' + f.id + '"' + (on ? ' checked' : '') + '>' +
            '<span class="t"><b>' + f.name + ' &middot; ' + f.nameEn + '</b>' +
            '<small>' + esc(upperFirst(inf.favours)) + '.</small></span>' +
            '<span class="cat ' + f.category + '">' + inf.band + '</span></label>';
        }).join('') || '<div class="empty" style="padding:14px">No formation matches that filter.</div>';
        $('fList').querySelectorAll('[data-fid]').forEach(function (cb) {
          cb.onchange = function () {
            var id = cb.dataset.fid;
            var i = searchState.ids.indexOf(id);
            if (cb.checked && i < 0) searchState.ids.push(id);
            if (!cb.checked && i >= 0) searchState.ids.splice(i, 1);
            cb.closest('.frow').classList.toggle('sel', cb.checked);
            paintCount();
          };
        });
      }
      function paintCount() {
        var sel = cat.filter(function (f) { return searchState.ids.indexOf(f.id) >= 0; });
        $('fCount').textContent = sel.length
          ? sel.length + ' selected' : 'Nothing selected yet.';
        // The explanation of each selected formation: what it is, what it favours, how often, this season, how to use it.
        $('fDesc').innerHTML = sel.length
          ? '<div class="stack-sm">' + rows(sel.map(function (f) {
              var inf = Q.formationInfo(f, mo), col = f.category === 'auspicious' ? 'good-t' : f.category === 'hostile' ? 'bad-t' : '';
              return ['<span class="' + col + '">' + f.name + '</span><small>' + f.nameEn + ' &middot; ' + f.category + '</small>',
                '<div class="plain"><b>What it is:</b> ' + esc(f.description.split(' — ')[0]) + '.' +
                '<br><b>What it favours:</b> ' + esc(inf.favours) + '.' +
                '<br><b>How often:</b> ' + inf.band.toLowerCase() + ' — ' + esc(inf.often) + '.' +
                (inf.seasonal ? '<br><b>This season:</b> ' + esc(inf.seasonal) + '.' : '') +
                '<div class="todo"><b>How to use it:</b> ' + esc(inf.use) + '</div></div>'];
            })) + '</div>' : '';
      }
      paintList(); paintCount();
      $('fFilter').oninput = paintList;
      host.querySelectorAll('[data-fcat]').forEach(function (b) {
        b.onclick = function () {
          searchState.cat = b.dataset.fcat;
          host.querySelectorAll('[data-fcat]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
          paintList();
        };
      });
      $('sWake').onchange = function () { searchState.waking = $('sWake').checked; };
      $('sSort').onchange = function () { searchState.sort = $('sSort').value; };

      $('sGo').onclick = function () {
        if (!searchState.ids.length) {
          $('srchOut').innerHTML = '<div class="notice">Select at least one formation first.</div>';
          return;
        }
        searchState.from = $('sFrom').value; searchState.to = $('sTo').value;
        var f0 = fromISO(searchState.from), f1 = fromISO(searchState.to);
        var span = A.gregToJD(f1.y, f1.m, f1.d) - A.gregToJD(f0.y, f0.m, f0.d);
        if (!(span >= 0)) { $('srchOut').innerHTML = '<div class="notice">The end date is before the start date.</div>'; return; }
        if (span > 366) { $('srchOut').innerHTML = '<div class="notice">Scan at most a year at a time.</div>'; return; }
        $('srchOut').innerHTML = '<div class="panel"><div class="empty">Scanning every double-hour in that range…</div></div>';
        setTimeout(function () {
          // Ranked results come from the whole range: scan it all (a year of hours takes well under a second), sort, then
          // show the top 200. By date, the first 200 are the earliest.
          var all = Q.searchFormations(f0, f1, searchState.ids, { limit: 20000, waking: searchState.waking, fav: user.deep.favourable });
          var total = all.length;
          if (searchState.sort === 'best') all = all.slice().sort(function (a, b) { return b.score - a.score; });
          var res = all.slice(0, 200), capped = total > 200;
          searchState.results = res;
          if (!res.length) {
            $('srchOut').innerHTML = block('Not found in that range', '',
              '<div class="panel" style="font-size:.9rem;line-height:1.7">None of the selected ' +
              'formations occur between those dates. Widen the range, or select more formations — ' +
              'the rarer structures can go months without appearing.</div>');
            return;
          }
          var days = {}; all.forEach(function (x) { days[x.y + '-' + x.m + '-' + x.d] = 1; });
          $('srchOut').innerHTML = block(total + ' occurrence' + (total === 1 ? '' : 's'),
            (searchState.sort === 'best' ? 'strongest first' : 'by date') + ' &middot; on ' + Object.keys(days).length + ' day' +
              (Object.keys(days).length === 1 ? '' : 's') + ' &middot; tap one to see the palace in full',
            (capped ? '<div class="notice" style="margin-bottom:8px">Showing the ' + (searchState.sort === 'best' ? '200 strongest' : 'first 200') +
              ' of ' + total + '. Narrow the dates or choose rarer formations to list them all.</div>' : '') +
            '<div class="rows">' + res.map(function (x, i) {
              var pa = x.palaces[0];
              return '<div class="row"><span class="k" style="flex:0 0 40%">' +
                WD[new Date(x.y, x.m - 1, x.d).getDay()].slice(0, 3) + ' ' + x.d + ' ' + MON[x.m-1].slice(0,3) + ' ' + x.y + ' &middot; ' + x.branchCn +
                '<br><small style="color:var(--muted)">' + x.range + '</small></span>' +
                '<span class="v"><b style="color:var(--brass)">' + x.formation.name + '</b>' +
                '<small>' + x.formation.nameEn + ' &middot; strength ' + x.score + '</small>' +
                '<small>P' + (pa ? pa.num + ' ' + pa.dir : '?') + ' &middot; ' +
                (pa && pa.gate ? pa.gate : '') + ' &middot; 宿' + x.mansion.cn + '</small>' +
                '<button class="btn ghost" style="margin-top:6px;padding:7px" data-hit="' + i + '">Open</button>' +
                '</span></div>';
            }).join('') + '</div>');
          $('srchOut').querySelectorAll('[data-hit]').forEach(function (b) {
            b.onclick = function () { openHit(res[parseInt(b.dataset.hit, 10)]); };
          });
        }, 20);
      };

      function openHit(x) {
        searchState.picked = x;
        lastSavedId = null; currentAI = null;
        var pals = x.palaces.map(function (pa) { return palaceCard(pa, x.mansion, true); }).join('');
        openSheet(x.formation.name + ' &middot; ' + x.formation.nameEn,
          x.d + ' ' + MON[x.m-1] + ' ' + x.y + ' &middot; ' + x.branchCn + ' ' + x.range,
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
            esc(x.formation.description) +
            '<br><br><span style="color:var(--muted)">Seasonal strength: ' +
            (x.formation.seasonalStrength || '—') + '</span></div>' +
          '<div class="block"><h2>Palace detail</h2>' + pals + '</div>' +
          '<div class="block"><h2>Full plate<em>' + x.chart.dun + ' ju ' + x.chart.ju + '</em></h2>' +
            plateHtml(x.chart, [x.formation], x.palaces.map(function (p2) { return p2.num; }), false) +
            '<div class="panel" style="margin-top:10px;font-size:.84rem;line-height:1.7">' +
            'Day ' + x.dayPillar.cn + ' &middot; hour ' + x.hourPillar.cn +
            ' &middot; chief ' + x.chart.chief + ' &middot; envoy ' + x.chart.envoy +
            ' &middot; 宿' + x.mansion.cn + ' &middot; void ' + x.chart.voidBranches.join('') +
            '</div></div>' +
          '<button class="btn" id="hitManifest">Use this window for a manifestation</button>' +
          saveBar('hitSave', 'Save this occurrence') +
          '<div class="block"><h2>AI reading of this structure</h2><div id="aiHit"></div></div>',
          function () {
            $('hitManifest').onclick = function () {
              manifestPick = { dt: { y:x.y, m:x.m, d:x.d, hour:x.hour, min:30 },
                               palaceNum: x.palaces[0] ? x.palaces[0].num : 1,
                               formation: x.formation };
              closeSheet(); switchConsult('manifest');
            };
            wireSave('hitSave', function () {
              return { kind:'search',
                title: x.formation.name + ' · ' + x.formation.nameEn,
                subtitle: isoOf(x) + ' ' + x.range + ' · palace ' +
                  (x.palaces[0] ? x.palaces[0].num + ' ' + x.palaces[0].dir : '—'),
                when: { date: isoOf(x), range: x.range },
                payload: { formation: fmtForm(x.formation),
                  dayPillar: x.dayPillar.cn, hourPillar: x.hourPillar.cn,
                  dun: x.chart.dun, ju: x.chart.ju, chief: x.chart.chief,
                  envoy: x.chart.envoy, mansion: x.mansion.cn,
                  voids: x.chart.voidBranches,
                  palaces: x.palaces.map(snapshotPalace),
                  plate: snapshotPlate(x.chart) } };
            });
            var hitWhen = { y: x.y, m: x.m, d: x.d, hour: branchToHour(x.hourBranch), min: 30 };
            var hitCt = mountCounter('aiHit', 'search', { when: hitWhen, year: hitWhen.y, subtitle: 'the year\'s threats on the plate of this structure\'s hour' });
            aiPanelSaving('aiHit', 'structure',
              isoOf(x) + '.' + x.hourBranch + '.' + x.formation.id + '.ct',
              function (cfg) { return window.QPAI.withCounter(hitCt ? counterText(hitCt) : null, function () {
                return window.QPAI.analyseStructure(cfg, x.formation, x.chart, x.pillars, user); }); }, [
                { label:'What it means here', path:'meaning' },
                { label:'How to use it', path:'howToUse' },
                { label:'What to avoid', path:'avoid' },
                { label:'Key considerations', path:'considerations' }
              ]);
          });
      }
    }

    /* ================= MANIFEST ================= */
    else if (consultK === 'manifest') {
      var pick = manifestPick || { dt: { y:dt.y, m:dt.m, d:dt.d, hour:dt.hour, min:dt.min },
                                   palaceNum: null, formation: null };
      var pM = C.fourPillars(pick.dt.y, pick.dt.m, pick.dt.d, pick.dt.hour, pick.dt.min);
      var chartM = S.qimen(pM);
      var mFav = (user.deep || {}).favourable || user.favourable || [];
      var mGoal = Q.MANIFEST_GOALS.filter(function (g) { return g.key === manifestDetails.goal; })[0] || Q.MANIFEST_GOALS[0];
      var mStage = Q.MANIFEST_STAGES.filter(function (s) { return s.key === manifestDetails.stage; })[0] || Q.MANIFEST_STAGES[0];
      var mRank = Q.manifestRank(pick.dt, mGoal.key, mStage.key, mFav);
      // With no palace chosen yet, start from the one that serves the goal best this hour.
      if (!pick.palaceNum) pick.palaceNum = mRank.list[0] ? mRank.list[0].num : 1;
      var pal = chartM.palacesByNumber[pick.palaceNum];
      var mRes = Q.chartFor('hour', pick.dt);
      // The ask follows the seated door when it already serves the goal; otherwise the goal's own door.
      var seatDoor = (pal.gate || '').charAt(0);
      var askNow = manifestDetails.ask || (mGoal.door.concat(mGoal.door2).indexOf(seatDoor) >= 0 ? seatDoor : mGoal.ask);
      lastSavedId = null; currentAI = null;

      var palOpts = [1,2,3,4,6,7,8,9].map(function (n) {
        var pa = chartM.palacesByNumber[n];
        return '<option value="' + n + '"' + (n === pick.palaceNum ? ' selected' : '') + '>' +
          n + ' ' + pa.name + ' ' + pa.dir + ' — ' + (pa.gate || '') + ' ' + (pa.spirit || '') +
          (pa.isEmpty ? ' (void)' : '') + '</option>';
      }).join('');
      var askOpts = Object.keys(Q.DOOR_INTENT).map(function (dch) {
        var it = Q.DOOR_INTENT[dch];
        return '<option value="' + dch + '"' + (dch === askNow ? ' selected' : '') +
          '>' + dch + '门 — ' + it.ask.split(',')[0] + '</option>';
      }).join('');
      var stageOpts = Q.MANIFEST_STAGES.map(function (s) {
        return '<option value="' + s.key + '"' + (s.key === mStage.key ? ' selected' : '') + '>' + s.label + ' ' + s.cn + '</option>'; }).join('');
      var goalOpts = Q.MANIFEST_GOALS.map(function (g) {
        return '<option value="' + g.key + '"' + (g.key === mGoal.key ? ' selected' : '') + '>' + g.label + ' ' + g.cn + '</option>'; }).join('');
      var fromDt = manifestSearch.from || { y: dt.y, m: dt.m, d: dt.d };
      var dayOpts = [3, 7, 14, 31].map(function (n) { return '<option value="' + n + '"' + (n === manifestSearch.days ? ' selected' : '') + '>' + n + ' days</option>'; }).join('');
      var fitTag = function (r) { return '<span class="' + (r.fit >= 70 ? 'good-t' : r.fit < 50 ? 'bad-t' : '') + '">' + r.fit + ' ' + r.grade + '</span>'; };
      var rankRows = mRank.list.map(function (r) {
        return '<div class="row' + (r.num === pick.palaceNum ? ' on' : '') + '" data-mpal="' + r.num + '" style="cursor:pointer"><span class="k">Back to ' + r.back +
          '<small>face ' + r.face + ' &middot; palace ' + r.num + ' ' + r.palace.name + '</small></span>' +
          '<span class="v">' + fitTag(r) + '<small>' + esc(r.why.slice(0, 3).join('; ') || 'nothing here serves this goal') +
          (r.warn.length ? '<br><span class="bad-t">Watch: ' + esc(r.warn.slice(0, 2).join('; ')) + '</span>' : '') + '</small></span></div>';
      }).join('');

      host.innerHTML =
        block('What to manifest', 'the stage and the goal',
          '<div class="panel">' +
          '<label for="mStage">Stage</label><select id="mStage">' + stageOpts + '</select>' +
          '<div class="hint">' + esc(mStage.what) + '</div>' +
          '<label for="mGoal">Goal</label><select id="mGoal">' + goalOpts + '</select>' +
          (mGoal.key === 'health' ? '<div class="hint">' + esc(S.HEALTH_CARE.text) + '</div>' : '') +
          '</div>') +
        block('Find the best hours', 'every hour and palace in the range, best first',
          '<div class="panel">' +
          '<div class="picker"><div><label for="mFrom">From</label><input id="mFrom" type="date" value="' + isoOf(fromDt) + '"></div>' +
          '<div><label for="mDays">Search</label><select id="mDays">' + dayOpts + '</select></div></div>' +
          '<label class="chk"><input type="checkbox" id="mDaytime"' + (manifestSearch.daytime ? ' checked' : '') + '> Leave out 11 pm to 5 am</label>' +
          '<button class="btn" id="mFind">Find the best hours</button>' +
          '<div class="hint">Each palace is scored on how well its door, star, deity and heaven stem serve the goal, then on the strength of the hour and its structures. ' +
          'The stage changes the weights: Priming leans on the star and deity, Attunement on harmony and good structures, Activation on a strong, timely door. ' +
          'Five Disharmony hours are left out. Joey Yap times these practices by Seven Stars levels, which QiPath cannot calculate, so this ranking is QiPath\'s own.</div>' +
          '</div><div id="mFound"></div>') +
        block('Choose the window', 'the hour chart for any date and hour',
          '<div class="panel">' +
          whenPicker('mDate', 'mHour', pick.dt, 'Date') +
          '</div>' +
          (mRank.disharmony ? '<div class="find ' + toneCls('danger') + '"><b>' + esc(mRank.disharmony.label) + '</b><span>' + esc(mRank.disharmony.text) + '</span></div>' : '') +
          '<div id="mPlate" style="margin-top:10px">' + qbHead(mRes) + plateHtml(mRes.chart, mRes.formations, [pick.palaceNum], true, null, { res: mRes }) + '</div>' +
          '<h3 style="margin:14px 0 6px;font-size:1rem">Palaces this hour for ' + esc(mGoal.label.toLowerCase()) + ' &middot; ' + mStage.label + '</h3>' +
          '<div class="hint" style="margin-top:0">Tap a palace on the chart or a row below to work from it. You sit with your back to that palace.</div>' +
          '<div class="rows stack-sm">' + rankRows + '</div>' +
          '<div class="panel" style="margin-top:10px">' +
          '<label for="mPal">Palace to work from</label><select id="mPal">' + palOpts + '</select>' +
          '<label for="mAsk">What to ask for</label><select id="mAsk">' + askOpts + '</select>' +
          '<label for="mAspects">What specifically do you want to manifest?</label>' +
          '<textarea id="mAspects" rows="3" maxlength="600" placeholder="One per line. Example: a senior role at a company that values my work">' + esc(manifestDetails.aspects) + '</textarea>' +
          '<label for="mReturns">What specifically will you give in return?</label>' +
          '<textarea id="mReturns" rows="3" maxlength="600" placeholder="One per line. Example: mentor one junior colleague every month this year">' + esc(manifestDetails.returns) + '</textarea>' +
          '<div class="hint">The palace sets the direction at your back. The ask normally follows the ' +
          'door in that palace, but you can choose another register deliberately.</div>' +
          '<button class="btn" id="mGo">Build the script</button></div>') +
        '<div id="manOut"></div>';

      function usePalace(n) {
        if (!n || n === 5) return;
        manifestPick = { dt: pick.dt, palaceNum: n, formation: pick.formation };
        manifestDetails.ask = null;
        manifestSearch.scroll = 'mPlate';
        renderConsult();
      }
      $('mDate').onchange = $('mHour').onchange = function () {
        manifestPick = { dt: readWhen('mDate', 'mHour'), palaceNum: null, formation: null };
        manifestDetails.ask = null;
        renderConsult();
      };
      $('mPal').onchange = function () { usePalace(parseInt(this.value, 10)); };
      host.querySelectorAll('#mPlate [data-pal]').forEach(function (c) { c.onclick = function () { usePalace(parseInt(c.dataset.pal, 10)); }; });
      host.querySelectorAll('[data-mpal]').forEach(function (r) { r.onclick = function () { usePalace(parseInt(r.dataset.mpal, 10)); }; });
      // A new stage or goal re-ranks the current hour; the earlier search results belong to the old goal, so they go.
      $('mStage').onchange = function () { manifestDetails.stage = this.value; manifestDetails.ask = null; manifestSearch.found = null; manifestPick = { dt: pick.dt, palaceNum: null, formation: null }; renderConsult(); };
      $('mGoal').onchange = function () { manifestDetails.goal = this.value; manifestDetails.ask = null; manifestSearch.found = null; manifestPick = { dt: pick.dt, palaceNum: null, formation: null }; renderConsult(); };
      $('mAsk').onchange = function () { manifestDetails.ask = this.value; };
      $('mDays').onchange = function () { manifestSearch.days = parseInt(this.value, 10); };
      $('mDaytime').onchange = function () { manifestSearch.daytime = this.checked; };
      $('mFrom').onchange = function () { manifestSearch.from = fromISO(this.value); };
      $('mFind').onclick = function () {
        manifestSearch.from = fromISO($('mFrom').value);
        $('mFound').innerHTML = '<div class="hint">Searching ' + manifestSearch.days + ' days&hellip;</div>';
        setTimeout(function () {
          manifestSearch.found = Q.searchManifest(manifestSearch.from, manifestSearch.days, mGoal.key, mStage.key, mFav, { daytime: manifestSearch.daytime });
          paintFound();
        }, 30);
      };
      function paintFound() {
        var f = manifestSearch.found;
        if (!f) return;
        var dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $('mFound').innerHTML = !f.list.length ? '<div class="empty">No usable hour in this range.</div>' :
          '<div class="hint">' + f.stage.label + ' for ' + esc(f.goal.label.toLowerCase()) + ': the ' + f.list.length + ' best hours in ' + f.searched + ' days.</div>' +
          '<div class="rows stack-sm">' + f.list.map(function (x, i) {
            var r = x.best, wd = dayName[new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay()];
            return '<div class="row"><span class="k">' + wd + ' ' + x.d + ' ' + MON[x.m - 1].slice(0, 3) + ' ' + x.y +
              '<small>' + x.range + ' &middot; ' + x.hourPillar + ' hour</small></span>' +
              '<span class="v"><b>Back to ' + r.back + '</b> <small style="display:inline">face ' + r.face + ', palace ' + r.num + ' ' + r.palace.name + '</small><br>' +
              fitTag(r) + '<small>' + esc(r.why.slice(0, 3).join('; ')) + (r.warn.length ? '<br><span class="bad-t">Watch: ' + esc(r.warn.slice(0, 2).join('; ')) + '</span>' : '') + '</small>' +
              '<button class="btn ghost" data-muse="' + i + '" style="margin-top:6px">Use this hour</button></span></div>';
          }).join('') + '</div>';
        $('mFound').querySelectorAll('[data-muse]').forEach(function (b) {
          b.onclick = function () {
            var x = f.list[+b.dataset.muse];
            manifestPick = { dt: { y: x.y, m: x.m, d: x.d, hour: x.hour, min: 30 }, palaceNum: x.best.num, formation: null };
            manifestDetails.ask = null;
            manifestSearch.scroll = 'mPlate';
            renderConsult();
          };
        });
      }
      paintFound();
      $('mAspects').oninput = function () { manifestDetails.aspects = this.value; };
      $('mReturns').oninput = function () { manifestDetails.returns = this.value; };
      $('mGo').onclick = function () { paintManifest($('mAsk').value); };
      paintManifest(askNow);
      if (manifestSearch.scroll && $(manifestSearch.scroll)) { $(manifestSearch.scroll).scrollIntoView({ block: 'start' }); }
      manifestSearch.scroll = false;

      function paintManifest(askDoor) {
        var pl = Q.manifestPlan(pick.dt, pick.palaceNum, pick.formation, askDoor, manifestDetails);
        lastSavedId = null; currentAI = null;
        $('manOut').innerHTML =
          (pl.disharmony ? '<div class="find ' + toneCls('danger') + '"><b>' + esc(pl.disharmony.label) + '</b><span>' + esc(pl.disharmony.text) + '</span></div>' : '') +
          block('Window', pl.window.date + ' · ' + pl.window.range,
            rows((pl.goal && pl.stage ? [['Practice', pl.stage.label + ' ' + pl.stage.cn + ' &middot; ' + esc(pl.goal.label) + ' ' + pl.goal.cn]] : []).concat([
              ['Sit', '<b style="color:var(--celadon)">Back to ' + pl.window.direction + '</b><small>facing ' + (Q.OPPOSITE_DIR[pl.window.direction] || '') + ' &middot; palace ' + pl.window.palace + '</small>'],
              ['Hour pillar', pl.window.pillar + ' <small>' + pl.window.range + '</small>'],
              ['Plate', pl.window.dun + ' ju ' + pl.window.ju],
              ['Gatekeeper', pl.deity + ' <small>' + pl.quality + '</small>'],
              ['Register', pl.tone]
            ])) + '<div style="margin-top:10px">' + palaceCard(pal, chartM.mansion, true) + '</div>') +
          block('What to ask for here', 'the door sets what this palace can give',
            '<div class="panel"><ul style="list-style:none;display:flex;flex-direction:column;gap:9px">' +
            pl.manifestFor.map(function (t) {
              return '<li style="font-size:.9rem;line-height:1.65;padding-left:15px;position:relative">' +
                '<span style="position:absolute;left:0;top:.62em;width:6px;height:6px;border-radius:50%;' +
                'background:var(--brass);display:block"></span>' + esc(t) + '</li>';
            }).join('') + '</ul></div>' +
            (pl.formation ? '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' +
              '<b style="color:var(--brass)">' + pl.formation.name + ' · ' + pl.formation.nameEn +
              '</b><br>' + esc(pl.formation.description) + '</div>' : '')) +
          (pl.activations && pl.activations.length ? block('Activate the strengths', 'what this hour holds, and how to use each',
            '<div class="stack-sm">' + rows(pl.activations.map(function (a) {
              return ['<span class="good-t">' + esc(a.kind) + '</span><small>' + esc(a.what) + '</small>',
                '<div class="plain">' + esc(a.meaning) + '<div class="todo"><b>Activate:</b> ' + esc(a.activate) + '</div></div>'];
            })) + '</div>') : '') +
          block('The practice', 'inside the window',
            '<div class="panel">' + pl.steps.map(function (st, i) {
              return '<div class="stepn"><span class="i">' + (i+1) + '</span><span class="tx"><b>' +
                esc(st.t) + '</b><span>' + esc(st.d) + '</span></span></div>';
            }).join('') + '</div>') +
          block('The script', 'read aloud, once, with ' + pl.window.direction + ' at your back',
            '<div class="script">' + esc(pl.script) + '</div>' +
            '<button class="btn ghost" id="mCopy">Copy the script</button>') +
          block('Narration audio', 'Sage 64 to 1, then this script', '<div id="manNarr"></div>') +
          block('Returning the favour', 'the exchange that closes the loop',
            '<div class="panel" style="font-size:.9rem;line-height:1.7">This palace is <b style="color:var(--brass)">' +
            pl.exchange.element + '</b>. ' + esc(pl.exchange.note) + '</div>' +
            (pl.returns.length ? '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7"><b style="color:var(--brass)">What you committed to</b><br>' +
              pl.returns.map(esc).join('<br>') + '</div>' : '') +
            '<div class="panel" style="margin-top:10px"><ul style="list-style:none;display:flex;flex-direction:column;gap:9px">' +
            pl.exchange.acts.map(function (a) {
              return '<li style="font-size:.9rem;line-height:1.65;padding-left:15px;position:relative">' +
                '<span style="position:absolute;left:0;top:.62em;width:6px;height:6px;border-radius:50%;' +
                'background:var(--celadon);display:block"></span>' + esc(a) + '</li>';
            }).join('') + '</ul></div>' + saveBar('manSave', 'Save this manifestation')) +
          block('AI expansion', '', '<div id="aiMan"></div>') +
          block('Holding this lightly', '',
            '<div class="panel" style="font-size:.88rem;line-height:1.7;color:var(--muted)">' +
            'This is a focusing practice with a long tradition behind it. It works on clarity and ' +
            'commitment. Treat it as preparation for doing the thing, not a substitute for it.</div>');

        $('mCopy').onclick = function () {
          if (navigator.clipboard) navigator.clipboard.writeText(pl.script).then(function () {
            $('mCopy').textContent = 'Script copied';
            setTimeout(function () { $('mCopy').textContent = 'Copy the script'; }, 1600);
          });
        };
        narrationUI('manNarr', { script: pl.script, spoken: Q.spokenScript(pl),
          title: pl.window.date + ' ' + pl.window.range + ' ' + pl.window.direction });
        wireSave('manSave', function () {
          return { kind:'manifest',
            title: 'Manifestation · ' + (pl.goal && pl.stage ? pl.stage.label + ' · ' + pl.goal.label + ' · ' : '') + pl.window.direction + ' · ' + (pal.gate || ''),
            subtitle: pl.window.date + ' ' + pl.window.range + ' · palace ' + pl.window.palace,
            when: { date: pl.window.date, range: pl.window.range },
            payload: { direction: pl.window.direction, palace: pl.window.palace,
              hourPillar: pl.window.pillar, dayPillar: pl.window.dayPillar,
              dun: pl.window.dun, ju: pl.window.ju,
              deity: pl.deity, quality: pl.quality, askDoor: askDoor, goal: pl.goal, stage: pl.stage,
              fit: (mRank.list.filter(function (r) { return r.num === pick.palaceNum; })[0] || {}).fit,
              manifestFor: pl.manifestFor, script: pl.script, aspects: pl.aspects, returns: pl.returns,
              exchange: pl.exchange, steps: pl.steps,
              palaceDetail: snapshotPalace(pal),
              formation: pl.formation ? fmtForm(pl.formation) : null } };
        });
        var mnWhen = fromISO(pl.window.date); mnWhen.hour = branchToHour(pM.hour.branch); mnWhen.min = 30;
        var mnCt = mountCounter('aiMan', 'manifest', { when: mnWhen, year: mnWhen.y, subtitle: 'the year\'s threats on the plate of the manifestation window' });
        aiPanelSaving('aiMan', 'manifest',
          pl.window.date + '.' + pM.hour.i + '.' + pl.palace.num + '.' + askDoor + '.ct' +
            (pl.aspects.length || pl.returns.length ? '.' + window.QPNarrate.hash(pl.aspects.join('|') + '#' + pl.returns.join('|')) : ''),
          function (cfg) { return window.QPAI.withCounter(mnCt ? counterText(mnCt) : null, function () { return window.QPAI.expandManifestation(cfg, pl, pM, user); }); }, [
            { label:'What this window is for', path:'overview' },
            { label:'What to manifest', path:'whatToManifest' },
            { label:'Extended script', path:'script' },
            { label:'Returning the favour', path:'exchange' },
            { label:'After the window', path:'integration' }
          ]);
      }
    }


    /* ================= COACH ================= */
    else if (consultK === 'coach') { renderCoach(host); }

    /* ================= PLAN A TASK ================= */
    else if (consultK === 'plan') {
      var groups = {};
      S.ACTIVITIES.forEach(function (a) { (groups[a.group] = groups[a.group] || []).push(a); });
      var actOpts = Object.keys(groups).map(function (g) {
        return '<optgroup label="' + g + '">' + groups[g].map(function (a) {
          return '<option value="' + a.key + '">' + a.en + ' &middot; ' + a.cn + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
      var defTo = A.jdToGreg(A.gregToJD(dt.y, dt.m, dt.d) + 14);

      host.innerHTML =
        block('Plan a task', S.ACTIVITIES.length + ' activities from the TongShu',
          '<div class="panel">' +
          '<label for="actSel">What are you trying to do?</label>' +
          '<select id="actSel">' + actOpts + '</select>' +
          '<label for="actRange">Look ahead</label>' +
          '<select id="actRange"><option value="14">14 days</option>' +
          '<option value="30">30 days</option><option value="60">60 days</option>' +
          '<option value="date">Up to a specific date</option></select>' +
          '<div id="actDateWrap" hidden><label for="actTo">Search until</label>' +
          '<input id="actTo" type="date" value="' + isoOf({y:defTo.y,m:defTo.m,d:Math.floor(defTo.d)}) + '"></div>' +
          '<button class="btn" id="actGo">Find the best dates</button></div>') +
        '<div id="planOut"></div>';

      $('actRange').onchange = function () {
        $('actDateWrap').hidden = $('actRange').value !== 'date';
      };
      $('actGo').onclick = function () {
        var act = $('actSel').value;
        var days;
        if ($('actRange').value === 'date') {
          days = Math.max(1, Math.round(A.gregToJD.apply(null,
            [fromISO($('actTo').value).y, fromISO($('actTo').value).m, fromISO($('actTo').value).d]) -
            A.gregToJD(dt.y, dt.m, dt.d)) + 1);
        } else days = parseInt($('actRange').value, 10);
        days = Math.min(days, 180);
        var label = S.ACTIVITIES.filter(function (a) { return a.key === act; })[0];
        var list = S.bestDates(dt.y, dt.m, dt.d, days, act, user);
        var top = list.slice(0).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
        var worst = list.slice(0).sort(function (a, b) { return a.score - b.score; }).slice(0, 5);

        function dayRow(x, tone) {
          var hrs = G.dayHours({ y:x.y, m:x.m, d:x.d }, user)
            .sort(function (a, b) { return b.timing - a.timing; });
          return '<div class="row"><span class="k" style="flex:0 0 42%">' +
            WD[A.weekday(A.civilJDN(x.y,x.m,x.d))].slice(0,3) + ' ' + x.d + ' ' + MON[x.m-1].slice(0,3) +
            '<br><small style="color:var(--muted)">' + x.pillar.cn + ' &middot; ' + x.officer.cn + '</small></span>' +
            '<span class="v"><b style="color:' + tone + '">' + x.score + '</b>' +
            '<small>' + hrs.slice(0,3).map(function (h, i) {
              return '<span style="color:' + (i === 0 ? 'var(--celadon)' : 'var(--muted)') + '">' +
                (i+1) + '. ' + h.branchCn + ' ' + h.range.slice(0,5) + (h.xiu ? ' ' + h.xiu.cn + '宿' : '') + '</span>'; }).join(' ') + '</small>' +
            '<button class="btn ghost" style="margin-top:6px;padding:7px" data-day="' +
              x.y + ',' + x.m + ',' + x.d + '">Why this day</button></span></div>';
        }
        $('planOut').innerHTML =
          block('Best windows for ' + label.en, 'next ' + days + ' days · hours ranked by priority',
            '<div class="rows">' + top.map(function (x) { return dayRow(x, 'var(--brass)'); }).join('') + '</div>') +
          block('Dates to avoid', '',
            '<div class="rows">' + worst.map(function (x) { return dayRow(x, 'var(--cinnabar)'); }).join('') + '</div>');

        $('planOut').querySelectorAll('[data-day]').forEach(function (b) {
          b.onclick = function () {
            var a = b.dataset.day.split(',').map(Number);
            openDay(list.filter(function (x) {
              return x.y === a[0] && x.m === a[1] && x.d === a[2]; })[0], label);
          };
        });
      };

      function openDay(x, label) {
        if (!x) return;
        lastSavedId = null; currentAI = null;
        var hrs = G.dayHours({ y:x.y, m:x.m, d:x.d }, user)
          .sort(function (a, b) { return b.score - a.score; });
        var d0 = G.daily({ y:x.y, m:x.m, d:x.d }, user);
        var good = x.score >= 60;
        openSheet(WD[A.weekday(A.civilJDN(x.y,x.m,x.d))] + ' ' + x.d + ' ' + MON[x.m-1] + ' ' + x.y,
          label.en + ' · ' + label.cn + ' · score ' + x.score + '/100',
          '<div class="verdictbar"><span class="big ' + (good ? 'good' : x.score >= 45 ? 'mid' : 'bad') + '">' +
            (good ? 'Good day' : x.score >= 45 ? 'Workable' : 'Avoid') + '</span>' +
            '<span class="sub">' + x.pillar.cn + ' day<br>' + x.officer.cn + ' ' + x.officer.en + '</span></div>' +
          '<div class="block"><h2>Why<em>what the almanac says</em></h2>' +
            rows([
              ['Day officer', x.officer.cn + ' <small>' + x.officer.en + '</small>'],
              ['Duty spirit', x.duty.cn + ' <small>' + (x.duty.yellow ? 'yellow path — favourable' : 'black path — guarded') + '</small>'],
              ['Constellation', x.mansion.cn + '宿 <small>' + x.mansion.en +
                (x.mansion.suitable ? ' · 宜 ' + x.mansion.suitable.join('、') : '') + '</small>'],
              ['Clashes', d0.clashAnimal + ' <small>this sign takes extra care</small>'],
              ['Void branches', d0.voids.join(' ')]
            ]) +
            '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
            x.reasons.map(esc).join('<br>') + '</div></div>' +
          '<div class="block"><h2>Hour priority<em>2-hourly cycle, best first</em></h2>' +
            '<div class="rows">' + hrs.map(function (h, i) {
              var c = i === 0 ? 'var(--celadon)' : h.score >= 6 ? 'var(--brass)' :
                      h.score >= 4 ? 'var(--muted)' : 'var(--cinnabar)';
              return '<div class="row"><span class="k">' + (i+1) + '. ' + h.branchCn + ' ' + h.range + '</span>' +
                '<span class="v"><b style="color:' + c + '">' + h.score + '/10</b>' +
                '<small>' + h.gate + ' · ' + h.gateEn + ' · face ' + h.direction + '</small></span></div>';
            }).join('') + '</div></div>' +
          '<div class="block"><h2>Do / avoid</h2>' + advice(d0.do, d0.avoid) + '</div>' +
          saveBar('daySave', 'Save this date') +
          '<div class="block"><h2>AI explanation</h2><div id="aiDay"></div></div>',
          function () {
            wireSave('daySave', function () {
              return { kind:'plan',
                title: label.en + ' — ' + x.d + ' ' + MON[x.m-1] + ' ' + x.y,
                subtitle: x.pillar.cn + ' · ' + x.officer.cn + ' · score ' + x.score,
                when: { date: isoOf(x) },
                payload: { activity: label.en, activityCn: label.cn, score: x.score,
                  officer: x.officer.cn + ' ' + x.officer.en,
                  duty: x.duty.cn, yellow: x.duty.yellow,
                  mansion: x.mansion.cn, mansionEn: x.mansion.en,
                  dayPillar: x.pillar.cn, reasons: x.reasons,
                  clash: d0.clashAnimal, voids: d0.voids,
                  hours: hrs.map(function (h, i) {
                    return { rank:i+1, branch:h.branchCn, range:h.range, score:h.score, gate:h.gate }; }),
                  do: d0.do, avoid: d0.avoid } };
            });
            var dpWhen = { y: x.y, m: x.m, d: x.d, hour: 12, min: 0 };
            var dpCt = mountCounter('aiDay', 'daypick', { when: dpWhen, year: x.y, focus: focusFor((label.en || '') + ' ' + (label.key || ''), null),
              subtitle: 'the year\'s threats on this day\'s plate (midday)' });
            aiPanelSaving('aiDay', 'daypick', isoOf(x) + '.' + label.key + '.ct',
              function (cfg) { return window.QPAI.withCounter(dpCt ? counterText(dpCt, dpCt.focus) : null, function () { return window.QPAI.analyseDayPick(cfg, x, label, hrs, user); }); }, [
                { label:'Verdict', path:'verdict' },
                { label:'Why', path:'why' },
                { label:'Best hours', path:'bestHours' },
                { label:'Considerations', path:'considerations' },
                { label:'If you cannot use this day', path:'alternative' }
              ]);
          });
      }
    }

    /* ================= STRATEGY ================= */
    else if (consultK === 'strategy') {
      host.innerHTML =
        block('Structures in a window', 'defaults to now',
          '<div class="panel">' + whenPicker('stDate', 'stHour', dt, 'Date') +
          '<button class="btn" id="stGo">Compute structures</button></div>') +
        '<div id="stOut"></div>';
      $('stGo').onclick = function () { paintStrategy(readWhen('stDate', 'stHour')); };
      paintStrategy({ y:dt.y, m:dt.m, d:dt.d, hour:dt.hour, min:dt.min });

      function paintStrategy(when) {
        var pS = C.fourPillars(when.y, when.m, when.d, when.hour, when.min);
        var chartS = S.qimen(pS);
        var fAll = S.formations(pS, when.m);
        var cats = { auspicious: [], hostile: [], special: [] };
        fAll.forEach(function (f) { (cats[f.category] || cats.special).push(f); });

        function list(arr, key) {
          if (!arr.length) return '<div class="empty">None active in this window.</div>';
          return '<div class="rows">' + arr.map(function (f, i) {
            return '<div class="row"><span class="k" style="flex:0 0 42%">' + f.name +
              '<br><small style="color:var(--muted)">' + f.nameEn + '</small></span>' +
              '<span class="v"><small>' + esc(f.description) + '</small>' +
              '<small style="color:var(--brass)">Palaces ' + (f.palaces.join(', ') || 'chart') +
              ' · ' + f.seasonalStrength + '</small>' +
              '<button class="btn ghost" style="margin-top:6px;padding:7px" data-st="' + key + ':' + i +
              '">Explain</button></span></div>';
          }).join('') + '</div>';
        }
        $('stOut').innerHTML = postureHtml(pS, chartS) +
          block('Window', pS.hour.cn + ' hour · ' + pS.hourRange,
            '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
            '<span class="tag on">' + cats.auspicious.length + ' auspicious</span>' +
            '<span class="tag off">' + cats.hostile.length + ' hostile</span>' +
            '<span class="tag">' + cats.special.length + ' strategic</span><br>' +
            chartS.dun + ' ju ' + chartS.ju + ' · ' + chartS.term + ' · chief ' + chartS.chief +
            ' · envoy ' + chartS.envoy + '</div>') +
          block('Auspicious structures', '格局 favouring action', list(cats.auspicious, 'auspicious')) +
          block('Hostile structures', 'what to route around', list(cats.hostile, 'hostile')) +
          block('Strategic structures', '', list(cats.special, 'special')) +
          block('The plate', '', plateHtml(chartS, fAll, [], false));

        $('stOut').querySelectorAll('[data-st]').forEach(function (b) {
          b.onclick = function () {
            var a = b.dataset.st.split(':');
            openStructure(cats[a[0]][parseInt(a[1], 10)], chartS, pS, when);
          };
        });
      }

      function openStructure(f, chartS, pS, when) {
        if (!f) return;
        lastSavedId = null; currentAI = null;
        var pals = (f.palaces || []).map(function (n) {
          return palaceCard(chartS.palacesByNumber[n], chartS.mansion, true); }).join('');
        openSheet(f.name + ' &middot; ' + f.nameEn,
          f.category + ' · ' + isoOf(when) + ' ' + pS.hourRange,
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' + esc(f.description) +
            '<br><br><span style="color:var(--muted)">Seasonal strength: ' + f.seasonalStrength +
            '</span></div>' +
          (pals ? '<div class="block"><h2>Where it sits</h2>' + pals + '</div>' : '') +
          '<div class="block"><h2>The plate</h2>' +
            plateHtml(chartS, [f], f.palaces || [], false) + '</div>' +
          saveBar('stSave', 'Save this structure') +
          '<div class="block"><h2>How to use or avoid it</h2><div id="aiSt"></div></div>',
          function () {
            wireSave('stSave', function () {
              return { kind:'strategy',
                title: f.name + ' · ' + f.nameEn,
                subtitle: f.category + ' · ' + isoOf(when) + ' ' + pS.hourRange,
                when: { date: isoOf(when), range: pS.hourRange },
                payload: { formation: fmtForm(f),
                  dayPillar: pS.day.cn, hourPillar: pS.hour.cn,
                  dun: chartS.dun, ju: chartS.ju, term: chartS.term,
                  chief: chartS.chief, envoy: chartS.envoy, mansion: chartS.mansion.cn,
                  voids: chartS.voidBranches,
                  palaces: (f.palaces || []).map(function (n) {
                    return snapshotPalace(chartS.palacesByNumber[n]); }),
                  plate: snapshotPlate(chartS) } };
            });
            var stCt = mountCounter('aiSt', 'strategy', { when: when, year: when.y, subtitle: 'the year\'s threats on this plate' });
            aiPanelSaving('aiSt', 'structure', isoOf(when) + '.' + pS.hour.i + '.' + f.id + '.ct',
              function (cfg) { return window.QPAI.withCounter(stCt ? counterText(stCt) : null, function () { return window.QPAI.analyseStructure(cfg, f, chartS, pS, user); }); }, [
                { label:'What it means here', path:'meaning' },
                { label:'How to use it', path:'howToUse' },
                { label:'What to avoid', path:'avoid' },
                { label:'Key considerations', path:'considerations' }
              ]);
          });
      }
    }

    /* ================= QIMEN PLATE ================= */
    /* ================= COUNTER: annual vulnerabilities onto the active plate ================= */
    else if (consultK === 'counter') {
      var cy = counterPrefill ? counterPrefill.year : dt.y; counterPrefill = null;
      host.innerHTML =
        block('Threat check and counter-measures', 'the year\'s vulnerabilities, found on the active Qimen plate',
          '<div class="panel">' +
          '<div class="hint" style="margin-top:0">Takes the vulnerabilities your annual Bazi, Zi Wei and Qimen forecasts flag — financial drain, ' +
            'legal exposure, executive friction, health, relationships, upheaval — finds where each is showing on the Qimen plate for ' +
            'the hour you choose, tests whether the year and the board agree, and gives counter-measures: the Hide Door, directions, ' +
            'an element remedy and the next windows to act in.</div>' +
          '<label for="ctYear">Forecast year</label><input id="ctYear" type="number" min="1900" max="2200" value="' + cy + '">' +
          whenPicker('ctDate', 'ctHour', dt, 'Active plate — date') +
          '<label for="ctDays">Look for windows over the next</label><select id="ctDays">' +
            [[3, '3 days'], [5, '5 days'], [7, '7 days']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === 5 ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
          '</select><button class="btn" id="ctGo">Run the threat check</button></div>') +
        '<div id="ctOut"></div>';
      $('ctGo').onclick = function () {
        var when = readWhen('ctDate', 'ctHour'), yr = parseInt($('ctYear').value, 10) || when.y;
        var r = Q.threatBridge(user, yr, when, { days: parseInt($('ctDays').value, 10) || 5, jiazi: true, jiaziDays: 30 });
        var vcls = { Confirmed: 'bad', Latent: 'mid', Flare: 'mid', Clear: 'good' };
        var hd = r.hideDoor;
        $('ctOut').innerHTML =
          block('The active plate', isoOf(when) + ' ' + r.hourRange + ' · ' + r.chart.dun + ' ju ' + r.chart.ju,
            rows([
              ['You (the cast Day Stem ' + r.asker.stem + ')', 'Palace ' + r.asker.num + ' ' + r.asker.name + ' &middot; ' + r.asker.dir +
                '<small>' + (r.asker.gate || '—') + ' &middot; ' + (r.asker.star || '—') + ' &middot; ' + (r.asker.deity || '—') + '</small>'],
              ['Hide Door 杜门', hd ? hd.dir + ' (P' + hd.num + ') ' + ySg(hd.quality) + '<small>' + (hd.star || '—') + ' &middot; ' + (hd.deity || '—') +
                (hd.compromised ? ' &middot; <span class="bad-t">compromised — void, hostile deity or 庚 there</span>' : ' &middot; usable') + '</small>' : '—'],
              ['Work from', r.workFrom.map(function (d) { return d.dir + ' ' + ySg(d.score) + ' <small>' + esc(d.why.slice(0, 3).join(', ')) + '</small>'; }).join('<br>')],
              ['Avoid', r.avoid.map(function (d) { return d.dir + (d.num === r.asker.num ? ' <small class="bad-t">your own seat this hour is weak — move to a Work-from direction</small>' : '') +
                ' <small>' + esc(d.why.slice(0, 3).join(', ')) + '</small>'; }).join('<br>') || 'Nothing severe']
            ])) +
          block('Threats, tested', 'annual severity × what the board shows now', r.threats.map(function (t) {
            var a = t.active;
            return '<div class="panel"><div class="verdictbar" style="margin:0 0 6px"><span class="big ' + vcls[t.verdict] + '">' + t.verdict + '</span>' +
              '<span class="sub">' + esc(t.label) + ' ' + t.cn + '<br>annual severity ' + t.severity + ' (' + t.level + ')' +
              (a ? ' &middot; on the board ' + a.index : '') + '</span></div>' +
              rows([['The year', '<small>' + esc(t.evidence.join('; ') || 'nothing flagged') + '</small>'],
                ['On the board', a ? esc(a.symbol) + ' in ' + a.dir + ' (P' + a.num + ') <small>' + (a.gate || '—') + ' &middot; ' + (a.star || '—') + ' &middot; ' + (a.deity || '—') +
                  ' &middot; quality ' + a.quality + (a.agents.length ? ' &middot; ' + esc(a.agents.join(', ')) : '') + (a.pressing ? ' &middot; <span class="bad-t">presses on you</span>' : '') +
                  (t.stagnant ? ' &middot; void — stalled' : '') + '</small>' : '—'],
                ['Override', '<small>' + esc(t.override) + '</small>'],
                ['Hide Door', t.verdict === 'Clear' ? '<small>not needed</small>' : '<small>' + esc(t.hideTactic) + (hd ? ' Direction: ' + hd.dir + (hd.compromised ? ' (compromised)' : '') + '.' : '') + '</small>'],
                ['Element remedy', t.remedy && t.verdict !== 'Clear' ? t.remedy.element + ' <small>' + esc(t.remedy.why) + '</small>' : '—'],
                ['Windows', t.windows.length ? t.windows.map(function (w) { return w.at.slice(5) + ' <small>' + w.range + ' &middot; you ' + w.askerDir + ' &middot; ' +
                  (t.hazard ? 'threat contained' : 'symbol strong') + ' (' + w.score + ')</small>'; }).join('<br>') : (t.verdict === 'Clear' ? '—' : '<small>none strong enough in the period scanned</small>')]
              ]) + jiaziHtml(t.jiazi) + '</div>';
          }).join('')) +
          saveBar('ctSave', 'Save this threat check') +
          block('AI counter-measure plan', '', '<div id="aiCt"></div>');
        var ctStamp = yr + '.' + isoOf(when) + '.' + r.pillars.hour.i + '.' + r.scanDays + '.jz';
        var ctAttach = wireAnnualSave('ctSave', 'threat', ctStamp, function () { return counterRecord(r, yr, when); });
        aiPanel('aiCt', 'threat', ctStamp,
          function (cfg) { return window.QPAI.analyseThreats(cfg, user, r); }, [
            { label: 'The situation', path: 'brief' },
            { label: 'Where it is manifesting', path: 'manifestation' },
            { label: 'Mismatch test', path: 'mismatch' },
            { label: 'Tactical override', path: 'override' },
            { label: 'Hide Door strategy', path: 'hideDoor' },
            { label: 'Directions and remedies', path: 'directions' },
            { label: 'Windows to act', path: 'timing' },
            { label: 'If it fires early', path: 'contingency' }
          ], ctAttach);
      };
    }

    else if (consultK === 'qimen') {
      // The destiny chart is natal, not timing — it lives on the Chart tab.
      var timingTypes = Q.CHART_TYPES.filter(function (t) { return !t.natal; });
      var typeOpts = timingTypes.map(function (t) {
        return '<option value="' + t.id + '">' + t.label + ' &middot; ' + t.cn + '</option>'; }).join('');
      host.innerHTML =
        block('Cast a chart', 'five scopes',
          '<div class="panel">' +
          '<label for="qtType">Chart type</label><select id="qtType">' + typeOpts + '</select>' +
          '<div id="qtNote" class="hint"></div>' +
          '<div id="qtWhen">' + whenPicker('qtDate', 'qtHour', dt, 'Date') + '</div>' +
          '<button class="btn" id="qtGo">Cast</button></div>') +
        '<div id="qtOut"></div>';
      $('qtType').onchange = function () {
        // Fall back rather than throw if the select ever holds a value we no longer offer.
        var t = timingTypes.filter(function (x) { return x.id === $('qtType').value; })[0]
                || timingTypes[0];
        $('qtType').value = t.id;
        $('qtNote').textContent = t.note;
        paintChart();
      };
      $('qtGo').onclick = paintChart;
      $('qtNote').textContent = timingTypes[0].note;
      paintChart();

      function paintChart() {
        var type = $('qtType').value;
        if (!timingTypes.some(function (x) { return x.id === type; })) type = timingTypes[0].id;
        var when = readWhen('qtDate', 'qtHour');
        var res;
        try { res = Q.chartFor(type, when, user.birth); }
        catch (e) { $('qtOut').innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
        var ch = res.chart;
        lastSavedId = null; currentAI = null;
        var tLabel = timingTypes.filter(function (x) { return x.id === type; })[0] || timingTypes[0];

        $('qtOut').innerHTML =
          block(tLabel.label, tLabel.cn + ' · ' + res.scope,
            rows([
              ['Four pillars', res.pillars.year.cn + ' ' + res.pillars.month.cn + ' ' +
                res.pillars.day.cn + ' ' + res.pillars.hour.cn],
              ['Plate', ch.dun + ' &middot; ju ' + ch.ju + ' &middot; ' + (ch.basis ? esc(ch.basis) : ch.yuan) + qmMethodLabel(ch)],
              ['Solar term', qmTermLabel(ch, res.pillars)]].concat(res.pillars.solar ? [['True solar time', ('0' + res.pillars.solar.hour).slice(-2) + ':' + ('0' + res.pillars.solar.min).slice(-2) + ' <small>clock ' + (res.pillars.solar.shift > 0 ? '+' : '') + res.pillars.solar.shift + ' min at ' + res.pillars.solar.lon + '°</small>']] : []).concat([
              ['Chief star 值符', ch.chief + ' <small>' + ch.chiefEn + '</small>'],
              ['Envoy gate 值使', ch.envoy + ' <small>palace ' + ch.envoyPalace + '</small>'],
              ['Constellation 宿', ch.mansion.cn + ' <small>' + ch.mansion.en + '</small>'],
              ['Void 空亡', qmVoidLabel(ch)],
              ['Structures', '<span style="color:var(--celadon)">+' +
                res.formations.filter(function (f) { return f.category === 'auspicious'; }).length +
                '</span> / <span style="color:var(--cinnabar)">−' +
                res.formations.filter(function (f) { return f.category === 'hostile'; }).length + '</span>']
            ]))) +
          xiuChartHtml(res, type) +
          '<div id="qtPlanets"></div>' +
          '<div id="qtSky"></div>' +
          block('The nine palaces', 'tap a palace for full detail',
            qbHead(res) + plateHtml(ch, res.formations, [], true, null, { res: res }) + (type === 'hour' ? qbFocus(res) : '') +
            saveBar('qtSave', 'Save this chart')) +
          block('All palaces in full', '',
            [4,9,2,3,7,8,1,6].map(function (n) {
              return palaceCard(ch.palacesByNumber[n], ch.mansion, false); }).join('')) +
          block('AI reading of this plate', tLabel.label, '<div id="aiQt"></div>');

        var qtTz = window.QPMath.qimenTensor(ch, { favourable: user.favourable,
          unfavourable: (user.deep || user.bazi).unfavourable });
        wirePlateTaps('qtOut', ch, res.formations);
        skyBlock('qtSky', when);
        planetsBlock('qtPlanets', res, when);
        var qtCt = mountCounter('aiQt', 'qimen', { when: when, year: when.y,
          subtitle: 'the year\'s threats on the ' + (type === 'hour' ? 'plate of this hour' : 'hour plate of this moment') });
        aiPanelSaving('aiQt', 'qimenplate', type + '.' + isoOf(when) + '.' + res.pillars.hour.i + '.ct',
          function (cfg) { return window.QPAI.withCounter(qtCt ? counterText(qtCt) : null, function () {
            return window.QPAI.analyseQimenPlate(cfg, res, tLabel, qtTz, user); }); }, [
            { label:'The plate in brief', path:'brief' },
            { label:'Where the advantage sits', path:'advantage' },
            { label:'Where the danger sits', path:'danger' },
            { label:'Structures that matter', path:'structures' },
            { label:'Positioning', path:'positioning' }
          ]);
        wireSave('qtSave', function () {
          return { kind:'chart',
            title: tLabel.label + ' · ' + res.pillars.day.cn,
            subtitle: res.scope + ' · ' + ch.dun + ' ju ' + ch.ju,
            when: { date: isoOf(when), range: res.pillars.hourRange },
            payload: { type: type, typeLabel: tLabel.label, scope: res.scope,
              pillars: [res.pillars.year.cn, res.pillars.month.cn, res.pillars.day.cn, res.pillars.hour.cn],
              dun: ch.dun, ju: ch.ju, yuan: ch.yuan, term: ch.term,
              chief: ch.chief, envoy: ch.envoy, envoyPalace: ch.envoyPalace,
              mansion: ch.mansion.cn, voids: ch.voidBranches,
              plate: snapshotPlate(ch),
              formations: res.formations.map(fmtForm) } };
        });
      }
    }

    /* ================= YIJING ================= */
    else {
      host.innerHTML =
        block('Yijing', 'Plum Blossom time method',
          '<div class="panel">' +
          '<label for="yQ">Your question</label>' +
          '<input id="yQ" type="text" placeholder="Hold one clear question in mind">' +
          whenPicker('yDate', 'yHour', dt, 'Cast for date') +
          '<div class="hint">The numbers come from the moment itself, so a cast is fixed for that ' +
          'hour — asking the same question again in the same hour returns the same answer, which ' +
          'is the intent of the method.</div>' +
          '<button class="btn" id="castBtn">Cast</button></div>') +
        '<div id="castOut"></div>';

      $('castBtn').onclick = function () {
        var when = readWhen('yDate', 'yHour');
        var pY = C.fourPillars(when.y, when.m, when.d, when.hour, when.min);
        var lun = A.toLunar(when.y, when.m, when.d);
        var hx = S.yijing(pY, lun);
        var q = $('yQ').value.trim();
        var yf = window.QPFib.yijing(when, hx, pY);
        var ty = yf.tiYong;
        var yjCls = function (x) { return x >= 1.5 ? 'good' : x > -1.5 ? 'mid' : 'bad'; };
        lastSavedId = null; currentAI = null;
        var lines = hx.lines.slice(0).reverse().map(function (v, i) {
          var no = 6 - i, mv = no === hx.moving;
          var col = mv ? 'var(--cinnabar)' : 'var(--rice)';
          return '<div style="display:flex;align-items:center;gap:10px;margin:7px 0">' +
            '<span style="width:86px;font-size:.75rem;color:var(--muted)">Line ' + no +
            (mv ? ' · moving' : '') + '</span>' +
            (v ? '<span style="flex:1;height:9px;background:' + col + '"></span>'
               : '<span style="flex:1;display:flex;gap:8px"><span style="flex:1;height:9px;background:' +
                 col + '"></span><span style="flex:1;height:9px;background:' + col + '"></span></span>') +
            '</div>';
        }).join('');

        $('castOut').innerHTML =
          block(hx.name + ' &middot; ' + hx.nameEn, 'hexagram ' + hx.number + ' · ' +
            isoOf(when) + ' ' + pY.hourRange,
            '<div class="panel">' + lines + '</div>') +
          block('Reading', '',
            rows([
              ['Question', q ? esc(q) : '<span style="color:var(--muted)">none stated</span>'],
              ['Cast at', isoOf(when) + ' ' + pY.hourRange + ' <small>' + pY.day.cn + ' day · ' +
                pY.hour.cn + ' hour</small>'],
              ['Upper trigram', hx.upper + ' <small>' + hx.upperEn + '</small>'],
              ['Lower trigram', hx.lower + ' <small>' + hx.lowerEn + '</small>'],
              ['Moving line', 'Line ' + hx.moving],
              ['Changes to', hx.changedName + ' <small>' + hx.changedNameEn + ' · hexagram ' +
                hx.changedNumber + '</small>'],
              ['Nuclear 互卦', hx.nuclearName + ' <small>' + hx.nuclearNameEn + ' · hexagram ' +
                hx.nuclearNumber + '</small>']
            ]) + saveBar('yjSave', 'Save this cast')) +
          block('体用 Body and use', 'Plum Blossom judgement of the cast',
            '<div class="verdictbar"><span class="big ' + yjCls(ty.score) + '">' + yf.verdict +
            '</span><span class="sub">score ' + ty.score + '<br>体 ' + ty.ti + ' ' + ty.tiElem +
            ' &middot; 用 ' + ty.yong + ' ' + ty.yongElem + '</span></div>' +
            rows([
              ['体 Self', ty.ti + ' <small>' + ty.tiElem + ' &middot; the trigram without the moving line &middot; ' +
                esc(ty.season) + '</small>'],
              ['用 Matter', ty.yong + ' <small>' + ty.yongElem + ' &middot; the trigram holding line ' + hx.moving + '</small>'],
              ['Relation', '<small>' + esc(ty.relationText) + '</small>'],
              ['Outcome 变', ty.outcome + ' <small>' + esc(ty.notes[1]) + '</small>']
            ])) +
          block('Fibonacci timing', 'recast on the Fibonacci double-hours, 体用 rescored each time',
            fibSummaryHtml(yf.timeline, yjCls) +
            '<div style="margin-top:10px">' + fibRowsHtml(yf.timeline.points, {
              mark: function (p) { return p === yf.timeline.best; },
              extra: function (p) { return esc(p.hexagram) + ' → ' + esc(p.changed); } }) + '</div>' +
            '<div class="block" style="margin-top:14px"><h2>應期 When it lands<em>Xiantian numbers on the Fibonacci scale</em></h2>' +
            rows(yf.timing.map(function (t) {
              return [esc(t.basis), t.n + (t.fib ? ' <small style="color:var(--brass)">Fibonacci</small>' : '') +
                '<small>fast matter ' + t.days + ' &middot; slow matter ' + t.months + '</small>'];
            }).concat([['Zeckendorf of ' + yf.castNumber, yf.zeckendorf.join(' + ') +
              '<small>the cast number as distinct Fibonacci terms — pivot offsets in days or months</small>']])) +
            '</div>' +
            '<div class="hint">体用 and 應期 are classical Plum Blossom. Recasting on Fibonacci ' +
            'intervals, the golden-section zones and the &phi;-weighted consensus are a QiPath ' +
            'synthesis layered on top, not part of the classical method.</div>') +
          block('AI reading', '', '<div id="aiYj"></div>');

        wireSave('yjSave', function () {
          return { kind:'yijing',
            title: hx.name + ' · ' + hx.nameEn + (q ? ' — ' + q : ''),
            subtitle: 'Hexagram ' + hx.number + ' → ' + hx.changedNumber + ' · ' +
              isoOf(when) + ' ' + pY.hourRange,
            when: { date: isoOf(when), range: pY.hourRange },
            payload: { question: q, number: hx.number, name: hx.name, nameEn: hx.nameEn,
              upper: hx.upper, upperEn: hx.upperEn, lower: hx.lower, lowerEn: hx.lowerEn,
              moving: hx.moving, lines: hx.lines,
              changedNumber: hx.changedNumber, changedName: hx.changedName,
              changedNameEn: hx.changedNameEn, changedLines: hx.changedLines,
              nuclearNumber: hx.nuclearNumber, nuclearName: hx.nuclearName,
              nuclearNameEn: hx.nuclearNameEn,
              tiYong: { ti: ty.ti, yong: ty.yong, relation: ty.relation,
                        relationText: ty.relationText, score: ty.score, verdict: yf.verdict },
              timing: yf.timing, fib: fibSnapshot(yf.timeline),
              castAt: isoOf(when) + ' ' + pY.hourRange,
              pillars: [pY.year.cn, pY.month.cn, pY.day.cn, pY.hour.cn] } };
        });
        var yjCt = mountCounter('aiYj', 'yijing', { when: when, year: when.y, focus: focusFor(q, null),
          subtitle: 'the year\'s threats on the plate of the cast' });
        aiPanelSaving('aiYj', 'yijing', isoOf(when) + '.' + pY.hour.i + '.' + hx.number + '.fib1.ct',
          function (cfg) { return window.QPAI.withCounter(yjCt ? counterText(yjCt, yjCt.focus) : null, function () {
            return window.QPAI.analyseYijing(cfg, hx, pY, q, user, yf); }); }, [
            { label:'Direct answer', path:'answer' },
            { label:'Confidence', path:'confidence' },
            { label:'The situation', path:'situation' },
            { label:'体用 Body and use', path:'tiYong' },
            { label:'The moving line', path:'movingLine' },
            { label:'Where it is heading', path:'direction' },
            { label:'Fibonacci timing', path:'fibonacci' },
            { label:'Precise windows', path:'windows' },
            { label:'Advice', path:'advice' },
            { label:'Caution', path:'caution' }
          ]);
      };
    }
  }

  /* ---------------- consult support ---------------- */

  function switchConsult(k) {
    consultK = k;
    $('segConsult').querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.k === k)); });
    renderConsult();
    paintNav();
  }

  function wirePlateTaps(hostId, chart, formations, life) {
    var h = $(hostId);
    if (!h) return;
    h.querySelectorAll('[data-pal]').forEach(function (cell) {
      cell.onclick = function () {
        var n = parseInt(cell.dataset.pal, 10);
        var pa = chart.palacesByNumber[n];
        var fs = (formations || []).filter(function (f) {
          return (f.palaces || []).indexOf(n) >= 0; });
        openSheet('Palace ' + n + ' ' + pa.name + ' &middot; ' + pa.dir,
          pa.elementCn + ' · ' + (pa.ring === 'inner' ? 'inner' : 'outer') + ' palace',
          palaceCard(pa, chart.mansion, true, life) +
          (fs.length ? '<div class="block"><h2>Structures here</h2><div class="rows">' +
            fs.map(function (f) {
              return '<div class="row"><span class="k" style="flex:0 0 42%">' + f.name +
                '<br><small style="color:var(--muted)">' + f.nameEn + '</small></span>' +
                '<span class="v"><small>' + esc(f.description) + '</small></span></div>';
            }).join('') + '</div></div>'
            : '<div class="block"><h2>Structures here</h2><div class="empty">No formation lands in this palace.</div></div>') +
          '<div class="block"><h2>Chart context</h2>' + rows([
            ['Plate', chart.dun + ' ju ' + chart.ju],
            ['Large number here', String(window.QPSystems.qimenFlownNumber(chart.ju, n)) + ', flown from Ju ' + chart.ju + ' in the centre'],
            ['Chief star', chart.chief],
            ['Envoy gate', chart.envoy],
            ['Constellation', chart.mansion.cn + '宿 ' + chart.mansion.en],
            ['Void branches', chart.voidBranches.join(' ')]
          ]) + '</div>');
      };
    });
  }

  function snapshotPalace(pa) {
    if (!pa) return null;
    return { num: pa.num, name: pa.name, dir: pa.dir, element: pa.elementCn, ring: pa.ring,
      heavenStem: pa.heavenStemCn, earthStem: pa.earthStemCn,
      star: pa.starCn, door: pa.gate, deity: pa.spirit,
      branches: pa.branches, isVoid: pa.isEmpty, isEnvoy: pa.isEnvoy, isChief: pa.isChief,
      strength: { star: pa.starStrength && pa.starStrength.cn,
                  door: pa.gateStrength && pa.gateStrength.cn,
                  deity: pa.spiritStrength && pa.spiritStrength.cn },
      doorPalace: pa.gatePalace ? pa.gatePalace.cn + ' ' + pa.gatePalace.en : null,
      stemCombo: (function () { var c = window.QPData.stemCombo(pa.heavenStemCn, pa.earthStemCn); return c ? c.cn + ' ' + c.en + ', ' + c.ratingEn : null; })(),
      hostGuest: pa.hostGuest ? pa.hostGuest.cn + ' ' + pa.hostGuest.en + ', favours ' + pa.hostGuest.favours : null };
  }
  function snapshotPlate(chart) {
    return [1,2,3,4,5,6,7,8,9].map(function (n) {
      return snapshotPalace(chart.palacesByNumber[n]); }).filter(Boolean);
  }
  function fmtForm(f) {
    return { id: f.id, name: f.name, nameEn: f.nameEn, category: f.category,
             description: f.description, palaces: f.palaces,
             seasonalStrength: f.seasonalStrength };
  }

  var numbersK = 'today';
  var numbersEra = null;   // null = current TOTO format
  /* ---------------- method trial: four proposed methods, tested on the archive ---------------- */

  var trialCache = null;   // { key, res } — the last run, so switching tabs does not recompute

  function renderTrial(body, dt, DR) {
    var DM = window.QPDrawMethods, sum = DR.summary();
    var nx = G.nextDrawInfo(dt);
    var at = function (off) { var g = A.jdToGreg(A.gregToJD(dt.y, dt.m, dt.d) + off); return { y: g.y, m: g.m, d: Math.floor(g.d) }; };
    var d4 = at(nx.fourD || 0), dT = at(nx.toto || 0);
    var key = user.id + '.' + sum.toto.count + '.' + sum.fourD.count;

    var intro = '<div class="block"><h2>Method trial<em>four proposed methods, judged on the archive</em></h2>' +
      '<div class="notice"><b>What this is.</b> Four methods were proposed for narrowing 4D and TOTO to a ' +
      '&ldquo;high-probability subset&rdquo;. They are built here faithfully and replayed against every stored draw, ' +
      'next to the exact chance baseline. In a fair draw every number and every combination has the same ' +
      'probability, so a method can only choose <i>which</i> equally likely tickets to hold — this screen lets the ' +
      'archive show that rather than asserting it. Entertainment only. National Problem Gambling Helpline ' +
      '<a href="tel:18006668668">1800-6-668-668</a>.</div></div>';

    var picks = block('Each method&rsquo;s picks for the next draws',
      '4D ' + isoOf(d4) + ' &middot; TOTO ' + isoOf(dT),
      '<div class="rows">' + DM.METHODS.map(function (m) {
        var a = m.fn(d4, user), b = m.fn(dT, user);
        return '<div class="row"><span class="k">' + esc(m.name) + '<small>' + esc(m.system) + '</small></span>' +
          '<span class="v">' + (a.fourD ? a.fourD.sets.join(' ') : '—') +
          '<small>' + (b.toto ? b.toto.numbers.join(', ') : '—') + '</small></span></div>';
      }).join('') + '</div>' +
      '<div class="rows" style="margin-top:10px">' + DM.METHODS.map(function (m) {
        return '<div class="row"><span class="k">' + esc(m.name) + '</span><span class="v"><small>' + esc(m.summary) + '</small></span></div>';
      }).join('') + '</div>');

    if (!sum.toto.count && !sum.fourD.count) {
      body.innerHTML = intro + picks + block('Trial', 'needs the archive',
        '<div class="panel" style="font-size:.9rem;line-height:1.7">Load the draw history under <b>Past results</b> first — ' +
        'the trial replays each method against real draws.</div>');
      return;
    }

    body.innerHTML = intro + picks +
      block('Run the trial', 'up to 300 recent draws per game, every method',
        '<div class="panel" style="font-size:.9rem;line-height:1.7">Each method is replayed for every stored draw, using ' +
        'only what it could have known before that draw (the pattern-tracking method learns from earlier draws only). ' +
        'Its hit rate is compared with the exact chance rate.' +
        '<button class="btn" id="trialGo" style="margin-top:12px">' + (trialCache && trialCache.key === key ? 'Run again' : 'Run the trial') +
        '</button><div id="trialProg" class="hint"></div></div>') +
      '<div id="trialOut"></div>';

    function paint(res) {
      var pct = function (x) { return (x * 100).toFixed(2) + '%'; };
      var anySig = res.results.filter(function (r) { return r.significant; });
      var games = [['toto', 'TOTO — 7 numbers, a hit is 3 or more of the 6 drawn'], ['4d', '4D — 4 sets, a hit is any of the 23 prize numbers']];
      $('trialOut').innerHTML =
        '<div class="block"><h2>Result</h2><div class="verdictbar"><span class="big ' + (anySig.length ? 'mid' : 'good') + '">' +
          (anySig.length ? anySig.length + ' flagged' : 'All at chance') + '</span><span class="sub">' + res.tests +
          ' tests &middot; significance requires p &lt; ' + res.alpha + ' (Bonferroni: 0.05 / ' + res.tests + ')' +
          '</span></div>' +
          '<div class="panel" style="margin-top:8px;font-size:.88rem;line-height:1.65">' + (anySig.length
            ? 'A flagged result clears the corrected threshold in this sample. Before reading anything into it: rerun it ' +
              'on draws it has not seen (wait for new draws, or hold out an older era), because a real edge has to repeat.'
            : 'No method beats or trails chance by more than sampling noise once the number of tests is accounted for. ' +
              'That is what a fair draw predicts: the methods choose different tickets, and every ticket has the same odds.') +
          '</div></div>' +
        games.map(function (g) {
          var rs = res.results.filter(function (r) { return r.kind === g[0]; });
          var pl = res.pooled.filter(function (p) { return p.kind === g[0]; })[0];
          if (!rs.length) return '';
          return block(g[0] === 'toto' ? 'TOTO' : '4D', g[1],
            '<div class="rows">' + rs.map(function (r) {
              var cls = r.significant ? (r.observed > r.chance ? 'good' : 'bad') : 'mid';
              return '<div class="row"><span class="k">' + esc(r.name) + '<small>' + r.checked + ' draws &middot; expected ' +
                r.expected.toFixed(1) + ' hits</small></span><span class="v"><b class="' + cls + '-t">' + r.hits + ' hits</b> ' +
                pct(r.observed) + ' <small>chance ' + pct(r.chance) + ' &middot; z ' + r.z.toFixed(2) + ' &middot; exact p ' +
                (r.p < 0.001 ? '&lt;0.001' : r.p.toFixed(3)) + (r.significant ? ' &middot; <b>flagged</b>' : '') + '</small></span></div>';
            }).join('') +
            (pl ? '<div class="row fib-hot"><span class="k">All four new methods pooled<small>' + pl.checked + ' predictions</small></span>' +
              '<span class="v"><b>' + pl.hits + ' hits</b> ' + pct(pl.observed) + ' <small>expected ' + pl.expected.toFixed(1) +
              ' &middot; z ' + pl.z.toFixed(2) + ' &middot; exact p ' + (pl.p < 0.001 ? '&lt;0.001' : pl.p.toFixed(3)) + '</small></span></div>' : '') +
            '</div>');
        }).join('') +
        block('Why the corrections matter', '',
          '<div class="panel" style="font-size:.88rem;line-height:1.7">With ' + res.tests + ' tests at the usual |z| &gt; 2, the ' +
          'chance that at least one looks &ldquo;significant&rdquo; by luck alone is about ' +
          Math.round((1 - Math.pow(0.954, res.tests)) * 100) + '%. The Bonferroni threshold divides the 5% error rate across ' +
          'the tests. For 4D the expected hit count over 300 draws is only about 3, so the exact binomial p-value is used ' +
          'rather than the z-score, which is unreliable at counts that small.</div>') +
        block('What the methods actually do', '',
          '<div class="panel" style="font-size:.88rem;line-height:1.7"><b>Bayesian + Monte Carlo.</b> Updating a prior ' +
          'requires a likelihood connected to the outcome. Nothing links the draw hour&rsquo;s elements to the balls, so the ' +
          'posterior is a preference, not a probability of being drawn.<br><br><b>Residues + CRT.</b> The residue classes ' +
          'pick a subset, but every number in it is exactly as likely as every number outside it; a smaller set means ' +
          'fewer tickets considered, not better ones.<br><br><b>Persistent homology.</b> It finds stable structure in the ' +
          'Qimen plate — real structure in the chart, with no path from the chart to the draw machine.<br><br><b>MDP + value ' +
          'iteration.</b> Draws are independent, so transitions between digits in past winners carry no information about ' +
          'the next one, and a reward defined by chart alignment optimises alignment, not winning.</div>');
    }

    // Any result with nominal p < 0.05 is replayed on older draws it was never scored on.
    function replicateNotable(res) {
      var notable = res.results.filter(function (r) { return r.p < 0.05; });
      var host = document.createElement('div');
      $('trialOut').appendChild(host);
      if (!notable.length) {
        host.innerHTML = block('Out-of-sample check', 'nothing to replicate',
          '<div class="panel" style="font-size:.88rem;line-height:1.7">No result reached even nominal significance ' +
          '(p &lt; 0.05), so there is nothing to re-test on held-out draws.</div>');
        return;
      }
      host.innerHTML = block('Out-of-sample check', 'replaying notable results on older, unseen draws',
        '<div class="hint" id="replProg">Replicating ' + notable.length + ' result' + (notable.length > 1 ? 's' : '') + '…</div>');
      var outRows = [], i = 0;
      (function step() {
        if (i >= notable.length) {
          host.innerHTML = block('Out-of-sample check', 'the same method on older draws it was not scored on',
            '<div class="rows">' + outRows.map(function (o) {
              var held = o.rep;
              return '<div class="row"><span class="k">' + esc(o.r.name) + ' · ' + (o.r.kind === 'toto' ? 'TOTO' : '4D') +
                '<small>trial: ' + o.r.hits + ' of ' + o.r.checked + ' (' + (o.r.observed * 100).toFixed(2) + '%, p ' + o.r.p.toFixed(3) + ')</small></span>' +
                '<span class="v"><b class="' + (held.p < 0.05 && (held.observed > held.chance) === (o.r.observed > o.r.chance) ? 'good' : 'mid') + '-t">' +
                held.hits + ' of ' + held.checked + '</b> ' + (held.observed * 100).toFixed(2) + '%<small>chance ' +
                (held.chance * 100).toFixed(2) + '% &middot; expected ' + held.expected.toFixed(1) + ' &middot; p ' +
                (held.p < 0.001 ? '&lt;0.001' : held.p.toFixed(3)) + ' &middot; ' + held.from + ' to ' + held.to + '</small></span></div>';
            }).join('') + '</div>' +
            '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' + outRows.map(function (o) {
              var held = o.rep, same = (held.observed > held.chance) === (o.r.observed > o.r.chance);
              return '<b>' + esc(o.r.name) + ' (' + (o.r.kind === 'toto' ? 'TOTO' : '4D') + ')</b>: ' +
                (held.p < 0.05 && same ? 'the deviation repeats on unseen draws. That is unusual — keep testing it on new draws as they arrive before trusting it.'
                  : 'on unseen draws it ' + (Math.abs(held.observed - held.chance) < Math.abs(o.r.observed - o.r.chance) / 2
                    ? 'falls back towards chance' : 'does not hold up') + ' — the trial result was a streak, which is what a ' +
                    'fair draw throws up across ' + res.tests + ' tests.');
            }).join('<br><br>') + '</div>');
          return;
        }
        var r = notable[i++];
        $('replProg') && ($('replProg').textContent = 'Replicating ' + r.name + ' · ' + (r.kind === 'toto' ? 'TOTO' : '4D') + '…');
        setTimeout(function () {
          outRows.push({ r: r, rep: window.QPDrawMethods.replicate(user, r.method, r.kind, r.checked, 900) });
          step();
        }, 30);
      })();
    }

    if (trialCache && trialCache.key === key) { paint(trialCache.res); replicateNotable(trialCache.res); }
    $('trialGo').onclick = function () {
      var btn = $('trialGo'); btn.disabled = true;
      DM.evaluateAsync(user, 300, function (i, n, label) {
        $('trialProg').textContent = 'Replaying ' + i + ' of ' + n + ': ' + label + '…';
      }, function (res) {
        trialCache = { key: key, res: res };
        $('trialProg').textContent = 'Done — ' + res.tests + ' tests.';
        btn.disabled = false; btn.textContent = 'Run again';
        paint(res);
        replicateNotable(res);
      });
    };
  }

  function renderNumbers() {
    var dt = now(), host = $('numbersBody');
    var DR = window.QPDraws;

    host.innerHTML =
      '<div class="seg" id="segNum" role="tablist">' +
      '<button role="tab" aria-selected="' + (numbersK==='today') + '" data-n="today">Today</button>' +
      '<button role="tab" aria-selected="' + (numbersK==='archive') + '" data-n="archive">Past results</button>' +
      '<button role="tab" aria-selected="' + (numbersK==='analysis') + '" data-n="analysis">Analysis</button>' +
      '<button role="tab" aria-selected="' + (numbersK==='trial') + '" data-n="trial">Method trial</button>' +
      '</div><div id="numBody"></div>';
    $('segNum').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { numbersK = b.dataset.n; renderNumbers(); };
    });

    var body = $('numBody');

    if (numbersK === 'today') {
      var n = G.numbersFor(dt, user);
      var nx = G.nextDrawInfo(dt);
      lastSavedId = null; currentAI = null;
      var out =
        '<div class="block"><h2>Numbers<em>' + longDate(dt) + '</em></h2>' +
        '<div class="notice"><b>Read this first.</b> Lottery draws are independent random events. ' +
        'Nothing in Bazi, Qimen, Yijing or any other system can predict them, and this screen does ' +
        'not claim to. The numbers below are derived from the day\'s chart so they are reproducible ' +
        '— a traditional flourish, not a forecast. Every combination has exactly the same chance. ' +
        'Treat any spend as the price of entertainment, never as an investment. In Singapore the ' +
        'National Problem Gambling Helpline is <a href="tel:18006668668">1800-6-668-668</a>.</div></div>';

      if (n.fourD) {
        out += block('4D · ' + n.fourD.drawDay, 'chart-derived, entertainment only',
          '<div class="numsets">' + n.fourD.sets.map(function (x) {
            return '<div class="num4">' + x + '</div>'; }).join('') + '</div>');
      } else {
        out += block('4D', 'draws Wednesday, Saturday, Sunday',
          '<div class="locked"><span class="big">' + nx.fourD + '</span>' +
          (nx.fourD === 1 ? 'day' : 'days') + ' until the next 4D draw morning.</div>');
      }
      if (n.toto) {
        out += block('Toto · ' + n.toto.drawDay, 'seven numbers, chart-derived',
          '<div class="balls">' + n.toto.numbers.map(function (x) {
            return '<div class="ball">' + x + '</div>'; }).join('') + '</div>');
      } else {
        out += block('Toto', 'draws Monday and Thursday',
          '<div class="locked"><span class="big">' + nx.toto + '</span>' +
          (nx.toto === 1 ? 'day' : 'days') + ' until the next Toto draw morning.</div>');
      }
      out += block('How these were derived', 'so you can see there is no hidden claim',
        '<div class="rows">' + n.derivation.map(function (dv) {
          return '<div class="row"><span class="k">·</span><span class="v">' + esc(dv) + '</span></div>';
        }).join('') + '</div>' +
        ((n.fourD || n.toto) ? saveBar('numSave', 'Save these numbers') : ''));
      body.innerHTML = out;

      if (n.fourD || n.toto) wireSave('numSave', function () {
        return { kind:'numbers',
          title: (n.fourD ? '4D' : 'Toto') + ' · ' + longDate(dt),
          subtitle: n.fourD ? n.fourD.sets.join('  ') : n.toto.numbers.join(', '),
          when: { date: isoOf(dt) },
          payload: { fourD: n.fourD ? n.fourD.sets : null,
            fourDDay: n.fourD ? n.fourD.drawDay : null,
            toto: n.toto ? n.toto.numbers : null,
            totoDay: n.toto ? n.toto.drawDay : null,
            derivation: n.derivation,
            dayPillar: n.chart.pillars.day.cn,
            hourPillar: n.chart.pillars.hour.cn,
            lunar: n.chart.lunar.month + '/' + n.chart.lunar.day,
            qimen: n.chart.qimen.dun + ' ju ' + n.chart.qimen.ju,
            term: n.chart.pillars.term.name,
            note: 'Chart-derived and reproducible. Carries no predictive power over a random draw.' } };
      });
    }

    else if (numbersK === 'trial') {
      renderTrial(body, dt, DR);
    }

    else if (numbersK === 'archive') {
      var sum = DR.summary();
      function span(o) {
        return o.count ? o.oldest.date + ' to ' + o.latest.date : '—';
      }
      body.innerHTML =
        block('Archive', 'stored on this device',
          rows([
            ['4D draws', sum.fourD.count + (sum.fourD.count ? ' <small>' + span(sum.fourD) +
              '</small><small>latest ' + sum.fourD.latest.first + ' / ' +
              (sum.fourD.latest.second||'') + ' / ' + (sum.fourD.latest.third||'') + '</small>' : '')],
            ['TOTO draws', sum.toto.count + (sum.toto.count ? ' <small>' + span(sum.toto) +
              '</small><small>latest ' + sum.toto.latest.numbers.join(', ') + ' + ' +
              sum.toto.latest.additional + '</small>' : '')],
            ['Last updated', sum.fourD.synced || sum.toto.synced
              ? ((sum.fourD.synced || sum.toto.synced).slice(0,10) + ' <small>' +
                 (sum.fourD.source || sum.toto.source) + '</small>') : 'never']
          ])) +

        block('Load the full history', 'every prize-winning number since 31 May 1986',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
          'Downloads the community dataset directly from GitHub — around 5,500 4D draws and ' +
          '3,000 TOTO draws. About 2.8 MB for 4D, so use Wi-Fi the first time. Draws already ' +
          'stored are skipped.<br><br>' +
          '<a href="' + DR.REPO_URL + '" style="color:var(--brass)">' + DR.REPO_URL + '</a></div>' +
          '<div class="two" style="margin-top:12px">' +
          '<button class="btn" id="ghToto">Get TOTO history</button>' +
          '<button class="btn" id="gh4d">Get 4D history</button></div>' +
          '<div class="err" id="ghMsg"></div>') +

        block('Add the latest draws', 'from the official results pages',
          '<div class="notice">Singapore Pools sends no cross-origin header, so no app or browser ' +
          'can read its results pages directly — that is their server\'s policy, not a fault here. ' +
          'The bundled Python scraper runs outside the browser where that restriction does not ' +
          'apply. It writes CSV in exactly the format below.</div>' +
          '<div class="panel" style="margin-top:10px;font-size:.86rem;line-height:1.8">' +
          '<b style="color:var(--brass)">tools/sp_scraper.py</b><br>' +
          '<code style="color:var(--muted)">pip install requests beautifulsoup4 pandas lxml</code><br>' +
          '<code style="color:var(--muted)">python sp_scraper.py --game both --last 20</code><br><br>' +
          'Then paste the CSV it writes into the box below. You can also copy the results table ' +
          'straight off the Singapore Pools page — that is understood too.<br><br>' +
          '<a href="' + DR.OFFICIAL.fourD + '" style="color:var(--brass)">4D results page</a> &middot; ' +
          '<a href="' + DR.OFFICIAL.toto + '" style="color:var(--brass)">TOTO results page</a></div>' +
          '<div class="panel" style="margin-top:10px">' +
          '<label for="impKind">Which draw</label>' +
          '<select id="impKind"><option value="toto">TOTO</option><option value="4d">4D</option></select>' +
          '<label for="impText">CSV or pasted results</label>' +
          '<textarea id="impText" rows="7" style="width:100%;padding:11px;background:var(--raised);' +
          'border:1px solid var(--line);border-radius:3px;color:var(--rice);font-family:var(--serif);' +
          'font-size:.88rem" placeholder="draw_number,number,date&#10;4199,\"[\'14\', \'22\', ...]\",2026/07/13"></textarea>' +
          '<div class="err" id="impMsg"></div>' +
          '<button class="btn" id="impGo">Import</button>' +
          '<button class="btn ghost" id="impClear">Clear stored results for this game</button></div>') +

        block('Stored draws', '', '<div id="drawList"></div>');

      function stage(msg) { var m = $('ghMsg'); m.style.color = 'var(--muted)'; m.textContent = msg; }
      function pull(kind, btn) {
        var label = btn.textContent;
        btn.textContent = 'Working…'; btn.disabled = true;
        DR.fetchDataset(kind, stage).then(function (r) {
          var m = $('ghMsg'); m.style.color = 'var(--celadon)';
          m.textContent = 'Read ' + r.parsed + ' draws, ' + r.added + ' new. ' + r.total + ' stored.' +
            (r.trimmed ? ' Storage was full so only the most recent were kept.' : '');
          btn.textContent = label; btn.disabled = false;
          paintDraws(); renderNumbers();
        }).catch(function (e) {
          var m = $('ghMsg'); m.style.color = 'var(--cinnabar)'; m.textContent = e.message;
          btn.textContent = label; btn.disabled = false;
        });
      }
      $('ghToto').onclick = function () { pull('toto', $('ghToto')); };
      $('gh4d').onclick = function () { pull('fourD', $('gh4d')); };

      $('impGo').onclick = function () {
        var r = DR.importText($('impKind').value, $('impText').value);
        var m = $('impMsg');
        if (r.error) { m.style.color = 'var(--cinnabar)'; m.textContent = r.error; return; }
        m.style.color = 'var(--celadon)';
        m.textContent = 'Read ' + r.parsed + ' draws, ' + r.added + ' new. ' + r.total + ' stored.';
        paintDraws();
      };
      $('impClear').onclick = function () {
        if (!window.confirm('Clear all stored ' + $('impKind').value.toUpperCase() + ' results?')) return;
        DR.clear($('impKind').value); renderNumbers();
      };
      $('impKind').onchange = paintDraws;
      paintDraws();

      function paintDraws() {
        var kind = $('impKind') ? $('impKind').value : 'toto';
        var list = kind === 'toto' ? DR.drawsToto() : DR.draws4D();
        $('drawList').innerHTML = list.length
          ? '<div class="rows">' + list.slice(0, 30).map(function (r) {
              return '<div class="row"><span class="k">' + r.date +
                (r.drawNumber ? ' <small style="color:var(--muted)">#' + r.drawNumber + '</small>' : '') +
                '</span><span class="v">' +
                (r.numbers ? r.numbers.join(', ') + ' <small>+ ' + r.additional + '</small>'
                           : r.first + ' <small>' + (r.second||'') + ' / ' + (r.third||'') +
                             ' · ' + r.prizes.length + ' prizes</small>') +
                '</span></div>';
            }).join('') + '</div>' +
            (list.length > 30 ? '<div class="hint">Showing the 30 most recent of ' +
              list.length + '.</div>' : '')
          : '<div class="empty">Nothing stored yet for this game.</div>';
      }
    }

    else {
      var freq = DR.totoFrequency(numbersEra);
      var four = DR.fourDFrequency();
      if (!freq.draws && !four.draws) {
        body.innerHTML = block('Analysis', 'needs imported results',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">Import some past results on ' +
          'the previous tab first. Analysis needs an archive to work from.</div>');
        return;
      }
      var bt = DR.backtest(function (d) { return G.numbersFor(d, user); }, 'toto', 200);
      var maxCount = Math.max.apply(null, freq.rows.map(function (r) { return r.count; })) || 1;
      lastSavedId = null; currentAI = null;

      var eraBtns = (freq.eras && freq.eras.length > 1)
        ? '<div class="chips">' + freq.eras.map(function (e) {
            return '<button class="chip" data-era="' + e.id + '"' +
              (freq.era.id === e.id ? ' aria-selected="true"' : '') + '>' + e.label + '</button>';
          }).join('') + '</div>'
        : '';

      body.innerHTML =
        block('What the archive shows', freq.draws + ' Toto draws' +
          (freq.span ? ' · ' + freq.span.from + ' to ' + freq.span.to : ''),
          eraBtns +
          ((freq.eras && freq.eras.length > 1) ?
            '<div class="panel" style="font-size:.86rem;line-height:1.7;margin-bottom:10px">' +
            '<b style="color:var(--brass)">Why the archive is split.</b> Singapore TOTO changed from ' +
            '6-from-45 to 6-from-49 in October 2014. Counting both periods together would make 46 to ' +
            '49 look ice-cold purely because they did not exist yet, and would make a fair draw look ' +
            'rigged. Each format is therefore analysed on its own.</div>' : '') +
          '<div class="notice"><b>Before reading this.</b> Every number has the same chance in the ' +
          'next draw regardless of how often it has appeared. Past frequency cannot raise your odds ' +
          '— that belief is the gambler\'s fallacy. The one real effect of number choice is on ' +
          '<em>sharing</em>: popular combinations get split more often when they win. The figures ' +
          'below describe what has happened, not what will.</div>' +
          rows([
            ['Format', '6 from ' + freq.pool + ' <small>' + freq.era.label + '</small>'],
            ['Draws recorded', freq.draws],
            ['Expected per number', freq.expected.toFixed(2) + ' <small>if perfectly random</small>'],
            ['Standard deviation', freq.sd.toFixed(2)],
            ['Largest deviation seen', freq.maxZ.toFixed(2) + ' sd <small>' +
              (freq.maxZ < 3 ? 'within ordinary random variation' :
               'large, but expected somewhere across 49 numbers') + '</small>'],
            ['Chi-square test', freq.chiSquare.toFixed(1) + ' on ' + freq.chiDf +
              ' df <small>5% threshold ' + freq.chiCrit5.toFixed(1) + ' · ' +
              freq.chiVerdict + '</small>']
          ])) +
        block('Most and least seen', 'observed counts, not predictions',
          '<div class="rows">' + freq.hot.map(function (r) {
            return '<div class="row"><span class="k">' + r.n + '</span><span class="v" style="flex:1">' +
              '<div class="meter good"><i style="width:' + Math.round(r.count/maxCount*100) + '%"></i></div>' +
              '<small>' + r.count + ' times · ' + (r.z>=0?'+':'') + r.z.toFixed(2) + ' sd</small></span></div>';
          }).join('') + '</div>' +
          '<div class="hint">Least seen: ' + freq.cold.map(function (r) {
            return r.n + ' (' + r.count + ')'; }).join(', ') + '</div>') +
        (bt && bt.checked ? block('How the chart-derived numbers actually did',
          'measured against your archive',
          rows([
            ['Draws checked', bt.checked],
            ['Sets matching 3+ numbers', bt.hits + ' <small>' + (bt.rate*100).toFixed(1) + '%</small>'],
            ['Match distribution', Object.keys(bt.matchDist).sort().map(function (k) {
              return k + ' match: ' + bt.matchDist[k]; }).join(' · ') || '—']
          ]) +
          '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7;color:var(--muted)">' +
          'This is a factual hit rate, shown so the derivation is not mistaken for a method that ' +
          'works. Random sets would score about the same.</div>') : '') +
        (four.draws ? block('4D digit frequency',
          four.draws + ' draws · ' + four.numbers.toLocaleString() + ' prize numbers' +
          (four.span ? ' · ' + four.span.from + ' to ' + four.span.to : ''),
          '<div class="rows">' + [0,1,2,3].map(function (pos) {
            var row = four.positions[pos];
            return '<div class="row"><span class="k">Position ' + (pos+1) + '</span><span class="v">' +
              '<small>' + row.map(function (c, dg) {
                return dg + ':' + c; }).join('  ') + '</small>' +
              '<small style="color:var(--muted)">expected ' +
              Math.round(four.expectedPerDigit).toLocaleString() + ' each</small></span></div>';
          }).join('') + '</div>' +
          (four.topPrizeRepeats && four.topPrizeRepeats.length ?
            '<div class="panel" style="margin-top:10px;font-size:.86rem;line-height:1.7">' +
            '<b style="color:var(--brass)">Most repeated top-three numbers</b><br>' +
            four.topPrizeRepeats.map(function (r) {
              return r.n + ' (' + r.count + ')'; }).join(' &middot; ') +
            '<br><span style="color:var(--muted)">Across ' + four.draws.toLocaleString() +
            ' draws a handful of repeats is exactly what chance produces — with 10,000 possible ' +
            'numbers and three top prizes per draw, some will recur.</span></div>' : '')) : '') +
        block('AI review of the archive', '', '<div id="aiDraws"></div>');

      body.querySelectorAll('[data-era]').forEach(function (b) {
        b.onclick = function () { numbersEra = b.dataset.era; renderNumbers(); };
      });

      // Prediction against actual, replayed over the archive.
      var led = DR.ledger(function (d) { return G.numbersFor(d, user); }, 'toto', 300);
      var led4 = DR.ledger(function (d) { return G.numbersFor(d, user); }, '4d', 300);

      function ledgerBlock(L, title, note) {
        if (!L || !L.checked) return '';
        var st = L.stats;
        var gap = st.observedRate - st.chanceRate;
        var cls = Math.abs(st.z) < 2 ? '' : st.z > 0 ? 'good' : 'bad';
        return block(title, note,
          rows([
            ['Draws replayed', L.checked],
            ['What chance predicts', (st.chanceRate * 100).toFixed(2) + '%' +
              (st.expectedMatch ? ' <small>' + st.expectedMatch.toFixed(2) +
               ' numbers matched per draw</small>' : '')],
            ['What the app achieved', (st.observedRate * 100).toFixed(2) + '%' +
              ' <small>' + L.hits + ' of ' + L.checked + '</small>'],
            ['Difference', (gap >= 0 ? '+' : '') + (gap * 100).toFixed(2) +
              ' points <small>z = ' + st.z.toFixed(2) + '</small>'],
            ['Verdict', '<b style="color:' + (cls === 'good' ? 'var(--brass)'
              : cls === 'bad' ? 'var(--cinnabar)' : 'var(--muted)') + '">' +
              st.verdict + '</b>']
          ]) +
          (L.dist && Object.keys(L.dist).length
            ? '<div class="panel" style="margin-top:10px;font-size:.86rem;line-height:1.8">' +
              '<b style="color:var(--brass)">How many numbers matched, per draw</b><br>' +
              Object.keys(L.dist).sort().map(function (k) {
                return k + ' matched: ' + L.dist[k] + ' draws'; }).join(' &middot; ') + '</div>'
            : '') +
          '<div class="rows" style="margin-top:10px">' + L.rows.slice(0, 10).map(function (r) {
            var hit = r.matchCount > 0;
            return '<div class="row"><span class="k">' + r.date +
              '<br><small style="color:var(--muted)">' + (hit ? r.matchCount + ' matched' : 'no match') +
              '</small></span><span class="v">' +
              '<small>predicted ' + (r.predicted || []).join(', ') + '</small>' +
              '<small style="color:var(--muted)">actual ' + (r.actual || []).join(', ') +
              (r.additional !== undefined ? ' + ' + r.additional : '') + '</small></span></div>';
          }).join('') + '</div>' +
          '<div class="hint">Showing the 10 most recent of ' + L.rows.length + ' replayed.</div>');
      }

      body.innerHTML += ledgerBlock(led, 'Prediction versus actual — Toto',
        'the app\'s own numbers replayed against every stored draw') +
        ledgerBlock(led4, 'Prediction versus actual — 4D', 'same method, 4 sets per draw') +
        block('What this comparison is for', '',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' +
          'This is the honest test of the number derivation, and it is the reason it exists on ' +
          'this screen. If the chart-derived numbers carried any predictive power they would beat ' +
          'the chance baseline consistently and by a margin larger than sampling noise. ' +
          'The z-score is the measure: anything between roughly \u22122 and +2 is what random ' +
          'variation produces on its own. A single good run proves nothing — over a few hundred ' +
          'draws almost any method throws up a streak.</div>');

      aiPanel('aiDraws', 'draws',
        freq.era.id + '.' + String(freq.draws) + '.' + four.draws + '.' + (led ? led.checked : 0),
        function (cfg) { return window.QPAI.analyseDraws(cfg, freq, four, bt, led, led4); }, [
          { label:'What the archive shows', path:'reading' },
          { label:'Observed patterns', path:'patterns' },
          { label:'Prediction versus actual', path:'prediction' },
          { label:'Forecasting the next draw', path:'forecast' },
          { label:'Why frequency cannot improve your odds', path:'honesty' },
          { label:'What you can legitimately do', path:'method' }
        ]);
    }
  }

  /* ---------------- AI prompt refinements (Profile screen) ---------------- */
  // Stored per profile. Builds before 9.5 kept one set for the whole device; a profile with no
  // set of its own starts from that one.
  var PROMPTKEY = 'qipath.prompts.v1';
  function promptKey() { return PROMPTKEY + '.' + (user && user.id); }
  function loadPromptPrefs() {
    try {
      var raw = localStorage.getItem(promptKey());
      if (raw === null) raw = localStorage.getItem(PROMPTKEY);
      var p = JSON.parse(raw || 'null') || {};
      return { global: p.global || {}, keys: p.keys || {} };
    } catch (e) { return { global: {}, keys: {} }; }
  }
  function savePromptPrefs(p) {
    try { localStorage.setItem(promptKey(), JSON.stringify(p)); return true; } catch (e) { return false; }
  }

  function promptPrefsHtml() {
    var AI = window.QPAI, P = loadPromptPrefs(), reg = AI.promptRegistry();
    var personaOpts = function (sel) { return Object.keys(AI.PERSONAS).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + AI.PERSONAS[k].label + '</option>'; }).join(''); };
    return '<div class="panel" style="font-size:.88rem;line-height:1.7">Every reading is framed by four pillars: a ' +
      '<b>persona</b> (strategist, risk assessor, tactical planner, statistician — never a fortune teller), a <b>data ' +
      'anchor</b> (cite the exact coordinates, never invent), a <b>logic filter</b> (conflicts resolved by a signed, weighted ' +
      'ledger) and an <b>output schema</b> (Action / Window / Risk / Contingency). Adjust any reading below; a changed prompt ' +
      'regenerates instead of reusing a cached reading.</div>' +
      '<label for="ppGlobal">Refinement for every reading</label>' +
      '<textarea id="ppGlobal" rows="4" placeholder="e.g. Keep each field under 80 words. Write for a business reader.">' +
        esc((P.global || {}).note || '') + '</textarea><div id="ppGlobalMsg"></div>' +
      '<div class="rows" style="margin-top:10px">' + reg.map(function (r) {
        var k = (P.keys || {})[r.key] || {}, persona = k.persona || r.persona, changed = !!(k.persona || k.note || k.structured === false);
        return '<details class="pp" data-k="' + r.key + '"><summary><span>' + esc(r.label) + '</span><small>' +
          esc(AI.PERSONAS[persona].label) + (changed ? ' · refined' : '') + '</small></summary>' +
          '<label>Persona</label><select class="ppPersona">' + personaOpts(persona) + '</select>' +
          (r.structured ? '<label class="ck"><input type="checkbox" class="ppStruct"' + (k.structured === false ? '' : ' checked') +
            '> Action / Window / Risk / Contingency plan and conflict ledger</label>' :
            '<div class="hint">An extraction task: it returns the material, not a plan, so the output schema is not added.</div>') +
          '<label>Your refinement for this reading</label>' +
          '<textarea class="ppNote" rows="3" placeholder="e.g. Focus on career timing. Always name the direction to face.">' +
            esc(k.note || '') + '</textarea>' +
          '<div class="two"><button class="btn ghost ppPreview">Preview the frame</button>' +
          '<button class="btn ghost ppReset">Reset to default</button></div></details>';
      }).join('') + '</div>' +
      '<button class="btn" id="ppSave" style="margin-top:10px">Save prompt refinements</button><div id="ppMsg"></div>';
  }

  function wirePromptPrefs() {
    var AI = window.QPAI;
    function collect() {
      var P = { global: { note: ($('ppGlobal').value || '').trim() }, keys: {} };
      document.querySelectorAll('details.pp').forEach(function (d) {
        var key = d.dataset.k, reg = AI.promptRegistry().filter(function (r) { return r.key === key; })[0];
        var persona = d.querySelector('.ppPersona').value, st = d.querySelector('.ppStruct');
        var note = (d.querySelector('.ppNote').value || '').trim(), e = {};
        if (persona !== reg.persona) e.persona = persona;
        if (st && !st.checked) e.structured = false;
        if (note) e.note = note;
        if (Object.keys(e).length) P.keys[key] = e;
      });
      return P;
    }
    function commit(msgId) {
      var ok = savePromptPrefs(collect());
      $(msgId).innerHTML = ok ? '<div class="saved-tick">Saved to this profile. Readings using a changed prompt will regenerate.</div>'
                              : '<div class="err">Could not save — this browser is blocking storage.</div>';
    }
    $('ppSave').onclick = function () { commit('ppMsg'); };
    // Save as the user types, so leaving the tab never loses a refinement.
    var timer = null;
    function autoSave(e) {
      var msgId = e.target.id === 'ppGlobal' ? 'ppGlobalMsg' : 'ppMsg';
      clearTimeout(timer); timer = setTimeout(function () { commit(msgId); }, 600);
    }
    $('ppGlobal').addEventListener('input', autoSave);
    document.querySelectorAll('details.pp .ppNote').forEach(function (t) { t.addEventListener('input', autoSave); });
    document.querySelectorAll('details.pp .ppPersona, details.pp .ppStruct').forEach(function (x) {
      x.addEventListener('change', autoSave); });
    document.querySelectorAll('details.pp').forEach(function (d) {
      d.querySelector('.ppPreview').onclick = function () {
        var prev = loadPromptPrefs();
        savePromptPrefs(collect());              // preview what is on screen ...
        var text = AI.framePreview(d.dataset.k);
        savePromptPrefs(prev);                   // ... without committing it
        openSheet('Prompt frame', esc(d.querySelector('summary span').textContent),
          '<div class="script" style="white-space:pre-wrap;font-size:.8rem">' + esc(text) + '</div>');
      };
      d.querySelector('.ppReset').onclick = function () {
        var key = d.dataset.k, reg = AI.promptRegistry().filter(function (r) { return r.key === key; })[0];
        d.querySelector('.ppPersona').value = reg.persona;
        var st = d.querySelector('.ppStruct'); if (st) st.checked = true;
        d.querySelector('.ppNote').value = '';
        commit('ppMsg');
      };
    });
  }

  /* ---------------- AI config ---------------- */
  var AIKEY = 'qipath.ai.v1';
  function loadAI() {
    var cfg;
    try { cfg = JSON.parse(localStorage.getItem(AIKEY) || 'null'); } catch (e) { cfg = null; }
    if (!cfg) cfg = { provider: 'gemini', model: '', key: '', models: null };
    if (cfg.provider !== 'gemini' && cfg.provider !== 'claude') cfg.provider = 'gemini';
    // A model persisted by an older build may no longer be offered. Left alone it silently
    // breaks every analysis while the dropdown displays something else entirely.
    // Only reconcile against a list the key itself reported. The built-in list is a guess,
    // and letting it overwrite a model the key genuinely offers is how a working setup breaks.
    if (cfg.models && cfg.models.length && cfg.model && cfg.models.indexOf(cfg.model) < 0) {
      cfg.model = window.QPAI.rankOrder(cfg.models)[0];
      saveAI(cfg);
    }
    if (!cfg.model) cfg.model = window.QPAI.PROVIDERS[cfg.provider].defaultModel;
    return cfg;
  }
  function saveAI(cfg) {
    try { localStorage.setItem(AIKEY, JSON.stringify(cfg)); return true; }
    catch (e) { return false; }   // private mode, or a file:// origin with storage disabled
  }
  function aiReady() { var c = loadAI(); return !!(c && c.key); }

  /*
   * Narration. Speech comes from Google, so someone using Claude for readings adds a Gemini key
   * here. ctx.spoken is the text to read; a saved record passes readOnly and only plays.
   */
  var TTSKEY = 'qipath.tts.key', narrBusy = null, narrRedraw = null;
  function ttsKey() {
    var c = loadAI();
    if (c.provider === 'gemini' && c.key) return c.key;
    try { return localStorage.getItem(TTSKEY) || ''; } catch (e) { return ''; }
  }
  function narrClock(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function narrationUI(hostId, ctx) {
    var N = window.QPNarrate, host = $(hostId);
    if (!host) return;
    var thisHash = N.hash(ctx.script), queue = [], current = null, triedMemory = false;
    function say(html) { var m = $(hostId + '-msg'); if (m) m.innerHTML = html; }
    function items() {
      var all = N.list(user.id).filter(function (x) { return !ctx.readOnly || x.kind === 'sage' || x.scriptHash === thisHash; });
      function rank(x) { return x.kind === 'sage' ? 0 : x.scriptHash === thisHash ? 1 : 2; }
      return all.sort(function (a, b) { return rank(a) - rank(b) || (a.made < b.made ? 1 : -1); });
    }
    function byKind(kind) {
      return items().filter(function (x) { return x.kind === kind && (kind === 'sage' || x.scriptHash === thisHash); })[0] || null;
    }
    function playNext() {
      var el = $(hostId + '-audio');
      current = queue.shift() || null;
      if (!current || !el) { N.keepAwake(false); return; }
      triedMemory = false;
      say('Playing: ' + esc(current.title));
      N.source(current).then(function (src) {
        el.src = src;
        return el.play();
      }).catch(function (e) { if (e && e.name !== 'AbortError' && e.name !== 'NotAllowedError') say(esc(e.message || 'That audio could not be played.')); });
    }
    function playList(list) { queue = list.slice(); N.keepAwake(true); playNext(); }
    function create(kind) {
      if (narrBusy) { say('Audio is already being created. Please wait for it to finish.'); return; }
      var key = ttsKey();
      if (!key) { say('Add a Google Gemini key first.'); return; }
      var p = N.prefs(), started = kind === 'sage' ? 'Sage 64 to 1' : 'this script';
      narrBusy = kind;
      function speak(text, style) {
        return window.QPAI.speech(key, text, { voice: p.voice, style: style, onWait: function (s) {
          say('Google asked for a pause on this key. Continuing in about ' + s + ' seconds.'); } });
      }
      function step(i, n, what) { say('Creating ' + started + ': part ' + i + ' of ' + n + ', ' + esc(what) + '. Keep the app open.'); }
      var job = kind === 'sage' ? N.makeSage(speak, { pace: p.pace, onStep: step }) : N.makeScript(speak, ctx.spoken, { onStep: step });
      draw();
      job.then(function (out) {
        return N.store(user.id, { kind: kind, voice: p.voice, pace: kind === 'sage' ? p.pace : null, seconds: out.seconds, exact: out.exact,
          title: kind === 'sage' ? 'Sage 64 to 1' : 'Script ' + ctx.title, scriptHash: kind === 'sage' ? null : thisHash }, out.bytes);
      }).then(function (item) {
        narrBusy = null;
        if (narrRedraw) narrRedraw();
        var m = $(narrRedraw && narrRedraw.hostId + '-msg');
        if (m) m.innerHTML = '<span class="good-t">Saved on this device (' + narrClock(item.seconds) + ').</span>' +
          (item.exact ? '' : ' The app could not confirm that every number was spoken. Listen through once, and recreate it if one was skipped.');
      }, function (e) {
        narrBusy = null;
        if (narrRedraw) narrRedraw();
        var m = $(narrRedraw && narrRedraw.hostId + '-msg');
        if (m) m.innerHTML = '<span class="bad-t">' + esc(e.message || 'The audio could not be created.') + '</span>';
      });
    }
    function draw() {
      if (!$(hostId)) return;
      var p = N.prefs(), list = items(), sage = byKind('sage'), mine = byKind('script'), key = ttsKey();
      var html = '';
      if (!ctx.readOnly) {
        html += '<div class="panel">' +
          (key ? '' : '<label for="' + hostId + '-key">Google Gemini key for narration</label>' +
            '<input id="' + hostId + '-key" type="password" autocomplete="off" placeholder="AIza...">' +
            '<button class="btn ghost" id="' + hostId + '-keysave">Save this key</button>' +
            '<div class="hint">Narration uses Google voices, and Claude has no speech model. The key stays on this device.</div>') +
          '<label for="' + hostId + '-voice">Voice</label><select id="' + hostId + '-voice">' + N.VOICES.map(function (v) {
            return '<option value="' + v.id + '"' + (v.id === p.voice ? ' selected' : '') + '>' + esc(v.label) + '</option>'; }).join('') + '</select>' +
          '<label for="' + hostId + '-pace">Pace of the count</label><select id="' + hostId + '-pace">' + N.PACES.map(function (v) {
            return '<option value="' + v.s + '"' + (v.s === p.pace ? ' selected' : '') + '>' + esc(v.label) + '</option>'; }).join('') + '</select>' +
          '<button class="btn" id="' + hostId + '-sage"' + (narrBusy ? ' disabled' : '') + '>' + (sage ? 'Recreate' : 'Create') + ' the Sage 64 to 1 audio</button>' +
          '<button class="btn" id="' + hostId + '-script"' + (narrBusy ? ' disabled' : '') + '>' + (mine ? 'Recreate' : 'Create') + ' narration of this script</button>' +
          '<div class="hint">Each creation uses your own Google quota. The Sage count is made once and reused for every script. ' +
          'Do not listen while driving or using machinery.</div></div>';
      }
      html += '<div id="' + hostId + '-msg" class="hint" aria-live="polite"></div>' +
        '<audio id="' + hostId + '-audio" controls style="width:100%;margin-top:10px' + (list.length ? '' : ';display:none') + '"></audio>';
      if (sage && mine) html += '<button class="btn" id="' + hostId + '-both" style="margin-top:10px">Play Sage 64 to 1, then this script</button>';
      if (list.length) {
        html += '<div class="panel" style="margin-top:10px">' + list.map(function (x, i) {
          return '<div style="padding:8px 0;' + (i ? 'border-top:1px solid var(--line)' : '') + '"><div style="font-size:.9rem;overflow-wrap:anywhere">' + esc(x.title) + '</div>' +
            '<div style="font-size:.76rem;color:var(--muted)">' + narrClock(x.seconds) + ' · ' + (x.bytes / 1048576).toFixed(1) + ' MB · ' + esc(x.voice) + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:6px">' +
            '<button class="btn ghost" data-nplay="' + i + '" style="flex:1;margin-top:0">Play</button>' +
            '<button class="btn ghost" data-nshare="' + i + '" style="flex:1;margin-top:0">Share</button>' +
            '<button class="btn ghost" data-ndel="' + i + '" style="flex:1;margin-top:0">Delete</button></div></div>';
        }).join('') + '</div>';
      }
      host.innerHTML = html;
      if (narrBusy) say('Audio is being created. Keep the app open.');
      var el = $(hostId + '-audio');
      el.onended = playNext;
      el.onpause = function () { if (!queue.length && el.ended) N.keepAwake(false); };
      // Leaving the screen removes the player, and audio must not carry on with no way to stop it.
      el.ontimeupdate = function () { if (!document.contains(el)) { el.pause(); N.keepAwake(false); } };
      el.onerror = function () {
        if (!current || triedMemory || !el.getAttribute('src')) return;
        triedMemory = true;
        N.sourceInMemory(current).then(function (src) { el.src = src; return el.play(); }).catch(function (e) {
          say(esc(e.message || 'That audio could not be played.')); });
      };
      if (!ctx.readOnly) {
        $(hostId + '-voice').onchange = function () { p.voice = this.value; N.setPrefs(p); };
        $(hostId + '-pace').onchange = function () { p.pace = parseInt(this.value, 10); N.setPrefs(p); };
        $(hostId + '-sage').onclick = function () { create('sage'); };
        $(hostId + '-script').onclick = function () { create('script'); };
        if ($(hostId + '-keysave')) $(hostId + '-keysave').onclick = function () {
          var v = $(hostId + '-key').value.trim();
          if (!v) return;
          try { localStorage.setItem(TTSKEY, v); } catch (e) { /* storage is off */ }
          draw();
        };
      }
      if ($(hostId + '-both')) $(hostId + '-both').onclick = function () { playList([sage, mine]); };
      host.querySelectorAll('[data-nplay]').forEach(function (b) { b.onclick = function () { playList([list[+b.dataset.nplay]]); }; });
      host.querySelectorAll('[data-nshare]').forEach(function (b) { b.onclick = function () {
        N.share(list[+b.dataset.nshare]).catch(function (e) { if (e && !/cancel/i.test(e.message || '')) say(esc(e.message || 'That audio could not be shared.')); }); }; });
      host.querySelectorAll('[data-ndel]').forEach(function (b) { b.onclick = function () {
        var x = list[+b.dataset.ndel];
        if (!window.confirm('Delete the audio "' + x.title + '"? This cannot be undone.')) return;
        N.remove(x).then(draw); }; });
    }
    draw.hostId = hostId;
    if (!ctx.readOnly) narrRedraw = draw;
    draw();
  }

  /*
   * AI readings are kept on the device (localStorage, which survives the app being closed), per
   * profile, reading kind and stamp. Regenerating adds a version instead of replacing one; the last
   * NARR_KEEP versions are kept so earlier readings can be called up. Each version records the prompt
   * signature it was written under, so a reading from older prompt settings is still shown, marked.
   * If storage fills up, the readings written longest ago are dropped first.
   */
  var NARR_PREFIX = 'qipath.ai.', NARR_KEEP = 5;
  function narrKey(kind, stamp) { return NARR_PREFIX + user.id + '.' + kind + '.' + stamp; }
  function curSig(kind) { try { return window.QPAI.promptSig(kind); } catch (e) { return ''; } }
  function loadNarrEntry(kind, stamp) {
    try {
      var e = JSON.parse(localStorage.getItem(narrKey(kind, stamp)) || 'null');
      return e && e.versions && e.versions.length ? e : null;
    } catch (err) { return null; }
  }
  function loadNarr(kind, stamp) {
    var e = loadNarrEntry(kind, stamp);
    return e ? e.versions[e.versions.length - 1].data : null;
  }
  function persistNarr(key, entry) {
    var text = JSON.stringify(entry);
    for (var tries = 0; tries < 25; tries++) {
      try { localStorage.setItem(key, text); return true; }
      catch (err) { if (!evictOldestNarr(key)) return false; }
    }
    return false;
  }
  // Drop the reading (all its versions) written longest ago, never the one being saved.
  function evictOldestNarr(keep) {
    var oldest = null, oldestAt = null;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(NARR_PREFIX) !== 0 || k === keep) continue;
      var at = '';
      try { var e = JSON.parse(localStorage.getItem(k)); at = e.versions[e.versions.length - 1].at || ''; } catch (err) { at = ''; }
      if (oldestAt === null || at < oldestAt) { oldest = k; oldestAt = at; }
    }
    if (!oldest) return false;
    localStorage.removeItem(oldest);
    return true;
  }
  function saveNarr(kind, stamp, v) {
    var key = narrKey(kind, stamp), entry = loadNarrEntry(kind, stamp) || { kind: kind, stamp: stamp, versions: [] };
    var last = entry.versions[entry.versions.length - 1];
    if (last && JSON.stringify(last.data) === JSON.stringify(v)) return true;
    entry.versions.push({ data: v, at: new Date().toISOString(), sig: curSig(kind) });
    if (entry.versions.length > NARR_KEEP) entry.versions = entry.versions.slice(-NARR_KEEP);
    return persistNarr(key, entry);
  }
  function narrStats() {
    var n = 0, versions = 0, bytes = 0, mine = NARR_PREFIX + user.id + '.';
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(mine) !== 0) continue;
      var raw = localStorage.getItem(k) || ''; bytes += raw.length * 2; n++;
      try { versions += JSON.parse(raw).versions.length; } catch (e) {}
    }
    return { readings: n, versions: versions, kb: Math.round(bytes / 1024) };
  }
  function clearNarr() {
    var mine = NARR_PREFIX + user.id + '.', ks = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(mine) === 0) ks.push(k); }
    ks.forEach(function (k) { localStorage.removeItem(k); });
    return ks.length;
  }
  function fmtAt(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' +
    pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  // The bar above a reading: when it was written, which version, and a picker for earlier ones.
  function versionBarHtml(hostId, kind, entry, vi) {
    if (!entry) return '';
    var n = entry.versions.length, v = entry.versions[vi], latest = vi === n - 1;
    return '<div class="hint" style="margin:0 0 8px">' + (latest ? 'Written ' : 'Earlier version, kept for reference — written ') +
      fmtAt(v.at) + (n > 1 ? ' &middot; version ' + (vi + 1) + ' of ' + n + ' <select id="' + hostId + '-ver" style="width:auto;display:inline-block;padding:2px 6px;margin-left:6px">' +
        entry.versions.map(function (x, i) { return '<option value="' + i + '"' + (i === vi ? ' selected' : '') + '>v' + (i + 1) + ' · ' + fmtAt(x.at) + '</option>'; }).reverse().join('') +
        '</select>' : '') +
      (!latest ? ' <a href="#" id="' + hostId + '-latest">Back to the latest</a>' : '') +
      (v.sig && v.sig !== curSig(kind) ? '<br><span style="color:var(--brass)">Written before your prompt settings changed. Regenerate for a reading with the current settings.</span>' : '') +
      '</div>';
  }

  // Which Learn-tab notes the AI was given for this reading.
  function notesUsedHtml(data) {
    var n = data && data._notes;
    if (!n) return '';
    var M = window.QPLibrary.MODULES || {};
    return '<div class="panel" style="font-size:.82rem;line-height:1.6;color:var(--muted)">' +
      '<div style="color:var(--brass);margin-bottom:4px">Your notes used (' + n.length + ')</div>' +
      (n.length ? n.map(function (x) {
        return '&middot; ' + esc(x.title) + ' <small>' + esc((M[x.module] || {}).label || x.module) + '</small>';
      }).join('<br>') : 'None of your Learn notes matched this reading.') + '</div>';
  }

  // Renders a generate-button / result panel for an AI narrative.
  // Action / Window / Risk / Contingency cards, from the prompt framework's output schema.
  function actionPlanHtml(data) {
    var ap = data && data.actionPlan;
    if (!Array.isArray(ap) || !ap.length) return '';
    return '<div class="panel aplan"><div style="font-size:.82rem;color:var(--brass);margin-bottom:8px">Action plan</div>' +
      ap.map(function (a, i) {
        return '<div class="ap"><span class="n">' + (i + 1) + '</span><div>' +
          '<b>' + esc(a.action || '') + '</b>' +
          '<div class="apw"><i>Window</i>' + esc(a.window || '—') + '</div>' +
          '<div class="apr"><i>Risk</i>' + esc(a.risk || '—') + '</div>' +
          '<div class="apc"><i>Contingency</i>' + esc(a.contingency || '—') + '</div></div></div>';
      }).join('') + '</div>';
  }
  function conflictsHtml(data) {
    var c = data && data.conflicts;
    if (!Array.isArray(c) || !c.length) return '';
    return '<div class="panel"><div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">Conflict ledger</div>' +
      '<div style="font-size:.86rem;line-height:1.7">' + c.map(function (x) {
        var t = typeof x === 'string' ? x : JSON.stringify(x);
        return /^\s*NET/i.test(t) ? '<b>' + esc(t) + '</b>' : esc(t); }).join('<br>') + '</div></div>';
  }

  function aiPanel(hostId, kind, stamp, runner, sections, onCached) {
    var host = $(hostId);
    if (!host) return;
    var cached = loadNarr(kind, stamp);
    if (cached && onCached) onCached(cached);

    function paint(data, vi) {
      var entry = loadNarrEntry(kind, stamp);
      if (entry && (vi === undefined || !entry.versions[vi])) vi = entry.versions.length - 1;
      host.innerHTML = versionBarHtml(hostId, kind, entry, vi) + actionPlanHtml(data) + sections.map(function (s) {
        var v = data;
        s.path.split('.').forEach(function (k) { v = v ? v[k] : null; });
        if (!v) return '';
        var head = '<div style="font-size:.82rem;color:var(--brass);margin-bottom:6px">' +
                   s.label + '</div>';
        // Some sections come back as a list of objects rather than a paragraph.
        if (Array.isArray(v)) {
          if (!v.length) return '';
          if (s.list === 'cure') {
            return '<div class="panel">' + head + v.map(function (c, i) {
              return '<div class="cure-rank"><span class="n">' + (c.rank || i + 1) + '</span>' +
                '<span class="t"><b>' + esc(c.issue || '') + '</b>' +
                '<span class="meta">' + esc(c.sector || '') +
                (c.element ? ' &middot; ' + esc(c.element) : '') +
                (c.cost ? ' &middot; ' + esc(c.cost) : '') + '</span>' +
                '<p>' + esc(c.cure || '') + '</p>' +
                (c.avoid ? '<div class="av">Avoid: ' + esc(c.avoid) + '</div>' : '') +
                '</span></div>';
            }).join('') + '</div>';
          }
          if (s.list === 'areas') {
            return '<div class="panel">' + head + '<div class="stack-sm">' + rows(v.map(function (x) {
              return ['<span>' + esc(x.area || '') + '</span>', '<div class="plain">' + esc(x.outlook || '') +
                (x.advice ? '<div class="todo"><b>What to do:</b> ' + esc(x.advice) + '</div>' : '') + '</div>'];
            })) + '</div></div>';
          }
          if (s.list === 'room') {
            return '<div class="panel">' + head + '<div class="rows">' + v.map(function (r) {
              var col = r.severity === 'problem' ? 'var(--cinnabar)'
                      : r.severity === 'good' ? 'var(--celadon)' : 'var(--brass)';
              return '<div class="row"><span class="k" style="flex:0 0 34%">' +
                esc(r.room || '') + '<br><small style="color:' + col + '">' +
                esc(r.sector || '') + ' &middot; ' + esc(r.severity || '') + '</small></span>' +
                '<span class="v"><small style="white-space:pre-wrap">' +
                esc(r.assessment || '') + '</small></span></div>';
            }).join('') + '</div></div>';
          }
          return '<div class="panel">' + head +
            '<div style="font-size:.9rem;line-height:1.75">' +
            v.map(function (x) { return esc(typeof x === 'string' ? x : JSON.stringify(x)); })
             .join('<br>') + '</div></div>';
        }
        return '<div class="panel">' + head +
          '<div style="font-size:.9rem;line-height:1.75;white-space:pre-wrap">' +
          esc(v) + '</div></div>';
      }).join('') +
      conflictsHtml(data) + notesUsedHtml(data) +
      '<button class="btn ghost" id="' + hostId + '-again">Regenerate</button>' +
      (entry ? '<div class="hint">Regenerating keeps this reading: earlier versions stay in the picker above (the last ' + NARR_KEEP + ').</div>' : '');
      $(hostId + '-again').onclick = function () { run(true); };
      if ($(hostId + '-ver')) $(hostId + '-ver').onchange = function () {
        var i = +this.value; paint(entry.versions[i].data, i); };
      if ($(hostId + '-latest')) $(hostId + '-latest').onclick = function (e) {
        e.preventDefault(); paint(entry.versions[entry.versions.length - 1].data); };
    }

    function run(force) {
      if (!aiReady()) {
        host.innerHTML = '<div class="panel"><div style="font-size:.9rem;line-height:1.7">' +
          'Add a Gemini or Claude API key on the Profile screen to generate a written reading of this chart.' +
          '</div><button class="btn ghost" id="' + hostId + '-go">Open Profile</button></div>';
        $(hostId + '-go').onclick = function () { show('profile'); };
        return;
      }
      if (!force) {
        var c = loadNarr(kind, stamp);
        if (c) { paint(c); return; }
      }
      host.innerHTML = '<div class="panel"><div class="empty">Writing the analysis. ' +
        'This takes a few seconds.</div><div class="meter"><i style="width:40%"></i></div></div>';
      runner(loadAI()).then(function (data) {
        saveNarr(kind, stamp, data); if (onCached) onCached(data); paint(data);
      }).catch(function (err) {
        host.innerHTML = '<div class="notice"><b>The analysis did not run.</b><br>' +
          esc(err.message) + '</div><button class="btn ghost" id="' + hostId + '-retry">Try again</button>';
        $(hostId + '-retry').onclick = function () { run(true); };
      });
    }

    if (cached) { paint(cached); return; }
    host.innerHTML = '<div class="panel"><div style="font-size:.9rem;line-height:1.7;color:var(--muted)">' +
      'Generate a written reading of this chart using your own API key.</div>' +
      '<button class="btn" id="' + hostId + '-run">Write the analysis</button></div>';
    $(hostId + '-run').onclick = function () { run(true); };
  }



  /* ---------------- feng shui: shared state ---------------- */
  var FS = window.QPFengShui, PR = window.QPProperty;
  var compassHeading = null, compassSamples = [], compassOn = false, compassErr = null;
  var planStep = 'import', planDraft = null;

  function activeProperty() { return PR.primary(user.id); }

  function natalOf(prop) {
    if (!prop || prop.facingDegrees === undefined || prop.facingDegrees === null) return null;
    try { return FS.natalChart(prop.period, prop.facingDegrees, prop.fiveMode || 'period'); }
    catch (e) { return null; }
  }

  /* ---------------- compass ---------------- */

  function compassSvg(heading, aff, period) {
    var cx = 160, cy = 160, R = 150;
    var parts = ['<circle class="ring" cx="160" cy="160" r="150"/>',
                 '<circle class="ring" cx="160" cy="160" r="118"/>',
                 '<circle class="ring" cx="160" cy="160" r="86"/>'];
    // Affliction arcs on the outer ring
    if (aff) {
      var arcs = [];
      aff.threeKillings.mountains.forEach(function (ch) { arcs.push(ch); });
      arcs.push(aff.taiSui.char); arcs.push(aff.yearBreaker.char);
      FS.MOUNTAINS.forEach(function (m, i) {
        if (arcs.indexOf(m[0]) < 0) return;
        var a0 = (337.5 + i * 15 - (heading || 0)) * Math.PI / 180;
        var a1 = (337.5 + (i + 1) * 15 - (heading || 0)) * Math.PI / 180;
        var r = 146;
        parts.push('<path class="aff" d="M' + (cx + r * Math.sin(a0)).toFixed(1) + ' ' +
          (cy - r * Math.cos(a0)).toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' +
          (cx + r * Math.sin(a1)).toFixed(1) + ' ' + (cy - r * Math.cos(a1)).toFixed(1) + '"/>');
      });
    }
    // 24 mountains
    var cur = heading === null ? -1 : FS.mountainIndex(heading);
    FS.MOUNTAINS.forEach(function (m, i) {
      var mid = 337.5 + i * 15 + 7.5 - (heading || 0);
      var a = mid * Math.PI / 180;
      var tx = cx + 133 * Math.sin(a), ty = cy - 133 * Math.cos(a);
      parts.push('<text class="mtn' + (i === cur ? ' on' : '') + '" x="' + tx.toFixed(1) +
                 '" y="' + ty.toFixed(1) + '">' + m[0] + '</text>');
      var e0 = (337.5 + i * 15 - (heading || 0)) * Math.PI / 180;
      parts.push('<line class="tick" x1="' + (cx + 118 * Math.sin(e0)).toFixed(1) +
                 '" y1="' + (cy - 118 * Math.cos(e0)).toFixed(1) +
                 '" x2="' + (cx + 150 * Math.sin(e0)).toFixed(1) +
                 '" y2="' + (cy - 150 * Math.cos(e0)).toFixed(1) + '"/>');
    });
    // eight trigrams with the period star of each sector
    var grid = FS.natalChart(period, 0).periodGrid;
    [[1,180],[8,225],[3,270],[4,315],[9,0],[2,45],[7,90],[6,135]].forEach(function (x) {
      var pal = x[0];
      var dirDeg = { 1:0, 8:45, 3:90, 4:135, 9:180, 2:225, 7:270, 6:315 }[pal];
      var a = (dirDeg - (heading || 0)) * Math.PI / 180;
      parts.push('<text class="star" x="' + (cx + 102 * Math.sin(a)).toFixed(1) +
                 '" y="' + (cy - 102 * Math.cos(a)).toFixed(1) + '">' +
                 FS.PAL_NAME[pal] + ' ' + grid[pal] + '</text>');
    });
    parts.push('<line class="needle" x1="160" y1="160" x2="160" y2="26"/>');
    parts.push('<circle cx="160" cy="160" r="4" fill="var(--cinnabar)"/>');
    return '<svg class="compass" viewBox="0 0 320 320">' + parts.join('') + '</svg>';
  }

  function compassStability() {
    if (compassSamples.length < 4) return null;
    var xs = compassSamples.map(function (d) { return Math.cos(d * Math.PI / 180); });
    var ys = compassSamples.map(function (d) { return Math.sin(d * Math.PI / 180); });
    var mx = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
    var my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length;
    var r = Math.sqrt(mx * mx + my * my);
    return { spread: Math.round(Math.sqrt(Math.max(0, -2 * Math.log(r))) * 180 / Math.PI),
             median: FS.norm(Math.atan2(my, mx) * 180 / Math.PI) };
  }

  function startCompass() {
    var onReading = function (e) {
      var h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;   // iOS
      else if (e.absolute && typeof e.alpha === 'number') h = FS.norm(360 - e.alpha); // Android
      else if (typeof e.alpha === 'number') h = FS.norm(360 - e.alpha);
      if (h === null) return;
      compassHeading = h;
      compassSamples.push(h);
      if (compassSamples.length > 24) compassSamples.shift();
      if (current === 'chart' && chartK === 'compass') paintCompass();
    };
    function attach() {
      compassOn = true; compassErr = null;
      window.addEventListener('deviceorientationabsolute', onReading, true);
      window.addEventListener('deviceorientation', onReading, true);
      setTimeout(function () {
        if (compassHeading === null) {
          compassErr = 'No heading came back. This device may have no magnetometer, or the page ' +
            'is not on a secure origin — opening the file from disk (file://) blocks it. ' +
            'Enter the bearing manually below.';
          paintCompass();
        }
      }, 2500);
      paintCompass();
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+: must be called directly from the gesture, not from a promise chain.
      DeviceOrientationEvent.requestPermission().then(function (r) {
        if (r === 'granted') attach();
        else { compassErr = 'Permission for motion and orientation was declined. ' +
          'Enter the bearing manually, or allow it in Settings › Safari.'; paintCompass(); }
      }).catch(function () {
        compassErr = 'The device refused the orientation request.'; paintCompass();
      });
    } else attach();
  }

  function paintCompass() {
    var host = $('fsCompass');
    if (!host) return;
    var per = FS.currentPeriod();
    var sy = C.fourPillars(now().y, now().m, now().d, 12, 0).solarYear;
    var aff = FS.afflictions(sy);
    var st = compassStability();
    var h = compassHeading;
    var m = h === null ? null : FS.mountainFor(h);
    var bd = h === null ? null : FS.boundaryDistance(h);

    host.innerHTML =
      '<div class="compass-wrap">' + compassSvg(h, aff, per.period) +
      '<div class="compass-core">' +
        (h === null
          ? '<div class="deg" style="font-size:1rem;color:var(--muted)">no reading</div>'
          : '<div class="deg">' + h.toFixed(1) + '&deg;</div>' +
            '<div class="mt">' + m.char + '</div>' +
            '<div class="sub">' + m.dirFull + ' &middot; ' + m.trigram + ' &middot; ' +
            m.yuanName + '<br>' + bd.toFixed(1) + '&deg; from the boundary<br>' + (window.QPXiu ? window.QPXiu.mansionAt(h).mansion.cn + '宿 ' + window.QPXiu.mansionAt(h).mansion.en : '') + '</div>') +
      '</div></div>' +

      (compassErr ? '<div class="warnbar">' + esc(compassErr) + '</div>' : '') +
      (h !== null && bd < 2
        ? '<div class="warnbar"><b>Within ' + bd.toFixed(1) + '&deg; of a sector boundary.</b> ' +
          'This is exactly where a small error changes the whole chart. Step away from the door ' +
          'frame and any steel, take the reading again, or enter a figure from a proper compass.</div>'
        : '') +
      (st && st.spread > 3
        ? '<div class="warnbar"><b>The reading is moving by about ' + st.spread + '&deg;.</b> ' +
          'Move away from metal and appliances, and sweep the phone in a figure of eight to ' +
          'recalibrate. Above a few degrees of drift the number is not trustworthy.</div>'
        : st ? '<div class="warnbar okbar">Steady to about ' + st.spread +
               '&deg; over the last few seconds.</div>' : '') +

      block('Take the reading', 'stand at the main door, facing out',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Hold the phone flat and level, away from the door frame, hinges, steel and appliances. ' +
        'Take three readings and use the median. A phone magnetometer is good to a few degrees at ' +
        'best — if you own a real compass, use it and type the figure in.</div>' +
        '<div class="two" style="margin-top:10px">' +
        '<button class="btn' + (compassOn ? ' ghost' : '') + '" id="cpStart">' +
          (compassOn ? 'Reading…' : 'Start the compass') + '</button>' +
        '<button class="btn ghost" id="cpUse"' + (h === null ? ' disabled style="opacity:.45"' : '') +
          '>Use ' + (h === null ? 'this' : h.toFixed(1) + '&deg;') + '</button></div>' +
        '<label for="cpManual">Or enter the bearing in degrees</label>' +
        '<input id="cpManual" type="number" min="0" max="359.9" step="0.1" placeholder="e.g. 172.5">' +
        '<button class="btn ghost" id="cpManualGo">Use the typed bearing</button>' +
        '<div class="err" id="cpMsg"></div>') +

      block('This year on the compass', sy + ' &middot; ' + aff.zodiac + ' year',
        rows([
          ['太歲 Tai Sui', aff.taiSui.char + ' ' + aff.taiSui.dirFull +
            ' <small>' + aff.taiSui.rule + '</small>'],
          ['歲破 Year Breaker', aff.yearBreaker.char + ' ' + aff.yearBreaker.dirFull +
            ' <small>' + aff.yearBreaker.rule + '</small>'],
          ['三煞 Three Killings', aff.threeKillings.cn + ' &middot; ' +
            aff.threeKillings.dirs.join(', ') + ' <small>' + aff.threeKillings.rule + '</small>'],
          ['五黃 Five Yellow', aff.fiveYellow.dirFull +
            ' <small>' + aff.fiveYellow.rule + '</small>']
        ]) +
        '<div class="panel" style="margin-top:10px;font-size:.86rem;line-height:1.7;color:var(--muted)">' +
        'The red arcs on the dial are these four. Note the difference between <b>facing</b> an ' +
        'affliction and <b>sitting with your back to it</b> — it is the piece most often reversed. ' +
        'Tai Sui may be sat against but not faced; Three Killings may be faced but not sat against.</div>');

    $('cpStart').onclick = function () { compassSamples = []; startCompass(); };
    $('cpUse').onclick = function () { if (compassHeading !== null) adoptBearing(compassHeading); };
    $('cpManualGo').onclick = function () {
      var v = parseFloat($('cpManual').value);
      if (isNaN(v) || v < 0 || v >= 360) {
        $('cpMsg').style.color = 'var(--cinnabar)';
        $('cpMsg').textContent = 'Enter a bearing between 0 and 359.9.'; return;
      }
      adoptBearing(v);
    };
  }

  function adoptBearing(deg) {
    var prop = activeProperty();
    var m = FS.mountainFor(deg);
    if (!prop) {
      openSheet('No property yet', 'the bearing needs somewhere to live',
        '<div class="panel" style="font-size:.9rem;line-height:1.7">' + deg.toFixed(1) +
        '&deg; is ' + m.char + ', facing ' + m.dirFull + '. Create a property on the Property ' +
        'tab first and this bearing will be saved against it.</div>' +
        '<button class="btn" id="goProp">Go to Property</button>',
        function () { $('goProp').onclick = function () {
          closeSheet(); switchChart('property'); }; });
      return;
    }
    prop.facingDegrees = deg;
    prop.facingMountain = m.char;
    PR.save(user.id, prop);
    $('cpMsg').style.color = 'var(--celadon)';
    $('cpMsg').textContent = 'Saved to ' + prop.name + ': facing ' + deg.toFixed(1) + '\u00b0 ' +
      m.char + ' (' + m.dirFull + '). The natal chart has been recomputed.';
  }

  function switchChart(k) {
    chartK = k;
    $('segChart').querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.c === k)); });
    renderChart();
    paintNav();
  }

  /* ---------------- Destiny › Together: two charts read side by side (合婚) ---------------- */
  // The other people are stored inside the signed-in profile, so their birth details stay with the person who entered
  // them. Another profile on this device can be copied in only with that profile's PIN.
  var TG_TYPES = { partner: 'Partner or spouse', family: 'Family member', friend: 'Friend', business: 'Business partner' };
  function tgKey() { return 'qipath.together.' + user.id; }
  function loadTogether() { try { return JSON.parse(localStorage.getItem(tgKey()) || '[]'); } catch (e) { return []; } }
  function saveTogether(list) { try { localStorage.setItem(tgKey(), JSON.stringify(list)); return true; } catch (e) { return false; } }
  var tgSel = null, tgAdding = false;
  // Profile › Relationship screen: whether the Together tab shows, and whether partner readings cover attraction,
  // desire and intimacy. Both default on; each profile keeps its own choice.
  function tgPrefs() {
    var p = null; try { p = JSON.parse(localStorage.getItem('qipath.tgprefs.' + user.id) || 'null'); } catch (e) { p = null; }
    return { show: !p || p.show !== false, intimacy: !p || p.intimacy !== false };
  }
  function saveTgPrefs(p) { try { localStorage.setItem('qipath.tgprefs.' + user.id, JSON.stringify(p)); } catch (e) {} }
  function applyTogetherTab() {
    var on = tgPrefs().show, btn = $('segChart').querySelector('[data-c="together"]');
    if (btn) btn.hidden = !on;
    if (!on && chartK === 'together') switchChart('bazi');
    else paintNav();
  }

  // The month's Qimen plate for the two of them and the next 30 days scanned hour by hour. The scan casts some 360
  // plates, so it is kept per person per day rather than recast on every redraw.
  var tgRomCache = {};
  function romanceFor(id, other) {
    var t = now(), k = id + '|' + fmt(t);
    if (!tgRomCache[k]) tgRomCache[k] = {
      plate: window.QPQimen.romancePlate(user, other, 'month', { y: t.y, m: t.m, d: t.d, hour: 12, min: 0 }),
      windows: window.QPQimen.romanceWindows(user, other, t, 30)
    };
    return tgRomCache[k];
  }
  function weekdayOf(iso) { var p = iso.split('-').map(Number); return WD[new Date(p[0], p[1] - 1, p[2]).getDay()].slice(0, 3); }

  // Attraction, desire and intimacy: the birth charts' level plus this month's plate, each with counter-measures when weak.
  function romanceHtml(res, rm, pt) {
    var R = window.QPQimen.ELEMENT_REMEDY, pl = rm.plate, w = rm.windows, act = pl.activate, nat = res.natal;
    var when = function (s) { return s ? weekdayOf(s.date) + ' ' + s.date + ', ' + s.range : '—'; };
    var dims = [
      { key: 'attraction', label: 'Attraction', cn: '吸引', plain: 'the pull you feel towards each other' },
      { key: 'desire', label: 'Desire', cn: '欲', plain: 'passion and wanting to be close physically' },
      { key: 'intimacy', label: 'Intimacy', cn: '親密', plain: 'tenderness, ease and emotional closeness' }
    ];
    function status(d) {
      var c = nat[d.key].level + Math.max(-2, Math.min(2, pl[d.key] * 0.4));
      return c >= 1.5 ? { w: 'Strong', cls: 'good-t' } : c <= -0.5 ? { w: 'Weak', cls: 'bad-t' } : { w: 'Steady', cls: '' };
    }
    var colour = function (el) { return R[el].colours; };
    function counter(d) {
      var best = w.byDimension[d.key], A = act.remedy, list;
      if (d.key === 'attraction') list = [
        'Activate the ' + act.dir + ' of your home this month (where the ' + act.symbol + ' sits): ' + A.objects + ', in ' + A.colours + '.',
        'Dress for each other in ' + colour(act.element) + ' or the colours of attraction, ' + colour(1) + '; wear a scent of ' + A.scents + '.',
        'Say it: ' + A.words + '. Compliment how the other looks and what they do well.',
        'Bring back novelty — a new place, a surprise plan, a date that feels like the early days.',
        'Plan your date for ' + when(best) + ', the strongest time for attraction in the next 30 days.'
      ];
      else if (d.key === 'desire') list = [
        'Bring Fire, the element of passion, into the bedroom: ' + R[1].objects + ', in ' + R[1].colours + '.' +
          (pl.weaken && pl.weaken.element === 1 ? ' Keep them out of the ' + act.dir + ' spot this month, where Fire would weaken the remedy.' : ''),
        'Scents that warm: ' + R[1].scents + '.',
        'Lower stress and tiredness first — sleep, exercise together, and leave work outside the bedroom.',
        'Words that warm: ' + R[1].words + '. Avoid ' + R[3].weakWords + ' — they cool desire fastest.',
        'The strongest time for desire in the next 30 days is ' + when(best) + '.'
      ];
      // The activation element and the element that feeds it (its mother); never the one that controls it.
      else list = [
        'Make the ' + act.dir + ' or the bedroom calm and soft: ' + A.objects + '; ' + R[(act.element + 4) % 5].objects + '; low warm light.',
        'Unhurried time with phones away; talk before touch, and affection without expectation.',
        'Words that bring you close: ' + R[4].words + '; and ' + R[2].words + '.',
        (pl.bridge ? 'Your positions press on each other this month — ' + pl.bridge.remedy.el + ' eases it: ' + pl.bridge.remedy.objects + '.'
          : 'Keep a small shared ritual — a walk, a meal, a bedtime talk — every day.'),
        'The strongest time for intimacy in the next 30 days is ' + when(best) + '.'
      ];
      return '<div class="todo"><b>Counter-measures:</b><ol>' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
    }
    var rowsHtml = dims.map(function (d) {
      var s = status(d);
      return ['<span class="' + s.cls + '">' + d.label + ' — ' + s.w + '</span><small>' + d.cn + ' &middot; ' + d.plain + '</small>',
        '<div class="plain"><b>In your charts:</b> ' + esc(upperFirst(nat[d.key].why)) + '.<br><b>This month:</b> ' + esc(upperFirst(pl.why[d.key].join('; '))) + '.' +
        (s.w === 'Weak' ? counter(d) : '<div class="todo"><b>Keep it up:</b> ' + esc(s.w === 'Strong'
          ? 'this is a strength — protect it with time alone together, especially around ' + when(w.byDimension[d.key]) + '.'
          : 'steady is good; to lift it, use the Qimen remedies below and the best times listed.') + '</div>') + '</div>'];
    });
    var A = act.remedy, Wk = pl.weaken ? pl.weaken.remedy : null;
    var slotRow = function (s, good) {
      return ['<span class="' + (good ? 'good-t' : 'bad-t') + '">' + weekdayOf(s.date) + ' ' + s.date.slice(5) + '</span><small>' + s.range + ' &middot; ' + s.dayPillar + ' day</small>',
        '<div class="plain">' + (good ? 'Strong for being together' : 'Weak — keep it light, avoid serious talks') +
          (s.notes.length ? ': ' + esc(s.notes.join('; ')) : '') + '.' +
          (good ? ' Spend it in or facing the ' + esc(s.activate) + '.' : '') +
          (!good && s.warnings.length ? '<small>' + esc(s.warnings.join(' ')) + '</small>' : '') + '</div>' +
        '<details class="tech"><summary>Technical detail</summary>attraction ' + s.attraction + ' &middot; desire ' + s.desire + ' &middot; intimacy ' + s.intimacy +
          ' &middot; total ' + s.total + '</details>'];
    };
    return block('Attraction, desire and intimacy', 'your two charts and this month\'s Qimen plate',
        '<div class="stack-sm">' + rows(rowsHtml) + '</div>' +
        (pl.warnings.length ? '<div class="panel plain" style="margin-top:8px"><b>Watch this month:</b><ul>' + pl.warnings.map(function (x) {
          return '<li>' + esc(x) + '.</li>'; }).join('') + '</ul></div>' : '') +
        '<div class="hint">Respectful guidance on warmth and closeness, not a verdict. For health or fertility questions, see a doctor.</div>') +
      block('Qimen: what strengthens and what weakens', 'this month\'s plate',
        '<div class="panel plain"><p style="margin-top:0">The direction to activate this month is the <b>' + esc(act.dir) + '</b>, where the ' + esc(act.symbol) +
          ' sits; its element is <b>' + A.el + '</b>. Use it in the bedroom or living room, or face that way when you spend time together.</p>' +
          '<p><b>Strengthen with</b></p><ul>' +
          '<li><b>Objects:</b> ' + esc(A.objects) + '.</li><li><b>Colours:</b> ' + esc(A.colours) + '.</li>' +
          '<li><b>Scents:</b> ' + esc(A.scents) + '.</li><li><b>Words:</b> ' + esc(A.words) + '.</li></ul>' +
          (Wk ? '<p><b>Weakens it</b> (' + Wk.el + ' controls ' + A.el + ')</p><ul>' +
            '<li><b>Keep away from that spot:</b> ' + esc(Wk.objects) + ', and lots of ' + esc(Wk.colours) + '.</li>' +
            '<li><b>Scents to skip there:</b> ' + esc(Wk.scents) + '.</li>' +
            '<li><b>Words that cool things:</b> ' + esc(Wk.weakWords) + '.</li></ul>' : '') +
          (pl.bridge ? '<p><b>When you rub each other the wrong way:</b> your positions press on each other this month; ' + pl.bridge.remedy.el +
            ' bridges them — ' + esc(pl.bridge.remedy.objects) + ', in ' + esc(pl.bridge.remedy.colours) + '.</p>' : '') +
          (pl.avoid.length ? '<p><b>Avoid for time together:</b> the ' + esc(pl.avoid.join(', ')) + '.</p>' : '') +
        '</div>') +
      block('Best and weakest times', 'the next ' + w.days + ' days, hour by hour (07:00–00:59)',
        '<div style="font-size:.85rem;color:var(--brass);margin:4px 0">Strongest</div>' +
        '<div class="stack-sm">' + rows(w.strongest.map(function (s) { return slotRow(s, true); })) + '</div>' +
        '<div style="font-size:.85rem;color:var(--brass);margin:12px 0 4px">Weakest</div>' +
        '<div class="stack-sm">' + rows(w.weakest.map(function (s) { return slotRow(s, false); })) + '</div>' +
        '<div class="hint">Best single times — attraction: ' + when(w.byDimension.attraction) + '; desire: ' + when(w.byDimension.desire) +
          '; intimacy: ' + when(w.byDimension.intimacy) + '. Each double-hour\'s Qimen plate is read for both of you, with the day\'s branch ' +
          'against your two day branches.</div>');
  }

  // Desire and intimacy in detail: how the two fit, each person's profile, and a concrete plan for the strongest time ahead.
  function desireHtml(d, rm, item) {
    var A = d.profiles[0], B = d.profiles[1];
    var profile = function (q) {
      return block('What ' + esc(q.name) + ' needs', q.element + ' is strongest in their chart',
        '<div class="stack-sm">' + rows([
          ['Desire', esc(q.drivePlain)],
          ['Who initiates', esc(upperFirst(q.initiates)) + '.'],
          ['Pace and build-up', esc(upperFirst(q.pace)) + '.'],
          ['What arouses', esc(upperFirst(q.arouses)) + '.'],
          ['What cools it', esc(upperFirst(q.cools)) + '.'],
          ['Touch', esc(upperFirst(q.touch)) + '.'],
          ['Setting', esc(upperFirst(q.setting)) + '.'],
          ['Best hours', esc(upperFirst(q.hours)) + '.'],
          ['Energy', esc(q.stamina)]
        ].concat(q.god ? [['Temperament', esc(q.god)]] : []).map(function (r) {
          return [r[0], '<div class="plain">' + r[1] + '</div>'];
        })) + '</div>');
    };
    var best = rm && rm.windows.byDimension.desire, plan = best ? [
      'When: ' + weekdayOf(best.date) + ' ' + best.date + ', ' + best.range + ' — the strongest time for desire in the next 30 days. Keep the evening free.',
      'Where: the ' + best.activate + ' of your home if you can; set it up as ' + A.setting.split(',')[0] + ' with ' + B.setting.split(',')[0] + '.',
      'Before: ' + (A.element === 'Earth' || B.element === 'Earth' ? 'a relaxed meal together; ' : '') + 'time to talk with phones away, then ' + A.touch.split(';')[0] + '.',
      'During: follow the slower partner\'s pace first; ' + B.touch.split(';')[0] + '.',
      'Words: say what you find attractive about each other, specifically. Avoid anything that sounds like criticism or a scorecard.',
      'After: stay close — ' + (A.element === 'Water' || B.element === 'Water' ? 'lingering matters a great deal to ' + (A.element === 'Water' ? A.name : B.name) : 'a few minutes of closeness') + '.'
    ] : [];
    return block('Desire and intimacy in detail', 'frank, specific and private to this device',
        '<div class="stack-sm">' + rows(d.couple.map(item)) + '</div>' +
        (plan.length ? '<div class="panel plain" style="margin-top:8px"><b>A plan for your best time ahead</b><ol>' +
          plan.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' : '')) +
      profile(A) + profile(B);
  }

  // Sexual attraction and compatibility (partners, both 18 or over): the couple's fit, counter-measures when chemistry
  // or libido needs work, and each person's profile in bed.
  function sexualHtml(s, rm, item) {
    var best = rm && rm.windows.byDimension.desire;
    var inBed = function (q) {
      return block('In bed: ' + esc(q.name), q.element + ' is strongest in their chart',
        '<div class="stack-sm">' + rows([
          ['Libido', q.libido], ['Sexual style', q.style], ['Turns them on', q.on], ['Turns them off', q.off],
          ['Foreplay', q.foreplay], ['Leading or following', q.role], ['Talking about sex', q.voice]
        ].concat(q.intensity ? [['Intensity', q.intensity]] : []).concat(q.magnetism ? [['Magnetism', q.magnetism]] : [])
         .concat([['Stamina', q.stamina], ['Best hours', q.hours.charAt(0).toUpperCase() + q.hours.slice(1) + '.']]).map(function (r) {
          return [r[0], '<div class="plain">' + esc(r[1]) + '</div>'];
        })) + '</div>');
    };
    var counter = s.counter.concat(best ? ['Time it: the strongest time for desire in the next 30 days is ' + weekdayOf(best.date) + ' ' + best.date + ', ' + best.range + '.'] : []);
    return block('Sexual attraction and compatibility', 'frank, for the two of you only',
        '<div class="stack-sm">' + rows(s.items.map(item)) + '</div>' +
        (s.counter.length ? '<div class="panel plain" style="margin-top:8px"><b>Counter-measures to build sexual chemistry</b><ol>' +
          counter.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' : '') +
        '<div class="hint">Shown because you are both adults and Profile › Relationship screen includes intimacy. Tendencies from the ' +
          'charts, not rules — consent and talking to each other come first. For sexual health questions, see a doctor.</div>') +
      inBed(s.profiles[0]) + inBed(s.profiles[1]);
  }

  function renderTogether(host) {
    var list = loadTogether();
    if (!list.length || tgAdding) { renderTogetherForm(host, list); return; }
    var pt = list.filter(function (x) { return x.id === tgSel; })[0] || list[0];
    tgSel = pt.id;
    var other, res, rm = null, year = new Date().getFullYear();
    var withIntimacy = pt.type === 'partner' && tgPrefs().intimacy;
    try {
      other = enrich(pt);
      res = window.QPBazi.compatibility(user, other, { type: pt.type, intimacy: withIntimacy, year: year });
      if (withIntimacy) rm = romanceFor(pt.id, other);
      res.romance = rm;
    } catch (e) { host.innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
    var toneCls = { good: 'good-t', mixed: '', caution: 'bad-t' };
    var bandCls = res.band === 'Naturally supportive' ? 'good' : res.band === 'Good, with some effort' ? 'mid' : 'bad';
    var item = function (x) {
      return ['<span class="' + (toneCls[x.tone] || '') + '">' + esc(x.title) + '</span><small>' + esc(x.cn || '') + '</small>',
        '<div class="plain">' + esc(x.plain) + '<div class="todo"><b>What to do:</b> ' + esc(x.todo) + '</div></div>'];
    };
    var t = res.timing;
    host.innerHTML =
      '<div class="chips" id="tgChips">' + list.map(function (x) {
        return '<button class="chip" data-tg="' + x.id + '"' + (x.id === pt.id ? ' aria-selected="true"' : '') + '>' + esc(x.name) + '</button>'; }).join('') +
        '<button class="chip" id="tgAdd">+ Add someone</button></div>' +
      block(esc(user.name) + ' &amp; ' + esc(pt.name), TG_TYPES[pt.type] + ' &middot; born ' + fmt(pt.birth) + ' ' +
          String(pt.birth.hour).padStart(2, '0') + ':' + String(pt.birth.min).padStart(2, '0'),
        '<div class="verdictbar"><span class="big ' + bandCls + '">' + res.band + '</span><span class="sub">' + other.pillars.day.cn + ' day &middot; ' +
          esc(other.deep.dayMasterEn) + (other.deep.strong ? ' (strong)' : ' (weak)') + '</span></div>' +
        '<div class="panel plain" style="margin-top:10px">' + esc(res.summary) + '</div>' +
        // The relationship can be changed here; attraction, desire and intimacy are read only for a partner.
        '<label for="tgRel">Relationship</label><select id="tgRel">' + Object.keys(TG_TYPES).map(function (k) {
          return '<option value="' + k + '"' + (k === pt.type ? ' selected' : '') + '>' + TG_TYPES[k] + '</option>'; }).join('') + '</select>' +
        (pt.type !== 'partner' ? '<div class="hint">Attraction, desire and intimacy are read only for a partner or spouse. Change the relationship above to include them.</div>'
          : !withIntimacy ? '<div class="hint">Attraction, desire and intimacy are switched off in Profile › Relationship screen.</div>' : '')) +
      (rm ? romanceHtml(res, rm, pt) : '') +
      (res.desire ? desireHtml(res.desire, rm, item) : '') +
      (res.sexual ? sexualHtml(res.sexual, rm, item) : '') +
      (function () {
        var nm = areasSafe(function () { return window.QPBazi.nayinMatch(user, other); });
        return nm ? block('Nayin match 納音', 'separate from the scores above', rows(nm.map(function (x) {
          return [esc(x.label) + '<small>' + esc(x.area) + '</small>', x.a.cn + ' · ' + x.b.cn + '<div class="plain"><span class="' + (x.value > 0 ? 'good-t' : 'bad-t') + '">' + esc(x.tone) + ':</span> ' + esc(x.text) + '</div>'];
        }))) : '';
      })() +
      block('Ways to strengthen the relationship', 'start here',
        '<div class="panel plain"><ol style="margin:0;padding-left:20px">' + res.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
        '</ol></div>') +
      (function () { var ar = areasSafe(function () { return window.QPBazi.areasTogether(user, other); });
        return ar ? lifeAreasHtml(ar, 'Your life areas with ' + esc(pt.name), 'how the chart of ' + esc(pt.name) + ' supports or strains each area of yours') : ''; })() +
      block('How you fit together', 'each finding in plain words, with what to do',
        '<div class="stack-sm">' + rows(res.items.map(item)) + '</div>') +
      (res.intimacy.length ? block('Closeness in your two charts', 'tendencies, not rules',
        '<div class="stack-sm">' + rows(res.intimacy.map(item)) + '</div>' +
        '<div class="hint">About warmth, affection and timing — not a verdict. For health or fertility questions, see a doctor.</div>') : '') +
      (t ? block(t.year + ' together', t.pillarCn + ' year' + (t.yearClash.length ? ' &middot; the year clashes ' + esc(t.yearClash.join(' and ')) + '\'s day branch' : '') +
          (t.yearRomance ? ' &middot; a romance-star year' : ''),
        '<div class="stack-sm">' + rows(t.months.map(function (m) {
          var tag = m.both ? ' <small class="good-t" style="display:inline">best together</small>' : m.hard ? ' <small class="bad-t" style="display:inline">take care</small>' : '';
          return [m.pillar + tag + '<small>' + m.start + ' → ' + m.end + '</small>',
            '<div class="plain">' + esc(m.plain) + '</div><details class="tech"><summary>Technical detail</summary>' + esc(user.name) + ' ' + m.a + ' &middot; ' +
              esc(pt.name) + ' ' + m.b + (m.clashHome ? ' &middot; month branch clashes a day branch' : '') + (m.romance ? ' &middot; romance or Peach Blossom branch' : '') + '</details>'];
        })) + '</div>') : '') +
      block('AI reading of the relationship', '', '<div id="aiTogether"></div>') +
      '<button class="btn ghost" id="tgDel">Remove ' + esc(pt.name) + ' from this profile</button>' +
      '<div class="hint">Classical tendencies to guide how you treat each other, not a verdict on whether a relationship will last. ' +
        esc(pt.name) + '\'s birth details are stored only on this device, inside your profile.</div>';

    host.querySelectorAll('[data-tg]').forEach(function (b) { b.onclick = function () { tgSel = b.dataset.tg; renderChart(); }; });
    $('tgAdd').onclick = function () { tgAdding = true; renderChart(); };
    $('tgRel').onchange = function () {
      var l = loadTogether(); l.forEach(function (x) { if (x.id === pt.id) x.type = $('tgRel').value; }); saveTogether(l); renderChart();
    };
    $('tgDel').onclick = function () {
      if ($('tgDel').dataset.armed !== '1') { $('tgDel').dataset.armed = '1'; $('tgDel').textContent = 'Tap again to remove ' + pt.name; return; }
      saveTogether(loadTogether().filter(function (x) { return x.id !== pt.id; })); tgSel = null; renderChart();
    };
    aiPanel('aiTogether', 'together', pt.id + '.' + year + '.' + (withIntimacy ? 'i' : 'n') + '.v3',
      function (cfg) { return window.QPAI.analyseTogether(cfg, user, other, res); }, [
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' },
        { label: 'The two of you', path: 'headline' },
        { label: 'How you work together', path: 'dynamics' },
        { label: 'Your strengths as a pair', path: 'strengths' },
        { label: 'Where friction comes from', path: 'frictions' },
        { label: 'Talking to each other', path: 'communication' },
        { label: 'Attraction', path: 'attraction' },
        { label: 'Desire', path: 'desire' },
        { label: 'Intimacy and closeness', path: 'intimacy' },
        { label: 'Sexual compatibility', path: 'sexual' },
        { label: 'Qimen: what strengthens and what weakens', path: 'remedies' },
        { label: 'Timing this year', path: 'timing' },
        { label: 'Ways to strengthen the relationship', path: 'steps' },
        { label: 'What would change this', path: 'caution' }
      ]);
  }

  function renderTogetherForm(host, list) {
    var others = loadProfiles().filter(function (p) { return p.id !== user.id; });
    host.innerHTML = block('Read two charts together', 'compatibility and how to strengthen the relationship',
      '<div class="hint" style="margin-top:0">Add the other person\'s birth details. They are stored only on this device, inside your profile. ' +
        'Please make sure they are happy to be included.</div>' +
      '<label for="tgName">Their name</label><input id="tgName" type="text" maxlength="40" placeholder="How should the app refer to them?">' +
      '<label for="tgDate">Date of birth</label><input id="tgDate" type="date">' +
      '<label for="tgTime">Time of birth</label><input id="tgTime" type="time" value="12:00">' +
      '<label for="tgZone">Time zone at birth</label><select id="tgZone">' + zoneOptions('') + '</select>' +
      '<label for="tgGender">Gender</label><select id="tgGender"><option value="M">Male</option><option value="F">Female</option></select>' +
      '<label for="tgType">Relationship</label><select id="tgType">' + Object.keys(TG_TYPES).map(function (k) {
        return '<option value="' + k + '">' + TG_TYPES[k] + '</option>'; }).join('') + '</select>' +
      '<button class="btn" id="tgSave">Read the two charts</button>' +
      (others.length ? '<div style="font-size:.85rem;color:var(--brass);margin:18px 0 0">Or copy from another profile on this device</div>' +
        '<label for="tgProf">Profile</label><select id="tgProf">' + others.map(function (p) {
          return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select>' +
        '<label for="tgPin">That profile\'s PIN</label><input id="tgPin" type="password" inputmode="numeric" maxlength="6">' +
        '<button class="btn ghost" id="tgCopy">Copy their birth details</button>' : '') +
      '<div class="notice" id="tgErr" hidden></div>' +
      (list.length ? '<button class="btn ghost" id="tgCancel">Back</button>' : ''));
    function fail(msg) { $('tgErr').hidden = false; $('tgErr').textContent = msg; }
    function store(p) {
      var l = loadTogether(); l.push(p);
      if (!saveTogether(l)) { fail('This device is out of storage space.'); return; }
      tgSel = p.id; tgAdding = false; renderChart();
    }
    $('tgSave').onclick = function () {
      var name = $('tgName').value.trim(), date = $('tgDate').value, time = $('tgTime').value || '12:00';
      if (!name) return fail('Add their name.');
      if (!date) return fail('Their date of birth is needed to build the chart.');
      var dp = date.split('-').map(Number), tp = time.split(':').map(Number);
      if (dp[0] < 1900 || dp[0] > 2100) return fail('Enter a birth year between 1900 and 2100.');
      store({ id: 't' + Date.now(), name: name, gender: $('tgGender').value, type: $('tgType').value,
              birth: { y: dp[0], m: dp[1], d: dp[2], hour: tp[0], min: tp[1], zone: $('tgZone').value || undefined } });
    };
    if ($('tgCopy')) $('tgCopy').onclick = function () {
      var p = others.filter(function (x) { return x.id === $('tgProf').value; })[0];
      if (!p) return;
      if (hashPin($('tgPin').value, p.salt) !== p.pin) return fail('That PIN does not match ' + p.name + '\'s profile.');
      store({ id: 't' + Date.now(), name: p.name, gender: p.gender, type: $('tgType').value,
              birth: { y: p.birth.y, m: p.birth.m, d: p.birth.d, hour: p.birth.hour, min: p.birth.min, zone: p.birth.zone, lon: p.birth.lon } });
    };
    if ($('tgCancel')) $('tgCancel').onclick = function () { tgAdding = false; renderChart(); };
  }


  /* ---------------- property ---------------- */

  function renderProperty() {
    var host = $('chartBody');
    var list = PR.all(user.id);
    var cur = FS.currentPeriod();

    host.innerHTML =
      block('Properties', list.length + ' saved',
        list.length
          ? '<div class="rows">' + list.map(function (pp) {
              var n = natalOf(pp);
              return '<div class="row"><span class="k" style="flex:0 0 46%">' + esc(pp.name) +
                (pp.primary ? ' <b style="color:var(--cinnabar)">primary</b>' : '') +
                '<br><small style="color:var(--muted)">Period ' + pp.period +
                (pp.facingMountain ? ' &middot; facing ' + pp.facingMountain : ' &middot; no bearing yet') +
                '</small></span><span class="v">' +
                (n ? '<b style="color:var(--brass)">' + n.type + '</b><small>' + n.typeEn + '</small>'
                   : '<small style="color:var(--muted)">needs a facing bearing</small>') +
                '<button class="btn ghost" style="margin-top:6px;padding:7px" data-pedit="' +
                pp.id + '">Edit</button></span></div>';
            }).join('') + '</div>'
          : '<div class="empty">No property yet. A flying star chart is a chart of a building, ' +
            'so the module needs one before it can say anything specific.</div>') +

      areasSafe(function () { return xiuFacingHtml(activeProperty()); }) +
      block('Add a property', 'the facing bearing can come later',
        '<div class="panel">' +
        '<label for="prName">Name</label>' +
        '<input id="prName" type="text" placeholder="Home, office, the shop">' +
        '<label for="prType">Type</label>' +
        '<select id="prType"><option value="home">Home</option>' +
        '<option value="office">Office</option><option value="shop">Shop</option></select>' +
        '<label for="prDate">Completion or move-in date</label>' +
        '<input id="prDate" type="date">' +
        '<div class="hint">This sets the period. The boundary is Lichun, not 1 January — a ' +
        'building finished in late January 2024 is Period 8, not 9. We are currently in ' +
        '<b>Period ' + cur.period + '</b> (' + cur.info.trigram + ' ' + cur.info.en + ', ' +
        cur.startYear + '\u2013' + cur.endYear + ').</div>' +
        '<label for="prFacing">Facing bearing in degrees, if you have it</label>' +
        '<input id="prFacing" type="number" min="0" max="359.9" step="0.1" placeholder="optional">' +
        '<label for="prFive">Star 5 convention</label>' +
        '<select id="prFive"><option value="period">Borrows the period star\'s palace (default)</option>' +
        '<option value="opposite">Borrows the opposite palace</option></select>' +
        '<div class="hint">Schools differ on star 5\'s polarity. Both options here reproduce the ' +
        'known Period 8 distribution; pick whichever matches your teacher.</div>' +
        '<div class="err" id="prMsg"></div>' +
        '<button class="btn" id="prSave">Save property</button></div>');

    host.querySelectorAll('[data-pedit]').forEach(function (b) {
      b.onclick = function () { editProperty(PR.get(user.id, b.dataset.pedit)); };
    });
    $('prSave').onclick = function () {
      var name = $('prName').value.trim();
      if (!name) { $('prMsg').style.color = 'var(--cinnabar)';
        $('prMsg').textContent = 'Give the property a name.'; return; }
      var dv = $('prDate').value;
      if (!dv) { $('prMsg').style.color = 'var(--cinnabar)';
        $('prMsg').textContent = 'A completion date is needed to fix the period.'; return; }
      var d = fromISO(dv);
      var per = FS.periodFor(d.y, d.m, d.d);
      var fdeg = parseFloat($('prFacing').value);
      var prop = { name: name, type: $('prType').value, completionDate: dv,
                   period: per.period, fiveMode: $('prFive').value };
      if (!isNaN(fdeg) && fdeg >= 0 && fdeg < 360) {
        prop.facingDegrees = fdeg; prop.facingMountain = FS.mountainFor(fdeg).char;
      }
      PR.save(user.id, prop);
      renderProperty();
    };
  }

  function editProperty(pp) {
    if (!pp) return;
    var n = natalOf(pp);
    openSheet(esc(pp.name), 'Period ' + pp.period + ' \u00b7 ' + pp.type,
      rows([
        ['Completion', pp.completionDate || '—'],
        ['Period', pp.period + ' <small>' + FS.PERIOD_INFO[pp.period].trigram + ' ' +
          FS.PERIOD_INFO[pp.period].en + ', ' + FS.PERIOD_INFO[pp.period].elem + '</small>'],
        ['Facing', pp.facingDegrees !== undefined
          ? pp.facingDegrees.toFixed(1) + '\u00b0 ' + pp.facingMountain + ' <small>' +
            FS.mountainFor(pp.facingDegrees).dirFull + '</small>' : 'not set'],
        ['Sitting', n && n.sitting ? n.sitting.char + ' <small>' + n.sitting.dirFull + '</small>' : '—'],
        ['Chart type', n ? n.type + ' <small>' + n.typeEn + '</small>' : '—'],
        ['Floor plan', pp.plan ? 'imported' : 'none']
      ]) +
      '<div class="panel" style="margin-top:10px"><label for="edFace">Facing bearing</label>' +
      '<input id="edFace" type="number" min="0" max="359.9" step="0.1" value="' +
        (pp.facingDegrees !== undefined ? pp.facingDegrees : '') + '">' +
      '<button class="btn" id="edSave">Update bearing</button>' +
      '<button class="btn ghost" id="edPrimary">Make primary</button>' +
      '<button class="btn ghost" id="edDel" style="color:var(--cinnabar)">Delete property</button></div>',
      function () {
        $('edSave').onclick = function () {
          var v = parseFloat($('edFace').value);
          if (isNaN(v) || v < 0 || v >= 360) return;
          pp.facingDegrees = v; pp.facingMountain = FS.mountainFor(v).char;
          PR.save(user.id, pp); closeSheet(); renderProperty();
        };
        $('edPrimary').onclick = function () {
          PR.setPrimary(user.id, pp.id); closeSheet(); renderProperty(); };
        $('edDel').onclick = function () {
          if (!window.confirm('Delete ' + pp.name + '?')) return;
          PR.remove(user.id, pp.id); closeSheet(); renderProperty(); };
      });
  }

  /* ---------------- floor plan ---------------- */

  function renderPlan() {
    var host = $('chartBody');
    var prop = activeProperty();
    if (!prop) {
      host.innerHTML = block('Floor plan', '',
        '<div class="panel" style="font-size:.9rem;line-height:1.7">Create a property first — ' +
        'a plan is stored against one.</div>' +
        '<button class="btn" id="plGoProp">Go to Property</button>');
      $('plGoProp').onclick = function () { switchChart('property'); };
      return;
    }
    if (!planDraft || planDraft.propId !== prop.id) {
      planDraft = prop.plan
        ? JSON.parse(JSON.stringify(prop.plan))
        : { propId: prop.id, image: null, planNorth: 0, referenceBearing: null,
            referenceEdge: null, outline: [], centre: null, rooms: [], coverage: null };
      planDraft.propId = prop.id;
    }
    var steps = [['import','1 Import'],['orient','2 Orient'],['outline','3 Outline'],
                 ['centre','4 Centre'],['rooms','5 Rooms'],['overlay','6 Overlay'],
                 ['audit','7 Audit']];
    var doneOf = { import: !!planDraft.image, orient: planDraft.referenceBearing !== null,
                   outline: planDraft.outline.length >= 3, centre: !!planDraft.centre,
                   rooms: (planDraft.rooms || []).length > 0, overlay: false, audit: false };

    host.innerHTML =
      '<div class="planstep" id="plSteps">' + steps.map(function (x) {
        return '<button data-ps="' + x[0] + '"' + (planStep === x[0] ? ' aria-selected="true"' : '') +
          (doneOf[x[0]] ? ' class="done"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div id="plBody"></div>';
    $('plSteps').querySelectorAll('[data-ps]').forEach(function (b) {
      b.onclick = function () { planStep = b.dataset.ps; renderPlan(); };
    });
    paintPlanStep(prop);
  }

  function planImgHtml(extraSvg, opacity) {
    if (!planDraft.image) return '<div class="empty">No plan imported.</div>';
    return '<div class="planwrap" id="plWrap">' +
      '<img id="plImg" src="data:' + planDraft.image.mime + ';base64,' + planDraft.image.data + '">' +
      '<svg id="plSvg" viewBox="0 0 ' + planDraft.image.width + ' ' + planDraft.image.height +
      '" preserveAspectRatio="none"' + (opacity !== undefined ? ' style="opacity:' + opacity + '"' : '') +
      '>' + (extraSvg || '') + '</svg></div>';
  }

  // Map a tap to image coordinates regardless of how the image is scaled on screen.
  function planPoint(ev) {
    var wrap = $('plWrap'); if (!wrap || !planDraft.image) return null;
    var r = wrap.getBoundingClientRect();
    var t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
    return [ (t.clientX - r.left) / r.width * planDraft.image.width,
             (t.clientY - r.top) / r.height * planDraft.image.height ];
  }

  function paintPlanStep(prop) {
    var b = $('plBody');

    if (planStep === 'import') {
      b.innerHTML = block('Import the plan', 'photo, image or PDF page',
        '<div class="drop" id="plDrop"><b>Choose a floor plan</b>' +
        '<small>A photo of a printed plan is fine, and so is a hand sketch. ' +
        'Kept on this device.</small></div>' +
        '<input type="file" id="plFile" accept="image/*" hidden>' +
        (planDraft.image ? planImgHtml('') : '') +
        '<div class="err" id="plMsg"></div>' +
        (planDraft.image ? '<button class="btn" id="plNext">Next: orient it</button>' : ''));
      $('plDrop').onclick = function () { $('plFile').click(); };
      $('plFile').onchange = function () {
        var f = $('plFile').files[0]; if (!f) return;
        if (f.size > 6 * 1024 * 1024) {
          $('plMsg').style.color = 'var(--cinnabar)';
          $('plMsg').textContent = 'That image is over 6 MB. Reduce it before importing.'; return;
        }
        var rd = new FileReader();
        rd.onerror = function () {
          $('plMsg').style.color = 'var(--cinnabar)';
          $('plMsg').textContent = 'That file could not be read.';
        };
        rd.onload = function () {
          var data = String(rd.result).split(',')[1];
          var settled = false;
          function accept(w, h) {
            if (settled) return;
            settled = true;
            planDraft.image = { mime: f.type, data: data, width: w, height: h };
            renderPlan();
          }
          var img = new Image();
          img.onload = function () { accept(img.width || 1000, img.height || 750); };
          // If decoding never completes the import would otherwise strand silently.
          img.onerror = function () { accept(1000, 750); };
          setTimeout(function () { accept(1000, 750); }, 3000);
          img.src = String(rd.result);
        };
        rd.readAsDataURL(f);
      };
      if ($('plNext')) $('plNext').onclick = function () { planStep = 'orient'; renderPlan(); };
    }

    else if (planStep === 'orient') {
      var ref = planDraft.referenceEdge || [];
      // One tap draws a marker; the line only exists once both ends are placed.
      var svg = ref.length === 2
        ? '<line class="refline" x1="' + ref[0][0] + '" y1="' + ref[0][1] +
          '" x2="' + ref[1][0] + '" y2="' + ref[1][1] + '"/>' +
          ref.map(function (p) { return '<circle class="ctr" cx="' + p[0] + '" cy="' + p[1] +
            '" r="8"/>'; }).join('')
        : ref.length === 1
          ? '<circle class="ctr" cx="' + ref[0][0] + '" cy="' + ref[0][1] + '" r="8"/>'
          : '';
      b.innerHTML = block('Orient the plan', 'the printed north arrow is not trusted',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Tap two points along the <b>facing wall</b> or the plane of the main door, then give the ' +
        'true bearing of that wall as measured on site. Everything else follows from this one ' +
        'measurement, so it is the number worth getting right.</div>' +
        planImgHtml(svg) +
        '<div class="err" id="plMsg2"></div>' +
        '<label for="plRefBear">True bearing of that edge, facing out</label>' +
        '<input id="plRefBear" type="number" min="0" max="359.9" step="0.1" value="' +
          (planDraft.referenceBearing !== null ? planDraft.referenceBearing : '') + '">' +
        '<div class="two"><button class="btn ghost" id="plClearRef">Clear the line</button>' +
        '<button class="btn" id="plSetOrient">Set orientation</button></div>' +
        (planDraft.referenceBearing !== null
          ? '<div class="warnbar okbar">Image-up corresponds to <b>' +
            planDraft.planNorth.toFixed(1) + '\u00b0</b> true. ' +
            'A point above the centre of this plan reads as ' +
            FS.mountainFor(planDraft.planNorth).dirFull + '.</div>' : ''));

      var wrap = $('plWrap');
      if (wrap) wrap.onclick = function (e) {
        var pt = planPoint(e); if (!pt) return;
        if (!planDraft.referenceEdge || planDraft.referenceEdge.length >= 2)
          planDraft.referenceEdge = [pt];
        else planDraft.referenceEdge.push(pt);
        renderPlan();
      };
      $('plClearRef').onclick = function () { planDraft.referenceEdge = null; renderPlan(); };
      $('plSetOrient').onclick = function () {
        var v = parseFloat($('plRefBear').value);
        var m = $('plMsg2');
        if (isNaN(v) || v < 0 || v >= 360) { m.style.color = 'var(--cinnabar)';
          m.textContent = 'Enter a bearing between 0 and 359.9.'; return; }
        if (!planDraft.referenceEdge || planDraft.referenceEdge.length !== 2) {
          m.style.color = 'var(--cinnabar)';
          m.textContent = 'Tap two points along the reference edge first.'; return; }
        // Outward normal of the drawn edge, in image space.
        var e0 = planDraft.referenceEdge[0], e1 = planDraft.referenceEdge[1];
        var edgeAngle = Math.atan2(e1[0] - e0[0], -(e1[1] - e0[1])) * 180 / Math.PI;
        var normal = FS.norm(edgeAngle + 90);     // facing direction in image space
        planDraft.referenceBearing = v;
        planDraft.planNorth = FS.norm(v - normal); // true bearing of image-up
        renderPlan();
      };
    }

    else if (planStep === 'outline') {
      var poly = planDraft.outline || [];
      var pts = poly.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
      b.innerHTML = block('Trace the outline', poly.length + ' points',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Tap the corners of the built area in order. Exclude balconies and open porches; include ' +
        'enclosed extensions. This outline drives the centre point and the missing-corner analysis.' +
        '</div>' +
        planImgHtml(poly.length ? '<polygon class="outline" points="' + pts + '"/>' +
          poly.map(function (p) { return '<circle class="ctr" cx="' + p[0] + '" cy="' + p[1] +
            '" r="7"/>'; }).join('') : '') +
        '<div class="two"><button class="btn ghost" id="plUndo">Undo last point</button>' +
        '<button class="btn ghost" id="plClearPoly">Clear</button></div>' +
        (poly.length >= 3 ? '<button class="btn" id="plOutNext">Next: centre</button>' : ''));
      var w2 = $('plWrap');
      if (w2) w2.onclick = function (e) {
        var pt = planPoint(e); if (!pt) return;
        planDraft.outline.push(pt); renderPlan();
      };
      $('plUndo').onclick = function () { planDraft.outline.pop(); renderPlan(); };
      $('plClearPoly').onclick = function () { planDraft.outline = []; renderPlan(); };
      if ($('plOutNext')) $('plOutNext').onclick = function () {
        planDraft.centre = FS.centroid(planDraft.outline);
        planStep = 'centre'; renderPlan();
      };
    }

    else if (planStep === 'centre') {
      if (!planDraft.centre && planDraft.outline.length >= 3)
        planDraft.centre = FS.centroid(planDraft.outline);
      var c = planDraft.centre;
      var inside = c && planDraft.outline.length >= 3 &&
        FS.pointInPoly(planDraft.outline, c[0], c[1]);
      var ptsB = planDraft.outline.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
      b.innerHTML = block('The centre 天心', c ? 'centroid of the outline' : 'needs an outline',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Every sector boundary radiates from here, so moving the centre moves the whole chart. ' +
        'Tap to reposition it if your school uses a different rule.</div>' +
        planImgHtml((ptsB ? '<polygon class="outline" points="' + ptsB + '"/>' : '') +
          (c ? '<circle class="ctr" cx="' + c[0] + '" cy="' + c[1] + '" r="11"/>' : '')) +
        (c && !inside
          ? '<div class="warnbar">The centre falls <b>outside</b> the built area. For an L-shaped ' +
            'or irregular plan that is normal and is itself meaningful — it usually accompanies a ' +
            'missing corner. The app has not moved it inside the walls, because doing so silently ' +
            'would misplace every sector.</div>' : '') +
        (c ? '<button class="btn" id="plCtrNext">Next: rooms</button>' : ''));
      var w3 = $('plWrap');
      if (w3) w3.onclick = function (e) {
        var pt = planPoint(e); if (!pt) return;
        planDraft.centre = pt; renderPlan();
      };
      if ($('plCtrNext')) $('plCtrNext').onclick = function () { planStep = 'rooms'; renderPlan(); };
    }

    else if (planStep === 'rooms') {
      var rooms = planDraft.rooms || [];
      b.innerHTML = block('Rooms', rooms.length + ' placed',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Tap a room on the plan and name it, or let the AI propose a list from the image. ' +
        'Anything the AI suggests is <b>proposed, not applied</b> — vision models misread hand ' +
        'sketches and mirror-flip symmetrical plans, so confirm each one.</div>' +
        planImgHtml(rooms.map(function (r) {
          return '<circle class="ctr" cx="' + r.point[0] + '" cy="' + r.point[1] + '" r="9"/>' +
            '<text class="wlabel" x="' + r.point[0] + '" y="' + (r.point[1] - 16) + '">' +
            esc(r.label) + '</text>'; }).join('')) +
        '<div style="margin-top:10px">' + rooms.map(function (r, i) {
          return '<span class="roomchip' + (r.confidence === 'low' ? ' lo' : '') + '">' +
            esc(r.label) + ' <small>' + r.sector + '</small>' +
            '<button data-rmr="' + i + '" style="color:var(--cinnabar)">&times;</button></span>';
        }).join('') + '</div>' +
        '<div class="err" id="plMsg4"></div>' +
        '<button class="btn ghost" id="plAI">Ask the AI to read the plan</button>' +
        '<button class="btn" id="plRoomNext">Next: the overlay</button>');
      var w4 = $('plWrap');
      if (w4) w4.onclick = function (e) {
        var pt = planPoint(e); if (!pt || !planDraft.centre) return;
        var label = window.prompt('Name this room');
        if (!label) return;
        var sec = FS.sectorOf(pt[0], pt[1], planDraft.centre[0], planDraft.centre[1], planDraft.planNorth);
        planDraft.rooms.push({ label: label, point: pt, sector: sec.dir,
                               source: 'user', confidence: 'high' });
        renderPlan();
      };
      b.querySelectorAll('[data-rmr]').forEach(function (btn) {
        btn.onclick = function () { planDraft.rooms.splice(parseInt(btn.dataset.rmr, 10), 1); renderPlan(); };
      });
      $('plAI').onclick = readPlanWithAI;
      $('plRoomNext').onclick = function () { planStep = 'overlay'; renderPlan(); };
    }

    else if (planStep === 'audit') { paintAudit(prop, b); }

    else {
      var natal = natalOf(prop);
      if (!natal) {
        b.innerHTML = '<div class="notice">This property has no facing bearing yet, so there is ' +
          'no chart to overlay. Set one on the Compass or Property tab.</div>';
        return;
      }
      if (!planDraft.centre || !planDraft.image) {
        b.innerHTML = '<div class="notice">Trace the outline and set the centre first.</div>';
        return;
      }
      if (typeof planDraft.planNorth !== 'number' || !isFinite(planDraft.planNorth)) {
        b.innerHTML = '<div class="notice">The plan has no orientation yet. Go back to step 2 ' +
          'and set the facing edge and its bearing — every sector boundary depends on it.</div>';
        return;
      }
      var sy = C.fourPillars(now().y, now().m, now().d, 12, 0).solarYear;
      var layers = FS.sectorLayers(natal, sy, C.fourPillars(now().y, now().m, now().d, 12, 0).month.branch);
      var byDir = {}; layers.forEach(function (l) { byDir[l.dir] = l; });
      var cx = planDraft.centre[0], cy = planDraft.centre[1];
      var R = Math.max(planDraft.image.width, planDraft.image.height);
      var wedges = '';
      for (var i = 0; i < 8; i++) {
        var mid = i * 45;
        var dir = ['N','NE','E','SE','S','SW','W','NW'][i];
        var L = byDir[dir]; if (!L) continue;
        var a0 = (mid - 22.5 - planDraft.planNorth) * Math.PI / 180;
        var a1 = (mid + 22.5 - planDraft.planNorth) * Math.PI / 180;
        var x0 = cx + R * Math.sin(a0), y0 = cy - R * Math.cos(a0);
        var x1 = cx + R * Math.sin(a1), y1 = cy - R * Math.cos(a1);
        var tone = L.combo.tone;
        var fillC = tone === 'good' ? 'rgba(127,169,140,.30)'
                  : tone === 'bad' ? 'rgba(200,69,47,.30)' : 'rgba(200,162,74,.16)';
        wedges += '<path class="wedge" fill="' + fillC + '" d="M' + cx + ' ' + cy +
          ' L' + x0.toFixed(0) + ' ' + y0.toFixed(0) + ' A' + R + ' ' + R + ' 0 0 1 ' +
          x1.toFixed(0) + ' ' + y1.toFixed(0) + ' Z"/>';
        var am = (mid - planDraft.planNorth) * Math.PI / 180;
        var lx = cx + R * 0.55 * Math.sin(am), ly = cy - R * 0.55 * Math.cos(am);
        wedges += '<text class="wlabel" x="' + lx.toFixed(0) + '" y="' + ly.toFixed(0) +
          '" style="font-size:' + Math.round(R / 26) + 'px">' + dir + ' ' +
          L.natalMountain + '-' + L.natalWater + '</text>';
      }
      var shape = planDraft.outline.length >= 3
        ? FS.analyseShape(planDraft.outline, planDraft.planNorth) : null;

      b.innerHTML = block('The overlay', natal.type + ' \u00b7 ' + natal.typeEn,
        planImgHtml(wedges, 0.85) +
        '<label for="plOpacity">Overlay opacity</label>' +
        '<input class="slider" id="plOpacity" type="range" min="10" max="100" value="85">' +
        '<button class="btn" id="plSave">Save the plan to this property</button>' +
        '<div class="err" id="plMsg5"></div>') +

        (shape ? block('Shape 缺角', 'judged on the 3\u00d73 grid, not the wedges',
          '<div class="rows">' + shape.sectors.map(function (x) {
            return '<div class="row"><span class="k">' + x.dirFull + '</span><span class="v"><b style="color:' +
              (x.coverage >= 90 ? 'var(--celadon)' : x.coverage >= 67 ? 'var(--brass)' : 'var(--cinnabar)') +
              '">' + x.coverage + '%</b> <small>' + x.cn + ' ' + x.level + '</small>' +
              (x.deficient ? '<small>' + esc(x.note) + '</small>' : '') + '</span></div>';
          }).join('') + '</div>' +
          '<div class="panel" style="margin-top:10px;font-size:.84rem;line-height:1.7;color:var(--muted)">' +
          'A complete rectangle reads 100% in every cell. Wedge geometry would score the same ' +
          'rectangle at 51\u201376% and flag every flat as defective, which is why the grid is ' +
          'used here and the wedges above.</div>') : '') +

        (planDraft.rooms.length ? block('Rooms by sector', '',
          '<div class="rows">' + planDraft.rooms.map(function (r) {
            var L = byDir[r.sector];
            return '<div class="row"><span class="k">' + esc(r.label) + '</span><span class="v">' +
              r.sector + (L ? ' <small>natal ' + L.natalMountain + '-' + L.natalWater +
              ' \u00b7 annual ' + L.annual + (L.afflictions.length ? ' \u00b7 ' +
              L.afflictions.map(function (f) { return f.cn; }).join(' ') : '') + '</small>' : '') +
              '</span></div>';
          }).join('') + '</div>') : '');

      $('plOpacity').oninput = function () {
        var sv = $('plSvg'); if (sv) sv.style.opacity = $('plOpacity').value / 100;
      };
      $('plSave').onclick = function () {
        planDraft.coverage = shape ? shape.coverage : null;
        var r = PR.savePlan(user.id, prop.id, planDraft);
        var m = $('plMsg5');
        m.style.color = r ? 'var(--celadon)' : 'var(--cinnabar)';
        m.textContent = r === 'lite'
          ? 'Saved, but the image was too large for storage — the geometry is kept and the picture dropped.'
          : r ? 'Saved to ' + prop.name + '.' : 'Could not save; storage is full or blocked.';
      };
    }
  }


  /* ---------------- the audit ---------------- */

  function auditContext(prop) {
    var natal = natalOf(prop);
    if (!natal) return null;
    var dtA = now();
    var pA = C.fourPillars(dtA.y, dtA.m, dtA.d, 12, 0);
    var sy = pA.solarYear;
    var layers = FS.sectorLayers(natal, sy, pA.month.branch);
    var aff = FS.afflictions(sy);
    var plan = (planDraft && planDraft.propId === prop.id) ? planDraft : prop.plan;
    var shape = (plan && plan.outline && plan.outline.length >= 3)
      ? FS.analyseShape(plan.outline, plan.planNorth) : null;
    var rooms = plan ? (plan.rooms || []) : [];
    var audit = FS.auditProperty(natal, layers, aff, shape, rooms, user.mansions);
    return { prop: prop, natal: natal, layers: layers, aff: aff, shape: shape, rooms: rooms,
             audit: audit, mansions: user.mansions, user: user,
             planNorth: plan ? plan.planNorth : null,
             image: plan && plan.image && !plan.image.dropped ? plan.image : null };
  }

  function paintAudit(prop, host) {
    var ctx = auditContext(prop);
    if (!ctx) {
      host.innerHTML = '<div class="notice">This property has no facing bearing, so there is ' +
        'nothing to audit yet. Set one on the Compass tab.</div>';
      return;
    }
    lastSavedId = null; currentAI = null;
    var a = ctx.audit;

    host.innerHTML =
      block('Audit', ctx.natal.type + ' \u00b7 ' + ctx.natal.typeEn,
        '<div class="sevbar">' +
        '<div class="hi"><b>' + a.counts.high + '</b><small>needs attention</small></div>' +
        '<div class="me"><b>' + a.counts.medium + '</b><small>worth correcting</small></div>' +
        '<div class="lo"><b>' + a.counts.low + '</b><small>noted</small></div></div>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'These findings are <b>computed</b> from the chart, the rooms you placed and the shape of ' +
        'the outline \u2014 not guessed. The AI reading below adds what only the plan image can ' +
        'show, and expands the cures.' +
        (ctx.rooms.length ? '' : '<br><br>No rooms are placed yet, so this covers the chart only. ' +
          'Go back to step 5 and place them for a room-by-room audit.') + '</div>') +

      block('Findings', 'ordered by what matters',
        a.findings.map(function (f) {
          return '<div class="finding ' + f.severity + '"><h4>' + esc(f.title) +
            '<span>' + (f.sector || 'chart') + '</span></h4>' +
            '<div class="cause">' + esc(f.cause) + '</div>' +
            (f.cure && f.cure.what
              ? '<div class="cure"><b>' + (f.cure.element && f.cure.element !== '\u2014'
                  ? f.cure.element + ' \u00b7 ' : '') + 'What to do</b> ' + esc(f.cure.what) + '</div>' +
                (f.cure.avoid && f.cure.avoid !== 'Nothing specific.'
                  ? '<div class="avoid">Avoid: ' + esc(f.cure.avoid) + '</div>' : '')
              : '') + '</div>';
        }).join('') + saveBar('auSave', 'Save this audit')) +

      block('What this cannot see', 'stated so the reading is weighed correctly',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        a.unseen.map(function (u) { return '\u00b7 ' + esc(u); }).join('<br>') +
        '<br><br><span style="color:var(--muted)">Flying stars are one layer of the discipline. ' +
        'Form school \u2014 what the door faces, the road, the landform \u2014 is not in a plan ' +
        'and can outweigh the chart entirely.</span></div>') +

      block('Comprehensive AI reading', ctx.image
        ? 'the plan image is sent with the chart' : 'chart only \u2014 no plan image stored',
        '<div id="aiAudit"></div>');

    wireSave('auSave', function () {
      return { kind:'chart',
        title: 'Feng Shui audit \u00b7 ' + prop.name,
        subtitle: a.counts.high + ' high, ' + a.counts.medium + ' medium \u00b7 ' + ctx.natal.type,
        when: { date: isoOf(now()) },
        payload: { type:'fsaudit', typeLabel:'Property audit',
          property: prop.name, period: ctx.natal.period,
          facing: ctx.natal.facing.char, facingDir: ctx.natal.facing.dirFull,
          chartType: ctx.natal.type + ' ' + ctx.natal.typeEn,
          counts: a.counts,
          findings: a.findings.map(function (f) {
            return { severity: f.severity, title: f.title, sector: f.sector,
                     cause: f.cause, cure: f.cure.what, avoid: f.cure.avoid }; }),
          rooms: ctx.rooms.map(function (r) { return r.label + ' \u2192 ' + r.sector; }),
          shape: ctx.shape ? ctx.shape.coverage : null,
          unseen: a.unseen } };
    });

    var auCt = mountCounter('aiAudit', 'fsaudit', { focus: ['upheaval', 'health', 'financial'],
      subtitle: 'this year\'s threats on the plate of this double-hour — the directions bear on the home' });
    aiPanelSaving('aiAudit', 'fsaudit', prop.id + '.' + ctx.aff.year + '.' + ctx.rooms.length + '.ct',
      function (cfg) { return window.QPAI.withCounter(auCt ? counterText(auCt, auCt.focus) : null, function () { return window.QPAI.auditFloorPlan(cfg,
        ctx.image ? { mime: ctx.image.mime, data: ctx.image.data } : null, ctx); }); },
      [
        { label:'The verdict', path:'verdict' },
        { label:'What the plan shows', path:'planObservations' },
        { label:'Room by room', path:'roomByRoom', list:'room' },
        { label:'Cures, in priority order', path:'priorityCures', list:'cure' },
        { label:'What to activate', path:'activations' },
        { label:'Check outside the plan', path:'formSchool' },
        { label:'What this could not assess', path:'unseen' }
      ]);
  }

  function readPlanWithAI() {
    var m = $('plMsg4');
    if (!aiReady()) { m.style.color = 'var(--cinnabar)';
      m.textContent = 'Reading the plan needs an API key. Add one on the Profile screen.'; return; }
    if (!planDraft.image) { m.style.color = 'var(--cinnabar)';
      m.textContent = 'Import a plan first.'; return; }
    m.style.color = 'var(--muted)'; m.textContent = 'Reading the plan\u2026';
    $('plAI').disabled = true;
    window.QPAI.readFloorPlan(loadAI(),
      { mime: planDraft.image.mime, data: planDraft.image.data })
      .then(function (res) {
        $('plAI').disabled = false;
        var found = (res.rooms || []).concat((res.features || []).map(function (f) {
          return { label: f.label, approxCentre: f.approxCentre, confidence: f.confidence }; }));
        if (!found.length) { m.style.color = 'var(--cinnabar)';
          m.textContent = 'Nothing could be identified. ' + (res.unreadable || ''); return; }
        m.textContent = '';
        openSheet('Proposed rooms', found.length + ' identified \u2014 confirm before applying',
          (res.unreadable ? '<div class="warnbar">' + esc(res.unreadable) + '</div>' : '') +
          '<div class="panel" style="font-size:.88rem;line-height:1.7">' + esc(res.summary || '') + '</div>' +
          '<div class="rows" style="margin-top:10px">' + found.map(function (r, i) {
            return '<div class="row"><span class="k">' + esc(r.label) +
              '<br><small style="color:' + (r.confidence === 'low' ? 'var(--cinnabar)' : 'var(--muted)') +
              '">' + (r.confidence || 'medium') + ' confidence</small></span>' +
              '<span class="v"><label style="display:flex;gap:8px;align-items:center;justify-content:flex-end">' +
              '<input type="checkbox" data-acc="' + i + '" checked style="width:auto"> accept</label></span></div>';
          }).join('') + '</div>' +
          '<button class="btn" id="plApply">Add the accepted rooms</button>',
          function () {
            $('plApply').onclick = function () {
              var picked = [];
              document.querySelectorAll('[data-acc]').forEach(function (cb) {
                if (cb.checked) picked.push(found[parseInt(cb.dataset.acc, 10)]);
              });
              picked.forEach(function (r) {
                var pt = [ (r.approxCentre ? r.approxCentre[0] : 0.5) * planDraft.image.width,
                           (r.approxCentre ? r.approxCentre[1] : 0.5) * planDraft.image.height ];
                var sec = planDraft.centre
                  ? FS.sectorOf(pt[0], pt[1], planDraft.centre[0], planDraft.centre[1], planDraft.planNorth)
                  : { dir: '?' };
                planDraft.rooms.push({ label: r.label, point: pt, sector: sec.dir,
                                       source: 'ai', confidence: r.confidence || 'medium' });
              });
              closeSheet(); renderPlan();
            };
          });
      }).catch(function (e) {
        $('plAI').disabled = false;
        m.style.color = 'var(--cinnabar)'; m.textContent = e.message;
      });
  }


  function openSector(L, natal, prop) {
    if (!L) return;
    var rm = FS.remedyFor(L.natalWater, natal.period);
    var rmM = FS.remedyFor(L.natalMountain, natal.period);
    openSheet(L.dirFull + ' \u00b7 ' + L.trigram,
      'natal ' + L.natalMountain + '-' + L.natalWater + ' \u00b7 annual ' + L.annual,
      rows([
        ['Mountain star \u5C71\u661F', L.natalMountain + ' <small>' +
          FS.STAR[L.natalMountain].name + ' \u00b7 governs people, health, relationships</small>'],
        ['Water star \u5411\u661F', L.natalWater + ' <small>' +
          FS.STAR[L.natalWater].name + ' \u00b7 governs money and opportunity</small>'],
        ['Period star', L.natalPeriod],
        ['Annual star', L.annual + ' <small>' + FS.STAR[L.annual].name + '</small>'],
        ['Monthly star', L.monthly ? L.monthly + ' <small>' + FS.STAR[L.monthly].name + '</small>' : '—'],
        ['Role', L.isFacing ? 'Facing palace \u5411\u5BAE' : L.isSitting ? 'Sitting palace \u5750\u5BAE' : '—']
      ]) +
      '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
      esc(L.combo.text) + '</div>' +
      (L.afflictions.length
        ? '<div class="block"><h2>Afflictions this year</h2>' + L.afflictions.map(function (f) {
            return '<div class="warnbar"><b>' + f.cn + ' ' + f.en + '</b><br>' + esc(f.rule) +
              '</div>'; }).join('') + '</div>' : '') +
      '<div class="block"><h2>Handling it</h2>' + rows([
        ['Water star ' + L.natalWater, rm.text],
        ['Mountain star ' + L.natalMountain, rmM.text]
      ]) +
      '<div class="panel" style="margin-top:10px;font-size:.86rem;line-height:1.7;color:var(--muted)">' +
      'Remedies work by element, not by ornament. What matters is the material and whether the ' +
      'sector is used, not whether an object is sold as a cure.</div></div>');
  }

  /* ---------------- learn: the knowledge library ---------------- */
  var LB = window.QPLibrary;
  var learnModule = 'qimen';
  var learnFiles = [];

  function renderLearn() {
    var host = $('learnBody');
    var c = LB.counts(user.id);
    var modOpts = Object.keys(LB.MODULES).map(function (m) {
      return '<option value="' + m + '"' + (m === learnModule ? ' selected' : '') + '>' +
        LB.MODULES[m].label + '</option>'; }).join('');
    var kindOpts = Object.keys(LB.KINDS).map(function (k) {
      return '<option value="' + k + '">' + LB.KINDS[k].label + ' — ' +
        LB.KINDS[k].note + '</option>'; }).join('');

    host.innerHTML =
      block('Teach the reading', c._total + ' note' + (c._total === 1 ? '' : 's') +
        ' in your library, ' + c._active + ' active',
        '<div class="notice"><b>What this does, and what it does not.</b> The app cannot train ' +
        'or fine-tune a model — Gemini and Claude are stateless, and nothing you send changes ' +
        'them. What it does instead is keep your own material and put the relevant parts into ' +
        'the prompt every time a chart is read. The model then works inside your school\'s rules ' +
        'rather than a generic reading. That is retrieval, not learning, and the difference is ' +
        'worth knowing: it is durable, it is inspectable, and it stops at the edge of what you ' +
        'have given it.</div>') +

      block('Add material', 'text, images or PDF',
        '<div class="panel">' +
        '<label for="lnMod">Which module does this belong to?</label>' +
        '<select id="lnMod">' + modOpts + '</select>' +
        '<label for="lnKind">What kind of material is it?</label>' +
        '<select id="lnKind">' + kindOpts + '</select>' +
        '<label for="lnText">Paste text — a method, a table, a teacher\'s note, a case</label>' +
        '<textarea id="lnText" rows="7" placeholder="Paste or type the material here. Dense and specific beats long and general."></textarea>' +
        '<div class="drop" id="lnDrop" style="margin-top:12px">' +
        '<b>Add a file</b><small>Images of book pages or charts, and PDFs, are read directly. ' +
        'Text files are read as text.<br>Video is not accepted by either provider through this ' +
        'route — paste a transcript, or export a few key frames as images.</small></div>' +
        '<input type="file" id="lnFile" multiple accept="image/*,application/pdf,.txt,.md,.csv,.json" hidden>' +
        '<div class="filelist" id="lnFiles"></div>' +
        '<div class="err" id="lnMsg"></div>' +
        '<button class="btn" id="lnGo">Read it and build notes</button>' +
        '<button class="btn ghost" id="lnRaw">Save as one note without AI</button>' +
        '</div>') +

      '<div id="lnOut"></div>' +

      block('Your library', '',
        '<div class="chips" id="lnChips">' +
        '<button class="chip" data-lm=""' + (!learnFilter ? ' aria-selected="true"' : '') +
          '>All ' + c._total + '</button>' +
        Object.keys(LB.MODULES).filter(function (m) { return c[m]; }).map(function (m) {
          return '<button class="chip" data-lm="' + m + '"' +
            (learnFilter === m ? ' aria-selected="true"' : '') + '>' +
            LB.MODULES[m].cn + ' ' + c[m] + '</button>'; }).join('') +
        '</div><div id="lnList"></div>') +

      block('Qimen forecasting methods', 'selectable on Strategy › Forecast',
        window.QPQimen.METHODS.map(function (mm) {
          return '<div class="methodcard"><b>' + mm.label +
            ' <span class="cn">' + mm.name + '</span></b>' +
            '<p>' + esc(mm.blurb) + '</p><em>' + esc(mm.note) + '</em></div>';
        }).join('') +
        '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7;color:var(--muted)">' +
        'Each method reads a different symbol as the matter, so they can disagree — that is the ' +
        'point of having them. A note of kind <b>Method</b> in your library is injected into every ' +
        'Qimen reading, so your own school\'s procedure overrides the built-in one.</div>') +

      block('Fibonacci timing', 'on Seasons › BaZi Luck and Zi Wei, Strategy › San Cai, Forecast and Yijing',
        '<div class="panel" style="font-size:.88rem;line-height:1.75">' +
        'Each system reads one moment. The timing layer asks where the turning points are, by ' +
        'recasting the chart at Fibonacci intervals from an anchor — 1, 2, 3, 5, 8, 13, 21, 34, 55, ' +
        '89 double-hours for Qimen and Yijing; months, years and ages for Bazi and Zi Wei; the hours ' +
        'and days after each San Cai window — and scoring every recast with that system\'s own ' +
        'engine.<br><br>' +
        '<b>Zones.</b> Each window is placed by where its score falls in the range of all the ' +
        'windows: <span class="good-t">Peak</span> above 78.6%, <span class="good-t">Golden</span> ' +
        '61.8–78.6%, <span class="mid-t">Balanced</span> 38.2–61.8%, <span class="bad-t">Retracement' +
        '</span> 23.6–38.2%, <span class="bad-t">Trough</span> below 23.6%. Golden means strong ' +
        'compared with the other windows on offer, not strong in absolute terms.<br><br>' +
        '<b>Refined verdict.</b> The anchor moment counts 0.618, the &phi;-weighted average of every ' +
        'window 0.382, with each later window counting 0.618 of the one before.<br><br>' +
        '<b>Agreement.</b> The share of windows on the same side as the refined verdict. The AI ' +
        'readings start their confidence figure from it.<br><br>' +
        '<span style="color:var(--muted)">体用, 互卦 and 應期 are classical Plum Blossom. The Fibonacci ' +
        'intervals, zones and &phi;-weighting are a QiPath synthesis layered on top: they make timing ' +
        'specific and checkable, not certain.</span></div>') +

      block('The quantitative layer', 'matrix algebra, Markov chains, graph theory, Fourier analysis',
        '<div class="panel" style="font-size:.88rem;line-height:1.75">' +
        '<b>Plate tensor</b> (Strategy › Forecast). The Qimen plate as a 9 &times; 5 &times; 5 tensor of palaces, ' +
        'layers and elements. Its influence matrix gives the energy hub (principal eigenvector), how ' +
        'concentrated the plate is (&lambda;&#8321;/|&lambda;&#8322;|), and which palace best fits your elements.<br><br>' +
        '<b>Markov dynamics</b> (Strategy › Forecast). Your question recast for 120 double-hours; the verdicts form ' +
        'a four-state chain. It gives the long-run share of each state, the odds a few hours ahead, and the ' +
        'expected wait until Favourable.<br><br>' +
        '<b>Network topology</b> (Destiny › Bazi). The eight characters as a graph. PageRank shows where qi ' +
        'accumulates, betweenness finds the bridge character, and the Day Master&rsquo;s net flow sums what ' +
        'feeds, pressures and drains it.<br><br>' +
        '<b>Harmonic cycles</b> (Seasons › BaZi Luck and Strategy › Forecast). Fourier analysis finds the dominant ' +
        'cycles in your scores, where you are in their phase, and the next peak and trough.<br><br>' +
        '<b>Strategic stance</b> (Strategy › Forecast, Destiny › Zi Wei, San Cai mandates). Host against guest — or this ' +
        'year&rsquo;s Life palace against others, or you against the person across the table — as a game over Attack, ' +
        'Hold and Maneuver; the Nash equilibrium gives the stance and the best reply to each move.<br><br>' +
        '<b>Layer alignment</b> (San Cai mandates). A fuzzy AND of Heaven, Earth and Man: the window is only as aligned ' +
        'as its weakest layer, and the sheet says when the average hides one.<br><br>' +
        '<b>Chart clarity</b> (both). Shannon entropy, ranked against thousands of reference charts: how clear or ' +
        'muddy the situation is.<br><br>' +
        '<b>Sensitivity</b> (both). Where a few minutes change the plate or a pillar, and whether that changes the ' +
        'reading — the butterfly effect, measured rather than assumed.<br><br>' +
        '<b>Fuzzy seasonal strength</b> (both). 旺相休囚死 as degrees on a continuous seasonal curve instead of a ' +
        'switch on the day of each 節.<br><br>' +
        '<span style="color:var(--muted)">These measure the symbolic system more precisely; they do not make it a ' +
        'physical one. Because Bazi and Qimen are built from 10-, 12- and 60-unit cycles, Fourier analysis ' +
        'mostly recovers those — the value is which one dominates for you, and when.</span></div>') +

      block('Move the library between devices', '',
        '<div class="panel"><button class="btn ghost" id="lnExport">Export as JSON</button>' +
        '<label for="lnImport">Paste an exported library to merge it in</label>' +
        '<textarea id="lnImport" rows="3" placeholder=\'{"notes":[ ... ]}\'></textarea>' +
        '<div class="err" id="lnImpMsg"></div>' +
        '<button class="btn ghost" id="lnImportGo">Import</button></div>');

    paintFiles(); paintList();
    $('lnMod').onchange = function () { learnModule = $('lnMod').value; };

    $('lnDrop').onclick = function () { $('lnFile').click(); };
    ['dragover','dragenter'].forEach(function (ev) {
      $('lnDrop').addEventListener(ev, function (e) {
        e.preventDefault(); $('lnDrop').classList.add('over'); });
    });
    ['dragleave','drop'].forEach(function (ev) {
      $('lnDrop').addEventListener(ev, function (e) {
        e.preventDefault(); $('lnDrop').classList.remove('over'); });
    });
    $('lnDrop').addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) takeFiles(e.dataTransfer.files);
    });
    $('lnFile').onchange = function () { takeFiles($('lnFile').files); };

    $('lnGo').onclick = runIngest;
    $('lnRaw').onclick = saveRaw;
    $('lnExport').onclick = function () {
      var blob = LB.exportAll(user.id);
      openSheet('Export library', LB.counts(user.id)._total + ' notes',
        '<div class="panel"><textarea rows="14" readonly style="font-size:.72rem">' +
        esc(blob) + '</textarea><button class="btn ghost" id="lbCopy">Copy</button></div>',
        function () { $('lbCopy').onclick = function () {
          if (navigator.clipboard) navigator.clipboard.writeText(blob).then(function () {
            $('lbCopy').textContent = 'Copied'; }); }; });
    };
    $('lnImportGo').onclick = function () {
      var r = LB.importJson(user.id, $('lnImport').value);
      var m = $('lnImpMsg');
      if (r.error) { m.style.color = 'var(--cinnabar)'; m.textContent = r.error; return; }
      m.style.color = 'var(--celadon)'; m.textContent = 'Imported ' + r.added + ' notes.';
      setTimeout(renderLearn, 900);
    };
  }

  var learnFilter = '';

  function takeFiles(files) {
    var arr = Array.prototype.slice.call(files || []);
    arr.forEach(function (f) {
      if (f.size > 6 * 1024 * 1024) {
        $('lnMsg').style.color = 'var(--cinnabar)';
        $('lnMsg').textContent = f.name + ' is over 6 MB, which is too large to send. ' +
          'Crop the image or split the PDF.';
        return;
      }
      if (/^video\//.test(f.type)) {
        $('lnMsg').style.color = 'var(--cinnabar)';
        $('lnMsg').textContent = 'Video cannot be sent to either provider through this route. ' +
          'Paste a transcript instead, or export a few key frames as images.';
        return;
      }
      var reader = new FileReader();
      var isText = /^text\//.test(f.type) || /\.(txt|md|csv|json)$/i.test(f.name);
      reader.onload = function () {
        if (isText) {
          learnFiles.push({ name: f.name, kind: 'text', text: String(reader.result).slice(0, 40000) });
        } else {
          var b64 = String(reader.result).split(',')[1] || '';
          learnFiles.push({ name: f.name, kind: 'media', mime: f.type, data: b64,
                            size: f.size });
        }
        paintFiles();
      };
      if (isText) reader.readAsText(f); else reader.readAsDataURL(f);
    });
  }

  function paintFiles() {
    var h = $('lnFiles');
    if (!h) return;
    h.innerHTML = learnFiles.map(function (f, i) {
      return '<div class="filerow"><span>' + esc(f.name) +
        ' <small>' + (f.kind === 'text' ? f.text.length + ' chars'
          : Math.round(f.size / 1024) + ' KB · ' + f.mime) + '</small></span>' +
        '<button data-rmf="' + i + '" aria-label="Remove">&times;</button></div>';
    }).join('');
    h.querySelectorAll('[data-rmf]').forEach(function (b) {
      b.onclick = function () { learnFiles.splice(parseInt(b.dataset.rmf, 10), 1); paintFiles(); };
    });
  }

  function saveRaw() {
    var text = $('lnText').value.trim();
    var textFiles = learnFiles.filter(function (f) { return f.kind === 'text'; })
      .map(function (f) { return '[' + f.name + ']\n' + f.text; }).join('\n\n');
    var body = [text, textFiles].filter(Boolean).join('\n\n');
    if (!body) { $('lnMsg').style.color = 'var(--cinnabar)';
      $('lnMsg').textContent = 'Nothing to save. Paste text, or add a text file.'; return; }
    var e = LB.add(user.id, { module: $('lnMod').value, kind: $('lnKind').value,
      title: body.split('\n')[0].slice(0, 80) || 'Untitled note', body: body, source: 'typed' });
    $('lnMsg').style.color = e ? 'var(--celadon)' : 'var(--cinnabar)';
    $('lnMsg').textContent = e ? 'Saved as one note, unprocessed.' : 'Could not save — storage is blocked.';
    if (e) { $('lnText').value = ''; learnFiles = []; setTimeout(renderLearn, 700); }
  }

  function runIngest() {
    var text = $('lnText').value.trim();
    var media = learnFiles.filter(function (f) { return f.kind === 'media'; });
    var textFiles = learnFiles.filter(function (f) { return f.kind === 'text'; })
      .map(function (f) { return '[' + f.name + ']\n' + f.text; }).join('\n\n');
    var combined = [text, textFiles].filter(Boolean).join('\n\n');
    var m = $('lnMsg');

    if (!combined && !media.length) {
      m.style.color = 'var(--cinnabar)';
      m.textContent = 'Add some material first — paste text, or attach an image or PDF.';
      return;
    }
    if (!aiReady()) {
      m.style.color = 'var(--cinnabar)';
      m.textContent = 'Reading material into notes needs an API key. Add one on the Profile screen, ' +
        'or use "Save as one note without AI".';
      return;
    }
    var mod = $('lnMod').value, kindHint = LB.KINDS[$('lnKind').value].label;
    m.style.color = 'var(--muted)';
    m.textContent = media.length
      ? 'Reading ' + media.length + ' file' + (media.length > 1 ? 's' : '') + ' and building notes…'
      : 'Reading the material and building notes…';
    $('lnGo').disabled = true;

    var cfg = loadAI();
    var p = media.length
      ? window.QPAI.ingestMedia(cfg, mod, kindHint,
          media.map(function (f) { return { mime: f.mime, data: f.data }; }), combined)
      : window.QPAI.ingestText(cfg, mod, kindHint, combined);

    p.then(function (res) {
      $('lnGo').disabled = false;
      var notes = (res.notes || []).filter(function (n) { return n.body && n.title; });
      if (!notes.length) {
        m.style.color = 'var(--cinnabar)';
        m.textContent = 'Nothing usable could be extracted. Try a clearer image, or paste the text.';
        return;
      }
      m.textContent = '';
      $('lnOut').innerHTML =
        block('Extracted ' + notes.length + ' note' + (notes.length === 1 ? '' : 's'),
          'review before adding',
          '<div class="panel" style="font-size:.9rem;line-height:1.7">' + esc(res.summary) + '</div>' +
          notes.map(function (n, i) {
            return '<div class="note"><h4>' + esc(n.title) +
              '<span>' + (LB.MODULES[n.module] ? LB.MODULES[n.module].cn : n.module) + ' · ' +
              (LB.KINDS[n.kind] ? LB.KINDS[n.kind].label : n.kind) + '</span></h4>' +
              '<div class="bd open">' + esc(n.body) + '</div>' +
              ((n.tags || []).length ? '<div class="meta" style="margin-top:6px">' +
                n.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
                '</div>' : '') + '</div>';
          }).join('') +
          (res.gaps ? '<div class="classic warn"><b>What this does not settle</b><span>' +
            esc(res.gaps) + '</span></div>' : '') +
          '<button class="btn" id="lnAccept">Add all ' + notes.length + ' to the library</button>' +
          '<button class="btn ghost" id="lnDiscard">Discard</button>');

      $('lnAccept').onclick = function () {
        var added = LB.addMany(user.id, notes.map(function (n) {
          return { module: LB.MODULES[n.module] ? n.module : mod,
                   kind: LB.KINDS[n.kind] ? n.kind : 'rule',
                   title: n.title, body: n.body, tags: n.tags,
                   source: media.length ? 'file' : 'typed' };
        }));
        $('lnText').value = ''; learnFiles = []; $('lnOut').innerHTML = '';
        renderLearn();
        $('lnMsg').style.color = 'var(--celadon)';
        $('lnMsg').textContent = 'Added ' + added.length + ' notes. They will be used in every ' +
          (LB.MODULES[mod] ? LB.MODULES[mod].label : mod) + ' reading from now on.';
      };
      $('lnDiscard').onclick = function () { $('lnOut').innerHTML = ''; };
    }).catch(function (err) {
      $('lnGo').disabled = false;
      m.style.color = 'var(--cinnabar)'; m.textContent = err.message;
    });
  }

  function paintList() {
    var h = $('lnList');
    if (!h) return;
    var list = LB.byModule(user.id, learnFilter || null);
    if (!list.length) {
      h.innerHTML = '<div class="empty">Nothing in the library yet. Anything you add above will ' +
        'be read alongside the chart in every relevant analysis.</div>';
    } else {
      h.innerHTML = list.map(function (n) {
        return '<div class="note' + (n.active ? '' : ' off') + '"><h4>' + esc(n.title) +
          '<span>' + (LB.MODULES[n.module] ? LB.MODULES[n.module].cn : n.module) + ' · ' +
          (LB.KINDS[n.kind] ? LB.KINDS[n.kind].label : n.kind) + '</span></h4>' +
          '<div class="meta">' + n.body.length + ' chars · added ' + n.addedAt.slice(0, 10) +
          ' · ' + n.source + '</div>' +
          '<div class="bd" data-body="' + n.id + '">' + esc(n.body) + '</div>' +
          '<div class="acts">' +
            '<button data-exp="' + n.id + '">Show all</button>' +
            '<button class="' + (n.active ? 'on' : '') + '" data-tog="' + n.id + '">' +
              (n.active ? 'Active' : 'Inactive') + '</button>' +
            '<button class="del" data-del="' + n.id + '">Delete</button>' +
          '</div></div>';
      }).join('');
    }
    h.querySelectorAll('[data-exp]').forEach(function (b) {
      b.onclick = function () {
        var el = h.querySelector('[data-body="' + b.dataset.exp + '"]');
        el.classList.toggle('open');
        b.textContent = el.classList.contains('open') ? 'Show less' : 'Show all';
      };
    });
    h.querySelectorAll('[data-tog]').forEach(function (b) {
      b.onclick = function () { LB.toggle(user.id, b.dataset.tog); renderLearn(); };
    });
    h.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        if (!window.confirm('Delete this note?')) return;
        LB.remove(user.id, b.dataset.del); renderLearn();
      };
    });
    var chips = $('lnChips');
    if (chips) chips.querySelectorAll('[data-lm]').forEach(function (b) {
      b.onclick = function () { learnFilter = b.dataset.lm; renderLearn(); };
    });
  }

  /* ---------------- profile screen ---------------- */
  function renderProfile() {
    var cfg = loadAI();
    var P = window.QPAI.PROVIDERS;
    var b = user.birth;
    var list = loadProfiles();

    var modelList = (cfg.models && cfg.models.length && cfg.provider === 'gemini')
      ? cfg.models : P[cfg.provider].models;
    if (modelList.indexOf(cfg.model) < 0) modelList = [cfg.model].concat(modelList);
    var modelOpts = modelList.map(function (m) {
      return '<option value="' + m + '"' + (cfg.model === m ? ' selected' : '') + '>' + m + '</option>';
    }).join('');

    $('profileBody').innerHTML =
      block('Your details', 'used to build every chart in the app',
        rows([
          ['Name', esc(user.name)],
          ['Born', b.y + '-' + String(b.m).padStart(2,'0') + '-' + String(b.d).padStart(2,'0') +
            ' ' + String(b.hour).padStart(2,'0') + ':' + String(b.min).padStart(2,'0')],
          ['Lunar birth', user.lunar.month + '/' + user.lunar.day + (user.lunar.leap ? ' (leap)' : '')],
          ['Four pillars', user.pillars.year.cn + ' ' + user.pillars.month.cn + ' ' +
            user.pillars.day.cn + ' ' + user.pillars.hour.cn],
          ['Day master', user.bazi.dayMasterCn + ' <small>' + user.bazi.dayMasterEn + '</small>'],
          ['Animal sign', user.pillars.zodiac],
          ['Gender', user.gender === 'M' ? 'Male' : 'Female']
        ])) +

      block('Relationship screen', 'Destiny › Together',
        '<div class="panel">' +
        '<label class="tg-toggle"><input type="checkbox" id="pfTgShow"' + (tgPrefs().show ? ' checked' : '') + '> Show the Together screen</label>' +
        '<label class="tg-toggle"><input type="checkbox" id="pfTgIntim"' + (tgPrefs().intimacy ? ' checked' : '') + '> ' +
          'Include attraction, desire and intimacy (partners)</label>' +
        '<div class="hint">Together reads your chart alongside someone else\'s and says how to strengthen the relationship. ' +
          'Turning it off hides the screen; the people you added stay saved on this device.</div></div>') +

      block('Qimen charts', 'how the hourly plate is set',
        '<div class="panel">' +
        '<label for="pfQmMethod">Ju method</label><select id="pfQmMethod">' +
          '<option value="zhirun"' + (loadQmOpts().method === 'zhirun' ? ' selected' : '') + '>置闰 Zhi Run (default)</option>' +
          '<option value="chaibu"' + (loadQmOpts().method === 'chaibu' ? ' selected' : '') + '>拆补 Chai Bu</option></select>' +
        '<label for="pfQmVoid">Void (空亡) on hourly charts</label><select id="pfQmVoid">' +
          '<option value="hour"' + (loadQmOpts().voidBy === 'hour' ? ' selected' : '') + '>The hour\'s xun (default)</option>' +
          '<option value="day"' + (loadQmOpts().voidBy === 'day' ? ' selected' : '') + '>The day\'s xun</option></select>' +
        '<label for="pfQmLong">Year and month plates</label><select id="pfQmLong">' +
          '<option value="yearly"' + (loadQmOpts().longRule === 'yearly' ? ' selected' : '') + '>Year steps one ju each year; 辰戌丑未 months 阴7 (default)</option>' +
          '<option value="era"' + (loadQmOpts().longRule === 'era' ? ' selected' : '') + '>Year by 60-year era; 辰戌丑未 months 阴4</option></select>' +
        '<label for="pfSolar">True solar time</label><select id="pfSolar">' +
          '<option value="off"' + (loadQmOpts().trueSolar ? '' : ' selected') + '>Off: use the clock (default)</option>' +
          '<option value="on"' + (loadQmOpts().trueSolar ? ' selected' : '') + '>On: use the sun at my longitude</option></select>' +
        '<label for="pfSolarLon">My longitude in degrees east (Singapore 103.85, west is negative)</label>' +
        '<input id="pfSolarLon" type="number" step="0.01" min="-180" max="180" value="' + loadQmOpts().lon + '">' +
        '<div class="hint">True solar time corrects the clock for your longitude and the equation of time, so the hour and day pillars follow the sun. It applies to current charts on this device, and times listed as hour ranges then mean solar time. In Singapore the sun runs about 48 to 79 minutes behind the clock, which changes the double-hour for over half the day. Your own birth chart has a separate setting below.</div>' +
        '<div class="hint">置闰 follows the 符头 in 15-day blocks and repeats 芒种 or 大雪 on the schedule in the Joey Yap Ten Thousand Year Calendar; 拆补 uses the ' +
          'current solar term. They agree most days and differ near term changes. Applies to every chart on this device.</div></div>') +

      block('Birth time', 'for your own chart',
        '<div class="panel"><label for="pfZone">Time zone at birth</label><select id="pfZone">' + zoneOptions(user.birth.zone) + '</select>' +
        '<label for="pfBirthLon">Birth longitude for true solar time (optional, leave blank for the clock)</label>' +
        '<input id="pfBirthLon" type="number" step="0.01" min="-180" max="180" value="' + (user.birth.lon === undefined || user.birth.lon === null ? '' : user.birth.lon) + '">' +
        '<div class="hint">A named place uses that zone\'s offset on your birth date: Singapore, for example, was UTC+7:30 until 1982. Currently ' +
          (user.birth.tz === undefined ? 'your chart uses this device\'s offset.' : 'your birth moment is read at UTC' + (user.birth.tz >= 0 ? '+' : '') + user.birth.tz + '.') +
          ' Your chart is rebuilt when you change these, so its readings may change too.</div></div>') +

      block('Daily structures', 'the strongest Qimen structures, each morning',
        '<div class="panel">' +
        '<label class="tg-toggle"><input type="checkbox" id="pfDigest"' + (digestPrefs().notify ? ' checked' : '') + '> Notify me at 06:00 each day</label>' +
        '<div class="hint" id="pfDigestMsg">Names that day\'s strongest structure; tap it to open Strategy › Structures. The 06:00 email ' +
          'comes from the GitHub Actions job described in the README.</div></div>') +

      block('AI narrative analysis', 'your key, your account, called from this device',
        '<div class="panel">' +
        '<label for="aiProv">Provider</label>' +
        '<select id="aiProv">' +
          '<option value="gemini"' + (cfg.provider === 'gemini' ? ' selected' : '') + '>Google Gemini</option>' +
          '<option value="claude"' + (cfg.provider === 'claude' ? ' selected' : '') + '>Anthropic Claude</option>' +
        '</select>' +
        '<label for="aiModel">Model</label>' +
        '<select id="aiModel">' + modelOpts + '</select>' +
        '<label for="aiKey">API key</label>' +
        '<input id="aiKey" type="password" autocomplete="off" spellcheck="false" placeholder="' +
          (cfg.key ? 'Saved — enter a new key to replace it' : 'Paste your key') + '">' +
        '<div class="hint">' + P[cfg.provider].keyHint +
          (cfg.provider === 'gemini'
            ? ' Test connection also loads the exact models your key can run.' : '') + '</div>' +
        '<div class="err" id="aiErr"></div>' +
        '<div class="two"><button class="btn" id="aiSave">Save key</button>' +
        '<button class="btn ghost" id="aiTest">Test connection</button></div>' +
        (cfg.key ? '<button class="btn ghost" id="aiClear">Remove saved key</button>' : '') +
        '</div>' +
        '<div class="notice" style="margin-top:10px">' +
        '<b>Where the key is stored.</b> On this device only, in plain text, and sent directly to ' +
        (cfg.provider === 'claude' ? 'Anthropic' : 'Google') + ' when you ask for an analysis. ' +
        'There is no QiPath server in the path. Charts are always computed on the device — the key ' +
        'is only used for the written narrative, and every other feature works without one. ' +
        'Usage is billed to your own account, so remove the key if you hand this phone to someone else.' +
        '</div>') +

      block('AI prompts', 'refine each reading — ' + window.QPAI.promptRegistry().length + ' prompts', promptPrefsHtml()) +

      block('Profiles on this device', list.length + ' saved',
        '<div class="rows">' + list.map(function (x) {
          return '<div class="row"><span class="k">' + esc(x.name) +
            (x.id === user.id ? ' <b style="color:var(--cinnabar)">active</b>' : '') +
            '</span><span class="v"><small>Born ' + x.birth.y + '-' +
            String(x.birth.m).padStart(2,'0') + '-' + String(x.birth.d).padStart(2,'0') +
            '</small></span></div>';
        }).join('') + '</div>' +
        '<button class="btn ghost" id="pfSwitch">Switch or add a profile</button>' +
        '<button class="btn ghost" id="pfDelete">Delete this profile</button>') +

      block('About', '',
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        'Charts are computed on the device from astronomical data — solar terms from solar longitude, ' +
        'lunar months from new moons. Nothing is uploaded and there is no account. ' +
        'These are traditional interpretive systems: use the output as a structured prompt for your own ' +
        'judgement, not as fact about the future. Nothing here is medical, legal or financial advice.' +
        '</div>');

    wirePromptPrefs();

    // provider switch repopulates the model list
    $('pfQmMethod').onchange = $('pfQmVoid').onchange = $('pfQmLong').onchange = $('pfSolar').onchange = $('pfSolarLon').onchange = function () {
      var o = { method: $('pfQmMethod').value, voidBy: $('pfQmVoid').value, longRule: $('pfQmLong').value, trueSolar: $('pfSolar').value === 'on' && isFinite(parseFloat($('pfSolarLon').value)),
        lon: isFinite(parseFloat($('pfSolarLon').value)) ? parseFloat($('pfSolarLon').value) : 103.85 };
      try { localStorage.setItem(QM_OPTS_KEY, JSON.stringify(o)); } catch (e) {}
      applyQmOpts(o);
      structCache = null; tgRomCache = {}; plannerState = null; monthlyState = null;   // these were cast on the old plates
    };
    $('pfZone').onchange = $('pfBirthLon').onchange = function () {
      var list = loadProfiles(), me = list.filter(function (x) { return x.id === user.id; })[0];
      if (!me) return;
      var lv = parseFloat($('pfBirthLon').value);
      me.birth.zone = $('pfZone').value || undefined;
      me.birth.lon = isFinite(lv) ? lv : undefined;
      saveProfiles(list);
      user = enrich(me);
      structCache = null; tgRomCache = {}; plannerState = null; monthlyState = null;
      renderProfile();
    };
    $('pfDigest').onchange = function () {
      var on = $('pfDigest').checked, p = digestPrefs(); p.notify = on; saveDigestPrefs(p);
      $('pfDigestMsg').textContent = 'Working…';
      scheduleDigest(on).then(function (msg) { if ($('pfDigestMsg')) $('pfDigestMsg').textContent = msg; });
    };
    $('pfTgShow').onchange = function () { var p = tgPrefs(); p.show = $('pfTgShow').checked; saveTgPrefs(p); applyTogetherTab(); };
    $('pfTgIntim').onchange = function () { var p = tgPrefs(); p.intimacy = $('pfTgIntim').checked; saveTgPrefs(p); };
    $('aiProv').onchange = function () {
      var c = loadAI(); c.provider = $('aiProv').value;
      c.model = P[c.provider].defaultModel; c.models = null;  // list belongs to the old provider
      saveAI(c); renderProfile();
    };
    $('aiModel').onchange = function () {
      var c = loadAI(); c.model = $('aiModel').value; saveAI(c);
    };
    $('aiSave').onclick = function () {
      var k = $('aiKey').value.trim();
      if (!k) { $('aiErr').textContent = 'Paste a key first.'; return; }
      var c = loadAI(); c.provider = $('aiProv').value; c.model = $('aiModel').value;
      // A different key may offer different models, so drop the cached list only when the
      // key actually changes — never on a re-save of the same one.
      if (k !== c.key) c.models = null;
      c.key = k;
      if (!saveAI(c)) {
        $('aiErr').style.color = 'var(--cinnabar)';
        $('aiErr').textContent = 'The key could not be stored — this browser is blocking storage ' +
          '(private mode, or a file:// address). It will work for this session only.';
        return;
      }
      $('aiErr').style.color = 'var(--celadon)';
      $('aiErr').textContent = 'Key saved on this device.';
      setTimeout(renderProfile, 900);
    };
    $('aiTest').onclick = function () {
      var k = $('aiKey').value.trim();
      var c = loadAI();
      var probe = { provider: $('aiProv').value, model: $('aiModel').value, key: k || c.key };
      if (!probe.key) { $('aiErr').style.color = ''; $('aiErr').textContent = 'Paste or save a key first.'; return; }
      $('aiErr').style.color = 'var(--muted)'; $('aiErr').textContent = 'Contacting the provider…';
      window.QPAI.testKey(probe).then(function (res) {
        $('aiErr').style.color = 'var(--celadon)';
        // Persist exactly what generated, plus the model list, so analyses use the same value.
        var cc = loadAI();
        cc.provider = probe.provider; cc.key = probe.key;
        cc.model = res.model;
        if (res.models && res.models.length) cc.models = res.models;
        saveAI(cc);
        if (res.models && res.models.length) {
          $('aiModel').innerHTML = res.models.map(function (m) {
            return '<option value="' + m + '"' + (m === res.model ? ' selected' : '') + '>' + m + '</option>';
          }).join('');
          $('aiModel').value = res.model;
        }
        var extra = (res.models && res.models.length)
          ? ' Your key offers ' + res.models.length + ' model' + (res.models.length === 1 ? '' : 's') + '.'
          : '';
        $('aiErr').textContent = res.hasModel
          ? 'Connected. ' + res.model + ' generated a test response successfully.' + extra
          : 'Connected. ' + (res.wanted || 'the selected model') + ' would not run, so the model ' +
            'was switched to ' + res.model + ', which generated successfully.' + extra;
      }).catch(function (e) {
        $('aiErr').style.color = 'var(--cinnabar)'; $('aiErr').textContent = e.message;
      });
    };
    if ($('aiClear')) $('aiClear').onclick = function () {
      var c = loadAI(); c.key = ''; saveAI(c); renderProfile();
    };
    $('pfSwitch').onclick = function () {
      user = null; $('app').hidden = true; $('gate').hidden = false; showList();
    };
    $('pfDelete').onclick = function () {
      if (!window.confirm('Delete ' + user.name + ' from this device? This cannot be undone.')) return;
      saveProfiles(loadProfiles().filter(function (x) { return x.id !== user.id; }));
      window.QPNarrate.removeUser(user.id);
      user = null; $('app').hidden = true; $('gate').hidden = false; showList();
    };
  }


  /* ---------------- saved records browser ---------------- */
  var recFilter = '';

  function solarYearNow() { var t = now(); return C.fourPillars(t.y, t.m, t.d, 12, 0).solarYear; }
  function validYear(v, fallback) { v = parseInt(v, 10); return v >= 1900 && v <= 2200 ? v : fallback; }

  function renderQiZheng(host) {
    host.innerHTML = '<div class="empty">Loading the planetary tables…</div>';
    window.QPEphem.load(function (ok) {
      if (chartK !== 'qizheng' || current !== 'chart') return;
      var Q = ok ? window.QPQiZheng.chart(user.birth, user.pillars.hourBranch) : null;
      if (!Q) { host.innerHTML = '<div class="notice">Qi Zheng Si Yu needs a birth date between 1900 and 2100.</div>'; return; }
      var layout = [[5,6,7,8],[4,null,null,9],[3,null,null,10],[2,1,0,11]], cells = '', byB = {};
      Q.palaces.forEach(function (p) { byB[p.branch] = p; });
      layout.forEach(function (row, r) {
        row.forEach(function (b, c0) {
          if (b === null) return;
          var p = byB[b];
          cells += '<div class="pal' + (p === Q.ming ? ' ming' : '') + (p === Q.shen ? ' shen' : '') + '" style="grid-column:' + (c0 + 1) + ';grid-row:' + (r + 1) + '">' +
            '<div class="st">' + (p.bodies.length ? p.bodies.map(function (o) { return o.cn; }).join('<br>') : '<span style="color:var(--muted)">—</span>') + '</div>' +
            '<div><div class="nm">' + p.cn + (p === Q.shen ? ' · 身' : '') + '</div><div class="bz">' + p.branchCn + '</div></div></div>';
        });
      });
      cells += '<div class="mid"><div class="big">' + Q.mingRuler.cn + '</div><div class="sm">Life ruler<br>Life palace in ' + Q.ming.branchCn + '<br>Body palace in ' + Q.shen.branchCn + '</div></div>';
      var tcls = function (t) { return t > 0 ? 'good-t' : t < 0 ? 'bad-t' : ''; };
      host.innerHTML =
        block('Qi Zheng Si Yu 七政四餘', 'the seven bodies and four remainders at your birth',
          '<div class="board">' + cells + '</div>') +
        block('Life and Body', '', rows([
          ['Life palace 命宮', Q.ming.branchCn + ' <small>' + esc(Q.ming.note) + '</small>'],
          ['Life ruler 命主', Q.mingRuler.cn + ' ' + Q.mingRuler.en + ' <small>in ' + Q.mingRuler.palace.cn + ' ' + Q.mingRuler.palace.en + ', ' + Q.mingRuler.mansion.cn + ' ' + Q.mingRuler.deg + '°</small>'],
          ['Body palace 身宮', Q.shen.branchCn + ' ' + Q.shen.cn + ' <small>' + Q.shen.en + ', where the Moon sits</small>'],
          ['Body ruler 身主', Q.shenRuler.cn + ' ' + Q.shenRuler.en + ' <small>in ' + Q.shenRuler.palace.cn + ' ' + Q.shenRuler.palace.en + '</small>']])) +
        block('The twelve palaces', 'from Life, running backward through the branches',
          rows(Q.palaces.map(function (p) {
            return [p.cn + ' ' + p.en + ' <small>' + p.branchCn + ' &middot; ruler ' + p.ruler.cn + '</small>',
              (p.bodies.length ? p.bodies.map(function (o) { return '<span class="' + tcls(o.tone) + '">' + o.cn + '</span>'; }).join(' ') : '<span style="color:var(--muted)">empty</span>') +
              '<small>' + esc(p.note) + '</small>']; }))) +
        block('The eleven bodies', 'palace, mansion and degree',
          rows(Q.bodies.map(function (o) {
            return [o.cn + ' <small>' + o.en + (o.retro ? ' &middot; retrograde' : '') + '</small>',
              o.palace.cn + ' ' + o.branchCn + ' <small>' + o.mansion.cn + ' ' + o.mansion.en + ' ' + o.deg + '° &middot; longitude ' + o.lon + '° &middot; ' + esc(o.note) + '</small>']; })) +
          '<div class="hint">The seven bodies are true positions. 羅睺 and 計都 are the mean lunar nodes as Chinese astrologers assign them, and 月孛 is the mean lunar apogee. 紫氣 has no object in the sky, so it follows a conventional 28-year circuit. Palaces follow the solar terms. Schools differ on palaces and on 紫氣, so another chart may place some bodies differently.</div>');
    });
  }

  function hexFigure(lines, tang) {
    return '<div class="hxl">' + [5, 4, 3, 2, 1, 0].map(function (i) {
      return (lines[i] ? '━━━━━' : '━━ ━━') + (i + 1 === tang ? ' ◀' : ''); }).join('\n') + '</div>';
  }

  function renderHeLuo(host) {
    var H = window.QPHeLuo.compute(user.pillars, user.gender === 'M'), y = solarYearNow(), age = y - user.pillars.solarYear + 1;
    var cur = H.periods.filter(function (p) { return age >= p.fromAge && age <= p.toAge; })[0];
    function hexBlock(title, sub, h) {
      return block(title, sub, '<div class="panel" style="display:flex;gap:16px;align-items:center">' + hexFigure(h.lines, h.tang) +
        '<div><div style="font-size:1.1rem;color:var(--brass)">' + h.hex.name + ' ' + esc(h.hex.nameEn) + '</div><div class="hint" style="margin-top:2px">Hexagram ' + h.hex.number + ' &middot; ' +
        h.hex.upper + ' ' + esc(h.hex.upperEn) + ' over ' + h.hex.lower + ' ' + esc(h.hex.lowerEn) + '<br>元堂 line: ' + h.line + '</div></div></div>');
    }
    host.innerHTML =
      block('He Luo Li Shu 河洛理數', 'your four pillars turned into hexagrams',
        rows([['Heaven number 天數', H.numbers.heaven + ' <small>reduces to ' + H.heavenNum + '</small>'], ['Earth number 地數', H.numbers.earth + ' <small>reduces to ' + H.earthNum + '</small>'],
          ['Placement', (H.heavenOnTop ? 'Heaven trigram above Earth' : 'Earth trigram above Heaven') + (H.usedFive ? ' <small>a 5 took its trigram from the era and your gender</small>' : '')],
          ['Now', cur ? 'Age ' + age + ': ' + cur.hex.name + ' ' + cur.line + ' <small>' + cur.fromYear + ' to ' + cur.toYear + '</small>' : 'Age ' + age + ' <small>past the two hexagram cycles</small>']])) +
      hexBlock('Early heaven hexagram 先天卦', 'your starting pattern', H.first) +
      hexBlock('Later heaven hexagram 後天卦', H.swap ? 'the 元堂 line changed, trigrams swapped' : 'the 元堂 line changed, trigrams kept in place', H.second) +
      block('Life periods 大運', 'a yang line rules nine years, a yin line six; ages count from one at birth',
        rows(H.periods.map(function (p) {
          var on = p === cur;
          return [(on ? '<b style="color:var(--brass)">' : '') + 'Age ' + p.fromAge + ' to ' + p.toAge + (on ? ' (now)</b>' : '') + ' <small>' + p.fromYear + ' to ' + p.toYear + '</small>',
            p.hex.name + ' ' + p.line + ' <small>' + (p.stage === 'Early' ? 'early heaven' : 'later heaven') + ' &middot; ' + (p.yang ? 'yang' : 'yin') + ' line, ' + p.years + ' years</small>']; })) +
        '<div class="hint">Schools differ on small points, especially when a total reduces to 5. Yearly and monthly hexagrams are not included.</div>');
  }

  function renderCombined(host) {
    host.innerHTML = '<div class="empty">Reading the five systems…</div>';
    window.QPEphem.load(function (ok) {
      if (chartK !== 'combined' || current !== 'chart') return;
      lastSavedId = null; currentAI = null;
      var qz = null, y = solarYearNow(), M;
      try { qz = ok ? window.QPQiZheng.chart(user.birth, user.pillars.hourBranch) : null; } catch (e) { qz = null; }
      try { M = window.QPCombined.compute(user, y, qz); } catch (e) { host.innerHTML = '<div class="notice">' + esc(e.message) + '</div>'; return; }
      var cls = { Strong: 'good-t', Steady: '', Weak: 'bad-t' }, sign = function (v) { return (v > 0 ? '+' : '') + v; };
      var tag = function (a) { return a.agree === 'Agree' ? (a.up ? a.up : a.down) + ' agree' : a.agree === 'Split' ? 'systems split' : 'few signals'; };
      var names = function (l) { return l.map(function (a) { return a.label + ' <small>' + sign(a.score) + '</small>'; }).join('<br>'); };
      var care = window.QPSystems.HEALTH_CARE;
      host.innerHTML =
        block('Combined reading 合參', 'BaZi, Zi Wei, Qimen Destiny, Qi Zheng and He Luo',
          '<div class="hint" style="margin-top:0">Each system scores an area from -3 to +3 only where it has something of its own to say, and the level is their plain average. This weighing is the app\'s own, as no classical text sets one.' +
            (M.usedQiZheng ? '' : ' Qi Zheng is left out because its tables cover births from 1900 to 2100.') + '</div>' +
          rows([['Strongest', names(M.top)], ['Needs most care', names(M.low)], ['Systems disagree on', M.split.length ? M.split.map(function (a) { return esc(a.label); }).join(', ') : 'none of the areas']])) +
        '<button class="btn ghost" id="cbOpen">Open all areas</button>' +
        M.groups.map(function (g) {
          var list = M.areas.filter(function (a) { return a.group === g[0]; });
          return block(g[1] + ' ' + g[2], list.length + ' areas', '<div style="display:grid;gap:6px">' + list.map(function (a) {
            return '<details class="pp cbA"><summary><span class="' + cls[a.level] + '">' + esc(a.label) + ' — ' + a.level + (a.isNew ? ' <b style="color:var(--brass);font-weight:400">new</b>' : '') + '</span>' +
              '<small>' + a.cn + ' &middot; ' + sign(a.score) + '<br>' + tag(a) + '</small></summary>' +
              '<div class="hint" style="margin-top:0">' + esc(a.covers) + '</div>' +
              '<div class="plain" style="margin-top:6px"><b>What this means for you.</b> ' + esc(a.meaning) + '</div>' +
              '<div class="plain" style="margin-top:6px"><b>How sure is this?</b> ' + esc(a.sure) + '</div>' +
              '<div class="plain" style="margin-top:6px"><b>What each system shows</b>' + M.systems.map(function (s0) {
                var r = a.per[s0[0]];
                return r ? '<div style="margin-top:4px"><b>' + s0[1] + ' ' + sign(r.v) + '.</b> ' + esc(r.why) + (r.via ? ' <small style="display:inline;color:var(--muted)">No direct symbol, so this reads ' + esc(r.via) + '.</small>' : '') + '</div>' : '';
              }).join('') + '</div>' +
              '<div class="todo" style="margin-top:8px"><b>What to do</b><ol style="margin:4px 0 0;padding-left:20px">' + a.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>' +
              (a.key === 'health' || a.key === 'vitality' || a.key === 'emotions' ? '<div class="hint">' + esc(care.text) + '</div>' : '') + '</details>';
          }).join('') + '</div>');
        }).join('') +
        block('AI analysis of the combined chart', 'written with your own API key', '<div id="aiCombined"></div>') +
        saveBar('cbSave', 'Save this combined reading');
      $('cbOpen').onclick = function () {
        var all = host.querySelectorAll('details.cbA'), open = !all[0].open;
        all.forEach(function (x) { x.open = open; });
        this.textContent = open ? 'Close all areas' : 'Open all areas';
      };
      wireSave('cbSave', function () {
        var brief = function (a) { return { label: a.label, score: a.score }; };
        return { kind: 'combined', title: 'Combined reading · ' + user.pillars.day.cn,
          subtitle: 'BaZi, Zi Wei, Qimen, ' + (M.usedQiZheng ? 'Qi Zheng, ' : '') + 'He Luo · read in ' + y,
          when: { date: user.birth.y + '-' + pad2(user.birth.m) + '-' + pad2(user.birth.d), range: user.pillars.hourRange },
          payload: { type: 'combined', year: y, usedQiZheng: M.usedQiZheng, systems: M.systems, top: M.top.map(brief), low: M.low.map(brief),
            split: M.split.map(function (a) { return a.label; }),
            areas: M.areas.map(function (a) { return { key: a.key, label: a.label, cn: a.cn, level: a.level, score: a.score, agree: a.agree, up: a.up, down: a.down, covers: a.covers, meaning: a.meaning, sure: a.sure, steps: a.steps, isNew: a.isNew, per: a.per }; }) } };
      });
      aiPanelSaving('aiCombined', 'combined', 'v2.' + y, function (cfg) { return window.QPAI.analyseCombined(cfg, user, M, y); }, [
        { label: 'Overview', path: 'overview' }, { label: 'Where the systems agree you are strong', path: 'strengths' },
        { label: 'Where they agree it is hard', path: 'challenges' }, { label: 'Where they disagree', path: 'disagreements' },
        { label: 'Life areas', path: 'lifeAreas', list: 'areas' }, { label: 'Priorities', path: 'guidance' }, { label: 'What would change this', path: 'caution' }
      ]);
    });
  }

  var zodiacYear = null;
  function renderZodiac(host) {
    var y = zodiacYear || solarYearNow(), Z = window.QPZodiac.personal(user, y);
    var mine = {};
    Z.pillars.forEach(function (x) { (mine[x.sign.branch] = mine[x.sign.branch] || []).push(x.pillar); });
    var cls = { Supported: 'good-t', Balanced: 'good-t', Mixed: 'bad-t', Pressured: 'bad-t' };
    function marks(s, pick) { return s.marks.filter(pick).map(function (m) { return esc(m.en) + ' ' + m.cn + ': ' + esc(m.note); }); }
    function detail(s) {
      var good = marks(s, function (m) { return m.tone > 0; }), mid = marks(s, function (m) { return m.tone === 0; }), bad = marks(s, function (m) { return m.tone < 0; });
      return '<div class="plain"><b>' + s.duke.en + ' ' + s.duke.cn + '.</b> ' + esc(s.duke.note) + '</div>' +
        '<div class="plain" style="margin-top:6px"><b>' + s.stage.en + ' ' + s.stage.cn + '.</b> ' + esc(s.stage.note) + '</div>' +
        (good.length ? '<div class="plain" style="margin-top:6px"><b class="good-t">Helpful</b><br>' + good.join('<br>') + '</div>' : '') +
        (mid.length ? '<div class="plain" style="margin-top:6px"><b>Depends on use</b><br>' + mid.join('<br>') + '</div>' : '') +
        (bad.length ? '<div class="plain" style="margin-top:6px"><b class="bad-t">Take care</b><br>' + bad.join('<br>') + '</div>' : '');
    }
    host.innerHTML =
      block('Zodiac forecast 生肖', Z.pillar + ' year',
        '<div class="panel"><label for="zdYear">Year</label><input id="zdYear" type="number" min="1900" max="2200" value="' + y + '">' +
        '<div class="hint">The outlook word is this app\'s own weighing of each sign\'s markers. Years run from Li Chun in early February.</div></div>') +
      block('Your chart this year', 'each pillar carries the markers of its animal',
        rows(Z.pillars.map(function (x) {
          return [x.pillar + ' <small>' + x.cn + ' &middot; ' + x.sign.en + '</small>',
            '<span class="' + cls[x.sign.outlook] + '">' + x.sign.outlook + '</span> <small>' + x.sign.duke.en + ' ' + x.sign.duke.cn + ' &middot; ' + esc(x.area) + '</small>']; }))) +
      block('All twelve signs', 'tap a sign for its markers',
        '<div style="display:grid;gap:6px">' + Z.signs.map(function (s) {
          return '<details class="pp"><summary><span>' + s.cn + ' ' + s.en + (mine[s.branch] ? ' <b style="color:var(--brass)">' + mine[s.branch].join(', ') + '</b>' : '') + '</span>' +
            '<small><span class="' + cls[s.outlook] + '">' + s.outlook + '</span><br>' + s.duke.en + '</small></summary>' + detail(s) + '</details>';
        }).join('') + '</div>');
    $('zdYear').onchange = function () { zodiacYear = validYear(this.value, y); renderZodiac(host); };
  }

  var mobilityYear = null;
  function mobilityKey(y) { return 'qipath.mobility.' + user.id + '.' + y; }
  function renderMobility(host) {
    var Q = window.QPQimen, y = mobilityYear || solarYearNow(), saved = 0;
    try { saved = parseInt(localStorage.getItem(mobilityKey(y)), 10) || 0; } catch (e) { saved = 0; }
    var M = Q.mobility(user, y, saved);
    host.innerHTML =
      block('Mobility directions 出行方', M.pillar + ' year &middot; plate ' + M.plate,
        '<div class="panel"><label for="mbYear">Year</label><input id="mbYear" type="number" min="1900" max="2200" value="' + y + '">' +
        '<label for="mbCentre">Centre god (not shown on the compass)</label><select id="mbCentre">' +
          '<option value="0"' + (saved ? '' : ' selected') + '>Year star: ' + Q.NINE_NOBLES[M.autoCentre].en + ' ' + Q.NINE_NOBLES[M.autoCentre].cn + ' (default)</option>' +
          Q.NINE_NOBLES.slice(1).map(function (g) { return '<option value="' + g.n + '"' + (saved === g.n ? ' selected' : '') + '>' + g.en + ' ' + g.cn + '</option>'; }).join('') + '</select>' +
        '<div class="hint">The gods run ' + (M.forward ? 'forward' : 'backward') + ' around the palaces because your natal plate is ' + (M.forward ? 'Yang' : 'Yin') + '. ' +
          'Thrive reports use a personal centre whose rule is not published, so the default here can differ. If you have a Thrive report for this year, choose the one god its list leaves out and all eight directions will match it.</div></div>') +
      block('Directions, strongest first', 'scored on the year plate at each direction',
        rows(M.rows.map(function (r) {
          return [esc(r.dir) + ' <small>' + r.num + ' ' + r.name + ' &middot; score ' + r.score + '</small>',
            '<b class="' + (r.noble.tone > 0 ? 'good-t' : r.noble.tone < 0 ? 'bad-t' : '') + '">' + r.noble.en + ' ' + r.noble.cn + '</b> <small>' + esc(r.noble.theme) + '</small>' +
            '<small>' + esc(r.door || '') + ' &middot; ' + esc(r.star || '') + ' &middot; ' + esc(r.deity || '') + (r.isEmpty ? ' &middot; void' : '') + '</small>']; })) +
        '<div class="hint">A direction is measured from where you normally live or work. The score reads the year plate. The god names the theme of the trip.</div>');
    $('mbYear').onchange = function () { mobilityYear = validYear(this.value, y); renderMobility(host); };
    $('mbCentre').onchange = function () {
      try { if (+this.value) localStorage.setItem(mobilityKey(y), this.value); else localStorage.removeItem(mobilityKey(y)); } catch (e) {}
      renderMobility(host);
    };
  }

  var journalK = 'saved';
  function renderJournal() {
    var host = $('journalBody');
    if (journalK === 'audio') { renderJournalAudio(host); return; }
    if (journalK === 'outcomes') { renderJournalOutcomes(host); return; }
    host.innerHTML = block('Saved readings', '', '<div id="recHost"></div>') +
      block('AI readings on this device', 'kept when the app closes', '<div id="narrHost"></div>');
    renderRecords();
    paintNarrStats();
  }

  // Saved readings that make a claim about what will happen. Numbers have their own ledger in Numbers Lab.
  var OUTCOME_KINDS = ['forecast', 'plan', 'manifest', 'sancai', 'yijing', 'annual', 'counter', 'strategy', 'search', 'coaching'];
  var OUTCOME_LABEL = { hit: 'Happened', partly: 'Partly', miss: 'Did not happen' };

  function renderJournalOutcomes(host) {
    var list = R.all(user.id).filter(function (r) { return OUTCOME_KINDS.indexOf(r.kind) >= 0; });
    var open = list.filter(function (r) { return !r.outcome; }), done = list.filter(function (r) { return r.outcome; });
    if (!list.length) {
      host.innerHTML = block('Outcomes', 'forecasts compared with what happened', '<div class="empty">Nothing to compare yet. Save a Forecast, Date Selection, Manifest or other reading, then come back once it has played out.</div>');
      return;
    }
    function tally(rs) {
      var t = { hit: 0, partly: 0, miss: 0 };
      rs.forEach(function (r) { t[r.outcome.result]++; });
      t.n = rs.length; t.rate = rs.length ? Math.round((t.hit + t.partly / 2) / rs.length * 100) : 0;
      return t;
    }
    function line(t) { return t.rate + '% <small>' + t.hit + ' happened, ' + t.partly + ' partly, ' + t.miss + ' did not, of ' + t.n + '</small>'; }
    var kinds = OUTCOME_KINDS.filter(function (k) { return done.some(function (r) { return r.kind === k; }); });
    var head = function (r) {
      return '<span class="b" data-rid="' + r.id + '"><b>' + esc(r.title) + '</b><small>' + esc(r.subtitle) + '</small>' +
        '<small style="color:var(--brass)">' + R.KINDS[r.kind].label + ' · saved ' + r.savedAt.slice(0, 10) + ' · tap to reread</small></span>';
    };
    host.innerHTML =
      (done.length ? block('How your readings have held up', done.length + ' logged',
        rows([['All readings', line(tally(done))]].concat(kinds.map(function (k) {
          return [R.KINDS[k].label, line(tally(done.filter(function (r) { return r.kind === k; })))]; }))) +
        (done.length < 20 ? '<div class="hint">Fewer than 20 outcomes is too few to say a method works. This is your own judgement of each reading, and partly counts as half.</div>' : '')) : '') +
      block('Waiting for an outcome', open.length ? String(open.length) : '',
        open.length ? open.map(function (r) {
          return '<div class="panel" style="margin-bottom:10px"><div class="rec" style="padding:0;border:0;background:none">' + head(r) + '</div>' +
            '<label for="oc-' + r.id + '">What happened (optional)</label><textarea id="oc-' + r.id + '" rows="2" maxlength="500"></textarea>' +
            '<div class="seg" style="margin:8px 0 0">' + ['hit', 'partly', 'miss'].map(function (x) {
              return '<button data-oc="' + r.id + '" data-res="' + x + '">' + OUTCOME_LABEL[x] + '</button>'; }).join('') + '</div></div>';
        }).join('') : '<div class="empty">Every saved reading has an outcome logged.</div>') +
      (done.length ? block('Logged', '', done.map(function (r) {
        return '<div class="panel" style="margin-bottom:10px"><div class="rec" style="padding:0;border:0;background:none">' + head(r) + '</div>' +
          '<div style="margin-top:8px;font-size:.88rem"><b>' + OUTCOME_LABEL[r.outcome.result] + '</b> · ' + esc(r.outcome.at) + '</div>' +
          (r.outcome.note ? '<div class="plain" style="margin-top:4px">' + esc(r.outcome.note) + '</div>' : '') +
          '<button class="btn ghost" data-occlear="' + r.id + '">Change this outcome</button></div>';
      }).join('')) : '');
    host.querySelectorAll('[data-rid]').forEach(function (b) {
      b.onclick = function () { openRecord(R.get(user.id, b.dataset.rid)); };
    });
    host.querySelectorAll('[data-oc]').forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.oc, t = now();
        R.setOutcome(user.id, id, { result: b.dataset.res, note: $('oc-' + id).value.trim(), at: isoOf(t) });
        renderJournalOutcomes(host);
      };
    });
    host.querySelectorAll('[data-occlear]').forEach(function (b) {
      b.onclick = function () { R.setOutcome(user.id, b.dataset.occlear, null); renderJournalOutcomes(host); };
    });
  }

  function renderJournalAudio(host) {
    var N = window.QPNarrate;
    var list = N.list(user.id).sort(function (a, b) { return a.made < b.made ? 1 : -1; });
    if (!list.length) {
      host.innerHTML = block('Narrations', '', '<div class="empty">No narrations yet. Create one from a script in Strategy › Manifest.</div>');
      return;
    }
    host.innerHTML = block('Narrations', list.length + ' on this device',
      '<audio id="jnAudio" controls style="width:100%"></audio><div id="jnMsg" class="hint" aria-live="polite"></div>' +
      '<div class="panel" style="margin-top:10px">' + list.map(function (x, i) {
        return '<div style="padding:8px 0;' + (i ? 'border-top:1px solid var(--line)' : '') + '">' +
          '<div style="font-size:.9rem;overflow-wrap:anywhere">' + esc(x.title) + '</div>' +
          '<div style="font-size:.76rem;color:var(--muted)">' + narrClock(x.seconds) + ' · ' + (x.bytes / 1048576).toFixed(1) + ' MB · ' + esc(x.voice) + ' · ' + esc(x.made.slice(0, 10)) + '</div>' +
          '<button class="btn ghost" data-jplay="' + i + '">Play</button>' +
          '<button class="btn ghost" data-jdel="' + i + '">Delete</button></div>';
      }).join('') + '</div>');
    var el = $('jnAudio'), playing = null, retried = false;
    function failed() { $('jnMsg').textContent = 'That audio could not be played.'; N.keepAwake(false); }
    el.onended = function () { N.keepAwake(false); };
    el.onerror = function () {
      if (!playing || retried) { if (playing) failed(); return; }
      retried = true;
      N.sourceInMemory(playing).then(function (src) { el.src = src; return el.play(); }).catch(failed);
    };
    host.querySelectorAll('[data-jplay]').forEach(function (b) {
      b.onclick = function () {
        playing = list[+b.dataset.jplay]; retried = false;
        $('jnMsg').textContent = 'Playing: ' + playing.title;
        N.keepAwake(true);
        N.source(playing).then(function (src) { el.src = src; return el.play(); })
          .catch(function (e) { if (!e || (e.name !== 'AbortError' && e.name !== 'NotAllowedError')) failed(); });
      };
    });
    host.querySelectorAll('[data-jdel]').forEach(function (b) {
      b.onclick = function () {
        var x = list[+b.dataset.jdel];
        if (!window.confirm('Delete this narration?')) return;
        N.remove(x).then(function () { renderJournalAudio(host); }, function () { renderJournalAudio(host); });
      };
    });
  }

  function renderRecords() {
    var host = $('recHost');
    if (!host) return;
    var counts = R.counts(user.id);
    var list = R.byKind(user.id, recFilter || null);

    var chips = '<div class="chips"><button class="chip" data-rk=""' +
      (recFilter === '' ? ' aria-selected="true"' : '') + '>All ' + counts._total + '</button>' +
      Object.keys(R.KINDS).filter(function (k) { return counts[k] > 0; }).map(function (k) {
        return '<button class="chip" data-rk="' + k + '"' +
          (recFilter === k ? ' aria-selected="true"' : '') + '>' +
          R.KINDS[k].label + ' ' + counts[k] + '</button>';
      }).join('') + '</div>';

    host.innerHTML = counts._total
      ? chips + (list.length
          ? list.map(function (r) {
              return '<div class="rec"><span class="ic">' + R.KINDS[r.kind].icon + '</span>' +
                '<span class="b" data-rid="' + r.id + '"><b>' + esc(r.title) + '</b>' +
                '<small>' + esc(r.subtitle) + '</small>' +
                '<small style="color:var(--brass)">' + R.KINDS[r.kind].label +
                (r.ai ? ' · has AI reading' : '') + (r.outcome ? ' · outcome logged' : '') + ' · saved ' + r.savedAt.slice(0,10) + '</small></span>' +
                '<button class="x" data-del="' + r.id + '" aria-label="Delete">&times;</button></div>';
            }).join('') + '<button class="btn ghost" id="recExport">Export all records</button>'
          : '<div class="empty">Nothing saved under that filter.</div>')
      : '<div class="panel" style="font-size:.9rem;line-height:1.7;color:var(--muted)">' +
        'Nothing saved yet. The chart, Strategy and Numbers Lab screens have a save button — ' +
        'saved items appear here, tied to this profile.</div>';

    host.querySelectorAll('[data-rk]').forEach(function (b) {
      b.onclick = function () { recFilter = b.dataset.rk; renderRecords(); };
    });
    host.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        if (!window.confirm('Delete this record?')) return;
        R.remove(user.id, b.dataset.del); renderRecords();
      };
    });
    host.querySelectorAll('[data-rid]').forEach(function (b) {
      b.onclick = function () { openRecord(R.get(user.id, b.dataset.rid)); };
    });
    if ($('recExport')) $('recExport').onclick = function () {
      var blob = R.exportAll(user.id);
      openSheet('Export', counts._total + ' records as JSON',
        '<div class="panel"><textarea rows="14" readonly style="width:100%;padding:10px;' +
        'background:var(--raised-2);border:1px solid var(--line);border-radius:3px;color:var(--rice);' +
        'font-size:.72rem;line-height:1.5">' + esc(blob) + '</textarea>' +
        '<button class="btn ghost" id="expCopy">Copy to clipboard</button></div>',
        function () {
          $('expCopy').onclick = function () {
            if (navigator.clipboard) navigator.clipboard.writeText(blob).then(function () {
              $('expCopy').textContent = 'Copied';
            });
          };
        });
    };
  }

  function openRecord(r) {
    if (!r) return;
    var p = r.payload || {};
    var body = '';

    function kv(pairs) {
      return '<div class="rows">' + pairs.filter(function (x) {
        return x[1] !== undefined && x[1] !== null && x[1] !== ''; }).map(function (x) {
        return '<div class="row"><span class="k">' + x[0] + '</span><span class="v">' +
          (typeof x[1] === 'string' ? esc(x[1]) : esc(String(x[1]))) + '</span></div>';
      }).join('') + '</div>';
    }

    if (r.kind === 'forecast') {
      body += kv([['Question', p.question || '—'], ['Matter', p.scenarioName],
        ['Method', p.method ? p.method + (p.methodCn ? ' · ' + p.methodCn : '') : '—'],
        ['Read as', p.poles ? p.poles.matter + ' against ' + p.poles.self : '—'],
        ['Useful god', p.yong], ['Verdict', p.verdict + ' (' + p.score + ')'],
        ['Direction', p.direction], ['Pillars', (p.pillars||[]).join(' ')],
        ['Plate', p.dun + ' ju ' + p.ju + ' · ' + p.term],
        ['Chief / envoy', p.chief + ' / ' + p.envoy],
        ['Constellation', p.mansion], ['Void', (p.voids||[]).join(' ')]]);
      if (p.advice) body += '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
        esc(p.advice) + '</div>';
      if (p.findings) body += '<div class="block"><h2>Findings</h2>' + p.findings.map(function (f) {
        return '<div class="find ' + toneCls(f.tone) + '"><b>' + esc(f.label) + '</b><span>' +
          esc(f.text) + '</span></div>'; }).join('') + '</div>';
      if (p.frame && window.QPAI.PROTOCOLS[p.frame.protocol]) body += kv([
        ['Question type', window.QPAI.PROTOCOLS[p.frame.protocol].label],
        ['Time frame', p.frame.timeframe || '—']].concat(p.frame.options && p.frame.options.length === 2 ?
        [['Options', 'A: ' + p.frame.options[0] + ' / B: ' + p.frame.options[1]]] : []));
      body += fibRecordHtml(p.fib);
      if (p.math) body += '<div class="block"><h2>Quantitative layer</h2>' + kv([
        ['Energy hub', p.math.hub], ['Best palace for you', p.math.personalBest],
        ['Concentration λ₁/|λ₂|', p.math.concentration],
        ['Long-run share (Fav/Work/Guard/Unfav)', (p.math.stationary || []).join('% / ') + '%'],
        ['Expected double-hours to Favourable', p.math.expectedToFavourable],
        ['Entropy rate', p.math.entropy + ' bits'],
        ['Dominant cycles', (p.math.cycles || []).join('; ')],
        ['Clarity percentile', p.math.clarityPercentile !== undefined ? p.math.clarityPercentile + 'th' : ''],
        ['Equilibrium stance', p.math.stance ? p.math.stance + ' (value ' + p.math.gameValue + ')' : ''],
        ['Lyapunov λ', p.math.lyapunov]]) + '</div>';
    }
    else if (r.kind === 'yijing') {
      body += kv([['Question', p.question || '—'], ['Cast at', p.castAt],
        ['Hexagram', p.number + ' ' + p.name + ' · ' + p.nameEn],
        ['Trigrams', p.upper + ' ' + p.upperEn + ' over ' + p.lower + ' ' + p.lowerEn],
        ['Moving line', 'Line ' + p.moving],
        ['Changes to', p.changedNumber + ' ' + p.changedName + ' · ' + p.changedNameEn],
        ['Nuclear', p.nuclearName ? p.nuclearNumber + ' ' + p.nuclearName + ' · ' + p.nuclearNameEn : ''],
        ['体用', p.tiYong ? p.tiYong.ti + ' (体) / ' + p.tiYong.yong + ' (用) — ' + p.tiYong.relationText : ''],
        ['Pillars', (p.pillars||[]).join(' ')]]);
      if (p.timing) body += '<div class="block"><h2>應期 timing</h2>' + kv(p.timing.map(function (t) {
        return [t.basis, t.n + ' → ' + t.days + ' (days) · ' + t.months + ' (months)']; })) + '</div>';
      body += fibRecordHtml(p.fib);
    }
    else if (r.kind === 'manifest') {
      body += kv([['Face', p.direction], ['Palace', p.palace],
        ['Hour pillar', p.hourPillar], ['Day pillar', p.dayPillar],
        ['Plate', p.dun + ' ju ' + p.ju], ['Gatekeeper', p.deity + ' — ' + p.quality],
        ['Ask register', (p.askDoor || '') + '门']]);
      if (p.aspects && p.aspects.length) body += '<div class="block"><h2>What you asked for</h2><div class="panel" style="font-size:.9rem;line-height:1.7">' +
        p.aspects.map(esc).join('<br>') + '</div></div>';
      if (p.returns && p.returns.length) body += '<div class="block"><h2>What you committed to give</h2><div class="panel" style="font-size:.9rem;line-height:1.7">' +
        p.returns.map(esc).join('<br>') + '</div></div>';
      if (p.script) body += '<div class="block"><h2>The script</h2><div class="script">' +
        esc(p.script) + '</div></div><div class="block"><h2>Narration audio</h2><div id="recNarr"></div></div>';
      if (p.exchange) body += '<div class="block"><h2>Returning the favour</h2>' +
        '<div class="panel" style="font-size:.9rem;line-height:1.7">' + esc(p.exchange.element) +
        '<br><br>' + (p.exchange.acts||[]).map(esc).join('<br>') + '</div></div>';
    }
    else if (r.kind === 'plan') {
      body += kv([['Activity', p.activity + ' · ' + p.activityCn], ['Score', p.score + '/100'],
        ['Day pillar', p.dayPillar], ['Officer', p.officer],
        ['Duty spirit', p.duty + (p.yellow ? ' (yellow path)' : ' (black path)')],
        ['Constellation', p.mansion + ' ' + p.mansionEn],
        ['Clashes', p.clash], ['Void', (p.voids||[]).join(' ')]]);
      if (p.hours) body += '<div class="block"><h2>Hour priority</h2><div class="rows">' +
        p.hours.map(function (h) {
          return '<div class="row"><span class="k">' + h.rank + '. ' + h.branch + ' ' + h.range +
            '</span><span class="v">' + h.score + '/10 <small>' + h.door + '</small></span></div>';
        }).join('') + '</div></div>';
      if (p.reasons) body += '<div class="panel" style="margin-top:10px;font-size:.88rem;line-height:1.7">' +
        p.reasons.map(esc).join('<br>') + '</div>';
    }
    else if (r.kind === 'search' || r.kind === 'strategy') {
      var f = p.formation || {};
      body += kv([['Formation', f.name + ' · ' + f.nameEn], ['Category', f.category],
        ['Seasonal strength', f.seasonalStrength],
        ['Day / hour', (p.dayPillar||'') + ' · ' + (p.hourPillar||'')],
        ['Plate', p.dun + ' ju ' + p.ju], ['Chief / envoy', p.chief + ' / ' + p.envoy],
        ['Constellation', p.mansion], ['Void', (p.voids||[]).join(' ')]]);
      if (f.description) body += '<div class="panel" style="margin-top:10px;font-size:.9rem;line-height:1.7">' +
        esc(f.description) + '</div>';
      if (p.palaces) body += '<div class="block"><h2>Palace detail</h2>' +
        p.palaces.filter(Boolean).map(snapshotCard).join('') + '</div>';
    }
    else if (r.kind === 'chart' && p.type !== 'fsaudit' && p.type !== 'fengshui') {
      body += kv([['Chart type', p.typeLabel], ['Scope', p.scope],
        ['Pillars', (p.pillars||[]).join(' ')],
        ['Plate', p.dun + ' ju ' + p.ju + ' · ' + p.yuan], ['Solar term', p.term],
        ['Chief', p.chief], ['Envoy', p.envoy + ' (palace ' + p.envoyPalace + ')'],
        ['Constellation', p.mansion], ['Void', (p.voids||[]).join(' ')]]);
      if (p.destiny) body += '<div class="block"><h2>Destiny palace</h2>' + kv([
        ['Palace', p.destiny.palace + ' ' + p.destiny.name + ' · ' + p.destiny.dir],
        ['Life Stem', p.destiny.lifeStem + ' over ' + p.destiny.earthStem],
        ['Door of Destiny', p.destiny.door], ['Star of Destiny', p.destiny.star],
        ['Guardian of Destiny', p.destiny.guardian],
        ['Life Star', p.lifeStar ? p.lifeStar.num + ' ' + p.lifeStar.en : ''],
        ['Life Gua', p.lifeGua ? p.lifeGua.num + ' ' + p.lifeGua.cn + ' (' + p.lifeGua.group + ' group)' : '']]) +
        (p.dmStars ? kv([['Day Master stem', p.dayMaster ? p.dayMaster.stem + ' ' + p.dayMaster.en : '']].concat(
          p.dmStars.map(function (s) { return [s.en + ' ' + s.cn, s.branches.join('; ')]; }))) : '') + '</div>';
      if (p.lifePalaces) body += '<div class="block"><h2>Life palaces</h2>' + kv(p.lifePalaces.map(function (a) {
        return [a.en + ' ' + a.cn, a.palace + ' ' + a.name + ' · ' + a.dir]; })) + '</div>';
      if (p.plate) body += '<div class="block"><h2>Palaces</h2>' +
        p.plate.filter(function (x) { return x && x.num !== 5; }).map(snapshotCard).join('') + '</div>';
    }
    else if (p.type === 'fengshui') {
      body += kv([['Property', p.property + (p.propertyType ? ' · ' + p.propertyType : '')],
        ['Period', p.period], ['Facing', p.facing + ' ' + p.facingDegrees + '° ' + p.facingDir],
        ['Sitting', p.sitting], ['Chart type', p.chartType]]);
      if (p.scope) body += '<div class="panel" style="margin-top:10px;font-size:.9rem;' +
        'line-height:1.7">' + esc(p.scope) + '</div>';
      if (p.sectors) body += '<div class="block"><h2>The nine palaces</h2><div class="rows">' +
        p.sectors.map(function (x) {
          return '<div class="row"><span class="k">' + esc(x.dir) + '</span><span class="v">' +
            x.mountain + '-' + x.water + ' <small>period ' + x.period + ' · annual ' + x.annual +
            (x.afflictions && x.afflictions.length ? ' · ' + x.afflictions.join(' ') : '') +
            '</small></span></div>';
        }).join('') + '</div></div>';
      if (p.afflictions) body += '<div class="block"><h2>This year</h2>' + kv([
        ['太歲 Tai Sui', p.afflictions.taiSui],
        ['歲破 Year Breaker', p.afflictions.yearBreaker],
        ['三煞 Three Killings', (p.afflictions.threeKillings || []).join(', ')],
        ['五黃 Five Yellow', p.afflictions.fiveYellow]]) + '</div>';
    }
    else if (p.type === 'fsaudit') {
      body += kv([['Property', p.property], ['Period', p.period],
        ['Facing', p.facing + ' ' + (p.facingDir || '')],
        ['Chart type', p.chartType],
        ['Findings', (p.counts ? p.counts.high + ' high, ' + p.counts.medium +
          ' medium, ' + p.counts.low + ' low' : '—')],
        ['Rooms', (p.rooms || []).join(', ') || 'none placed']]);
      if (p.findings) body += '<div class="block"><h2>Findings</h2>' +
        p.findings.map(function (f) {
          return '<div class="finding ' + f.severity + '"><h4>' + esc(f.title) +
            '<span>' + esc(f.sector || 'chart') + '</span></h4>' +
            '<div class="cause">' + esc(f.cause) + '</div>' +
            (f.cure ? '<div class="cure">' + esc(f.cure) + '</div>' : '') +
            (f.avoid ? '<div class="avoid">Avoid: ' + esc(f.avoid) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      if (p.unseen) body += '<div class="block"><h2>What it could not see</h2>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        p.unseen.map(esc).join('<br>') + '</div></div>';
    }
    else if (r.kind === 'sancai') {
      body += '<div class="tri h">' +
        '<div><div class="t">\u5929 Heaven</div><div class="n">' +
          ((p.layers || {}).heaven || '—') + '</div><div class="m">' +
          esc(p.heaven ? p.heaven.officer : '') + '</div></div>' +
        '<div><div class="t">\u5730 Earth</div><div class="n">' +
          ((p.layers || {}).earth || '—') + '</div><div class="m">' + esc(p.sitIn || '') + '</div></div>' +
        '<div><div class="t">\u4EBA Man</div><div class="n">' +
          ((p.layers || {}).man || '—') + '</div><div class="m">face ' + esc(p.face || '') + '</div></div>' +
        '</div>';
      body += kv([['Objective', p.goal + (p.goalCn ? ' · ' + p.goalCn : '')],
        ['Score', p.composite + '/100 ' + p.band],
        ['φ-refined', p.refined !== undefined ? p.refined + ' (momentum ' + p.momentum + ')' : ''],
        ['When', p.when + (p.hourLabel ? ' · ' + p.hourLabel : '')],
        ['Sit in', p.sitIn + ' sector — annual star ' + p.sectorAnnual +
          ', monthly ' + p.sectorMonthly],
        ['Face', p.face],
        ['Ask for', p.manifestFor],
        ['Heaven', p.heaven && p.heaven.line],
        ['Man', p.man && p.man.line]]);
      if (p.action) body += '<div class="panel" style="margin-top:10px;font-size:.9rem;' +
        'line-height:1.7"><b style="color:var(--brass)">Action</b><br>' + esc(p.action) + '</div>';
      body += fibRecordHtml(p.fib);
      if (p.math) body += '<div class="block"><h2>Quantitative layer</h2>' + kv([
        ['Stance across the table', p.math.stance ? p.math.stance + ' (value ' + p.math.gameValue + ')' : ''],
        ['Fuzzy layer alignment', p.math.fuzzyAnd + ' (weakest ' + p.math.weakest + ')'],
        ['Decisiveness', Math.round(p.math.decisiveness * 100) + '%'],
        ['Cost of slipping one double-hour', p.math.slipDrop], ['Lyapunov λ', p.math.lyapunov],
        ['Layer that decides the ranking', p.math.driver || ''],
        ['Campaign path', (p.math.campaign || []).join('; ')],
        ['Long-run share Strong', p.math.strongShare !== undefined ? p.math.strongShare + '%' : ''],
        ['Expected wait to Strong', p.math.waitToStrong !== undefined && p.math.waitToStrong !== null ? p.math.waitToStrong + ' double-hours' : '']]) + '</div>';
      if (p.sectorWhy) body += '<div class="block"><h2>Why this sector</h2>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        p.sectorWhy.map(esc).join('<br>') + '</div></div>';
      if (p.facingWhy) body += '<div class="block"><h2>Why this facing</h2>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        p.facingWhy.map(esc).join('<br>') + '</div></div>';
      if (p.man && p.man.palace) body += '<div class="block"><h2>Facing palace</h2>' +
        snapshotCard(p.man.palace) + '</div>';
      if (p.cautions) body += '<div class="block"><h2>Cautions</h2>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        p.cautions.map(function (c) { return '· ' + esc(c); }).join('<br>') + '</div></div>';
    }
    else if (r.kind === 'numbers') {
      body += kv([['4D', (p.fourD||[]).join('  ') || '—'],
        ['Toto', (p.toto||[]).join(', ') || '—'],
        ['Day pillar', p.dayPillar], ['Hour pillar', p.hourPillar],
        ['Lunar', p.lunar], ['Qimen', p.qimen], ['Solar term', p.term]]);
      if (p.derivation) body += '<div class="block"><h2>How they were derived</h2>' +
        '<div class="panel" style="font-size:.88rem;line-height:1.7">' +
        p.derivation.map(esc).join('<br>') + '</div></div>';
      if (p.note) body += '<div class="notice" style="margin-top:10px">' + esc(p.note) + '</div>';
    }

    if (r.kind === 'coaching') {
      var cs = p.summary || {};
      body += kv([['Topic', p.topic || '—'], ['Hoped for', p.hope], ['Reached', p.stage + (p.depth ? ' · depth ' + p.depth : '')]]);
      if (p.safety) body += '<div class="notice" style="margin-top:10px">This session was paused for your safety. If you need support now, local helplines are listed in Coach › Coaching Session.</div>';
      if (cs.summary) body += '<div class="block"><h2>' + esc(cs.title || 'Summary') + '</h2><div class="panel" style="font-size:.9rem;line-height:1.7">' + esc(cs.summary) +
        (cs.insights && cs.insights.length ? '<br><br><b>What you saw</b><br>' + cs.insights.map(esc).join('<br>') : '') +
        (cs.yearning ? '<br><br><b>Your yearning 渴望</b><br>' + esc(cs.yearning) : '') +
        (cs.systemView ? '<br><br><b>The wider system 系统</b><br>' + esc(cs.systemView) : '') +
        (p.people && p.people.length ? '<br><br><b>People in the system</b><br>' + p.people.map(esc).join(', ') : '') +
        (p.loops && p.loops.length ? '<br><br><b>Loops noticed</b><br>' + p.loops.map(esc).join('<br>') : '') +
        (cs.principles ? '<br><br><b>Through the five principles 五大法则</b><br>' + esc(cs.principles) : '') +
        (cs.commitment ? '<br><br><b>Your step</b><br>' + esc(cs.commitment) : '') +
        (cs.followUp ? '<br><br><b>To reflect on</b><br>' + esc(cs.followUp) : '') + '</div></div>';
      body += '<div class="block"><h2>The conversation</h2><div class="co-log saved">' + (p.transcript || []).map(function (t) {
        return '<div class="co-msg ' + (t.who === 'coach' ? 'coach' : 'coachee') + '">' + esc(t.text) + '</div>'; }).join('') + '</div></div>';
    }

    if (r.kind === 'combined') {
      var sg = function (v) { return (v > 0 ? '+' : '') + v; }, lv = { Strong: 'good-t', Steady: '', Weak: 'bad-t' };
      body += kv([['Read in', String(p.year)], ['Strongest', (p.top || []).map(function (a) { return a.label + ' ' + sg(a.score); }).join(', ')],
        ['Needs most care', (p.low || []).map(function (a) { return a.label + ' ' + sg(a.score); }).join(', ')],
        ['Systems disagree on', (p.split || []).join(', ') || 'none of the areas']]);
      body += '<div class="block"><h2>The life areas</h2><div class="rows stack-sm">' + (p.areas || []).map(function (a) {
        return '<div class="row"><span class="k"><span class="' + lv[a.level] + '">' + esc(a.label) + ' — ' + a.level + '</span><small>' + a.cn + ' &middot; ' + sg(a.score) + '</small></span>' +
          '<span class="v"><div class="plain">' + esc(a.meaning || a.lead || '') + (a.sure ? ' ' + esc(a.sure) : '') +
            '<div class="todo"><b>What to do:</b> ' + (a.steps ? a.steps.map(esc).join(' ') : esc(a.advice || '')) + '</div></div>' +
          '<small>' + (p.systems || []).map(function (y) { var x = a.per[y[0]]; return y[1] + ' ' + (x ? sg(x.v) + (x.via ? ' via ' + esc(x.via) : '') : '—'); }).join(' &middot; ') + '</small></span></div>';
      }).join('') + '</div></div>';
    }

    // Saved narratives hold plain text, lists of text, and lists of objects (life areas, action plans).
    function aiValueHtml(v) {
      if (!Array.isArray(v)) return esc(typeof v === 'object' && v ? JSON.stringify(v) : v);
      return v.map(function (x) {
        if (typeof x !== 'object' || !x) return esc(x);
        if (x.area) return '<b>' + esc(x.area) + '.</b> ' + esc(x.outlook || '') + (x.advice ? ' <i>' + esc(x.advice) + '</i>' : '');
        return Object.keys(x).map(function (k) { return (k === 'action' ? '<b>' + esc(x[k]) + '</b>' : esc(k.charAt(0).toUpperCase() + k.slice(1)) + ': ' + esc(x[k])); }).join('\n');
      }).join('\n\n');
    }

    if (r.ai) {
      body += '<div class="block"><h2>AI reading<em>saved with this record</em></h2>' +
        Object.keys(r.ai).filter(function (k) { return k.charAt(0) !== '_'; }).map(function (k) {
          return '<div class="panel"><div style="font-size:.8rem;color:var(--brass);margin-bottom:6px">' +
            k.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }) +
            '</div><div style="font-size:.9rem;line-height:1.75;white-space:pre-wrap">' +
            aiValueHtml(r.ai[k]) + '</div></div>';
        }).join('') + '</div>';
    }

    if (r.kind === 'counter') {
      body += kv([['Forecast year', String(p.year)], ['Active plate', p.cast + ' · ' + p.plate],
        ['Annual sources', 'Bazi ' + (p.sources.bazi || '—') + ' · Zi Wei ' + (p.sources.zwds || '—') + ' · Qimen ' + (p.sources.qimen || '—')],
        ['You', p.asker], ['Hide Door', p.hideDoor], ['Work from', (p.workFrom || []).join(', ')], ['Avoid', (p.avoid || []).join(', ')]]);
      body += '<div class="block"><h2>Threats</h2>' + (p.threats || []).map(function (t) {
        return '<div class="panel"><div style="font-size:.85rem;color:var(--brass);margin-bottom:4px">' + esc(t.verdict) + ' &middot; ' +
          esc(t.label) + ' ' + t.cn + ' &middot; severity ' + t.severity + ' (' + t.level + ')</div>' +
          kv([['The year', t.evidence.join('; ') || 'nothing flagged'], ['On the board', t.board], ['Override', t.override],
            ['Element remedy', t.remedy || '—'], ['Windows', (t.windows || []).join('; ') || '—']].concat(t.jiaziData ? [] : [['60-JiaZi timing', t.jiazi || '—']])) +
          (t.jiaziData ? jiaziHtml(t.jiaziData) : '') + '</div>';
      }).join('') + '</div>';
    }

    if (r.kind === 'annual' && p.system) {
      body += kv([['System', p.system === 'zwds' ? 'Zi Wei Dou Shu' : 'Qi Men Dun Jia'], ['Year', p.year + ' ' + p.pillar],
        ['Verdict', p.verdict + ' (' + p.score + ')']].concat(p.rows || []));
      if (p.months) body += '<div class="block"><h2>Month by month</h2>' + kv(p.months.map(function (m) {
        return [m.pillar + ' ' + m.start, (m.score > 0 ? '+' : '') + m.score + ' ' + m.god]; })) + '</div>';
    }
    else if (r.kind === 'annual') {
      body += kv([['Year', p.year + ' ' + p.pillar + ' · ' + p.nayin + ' · ' + p.zodiac], ['Verdict', p.verdict + ' (' + p.score + ')'],
        ['Year stem', p.stemGod], ['Hidden stems', (p.hidden || []).join(' · ')], ['Luck pillar', p.luck || '—'],
        ['Tai Sui', p.taiSui || 'none'], ['Four Harms', (p.harms || []).join('; ') || 'none'],
        ['Combinations', (p.unions || []).join('; ') || 'none'], ['Stars', (p.stars || []).join(', ') || 'none'],
        ['Health watch', p.healthWatch], ['Qimen year plate', p.qimenYear || '—']]);
      if (p.domains) body += '<div class="block"><h2>Areas of life</h2>' + kv(p.domains.map(function (d) {
        return [d.label, (d.score > 0 ? '+' : '') + d.score + ' — ' + d.why]; })) + '</div>';
      if (p.months) body += '<div class="block"><h2>Month by month</h2>' + kv(p.months.map(function (m) {
        return [m.pillar + ' ' + m.start, (m.score > 0 ? '+' : '') + m.score + ' ' + m.god]; })) + '</div>';
    }

    if (r.kind === 'forecast' && p.deepDive && p.deepDive.length) {
      body += '<div class="block"><h2>Deep dive<em>follow-ups on the same chart</em></h2>' +
        p.deepDive.map(function (t, i) {
          var a = t.a || {};
          return '<div class="panel"><div style="font-size:.8rem;color:var(--brass);margin-bottom:4px">Deep dive ' + (i + 1) +
            ' &middot; ' + esc(t.q) + '</div><div style="font-size:.9rem;line-height:1.7;white-space:pre-wrap">' + esc(a.answer || '') +
            '</div>' + kv([['On the chart', a.chart || '—'], ['What to do', a.whatToDo || '—'], ['Watch out for', a.watchOut || '—'],
              ['Next step', a.nextStep || '—']].concat(i === p.deepDive.length - 1 && a.askAgain ? [['Ask again', a.askAgain]] : [])) +
            '</div>';
        }).join('') + '</div>';
    }

    openSheet(esc(r.title), esc(r.subtitle) + ' · saved ' + r.savedAt.slice(0, 10), body, r.kind === 'manifest' && p.script ? function () { narrationUI('recNarr', { script: p.script, readOnly: true }); } : undefined);
  }

  function snapshotCard(pa) {
    if (!pa) return '';
    return '<div class="pcard ' + (pa.ring || '') + '">' +
      '<h4>Palace ' + pa.num + ' ' + pa.name + ' &middot; ' + pa.dir +
      '<span>' + (pa.element || '') + '</span></h4><div class="pgrid">' +
      '<div><b>Heaven stem</b> ' + (pa.heavenStem || '—') + '</div>' +
      '<div><b>Earth stem</b> ' + (pa.earthStem || '—') + '</div>' +
      '<div><b>Star</b> ' + (pa.star || '—') + '</div>' +
      '<div><b>Door</b> ' + (pa.door || '—') + '</div>' +
      '<div><b>Deity</b> ' + (pa.deity || '—') + '</div>' +
      '<div><b>House branch</b> ' + ((pa.branches||[]).join(' ') || '—') + '</div>' +
      '<div><b>Void</b> ' + (pa.isVoid ? 'yes' : 'no') + '</div>' +
      '<div><b>Envoy</b> ' + (pa.isEnvoy ? 'yes' : 'no') + '</div>' +
      '</div></div>';
  }

  /* ---------------- routing ---------------- */
  // The seven categories. Each item opens an existing screen; s is the screen and k its sub-view.
  var NAV = [
    { id: 'destiny', ic: '命', en: 'Destiny', cn: '命運', items: [
      { label: 'BaZi', s: 'chart', k: 'bazi' }, { label: 'Elements', s: 'chart', k: 'elements' }, { label: 'Relations', s: 'chart', k: 'relations' },
      { label: 'Together', s: 'chart', k: 'together', when: function () { return tgPrefs().show; } },
      { label: 'Zi Wei', s: 'chart', k: 'zwds' }, { label: 'Qimen Destiny', s: 'chart', k: 'destiny' }, { label: 'Qi Zheng', s: 'chart', k: 'qizheng' }, { label: 'He Luo', s: 'chart', k: 'heluo' }, { label: 'Combined', s: 'chart', k: 'combined' }, { label: 'Ask', s: 'chart', k: 'ask' }] },
    { id: 'seasons', ic: '時', en: 'Seasons', cn: '時運', items: [
      { label: 'BaZi Luck', s: 'chart', k: 'luck' }, { label: 'Zi Wei Periods', s: 'chart', k: 'zwperiods' },
      { label: 'Qimen Year and Month', s: 'chart', k: 'qmseason' }, { label: 'Cast Qimen', s: 'consult', k: 'qimen' }, { label: 'Zodiac', s: 'chart', k: 'zodiac' }, { label: 'Tong Shu', s: 'almanac', k: '' }] },
    { id: 'strategy', ic: '策', en: 'Strategy', cn: '策略', items: [
      { label: 'Yijing', s: 'consult', k: 'yijing' }, { label: 'Forecast', s: 'consult', k: 'forecast' }, { label: 'Oracle', s: 'consult', k: 'oracle' },
      { label: 'Date Selection', s: 'consult', k: 'plan' }, { label: 'Formations', s: 'consult', k: 'search' }, { label: 'Structures', s: 'consult', k: 'structures' },
      { label: 'Windows', s: 'consult', k: 'strategy' }, { label: 'San Cai', s: 'consult', k: 'sancai' }, { label: 'Execution', s: 'consult', k: 'execution' },
      { label: 'Warcraft', s: 'consult', k: 'warcraft' }, { label: 'Counter', s: 'consult', k: 'counter' }, { label: '7 Stars', s: 'consult', k: 'sevenstar' },
      { label: 'Manifest', s: 'consult', k: 'manifest' }] },
    { id: 'space', ic: '风', en: 'Space', cn: '风水', items: [
      { label: 'Feng Shui', s: 'chart', k: 'fs' }, { label: 'Compass', s: 'chart', k: 'compass' }, { label: 'Property', s: 'chart', k: 'property' }, { label: 'Floor Plan', s: 'chart', k: 'plan' }, { label: 'Mobility', s: 'chart', k: 'mobility' }] },
    { id: 'reports', ic: '报', en: 'Reports', cn: '报告', items: [
      { label: 'Thrive', s: 'consult', k: 'planner' }, { label: 'TribePlus', s: 'consult', k: 'monthly' }] },
    { id: 'numbers', ic: '数', en: 'Numbers Lab', tab: 'Numbers', cn: '数字实验室', items: [{ label: 'Numbers Lab', s: 'numbers', k: '' }] },
    { id: 'coach', ic: '教', en: 'Coach', cn: '教练', items: [{ label: 'Coaching Session', s: 'consult', k: 'coach' }] },
    { id: 'journal', ic: '志', en: 'Journal', cn: '日志', items: [
      { label: 'Saved Readings', s: 'journal', k: 'saved' }, { label: 'Narrations', s: 'journal', k: 'audio' }, { label: 'Outcomes', s: 'journal', k: 'outcomes' }] }
  ];
  var navLast = {};

  function navOn(item) { return !item.when || item.when(); }
  function navKey(name) { return name === 'chart' ? chartK : name === 'consult' ? consultK : name === 'journal' ? journalK : ''; }
  function navFind(name, key) {
    var hit = null;
    NAV.forEach(function (c) { c.items.forEach(function (i) { if (!hit && i.s === name && i.k === key) hit = { cat: c, item: i }; }); });
    return hit;
  }
  function navOpen(item) {
    if (item.s === 'chart') chartK = item.k;
    if (item.s === 'consult') consultK = item.k;
    if (item.s === 'journal') journalK = item.k;
    show(item.s);
  }
  function navOpenCat(cat) {
    var last = navLast[cat.id];
    navOpen(last && navOn(last) ? last : cat.items.filter(navOn)[0]);
  }
  function paintNav() {
    var hit = navFind(current, navKey(current)), bar = $('catBar');
    if (hit) navLast[hit.cat.id] = hit.item;
    $('tabs').querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-selected', String(!!hit && b.dataset.cat === hit.cat.id)); });
    $('topActs').querySelectorAll('button').forEach(function (b) {
      if (b.dataset.s === current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    bar.hidden = !hit;
    if (!hit) { bar.innerHTML = ''; return; }
    var items = hit.cat.items.filter(navOn);
    bar.innerHTML = '<div class="cathd"><b>' + hit.cat.en + '</b><span>' + hit.cat.cn + '</span></div>' +
      (items.length > 1 ? '<div class="seg scroll" role="tablist">' + items.map(function (it) {
        return '<button role="tab" aria-selected="' + (it === hit.item) + '" data-nav="' + hit.cat.items.indexOf(it) + '">' + it.label + '</button>'; }).join('') + '</div>' : '');
    bar.querySelectorAll('[data-nav]').forEach(function (b) {
      b.onclick = function () { navOpen(hit.cat.items[+b.dataset.nav]); };
    });
    var sel = bar.querySelector('[aria-selected="true"]');
    if (sel) sel.parentNode.scrollLeft = Math.max(0, sel.offsetLeft - sel.parentNode.offsetLeft - 24);
  }

  function show(name) {
    current = name;
    ['now','almanac','chart','consult','numbers','journal','learn','profile'].forEach(function (n) {
      $('s-' + n).classList.toggle('on', n === name);
    });
    paintNav();
    if (name === 'now') renderNow();
    if (name === 'almanac') renderAlmanac();
    if (name === 'chart') renderChart();
    if (name === 'consult') renderConsult();
    if (name === 'numbers') renderNumbers();
    if (name === 'journal') renderJournal();
    if (name === 'learn') renderLearn();
    if (name === 'profile') renderProfile();
    window.scrollTo(0, 0);
  }

  function seg(id, attr, set) {
    $(id).querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        $(id).querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-selected', String(x === b)); });
        set(b.dataset[attr]);
      };
    });
  }

  function boot() {
    $('who').innerHTML = '<b>' + esc(user.name) + '</b> · ' + user.pillars.zodiac + ' · ' +
      user.bazi.dayMasterCn;
    seg('segAlmanac', 'h', function (v) { almanacH = v; renderAlmanac(); });
    seg('segChart', 'c', function (v) { chartK = v; renderChart(); });
    applyTogetherTab();
    seg('segConsult', 'k', function (v) { consultK = v; renderConsult(); });
    $('tabs').innerHTML = NAV.map(function (c) {
      return '<button role="tab" aria-selected="false" data-cat="' + c.id + '"><span class="ic">' + c.ic + '</span>' + (c.tab || c.en) + '</button>'; }).join('');
    $('tabs').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { navOpenCat(NAV.filter(function (c) { return c.id === b.dataset.cat; })[0]); };
    });
    $('topActs').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { show(b.dataset.s); };
    });
    show('now');
    if (pendingLink) applyLink(pendingLink);
    // Keep the rolling notification window current; the scan runs after the first screen has drawn.
    if (digestPrefs().notify) setTimeout(function () { scheduleDigest(true); }, 1500);

    // Pull any new draw results in the background. Failures are silent — a stale archive
    // is not worth an error banner on launch.
    try {
      window.QPDraws.autoSync(function (res) {
        if (res && res.added && current === 'numbers') renderNumbers();
      });
    } catch (e) { /* offline, or storage blocked */ }

    // Re-render the Now screen when the double-hour turns over
    setInterval(function () { if (current === 'now') renderNow(); }, 60000);
  }

  /* ---------------- init ---------------- */
  // Solar terms and lunar months must be evaluated in the same wall clock the app reads
  // from the device, otherwise boundaries land on the wrong civil day when travelling.
  A.setTimezone(-new Date().getTimezoneOffset() / 60);
  if ($('nZone')) $('nZone').innerHTML = zoneOptions('');

  // If an analysis had to switch models to succeed, remember the working one.
  // Every module prompt pulls the user's own notes through this hook.
  window.QPAI.setPromptPrefsHook(loadPromptPrefs);
  window.QPAI.setLibraryHook(function (module, query) {
    if (!user) return '';
    return { text: window.QPLibrary.promptBlock(user.id, module, query),
             notes: window.QPLibrary.usedNotes(user.id, module, query) };
  });

  window.QPAI.setModelFixedHandler(function (working) {
    var c = loadAI(); c.model = working; saveAI(c);
  });

  $('doSignIn').onclick = signIn;
  $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  $('doCreate').onclick = createProfile;
  $('backToList').onclick = showList;
  $('backToList2').onclick = showList;
  // Review mode: #review=<tab>[:<segment>] renders one screen with a demo chart, without
  // touching stored profiles. Used by the UI review page; harmless in normal use.
  var REV = /(?:^|[#&])review=([a-z]+)(?::([a-z]+))?/.exec(location.hash || '');
  if (REV && REV[1] !== 'gate') {
    try {
      user = enrich({ id: 'demo', name: 'Demo Chart', gender: 'F',
                      birth: { y: 1988, m: 6, d: 14, hour: 9, min: 30 }, salt: 'd', pin: '' });
      $('gate').hidden = true; $('app').hidden = false;
      boot();
      show(REV[1]);
      if (REV[2]) {
        var segMap = { almanac: 'segAlmanac', chart: 'segChart', consult: 'segConsult' };
        var segId = segMap[REV[1]];
        if (segId && $(segId)) {
          var btns = $(segId).querySelectorAll('button');
          for (var bi = 0; bi < btns.length; bi++) {
            var dv = btns[bi].dataset;
            if (dv.h === REV[2] || dv.c === REV[2] || dv.k === REV[2]) { btns[bi].click(); break; }
          }
        }
      }
    } catch (e) {
      document.body.innerHTML = '<div style="padding:20px;color:#C8452F;font-family:serif">' +
        'Review render failed: ' + e.message + '</div>';
    }
  } else {
    renderGate();
  }
})();
