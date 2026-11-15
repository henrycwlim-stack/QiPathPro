/* QiPath Pro — knowledge library.
 *
 * What this is, stated plainly because the distinction matters:
 *
 * The app cannot train or fine-tune a model. Gemini and Claude are stateless — nothing you
 * send changes their weights, and nothing persists between calls. What this module does
 * instead is keep your own material and put the relevant parts into the prompt each time an
 * analysis runs. That is retrieval, not learning, and it is the honest description.
 *
 * In practice it produces much of what people want from "teaching the AI": the model reads
 * your school's rules, your teacher's notes and your own case records alongside the chart,
 * and answers within that frame rather than a generic one. It is durable because the notes
 * are stored on the device, and it is inspectable because you can read exactly what was sent.
 */
(function (global) {
  'use strict';

  var PREFIX = 'qipath.library.';
  var MAX_NOTES = 300;
  var CONTEXT_BUDGET = 6000;   // characters of library text allowed into any one prompt

  var MODULES = {
    bazi:     { label: 'Bazi 八字', cn: '八字' },
    zwds:     { label: 'Zi Wei Dou Shu 紫微', cn: '紫微' },
    qimen:    { label: 'Qimen Dunjia 奇門', cn: '奇门' },
    fengshui: { label: 'Feng Shui 風水', cn: '风水' },
    yijing:   { label: 'Yijing 易經', cn: '易经' },
    general:  { label: 'General', cn: '通用' }
  };

  var KINDS = {
    method:    { label: 'Method', note: 'A way of reading a chart — which symbol stands for what, and how the relation is judged.' },
    rule:      { label: 'Rule', note: 'A specific condition and what it indicates.' },
    reference: { label: 'Reference', note: 'A table, list or passage to be quoted from.' },
    case:      { label: 'Case', note: 'A worked example: a chart, what was read, what actually happened.' },
    glossary:  { label: 'Glossary', note: 'Terms and their meanings as your school uses them.' },
    preference:{ label: 'Preference', note: 'How you want readings framed — depth, tone, what to emphasise.' }
  };

  function key(profileId) { return PREFIX + profileId; }

  function all(profileId) {
    if (!profileId) return [];
    try {
      var v = JSON.parse(localStorage.getItem(key(profileId)) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function persist(profileId, list) {
    try { localStorage.setItem(key(profileId), JSON.stringify(list)); return true; }
    catch (e) {
      try {
        localStorage.setItem(key(profileId), JSON.stringify(list.slice(0, Math.floor(list.length * 0.7))));
        return true;
      } catch (e2) { return false; }
    }
  }

  /**
   * note: { module, kind, title, body, tags[], source, active }
   * `body` is the text that will be injected. Keep it dense — it competes for prompt space.
   */
  function add(profileId, note) {
    var list = all(profileId);
    var entry = {
      id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
      module: note.module || 'general',
      kind: note.kind || 'rule',
      title: (note.title || 'Untitled').slice(0, 140),
      body: String(note.body || '').slice(0, 8000),
      tags: (note.tags || []).slice(0, 12),
      source: note.source || 'typed',
      active: note.active !== false,
      addedAt: new Date().toISOString()
    };
    list.unshift(entry);
    if (list.length > MAX_NOTES) list = list.slice(0, MAX_NOTES);
    return persist(profileId, list) ? entry : null;
  }

  function addMany(profileId, notes) {
    var added = [];
    notes.forEach(function (n) { var e = add(profileId, n); if (e) added.push(e); });
    return added;
  }

  function remove(profileId, id) {
    var list = all(profileId).filter(function (n) { return n.id !== id; });
    persist(profileId, list);
    return list;
  }

  function toggle(profileId, id) {
    var list = all(profileId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list[i].active = !list[i].active; break; }
    }
    persist(profileId, list);
    return list;
  }

  function byModule(profileId, module) {
    var list = all(profileId);
    return module ? list.filter(function (n) { return n.module === module; }) : list;
  }

  function counts(profileId) {
    var out = { _total: 0, _active: 0 };
    Object.keys(MODULES).forEach(function (m) { out[m] = 0; });
    all(profileId).forEach(function (n) {
      out._total++;
      if (n.active) out._active++;
      if (out[n.module] !== undefined) out[n.module]++;
    });
    return out;
  }

  /* ---------------- retrieval ---------------- */

  // Latin words of three letters or more, plus overlapping character pairs for Chinese (and other
  // CJK) runs, which are written without spaces: 天芮死门 -> 天芮 芮死 死门. A lone character is kept
  // when it stands by itself, so 忌 or 禄 between punctuation still matches.
  var CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
  function tokenise(s) {
    var out = [];
    String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).forEach(function (w) {
      if (!w) return;
      if (!CJK.test(w)) { if (w.length > 2) out.push(w); return; }
      w.split(/([\u3400-\u9fff\uf900-\ufaff]+)/).forEach(function (part) {
        if (!part) return;
        if (!CJK.test(part)) { if (part.length > 2) out.push(part); return; }
        if (part.length === 1) { out.push(part); return; }
        for (var i = 0; i < part.length - 1; i++) out.push(part.substr(i, 2));
      });
    });
    return out;
  }

  /**
   * Select the notes worth spending prompt space on: everything in the module, ranked by
   * overlap with the query, trimmed to the character budget. Preferences and methods are
   * weighted up because they change how the whole reading is framed.
   */
  function contextFor(profileId, module, query, budget) {
    var cap = budget || CONTEXT_BUDGET;
    var mods = [].concat(module);                 // one module, or several for a cross-system reading
    var pool = all(profileId).filter(function (n) {
      return n.active && (mods.indexOf(n.module) >= 0 || n.module === 'general');
    });
    if (!pool.length) return { notes: [], text: '', used: 0, available: 0 };

    var q = tokenise(query);
    var scored = pool.map(function (n) {
      var hay = tokenise(n.title + ' ' + n.body + ' ' + (n.tags || []).join(' '));
      var set = {};
      hay.forEach(function (t) { set[t] = 1; });
      var overlap = q.filter(function (t) { return set[t]; }).length;
      var boost = n.kind === 'preference' ? 6 : n.kind === 'method' ? 4
                : n.kind === 'glossary' ? 2 : 0;
      var exact = mods.indexOf(n.module) >= 0 ? 2 : 0;
      return { n: n, score: overlap * 3 + boost + exact };
    }).sort(function (a, b) { return b.score - a.score; });

    var out = [], used = 0;
    scored.forEach(function (x) {
      var block = '[' + KINDS[x.n.kind].label + ' \u2014 ' + x.n.title + ']\n' + x.n.body;
      if (used + block.length > cap) return;
      out.push(x.n); used += block.length + 2;
    });

    var text = out.map(function (n) {
      return '[' + KINDS[n.kind].label + ' \u2014 ' + n.title + ']\n' + n.body;
    }).join('\n\n');

    return { notes: out, text: text, used: used, available: pool.length };
  }

  /** The block that gets prepended to a module prompt. Empty when the library has nothing. */
  function promptBlock(profileId, module, query) {
    var ctx = contextFor(profileId, module, query);
    if (!ctx.text) return '';
    return 'THE PRACTITIONER\'S OWN REFERENCE MATERIAL\n' +
      'The following was supplied by the user from their own study and practice. Use it to ' +
      'interpret the chart: where it conflicts with general knowledge about what a configuration ' +
      'MEANS, follow this material and say which rule you are applying. Where it does not cover ' +
      'the question, fall back on standard practice and say so. Do not silently ignore it, and do ' +
      'not pretend it says more than it does.\n' +
      'CHARTING RULES ARE FIXED: the charts below were calculated by the application\'s engine. ' +
      'If a note prescribes a different way of CALCULATING a chart — how pillars, luck pillars, ' +
      'ju, palaces, stars, doors, deities, transformations or flying stars are placed — do not ' +
      'apply it, do not recalculate or move anything, and do not read the chart as if it had been ' +
      'cast that way. Read the chart exactly as supplied. You may mention in one line that the ' +
      'note describes a different charting convention.\n\n' +
      ctx.text + '\n\n' + '--- end of supplied material (' + ctx.notes.length +
      ' of ' + ctx.available + ' notes, ' + ctx.used + ' characters) ---\n\n';
  }
  /** The notes promptBlock would include, for showing the user which were used. */
  function usedNotes(profileId, module, query) {
    return contextFor(profileId, module, query).notes.map(function (n) {
      return { id: n.id, title: n.title, module: n.module, kind: n.kind }; });
  }

  function exportAll(profileId) {
    return JSON.stringify({ exported: new Date().toISOString(),
                            notes: all(profileId) }, null, 2);
  }

  function importJson(profileId, text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { error: 'That is not valid JSON.' }; }
    var notes = Array.isArray(data) ? data : (data.notes || []);
    if (!notes.length) return { error: 'No notes found in that file.' };
    var added = addMany(profileId, notes.map(function (n) {
      return { module: n.module, kind: n.kind, title: n.title, body: n.body,
               tags: n.tags, source: n.source || 'imported' };
    }));
    return { added: added.length };
  }

  global.QPLibrary = {
    MODULES: MODULES, KINDS: KINDS,
    all: all, add: add, addMany: addMany, remove: remove, toggle: toggle,
    byModule: byModule, counts: counts,
    contextFor: contextFor, promptBlock: promptBlock, usedNotes: usedNotes,
    exportAll: exportAll, importJson: importJson,
    CONTEXT_BUDGET: CONTEXT_BUDGET
  };
})(typeof window !== 'undefined' ? window : globalThis);
