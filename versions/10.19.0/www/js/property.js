/* QiPath Pro — property and floor plan storage, scoped to the signed-in profile.
 * Plans are private architectural information: they stay on the device and leave only
 * when the user explicitly asks for an AI reading.
 */
(function (global) {
  'use strict';
  var PREFIX = 'qipath.property.';

  function key(pid) { return PREFIX + pid; }
  function all(pid) {
    if (!pid) return [];
    try { var v = JSON.parse(localStorage.getItem(key(pid)) || '[]');
          return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function persist(pid, list) {
    try { localStorage.setItem(key(pid), JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  function save(pid, prop) {
    var list = all(pid);
    if (prop.id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === prop.id) { list[i] = prop; persist(pid, list); return prop; }
      }
    }
    prop.id = prop.id || 'p' + Date.now() + Math.random().toString(36).slice(2, 5);
    prop.createdAt = prop.createdAt || new Date().toISOString();
    if (!list.length) prop.primary = true;
    list.unshift(prop);
    return persist(pid, list) ? prop : null;
  }
  function get(pid, id) { return all(pid).filter(function (p) { return p.id === id; })[0] || null; }
  function primary(pid) {
    var list = all(pid);
    return list.filter(function (p) { return p.primary; })[0] || list[0] || null;
  }
  function setPrimary(pid, id) {
    var list = all(pid).map(function (p) { p.primary = p.id === id; return p; });
    persist(pid, list);
  }
  function remove(pid, id) {
    var list = all(pid).filter(function (p) { return p.id !== id; });
    if (list.length && !list.some(function (p) { return p.primary; })) list[0].primary = true;
    persist(pid, list);
    return list;
  }
  /** Plan images are large; stored against the property but written separately so a
      quota failure on the image does not lose the property itself. */
  function savePlan(pid, propId, plan) {
    var p = get(pid, propId);
    if (!p) return false;
    p.plan = plan;
    var list = all(pid).map(function (x) { return x.id === propId ? p : x; });
    if (persist(pid, list)) return true;
    // Image too large: keep the geometry, drop the picture.
    var lite = JSON.parse(JSON.stringify(plan));
    if (lite.image) lite.image = { dropped: true, width: plan.image.width, height: plan.image.height };
    p.plan = lite;
    return persist(pid, all(pid).map(function (x) { return x.id === propId ? p : x; }))
      ? 'lite' : false;
  }

  global.QPProperty = { all: all, save: save, get: get, primary: primary,
                        setPrimary: setPrimary, remove: remove, savePlan: savePlan };
})(typeof window !== 'undefined' ? window : globalThis);
