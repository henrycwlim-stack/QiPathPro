#!/usr/bin/env node
/* Re-measures how often each Qimen structure occurs, across 2,880 hourly plates in 2026-27, and writes the two tables in www/js/qmdj.js.
 * FORMATION_FREQ is the share of palace-hours; FORMATION_HOURLY the share of plates with it anywhere. Rarer structures weigh more in scans.
 * Run from the project root after changing the structure rules: node tools/measure-formations.js
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'www', 'js');
const w = { localStorage: { getItem: () => null, setItem() {} }, navigator: {}, console, Date }; w.window = w;
const c = vm.createContext(w);
for (const f of ['qpdata', 'structures', 'ephem-terms', 'astro', 'core', 'systems', 'fengshui', 'bazi', 'qmdj']) vm.runInContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), c);
const C = w.QPCore, S = w.QPSystems, D = w.QPData, N = 2880, palaces = {}, plates = {};
for (let i = 0; i < N; i++) {
  const d = new Date(2026, 0, 1, 1 + i * 2, 30);
  const p = C.fourPillars(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), 30);
  S.formations(p, d.getMonth() + 1).forEach(f => { plates[f.id] = (plates[f.id] || 0) + 1; palaces[f.id] = (palaces[f.id] || 0) + (f.palaces || []).length; });
}
const round = v => Math.round(v * 10) / 10;
const table = (obj, div) => D.FORMATIONS.map(f => [f.id, round((obj[f.id] || 0) / div * 100)]).sort((a, b) => b[1] - a[1]);
const fmt = rows => rows.map(([k, v]) => (/^[a-z_0-9]+$/.test(k) ? k : "'" + k + "'") + ': ' + v).reduce((out, it) => { const l = out[out.length - 1]; if ((l + it).length > 110) out.push(it + ', '); else out[out.length - 1] = l + it + ', '; return out; }, ['']).join('\n    ').replace(/, $/, '');
const file = path.join(dir, 'qmdj.js'); let s = fs.readFileSync(file, 'utf8');
s = s.replace(/var FORMATION_FREQ = \{[\s\S]*?\};/, 'var FORMATION_FREQ = {\n    ' + fmt(table(palaces, N * 8)) + '\n  };');
s = s.replace(/var FORMATION_HOURLY = \{[\s\S]*?\};/, 'var FORMATION_HOURLY = {\n    ' + fmt(table(plates, N)) + '\n  };');
fs.writeFileSync(file, s);
console.log('measured', D.FORMATIONS.length, 'structures across', N, 'plates');
