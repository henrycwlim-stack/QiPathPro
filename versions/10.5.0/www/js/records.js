/* QiPath Pro — saved records, scoped to the signed-in profile.
 * Every Consult feature, the Numbers screen and the draw archive persist through here.
 */
(function (global) {
  'use strict';

  var PREFIX = 'qipath.records.';
  var LIMIT = 400;               // per profile, oldest trimmed first

  var KINDS = {
    forecast:  { label: 'Forecast',      cn: '占问', icon: '占' },
    search:    { label: 'Formation',     cn: '格局', icon: '格' },
    manifest:  { label: 'Manifestation', cn: '显化', icon: '显' },
    plan:      { label: 'Date plan',     cn: '择日', icon: '择' },
    strategy:  { label: 'Structure',     cn: '格势', icon: '势' },
    chart:     { label: 'Qimen chart',   cn: '奇门', icon: '奇' },
    yijing:    { label: 'Yijing cast',   cn: '易卦', icon: '易' },
    numbers:   { label: 'Numbers',       cn: '数字', icon: '数' },
    sancai:    { label: 'San Cai mandate', cn: '三才', icon: '才' },
    annual:    { label: 'Annual forecast', cn: '流年', icon: '年' },
    counter:   { label: 'Threat check', cn: '反制', icon: '盾' },
    combined:  { label: 'Combined reading', cn: '合參', icon: '合' },
    coaching:  { label: 'Coaching session', cn: '教练', icon: '教' }
  };

  function key(profileId) { return PREFIX + profileId; }

  function all(profileId) {
    if (!profileId) return [];
    try {
      var raw = localStorage.getItem(key(profileId));
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function persist(profileId, list) {
    try { localStorage.setItem(key(profileId), JSON.stringify(list)); return true; }
    catch (e) {
      // Storage full: drop the oldest quarter and try once more.
      try {
        var trimmed = list.slice(0, Math.max(1, Math.floor(list.length * 0.75)));
        localStorage.setItem(key(profileId), JSON.stringify(trimmed));
        return true;
      } catch (e2) { return false; }
    }
  }

  /**
   * rec: { kind, title, subtitle, when, payload, ai }
   * `when` is the moment the record refers to (a chart hour), not the moment it was saved.
   */
  function save(profileId, rec) {
    var list = all(profileId);
    var entry = {
      id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6),
      kind: rec.kind,
      title: rec.title || KINDS[rec.kind].label,
      subtitle: rec.subtitle || '',
      when: rec.when || null,
      payload: rec.payload || {},
      ai: rec.ai || null,
      savedAt: new Date().toISOString()
    };
    list.unshift(entry);
    if (list.length > LIMIT) list = list.slice(0, LIMIT);
    return persist(profileId, list) ? entry : null;
  }

  function get(profileId, id) {
    return all(profileId).filter(function (r) { return r.id === id; })[0] || null;
  }

  // Attach or replace the AI narrative on an existing record.
  function attachAI(profileId, id, ai) {
    var list = all(profileId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list[i].ai = ai; persist(profileId, list); return list[i]; }
    }
    return null;
  }

  // Set fields inside an existing record's payload, e.g. a deep-dive thread that grows after saving.
  function updatePayload(profileId, id, fields) {
    var list = all(profileId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].payload = list[i].payload || {};
        Object.keys(fields).forEach(function (k) { list[i].payload[k] = fields[k]; });
        return persist(profileId, list) ? list[i] : null;
      }
    }
    return null;
  }

  // What actually happened: { result: 'hit' | 'partly' | 'miss', note, at }. Pass null to clear it.
  function setOutcome(profileId, id, outcome) {
    var list = all(profileId);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (outcome) list[i].outcome = outcome; else delete list[i].outcome;
        return persist(profileId, list) ? list[i] : null;
      }
    }
    return null;
  }

  function remove(profileId, id) {
    var list = all(profileId).filter(function (r) { return r.id !== id; });
    persist(profileId, list);
    return list;
  }

  function clearKind(profileId, kind) {
    var list = all(profileId).filter(function (r) { return r.kind !== kind; });
    persist(profileId, list);
    return list;
  }

  function byKind(profileId, kind) {
    var list = all(profileId);
    return kind ? list.filter(function (r) { return r.kind === kind; }) : list;
  }

  function counts(profileId) {
    var out = {}, list = all(profileId);
    Object.keys(KINDS).forEach(function (k) { out[k] = 0; });
    list.forEach(function (r) { if (out[r.kind] !== undefined) out[r.kind]++; });
    out._total = list.length;
    return out;
  }

  function exportAll(profileId) {
    return JSON.stringify({ exported: new Date().toISOString(),
                            profile: profileId, records: all(profileId) }, null, 2);
  }

  global.QPRecords = {
    KINDS: KINDS, all: all, save: save, get: get, remove: remove,
    attachAI: attachAI, updatePayload: updatePayload, setOutcome: setOutcome, byKind: byKind, counts: counts, clearKind: clearKind,
    exportAll: exportAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
