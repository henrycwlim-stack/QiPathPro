#!/usr/bin/env node
/**
 * Builds a signed release APK from this folder, the same way from a fresh GitHub clone as from a working copy.
 *
 *   npm run release                 # install, sync, build, verify the signature, copy the APK
 *   npm run release -- --dry        # compile an unsigned release to check the build (no signing needed)
 *   npm run release -- --skip-install --out "D:/apks" --force
 *
 * Signing details are never in the repository. They are read by android/app/build.gradle from your personal
 * .gradle/gradle.properties (or environment variables): QIPATH_STORE_FILE, QIPATH_STORE_PASSWORD, QIPATH_KEY_ALIAS,
 * QIPATH_KEY_PASSWORD. The finished APK must be signed by the QiPath Pro certificate below, or the script stops:
 * phones with the app installed only accept updates signed by the same key.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// SHA-256 of the certificate that signed every earlier release (CN=Henry Lim, O=PLG, C=SG).
const EXPECTED_CERT = (process.env.QIPATH_CERT_SHA256 || 'e6b8f62998568dc9196a5ddade5d65c45e9226e405ee664766b0d22e2ac16afa').toLowerCase();
const SIGN_KEYS = ['QIPATH_STORE_FILE', 'QIPATH_STORE_PASSWORD', 'QIPATH_KEY_ALIAS', 'QIPATH_KEY_PASSWORD'];

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const dry = flag('--dry'), win = process.platform === 'win32';

function step(t) { console.log('\n== ' + t); }
function fail(t) { console.error('\nRelease stopped: ' + t); process.exit(1); }
// Windows runs commands through cmd.exe, so any path with a space (such as "Android Apps") must be quoted.
const q = s => (win && /[\s&()]/.test(s) && !/^".*"$/.test(s) ? '"' + s + '"' : s);
function run(cmd, list, cwd) {
  const r = spawnSync(q(cmd), list.map(q), { cwd: cwd || root, stdio: 'inherit', shell: win });
  if (r.status !== 0) fail(cmd + ' ' + list.join(' ') + ' failed (exit ' + r.status + ').');
}
function capture(cmd, list) {
  const r = spawnSync(q(cmd), list.map(q), { cwd: root, encoding: 'utf8', shell: win });
  if (r.status !== 0) fail(cmd + ' failed: ' + (r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' '));
  return r.stdout;
}
function properties(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(l => {
    const m = /^\s*([A-Za-z0-9_.-]+)\s*[=:]\s*(.*)$/.exec(l);
    if (m) out[m[1]] = m[2].trim();
  });
  return out;
}

// 1. Version
const gradleFile = path.join(root, 'android', 'app', 'build.gradle');
const gradle = fs.readFileSync(gradleFile, 'utf8');
const versionName = (/versionName\s+"([^"]+)"/.exec(gradle) || [])[1];
const versionCode = (/versionCode\s+(\d+)/.exec(gradle) || [])[1];
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!versionName || !versionCode) fail('could not read versionName and versionCode from android/app/build.gradle.');
if (pkg.version !== versionName) fail('package.json is ' + pkg.version + ' but build.gradle is ' + versionName + '. Make them match.');
step('QiPath Pro ' + versionName + ' (versionCode ' + versionCode + ')' + (dry ? ', test build without signing' : ''));

// 2. Signing details (checked here so a missing value is reported before a long build; values are never printed)
const userProps = properties(path.join(os.homedir(), '.gradle', 'gradle.properties'));
const val = k => (process.env[k] || userProps[k] || '').trim();
if (!dry) {
  const missing = SIGN_KEYS.filter(k => !val(k));
  if (missing.length) {
    fail('signing is not set up. Missing ' + missing.join(', ') + ' in ' + path.join(os.homedir(), '.gradle', 'gradle.properties') +
      '.\nSee README, "Signed release". For a build check without signing, run: npm run release -- --dry');
  }
  if (!fs.existsSync(val('QIPATH_STORE_FILE'))) fail('the key file in QIPATH_STORE_FILE was not found: ' + val('QIPATH_STORE_FILE'));
}

// 3. Android SDK location
step('Android SDK');
const localProps = path.join(root, 'android', 'local.properties');
if (!fs.existsSync(localProps)) run('node', [path.join('tools', 'setup-sdk.js')]);
const sdk = properties(localProps)['sdk.dir'];
if (!sdk || !fs.existsSync(sdk)) fail('android/local.properties does not point at an Android SDK. Run: node tools/setup-sdk.js');
console.log(sdk);

// 4. Dependencies exactly as locked, then the web files into the Android project
if (!flag('--skip-install')) { step('npm ci'); run('npm', ['ci']); }
step('Capacitor sync');
run('npx', ['cap', 'sync', 'android']);

// 5. Build
step('Gradle assembleRelease');
const gradlew = path.join(root, 'android', win ? 'gradlew.bat' : 'gradlew');
run(gradlew, ['assembleRelease', '--console=plain'].concat(dry ? ['-PQIPATH_ALLOW_UNSIGNED=true'] : []), path.join(root, 'android'));
const outDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release');
const apk = path.join(outDir, dry ? 'app-release-unsigned.apk' : 'app-release.apk');
if (!fs.existsSync(apk)) fail('the build finished but ' + apk + ' is missing.');

// 6. Check the package: version inside the APK, and (for a real release) the signing certificate
const tools = path.join(sdk, 'build-tools');
const latest = fs.readdirSync(tools).filter(d => /^\d/.test(d)).sort((a, b) =>
  a.split('.').map(Number).reduce((r, x, i) => r || x - (b.split('.').map(Number)[i] || 0), 0)).pop();
if (!latest) fail('no Android build-tools found in ' + tools);
const bt = path.join(tools, latest);
step('Checking the APK with build-tools ' + latest);
const badging = capture(path.join(bt, win ? 'aapt2.exe' : 'aapt2'), ['dump', 'badging', apk]);
const inCode = (/versionCode='(\d+)'/.exec(badging) || [])[1], inName = (/versionName='([^']+)'/.exec(badging) || [])[1];
if (inCode !== versionCode || inName !== versionName) fail('the APK says ' + inName + ' (' + inCode + '), expected ' + versionName + ' (' + versionCode + ').');
console.log('Version inside the APK: ' + inName + ' (' + inCode + ')');
if (dry) {
  console.log('\nTest build succeeded: ' + apk + '\nIt is unsigned and is not copied anywhere. Set up signing and run npm run release for a real release.');
  process.exit(0);
}
const certs = capture(path.join(bt, win ? 'apksigner.bat' : 'apksigner'), ['verify', '--print-certs', apk]);
const sha = ((/Signer #1 certificate SHA-256 digest:\s*([0-9a-f]+)/i.exec(certs) || [])[1] || '').toLowerCase();
if (!sha) fail('apksigner could not read a signature from the APK.');
if (sha !== EXPECTED_CERT) fail('the APK is signed with a different key (' + sha + ').\nPhones with QiPath Pro installed would refuse it as an update. Check QIPATH_STORE_FILE and QIPATH_KEY_ALIAS.');
console.log('Signed by the QiPath Pro certificate: ' + sha);

// 7. Copy it next to the version folders, named like the earlier releases
const dest = path.join(opt('--out') || path.join(root, '..'), 'QiPathPro version ' + versionName + '_release.apk');
if (fs.existsSync(dest) && !flag('--force')) fail(dest + ' already exists. Add --force to replace it.');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(apk, dest);
console.log('\nSigned release ready: ' + dest + ' (' + (fs.statSync(dest).size / 1048576).toFixed(1) + ' MB)');
