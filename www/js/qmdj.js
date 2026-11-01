/* QiPath Pro — Qimen consultation layer.
 * Yong Shen (用神) question forecasting, multi-criteria formation search, and the
 * manifestation planner. Scenario matrix follows the QiPath web app's yongShenScenarios.
 */
(function (global) {
  'use strict';
  var A = global.QPAstro, C = global.QPCore, S = global.QPSystems;
  var mod = function (n, m) { return ((n % m) + m) % m; };

  var PRODUCES = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' };
  var CONTROLS = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' };
  var REL_LABEL = { same:'比和 Parity', produces:'相生 Generates', controls:'相克 Controls',
                    produced_by:'受生 Nourished by', controlled_by:'受克 Countered by', unknown:'—' };

  function rel(top, bottom) {
    if (!top || !bottom) return 'unknown';
    if (top === bottom) return 'same';
    if (PRODUCES[top] === bottom) return 'produces';
    if (CONTROLS[top] === bottom) return 'controls';
    if (PRODUCES[bottom] === top) return 'produced_by';
    if (CONTROLS[bottom] === top) return 'controlled_by';
    return 'unknown';
  }

  /* ---------------- Yong Shen scenario matrix ---------------- */

  var CATEGORIES = [
    { id:'wealth',        name:'Wealth, budget and investments' },
    { id:'career',        name:'Career, promotion and jobs' },
    { id:'relationships', name:'Relationships and marriage' },
    { id:'health',        name:'Health, sickness and healing' },
    { id:'travel',        name:'Travel, logistics and deployment' },
    { id:'education',     name:'Education and professional development' },
    { id:'litigation',    name:'Litigation, disputes and negotiation' },
    { id:'initiatives',   name:'Launching, restructuring and initiatives' },
    { id:'lost',          name:'Finding lost people and objects' }
  ];

  // kind: door | star | deity | stem | stem_ref(hour/day)
  var SCENARIOS = [
    { id:'direct_wealth', cat:'wealth', name:'正财', nameEn:'Direct wealth and ROI',
      yong:'生门 Life Door + 戊 Capital',
      desc:'Stable, structural income — profit, salary, business revenue.',
      targets:[{id:'life',kind:'door',char:'生'},{id:'wu',kind:'stem',char:'戊'}],
      asker:['life'],
      good:'The Life Door generates the asker — cash flow is stable and reaches you.',
      bad:'The Life Door counters the asker, or sits void — income costs disproportionate effort.' },
    { id:'indirect_wealth', cat:'wealth', name:'偏财', nameEn:'Speculative and volatile gain',
      yong:'天蓬 Tian Peng + 玄武 Xuan Wu',
      desc:'High-risk capital — speculation, trading, windfall.',
      targets:[{id:'peng',kind:'star',char:'天蓬'},{id:'xw',kind:'deity',char:'玄武'}],
      asker:['peng'], combos:[{chars:['庚'],withTarget:'xw',tone:'danger',note:'Xuan Wu with Geng — misrepresentation or a rigged field'}],
      good:'Tian Peng generates the asker — fast gains are available to a decisive move.',
      bad:'Xuan Wu counters the asker — hidden variables and a real risk of being misled.' },
    { id:'budget', cat:'wealth', name:'预算', nameEn:'Budget and capital approval',
      yong:'戊 Wu — the principal',
      desc:'Getting a budget signed off, or releasing capital.',
      targets:[{id:'wu',kind:'stem',char:'戊'}], asker:['wu'],
      combos:[{chars:['戊','丁'],tone:'good',note:'Wu over Ding — the budget is approved'},
              {chars:['戊','庚'],tone:'danger',note:'Wu over Geng — funds frozen, audited or blocked'}],
      good:'Wu is well seated and reaches the asker — the money moves.',
      bad:'Wu sits void or under Geng — the money is committed elsewhere or held.' },
    { id:'promotion', cat:'career', name:'升迁', nameEn:'Promotion and recognition',
      yong:'值符 Chief + 开门 Open Door',
      desc:'Advancement, visibility, and backing from those above you.',
      targets:[{id:'chief',kind:'deity',char:'值符'},{id:'open',kind:'door',char:'开'}],
      asker:['chief'],
      good:'The Chief generates the asker — authority is behind you and the door is open.',
      bad:'The Chief counters the asker — the decision sits with someone unconvinced.' },
    { id:'finding_job', cat:'career', name:'求职', nameEn:'Finding work',
      yong:'开门 Open Door + 值符 Chief',
      desc:'Applications, interviews, and securing a role.',
      targets:[{id:'open',kind:'door',char:'开'},{id:'chief',kind:'deity',char:'值符'}],
      asker:['open'],
      good:'The Open Door is well seated and reaches you — approach directly and in person.',
      bad:'The Open Door sits void — the role is not real yet, or is already promised.' },
    { id:'marriage', cat:'relationships', name:'婚姻', nameEn:'Marriage and partnership',
      yong:'六合 Six Harmony + 乙 Yi',
      desc:'Commitment, harmony, and the health of a bond.',
      targets:[{id:'he',kind:'deity',char:'六合'},{id:'yi',kind:'stem',char:'乙'}],
      asker:['he'],
      combos:[{chars:['乙','庚'],tone:'good',note:'Yi with Geng — a binding union (日月合)'},
              {chars:['乙','辛'],tone:'danger',note:'Yi with Xin — a bond under strain'}],
      good:'Six Harmony generates the asker — the relationship is willing and warm.',
      bad:'Six Harmony sits void or countered — sentiment is absent or being performed.' },
    { id:'romance', cat:'relationships', name:'感情', nameEn:'Romance and attraction',
      yong:'太阴 Tai Yin + 丁 Ding',
      desc:'Courtship, private feeling, discreet matters of the heart.',
      targets:[{id:'ty',kind:'deity',char:'太阴'},{id:'ding',kind:'stem',char:'丁'}],
      asker:['ty'],
      good:'Tai Yin is well placed — approach quietly and privately rather than publicly.',
      bad:'Tai Yin void — feeling is concealed, or the other party is not disclosing.' },
    { id:'diagnose', cat:'health', name:'疾病', nameEn:'Diagnosing an illness',
      yong:'天芮 Tian Rui — the illness itself',
      desc:'The nature and seat of a condition.',
      targets:[{id:'rui',kind:'star',char:'天芮'}], asker:['rui'],
      good:'Tian Rui is weak in its palace or void — the condition lacks force and yields.',
      bad:'Tian Rui generates itself in a strong palace — the condition is entrenched; get it examined properly.' },
    { id:'cure', cat:'health', name:'求医', nameEn:'Finding treatment',
      yong:'天心 Tian Xin + 乙 Yi',
      desc:'The physician, the remedy, and the route to recovery.',
      targets:[{id:'xin',kind:'star',char:'天心'},{id:'yi',kind:'stem',char:'乙'}],
      asker:['xin'],
      good:'Tian Xin generates the asker — competent help is reachable in that direction.',
      bad:'Tian Xin void — the current course is not the one that resolves it. Seek a second opinion.' },
    { id:'travel', cat:'travel', name:'出行', nameEn:'Travel and long journeys',
      yong:'九天 Nine Heaven + 开门 Open Door',
      desc:'Departure, distance, and safe arrival.',
      targets:[{id:'jt',kind:'deity',char:'九天'},{id:'open',kind:'door',char:'开'}],
      asker:['jt'],
      good:'Nine Heaven is well seated — movement is supported; depart toward that direction.',
      bad:'Nine Heaven countered or void — expect delay and disruption; hold the departure.' },
    { id:'logistics', cat:'travel', name:'运输', nameEn:'Logistics and deployment',
      yong:'值使 Envoy Door — the moving channel',
      desc:'Shipments, deliveries, and moving resources.',
      targets:[{id:'envoy',kind:'envoy'}], asker:['envoy'],
      good:'The Envoy is well seated — the channel is clear and the goods move.',
      bad:'The Envoy sits void or countered — the chain breaks somewhere out of sight.' },
    { id:'exams', cat:'education', name:'考试', nameEn:'Exams and certification',
      yong:'景门 Scenery Door + 丁 Ding',
      desc:'Examinations, assessment, and public results.',
      targets:[{id:'jing',kind:'door',char:'景'},{id:'ding',kind:'stem',char:'丁'}],
      asker:['jing'],
      good:'The Scenery Door generates the asker — preparation shows and the result is visible.',
      bad:'The Scenery Door void — the assessment is uncertain; revise rather than rely on form.' },
    { id:'learning', cat:'education', name:'进修', nameEn:'Study and skill building',
      yong:'天辅 Tian Fu — the teacher',
      desc:'Courses, mentors, and building capability.',
      targets:[{id:'fu',kind:'star',char:'天辅'}], asker:['fu'],
      good:'Tian Fu is strong — teaching is available and lands; commit to the programme.',
      bad:'Tian Fu weak or void — the instruction on offer will not take you far enough.' },
    { id:'dispute', cat:'litigation', name:'词讼', nameEn:'Disputes and litigation',
      yong:'庚 Geng (opponent) against the Day Stem (you)',
      desc:'Conflict, claims, and adversarial negotiation.',
      targets:[{id:'geng',kind:'stem',char:'庚'},{id:'self',kind:'stem_ref',ref:'day'}],
      asker:['geng'], pairs:[{a:'geng',b:'self',label:'Opponent against you'}],
      good:'You control or are nourished relative to Geng — the position is defensible; press it.',
      bad:'Geng controls your stem — the opponent holds leverage. Settle or delay rather than fight now.' },
    { id:'negotiate', cat:'litigation', name:'谈判', nameEn:'Negotiation',
      yong:'Hour Stem (the matter) against the Day Stem (you)',
      desc:'Terms, bargaining, and reaching agreement.',
      targets:[{id:'matter',kind:'stem_ref',ref:'hour'},{id:'self',kind:'stem_ref',ref:'day'}],
      asker:['matter'], pairs:[{a:'matter',b:'self',label:'The matter toward you'}],
      good:'The matter generates your stem — terms move your way; ask for more than you expect.',
      bad:'The matter counters your stem — you are negotiating from behind. Change the frame or the timing.' },
    { id:'launch', cat:'initiatives', name:'开创', nameEn:'Launching an initiative',
      yong:'开门 Open Door + 值符 Chief + 九天 Nine Heaven',
      desc:'Starting something, going public, restructuring.',
      targets:[{id:'open',kind:'door',char:'开'},{id:'chief',kind:'deity',char:'值符'},
               {id:'jt',kind:'deity',char:'九天'}],
      asker:['open'],
      good:'The Open Door and Chief align and reach you — a genuine window to begin.',
      bad:'The Open Door sits void or countered — build quietly instead of announcing.' },
    { id:'restructure', cat:'initiatives', name:'改革', nameEn:'Restructuring and ending',
      yong:'死门 Death Door — the clean ending',
      desc:'Closing, cutting, and clearing what is finished.',
      targets:[{id:'si',kind:'door',char:'死'}], asker:['si'],
      good:'The Death Door is well seated — an ending can be made cleanly and will hold.',
      bad:'The Death Door reaches you badly — the cut will cost more than it returns right now.' },
    { id:'lost_object', cat:'lost', name:'寻物', nameEn:'Finding a lost object',
      yong:'玄武 Xuan Wu + 天蓬 Tian Peng',
      desc:'Locating something missing, and whether it returns.',
      targets:[{id:'xw',kind:'deity',char:'玄武'},{id:'peng',kind:'star',char:'天蓬'}],
      asker:['xw'],
      good:'Xuan Wu is well seated and not void — look in that direction; recovery is likely.',
      bad:'Xuan Wu sits void — the item has left your sphere; it is unlikely to come back.' },
    { id:'lost_person', cat:'lost', name:'寻人', nameEn:'Finding a person',
      yong:'Hour Stem (the person) + 六合 Six Harmony',
      desc:'Where someone is, and whether contact resumes.',
      targets:[{id:'person',kind:'stem_ref',ref:'hour'},{id:'he',kind:'deity',char:'六合'}],
      asker:['person'],
      good:'The person\'s stem is seated and reachable — the direction shown is where to look.',
      bad:'The person\'s stem is void — they are not where you expect and are not being found yet.' }
  ];

  /* ---------------- locating symbols on the plate ---------------- */

  var OUTER = [1,2,3,4,6,7,8,9];

  function findPalace(chart, kind, char) {
    for (var i = 0; i < OUTER.length; i++) {
      var p = chart.palacesByNumber[OUTER[i]];
      if (!p) continue;
      if (kind === 'door' && p.door && p.door.char === char) return p;
      if (kind === 'star' && p.star && p.star.char === char) return p;
      if (kind === 'deity' && p.deity && p.deity.char === char) return p;
      if (kind === 'stem' && ((p.heavenStem && p.heavenStem.char === char) ||
                              (p.earthStem && p.earthStem.char === char))) return p;
    }
    return null;
  }

  function resolveTarget(chart, p, t) {
    if (t.kind === 'stem_ref') {
      var ch = C.STEMS[t.ref === 'hour' ? p.hour.stem : p.day.stem];
      return { pal: findPalace(chart, 'stem', ch), char: ch, kind: 'stem' };
    }
    if (t.kind === 'envoy') {
      var e = chart.envoy ? chart.envoy.charAt(0) : null;
      return { pal: e ? findPalace(chart, 'door', e) : null, char: chart.envoy, kind: 'door' };
    }
    return { pal: findPalace(chart, t.kind, t.char), char: t.char, kind: t.kind };
  }

  // The asker is the Day Stem's palace — the seat of the person enquiring.
  function askerPalace(chart, p) {
    return findPalace(chart, 'stem', C.STEMS[p.day.stem]);
  }

  function elemOf(kind, pal) {
    if (!pal) return null;
    if (kind === 'door') return pal.door ? pal.door.element : null;
    if (kind === 'star') return pal.star ? pal.star.element : null;
    if (kind === 'deity') return pal.element;
    return pal.element;
  }


  /* ================= forecasting methods ================= */
  /* Qimen is not one method. Practitioners differ on which symbol represents the asker,
     which represents the matter, and therefore which palace relation answers the question.
     Rather than hard-code one school, the method is selected and the reading states which
     frame produced it. */

  var METHODS = [
    {
      id: 'stems', name: '日干时干法', label: 'Day Stem and Hour Stem',
      blurb: 'The classical hour-chart frame. The Day Stem is you; the Hour Stem is the matter. ' +
             'Their palaces and the relation between them answer the question.',
      note: 'Most widely taught, and the most reliable default when the question concerns you ' +
            'and one other thing.'
    },
    {
      id: 'yongshen', name: '用神法', label: 'Useful God by category',
      blurb: 'Selects the symbol that governs the kind of question — 生门 for wealth, 开门 for ' +
             'career, 六合 for partnership — and reads where it sits.',
      note: 'Strongest when the question falls cleanly into a known category.'
    },
    {
      id: 'door', name: '八门法', label: 'By Doors',
      blurb: 'Reads the eight doors alone: which door governs the matter, where it sits, and ' +
             'how it relates to the door on your own palace.',
      note: 'Doors describe action and human affairs, so this suits questions about what to do.'
    },
    {
      id: 'star', name: '九星法', label: 'By Stars',
      blurb: 'Reads the nine stars: their strength in the palace they occupy and their relation ' +
             'to your seat. Stars describe conditions and disposition rather than action.',
      note: 'Suits questions about how a situation stands rather than what to do about it.'
    },
    {
      id: 'deity', name: '八神法', label: 'By Deities',
      blurb: 'Reads the eight deities: the quality of intent surrounding the matter — sanction, ' +
             'concealment, harmony, deception, force.',
      note: 'Suits questions about other people\'s motives and the character of a situation.'
    },
    {
      id: 'nianming', name: '年命法', label: 'By the Asker\'s Birth Year',
      blurb: 'Locates the asker by the branch of their birth year (年命) rather than by the Day ' +
             'Stem, then reads that palace and its relation to the matter.',
      note: 'Used when the asker is not the person casting, or to cross-check the Day Stem reading.'
    },
    {
      id: 'zhifu', name: '值符值使法', label: 'Chief and Envoy',
      blurb: 'Reads the chief star (值符) as the governing authority over the whole hour and the ' +
             'envoy gate (值使) as the channel through which it acts.',
      note: 'A whole-chart frame rather than a targeted one. Good for strategic questions.'
    }
  ];


  /* Each method needs its own symbol for the matter. A scenario carries only the symbols its
     own frame uses, so when a method asks for a star or a deity and the scenario has none,
     it is taken from the question's category instead. Without this the star and deity methods
     silently fall back to the door and produce an identical reading, which is worse than
     offering no method at all. */
  // These must match the characters the chart engine emits, which are simplified.
  var CAT_DOOR  = { wealth:'生', career:'开', relationships:'休', health:'生',
                    travel:'开', education:'景', litigation:'惊', initiatives:'开', lost:'杜' };
  var CAT_STAR  = { wealth:'天任', career:'天心', relationships:'天辅', health:'天芮',
                    travel:'天冲', education:'天辅', litigation:'天柱', initiatives:'天英',
                    lost:'天蓬' };
  var CAT_DEITY = { wealth:'值符', career:'值符', relationships:'六合', health:'白虎',
                    travel:'九天', education:'太阴', litigation:'白虎', initiatives:'九天',
                    lost:'玄武' };

  function symbolFor(kind, sc) {
    var fromTargets = (sc.targets.filter(function (t) { return t.kind === kind; })[0] || {}).char;
    if (fromTargets) return fromTargets;
    var m = kind === 'door' ? CAT_DOOR : kind === 'star' ? CAT_STAR : CAT_DEITY;
    return m[sc.cat] || null;
  }

  // Branch of the asker's birth year -> its seated palace (年命宫).
  var BRANCH_PALACE = { 0:1, 1:8, 2:8, 3:3, 4:4, 5:4, 6:9, 7:2, 8:2, 9:7, 10:6, 11:6 };

  function nianMingPalace(chart, birthYearBranch) {
    var n = BRANCH_PALACE[birthYearBranch];
    return chart.palacesByNumber[n] || null;
  }

  /**
   * Resolve the two poles of the reading — who is asking, and what is being asked about —
   * according to the chosen method.
   */
  function resolvePoles(method, chart, p, sc, user) {
    var self = null, matter = null, selfLabel = '', matterLabel = '';

    if (method === 'nianming' && user && user.pillars) {
      self = nianMingPalace(chart, user.pillars.year.branch);
      selfLabel = '年命 ' + C.BRANCHES[user.pillars.year.branch] +
        ' (' + C.ZODIAC[user.pillars.year.branch] + ')';
    } else {
      self = findPalace(chart, 'stem', C.STEMS[p.day.stem]);
      selfLabel = 'Day Stem ' + C.STEMS[p.day.stem];
    }

    if (method === 'stems') {
      matter = findPalace(chart, 'stem', C.STEMS[p.hour.stem]);
      matterLabel = 'Hour Stem ' + C.STEMS[p.hour.stem];
    } else if (method === 'door') {
      var dch = symbolFor('door', sc);
      if (dch) { matter = findPalace(chart, 'door', dch); matterLabel = dch + '门'; }
    } else if (method === 'star') {
      var sch = symbolFor('star', sc);
      if (sch) { matter = findPalace(chart, 'star', sch); matterLabel = sch; }
    } else if (method === 'deity') {
      var ech = symbolFor('deity', sc);
      if (ech) { matter = findPalace(chart, 'deity', ech); matterLabel = ech; }
    } else if (method === 'zhifu') {
      matter = findPalace(chart, 'star', chart.chief);
      matterLabel = '值符 ' + chart.chief;
    }
    // Fall back to the scenario's own primary useful god.
    if (!matter) {
      var first = sc.targets[0];
      if (first) {
        var r = resolveTarget(chart, p, first);
        matter = r.pal; matterLabel = r.char;
      }
    }
    return { self: self, matter: matter, selfLabel: selfLabel, matterLabel: matterLabel };
  }

  function methodReading(method, poles, chart) {
    if (!poles.self || !poles.matter) {
      return { tone: 'neutral', label: 'Poles incomplete',
        text: 'One of the two symbols this method reads is held in the centre palace and cannot ' +
              'be placed on the outer plate, so this frame cannot answer cleanly. Try another method.' };
    }
    var rel2 = rel(poles.matter.element, poles.self.element);
    var tone = (rel2 === 'produces' || rel2 === 'same') ? 'good'
             : rel2 === 'controls' ? 'danger' : 'neutral';
    var read = {
      produces: 'The matter feeds you — it moves toward you without being forced.',
      same: 'You and the matter stand on equal footing; outcome follows effort.',
      controls: 'The matter presses on you — you are not holding the initiative here.',
      produced_by: 'You are feeding the matter; it costs you to sustain.',
      controlled_by: 'You hold leverage over the matter.',
      unknown: 'No clear elemental relation between the two seats.'
    }[rel2];
    return {
      tone: tone,
      label: poles.matterLabel + ' (palace ' + poles.matter.num + ' ' + poles.matter.dir +
             ') toward ' + poles.selfLabel + ' (palace ' + poles.self.num + ' ' + poles.self.dir + ')',
      text: REL_LABEL[rel2] + '. ' + read
    };
  }

  /* ---------------- forecasting ---------------- */

  function forecast(dt, scenarioId, question, opts) {
    opts = opts || {};
    var methodId = opts.method || 'stems';
    var user = opts.user || null;
    var p = C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min);
    var chart = S.qimen(p);
    var sc = SCENARIOS.filter(function (x) { return x.id === scenarioId; })[0] || SCENARIOS[0];
    var method = METHODS.filter(function (m) { return m.id === methodId; })[0] || METHODS[0];
    var poles = resolvePoles(method.id, chart, p, sc, user);
    var asker = poles.self || askerPalace(chart, p);
    var findings = [], score = 0;

    var resolved = {};
    sc.targets.forEach(function (t) {
      var r = resolveTarget(chart, p, t);
      resolved[t.id] = r;
      if (!r.pal) {
        findings.push({ tone:'neutral', label: r.char + ' seat',
          text: r.char + ' does not appear on the outer plate this hour — it is held in the centre and cannot be read directly.' });
        return;
      }
      var pal = r.pal;
      var relation = rel(elemOf(r.kind, pal), pal.element);
      var bits = [];
      if (pal.star) bits.push('star ' + pal.star.char);
      if (pal.door) bits.push('door ' + pal.door.char + '门');
      if (pal.deity) bits.push('deity ' + pal.deity.char);
      findings.push({ tone: (relation === 'produced_by' || relation === 'same') ? 'good'
                          : relation === 'controlled_by' ? 'danger' : 'neutral',
        label: r.char + ' seated in palace ' + pal.num + ' ' + pal.name + ' (' + pal.dir + ')',
        text: bits.join(', ') + '. Palace relation: ' + REL_LABEL[relation] + '.' +
              (pal.isEmpty ? ' This palace is void (空亡).' : '') });
      if (relation === 'produced_by' || relation === 'same') score += 2;
      if (relation === 'controlled_by') score -= 2;
      if (pal.isEmpty) { score -= 3;
        findings.push({ tone:'danger', label: r.char + ' falls void (空亡)',
          text: 'A void seat means the matter lacks substance right now — commitments made here tend not to hold.' }); }
    });

    // Relation of the primary useful god toward the asker
    (sc.asker || []).forEach(function (id) {
      var r = resolved[id];
      if (!r || !r.pal || !asker) return;
      var relation = rel(r.pal.element, asker.element);
      var tone = (relation === 'produces' || relation === 'same') ? 'good'
               : relation === 'controls' ? 'danger' : 'neutral';
      findings.push({ tone: tone, label: r.char + ' toward you (' + C.STEMS[p.day.stem] + ')',
        text: REL_LABEL[relation] + '. ' + (
          relation === 'produces' ? 'The matter flows toward you without being forced.' :
          relation === 'controls' ? 'The matter presses on you — you are not holding the initiative.' :
          relation === 'same' ? 'You and the matter are on equal footing — outcome follows effort.' :
          relation === 'produced_by' ? 'You are feeding the matter — it costs you to sustain.' :
          relation === 'controlled_by' ? 'You have leverage over the matter.' :
          'No clear relation.') });
      if (tone === 'good') score += 3; if (tone === 'danger') score -= 3;
      if (relation === 'controlled_by') score += 1;
      if (relation === 'produced_by') score -= 1;
    });

    // Explicit pair comparisons (opponent vs self, matter vs self)
    (sc.pairs || []).forEach(function (pr) {
      var a = resolved[pr.a], b = resolved[pr.b];
      if (!a || !b || !a.pal || !b.pal) return;
      var relation = rel(a.pal.element, b.pal.element);
      var tone = relation === 'controls' ? 'danger'
               : (relation === 'produces' || relation === 'controlled_by') ? 'good' : 'neutral';
      findings.push({ tone: tone, label: pr.label, text: REL_LABEL[relation] + '.' });
      if (tone === 'good') score += 2; if (tone === 'danger') score -= 2;
    });

    // Stem combinations within a single palace
    (sc.combos || []).forEach(function (cb) {
      var chars = cb.chars;
      if (cb.withTarget) {
        var r = resolved[cb.withTarget];
        if (!r || !r.pal) return;
        var seat = [r.pal.heavenStem && r.pal.heavenStem.char, r.pal.earthStem && r.pal.earthStem.char];
        if (chars.every(function (c) { return seat.indexOf(c) >= 0; })) {
          findings.push({ tone: cb.tone === 'good' ? 'good' : 'danger', label: cb.note, text:
            'Present in palace ' + r.pal.num + ' (' + r.pal.dir + ').' });
          score += cb.tone === 'good' ? 2 : -3;
        }
        return;
      }
      for (var i = 0; i < OUTER.length; i++) {
        var pal = chart.palacesByNumber[OUTER[i]];
        var seat2 = [pal.heavenStem && pal.heavenStem.char, pal.earthStem && pal.earthStem.char];
        if (chars.every(function (c) { return seat2.indexOf(c) >= 0; })) {
          findings.push({ tone: cb.tone === 'good' ? 'good' : 'danger', label: cb.note,
            text: 'Present in palace ' + pal.num + ' ' + pal.name + ' (' + pal.dir + ').' });
          score += cb.tone === 'good' ? 2 : -3;
          break;
        }
      }
    });

    // The chosen method contributes its own finding before the shared checks.
    var mr = methodReading(method.id, poles, chart);
    findings.unshift({ tone: mr.tone, label: method.name + ' — ' + mr.label, text: mr.text });
    if (mr.tone === 'good') score += 3;
    if (mr.tone === 'danger') score -= 3;

    var forms = S.formations(p, dt.m);
    var ausp = forms.filter(function (f) { return f.category === 'auspicious'; });
    var host = forms.filter(function (f) { return f.category === 'hostile'; });
    score += Math.min(3, ausp.length * 0.4) - Math.min(3, host.length * 0.5);

    var primary = resolved[(sc.asker || [])[0]];
    var direction = primary && primary.pal ? primary.pal.dir : (chart.best[0] ? chart.best[0].dir : '—');

    var verdict = score >= 5 ? 'Favourable' : score >= 1 ? 'Workable' :
                  score >= -3 ? 'Guarded' : 'Unfavourable';
    var advice = score >= 5 ? sc.good
               : score >= 1 ? 'Mixed but usable. ' + sc.good + ' Watch the cautions below.'
               : score >= -3 ? 'The chart does not support pushing. ' + sc.bad
               : sc.bad;

    return {
      question: question || '', scenario: sc, pillars: p, chart: chart,
      method: method, poles: poles, methodReading: mr,
      asker: asker, resolved: resolved, findings: findings,
      score: Math.round(score), verdict: verdict, advice: advice,
      direction: direction, formations: forms,
      auspicious: ausp, hostile: host,
      hourRange: p.hourRange
    };
  }

  /* ---------------- multi-criteria search ---------------- */

  var SEARCH_FIELDS = {
    stem:    { label:'Stem 天干', values:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] },
    star:    { label:'Star 九星', values:['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'] },
    door:    { label:'Door 八门', values:['休','生','伤','杜','景','死','惊','开'] },
    deity:   { label:'Deity 八神', values:['值符','腾蛇','太阴','六合','白虎','玄武','勾陈','朱雀','九地','九天'] },
    palace:  { label:'House 九宫', values:['1 坎 N','2 坤 SW','3 震 E','4 巽 SE','6 乾 NW','7 兑 W','8 艮 NE','9 离 S'] },
    voidState:{ label:'Void 空亡', values:['Not void','Void only'] },
    envoy:   { label:'Envoy 值使', values:['Envoy door in this palace'] }
  };

  /**
   * Scan forward for hours whose plate satisfies every supplied criterion.
   * Stem, star, door, deity, palace and void are matched within ONE palace,
   * so a hit means those symbols genuinely co-locate.
   */
  function searchWindows(startDt, days, crit) {
    var out = [];
    var jd0 = A.gregToJD(startDt.y, startDt.m, startDt.d);
    var wantFormation = crit.formation || '';
    var wantMansion = crit.mansion || '';

    for (var d = 0; d < days; d++) {
      var g = A.jdToGreg(jd0 + d);
      var gy = g.y, gm = g.m, gd = Math.floor(g.d);
      var jdn = A.civilJDN(gy, gm, gd);
      var mansion = C.lunarMansion(jdn);
      if (wantMansion && mansion.cn !== wantMansion) continue;

      for (var b = 0; b < 12; b++) {
        var hh = b === 0 ? 23 : (b * 2 - 1);
        var p = C.fourPillars(gy, gm, gd, hh, 30);
        // A late-Zi hour belongs to the following civil day; skip to avoid duplicates.
        if (b === 0 && p.dayJDN !== jdn) continue;
        var chart = S.qimen(p);

        var forms = null, formHit = null;
        if (wantFormation) {
          forms = S.formations(p, gm);
          formHit = forms.filter(function (f) { return f.id === wantFormation; })[0];
          if (!formHit) continue;
        }

        // Find a palace satisfying all palace-scoped criteria at once
        var match = null;
        for (var i = 0; i < OUTER.length; i++) {
          var pal = chart.palacesByNumber[OUTER[i]];
          if (!pal) continue;
          if (crit.palace && pal.num !== parseInt(crit.palace, 10)) continue;
          if (crit.stem) {
            var st = [pal.heavenStem && pal.heavenStem.char, pal.earthStem && pal.earthStem.char];
            if (st.indexOf(crit.stem) < 0) continue;
          }
          if (crit.star && !(pal.star && pal.star.char === crit.star)) continue;
          if (crit.door && !(pal.door && pal.door.char === crit.door)) continue;
          if (crit.deity && !(pal.deity && pal.deity.char === crit.deity)) continue;
          if (crit.voidState === 'void' && !pal.isEmpty) continue;
          if (crit.voidState === 'notvoid' && pal.isEmpty) continue;
          if (crit.envoy && chart.envoy && pal.door &&
              pal.door.char !== chart.envoy.charAt(0)) continue;
          if (crit.formation && formHit && formHit.palaces.length &&
              formHit.palaces.indexOf(pal.num) < 0) continue;
          match = pal; break;
        }
        if (!match) continue;

        if (!forms) forms = S.formations(p, gm);
        var ausp = forms.filter(function (f) { return f.category === 'auspicious'; }).length;
        var host = forms.filter(function (f) { return f.category === 'hostile'; }).length;

        out.push({
          y:gy, m:gm, d:gd, hourBranch:b, hour:hh,
          range: C.HOUR_RANGE[b], branchCn: C.BRANCHES[b],
          dayPillar: p.day, hourPillar: p.hour,
          palace: match, direction: match.dir,
          mansion: mansion, chart: chart, pillars: p,
          formation: formHit, formations: forms,
          net: ausp - host, ausp: ausp, hostile: host
        });
        if (out.length >= 40) return out;
      }
    }
    return out;
  }

  /* ---------------- manifestation planner ---------------- */

  // What each door invites you to ask for, and the register to ask in.
  var DOOR_INTENT = {
    '开': { ask:'an opening — a door, an introduction, a decision made in your favour',
            verb:'open', tone:'direct and public' },
    '生': { ask:'growth — income, health, a thing that compounds rather than arrives once',
            verb:'grow', tone:'patient and tending' },
    '休': { ask:'rest and repair — a truce, recovery, the settling of something agitated',
            verb:'settle', tone:'quiet and unhurried' },
    '景': { ask:'visibility — recognition, a clear signal, being seen accurately',
            verb:'illuminate', tone:'expressive and vivid' },
    '杜': { ask:'protection — privacy, the sealing of a leak, undisturbed concentration',
            verb:'shield', tone:'contained and deliberate' },
    '伤': { ask:'the strength to cut — collection of what is owed, an end to a drain',
            verb:'sever', tone:'firm, never vengeful' },
    '惊': { ask:'the truth to surface — a hidden thing named, a warning heeded in time',
            verb:'reveal', tone:'sober and honest' },
    '死': { ask:'a clean ending — release from what is finished, the ground cleared',
            verb:'release', tone:'grave and grateful' }
  };

  var DEITY_QUALITY = {
    '值符':'authority and sanction', '腾蛇':'imagination, and the discipline to not deceive yourself',
    '太阴':'discretion and quiet protection', '六合':'harmony and honest partnership',
    '白虎':'decisive force', '玄武':'the unseen and the recovery of what is hidden',
    '勾陈':'patience with slow, binding matters', '朱雀':'speech, documents and persuasion',
    '九地':'depth, foundations and secrecy', '九天':'reach, altitude and expansion'
  };

  // Reciprocity matched to the element of the palace you drew from.
  var RETURN_BY_ELEMENT = {
    wood:  { name:'Wood 木', acts:['plant something and keep it alive',
              'teach a skill to someone with no way to repay you',
              'fund or mentor something at its beginning'] },
    fire:  { name:'Fire 火', acts:['give public credit to someone whose work went unseen',
              'introduce two people who each need the other',
              'light a lamp or candle and sit with it in gratitude, unhurried'] },
    earth: { name:'Earth 土', acts:['feed people — cook for someone, or give to a food charity',
              'give shelter, storage or steady support to someone unsettled',
              'clear and repair a neglected space without being asked'] },
    metal: { name:'Metal 金', acts:['give money or material resources where they will not return to you',
              'settle a debt you owe, in full and early',
              'stand up for someone who is being treated unjustly'] },
    water: { name:'Water 水', acts:['share knowledge freely — write down what you know and give it away',
              'listen to someone at length without steering them',
              'give to something that moves water or serves those without it'] }
  };

  function manifestPlan(dt, palaceNum, formation, askDoor) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min);
    var chart = S.qimen(p);
    var pal = chart.palacesByNumber[palaceNum] || chart.best[0] || chart.palacesByNumber[1];
    var seatDoor = pal.door ? pal.door.char : '开';
    // The ask normally follows the door seated in the palace, but the practitioner may
    // deliberately choose another register.
    var doorCh = (askDoor && DOOR_INTENT[askDoor]) ? askDoor : seatDoor;
    var borrowed = doorCh !== seatDoor;
    var intent = DOOR_INTENT[doorCh] || DOOR_INTENT['开'];
    var deity = pal.deity ? pal.deity.char : '值符';
    var quality = DEITY_QUALITY[deity] || 'clarity';
    var ret = RETURN_BY_ELEMENT[pal.element] || RETURN_BY_ELEMENT.earth;
    var heaven = pal.heavenStem ? pal.heavenStem.char : '';
    var earth = pal.earthStem ? pal.earthStem.char : '';
    var star = pal.star ? pal.star.char : '';

    var window_ = {
      date: dt.y + '-' + String(dt.m).padStart(2,'0') + '-' + String(dt.d).padStart(2,'0'),
      range: p.hourRange, pillar: p.hour.cn, dayPillar: p.day.cn,
      direction: pal.dir, palace: pal.num + ' ' + pal.name,
      dun: chart.dun, ju: chart.ju
    };

    var steps = [
      { t:'Clear the ground', d:'Before the window opens, put the space in order and switch off ' +
        'interruptions. Wash your hands and face. The practice asks for an uncluttered mind more than ' +
        'a decorated room, so spend the preparation on settling rather than on props.' },
      { t:'Find the direction', d:'Face ' + pal.dir + ', the seat of palace ' + pal.num + ' ' + pal.name +
        ' this hour. Use a compass rather than a guess. Sit or stand so that you are looking into that ' +
        'direction with nothing blocking you.' },
      { t:'Name the matter plainly', d:'Say once, in ordinary words, what the matter actually is — ' +
        'not the outcome you want, the situation as it stands. Naming it honestly is what keeps the ' +
        'practice from drifting into wishing.' },
      { t:'Enter the window', d:'Begin inside ' + p.hourRange + ', ideally in its middle rather than ' +
        'at the edges. The ' + p.hour.cn + ' hour holds ' + (star || 'this configuration') +
        ' over the ' + doorCh + '门 door; that pairing is the thing you are working with.' },
      { t:'Speak the script', d:'Read the script below aloud, slowly, once. Then read it a second ' +
        'time quietly. Speaking aloud matters — it commits the intention to something outside your head.' },
      { t:'Sit in the ask', d:'Stay facing the direction for a few minutes without asking for anything ' +
        'more. Let the request be finished. Adding to it in this period tends to dilute it.' },
      { t:'Seal and close', d:'Say the closing line, bow once toward ' + pal.dir + ', and stand. ' +
        'Do not repeat the practice in the same window. Write down the date, hour and what you asked ' +
        'for, and leave it alone.' },
      { t:'Return the favour', d:'Complete the exchange within three days using the reciprocity below. ' +
        'This is the part most people skip, and it is the part that makes the practice a relationship ' +
        'rather than a transaction.' }
    ];

    // The auspicious formations in this palace, and each strength in it called out with how to activate it.
    var palForms = [];
    try {
      palForms = S.formations(p, dt.m).filter(function (f) {
        return f.category === 'auspicious' && Array.isArray(f.palaces) && f.palaces.indexOf(pal.num) >= 0; })
        .sort(function (x, y) { return formationWeight(y) - formationWeight(x); });
    } catch (e) { palForms = []; }
    // The three rarest formations are worked with by name; any others are noted as present.
    var allMajor = palForms.filter(function (f) { return formationWeight(f) > 0; }), major = allMajor.slice(0, 3);
    var EL = ['wood', 'fire', 'earth', 'metal', 'water'].indexOf(pal.element), rem = EL >= 0 ? ELEMENT_REMEDY[EL] : null;
    var hsRole = STEM_ROLE[heaven], esRole = STEM_ROLE[earth];
    var activations = major.map(function (f) {
      var favours = (f.description.split(' — ')[1] || f.description).replace(/\.$/, '');
      return { what: f.name + ' · ' + f.nameEn, kind: 'Formation', meaning: f.description,
               activate: 'Name it in the script, and point the ask at what it favours: ' + favours + '.' };
    });
    if (allMajor.length > 3) activations.push({ what: allMajor.slice(3).map(function (f) { return f.name; }).join(', '), kind: 'Also present',
      meaning: 'Further auspicious formations in this palace that support the ones above.', activate: 'No separate step needed.' });
    if (hsRole && hsRole.good) activations.push({ what: heaven + ' ' + hsRole.role, kind: 'Heaven stem', meaning: 'Good for ' + hsRole.good + '.',
      activate: upper1(hsRole.act) + '.' });
    if (esRole && esRole.good && earth !== heaven) activations.push({ what: earth + ' ' + esRole.role, kind: 'Earth stem', meaning: 'The ground under the ask: ' + esRole.good + '.',
      activate: upper1(esRole.act) + '.' });
    if (DOOR_INTENT[seatDoor]) activations.push({ what: seatDoor + '门', kind: 'Door', meaning: 'Opens the way to ' + DOOR_INTENT[seatDoor].ask + '.',
      activate: 'Speak in a ' + DOOR_INTENT[seatDoor].tone + ' register, and use the verb "' + DOOR_INTENT[seatDoor].verb + '" in your ask.' });
    activations.push({ what: deity, kind: 'Deity', meaning: 'Brings ' + quality + '.',
      activate: 'Address the deity by name in the opening line, and ask for ' + quality + ' rather than for an outcome.' });
    if (STAR_PLAIN[star]) activations.push({ what: star, kind: 'Star', meaning: 'Favours ' + STAR_PLAIN[star] + '.',
      activate: 'Tie the ask to ' + STAR_PLAIN[star].split(',')[0] + ' — a concrete next step in that area.' });
    if (rem) activations.push({ what: rem.el + ' palace', kind: 'Element', meaning: 'The palace element sets what supports the practice.',
      activate: 'Have ' + rem.objects + ' in ' + rem.colours + ' in front of you; a scent of ' + rem.scents + ' if you like.' });
    function upper1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    var script =
      'I face ' + pal.dir + ', to the ' + pal.name + ' palace, in the ' + p.hour.cn + ' hour of the ' +
      p.day.cn + ' day.\n' +
      (major.length ? 'This hour holds ' + major.map(function (f) { return f.name + ', ' + f.nameEn; }).join('; and ') +
        ' — and I come to work with ' + (major.length > 1 ? 'them' : 'it') + '.\n' : '') +
      (heaven ? 'Heaven stem ' + heaven + (hsRole && hsRole.good ? ', the ' + hsRole.role.split(' ')[0] + ' ' + hsRole.role.split(' ')[1] + ',' : '') +
        ' stands over earth stem ' + earth + '. ' : '') +
      (star ? 'The star ' + star + ' turns here, and the ' + doorCh + '门 door stands open to me. ' : '') +
      'The deity ' + deity + ' keeps this gate, and I come asking for ' + quality + '.\n\n' +
      'I have come to ask that you ' + intent.verb + ' what is in front of me.\n' +
      'Here is what I am asking for, said plainly: I ask for ' + intent.ask + '.\n' +
      'I ask for it in a form I would be willing to explain to anyone.\n' +
      'I do not ask for it at the cost of another person, and I do not ask to be given what I have ' +
      'not prepared for.\n\n' +
      'I bring what I already have. I bring the work I have done and the work I will do. ' +
      'I bring my attention, which is the one thing I can give completely.\n' +
      'If this is right and its time has come, let it move — clearly, and soon enough that I can act on it.\n' +
      'If it is not right, let it fall away cleanly, and let me see why without bitterness.\n\n' +
      'And because nothing is taken without being repaid, I name what I will give in return:\n' +
      'I will ' + ret.acts[0] + ', within three days, and I will not speak of it to gain credit.\n' +
      'What flows to me will flow through me. I will not be the place it stops.\n\n' +
      'The ' + doorCh + '门 door is open. I have said what I came to say. It is enough.\n' +
      'I close this gate with thanks, and I leave the matter to move.';

    var manifestFor = [
      (borrowed
        ? 'You have chosen the ' + doorCh + '门 register, while the palace itself seats ' + seatDoor +
          '门. Asking across the seated door works, but the request should stay modest.'
        : 'The ' + doorCh + '门 door in this palace favours asking for ' + intent.ask + '.'),
      'The deity ' + deity + ' brings ' + quality + ' to whatever you ask here.',
      (star ? 'The star ' + star + ' colours the request; it works best on matters already in motion.' : ''),
      (pal.isEmpty ? 'This palace is void (空亡) this hour. Ask for release or clarity here, not for ' +
        'acquisition — things gained from a void seat tend not to stay.'
       : 'The palace is not void, so a request for something to arrive and remain is appropriate.')
    ].filter(Boolean);

    return {
      window: window_, palace: pal, formation: formation || null,
      intent: intent, deity: deity, quality: quality,
      askDoor: doorCh, seatDoor: seatDoor, borrowed: borrowed,
      manifestFor: manifestFor, steps: steps, script: script, activations: activations, formations: palForms,
      exchange: { element: ret.name, acts: ret.acts,
        note: 'Match the return to the element of the palace you drew from. Give it away from the ' +
              'matter you asked about — reciprocity that quietly benefits your own request is not ' +
              'an exchange. Do it within three days, and do it without an audience.' },
      tone: intent.tone
    };
  }


  /* ---------------- chart types (destiny / hour / day / month / year) ---------------- */

  var CHART_TYPES = [
    { id:'hour',    label:'Hourly chart',  cn:'时家奇门',
      note:'The standard plate. Turns every two hours; used for timing an action.' },
    { id:'day',     label:'Day chart',     cn:'日家奇门',
      note:'Holds for the whole day. Used for the shape of a day rather than a moment.' },
    { id:'month',   label:'Month chart',   cn:'月家奇门',
      note:'Holds for one solar month. Used for planning across weeks.' },
    { id:'year',    label:'Year chart',    cn:'年家奇门',
      note:'Holds from one Start of Spring to the next. Used for the year\'s theme.' },
    { id:'destiny', label:'Destiny chart', cn:'奇門命盤', natal:true,
      note:'Cast from the birth moment and fixed for life. Read as a natal chart, not as timing — ' +
           'it lives under Chart rather than Consult for that reason.' }
  ];

  /**
   * Build a plate for the requested scope. Hour charts use the hour pillar with the 拆补 ju.
   * Broader scopes put the governing pillar in the hour position (the chief follows its stem,
   * the envoy counts its branch from the xun head) and fix their own dun and ju:
   *   year  — always 阴遁; 60-year eras from 1864: upper 1, middle 4, lower 7.
   *   month — always 阴遁; by the branch of the 符头 year (latest 甲/己 year): 寅申巳亥 1,
   *           子午卯酉 7, 辰戌丑未 4 (the majority rule; some texts swap these).
   *   day   — by solar term: 冬至–立春 阳1, 雨水–清明 阳7, 谷雨–芒种 阳4,
   *           夏至–立秋 阴9, 处暑–寒露 阴3, 霜降–大雪 阴6.
   * Voids follow the governing pillar's xun.
   */
  var DAY_JU = {
    '冬至':[0,1],'小寒':[0,1],'大寒':[0,1],'立春':[0,1],
    '雨水':[0,7],'惊蛰':[0,7],'春分':[0,7],'清明':[0,7],
    '谷雨':[0,4],'立夏':[0,4],'小满':[0,4],'芒种':[0,4],
    '夏至':[1,9],'小暑':[1,9],'大暑':[1,9],'立秋':[1,9],
    '处暑':[1,3],'白露':[1,3],'秋分':[1,3],'寒露':[1,3],
    '霜降':[1,6],'立冬':[1,6],'小雪':[1,6],'大雪':[1,6]
  };
  function scopeOverride(type, p) {
    if (type === 'year') {
      var era = Math.floor(mod(p.solarYear - 1864, 180) / 60);
      return { yin: true, ju: [1, 4, 7][era], yuan: era, voidIdx: p.year.i,
               basis: ['Upper','Middle','Lower'][era] + ' 60-year era (' + ['上','中','下'][era] + '元)' };
    }
    if (type === 'month') {
      var fb = mod(p.year.branch - (p.year.stem % 5), 12);
      var ju = [2,8,5,11].indexOf(fb) >= 0 ? 1 : [0,6,3,9].indexOf(fb) >= 0 ? 7 : 4;
      return { yin: true, ju: ju, yuan: ju === 1 ? 0 : ju === 7 ? 1 : 2, voidIdx: p.month.i,
               basis: '符头 ' + C.STEMS[p.year.stem - (p.year.stem % 5)] + C.BRANCHES[fb] + ' year' };
    }
    var d = DAY_JU[p.term.name] || [0, 1];
    return { yin: d[0] === 1, ju: d[1], voidIdx: p.day.i, basis: 'solar term ' + p.term.name };
  }

  function chartFor(type, dt, birth) {
    var when = dt;
    if (type === 'destiny') {
      if (!birth) throw new Error('A destiny chart needs a birth moment.');
      when = { y: birth.y, m: birth.m, d: birth.d, hour: birth.hour, min: birth.min };
      type = 'hour';
    }
    var p = C.fourPillars(when.y, when.m, when.d, when.hour, when.min);
    var basis = p;

    if (type !== 'hour') {
      var src = type === 'day' ? p.day : type === 'month' ? p.month : p.year;
      basis = {
        year: p.year, month: p.month, day: p.day, hour: src,
        term: p.term, termIndex: p.termIndex, solarYear: p.solarYear,
        jdn: p.jdn, dayJDN: p.dayJDN,
        hourBranch: src.branch, hourRange: C.HOUR_RANGE[src.branch],
        zodiac: p.zodiac, zodiacCn: p.zodiacCn,
        qmOverride: scopeOverride(type, p)
      };
    }
    var chart = S.qimen(basis);
    var forms = S.formations(basis, when.m);
    return {
      type: type, when: when, pillars: p, basis: basis, chart: chart, formations: forms,
      scope: type === 'hour' ? p.hourRange
           : type === 'day' ? 'the whole of ' + when.y + '-' + pad(when.m) + '-' + pad(when.d)
           : type === 'month' ? 'the ' + p.month.cn + ' solar month'
           : 'the ' + p.year.cn + ' year'
    };
  }
  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }

  /* ---------------- Qimen annual forecast ----------------
   * The year plate (年盤) for the solar year, read for this person: where their natal Day Stem sits
   * on it, how good that palace is, the year's best and worst directions, and the same reading on
   * each of the twelve month plates. */
  var GOOD_STARS = { '天辅': 1, '天心': 1, '天任': 1, '天禽': 1, '天冲': 0.5, '天英': 0, '天蓬': -1, '天芮': -1, '天柱': -1 };
  var DEITY_VAL = { auspicious: 1, neutral: 0, deceptive: -0.5, hostile: -1 };
  function palaceQuality(chart, forms, n, fav) {
    var pa = chart.palacesByNumber[n], s = 0, why = [];
    if (!pa) return { score: 0, why: [] };
    if (pa.gate) { var gv = pa.gateRank === 2 ? 2 : pa.gateRank === 1 ? 0 : -2; s += gv; why.push(pa.gate + (gv > 0 ? ' (auspicious door)' : gv < 0 ? ' (inauspicious door)' : '')); }
    if (pa.gateStrength) s += (pa.gateStrength.rank - 3) * 0.4;
    if (pa.starCn) { s += GOOD_STARS[pa.starCn] || 0; why.push(pa.starCn); }
    if (pa.spirit) { s += DEITY_VAL[pa.spiritNature] || 0; why.push(pa.spirit); }
    if (pa.isEmpty) { s -= 1.5; why.push('void (空亡)'); }
    // Every structure in the palace counts, the net capped at ±3 so a crowded palace cannot swamp the rest.
    var fs = (forms || []).filter(function (f) { return (f.palaces || []).indexOf(n) >= 0; }), net = 0, good = 0, bad = 0;
    fs.forEach(function (f) {
      if (f.category === 'auspicious') { net++; good++; } else if (f.category === 'hostile') { net--; bad++; } });
    s += Math.max(-3, Math.min(3, net));
    if (good || bad) why.push(good + ' 吉 / ' + bad + ' 凶 structures');
    var pe = pa.element ? ['wood', 'fire', 'earth', 'metal', 'water'].indexOf(pa.element) : -1;
    if (fav && pe >= 0 && fav.indexOf(pe) >= 0) { s += 0.5; why.push('palace element favourable to you'); }
    return { score: Math.round(s * 10) / 10, why: why };
  }
  function natalSeat(chart, user) {
    var d = user.pillars.day, stem = d.stem;
    if (stem === 0) stem = YI_ORDER_D[Math.floor(mod(d.i - (d.i % 10), 60) / 10)];
    var cn = C.STEMS[stem], seat = null, rider = false;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var pa = chart.palacesByNumber[n]; if (seat || !pa) return;
      if (pa.heavenStemCn === cn) seat = n; else if (pa.heavenStem2Cn === cn) { seat = n; rider = true; }
    });
    return { num: seat || 2, stem: cn, hidden: d.stem === 0, rider: rider };
  }
  function qimenAnnual(user, year) {
    var A = global.QPAstro, fav = (user.deep || {}).favourable || user.favourable || [];
    var terms = A.termsForYear(year), dateOf = function (jd) { var g = A.jdToLocal(jd); return { y: g.y, m: g.m, d: Math.floor(g.d) }; };
    var iso = function (g) { return g.y + '-' + (g.m < 10 ? '0' : '') + g.m + '-' + (g.d < 10 ? '0' : '') + g.d; };
    var mid = dateOf(terms[0].jd + 150);
    var res = chartFor('year', { y: mid.y, m: mid.m, d: mid.d, hour: 12, min: 0 }), ch = res.chart;
    var seat = natalSeat(ch, user), q = palaceQuality(ch, res.formations, seat.num, fav), pa = ch.palacesByNumber[seat.num];
    var dirs = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) {
      var x = palaceQuality(ch, res.formations, n, fav), p = ch.palacesByNumber[n];
      return { num: n, name: p.name, dir: p.dir, score: x.score, why: x.why, gate: p.gate, star: p.starCn, deity: p.spirit };
    }).sort(function (a, b) { return b.score - a.score; });
    var yearStemSeat = null;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var p = ch.palacesByNumber[n]; if (!yearStemSeat && p && (p.heavenStemCn === res.pillars.year.cn.charAt(0) || p.heavenStem2Cn === res.pillars.year.cn.charAt(0))) yearStemSeat = n; });
    var months = [];
    for (var k = 0; k < 12; k++) {
      var t0 = terms[k * 2].jd, t1 = k < 11 ? terms[k * 2 + 2].jd : A.termsForYear(year + 1)[0].jd;
      var md = dateOf(t0 + 7), mr = chartFor('month', { y: md.y, m: md.m, d: md.d, hour: 12, min: 0 });
      var ms = natalSeat(mr.chart, user), mq = palaceQuality(mr.chart, mr.formations, ms.num, fav), mp = mr.chart.palacesByNumber[ms.num];
      months.push({ k: k, pillar: mr.pillars.month.cn, start: iso(dateOf(t0 + 0.6)), end: iso(dateOf(t1 - 0.4)),
        seat: ms.num, dir: mp.dir, gate: mp.gate, star: mp.starCn, deity: mp.spirit, score: mq.score, why: mq.why });
    }
    var ranked = months.slice().sort(function (a, b) { return b.score - a.score; });
    var score = Math.round((0.618 * q.score + 0.382 * (months.reduce(function (a, m) { return a + m.score; }, 0) / 12)) * 10) / 10;
    return {
      year: year, pillarCn: res.pillars.year.cn, plate: { dun: ch.dun, ju: ch.ju, basis: ch.basis, chief: ch.chief, envoy: ch.envoy,
        envoyPalace: ch.envoyPalace, voids: ch.voidBranches },
      seat: { num: seat.num, name: pa.name, dir: pa.dir, stem: seat.stem, hidden: seat.hidden, rider: seat.rider,
        earthStem: pa.earthStemCn, gate: pa.gate, star: pa.starCn, deity: pa.spirit, isEmpty: pa.isEmpty,
        score: q.score, why: q.why,
        formations: res.formations.filter(function (f) { return (f.palaces || []).indexOf(seat.num) >= 0; }).map(function (f) { return f.name + ' ' + f.nameEn; }) },
      yearStemSeat: yearStemSeat ? { num: yearStemSeat, dir: ch.palacesByNumber[yearStemSeat].dir,
        relation: yearStemSeat === seat.num ? 'The year stem sits with you in your own palace'
          : 'Your palace ' + ({ same: 'shares its element with', produces: 'feeds', controls: 'controls', produced_by: 'is fed by',
              controlled_by: 'is controlled by' }[rel(ch.palacesByNumber[seat.num].element, ch.palacesByNumber[yearStemSeat].element)] || 'relates to') +
            ' the palace of the year stem' } : null,
      score: score, verdict: score >= 2 ? 'Expansive' : score >= 0.8 ? 'Supportive' : score > -0.8 ? 'Mixed' : score > -2 ? 'Testing' : 'Adverse',
      bestDirs: dirs.slice(0, 2), worstDirs: dirs.slice(-2).reverse(),
      months: months, best: ranked.slice(0, 3), worst: ranked.slice(-2).reverse(),
      formations: res.formations.slice(0, 10).map(function (f) { return f.name + ' ' + f.nameEn + ' (' + f.category + ', P' + (f.palaces || []).join(',') + ')'; }),
      chart: ch, forms: res.formations
    };
  }

  /* ---------------- Threat bridge: annual vulnerabilities onto the active plate ----------------
   * 1. Macro: the annual Bazi and Zi Wei forecasts are scanned for six threats, each with a severity
   *    and the evidence behind it.
   * 2. Micro: each threat is translated into its Qimen symbols (用神) and located on the active plate;
   *    the palace's quality, hostile agents there and pressure on the asker give a manifestation index.
   * 3. Mismatch test: macro severity against micro manifestation decides the tactical override.
   * 4. Counter-measures: the Hide Door (杜门) position, directions to work from and to avoid, a bridging
   *    element (通關) when the threat palace controls the asker, and the next double-hours in which
   *    the symbol's palace and the asker are both strong (breaking a void or a stall). */
  var THREATS = [
    { key: 'financial', label: 'Financial drain', cn: '破財', symbols: [['door', '生门'], ['stem', '戊']],
      agents: ['玄武', '劫'], hide: 'Lock assets and stall new commitments; keep money matters confidential and move them through the Hide Door direction.' },
    { key: 'legal', label: 'Legal exposure', cn: '官非', hazard: true, symbols: [['door', '惊门'], ['door', '景门'], ['stem', '丁']],
      agents: ['白虎', '勾陈', '朱雀'], hide: 'Use process and paperwork to slow the other side; keep counsel and documents out of sight until the window opens.' },
    { key: 'friction', label: 'Executive friction', cn: '上司是非', symbols: [['door', '开门'], ['chief', '']],
      agents: ['庚', '惊门', '伤门'], hide: 'Go quiet with superiors: document decisions, avoid open confrontation, and let the matter cool behind the Hide Door.' },
    { key: 'health', label: 'Health strain', cn: '病災', hazard: true, symbols: [['star', '天芮'], ['door', '死门']],
      agents: ['白虎', '腾蛇'], hide: 'Rest and recover out of the public eye; postpone strenuous commitments.' },
    { key: 'relationship', label: 'Relationship rupture', cn: '感情破裂', symbols: [['deity', '六合'], ['stem', '乙'], ['stem', '庚']],
      agents: ['玄武', '腾蛇', '惊门'], hide: 'Keep disputes private; do not escalate in public or in writing.' },
    { key: 'upheaval', label: 'Upheaval and relocation', cn: '動盪', hazard: true, symbols: [['door', '伤门'], ['deity', '九天']],
      agents: ['白虎', '惊门'], hide: 'Delay irreversible moves; keep plans flexible and unannounced.' }
  ];
  var HOSTILE_DEITY = ['白虎', '玄武', '勾陈', '腾蛇', '朱雀'], HOSTILE_DOOR = ['死门', '惊门', '伤门'];
  // Each threat's manifestation index runs on its own scale (a resource palace is usually healthy, a hazard
  // symbol always marks its palace), so "live" is set per threat at about its 70th percentile over month and
  // hour plates for a spread of charts (2018-2033): live in roughly three plates in ten. Health was re-set to 2.5 in
  // 9.31, once 腾蛇 (spelt 螣蛇 here before, so never matched on the plate) began to count as one of its agents.
  var HOT_AT = { financial: 1.0, legal: 1.8, friction: 0.5, health: 2.5, relationship: 3.5, upheaval: 2.1 };

  function locate(chart, kind, ch) {
    var hit = null;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var p = chart.palacesByNumber[n]; if (hit || !p) return;
      if (kind === 'door' && p.gate === ch) hit = n;
      else if (kind === 'star' && (p.starCn === ch || p.star2Cn === ch)) hit = n;
      else if (kind === 'deity' && p.spirit === ch) hit = n;
      else if (kind === 'stem' && (p.heavenStemCn === ch || p.heavenStem2Cn === ch)) hit = n;
      else if (kind === 'chief' && p.isChief) hit = n;
    });
    return hit;
  }
  function seatOfStem(chart, stem, dayIdx) {
    if (stem === 0) stem = YI_ORDER_D[Math.floor(mod(dayIdx - (dayIdx % 10), 60) / 10)];
    return locate(chart, 'stem', C.STEMS[stem]) || 2;
  }

  function macroThreats(user, year) {
    var B = global.QPBazi, F = global.QPFib, out = {};
    THREATS.forEach(function (t) { out[t.key] = { sev: 0, evidence: [] }; });
    function add(k, v, why) { out[k].sev += v; out[k].evidence.push(why); }
    var ba = null, zw = null;
    try { ba = B.annualForecast(user, year); } catch (e) { ba = null; }
    try { zw = F.zwdsAnnual(user, year); } catch (e) { zw = null; }
    if (ba) {
      var dom = {}; ba.domains.forEach(function (d) { dom[d.key] = d; });
      var gods = [ba.stemGod.i].concat(ba.hidden.map(function (h) { return h.god.i; }));
      if (dom.wealth.score <= -0.5) add('financial', -dom.wealth.score, 'Bazi wealth ' + dom.wealth.score + ': ' + dom.wealth.why.join('; '));
      if (gods.indexOf(1) >= 0) add('financial', 1, 'Rob Wealth (劫財) in the year');
      var pun = ba.harms.filter(function (h) { return h.kind === 'punishment' && !h.softened; });
      if (pun.length) add('legal', Math.min(2, pun.length), pun.map(function (h) { return h.cn + ' on the ' + h.pillar + ' pillar'; }).join(', '));
      if (ba.taiSui && /刑|破/.test(ba.taiSui.cn)) add('legal', 1, ba.taiSui.cn + ' ' + ba.taiSui.en);
      if (gods.indexOf(3) >= 0) { add('legal', 0.5, 'Hurting Officer (傷官) — words and contracts cause trouble'); add('friction', 1, 'Hurting Officer (傷官) against authority'); }
      if (dom.career.score <= -0.5) add('friction', -dom.career.score, 'Bazi career ' + dom.career.score + ': ' + dom.career.why.join('; '));
      var month = ba.harms.filter(function (h) { return h.pillar === 'Month' && !h.softened; });
      if (month.length) add('friction', 1, month.map(function (h) { return h.cn; }).join(', ') + ' on the Month pillar (career)');
      if (dom.health.score <= -1) add('health', -dom.health.score, 'Bazi health ' + dom.health.score + ': ' + dom.health.why.join('; '));
      if (dom.relationships.score <= -1) add('relationship', -dom.relationships.score, 'Bazi relationships ' + dom.relationships.score + ': ' + dom.relationships.why.join('; '));
      if (ba.taiSui && /沖/.test(ba.taiSui.cn)) add('upheaval', 2, ba.taiSui.cn + ' ' + ba.taiSui.en);
      if (ba.harms.some(function (h) { return h.pillar === 'Day' && h.kind === 'clash' && !h.softened; })) add('upheaval', 1, 'the year clashes the Day pillar');
      if (ba.stars.some(function (s) { return s.en === 'Sky Horse'; })) add('upheaval', 0.5, 'Sky Horse (驛馬) — movement');
    }
    if (zw) {
      var fp = {}; zw.palaces.forEach(function (p) { fp[p.key] = p; });
      var ji = zw.hua.filter(function (h) { return h.hua === '化忌'; })[0];
      var jiAt = ji ? (ji.natal || '') + ' / flow ' + (ji.flow || '') : '';
      function zwPal(k, threat, cnNames) {
        if (fp[k] && fp[k].score < 0) add(threat, Math.min(2, -fp[k].score / 2), 'Zi Wei flow ' + fp[k].label + ' ' + fp[k].score);
        if (ji && cnNames.some(function (n) { return jiAt.indexOf(n) >= 0; })) add(threat, 1.5, 'Zi Wei ' + ji.star + '化忌 lands in ' + jiAt);
      }
      zwPal('wealth', 'financial', ['财帛']);
      zwPal('career', 'friction', ['官禄']);
      zwPal('health', 'health', ['疾厄']);
      zwPal('relationships', 'relationship', ['夫妻']);
      zwPal('travel', 'upheaval', ['迁移']);
      if (ji && /交友|迁移/.test(jiAt)) add('legal', 0.5, 'Zi Wei 化忌 in ' + jiAt + ' — disputes with others');
    }
    // Qimen year plate: each threat's symbol is located on the year plate and tested against the natal
    // Day Stem's seat, as on the active plate; the seat's own door and deity add their classical threat.
    var qa = null;
    try { qa = qimenAnnual(user, year); } catch (e) { qa = null; }
    if (qa) {
      var favQ = (user.deep || {}).favourable || user.favourable || [];
      THREATS.forEach(function (t) {
        var mf = manifest(qa.chart, qa.forms, t, qa.seat.num, favQ);
        if (mf && mf.index >= HOT_AT[t.key]) add(t.key, Math.min(1.5, Math.round((mf.index - HOT_AT[t.key] + 1) / 2 * 10) / 10),
          'Qimen year plate: ' + mf.symbol + ' in ' + mf.dir + ' with ' + [mf.gate, mf.deity].filter(Boolean).join(', ') +
          (function () { var extra = mf.agents.filter(function (x) { return x !== mf.gate && x !== mf.deity; });
            return extra.length ? ' (' + extra.join(', ') + ')' : ''; })() + (mf.pressing ? ', pressing on your year seat' : ''));
      });
      var DOOR_T = { '惊门': 'legal', '死门': 'health', '伤门': 'upheaval' };
      var DEITY_T = { '玄武': 'financial', '勾陈': 'legal', '朱雀': 'legal', '白虎': 'health', '腾蛇': 'relationship' };
      if (DOOR_T[qa.seat.gate]) add(DOOR_T[qa.seat.gate], 0.75, 'your Qimen year seat (' + qa.seat.dir + ') has ' + qa.seat.gate);
      if (DEITY_T[qa.seat.deity]) add(DEITY_T[qa.seat.deity], 0.75, 'your Qimen year seat (' + qa.seat.dir + ') has ' + qa.seat.deity);
    }
    return { threats: out, bazi: ba, zwds: zw, qimen: qa };
  }

  function manifest(chart, forms, t, askerNum, fav) {
    var found = t.symbols.map(function (s) { return { kind: s[0], ch: s[1], num: locate(chart, s[0], s[1]) }; })
      .filter(function (s) { return s.num; });
    if (!found.length) return null;
    var lead = found[0], pa = chart.palacesByNumber[lead.num], q = palaceQuality(chart, forms, lead.num, fav);
    var agents = [];
    if (HOSTILE_DEITY.indexOf(pa.spirit) >= 0) agents.push(pa.spirit);
    if (HOSTILE_DOOR.indexOf(pa.gate) >= 0 && pa.gate !== lead.ch) agents.push(pa.gate);
    if (pa.heavenStemCn === '庚' || pa.heavenStem2Cn === '庚') agents.push('庚 (opponent)');
    if (pa.isEmpty) agents.push('void 空亡');
    var asker = chart.palacesByNumber[askerNum], r = rel(pa.element, asker.element);
    var pressing = r === 'controls' && lead.num !== askerNum;
    var index;
    if (t.hazard) {
      // A hazard symbol (惊门, 天芮, 伤门) always makes its own palace look bad, so its palace quality says
      // nothing. What matters is its strength there (旺相 vs 休囚), hostile company, whether it presses on
      // the asker, and whether it is void (an empty hazard is a weakened one).
      var st = lead.kind === 'door' ? pa.gateStrength : lead.kind === 'star' ? pa.starStrength : null;
      var company = agents.filter(function (x) { return x !== lead.ch && x !== 'void 空亡'; }).length;
      var hostileForms = (forms || []).filter(function (f) { return (f.palaces || []).indexOf(lead.num) >= 0 && f.category === 'hostile'; }).length;
      index = (st ? (st.rank - 3) * 0.6 : 0) + Math.min(1.6, company * 0.8) + (pressing ? 1.5 : 0) +
        Math.min(1, hostileForms * 0.25) - (pa.isEmpty ? 1.5 : 0);
    } else {
      index = -q.score + (pressing ? 1.5 : 0) + Math.min(2, agents.length * 0.7);
    }
    index = Math.round(index * 10) / 10;
    return { symbol: (lead.kind === 'chief' ? 'chief star ' + chart.chief : lead.ch), num: lead.num, name: pa.name, dir: pa.dir,
      gate: pa.gate, star: pa.starCn, deity: pa.spirit, element: pa.element, isEmpty: pa.isEmpty, quality: q.score, why: q.why,
      agents: agents, pressing: pressing, relation: r, index: index, others: found.slice(1).map(function (s) {
        return s.ch + ' P' + s.num + ' ' + chart.palacesByNumber[s.num].dir; }) };
  }

  /**
   * The counter check month by month: the year's threats (macro severity) tested on each solar month's
   * plate against the natal Day Stem's seat, with that month's Hide Door and best direction.
   * Months run 立春 to 立春, the same twelve as the Bazi and Qimen annual forecasts.
   */
  function threatMonths(user, year) {
    var A = global.QPAstro, fav = (user.deep || {}).favourable || user.favourable || [];
    var mac = macroThreats(user, year), terms = A.termsForYear(year);
    var dateOf = function (jd) { var g = A.jdToLocal(jd); return { y: g.y, m: g.m, d: Math.floor(g.d) }; };
    var iso = function (g) { return g.y + '-' + pad(g.m) + '-' + pad(g.d); };
    var out = [];
    for (var k = 0; k < 12; k++) {
      var t0 = terms[k * 2].jd, t1 = k < 11 ? terms[k * 2 + 2].jd : A.termsForYear(year + 1)[0].jd;
      var md = dateOf(t0 + 7), res = chartFor('month', { y: md.y, m: md.m, d: md.d, hour: 12, min: 0 }), ch = res.chart;
      var seat = natalSeat(ch, user).num;
      var hits = THREATS.map(function (t) {
        var sev = mac.threats[t.key].sev, level = sev >= 2.5 ? 'high' : sev >= 1 ? 'moderate' : 'low';
        var mf = manifest(ch, res.formations, t, seat, fav), hot = mf && mf.index >= HOT_AT[t.key];
        var verdict = level !== 'low' && hot ? 'Confirmed' : level !== 'low' ? 'Latent' : hot ? 'Flare' : 'Clear';
        return { key: t.key, label: t.label, cn: t.cn, verdict: verdict, severity: Math.round(sev * 10) / 10,
                 dir: mf ? mf.dir : null, symbol: mf ? mf.symbol : null, index: mf ? mf.index : null, pressing: mf ? mf.pressing : false };
      });
      var hideNum = locate(ch, 'door', '杜门'), hide = hideNum ? ch.palacesByNumber[hideNum] : null;
      var badNums = hits.filter(function (h) { return h.verdict === 'Confirmed' || h.verdict === 'Flare'; })
        .map(function (h) { var n = null; [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (x) { if (ch.palacesByNumber[x].dir === h.dir) n = x; }); return n; });
      var best = [1, 2, 3, 4, 6, 7, 8, 9].filter(function (n) { return badNums.indexOf(n) < 0; }).map(function (n) {
        return { num: n, dir: ch.palacesByNumber[n].dir, score: palaceQuality(ch, res.formations, n, fav).score }; })
        .sort(function (a, b) { return b.score - a.score; })[0];
      out.push({ k: k, year: year, plateDate: md, pillar: res.pillars.month.cn, start: iso(dateOf(t0 + 0.6)), end: iso(dateOf(t1 - 0.4)),
        live: hits.filter(function (h) { return h.verdict === 'Confirmed' || h.verdict === 'Flare'; }),
        hits: hits, hideDoor: hide ? { dir: hide.dir, compromised: hide.isEmpty || HOSTILE_DEITY.indexOf(hide.spirit) >= 0 || hide.heavenStemCn === '庚' } : null,
        workFrom: best ? best.dir : null });
    }
    return out;
  }
  /**
   * 60-JiaZi timing for one month of threatMonths: each live threat's defect is read on that month's plate,
   * and execution days are sought inside the month only (its 節 to the next), each verified as in the full check.
   */
  function monthJiazi(user, m) {
    var fav = (user.deep || {}).favourable || user.favourable || [];
    var res = chartFor('month', { y: m.plateDate.y, m: m.plateDate.m, d: m.plateDate.d, hour: 12, min: 0 }), ch = res.chart;
    var seat = natalSeat(ch, user).num;
    var s0 = m.start.split('-').map(Number), e0 = m.end.split('-').map(Number);
    var startD = new Date(s0[0], s0[1] - 1, s0[2]), endD = new Date(e0[0], e0[1] - 1, e0[2]);
    var before = new Date(startD.getTime() - 864e5), days = Math.round((endD - startD) / 864e5) + 1;
    var from = { y: before.getFullYear(), m: before.getMonth() + 1, d: before.getDate() };
    m.jiazi = m.live.map(function (h) {
      var t = THREATS.filter(function (x) { return x.key === h.key; })[0];
      var mf = manifest(ch, res.formations, t, seat, fav);
      var tm = jiaziTiming(user, t, mf, ch, from, days); tm.scope = 'within ' + m.pillar + ', ' + m.start + ' → ' + m.end;
      return { key: h.key, label: h.label, verdict: h.verdict, timing: tm };
    });
    return m.jiazi;
  }
  function jiaziLine(j) {
    if (!j || !j.days) return j ? j.type + ' — ' + j.why : '';
    return j.type + ' → ' + j.mechanism + ' at ' + j.target.dir + ' (' + j.target.branches.join('') + '): ' +
      (j.days.map(function (d) { return d.date + ' ' + d.dayPillar + (d.hour ? ' ' + d.hour.pillar + ' hour ' + d.hour.range : '') + (d.ok ? ' verified' : ' flagged'); }).join('; ') || 'no matching day this month');
  }

  // One line per month, for the annual pages and prompts.
  function threatMonthText(m) {
    if (!m) return '';
    return m.live.length ? m.live.map(function (h) { return h.label + ' ' + h.verdict + (h.dir ? ' (' + h.symbol + ' ' + h.dir + (h.pressing ? ', presses on you' : '') + ')' : ''); }).join('; ') +
      ' — Hide Door ' + (m.hideDoor ? m.hideDoor.dir + (m.hideDoor.compromised ? ' (compromised)' : '') : '—') + ', work from ' + (m.workFrom || '—')
      : 'clear — work from ' + (m.workFrom || '—');
  }
  function threatMonthTextFull(m) {
    return threatMonthText(m) + (m && m.jiazi && m.jiazi.length ? ' | 60-JIAZI: ' + m.jiazi.map(function (x) {
      return x.label + ': ' + jiaziLine(x.timing); }).join(' / ') : '');
  }

  /* ---------------- 60-JiaZi timing of a counter-strategy ----------------
   * 1. Defect on the active plate, at the threat symbol's palace:
   *    Emptiness — the palace is void            → a FILLING day (day branch = the void branch there);
   *    Conflict  — it presses on the asker, or 庚 / a hostile deity sits there
   *                                              → a COMBINING day (六合 or 三合 with the palace branch);
   *    Stagnation — the stem there is in its grave (入墓), or 死门/杜门 lock a resource
   *                                              → a CLASHING day (沖 the palace branch).
   * 2. Days: the next `days` days whose branch does that.
   * 3. Hours: the twelve hours of each candidate day (stems by 五鼠遁, via the calendar) are cast as pilot
   *    plates; an hour scores for the threat's intended stem, for the right element arriving in the target
   *    palace, and for the asker's seat.
   * 4. Verification: the day branch must not punish (刑) or destroy (破) a natal branch or the target palace's
   *    branch, and in the hour neither 开门 nor the chief star may be controlled by its palace (主克客). */
  var PAL_BR = { 1: [0], 2: [7, 8], 3: [3], 4: [4, 5], 6: [10, 11], 7: [9], 8: [1, 2], 9: [6] };
  var GRAVE_BR = { wood: 7, fire: 10, earth: 10, metal: 1, water: 4 };       // 三合 storage: 未 戌 戌 丑 辰
  var STEM_EL = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
  var INTENT = { financial: { stem: 4, why: '戊 — capital' }, legal: { stem: 3, why: '丁 — documents and strategy' },
    friction: { stem: 3, why: '丁 — strategy' }, relationship: { stem: 1, why: '乙 — harmony' },
    health: { stem: 1, why: '乙 — the healing star (日奇)' }, upheaval: { stem: 2, why: '丙 — clarity and momentum' } };
  var SIX_HE = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  var TRI_HE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var PUN_SETS = [[2, 5, 8], [1, 10, 7], [0, 3]], SELF_PUN = [4, 6, 9, 11];
  var PO = [9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7, 2];
  function punishes(a, b) { return (a === b && SELF_PUN.indexOf(a) >= 0) ||
    (a !== b && PUN_SETS.some(function (s) { return s.indexOf(a) >= 0 && s.indexOf(b) >= 0; })); }

  function defectOf(chart, t, mf) {
    if (!mf) return null;
    var pa = chart.palacesByNumber[mf.num], brs = PAL_BR[mf.num] || [];
    var hostileHere = mf.pressing || mf.agents.some(function (a) { return a === '庚 (opponent)' || HOSTILE_DEITY.indexOf(a) >= 0; });
    // A hazard (惊门, 天芮, 伤门) that is void or in its grave is contained — never fill or clash it open.
    // The only timing remedy for a hazard is to bind it when it is aggressive.
    if (t.hazard) {
      if (pa.isEmpty) return { type: 'Contained', why: mf.symbol + ' sits in a void palace — the hazard is hollow; do not fill it' };
      if (!hostileHere) return null;
      return { type: 'Conflict', mechanism: 'Combining day', targets: brs,
        why: mf.symbol + "'s palace " + (mf.pressing ? 'presses on your seat' : 'holds ' + mf.agents.join(', ')) + ' — bind the aggressor with a combination (貪合忘沖)' };
    }
    if (pa.isEmpty) {
      var voids = (chart.voidBranches || []).map(function (c) { return C.BRANCHES.indexOf(c); });
      var fill = brs.filter(function (b) { return voids.indexOf(b) >= 0; });
      return { type: 'Emptiness', mechanism: 'Filling day', targets: fill.length ? fill : brs,
        why: mf.symbol + ' sits in a void palace (' + fill.map(function (b) { return C.BRANCHES[b]; }).join('') + ' 空亡) — the matter is hollow until a day fills it' };
    }
    if (hostileHere) return { type: 'Conflict', mechanism: 'Combining day', targets: brs,
      why: mf.symbol + "'s palace " + (mf.pressing ? 'presses on your seat' : 'holds ' + mf.agents.join(', ')) + ' — bind the aggressor with a combination (貪合忘沖)' };
    var hs = pa.heavenStemCn ? C.STEMS.indexOf(pa.heavenStemCn) : -1;
    var inGrave = hs >= 0 && brs.indexOf(GRAVE_BR[STEM_EL[hs]]) >= 0;
    var locked = !t.hazard && (pa.gate === '死门' || pa.gate === '杜门');
    if (inGrave || locked) return { type: 'Stagnation', mechanism: 'Clashing day', targets: brs,
      why: inGrave ? pa.heavenStemCn + ' is in its grave here (入墓) — clash the palace open' : pa.gate + ' locks ' + mf.symbol + ' — clash the palace open' };
    return null;
  }

  function jiaziTiming(user, t, mf, chart, from, days) {
    var d = defectOf(chart, t, mf);
    if (d && d.type === 'Contained') return { type: 'Contained', why: d.why };
    if (!d) return { type: 'None', why: 'no defect at ' + (mf ? mf.symbol + "'s palace" : 'the symbol') + ' calls for a timing intervention' };
    // Day branches that do the job.
    var want = [];
    d.targets.forEach(function (b) {
      if (d.type === 'Stagnation') want.push(C.branchClash ? C.branchClash(b) : (b + 6) % 12);
      else if (d.type === 'Emptiness') want.push(b);
      else { want.push(SIX_HE[b]); TRI_HE.forEach(function (s) { if (s.indexOf(b) >= 0) s.forEach(function (x) { if (x !== b) want.push(x); }); }); }
    });
    want = want.filter(function (v, i, a) { return a.indexOf(v) === i; });
    var natal = [user.pillars.year, user.pillars.month, user.pillars.day, user.pillars.hour], LBL = ['Year', 'Month', 'Day', 'Hour'];
    var intent = INTENT[t.key] || { stem: 3, why: '丁 — strategy' };
    var base = new Date(from.y, from.m - 1, from.d, 12, 0), found = [];
    for (var i = 1; i <= days; i++) {
      var dd = new Date(base.getTime() + i * 864e5), dy = { y: dd.getFullYear(), m: dd.getMonth() + 1, d: dd.getDate() };
      var dp = C.fourPillars(dy.y, dy.m, dy.d, 12, 0).day;
      if (want.indexOf(dp.branch) < 0) continue;
      // Step 4 (day): no punishment or destruction with the natal branches or the target palace.
      var flags = [];
      natal.forEach(function (q, k) {
        if (punishes(dp.branch, q.branch)) flags.push(C.BRANCHES[dp.branch] + C.BRANCHES[q.branch] + ' 刑 on the natal ' + LBL[k] + ' pillar');
        if (PO[dp.branch] === q.branch) flags.push(C.BRANCHES[dp.branch] + C.BRANCHES[q.branch] + ' 破 on the natal ' + LBL[k] + ' pillar');
      });
      d.targets.forEach(function (b) {
        // A filling day is the void's own branch by design; its self-punishment (自刑) is not a fault.
        if (punishes(dp.branch, b) && !(d.type === 'Emptiness' && dp.branch === b)) flags.push(C.BRANCHES[dp.branch] + C.BRANCHES[b] + ' 刑 on the target palace');
        if (PO[dp.branch] === b) flags.push(C.BRANCHES[dp.branch] + C.BRANCHES[b] + ' 破 on the target palace');
      });
      // Step 3: the twelve hours, cast as pilot plates.
      var best = null;
      for (var hb = 0; hb < 12; hb++) {
        var hr = hb === 0 ? 23 : hb * 2 - 1;
        var w = { y: dy.y, m: dy.m, d: dy.d, hour: hr, min: 30 };
        if (hb === 0) w = { y: dy.y, m: dy.m, d: dy.d, hour: 0, min: 30 };          // the early 子 hour of this day
        var r = chartFor('hour', w), pc = r.chart, hp = r.pillars.hour, s = 0, why = [];
        if (hp.stem === intent.stem) { s += 2; why.push('hour stem ' + C.STEMS[hp.stem] + ' (' + intent.why + ')'); }
        var tp = pc.palacesByNumber[mf.num];
        if (tp.heavenStemCn === C.STEMS[intent.stem] || tp.heavenStem2Cn === C.STEMS[intent.stem]) { s += 2; why.push(C.STEMS[intent.stem] + ' arrives in the target palace'); }
        if (d.type === 'Conflict' && (tp.gate === '杜门' || tp.spirit === '六合')) { s += 1.5; why.push((tp.gate === '杜门' ? '杜门' : '六合') + ' covers the target palace'); }
        if (d.type !== 'Conflict' && ['开门', '生门', '休门'].indexOf(tp.gate) >= 0) { s += 1; why.push(tp.gate + ' opens the target palace'); }
        if (d.type === 'Emptiness' && tp.isEmpty) { s -= 3; why.push('still void this hour'); }
        var seat = seatOfStem(pc, r.pillars.day.stem, r.pillars.day.i);
        s += 0.3 * palaceQuality(pc, r.formations, seat, (user.deep || {}).favourable || []).score;
        // Step 4 (hour): 主克客 at 开门 or the chief star.
        var hf = [], open = locate(pc, 'door', '开门'), chief = locate(pc, 'chief', '');
        if (open && pc.palacesByNumber[open].gateStrength && pc.palacesByNumber[open].gateStrength.key === 'dead') { s -= 2; hf.push('开门 controlled by its palace (主克客)'); }
        if (chief && pc.palacesByNumber[chief].starStrength && pc.palacesByNumber[chief].starStrength.key === 'dead') { s -= 2; hf.push('chief star controlled by its palace (主克客)'); }
        if (!best || s > best.score) best = { pillar: hp.cn, score: Math.round(s * 10) / 10, why: why, flags: hf,
          range: hb === 0 ? '23:00 the evening before – 00:59' : r.pillars.hourRange };
      }
      var acts = d.targets.filter(function (b) {
        return d.type === 'Stagnation' ? (b + 6) % 12 === dp.branch : d.type === 'Emptiness' ? b === dp.branch
          : SIX_HE[b] === dp.branch || TRI_HE.some(function (s3) { return s3.indexOf(b) >= 0 && s3.indexOf(dp.branch) >= 0 && b !== dp.branch; });
      });
      var how = d.type === 'Stagnation' ? 'clashes' : d.type === 'Emptiness' ? 'fills' : acts.some(function (b) { return SIX_HE[b] === dp.branch; }) ? 'six-combines (六合) with' : 'three-combines (三合) with';
      found.push({ date: dy.y + '-' + pad(dy.m) + '-' + pad(dy.d), dayPillar: dp.cn,
        mechanism: d.mechanism + ' — the ' + C.BRANCHES[dp.branch] + ' day ' + how + ' ' + acts.map(function (b) { return C.BRANCHES[b]; }).join('/'),
        hour: best, flags: flags, ok: !flags.length && !best.flags.length,
        score: Math.round(((best ? best.score : 0) - flags.length * 2) * 10) / 10 });
    }
    found.sort(function (a, b) { return (b.ok - a.ok) || b.score - a.score; });
    return { type: d.type, mechanism: d.mechanism, why: d.why, target: { num: mf.num, dir: chart.palacesByNumber[mf.num].dir,
      branches: d.targets.map(function (b) { return C.BRANCHES[b]; }) }, dayBranches: want.map(function (b) { return C.BRANCHES[b]; }),
      intent: intent.why, days: found.slice(0, 3).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), scanned: days,
      clean: found.some(function (x) { return x.ok; }) };
  }

  var BRIDGE = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };   // X → X+1 bridges X controlling X+2
  function threatBridge(user, year, dt, opts) {
    opts = opts || {};
    var fav = (user.deep || {}).favourable || user.favourable || [];
    var mac = macroThreats(user, year);
    var res = chartFor('hour', dt), ch = res.chart, p = res.pillars;
    var askerNum = seatOfStem(ch, p.day.stem, p.day.i), asker = ch.palacesByNumber[askerNum];
    var hideNum = locate(ch, 'door', '杜门'), hide = hideNum ? ch.palacesByNumber[hideNum] : null;
    var hideQ = hideNum ? palaceQuality(ch, res.formations, hideNum, fav) : null;
    var ranked = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) {
      var x = palaceQuality(ch, res.formations, n, fav); return { num: n, dir: ch.palacesByNumber[n].dir, score: x.score, why: x.why }; })
      .sort(function (a, b) { return b.score - a.score; });

    // Temporal scan: the next `hours` double-hours, one plate each.
    var scan = [], steps = Math.round((opts.days || 5) * 12);
    var base = new Date(dt.y, dt.m - 1, dt.d, dt.hour, dt.min || 0);
    for (var s2 = 1; s2 <= steps; s2++) {
      var t2 = new Date(base.getTime() + s2 * 2 * 3600000);
      var w = { y: t2.getFullYear(), m: t2.getMonth() + 1, d: t2.getDate(), hour: t2.getHours(), min: t2.getMinutes() };
      var r2 = chartFor('hour', w);
      scan.push({ when: w, res: r2, asker: seatOfStem(r2.chart, r2.pillars.day.stem, r2.pillars.day.i) });
    }
    function iso(w) { return w.y + '-' + pad(w.m) + '-' + pad(w.d) + ' ' + pad(w.hour) + ':' + pad(w.min || 0); }

    var threats = THREATS.map(function (t) {
      var m = mac.threats[t.key], sev = Math.round(m.sev * 10) / 10;
      var level = sev >= 2.5 ? 'high' : sev >= 1 ? 'moderate' : 'low';
      var mf = manifest(ch, res.formations, t, askerNum, fav);
      var hot = mf && mf.index >= HOT_AT[t.key];
      var verdict = level !== 'low' && hot ? 'Confirmed' : level !== 'low' ? 'Latent' : hot ? 'Flare' : 'Clear';
      var override = { Confirmed: 'Defend — the threat is live on the board now. Do not initiate in this area; use the Hide Door and the safe directions, and wait for the window.',
        Latent: 'Seize the window — the annual threat is not active on this plate. Act now, from a good direction, to get ahead of it before it activates.',
        Flare: 'Wait it out — a short-lived disturbance in this hour, not a pattern of the year. Postpone and recheck in a later double-hour.',
        Clear: 'Proceed — neither the year nor the board shows this threat.' }[verdict];
      var remedy = null;
      if (mf) {
        var EL = ['wood', 'fire', 'earth', 'metal', 'water'], unf = (user.deep || {}).unfavourable || [];
        var isFav = function (e) { return fav.indexOf(EL.indexOf(e)) >= 0; }, isUnf = function (e) { return unf.indexOf(EL.indexOf(e)) >= 0; };
        var controller = Object.keys(CONTROLS).filter(function (k) { return CONTROLS[k] === mf.element; })[0];
        var drain = PRODUCES[mf.element];
        // Candidates, best first: bridge when the threat presses on you; otherwise drain or control the threat.
        var producer = Object.keys(PRODUCES).filter(function (k) { return PRODUCES[k] === mf.element; })[0];
        // A hazard (惊门, 天芮, 伤门) is drained or controlled; a resource (生门/戊, 开门, 六合) is supported, since
        // the danger there is what sits with it, not the resource itself. Pressing on the asker calls for a bridge.
        var cands = mf.pressing ? [[BRIDGE[mf.element], 'bridges the ' + mf.element + ' palace and your ' + asker.element + ' seat (通關) — it turns the pressure into support']]
                                    .concat(t.hazard ? [[controller, 'controls the ' + mf.element + ' of the hazard palace directly']] : [[producer, 'supports the ' + mf.element + ' of the resource palace']])
          : t.hazard ? [[drain, 'drains the ' + mf.element + ' of the hazard palace'], [controller, 'controls the ' + mf.element + ' of the hazard palace']]
          : [[producer, 'supports the ' + mf.element + ' of the resource palace so it holds against what sits with it'],
             [PRODUCES[mf.element] === asker.element ? mf.element : producer, 'strengthens the resource and its flow to you']];
        var pick = cands.filter(function (c) { return isFav(c[0]); })[0] || cands.filter(function (c) { return !isUnf(c[0]); })[0] || cands[0];
        remedy = { element: pick[0], why: pick[1] + (isFav(pick[0]) ? '; it is also one of your favourable elements' :
          isUnf(pick[0]) ? '; note it is unfavourable in your Bazi, so use it sparingly and only in that direction' : '') };
      }
      var windows = [];
      if (verdict !== 'Clear') {
        windows = scan.map(function (x) {
          var n = locate(x.res.chart, t.symbols[0][0], t.symbols[0][1]); if (!n) return null;
          var pa2 = x.res.chart.palacesByNumber[n], ap = x.res.chart.palacesByNumber[x.asker];
          var aq = palaceQuality(x.res.chart, x.res.formations, x.asker, fav).score, sc;
          if (t.hazard) {
            // A hazard is contained when it is void or not pressing on the asker, while the asker sits strong.
            var press = n !== x.asker && rel(pa2.element, ap.element) === 'controls';
            sc = aq + (pa2.isEmpty ? 1.5 : 0) + (press ? -2 : 1);
          } else {
            // A resource window: the symbol is filled (not void) and strong, and the asker is strong.
            if (pa2.isEmpty) return null;
            sc = palaceQuality(x.res.chart, x.res.formations, n, fav).score + 0.6 * aq;
          }
          return { at: iso(x.when), range: x.res.pillars.hourRange, symbolDir: pa2.dir, askerDir: ap.dir,
                   score: Math.round(sc * 10) / 10, gate: pa2.gate, deity: pa2.spirit, contained: t.hazard ? true : undefined };
        }).filter(function (x) { return x && x.score >= 2; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3)
          .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      }
      var jz = verdict !== 'Clear' && opts.jiazi ? jiaziTiming(user, t, mf, ch, dt, opts.jiaziDays || 30) : null;
      return { key: t.key, label: t.label, cn: t.cn, severity: sev, level: level, evidence: m.evidence, active: mf, jiazi: jz,
        verdict: verdict, override: override, hideTactic: t.hide, remedy: remedy, windows: windows, hazard: !!t.hazard,
        stagnant: mf ? mf.isEmpty : false };
    }).sort(function (a, b) { var o = { Confirmed: 0, Latent: 1, Flare: 2, Clear: 3 }; return o[a.verdict] - o[b.verdict] || b.severity - a.severity; });

    var bad = threats.filter(function (x) { return x.active; }).map(function (x) { return x.active.num; });
    return {
      year: year, when: dt, pillars: p, chart: ch, formations: res.formations, hourRange: p.hourRange,
      asker: { num: askerNum, name: asker.name, dir: asker.dir, stem: C.STEMS[p.day.stem], gate: asker.gate, star: asker.starCn, deity: asker.spirit },
      hideDoor: hide ? { num: hideNum, name: hide.name, dir: hide.dir, star: hide.starCn, deity: hide.spirit, isEmpty: hide.isEmpty,
        quality: hideQ.score, compromised: hide.isEmpty || HOSTILE_DEITY.indexOf(hide.spirit) >= 0 || hide.heavenStemCn === '庚' } : null,
      workFrom: ranked.filter(function (x) { return bad.indexOf(x.num) < 0; }).slice(0, 2),
      avoid: ranked.slice().reverse().filter(function (x) { return x.score < 0; }).slice(0, 2)
        .concat(threats.filter(function (x) { return x.verdict === 'Confirmed' && x.active; }).map(function (x) {
          return { num: x.active.num, dir: x.active.dir, score: x.active.quality, why: [x.label + ' is live here'] }; }))
        .filter(function (x, i, a) { return a.findIndex(function (y) { return y.num === x.num; }) === i; }),
      threats: threats, scanDays: opts.days || 5,
      macroSource: { bazi: mac.bazi ? mac.bazi.verdict : null, zwds: mac.zwds ? mac.zwds.verdict : null,
                     qimen: mac.qimen ? mac.qimen.verdict + ', year seat ' + mac.qimen.seat.dir : null }
    };
  }

  /* ---------------- destiny profile (命盤) ----------------
   * Destiny Palace: the palace where the Day Stem — the person — sits on the heaven plate, as in
   * Qi Men destiny analysis. Its stem pair, door, star and deity are the Life Stem, Door of
   * Destiny, Star of Destiny and Guardian of Destiny. A 甲 day stem hides under the yi of the day's
   * xun; a stem in the centre is read from 坤 (2), where the centre lodges.
   * Life Star is the Nine Star Ki natal star of the solar birth year (本命星); Life Gua is the Eight
   * Mansions gua (命卦). The Day Master stars use the same tables as Chart › Relations, and each is
   * placed on the plate by its branch.
   */
  var BRANCH_PALACE_D = { 0:1, 1:8, 2:8, 3:3, 4:4, 5:4, 6:9, 7:2, 8:2, 9:7, 10:6, 11:6 };
  var STAR9_NAME = { 1:['一白','White','Water'], 2:['二黑','Black','Earth'], 3:['三碧','Jade','Wood'],
    4:['四綠','Green','Wood'], 5:['五黃','Yellow','Earth'], 6:['六白','White','Metal'],
    7:['七赤','Red','Metal'], 8:['八白','White','Earth'], 9:['九紫','Purple','Fire'] };
  var YI_ORDER_D = [4, 5, 6, 7, 8, 9, 3, 2, 1];   // 甲子→戊 … 甲寅→癸

  function destinyProfile(res, user) {
    var ch = res.chart, p = res.pillars, B = global.QPBazi;
    var dayStem = p.day.stem, lookStem = dayStem, hidden = false;
    if (dayStem === 0) { lookStem = YI_ORDER_D[Math.floor(mod(p.day.i - (p.day.i % 10), 60) / 10)]; hidden = true; }
    var stemCn = C.STEMS[lookStem], seat = null;
    var lodged = false;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var pa = ch.palacesByNumber[n]; if (seat || !pa) return;
      if (pa.heavenStemCn === stemCn) seat = pa;
      else if (pa.heavenStem2Cn === stemCn) { seat = pa; lodged = true; }   // centre stem riding with 天芮
    });
    if (!seat) { seat = ch.palacesByNumber[2]; lodged = true; }

    var star9 = S.annualStar(p.solarYear), sn = STAR9_NAME[star9];
    var em = S.eightMansions(p.solarYear, user.gender);

    var dm = p.day.stem, db = p.day.branch, tri = B.triadKey(db);
    var pillarBranches = [p.year.branch, p.month.branch, p.day.branch, p.hour.branch];
    var LBL = ['Year', 'Month', 'Day', 'Hour'];
    function starAt(cn, en, branches, basis) {
      return { cn: cn, en: en, basis: basis, branches: branches.map(function (b) {
        var pal = ch.palacesByNumber[BRANCH_PALACE_D[b]];
        var inPillars = pillarBranches.map(function (x, i) { return x === b ? LBL[i] : null; }).filter(Boolean);
        return { branch: C.BRANCHES[b], animal: C.ZODIAC[b], palace: pal.num, palaceName: pal.name, dir: pal.dir,
                 door: pal.gate, deity: pal.spirit, star: pal.starCn, isEmpty: pal.isEmpty, inPillars: inPillars };
      }) };
    }
    // Mind Palace = the Bazi 命宮: count back from 子 (as the first month) to the birth month, set the
    // birth hour there and count forward to 卯; its stem follows 五虎遁 from the year stem. The month is
    // the month pillar's (節-based). Soul Palace = 胎元: month stem + 1, month branch + 3.
    var monthNo = mod(p.month.branch - 2, 12) + 1;
    var mpBranch = mod(mod(-(monthNo - 1), 12) + mod(3 - p.hour.branch, 12), 12);
    var mpStem = mod(mod((p.year.stem % 5) * 2 + 2, 10) + mod(mpBranch - 2, 12), 10);
    var spStem = mod(p.month.stem + 1, 10), spBranch = mod(p.month.branch + 3, 12);
    function palaceOf(stem, branch, cn, en, rule) {
      var pal = ch.palacesByNumber[BRANCH_PALACE_D[branch]];
      return { cn: cn, en: en, rule: rule, pillar: C.STEMS[stem] + C.BRANCHES[branch],
        name: C.ELEM_EN[C.STEM_ELEM[stem]] + ' ' + C.ZODIAC[branch],
        palace: pal.num, palaceName: pal.name, dir: pal.dir, door: pal.gate, deity: pal.spirit, isEmpty: pal.isEmpty };
    }

    return {
      mindPalace: palaceOf(mpStem, mpBranch, '命宮', 'Mind Palace',
        'from the birth month and hour, stem by the year stem'),
      soulPalace: palaceOf(spStem, spBranch, '胎元', 'Soul Palace',
        'the conception pillar: month stem + 1, month branch + 3'),
      destiny: seat ? {
        palace: seat.num, name: seat.name, dir: seat.dir, element: seat.elementCn,
        lifeStem: C.STEMS[dayStem], lifeStemEn: C.STEMS_EN[dayStem] + ' ' + C.ELEM_EN[C.STEM_ELEM[dayStem]],
        hiddenUnder: hidden ? stemCn : null, earthStem: seat.earthStemCn,
        door: seat.gate, doorEn: seat.gateEn, star: seat.starCn, starEn: seat.starEn,
        guardian: seat.spirit, isEmpty: seat.isEmpty, lodged: lodged,
        doorStrength: seat.gateStrength, starStrength: seat.starStrength
      } : null,
      lifeStar: { num: star9, cn: sn[0], en: sn[0] + ' ' + sn[1] + ' (' + sn[2] + ')', element: sn[2] },
      lifeGua: { num: em.gua, cn: em.guaCn, group: em.group, best: em.best, good: em.good, avoid: em.avoid },
      dayMaster: { stem: C.STEMS[dm], en: C.STEMS_EN[dm] + ' ' + C.ELEM_EN[C.STEM_ELEM[dm]] +
        (C.STEM_YIN[dm] ? ' (yin)' : ' (yang)') },
      stars: [
        // Celestial Mentor (天貴): the Noble People of the stem that combines with the Day Master
        // (天干五合: 甲己 乙庚 丙辛 丁壬 戊癸), yang mentor first. 丙 → 辛 → 寅 Tiger, 午 Horse.
        starAt('天貴', 'Celestial Mentor', (B.NOBLEMAN[(dm + 5) % 10] || []).slice().reverse(),
          'Noble People of ' + C.STEMS[(dm + 5) % 10] + ', which combines with the Day Master ' + C.STEMS[dm]),
        starAt('天乙貴人', 'Noble People', B.NOBLEMAN[dm] || [], 'from the Day Master ' + C.STEMS[dm]),
        starAt('文昌', 'Intelligence Star', [B.ACADEMIC[dm]], 'from the Day Master ' + C.STEMS[dm]),
        starAt('桃花', 'Peach Blossom', [B.PEACH[tri]], 'from the day branch ' + C.BRANCHES[db]),
        starAt('驛馬', 'Sky Horse', [B.HORSE[tri]], 'from the day branch ' + C.BRANCHES[db]),
        starAt('太極貴人', 'Taiji Nobleman', B.TAIJI[dm] || [], 'from the Day Master ' + C.STEMS[dm])
      ]
    };
  }

  /* ---------------- formation catalogue for the search picker ---------------- */

  function formationCatalogue() {
    var D = global.QPData;
    if (!D || !D.FORMATIONS) return [];
    return D.FORMATIONS.map(function (f) {
      return { id: f.id, name: f.name, nameEn: f.nameEn, category: f.category,
               description: f.description };
    }).sort(function (a, b) {
      var order = { auspicious: 0, special: 1, hostile: 2 };
      return (order[a.category] - order[b.category]) || a.nameEn.localeCompare(b.nameEn);
    });
  }

  /**
   * Search a window for hours containing ANY of the requested formations.
   * Returns one entry per (hour, formation) so each row names a concrete palace.
   */
  function searchFormations(startDt, endDt, ids, opts) {
    opts = opts || {};
    var out = [];
    var jd0 = A.gregToJD(startDt.y, startDt.m, startDt.d);
    var jd1 = A.gregToJD(endDt.y, endDt.m, endDt.d);
    var days = Math.max(0, Math.round(jd1 - jd0)) + 1;
    var want = {};
    ids.forEach(function (i) { want[i] = true; });
    // opts: limit (default 60), waking (skip 丑寅卯, 01:00–06:59), fav (favourable elements, for the strength score).
    // Each hit carries a score — its palace's quality plus the formation's rarity weight — so results can be ranked.
    // A capped search marks the array `truncated`.
    var cap = opts.limit || 60;

    for (var d = 0; d < days; d++) {
      var g = A.jdToGreg(jd0 + d);
      var gy = g.y, gm = g.m, gd = Math.floor(g.d);
      var jdn = A.civilJDN(gy, gm, gd);
      for (var b = 0; b < 12; b++) {
        if (opts.waking && b >= 1 && b <= 3) continue;
        var hh = b === 0 ? 23 : (b * 2 - 1);
        var p = C.fourPillars(gy, gm, gd, hh, 30);
        if (b === 0 && p.dayJDN !== jdn) continue;
        var forms = S.formations(p, gm);
        var hits = forms.filter(function (f) { return want[f.id]; });
        if (!hits.length) continue;
        var chart = S.qimen(p);
        var ausp = forms.filter(function (f) { return f.category === 'auspicious'; }).length;
        var host = forms.filter(function (f) { return f.category === 'hostile'; }).length;
        hits.forEach(function (f) {
          var pals = (f.palaces && f.palaces.length ? f.palaces : [chart.best[0] ? chart.best[0].num : 1]);
          var main = pals.filter(function (n) { return n >= 1 && n <= 9 && n !== 5; })[0];
          out.push({
            score: Math.round(((main ? palaceQuality(chart, forms, main, opts.fav || null).score : 0) + formationWeight(f)) * 10) / 10,
            y: gy, m: gm, d: gd, hour: hh, hourBranch: b,
            range: C.HOUR_RANGE[b], branchCn: C.BRANCHES[b],
            dayPillar: p.day, hourPillar: p.hour, pillars: p,
            formation: f, chart: chart,
            palaces: pals.map(function (n) { return chart.palacesByNumber[n]; }).filter(Boolean),
            mansion: chart.mansion, net: ausp - host, ausp: ausp, hostile: host
          });
        });
        if (out.length >= cap) { out.truncated = true; return out; }
      }
    }
    return out;
  }

  /* ---------------- structure scan: the strongest palaces in every hourly chart ahead ----------------
   * Every double-hour plate for the coming days, each outer palace scored on what the classics count as
   * strength: auspicious formations in it, the door and its strength, the deity, the star, the heaven stem
   * (the Three Wonders 乙丙丁 and 戊 capital help, 庚 obstructs) and void. A palace qualifies as a structure
   * when it holds an auspicious formation or the Three Wonders over an auspicious door, and is not void.
   * Each carries what it is good for, in plain words, and a 3×3 summary of its chart for display or email. */
  var STEM_ROLE = {
    '乙': { role: 'Sun Wonder 日奇', good: 'gentle help, healing, negotiation and anything that needs grace', score: 1,
            act: 'bring something green and living, and ask softly' },
    '丙': { role: 'Moon Wonder 月奇', good: 'favour from authority, visibility and bold initiatives', score: 1,
            act: 'light a candle or sit in sunlight, and be seen' },
    '丁': { role: 'Star Wonder 星奇', good: 'documents, insight, study and quiet breakthroughs', score: 1,
            act: 'write the request on paper in your own hand' },
    '戊': { role: 'Capital 戊', good: 'money, investment and resources', score: 0.5,
            act: 'place a coin, your accounts or a business card in front of you' },
    '己': { role: 'Hidden earth 己', good: 'private plans and groundwork', score: 0, act: 'keep the matter private' },
    '庚': { role: 'Obstruction 庚', good: '', score: -1, act: '' },
    '辛': { role: 'Correction 辛', good: 'fixing mistakes and reconsidering', score: 0, act: 'name one thing you will correct' },
    '壬': { role: 'Flow 壬', good: 'travel, movement and trade', score: 0, act: 'keep water or a moving object nearby' },
    '癸': { role: 'Network 癸', good: 'connections behind the scenes', score: 0, act: 'contact someone you have meant to reach' }
  };
  var STAR_PLAIN = {
    '天辅': 'learning, advisers and culture', '天心': 'strategy, healing and leadership', '天任': 'steady effort, property and patience',
    '天冲': 'swift, decisive action', '天禽': 'stability at the centre', '天英': 'visibility and reputation',
    '天蓬': 'bold risk-taking', '天芮': 'study of faults and problems', '天柱': 'speaking out and breaking old patterns'
  };
  var GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  // How often each auspicious formation falls in a given palace (% of palace-hours over 2,880 hourly plates, 2026-27,
  // 置闰 with the hour void). The common ones describe an ordinary good palace and only support a structure; the rare
  // ones make it. Re-measured in 9.31 after the 伏吟/反吟 and deity detectors were fixed.
  var FORMATION_FREQ = {
    xing_men_xiang_sheng: 31.6, ji_men_dao: 29.6, san_he: 25, ji_men_he_ji_xing: 19.7, deity_harmony: 19,
    zhi_shi_xiang_sheng: 16.6, men_sheng_gong: 16.5, san_qi_you_liu_yi: 13, san_qi_sheng_dian: 7, fei_dun_cheng: 6.6,
    jiu_tian_tong_ling: 4.7, ding_qi_sheng: 2.9, jiao_tai: 2.9, bing_qi_sheng: 2.7, yu_nv_shou: 2.6,
    qing_long_hui: 2.5, qi_yi_xiang_he: 2.2, huan_xi: 1.5, zhi_fu_xiang_sheng: 1.4, yi_qi_sheng: 1.4, bing_jia: 1.1,
    ding_jia: 1.1, fei_niao_die: 1.1, gui_yi: 1.1, wu_bing: 1.1, wu_ding: 1.1, yi_gui: 1.1, ren_yi: 1, yi_jia: 1,
    yi_ren: 1, san_qi_de_shi: 0.7, fei_niao_ru_long: 0.4, yun_dun: 0.2, di_dun: 0.2, tian_dun: 0.2, ren_dun: 0.1,
    feng_dun: 0.1, long_dun: 0, gui_dun: 0, tian_xian_shi: 0, shen_dun: 0, san_qi_gui_lu: 0, hu_dun: 0
  };
  // How often each formation appears anywhere on an hourly plate (% of hours), for the Formations screen.
  var FORMATION_HOURLY = {
    ji_men_dao: 100, san_he: 100, stem_kong: 100, men_kong: 100, ji_xing_lin: 100, star_kong: 100,
    xiong_xing_lin: 90.2, ji_men_he_ji_xing: 90, deity_clash: 88.2, deity_harmony: 80.3, fei_xing_ge: 77.7,
    men_po: 66.8, men_xing_xiang: 66.7, xing_zhi: 66.7, ge_dou: 66.6, san_qi_you_liu_yi: 65.7,
    xing_men_xiang_sheng: 63.6, men_sheng_gong: 55.3, zhi_shi_xiang_sheng: 55.2, zhi_shi_yin: 55.2,
    liu_yi_ru_mu: 53.5, san_qi_sheng_dian: 46.7, kong_wang: 46.7, fei_dun_cheng: 45.8, jiu_tian_tong_ling: 37.6,
    zhi_fu_yin: 33.3, men_ru_mu: 33.1, san_qi_ru_mu: 30.6, jiu_di_xiong: 28.3, ding_qi_sheng: 23, liu_he_xiong: 22.5,
    fan_yin: 22.3, xing_fu_yin: 22.3, zhi_fu_kong: 22.2, fu_yin_men: 22.2, zhi_fu_xiong: 22.1, bing_qi_sheng: 21.5,
    yu_nv_shou: 20.5, yin_yang_dao: 20.4, di_wang_zhe_bi: 20.1, qing_long_hui: 20, fei_duan_ge: 20,
    tian_wang_si_zhang: 19.7, bai_hu: 19.7, qi_yi_xiang_he: 17.4, jiao_tai: 16.7, teng_she: 16.3, xuan_wu: 12.7,
    huan_xi: 12.3, ji_ji_xing: 11.6, men_fan_yin: 11.5, zhi_fu_xiang_sheng: 11.3, tai_yin_xiong: 11.3,
    yi_qi_sheng: 11.2, jiu_tian_xiong: 11.2, geng_ji_xing: 11.1, shi_mu: 11.1, xin_ji_xing: 11.1, wu_ji_xing: 11,
    fan_yin_2: 10.9, gui_ji_xing: 10.9, ren_ji_xing: 10.9, xing_fan_yin: 10.9, tian_xian_shi: 10, xin_ren: 9.3,
    wu_ren: 9.3, yi_gui: 9.1, geng_xin: 9.1, xing_ge: 9.1, xin_yi: 9.1, ding_jia: 9, yi_ji: 9, wu_bing: 8.9,
    gui_geng: 8.9, ren_geng: 8.9, geng_ji_geng: 8.9, qing_long_tao: 8.9, shang_ge: 8.9, xin_ding: 8.9, wu_ding: 8.8,
    wu_ji: 8.8, wu_xin: 8.8, bing_ren: 8.8, gui_ren: 8.8, tian_yi_fu_gong: 8.8, ren_bing: 8.8, ren_ding: 8.8,
    zei_ge: 8.8, tai_bai_ru_ying: 8.8, ren_xin: 8.7, bei_ge: 8.7, ying_ru_tai_bai: 8.7, ding_xin: 8.6, ding_gui: 8.6,
    ji_ding: 8.6, gui_yi: 8.5, bing_jia: 8.4, fei_niao_die: 8.4, wu_jia_xin_ge: 8.4, ding_ren: 8.4, ji_bing: 8.4,
    xiao_ge: 8.4, wu_yi: 8.4, tian_yi_di_wang: 8.3, da_ge: 8.3, 'gan_he-xing': 8.3, yi_geng: 8.3, yi_jia: 8.2,
    yi_ren: 8.2, xin_gui: 8.1, gui_bing: 8, she_yao_jiao: 8, ren_yi: 7.8, bing_xin: 7.7, san_qi_de_shi: 5.7,
    wu_jia_di: 5.2, wu_jia_tian: 4.6, wu_jia_ren: 4.4, wu_jia_shen: 3.7, fei_niao_ru_long: 3.2, wu_jia_gui: 3,
    san_zha: 1.7, di_dun: 1.6, yun_dun: 1.3, tian_dun: 1.3, feng_dun: 0.9, ren_dun: 0.8, long_dun: 0.3, gui_dun: 0.3,
    shen_dun: 0.1, hu_dun: 0.1, san_qi_gui_lu: 0, long_yin: 0, wu_xing_que: 0, fu_duan_ge: 0
  };
  /**
   * What the Formations screen says about one formation: how often it occurs, roughly how many waking hours a month
   * carry it, what it favours (the part of its description after the dash), and its seasonal strength this month.
   */
  function formationInfo(f, month) {
    var D = global.QPData, pct = FORMATION_HOURLY[f.id] || 0;
    var perMonth = Math.round(pct / 100 * 30 * 9 * 10) / 10;    // 9 waking double-hours a day (07:00–00:59)
    var band = pct === 0 ? 'Unseen' : pct < 1 ? 'Very rare' : pct < 5 ? 'Rare' : pct < 20 ? 'Occasional' : 'Common';
    return {
      pct: pct, band: band, perMonth: perMonth,
      often: pct === 0 ? 'did not occur in 2,880 hourly plates across 2026–27' :
        'in ' + pct + '% of hourly plates — about ' + (perMonth >= 1 ? Math.round(perMonth) + ' waking hour' + (Math.round(perMonth) === 1 ? '' : 's') + ' a month'
          : 'once every ' + Math.round(1 / perMonth) + ' months in waking hours'),
      favours: (f.description.split(' — ')[1] || f.description).replace(/\.$/, ''),
      seasonal: D && D.formationSeasonalStrength ? D.formationSeasonalStrength(f, month || (new Date().getMonth() + 1)) : '',
      use: f.category === 'auspicious' ? 'Plan the matter it favours for that hour, face the palace it sits in, and open the manifestation script to work with it by name.'
        : f.category === 'hostile' ? 'Avoid starting important matters in that hour, or work from a different palace.'
        : 'Read it with the rest of the chart; it colours the hour rather than deciding it.'
    };
  }
  function formationWeight(f) {
    var pct = FORMATION_FREQ[f.id];
    return pct === undefined || pct < 1 ? 2 : pct >= 15 ? 0 : pct >= 5 ? 0.75 : 1.5;
  }

  function structureAt(res, fav) {
    var ch = res.chart, forms = res.formations, best = null;
    [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
      var pa = ch.palacesByNumber[n];
      if (!pa || pa.isEmpty) return;
      var fs = forms.filter(function (f) { return f.category === 'auspicious' && Array.isArray(f.palaces) && f.palaces.indexOf(n) >= 0; });
      var major = fs.filter(function (f) { return formationWeight(f) > 0; });
      var hs = STEM_ROLE[pa.heavenStemCn] || { score: 0 }, wonder = ['乙', '丙', '丁'].indexOf(pa.heavenStemCn) >= 0;
      if (!major.length && !(wonder && pa.gateRank === 2)) return;
      var s = palaceQuality(ch, forms, n, fav).score + hs.score + major.reduce(function (t, f) { return t + formationWeight(f); }, 0);
      // Rarest formations first, so the headline names what makes the palace special.
      fs.sort(function (x, y) { return formationWeight(y) - formationWeight(x); });
      if (!best || s > best.score) best = { num: n, pa: pa, forms: fs, major: major.length, score: Math.round(s * 10) / 10 };
    });
    return best;
  }
  function structureGrid(ch, hl) {
    return GRID_ORDER.map(function (n) {
      var p = ch.palacesByNumber[n] || {};
      return { num: n, dir: p.dir || 'Centre', gate: p.gate || '', star: p.starCn || '', deity: p.spirit || '',
               heaven: (p.heavenStemCn || '') + (p.heavenStem2Cn || ''), earth: (p.earthStemCn || '') + (p.earthStem2Cn || ''),
               isEmpty: !!p.isEmpty, hl: n === hl };
    });
  }
  // A one-line summary in everyday words, then the parts: door, stem, deity, star.
  function structureGoodFor(b) {
    var pa = b.pa, out = [], door = (pa.gate || '').charAt(0), hs = STEM_ROLE[pa.heavenStemCn];
    if (DOOR_INTENT[door]) out.push(pa.gate + ' (door) — ' + DOOR_INTENT[door].ask + '.');
    if (hs && hs.good) out.push(pa.heavenStemCn + ' ' + hs.role + ' (heaven stem) — ' + hs.good + '.');
    if (DEITY_QUALITY[pa.spirit]) out.push(pa.spirit + ' (deity) — ' + DEITY_QUALITY[pa.spirit] + '.');
    if (STAR_PLAIN[pa.starCn]) out.push(pa.starCn + ' (star) — ' + STAR_PLAIN[pa.starCn] + '.');
    return out;
  }
  function structureSummary(b) {
    var door = (b.pa.gate || '').charAt(0), hs = STEM_ROLE[b.pa.heavenStemCn];
    var bits = [DOOR_INTENT[door] ? DOOR_INTENT[door].ask.split(' — ')[0] : null, hs && hs.good ? hs.good.split(',')[0] : null,
                DEITY_QUALITY[b.pa.spirit] || null].filter(Boolean);
    return 'Good for ' + bits.join('; ') + '. Face ' + b.pa.dir + '.';
  }

  /** Scan `days` days from `from` ({y,m,d}); fav = the person's favourable elements (optional). */
  function structureScan(from, days, fav) {
    var all = [];
    for (var i = 0; i < days; i++) {
      var d0 = new Date(from.y, from.m - 1, from.d + i), dt = { y: d0.getFullYear(), m: d0.getMonth() + 1, d: d0.getDate() };
      for (var k = 0; k < 12; k++) {
        var when = { y: dt.y, m: dt.m, d: dt.d, hour: k * 2, min: 30 }, res = chartFor('hour', when), b = structureAt(res, fav);
        if (!b) continue;
        var pa = b.pa;
        all.push({ date: dt.y + '-' + pad(dt.m) + '-' + pad(dt.d), dt: when, range: C.HOUR_RANGE[k], branch: k,
          hourPillar: res.pillars.hour.cn, dayPillar: res.pillars.day.cn, score: b.score,
          palace: { num: b.num, name: pa.name, dir: pa.dir, element: pa.element },
          gate: pa.gate, star: pa.starCn, deity: pa.spirit, heaven: pa.heavenStemCn, earth: pa.earthStemCn,
          formations: b.forms.map(function (f) { return { id: f.id, name: f.name, nameEn: f.nameEn, description: f.description, major: formationWeight(f) > 0 }; }),
          summary: structureSummary(b), goodFor: structureGoodFor(b), dun: res.chart.dun, ju: res.chart.ju, grid: structureGrid(res.chart, b.num) });
      }
    }
    var byScore = function (x, y) { return y.score - x.score; };
    // Structures are offered for planned practice, so the rankings use waking hours: 辰 07:00 through 子 00:59.
    all = all.filter(function (s) { return s.branch >= 4 || s.branch === 0; });
    var first = new Date(from.y, from.m - 1, from.d), firstIso = first.getFullYear() + '-' + pad(first.getMonth() + 1) + '-' + pad(first.getDate());
    var today = all.filter(function (s) { return s.date === firstIso; });
    // The ranking keeps at most two structures per day, so one crowded day cannot fill the list.
    var perDay = {}, top = all.slice().sort(byScore).filter(function (s) {
      perDay[s.date] = (perDay[s.date] || 0) + 1; return perDay[s.date] <= 2; });
    return { from: from, days: days, count: all.length, today: today.sort(byScore).slice(0, 4), top: top.slice(0, 15), all: all };
  }

  /* ---------------- 感情盤: attraction, desire and intimacy on the plate ----------------
   * The two people are their natal Day Stems (natalSeat). The relationship symbols, as the classics use them:
   * 六合 the union and go-between; 乙 the woman and 庚 the man (乙庚合); 丁 the Jade Maiden (玉女) — tenderness and
   * romance; 丙 ardour and desire; 景门 passion shown openly; 休门 rest, ease and intimacy. Disruptors: 玄武 secrecy and
   * temptation, 腾蛇 suspicion and anxiety, 白虎 quarrels and fatigue, 惊门 fright and arguments, and a void (空亡)
   * palace, which leaves a feeling hollow. Each finding is phrased for a reader with no Qimen training. */
  var EL5 = ['wood', 'fire', 'earth', 'metal', 'water'];
  // What brings an element into a room or a relationship, and the words that carry it. Index = element.
  var ELEMENT_REMEDY = [
    { el: 'Wood', colours: 'green and teal', objects: 'living plants, fresh flowers, wooden pieces in pairs',
      scents: 'cedarwood, pine, green tea, basil', words: 'encouragement and plans together — "let\'s…", "I believe in you"',
      weakWords: 'impatience and pushing — "you always…", "you never…"' },
    { el: 'Fire', colours: 'red, pink, purple and warm orange', objects: 'candles, warm low lamps, red or pink fabric, a photo of the two of you smiling',
      scents: 'rose, cinnamon, ylang-ylang, clove', words: 'open admiration and affection — "you look wonderful", "I love it when you…"',
      weakWords: 'raised voices and accusations in the heat of the moment' },
    { el: 'Earth', colours: 'yellow, peach, beige and terracotta', objects: 'ceramics, a pair of rose-quartz stones, soft cushions and throws',
      scents: 'sandalwood, vanilla, patchouli', words: 'reassurance and commitment — "I\'m here", "we\'ll handle it together"',
      weakWords: 'nagging, worrying aloud and bringing up the past' },
    { el: 'Metal', colours: 'white, gold and silver', objects: 'a gift of jewellery, a pair of metal or crystal ornaments, a soft bell or chime',
      scents: 'white musk, frankincense, lily', words: 'appreciation and respect — "thank you for…", and keeping your word',
      weakWords: 'criticism, cold correction and cutting remarks' },
    { el: 'Water', colours: 'navy, deep blue and black', objects: 'a small water feature, glassware, flowing soft fabrics',
      scents: 'jasmine, lotus, marine notes', words: 'listening and empathy — "tell me more", "I understand how you feel"',
      weakWords: 'going silent, withdrawing and leaving things vague' }
  ];
  var ROMANCE_DISRUPT = {
    '玄武': 'is in a guarded, private phase now, when misunderstandings over plans and messages creep in — be open about plans, messages and whereabouts',
    '腾蛇': 'may feel anxious or suspicious now — reassure, and do not leave things ambiguous',
    '白虎': 'is tired and quick to quarrel now — keep serious talks for another time',
    '惊门': 'is easily startled into arguments now — speak gently and do not surprise them with bad news'
  };

  function romanceRead(res, a, b) {
    var ch = res.chart, forms = res.formations, P = ch.palacesByNumber;
    var sa = natalSeat(ch, a).num, sb = natalSeat(ch, b).num, A = P[sa], B = P[sb];
    var q = function (n) { return n ? palaceQuality(ch, forms, n, null).score : 0; };
    var voidOf = function (n) { return n && P[n].isEmpty ? 1 : 0; };
    // A symbol helps the two seats when its palace is a seat, feeds one or shares its element; it hurts when it controls one.
    function toward(n) {
      if (!n) return 0;
      return [sa, sb].reduce(function (s, seat) {
        var r = n === seat ? 'same' : rel(P[n].element, P[seat].element);
        return s + (r === 'same' ? 1 : r === 'produces' ? 0.75 : r === 'controls' ? -0.75 : 0); }, 0);
    }
    var bondRel = sa === sb ? 'same palace' : rel(A.element, B.element);
    var bond = sa === sb ? 2 : ({ same: 1.5, produces: 1, produced_by: 1, controls: -1.5, controlled_by: -1.5 }[bondRel] || 0);
    var lh = locate(ch, 'deity', '六合'), yi = locate(ch, 'stem', '乙'), geng = locate(ch, 'stem', '庚');
    var ding = locate(ch, 'stem', '丁'), bing = locate(ch, 'stem', '丙'), jing = locate(ch, 'door', '景门'), xiu = locate(ch, 'door', '休门');
    var yg = yi && geng ? (yi === geng ? 'same' : rel(P[yi].element, P[geng].element)) : null;
    var why = { attraction: [], desire: [], intimacy: [] }, warn = [];

    var attraction = bond + 0.5 * q(lh) + toward(lh) - 1.5 * voidOf(lh) + (yg === 'same' || yg === 'produces' || yg === 'produced_by' ? 1 : yg === 'controls' || yg === 'controlled_by' ? -1 : 0);
    why.attraction.push(sa === sb ? 'you share the same palace on the plate' : bond > 0 ? 'your two positions support each other' : bond < 0 ? 'your two positions pull against each other' : 'your positions are neutral to each other');
    if (lh) why.attraction.push(voidOf(lh) ? 'the union symbol (六合) is empty, so promises and plans may not land' : q(lh) >= 1 ? 'the union symbol (六合) sits in a strong palace' : q(lh) <= -1 ? 'the union symbol (六合) sits in a weak palace' : 'the union symbol (六合) is neutral');

    var desire = 0.4 * (q(bing) + q(jing)) + toward(bing) + toward(jing) - voidOf(bing) - voidOf(jing);
    why.desire.push(toward(bing) + toward(jing) > 0.5 ? 'passion (丙, 景门) flows towards you both' : toward(bing) + toward(jing) < -0.5 ? 'passion (丙, 景门) presses on you rather than warming you' : 'passion (丙, 景门) is neutral to you both');
    if (voidOf(bing) || voidOf(jing)) why.desire.push('part of the passion signal is empty — desire runs lower than usual');

    var intimacy = 0.5 * (q(xiu) + q(ding)) + toward(xiu) + toward(ding) + 0.5 * bond - voidOf(xiu) - voidOf(ding);
    why.intimacy.push(toward(xiu) + toward(ding) > 0.5 ? 'tenderness and ease (丁 Jade Maiden, 休门) favour you both' : toward(xiu) + toward(ding) < -0.5 ? 'tenderness and ease (丁, 休门) are hard to reach' : 'tenderness and ease (丁, 休门) are neutral');

    [[sa, a.name], [sb, b.name]].forEach(function (x) {
      var p = P[x[0]];
      if (ROMANCE_DISRUPT[p.spirit]) warn.push(x[1] + ' ' + ROMANCE_DISRUPT[p.spirit] + ' (' + p.spirit + ')');
      if (ROMANCE_DISRUPT[p.gate]) warn.push(x[1] + ' ' + ROMANCE_DISRUPT[p.gate] + ' (' + p.gate + ')');
      if (p.isEmpty) warn.push(x[1] + ' may feel distant or not fully present now (void 空亡)');
    });
    intimacy -= 0.5 * warn.length;

    // The direction to activate: the strongest of the union, tenderness and ease palaces that is neither void nor hostile.
    var bad = ['玄武', '白虎', '腾蛇'];
    var cands = [[lh, '六合 union'], [ding, '丁 Jade Maiden'], [xiu, '休门 ease'], [jing, '景门 passion']].filter(function (c) {
      return c[0] && !P[c[0]].isEmpty && bad.indexOf(P[c[0]].spirit) < 0; })
      .sort(function (x, y) { return q(y[0]) - q(x[0]); });
    var act = cands[0] || [lh || sa, '六合 union'], ap = P[act[0]], ae = EL5.indexOf(ap.element);
    var avoid = [1, 2, 3, 4, 6, 7, 8, 9].filter(function (n) { return bad.indexOf(P[n].spirit) >= 0 || (P[n].gate === '惊门'); })
      .map(function (n) { return P[n].dir + ' (' + [P[n].spirit, P[n].gate].filter(function (s) { return bad.indexOf(s) >= 0 || s === '惊门'; }).join(', ') + ')'; });
    // When the two seats control each other, the element between them turns the pressure into support (通關).
    var bridge = null;
    if (bondRel === 'controls' || bondRel === 'controlled_by') {
      var c = bondRel === 'controls' ? A.element : B.element;
      bridge = EL5.indexOf(PRODUCES[c]);
    }
    var weakEl = EL5.indexOf(Object.keys(CONTROLS).filter(function (k) { return CONTROLS[k] === ap.element; })[0]);
    var r1 = function (x) { return Math.round(x * 10) / 10; };
    return {
      attraction: r1(attraction), desire: r1(desire), intimacy: r1(intimacy), why: why, warnings: warn,
      seats: { a: { num: sa, dir: A.dir }, b: { num: sb, dir: B.dir }, relation: bondRel },
      activate: { num: act[0], dir: ap.dir, symbol: act[1], element: ae, remedy: ELEMENT_REMEDY[ae] },
      bridge: bridge === null || bridge < 0 ? null : { element: bridge, remedy: ELEMENT_REMEDY[bridge] },
      weaken: weakEl >= 0 ? { element: weakEl, remedy: ELEMENT_REMEDY[weakEl] } : null,
      avoid: avoid, unionDir: lh ? P[lh].dir : null
    };
  }

  /** The two people on a plate of the given scope ('hour', 'day', 'month') at a moment. */
  function romancePlate(a, b, type, when) { return romanceRead(chartFor(type, when), a, b); }

  /**
   * The strongest and weakest times for attraction, desire and intimacy over the coming days: every double-hour plate,
   * plus the day's own branch against both natal day branches (clash, combination, Peach Blossom, 紅鸞/天喜).
   */
  function romanceWindows(a, b, from, days) {
    var B = global.QPBazi, slots = [];
    var dayA = a.pillars.day.branch, dayB = b.pillars.day.branch;
    var UNION = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
    var love = [];
    [a, b].forEach(function (x) {
      var yb = x.pillars.year.branch, hl = mod(3 - yb, 12);
      love.push(hl, mod(hl + 6, 12));
      if (B && B.PEACH && B.triadKey) { love.push(B.PEACH[B.triadKey(yb)], B.PEACH[B.triadKey(x.pillars.day.branch)]); }
    });
    for (var i = 0; i < (days || 30); i++) {
      var d0 = new Date(from.y, from.m - 1, from.d + i), dt = { y: d0.getFullYear(), m: d0.getMonth() + 1, d: d0.getDate() };
      var dp = C.fourPillars(dt.y, dt.m, dt.d, 12, 0).day, db = dp.branch, dayNote = [], dayScore = 0;
      if ((db + 6) % 12 === dayA || (db + 6) % 12 === dayB) { dayScore -= 2; dayNote.push('the day clashes a day branch — friction at home'); }
      if (UNION[db] === dayA || UNION[db] === dayB) { dayScore += 1; dayNote.push('the day combines with a day branch'); }
      if (love.indexOf(db) >= 0) { dayScore += 1.5; dayNote.push('a romance or Peach Blossom day'); }
      // Double-hour k (子 丑 寅 …) is sampled half an hour into it: 00:30, 02:30, 04:30 …
      for (var k = 0; k < 12; k++) {
        var r = romanceRead(chartFor('hour', { y: dt.y, m: dt.m, d: dt.d, hour: k * 2, min: 30 }), a, b);
        var hb = k, hNote = [], hScore = 0;
        if ((hb + 6) % 12 === dayA || (hb + 6) % 12 === dayB) { hScore -= 1; hNote.push('the hour clashes a day branch'); }
        if (love.indexOf(hb) >= 0) { hScore += 0.5; hNote.push('a romance hour'); }
        var total = r.attraction + r.desire + r.intimacy + dayScore + hScore;
        slots.push({ date: dt.y + '-' + pad(dt.m) + '-' + pad(dt.d), dayPillar: dp.cn, range: C.HOUR_RANGE[k], branch: k,
          attraction: r.attraction, desire: r.desire, intimacy: r.intimacy, total: Math.round(total * 10) / 10,
          notes: dayNote.concat(hNote), warnings: r.warnings, activate: r.activate.dir });
      }
    }
    // Times are offered for planned time together, so only waking hours count: 辰 07:00 through 子 00:59.
    slots = slots.filter(function (s) { return s.branch >= 4 || s.branch === 0; });
    var sorted = slots.slice().sort(function (x, y) { return y.total - x.total; });
    function pick(list, n) {
      var seen = {}, out = [];
      list.forEach(function (s) { if (out.length < n && !seen[s.date]) { seen[s.date] = 1; out.push(s); } });
      return out.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : x.branch - y.branch; });
    }
    return { days: days || 30, strongest: pick(sorted, 6), weakest: pick(sorted.slice().reverse(), 4),
      byDimension: ['attraction', 'desire', 'intimacy'].reduce(function (o, k) {
        o[k] = slots.slice().sort(function (x, y) { return y[k] - x[k]; })[0]; return o; }, {}) };
  }

  global.QPQimen = {
    romancePlate: romancePlate, romanceWindows: romanceWindows, ELEMENT_REMEDY: ELEMENT_REMEDY,
    structureScan: structureScan, STEM_ROLE: STEM_ROLE, STAR_PLAIN: STAR_PLAIN, formationInfo: formationInfo,
    CHART_TYPES: CHART_TYPES, chartFor: chartFor, DOOR_INTENT: DOOR_INTENT,
    formationCatalogue: formationCatalogue, searchFormations: searchFormations,
    CATEGORIES: CATEGORIES, SCENARIOS: SCENARIOS, SEARCH_FIELDS: SEARCH_FIELDS, qimenAnnual: qimenAnnual, threatBridge: threatBridge, THREATS: THREATS, threatMonths: threatMonths, threatMonthText: threatMonthText, threatMonthTextFull: threatMonthTextFull, monthJiazi: monthJiazi,
    METHODS: METHODS, nianMingPalace: nianMingPalace, symbolFor: symbolFor,
    forecast: forecast, searchWindows: searchWindows, manifestPlan: manifestPlan, destinyProfile: destinyProfile,
    findPalace: findPalace, askerPalace: askerPalace, rel: rel, REL_LABEL: REL_LABEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
