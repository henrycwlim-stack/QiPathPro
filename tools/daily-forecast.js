// The daily forecast email. Reads today against the person's own charts with the app's engine, and sends it through Gmail.
// Run by .github/workflows/daily-forecast.yml at 06:00 Singapore time, beside the Qimen structures email.
//
//   DRY_RUN=1 QP_BIRTH="1972-08-13 02:15 M" node tools/daily-forecast.js   # writes daily-forecast.html instead of sending
//
// Environment (repository secrets in the workflow, shared with the structures email):
//   QP_SMTP_USER, QP_SMTP_PASS, QP_MAIL_TO   Gmail sender, its app password, and the recipient
//   QP_BIRTH                                  "YYYY-MM-DD HH:MM M|F", needed for the personal readings
//   QP_BIRTH_TZ                               optional birth time zone offset in hours (default 8)
//
// Sections: the day at a glance; BaZi (the day against your Four Pillars and current luck pillar); Qimen (where your Day
// Master stands on the day plate); Zi Wei (the day's Four Transformations in your natal palaces); the Tong Shu almanac
// (day officer, duty spirit, mansion, do and avoid); the day's hexagram; the best and worst hours with why; good directions.
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'www', 'js');
global.window = globalThis;
global.localStorage = { getItem() { return null; }, setItem() {} };
for (const f of ['qpdata', 'structures', 'ephem-terms', 'astro', 'core', 'systems', 'fengshui', 'bazi', 'xiu', 'guidance', 'qmdj'])
  vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f });
const C = QPCore, S = QPSystems, A = QPAstro, Q = QPQimen, G = QPGuide;

const env = process.env;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Today in the workflow's time zone (TZ=Asia/Singapore), as the app reads it on the phone.
const t = new Date(), today = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
const iso = today.y + '-' + String(today.m).padStart(2, '0') + '-' + String(today.d).padStart(2, '0');

/* ---------------- the person ---------------- */
const bm = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s+([MF])$/i.exec((env.QP_BIRTH || '').trim());
let user = null;
if (bm) {
  const birth = { y: +bm[1], m: +bm[2], d: +bm[3], hour: +bm[4], min: +bm[5], tz: parseFloat(env.QP_BIRTH_TZ || '8') };
  const gender = bm[6].toUpperCase(), pillars = C.birthPillars(birth), lunar = A.toLunar(birth.y, birth.m, birth.d);
  const deep = QPBazi.analyse(pillars, gender);
  user = { birth, gender, pillars, deep, bazi: S.analyseBazi(pillars), favourable: deep.favourable, zodiacBranch: pillars.year.branch,
    dayMasterElem: deep.dayMasterElem, luck: S.luckPillars(pillars, gender, birth),
    zwds: S.zwds(lunar, pillars.hourBranch, pillars.year.stem, pillars.year.branch) };
}

/* ---------------- the day ---------------- */
const day = G.daily(today, user);
const dp = day.pillars;
const ELEM = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const tone = (v) => (v > 0 ? 'good' : v < 0 ? 'care' : 'neutral');
const verdict = { good: 'Supportive', care: 'Take care', neutral: 'Steady' };

// BaZi: the day's stem as one of the Ten Gods to your Day Master, its element against your useful elements,
// the day's branch against your own branches, and the luck pillar you are in.
const TEN_GOD_MEANING = {
  'Friend': 'a day of peers and independence: good for working alongside equals; watch stubbornness.',
  'Rob Wealth': 'a day of competition and spending: guard money, and avoid lending or speculating.',
  'Eating God': 'a day of ease and expression: good for creative work, hospitality and enjoying your skills.',
  'Hurting Officer': 'a day of bold ideas and frank words: good for pitching and innovating; mind what you say to seniors.',
  'Indirect Wealth': 'a day of openings and deals: good for sales and networking; keep risks within your means.',
  'Direct Wealth': 'a day of steady earning: good for money paperwork, collections and diligent work.',
  'Seven Killings': 'a day of pressure and challenge: act decisively but avoid confrontation, and take care physically.',
  'Direct Officer': 'a day of order and standing: good for formal meetings, applications and keeping commitments.',
  'Indirect Resource': 'a day of insight: good for research, reflection and unusual ideas; avoid isolating yourself.',
  'Direct Resource': 'a day of support: good for study, asking mentors for help and looking after yourself.'
};
function bazi() {
  if (!user) return null;
  const dm = user.pillars.day.stem, god = C.tenGod(dm, dp.day.stem), notes = [];
  let v = 0;
  const se = C.STEM_ELEM[dp.day.stem], be = C.BRANCH_ELEM ? C.BRANCH_ELEM[dp.day.branch] : null;
  if (user.deep.favourable.indexOf(se) >= 0) { v++; notes.push('The day\'s stem ' + C.STEMS[dp.day.stem] + ' is ' + ELEM[se] + ', one of your supportive elements.'); }
  else if ((user.deep.unfavourable || []).indexOf(se) >= 0) { v--; notes.push('The day\'s stem ' + C.STEMS[dp.day.stem] + ' is ' + ELEM[se] + ', an element you are better without; keep plans simple.'); }
  const mine = [['day', user.pillars.day.branch, 'your Day pillar (self and partner)'], ['year', user.pillars.year.branch, 'your Year pillar (sign and family)'],
    ['month', user.pillars.month.branch, 'your Month pillar (work and parents)']];
  mine.forEach((m) => {
    if (dp.day.branch === C.branchClash(m[1])) { v--; notes.push('The day\'s branch ' + C.BRANCHES[dp.day.branch] + ' clashes ' + m[2] + ': expect movement or friction there.'); }
    else if (dp.day.branch === C.branchHarm(m[1])) { v++; notes.push('The day\'s branch ' + C.BRANCHES[dp.day.branch] + ' combines with ' + m[2] + ': cooperation comes more easily.'); }
  });
  const age = today.y - user.birth.y, L = (user.luck.pillars || []).filter((x) => age >= x.from && age < x.to)[0];
  const luck = L ? 'You are in the ' + L.pillar.cn + ' luck pillar (ages ' + L.from + ' to ' + L.to + '), ' + C.tenGod(dm, L.pillar.stem).en + ' to your Day Master.' : '';
  return { god, meaning: TEN_GOD_MEANING[god.en] || '', notes, luck, v };
}

// Qimen: the day plate, and the palace where your Day Master stands on it.
function qimen() {
  const res = Q.chartFor('day', { y: today.y, m: today.m, d: today.d, hour: 12, min: 0 }), ch = res.chart;
  const fav = user ? user.deep.favourable : null;
  const all = [1, 2, 3, 4, 6, 7, 8, 9].map((n) => Object.assign({ n, pa: ch.palacesByNumber[n] }, Q.palaceQuality(ch, res.formations, n, fav)))
    .sort((a, b) => b.score - a.score);
  let seat = null;
  if (user) {
    const s = Q.natalSeat(ch, user), pa = ch.palacesByNumber[s.num], q = Q.palaceQuality(ch, res.formations, s.num, fav);
    const v = q.score >= 1.5 ? 1 : q.score <= -1.5 ? -1 : 0;
    seat = { pa, q, stem: s.stem, v, plain: v > 0 ? 'Your own palace is strong today: a good day to act for yourself.'
      : v < 0 ? 'Your own palace is weak today: keep a low profile and let others lead.'
      : 'Your own palace is mixed today: fine for routine work, less so for big moves.' };
  }
  return { chart: ch, best: all.slice(0, 2), worst: all[all.length - 1], seat };
}

// Zi Wei: the day's stem sets its Four Transformations (流日四化); each lands on a star in your natal chart. The day's branch
// also touches one of your twelve palaces.
const HUA_MEANING = ['ease and gains in this area today', 'drive and decisions in this area today',
  'recognition, clarity and helpful people in this area today', 'friction or worry in this area today: go slowly and double-check'];
function ziwei() {
  if (!user) return null;
  const z = user.zwds, where = {};
  z.palaces.forEach((p) => p.stars.concat(p.minors || []).forEach((s) => { where[s] = p; }));
  const lands = S.SIHUA[dp.day.stem].map((star, i) => ({ hua: S.HUA[i], star, palace: where[star] || null, meaning: HUA_MEANING[i] }));
  const touched = z.palaces[dp.day.branch];
  const ji = lands[3].palace, lu = lands[0].palace;
  const v = (lu && lu.isMing ? 1 : 0) - (ji && ji.isMing ? 1 : 0);
  return { lands, touched, v };
}

const B = bazi(), QM = qimen(), ZW = ziwei();
const hours = G.dayHours(today, user).map((h) => Object.assign(h, { detail: G.hourly({ y: today.y, m: today.m, d: today.d, hour: h.branch === 0 ? 23 : h.branch * 2 - 1, min: 30 }, user) }));
const waking = hours.filter((h) => h.branch >= 4 || h.branch === 0);   // 07:00 to 00:59, as the structures email
const best = waking.slice().sort((a, b) => b.timing - a.timing).slice(0, 3);
const worst = waking.slice().sort((a, b) => a.timing - b.timing).slice(0, 2);

/* ---------------- the email ---------------- */
const why = (h) => {
  // The hour's duty door and star set its tone; the duty deity is always the Chief there, so it is not repeated.
  const d = h.detail, star = d.star && typeof d.star === 'object' ? (d.star.char || '') + (d.star.en ? ' ' + d.star.en : '') : (d.star || '');
  const bits = [d.gate + ' (' + d.gateEn + ' Door)' + (star ? ' with ' + star : '')];
  if (d.notes && d.notes.length) { const n = d.notes.join('; '); bits.push(n.charAt(0).toUpperCase() + n.slice(1)); }
  return bits.join('. ') + '.';
};
const color = { good: '#3f8a5c', care: '#b5452f', neutral: '#8a6d2f' };
const box = (title, cn, body, v) => '<div style="border:1px solid #e3ddd0;border-radius:8px;padding:12px 14px;margin:10px 0;background:#fffdf8">' +
  '<div style="font-size:15px"><b>' + title + '</b> <span style="color:#888">' + cn + '</span>' +
  (v === undefined ? '' : ' &nbsp;<span style="color:' + color[tone(v)] + '">' + verdict[tone(v)] + '</span>') + '</div>' + body + '</div>';
const p = (s) => '<div style="font-size:14px;margin:6px 0;line-height:1.55">' + s + '</div>';
const list = (a) => '<ul style="font-size:14px;margin:6px 0;padding-left:18px;line-height:1.55">' + a.map((x) => '<li>' + x + '</li>').join('') + '</ul>';

const dateLine = WD[t.getDay()] + ' ' + today.d + ' ' + MON[today.m - 1] + ' ' + today.y;
const parts = [];
parts.push(box('The day at a glance', '今日', p('<b>' + esc(dp.day.cn) + '</b> day in the ' + esc(dp.month.cn) + ' month of the ' + esc(dp.year.cn) + ' year &middot; ' +
  'lunar ' + esc(day.lunar.monthCn || day.lunar.month) + '/' + esc(day.lunar.dayCn || day.lunar.day) + ' &middot; solar term ' + esc(day.term.name) + ' ' + esc(day.term.en)) +
  p('Almanac score <b>' + day.score + '/100</b>, ' + esc(day.label.toLowerCase()) + (user ? ', read for your sign' : '') + '. ' +
    'Strongest hours ' + best.map((h) => esc(h.range)).join(', ') + '.')));

if (B) parts.push(box('BaZi', '八字', p('Today\'s stem is <b>' + esc(B.god.cn) + ' ' + esc(B.god.en) + '</b> to your ' + esc(user.deep.dayMasterCn) + ' Day Master: ' + esc(B.meaning)) +
  (B.notes.length ? list(B.notes.map(esc)) : '') + (B.luck ? p('<span style="color:#666">' + esc(B.luck) + '</span>') : ''), B.v));

if (QM.seat) parts.push(box('Qimen', '奇门', p('On today\'s day plate (' + esc(QM.chart.dun) + ' ' + QM.chart.ju + ' Ju) your Day Master ' + esc(QM.seat.stem) + ' stands in the <b>' +
  esc(QM.seat.pa.dir) + '</b> palace with ' + esc(QM.seat.pa.gate || 'no door') + ', ' + esc(QM.seat.pa.starCn || '') + ' and ' + esc(QM.seat.pa.spirit || '') +
  (QM.seat.pa.isEmpty ? ', and it is void (空亡) today' : '') + '. ' + esc(QM.seat.plain)) + p('<span style="color:#666">' + esc(QM.seat.q.why.join('; ')) + '</span>'), QM.seat.v));

if (ZW) parts.push(box('Zi Wei', '紫微', p('The ' + esc(C.STEMS[dp.day.stem]) + ' day sets these transformations in your natal chart:') +
  list(ZW.lands.map((l) => '<b>' + esc(l.star + l.hua) + '</b> ' + (l.palace ? 'in your ' + esc(l.palace.nameEn) + ' ' + esc(l.palace.name) + ' palace: ' + esc(l.meaning) : 'not in your chart today'))) +
  p('<span style="color:#666">The day\'s branch ' + esc(C.BRANCHES[dp.day.branch]) + ' touches your ' + esc(ZW.touched.nameEn) + ' ' + esc(ZW.touched.name) + ' palace' +
    (ZW.touched.stars.length ? ' (' + esc(ZW.touched.stars.join('、')) + ')' : '') + '.</span>'), ZW.v));

parts.push(box('Tong Shu almanac', '通胜', p('Day officer <b>' + esc(day.officer.cn) + ' ' + esc(day.officer.en) + '</b> &middot; duty spirit ' + esc(day.duty.cn) +
  ' (' + (day.duty.yellow ? 'yellow path, favourable' : 'black path, guarded') + ') &middot; mansion ' + esc(day.mansion.cn) + '宿 ' + esc(day.mansion.en) +
  ' &middot; clashes the ' + esc(day.clashAnimal) + ' &middot; void ' + esc(day.voids.join(' '))) +
  '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:6px"><tr>' +
  '<td style="vertical-align:top;padding-right:8px;width:50%"><b style="color:#3f8a5c">宜 Do</b>' + list(day.do.map(esc)) + '</td>' +
  '<td style="vertical-align:top;width:50%"><b style="color:#b5452f">忌 Avoid</b>' + list(day.avoid.map(esc)) + '</td></tr></table>'));

parts.push(box('Today\'s hexagram', '易经', p('<b>' + esc(day.hexagram.name) + ' ' + esc(day.hexagram.nameEn) + '</b>, line ' + day.hexagram.moving + ' moving, changing to ' +
  esc(day.hexagram.changedName) + ' ' + esc(day.hexagram.changedNameEn) + '.')));

parts.push(box('Best hours', '吉时', list(best.map((h) => '<b>' + esc(h.range) + '</b> ' + esc(h.branchCn) + ' &middot; ' + h.score + '/10 &middot; ' + esc(h.detail.label) +
  '<br><span style="color:#555">' + esc(why(h)) + ' Good for ' + esc((h.detail.do || []).slice(0, 2).join(', ') || 'steady work') + '. Head or face ' + esc(h.direction) + ' for meetings and travel.</span>'))));
parts.push(box('Hours to avoid', '凶时', list(worst.map((h) => '<b>' + esc(h.range) + '</b> ' + esc(h.branchCn) + ' &middot; ' + h.score + '/10 &middot; ' + esc(h.detail.label) +
  '<br><span style="color:#555">' + esc(why(h)) + ' Avoid ' + esc((h.detail.avoid || []).slice(0, 2).join(', ') || 'big commitments') + '.</span>'))));

parts.push(box('Directions', '方位', list(QM.best.map((x) => '<b style="color:#3f8a5c">' + esc(x.pa.dir) + '</b> — ' + esc(x.pa.gate || '') + ', ' + esc(x.pa.spirit || '') +
  ': a good direction to head or face today for meetings, travel and asking for things.').concat(['<b style="color:#b5452f">' + esc(QM.worst.pa.dir) + '</b> — ' + esc(QM.worst.pa.gate || '') +
  ': avoid heading this way for anything important today.'])) +
  p('<span style="color:#666">For a seated manifestation, follow the Qimen structures email instead: there you sit with your back to the palace.</span>')));

const subject = 'Daily forecast — ' + dateLine + ' · ' + day.label + ' (' + day.score + ')';
const html = '<div style="font-family:Georgia,serif;max-width:760px;margin:auto;color:#222;overflow-wrap:break-word">' +
  '<h2 style="margin:0 0 4px">QiPath Pro · daily forecast</h2><div style="font-size:13px;color:#666">' + esc(dateLine) +
  (user ? ' · read against your BaZi, Qimen and Zi Wei charts' : ' · add QP_BIRTH for the personal readings') + '. Singapore time.</div>' +
  parts.join('') + '<p style="font-size:12px;color:#888;margin-top:20px">Classical timing from QiPath Pro\'s own engine, not a guarantee. ' +
  'It is never a reason to delay, avoid or stop medical care.</p></div>';
const text = subject + '\n\n' + html.replace(/<br>/g, '\n').replace(/<\/(div|li|tr|h2)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n');

if (env.DRY_RUN) {
  fs.writeFileSync(path.join(process.cwd(), 'daily-forecast.html'), html);
  console.log('DRY_RUN: wrote daily-forecast.html — ' + subject + (user ? '' : ' (no QP_BIRTH: personal sections left out)'));
} else {
  const missing = ['QP_SMTP_USER', 'QP_SMTP_PASS', 'QP_MAIL_TO'].filter((k) => !env[k]);
  if (missing.length) { console.error('Missing secret' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + '. See README, "Setting up the 06:00 email".'); process.exit(1); }
  const nodemailer = require('nodemailer');
  nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: env.QP_SMTP_USER.trim(), pass: env.QP_SMTP_PASS.replace(/\s+/g, '') } })
    .sendMail({ from: '"QiPath Pro" <' + env.QP_SMTP_USER.trim() + '>', to: env.QP_MAIL_TO, subject, text, html })
    .then((info) => console.log('Sent: ' + subject + ' (' + info.messageId + ')'),
          (err) => { console.error('Send failed: ' + err.message); process.exit(1); });
}
