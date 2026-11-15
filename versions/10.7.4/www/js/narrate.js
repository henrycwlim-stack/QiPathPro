/*
 * Narration audio for the Manifest screen: the Sage 64 to 1 countdown and a reading of the script.
 *
 * Google's speech models return one stretch of audio per request, and they do not keep an even pace
 * over a long count. So the countdown is requested in parts, each spoken number is located in the
 * sound, and the silence between numbers is rebuilt here so one number starts every few seconds.
 *
 * The finished audio is a WAV file kept on the device: Capacitor Filesystem in the app, IndexedDB in
 * a browser. The list of saved audio lives in localStorage.
 */
(function (global) {
  'use strict';

  var RATE = 24000, INDEX = 'qipath.narration.v1', PREFS = 'qipath.narration.prefs';
  var CALM = 'calm, slow and soft, like a guided meditation in a quiet room';

  var VOICES = [
    { id: 'Vindemiatrix', label: 'Vindemiatrix, gentle' },
    { id: 'Achernar', label: 'Achernar, soft' },
    { id: 'Sulafat', label: 'Sulafat, warm' },
    { id: 'Despina', label: 'Despina, smooth' },
    { id: 'Enceladus', label: 'Enceladus, breathy' },
    { id: 'Gacrux', label: 'Gacrux, mature' },
    { id: 'Schedar', label: 'Schedar, even' }
  ];
  var PACES = [
    { s: 3, label: '3 sec a number, about 4 min' },
    { s: 5, label: '5 sec a number, about 6 min' },
    { s: 8, label: '8 sec a number, about 9 min' }
  ];

  function plugin(name) { var C = global.Capacitor; return C && C.Plugins && C.Plugins[name] ? C.Plugins[name] : null; }
  function native() { var C = global.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform() && plugin('Filesystem')); }

  function hash(s) {
    var h = 5381; s = String(s || '');
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* ---------------- bytes and WAV ---------------- */

  function fromB64(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function toB64(bytes) {
    var s = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(s);
  }
  function tag(b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  /** The speech models may send a complete WAV or bare 16-bit samples, depending on the model. */
  function decode(clip) {
    var b = fromB64(clip.data), start = 0, len = b.length, rate = RATE;
    if (b.length > 44 && tag(b, 0) === 'RIFF' && tag(b, 8) === 'WAVE') {
      var o = 12;
      while (o + 8 <= b.length) {
        var id = tag(b, o), size = u32(b, o + 4);
        if (id === 'fmt ') rate = u32(b, o + 12);
        if (id === 'data') { start = o + 8; len = Math.min(size, b.length - start); break; }
        o += 8 + size + (size & 1);
      }
    } else {
      var m = /rate=(\d+)/i.exec(clip.mime || '');
      if (m) rate = parseInt(m[1], 10);
    }
    len -= len % 2;
    return { pcm: new Int16Array(b.buffer.slice(b.byteOffset + start, b.byteOffset + start + len)), rate: rate };
  }

  function silence(sec, rate) { return new Int16Array(Math.max(0, Math.round(sec * rate))); }

  function wav(pieces, rate) {
    var n = 0, i;
    for (i = 0; i < pieces.length; i++) n += pieces[i].length;
    var out = new Uint8Array(44 + n * 2), v = new DataView(out.buffer);
    function text(o, s) { for (var k = 0; k < s.length; k++) out[o + k] = s.charCodeAt(k); }
    text(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); text(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    text(36, 'data'); v.setUint32(40, n * 2, true);
    var at = 44;
    for (i = 0; i < pieces.length; i++) {
      out.set(new Uint8Array(pieces[i].buffer, pieces[i].byteOffset, pieces[i].length * 2), at);
      at += pieces[i].length * 2;
    }
    return { bytes: out, seconds: n / rate };
  }

  /* ---------------- finding the spoken numbers ---------------- */

  /** Stretches of speech separated by at least gapMs of quiet, measured in 10 ms frames. */
  function spans(pcm, rate, gapMs) {
    var frame = Math.max(1, Math.round(rate / 100)), lv = [], peak = 0, i, j;
    for (i = 0; i + frame <= pcm.length; i += frame) {
      var sum = 0;
      for (j = 0; j < frame; j++) sum += pcm[i + j] * pcm[i + j];
      var rms = Math.sqrt(sum / frame);
      lv.push(rms);
      if (rms > peak) peak = rms;
    }
    var floor = Math.max(120, peak * 0.05), gap = Math.max(1, Math.round(gapMs / 10)), out = [], s = -1, last = -1;
    for (i = 0; i < lv.length; i++) {
      if (lv[i] >= floor) { if (s < 0) s = i; last = i; }
      else if (s >= 0 && i - last >= gap) { out.push([s, last]); s = -1; }
    }
    if (s >= 0) out.push([s, last]);
    return out.filter(function (x) { return x[1] - x[0] >= 5; })
              .map(function (x) { return [x[0] * frame, (x[1] + 1) * frame]; });
  }

  /** Look for the gap length that separates the sound into exactly n pieces. */
  function findNumbers(pcm, rate, n) {
    var gaps = [400, 320, 260, 210, 170, 130, 100, 70], best = null;
    for (var i = 0; i < gaps.length; i++) {
      var f = spans(pcm, rate, gaps[i]);
      if (f.length === n) return { list: f, exact: true };
      if (!best || Math.abs(f.length - n) < Math.abs(best.length - n)) best = f;
    }
    return { list: best || [], exact: false };
  }

  /** One number starts every pace seconds, however quickly the voice said them. */
  function paced(pcm, rate, list, pace) {
    var pad = Math.round(rate * 0.02), out = [];
    list.forEach(function (x) {
      var cut = pcm.subarray(Math.max(0, x[0] - pad), Math.min(pcm.length, x[1] + pad));
      out.push(cut);
      out.push(silence(Math.max(0.4, pace - cut.length / rate), rate));
    });
    return out;
  }

  /* ---------------- the words ---------------- */

  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty'];
  function numberWord(n) {
    var w = n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  function countText(from, to) {
    var out = [];
    for (var i = from; i >= to; i--) out.push(numberWord(i) + '...');
    return out.join('\n');
  }

  var SAGE_OPEN = 'Find a comfortable seat, and let your spine rise gently. Let your hands rest. Close your eyes. ' +
    'Take a slow breath in, and let it go. Once more, breathe in, and let it all the way out. ' +
    'I will count down from sixty-four to one. With each number, let your body grow heavier and your mind grow quieter. ' +
    'There is nothing to do, and nothing to hold on to. Let the numbers carry you down.';
  var SAGE_CLOSE = 'You are resting now in Sage Mode: quiet, clear and awake. ' +
    'Stay in this stillness for as long as you need. When words come next, let each one settle into it.';

  /* ---------------- building the audio ---------------- */

  /**
   * speak(text, style) resolves to { data, mime }. Each count part is tried a second time if the
   * numbers cannot be told apart; the result reports whether every number was found.
   */
  function makeSage(speak, opts) {
    var pace = opts.pace || 5, step = opts.onStep || function () {}, parts = [], rate = RATE, exact = true;
    function say(text) { return speak(text, CALM).then(decode); }
    function count(from, to, retry) {
      return say(countText(from, to)).then(function (d) {
        var f = findNumbers(d.pcm, d.rate, from - to + 1);
        if (!f.exact && retry) return count(from, to, false);
        if (!f.exact) exact = false;
        rate = d.rate;
        return paced(d.pcm, d.rate, f.list, pace);
      });
    }
    step(1, 4, 'the opening');
    return say(SAGE_OPEN).then(function (d) {
      rate = d.rate;
      parts.push(silence(1, rate), d.pcm, silence(3, rate));
      step(2, 4, 'numbers 64 to 33');
      return count(64, 33, true);
    }).then(function (p) {
      parts = parts.concat(p);
      step(3, 4, 'numbers 32 to 1');
      return count(32, 1, true);
    }).then(function (p) {
      parts = parts.concat(p);
      step(4, 4, 'the close');
      return say(SAGE_CLOSE);
    }).then(function (d) {
      parts.push(silence(1, rate), d.pcm, silence(2, rate));
      var w = wav(parts, rate);
      return { bytes: w.bytes, seconds: w.seconds, exact: exact };
    });
  }

  /** Paragraphs are kept whole. A request stays short enough that the voice does not drift. */
  function chunks(text, max) {
    var out = [], cur = '';
    String(text || '').split(/\n\s*\n/).forEach(function (para) {
      para = para.trim();
      if (!para) return;
      if (cur && cur.length + para.length + 2 > max) { out.push(cur); cur = ''; }
      cur = cur ? cur + '\n\n' + para : para;
    });
    if (cur) out.push(cur);
    return out;
  }

  function makeScript(speak, text, opts) {
    var step = (opts && opts.onStep) || function () {}, list = chunks(text, 1500), parts = [], rate = RATE;
    function run(i) {
      if (i >= list.length) return null;
      step(i + 1, list.length, 'the script');
      return speak(list[i], CALM).then(decode).then(function (d) {
        rate = d.rate;
        parts.push(silence(i ? 1.4 : 0.8, rate), d.pcm);
        return run(i + 1);
      });
    }
    return Promise.resolve(run(0)).then(function () {
      parts.push(silence(1.5, rate));
      var w = wav(parts, rate);
      return { bytes: w.bytes, seconds: w.seconds, exact: true };
    });
  }

  /* ---------------- storage ---------------- */

  function readIndex() {
    try { return JSON.parse(localStorage.getItem(INDEX) || '[]') || []; } catch (e) { return []; }
  }
  function writeIndex(a) { try { localStorage.setItem(INDEX, JSON.stringify(a)); } catch (e) { /* storage full */ } }
  function prefs() {
    var p;
    try { p = JSON.parse(localStorage.getItem(PREFS) || 'null'); } catch (e) { p = null; }
    return { voice: (p && p.voice) || VOICES[0].id, pace: (p && p.pace) || 5 };
  }
  function setPrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* not essential */ } }

  function db() {
    return new Promise(function (res, rej) {
      var q = indexedDB.open('qipath-narration', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('audio'); };
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error || new Error('This browser could not open its audio store.')); };
    });
  }
  function idb(mode, act) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var q = act(d.transaction('audio', mode).objectStore('audio'));
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error || new Error('The audio store refused that.')); };
      });
    });
  }

  function pathOf(id) { return 'narration/' + id + '.wav'; }

  // Chunks are a whole number of 3-byte groups, so each one is valid base64 on its own.
  function writeNative(id, bytes) {
    var FS = plugin('Filesystem'), size = 3 << 19, path = pathOf(id);
    function more(at) {
      if (at >= bytes.length) return Promise.resolve();
      return FS.appendFile({ path: path, directory: 'DATA', data: toB64(bytes.subarray(at, at + size)) })
        .then(function () { return more(at + size); });
    }
    return FS.writeFile({ path: path, directory: 'DATA', data: toB64(bytes.subarray(0, size)), recursive: true })
      .then(function () { return more(size); });
  }

  function erase(item) {
    if (native()) return plugin('Filesystem').deleteFile({ path: pathOf(item.id), directory: 'DATA' }).catch(function () {});
    return idb('readwrite', function (s) { return s.delete(item.id); }).catch(function () {});
  }

  /** One Sage count is kept for the device, and one narration for each script. */
  function store(uid, meta, bytes) {
    var id = meta.kind + '-' + Date.now().toString(36);
    var saved = native() ? writeNative(id, bytes)
      : idb('readwrite', function (s) { return s.put(new Blob([bytes], { type: 'audio/wav' }), id); });
    return saved.then(function () {
      var all = readIndex(), keep = [], drop = [];
      all.forEach(function (x) {
        var same = meta.kind === 'sage' ? x.kind === 'sage' : (x.kind === 'script' && x.uid === uid && x.scriptHash === meta.scriptHash);
        (same ? drop : keep).push(x);
      });
      var item = {};
      Object.keys(meta).forEach(function (k) { item[k] = meta[k]; });
      item.id = id; item.uid = meta.kind === 'sage' ? '*' : uid; item.made = new Date().toISOString(); item.bytes = bytes.length;
      keep.unshift(item);
      writeIndex(keep);
      return Promise.all(drop.map(erase)).then(function () { return item; });
    });
  }

  function list(uid) { return readIndex().filter(function (x) { return x.uid === '*' || x.uid === uid; }); }
  function remove(item) {
    writeIndex(readIndex().filter(function (x) { return x.id !== item.id; }));
    return erase(item);
  }
  function removeUser(uid) {
    return Promise.all(readIndex().filter(function (x) { return x.uid === uid; }).map(remove));
  }

  var lastUrl = null;
  function objectUrl(blob) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    return lastUrl;
  }
  function source(item) {
    if (native()) {
      return plugin('Filesystem').getUri({ path: pathOf(item.id), directory: 'DATA' }).then(function (r) {
        return global.Capacitor.convertFileSrc(r.uri);
      });
    }
    return idb('readonly', function (s) { return s.get(item.id); }).then(function (b) {
      if (!b) throw new Error('That audio is no longer on this device.');
      return objectUrl(b);
    });
  }
  // The slower route, for a web view that will not stream the file directly.
  function sourceInMemory(item) {
    if (!native()) return source(item);
    return plugin('Filesystem').readFile({ path: pathOf(item.id), directory: 'DATA' }).then(function (r) {
      return objectUrl(new Blob([fromB64(r.data)], { type: 'audio/wav' }));
    });
  }

  function fileName(item) {
    return 'QiPath-' + String(item.title || item.kind).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '.wav';
  }
  function share(item) {
    var name = fileName(item);
    if (native() && plugin('Share')) {
      var FS = plugin('Filesystem');
      return FS.copy({ from: pathOf(item.id), directory: 'DATA', to: name, toDirectory: 'CACHE' }).then(function () {
        return FS.getUri({ path: name, directory: 'CACHE' });
      }).then(function (r) {
        return plugin('Share').share({ title: item.title, files: [r.uri], dialogTitle: 'Share this audio' });
      });
    }
    return source(item).then(function (u) {
      var a = document.createElement('a');
      a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* ---------------- keeping the screen on while it plays ---------------- */

  var lock = null;
  function keepAwake(on) {
    try {
      if (on && !lock && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {});
      } else if (!on && lock) { lock.release(); lock = null; }
    } catch (e) { /* the screen may sleep; playback still works */ }
  }

  global.QPNarrate = {
    VOICES: VOICES, PACES: PACES, hash: hash, prefs: prefs, setPrefs: setPrefs,
    makeSage: makeSage, makeScript: makeScript, store: store, list: list, remove: remove, removeUser: removeUser,
    source: source, sourceInMemory: sourceInMemory, share: share, keepAwake: keepAwake,
    // Used by voice.js to play a spoken question and to build WAV recordings.
    CALM: CALM, decode: decode, wav: wav, toB64: toB64,
    // Exposed for the test harness.
    _: { decode: decode, wav: wav, spans: spans, findNumbers: findNumbers, paced: paced, numberWord: numberWord, countText: countText, chunks: chunks, toB64: toB64, fromB64: fromB64 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
