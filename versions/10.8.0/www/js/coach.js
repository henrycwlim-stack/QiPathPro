/* QiPath Pro: mindset coaching (教练).
 *
 * A guided coaching session in stages: arrive, agree the focus, go down the Satir iceberg, see the wider system,
 * use the chart as a mirror,
 * reframe with the five life principles (Chou Ting Wen 周鼎文), name the insight, commit to one step, close. The app holds
 * the stage; the AI writes only a short reflection and the next open question for that stage.
 *
 * Safety comes first and has two layers. Every message the coachee sends is screened on the device before anything goes to
 * the AI, and the AI flags anything the screen missed. Crisis replies (self-harm, suicidal thoughts, abuse) and health replies
 * use fixed wording written for the purpose, never AI text, with verified local helplines.
 * Helplines checked 12 Nov 2026 against national health ministry, government and NGO sources.
 */
(function (global) {
  'use strict';

  var STAGES = [
    { key: 'arrive', label: 'Arrive', cn: '安住', chip: '安住', min: 1, max: 2,
      aim: 'Help the coachee arrive in the present: notice the breath, the body and what is here right now. Mindful, slow, no problem-solving yet.' },
    { key: 'focus', label: 'Focus', cn: '定向', chip: '定向', min: 1, max: 3,
      aim: 'Agree what the session is about and what the coachee would like to know, feel or decide by the end. Get it in their own words.' },
    { key: 'iceberg', label: 'Go deeper', cn: '冰山', chip: '冰山', min: 3, max: 8,
      aim: 'Go down the Satir iceberg one layer at a time, from what they do to what they long for. Only go deeper when the coachee is ready.' },
    { key: 'system', label: 'See the system', cn: '系统', chip: '系统', min: 2, max: 5,
      aim: 'Step back from the inner view and look at the wider system: who else is part of this, what pattern keeps repeating, what loop keeps it going, and what part the coachee plays in it. Use the systems lenses, one at a time.' },
    { key: 'mirror', label: 'Chart as a mirror', cn: '命盘映照', chip: '映照', min: 1, max: 2,
      aim: 'Offer one pattern from the chart profile as a hypothesis linked to what they said, then ask whether it fits. Their answer counts more than the chart.' },
    { key: 'principles', label: 'Five principles', cn: '五大法则', chip: '法则', min: 2, max: 5,
      aim: 'Look at the situation through the five life principles in the order Fact, Order, Balance, Wholeness, Flow, one question at a time.' },
    { key: 'insight', label: 'Insight', cn: '觉察', chip: '觉察', min: 1, max: 2,
      aim: 'Invite the coachee to name, in their own words, what they now see that they did not see before, and how clear it feels.' },
    { key: 'commit', label: 'Commit', cn: '承诺', chip: '承诺', min: 1, max: 2,
      aim: 'Invite one small, concrete, self-chosen step and when they will take it. Advice is allowed here, but only as options they choose from.' },
    { key: 'close', label: 'Close', cn: '圆满', chip: '圆满', min: 1, max: 1,
      aim: 'Close warmly: acknowledge what they brought and did in the session, and ask one last question about what they will take with them.' }
  ];

  // Satir's iceberg, from what shows above the water to the self beneath it.
  var ICEBERG = [
    { key: 'behaviour', label: 'Behaviour', cn: '行为' },
    { key: 'coping', label: 'Coping stance', cn: '应对方式' },
    { key: 'feelings', label: 'Feelings', cn: '感受' },
    { key: 'feelingsAbout', label: 'Feelings about feelings', cn: '感受的感受' },
    { key: 'perceptions', label: 'Perceptions', cn: '观点' },
    { key: 'expectations', label: 'Expectations', cn: '期待' },
    { key: 'yearnings', label: 'Yearnings', cn: '渴望' },
    { key: 'self', label: 'Self', cn: '自我' }
  ];

  // Chou Ting Wen's five life principles, described in QiPath's own words, in the order the session uses them.
  var PRINCIPLES = [
    { key: 'fact', label: 'Principle of Fact', cn: '事实法则', lens: 'see what is, as it is, apart from the story told about it' },
    { key: 'order', label: 'Principle of Order', cn: '序位法则', lens: 'everyone has a place; notice who came first and whether you carry what is not yours' },
    { key: 'balance', label: 'Principle of Balance', cn: '平衡法则', lens: 'giving and receiving; where the exchange has become uneven' },
    { key: 'wholeness', label: 'Principle of Wholeness', cn: '整体法则', lens: 'everything belongs, including the parts and people pushed away' },
    { key: 'flow', label: 'Principle of Flow', cn: '流动法则', lens: 'once things are seen and acknowledged, life can move on' }
  ];

  // Systemic thinking: the problem seen as part of a living system of people, patterns and loops, not a fault in one person.
  // Lenses from systems thinking and systemic coaching, in QiPath's own words.
  var SYSTEM_LENSES = [
    { key: 'map', label: 'Map the system', cn: '系统图', lens: 'who is part of this, who is affected, and who is missing from the conversation' },
    { key: 'pattern', label: 'Patterns over events', cn: '模式', lens: 'when this has happened before, and what repeats each time' },
    { key: 'loop', label: 'Loops', cn: '循环', lens: 'what keeps the pattern going, what holds it in place, and the coachee\'s own part in the loop' },
    { key: 'perspective', label: 'Other perspectives', cn: '多视角', lens: 'how each person involved would describe it, and what they would notice if it changed (circular questions)' },
    { key: 'structure', label: 'Structures and beliefs', cn: '结构与信念', lens: 'the rules, roles, habits and shared beliefs beneath the pattern (events, patterns, structures, mental models)' },
    { key: 'function', label: 'What the problem does', cn: '问题的功能', lens: 'what the problem protects, prevents or makes possible for the people in the system' },
    { key: 'leverage', label: 'Ripples and leverage', cn: '杠杆', lens: 'what else would change if this changed, and the smallest shift that would move the most' }
  ];

  /* ---------------- safety ---------------- */

  // The device screen. It errs towards caution: a false alarm costs a pause, a missed one could cost much more.
  var CRISIS_SELF = [
    /\bsuicid/i, /\bkill(ing)?\s+my\s*self\b/i, /\bend(ing)?\s+(my|it)\s+(life|all)\b/i, /\bend\s+it\s+all\b/i, /\btake\s+my\s+(own\s+)?life\b/i,
    /\bwant(ed)?\s+to\s+die\b/i, /\bwish\s+i\s+(was|were)\s+dead\b/i, /\bbetter\s+off\s+dead\b/i, /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
    /\bno\s+reason\s+to\s+live\b/i, /\bself[-\s]?harm/i, /\bhurt(ing)?\s+my\s*self\b/i, /\bcut(ting)?\s+my\s*self\b/i, /\boverdose\b/i,
    /\bhang\s+my\s*self\b/i, /\bjump\s+off\b/i, /\bnot\s+worth\s+living\b/i,
    /自杀|自殺|轻生|輕生|不想活|想死|寻死|尋死|结束生命|結束生命|自残|自殘|割腕|活不下去/
  ];
  var CRISIS_ABUSE = [
    /\babus(e|ed|ing|ive)\b/i, /\b(hits?|hitting|beats?|beating|chok(es|ed|ing))\s+me\b/i, /\b(he|she|they)\s+(hit|beat|chok)/i,
    /\brap(e|ed)\b/i, /\bsexual(ly)?\s+(assault|abus|harass)/i, /\bmolest/i, /\bdomestic\s+violence\b/i, /\bafraid\s+(he|she|they)('ll|\s+will)\s+(hurt|kill)\s+me\b/i,
    /家暴|家庭暴力|虐待|性侵|强奸|強姦|被打|打我|性骚扰|性騷擾/
  ];
  var HEALTH = [
    /\bdiagnosed\s+with\b/i, /\bcancer\b/i, /\btumou?r\b/i, /\bheart\s+attack\b/i, /\bstroke\b/i, /\bchest\s+pain/i,
    /\bcan'?t\s+breathe\b/i, /\bseizure/i, /\bblack(ed|ing)?\s+out\b/i, /\b(severe|serious)\s+(pain|illness|bleeding|symptom)/i,
    /\bstopped\s+(taking\s+)?my\s+medication\b/i, /\bin\s+(the\s+)?hospital\b/i,
    /癌|肿瘤|腫瘤|心脏病发|心臟病發|中风|中風|胸痛|确诊|確診|住院/
  ];
  function screen(text) {
    var t = String(text || '');
    if (CRISIS_SELF.some(function (r) { return r.test(t); })) return 'self_harm';
    if (CRISIS_ABUSE.some(function (r) { return r.test(t); })) return 'abuse';
    if (HEALTH.some(function (r) { return r.test(t); })) return 'health';
    return null;
  }

  // Verified 12 Nov 2026. Each entry: emergency, crisis lines (self-harm and suicidal thoughts), abuse lines.
  var HELPLINES = {
    MY: { name: 'Malaysia', emergency: '999',
      crisis: [['Befrienders Kuala Lumpur', '03-7627 2929', '24 hours'], ['Talian HEAL (Ministry of Health)', '15555', '8 am to midnight daily']],
      abuse: [['Talian Kasih', '15999', '24 hours']] },
    SG: { name: 'Singapore', emergency: '995 (ambulance) or 999 (police)',
      crisis: [['Samaritans of Singapore (SOS)', '1767', '24 hours'], ['National Mindline', '1771', '24 hours']],
      abuse: [['National Anti-Violence and Sexual Harassment Helpline', '1800-777-0000', '24 hours']] },
    HK: { name: 'Hong Kong', emergency: '999',
      crisis: [['Mental Health Support Hotline', '18111', '24 hours'], ['The Samaritans Hong Kong (multilingual)', '2896 0000', '24 hours'], ['Samaritan Befrienders Hong Kong (Cantonese)', '2389 2222', '24 hours']],
      abuse: [['CEASE Crisis Centre (family and sexual violence)', '18281', '24 hours']] },
    TW: { name: 'Taiwan', emergency: '119 (ambulance) or 110 (police)',
      crisis: [['安心專線 Peace of Mind Line', '1925', '24 hours']],
      abuse: [['113 Protection Hotline', '113', '24 hours']] },
    CN: { name: 'China', emergency: '120 (ambulance) or 110 (police)',
      crisis: [['National Mental Health Assistance Hotline', '12356', '']],
      abuse: [['Women\'s Rights Hotline (All-China Women\'s Federation)', '12338', '']] },
    ID: { name: 'Indonesia', emergency: '112 or 119',
      crisis: [['Healing119 (Ministry of Health)', '119 ext 8', 'healing119.id']],
      abuse: [['SAPA 129 (women and children)', '129', '24 hours, WhatsApp 08111-129-129']] },
    PH: { name: 'Philippines', emergency: '911',
      crisis: [['NCMH Crisis Hotline', '1553', '24 hours; also 1800-1888-1553']],
      abuse: [] },
    TH: { name: 'Thailand', emergency: '1669 (ambulance) or 191 (police)',
      crisis: [['Department of Mental Health Hotline', '1323', '24 hours']],
      abuse: [] },
    AU: { name: 'Australia', emergency: '000',
      crisis: [['Lifeline', '13 11 14', '24 hours']], abuse: [['1800RESPECT', '1800 737 732', '24 hours']] },
    NZ: { name: 'New Zealand', emergency: '111',
      crisis: [['Need to Talk? (call or text)', '1737', '24 hours']], abuse: [] },
    GB: { name: 'United Kingdom', emergency: '999',
      crisis: [['Samaritans', '116 123', '24 hours']], abuse: [['National Domestic Abuse Helpline (Refuge)', '0808 2000 247', '24 hours']] },
    US: { name: 'United States', emergency: '911',
      crisis: [['988 Suicide and Crisis Lifeline (call or text)', '988', '24 hours']], abuse: [['National Domestic Violence Hotline', '1-800-799-7233', '24 hours']] },
    CA: { name: 'Canada', emergency: '911',
      crisis: [['9-8-8 Suicide Crisis Helpline (call or text)', '988', '24 hours']], abuse: [] },
    OTHER: { name: 'Another country', emergency: 'your local emergency number', crisis: [], abuse: [] }
  };
  var TZ_COUNTRY = { 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY', 'Asia/Singapore': 'SG', 'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'HK',
    'Asia/Taipei': 'TW', 'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Harbin': 'CN', 'Asia/Urumqi': 'CN',
    'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Pontianak': 'ID', 'Asia/Manila': 'PH', 'Asia/Bangkok': 'TH',
    'Pacific/Auckland': 'NZ', 'Europe/London': 'GB' };
  function detectCountry() {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
    if (/^Australia\//.test(tz)) return 'AU';
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal)/.test(tz)) return 'CA';
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana|Boise)/.test(tz) || tz === 'Pacific/Honolulu') return 'US';
    return 'OTHER';
  }

  // Fixed, tactful wording for each case: what the coachee reads, and tips for a coach guiding the session.
  var SAFETY = {
    self_harm: {
      title: 'Let\'s pause here. Your safety matters most.',
      message: 'Thank you for telling me. It took courage, and what you are feeling matters. You do not have to carry this alone. ' +
        'This coaching session is not the right support for what you are going through right now, so I am going to pause it here. ' +
        'That is not because you did anything wrong. It is because you deserve someone trained to be with you in this. ' +
        'Please reach out to one of the people below now. They are there to listen, day and night.',
      danger: 'If you might act on these thoughts or you are not safe right now, call the emergency number now, or go to the nearest hospital emergency department.',
      also: 'If you can, tell someone you trust how you are feeling, and stay with them for a while.',
      tips: ['Stay calm and warm. Thank them for telling you, and do not judge, argue or try to cheer them up quickly.',
        'Ask directly and kindly whether they are safe right now. Asking about suicide does not put the idea in their head.',
        'Do not promise to keep it secret. Their safety comes before confidentiality.',
        'Help them contact a helpline or emergency service now, and stay with them while they call if you can.',
        'If they are in immediate danger, call the emergency number yourself and do not leave them alone.',
        'End the coaching part gently: say you are stopping because they matter, not because of anything they said or did, and agree when you will check in.',
        'Afterwards, look after yourself and talk it through with a supervisor or someone you trust.'] },
    abuse: {
      title: 'Let\'s pause here. Your safety comes first.',
      message: 'Thank you for trusting me with this. What has happened to you is not your fault, and you deserve to be safe. ' +
        'This coaching session is not the right support for this, so I am going to pause it here. ' +
        'The people below are trained to help with exactly this, and they can talk through your options in confidence.',
      danger: 'If you are in danger right now, call the emergency number, or go somewhere safe and call from there.',
      also: 'If someone else may see this device, you can delete this session from the app below.',
      tips: ['Believe them and say so. Thank them for telling you.',
        'Do not push for details, and do not suggest confronting the person who hurt them; that can raise the danger.',
        'Ask whether they are safe right now and whether they have somewhere safe to go.',
        'Help them contact the helpline or emergency services. Let them choose the next step where they safely can.',
        'If a child or someone at risk is involved, follow the reporting rules where you work.',
        'End the coaching part gently: make clear you are stopping to protect them, not because of anything they said.',
        'Afterwards, look after yourself and seek supervision.'] },
    health: {
      title: 'Your health deserves proper medical care',
      message: 'Thank you for sharing this. A health concern like this deserves proper medical attention, and coaching cannot replace that. ' +
        'I would gently suggest we end the session here so you can put your energy into getting the right care. ' +
        'Please speak to a doctor or visit a clinic soon. Whatever any reading says, it is never a reason to delay, avoid or stop medical care.',
      danger: 'If it feels urgent, or the symptoms are severe or getting worse, call the emergency number or go to the nearest emergency department now.',
      also: 'You are welcome to come back to coaching once you have the care you need.',
      tips: ['Acknowledge what they shared with care, without trying to diagnose or reassure them about it.',
        'Say plainly that coaching cannot replace medical care, and encourage them to see a doctor soon.',
        'If anything sounds urgent, encourage them to get emergency help now.',
        'Offer to end the session, and let them leave feeling heard rather than turned away.'] }
  };

  /* ---------------- the person, read from the charts ---------------- */

  // A short coaching profile built once from the Combined reading and the BaZi analysis. It is offered to the AI as patterns
  // to test, never as verdicts.
  function profile(user, year) {
    var out = [], d = user.deep || {}, b = user.bazi || {};
    if (b.dayMasterCn) out.push('Day Master ' + b.dayMasterCn + ' ' + (b.dayMasterEn || '') + (d.strength ? ', ' + d.strength.verdict : '') + '.');
    if (d.favourableEn && d.favourableEn.length) out.push('Supportive elements: ' + d.favourableEn.join(', ') + '.');
    try {
      var M = global.QPCombined.compute(user, year, null);
      var self = M.areas.filter(function (a) { return a.key === 'self'; })[0];
      if (self) out.push('Self: ' + self.meaning);
      out.push('Strongest life areas: ' + M.top.slice(0, 4).map(function (a) { return a.label + ' (' + a.level + ')'; }).join(', ') + '.');
      out.push('Areas that need most care: ' + M.low.slice(0, 4).map(function (a) { return a.label + ' (' + a.level + ')'; }).join(', ') + '.');
      ['relationships', 'spouse', 'family', 'parents', 'colleagues', 'bosses', 'friends', 'career', 'wealth', 'health', 'emotions', 'purpose'].forEach(function (k) {
        var a = M.areas.filter(function (x) { return x.key === k; })[0];
        if (a) out.push(a.label + ' (' + a.level + '): ' + a.meaning);
      });
    } catch (e) { /* the profile is a help, not a requirement */ }
    return out.join('\n');
  }

  /* ---------------- the session ---------------- */

  function newSession(topic, hope) {
    return { id: 'c' + Date.now().toString(36), started: new Date().toISOString(), topic: String(topic || '').trim(), hope: String(hope || '').trim(),
      stage: 0, inStage: 0, layer: -1, principle: -1, lens: -1, lensesUsed: [], people: [], loops: [], turns: [], insights: [], ended: null, safety: null, v: 2 };
  }
  var OPENING = 'Before we begin, let\'s take a moment to arrive. Let your shoulders drop, and take three slow breaths, a little longer on the way out than on the way in.\n\n' +
    'When you are ready: what is here for you right now, in your body and in your mind?';

  // A draft saved before the systems stage existed counts its stages without it.
  var OLD_STAGES = ['arrive', 'focus', 'iceberg', 'mirror', 'principles', 'insight', 'commit', 'close'];
  function upgrade(s) {
    if (!s || s.v === 2) return s;
    var k = OLD_STAGES[s.stage] || 'arrive';
    s.stage = STAGES.map(function (x) { return x.key; }).indexOf(k);
    s.lens = -1; s.lensesUsed = []; s.people = s.people || []; s.loops = s.loops || []; s.v = 2;
    return s;
  }

  // Decide the next stage from the AI's view and the stage's own minimum and maximum number of turns.
  function advance(s, wantNext) {
    var st = STAGES[s.stage];
    s.inStage++;
    if (s.stage < STAGES.length - 1 && ((wantNext && s.inStage >= st.min) || s.inStage >= st.max)) { s.stage++; s.inStage = 0; }
  }

  var TURN_SCHEMA = { type: 'object', properties: {
    safety: { type: 'string' }, reflection: { type: 'string' }, question: { type: 'string' },
    layer: { type: 'string' }, principle: { type: 'string' }, lens: { type: 'string' }, chartLink: { type: 'string' },
    people: { type: 'array', items: { type: 'string' } }, loop: { type: 'string' },
    insight: { type: 'string' }, readyToMoveOn: { type: 'boolean' } },
    required: ['safety', 'reflection', 'question', 'layer', 'principle', 'lens', 'chartLink', 'people', 'loop', 'insight', 'readyToMoveOn'] };

  function turnPrompt(s, prof) {
    var st = STAGES[s.stage], last = s.turns.slice(-18);
    return 'You are a warm, skilled mindset coach. You combine mindfulness, the Satir iceberg model and the five life principles ' +
      'of Chou Ting Wen (周鼎文), and you use the person\'s Chinese metaphysics chart only as a mirror for reflection. ' +
      'Write in English, adding the Chinese term in brackets the first time you use a framework term, e.g. "yearnings (渴望)".\n\n' +
      'HOW YOU COACH\n' +
      '- Reply with one short reflection (one or two sentences, mirroring their words and feeling) and exactly ONE open question.\n' +
      '- Open questions only: begin with what, how, where, when or who. Never ask yes/no questions, never ask two questions at once.\n' +
      '- Do not give advice, diagnose or interpret for them before the Commit stage. Let them find their own answers.\n' +
      '- Use their own words. Be curious, calm and kind. Leave room for silence; short questions are often the deepest.\n' +
      '- The chart describes tendencies, never fate. Only ever offer a chart pattern as a possibility and ask if it fits.\n' +
      '- Never predict misfortune, illness or death, and never tell them what will happen.\n\n' +
      'SAFETY (most important)\n' +
      'Set "safety" to "self_harm" if they mention suicidal thoughts, wanting to die or hurting themselves; "abuse" if they are being ' +
      'abused, hit, threatened or sexually harmed; "health" if they clearly describe a significant physical or mental health problem ' +
      'that needs medical care; otherwise "none". When it is not "none", leave "question" empty and keep "reflection" to one warm sentence; ' +
      'the app will take over with the right support.\n\n' +
      'THE SATIR ICEBERG, from the surface down: ' + ICEBERG.map(function (l) { return l.label + ' (' + l.cn + ')'; }).join(' > ') + '.\n' +
      'SYSTEMIC THINKING: see the problem as part of a living system of people, patterns and loops, never as the fault of one person. ' +
      'Prefer circular causality ("what happens then, and what does that lead to?") to blame. Lenses: ' +
      SYSTEM_LENSES.map(function (l) { return l.label + ' (' + l.cn + '): ' + l.lens; }).join('; ') + '. ' +
      'In the See the system stage, use these lenses one at a time; in later stages, let the system view inform the principles and the step they choose, ' +
      'including what else their step might change. Respect the people who are not in the room: describe them fairly.\n' +
      'THE FIVE LIFE PRINCIPLES (use in this order): ' + PRINCIPLES.map(function (p) { return p.label + ' (' + p.cn + '): ' + p.lens; }).join('; ') + '.\n\n' +
      'PERSON PROFILE FROM THE CHARTS (hypotheses only):\n' + (prof || 'Not available.') + '\n\n' +
      'SESSION\n' +
      'Topic they brought: ' + (s.topic || 'not stated yet') + '\n' +
      'What they hope for by the end: ' + (s.hope || 'not stated yet') + '\n' +
      'Current stage: ' + st.label + ' (' + st.cn + ') - ' + st.aim + '\n' +
      'Turns already spent in this stage: ' + s.inStage + ' (aim for ' + st.min + ' to ' + st.max + ')\n' +
      'Deepest iceberg layer reached so far: ' + (s.layer >= 0 ? ICEBERG[s.layer].label : 'none yet') + '\n' +
      (s.principle >= 0 ? 'Last principle explored: ' + PRINCIPLES[s.principle].label + '\n' : '') +
      (s.lensesUsed && s.lensesUsed.length ? 'Systems lenses already used: ' + s.lensesUsed.map(function (i) { return SYSTEM_LENSES[i].label; }).join(', ') + '\n' : '') +
      (s.people && s.people.length ? 'People and parts of the system named so far: ' + s.people.join(', ') + '\n' : '') +
      (s.loops && s.loops.length ? 'Loops noticed so far: ' + s.loops.join(' | ') + '\n' : '') +
      (s.insights.length ? 'Insights they have voiced: ' + s.insights.join(' | ') + '\n' : '') +
      '\nCONVERSATION SO FAR\n' + last.map(function (t) { return (t.who === 'coach' ? 'Coach: ' : 'Coachee: ') + t.text; }).join('\n') + '\n\n' +
      'Return STRICT JSON with these fields:\n' +
      '{ "safety": "none | self_harm | abuse | health",\n' +
      '  "reflection": "one or two sentences mirroring them",\n' +
      '  "question": "exactly one open question that fits the current stage",\n' +
      '  "layer": "the iceberg layer this question works on: ' + ICEBERG.map(function (l) { return l.key; }).join(' | ') + ' | none",\n' +
      '  "principle": "fact | order | balance | wholeness | flow | none",\n' +
      '  "lens": "the systems lens this question uses: ' + SYSTEM_LENSES.map(function (l) { return l.key; }).join(' | ') + ' | none",\n' +
      '  "people": ["people, roles or groups in their system that their last message named or implied, e.g. business partner, my team; empty if none new"],\n' +
      '  "loop": "if their last message revealed a repeating cycle, one line in the form A leads to B, which leads back to A; otherwise empty",\n' +
      '  "chartLink": "if you drew on the chart profile, a few words naming the pattern; otherwise empty",\n' +
      '  "insight": "if their last message voiced a new insight, a short quote or paraphrase; otherwise empty",\n' +
      '  "readyToMoveOn": true if, after the coachee answers this question, this stage\'s aim will have been met and the session should move to the next stage }';
  }

  var SUMMARY_SCHEMA = { type: 'object', properties: {
    title: { type: 'string' }, summary: { type: 'string' }, insights: { type: 'array', items: { type: 'string' } },
    yearning: { type: 'string' }, systemView: { type: 'string' }, principles: { type: 'string' }, commitment: { type: 'string' }, followUp: { type: 'string' } },
    required: ['title', 'summary', 'insights', 'yearning', 'systemView', 'principles', 'commitment', 'followUp'] };

  function summaryPrompt(s) {
    return 'You are a mindset coach writing a short, warm session summary for the coachee to keep. Use their own words where you can. ' +
      'English, with Chinese framework terms in brackets on first use. Do not add advice they did not choose, and do not predict anything.\n\n' +
      'Topic: ' + (s.topic || 'not stated') + '\nHope for the session: ' + (s.hope || 'not stated') + '\n' +
      (s.people && s.people.length ? 'People in their system: ' + s.people.join(', ') + '\n' : '') +
      (s.loops && s.loops.length ? 'Loops noticed: ' + s.loops.join(' | ') + '\n' : '') + '\nCONVERSATION\n' +
      s.turns.map(function (t) { return (t.who === 'coach' ? 'Coach: ' : 'Coachee: ') + t.text; }).join('\n') + '\n\n' +
      'Return STRICT JSON:\n{ "title": "a 3 to 6 word title for the session",\n  "summary": "what they explored and how it shifted (60-110 words)",\n' +
      '  "insights": ["each insight they reached, in their words"],\n  "yearning": "the deeper yearning (渴望) that surfaced, or empty",\n' +
      '  "systemView": "the wider system they saw: who is part of it, the pattern or loop that keeps it going, their own part in it, and what their step might set moving (50-90 words), or empty",\n' +
      '  "principles": "what the five life principles showed them (40-80 words), or empty",\n' +
      '  "commitment": "the step they committed to and when, or empty",\n  "followUp": "one open question to reflect on before the next session" }';
  }

  global.QPCoach = { STAGES: STAGES, ICEBERG: ICEBERG, PRINCIPLES: PRINCIPLES, SYSTEM_LENSES: SYSTEM_LENSES, upgrade: upgrade, SAFETY: SAFETY, HELPLINES: HELPLINES,
    screen: screen, detectCountry: detectCountry, profile: profile, newSession: newSession, OPENING: OPENING, advance: advance,
    TURN_SCHEMA: TURN_SCHEMA, turnPrompt: turnPrompt, SUMMARY_SCHEMA: SUMMARY_SCHEMA, summaryPrompt: summaryPrompt };
})(typeof window !== 'undefined' ? window : this);
