// The daily Qimen structures email. Scans every hourly chart for the coming days with the app's own engine
// (QPQimen.structureScan), and sends the strongest structures — today's in full with their charts, then the best of
// the next two months — to one address through Gmail. Run by .github/workflows/qimen-digest.yml at 06:00 SGT.
//
//   DRY_RUN=1 node tools/qimen-digest.js          # writes qimen-digest.html instead of sending
//
// Environment (repository secrets in the workflow):
//   QP_SMTP_USER   the Gmail address that sends
//   QP_SMTP_PASS   a Gmail app password for it (Google Account › Security › App passwords), never the account password
//   QP_MAIL_TO     where the digest goes
//   QP_BIRTH       optional, "1972-08-13 02:15 M": weights palaces by that person's favourable elements, as the app does
//   QP_LINK_BASE   optional, the GitHub Pages address of docs/open/ — each structure links through it into the app
//   QP_DAYS        optional, days to scan (default 60)
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'www', 'js');
global.window = globalThis;
global.localStorage = { getItem() { return null; }, setItem() {} };
for (const f of ['qpdata', 'structures', 'ephem-terms', 'astro', 'core', 'systems', 'fengshui', 'bazi', 'qmdj'])
  vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f });
const C = QPCore, Q = QPQimen;

const env = process.env, DAYS = parseInt(env.QP_DAYS || '60', 10);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Today in the workflow's time zone (TZ=Asia/Singapore), as the app reads it on the phone.
const t = new Date(), today = { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };

let fav = null, who = '';
const bm = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s+([MF])$/i.exec((env.QP_BIRTH || '').trim());
if (bm) {
  const p = C.fourPillars(+bm[1], +bm[2], +bm[3], +bm[4], +bm[5]);
  const deep = QPBazi.analyse(p, bm[6].toUpperCase());
  fav = deep.favourable;
  who = 'weighted for your favourable elements (' + deep.favourableEn.join(', ') + ')';
}

const scan = Q.structureScan(today, DAYS, fav);

function link(s) {
  const q = 'to=manifest&d=' + s.date + '&h=' + s.dt.hour + '&p=' + s.palace.num + (s.formations[0] ? '&f=' + encodeURIComponent(s.formations[0].id) : '');
  return env.QP_LINK_BASE ? env.QP_LINK_BASE.replace(/\/?$/, '/') + '?' + q : 'qipath://manifest?' + q.replace(/^to=manifest&/, '');
}
const dayName = (s) => WD[new Date(s.dt.y, s.dt.m - 1, s.dt.d).getDay()];
// You sit with your back to the structure's palace, so it supports you from behind; you face the opposite way.
const sit = (s) => 'back to ' + s.palace.dir + (Q.OPPOSITE_DIR[s.palace.dir] ? ', facing ' + Q.OPPOSITE_DIR[s.palace.dir] : '');

// The hour's chart as a 3×3 table in Lo Shu order (4 9 2 / 3 5 7 / 8 1 6) — tables, because email clients ignore CSS grid.
function grid(s) {
  const cell = (g) => '<td style="border:1px solid ' + (g.hl ? '#3f8a5c' : '#ddd') + ';background:' + (g.hl ? '#eef7f0' : '#fff') +
    ';padding:5px;text-align:center;vertical-align:top;font-size:12px;line-height:1.4;width:33%' + (g.isEmpty ? ';color:#999' : '') + '">' +
    '<div style="color:#888;font-size:11px">' + g.num + ' ' + esc(g.dir) + '</div>' +
    (g.num === 5 ? esc(g.heaven + g.earth) : '<b>' + esc(g.heaven) + '</b>/' + esc(g.earth) + '<br>' + esc(g.star) + '<br>' + esc(g.gate) + '<br>' + esc(g.deity)) + '</td>';
  let h = '<table style="border-collapse:collapse;width:100%;max-width:480px;margin:8px 0">';   // fills a folded phone, grows on an unfolded one
  for (let r = 0; r < 3; r++) h += '<tr>' + s.grid.slice(r * 3, r * 3 + 3).map(cell).join('') + '</tr>';
  return h + '</table>';
}

function card(s, full) {
  const major = s.formations.filter((f) => f.major);
  return '<div style="border:1px solid #e3ddd0;border-radius:8px;padding:12px 14px;margin:10px 0;background:#fffdf8">' +
    '<div style="font-size:15px"><b>' + dayName(s) + ' ' + s.date + ' · ' + s.range + '</b> &nbsp;<span style="color:#3f8a5c">' + esc(sit(s)) + '</span></div>' +
    '<div style="margin:6px 0;font-size:14px">' + esc(s.summary) + '</div>' +
    '<div style="font-size:13px;color:#555">' + major.map((f) => '<b>' + esc(f.name) + '</b> ' + esc(f.nameEn)).join(' · ') +
      ' · ' + esc(s.gate) + ' · ' + esc(s.deity) + ' · ' + esc(s.heaven + '/' + s.earth) + ' · ' + esc(s.star) + '</div>' +
    (full ? '<ul style="font-size:13px;color:#333;padding-left:18px;margin:8px 0">' +
      major.map((f) => '<li><b>' + esc(f.name) + '</b> — ' + esc(f.description) + '</li>').join('') +
      s.goodFor.map((g) => '<li>' + esc(g) + '</li>').join('') + '</ul>' + grid(s) : '') +
    '<a href="' + esc(link(s)) + '" style="display:inline-block;margin-top:6px;padding:7px 12px;background:#c8452f;color:#fff;border-radius:6px;' +
      'text-decoration:none;font-size:13px">Open the manifestation script</a></div>';
}

const subject = 'Qimen structures — ' + today.y + '-' + String(today.m).padStart(2, '0') + '-' + String(today.d).padStart(2, '0') +
  (scan.today[0] ? ' · best ' + scan.today[0].range + ', back to ' + scan.today[0].palace.dir : '');
const html = '<div style="font-family:Georgia,serif;max-width:760px;margin:auto;color:#222;overflow-wrap:break-word">' +
  '<h2 style="margin:0 0 4px">QiPath Pro · daily Qimen structures</h2>' +
  '<div style="font-size:13px;color:#666">Every hourly chart from today for ' + DAYS + ' days, each palace scored on its auspicious formations ' +
    '(rare ones count most), door, deity, star and stems' + (who ? ', ' + esc(who) : '') + '. Waking hours, 07:00–00:59, Singapore time.</div>' +
  '<h3 style="margin:18px 0 0">Today</h3>' +
  (scan.today.length ? scan.today.map((s) => card(s, true)).join('') : '<p>No strong structure today.</p>') +
  '<h3 style="margin:18px 0 0">The strongest of the next ' + DAYS + ' days</h3>' +
  scan.top.map((s, i) => card(s, i < 5)).join('') +
  '<p style="font-size:12px;color:#888;margin-top:20px">Each button opens the structure\'s manifestation script in QiPath Pro on your phone, ' +
    'with its formations, stems, door, deity and star called out and how to activate each. Classical timing, not a guarantee.</p></div>';
const text = subject + '\n\n' + scan.today.concat(scan.top).map((s) => dayName(s) + ' ' + s.date + ' ' + s.range + ' — ' + sit(s) + ' — ' +
  s.formations.filter((f) => f.major).map((f) => f.name).join(', ') + '\n  ' + s.summary + '\n  ' + link(s)).join('\n\n');

if (env.DRY_RUN) {
  fs.writeFileSync(path.join(process.cwd(), 'qimen-digest.html'), html);
  console.log('DRY_RUN: wrote qimen-digest.html — ' + subject + ' — ' + scan.today.length + ' today, ' + scan.top.length + ' ahead');
} else {
  const missing = ['QP_SMTP_USER', 'QP_SMTP_PASS', 'QP_MAIL_TO'].filter((k) => !env[k]);
  if (missing.length) { console.error('Missing secret' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + '. See README, "Setting up the 06:00 email".'); process.exit(1); }
  const nodemailer = require('nodemailer');
  nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: env.QP_SMTP_USER.trim(), pass: env.QP_SMTP_PASS.replace(/\s+/g, '') } })   // Google shows app passwords in groups of four; the spaces are not part of it
    .sendMail({ from: '"QiPath Pro" <' + env.QP_SMTP_USER + '>', to: env.QP_MAIL_TO, subject, text, html })
    .then((info) => console.log('Sent: ' + subject + ' (' + info.messageId + ')'),
          (err) => {
            console.error('Send failed: ' + err.message);
            if (/535|Username and Password not accepted/i.test(err.message)) console.error('Gmail refused the login. QP_SMTP_PASS must be an app password made on the same Google account as QP_SMTP_USER, with 2-Step Verification on; the normal Gmail password is always refused.');
            process.exit(1);
          });
}
