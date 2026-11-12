// Calibrates the entropy "clarity" measures against a reference population, so a chart's
// uncertainty is reported as a percentile rather than against an arbitrary threshold.
// Shannon entropy of five near-equal element shares sits close to 1 for most charts; only the
// ranking against other charts says whether a given chart is unusually clear or muddy.
//
//   node tools/calibrate-entropy.js            # prints the quantile tables
//
// Seeded, so the tables are reproducible. Paste the output into www/js/mathlab.js (ENTROPY_REF).
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'www', 'js');
global.window = globalThis;
global.localStorage = { getItem() { return null; }, setItem() {} };
for (const f of ['qpdata', 'astro', 'core', 'systems', 'bazi', 'qmdj', 'fibonacci', 'mathlab'])
  vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f });
const C = QPCore, S = QPSystems, M = QPMath, Q = QPQimen;

let seed = 20261018;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

function randomUser() {
  const y = 1940 + Math.floor(rnd() * 71), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
  const b = { y, m, d, hour: Math.floor(rnd() * 24), min: Math.floor(rnd() * 60) };
  const gender = rnd() < 0.5 ? 'M' : 'F';
  const pillars = C.fourPillars(b.y, b.m, b.d, b.hour, b.min);
  const deep = QPBazi.analyse(pillars, gender);
  return { birth: b, gender, pillars, deep, bazi: S.analyseBazi(pillars), favourable: deep.favourable,
           luck: S.luckPillars(pillars, gender, b), zodiacBranch: pillars.year.branch };
}

function quantiles(xs) {
  const s = xs.slice().sort((a, b) => a - b), out = [];
  for (let p = 0; p <= 100; p += 5) out.push(+s[Math.min(s.length - 1, Math.round(p / 100 * (s.length - 1)))].toFixed(3));
  return out;
}

const bazi = [];
for (let i = 0; i < 3000; i++) {
  const u = randomUser();
  bazi.push(M.baziEntropy(u.deep, M.baziGraph(u.pillars, u)).uncertainty);
}

const zwds = [];
for (let i = 0; i < 3000; i++) {
  const u = randomUser();
  u.lunar = QPAstro.toLunar(u.birth.y, u.birth.m, u.birth.d);
  u.zwds = S.zwds(u.lunar, u.pillars.hourBranch, u.pillars.year.stem, u.pillars.year.branch);
  zwds.push(M.zwdsEntropy(u).uncertainty);
}

const qimen = [];
for (let i = 0; i < 400; i++) {
  const u = randomUser();
  const dt = { y: 2020 + Math.floor(rnd() * 11), m: 1 + Math.floor(rnd() * 12), d: 1 + Math.floor(rnd() * 28),
               hour: Math.floor(rnd() * 12) * 2 + 1, min: 30 };
  const sc = pick(Q.SCENARIOS).id, method = pick(Q.METHODS).id;
  const r = Q.forecast(dt, sc, '', { method, user: u });
  const tz = M.qimenTensor(r.chart, { favourable: u.favourable, unfavourable: u.deep.unfavourable });
  const mk = M.markov(M.qimenSeries(dt, sc, '', { method, user: u }, 120));
  qimen.push(M.qimenEntropy(tz, mk).uncertainty);
}

console.log('// ' + bazi.length + ' Bazi charts and ' + zwds.length + ' Zi Wei boards (births 1940–2010), and ' +
  qimen.length + ' Qimen casts (2020–2030, random scenario and method), seed 20261018.');
console.log('var ENTROPY_REF = {\n  bazi:  ' + JSON.stringify(quantiles(bazi)) + ',\n  zwds:  ' +
  JSON.stringify(quantiles(zwds)) + ',\n  qimen: ' + JSON.stringify(quantiles(qimen)) + '\n};');
