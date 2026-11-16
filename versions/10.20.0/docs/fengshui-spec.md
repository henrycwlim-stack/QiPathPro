# Feng Shui module — functional specification

**QiPath Pro · proposal for review**

---

## 1. Where the module stands today

The app already computes three things:

| Capability | Where | Status |
|---|---|---|
| Annual flying star (年星) | `systems.js → annualStar()` | Working, verified 2024=3, 2025=2, 2026=1 |
| Monthly flying star (月星) | `systems.js → monthStar()` | Working |
| Nine-palace star grid | `systems.js → flyingStars()` | Working, Luoshu order |
| Eight Mansions (八宅) | `systems.js → eightMansions()` | Working, Gua verified against 1984 M=7 / F=8 |

These are consumed by **Chart › Feng Shui** and by the **San Cai** engine, which uses the star grid
to choose which sector of a building to occupy.

**What is missing is the part that makes Feng Shui a building discipline rather than a calendar
one.** There is currently no concept of a *property* — no facing direction, no construction period,
no natal chart. Every reading is therefore generic to the year rather than specific to a place. This
specification addresses that.

---

## 2. Scope

**In scope**

1. Three Cycles and Nine Periods (三元九運), with Period 9 as the current era
2. The 24 Mountains (二十四山) as a data layer and as an on-screen compass
3. A device-magnetometer compass for taking a facing reading on site
4. Xuan Kong Flying Star natal charts (玄空飛星宅盤) for a saved property
5. Floor plan import, orientation to true north, sector overlay and plan reading
6. Annual and monthly star overlays onto the natal chart
7. Annual afflictions: Tai Sui, Three Killings, Year Breaker, Five Yellow
8. Room-by-room placement advice combining natal, annual, affliction and personal layers
9. Remedies (化解) by element, with the honest caveats
10. Saved properties as profile records, and AI readings that use the knowledge library

**Out of scope for this phase**

- Form school (巒頭) — landform, water placement, external sha. Requires site imagery and
  judgement the app cannot make from numbers.
- Xuan Kong Da Gua (玄空大卦) 64-hexagram methods
- Date selection for renovation, which the Almanac and San Cai modules already cover

---

## 3. Data model

### 3.1 Periods

Each period runs 20 years, changing at Lichun.

| Period | From | To | Trigram | Element |
|---|---|---|---|---|
| 7 | 4 Feb 1984 | 3 Feb 2004 | 兌 Dui | Metal |
| 8 | 4 Feb 2004 | 3 Feb 2024 | 艮 Gen | Earth |
| **9** | **4 Feb 2024** | **3 Feb 2044** | **離 Li** | **Fire** |
| 1 | 4 Feb 2044 | 3 Feb 2064 | 坎 Kan | Water |

The period boundary must be computed from the actual Lichun moment, which the astronomy engine
already provides to the minute — not from 1 January. A building completed on 20 January 2024
belongs to Period 8, not 9.

### 3.2 The 24 Mountains

Twenty-four sectors of 15° each, three per trigram palace. Each carries a palace, a *yuan* rank
(地元 / 天元 / 人元) and a yin–yang polarity that determines the direction of star flight.

```
Palace   Yuan 0 (地)      Yuan 1 (天)      Yuan 2 (人)
坎 N     壬 337.5° yang   子 352.5° yin    癸   7.5° yin
艮 NE    丑  22.5° yin    艮  37.5° yang   寅  52.5° yang
震 E     甲  67.5° yang   卯  82.5° yin    乙  97.5° yin
巽 SE    辰 112.5° yin    巽 127.5° yang   巳 142.5° yang
離 S     丙 157.5° yang   午 172.5° yin    丁 187.5° yin
坤 SW    未 202.5° yin    坤 217.5° yang   申 232.5° yang
兌 W     庚 247.5° yang   酉 262.5° yin    辛 277.5° yin
乾 NW    戌 292.5° yin    乾 307.5° yang   亥 322.5° yang
```

Degrees given are the **start** of each 15° sector. 子 spans 352.5°–7.5°, straddling north.

**The lookup is an off-by-one trap.** The table begins at 壬 = 337.5°, not at 0°, so the index is

```js
index = Math.floor(((degrees + 22.5) % 360) / 15)
```

Using `+7.5` — the obvious guess — puts every reading one mountain out and therefore every natal
chart wrong, silently. I made exactly that error while prototyping and caught it only by testing
the boundaries. Acceptance must include the 0°/352.5°/7.5° wrap explicitly, since that is where the
error hides.

### 3.3 Property

```
Property {
  id, name, type: home | office | shop,
  period: 1..9,                 // derived from completion date, Lichun-adjusted
  completionDate,
  facingDegrees: 0..360,        // measured or entered
  facingMountain,               // derived
  sittingMountain,              // derived, opposite
  natal: { periodGrid, mountainStars, waterStars },
  rooms: [ { name, sector } ],
  createdAt
}
```

Multiple properties per profile. One marked primary.

---

## 4. The Period 9 compass

### 4.1 Purpose

Taking a facing direction is the single measurement on which the whole natal chart depends. A 15°
error moves the facing into an adjacent mountain and can change the chart entirely, so the compass
must make precision and its absence both visible.

### 4.2 Display

A luopan-style dial reusing the app's existing lacquer-and-cinnabar palette and the eight-trigram
geometry already drawn in the launcher icon:

- **Outer ring** — 24 mountains with their Chinese characters and degree marks
- **Second ring** — eight trigrams with the Period 9 star of each sector
- **Third ring** — the current annual stars, so afflicted sectors are visible while standing in them
- **Centre** — live heading in degrees, the mountain it falls in, and the sector's boundary distance

The current mountain is marked in cinnabar. The three **affliction arcs** for the current year are
drawn as red bands on the outer ring.

### 4.3 Device heading

Uses `DeviceOrientationEvent`. Implementation notes that will otherwise cost a day each:

- Android reads `deviceorientationabsolute` and takes `360 - alpha`; iOS reads `webkitCompassHeading`
  directly and does **not** need the inversion.
- iOS 13+ requires `DeviceOrientationEvent.requestPermission()` from inside a user gesture. The
  button must call it directly, not from a promise chain.
- Requires a secure context. The Capacitor WebView runs on `https://` so this is satisfied;
  opening `index.html` from `file://` will not work, and the screen should say so rather than
  showing a frozen needle.
- **Magnetic versus true north.** Singapore's declination is about 0.2°E — negligible. The spec
  nonetheless stores the raw magnetic reading and a declination field, because a user in, say,
  Seattle (15°E) would otherwise be a full mountain out.

### 4.4 Reliability, stated to the user

A phone magnetometer is not a luopan. Steel, reinforced concrete, speakers and laptops all deflect
it. The screen must:

- show a **calibration state** and prompt the figure-eight motion when the reading is unstable
- display the **variance over the last 2 seconds**; above ±3° it warns rather than reporting a
  confident number
- offer **manual entry** with equal prominence, for a user with a real compass
- warn when the heading sits within 2° of a mountain boundary, since that is precisely where a
  small error changes the chart

> Recommended wording: *"A phone compass is good to a few degrees at best, and metal nearby makes it
> worse. Within 2° of a boundary, take the reading again from a doorway and away from the building
> frame — or enter a figure from a proper compass."*

---

## 5. Flying Star natal chart (玄空飛星)

### 5.1 Algorithm

This has been prototyped and validated (§9). The procedure:

1. The **period star** goes to the centre and flies forward through the Luoshu path
   中 → 乾 → 兌 → 艮 → 離 → 坎 → 坤 → 震 → 巽.
2. The star landing in the **facing palace** is the base **water star** (向星).
   The star in the **sitting palace** is the base **mountain star** (山星).
3. Each base star's flight direction is set by polarity: look up the mountain in the palace
   matching that star number, at the **same yuan rank** as the facing mountain. Yang flies
   forward, yin flies reverse.
4. Fly each base star from the centre in its own direction.

### 5.2 Chart classification

| Condition | Name | Reading |
|---|---|---|
| Mountain period-star at sitting **and** water period-star at facing | 旺山旺向 | Best case: people and money both supported |
| Both at facing | 雙星到向 | Money supported, relationships and health need help at the back |
| Both at sitting | 雙星到坐 | People supported, money needs activation at the front |
| Mountain at facing and water at sitting | 上山下水 | Reversed; needs the strongest correction |

### 5.3 The Period 9 finding

Enumerating all 24 facings per period produced this:

| Period | 旺山旺向 | 上山下水 | 雙星到向 | 雙星到坐 |
|---|---|---|---|---|
| 2, 3, 4, 6, 7, **8** | 6 | 6 | 6 | 6 |
| 5 | 12 | 12 | 0 | 0 |
| 1 | 0 | 0 | 12 | 12 |
| **9** | **0** | **0** | **12** | **12** |

Period 8's perfect 6/6/6/6 is the textbook distribution, which is what validates the implementation.

**Period 9 admits no 旺山旺向 chart at all.** Every building facing is either double-star-to-facing
or double-star-to-sitting. The reason is structural: with 9 in the centre, the base water and
mountain stars are always complementary palaces summing to 9, and complementary palaces always carry
opposite polarity at the same yuan rank — so the two stars can never both fly reverse, which is what
旺山旺向 requires.

This is not a curiosity. It changes practice for the next twenty years: **the module must not tell
users to look for a 旺山旺向 property, because none exists in this period.** The advice instead
becomes which of the two double-star types suits the occupant's priority, and how to correct the
half the chart does not serve.

I checked whether this depends on the handling of star 5, where schools differ. Of four conventions
tested, the two that reproduce Period 8's known 6/6/6/6 both produce the Period 9 result; the two
that change it also break Period 8, which is good evidence they are wrong. **The star-5 convention
should nonetheless be a setting**, defaulting to "borrows the period star's palace", because a user
trained differently should be able to match their own teacher.

### 5.4 Star combinations

Each palace holds a mountain–water pair. The 81 combinations carry classical readings — 1-4 for
scholarship, 4-1 likewise, 2-5 for serious illness, 3-7 for robbery and litigation, 6-8 and 8-6 for
wealth. These are a data table of the same kind as the 133 Qimen formations already shipped, and
should be structured identically so the library and AI layers reach them the same way.

---

## 5A. Floor plan import and orientation

A flying star chart names nine sectors. Without a plan, the user has to translate "north-east
sector" into "the corner with the spare room" by themselves, and most get it wrong — they pace it
from the wrong centre, or judge north from the street rather than a compass. Importing the plan
removes that translation step, and is the difference between a chart that is read and a chart that
is used.

### 5A.1 Import

| Source | Handling |
|---|---|
| Photo of a printed plan | Camera or gallery; perspective correction offered (see 5A.6) |
| Image file (PNG/JPG/WebP) | Direct |
| PDF page | First page rasterised at 2000px on the long edge |
| Hand sketch | Accepted; the app does not require draughting quality |

Stored per property, on the device, at a capped resolution. A plan is private architectural
information and never leaves the device except when the user explicitly asks for an AI reading.

### 5A.2 Establishing orientation — the critical step

A floor plan carries no reliable north. The printed north arrow is often decorative, frequently
approximate, and sometimes simply wrong. The app must therefore derive orientation from a
measurement the user takes, not from the drawing.

**The flow:**

1. The user draws a line on the plan along a **reference edge** — normally the facing wall or the
   main door's plane.
2. The user supplies the true bearing of that edge, either from the compass screen (§4) while
   standing at it, or typed from a real compass.
3. The app computes `planNorth` — the true bearing that the image's "up" direction corresponds to —
   and every subsequent sector calculation follows from it.

This keeps one measurement as the single source of truth, and makes it correctable: change the
bearing and the whole overlay rotates, with no need to re-import.

**Display options**, both driven by the same `planNorth`:

- **Rotate the plan** so true north is up. Familiar to practitioners, but text on the plan ends up
  sideways.
- **Rotate the ring** and leave the plan as drawn. Easier to read the room labels.

Default to rotating the ring, offer both, and show the numeric `planNorth` at all times so the user
can see what the app believes.

### 5A.3 The centre (天心)

Sectors radiate from a centre point, and the choice of centre moves every boundary.

1. The user traces the **building outline** as a polygon — tap corners, drag to adjust.
2. The app computes the **area centroid** of that polygon and proposes it as the centre.
3. The user may drag the centre if their school uses a different rule.

For an L-shaped or irregular plan the centroid can fall outside the built area. That is not an
error, and is itself meaningful — the app should say so rather than silently snapping the point
inside the walls.

**Exclusions.** Balconies, bay windows and open car porches are conventionally excluded from the
outline; garages and enclosed extensions are usually included. Schools differ. The outline tool
therefore supports marking a traced region as *excluded*, and the app states which convention it
applied.

### 5A.4 Two geometries, for two different jobs

This distinction caused a real error while prototyping and must be explicit in the build.

**Star sectors use pie wedges.** Each of the 24 mountains is a 15° wedge radiating from the centre;
each of the nine palaces is a 45° wedge. A point's sector is found from its bearing:

```js
dx = px - cx;  dy = -(py - cy);                       // image y grows downward
bearing = normalise(atan2(dx, dy) * 180/PI + planNorth);
mountainIndex = floor(((bearing + 22.5) % 360) / 15);  // the +22.5 of §3.2
```

Verified: with the plan drawn north-up, a point directly above the centre returns 子 N, to the right
卯 E, below 午 S, left 酉 W, upper-right 艮 NE. With `planNorth = 90°`, image-up correctly returns
East and the rest follow.

**Missing corners use the 3×3 grid.** Shape deficiency (缺角) is classically judged on the 九宮格 —
a three-by-three grid over the building's bounding rectangle — not on pie wedges. Using wedges here
produces nonsense: a *perfect rectangle* scores 51–76% per sector under wedge sampling, purely
because a circle does not fit a square. That is square-versus-circle geometry, not a missing corner,
and shipping it would have flagged every rectangular flat as defective.

Under the grid method a full rectangle correctly reads 100% in all nine cells. An L-shape with the
north-east quadrant removed reads:

```
NW 100%   N  88%   NE   0%   <- 缺角, severely missing
W  100%   C  98%   E   88%
SW 100%   S 100%   SE 100%
```

and rotating the same plan by 90° correctly moves the deficiency from NE to SE.

**Thresholds:**

| Coverage | Reading |
|---|---|
| ≥ 90% | Complete |
| 67–89% | Slight recess (凹) — noted, not treated as a defect |
| 34–66% | 缺角 missing corner |
| < 34% | Severely missing |

The palace that is missing determines what the tradition says is affected — a missing NW is read as
the patriarch, a missing SW the matriarch, a missing E the eldest son, and so on. The module reports
this as what the tradition holds, not as a claim about the household.

### 5A.5 Overlay rendering

An SVG layer over the image, with:

- the nine-palace wedges, tinted by that sector's natal star pair
- the 24-mountain ring at the perimeter
- annual stars and affliction arcs togglable independently
- an opacity slider, because an overlay dense enough to be useful obscures the plan underneath
- pinch-zoom and pan, with the overlay transforming with the image

Tapping a wedge opens that sector: natal mountain and water stars, annual and monthly stars,
affliction status, grid coverage, and the rooms the user has assigned to it.

### 5A.6 Reading the plan

Two layers, and they should not be confused with each other.

**Geometric reading — deterministic, on device.** Outline, centroid, sector boundaries, grid
coverage, missing corners. This is arithmetic and is reliable.

**Semantic reading — AI vision, best-effort.** The plan image is sent to Gemini or Claude, which
returns a structured list of what it can identify:

```json
{
  "rooms": [ { "label": "Master bedroom", "approxCentre": [0.62, 0.28],
               "confidence": "high", "features": ["ensuite", "window south wall"] } ],
  "doors":  [ { "type": "main entrance", "approxCentre": [0.50, 0.95] } ],
  "stairs": [ ... ], "wetAreas": [ ... ],
  "unreadable": "The lower-left region is too low-contrast to identify."
}
```

Coordinates are returned normalised to the image, then mapped through the same bearing function to
give each room its sector.

**This layer will be imperfect and the UI must treat it that way.** Vision models misread hand
sketches, mirror-flip symmetrical plans, and invent plausible rooms in blurry regions. Therefore:

- every detected room is **proposed, not applied** — the user confirms, edits or deletes
- each carries its confidence, and low-confidence items are visually distinct
- the model is instructed to report what it cannot read rather than guess, and that text is shown
- a user can skip detection entirely and place rooms by tapping

Wet areas, stairs and the main door are singled out because they matter disproportionately: a toilet
in the wealth sector or a staircase in the centre are among the most common findings in a real
consultation.

### 5A.7 Data model addition

```
FloorPlan {
  propertyId,
  image: { data, width, height },
  planNorth: 0..360,            // true bearing of image-up
  referenceEdge: [[x1,y1],[x2,y2]],
  referenceBearing,             // what the user measured
  outline: [[x,y], ...],
  exclusions: [ [[x,y], ...] ],
  centre: [x,y],  centreAuto: bool,
  rooms: [ { id, label, point, sector, source: 'ai' | 'user', confidence } ],
  features: { doors, stairs, wetAreas, kitchen },
  coverage: { N: 0..100, ... },
  aiReading, aiReadAt
}
```

### 5A.8 Screen flow

```
Import  →  Orient  →  Outline  →  Centre  →  Detect  →  Overlay
 photo     draw the   trace the   confirm    AI rooms   the working
 or file   facing     building    centroid   confirmed  view
           edge +     outline     or drag    by user
           bearing
```

Each step is skippable in favour of manual work, and every step is revisitable without redoing the
others. A user who only wants the overlay can stop after Orient.

### 5A.9 Validation

| Check | Status |
|---|---|
| Bearing from image coordinates, north-up plan | Verified on five cardinal and intercardinal points |
| Same with `planNorth = 90°` | Verified; sectors rotate correctly |
| Grid coverage of a full rectangle | 100% in all nine cells |
| Grid coverage of an L-shape | Missing corner correctly isolated to one palace |
| Rotation of the same L-shape | Deficiency moves NE → SE as expected |

To be added at build time: centroid outside the outline handled without error; exclusion regions
subtracted correctly; overlay alignment held through zoom and pan; AI detection round-tripped on ten
real plans with the error rate recorded honestly.

### 5A.10 Limits worth stating in the UI

- **The bearing is still the weak link.** The plan does not improve the compass reading; it only
  makes its consequences visible. A 15° error rotates every sector boundary by 15°.
- **A plan is not a survey.** Marketing floor plans are frequently not to scale and sometimes
  mirror-flipped from the built unit. Where a plan and the user's own pacing disagree, the building
  wins.
- **Multi-storey.** Each floor is its own plan and its own sector map, sharing one facing. The
  centre may differ per floor on an irregular building.
- **AI room detection is a convenience, not a survey instrument.** Nothing derived from it should be
  presented with more confidence than the user's own confirmation gives it.

---

## 6. Annual and monthly overlays

The natal chart is fixed for the life of the building; the annual and monthly stars move over it.
The module must present three layers per sector:

```
Sector NE    natal 8-6    annual 4    monthly 2
```

Interpretation follows the interaction between layers, not any single number. A natal 8 visited by
an annual 9 is strengthened; the same 8 visited by an annual 5 is the year's problem sector.

**Priority rule for the UI:** when annual and natal disagree, the annual star governs timing and the
natal star governs the standing character of the room. Say which is which rather than averaging them
into one score.

---

## 7. Annual afflictions

Four directional afflictions, all derived from the year branch and all already computable from
existing engine data.

| Affliction | Derivation | Effect |
|---|---|---|
| **太歲 Tai Sui** | The year branch's own 15° mountain | Do not disturb: no digging, demolition or heavy renovation facing it |
| **歲破 Year Breaker** | The mountain opposite Tai Sui | Do not sit facing it |
| **三煞 Three Killings** | 90° arc opposite the year branch's triad | Do not disturb; may be faced but not sat against |
| **五黃 Five Yellow** | Sector holding annual star 5 | No renovation; add heavy metal |

These are drawn as arcs on the compass so a user standing on site sees them without leaving the
screen. The distinction between *facing* an affliction and *sitting against* it is the practical
part and must be stated explicitly, since it is the most commonly reversed piece of advice.

---

## 8. Screens

### 8.1 Chart › Feng Shui — restructured

Six segments, replacing the current single view:

| Segment | Contents |
|---|---|
| **Compass** | The luopan, live heading, manual entry, mountain identification |
| **Property** | Saved properties; add or edit facing, period, rooms |
| **Plan** | Import, orient, outline, centre, detect rooms, sector overlay |
| **Natal** | The building's flying star chart, classification, per-sector detail |
| **This year** | Annual and monthly overlay, afflictions, what changed from last year |
| **Personal** | Eight Mansions (existing), intersected with the property's sectors |
| **Placement** | Room-by-room recommendations, ranked |

### 8.2 Compass flow

1. Open → permission prompt if iOS → live heading
2. Stand at the main door facing out; hold flat, away from the door frame
3. Take three readings; the app shows their spread and takes the median
4. Confirm the mountain, or enter a figure manually
5. Enter the completion date → period derived
6. Natal chart computed and saved to the property

### 8.3 Placement output

For each room, combine four layers and produce a ranked recommendation:

```
Study — Northeast sector
  Natal 4-1    scholarship combination, the best room in the house for study
  Annual 6     supportive; authority and mentors
  Personal     one of your four supportive directions (Gua 3 震)
  Affliction   none this year
  → Desk here, facing East. This is the strongest placement in the property.
```

Where the layers conflict, say so rather than producing a single misleading score.

---

## 9. Validation

The algorithm has been prototyped and checked before specifying it:

| Check | Result |
|---|---|
| 子山午向 Period 8 | 雙星到向 — matches the published chart |
| 午山子向 Period 8 | 雙星到坐 — matches |
| Period 8, all 24 facings | 6/6/6/6 — the textbook distribution |
| Period 9, all 24 facings | 12/12, no 旺山旺向 — derived independently and confirmed |
| Star-5 convention sensitivity | Both conventions preserving Period 8 give the same Period 9 result |
| 24-mountain degree mapping | All 17 boundary cases correct; 24 sectors, each exactly 15° |

Acceptance for the build should additionally require:

- Period boundary correct to the Lichun minute across 1984–2044
- 24-mountain degree boundaries correct at every 15° edge, including 子 across 0°
- Natal charts for all 24 facings × 9 periods computed without error
- Compass heading matching a known bearing within 5° on a test device
- Afflictions cross-checked against a published almanac for three consecutive years

---

## 10. AI and knowledge library

The Feng Shui prompts already pull from the knowledge library under the `fengshui` module. This
specification adds:

- The natal chart, classification and per-sector layers into the prompt
- The compass reading and its confidence, so the AI can qualify a reading taken on a poor heading
- Explicit instruction that where a user's own library note conflicts with the built-in rule, the
  note governs and the AI says which rule it applied

A user whose school differs on the star-5 convention, on 三煞 arcs, or on the 81 combinations can
then teach it once and have every subsequent reading follow.

---

## 11. Honest limits

These belong in the UI, not only in this document.

**The compass is the weak link.** Everything downstream depends on a measurement a phone takes
badly. The module should treat a poor heading as a reason to withhold a confident chart, not as
something to average away.

**Form school is absent.** Flying stars describe one layer. A property with a good chart and a road
pointing at the door is not a good property, and the module does not see the road. This should be
stated where a user might otherwise take a chart score as a verdict on a home.

**Periods and schools disagree.** Star 5's polarity, whether to use replacement stars (替卦), and
the 三煞 arc boundaries all vary by lineage. Where the app picks one, it should name the pick.

**No claim about outcomes.** The module reports what the tradition says about a configuration. It
does not predict, and should not be phrased as though the arrangement of a room determines what
happens in a life.

---

## 12. Build sequence

| Phase | Deliverable | Depends on |
|---|---|---|
| 1 | 24 Mountains data layer, period derivation | Existing astronomy engine |
| 2 | Natal chart engine + 81 combinations table | Phase 1 |
| 3 | Compass screen with device heading and manual entry | Phase 1 |
| 4 | Property storage, rooms, records integration | Phase 2 |
| 4b | Floor plan import, orientation, outline, overlay | Phases 1, 3 |
| 4c | Grid coverage, missing corners, AI plan reading | Phase 4b |
| 5 | Annual overlay and afflictions | Phase 2 |
| 6 | Placement engine, San Cai integration | Phases 4, 5 |
| 7 | AI prompts and library wiring | Phase 6 |

Phases 1 and 2 are the substance; the prototype in §9 indicates they are a day's work each against
the existing engines. Phase 3 carries the platform risk.
