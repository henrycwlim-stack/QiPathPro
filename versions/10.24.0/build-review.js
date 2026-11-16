// Builds QiPathPro-UI-review.html — every screen rendered live in phone frames.
const fs = require('fs');

const root = '/home/claude/qipath';
let app = fs.readFileSync(root + '/www/index.html', 'utf8');
app = app.replace('<link rel="stylesheet" href="css/app.css">',
  '<style>\n' + fs.readFileSync(root + '/www/css/app.css', 'utf8') + '\n</style>');
['qpdata','records','library','property','draws','astro','core','systems','fengshui','bazi','guidance','qmdj','sancai','fibonacci','mathlab','drawmethods','ai','app'].forEach(f => {
  app = app.replace('<script src="js/' + f + '.js"></script>',
    '<script>\n' + fs.readFileSync(root + '/www/js/' + f + '.js', 'utf8') + '\n</script>');
});

const SCREENS = [
  ['gate', 'Sign in', 'Local profiles with a PIN. First run opens the create form; nothing leaves the device.'],
  ['now', 'Now', 'The current double-hour on a twelve-branch dial, the Qimen gate governing it, directions to face and avoid, and the day\'s twelve hours ranked.'],
  ['almanac:day', 'Almanac · Day', 'Any date can be selected — the day, the seven days from it, its solar month and its year all follow. Day officer, duty spirit, mansion, void branches, clash, Dong Gong 宜/忌 and the day hexagram.'],
  ['almanac:week', 'Almanac · Week', 'Seven days scored, each with its officer and leading activity, and the strongest and weakest day named.'],
  ['almanac:month', 'Almanac · Month', 'Month pillar and governing star, next solar term, and the monthly flying stars by sector.'],
  ['almanac:year', 'Almanac · Year', 'Year pillar, Tai Sui and clashing sign, personal standing against the year, and annual flying stars.'],
  ['chart:bazi', 'Chart · Bazi', 'Four Pillars with ten gods, plus the 滴天髓 frame: strength by season, root and ally; 調候 climatic regulation from 窮通寶鑑; 病藥 illness and cure; 通關 bridging; and any 從格 following structure. Plus a network-topology graph of the eight characters: PageRank, betweenness, harmony clusters and the net flow into the Day Master.'],
  ['chart:elements', 'Chart · Elements', 'The five elements weighted for month command and hidden stems, then read across career, wealth, relationships, health, education, family and children — each with its governing gods and stars.'],
  ['chart:relations', 'Chart · Relations', 'Clashes (沖), punishments (刑), harms (害), unions and frames, the 神煞 stars, and the day master\'s twelve stages through each branch.'],
  ['chart:destiny', 'Chart · Qimen Destiny', 'The Qimen plate cast from your birth moment and fixed for life — moved here from Consult because it is a natal chart, not a timing one. Full nine palaces, standing structures, and an AI reading.'],
  ['chart:luck', 'Chart · Forecast', 'Ten-year luck pillars with exact handover dates, golden-section points inside the current pillar, Fibonacci time zones, an eight-year and thirteen-month projection placed by retracement, Fibonacci ages, and an AI forecast. Plus Fourier harmonic cycles over 120 years of scores.'],
  ['chart:compass', 'Chart · Compass', 'A Period 9 luopan with the 24 mountains, trigram stars and this year\'s affliction arcs. Live device heading with calibration and boundary warnings, or manual entry from a real compass.'],
  ['chart:property', 'Chart · Property', 'Saved buildings with their completion date, period (Lichun-adjusted) and facing bearing. The star-5 convention is selectable, since schools differ.'],
  ['chart:plan', 'Chart · Plan', 'Seven-step floor plan flow: import, orient to true north from a measured edge, trace the outline, set the centre, place rooms, the sector overlay with missing-corner analysis, and a full audit with cures. The AI reading sees the plan image alongside the computed chart.'],
  ['chart:zwds', 'Chart · Zi Wei', 'Twelve-palace board with the fourteen major stars, life and body palaces, and the Five Element frame — plus 大限 decade limits, 流年 flow years and 四化, read through the Fibonacci timing layer, with an AI forecast.'],
  ['chart:fs', 'Chart · Feng Shui', 'The building\'s Xuan Kong flying star natal chart — nine palaces with mountain and water stars, this year\'s annual layer and afflictions, shape analysis, and room-by-room placement combining all four layers.'],
  ['consult:sancai', 'Consult · San Cai', 'The flagship. Pick an objective and a window, and the engine cross-references date selection against your Bazi, Flying Star sectors against your Eight Mansions, and the Qimen hour plate — returning the top three windows as when / sit here / face this way, re-ranked by Fibonacci follow-through and each with Fibonacci follow-up dates.'],
  ['consult:forecast', 'Consult · Forecast', 'Ask a question, pick the hour, and choose which of seven methods reads it — Day/Hour Stem, Useful God, Doors, Stars, Deities, the asker\'s birth year (年命), or Chief and Envoy. Each reads a different symbol as the matter, so they can legitimately disagree. Plus a collapsible quantitative analysis: game-theory stance, entropy clarity, sensitivity and tipping points, a Markov chain, Fourier cycles, fuzzy seasonal strength and the plate tensor.'],
  ['consult:search', 'Consult · Search', 'Multi-select from all 133 formations with descriptions, set a date range, and find every hour they occur — with the palace, stems, star, door, deity and void shown.'],
  ['consult:manifest', 'Consult · Manifest', 'Pick date, hour, palace and what to ask for, then get the practice, the spoken script and the reciprocity. Defaults to the current hour.'],
  ['consult:plan', 'Consult · Plan a task', 'Date selection across ten activity types, scoring every day in the window against your own chart.'],
  ['consult:strategy', 'Consult · Strategy', 'The 133-formation library run against the live plate, split into auspicious, hostile and strategic, with the day\'s strongest windows.'],
  ['consult:qimen', 'Consult · Qimen', 'Full nine-palace plate with heaven and earth stems, stars, gates and deities, and the directions to use or avoid.'],
  ['consult:yijing', 'Consult · Yijing', 'Plum Blossom casting from the present moment, with the moving line and the resulting hexagram.'],
  ['numbers', 'Numbers', '4D on Wednesday, Saturday and Sunday; seven Toto numbers on Monday and Thursday. Locked with a countdown otherwise, and the derivation shown.'],
  ['learn', 'Learn', 'The knowledge library. Add your own methods, rules, tables and cases as text, images or PDFs; the AI structures them into reusable notes that are then injected into every relevant chart reading. The screen is explicit that this is retrieval, not training.'],
  ['profile', 'Profile', 'Chart details, Gemini or Claude API key with a connection test that verifies real generation, saved records browsable by type, and profile management.']
];

const cards = SCREENS.map(([hash, title, desc], i) => `
    <figure class="shot">
      <figcaption>
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <h2>${title}</h2>
        <p>${desc}</p>
      </figcaption>
      <div class="phone"><iframe loading="lazy" title="${title}" data-hash="${hash}"></iframe></div>
    </figure>`).join('');

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QiPath Pro — UI review</title>
<style>
  :root{
    --lacquer:#17120E; --raised:#211A14; --cinnabar:#C8452F; --brass:#C8A24A;
    --rice:#E9DFCC; --muted:#8A7A66; --line:rgba(233,223,204,.14);
    --serif:"Noto Serif CJK SC","Noto Serif SC","Songti SC",Georgia,serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0E0B09;color:var(--rice);font-family:var(--serif);line-height:1.6;padding:48px 24px 80px}
  header{max-width:1180px;margin:0 auto 40px;border-bottom:1px solid var(--line);padding-bottom:26px}
  header .seal{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;
    border:2px solid var(--cinnabar);border-radius:5px;color:var(--cinnabar);font-size:1.6rem;margin-bottom:16px}
  header h1{font-size:1.7rem;font-weight:600;letter-spacing:.04em}
  header h1 span{color:var(--cinnabar)}
  header p{color:var(--muted);font-size:.95rem;margin-top:8px;max-width:70ch}
  header .meta{margin-top:16px;font-size:.84rem;color:var(--muted)}
  header .meta b{color:var(--brass);font-weight:600}
  .grid{max-width:1180px;margin:0 auto;display:grid;gap:44px 32px;
    grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
  .shot figcaption{margin-bottom:14px;min-height:120px}
  .shot .n{color:var(--cinnabar);font-size:.8rem}
  .shot h2{font-size:1.05rem;font-weight:600;margin:2px 0 6px}
  .shot p{font-size:.85rem;color:var(--muted);line-height:1.65}
  .phone{background:var(--lacquer);border:1px solid var(--line);border-radius:22px;padding:10px;
    box-shadow:0 18px 40px rgba(0,0,0,.5)}
  .phone iframe{width:100%;height:720px;border:0;border-radius:14px;background:var(--lacquer);display:block}
  footer{max-width:1180px;margin:56px auto 0;border-top:1px solid var(--line);padding-top:22px;
    font-size:.85rem;color:var(--muted);line-height:1.75}
  footer b{color:var(--brass);font-weight:600}
</style>
</head>
<body>
<header>
  <div class="seal">氣</div>
  <h1>Qi<span>Path</span> Pro — UI review</h1>
  <p>Every screen of the Android app, rendered live from the real engine. Each frame is the actual
     application running against a demo chart, not a mockup — the charts, formations and almanac
     readings below are computed on the spot.</p>
  <div class="meta">Demo chart: <b>14 June 1988, 09:30, female</b> · rendered <b>${new Date().toISOString().slice(0, 10)}</b> ·
     ${SCREENS.length} screens</div>
</header>

<div class="grid">${cards}</div>

<footer>
  <b>Reading this page.</b> Frames are interactive — scroll inside one, or tap through its
  segmented controls, to inspect a screen in detail. The bottom tab bar is live in every frame.<br><br>
  <b>The Profile screen</b> is where a Gemini or Claude API key is entered. Without a key every
  feature still works; the key only powers the written narrative panels on Almanac · Day,
  Chart · Bazi and Chart · Zi Wei.
</footer>

<script id="appsrc" type="text/plain">${app.replace(/<\/script>/g, '<\\/script>')}</script>
<script>
  // One blob of the application, shared by every frame.
  var src = document.getElementById('appsrc').textContent.replace(/<\\\\\\/script>/g, '<\\/script>');
  var url = URL.createObjectURL(new Blob([src], { type: 'text/html' }));
  document.querySelectorAll('iframe[data-hash]').forEach(function (f) {
    f.src = url + '#review=' + f.dataset.hash;
  });
</script>
</body>
</html>`;

fs.writeFileSync('/mnt/user-data/outputs/QiPathPro-UI-review.html', page);
console.log('UI review KB:', Math.round(page.length / 1024), '| screens:', SCREENS.length);
