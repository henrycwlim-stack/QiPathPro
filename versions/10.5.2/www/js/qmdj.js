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
    { id:'budget', cat:'wealth', name:'预算', nameEn:'Budget, loans and capital approval',
      yong:'戊 Wu — the principal',
      desc:'Getting a budget signed off, or releasing capital.',
      targets:[{id:'wu',kind:'stem',char:'戊'}], asker:['wu'],
      combos:[{chars:['戊','丁'],tone:'good',note:'Wu over Ding — the budget is approved'},
              {chars:['戊','庚'],tone:'danger',note:'Wu over Geng — funds frozen, audited or blocked'}],
      good:'Wu is well seated and reaches the asker — the money moves.',
      bad:'Wu sits void or under Geng — the money is committed elsewhere or held.' },
    { id:'partnership', cat:'wealth', name:'合伙', nameEn:'Business partnership',
      yong:'Hour Stem (the partner) + 生门 Life Door',
      desc:'Whether to enter a partnership, and who gains from it.',
      targets:[{id:'partner',kind:'stem_ref',ref:'hour'},{id:'life',kind:'door',char:'生'}],
      asker:['partner'],
      good:'The partner\'s palace supports yours — the partnership looks worth pursuing.',
      bad:'The partner\'s palace works against yours — look carefully at the terms, or at other options.' },
    { id:'promotion', cat:'career', name:'升迁', nameEn:'Promotion and recognition',
      yong:'开门 Open Door + 生门 Life Door + 值符 Chief',
      desc:'Advancement, visibility, and backing from those above you.',
      targets:[{id:'open',kind:'door',char:'开'},{id:'life',kind:'door',char:'生'},{id:'chief',kind:'deity',char:'值符'}],
      asker:['open'],
      good:'The Open Door is well placed and reaches you — your effort is being noticed.',
      bad:'The Open Door does not reach you — recognition is not here yet.' },
    { id:'finding_job', cat:'career', name:'求职', nameEn:'Finding work',
      yong:'开门 Open Door + 值符 Chief',
      desc:'Applications, interviews, and securing a role.',
      targets:[{id:'open',kind:'door',char:'开'},{id:'chief',kind:'deity',char:'值符'}],
      asker:['open'],
      good:'The Open Door is well seated and reaches you — approach directly and in person.',
      bad:'The Open Door sits void — the role is not real yet, or is already promised.' },
    { id:'marriage', cat:'relationships', name:'婚姻', nameEn:'Marriage and partnership',
      yong:'六合 Six Harmony + 乙 Yi (wife) + 庚 Geng (husband)',
      desc:'Commitment, harmony, and the health of a bond.',
      targets:[{id:'he',kind:'deity',char:'六合'},{id:'yi',kind:'stem',char:'乙'},{id:'geng',kind:'stem',char:'庚'}],
      asker:['he'],
      combos:[{chars:['乙','庚'],tone:'good',note:'Yi with Geng — the rightful pairing, with attraction and care between partners'},
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
      targets:[{id:'rui',kind:'star',char:'天芮',adverse:true}], asker:['rui'],
      good:'Tian Rui is weak in its palace or void — the condition lacks force and yields.',
      bad:'Tian Rui generates itself in a strong palace — the condition is entrenched; get it examined properly.' },
    { id:'cure', cat:'health', name:'求医', nameEn:'Finding treatment',
      yong:'天心 Tian Xin + 乙 Yi',
      desc:'The physician, the remedy, and the route to recovery.',
      targets:[{id:'xin',kind:'star',char:'天心'},{id:'yi',kind:'stem',char:'乙'}],
      asker:['xin'],
      good:'Tian Xin generates the asker — competent help is reachable in that direction.',
      bad:'Tian Xin void — help may be harder to find in this direction. Keep to your current treatment and ask your doctor, or get a second opinion.' },
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
      yong:'六合 Six Harmony (the item) + Hour Stem',
      desc:'Locating something missing, and whether it returns.',
      targets:[{id:'he',kind:'deity',char:'六合'},{id:'hour',kind:'stem_ref',ref:'hour'}],
      asker:['he'],
      good:'The signs for the item are good — look in the direction of Six Harmony; recovery is likely.',
      bad:'The signs for the item are poor — searching may take a long time and may not succeed.' },
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

  // Grappling Hook and Red Phoenix replace White Tiger and Black Tortoise on Yang plates (compendium p.613).
  var SLOT_ON_YANG = { '白虎': '勾陈', '玄武': '朱雀' };
  function findPalace(chart, kind, char) {
    for (var i = 0; i < OUTER.length; i++) {
      var p = chart.palacesByNumber[OUTER[i]];
      if (!p) continue;
      if (kind === 'door' && p.door && p.door.char === char) return p;
      if (kind === 'star' && p.star && p.star.char === char) return p;
      if (kind === 'deity' && p.deity && (p.deity.char === char || p.deity.char === SLOT_ON_YANG[char])) return p;
      // A person or matter is read from the heaven plate; the earth plate is where stems rest, not where they stand now.
      if (kind === 'stem' && ((p.heavenStem && p.heavenStem.char === char) || p.heavenStem2Cn === char)) return p;
    }
    return null;
  }

  // 甲 never shows on a plate: it hides under the 六儀 that leads its xun.
  function plateStem(q) { return C.STEMS[q.stem === 0 ? YI_ORDER_D[Math.floor(mod(q.i - (q.i % 10), 60) / 10)] : q.stem]; }

  function resolveTarget(chart, p, t) {
    if (t.kind === 'stem_ref') {
      var ch = plateStem(t.ref === 'hour' ? p.hour : p.day);
      return { pal: findPalace(chart, 'stem', ch), char: ch, kind: 'stem' };
    }
    if (t.kind === 'envoy') {
      var e = chart.envoy ? chart.envoy.charAt(0) : null;
      return { pal: e ? findPalace(chart, 'door', e) : null, char: chart.envoy, kind: 'door' };
    }
    var found = findPalace(chart, t.kind, t.char), shown = found && t.kind === 'deity' && found.deity.char !== t.char ? found.deity.char : null;
    return { pal: found, char: t.char + (shown ? ' (' + shown + ' on this Yang plate)' : ''), kind: t.kind };
  }

  // The asker is the Day Stem's palace — the seat of the person enquiring.
  function askerPalace(chart, p) {
    return findPalace(chart, 'stem', plateStem(p.day));
  }

  // A stem or deity is compared by its own element. Using the palace's would always read as "same".
  function elemOf(kind, pal, char) {
    if (!pal) return null;
    if (kind === 'deity') return pal.deity ? pal.deity.element : null;
    return ['wood', 'fire', 'earth', 'metal', 'water'][C.STEM_ELEM[C.STEMS.indexOf(char)]] || null;
  }

  /* What a door means for this question. By default 开休生 help and 伤死惊 hurt, with 景杜 neutral, but the book turns several around by topic
   * (p.297-298, the Fisherman's Song on p.307, and each door's Suitable and Unsuitable lists). [door value, note shown to the user]. */
  // The Scenery list repeats the Delusion list, and the Fear list the Death list, but Joey Yap's The Doors confirms both in its own words (p.102, p.130).
  var WEALTH_DOORS = { '杜门': [-2, 'The book lists the Delusion Door as unsuitable for anything to do with money.'], '景门': [-2, 'The book lists the Scenery Door as unsuitable for anything to do with money.'] };
  var TRAVEL_DOORS = { '杜门': [-2, 'The book lists the Delusion Door as unsuitable for travel.'], '景门': [-2, 'The book lists the Scenery Door as unsuitable for travel.'] };
  // The Harm Door only helps these matters alongside one of the Three Nobles (The Doors p.72), so [value, note, true] needs a Noble in the palace.
  var DOOR_TOPIC = {
    direct_wealth: WEALTH_DOORS, budget: WEALTH_DOORS,
    indirect_wealth: { '杜门': WEALTH_DOORS['杜门'], '景门': WEALTH_DOORS['景门'], '伤门': [2, 'The Harm Door is usually a poor sign, but with a Noble here it suits gambling and competing.', true] },
    finding_job: { '景门': [2, 'The Scenery Door suits job interviews.'] },
    exams: { '景门': [2, 'The Scenery Door suits exams and tests.'] },
    dispute: { '惊门': [2, 'The Fear Door is usually a poor sign, but it helps you win a lawsuit.'], '休门': [0, 'The Rest Door favours settling out of court over fighting a lawsuit.'], '开门': [2, 'Under the Open Door your side of a lawsuit is well grounded.'], '伤门': [2, 'The Harm Door is usually a poor sign, but with a Noble here it helps you start legal action.', true] },
    learning: { '杜门': [1, 'The Delusion Door favours quiet, solitary study and research.'] },
    cure: { '开门': [2, 'Under the Open Door the patient is expected to recover.'], '死门': [-2, 'The book lists the Death Door as unsuitable for seeking treatment.'], '惊门': [-2, 'The book lists the Fear Door as unsuitable for seeking treatment.'] },
    travel: TRAVEL_DOORS,
    restructure: { '死门': [1, 'The Death Door is the right symbol for closing things out.'] },
    // FM2 p.260-261: 开休生杜 keep the person hidden, while 伤景死惊 bring news. It overrides "will finally see the person" on the Compendium's Open Door page, as the dedicated book.
    lost_person: { '生门': [-2, 'A good door is a poor sign here: the person may be hidden or far away, and finding them takes twice the effort.'], '开门': [-2, 'A good door is a poor sign here: the person may be hidden or far away, and finding them takes twice the effort.'], '休门': [-2, 'A good door is a poor sign here: the person may be hidden or far away, and finding them takes twice the effort.'], '杜门': [-2, 'The Delusion Door points to someone being hidden from plain view.'],
                   '死门': [2, 'A hard door is a good sign here: news of the person should come soon.'], '惊门': [2, 'A hard door is a good sign here: news of the person should come soon.'], '伤门': [2, 'A hard door is a good sign here: news of the person should come soon.'], '景门': [2, 'The Scenery Door is a good sign here: news of the person should come soon.'] },
    // FM2 p.235-236: the same turn-around for a lost item.
    lost_object: { '生门': [-2, 'A good door is a poor sign here: the chance of finding the item is slim.'], '开门': [-2, 'A good door is a poor sign here: the chance of finding the item is slim.'], '休门': [-2, 'A good door is a poor sign here: the chance of finding the item is slim.'], '杜门': [-2, 'The Delusion Door keeps the item hidden, so the chance of finding it is slim.'],
                   '死门': [2, 'A hard door is a good sign here: there is a high chance of finding the item.'], '惊门': [2, 'A hard door is a good sign here: there is a high chance of finding the item.'], '伤门': [2, 'A hard door is a good sign here: there is a high chance of finding the item.'], '景门': [2, 'The Scenery Door is a good sign here: there is a high chance of finding the item.'] },
    // The marriage rules in QPSystems.forecastRules read these doors with Six Harmony, so they are not counted twice.
    marriage: { '开门': [0], '伤门': [0], '杜门': [0], '死门': [0] }
  };
  function doorValue(scId, pal) {
    var o = (DOOR_TOPIC[scId] || {})[pal.gate];
    if (o && o[2] && ['乙', '丙', '丁'].indexOf(pal.heavenStemCn) < 0) o = null;
    var gv = o ? o[0] : pal.gateRank === 2 ? 2 : pal.gateRank === 1 ? 0 : -2;
    return { v: doorForce(gv, pal.gateStrength, pal.gatePalace && pal.gatePalace.key), note: o ? o[1] : null };
  }
  // The deities the book reads against a Useful God: Snake p.628, Black Tortoise p.658, Nine Heaven p.671.
  function usefulDeity(sc, pal) {
    var d = pal.deity && pal.deity.char;
    if (sc.id === 'launch' || !d || sc.targets.some(function (t) { return t.char === d; })) return null;
    if (d === '腾蛇') return { tone: 'danger', score: -1.5, label: 'The Surging Snake 腾蛇 on the Useful God', text: sc.cat === 'health'
      ? 'This points to worry and fear feeding the condition, or to something that has dragged on for a long time.' : 'This points to sudden change for the worse, or to something false.' };
    if (d === '玄武') return pal.gateRank === 2 && GOOD_STARS[pal.starCn] > 0
      ? { tone: 'good', score: 0.5, label: 'The Black Tortoise 玄武 on the Useful God', text: 'A good star and door turn this around. The matter can be solved by being adaptable and tactful.' }
      : { tone: 'danger', score: -1.5, label: 'The Black Tortoise 玄武 on the Useful God', text: 'This is generally a poor sign, and points to secrecy or something not being genuine.' };
    if (d === '九天' && (sc.cat === 'initiatives' || sc.cat === 'travel' || sc.cat === 'career')) return { tone: 'good', score: 1, label: 'Nine Heaven 九天 on the Useful God', text: 'This favours active starts and carrying out big plans.' };
    return null;
  }
  // Structures Forecast already reads on its own: the door's state, the Nobles' graves, the door plates, and the warn-only 五不遇时.
  var READ_ELSEWHERE = ['men_po', 'gong_po', 'men_sheng_gong', 'san_qi_ru_mu', 'men_fan_yin', 'fu_yin_men', 'wu_bu_yu'];
  // The book's panel each question draws on, in QPSystems.forecastRules. Finding treatment leaves out the illness rules: it reads the doctor and the door, not how serious the illness is.
  var SC_TOPIC = { marriage: 'marriage', promotion: 'promotion', finding_job: 'job', direct_wealth: 'wealth', indirect_wealth: 'wealth', budget: ['wealth', 'loan'], partnership: 'partnership', negotiate: 'deal', launch: 'launch',
                   diagnose: 'health', cure: 'cure', travel: 'travel', exams: 'exams', learning: 'learning', dispute: 'dispute', lost_object: 'lost_object' };


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
      note: 'Doors describe action and human affairs, so this suits questions about what to do. The books do not name this as a method: it is this app\'s own lens.'
    },
    {
      id: 'star', name: '九星法', label: 'By Stars',
      blurb: 'Reads the nine stars: their strength in the palace they occupy and their relation ' +
             'to your seat. Stars describe conditions and disposition rather than action.',
      note: 'Suits questions about how a situation stands rather than what to do about it. The books do not name this as a method: it is this app\'s own lens.'
    },
    {
      id: 'deity', name: '八神法', label: 'By Deities',
      blurb: 'Reads the eight deities: the quality of intent surrounding the matter — sanction, ' +
             'concealment, harmony, deception, force.',
      note: 'Suits questions about other people\'s motives and the character of a situation. The books do not name this as a method: it is this app\'s own lens.'
    },
    {
      id: 'nianming', name: '年命法', label: 'By the Asker\'s Birth Year',
      blurb: 'Locates the asker by the stem of their birth year (年命) on the heaven plate rather ' +
             'than by the Day Stem, then reads that palace and its relation to the matter.',
      note: 'Used when the asker is not the person casting, or to cross-check the Day Stem reading.'
    },
    {
      id: 'zhifu', name: '值符值使法', label: 'Chief and Envoy',
      blurb: 'Reads the chief star (值符) as the governing authority over the whole hour and the ' +
             'envoy gate (值使) as the channel through which it acts.',
      note: 'A whole-chart frame rather than a targeted one. Good for strategic questions. The books do not name this as a method: it is this app\'s own lens.'
    }
  ];


  /* The books read the Day Stem, the Hour Stem, the Useful God and the Life Stem. They do not name Door, Star, Deity or Chief methods, so those are QiPath's own lenses.
     Each symbol below has a source: the door and deity pages, each star's Suitable list and FM1 p.75. Nine Earth for wealth is Warcraft PDF p.150, Six Harmony for lost things FM2 p.235.
     Each method needs its own symbol for the matter. A scenario carries only the symbols its
     own frame uses, so when a method asks for a star or a deity and the scenario has none,
     it is taken from the question's category instead. Without this the star and deity methods
     silently fall back to the door and produce an identical reading, which is worse than
     offering no method at all. */
  // These must match the characters the chart engine emits, which are simplified.
  var CAT_DOOR  = { wealth:'生', career:'开', relationships:'休', health:'生',
                    travel:'开', education:'景', litigation:'惊', initiatives:'开', lost:'杜' };
  var CAT_STAR  = { wealth:'天任', career:'天心', relationships:'天辅', health:'天芮',
                    travel:'天心', education:'天辅', litigation:'天柱', initiatives:'天辅',
                    lost:'天蓬' };
  var CAT_DEITY = { wealth:'九地', career:'值符', relationships:'六合', health:'白虎',
                    travel:'九天', education:'太阴', litigation:'白虎', initiatives:'九天',
                    lost:'六合' };

  function symbolFor(kind, sc) {
    var fromTargets = (sc.targets.filter(function (t) { return t.kind === kind; })[0] || {}).char;
    if (fromTargets) return fromTargets;
    var m = kind === 'door' ? CAT_DOOR : kind === 'star' ? CAT_STAR : CAT_DEITY;
    return m[sc.cat] || null;
  }

  // The Life Stem 年命 is the birth-year stem on the plate: the book uses "Life Stem" and "Year Stem" for the same reading (p.332, p.350).
  function nianMingPalace(chart, birthYear) { return findPalace(chart, 'stem', plateStem(birthYear)); }

  /**
   * Resolve the two poles of the reading — who is asking, and what is being asked about —
   * according to the chosen method.
   */
  function resolvePoles(method, chart, p, sc, user) {
    var self = null, matter = null, selfLabel = '', matterLabel = '';

    if (method === 'nianming' && user && user.pillars) {
      self = nianMingPalace(chart, user.pillars.year);
      selfLabel = '年命 ' + C.STEMS[user.pillars.year.stem] + (user.pillars.year.stem === 0 ? ' (hidden under ' + plateStem(user.pillars.year) + ')' : '');
    } else {
      self = findPalace(chart, 'stem', plateStem(p.day));
      selfLabel = 'Day Stem ' + C.STEMS[p.day.stem] + (p.day.stem === 0 ? ' (hidden under ' + plateStem(p.day) + ')' : '');
    }

    if (method === 'stems') {
      matter = findPalace(chart, 'stem', plateStem(p.hour));
      matterLabel = 'Hour Stem ' + C.STEMS[p.hour.stem] + (p.hour.stem === 0 ? ' (hidden under ' + plateStem(p.hour) + ')' : '');
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

    var resolved = {}, doorRead = {};
    sc.targets.forEach(function (t) {
      var r = resolveTarget(chart, p, t);
      resolved[t.id] = r;
      r.adverse = !!t.adverse;
      if (!r.pal) {
        findings.push({ tone:'neutral', label: r.char + ' seat',
          text: r.char + ' does not appear on the outer plate this hour — it is held in the centre and cannot be read directly.' });
        return;
      }
      var pal = r.pal;
      var isMain = (sc.asker || [])[0] === t.id, sign = t.adverse ? -1 : 1, seatScore, seatNote;
      if (r.kind === 'door') {
        var own = doorValue(sc.id, pal);
        seatScore = own.v;
        seatNote = 'Door strength: ' + (pal.gateStrength ? pal.gateStrength.cn + ' ' + pal.gateStrength.en : '—') + (pal.gatePalace ? ', ' + pal.gatePalace.cn + ' ' + pal.gatePalace.en : '') + '.' + (own.note ? ' ' + own.note : '');
        doorRead[pal.num] = 1;
      } else if (r.kind === 'star') {
        var rank = pal.starStrength ? pal.starStrength.rank : 3;
        seatScore = sign * (rank >= 4 ? 2 : rank <= 2 ? -2 : 0);
        seatNote = 'Star strength in this season: ' + (pal.starStrength ? pal.starStrength.cn + ' ' + pal.starStrength.en : '—') + '.';
      } else {
        var relation = rel(elemOf(r.kind, pal, t.kind === 'stem_ref' ? r.char : t.char), pal.element);
        seatScore = relation === 'produced_by' || relation === 'same' ? 2 : relation === 'controlled_by' ? -2 : 0;
        seatNote = 'Palace relation: ' + REL_LABEL[relation] + '.';
      }
      var bits = [];
      if (pal.star) bits.push('star ' + pal.star.char);
      if (pal.door) bits.push('door ' + pal.door.char + '门');
      if (pal.deity) bits.push('deity ' + pal.deity.char);
      findings.push({ tone: seatScore > 0 ? 'good' : seatScore < 0 ? 'danger' : 'neutral',
        label: r.char + ' seated in palace ' + pal.num + ' ' + pal.name + ' (' + pal.dir + ')',
        text: bits.join(', ') + '. ' + seatNote + (pal.isEmpty ? ' This palace is void (空亡).' : '') });
      score += seatScore;
      if (pal.isEmpty) {
        score += t.adverse ? 2 : -3;
        findings.push(t.adverse
          ? { tone:'good', label: r.char + ' falls void (空亡)', text: 'A void seat means this problem lacks force right now.' }
          : { tone:'danger', label: r.char + ' falls void (空亡)', text: 'A void seat means the matter lacks substance right now — commitments made here tend not to hold.' });
      }
      // The compendium gives the doors special priority (p.161), so the door on a symbol counts in full on the main one and by half on the others.
      if (pal.gate && !doorRead[pal.num]) {
        doorRead[pal.num] = 1;
        var dv = doorValue(sc.id, pal), weight = dv.v * (isMain ? 1 : 0.5);
        if (Math.abs(weight) >= 0.5 || dv.note) {
          score += weight;
          findings.push({ tone: weight > 0 ? 'good' : weight < 0 ? 'danger' : 'neutral', label: pal.gate + ' with ' + r.char,
            text: dv.note || (weight > 0 ? 'A good door here helps this.' : 'A bad door here works against this.') });
        }
      }
      var ud = isMain ? usefulDeity(sc, pal) : null;
      if (ud) { score += ud.score; findings.push(ud); }
    });

    // Relation of the primary useful god toward the asker
    (sc.asker || []).forEach(function (id) {
      var r = resolved[id];
      if (!r || !r.pal || !asker) return;
      var relation = rel(r.pal.element, asker.element);
      var tone = (relation === 'produces' || relation === 'same') ? (r.adverse ? 'neutral' : 'good')
               : relation === 'controls' ? 'danger' : 'neutral';
      findings.push({ tone: tone, label: r.char + ' toward you (' + C.STEMS[p.day.stem] + ')',
        text: REL_LABEL[relation] + '. ' + (
          r.adverse && (relation === 'produces' || relation === 'same') ? 'This has easy access to you, so it will not clear by itself.' :
          r.adverse && relation === 'controlled_by' ? 'You have the upper hand over this.' :
          r.adverse && relation === 'produced_by' ? 'This is drawing on your energy.' :
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

    var seats = [asker], yearSeat = user && user.pillars ? nianMingPalace(chart, user.pillars.year) : null;
    if (yearSeat && yearSeat !== asker) seats.push(yearSeat);

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

    // The Envoy shows how well actions land (Warcraft PDF p.67), so the Chief and Envoy frame reads it against the asker too.
    if (method.id === 'zhifu' && asker && chart.envoy) {
      var envPal = findPalace(chart, 'door', chart.envoy.charAt(0));
      if (envPal) {
        var envRel = rel(envPal.element, asker.element), envTone = envRel === 'produces' || envRel === 'same' ? 'good' : envRel === 'controls' ? 'danger' : 'neutral';
        findings.push({ tone: envTone, label: '值使 Envoy ' + chart.envoy + ' toward you', text: REL_LABEL[envRel] + '. ' + (envTone === 'good' ? 'Your actions should land well.' : envTone === 'danger' ? 'Your actions may not land as intended.' : 'This is neither a help nor a hindrance.') });
        score += envTone === 'good' ? 1 : envTone === 'danger' ? -1 : 0;
      }
    }

    // The chosen method contributes its own finding before the shared checks.
    var mr = methodReading(method.id, poles, chart);
    findings.unshift({ tone: mr.tone, label: method.name + ' — ' + mr.label, text: mr.text });
    if (mr.tone === 'good') score += 3;
    if (mr.tone === 'danger') score -= 3;

    // A Noble this reading depends on (a symbol, the asker or the matter) in its grave. Each Noble counts once.
    var graved = {}, checkGrave = function (stem, pal, role) {
      var g = pal && !graved[stem] ? S.nobleGrave(stem, pal.num) : null;
      if (!g) return;
      graved[stem] = 1; score -= 1;
      findings.push({ tone: 'danger', label: g.label, text: role + ' ' + g.text });
    };
    Object.keys(resolved).forEach(function (id) { var x = resolved[id]; if (x.kind === 'stem') checkGrave(x.char, x.pal, 'This is a symbol for your question.'); });
    checkGrave(plateStem(p.day), asker, 'This is your own seat.');
    checkGrave(plateStem(p.hour), findPalace(chart, 'stem', plateStem(p.hour)), 'This is the matter you asked about.');

    var dh = S.disharmony(p.day.stem, p.hour.stem);
    if (dh) findings.unshift({ tone: 'danger', label: dh.label, text: dh.text });
    var forms = S.formations(p, dt.m);
    // The books' panels for this kind of question, capped at ±4 so one topic's rules cannot decide the reading alone.
    var bookNet = 0;
    [].concat(SC_TOPIC[sc.id] || []).forEach(function (tp) {
      S.forecastRules(chart, tp, seats.filter(Boolean), p.hour.branch, { forms: forms, yearStem: plateStem(p.year), hourStem: plateStem(p.hour), envoy: chart.envoy && chart.envoy.length === 1 ? chart.envoy + '门' : chart.envoy })
        .forEach(function (f) { bookNet += f.score; findings.push({ tone: f.tone, label: f.label, text: f.text }); });
    });
    score += Math.max(-4, Math.min(4, bookNet));
    var ausp = forms.filter(function (f) { return f.category === 'auspicious'; });
    var host = forms.filter(function (f) { return f.category === 'hostile'; });
    // Every plate has about 8 good and 10 bad structures somewhere, so a whole-plate count cancels out. Only the palaces this reading stands on count.
    var keyPal = { 0: 1 };
    seats.concat(poles.matter ? [poles.matter] : []).forEach(function (x) { if (x) keyPal[x.num] = 1; });
    Object.keys(resolved).forEach(function (id) { if (resolved[id].pal) keyPal[resolved[id].pal.num] = 1; });
    var keyed = forms.filter(function (f) { return READ_ELSEWHERE.indexOf(f.id) < 0 && (f.palaces || []).some(function (n) { return keyPal[n]; }); });
    var keyGood = keyed.filter(function (f) { return f.category === 'auspicious'; }), keyBad = keyed.filter(function (f) { return f.category === 'hostile'; });
    var keyNet = keyGood.length - keyBad.length, formName = function (f) { return f.name + ' ' + f.nameEn; };
    score += Math.max(-3, Math.min(3, keyNet * 0.25));
    if (keyGood.length || keyBad.length) findings.push({ tone: keyNet > 0 ? 'good' : keyNet < 0 ? 'danger' : 'neutral', label: 'Structures on the palaces in this reading',
      text: (keyGood.length ? 'Helping: ' + keyGood.slice(0, 4).map(formName).join(', ') + '. ' : '') + (keyBad.length ? 'Against: ' + keyBad.slice(0, 4).map(formName).join(', ') + '.' : '') });
    // Doors Fu Yin and Fan Yin hold across the whole plate (p.303-304), so they are read once here.
    var doorFanYin = forms.some(function (f) { return f.id === 'men_fan_yin'; });
    if (doorFanYin) { score -= 2;
      findings.push({ tone: 'danger', label: 'The doors are in Fan Yin 门反吟', text: 'Every door stands opposite its home palace. The book reads this as inauspicious and unusable, even when a Noble is present, so this reading is Unfavourable whatever else is on the plate.' }); }
    if (forms.some(function (f) { return f.id === 'fu_yin_men'; })) { score -= 1.5;
      findings.push({ tone: 'danger', label: 'The doors are in Fu Yin 门伏吟', text: 'Every door sits in its home palace, so things are stagnant and hard to move.' }); }

    var primary = resolved[(sc.asker || [])[0]];
    var direction = primary && primary.pal ? primary.pal.dir : (chart.best[0] ? chart.best[0].dir : '—');

    // "Unusable even though there are Noble configurations" (p.304): good signs elsewhere cannot lift this plate. It runs last so nothing adds to it afterwards.
    if (doorFanYin) score = Math.min(score, -4);

    var verdict = score >= 5 ? 'Favourable' : score >= 1 ? 'Workable' :
                  score >= -3 ? 'Guarded' : 'Unfavourable';
    var advice = score >= 5 ? sc.good
               : score >= 1 ? 'Mixed but usable. ' + sc.good + ' Watch the cautions below.'
               : score >= -3 ? 'The chart does not support pushing. ' + sc.bad
               : sc.bad;

    // The scenario's bad text names a cause this reading may not have, so this gives the real one. Health readings never tell anyone to wait.
    if (doorFanYin) advice = sc.cat === 'health'
      ? 'The doors are in Fan Yin, so this hour reads as unfavourable. That is about the hour only and says nothing about your health.'
      : 'The doors are in Fan Yin, so the book treats this hour as unusable, whatever else is on the plate. Use another hour.';

    return {
      question: question || '', scenario: sc, pillars: p, chart: chart,
      method: method, poles: poles, methodReading: mr,
      asker: asker, resolved: resolved, findings: findings,
      score: Math.round(score), verdict: verdict, advice: advice, disharmony: dh, care: sc.cat === 'health' ? S.HEALTH_CARE : null,
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

  // One item per line, as the person wrote it. Closing punctuation is dropped so a sentence can carry it.
  function manifestLines(s) {
    return String(s || '').split(/\r?\n/).map(function (x) { return x.trim().replace(/[.;,:。；，：]+$/, '').trim(); })
      .filter(Boolean).slice(0, 8);
  }
  var HEALTH_ASK = /\b(health|healing|heal|healed|ill|illness|sick|sickness|cancer|tumou?r|cure|cured|surgery|operation|disease|recovery|recover|treatment|pain|doctor|medical|medicine|diagnosis|pregnan\w*|fertility)\b/i;

  var GOAL_PHRASE = { intuition: 'clear intuition', courage: 'courage', power: 'power and leadership', wealth: 'wealth', income: 'growing income',
    sell: 'a good sale', collect: 'collecting what is owed to me', release: 'release from what is finished', protection: 'protection',
    recognition: 'recognition', knowledge: 'knowledge', relationships: 'good relationships', health: 'good health', truce: 'a truce',
    truth: 'the truth to surface', lostObject: 'finding what I have lost', lostPerson: 'finding the person I am looking for',
    noble: 'help from noble people', opportunity: 'opportunity', agreement: 'a fair agreement' };
  function stageStep(stage, phrase) {
    if (stage.key === 'prime') return { t: 'Rehearse the success', d: 'Close your eyes and run through the moment when ' + phrase +
      ' has already come about: where you are, who is with you, what you see and say. Go through it several times until it feels familiar rather than hoped for. When a doubt comes up, name it and let it pass.' };
    if (stage.key === 'attune') return { t: 'Settle and notice', d: 'Breathe slowly until your body is calm. Then go over the openings already around you for ' + phrase +
      ': people, offers, small signs. Choose the one you will follow up.' };
    return { t: 'Take the step', d: 'Inside the window, do one concrete thing toward ' + phrase +
      ': send the message, make the call, make the offer, ask, or begin. The script prepares the step; the step is the activation.' };
  }

  function manifestPlan(dt, palaceNum, formation, askDoor, details) {
    var own = { aspects: manifestLines(details && details.aspects), returns: manifestLines(details && details.returns) };
    var goal = details && details.goal ? goalOf(details.goal) : null, stage = details && details.stage ? stageOf(details.stage) : null;
    var phrase = goal ? GOAL_PHRASE[goal.key] || goal.label.toLowerCase() : '';
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
      { t:'Find the direction', d:'Find ' + pal.dir + ', the seat of palace ' + pal.num + ' ' + pal.name +
        ' this hour. Use a compass rather than a guess. Sit with your back to that direction, so that its ' +
        'energy supports you from behind and projects forward into what you are engaging with.' },
      { t:'Name the matter plainly', d:'Say once, in ordinary words, what the matter actually is — ' +
        'not the outcome you want, the situation as it stands. Naming it honestly is what keeps the ' +
        'practice from drifting into wishing.' }
    ].concat(goal && stage ? [stageStep(stage, phrase)] : []).concat([
      { t:'Enter the window', d:'Begin inside ' + p.hourRange + ', ideally in its middle rather than ' +
        'at the edges. The ' + p.hour.cn + ' hour holds ' + (star || 'this configuration') +
        ' over the ' + doorCh + '门 door; that pairing is the thing you are working with.' },
      { t:'Speak the script', d:'Read the script below aloud, slowly, once. Then read it a second ' +
        'time quietly. Speaking aloud matters — it commits the intention to something outside your head.' },
      { t:'Sit in the ask', d:'Stay seated with ' + pal.dir + ' at your back for a few minutes without asking for anything ' +
        'more. Let the request be finished. Adding to it in this period tends to dilute it.' },
      { t:'Seal and close', d:'Say the closing line, bow once where you sit, and stand. ' +
        'Do not repeat the practice in the same window. Write down the date, hour and what you asked ' +
        'for, and leave it alone.' },
      { t:'Return the favour', d:'Complete the exchange within three days using the reciprocity below. ' +
        'This is the part most people skip, and it is the part that makes the practice a relationship ' +
        'rather than a transaction.' + (own.returns.length ? ' Keep what you named in your own words as well, in the way and time you promised.' : '') }
    ]);

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
      'I sit with my back to ' + pal.dir + ', the ' + pal.name + ' palace, in the ' + p.hour.cn + ' hour of the ' +
      p.day.cn + ' day.\n' +
      (goal && stage ? 'This is my ' + stage.label.toLowerCase() + ' for ' + phrase + '.\n' : '') +
      (major.length ? 'This hour holds ' + major.map(function (f) { return f.name + ', ' + f.nameEn; }).join('; and ') +
        ' — and I come to work with ' + (major.length > 1 ? 'them' : 'it') + '.\n' : '') +
      (heaven ? 'Heaven stem ' + heaven + (hsRole && hsRole.good ? ', the ' + hsRole.role.split(' ')[0] + ' ' + hsRole.role.split(' ')[1] + ',' : '') +
        ' stands over earth stem ' + earth + '. ' : '') +
      (star ? 'The star ' + star + ' turns here, and the ' + doorCh + '门 door stands open to me. ' : '') +
      'The deity ' + deity + ' keeps this gate, and I come asking for ' + quality + '.\n\n' +
      'I have come to ask that you ' + intent.verb + ' what is in front of me.\n' +
      'Here is what I am asking for, said plainly: I ask for ' + intent.ask + '.\n' +
      own.aspects.map(function (a) { return 'I name it exactly: ' + a + '.\n'; }).join('') +
      'I ask for it in a form I would be willing to explain to anyone.\n' +
      'I do not ask for it at the cost of another person, and I do not ask to be given what I have ' +
      'not prepared for.\n\n' +
      'I bring what I already have. I bring the work I have done and the work I will do. ' +
      'I bring my attention, which is the one thing I can give completely.\n' +
      'If this is right and its time has come, let it move — clearly, and soon enough that I can act on it.\n' +
      'If it is not right, let it fall away cleanly, and let me see why without bitterness.\n\n' +
      'And because nothing is taken without being repaid, I name what I will give in return:\n' +
      own.returns.map(function (r) { return 'I commit to this: ' + r + '.\n'; }).join('') +
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
       : 'The palace is not void, so a request for something to arrive and remain is appropriate.'),
      (HEALTH_ASK.test(own.aspects.join(' ')) || (goal && goal.key === 'health') ? S.HEALTH_CARE.text : '')
    ].filter(Boolean);

    return {
      window: window_, palace: pal, formation: formation || null, disharmony: S.disharmony(p.day.stem, p.hour.stem),
      goal: goal ? { key: goal.key, label: goal.label, cn: goal.cn, phrase: phrase } : null,
      stage: stage ? { key: stage.key, label: stage.label, cn: stage.cn } : null,
      intent: intent, deity: deity, quality: quality,
      askDoor: doorCh, seatDoor: seatDoor, borrowed: borrowed,
      manifestFor: manifestFor, steps: steps, script: script, activations: activations, formations: palForms,
      aspects: own.aspects, returns: own.returns,
      exchange: { element: ret.name, acts: ret.acts, own: own.returns,
        note: 'Match the return to the element of the palace you drew from. Give it away from the ' +
              'matter you asked about — reciprocity that quietly benefits your own request is not ' +
              'an exchange. Do it within three days, and do it without an audience.' },
      tone: intent.tone
    };
  }


  /* ---------------- manifestation goals, stages and the window search ----------------
   * Three stages from the Thrive 2027 sessions: prime (win it in the mind first), attune (align in a calm state with what the
   * hour already holds) and activate (the physical step). Joey times them by Seven Stars levels, whose rule is not known, so
   * QiPath ranks hours by the classical meaning of the symbols that serve each goal instead. Each goal lists the doors, stars,
   * deities and heaven stems that serve it (primary doors weigh most), and anything that works against it.
   */
  var MANIFEST_STAGES = [
    { key: 'prime', label: 'Priming', cn: '预备', what: 'Rehearse the success in your mind until it feels familiar, and clear the self-doubt before you act.',
      w: { door: 0.8, star: 1.3, deity: 1.5, stem: 1, quality: 0.8, voidPen: 1 } },
    { key: 'attune', label: 'Attunement', cn: '调频', what: 'Settle into a calm state and align with the opportunities this hour already holds.',
      w: { door: 1, star: 1, deity: 1.2, stem: 1, quality: 1, voidPen: 1.2 } },
    { key: 'activate', label: 'Activation', cn: '启动', what: 'Take the physical step inside the window: the call, the offer, the first move.',
      w: { door: 1.6, star: 1, deity: 1, stem: 1, quality: 1.3, voidPen: 1.6 } }
  ];
  var MANIFEST_GOALS = [
    { key: 'intuition', label: 'Intuition', cn: '直觉', door: ['休', '杜'], door2: ['景'], star: ['天心', '天辅', '天英'], deity: ['太阴', '九地', '腾蛇'], stem: ['丁', '乙'], ask: '休' },
    { key: 'courage', label: 'Courage', cn: '勇气', door: ['伤', '开'], door2: ['生'], star: ['天冲', '天英', '天柱'], deity: ['白虎', '九天', '值符'], stem: ['丙', '庚'], ask: '伤' },
    { key: 'power', label: 'Power and leadership', cn: '权威', door: ['开'], door2: ['景', '生'], star: ['天心', '天英', '天禽'], deity: ['值符', '九天'], stem: ['戊', '丙'], ask: '开' },
    { key: 'wealth', label: 'Wealth', cn: '财富', door: ['生'], door2: ['开', '休'], star: ['天任', '天辅', '天心'], deity: ['六合', '值符', '太阴'], stem: ['戊', '乙'], ask: '生' },
    { key: 'income', label: 'Income growth', cn: '增收', door: ['生'], door2: ['开'], star: ['天任', '天辅'], deity: ['六合', '九天'], stem: ['戊', '乙', '丙'], ask: '生' },
    { key: 'sell', label: 'Sell', cn: '销售', door: ['生', '开'], door2: ['景'], star: ['天辅', '天任', '天冲'], deity: ['六合', '朱雀', '值符'], stem: ['戊', '丙'], ask: '开' },
    { key: 'collect', label: 'Collection of what is owed', cn: '收账', door: ['伤', '开'], door2: ['惊'], star: ['天冲', '天柱'], deity: ['白虎', '值符', '九天'], stem: ['庚', '戊'], ask: '伤' },
    { key: 'release', label: 'Release from what is finished', cn: '放下', door: ['死'], door2: ['休', '杜'], star: ['天柱', '天芮'], deity: ['九地', '太阴', '白虎'], stem: ['癸', '辛'], ask: '死', voidOk: true },
    { key: 'protection', label: 'Protection', cn: '护身', door: ['杜', '休'], door2: ['生'], star: ['天辅', '天任', '天心'], deity: ['太阴', '九地', '值符'], stem: ['乙', '丙', '丁'], ask: '杜' },
    { key: 'recognition', label: 'Recognition', cn: '名声', door: ['景'], door2: ['开'], star: ['天英', '天辅'], deity: ['九天', '值符'], stem: ['丙', '丁'], ask: '景' },
    { key: 'knowledge', label: 'Knowledge', cn: '学识', door: ['景', '休'], door2: ['开', '杜'], star: ['天辅', '天心'], deity: ['太阴', '值符'], stem: ['丁', '乙'], ask: '景' },
    { key: 'relationships', label: 'Relationships', cn: '感情', door: ['休', '生'], door2: ['开', '景'], star: ['天辅', '天任', '天心'], deity: ['六合', '太阴'], stem: ['乙', '丁'], ask: '休' },
    { key: 'health', label: 'Health', cn: '健康', door: ['生'], door2: ['休', '开'], star: ['天心', '天任'], deity: ['值符', '太阴', '六合'], stem: ['乙', '丙'], ask: '生', avoid: { door: ['死'], star: ['天芮'] } },
    { key: 'truce', label: 'Truce', cn: '和解', door: ['休'], door2: ['生', '杜'], star: ['天辅', '天心', '天任'], deity: ['六合', '太阴'], stem: ['乙', '己'], ask: '休', avoid: { deity: ['白虎'] } },
    { key: 'truth', label: 'Surface of the truth', cn: '真相', door: ['惊', '景'], door2: ['开'], star: ['天英', '天心'], deity: ['朱雀', '九天', '值符'], stem: ['丙', '丁'], ask: '惊' },
    { key: 'lostObject', label: 'Find a lost object', cn: '寻物', door: ['景', '杜'], door2: ['休', '开'], star: ['天蓬', '天英'], deity: ['玄武', '九地', '太阴'], stem: ['丁', '癸'], ask: '景' },
    { key: 'lostPerson', label: 'Find a lost person', cn: '寻人', door: ['休', '开'], door2: ['景', '生'], star: ['天蓬', '天心'], deity: ['六合', '玄武', '九天'], stem: ['乙', '丁'], ask: '开' },
    { key: 'noble', label: 'Noble help', cn: '贵人', door: ['开', '生'], door2: ['休', '景'], star: ['天心', '天辅', '天任'], deity: ['值符', '九天', '太阴'], stem: ['乙', '丙', '丁'], ask: '开' },
    { key: 'opportunity', label: 'Opportunity', cn: '机会', door: ['开', '生'], door2: ['景'], star: ['天冲', '天辅', '天英'], deity: ['九天', '值符', '六合'], stem: ['丙', '戊'], ask: '开' },
    { key: 'agreement', label: 'Agreements and contracts', cn: '契约', door: ['开', '生'], door2: ['景', '休'], star: ['天辅', '天任'], deity: ['六合', '朱雀'], stem: ['乙', '庚'], ask: '开' }
  ];
  var CALM_DEITY = { '太阴': 1, '九地': 1, '值符': 1, '六合': 1 };
  var OPPOSITE_DIR = { North: 'South', South: 'North', East: 'West', West: 'East', Northeast: 'Southwest', Southwest: 'Northeast', Southeast: 'Northwest', Northwest: 'Southeast' };
  function goalOf(k) { return MANIFEST_GOALS.filter(function (g) { return g.key === k; })[0] || MANIFEST_GOALS[0]; }
  function stageOf(k) { return MANIFEST_STAGES.filter(function (s) { return s.key === k; })[0] || MANIFEST_STAGES[0]; }

  // How well one palace of one hour serves a goal at a stage. Returns a 0-100 fit and the reasons, goal matches first.
  function manifestScore(chart, forms, n, goal, stage, fav) {
    var pa = chart.palacesByNumber[n], w = stage.w, s = 0, why = [], warn = [];
    if (!pa || n === 5) return null;
    var door = (pa.gate || '').charAt(0), stems = [pa.heavenStemCn, pa.heavenStem2Cn].filter(Boolean), av = goal.avoid || {};
    if (goal.door.indexOf(door) >= 0) { s += 3 * w.door; why.push(pa.gate + ' suits ' + goal.label.toLowerCase()); }
    else if (goal.door2.indexOf(door) >= 0) { s += 1.5 * w.door; why.push(pa.gate + ' supports it'); }
    if ((av.door || []).indexOf(door) >= 0) { s -= 3 * w.door; warn.push(pa.gate + ' works against it'); }
    if (goal.star.indexOf(pa.starCn) >= 0 || goal.star.indexOf(pa.star2Cn) >= 0) { s += 1.5 * w.star; why.push(pa.starCn + ' star'); }
    if ((av.star || []).indexOf(pa.starCn) >= 0) { s -= 2 * w.star; warn.push(pa.starCn + ' works against it'); }
    if (goal.deity.indexOf(pa.spirit) >= 0) { s += 1.5 * w.deity; why.push(pa.spirit + ' deity'); }
    if ((av.deity || []).indexOf(pa.spirit) >= 0) { s -= 2 * w.deity; warn.push(pa.spirit + ' works against it'); }
    var st = stems.filter(function (x) { return goal.stem.indexOf(x) >= 0; });
    if (st.length) { s += 1 * w.stem; why.push('heaven stem ' + st.join('')); }
    var q = palaceQuality(chart, forms, n, fav);
    s += q.score * 0.5 * w.quality;
    if (pa.isEmpty) {
      if (goal.voidOk) { s += 3; why.push('void palace, which helps a release'); }
      else { s -= 1.5 * w.voidPen; warn.push('void palace (空亡): what arrives may not stay'); }
    }
    if (stage.key === 'prime' && CALM_DEITY[pa.spirit]) { s += 0.5; why.push('a calm deity for rehearsal'); }
    if (stage.key === 'attune') {
      var rel = pa.gatePalace && pa.gatePalace.key;
      if (rel === 'harmony' || rel === 'justice' || rel === 'same') { s += 1; why.push('door in harmony with its palace'); }
      if (pa.isChief) { s += 0.5; why.push('Chief star here'); }
      if (pa.isEnvoy) { s += 0.5; why.push('Envoy door here'); }
    }
    if (stage.key === 'activate') {
      var r = pa.gateStrength ? pa.gateStrength.rank : 3;
      if (r >= 4) { s += 1; why.push('door in season (' + pa.gateStrength.cn + ')'); }
      else if (r <= 1) { s -= 1; warn.push('door out of season (' + pa.gateStrength.cn + ')'); }
      if (pa.gatePalace && pa.gatePalace.key === 'door_compels') { s -= 1; warn.push('门迫: the door is held back'); }
      if (pa.spirit === '九天' || pa.spirit === '值符') { s += 0.5; why.push('a deity of reach and authority for action'); }
    }
    var good = (forms || []).filter(function (f) { return f.category === 'auspicious' && (f.palaces || []).indexOf(n) >= 0; });
    var bad = (forms || []).filter(function (f) { return f.category === 'hostile' && (f.palaces || []).indexOf(n) >= 0; });
    if (good.length) why.push(good.slice(0, 2).map(function (f) { return f.name; }).join('、') + (good.length > 2 ? ' and ' + (good.length - 2) + ' more' : ''));
    if (bad.length) warn.push(bad.slice(0, 2).map(function (f) { return f.name; }).join('、') + (bad.length > 2 ? ' and ' + (bad.length - 2) + ' more' : ''));
    // Calibrated on 7,680 palace-hours: the median palace scores about 2.2 (fit 50), the top tenth starts near 6.3 (fit 75),
    // and the best hour of a 60-day search is usually 9 to 15 (fit 83 to 98).
    var fit = Math.max(0, Math.min(100, Math.round(s <= 6.3 ? 50 + (s - 2.2) * 6 : 74.6 + (s - 6.3) * 2.6)));
    return { num: n, palace: pa, score: Math.round(s * 10) / 10, fit: fit,
      grade: fit >= 85 ? 'Excellent' : fit >= 70 ? 'Good' : fit >= 50 ? 'Fair' : 'Weak',
      back: pa.dir, face: OPPOSITE_DIR[pa.dir] || '', why: why, warn: warn };
  }
  // Every outer palace of one hour, best first.
  function manifestRank(dt, goalKey, stageKey, fav) {
    var p = C.fourPillars(dt.y, dt.m, dt.d, dt.hour, dt.min === undefined ? 30 : dt.min), chart = S.qimen(p), forms = S.formations(p, dt.m);
    var goal = goalOf(goalKey), stage = stageOf(stageKey);
    return { pillars: p, chart: chart, disharmony: S.disharmony(p.day.stem, p.hour.stem),
      list: OUTER.map(function (n) { return manifestScore(chart, forms, n, goal, stage, fav); }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }) };
  }
  // The best hours across a date range, one best palace per hour. Five Disharmony hours are left out, as in every
  // tool that suggests a time; opts.daytime leaves out 23:00-04:59.
  function searchManifest(start, days, goalKey, stageKey, fav, opts) {
    var goal = goalOf(goalKey), stage = stageOf(stageKey), out = [], jd0 = A.gregToJD(start.y, start.m, start.d);
    for (var d = 0; d < days; d++) {
      var g = A.jdToGreg(jd0 + d), gy = g.y, gm = g.m, gd = Math.floor(g.d);
      for (var b = 0; b < 12; b++) {
        if (opts && opts.daytime && (b === 0 || b === 1 || b === 2)) continue;
        var hh = b === 0 ? 23 : b * 2 - 1, p = C.fourPillars(gy, gm, gd, hh, 30);
        if (S.disharmony(p.day.stem, p.hour.stem)) continue;
        var chart = S.qimen(p), forms = S.formations(p, gm), best = null, second = null;
        OUTER.forEach(function (n) {
          var r = manifestScore(chart, forms, n, goal, stage, fav);
          if (!r) return;
          if (!best || r.score > best.score) { second = best; best = r; } else if (!second || r.score > second.score) second = r;
        });
        if (best) out.push({ y: gy, m: gm, d: gd, hour: hh, branch: b, range: C.HOUR_RANGE[b], dayPillar: p.day.cn, hourPillar: p.hour.cn,
          dun: chart.dun, ju: chart.ju, best: best, second: second });
      }
    }
    out.sort(function (a, b) { return b.best.score - a.best.score; });
    return { goal: goal, stage: stage, searched: days, list: out.slice(0, 12) };
  }

  /*
   * The script as it should be read aloud. A speech model would say 景门 and 惊门 as the same
   * sounding Chinese words, so doors take their English names; stems, branches, stars and deities
   * take pinyin. What the person typed is left exactly as written.
   */
  var SPEAK_DOOR = { '休':'Rest', '生':'Life', '伤':'Harm', '杜':'Delusion', '景':'Scenery', '死':'Death', '惊':'Fear', '开':'Open' };
  var SPEAK_WORD = { '值符':'Zhi Fu', '腾蛇':'Teng She', '螣蛇':'Teng She', '太阴':'Tai Yin', '六合':'Liu He', '白虎':'Bai Hu', '玄武':'Xuan Wu',
    '九地':'Jiu Di', '九天':'Jiu Tian', '朱雀':'Zhu Que', '勾陈':'Gou Chen',
    '天蓬':'Tian Peng', '天芮':'Tian Rui', '天冲':'Tian Chong', '天辅':'Tian Fu', '天禽':'Tian Qin', '天心':'Tian Xin', '天柱':'Tian Zhu', '天任':'Tian Ren', '天英':'Tian Ying' };
  var SPEAK_CHAR = { '甲':'Jia', '乙':'Yi', '丙':'Bing', '丁':'Ding', '戊':'Wu', '己':'Ji', '庚':'Geng', '辛':'Xin', '壬':'Ren', '癸':'Gui',
    '子':'Zi', '丑':'Chou', '寅':'Yin', '卯':'Mao', '辰':'Chen', '巳':'Si', '午':'Wu', '未':'Wei', '申':'Shen', '酉':'You', '戌':'Xu', '亥':'Hai',
    '坎':'Kan', '坤':'Kun', '震':'Zhen', '巽':'Xun', '乾':'Qian', '兑':'Dui', '艮':'Gen', '离':'Li', '中':'Zhong' };
  function spokenScript(plan) {
    var text = plan.script, kept = [];
    (plan.aspects || []).concat(plan.returns || []).forEach(function (line) {
      if (text.indexOf(line) < 0) return;
      text = text.split(line).join('\uE000' + kept.length + '\uE001');
      kept.push(line);
    });
    (plan.formations || []).forEach(function (f) { text = text.split(f.name + ', ' + f.nameEn).join(f.nameEn); });
    text = text.replace(/([休生伤杜景死惊开])门 door/g, function (m, d) { return SPEAK_DOOR[d] + ' Door'; })
      .replace(/([休生伤杜景死惊开])门/g, function (m, d) { return SPEAK_DOOR[d] + ' Door'; })
      .replace(/ ?[（(][\u3400-\u9fff]+[)）]/g, '');
    Object.keys(SPEAK_WORD).forEach(function (w) { text = text.split(w).join(SPEAK_WORD[w]); });
    text = text.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥坎坤震巽乾兑艮离中]/g, function (c) { return ' ' + SPEAK_CHAR[c] + ' '; })
      .replace(/[ \t]+/g, ' ').replace(/ ([,.;:])/g, '$1').replace(/^ | $/gm, '');
    return text.replace(/\uE000(\d+)\uE001/g, function (m, i) { return kept[+i]; });
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
   *   year  — always 阴遁. 'yearly' rule (default): 阴1 in 1864 甲子, one ju lower each year. 'era' rule:
   *           60-year eras from 1864: upper 1, middle 4, lower 7.
   *   month — always 阴遁; by the branch of the 符头 year (latest 甲/己 year). 'yearly' rule: 子午卯酉 1,
   *           寅申巳亥 4, 辰戌丑未 7. 'era' rule: 寅申巳亥 1,
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
      if (S.qimenOptions().longRule !== 'era') return { yin: true, ju: mod(-(p.solarYear - 1864), 9) + 1, yuan: era, voidIdx: p.year.i,
        basis: 'one ju lower each year from 阴1 in 1864' };
      return { yin: true, ju: [1, 4, 7][era], yuan: era, voidIdx: p.year.i,
               basis: ['Upper','Middle','Lower'][era] + ' 60-year era (' + ['上','中','下'][era] + '元)' };
    }
    if (type === 'month') {
      var fb = mod(p.year.branch - (p.year.stem % 5), 12);
      var oldRule = S.qimenOptions().longRule === 'era';
      var ju = [2,8,5,11].indexOf(fb) >= 0 ? (oldRule ? 1 : 4) : [0,6,3,9].indexOf(fb) >= 0 ? (oldRule ? 7 : 1) : (oldRule ? 4 : 7);
      return { yin: true, ju: ju, yuan: oldRule ? (ju === 1 ? 0 : ju === 7 ? 1 : 2) : (ju === 1 ? 0 : ju === 4 ? 1 : 2), voidIdx: p.month.i,
               basis: '符头 ' + C.STEMS[p.year.stem - (p.year.stem % 5)] + C.BRANCHES[fb] + ' year' };
    }
    var d = DAY_JU[p.term.name] || [0, 1];
    return { yin: d[0] === 1, ju: d[1], voidIdx: p.day.i, basis: 'solar term ' + p.term.name };
  }

  function chartFor(type, dt, birth) {
    var when = dt, isBirth = type === 'destiny';
    if (type === 'destiny') {
      if (!birth) throw new Error('A destiny chart needs a birth moment.');
      when = { y: birth.y, m: birth.m, d: birth.d, hour: birth.hour, min: birth.min };
      type = 'hour';
    }
    var p = isBirth ? C.birthPillars(birth) : C.fourPillars(when.y, when.m, when.d, when.hour, when.min);
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
  function doorForce(gv, season, rel) {
    if (!gv) return 0;
    var r = season ? season.rank : 3, timely = r >= 4;
    var v = gv * (rel === 'door_compels' ? 0.25 : rel === 'palace_compels' ? 0.6 : 1) * (timely ? 1.25 : r === 3 ? 1 : 0.75);
    if (gv > 0 && (rel === 'harmony' || rel === 'justice')) v += 0.4;
    if (gv < 0 && rel === 'justice' && timely) v -= 0.4;
    return v;
  }
  function palaceQuality(chart, forms, n, fav) {
    var pa = chart.palacesByNumber[n], s = 0, why = [];
    if (!pa) return { score: 0, why: [] };
    if (pa.gate) {
      var gv = pa.gateRank === 2 ? 2 : pa.gateRank === 1 ? 0 : -2, st = pa.gateStrength, rel = pa.gatePalace && pa.gatePalace.key;
      // Compelling mutes a door whichever way it leans, and the season scales it. A 和 or 义 door gains, and a bad door fed in its season is worse.
      s += doorForce(gv, st, rel);
      why.push(pa.gate + (gv > 0 ? ' (auspicious door)' : gv < 0 ? ' (inauspicious door)' : '') + (st ? ' ' + st.cn : '') +
        (rel === 'door_compels' || rel === 'palace_compels' ? ' ' + pa.gatePalace.cn : ''));
    }
    if (pa.starCn) { s += GOOD_STARS[pa.starCn] || 0; why.push(pa.starCn + (pa.starStrength ? ' ' + pa.starStrength.cn : '')); }
    if (pa.starStrength) s += (pa.starStrength.rank - 3) * 0.3;
    if (pa.spirit) { s += DEITY_VAL[pa.spiritNature] || 0; why.push(pa.spirit); }
    if (pa.isEmpty) { s -= 1.5; why.push('void (空亡)'); }
    // Every structure in the palace counts, the net capped at ±3 so a crowded palace cannot swamp the rest.
    // 门迫, 宫迫 and 门宫和义 are already in the door's own weight above.
    var fs = (forms || []).filter(function (f) { return (f.palaces || []).indexOf(n) >= 0 && f.id !== 'men_po' && f.id !== 'gong_po' && f.id !== 'men_sheng_gong'; }), net = 0, good = 0, bad = 0;
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
        Math.min(1, hostileForms * 0.25) - (pa.isEmpty ? 1.5 : 0) -
        (lead.kind !== 'door' || !pa.gatePalace ? 0 : pa.gatePalace.key === 'door_compels' ? 0.9 : pa.gatePalace.key === 'palace_compels' ? 0.5 : 0);
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
        if (open && pc.palacesByNumber[open].gatePalace && pc.palacesByNumber[open].gatePalace.key === 'palace_compels') { s -= 2; hf.push('开门 controlled by its palace (主克客)'); }
        if (chief && pc.palacesByNumber[chief].starPalace && pc.palacesByNumber[chief].starPalace.key === 'dead') { s -= 2; hf.push('chief star controlled by its palace (主克客)'); }
        if (!S.disharmony(r.pillars.day.stem, hp.stem) && (!best || s > best.score)) best = { pillar: hp.cn, score: Math.round(s * 10) / 10, why: why, flags: hf,
          range: r.pillars.hourRange };
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
          var n = locate(x.res.chart, t.symbols[0][0], t.symbols[0][1]); if (!n || S.disharmony(x.res.pillars.day.stem, x.res.pillars.hour.stem)) return null;
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

  /* ---------------- mobility directions ----------------
   * The nine palace nobles (九宮貴神) fly round the Lo Shu from a centre number: forward for a Yang natal plate,
   * backward for a Yin one (6 of 6 lists in the Thrive 2023 to 2027 reports). The personal centre those reports
   * use could not be derived, so the default is the year star and the person can choose another.
   */
  var NINE_NOBLES = [null,
    { n: 1, cn: '太乙', en: 'Celestial Advisor', tone: 1,  theme: 'career moves and useful contacts' },
    { n: 2, cn: '攝提', en: 'Extractor',         tone: -1, theme: 'tiring trips, so go prepared and look after your health' },
    { n: 3, cn: '軒轅', en: 'Regulus',           tone: 0,  theme: 'competition and arguments, so keep your temper' },
    { n: 4, cn: '招搖', en: 'Swagger',           tone: 1,  theme: 'study, writing and being noticed' },
    { n: 5, cn: '天符', en: 'Heavenly Seal',     tone: -1, theme: 'delays and obstacles, so leave extra margin' },
    { n: 6, cn: '青龍', en: 'Green Dragon',      tone: 1,  theme: 'authority, mentors and backing' },
    { n: 7, cn: '咸池', en: 'Salty Pool',        tone: 0,  theme: 'social pull and persuasion, with care over money' },
    { n: 8, cn: '太陰', en: 'Great Moon',        tone: 1,  theme: 'steady gains and quiet support' },
    { n: 9, cn: '天乙', en: 'Heavenly Noble',    tone: 1,  theme: 'recognition and help from people of standing' }
  ];

  function mobility(user, y, centre) {
    var natal = chartFor('destiny', null, user.birth), res = chartFor('year', { y: y, m: 7, d: 1, hour: 12, min: 0 }, user.birth), ch = res.chart;
    var fav = (user.deep || {}).favourable || null, auto = S.annualStar(res.pillars.solarYear), c = centre || auto, forward = natal.chart.dun === '阳遁';
    var rows = [1, 2, 3, 4, 6, 7, 8, 9].map(function (n) {
      var pa = ch.palacesByNumber[n], q = palaceQuality(ch, res.formations, n, fav);
      return { num: n, name: pa.name, dir: pa.dir, noble: NINE_NOBLES[mod(c - 1 + (forward ? 1 : -1) * (n - 5), 9) + 1],
               door: pa.gate, star: pa.starCn, deity: pa.spirit, isEmpty: pa.isEmpty, score: Math.round(q.score * 10) / 10 };
    }).sort(function (a, b) { return b.score - a.score; });
    return { year: y, pillar: res.pillars.year.cn, plate: ch.dun + ch.ju, forward: forward, autoCentre: auto, centre: NINE_NOBLES[c], rows: rows };
  }

  /* ---------------- life palaces on the destiny chart ----------------
   * Each life area sits wherever its marker falls on the natal plate, so a palace can hold several
   * areas or none. Destiny is the Day Stem's palace; the others follow one door, deity or star.
   * Matches the labelled natal charts in four Thrive 2027 reports, 32 of 32 placements. Karmic is the home palace
   * of the natal Envoy door: inferred from the Contribution aspect in those reports (4 of 4), which print no label for it.
   */
  var LIFE_PALACES = [
    { key:'destiny',       en:'Destiny',       cn:'命宮', basis:'Day Stem' },
    { key:'wealth',        en:'Wealth',        cn:'財富', basis:'生门 Life Door',     door:'生' },
    { key:'property',      en:'Property',      cn:'產業', basis:'死门 Death Door',    door:'死' },
    { key:'relationships', en:'Relationships', cn:'感情', basis:'六合 Harmony',       deity:'六合' },
    { key:'knowledge',     en:'Knowledge',     cn:'智慧', basis:'杜门 Delusion Door', door:'杜' },
    { key:'health',        en:'Health',        cn:'健康', basis:'天芮 Grain',         star:'天芮' },
    { key:'family',        en:'Family',        cn:'家庭', basis:'休门 Rest Door',     door:'休' },
    { key:'career',        en:'Career',        cn:'官祿', basis:'开门 Open Door',     door:'开' },
    { key:'karmic',        en:'Karmic',        cn:'因果', basis:'值使 Envoy door home' }
  ];

  function lifePalaces(chart, dp) {
    var byPalace = {}, list = [];
    LIFE_PALACES.forEach(function (a) {
      var seat = null;
      if (a.key === 'destiny') seat = chart.palacesByNumber[dp.destiny.palace];
      else if (a.key === 'karmic') seat = chart.palacesByNumber[chart.envoyPalace === 5 ? 2 : chart.envoyPalace];
      else [1, 2, 3, 4, 6, 7, 8, 9].forEach(function (n) {
        var pa = chart.palacesByNumber[n];
        if (seat || !pa) return;
        if ((a.door && pa.door && pa.door.char === a.door) || (a.deity && pa.deity && pa.deity.char === a.deity) ||
            (a.star && pa.star && pa.star.char === a.star)) seat = pa;
      });
      if (!seat) return;
      var item = { key: a.key, en: a.en, cn: a.cn, basis: a.basis, palace: seat.num, name: seat.name, dir: seat.dir };
      list.push(item);
      (byPalace[seat.num] = byPalace[seat.num] || []).push(item);
    });
    return { list: list, byPalace: byPalace };
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
        doorStrength: seat.gateStrength, doorPalace: seat.gatePalace, starStrength: seat.starStrength
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
    // Background signals are not structures, so they are not offered for searching.
    return D.FORMATIONS.filter(function (f) { return f.source !== 'signal'; }).map(function (f) {
      return { id: f.id, name: f.name, nameEn: f.nameEn, category: f.category, source: f.source || null,
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

  /* ---------------- twelve life areas on a Qimen plate ----------------
   * Each area reads its classical symbols (用神) on the plate, against the person's own seat (their Day Stem):
   * career 开门 with 值符 (the boss); education 景门, 丁, 天辅; spouse 乙 (wife) or 庚 (husband); marriage 六合 and how 乙
   * and 庚 meet; relatives the person's year stem (年干, elders) and month stem (月干, siblings); children the hour stem
   * (时干); colleagues the month stem with 值符; health 天心 against 天芮; finance 生门 and 戊; wealth 生门, 戊 and 天任;
   * legal 惊门, 勾陈, 朱雀 and 庚 (the opponent); travel the Sky Horse's palace and 九天. A helpful symbol counts for its
   * palace's quality and for supporting the seat, against it when it presses on the seat or is void; a hazard symbol
   * the other way round. Works for the birth chart (Qimen Destiny) and for any year plate.
   */
  var AREA_SYMBOLS = {
    career: [['door', '开门', 'the Open Door (开门), your career'], ['deity', '值符', 'the Chief (值符), your bosses']],
    education: [['door', '景门', 'the Scenery Door (景门), exams and documents'], ['stem', '丁', 'the Star Wonder (丁), study and insight'], ['star', '天辅', 'the Assistant star (天辅), teachers']],
    finance: [['door', '生门', 'the Life Door (生门), income'], ['stem', '戊', 'Wu (戊), your capital']],
    wealth: [['door', '生门', 'the Life Door (生门), profit'], ['stem', '戊', 'Wu (戊), your capital'], ['star', '天任', 'the Ambassador star (天任), property']],
    health: [['star', '天心', 'the Heart star (天心), healing']],
    travel: [['deity', '九天', 'Nine Heaven (九天), far travel']]
  };
  var AREA_HAZARDS = {
    health: [['star', '天芮', 'the Grain star (天芮), illness']],
    legal: [['door', '惊门', 'the Fear Door (惊门), disputes and lawsuits'], ['deity', '勾陈', 'the Hook (勾陈), entanglement'], ['deity', '朱雀', 'the Phoenix (朱雀), quarrels and documents'], ['stem', '庚', 'Geng (庚), the opponent']]
  };
  function areasOnPlate(res, user, seat, natal) {
    var ch = res.chart, forms = res.formations, P = ch.palacesByNumber, fav = (user.deep || {}).favourable || null, np = user.pillars;
    var s = {}, S0 = function (k, v, plain, tech) { (s[k] = s[k] || []).push({ v: v, plain: plain, tech: tech }); };
    var where = function (pa) { return pa.dir + ' (palace ' + pa.num + ')'; };
    function relTo(n) { return n === seat ? 'same' : rel(P[n].element, P[seat].element); }
    function helpful(k, n, name, w) {
      if (!n || !P[n]) return;
      var pa = P[n], q = palaceQuality(ch, forms, n, fav).score / 3, r = relTo(n);
      var rv = { same: 0.5, produces: 0.75, produced_by: -0.25, controls: -0.75, controlled_by: 0.25 }[r] || 0;
      var v = (q + rv - (pa.isEmpty ? 1 : 0)) * (w || 1);
      var how = pa.isEmpty ? 'is void here: promised but hollow, so it needs more effort' : r === 'controls' ? (q >= 0.7 ? 'presses on you but sits in a strong palace, so effort pays off' : 'presses on you, so the matter costs effort') :
        r === 'produces' || r === 'same' ? (q <= -0.7 ? 'supports you, but from a weak palace' : 'supports you') : q >= 0.7 ? 'sits in a strong palace' : q <= -0.7 ? 'sits in a weak palace' : 'is neutral to you';
      S0(k, v, name.replace(/, (.*)$/, ' — $1 —') + ' ' + how, name.replace(/,.*$/, '') + ' in ' + where(pa) + ' with ' + [pa.gate, pa.starCn, pa.spirit].filter(Boolean).join(', ') +
        ' — ' + REL_LABEL[r] + ' your seat' + (pa.isEmpty ? ', void' : '') + ', quality ' + Math.round(q * 30) / 10);
    }
    function hazard(k, n, name) {
      if (!n || !P[n]) return;
      var pa = P[n], r = relTo(n), press = r === 'controls' || n === seat;
      var v = (press ? -1.5 : -0.25) + (pa.isEmpty ? 1 : 0) + (HOSTILE_DEITY.indexOf(pa.spirit) >= 0 && pa.spirit !== name ? -0.5 : 0);
      S0(k, v, name.replace(/, (.*)$/, ' — $1 —') + (pa.isEmpty ? ' is void, so the risk is hollow' : press ? ' presses on you, so take care here' : ' is away from you and contained'),
        name.replace(/,.*$/, '') + ' in ' + where(pa) + (press ? ', pressing on your seat' : '') + (pa.isEmpty ? ', void' : ''));
    }
    Object.keys(AREA_SYMBOLS).forEach(function (k) { AREA_SYMBOLS[k].forEach(function (sym, i) { helpful(k, locate(ch, sym[0], sym[1]), sym[2], i === 0 ? 1 : 0.6); }); });
    Object.keys(AREA_HAZARDS).forEach(function (k) { AREA_HAZARDS[k].forEach(function (sym) { hazard(k, locate(ch, sym[0], sym[1]), sym[2]); }); });
    // Spouse and marriage: 乙 (wife) or 庚 (husband), 六合 the match, and how 乙 and 庚 meet.
    var M = user.gender === 'M', sp = locate(ch, 'stem', M ? '乙' : '庚');
    helpful('spouse', sp, M ? 'Yi (乙), your wife' : 'Geng (庚), your husband');
    helpful('marriage', locate(ch, 'deity', '六合'), 'Harmony (六合), the match', 0.8);
    var yi = locate(ch, 'stem', '乙'), geng = locate(ch, 'stem', '庚');
    if (yi && geng) {
      var yg = yi === geng ? 'same' : rel(P[yi].element, P[geng].element);
      if (yg === 'same' || yg === 'produces' || yg === 'produced_by') S0('marriage', 1, 'husband and wife (乙 and 庚) support each other', '乙 in ' + where(P[yi]) + ', 庚 in ' + where(P[geng]) + ': ' + REL_LABEL[yg]);
      else if (yg === 'controls' || yg === 'controlled_by') S0('marriage', -1, 'husband and wife (乙 and 庚) pull against each other', '乙 in ' + where(P[yi]) + ', 庚 in ' + where(P[geng]) + ': ' + REL_LABEL[yg]);
    }
    // Family: the person's own year, month and hour stems located on this plate.
    helpful('relatives', seatOfStem(ch, np.year.stem, np.year.i), 'your parents\' and elders\' stem (年干 ' + C.STEMS[np.year.stem] + ')');
    helpful('relatives', seatOfStem(ch, np.month.stem, np.month.i), 'your siblings\' stem (月干 ' + C.STEMS[np.month.stem] + ')', 0.6);
    helpful('children', seatOfStem(ch, np.hour.stem, np.hour.i), 'your children\'s stem (时干 ' + C.STEMS[np.hour.stem] + ')');
    helpful('colleagues', seatOfStem(ch, np.month.stem, np.month.i), 'your colleagues\' stem (月干 ' + C.STEMS[np.month.stem] + ')');
    helpful('colleagues', locate(ch, 'deity', '值符'), 'the Chief (值符), your bosses', 0.8);
    // Travel: the palace holding the Sky Horse branch of the person's day branch.
    var horseBr = { 0: 2, 4: 2, 8: 2, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 }[np.day.branch];
    var hp = Object.keys(PAL_BR).filter(function (n) { return PAL_BR[n].indexOf(horseBr) >= 0; })[0];
    if (hp) helpful('travel', +hp, 'the Sky Horse (驿马 ' + C.BRANCHES[horseBr] + '), movement');
    return global.QPBazi.areaResults(s, null, natal);
  }
  /** The birth chart's areas (Qimen Destiny): around the natal Day Stem's seat. */
  function areasDestiny(res, user) { return areasOnPlate(res, user, natalSeat(res.chart, user).num, true); }
  /** A year plate's areas: around where the natal Day Stem sits on that year's plate. */
  function areasYearPlate(user, year) {
    var A0 = global.QPAstro, mid = A0.jdToLocal(A0.termsForYear(year)[0].jd + 150);
    var res = chartFor('year', { y: mid.y, m: mid.m, d: Math.floor(mid.d), hour: 12, min: 0 });
    return areasOnPlate(res, user, natalSeat(res.chart, user).num, false);
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
    wu_bu_ji: 51, san_sheng: 34.5, fan_yin: 22.2, fu_yin_men: 22.2, san_qi_shou_zhi: 21.8, men_sheng_gong: 13.9, 
    san_qi_ji_men: 13.8, men_fan_yin: 11.2, fan_yin_2: 11.1, men_ru_mu: 11.1, san_qi_ru_mu: 9.4, 
    liu_yi_ji_xing: 9.3, men_po: 8.3, gong_po: 8.3, kong_wang: 7.9, qi_yi_xiang_he: 7.4, fei_dun_cheng: 6.5, 
    yang_dong: 6.3, yin_jing: 6.3, san_qi_zhi_ling: 5.5, bei_ge: 5.1, xiang_zuo: 4.7, quan_yi: 4.5, 
    jiu_tian_tong_ling: 4.5, qi_ge: 4.3, jiu_di_xiong: 3.8, yi_de_shi: 3.1, bing_de_shi: 3.1, ding_de_shi: 3.1, 
    yi_wang: 3.1, bing_wang: 3.1, ding_wang: 3.1, tian_yi_fei_gong: 2.9, jiao_tai: 2.8, zhan_ge: 2.8, 
    tian_yi_fu_gong: 2.8, zhi_fu_kong: 2.8, zhi_fu_xiong: 2.8, liu_he_xiong: 2.8, qing_long_hui: 2.7, 
    fei_niao_die: 2.6, you_san: 2.4, shi_ge: 2.3, tian_wang_si_zhang: 2.3, di_wang_zhe_bi: 2.3, liu_yi_ru_mu: 2.1, 
    zhen_zha: 2, tian_dun: 1.9, wu_jia_gui: 1.9, xiu_zha: 1.8, chong_zha: 1.7, wu_jia_di: 1.7, teng_she: 1.7, 
    yu_nv_shou: 1.6, yi_qi_sheng: 1.6, bing_qi_sheng: 1.6, wu_jia_shen: 1.6, fu_duan_ge: 1.6, yue_ge: 1.6, 
    ri_ge: 1.6, qi_mu: 1.6, ding_qi_sheng: 1.5, san_qi_li_he: 1.5, fei_duan_ge: 1.5, da_ge: 1.5, huan_xi: 1.5, 
    tian_yu_chang: 1.4, xing_sui_yue: 1.4, xin_yi: 1.4, wu_jia_xin_ge: 1.4, qing_long_tao: 1.4, 
    ying_ru_tai_bai: 1.4, tai_bai_ru_ying: 1.4, xing_ge: 1.4, shang_ge: 1.4, sui_ge: 1.4, zhi_fu_xiang_sheng: 1.4, 
    jiu_tian_xiong: 1.4, tai_yin_xiong: 1.4, que_han_hua: 1.3, ding_gui: 1.3, wu_bu_yu: 1.3, bai_hu: 1.3, 
    ren_bing: 1.2, bing_ren: 1.2, ji_ding: 1.1, ji_bing: 1.1, ren_ding: 1.1, geng_xin: 1.1, wu_ren: 1.1, 
    wu_yi: 1.1, yi_gui: 1.1, yi_ren: 1.1, yi_ji: 1.1, ding_xin: 1.1, geng_ji_geng: 1.1, xin_ren: 1.1, ren_xin: 1.1, 
    ren_yi: 1.1, ren_geng: 1.1, gui_yi: 1.1, gui_bing: 1.1, hu_dun: 1, tian_xian_shi: 1, she_yao_jiao: 1, 
    xin_gui: 1, wu_xin: 1, wu_ji: 1, wu_ding: 1, gui_geng: 1, gui_ren: 1, long_dun: 0.9, gui_dun: 0.9, 
    xuan_wu: 0.9, yun_dun: 0.7, feng_dun: 0.6, wu_jia_tian: 0.6, shen_dun: 0.4, fei_niao_ru_long: 0.4, di_dun: 0.2, 
    ren_dun: 0.1, wu_jia_ren: 0.1, shi_mu: 0.1, shi_gan_ru_mu: 0.1, san_qi_gui_lu: 0
  };
  // How often each formation appears anywhere on an hourly plate (% of hours), for the Formations screen.
  var FORMATION_HOURLY = {
    san_sheng: 100, wu_bu_ji: 100, san_qi_shou_zhi: 91.4, san_qi_ji_men: 80.9, men_sheng_gong: 66.6, 
    san_qi_ru_mu: 60.4, liu_yi_ji_xing: 53.4, yang_dong: 50, yin_jing: 50, kong_wang: 46.3, men_po: 44.4, 
    gong_po: 44.4, fei_dun_cheng: 43.9, qi_yi_xiang_he: 42.3, san_qi_zhi_ling: 40.5, bei_ge: 40.5, xiang_zuo: 38, 
    jiu_tian_tong_ling: 36.1, quan_yi: 36, qi_ge: 34.7, men_ru_mu: 33.3, jiu_di_xiong: 30.1, bing_wang: 25.2, 
    ding_de_shi: 25.1, yi_wang: 24.9, yi_de_shi: 24.6, ding_wang: 24.6, bing_de_shi: 24.5, tian_yi_fei_gong: 23.1, 
    tian_yi_fu_gong: 22.3, liu_he_xiong: 22.3, jiao_tai: 22.2, zhan_ge: 22.2, fan_yin: 22.2, fu_yin_men: 22.2, 
    zhi_fu_xiong: 22.2, zhi_fu_kong: 22, qing_long_hui: 21.3, fei_niao_die: 20.8, you_san: 19.6, shi_ge: 18.4, 
    tian_wang_si_zhang: 18.4, di_wang_zhe_bi: 18.1, zhen_zha: 16, liu_yi_ru_mu: 15.7, tian_dun: 15, 
    wu_jia_gui: 14.9, xiu_zha: 14.4, teng_she: 13.9, chong_zha: 13.8, wu_jia_di: 13.8, yu_nv_shou: 12.9, 
    fu_duan_ge: 12.9, yue_ge: 12.9, ri_ge: 12.9, qi_mu: 12.9, yi_qi_sheng: 12.6, wu_jia_shen: 12.6, 
    bing_qi_sheng: 12.5, ding_qi_sheng: 12.4, fei_duan_ge: 12.4, da_ge: 12.4, huan_xi: 12.2, san_qi_li_he: 12.1, 
    xing_ge: 11.6, wu_jia_xin_ge: 11.5, xin_yi: 11.3, sui_ge: 11.3, zhi_fu_xiang_sheng: 11.2, men_fan_yin: 11.2, 
    tian_yu_chang: 11.1, xing_sui_yue: 11.1, qing_long_tao: 11.1, ying_ru_tai_bai: 11.1, fan_yin_2: 11.1, 
    jiu_tian_xiong: 11.1, tai_bai_ru_ying: 11, shang_ge: 11, tai_yin_xiong: 11, bai_hu: 10.8, que_han_hua: 10.6, 
    ding_gui: 10.5, wu_bu_yu: 10, bing_ren: 9.5, ren_bing: 9.2, wu_ren: 9.1, xin_ren: 9, ren_geng: 9, gui_bing: 9, 
    ji_bing: 8.9, ren_ding: 8.8, yi_ren: 8.8, ren_xin: 8.7, ren_yi: 8.7, wu_yi: 8.6, yi_gui: 8.6, 
    geng_ji_geng: 8.6, geng_xin: 8.5, gui_yi: 8.5, ji_ding: 8.4, yi_ji: 8.4, ding_xin: 8.4, gui_geng: 8.4, 
    gui_ren: 8.4, tian_xian_shi: 8.3, she_yao_jiao: 8.3, xin_gui: 8.3, wu_ji: 8.3, wu_ding: 8.3, wu_xin: 8.2, 
    hu_dun: 7.9, xuan_wu: 7.5, long_dun: 7.3, gui_dun: 7.1, yun_dun: 5.7, feng_dun: 5.2, wu_jia_tian: 4.7, 
    fei_niao_ru_long: 3.1, shen_dun: 2.9, di_dun: 1.8, ren_dun: 1.1, wu_jia_ren: 1, shi_mu: 1, shi_gan_ru_mu: 1, 
    san_qi_gui_lu: 0
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
      use: f.category === 'auspicious' ? 'Plan the matter it favours for that hour, sit with your back to the palace it sits in, and open the manifestation script to work with it by name.'
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
    return 'Good for ' + bits.join('; ') + '. For a seated activation, sit with your back to the ' + b.pa.dir + '.';
  }

  /** Scan `days` days from `from` ({y,m,d}); fav = the person's favourable elements (optional). */
  function structureScan(from, days, fav) {
    var all = [];
    for (var i = 0; i < days; i++) {
      var d0 = new Date(from.y, from.m - 1, from.d + i), dt = { y: d0.getFullYear(), m: d0.getMonth() + 1, d: d0.getDate() };
      for (var k = 0; k < 12; k++) {
        var when = { y: dt.y, m: dt.m, d: dt.d, hour: k * 2, min: 30 }, res = chartFor('hour', when), b = structureAt(res, fav);
        if (!b || S.disharmony(res.pillars.day.stem, res.pillars.hour.stem)) continue;
        var pa = b.pa;
        all.push({ date: dt.y + '-' + pad(dt.m) + '-' + pad(dt.d), dt: when, range: res.pillars.hourRange, branch: k,
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
   * temptation, 腾蛇 suspicion and anxiety, 白虎 quarrels and fatigue, 惊门 fear and arguments, and a void (空亡)
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
        var rc = chartFor('hour', { y: dt.y, m: dt.m, d: dt.d, hour: k * 2, min: 30 }), r = romanceRead(rc, a, b);
        var hb = k, hNote = [], hScore = 0;
        if ((hb + 6) % 12 === dayA || (hb + 6) % 12 === dayB) { hScore -= 1; hNote.push('the hour clashes a day branch'); }
        if (love.indexOf(hb) >= 0) { hScore += 0.5; hNote.push('a romance hour'); }
        var total = r.attraction + r.desire + r.intimacy + dayScore + hScore;
        slots.push({ date: dt.y + '-' + pad(dt.m) + '-' + pad(dt.d), dayPillar: dp.cn, range: rc.pillars.hourRange, branch: k,
          attraction: r.attraction, desire: r.desire, intimacy: r.intimacy, total: Math.round(total * 10) / 10,
          notes: dayNote.concat(hNote), warnings: r.warnings, activate: r.activate.dir, disharmony: !!S.disharmony(rc.pillars.day.stem, rc.pillars.hour.stem) });
      }
    }
    // Times are offered for planned time together, so only waking hours count: 辰 07:00 through 子 00:59.
    slots = slots.filter(function (s) { return (s.branch >= 4 || s.branch === 0) && !s.disharmony; });
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
    mobility: mobility, NINE_NOBLES: NINE_NOBLES, lifePalaces: lifePalaces, areasDestiny: areasDestiny, areasYearPlate: areasYearPlate, areasOnPlate: areasOnPlate, natalSeat: natalSeat, palaceQuality: palaceQuality,
    CHART_TYPES: CHART_TYPES, chartFor: chartFor, DOOR_INTENT: DOOR_INTENT,
    formationCatalogue: formationCatalogue, searchFormations: searchFormations,
    CATEGORIES: CATEGORIES, SCENARIOS: SCENARIOS, SEARCH_FIELDS: SEARCH_FIELDS, qimenAnnual: qimenAnnual, threatBridge: threatBridge, THREATS: THREATS, threatMonths: threatMonths, threatMonthText: threatMonthText, threatMonthTextFull: threatMonthTextFull, monthJiazi: monthJiazi,
    METHODS: METHODS, nianMingPalace: nianMingPalace, symbolFor: symbolFor,
    forecast: forecast, searchWindows: searchWindows, manifestPlan: manifestPlan,
    MANIFEST_GOALS: MANIFEST_GOALS, MANIFEST_STAGES: MANIFEST_STAGES, manifestRank: manifestRank, searchManifest: searchManifest, OPPOSITE_DIR: OPPOSITE_DIR, spokenScript: spokenScript, destinyProfile: destinyProfile,
    findPalace: findPalace, askerPalace: askerPalace, rel: rel, REL_LABEL: REL_LABEL
  };
})(typeof window !== 'undefined' ? window : globalThis);
