# QiPath Pro — version 9

Version 9 corrects two errors in the Qimen plate engine (`www/js/systems.js`), which every Qimen
feature reads — the hour, day, month and year charts, the destiny chart, Forecast, Search, Manifest,
Strategy, San Cai's Man layer, the Fibonacci and quantitative layers, and the method trial:

1. **The doors were moved along the wrong path.** The envoy gate (值使) must move one palace per hour
   since the xun head through the Lo Shu numbers — 1→2→…→9 in Yang dun, 9→8→…→1 in Yin dun — with a
   count that ends on the centre lodged in 坤 (2). Version 8 counted along the outer ring instead,
   which put the doors in the wrong palaces on about 80% of all plates (3,509 of the 4,380
   double-hours in 2026). Checked against an independent reference chart for 13 August 1972, 02:15
   (丙子 day, 己丑 hour, 阴遁 8局): 惊门 with 九天 in the Northwest and 开门 with 九地 in the North.
2. **甲 hours were cast in the wrong position.** On a 甲 hour the stem hides under its xun yi, so the
   chief stays on its own palace and the plate is 伏吟. Version 8 tested for 戊 instead of 甲 and sent
   every 甲 hour to palace 2, shifting the stars, stems and deities (377 plates in 2026).

Verified after the fix: all 72 甲 hours tested form a true 伏吟 plate, and all 8,760 plates of 2025–2026
pass the structural checks (eight distinct doors, deities and stars, the chief deity with the chief
star, the envoy door where the numeric count puts it). The Qimen entropy reference table was
recalibrated with the corrected engine, and the method trial was rerun on the real archive: every
method remains at chance after correction.

Saved records keep the plate as it was saved. Recast a chart to see it under the corrected engine.

### 9.1 — destiny profile on Chart › Qimen Destiny

- **Destiny palace (命宮)** — the palace where the Day Stem sits on the heaven plate, as in Qi Men destiny
  analysis: its direction, the **Life Stem** (the Day Stem over its earth stem), the **Door of Destiny**,
  the **Star of Destiny** and the **Guardian of Destiny** (the deity seated with the Life Stem), each with
  its 旺相休囚死 strength. A 甲 day stem is looked up under the yi of the day's xun; a stem in the centre
  is read from 坤, where the centre lodges.
- **Life Star (本命星)** — the Nine Star Ki star of the solar birth year (1972 → 一白). **Life Gua (命卦)** —
  the Eight Mansions gua for the profile's gender, with its group and directions.
- **Day Master stars** — the Day Master stem, Noble People (天乙貴人), Intelligence Star (文昌), Peach
  Blossom (桃花, from the day branch), Sky Horse (驛馬, from the day branch) and Taiji Nobleman (太極貴人),
  using the same tables as Chart › Relations. Each is placed on the destiny plate by its branch — palace,
  direction, door and deity — and flagged when it also appears in the Four Pillars.

All of it is saved with the chart and fed to the destiny AI reading, which gains "destiny palace" and
"Day Master stars" sections.

### 9.2 — Mind Palace and Soul Palace

- **Mind Palace (命宮)** — count back from 子 (as the first month) to the birth month, set the birth hour
  there and count forward to 卯; the stem follows 五虎遁 from the year stem. The month is the month
  pillar's (節-based). 1972-08-13 02:15 → 戊申 Earth Monkey; the textbook case 正月子时 → 命宮 卯 also holds.
- **Soul Palace (胎元)** — the conception pillar: month stem + 1, month branch + 3. 戊申 month → 己亥 Earth Pig.

Both were checked against an independent reference chart, along with Noble People, Intelligence,
Peach Blossom, Sky Horse and Taiji Nobleman. Each is placed on the destiny plate by its branch.

### 10.4.4 — Cloud builds pass
Version folder 10.4.4 (versionCode 50), copied from 10.4.3. Both workflows now pass: they use Node 22 (the Capacitor 8 CLI refuses
older Node) and JDK 21 (`npx cap sync` writes Java 21 compile options into the Android project). Tested on a temporary branch first:
Build APK produced the debug APK, and the Signed Release APK dry run built and checked a release APK.

### 10.4.3 — Cloud builds working again
Version folder 10.4.3 (versionCode 49), copied from 10.4.2. Both workflows (Build APK and Signed Release APK) failed at "Set up Android SDK"
since at least 10.1.0: `android-actions/setup-android` installs the retired `tools` package by default, which the runner's newer sdkmanager
no longer offers. They now install only `platform-tools`.

### 10.4.2 — Signed release from your phone
Version folder 10.4.2 (versionCode 48), copied from 10.4.1. A new workflow, `.github/workflows/release-apk.yml` ("Signed Release APK"),
builds a signed release in GitHub's cloud with the same `npm run release` and certificate check, so a release can be made from a phone.
`tools/release.js` now creates the `--out` folder if it does not exist.

**Signed release from your phone**
1. Once, add four repository secrets in GitHub > Settings > Secrets and variables > Actions > New repository secret:
   `QIPATH_KEYSTORE_BASE64` (the key file in base64), `QIPATH_KEY_ALIAS`, `QIPATH_STORE_PASSWORD`, `QIPATH_KEY_PASSWORD`.
   To copy the key file as base64 on Windows, run in PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Henry\Documents\Android Apps\QPathPro\QiPathPro\henry")) | Set-Clipboard`
   then paste it as the value. Secrets cannot be read back once saved; GitHub masks them in logs.
2. To release: GitHub app > the repository > Actions > Signed Release APK > Run workflow (on `main`).
3. When it finishes, open the run and download the `QiPathPro-X.Y.Z-signed-release` artifact (a zip containing the APK).
   Tick "publish" to also attach the APK to a GitHub Release `vX.Y.Z`; this repository is public, so that file is public too.
   Tick "dry" to test the workflow without the key (unsigned APK).

### 10.4.1 — Signed release from any copy
Version folder 10.4.1 (versionCode 47). Any version folder or fresh GitHub clone can now build a signed release with one command.

**Signed release**
1. Once per PC, fill in `C:/Users/<you>/.gradle/gradle.properties` (outside every repository, never committed):
   `QIPATH_STORE_FILE` (path to the key file, forward slashes), `QIPATH_KEY_ALIAS`, `QIPATH_STORE_PASSWORD`, `QIPATH_KEY_PASSWORD`.
   Environment variables of the same names take precedence, for a CI job.
2. From the version folder or a clone: `npm run release`. It checks the version numbers match, runs `npm ci`, writes
   `android/local.properties` if missing (`tools/setup-sdk.js`), runs `npx cap sync android` and `gradlew assembleRelease`, checks the
   version inside the APK, and checks the APK is signed by the QiPath Pro certificate
   (SHA-256 e6b8f62998568dc9196a5ddade5d65c45e9226e405ee664766b0d22e2ac16afa, CN=Henry Lim). A different key is refused, because installed
   copies would not accept it as an update. The APK is copied beside the version folders as `QiPathPro version X.Y.Z_release.apk`.
   Options: `--dry` (unsigned test build, nothing copied), `--skip-install`, `--out <folder>`, `--force` (replace an existing APK).
3. `android/app/build.gradle` reads the signing settings and refuses to produce an unsigned release when they are missing.
Back up the key file somewhere safe and separate from its passwords: if it is lost, installed copies cannot be updated.

### 10.4 — Coach: voice
Version folder 10.4.0 (versionCode 46), copied from 10.3.0. Adds `@capacitor-community/speech-recognition` 6.0.1 (matches Capacitor 6) and the
RECORD_AUDIO and MODIFY_AUDIO_SETTINGS permissions. Voice code is in `www/js/voice.js` (`QPVoice`).
- Push-to-talk: a large "Hold to speak" button records while held (Space or Enter toggles it from a keyboard), up to 2 minutes.
- Transcription, chosen in Voice settings: on the phone with Android's own recogniser (works offline once the language is downloaded; the Web
  Speech API stands in when testing in a desktop browser), or by Gemini with the user's own key. For Gemini the recording is turned into a
  16 kHz mono WAV on the phone and sent with `QPAI.transcribe`; Claude does not accept audio. Recordings are never stored.
- Languages: English, 普通话 Mandarin, 粵語 Cantonese, Bahasa Melayu.
- The transcript always lands in the answer box to check and edit; nothing is sent until the person presses Send, and every message still goes
  through the on-device safety screen.
- Spoken questions: optional, read with the narration voice (Gemini speech, the voice chosen for Manifest narration), followed by a quiet
  pause of 0 to 20 seconds during which the microphone stays closed. "Read the question aloud" replays the current question.

### 10.3 — Coach: systemic thinking
Version folder 10.3.0 (versionCode 45), copied from 10.2.0. Coaching now has nine stages: a new "See the system 系统" stage sits after the
Satir iceberg and before the chart mirror, so the session looks inward first and then outward. Seven systems lenses (`SYSTEM_LENSES` in
`www/js/coach.js`), in QiPath's own words: Map the system 系统图, Patterns over events 模式, Loops 循环, Other perspectives 多视角 (circular
questions), Structures and beliefs 结构与信念 (events, patterns, structures, mental models), What the problem does 问题的功能, and Ripples and
leverage 杠杆. The prompt treats the problem as part of a living system, prefers circular causality to blame, and lets the system view
inform the principles and the chosen step. Each AI turn may name people in the coachee's system and a repeating loop; the screen keeps a
"Your system" map of them (up to 14 people and 6 loops), and the summary adds "The wider system". The coaching profile now also covers Spouse,
Parents, Colleagues, Bosses and Friends. Drafts from 10.2.0 resume at the right stage (`QPCoach.upgrade`).

### 10.2 — Coach 教练: guided mindset coaching
Version folder 10.2.0 (versionCode 44), copied from 10.1.0. A new Coach category runs a text coaching session with the user's own AI key
(`www/js/coach.js`, screen in `renderCoach` in `app.js`). The app holds eight stages (Arrive, Focus, Go deeper, Chart as a mirror, Five principles,
Insight, Commit, Close); each AI turn returns one short reflection and exactly one open question, the Satir iceberg layer it works on and the principle
used, and the stage advances within set minimum and maximum turns. Frameworks: mindfulness, Virginia Satir's iceberg (行为 to 自我) and the five life
principles of Chou Ting Wen 周鼎文 (事实, 序位, 平衡, 整体, 流动), described in QiPath's own words. A coaching profile from the Combined reading and the BaZi
analysis is offered to the AI as patterns to test, never as fate. Sessions in progress are kept as a device draft; finished ones are saved to the Journal
with a summary (title, insights, yearning, principles, commitment, follow-up) and appear in Outcomes.
Safety: every message is screened on the device before it is sent, and the AI also flags self-harm, abuse and serious health problems. A crisis stops
the session with fixed, tactful wording (never AI text), tap-to-call helplines for the detected country (14 countries, verified 12 Nov 2026), the
emergency number and tips for a coach on ending gently; it is not saved unless the person keeps it. A health concern shows the medical-care message
with End and Continue options. Voice input is not in this version.

### 10.1 — Manifest goals, stages and best-hour search
Version folder 10.1.0 (versionCode 43), copied from 10.0.0. From this version on, every code change goes into a new, incrementally numbered folder.
Strategy › Manifest now starts with a stage (Priming, Attunement or Activation) and one of 20 goals, from Intuition and Courage to Find a lost person,
Noble help and Agreements (`MANIFEST_GOALS` and `MANIFEST_STAGES` in `www/js/qmdj.js`). "Find the best hours" scores every hour and outer palace in a
3 to 31 day range (`searchManifest`) and lists the twelve best, each with the palace to sit with your back to, the direction to face, a 0 to 100 fit and
the reasons and cautions. Each palace is scored on how well its door, star, deity and heaven stem serve the goal, plus the palace quality used elsewhere,
with stage weights: Priming favours star and deity, Attunement door-palace harmony, Chief, Envoy and good structures, Activation a strong, timely door.
Five Disharmony hours are left out and night hours can be. The fit scale is calibrated on 7,680 palace-hours (median palace 50, top tenth about 75).
Any date and hour can still be chosen: the screen shows that hour chart, ranks its eight palaces for the goal (`manifestRank`), and a tap on the chart
or a row picks the palace. The script, steps, saved record and AI expansion carry the stage and goal. Joey Yap times these practices by Seven Stars
levels, which cannot be calculated yet, so the ranking is QiPath's own.

### 10.0 — New Qimen chart design
Every Qimen plate now uses a square board with a hexagram rim, a direction frame showing void and Horse Star markers, and palaces
laid out as heaven stem, star and deity above earth stem, door and number. The Destiny and Cast Qimen screens add a date banner and
pillar table, and hour charts add Asker and Focus Point panels.

### 10.0 — Rim hexagrams and flown numbers on the Qimen plate
Every Qimen plate now shows each palace's rim hexagram, formed from the Star's home trigram over the Door's home trigram,
with its Xuan Kong trigram number and period. The large number in each palace is the Ju placed in the centre and flown forward
in Luo Shu order. Both rules were worked out from Thrive chart samples, not from a published source. Rim pillars and the Seven Stars
levels are not included because their rules are still unknown.

### 10.0 — Combined reading

Destiny › Combined reads one birth chart across BaZi, Zi Wei, Qimen Destiny, Qi Zheng Si Yu and He Luo Li Shu for 34 life areas, each with a plain-English meaning, the evidence from each system, how firm it is and concrete steps (`www/js/combined.js`, wording in `combined-text.js`), with an optional AI reading. The result and its AI analysis can be saved to Journal › Saved Readings. Each system scores an area only where it has its own symbol, or says which nearest area it read instead, and the level is a plain average. That weighing is the app's own. He Luo speaks only on Self, Luck, Later life and Purpose. Together stays a separate screen.

### 10.0 — Qi Zheng Si Yu and He Luo Li Shu

Destiny now has two more natal systems. Qi Zheng Si Yu (`www/js/qizheng.js`) places the seven bodies from the Swiss Ephemeris tables and the four remainders on twelve palaces. Its palaces follow the solar terms, the Life palace uses the traditional hour count to 卯, 羅睺 and 計都 are the mean nodes as Chinese astrologers assign them, 月孛 is the mean lunar apogee, and 紫氣 follows a conventional 28-year circuit. It works for births from 1900 to 2100.

He Luo Li Shu (`www/js/heluo.js`) turns the pillars into early and later heaven hexagrams, finds the 元堂 line and lists the life periods. Sources disagree on small points, and neither system has been checked against a printed chart from a practitioner.

### 10.0 — Karmic Palace

Chart › Qimen Destiny now also labels the Karmic palace (因果) wherever the natal Envoy door (值使) has its home. The Thrive reports print no Karmic label, so this is inferred from their Contribution aspect, which fits this rule for all four people checked. It is saved with new charts.

### 10.0 — Zodiac, Mobility and Outcomes

Seasons › Zodiac gives all twelve signs for any year: Grand Duke position, the year stem's growth stage, relation to the year branch and common stem and branch stars (`www/js/zodiac.js`). The included markers match the 2027 sign slides on 12 of 12 signs; only one year of slides was available, and the slides' other stars are not included. The outlook word is this app's own weighing.

Space › Mobility places the nine palace nobles (九宮貴神) on the eight directions, forward for a Yang natal plate and backward for a Yin one, which matches 48 of 48 directions in six Thrive lists once the centre is given. The personal centre those reports use could not be derived, so the default is the year star and the person can choose another for each year. Theme notes are this app's own.

Journal › Outcomes lets you mark a saved reading as happened, partly or did not happen, with a note, and totals the results by kind. Numbers keep their own ledger in Numbers Lab.

### 10.0 — Seven categories

The bottom bar is now Destiny, Seasons, Strategy, Space, Reports, Numbers Lab and Journal, with each feature under its category (`NAV` in `www/js/app.js`). Now, Learn and Profile moved to the top bar. Zi Wei periods and the Qimen year and month plates moved out of the natal charts into Seasons. Saved readings moved from Profile to Journal, and Journal lists narrations on the device.

### 10.0 — New version folder

Copied from 9.32.0 with its uncommitted work (versionCode 42, versionName 10.0.0).

### 9.32 — Life palaces on the destiny chart

Chart › Qimen Destiny now labels Destiny, Wealth, Property, Relationships, Knowledge, Health, Family and Career on the natal plate, in the palace detail and in the saved record. Destiny is the Day Stem's palace. Wealth is 生门, Property 死门, Knowledge 杜门, Family 休门, Career 开门, Relationships 六合 and Health 天芮. The rule was read from the labelled natal charts in three Thrive 2027 reports and matches 24 of 24 placements.

### 9.32 — Manifest details and narration

The Manifest form takes what you specifically want to manifest and what you will give in return, one per line. Both are written into the script, the AI expansion and the saved record, and a change to them starts a fresh AI reading. An ask that mentions health also shows the medical care note.

The narration block creates two kinds of audio with Google's speech models and keeps them on the device: a Sage 64 to 1 countdown with a guided opening (made once, reused for every script) and a reading of the current script. The 64 to 1 countdown is this app's own arrangement, not a book rule. Doors are read by their English names, so 景门 and 惊门 cannot sound alike. Speech needs a Google Gemini key; someone using Claude for readings can add one in the narration block.

### 9.32 — New version folder

Copied from 9.31.0 with its uncommitted work. The entries below marked 9.31 from here down to Warcraft and the plate fixes were made after the 9.31.0 release APK, so they first ship in 9.32.0.

### 9.31 — Compendium 2nd Edition

Compared with the first edition, the app now follows the 2nd Edition (October 2015) where they differ on a rule or name: 飞鸟跌穴 also covers 丙 over 戊, 日旺 is 乙 in 巽 or 坎, 星旺 is 丁 in 巽 or 离, 人假 drops the row that repeated 地假, the Three Nobles Receive Envoy drop their stem pair rows, 飞宫 and 伏宫 also cover 戊 as the charts mark them, 玉女守门 needs 丁 on the earth plate, and stem pair names follow its stem chapters. The rating table is unchanged.

### 9.31 — Strategic Execution

`www/js/execution.js` and the Consult tab pick the seat or direction for one of five activities, following Joey Yap's Qi Men Dun Jia Strategic Executions, with its pit stop method for a destination in a weak direction. Ratings come from the Compendium's stem table. The book's written forecasts are not reproduced, and the ranking and notes are QiPath's own.

### 9.31 — Reading methods and symbol lists

The books use the Day Stem, Hour Stem, Useful God and Life Stem. Door, Star, Deity and Chief readings are not named as methods there, so the app now says they are its own lenses. The category lists follow the books: wealth reads Nine Earth, lost things Six Harmony, travel the Heart star and initiatives the Assistant star. Partnership is a new question, Budget also takes the book's loan rules, Travel has its land, sea and air readings, and the Chief and Envoy frame reads the Envoy.

### 9.31 — The day changes at midnight

`fourPillars` no longer moves the day at 23:00, following the Compendium (p.181-182), the Ten Thousand Year Calendar and the Compendium 2nd Edition's 11pm chart. 23:00–23:59 is the Late Rat hour: today's day, with the next day's Zi stem. This also changes the Day Master for births from 23:00 to 23:59. Hour pickers list the two Rat hours separately. The Warcraft book's charts use today's own Zi stem at that hour; `lateZi: false` gives that reading.

### 9.31 — Zhi Run repeats from the Ten Thousand Year Calendar

`LEAP_BLOCKS` in `systems.js` holds the 37 repeated 芒种 and 大雪 blocks from 1947 to 2049 in Joey Yap's calendar. The old nine-day rule matched 85.4% of the calendar's 7,286 yuan entries from 1945 to 2051, because the calendar sometimes repeats at seven or eight days. The table matches all but one. Dates outside those years still use the rule.

### 9.31 — Warcraft

`www/js/warcraft.js` and the Consult tab read an hour plate through Sun Tzu's 13 chapters, following Joey Yap's Qi Men Dun Jia Sun Tzu Warcraft: the 7 Criteria, Host and Guest, resources, deception, the Nine Dun, hazards and the battleground map. The book gives the method but no scoring, so the leans and the verdict are QiPath's own.

### 9.31 — Useful Gods from Forecasting Methods

Forecast now follows Joey Yap's two Forecasting Methods books where they have a matching section: lost objects read Six Harmony, marriage reads 乙 and 庚, promotion and job offers read the Open Door against the asker, and wealth reads 戊 against the Life Door. Lost people and objects turn the doors around. `QPSystems.forecastRules` takes a context with the structures, year stem and hour stem. Restructuring, logistics and budget have no matching section and stay as QiPath's own choices.

### 9.31 — Stem rules and over-frequent structures

Eight stem rules that were not in the compendium, or repeated another rule, are gone, and so are QiPath's own signals that hold on 70% or more of plates. 六仪入墓 now uses each stem's grave from the twelve-phase table and needs that branch in the date. 门入墓 now covers all eight doors. Forecast counts only the structures on the palaces it reads, because a whole-plate count cancels out, and reads door 伏吟 and 反吟 once for the plate. A door 反吟 plate always reads Unfavourable. The plate badge counts only rated structures.

### 9.31 — Forecasting rules from the compendium

`QPSystems.forecastRules(chart, topic, seats, hourBranch)` holds the Forecast panels from the door, star and deity pages, for marriage, career, wealth, deals, health, travel, exams and disputes. Forecast now reads the door on each symbol, with a stronger weight on the main one, and `DOOR_TOPIC` holds the doors the book turns around by topic. A star is read by its seasonal strength, and stems and deities by their own element. The 年命 method now finds the birth-year stem on the heaven plate. On Yang plates Grappling Hook and Red Phoenix stand in for White Tiger and Black Tortoise. The point values are QiPath's own. Health readings in Forecast and Oracle carry `QPSystems.HEALTH_CARE`, and the Oracle does not suggest waiting for a better moment on health. The AI prompts for Forecast get the same instruction.

### 9.31 — Stem pairs from the 十干剋應 tables

`www/js/structures.js` now holds the compendium's 100-pair tables (p.279-280), read through `QPData.stemCombo(heaven, earth)` and shown on each palace card. The 26 older pair rules take their name and rating from the tables, with source `stem_table`. Moderate pairs count as `special`. The other pairs are lookup only, so a palace does not always carry a structure.

### 9.31 — Nobles in their graves

`QPSystems.nobleGrave(stem, palace)` holds the 三奇入墓 table. The structure appears somewhere on most plates, so Forecast and Oracle only warn about a Noble the reading depends on: a symbol for the question, the asker's Day Stem or the matter's Hour Stem. Each Noble costs 1 point in Forecast and 0.5 in Oracle, once per reading; these are QiPath's own weights.

### 9.31 — Five Disharmony Hour warnings

`QPSystems.disharmony(dayStem, hourStem)` holds the 五不遇时 rule. The book gives it only minor weight in forecasting and places it mainly in date selection, so Forecast, Oracle and Tactical posture warn without changing their scores. The tools that suggest a time leave these hours out: ritual windows, super-windows, the structure scan, risk windows, the Jiazi hour pick, romance times and the Oracle's "better moment". The formation search still lists them.

### 9.31 — Door strength

`QPSystems.doorSeason` gives each door its eight-state season from the compendium's table, so `gateStrength` is now seasonal. `gatePalace` holds 门迫, 宫迫, 和, 义 or 比和. In `palaceQuality`, compelling now mutes a door in either direction, so a compelled bad door does less harm, as the book says. 门迫格, 宫迫格 and 门宫和义 no longer also count in the structure net. The factors in `doorForce` are QiPath's own weighting.

### 9.31 — Star strength, Host and Guest

`QPSystems.starSeason` rates the nine stars by solar month from the compendium's 九星四時旺相休囚 table, so `starStrength` no longer depends on the palace. The old star and palace relation is now `starPalace`. Each palace also has `hostGuest` (heaven plate star as Guest, the palace's native star as Host), and `hostGuestRead(chart, useHour)` gives the plate's read from the chief star and the Yin or Yang hour. Tactical posture now leads with this, and the mansions are shown as background. `palaceQuality` adds the star's season at a weight of 0.3 per rank, which is QiPath's own weighting.

### 9.31 — Structures rebuilt from the compendium (`www/js/structures.js`)

Section H's tables are now data rows (heaven stem, earth stem, door, deity, palace), and all 20 structures marked on the 22 Oct 2024 and 4 Feb 2025 reference charts are detected. Lodged stems count, and each pillar's 甲 reads as its 六儀. Older checks with no table in the compendium are kept as `signal` entries in the `special` category, so they no longer count as auspicious or hostile. `QPData.NOT_DETECTED` lists entries that have no usable rule. After changing rules, run `node tools/measure-formations.js` to refresh the rarity tables.

### 9.31 — Door names

景门 is always the Scenery Door and 惊门 the Fear Door, in the data and in AI readings. Both romanise as "Jing", so that spelling is not used for either door.

### 9.31 — Forecast palace search and structure names

`findPalace` reads stems from the heaven plate only, and 甲 resolves to the 六儀 that hides it, so the Day and Hour Stem seats are correct. 辛加乙 is now 白虎猖狂 (the older deity-and-door check is 白虎凶门, and the snake-and-Fire-star check is 腾蛇火星), 丁加癸 is 朱雀投江 and 癸加丁 is 腾蛇妖娇, as in the compendium.

### 9.31 — Direction in activations

Seated manifestation places the auspicious palace behind you (`manifestPlan`, `structureGoodFor`). The 7-star mat walk moves towards the palace. Task advice such as San Cai and the Now tab still gives a direction to face.

### 9.31 — Planets on the plate, and 7 Stars (`www/js/tianwen.js`, `QPTianwen`)

`overlay` maps true longitude to a branch (the classical twelve palaces: 子 is 300° to 330°, 戌 is 0° to 30°) and on to a Lo Shu palace, then rates each planet against the plate. `superWindows` scans for super-structures. Consult › 7 Stars has seven stages with an `audit` and a multi-year `horizon`, and `ritualWindows` finds clean hours for a 7-step walk, including an inward-looking Sage Path goal, with an AI-written, editable intention script (`QPAI.writeWalkScript`): 反吟 is always rejected, fast goals reject 伏吟, and consolidation accepts a stem and star 伏吟 with a warning when the palace holds a Noble or 戊 (Doors 伏吟 stays rejected). All of this follows the user's method notes and does not change other scores.

### 9.31 — The 28 constellations (`www/js/xiu.js`, `QPXiu`)

Day mansion from the 28-day cycle, hour mansion from 七元禽星, the classical 古度 widths laid on the luo pan with 虛 at due north, and the current sky from each mansion's 距星. Used in Qimen charts, Plan a task (the mansion's 宜/忌 lists, and hour mansions for timing), Feng Shui facing (`facing`, `sky`), birth profiles (`profile`), tactical posture (`posture`) and a Dipper route across the plate (`sevenStars`). The harmony, posture and profile readings are QiPath's own synthesis.

### 9.31 — Solar terms from the Swiss Ephemeris, true solar time, birth time zone, planets

- **Solar terms:** `tools/build-ephemeris.py` generates `www/js/ephem-terms.js` from the Swiss Ephemeris (via `pyswisseph`, Moshier mode). `QPAstro.termsForYear` reads it for 1890 to 2110; the older formula covers dates beyond that. `tools/verify-terms.py` checks the table against other sources.
- **True solar time:** Profile › Qimen charts, off by default. `QPCore.setTrueSolar(lon)` moves the day and hour pillars to local apparent solar time; year, month and term follow the actual moment.
- **Birth time zone:** `birth.zone` holds a named zone, read through `Intl` with its history, and `birth.lon` optionally applies true solar time to the birth chart. `QPCore.birthPillars(b, mins)` builds birth pillars.
- **Planets:** `www/js/ephem-planets.js` (1900 to 2100, loaded when needed) and `QPEphem.positions(jd)` show true longitudes on the Qimen chart. They are display only.
- **Licence:** the Swiss Ephemeris is AGPL or commercial. The app ships generated tables, not its code; check the licence before distributing.

### 9.31 — QiMen Oracle (Consult › Oracle)

`QPOracle.cast(user, topic, when)` answers one question on health, career, business or relationships: what is happening, why, and what to do, plus a better moment in the next 24 hours if there is one.
It reads `QPSystems.flyingQimen(p)`, the Flying Palace plate (飛宮): nine doors and nine deities moved through all nine palaces in Lo Shu order, forwards in Yang dun and backwards in Yin dun. No AI key is needed.

### 9.31 — Nayin assessment (Chart › Bazi)

`QPBazi.nayinAssessment(user, today)`: a macro-diagnostic kept apart from Day Master strength and the Ten Gods, which neither read it nor feed it. It covers structural harmony from Year to Hour, constitutional resilience and ten-year phases. The "Refines you" exceptions are labelled unverified, because 三命通會 論納音取象 does not state the rule, but they still count in the support and resilience results. The Year Nayin is the life sound (年命) for background, structure and phases; the Day Nayin is the self sound for temperament. `nayinMatch` compares both between two people on the Together screen, outside the compatibility score. The other pillars and every luck pillar are read against it by
the five-element cycle, with the traditional exceptions where control refines rather than harms. Also in the AI reading and the planner's birth chart page.

### 9.31 — Luck pillar start age fixed

`luckPillars` counted days to the nearest solar term of any kind. It now counts to the 節 that opens a solar month, as the rule requires, which
moves every start age. Checked against reference charts for two birth dates (start ages 8 and 0).

### 9.31 — Monthly report (Consult › Monthly)

One solar month in `www/js/monthly.js` (`QPMonthly`): an overview, seven themes each with a level from -100 to +100, advice chosen by the
ten god the month brings, a score for every day with the best and hardest days, plus money and reset days. It shares the planner's plates and PDF pages.

### 9.31 — Annual planner (Consult › Planner)

Twelve solar months from a chosen start, on screen and as an A4 PDF. `www/js/planner.js` (`QPPlanner`):

- `build(user, start)`: birth chart, Qimen birth plate, year plates, and for each month the plate, your position, directions,
  how the month pillar meets the birth chart, twelve life areas and the best days.
- A month's score is 0–100 with 50 neutral: each life area averages `QPBazi.areasMonth` (month pillar) and
  `QPQimen.areasOnPlate` (month plate), and the month averages the twelve areas. The scale is QiPath's own.
- `toPdf(plan)`: pages are drawn on a canvas and stored as JPEGs in a small hand-written PDF, so Chinese text needs no
  embedded font. The app saves through `@capacitor/filesystem` (cache) and `@capacitor/share`; a browser downloads the file.

### 9.31 — Year and month plate rule (Profile › Qimen charts)

Default `longRule: 'yearly'`: the year plate is 阴1 in 1864 and one ju lower each year; month plates by 符头 year are
子午卯酉 1, 寅申巳亥 4, 辰戌丑未 7. `'era'` keeps the earlier rule (year 1/4/7 by 60-year era; month 1/7/4). Checked against
reference year plates for 2023, 2025 and 2027 and reference month plates from Nov 2022 to Oct 2023 (寅申巳亥) and Dec 2024 to
Oct 2027 (辰戌丑未). No reference has covered 子午卯酉 months; 阴1 completes the 1, 4, 7 sequence.

### 9.31 — Twelve life areas in plain English, across Bazi, Zi Wei and Qimen Destiny

Career, Education, Relationship with spouse, Relatives, Children, Colleagues and bosses, Marriage, Health, Finance
(cash flow), Wealth (assets), Legal matters and Travel — each rated Strong / Steady / Weak (score −3..+3), with what it
means in plain words, what to do, and the chart signals under *Technical detail*. The areas and the advice for each
level (worded for a year, or for a lifelong pattern on birth charts) are shared (`QPBazi.AREAS`, `areaResults`);
each system supplies its own signals:

| Screen | Function | Signals |
|---|---|---|
| Chart › Forecast (any year) | `QPBazi.areasYear(user, a)` | the year's stem and main hidden ten gods, Four Harms by pillar, Noble People, 文昌, Peach Blossom, Sky Horse, 紅鸞/天喜, 財庫; plus the best months for each area |
| Chart › Elements | `QPBazi.areasNatal(user)` | ten-god element shares and Day Master strength, the spouse and children stars, natal clashes by pillar, 傷官見官, 財多身弱, 財庫, stars |
| Chart › Relations | `QPBazi.areasRelations(user)` | each clash, punishment, harm, destruction or union, by the areas its pillars govern; what the luck pillar and coming years set off |
| Chart › Together | `QPBazi.areasTogether(user, other)` | the elements the partner brings to each area of yours, spouse and year branches, spouse star, 紅鸞/天喜, Sky Horse |
| Chart › Zi Wei (birth board, flow year) | `QPFib.zwdsAreasNatal`, `zwdsAreasYear` | the area's palace(s), scored by `zwdsPeriod` and scaled to the 30th/70th percentile of 3,600 palaces; 化忌 and 擎羊/陀罗/天刑 in 官禄/父母 for legal. The flow year now has all twelve palaces. |
| Chart › Qimen Destiny (birth chart, year plate) | `QPQimen.areasDestiny`, `areasYearPlate` | each area's 用神 (开门/值符, 景门/丁/天辅, 乙/庚, 六合, the person's year/month/hour stems, 天心 against 天芮, 生门/戊/天任, 惊门/勾陈/朱雀/庚, Sky Horse/九天) against the person's seat, palace quality and void |

The AI readings of all eight screens carry the computed areas and return a `lifeAreas` list (outlook and advice per area),
shown as *Life areas*; readings saved before stay valid.

### 9.31 — Qimen ju by 置闰 (Zhi Run), hour void, Formations screen, detector fixes

Checked against a reference chart (2026-11-01 15:01, 阴遁6局, Zhi Run): the app had used only 拆补, which gives
阴遁5局 there because 己卯 starts an upper yuan six days before 立冬. With the ju corrected every outer palace — heaven
and earth stems (己 lodged with 天芮 and in 坤), stars, doors and deities — matched the reference.

- **置闰 is now the default** (`systems.js`, `zhiRun`). The ju runs in 15-day blocks from each upper-yuan 符头
  (甲子 己卯 甲午 己酉); blocks take the 24 terms in sequence, anchored on the latest 正授 block (a 符头 on its term's
  day); when 超神 passes nine days at 芒种 or 大雪 that term repeats (闰). Checked 2018–2035: no break in the term
  sequence, 闰 at 2019 芒种 and 大雪 2021, 2024, 2027, 2030, 2033. Whether the 闰 needs more than nine days or nine
  or more changes no chart from mid-2019 to mid-2036; the app uses more than nine.
- **Void on hourly plates is the hour's xun** by default (the reference marks 戌亥 on 乾), with the day's xun shown
  alongside. Day, month and year plates keep their own.
- **Five reference charts match palace for palace** (stems, stars, doors, deities, lodged centre stem, chief, envoy,
  void): 2026-11-01 15:01 阴遁6 (超神 into 立冬), 2026-10-31 15:01 阴遁2, 2026-10-07 06:01 阴遁9 (超神 into 寒露),
  2027-12-09 06:01 阴遁1 and 2027-12-12 06:01 阴遁4 (the repeated 大雪, 闰). 拆补 gets the two 超神 charts wrong.
- **腾蛇 spelling.** The plate writes the deity 腾蛇, but six lookups in `qmdj.js` used the variant 螣蛇 and never
  matched: `HOSTILE_DEITY`, the Health and Relationship threat agents, and the Together screen's disruptors. All now
  use 腾蛇. With 腾蛇 counting, Health strain's live threshold moved from 2.3 to 2.5 (30.8% of month and hour plates).
- **Profile › Qimen charts** switches the ju method (置闰 / 拆补) and the void (hour / day) for the device.

#### Consult › Formations (formerly Search)

Pick one or more formations — **Good** (auspicious, the default), Special, Challenging or All — filter by name or
purpose, and scan any date range up to a year. Each formation in the list shows its rarity; each selected one is
explained: what it is, what it favours, how often it occurs (share of hourly plates and about how many waking hours
a month, `QPQimen.formationInfo`), its seasonal strength this month, and how to use it. The scan covers every
double-hour in the range (a year in about 0.4 s), optionally waking hours only, and lists results strongest first —
ranked over the whole range, top 200 shown — or by date. Strength is the palace quality plus the formation's rarity
weight. Each result opens the palace, the full plate, a save, an AI reading and *Use this window for a manifestation*.

**Formation detector fixes** (`qpdata.js`, `systems.js`), found checking the 2027-12-09 and 2027-12-12 references:
- 门伏吟 and 星伏吟 compared elements with the palace instead of the home palace (开门 in 兑 7 was flagged though
  its home is 乾 6). They now use the home palaces; 门反吟 and 星反吟 are added. The plate-wide 伏吟格 and 反吟格
  now fire (`meta.fuYin` / `meta.fanYin`, from the heaven plate's shift). 2027-12-12 now reads 伏吟格 + 门反吟 and
  2027-12-09 门伏吟, as the reference shows.
- The chart now gives each deity its element (神门相生, 神煞相克), each stem its yin/yang, and the day and hour
  stems their element (时墓); 阴阳倒 accepts 阴遁/阳遁.
- `FORMATION_FREQ` (per palace) and the new `FORMATION_HOURLY` (per plate) were re-measured over 2,880 plates.
  Still never seen: 龙吟虎啸 and 五行缺 (they count palace elements, which never change), 伏断格 (asks one stem to
  differ from itself in yin/yang) and 三奇贵禄 (needs all three Wonders well placed at once). Chart
  screens show the method, the term the ju was taken from with its 超神/接气 days, and both voids.

### 9.30 — Daily Qimen structures: scan, digest, email and manifestation links

**Consult › Structures** scans every double-hour plate for the next 60 days (about 720 plates, roughly 0.15 s)
with `QPQimen.structureScan(from, days, fav)` and lists the strongest palace structures: today's, then the best
of the two months, at most two a day, waking hours (07:00–00:59) only. A palace is a structure when it is not
void and holds a rare auspicious formation, or one of the Three Wonders (乙丙丁) over an auspicious door. Its score
is the palace quality (door and its strength, star, deity, void, formations), the heaven stem's role, the person's
favourable elements, and each formation weighted by **rarity**: the common ones (星门相生, 吉门吉格, 三合格,
吉门合吉星, 门生宫, 直使相生 — each in 16–32% of palaces, measured over 1,440 plates) count for nothing, the
rare named ones (玉女守门, 青龙返首, 飞鸟跌穴, the 遁 formations) most. Each card says in plain words what the
structure is good for, lists the formations, door, deity, stems and star, and shows the hour's chart as a 3×3 grid.

- **Manifestation script, customised.** *Open the manifestation script* sets Consult › Manifest to that hour and
  palace. `manifestPlan` now returns `activations` — the three rarest formations, the heaven and earth stems, the
  door, deity, star and the palace element, each with what it means and how to activate it — shown as
  *Activate the strengths*; the script itself names the formations and the stem's role.
- **Daily notification.** Profile › Daily structures schedules a 06:00 notification for each of the next 60 days
  naming that day's strongest structure (`@capacitor/local-notifications` 6.1.3, ids 6000–6059, rescheduled each
  time the app opens). Tapping it opens Consult › Structures.
- **Deep links.** `qipath://structures` and `qipath://manifest?d=YYYY-MM-DD&h=HH&p=N&f=formationId`
  (`@capacitor/app` 6.0.3; intent filter in `AndroidManifest.xml`). A link that arrives before sign-in is applied
  after the PIN.

#### Setting up the 06:00 email

`.github/workflows/qimen-digest.yml` runs `tools/qimen-digest.js` at 22:00 UTC (06:00 SGT) with `TZ=Asia/Singapore`
and sends through Gmail. In the GitHub repository:

1. **Gmail app password.** Turn on 2-Step Verification for the sending Gmail account, then create an app password
   (Google Account › Security › App passwords). Never use the account password.
2. **Secrets** (Settings › Secrets and variables › Actions): `QP_SMTP_USER` (the sending Gmail address),
   `QP_SMTP_PASS` (the app password), `QP_MAIL_TO` (where the digest goes). Optional: `QP_BIRTH` as
   `1972-08-13 02:15 M` to weight palaces by that person's favourable elements, and `QP_LINK_BASE` (step 3).
3. **Links into the app.** Email apps will not open `qipath://` links, so the buttons go through
   `docs/open/index.html`. Turn on GitHub Pages (Settings › Pages › Deploy from branch › `main`, folder `/docs`) and
   set `QP_LINK_BASE` to `https://<user>.github.io/<repo>/open/`. Without it the buttons carry the bare
   `qipath://` link, which some mail apps will not open.
4. **Test it.** Actions › *Daily Qimen structures email* › *Run workflow*. To preview locally without sending:
   `DRY_RUN=1 node tools/qimen-digest.js` writes `qimen-digest.html`.

### 9.30 — Chart › Together: two charts read side by side (合婚)

A new **Together** tab under Chart compares the signed-in person with someone else and says, in plain
words, how to strengthen the relationship. `QPBazi.compatibility(a, b, opts)` in `bazi.js` reads:

| Finding | From |
|---|---|
| Your core natures | the two Day Masters: 天干五合, 天干相冲, same element, one feeding or controlling the other |
| What each brings the other | each chart's element shares against the other's favourable and unfavourable elements (用神) |
| Living together / day to day | the two day branches (spouse palace): 六合, 三合, 沖, 害, 刑, 破 |
| Families and friends | the two year branches |
| How you see each other | each Day Master as a ten god to the other |
| Attraction (partners) | Peach Blossom (桃花) across the charts, 紅鸞/天喜, and the classical spouse star |
| Intimacy (partners, opt-in) | Fire/Water balance, the spouse palaces, and each person's way of feeling close from their strongest element |
| The year together | both annual forecasts month by month: best three together, two to take care, home-friction and romance months |

Each finding carries *What to do*; the cautions and strongest positives become **Ways to strengthen the
relationship**. The overall band is *Naturally supportive*, *Good, with some effort* or *Needs deliberate
care* — never a verdict that a match will fail.

**Attraction, desire and intimacy (partners).** Each is rated *Strong*, *Steady* or *Weak* from two parts: the
level the birth charts fix (`compatibility().natal`, −2..+2 — attraction markers, Fire and Peach Blossom, the spouse
palaces, Water and the solitary stars) and this month's Qimen plate. `QPQimen.romancePlate(a, b, type, when)` reads
both Day Stem seats and the relationship symbols — 六合 union, 乙/庚 woman and man, 丁 Jade Maiden, 丙 and 景门
passion, 休门 ease — against the disruptors 玄武, 螣蛇, 白虎, 惊门 and void palaces. A *Weak* rating comes with
numbered counter-measures; every rating shows the reasons from both parts.

- **Desire and intimacy in detail.** `intimacyProfile(x)` in `bazi.js` reads, for each person: level of desire
  (Fire share, Peach Blossom, the output gods 食神/伤官, and Day Master strength for stamina), who initiates (yang
  Day Master leads, yin responds), pace and build-up, what arouses and what cools them, touch and setting (from the
  strongest element), best hours (the favourable elements' double-hours; late night dropped for a weak Day Master)
  and temperament (the most frequent ten god). `compatibility().desire` sets the two side by side — matching or
  different desire, who initiates, pace, setting the scene, shared hours — and the screen adds a plan for the
  strongest desire time from the Qimen scan. Frank and specific, never graphic.
- **Sexual attraction and compatibility (9.31; partners, both 18 or over by birth date).** `sexualProfile(x)` in
  `bazi.js` gives each adult's libido, sexual style, what turns them on and off, foreplay needs (strongest element),
  whether they lead or follow in bed (yang Day Master and 比劫/伤官 lead; 印/官 follow), how openly they talk about
  sex (食伤 vs 官印), 七杀 intensity, Peach Blossom magnetism, stamina and best hours. `compatibility().sexual`
  rates sexual chemistry (attraction markers, spouse palaces, Fire) and sets libido, leading, style and talking
  about sex side by side, with counter-measures when chemistry or libido needs work and the strongest desire time
  from the Qimen scan. Frank about sex, never a description of acts or anatomy; the AI reading follows the same rule.
- **Qimen remedies.** The plate names the direction to activate (the strongest of 六合, 丁, 休门, 景门 that is neither
  void nor hostile) and, from its element, the objects, colours, scents and words that strengthen it
  (`QPQimen.ELEMENT_REMEDY`); the element that controls it, and its words, weaken it. When the two seats control each
  other, the bridging element (通關) is named; directions holding 玄武, 白虎, 螣蛇 or 惊门 are to be avoided.
- **Date and time selection.** `QPQimen.romanceWindows(a, b, from, 30)` reads every double-hour plate for the next
  30 days (about 360 plates, under 0.1 s on a desktop), adds the day's branch against both natal day branches
  (clash −2, combination +1, Peach Blossom or 紅鸞/天喜 +1.5) and the hour's, and lists the six strongest and four
  weakest waking double-hours (07:00–00:59), one per day, plus the single best time for each dimension.
- **Profile › Relationship screen.** Two switches per profile: show the Together tab, and include attraction, desire
  and intimacy in partner readings (both on by default; `qipath.tgprefs.<profileId>`).
- **Privacy.** The other person's birth details are stored inside the signed-in profile
  (`qipath.together.<profileId>`), never as a profile of their own. Another profile on the device can be
  copied in only with that profile's PIN.
- **Relationship types.** Partner, family, friend or business; attraction and intimacy appear only for a
  partner, and intimacy only when its toggle is on.
  The relationship can be changed on the person's screen at any time (9.31); for anyone other than a partner the
  screen says why attraction, desire and intimacy are not shown.
- **AI reading.** `QPAI.analyseTogether` (registry key `together`) writes a plain-language reading with
  steps; with intimacy on it covers warmth, closeness and timing in respectful, non-explicit terms.

### 9.29 — Streamed AI calls, phone layout, plain-language annual forecasts

- **AI calls stream.** Gemini (`streamGenerateContent?alt=sse`) and Claude (`stream: true`) send the reply
  as it is written, so a long reading no longer sits silent until the WebView or network drops it. An
  attempt is cut off after 120 s with no data or 5 minutes in all; a dropped connection, a stall or a
  provider overload (5xx/529) is retried once if the first attempt failed within 2.5 minutes. Gemini 2.5
  thinking is capped (Flash 2048, Pro 4096, Flash-Lite off); Claude `max_tokens` rose from 8000 to 16000.
  A WebView without stream support falls back to the blocking request.
- **Phone layout.** Row keys may shrink and wrap (at most 45% of the row); nested tables stack. Below
  520 px the three annual forecasts (`.stack-sm`) stack key over value, left-aligned.
- **Plain language.** Each month in the Bazi and Qimen annual forecasts leads with *In plain words* and
  a *Counter-measures* answer (yes / light / none needed, with everyday steps, directions and the best
  60-JiaZi time); the working sits under *Technical detail*. The Bazi annual page opens with *The year
  at a glance*, and the threat check explains its verdicts. The annual AI prompts carry a plain-language
  rule, and the Bazi one returns a `countermeasures` field.

### 9.28 — 60-JiaZi timing in every counter check, automatically

| Counter check | Timing |
|---|---|
| Consult › Counter (full) | computed with the check, as before |
| Compact checks (3 annual pages, every module page) | filled in automatically after the page draws |
| Monthly Counter lines (3 annual pages) | filled in automatically, month by month |
| AI-only checks (Forecast luck pillars, Qimen Destiny, Ask) | computed when the reading is written, and passed to the AI |

- **The queue.** Timing casts many pilot plates, so the page draws first. A background queue then
  computes one check or month at a time, with a 60 ms pause between jobs, and skips anything that has
  left the page.
- **Measured.** The Bazi annual page drew in about 80 ms. The compact check and all 9 live months had
  their timing about 1.1 s later.
- **Links.** These read "working…" until filled, and can still be tapped.
- **Carried forward.** Computed timing flows into the screen's AI reading (counter text and month
  COUNTER lines) and into saved threat checks.

### 9.27 — Full 60-JiaZi timing in saved threat checks

- **What is saved.** Saving a threat check, from Consult › Counter or any compact check whose timing
  was opened, now stores the structured timing for each threat (`jiaziData`). That covers the defect
  and why, the mechanism, the target palace and branches, the day branches and the hour intent, and
  for every day its pillar, mechanism, best hour, reasons, flags and verified status.
- **How it shows.** The record viewer renders it the same way as the live page, rather than as the
  one-line summary stored before.
- **Older records.** Records saved before this keep their one-line "60-JiaZi timing" row.

### 9.26 — 60-JiaZi timing in the annual threat check

- **Where.** The compact Threat check on the three annual forecast pages gains a "60-JiaZi timing for
  these threats (next 30 days)" link when any threat is live. So does the Counter check that follows
  each module's AI reading.
- **What it shows.** For each live threat: the defect, the filling, combining or clashing days over the
  next 30 days from the check's moment, the best 五鼠遁 hour of each day, and the verification flags.
  This is the same engine as Consult › Counter.
- **On demand.** It runs on tap.
- **Carried forward.** Once computed, the timing is attached to the check on the screen:
  - "Save this threat check" then saves it.
  - The screen's AI reading includes it when regenerated, since the counter text now carries a
    60-JIAZI clause per threat.

### 9.25 — 60-JiaZi timing in the monthly counter checks

- **Where.** Every month with a live threat (Confirmed or Flare) in the Bazi, Zi Wei and Qimen annual
  forecasts gets a **"60-JiaZi timing for this month"** link under its Counter line.
- **What it computes**, for each live threat (`QPQimen.monthJiazi`):
  - the defect, read on that month's Qimen plate against the natal Day Stem's seat
  - the mechanism: a filling, combining or clashing day, with hazards contained
  - candidate days inside that month only (its 節 to the next)
  - the best 五鼠遁 hour of each day on pilot plates
  - the same verification as the full check: 刑 and 破 against the natal pillars and the target palace,
    and 主克客 at 开门 or the chief star
- **On demand.** It casts many pilot plates, so it runs on tap rather than at page load. It takes about
  10-60 ms per month in Node.
- **AI reading.** Once computed, the timing is added to that month's COUNTER line in the year's AI
  prompt (`threatMonthTextFull`), so regenerating the annual reading includes the verified execution
  days.

### 9.24 — 60-JiaZi timing of the counter-strategy (Consult › Counter)

Each live threat in the full counter check now gets a **60-JiaZi timing 甲子擇時** plan in four
steps.

1. **Target defect, at the threat symbol's palace on the active plate:**
   - **Emptiness:** the palace is void. Calls for a **filling day**, whose branch is the void branch.
   - **Conflict:** the palace presses on your seat, or 庚 or a hostile deity sits there. Calls for a
     **combining day**: 六合 or 三合 with the palace branch (貪合忘沖).
   - **Stagnation:** the stem there is in its grave (入墓, storage 未戌丑辰), or 死门 or 杜门
     locks a resource. Calls for a **clashing day** (沖).
   - **Hazards** (惊门, 天芮, 伤门) are never filled or clashed open. A void or entombed hazard
     is contained, and only an aggressive hazard is bound with a combining day.
2. **Days.** The next 30 days are scanned for day branches that perform the mechanism. Each listed day
   names the branch it acts on, for example "the 子 day three-combines (三合) with 辰".
3. **Hours.** All twelve hours of each candidate day, with stems by 五鼠遁 from the calendar, are cast
   as pilot plates. Each hour scores for:
   - the threat's intended stem in the hour: 戊 capital, 丁 strategy and documents, 乙 harmony and
     healing, 丙 momentum
   - that stem, or 杜门 or 六合 (Conflict), or 开门, 生门 or 休门 (other defects), arriving in the
     target palace
   - the strength of your seat
4. **Verification.** A day is flagged if its branch punishes (刑) or destroys (破) a natal branch or the
   target palace's branch. A filling day's self-punishment is exempt, since it is the void's own branch
   by design. An hour is flagged if 开门 or the chief star is controlled by its palace (主克客). Verified
   days are listed first. If none passes every check, the page says so and shows the best flagged ones.

The timing appears on each threat card. It is passed to the AI counter-measure plan, whose "timing"
section now leads with it (stamp moved to .jz), and it is saved in Threat check records. It is opt-in
(`jiazi: true`), so the compact summaries elsewhere stay fast. The full check, with 30 days of pilot
plates, takes about 1.5 s in the browser.

### 9.23 — Counter checks in every reading module

Every module that reads the person or a moment now carries the counter check.

**A block after the AI reading, which the AI reading also receives:**

| Screen | Moment tested | Focus |
|---|---|---|
| Almanac › Day | the selected day, at this hour | — |
| Chart › Elements | this double-hour | — |
| Chart › Relations | this double-hour | relationship, legal |
| Chart › Zi Wei (reading and forecast) | this double-hour | — |
| Chart › Feng Shui and plan audit | this double-hour | upheaval, health, financial |
| Consult › Search | the found structure's hour | — |
| Consult › Manifest | the manifestation window | — |
| Consult › Plan a task | the chosen day at midday | from the activity |
| Consult › Strategy | the plate computed | — |

**AI reading only.** These pages already show the check in their annual blocks, so only the AI reading
gains it:
- Chart › Forecast (luck pillars)
- Chart › Qimen Destiny
- Chart › Ask, focused by the words of the question

**Already covered:**
- Chart › Bazi, San Cai, Consult › Forecast, Consult › Qimen and Yijing (since 9.22)
- the three annual forecasts and their months, and Consult › Counter itself

**Not applicable:** Numbers (draw statistics), Learn and Profile do not read a person or a moment.

The cache stamps of the affected readings gained ".ct", so earlier readings stay stored as earlier
versions.

### 9.22 — Counter checks across the modules

A **Counter check 反制** block now follows the AI reading in five more places. Each tests the year's
threats (Bazi, Zi Wei and the Qimen year plate) on the Qimen plate of the moment that screen is about:

| Screen | Moment | Focus |
|---|---|---|
| Chart › Bazi | this double-hour | — |
| Consult › San Cai (full mandate) | the chosen execution window | from the goal |
| Consult › Forecast | the cast | from the matter type and the question |
| Consult › Qimen (cast chart) | the cast | — |
| Consult › Yijing | the cast | from the question |

**Focus.** Threats the matter bears on are marked "this matter" and listed first.
- The goal or matter type maps to threats: wealth → financial, career → friction, dispute → legal,
  marriage → relationship, travel → upheaval, and so on.
- Keywords in the question add to the focus: money, court, boss, health, partner, move and similar words.

**The module's AI reading** gets the check through `QPAI.withCounter`. It is placed before the field
list, with an instruction to fold the counter-measure into the advice wherever a threat bears on the
reading. The cache stamps of these readings gained ".ct", so earlier readings stay stored as
earlier versions.

**Each block** offers "Open the full check" (Consult › Counter, with the AI counter-measure plan) and
"Save this threat check".

The Counter tab, the annual pages and their months already had the check. Zi Wei and Qimen Destiny
carry it in their annual blocks.

### 9.21 — Counter checks month by month, and recalibrated threat detection

- **Monthly counter check.** Each month's row in the Bazi, Zi Wei and Qimen annual forecasts now ends
  with a **Counter** line. It shows the year's threats tested on that month's Qimen plate against your
  natal Day Stem: Confirmed (flagged by the year and live that month) or Flare (live that month only),
  with the symbol's direction and whether it presses on you. It also gives that month's Hide Door and
  the direction to work from, or "clear".
- **Zi Wei lunar months** take the solar month (立春-based) that contains their middle.
- **AI readings.** All three annual AI readings get the counter line for every month, and are told to
  name the counter-measure for live months. Their stamps moved on (Bazi v3, Qimen v2, Zi Wei v3).
- **Recalibration.** Hazard symbols (惊门, 天芮, 伤门) always mark their own palace as bad, so a
  palace-quality score called them "live" almost everywhere. A hazard is now scored by:
  - its strength in the palace (旺相 vs 休囚)
  - the hostile company it keeps
  - hostile structures there
  - whether it presses on you
  - whether it is void, which weakens it

  "Live" is now set per threat at about its 70th percentile over month and hour plates (2018-2033,
  several charts). Live rates are now 23-38% of months per threat, where before they ranged from 15%
  to 57% with health live in most months. This also applies to Consult › Counter and the annual
  threat summaries.

### 9.20 — Threat check on the annual forecast pages

All three annual forecasts (Chart › Forecast, Zi Wei and Qimen Destiny) now end with a compact
**Threat check 反制** for the selected year. It is tested against the plate of the current double-hour.

- **Each threat** shows its verdict and severity, the symbol's position on the board, the override, the
  element remedy and the next window to act.
- **Counter-measures.** When any threat is live, it adds the Hide Door, the directions to work from and
  the directions to avoid.
- **"Open the full check"** goes to Consult › Counter with the year filled in. That page adds the AI
  counter-measure plan and lets you choose a date and hour in that year.
- **"Save this threat check"** saves it as a Threat check record.
- **Shared code.** The record builder is shared with Consult › Counter, so saves from either place
  match.

### 9.19 — Counter: Qimen annual threats, and saving

- **The Qimen year plate is a third source.** Each threat's symbol is located on the year plate and
  tested against the natal Day Stem's seat, the same way as on the active plate. If it is live there
  (manifestation index 1.5 or more), half the index is added to the threat's severity, capped at 1.5.
- **The year seat counts too.** Its own door and deity add 0.75 to their classical threat:
  - doors: 惊门 → legal, 死门 → health, 伤门 → upheaval
  - deities: 玄武 → financial, 勾陈 and 朱雀 → legal, 白虎 → health, 螣蛇 → relationship
- **The AI plan names all three sources** and their annual verdicts.
- **Save this threat check.** A new record type, Threat check 反制, stores:
  - the active plate and your seat
  - the Hide Door and the directions to work from and avoid
  - every threat with its verdict, severity, evidence, board position, override, remedy and windows
  - the AI plan, if one is written before or after saving

  It opens in Profile › Saved records.

### 9.18 — Consult › Counter: annual threats onto the active Qimen plate

A new **Counter** tab connects the annual forecasts to the live board in four steps.

1. **Vulnerabilities (macro).** The annual Bazi and Zi Wei forecasts are scanned for six threats, each
   with a severity and its evidence:
   - **Financial drain:** Bazi wealth score, Rob Wealth (劫財), Zi Wei flow 财帛, 化忌 in 财帛.
   - **Legal exposure:** unsoftened punishments, 刑 or 破太歲, Hurting Officer, 化忌 in 交友 or 迁移.
   - **Executive friction:** Bazi career, Hurting Officer, harms on the Month pillar, Zi Wei 官禄.
   - **Health strain:** Bazi health, Zi Wei 疾厄.
   - **Relationship rupture:** Bazi relationships, Zi Wei 夫妻.
   - **Upheaval:** 沖太歲, a Day-pillar clash, Sky Horse, Zi Wei 迁移.
2. **Manifestation (micro).** Each threat is translated into its Qimen symbols and located on the
   active hour plate:
   - **Resources:** 生门 and 戊 (money), 开门 and the chief star (career), 六合 (relationships).
   - **Hazards:** 惊门, 景门 and 丁 (legal), 天芮 (health), 伤门 (upheaval).

   A manifestation index comes from the palace quality, hostile agents there (白虎 玄武 勾陈 螣蛇 朱雀,
   hostile doors, 庚, void) and whether the palace controls the asker's palace.
3. **Mismatch test and override:**
   - Annual threat and live on the board: **Confirmed**, so defend.
   - Annual threat, not live: **Latent**, so seize the window.
   - Board-only: **Flare**, so wait it out.
   - Neither: **Clear**, so proceed.
4. **Counter-measures:**
   - **Hide Door (杜门):** its position, and whether it is compromised by void, a hostile deity or 庚.
   - **Directions:** where to work from and what to avoid.
   - **Element remedy:** a bridging element (通關) when a palace presses on the asker; otherwise a hazard is
     drained or controlled and a resource is supported, preferring the person's favourable elements.
   - **Windows:** the next 3, 5 or 7 days are scanned two-hourly. A resource window is when the symbol
     is filled and strong; a hazard window is when it is contained (void or not pressing). A void
     resource marks stagnation, broken when the void fills.

The AI counter-measure plan uses the risk-assessor persona. It can be refined as "Consult · Counter
(threat check)" in Profile › AI prompts, and it is kept on the device like other readings.

### 9.17 — Qimen months in the Bazi annual forecast

The Bazi annual forecast (Chart › Forecast) now reads each month in both systems.

- **Side by side.** Each solar month shows the Bazi reading and the Qimen month plate together: where
  your natal Day Stem sits that month (direction, door, star, deity) and its palace score. Both series
  start at 立春 and are matched month by month on the month pillar.
- **Agreement flag.** Each month is marked:
  - "both favour": both scores +1 or more
  - "both caution": both -1 or less
  - "they disagree": one +1 or more, the other -1 or less
  - "mixed": anything else
- **Qimen year plate row.** The summary gains a row with your seat, the verdict and the best directions
  and directions to avoid.
- **AI reading.** The Bazi annual AI reading gets both series. It is told to call months firmly where
  the systems agree, to explain what each is saying where they disagree, and to name the Qimen
  direction for each month it recommends. Its stamp moved to v2.
- **Saved records** include the Qimen month and agreement for each month, and the Qimen year plate.
- **No built-in lean.** Over 5 charts × 25 years, Qimen month scores average -0.6 and Bazi +0.5, with
  similar spreads, so neither system leans one way by design.

### 9.16 — Zi Wei monthly forecast by 斗君

The Zi Wei annual forecast now reads every lunar month of the year (流月).

- **斗君.** Start at the year's branch as lunar month 1, count back to the birth lunar month, then
  count forward to the birth hour. That palace is lunar month 1, and each later month moves one palace
  clockwise. A leap month shares the palace and stem of the month before.
- **Each month shows:**
  - its dates (lunar months from the app's astronomical calendar)
  - its pillar (五虎遁 from the year stem) and palace
  - the natal palace and stars it lands on
  - the 化禄 and 化忌 of the month stem
  - a score: 0.618 × the month palace (三方四正 with the month's 四化) + 0.382 × the flow-year Life palace
  - "best" (top three) and "hardest" (bottom two) marks
- **AI reading.** The Zi Wei annual AI reading now gets the months and times its advice by them. Its
  stamp moved to v2, so a reading written without months stays under the old stamp and a fresh one is
  needed.
- **Saved records** include the 斗君 palace and the months.
- **Calendar checks.** Lunar New Year falls on 17 Feb 2026, 6 Feb 2027 and 26 Jan 2028, and 2028 has
  a leap 5th month. The 2026 丙 year opens with 庚寅.

### 9.15 — AI readings kept on the device, with earlier versions

**The problem.** AI readings used to be cached in session storage, which Android clears when it closes
the app. Every reading was lost on restart unless it had been saved to Records, and regenerating
replaced the previous reading.

**What happens now:**
- **Kept on the device.** Every AI reading is stored in the app's on-device storage, per profile,
  reading and stamp. It is shown straight away when the app is reopened, with no AI key and no new
  request needed.
- **Earlier versions kept.** Regenerating adds a new version instead of replacing the old one, and the
  last 5 versions are kept. A bar above each reading shows when it was written, which version it is
  and a picker for earlier versions. An earlier version is marked "kept for reference" and has a link
  back to the latest.
- **Older prompt settings.** A reading written under older prompt settings is still shown, with a
  note suggesting a regenerate. Before, it was hidden.
- **Deep dives too.** Deep-dive threads in Consult › Forecast are also kept on the device.
- **Running out of space.** When storage runs short, the readings written longest ago are removed
  first. Saved Records keep their own copy and are never removed this way.
- **Managing it.** Profile › "AI readings on this device" shows how many readings and versions are
  stored and the space used. A two-tap button deletes them for the current profile.

### 9.14 — Annual forecasts for Zi Wei and Qimen

Both tabs now have an **Annual forecast** block at the bottom, with the same year chips (this year to
nine ahead) and "Other year" box as the Bazi annual forecast.

**Chart › Zi Wei — 流年.**
- **Flow-year palaces:** the flow-year Life palace sits on the year branch, and the other flow palaces
  follow anticlockwise from it: Career 官禄, Wealth 财帛, Spouse 夫妻, Health 疾厄, Travel 迁移,
  Property 田宅 and Wellbeing 福德. Each shows the natal palace it lands on, its stars, and a score
  from its 三方四正 with the year stem's 四化.
- **Year score:** 0.618 × the flow-year Life palace + 0.382 × the 大限 in force.
- **The year's 四化:** each transformation is shown with the natal palace and the flow palace it lands in.
- **No months:** Zi Wei 流月 needs 斗君, so this block gives timing by season and leaves months to Bazi
  and Qimen.

**Chart › Qimen Destiny — 年盘.**
- **Your seat:** where your natal Day Stem sits on the year plate, with its door, star, deity, stems
  and structures, scored for quality. 甲 is read under its xun yi, and the centre stem through 天芮.
- **Quality score:** door +2, 0 or -2, plus door strength; star -1 to +1; deity -1 to +1; void -1.5;
  structures in the palace, net, capped at ±3; +0.5 if the palace element is favourable to you.
- **Directions:** where the year stem sits and how your palace relates to it, and the two best and two
  worst directions for the year.
- **Months:** the twelve month plates, each showing where you sit that month, with the best three and
  hardest two marked.
- **Year score:** 0.618 × your seat + 0.382 × the month average.

**Both:**
- An AI reading for each year, refinable as "Chart · Zi Wei and Qimen (annual)" in Profile › AI prompts.
- "Save this annual forecast" saves the year as an Annual forecast record. An AI reading written
  after saving is attached to it.

### 9.13 — Personalised Bazi annual forecast (Chart › Forecast)

A new **Annual forecast 流年** block sits at the top of Chart › Forecast. Pick this year or any of
the next nine with the chips, or type any year from 1900 to 2200. Each year runs from 立春 to 立春.

**What each year shows:**
- **The year pillar:** nayin, animal, and the ten god of the year stem and of each hidden stem.
- **Luck pillar:** the one in force that year.
- **Score and verdict:** 0.618 × year + 0.382 × luck pillar, as in the Fibonacci timeline.
- **Tai Sui:** 值, 沖, 刑, 破, 害 or 合太歲.
- **Four Harms and combinations:** the Four Harms against each natal pillar, Six Unions, frames the
  year completes, and a year stem that combines with the Day Master.
- **Stars the year branch switches on:** Noble People, Intelligence, Taiji, Peach Blossom, Sky Horse.
- **Areas of life:** career, wealth, relationships, health and study, each scored -3 to +3 with the
  rule behind it, plus the element and organs to look after.
- **Month by month:** the twelve solar months, each from the 節 that opens it, with its ten god and
  score, and the best three and hardest two marked.
- **AI reading:** a personalised year reading (theme, Tai Sui, each area of life, months, key dates,
  do and avoid lists). It can be refined as "Chart · Forecast (annual)" in Profile › AI prompts.
- **Saving:** "Save this annual forecast" stores the year under the new Annual forecast record type.

**Two engine corrections:**
- **Hidden stems (藏干):** three storage branches were wrong. 辰 had 戊乙甲 (now 戊乙癸), 未 had
  己乙甲 (now 己丁乙) and 戌 had 戊丁乙 (now 戊辛丁). This affects element counts, strength,
  roots and ten gods for any chart, luck pillar or year containing 辰, 未 or 戌.
- **Following charts (從格):** favourable elements now go with the dominant element and the element
  that produces it. Before, the code added the element the dominant one produces, which could list one
  element as both favourable and unfavourable. For example, a 從殺 chart showed "stem Wood
  favourable; stem Wood unfavourable". No element can now be on both lists.

### 9.12 — The Four Harms in Bazi (Chart › Relations)

- **Destruction (破) added.** Bazi relations now include all four of the Four Harms (四害): clash
  沖, punishment 刑, destruction 破 and harm 害. The six destruction pairs are 子酉, 午卯,
  巳申, 寅亥, 辰丑 and 戌未. A destruction pair that is also a Six Union (寅亥, 巳申) is
  flagged as a bond that holds on the surface while it weakens underneath.
- **Summary and destruction blocks.** The Relations page opens with a Four Harms summary that counts
  each kind in the natal chart, and gains a Destructions 破 block.
- **Four Harms in your timing.** For the current luck pillar, this year and next year, the page shows
  which of the four each sets off against which natal pillar, and what that pillar governs:
  - Year: family and elders
  - Month: career, parents and the working environment
  - Day: you and your spouse
  - Hour: children, projects and later life
- **Softened clashes.** A clash is marked "softened" when the incoming branch also combines with
  another natal branch (貪合忘沖).
- **AI reading.** The Relations AI reading gains "Destructions" and "The Four Harms in your timing"
  sections, and the Bazi summary given to every reading lists destructions.

### 9.11 — Deep dive saved with the forecast record

- **Saving a cast saves its thread.** "Save to my records" on a forecast now stores the deep-dive
  thread, together with the question type, time frame and options.
- **Follow-ups after saving are added.** Each one is added to the saved record, which shows "Added to
  your saved record". "Clear the deep dive" also clears it from the record.
- **The viewer shows it all.** In Profile › Saved records, a forecast shows the question framing and
  a **Deep dive** section with every follow-up and its answer.
- **Display fix.** The AI-reading section of a record no longer shows the internal notes list as
  "[object Object]".

### 9.10 — Deep dive on the same chart (Consult › Forecast)

Under the AI reading of a cast, **Deep dive on this chart** takes follow-up questions on the same
plate. The chart is not recast.

- **Suggested follow-ups.** They come from the reading's "Ask next" list, then from each deep dive's
  own suggestions. Tap one, or type your own.
- **Finding the subject on the plate.** Each follow-up is read by locating the symbol for its subject:
  - the Day Stem for you, and the Hour Stem for the matter or process
  - the Month Stem for peers and the counterparty, and the Year Stem for authorities
  - 庚 for a husband or rival, and 乙 for a wife
  - 戊 and 生门 for money, and 丁 and 景门 for documents
  - 开门 for the job, 六合 for the deal, 天芮 for illness, and 杜门 for what is hidden
- **Building on what came before.** The first reading and every earlier follow-up go into the prompt,
  so each answer goes a level deeper instead of repeating.
- **What each answer contains:** a short answer, what the chart shows, what to do, what to watch out
  for, the next step, and when to recast.
- **Limit.** One cast takes up to 6 follow-ups, and the sixth closes the session. A follow-up about a
  different matter is told it needs its own cast.
- **Storage.** The thread is kept for the session, and "Clear the deep dive" starts it over. The
  prompt is "Consult · Forecast deep dive" in Profile › AI prompts.

### 9.9 — Question Oracle recommends a reading method

Sharpening a question now also recommends one of the seven reading methods, with a one-line reason.
"Use this question", or an alternative, selects that method together with the question and the
matter type. The Oracle follows this guide:

| Question | Method |
|---|---|
| You and one other thing | Day Stem and Hour Stem (the default) |
| Fits one clean category, e.g. money, job, exam, illness, lost object | Useful God |
| What to do; most development and pathway questions | Doors |
| How a situation stands; most diagnosis questions | Stars |
| Other people's motives, trust, hidden agendas | Deities |
| Asking on someone else's behalf | Birth Year (年命) |
| Broad strategy and general surveys | Chief and Envoy |

### 9.8 — Question Oracle (Consult › Forecast)

The Question Oracle sharpens a question before the hour chart is cast, after the framework in Joey
Yap's "How to Read a QiMen Oracle Chart" session.

**Five question types,** shown as chips under the question box. Tapping one inserts a template:
- **Prediction:** will it happen?
- **Diagnosis:** why is it happening?
- **Pathway:** A or B — what am I not seeing about each? The reading must not choose for the person.
- **Development:** what do I need to know to make it work? This replaces "will I succeed?".
- **General survey:** the overall picture.

**Sharpen with the Question Oracle** (needs an AI key). It rewrites the question as one matter with one
time frame and an end date, plus exactly two options for a choice. It picks the matter type, explains
what it changed, lists up to two missing facts, and offers two alternative ways to ask. Tap "Use this
question" or an alternative to fill the box and set the framing. The matching prompt is
"Consult · Question Oracle" in Profile › AI prompts, and it reads your Qimen Learn notes.

**The forecast reading follows the framing.** The type, time frame and options go into the prompt, and
the reading is told how to answer that type. It now ends with **Ask next** (deeper follow-up questions)
and **When to ask again**.

**Repeat guard.** Casting the same question for the same matter within three days shows a notice to
act on the earlier reading first.

**Cache fix.** Forecast readings are now cached per question. Before this version, two different
questions cast in the same hour for the same matter type shared one cached reading.

### 9.7 — Qimen engine checked against the Comprehensive Qimen Dun Jia Guide

**One correction.** The centre palace (5) now holds only its earth-plate stem. 天禽 and the centre
stem have no place on the outer ring, so both ride with 天芮 (寄坤). The palace where 天芮 lands
shows 天芮 天禽 and both heaven stems. Before this version, the engine also drew 天禽 and a copy of
the centre stem inside palace 5, and did not show 天禽 next to 天芮.

**Confirmed unchanged against the guide:**
- the outer ring order 1→8→3→4→9→2→7→6
- stars and doors always turning clockwise, whatever the dun
- deities starting from the chief star's palace: clockwise in Yang Dun with 勾陈/朱雀, anticlockwise in Yin Dun with 白虎/玄武
- heaven stems following their stars
- the earth plate 戊己庚辛壬癸丁丙乙 laid from the ju palace, forwards in Yang Dun and backwards in Yin Dun
- the day changing at 23:00 (single Zi hour), since changed to midnight with a Late Rat hour
- Five Rats and Five Tigers
- the Guest/Host strength rule

### 9.6 — Learn notes in every reading, and dropped-connection handling

- **Every AI reading now reads your Learn notes.** The Almanac day reading and Plan a task use your Qimen and Bazi notes. Numbers uses your General notes, and the floor-plan reader uses your Feng Shui notes. Ask now draws on Bazi, Zi Wei and Qimen notes together, within one shared size limit.
- **Chinese notes match properly.** Matching used to split text only at spaces, so a run of Chinese counted as one long word. Chinese is now matched in overlapping two-character pieces (天芮死门 → 天芮, 芮死, 死门), so a note written in Chinese is found from the terms in the chart.
- **Each reading lists the notes it was given.** A "Your notes used" panel names them, or says that none matched.
- **Charting rules stay fixed.** The AI is told to use notes for what a configuration means, but never to apply a note that changes how a chart is calculated (pillars, ju, palaces, stars, doors, transformations, flying stars). It reads the chart exactly as the app calculated it, and may mention in one line that a note follows a different charting convention.
- **Dropped connections.** If a request to Gemini or Claude is cut off, the app now retries once. If the retry also fails, it checks whether the provider can be reached. If it can, the message says the long request was cut off after N seconds, rather than calling it a connection problem.

### 9.5 — prompt refinements saved per profile

Profile › AI prompts now saves to the profile that is signed in, so each person on the device keeps
their own refinements. It saves automatically as you type, and the Save button is still there. A
"Saved to this profile" note confirms each save. A profile that has no refinements of its own starts
from any set saved by an earlier build. The refinements are added to every AI reading, all 21
prompts including Ask. A changed refinement makes cached readings regenerate.

### 9.4 — Chart › Ask

A new **Ask** page at the end of the Chart tab takes a typed question, such as "What area of health
should I look after this year?" or "Should I resign before I have found a new job?". It reads the
question against all three systems in one AI call:

- **Bazi:** the full natal analysis, the current and next luck pillars, and the 8-year and 13-month
  scored timelines.
- **Zi Wei:** the whole board with brightness and minor stars, the current 大限, and the coming flow
  years with their 化禄 and 化忌.
- **Qi Men:** the destiny palace, Life Star, Life Gua and Day Master stars (Celestial Mentor included),
  plus the natal, current-year and current-month plates.

The answer leads with a verdict, a confidence figure and a direct answer. It then gives the action
plan, the reading from each system, timing, practical steps, cautions, the conflict ledger and
suggested follow-up questions. Five example questions fill the box with a tap.

Health answers point to areas to look after using the traditional five-element correspondences.
They never diagnose, and they send any symptom to a doctor. Decision answers depend on the practical
facts the person gives, such as whether an offer is in hand. The last 20 questions are kept on the
device and can be reopened or cleared. The prompt appears in Profile › AI prompts as "Chart · Ask".

### 9.3 — day, month and year Qimen plates

Before 9.3, the day, month and year charts put the governing pillar in the hour slot but kept the
hour chart's ju (the current solar term plus the 拆补 yuan). As a result, a "year" plate changed several
times within one year and a "month" plate changed within one month. Each scope now sets its own
dun and ju. The governing pillar still takes the hour position: the chief follows its stem, and the
envoy counts its branch from the xun head.

| Scope | Dun | Ju |
|---|---|---|
| Year | always 阴遁 | 60-year eras from 1864: upper 1, middle 4, lower 7 (1984–2043 is lower, 阴7) |
| Month | always 阴遁 | branch of the 符头 year (the latest 甲/己 year): 寅申巳亥 1, 子午卯酉 7, 辰戌丑未 4 |
| Day | by term | 冬至–立春 阳1, 雨水–清明 阳7, 谷雨–芒种 阳4, 夏至–立秋 阴9, 处暑–寒露 阴3, 霜降–大雪 阴6 |

Voids follow the governing pillar's xun. The month mapping is the majority rule (王瑞民's 阴遁7.1.4
table); a minority of texts swap 1 and 4.

Checked against the worked examples:
- Year 2004 甲申: 阴7, chief 天禽 in the centre.
- Month 丁巳 of 2003: 阴7, chief 天芮 landing in 坎.
- Day 2004-08-06 丁巳: 阴9, chief 天辅, envoy 杜门, 癸 in 震3.

Year and month plates are now constant across their period.

Hour-plate refinements:
- When the xun yi sits in the centre, the chief is now labelled 天禽 (lodged in 坤) rather than 天芮.
- **Celestial Mentor (天貴)** joins the Day Master stars. It is the Noble People (天乙) of the stem that
  combines with the Day Master (甲己 乙庚 丙辛 丁壬 戊癸), with the yang mentor listed first. For 丙 it uses
  辛, giving 寅 Tiger and 午 Horse.
- The centre stem now shows in two places: on the earth plate in 坤, and on the heaven plate riding
  with 天芮. A Day Stem that equals the centre stem finds its destiny palace there.

## Version 8


Version 8 adds the Fibonacci timing layer across Bazi, Zi Wei, Qimen, Yijing and San Cai; Zi Wei
timing (大限, 流年, 四化), star brightness and the fourteen minor stars; a quantitative layer (matrix and
tensor algebra, Markov chains, graph theory, Fourier analysis, Shannon entropy, game theory,
non-linear dynamics and fuzzy logic); a method trial that tests proposed lottery methods against
the archive; and a prompt framework, editable per reading on the Profile tab, behind every AI
analysis. Details are in the sections below.

A Chinese metaphysics timing companion for Android. It computes real charts from astronomical
data — no lookup tables, no stubbed values — and turns them into hourly, daily, weekly, monthly
and yearly guidance on what to do and what to hold back from.

Package: `com.qipath.pro`

---

## Branding

The mark is a cinnabar seal (朱文印) carrying 氣, ringed by a brass luopan band with the eight
trigrams around it — built from the app's own lacquer, cinnabar and gold-leaf palette so the icon
and the interface read as one thing.

`tools/make_icons.py` generates every asset from that single definition:

```bash
pip install pillow
python tools/make_icons.py
```

| Output | Purpose |
|---|---|
| `mipmap-*/ic_launcher.png` | legacy launcher icon, 5 densities (API < 26) |
| `mipmap-*/ic_launcher_round.png` | round launcher variant |
| `mipmap-*/ic_launcher_foreground.png` | adaptive-icon foreground, inset to the 72/108dp safe zone |
| `drawable-{port,land}-*/splash.png` | 11 launch screens, replacing the Capacitor defaults |
| `tools/playstore-icon-512.png` | Play Store listing icon |
| `www/img/logo.svg` | the same mark as vector, used in the app banner and sign-in screen |

The app is labelled **QiPath Pro** in `strings.xml` (launcher and task switcher), on the sign-in
screen, and in the top banner, where the logo sits beside the wordmark.

The script falls back to a geometric mark if no CJK font is installed, so the build never depends
on 氣 rendering on the machine doing the generating.

## Getting an APK

You do **not** need Android Studio. Push this folder to a GitHub repository and the included
workflow builds the APK for you.

1. Create a repo and push this folder to it.
2. Open the **Actions** tab. The `Build APK` workflow runs on push, or you can trigger it
   manually with **Run workflow**.
3. When it finishes, download the `QiPathPro-debug-apk` artifact from the run summary.
4. Unzip it and install the `.apk` on your phone. You will need to allow installation from
   unknown sources.

### Building from the command line

`local.properties` holds your Android SDK path. It is machine-specific and therefore not
committed, so a fresh copy of the project has nothing for Gradle to read and the build stops with
*SDK location not found*. Fix it once:

```bash
npm run setup:sdk                       # auto-detects the SDK and writes the file
npm run setup:sdk -- "D:/Android/Sdk"   # or point it somewhere explicit
```

Or write `android/local.properties` by hand:

```properties
sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk
```

Use **forward slashes**. This is a Java properties file, so a lone backslash is an escape character
and a Windows path written with `\` fails silently. Setting `ANDROID_HOME` works too, but open a
new terminal afterwards — the existing one keeps the old environment. Opening the `android` folder
in Android Studio once also writes the file for you.

### Building locally instead

Requires **JDK 17**, Node 20 and the Android SDK. JDK 21 will not work: Capacitor 6 ships
Gradle 8.2.1, which supports up to JDK 20, and fails on 21 with *Unsupported class file major
version 65*.

`npm install` must run before Gradle — `capacitor.settings.gradle` points at
`node_modules/@capacitor/android`, so a Gradle build without it cannot resolve the project.

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
# APK lands in android/app/build/outputs/apk/debug/
```

### Opening in Android Studio

1. `npm install` in the project root **first**. Gradle resolves `:capacitor-android` out of
   `node_modules`, so a sync before installing fails. (The build now stops with that instruction
   rather than an opaque error.)
2. Open the **`android` folder**, not the repository root. The repo root has no `settings.gradle`,
   so Studio will not recognise it as a Gradle project.
3. Let Gradle sync, then **Run ▶** or *Build → Build Bundle(s) / APK(s) → Build APK(s)*.

Or from the root: `npx cap open android`.

The wrapper uses Gradle 8.9, which runs on JDK 17 through 22. **Recent Android Studio releases bundle
JDK 25, which Gradle 8.9 rejects** with *Unsupported class file major version 69*. Point Gradle at
JDK 21 instead: *Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK*, or on the
command line set `JAVA_HOME` to a JDK 21 (or 17) before `./gradlew assembleDebug`. Version 8 was
built and verified this way with JDK 21.

The first build downloads `aapt2` and other Android build tools from Google's Maven repository, so
it needs a network connection once; later builds can run with `--offline`.

A ready-built debug APK, `QiPathPro-9.28.0-debug.apk` (versionCode 37, versionName 9.28.0), sits in the
project root. It was checked to contain every web asset, including the corrected Qimen engine.

Whenever you edit anything in `www/`, run `npx cap sync android` before rebuilding — Studio builds
from `android/app/src/main/assets/public`, not from `www`.

### Reviewing the screens

`QiPathPro-UI-review.html` renders all 19 screens live in phone frames from the real engine — the
charts and formations in it are computed on load, not screenshots. The frames are interactive.

Review mode is also available in the app itself: append `#review=<tab>` or `#review=<tab>:<segment>`
to the URL (for example `#review=consult:strategy`) to open one screen against a demo chart without
signing in.

### Running it as a web app

The whole app is plain HTML, CSS and JavaScript with no build step. Serve the `www` folder:

```bash
npx serve www
```

### Signing a release build

The workflow can produce an unsigned release APK, but Play Store distribution needs a keystore:

```bash
keytool -genkey -v -keystore qipath.keystore -alias qipath -keyalg RSA -keysize 2048 -validity 10000
```

Then add `signingConfigs` to `android/app/build.gradle` and store the credentials as GitHub
repository secrets rather than committing them.

---

## Dependency audit

`npm audit` reports **0 vulnerabilities**. Two transitive packages needed handling:

- `tar` — reached through Capacitor CLI 6. Forcing tar 7 breaks the CLI (its `tar.extract` export
  differs), so the fix is the CLI upgrade to 8.4.3+, which depends on a patched tar directly.
- `uuid` — reached through `@capacitor/cli → xcode → uuid@7.0.3`, which has a buffer bounds issue.
  `npm audit fix` cannot reach it, so `package.json` carries an `overrides` entry pinning uuid to
  `^11.1.1`. Verified afterwards that `npx cap sync android` still completes and the web assets
  copy correctly.

Nothing in `node_modules` ships inside the APK — it contains only the `www` assets and native code
— so these were build-machine risks rather than end-user ones, but they are cleared.

## Build verification

The project was audited against everything that breaks an Android build. All static checks pass:

| Check | Result |
|---|---|
| XML well-formedness | 12 files, all parse |
| Resource references | 15 references, all resolve |
| Launcher icons | present at all 5 densities, plus the adaptive vector |
| Package identity | `com.qipath.pro` consistent across capacitor config, `applicationId`, `namespace`, `strings.xml` and the Java package path |
| Web assets | all 17 `index.html` references exist in `assets/public`; `www` fully in sync |
| JavaScript | every shipped file passes `node --check` |
| Gradle scripts | 8 files, balanced structure |
| Gradle wrapper | jar present, `gradlew` executable |
| Workflow | valid YAML, 14 steps, artifact path matches the AGP output |
| Gradle / JDK | Gradle 8.9 runs on JDK 17 and JDK 21 |
| AGP consistency | 8.2.1 in the root, the cordova plugins module and the Capacitor module |
| Fresh clone | `settings.gradle` stops with a fix when `node_modules` is absent |
| Missing SDK | `settings.gradle` stops with the exact file, path and escaping rule needed |
| Line endings | `.gitattributes` keeps `gradlew` LF after a Windows checkout |

Five real build problems were found and fixed:

**JDK mismatch.** The workflow installed JDK 21, which Gradle 8.2.1 does not support. Pinned to
JDK 17.

**ES2020 syntax in the formation library.** `qpdata.js` was ported from TypeScript and used optional
chaining (`?.`). On any WebView older than Chrome 80 that is a *parse* error, not a runtime one — the
whole file fails to load and every Consult feature disappears silently, on an APK that built and
installed fine. The file is now transpiled to ES5 via `npm run build:es5`, and was verified
behaviourally identical: 240 charts and 7,293 formation hits compared between the original and the
ES5 build with zero differences.

**Gradle could not run on Android Studio's JDK.** Current Android Studio bundles JDK 21, and the
Gradle 8.2.1 wrapper Capacitor generates cannot run on it at all — a sync would fail immediately on
a stock install. The wrapper is now Gradle 8.9, which supports JDK 17 through 22. The Android Gradle
Plugin was deliberately left at 8.2.1: it is pinned to that version inside `@capacitor/android`,
and raising it in the root only would put two AGP versions on one classpath.

**A fresh clone failed its first sync with an opaque error.** Gradle resolves `:capacitor-android`
from `node_modules`, which does not exist until `npm install` runs. `settings.gradle` now stops
with that instruction and the exact path it expected.

**The generated instrumented test asserted the wrong package.** Capacitor's template checks for
`com.getcapacitor.app`; the app is `com.qipath.pro`, so pressing Run on that test in Studio failed.
Corrected.

The CI workflow now also runs `node --check` over every script before building, confirms `cap sync`
populated the assets, and unzips the finished APK to confirm the web bundle and formation library
are actually inside it.

## What is in it

**Now** — the current double-hour as a twelve-branch dial, with the Qimen gate, star and spirit
governing it, the favourable and unfavourable direction to face, and the day's twelve hours ranked.

**Almanac** — day, week, month and year views for **any date**, defaulting to today. Picking a date
re-reads all four horizons from it: the day itself, the seven days from it, its solar month and its
year. Day officer (建除十二神), duty spirit (黃道黑道),
lunar mansion (二十八宿), void branches, clashing sign, solar term, the day's hexagram, and monthly
and annual flying stars by sector.

**Chart** — six views:

- **Bazi** — Four Pillars with ten gods, plus the 滴天髓 frame (see below)
- **Elements** — the five elements read across seven domains of a life
- **Relations** — clashes, punishments, harms, unions, frames, stars and the twelve stages
- **Forecast** — luck pillars (大運) with exact handover dates, the Fibonacci timing layer
  (golden points, time zones, 8-year and 13-month projections, Fibonacci ages) and an AI forecast
- **Qimen Destiny** — the natal Qimen plate, cast from your birth moment and fixed for life
- **Zi Wei** — a Zi Wei Dou Shu board with the fourteen major stars, plus 大限 decade limits,
  流年 flow years and 四化 transformations, read through the Fibonacci timing layer, with an AI forecast
- **Feng Shui** — the building's Xuan Kong flying star natal chart, annual layer, afflictions, shape and placement
- **Compass** — a Period 9 luopan with live device heading
- **Property** — saved buildings, periods and facing bearings
- **Plan** — floor plan import, orientation and sector overlay

**Consult** — eight tools. Every one defaults to the current date and double-hour, lets you cast
for any other window, and can save its result as a record tied to your profile:

- **San Cai 三才** — the execution engine. See below.

- **Forecast** — ask a question, choose the matter type and the hour. The engine locates the Yong
  Shen (用神) governing that kind of question across 19 scenarios in 9 categories, reports where it
  sits, its relation to you (the Day Stem), whether it falls void, and the direction to act in,
  ending on Favourable / Workable / Guarded / Unfavourable. The cast plate is shown and every
  palace is tappable. Question, chart and AI reading save together as one record.
- **Search** — multi-select from all 133 formations, each with its description and category. Set a
  date range and the app finds every double-hour in it where those structures occur, naming the
  palace and showing its stems, star, door, deity, house branch, constellation, void and envoy.
  Any occurrence carries straight into Manifest, and can be saved with its AI reading.
- **Manifest** — pick the date, hour range, palace and what to ask for, and get the eight-step
  practice, the spoken script and the reciprocity that closes the exchange. Defaults to the current
  hour and the palace's own door; choosing a different register is allowed and the script says so.
- **Plan a task** — 43 TongShu activities across 9 groups, looking ahead 14, 30 or 60 days or to a
  chosen date. Tap any date for a sheet explaining why it scores as it does, with the twelve
  double-hours ranked by priority.
- **Strategy** — pick any date and hour and compute the auspicious, hostile and strategic
  structures present. Tap one for what it means here, how to use or avoid it, and what to weigh.
- **Qimen** — cast an hourly, day, month or year chart. The plate shows heaven and earth
  stems, star, door, deity, house branch, void, envoy and chief, with inner and outer palaces
  distinguished and every symbol rated 旺相休囚死 against its palace.
- **Yijing** — Plum Blossom casting for any moment: the primary, nuclear (互卦) and changed
  hexagrams, the 体用 judgement, 應期 timing, the Fibonacci timing layer, and an AI reading.

**Profile** — your chart details, API key entry for AI narrative analysis, and profile management
(switch, add, delete).

**Numbers** — chart-derived 4D numbers on Wednesday, Saturday and Sunday, and seven Toto numbers
on Monday and Thursday, following the Singapore Pools draw calendar. Locked with a countdown on
other days. Read the notice on that screen: these are a traditional flourish and carry no
predictive power over a random draw.

---

## Manifestation and the exchange

The Manifest screen builds its guidance from the actual plate rather than from a generic template.
The door in the chosen palace sets what can be asked for there (the Open Door invites an opening,
the Life Door growth, the Death Door a clean ending, and so on), the deity sets the register, and
the palace element sets the form the reciprocity takes.

The exchange is treated as central rather than decorative. Each element carries its own way of
returning the favour — Wood by planting or teaching, Fire by giving credit or making an
introduction, Earth by feeding or sheltering, Metal by giving material resources or settling a debt
early, Water by sharing knowledge or listening. The guidance asks for it within three days, without
an audience, and directed away from the matter you asked about, on the reasoning that reciprocity
which quietly benefits your own request is not an exchange.

The script itself is written to be spoken: it names where and when you stand, states the ask
plainly, acknowledges what you bring, names what you will give in return, and closes by releasing
the matter. An AI expansion is available if a key is configured, but the offline script is complete
on its own.

The app frames this honestly throughout. It is a focusing and commitment practice with a long
tradition behind it; it works on clarity and willingness to act inside a chosen window, and it is
preparation for doing the thing rather than a substitute for doing it.

## AI narrative analysis

The written readings are optional. Every chart, almanac reading and formation is computed on the
device and works with no key and no network. A key only powers the prose panels on
**Almanac · Day**, **Chart · Bazi** and **Chart · Zi Wei**.

Two providers are supported, chosen on the Profile tab:

| Provider | Get a key | Models offered |
|---|---|---|
| Google Gemini | aistudio.google.com/apikey | gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-lite, gemini-2.0-flash |
| Anthropic Claude | console.anthropic.com | claude-sonnet-5, claude-opus-5, claude-haiku-4-5 |

Narrative panels appear on Almanac · Day, Chart · Bazi, Chart · Zi Wei (a reading and a
forecast), Chart · Forecast, Consult · San Cai, Consult · Forecast, Consult · Yijing and
Consult · Manifest.

The five forecasting prompts (Chart · Forecast, Chart · Zi Wei forecast, Consult · San Cai,
Consult · Forecast, Consult · Yijing) share a
**precision protocol**. The model is told to reason through the anchor reading, then the Fibonacci
series, then where they agree or disagree, before answering; to cite the datum behind every claim;
to give timing only as exact dates and hour ranges copied from the computed timeline, never "soon",
and never a date the input does not contain; to give a confidence percentage derived from the
supplied agreement figure and capped at 90%; and to say which conclusions are classical and which
come from the timing layer. Each forecast returns a direct answer, a confidence figure, a list of
precise windows best-first, and the trough windows to avoid.

**Test connection** verifies a key by actually generating with it, not merely by listing models —
a model can appear in a key's list and still refuse `generateContent`. Candidates are tried in
preference order until one succeeds, and the working model plus the key's real model list are then
persisted, so an analysis uses exactly what was proven to work.

The built-in model list is only a guess; the key's own list is authoritative and is never
overwritten by it. Saving a key keeps the discovered list unless the key itself changes. For Gemini it calls the model-list
endpoint with a plain GET — no preflight, no structured-output config — so it isolates whether the
*key* is valid from whether a given model or request shape works. It then repopulates the model
dropdown with the models your key can actually run, and switches the selection if the current one
is not among them.

Failures are reported in plain language rather than as raw status codes: a rejected key, an API not
enabled on the Google project, a billing problem, an exhausted quota, an unavailable model, a
provider outage, and a network failure each say so specifically and say what to do.

### If the standalone HTML cannot reach the API

Opening `QiPathPro-standalone.html` straight from disk gives it a `file://` origin, and browsers
block cross-origin API calls from there. Everything else in the app still works, but the AI panels
will report a connection problem. Either serve the folder over http:

```bash
npx serve www      # then open the printed http://localhost address
```

or use the Android app, where the WebView runs on an `https://` scheme and the calls succeed. The
same origin restriction can also stop the browser persisting the key, in which case the app says so
rather than failing silently.

The prompts are ported from the web app's `generateDailyAiAnalysis`, Bazi and ZWDS functions, and
are fed the real computed chart: the detected formations with their palace numbers, the full
nine-palace layout with heaven and earth stems, the Dong Gong 宜/忌 lists, the ruling mansion, and
your own day master and favourable elements. A daily prompt runs to roughly 7,800 characters, so
the model is reasoning over your actual chart rather than writing generic horoscope copy.

Results are cached per profile per day in `sessionStorage`, so reopening a tab does not spend your
quota again. **Regenerate** forces a fresh call.

### Where the key lives

On the device, in `localStorage`, in plain text, sent directly to Google or Anthropic. There is no
QiPath server in the path. Usage bills to your own account. Two consequences worth being explicit
about: anyone with unlocked access to the phone can read the key, so remove it before handing the
device on; and never bake your own key into an APK you distribute, since it ships to every
installer. Each user should enter their own.

## Relationship to the web application

This app is built from the QiPath web application (the Base44 build) as reference. That app is a
React client over a hosted serverless backend: the metaphysics engines run server-side and the
narrative analysis calls Gemini. An APK that simply wrapped it would need the network, the hosted
backend and a Base44 subscription on every launch.

So the engines were reimplemented to run **on the device**, and the genuinely valuable hand-curated
domain data was ported across verbatim:

| Ported from the web app | Notes |
|---|---|
| Formation library (`formations.ts`) | All 133 格局 with their detection logic, reused unmodified |
| Dong Gong date selection (`dailyAlmanac.ts`) | 宜/忌 activity lists for each of the 12 officers |
| 28 mansions (`constellations28.ts`) | Per-mansion 宜/忌, element and directional group |
| Qimen metadata (`qmdjConstants.ts`) | Door, star, deity and palace tables incl. Yang/Yin deity variants |

The two engines were cross-checked and agree where it matters: the day-pillar anchor is identical
(2000-01-01 = 戊午), the Qimen Ju table per solar term is identical, both use 拆補 for the yuan,
and both use the same Meeus solar-longitude algorithm.

Two things were **not** carried over. The Gemini narrative analysis needs a network call and an API
key, so it is absent. And one value was deliberately not copied — see below.

### A bug found in the web application

`constellations28.ts` anchors the 28-mansion cycle at JDN 2461244 = index 23. That anchor is wrong.
Each mansion is fixed to a weekday by the seven-luminary rule (房 and 虚 are always Sunday, 角 always
Thursday, and so on). Tested over 700 consecutive days, the web app's anchor violates that rule on
**every single day**; the anchor used here satisfies it on all 700. Concretely, 2026-07-22 is a
Wednesday, so it must be a 水 mansion — this app gives 壁 (壁水貐, correct), the web app gives 柳
(柳土獐, a Saturday mansion). The code comment there is also internally inconsistent: it says index
23 is 星宿, but index 23 of its own array is 柳.

Worth fixing in the web app: set `ANCHOR_JDN = 2461244` with `ANCHOR_INDEX = 13`.

## San Cai execution 三才

The flagship feature, and the only one that runs all three engines against each other rather than
presenting them side by side. Three layers answer three different questions:

| | Domain | Engine | Question |
|---|---|---|---|
| **天 Heaven** | Date selection 擇日 | Officers, duty spirits, mansions + your Bazi | *When* |
| **地 Earth** | Flying Stars 飛星 | Annual and monthly stars + your Eight Mansions | *Where to sit* |
| **人 Man** | Qimen Dunjia 奇門 | Hour plate: door, star, deity, stems | *Which way to face* |

Earth and Man are deliberately separate answers: Earth places the body in a sector of the building,
Man orients the action within it. They frequently differ, and when the direction you must face
carries a hostile annual star the mandate says so explicitly — face it for the action, do not sit
in it.

**Eight objectives**, each defining what the three layers must supply: Wealth Manifestation, Career
Advancement, Conflict Resolution, Pitching a Pilot Initiative, Academic/Certification Success,
High-Stakes Negotiation, Launching or Opening, Ending or Restructuring. The objective determines the
required Qimen doors, stars, deities and stems, the Flying Star sectors sought, and the TongShu
activity used for date scoring — so changing the goal genuinely changes all three answers, not just
the wording.

**The Bazi filter is a filter, not a penalty.** A day clashing your own animal sign is excluded
outright before the hour scan runs, however good its Qimen plate looks, and the excluded days are
listed with the reason. Days scoring under 38/100 for the chosen activity are dropped the same way.

**Hours are restricted to 07:00–21:00 by default.** Every objective here describes an action taken
with other people, so a technically perfect 03:00 window is not an actionable one. The full twelve
double-hours remain available as an option.

**Scoring is calibrated to mean something.** Each layer is normalised to 0–100 and weighted
(Heaven 0.34, Earth 0.22, Man 0.44). Across 384 candidate windows the composite spread runs
43–83 with a median of 63, and *Exceptional* accounts for 1.3% — so the band is informative rather
than flattering.

Each of the top three windows opens into a full mandate: the three layer scores, why each was
chosen, the Flying Star grid with the sit-in and face-toward cells marked, the Qimen palace in full
detail, the plate, and the cautions. Saveable as a record, with an AI briefing that receives all
three layers.

## Feng Shui

Implemented from `docs/fengshui-spec.md`. The module now works on a **building**, not just a
calendar.

**Periods and the 24 mountains.** Period from the completion date, rolled at Lichun — a building
finished on 20 January 2024 is Period 8, not 9. The 24-mountain lookup uses the `+22.5` offset;
`+7.5` is the obvious guess and puts every chart one mountain out.

**Xuan Kong natal charts.** Period star to the centre, base water and mountain stars from the facing
and sitting palaces, each flying forward or reverse by the polarity of the mountain at the matching
yuan rank. Validated: Period 8 produces the textbook **6/6/6/6** distribution across all 24 facings,
and 子山午向 / 午山子向 match their published charts.

**Period 9 has no 旺山旺向 at any facing.** The base stars always land in complementary palaces,
which always carry opposite polarity, so they can never both fly reverse. Every building in this
period is one of the two double-star types. The app states this rather than sending users hunting
for a chart that does not exist, and the AI prompt carries the same instruction.

**Afflictions.** Tai Sui, Year Breaker, Three Killings and Five Yellow, drawn as arcs on the
compass. The app is explicit about the distinction most often reversed: Tai Sui may be sat against
but not faced; Three Killings may be faced but not sat against.

**The compass** shows calibration drift over the last few seconds, warns within 2° of a sector
boundary, and gives manual entry equal prominence. iOS permission is requested from inside the
gesture; Android heading is `360 − alpha`, iOS uses `webkitCompassHeading` without inversion.

### Floor plans

Six steps: import, orient, outline, centre, rooms, overlay. Orientation comes from a **measured
edge**, never the printed north arrow — the user draws a line along the facing wall and supplies its
true bearing, and `planNorth` follows.

**Two geometries, deliberately.** Star sectors are pie wedges from the centre; shape deficiency is
the 3×3 grid over the bounding rectangle. Wedge sampling scores a *perfect rectangle* at 51–76% and
would flag every rectangular flat as defective. Verified: a full rectangle reads 100% in all nine
cells, an L-shape isolates one missing corner, and rotating the plan moves that corner correctly.

**AI plan reading is proposed, not applied.** Vision models misread hand sketches and mirror-flip
symmetrical plans, so every room is confirmed by the user, carries a confidence, and the model is
instructed to report what it cannot read rather than guess.

### The audit (step 7)

A full property audit with cures, built in two layers so the AI expands findings rather than
inventing them.

**The engine layer is deterministic.** It computes findings from the chart, the rooms placed on the
plan and the shape of the outline: Five Yellow in the natal chart or visiting annually, afflicted
star combinations, missing corners with the palace each governs, chart-level problems (a reversed
chart, or which half a double-star chart leaves unsupported), and room-versus-sector conflicts — a
bedroom on a 5, a main door on a 2, a **toilet over the timely water star**, a bathroom or staircase
in the centre. Each finding carries its cause and a cure by element logic, ranked high, medium or
low. Verified across 72 period-and-facing combinations with no failures, and it still produces a
useful audit with no plan and no rooms at all.

**The AI layer adds what only the image shows.** The plan is sent as vision input alongside the
full computed chart, with instructions to treat the chart data as given and read the image for what
the numbers cannot reach: 穿堂煞 (door aligned with a window so qi runs straight through), a door
opening onto a toilet or stove, stove and sink clashing, a bed sharing a wall with a toilet, sharp
corners, stairs facing the entrance. It returns a verdict, plan observations, a room-by-room
assessment, and **cures ranked by priority with element, cost and what would make it worse**.

**The cure rule most often got wrong** is enforced in both layers: an Earth affliction (2 or 5) is
drained with **Metal and never fed with Fire**. Red, lighting and heat make it worse. The engine
states this and the prompt repeats it.

Cures are written by material and reasoning, not as shopping lists of ornaments, and the audit says
plainly when something can only be managed rather than corrected.

## The 滴天髓 layer

The Bazi module implements the analytical frame of 滴天髓 (Di Tian Sui) rather than a simple
element count, because a chart can be numerically balanced and still be unworkable.

**強弱 — strength, assessed three ways.** 得令 (month command, via the day master's stage in the
month branch), 得地 (roots in hidden stems) and 得勢 (visible allies) are reported separately, as
the classic does, rather than collapsed into one figure. A chart weak by season but strongly rooted
reads differently from the reverse.

**調候 — climatic regulation.** The full 120-entry table from 窮通寶鑑, indexed by day master and
month branch. This is the correction that matters most: a chart with tidy element proportions born
in deep winter is still frozen, and the reading says so when the regulator is absent.

**病藥 — illness and cure.** Where one element exceeds ~39% of the chart, it is named as the
disease and both remedies given: draining into what it produces, or direct control. The special
case 母慈滅子, where an over-abundant resource smothers rather than nourishes, is detected
separately and prescribed an outlet rather than more support.

**通關 — bridging.** Where two strong elements sit locked in a controlling relationship with the
mediating element nearly absent, that mediator is named. In this situation the bridge is worth more
than any amount of additional support, and it is promoted into the favourable set.

**從格 — following structures.** 從財, 從殺 and 從兒 are detected when the day master has no root,
does not command the month, and holds under ~22% of the chart. This inverts the usual advice, so
the reading flags it as provisional and says why.

**十二長生** — the day master's stage in each of the four branches, with the strength each lends.

### Five elements across a life

Seven domains — career, wealth, relationships, health, education, family, children — each read
from its governing ten gods and its palace, and scored. The readings reference the classical
patterns where they genuinely apply: 財多身弱 (wealth outweighing the day master), 食神生財
(output feeding wealth), 傷官配印 (output disciplined by resource). Health is framed as
constitution and habit, with symptoms deferred to a doctor.

### Punishments, clashes and stars

All branch and stem relations: 六沖 and 天干相冲, 三刑 including the self-punishments, 六害,
六合 and 天干五合, 三合 frames and 三會 directional frames — each reported with the pillars it
touches and what those pillars govern. Fifteen 神煞 are detected, including 天乙貴人, 文昌, 祿神,
羊刃, 桃花, 驛馬, 華蓋, 將星, 金輿, 孤辰/寡宿, 劫煞 and 亡神, grouped by whether they help,
complicate or warn.

Verified across 1,616 charts spanning 1930–2030 with no failures, and incidence rates that match
expectation — following structures at 1.9% (rare, as they should be), full three-branch punishments
at 8.5%, complete frames at 5.3%.

## Learn — the knowledge library

A seventh tab where you supply your own material and it is used in every relevant reading.

**What it does, stated exactly.** The app cannot train or fine-tune a model. Gemini and Claude are
stateless: nothing sent to them changes their weights, and nothing persists between calls. What this
does instead is store your material on the device and put the relevant parts into the prompt each
time a chart is read. That is **retrieval, not learning** — and the screen says so rather than
implying otherwise.

In practice it delivers most of what people want from "teaching the AI": the model reads your
school's rules, your teacher's notes and your own case records alongside the chart, and answers
inside that frame. It is durable because the notes are on the device, inspectable because you can
read exactly what was stored, and it stops at the edge of what you have given it.

**Adding material.** Paste text, or attach images (book pages, hand-drawn charts) and PDFs — both go
to the provider as vision input. The AI reads them and proposes structured notes: a title, a module,
a kind (method, rule, reference, case, glossary, preference) and a dense reusable body. You review
before anything is added, and it also reports **what the material does not settle**, which is more
useful than a clean summary.

Video is not accepted: neither provider takes it through this route. The app says so plainly and
suggests a transcript or key frames rather than failing obscurely.

**How it reaches the reading.** Notes are scoped by module and ranked by overlap with the question,
trimmed to a 6,000-character budget so they never crowd out the chart itself. Nine prompts pull from
it — Bazi, Elements, Relations, Zi Wei, Qimen forecast, Qimen destiny, structures, manifestation and
San Cai. The injected block instructs the model to follow your material where it conflicts with
general knowledge, to say which rule it is applying, and not to pretend it says more than it does.

Notes can be deactivated without deleting, and the whole library exports and imports as JSON.

## Qimen forecasting methods

Qimen is not one method. Practitioners differ on which symbol stands for the asker, which for the
matter, and therefore which relation answers the question. Rather than hard-code one school, Consult
› Forecast offers seven, and the reading states which frame produced it:

| Method | The matter is read from |
|---|---|
| 日干时干法 Day Stem and Hour Stem | The Hour Stem — the classical hour-chart frame |
| 用神法 Useful God | The symbol governing that category of question |
| 八门法 By Doors | The door governing the matter — action and human affairs |
| 九星法 By Stars | The star — conditions and disposition rather than action |
| 八神法 By Deities | The deity — intent, sanction, concealment, force |
| 年命法 By the Asker's Birth Year | The 年命 palace from the birth-year branch |
| 值符值使法 Chief and Envoy | The chief star as authority over the whole hour |

Each genuinely reads a symbol of its own kind — a category map supplies a star or deity when the
scenario itself carries none, so the star and deity methods cannot silently collapse back into the
door reading. For one wealth question the seven methods return six distinct symbols, and they can
disagree. That is the point of having them, and the AI is told to say so.

A note of kind **Method** in your library is injected into every Qimen reading, so your own school's
procedure overrides the built-in one.

## Fibonacci timing 斐波那契

Each system answers for one moment. The Fibonacci layer (`www/js/fibonacci.js`) asks where the
pivots are in time, the way a trader reads a price chart: Fibonacci time zones (1, 2, 3, 5, 8, 13,
21, 34, 55, 89 units from an anchor) and golden-section retracement (23.6, 38.2, 50, 61.8, 78.6 %).
The difference is that every point on the series is a real chart, recast and rescored by the
system's own engine. Nothing is a lookup table.

| | Anchor | Fibonacci series | Scored by |
|---|---|---|---|
| **Bazi** (Chart · Forecast) | Birth, and the current luck-pillar handover | Ages 1–89; months +1…+89 from the handover; 8 years (F6); 13 solar months (F7) | Each pillar against the natal chart — favourable and unfavourable elements, clashes with the day, month and year branches, six and three harmonies, stem unions |
| **Qimen** (Consult · Forecast) | The cast hour | +1, 2, 3, 5 … 89 double-hours, then +13, 21, 34 days | A full recast of the plate, read by the same scenario and method |
| **Yijing** (Consult · Yijing) | The cast hour | +1, 2, 3, 5 … 89 double-hours | A fresh Plum Blossom cast, judged by 体用 |
| **Zi Wei** (Chart · Zi Wei) | The current 大限 and birth | Golden points in the decade; years +1, 2, 3, 5, 8 from its start; 8 flow years; nominal ages 1–89 | The period palace's major stars across 三方四正 and the 四化 landing there |
| **San Cai** (Consult · San Cai) | Each candidate window | Follow-through: +1, 2, 3, 5, 8, 13 double-hours. Follow-ups: +1, 2, 3, 5, 8, 13, 21 days | The goal's Qimen layer; for follow-ups all three layers |

Three things are computed from every series:

- **Golden zones.** Each window is placed by where its score falls in the series' own range:
  Peak (≥78.6%), Golden (61.8–78.6%), Balanced, Retracement, Trough (<23.6%). "Golden" therefore
  means strong relative to the windows actually on offer, not against an arbitrary bar.
- **φ-weighted consensus.** The anchor counts 1 and each later window 0.618 of the one before, so
  near windows dominate. The **refined verdict** weighs the anchor 0.618 against the consensus 0.382.
- **Agreement and trend.** The share of windows on the same side as the refined verdict, and a
  least-squares slope across the series.

In Bazi, a foreground cycle is weighed 0.618 against its background 0.382 — the annual pillar
against the luck pillar, the month against the year. Inside the current luck pillar the 0.382, 0.5
and 0.618 points are dated; 0.5 is the traditional stem-to-branch handover.

Yijing also gains the classical Plum Blossom judgement it lacked: **体用** (the trigram without the
moving line is the self, the one with it is the matter), their element relation, the **互卦**
nuclear hexagram as the middle course, the changed trigram as the outcome, and the seasonal
strength of 体 in the cast month. **應期** timing reads the Xiantian numbers of the trigrams and the
cast total on the Fibonacci scale, and the Zeckendorf decomposition of the cast number (its unique
sum of non-consecutive Fibonacci terms) as pivot offsets.

**San Cai** is re-ranked by follow-through. The fifteen strongest candidates each have the goal's
Man layer recast on the Fibonacci double-hours after the window, and the refined composite swaps
the window's own Man score for that φ-consensus at 0.382 weight. A window whose plate collapses an
hour later ranks below one whose support carries on, because the matter started in it has to
keep moving. Each mandate also lists Fibonacci follow-up dates with all three layers rescored —
for the second meeting, the signature after the verbal yes, or the check-in. Days that clash the
user's sign are kept and capped at 30, so the schedule shows why a date is weak.

**Zi Wei** gained the timing it lacked. 大限 decade limits start at the 局 number and run forward
for a yang-year male or yin-year female, reverse otherwise. 流年 places each year's Life palace at
the palace of the year's branch. 四化 follows the common 中州 table (庚 has variants). Each period is
scored from the fourteen major stars across 三方四正 (palace 1.0, opposite 0.6, trines 0.4; an empty
palace borrows its opposite at 0.8) plus the period stem's 四化 landing in that field and the natal
四化 at half weight.

**The fourteen minor stars** are placed and scored: 六吉 (左辅, 右弼, 文昌, 文曲, 天魁, 天钺), 禄存
and 天马, and 六煞 (擎羊, 陀罗, 火星, 铃星, 地空, 地劫). Placement follows iztro and the classical
rhymes — 左辅 from 辰 forward by lunar month and 右弼 from 戌 backward; 文昌 from 戌 backward by
hour and 文曲 from 辰 forward; 魁钺 by year stem (甲戊庚牛羊…六辛逢马虎); 禄存 by year stem with
擎羊 one palace ahead and 陀罗 one behind; 天马 by the year-branch triad; 火星 and 铃星 from a
triad-set start, forward by hour; 地空 and 地劫 from 亥, backward and forward by hour. 文昌, 文曲,
火星, 铃星, 擎羊 and 陀罗 carry iztro brightness grades. A minor star counts at 0.75 of a major
one and is not borrowed by an empty palace; the 左右, 昌曲 and 魁钺 pairs meeting in a period's
三方四正 add +0.5 each, and 禄马交驰 (天马 with 禄存 or the period 化禄) adds +1. With 文昌, 文曲,
左辅 and 右弼 on the board, every 四化 now lands. Miscellaneous stars (天刑, 红鸾 and the rest) are
not placed.

**Brightness (庙旺得利平不陷)** weights every major star. The table is taken from the open-source
iztro library (MIT) and was checked against the 甲級星各宮廟旺利陷表 on 紫微斗數筆記, with rows
子, 午 and 寅 agreeing in full; schools differ in places, and this table never puts 紫微, 天府, 武曲
or 七杀 below 平. It follows the classical rule of thumb — 庙: 吉星极吉，凶星不凶; 陷: 吉星无用，
凶星最凶. A benign star is multiplied from ×1.5 at 庙 down to slightly negative at 陷; a volatile
star (廉贞, 七杀, 巨门, 破军) is tamed to mild support at 庙, neutral at 旺 and at full force at 陷;
贪狼 takes its sign from brightness alone. 化禄, 化权 and 化科 act more fully on a bright star, and
化忌 is cushioned on a bright star and aggravated on a fallen one. The grade is shown beside every
star on the board, in the palace lists and in the AI prompts.

体用, 互卦, 應期, 大限, 流年 and 四化 are classical. The Fibonacci intervals, golden zones and φ-weighting are a
QiPath synthesis layered on top, and every screen and AI reading says so. They make the timing
specific and traceable; they do not make a symbolic system into a measured one.

A fix made along the way: the Yijing engine flipped the moving line in place before returning, so
the screen drew the *changed* hexagram's lines under the primary hexagram's name, and the AI
prompt received the wrong line values. Both lines sets are now returned separately.

## The quantitative layer

`www/js/mathlab.js` applies four branches of mathematics to what the engines already compute.
None of it adds a claim to the tradition; it measures the symbolic system more precisely.

**Matrix algebra and tensors — Qimen (Consult › Forecast › Plate tensor).** The plate is a rank-3
tensor T[palace][layer][element] (9 × 5 × 5, one-hot per layer: heaven stem, earth stem, star, door,
deity). Contracting the layer mode gives V (9 × 5); A = (V·M·Vᵀ) ⊙ W is the palace influence
matrix, where M is the five-element interaction matrix (generates +1, controls −1, same +0.5) and W
the Lo Shu adjacency (edge 1, diagonal 0.5). The Perron eigenvector of the symmetrised supportive
part, by power iteration, marks the plate's energy hub; λ₁/|λ₂| (λ₂ by deflation, valid because the
matrix is symmetric) measures how concentrated it is; Frobenius norms of the supportive and
controlling parts give harmony against conflict. Contracting V with the asker's favourable vector
(+1 favourable, −1 unfavourable) ranks the palaces for that person. The rotation check confirms the
turning plate (转盘) is a pure ring permutation: on every plate tested, all 8 stars and all 8 doors
sit exactly at R^k of their home palaces.

**Markov chains — Qimen (Consult › Forecast › Markov dynamics).** The question is recast for 120
consecutive double-hours. Each verdict is a state (Favourable, Workable, Guarded, Unfavourable),
and the 4 × 4 transition matrix P is estimated from the 119 transitions with Laplace smoothing
(α = 0.5). From P: the stationary distribution (πP = π), n-step probabilities from the present state
(e·Pⁿ for n = 1, 3, 6, 12), the expected first-passage time to Favourable (solving h = 1 + P₀h on the
other three states by Gaussian elimination), the mean stay per state 1/(1−Pᵢᵢ), and the entropy
rate. The engine is deterministic, so the chain summarises how the reading moves; it does not claim
the hours are random.

**Graph theory — Bazi (Chart › Bazi › Network topology).** The eight characters are nodes. Edges
are 相生 and 相克 flows weighted by proximity (same pillar or touching 1.0, diagonal 0.6, two apart
0.5, remote 0.25), stem 五合 and clashes, branch 六合, 三合, 六冲, 六害 and 刑. Computed: PageRank on the
generating and combining flow (where qi accumulates), Brandes betweenness with distance = 1/weight
(the bridge character), harmony clusters by union–find on close contact, articulation points of the
close-contact graph, the Day Master's net flow (generated and peers in, minus pressure and drain),
and structural density. Element relations link every pair, so density counts only structural
relations. An SVG network draws the touching flows and every structural relation, with node size
proportional to PageRank.

**Fourier analysis and harmonic oscillators — Bazi and Qimen.** Chart › Forecast transforms 120
years of annual scores from birth (annual 0.618 + luck pillar 0.382); Consult › Forecast transforms
the question's 120 double-hours. The linear trend is removed by least squares first, and the
full-window term is excluded, so slow drift is not reported as a cycle. The four strongest
frequencies — one per spectral neighbourhood, to suppress leakage — become oscillators
A·cos(2πkt/N + φ) with period, amplitude, share of variance (Parseval) and current phase. Their sum
plus the trend is drawn against the actual series, and gives the next harmonic peak and trough.
Bazi and Qimen are built from 10-, 12- and 60-unit cycles, so the spectrum largely recovers those;
what it adds is which cycle dominates and where the present sits in its phase. A low share explained
is itself informative: it means hour-to-hour detail outweighs any rhythm.

Chart colours were checked with a palette validator on the app's dark surface: the score series
(#B8892A) and the harmonic fit (#4F8FC4) pass lightness, chroma, colour-vision-deficiency
separation (ΔE 20.9), normal-vision separation (ΔE 22.5) and contrast. The fit is also dashed, and
every chart has a legend, direct labels, a hover crosshair and a data-table view.

All three results feed the AI prompts: the Qimen forecast gains a "dynamics" section, the Bazi
forecast a "harmonics" section, and the Chart › Bazi reading a "network" section.

### Second wave: entropy, game theory, non-linear dynamics, fuzzy logic

On Consult › Forecast and Chart › Bazi every quantitative block now sits in one collapsible
**Quantitative analysis** group whose summary line carries the headline figures, so the reading
itself stays uncluttered.

**Shannon entropy — chart clarity.** H = −Σ p log₂ p, normalised by log₂ n, over the plate's
element balance, the distribution of supportive flow and the ten-day verdict mix (Qimen), or the
element shares, the PageRank distribution and the combination/conflict mix (Bazi; the last is left
out when a chart has neither, since it is undefined rather than clear). Raw entropy of five
near-equal shares sits near 1 for most charts, so it is reported as a **percentile** against a
reference population: 3,000 Bazi charts and 400 Qimen casts, generated reproducibly by
`tools/calibrate-entropy.js` (seed 20261018) and embedded as quantile tables in `mathlab.js`.

**Game theory — host against guest.** Qimen's 主 (earth plate, the side that holds) and 客 (heaven
plate, the side that moves first) define a 3 × 3 zero-sum game over Attack, Hold and Maneuver. Its
inputs come from the cast: the seat advantage a (element relation of the two palaces plus net
support, void penalties), the guest-over-host tilt t (heaven-plate strength of stems and stars minus
earth-plate strength of stems and doors), the host's rest advantage ½ (主逸客劳), the value of
striking a side in transit ½ (半渡而击), and each side's gain from moving to a better palace. The
table is antisymmetric under swapping sides. The mixed Nash equilibrium is found by fictitious
play — checked by indifference, and on rock-paper-scissors it returns ⅓ each at value 0 — along
with any pure saddle point, the maximin move and the best response to each move. A negative game
value is presented as damage limitation, with postponement as the better option.

**Non-linear dynamics — sensitivity and tipping points.** Fitting Lorenz equations to chart scores
would be decoration: the chart has no differential equations for them to describe. What applies is
measured instead. The engine is a discrete map of time, so its butterfly effect sits at boundaries.
For Qimen: the largest Lyapunov exponent by Rosenstein's method on a delay embedding (0 on a
periodic signal, 0.65 on the logistic map at r = 3.99, against a true ln 2 ≈ 0.69), the next step's
jump against the typical one, hours to the next solar term (where the whole plate re-casts),
bifurcations (single-step jumps of two or more verdict bands) and regimes by binary segmentation of
the mean. For Bazi: the chart recomputed with the birth time shifted by up to two hours either way,
flagging any shift that flips a pillar, the strength verdict or the favourable elements, plus the
distance to the hour, month (節) and day boundaries and the luck-pillar start's sensitivity
(about 5 days per hour of error).

**Fuzzy logic — graduated seasonal strength.** Each element has a trapezoidal membership over solar
longitude (Wood 315°–27°, Fire 45°–117°, Metal 135°–207°, Water 225°–297°, Earth the four 18°
土用 windows before each 立), softened over 8° at every boundary and summing to 1 everywhere.
旺相休囚死 become degrees and strength their weighted mean. Effective interactions use the product
t-norm: a controls b with force s_a·(1 − s_b). Chart › Bazi charts the Day Master's fuzzy strength
through the year against the crisp month-branch model; the fuzzy model cross-fades where the crisp
one jumps, and it limits Earth to the classical 土用 days rather than the whole 辰戌丑未 month.

### The same four frameworks on Zi Wei and San Cai

Each is mapped onto what the system actually decides, not copied from Qimen.

**Zi Wei (Chart › Zi Wei › Quantitative analysis).**
- *Game theory* — this flow year's Life-palace field against its 交友 field (friends, rivals,
  subordinates). Initiative comes from where the year's 化权 and 化忌 fall; Maneuver is valued by each
  side's 迁移 (movement) palace; the seat advantage is the difference of the two fields' scores. The
  payoff table and solver are shared with Qimen (`buildGame`).
- *Entropy* — how evenly the board's weight spreads across the twelve palaces, the mix of brightness
  grades and 吉 against 煞, ranked against 3,000 reference boards (now part of
  `tools/calibrate-entropy.js`).
- *Fuzzy logic* — the 大限 handover as a two-year cross-fade rather than a switch on a birthday,
  charted against the crisp step, with a flag when the person is inside a handover.
- *Non-linear dynamics* — the board recomputed with the birth time shifted up to two hours either way.
  The hour picks the Life palace, so Zi Wei is far more fragile than Bazi; a shift can move the Life
  palace, the 局, 紫微 and the Body palace. Life chapters come from binary segmentation of a five-year
  moving average of the 120-year flow-year series, with a Lyapunov exponent of that series.

**San Cai (each mandate's full sheet › Quantitative analysis).**
- *Game theory* — in a meeting the counterpart sits facing you, so their palace is the one opposite
  your facing palace on the same hour plate; the Qimen game is then solved across the table.
- *Fuzzy logic* — each layer maps to membership in "aligned" (40 → 70), combined by the minimum
  (Gödel t-norm) and the product. San Cai's premise is that all three layers agree, so the weakest
  layer should cap the result; the crisp composite is a weighted average that lets a strong layer
  mask a weak one, and the sheet says so when it does.
- *Entropy* — how decisive the window is: a Boltzmann distribution (τ = 4 points) over the top 20
  candidates, its normalised entropy, and the lead over the runner-up.
- *Non-linear dynamics* — what a one-double-hour slip costs, a Lyapunov exponent over 60 double-hours
  of the goal's Man layer, bifurcations, and whether a 節 near the window changes the monthly flying
  star and with it the best sector.

Both feed the AI: the Zi Wei forecast gains "stance" and "uncertainty" sections, and the San Cai
briefing gains "across the table" and "alignment, decisiveness and slippage".

### Matrix, graph, Markov and Fourier on Zi Wei and San Cai

**Zi Wei.**
- *Flying-star tensor and network* (宫干飞化). Each palace's stem flies its 禄, 权, 科 and 忌 to the
  palaces holding those stars — a rank-3 tensor T[source][target][transformation] (12 × 12 × 4).
  Contracting the transformation mode (禄 +3, 权 +2, 科 +1.5, 忌 −3) gives a 12 × 12 flow matrix whose
  column sums are each palace's net inflow; eigenvector centrality of the symmetrised supportive part
  gives the concentration λ₁/|λ₂|. The same flows as a directed graph give PageRank on 禄权科 (where
  support pools), the obstruction sink, betweenness, 自化 and 互化, and the 忌转忌 chain traced from
  the Life palace until it repeats. A circular diagram draws all 48 flows.
- *Markov chain* over the 120-year flow-year series (Flourishing, Supported, Mixed, Strained),
  estimated over the whole life and anchored on this year.
- *Fourier* over the same series. The flow-year Life palace rotates through twelve palaces and the
  四化 follow the ten stems, so 12- and 10-year cycles are built in; a strong 2-year term is the yin–yang
  alternation of the year stems.

**San Cai.**
- *Principal components.* The top 60 candidate windows form an n × 3 matrix of Heaven, Earth and Man
  scores; its covariance is eigendecomposed by power iteration with deflation. The first component
  names the layer that actually decides between windows, correlations expose trade-offs, and a layer
  with no variance (often Earth within one month) is reported as unable to change the ranking.
- *Campaign path.* Candidate windows are nodes of a time-ordered DAG with an edge wherever the next
  window falls 1–7 days later; dynamic programming finds the longest three-node path — the best
  opening, follow-up and close as a sequence.
- *Markov chain and Fourier* over the goal's Man layer for 120 double-hours from the window
  (Strong, Workable, Marginal, Weak).

## The prompt framework behind every AI reading

All twenty AI prompts pass through one framework in `www/js/ai.js`, applied centrally inside
`call()` so the readings cannot drift apart:

1. **Persona / role constraint.** Each reading has a role — quantitative strategist, risk assessor,
   tactical planner, statistician or knowledge analyst — and an explicit instruction that it is not
   a fortune teller: no destiny language, no guarantees, every recommendation actionable and
   falsifiable. The prompt's own domain role ("a master Bazi analyst") is kept, beneath the persona.
2. **Data anchor.** Use only the coordinates supplied — stems, branches, palaces, stars, doors,
   scores, percentiles, payoffs — cite them, and write "not in the data" rather than invent.
3. **Logic filter.** Conflicting signals (clash against combination, host against guest, an
   auspicious against a hostile structure, the anchor reading against a projection) go into a signed
   ledger: weight = strength × position × timing, summed to a net that decides.
4. **Output schema.** Every structured reading also returns an `actionPlan` of Action / Window /
   Risk / Contingency items and the `conflicts` ledger. They are added to the JSON schema sent to the
   model and rendered as cards above each reading.

| Reading | Default persona |
|---|---|
| Almanac · Day, Consult · San Cai, Search and Strategy, Manifest, Plan a task | Tactical planner |
| Chart · Bazi, Elements, Forecast, Qimen Destiny, Zi Wei, Consult · Forecast, Qimen, Yijing | Quantitative strategist |
| Chart · Relations, Feng Shui and the plan audit | Risk assessor |
| Numbers | Statistician |
| Learn, reading a floor plan | Knowledge analyst (extraction — no plan added) |

**Profile › AI prompts** lists all twenty. For each, choose the persona, switch the structured
output on or off, and add your own refinement; a refinement for every reading sits above them, and
**Preview the frame** shows exactly what will be sent. A signature of each prompt's version and
settings is part of the narrative cache key, so a changed prompt regenerates instead of serving a
reading written under the old one.

Consult › Qimen (cast chart) now has an AI reading of its own — the only analysis screen that lacked
one — fed with the plate, its formations and the plate tensor.

## The method trial (Numbers › Method trial)

Four methods proposed for narrowing 4D and TOTO are implemented faithfully in `www/js/drawmethods.js`
and replayed against the archive with the existing prediction-versus-actual ledger:

| Method | System | What it does |
|---|---|---|
| Bayesian + Monte Carlo | Bazi + Zi Wei | Uniform prior over digits updated by the draw moment's elements, the Day Master and the day's 化禄 palace; 4,000 (4D) or 1,500 (TOTO) simulated tickets, most frequent kept |
| Residues + CRT | San Cai | Heaven (day pillar), Earth (chief star's palace), Man (Day Master) as residues; the Chinese Remainder Theorem indexes the restricted subset |
| Persistent homology | Qimen | Palaces as a point cloud; H₀ bars of the hour and day plates; palaces persistent across both scales supply the digits |
| MDP + value iteration | Qimen + archive | Digit transitions learned from earlier draws only, rewarded by the draw plate's elements |

The trial compares each with the exact chance rate (hypergeometric for TOTO, 23-of-10,000 for 4D),
uses the exact binomial p-value (4D expects only about three hits in 300 draws, where a z-score is
unreliable), and applies a Bonferroni correction across the ten tests. Any result with nominal
p < 0.05 is then replayed automatically on older draws it was not scored on. The pattern-tracking
method only ever sees draws before the one it is predicting.

On the real archive (3,001 TOTO and 5,508 4D draws) every method was at chance after correction, both
before and after the version 9 engine fix. The closest call — Bayesian + Monte Carlo on TOTO, 18 hits in 289 draws against 8.9 expected, p 0.006 —
fell to 29 hits in 877 older draws (3.31% against 3.10% chance, p 0.70) when replicated: a streak,
which ten tests on a fair draw will produce. The screen frames the methods as entertainment and
explains why each cannot change the odds.

## Saved records

Every Consult screen and the Numbers screen has a save button. Records are scoped to the signed-in
profile, hold the full chart snapshot rather than a summary, and keep any AI narrative generated for
them. They are browsable and filterable by type under **Profile › Saved records**, and the whole set
can be exported as JSON.

## Keeping the draw archive current

A WebView cannot execute Python, and Singapore Pools sends no CORS header, so the phone can neither
run the scraper nor read the site. Automation therefore runs one step back, in CI:

`.github/workflows/update-draws.yml` runs `tools/sp_scraper.py` on the draw schedule (Mon, Wed,
Thu, Sat, Sun at 23:30 SGT), merges only new draws into `data/`, and commits them. GitHub then
serves that folder with `access-control-allow-origin: *`, which the app can read.

The app **syncs itself on launch**. If the archive is more than 20 hours old it fetches in the
background — your fork's `data/` folder first if `setOwnRepo()` has been pointed at it, then the
community dataset. Failures are silent, because a stale archive is not worth an error banner on
startup.

The workflow fails loudly rather than committing a header-only file over good data, so a layout
change on the source site surfaces as a red build instead of silent data loss.

## Prediction versus actual

The Numbers analysis replays the app's own derivation against every stored draw and sets it beside
the baseline that pure chance produces.

For Toto the baseline is hypergeometric — 7 numbers chosen against 6 drawn from 49 gives an
expected 0.857 matches per draw and a 3.10% chance of matching three or more. Over 289 replayed
draws the app achieved 4.15%, a z-score of **1.04**. For 4D, 4 sets against 23 prize numbers gives
a 0.92% baseline; observed 0.33%, z of **−1.06**.

Both are **indistinguishable from chance**, which is the correct and expected result. The observed
match distribution (0 matched in 107 draws, 1 in 117, 2 in 53, 3 in 12) gives a mean of 0.896
against the theoretical 0.857 — almost exactly what the mathematics predicts.

This ledger is the honest answer to "can it predict?", and it is more useful than a fabricated tip.
The AI prompt receives the full ledger and is explicitly instructed not to invent predicted numbers
and not to claim frequency analysis improves odds. Anything between roughly −2 and +2 on the
z-score is what random variation produces on its own.

## The draw archive

The Numbers screen has three tabs: today's chart-derived numbers, a **Past results** archive, and an
**Analysis** view.

### Where the data comes from

**Full history — downloaded in-app.** The community dataset at
[Singapore-Pools-Dataset](https://github.com/foooooooooooooooooooooooooootw/Singapore-Pools-Dataset)
logs every prize-winning 4D and TOTO number since 31 May 1986. `raw.githubusercontent.com` sends
`access-control-allow-origin: *`, so the app fetches it directly — no proxy, no pasting. Verified
against the live files: **5,508 4D draws** (126,418 prize numbers, 1986-05-31 to 2026-07-12) and
**3,001 TOTO draws** (1997-07-03 to 2026-07-13), parsed in about half a second and stored in ~1 MB.

The dataset carries two known upstream defects, both handled: 193 TOTO rows dated year `0001` and
5 rows of `NaN`. These are dropped rather than imported as garbage — 3199 − 193 − 5 = 3001, which
is exactly what the parser yields.

**Latest draws — the Python scraper.** `tools/sp_scraper.py` fetches from the official pages:

```bash
pip install requests beautifulsoup4 pandas lxml
python tools/sp_scraper.py --game both --last 20
python tools/sp_scraper.py --game 4d --merge 4d_prizes.csv   # append only new draws
```

It writes CSV in the dataset's own schema (`draw_number,number,date`), so its output imports
straight into the app and can also be committed to a fork of the dataset repo. Draw selection uses
the site's `?sppl=` parameter, which is base64 of `DrawNumber=<n>`. There is a 1.5 s delay between
requests; leave it in place.

**Why the scraper is a separate script rather than a button in the app:** singaporepools.com.sg
sends no `Access-Control-Allow-Origin` header, so no browser or WebView may read it. That is their
server's policy and no client-side change can work around it. The script runs outside the browser,
where the restriction does not apply. The app says exactly this rather than failing vaguely.

### Analysis, and one thing it gets right that most tools get wrong

**Singapore TOTO changed from 6-from-45 to 6-from-49 in October 2014.** Pooling both periods
compares 49 numbers against a uniform expectation when four of them did not exist for two thirds of
the archive. Doing so gives a chi-square of **594 on 48 df** — which would tell a user the draw looks
rigged. It is not; it is an artifact.

The app detects the boundary from the data rather than hard-coding it, analyses each format
separately, and defaults to the current one. Analysed correctly, both eras pass:

| Format | Draws | Chi-square | 5% threshold | Verdict |
|---|---|---|---|---|
| 6 from 49 (Oct 2014 onward) | 1,205 | 38.2 on 48 df | 65.2 | consistent with a fair draw |
| 6 from 45 (to Oct 2014) | 1,796 | 52.9 on 44 df | 60.5 | consistent with a fair draw |

The view also backtests the app's own chart-derived numbers against the archive and reports the hit
rate plainly.

**What the app will not do is tell you this improves your odds.** Draws are independent; a number
seen 176 times and one seen 119 times have exactly the same chance next time. The only real
consequence of number choice is prize *sharing* — popular combinations get split more often. That is
stated on screen and written into the AI prompt so the narrative cannot drift into encouraging the
gambler's fallacy.

## Accuracy

The calendrical core is computed, not tabulated, and was verified against published values:

| Check | Result |
|---|---|
| Solar terms | Within about 6 minutes of published times (Meeus solar longitude) |
| Lunar new year 2023–2026 | All exact |
| Leap months | 2023 闰二月 from 22 Mar, 2025 闰六月 from 25 Jul — both exact |
| Day pillar | 2000-01-01 = 戊午, matching the standard reference |
| Four pillars | 2000-01-01 noon = 己卯 丙子 戊午 戊午 |
| Year boundary | Rolls at Lichun to the minute, not 1 January |
| Qimen | 1,460 consecutive charts, all eight gates placed correctly |
| Qimen Ju table | Matches the web application's table for all 24 solar terms |
| Formations | 133 detectors run clean over 400 randomised charts |
| Mansion anchor | Satisfies the seven-luminary weekday rule on 700/700 days |
| Forecasting | 152 casts across all 19 scenarios, all producing findings |
| Search | 25 randomised criteria sets, zero criteria violations in any hit |
| Manifestation | 64 palace-and-hour combinations, all producing a complete script |

Timezone is taken from the device, so solar term and lunar month boundaries land on the correct
civil day wherever you are.

Conventions used, since traditions differ:

- The day pillar changes at midnight. 23:00–23:59 is the Late Rat hour: still today's day, with the next day's Zi stem.
- Qimen uses the 拆補 yuan method with a rotating (轉盤) plate.
- Zi Wei uses lunar month and day, so an accurate birth hour matters for the chart.
- Luck pillars use the three-days-to-one-year rule.

### Known limits

- The 28-mansion cycle is anchored to 2000-01-01 = 氐. This satisfies the seven-luminary weekday
  constraint, but almanacs differ on the epoch. If yours disagrees, change `XIU_ANCHOR` in
  `www/js/core.js`.
- The Gemini-written narrative analysis from the web app is not included; the app runs offline.
- Solar term times are accurate to minutes, not seconds. A birth within a minute or two of a
  term boundary should be checked against a specialist ephemeris.
- Zi Wei places the fourteen major stars and the twelve palaces. The minor stars and the four
  transformations (四化) are not implemented.
- Day master strength uses a transparent weighted seasonal model. It is a reasonable
  approximation, not a substitute for a practitioner's reading.

---

## Accounts and privacy

Profiles live in `localStorage` on the device. Nothing is uploaded and there is no server. The
PIN is hashed only to stop a casual glance at stored data — it is not cryptographic protection,
and a forgotten PIN cannot be recovered.

---

## Source layout

```
www/
  index.html
  css/app.css
  js/astro.js      Julian day, solar longitude, 24 terms, new moons, lunisolar calendar
  js/core.js       Ganzhi, four pillars, ten gods, day officers, mansions, duty spirits
  js/systems.js    Bazi analysis, Zi Wei, Qimen, Yijing, flying stars, date selection
  js/guidance.js   Five-horizon synthesis and the number module
  js/qpdata.js     Formation library and almanac tables ported from the web app
  js/bazi.js       Di Tian Sui frame, 調候 table, relations, 神煞, domain analysis
  js/qmdj.js       Yong Shen forecasting, formation search, manifestation planner
  js/sancai.js     San Cai orchestration: Heaven, Earth and Man cross-referenced
  js/draws.js      Draw archive: GitHub dataset fetch, CSV import, era-aware analysis
  js/records.js    Per-profile saved records
  js/library.js    Knowledge library: storage, retrieval, prompt injection
  js/fengshui.js   Periods, 24 mountains, natal charts, afflictions, plan geometry
  js/property.js   Saved buildings and floor plans
tools/
  sp_scraper.py    Singapore Pools scraper -> CSV in the dataset schema
  setup-sdk.js     Writes android/local.properties for command-line builds
  make_icons.py    Generates launcher icons, splash screens and the banner logo
  js/ai.js         Gemini and Claude clients, prompt builders, output schemas
  js/app.js        Profiles, routing, rendering
android/           Native project generated by Capacitor
```

---

## A note on what this is

These are traditional interpretive systems with a long history. The app implements them faithfully
and states its reasoning openly, but it does not treat their output as fact about the future. Use
it the way the traditions were used — as a structured prompt for deciding when to push and when to
wait — and keep your own judgement in front of it. Nothing here is medical, legal or financial
advice.
