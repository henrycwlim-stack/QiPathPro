/* QiPath Pro: voice for the Coach screen.
 *
 * Push-to-talk answers become text in one of two ways, and the text always lands in the answer box for the person to check
 * and edit before anything is sent:
 *   device: Android's own speech recogniser through @capacitor-community/speech-recognition. It runs on the phone and works
 *           offline once the language is downloaded. In a desktop browser the Web Speech API stands in for testing.
 *   gemini: the answer is recorded, turned into a 16 kHz mono WAV on the phone, and transcribed by Gemini with the
 *           person's own key. Recordings are not kept.
 * Questions can be read aloud with the narration voice (Gemini speech, the same voice the Manifest narration uses).
 */
(function (global) {
  'use strict';

  var PREFS = 'qipath.coach.voice', MAX_SECONDS = 120, WAV_RATE = 16000;
  var LANGS = [['en-US', 'English'], ['zh-CN', '普通话 Mandarin'], ['zh-HK', '粵語 Cantonese'], ['ms-MY', 'Bahasa Melayu']];

  function prefs() {
    var p = null; try { p = JSON.parse(localStorage.getItem(PREFS) || 'null'); } catch (e) { p = null; }
    p = p || {};
    return { mode: p.mode || 'auto', speak: !!p.speak, pause: p.pause === undefined ? 5 : p.pause, lang: p.lang || 'en-US' };
  }
  function setPrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* not essential */ } }

  function plugin() { var C = global.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.SpeechRecognition ? C.Plugins.SpeechRecognition : null; }
  function webRecogniser() { return global.SpeechRecognition || global.webkitSpeechRecognition || null; }
  function canRecord() { return !!(global.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && global.MediaRecorder); }

  /* Which engine to use: the person's choice where it is possible, otherwise the best one available. */
  function engine(geminiOK) {
    var p = prefs(), dev = !!(plugin() || webRecogniser()), gem = geminiOK && canRecord();
    if (p.mode === 'device' && dev) return 'device';
    if (p.mode === 'gemini' && gem) return 'gemini';
    return dev ? 'device' : gem ? 'gemini' : null;
  }

  /* ---------------- on-device recognition ---------------- */
  var live = null;   // { stop: fn returning Promise<text> }

  function startDevice(lang, onPartial, onEnd) {
    var P = plugin(), text = '';
    if (P) {
      var subs = [];
      return P.available().then(function (a) {
        if (!a || !a.available) throw new Error('Speech recognition is not available on this phone. Choose Gemini transcription in Voice settings.');
        return P.requestPermissions();
      }).then(function (st) {
        if (st && st.speechRecognition && st.speechRecognition !== 'granted') throw new Error('Microphone permission was not given. You can allow it in the phone\'s app settings.');
        return Promise.all([
          P.addListener('partialResults', function (d) { if (d && d.matches && d.matches[0]) { text = d.matches[0]; onPartial(text); } }),
          P.addListener('listeningState', function (d) { if (d && d.status === 'stopped' && onEnd) onEnd(); })
        ]);
      }).then(function (handles) {
        subs = handles;
        live = { stop: function () {
          return P.stop().catch(function () { /* it may have stopped by itself */ }).then(function () {
            subs.forEach(function (h) { try { h.remove(); } catch (e) { /* gone */ } });
            live = null; return text;
          }); } };
        return P.start({ language: lang, maxResults: 1, partialResults: true, popup: false });
      });
    }
    var R = webRecogniser();
    if (!R) return Promise.reject(new Error('Speech recognition is not available here.'));
    var r = new R(), done = null, finals = '';
    r.lang = lang; r.interimResults = true; r.continuous = true;
    r.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finals += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      text = (finals + interim).trim(); onPartial(text);
    };
    r.onend = function () { if (done) done(text); else if (onEnd) onEnd(); };
    r.onerror = function () { /* onend follows */ };
    live = { stop: function () { return new Promise(function (res) { done = function (t) { live = null; res(t); }; try { r.stop(); } catch (e) { done(text); } }); } };
    r.start();
    return Promise.resolve();
  }

  /* ---------------- recording for Gemini ---------------- */
  var rec = null;   // { recorder, stream, chunks, t0 }

  function startRecording() {
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }).then(function (stream) {
      var mr = new global.MediaRecorder(stream), chunks = [];
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.start();
      rec = { recorder: mr, stream: stream, chunks: chunks, t0: Date.now() };
    });
  }
  // Stop, then turn the recording into a 16 kHz mono WAV in base64.
  function stopRecording() {
    if (!rec) return Promise.reject(new Error('Nothing is being recorded.'));
    var r = rec; rec = null;
    return new Promise(function (res) { r.recorder.onstop = res; r.recorder.stop(); }).then(function () {
      r.stream.getTracks().forEach(function (t) { t.stop(); });
      var seconds = (Date.now() - r.t0) / 1000;
      if (seconds < 0.6) throw new Error('Hold the button down while you speak.');
      return new Blob(r.chunks, { type: r.recorder.mimeType || 'audio/webm' }).arrayBuffer().then(function (buf) {
        var AC = global.AudioContext || global.webkitAudioContext, ctx = new AC();
        return new Promise(function (ok, bad) { ctx.decodeAudioData(buf, ok, bad); }).then(function (audio) {
          try { ctx.close(); } catch (e) { /* fine */ }
          var frames = Math.max(1, Math.ceil(audio.duration * WAV_RATE)), off = new global.OfflineAudioContext(1, frames, WAV_RATE);
          var src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start();
          return off.startRendering();
        });
      }).then(function (out) {
        var f = out.getChannelData(0), pcm = new Int16Array(f.length);
        for (var i = 0; i < f.length; i++) { var v = Math.max(-1, Math.min(1, f[i])); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
        var N = global.QPNarrate, w = N.wav([pcm], WAV_RATE);
        return { b64: N.toB64(w.bytes), seconds: w.seconds };
      });
    });
  }
  function cancelRecording() {
    if (!rec) return;
    try { rec.recorder.stop(); } catch (e) { /* fine */ }
    rec.stream.getTracks().forEach(function (t) { t.stop(); });
    rec = null;
  }

  /* ---------------- spoken questions ---------------- */
  var player = null;
  function speak(key, text, onEnd) {
    var N = global.QPNarrate, p = N.prefs();
    return global.QPAI.speech(key, text, { voice: p.voice, style: N.CALM }).then(function (clip) {
      var d = N.decode(clip), w = N.wav([d.pcm], d.rate), url = URL.createObjectURL(new Blob([w.bytes], { type: 'audio/wav' }));
      stopSpeaking();
      player = new Audio(url);
      player.onended = function () { URL.revokeObjectURL(url); player = null; if (onEnd) onEnd(); };
      return player.play().then(function () { return w.seconds; });
    });
  }
  function stopSpeaking() { if (player) { try { player.pause(); } catch (e) { /* fine */ } player = null; } }
  function speaking() { return !!player; }

  global.QPVoice = { LANGS: LANGS, MAX_SECONDS: MAX_SECONDS, prefs: prefs, setPrefs: setPrefs, engine: engine, hasDevice: function () { return !!(plugin() || webRecogniser()); },
    canRecord: canRecord, startDevice: startDevice, stopDevice: function () { return live ? live.stop() : Promise.resolve(''); },
    startRecording: startRecording, stopRecording: stopRecording, cancelRecording: cancelRecording,
    speak: speak, stopSpeaking: stopSpeaking, speaking: speaking };
})(typeof window !== 'undefined' ? window : this);
