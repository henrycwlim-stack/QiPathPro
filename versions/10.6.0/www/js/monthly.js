/* QiPath Pro: the monthly report.
 * One solar month read seven ways (relationships, leadership, creativity, wealth, growth, emotions, wellbeing).
 * Each theme gets a level from the month's life areas, words chosen by the ten god the month brings you,
 * a score for every day, and the best and hardest days. Laid out with the planner's PDF pages.
 */
(function (global) {
  'use strict';
  var C = global.QPCore, MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var LADDER = ['Disruptive', 'Testing', 'Careful', 'Steady', 'Favourable', 'Thriving'];

  function ladder(pct) { return pct >= 50 ? 5 : pct >= 20 ? 4 : pct >= 0 ? 3 : pct >= -20 ? 2 : pct >= -60 ? 1 : 0; }
  function groupOf(i) { return i < 2 ? 'peer' : i < 4 ? 'output' : i < 6 ? 'wealth' : i < 8 ? 'officer' : 'resource'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dayLabel(x) { return x.d + ' ' + MON[x.m - 1]; }
  function isoLabel(s) { return +s.slice(8, 10) + ' ' + MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4); }

  // A thought for the month, by the ten god of the month stem.
  var REFLECT = [
    ['Know where you stand before you move.', 'You are your own best resource this month. Quiet confidence goes further than proving a point.'],
    ['Share the load, but keep the ledger.', 'Other people can speed you up or cost you dearly. Generosity works best with clear terms.'],
    ['Make something simply because it is good.', 'Ease is not laziness. The work you enjoy doing is often the work others remember.'],
    ['Say the true thing in a way it can be heard.', 'A sharp idea only changes things when people can bear to listen to it.'],
    ['Small gains, well kept, become large ones.', 'Opportunity arrives in many shapes this month. Choose the few you can finish.'],
    ['Look after what is already yours.', 'Steady income and honest accounts build more than one lucky win.'],
    ['Pressure shows you where you are strong.', 'Hard demands are not a verdict on you. Meet them one at a time.'],
    ['Be the person others can rely on.', 'Responsibility is a form of respect. Carry it well and it will carry you.'],
    ['Pause long enough to see the other way in.', 'An indirect route, a strange book or an odd conversation may hold the answer.'],
    ['Accept help, then pass it on.', 'Support is around you. Learning to receive it is part of the work this month.']
  ];

  // The stem of the month sets the theme's words; each entry is [paragraph, [title, advice] x 3].
  var TEXT = {
    relationships: {
      peer: ['People like you are close at hand this month: friends, peers and rivals all want your time. Bonds grow through shared activity, though two strong wills can collide, especially at home.',
        [['Do things side by side', 'Plan an activity with someone rather than only talking. Shared effort eases friction.'], ['Agree who decides', 'Settle small questions of who leads before they turn into contests.'], ['Protect your time as a couple', 'Friends may crowd your calendar, so book time for the person closest to you.']]],
      output: ['You express yourself more freely this month, which draws warmth and makes conversation easy. The risk is saying too much, too quickly, and hurting someone without meaning to.',
        [['Listen before you reply', 'Let people finish. A pause turns your quick wit into real attention.'], ['Show affection openly', 'Say the appreciative thing out loud, and make time for fun together.'], ['Soften the critique', 'If you must correct someone, do it in private and start with what works.']]],
      wealth: ['Practical care matters most this month: what you do for people counts for more than what you say. Attraction and new contacts can arrive through work or money matters.',
        [['Help in a practical way', 'Pick one chore or problem you can take off someone\'s plate.'], ['Keep money separate from affection', 'Be clear about loans, gifts and shared costs before they cause resentment.'], ['Say yes to introductions', 'Accept invitations that mix business and social time.']]],
      officer: ['Commitment and duty are in the air. People expect you to be dependable, and some relationships may become more formal or more serious. Too much control, though, can make you hard to be close to.',
        [['Keep your promises small and exact', 'Reliability builds trust faster than grand gestures.'], ['Have the serious talk', 'This is a good month to settle where a relationship stands.'], ['Leave work at the door', 'Do not manage your family as if they were a team at work.']]],
      resource: ['Care flows towards you this month from parents, elders and those who look out for you. You may feel more inward than usual, so people close to you could read your silence as distance.',
        [['Call someone older', 'A visit or a call to a parent or mentor will mean more than you expect.'], ['Accept the kindness', 'Let others look after you, and thank them clearly.'], ['Explain your quiet', 'Tell people when you need space, so they do not take it personally.']]]
    },
    leadership: {
      peer: ['Your independence is high and you will prefer to make your own calls. This suits starting something on your own terms. It suits consensus less, and colleagues may compete for the same ground.',
        [['Back your own judgement', 'Make decisions in your own area without waiting to be asked.'], ['Name the competition', 'Be open about overlapping roles and agree clear lanes.'], ['Build one strong alliance', 'One trusted peer is worth more than wide approval this month.']]],
      output: ['You lead through ideas and persuasion this month. Pitching, presenting and teaching go well. Rules and senior people may feel like obstacles, so choose your battles.',
        [['Present your idea this month', 'Put your proposal in front of the people who can approve it.'], ['Prepare before you challenge', 'Bring evidence and a way forward when you question a senior.'], ['Teach what you know', 'Coaching someone raises your standing and clarifies your own thinking.']]],
      wealth: ['Results and numbers set the agenda. You will decide best by looking at what is practical and what it costs. It is a good month to take charge of budgets, targets and resources.',
        [['Decide with the numbers open', 'Write down the cost and return of each choice before committing.'], ['Delegate the detail', 'Keep your attention on the outcome rather than every step.'], ['Reward people visibly', 'Link effort to reward, and people will follow more readily.']]],
      officer: ['Authority is the theme: promotion, scrutiny, deadlines and higher expectations. Others look to you for a steady hand, and mistakes will be more visible than usual.',
        [['Step up when asked', 'Accept responsibility that is offered, and clarify its limits.'], ['Document your decisions', 'Keep a short written record of what was agreed and why.'], ['Stay within the rules', 'Check compliance and permissions before you act.']]],
      resource: ['This is a month for thinking before acting. You decide better with advice, data and time. Mentors and senior allies are helpful, but too much deliberation can delay what needs doing.',
        [['Ask one wise person', 'Seek the view of someone who has made this decision before.'], ['Set a deadline for deciding', 'Research until a set date, and then choose.'], ['Sign what is ready', 'Paperwork, approvals and agreements move well this month.']]]
    },
    creativity: {
      peer: ['Your best ideas come from your own instincts this month, and from friendly rivalry. Personal projects move faster than group ones.',
        [['Start the personal project', 'Give an idea of your own a fixed hour each week.'], ['Find a sparring partner', 'Share drafts with someone who will push back.'], ['Make it yours', 'Keep your own style rather than following what is popular.']]],
      output: ['This is your most natural creative mode: ideas flow, expression is easy and you are willing to break a few rules. Capture everything, then shape the best of it.',
        [['Capture ideas at once', 'Keep notes close, because good ideas will come at odd moments.'], ['Publish something', 'Share a piece of work this month instead of polishing it further.'], ['Add a little structure', 'A simple routine turns bursts of energy into finished work.']]],
      wealth: ['Creativity is at its best when it solves a practical problem this month. Think about what people would pay for, and what can be built with what you already have.',
        [['Start from a real need', 'Ask who needs this and what it would save them.'], ['Use what you have', 'Limit your materials or budget, and see what that inspires.'], ['Test it cheaply', 'Try a small version before you invest more.']]],
      officer: ['Structure and expectations shape your work this month. Deadlines may narrow your freedom, yet they can also force you to finish. Original ideas need a careful route to approval.',
        [['Treat limits as a brief', 'Use the rules you are given as the shape of the problem.'], ['Protect some free time', 'Keep one hour a week with no target attached.'], ['Finish what is due', 'Clearing old commitments makes room for new ideas.']]],
      resource: ['Inspiration comes from taking things in rather than pushing things out: reading, study, travel and quiet. It may feel slow, but it feeds the next productive phase.',
        [['Read outside your field', 'Look for ideas in a subject you know little about.'], ['Learn a new technique', 'Take a short course or copy a master for practice.'], ['Rest between sessions', 'Let your mind wander. Do not judge the quiet as lost time.']]]
    },
    wealth: {
      peer: ['Money tends to be shared or contested this month. Partnerships and group ventures are possible, but costs can rise through other people. Keep your own finances clearly separate.',
        [['Put terms in writing', 'Agree shares and responsibilities before any joint venture.'], ['Hold off on guarantees', 'Avoid lending money or standing surety for others this month.'], ['Review shared costs', 'Check subscriptions, group expenses and anything paid on someone\'s behalf.']]],
      output: ['Your skills are what earn this month. Income follows what you make, teach or sell, so visibility turns directly into opportunity. Spending on enjoyment may also rise.',
        [['Sell what you know', 'Offer a service, a lesson or a piece of work for a fee.'], ['Raise your profile', 'Tell people what you do. Opportunities follow visibility.'], ['Set a fun budget', 'Decide your limit for treats before the month begins.']]],
      wealth: ['Money is directly in focus. Deals, income and opportunities are more active, and so is the temptation to take on too many. Focus on those you can see through.',
        [['Act on the best two', 'Rank opportunities, then pursue only the top two.'], ['Check your accounts', 'Review cash flow, and bring your records up to date.'], ['Negotiate this month', 'Good terms are within reach, so ask for them.']]],
      officer: ['Money comes through your position this month: salary, title and formal agreements. Tax, compliance and contracts deserve attention, and caution beats risk.',
        [['Ask about your terms', 'Raise pay or conditions with evidence of your results.'], ['Check the paperwork', 'Review tax, insurance and contract dates.'], ['Avoid speculation', 'Prefer known returns over exciting promises.']]],
      resource: ['This is a month to protect and plan rather than chase. Property, insurance, long-term savings and learning are favoured over quick returns.',
        [['Make a long-term plan', 'Write down where you want your assets to be in five years.'], ['Invest in skills', 'Spend on training that will raise what you can earn.'], ['Review protection', 'Check your insurance and your emergency fund.']]]
    },
    growth: {
      peer: ['The lesson this month is self-reliance: knowing what you stand for, and telling apart confidence from stubbornness.',
        [['Write down your values', 'List five things you will not compromise on.'], ['Notice when you compete', 'Ask whether you want the goal, or just to win.'], ['Do one thing alone', 'Take on a small challenge without help.']]],
      output: ['The lesson this month is expression: finding your voice and learning what your words do to other people.',
        [['Keep a journal', 'Write freely for ten minutes a day, without editing.'], ['Ask for feedback', 'Find out how your communication lands with others.'], ['Try a new outlet', 'Speak, write, draw or perform, and notice what feels alive.']]],
      wealth: ['The lesson this month is what you value: where your time and money really go, and whether that matches what you say matters.',
        [['Track one week', 'Note where your time and money go, without judging.'], ['Set one measurable goal', 'Choose something you can count by the end of the month.'], ['Learn to stop', 'Drop one commitment that no longer pays you back in any way.']]],
      officer: ['The lesson this month is discipline: how you respond to pressure, and whether you can hold a standard without being harsh on yourself.',
        [['Build one firm habit', 'Choose one daily action and keep to it all month.'], ['Find your limit', 'Practise saying no to what you cannot do properly.'], ['Review your month kindly', 'Note what you handled well as well as what fell short.']]],
      resource: ['The lesson this month is learning and receptivity: studying, reflecting and allowing yourself to be taught.',
        [['Choose one subject', 'Go deep into a single topic instead of skimming many.'], ['Find a teacher', 'Ask someone whose judgement you respect to guide you.'], ['Make time for stillness', 'Spend a few minutes each day sitting quietly.']]]
    }
  };
  // Emotions follow the element that dominates the month: Fire joy, Earth trust, Metal sadness, Water fear, Wood frustration.
  var EMOTION = ['Frustration', 'Joy', 'Trust', 'Sadness', 'Fear'];
  var EMO_TEXT = [
    ['Wood energy is strong, so impatience and frustration can rise quickly, particularly when plans are blocked. The same energy gives you drive when it has somewhere to go.',
      [['Move your body', 'Use exercise to burn off irritation before you respond to anyone.'], ['Count to ten, literally', 'Delay angry messages until the next morning.'], ['Give drive a target', 'Pick one goal to push towards, so the energy has a direction.']]],
    ['Fire energy is strong, bringing warmth, enthusiasm and sociability. It can also tip into restlessness and sleeping badly, or over-promising when you feel good.',
      [['Enjoy it with others', 'Say yes to good company, and share your good mood.'], ['Wind down at night', 'Put screens away an hour before bed.'], ['Sleep on big promises', 'Wait a day before committing to something in a moment of excitement.']]],
    ['Earth energy is strong, so you will look for steadiness and trust. You may also worry and overthink, and take on other people\'s problems.',
      [['Write down worries', 'Getting them on paper stops them going round in your head.'], ['Keep regular routines', 'Regular meals and bedtimes steady your mood.'], ['Hand problems back', 'Support people without taking over what is theirs.']]],
    ['Metal energy is strong, which brings clarity but also a tendency towards sadness, regret and holding yourself apart. Old losses may come to mind.',
      [['Let yourself grieve small things', 'Acknowledge what has ended, instead of pushing it away.'], ['Breathe outdoors', 'Walk in fresh air and take slow, deep breaths.'], ['Clear some space', 'Tidy a room or give things away. Letting go physically helps.']]],
    ['Water energy is strong, deepening intuition but also fear and uncertainty, especially about the future. You may withdraw more than usual.',
      [['Name the fear', 'Write down exactly what you are afraid of, and what you would do if it happened.'], ['Stay connected', 'Keep in regular contact, even when you would rather hide away.'], ['Trust your instincts, and check', 'Note your gut feeling, then confirm it with facts.']]]
  ];
  var ZONE = [
    { zone: 'Liver, gallbladder, tendons and eyes', tend: 'tension, irritability and tight muscles', recs: [['Stretch daily', 'Gentle stretching keeps tendons and joints supple.'], ['Rest your eyes', 'Take regular breaks away from screens.'], ['Go easy on alcohol', 'Give your liver a lighter month.']] },
    { zone: 'Heart, blood circulation and sleep', tend: 'overstimulation and restless sleep', recs: [['Keep a calm evening', 'Build a bedtime routine and keep to a regular hour.'], ['Limit caffeine', 'Cut back, especially after midday.'], ['Try slower exercise', 'Choose tai chi, walking or yoga when you feel wired.']] },
    { zone: 'Stomach, spleen and digestion', tend: 'sluggishness, overthinking and irregular eating', recs: [['Eat at regular times', 'Sit down to warm, simple meals.'], ['Keep moving', 'A daily walk stops energy from going stale.'], ['Cut back on sugar', 'Steadier blood sugar brings steadier energy.']] },
    { zone: 'Lungs, skin and large intestine', tend: 'tiredness, low spirits and dryness', recs: [['Breathe deeply', 'Practise slow breathing outdoors each day.'], ['Keep hydrated', 'Drink water regularly and care for your skin.'], ['Protect your chest', 'Dress warmly, and rest early if a cough begins.']] },
    { zone: 'Kidneys, bladder, bones and hearing', tend: 'low reserves, chills and lower back strain', recs: [['Protect your sleep', 'Early nights rebuild your reserves.'], ['Keep warm', 'Protect your lower back and feet from the cold.'], ['Lift with care', 'Avoid straining your back and knees.']] }
  ];
  var KEY_TEXT = {
    relationships: ['A good day to reach out, repair a rift or begin something new with someone. People are more receptive.', 'Tempers may run short. Avoid ultimatums, and leave difficult conversations for another day.'],
    leadership: ['A strong day to announce a decision, make your case or take the lead. People are more likely to back you.', 'Support may be harder to win, and criticism easier to attract. Check your wording before you speak or send.'],
    creativity: ['Ideas should flow easily. Set aside time for brainstorming or for your most original work.', 'You may feel blocked. Do routine tasks, or look for inspiration from other people, rather than forcing it.'],
    wealth: ['A good day for negotiating, invoicing, pitching or making a financial decision you have already researched.', 'Avoid signing, lending or large purchases if you can. Double-check any figures.'],
    growth: ['A good day to study, reflect, start a habit or ask a mentor for advice.', 'You may feel stuck or self-critical. Keep your expectations modest, and be patient with yourself.'],
    emotions: ['You are likely to feel steadier and more open. A good day for honest conversations.', 'Moods may swing more than usual. Give yourself extra time and avoid decisions made in the heat of the moment.'],
    wellbeing: ['Your energy should be at its best. Use it for demanding physical or mental work.', 'Your energy may be low and your patience short. Rest more, and avoid anything risky or exhausting.']
  };
  var PALACE = { relationships: ['Day', 'your closest relationships'], leadership: ['Month', 'your career and working environment'], creativity: ['Hour', 'your projects and ideas'], wealth: ['Day', 'your personal stability'], growth: ['Year', 'your roots and long-term direction'], emotions: ['Day', 'your inner life'], wellbeing: ['Day', 'your own wellbeing'] };

  function areaPct(areas, weights) {
    var by = {}; areas.forEach(function (a) { by[a.key] = a.score; });
    var t = 0, w = 0; Object.keys(weights).forEach(function (k) { t += by[k] * weights[k]; w += weights[k]; });
    return t / w;
  }
  /** Each element's share of a pillar: the stem half, the branch's hidden stems the other half. */
  function pillarShares(q) {
    var s = [0, 0, 0, 0, 0], h = C.HIDDEN[q.branch];
    s[C.STEM_ELEM[q.stem]] += 50;
    h.forEach(function (x, i) { s[C.STEM_ELEM[x]] += (i === 0 ? 0.6 : 0.4 / Math.max(1, h.length - 1)) * (h.length === 1 ? 50 / 0.6 : 50); });
    return s.map(function (v) { return Math.round(v); });
  }
  function dayScorer(user) {
    var B = global.QPBazi, p = user.pillars, D = user.deep, dm = p.day.stem, M = user.gender === 'M';
    var GODS = { relationships: M ? [4, 5, 2] : [6, 7, 2], leadership: [6, 7, 8], creativity: [2, 3], wealth: [4, 5], growth: [8, 9], emotions: [2, 8, 9], wellbeing: [0, 8, 9] };
    var pillarOf = { Year: p.year, Month: p.month, Day: p.day, Hour: p.hour };
    return function (key, dx) {
      var q = dx.pillar, s = (dx.score - 50) * 0.15, g = GODS[key], label = PALACE[key][0], pal = pillarOf[label];
      if (g.indexOf(C.tenGod(dm, q.stem).i) >= 0) s += 15;
      if (g.indexOf(C.tenGod(dm, C.HIDDEN[q.branch][0]).i) >= 0) s += 10;
      var se = C.STEM_ELEM[q.stem], be = C.BRANCH_ELEM[q.branch];
      if (D.favourable.indexOf(se) >= 0) s += 8; if (D.unfavourable.indexOf(se) >= 0) s -= 8;
      if (D.favourable.indexOf(be) >= 0) s += 5; if (D.unfavourable.indexOf(be) >= 0) s -= 5;
      if (B.SIX_UNION[q.branch] === pal.branch) s += 15;
      B.fourHarms(p, q.branch).forEach(function (h) { if (h.pillar === label && !h.softened) s -= h.kind === 'clash' ? 25 : 12; });
      return clamp(Math.round(50 + s), 0, 100);
    };
  }
  function pick(days, key) {
    var vals = days.map(function (d) { return d[key]; }), hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
    return { best: days.filter(function (d) { return d[key] === hi; }).slice(0, 2).map(function (d) { return d.ref; }),
             worst: days.filter(function (d) { return d[key] === lo; }).slice(0, 2).map(function (d) { return d.ref; }) };
  }
  function palaceNote(user, mp, key) {
    var B = global.QPBazi, p = user.pillars, label = PALACE[key][0], what = PALACE[key][1], pal = { Year: p.year, Month: p.month, Day: p.day, Hour: p.hour }[label];
    var name = mp.en + ' (' + mp.cn + ')', h = B.fourHarms(p, mp.branch).filter(function (x) { return x.pillar === label && !x.softened; })[0];
    if (B.SIX_UNION[mp.branch] === pal.branch) return name + ' combines with your ' + label + ' pillar, which governs ' + what + '. Expect this part of life to draw closer and cooperate more easily.';
    if (h) return name + ' meets your ' + label + ' pillar, which governs ' + what + ', with a ' + h.en.toLowerCase() + ' (' + h.cn + '). Expect some strain here and allow more time.';
    return name + ' has no direct clash or combination with your ' + label + ' pillar, which governs ' + what + ', so results here rest on your own effort.';
  }

  /** The report for the solar month containing start { y, m, d }. */
  function build(user, start) {
    var PL = global.QPPlanner, B = global.QPBazi, p = user.pillars, dm = p.day.stem, D = user.deep;
    var m = PL.buildMonth(user, PL.solarMonths(start)[0]), mp = m.pillar, areas = m.areas, fav = D.favourable, unf = D.unfavourable;
    var stemGod = C.tenGod(dm, mp.stem), branchGod = C.tenGod(dm, C.HIDDEN[mp.branch][0]), g = groupOf(stemGod.i);
    var luck = global.QPFib.bazi(user).luck.filter(function (l) { return l.start <= m.start && m.start < l.end; })[0] || null;
    var shares = pillarShares(mp), natal = D.shares;
    var top = shares.indexOf(Math.max.apply(null, shares));
    var balance = shares.reduce(function (t, v, i) { return t + (fav.indexOf(i) >= 0 ? v : unf.indexOf(i) >= 0 ? -v : 0); }, 0) / 100;   // -1 to 1
    var harms = B.fourHarms(p, mp.branch).filter(function (h) { return !h.softened; });

    var raw = {
      relationships: areaPct(areas, { spouse: 4, marriage: 3, relatives: 2, children: 1 }),
      leadership: areaPct(areas, { career: 5, colleagues: 4, legal: 1 }),
      creativity: areaPct(areas, { education: 2, career: 1 }) + ([2, 3].indexOf(stemGod.i) >= 0 ? 1 : 0) + ([2, 3].indexOf(branchGod.i) >= 0 ? 0.5 : 0) + ([6, 7].indexOf(stemGod.i) >= 0 ? -0.5 : 0),
      wealth: areaPct(areas, { finance: 1, wealth: 1 }),
      growth: areaPct(areas, { education: 2, travel: 1 }) + ([8, 9].indexOf(stemGod.i) >= 0 ? 0.75 : 0),
      emotions: balance * 1.5 - harms.length * 0.4 + m.seat.score / 6,
      wellbeing: areaPct(areas, { health: 3 }) * 0.8 + balance * 0.7
    };
    var score = dayScorer(user);
    var days = m.days.map(function (d) {
      var o = { ref: d, emo: pillarShares(d.pillar) };
      Object.keys(raw).forEach(function (k) { o[k] = score(k, d); });
      return o;
    });
    var watch = [C.STEM_ELEM[mp.stem], C.BRANCH_ELEM[mp.branch]].filter(function (e) { return unf.indexOf(e) >= 0; })[0];
    if (watch === undefined) watch = D.dayMasterElem;
    var LABEL = { relationships: ['Relationships and communication', '人際'], leadership: ['Decisions and leadership', '決策'], creativity: ['Creativity and new ideas', '創意'], wealth: ['Wealth and money', '財運'], growth: ['Personal growth', '成長'], emotions: ['Emotional balance', '情緒'], wellbeing: ['Wellbeing', '健康'] };
    var themes = Object.keys(raw).map(function (k) {
      var pct = Math.round(clamp(raw[k] / 4.5, -1, 1) * 100), step = ladder(pct), kd = pick(days, k), lead, recs;
      if (k === 'emotions') { lead = EMO_TEXT[top][0]; recs = EMO_TEXT[top][1]; }
      else if (k === 'wellbeing') {
        lead = 'This month your attention belongs on the ' + ZONE[watch].zone.toLowerCase() + '. The chart suggests a tendency towards ' + ZONE[watch].tend + '. Your choices count for more than any chart, and a persistent symptom should go to a doctor.';
        recs = ZONE[watch].recs;
      } else { lead = TEXT[k][g][0]; recs = TEXT[k][g][1]; }
      return { key: k, label: LABEL[k][0], cn: LABEL[k][1], pct: pct, step: step, level: LADDER[step], lead: lead, recs: recs,
        note: palaceNote(user, mp, k), best: kd.best, worst: kd.worst, bestText: KEY_TEXT[k][0], worstText: KEY_TEXT[k][1],
        series: days.map(function (d) { return d[k]; }) };
    });
    var themeBy = {}; themes.forEach(function (t) { themeBy[t.key] = t; });
    // Good dates: money days carry the wealth star; reset days carry resource. Neither falls on a day that clashes the zodiac sign.
    var clear = days.filter(function (d) { return d.ref.pillar.branch !== C.branchClash(user.zodiacBranch); });
    var carrying = function (set) { return clear.filter(function (d) { var q = d.ref.pillar; return set.indexOf(C.tenGod(dm, q.stem).i) >= 0 || set.indexOf(C.tenGod(dm, C.HIDDEN[q.branch][0]).i) >= 0; }); };
    var money = carrying([4, 5]).sort(function (a, b) { return b.wealth - a.wealth; }).slice(0, 3).map(function (d) { return d.ref; });
    var reset = carrying([8, 9]).sort(function (a, b) { return b.growth - a.growth; }).filter(function (d) { return money.indexOf(d.ref) < 0; }).slice(0, 3).map(function (d) { return d.ref; });
    var ranked = areas.slice().sort(function (a, b) { return b.score - a.score; });
    return { user: user, month: m, pillar: mp, stemGod: stemGod, branchGod: branchGod, luck: luck, themes: themes, themeBy: themeBy, days: days,
      reflect: REFLECT[stemGod.i], overview: overviewText(user, m, stemGod, branchGod, luck, harms, themes),
      opportunities: ranked.slice(0, 3), watchOuts: ranked.slice(-3).reverse(),
      energies: EMOTION.map(function (n, i) { return { name: n, element: C.ELEM_EN[i], natal: natal[i], month: shares[i], series: days.map(function (d) { return d.emo[i]; }) }; }),
      watch: watch, zone: ZONE[watch].zone, gauges: gauges(areas, themeBy, m), money: money, reset: reset };
  }
  function gauges(areas, t, m) {
    var body = t.wellbeing.pct, mind = Math.round((t.emotions.pct + t.growth.pct) / 2), spirit = Math.round(clamp(m.seat.score / 3, -1, 1) * 100);
    var word = function (v) { return v >= 40 ? 'Excellent' : v >= 10 ? 'Good' : v >= -25 ? 'Average' : 'Challenging'; };
    return [['Body', body], ['Mind', mind], ['Spirit', spirit]].map(function (x) { return { name: x[0], pct: x[1], word: word(x[1]) }; });
  }
  function overviewText(user, m, sg, bg, luck, harms, themes) {
    var mp = m.pillar, ranked = themes.slice().sort(function (a, b) { return b.pct - a.pct; });
    var out = ['This month runs on ' + mp.en + ' (' + mp.cn + '), which brings you ' + sg.en + ' (' + sg.cn + ') on the surface and ' + bg.en + ' (' + bg.cn + ') underneath. ' + global.QPPlanner.godPlain(sg.i)];
    if (luck) out.push('It sits inside your ' + luck.pillar.cn + ' luck pillar (' + luck.god.en + '), which sets the background for this decade.');
    out.push('Your best-supported theme is ' + ranked[0].label.toLowerCase() + ' (' + ranked[0].level.toLowerCase() + '), and the one that needs most care is ' + ranked[6].label.toLowerCase() + ' (' + ranked[6].level.toLowerCase() + ').');
    if (harms.length) out.push('The month also ' + (harms[0].kind === 'clash' ? 'clashes with' : 'presses on') + ' your ' + harms[0].pillar + ' pillar: ' + harms[0].note);
    out.push('On the Qimen plate your Day Stem sits in the ' + m.seat.dir + ' palace, ' + m.seat.word + '.');
    return out;
  }

  /* ---------------- PDF pages ---------------- */
  var INK = '#2A211A', SOFT = '#6D6053', RULE = '#D8CDB9', RED = '#A8341F', GREEN = '#3E7355', BAR = '#E9E0CF', W = 595, M = 42;

  function ladderBar(d, t) {
    d.ensure(40);
    var y = d.y + 2, w = (W - 2 * M) / 6;
    LADDER.forEach(function (n, i) {
      var on = i === t.step;
      d.rect(M + i * w + 1, y, w - 2, 20, on ? (i >= 3 ? GREEN : RED) : BAR);
      d.text(n, M + i * w + w / 2, y + 13.5, 8, on ? '#FFFFFF' : SOFT, 'center', on);
    });
    d.y += 28;
  }
  function dayBars(d, series, m, best, worst, h) {
    h = h || 60;
    d.ensure(h + 18);
    var y0 = d.y, cw = (W - 2 * M) / series.length, isOn = function (l, x) { return l.indexOf(x) >= 0; };
    series.forEach(function (v, i) {
      var x = M + i * cw, dx = m.days[i], hh = Math.max(2, v / 100 * h);
      var tone = best && isOn(best, dx) ? GREEN : worst && isOn(worst, dx) ? RED : '#BFB39E';
      d.rect(x + 1, y0 + h - hh, Math.max(1, cw - 2), hh, tone);
      if (i % 2 === 0 || series.length < 20) d.text(String(dx.d), x + cw / 2, y0 + h + 10, 6.5, SOFT, 'center');
    });
    d.line(M, y0 + h, W - M, y0 + h, RULE);
    d.y += h + 16;
  }
  function recsBlock(d, recs) {
    recs.forEach(function (r) {
      d.para(r[0], { size: 10, bold: true, after: 0 });
      d.para(r[1], { size: 9.5, after: 6 });
    });
  }
  function keyDates(d, t) {
    d.para('Best: ' + t.best.map(dayLabel).join(' and '), { size: 9.5, bold: true, color: GREEN, after: 0 });
    d.para(t.bestText, { size: 9.5, after: 6 });
    d.para('Hardest: ' + t.worst.map(dayLabel).join(' and '), { size: 9.5, bold: true, color: RED, after: 0 });
    d.para(t.worstText, { size: 9.5, after: 6 });
  }
  function drawPillars(d, r) {
    var u = r.user, p = u.pillars, m = r.month, cols = [];
    if (r.luck) cols.push(['Luck', r.luck.pillar]);
    cols.push(['Year', m.res.pillars.year], ['Month', r.pillar], ['Your hour', p.hour], ['Your day', p.day], ['Your month', p.month], ['Your year', p.year]);
    var cw = (W - 2 * M) / cols.length, y = d.y;
    d.ensure(72); y = d.y;
    cols.forEach(function (c, i) {
      var x = M + i * cw + cw / 2, hl = c[0] === 'Month';
      if (hl) d.rect(M + i * cw, y, cw, 66, '#F1EADB');
      d.g.strokeStyle = RULE; d.g.lineWidth = 0.6; d.g.strokeRect(M + i * cw, y, cw, 66);
      d.text(c[0], x, y + 11, 7, SOFT, 'center');
      d.text(C.STEMS[c[1].stem], x, y + 32, 15, INK, 'center', true);
      d.text(C.BRANCHES[c[1].branch], x, y + 52, 15, INK, 'center', true);
    });
    d.y += 72;
  }
  function balanceChart(d, r) {
    d.ensure(r.themes.length * 19 + 16);
    var lw = 158, x0 = M + lw, w = W - M - x0, mid = x0 + w / 2, y0 = d.y;
    r.themes.forEach(function (t) {
      var y = d.y, len = Math.abs(t.pct) / 100 * (w / 2);
      d.text(t.label, x0 - 8, y + 11, 8.5, INK, 'right');
      d.rect(x0, y + 3, w, 11, BAR);
      d.rect(t.pct >= 0 ? mid : mid - len, y + 3, Math.max(1, len), 11, t.pct >= 0 ? GREEN : RED);
      d.text((t.pct > 0 ? '+' : '') + t.pct, t.pct >= 0 ? mid - 4 : mid + 4, y + 12, 7.5, INK, t.pct >= 0 ? 'right' : 'left', true);
      d.y += 19;
    });
    d.line(mid, y0, mid, d.y, INK, 0.7);
    d.y += 4;
  }
  function themePage(d, r, t) {
    d.page();
    d.title(t.label, r.pillar.cn + ' month · ' + isoLabel(r.month.start) + ' to ' + isoLabel(r.month.end) + ' · level ' + (t.pct > 0 ? '+' : '') + t.pct);
    ladderBar(d, t);
    d.para(t.lead, { size: 10.5, after: 7 });
    if (t.key !== 'emotions') d.para(t.note, { size: 10, color: SOFT, after: 7 });
    if (t.key === 'wealth') {
      var num = [1, 2, 3, 4, 6, 7, 8, 9].filter(function (n) { return r.month.res.chart.palacesByNumber[n].gate === '生门'; })[0];
      if (num) { var pa = r.month.res.chart.palacesByNumber[num];
        d.para('The Life Door (生门), the sign of profit, is in the ' + pa.dir + ' this month' + (pa.isEmpty ? ', but void, so check that promised money is real.' : '. Face or work towards that direction for money matters.'), { size: 10, after: 7 }); }
    }
    if (t.key === 'emotions') {
      d.h2('Your five energies', 'your birth chart, and this month');
      r.energies.forEach(function (e) {
        d.ensure(28);
        var y = d.y, x0 = M + 92, w = W - M - x0 - 30;
        d.text(e.name + ' · ' + e.element, M, y + 11, 8.5, INK);
        d.rect(x0, y + 2, w, 6, BAR); d.rect(x0, y + 2, Math.max(1, e.natal / 100 * w), 6, '#96742A');
        d.rect(x0, y + 11, w, 6, BAR); d.rect(x0, y + 11, Math.max(1, e.month / 100 * w), 6, GREEN);
        d.text(e.natal + '%', W - M, y + 8, 7.5, '#96742A', 'right'); d.text(e.month + '%', W - M, y + 17, 7.5, GREEN, 'right');
        d.y += 23;
      });
      d.para('Gold: your birth chart. Green: this month.', { size: 8, color: SOFT });
    }
    if (t.key === 'wellbeing') {
      d.h2('Body, mind and spirit');
      r.gauges.forEach(function (g) { d.kv(g.name, g.word + ' (' + (g.pct > 0 ? '+' : '') + g.pct + ')', 70); });
      d.kv('Zone to watch', r.zone, 70);
    }
    d.h2('What to do');
    recsBlock(d, t.recs);
    d.h2('Day by day', 'green: best day · red: hardest day');
    dayBars(d, t.series, r.month, t.best, t.worst);
    keyDates(d, t);
  }
  function calendarPage(d, r) {
    d.page();
    d.title('Good dates', isoLabel(r.month.start) + ' to ' + isoLabel(r.month.end));
    var A = global.QPAstro, days = r.month.days, seen = [], cell = (W - 2 * M) / 7, mark = {};
    days.forEach(function (x) { var k = x.y + '-' + x.m; if (seen.indexOf(k) < 0) seen.push(k); });
    r.money.forEach(function (x) { mark[x.y + '-' + x.m + '-' + x.d] = 'money'; });
    r.reset.forEach(function (x) { mark[x.y + '-' + x.m + '-' + x.d] = 'reset'; });
    var inMonth = {}; days.forEach(function (x) { inMonth[x.y + '-' + x.m + '-' + x.d] = 1; });
    seen.forEach(function (k) {
      var y = +k.split('-')[0], mo = +k.split('-')[1], first = A.weekday(A.civilJDN(y, mo, 1)), n = new Date(y, mo, 0).getDate();
      var rows = Math.ceil((first + n) / 7), h = 40;
      d.ensure(rows * h + 34);
      d.text(MON[mo - 1] + ' ' + y, M, d.y + 11, 11, RED, 'left', true); d.y += 18;
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (w, j) { d.text(w, M + j * cell + cell / 2, d.y + 8, 7.5, SOFT, 'center'); });
      d.y += 12;
      for (var day = 1; day <= n; day++) {
        var at = first + day - 1, x = M + (at % 7) * cell, yy = d.y + Math.floor(at / 7) * h, key = y + '-' + mo + '-' + day, mk = mark[key], live = inMonth[key];
        if (mk) d.rect(x + 1, yy + 1, cell - 2, h - 2, mk === 'money' ? '#E8DFC3' : '#DDE7DA');
        d.g.strokeStyle = RULE; d.g.lineWidth = 0.5; d.g.strokeRect(x, yy, cell, h);
        d.text(String(day), x + 5, yy + 12, 9, live ? INK : RULE, 'left', !!mk);
        if (mk) d.text(mk === 'money' ? 'Money' : 'Reset', x + cell / 2, yy + 29, 8.5, mk === 'money' ? '#7A5C16' : GREEN, 'center', true);
      }
      d.y += rows * h + 10;
    });
    d.para('Money days', { size: 10, bold: true, color: '#7A5C16', after: 0 });
    d.para('Your wealth star is active. Use these for launches, negotiating, collecting what you are owed, or starting a joint venture.', { size: 9.5, after: 6 });
    d.para('Reset days', { size: 10, bold: true, color: GREEN, after: 0 });
    d.para('Your support star is active. Use these for meditation, clearing out, reviewing your goals and letting go of what no longer helps you.', { size: 9.5, after: 6 });
    d.para('Avoid days that clash with your zodiac sign, ' + C.ZODIAC[r.user.zodiacBranch] + ', for anything important. They are left out above.', { size: 9, color: SOFT });
  }
  function draw(r, onPage) {
    var PL = global.QPPlanner, d = new PL.Doc(r.user, onPage), u = r.user, m = r.month, g, LAC = '#17120E';
    d.footerTitle = 'QiPath Monthly Report';
    d.page(true);
    d.rect(0, 0, W, 842, LAC);
    g = d.g; g.strokeStyle = '#C8A24A'; g.lineWidth = 1; g.strokeRect(24, 24, W - 48, 842 - 48);
    d.rect(48, 226, 54, 3, '#C8452F');
    d.text('QiPath', 48, 280, 46, '#E9DFCC', 'left', true);
    d.text('Monthly Report', 48, 330, 34, '#C8A24A');
    d.text(u.name, 48, 410, 20, '#E9DFCC', 'left', true);
    d.text(isoLabel(m.start) + ' to ' + isoLabel(m.end), 48, 436, 12, '#C8A24A');
    d.text(r.pillar.cn + ' · ' + r.pillar.en + ' month', 48, 456, 11, '#8A7A66');
    d.page();
    d.title('This month at a glance', isoLabel(m.start) + ' to ' + isoLabel(m.end));
    drawPillars(d, r);
    r.overview.forEach(function (s) { d.para(s, { size: 10, after: 6 }); });
    d.h2('A thought for the month');
    d.para(r.reflect[0], { size: 12, bold: true, after: 2 });
    d.para(r.reflect[1], { size: 10, after: 6 });
    d.h2('Seven themes', 'from -100 to +100, with 0 as neutral');
    balanceChart(d, r);
    d.para('These levels are QiPath\'s own scale. They show how this month leans for you, and are not predictions. For medical, legal or financial decisions, see a qualified professional.', { size: 8, color: SOFT });
    d.page();
    d.title('Opportunities and watch-outs');
    d.h2('Where the month helps you');
    r.opportunities.forEach(function (a) { d.para(a.label + ' · ' + a.level, { size: 10, bold: true, color: GREEN, after: 0 }); d.para(a.plain, { size: 9.5, after: 0 }); d.para(a.todo, { size: 9.5, color: SOFT, after: 7 }); });
    d.h2('Where to take care');
    r.watchOuts.forEach(function (a) { d.para(a.label + ' · ' + a.level, { size: 10, bold: true, color: RED, after: 0 }); d.para(a.plain, { size: 9.5, after: 0 }); d.para(a.todo, { size: 9.5, color: SOFT, after: 7 }); });
    d.page();
    d.title('The month plate', 'your Day Stem is marked YOU');
    d.plate(m.res.chart, m.seat.num, 84);
    d.kv('Your position', m.seat.dir + ' · ' + [m.seat.gate, m.seat.star, m.seat.deity].filter(Boolean).join(' ') + ' · ' + m.seat.word);
    d.kv('Directions that help', m.dirs.best.map(function (x) { return x.dir + ' (' + x.gate + ')'; }).join(', '));
    d.kv('Directions to limit', m.dirs.avoid.map(function (x) { return x.dir + ' (' + x.gate + ')'; }).join(', '));
    r.themes.forEach(function (t) { themePage(d, r, t); });
    calendarPage(d, r);
    d.finish();
    return d.n;
  }
  function toPdf(r) {
    var PL = global.QPPlanner, images = [], pages = draw(r, function (cv) { images.push(PL.canvasJpeg(cv)); });
    var safe = String(r.user.name || 'Profile').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Profile';
    return { bytes: PL.pdfFromJpegs(images, 'QiPath Monthly Report', W * 2, 842 * 2), pages: pages, name: 'QiPath-Monthly-' + safe + '-' + r.month.start.slice(0, 7) + '.pdf' };
  }
  global.QPMonthly = { build: build, toPdf: toPdf, draw: draw, LADDER: LADDER };
})(typeof window !== 'undefined' ? window : globalThis);
