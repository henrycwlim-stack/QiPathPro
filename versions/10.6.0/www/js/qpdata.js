function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/* QiPath Pro — domain data ported from the QiPath web application (Base44 build).
 * Formation library, Dong Gong date-selection activities, 28 mansions, and Qimen metadata.
 * Detection logic is reused verbatim; only TypeScript annotations were stripped.
 */
(function (global) {
  'use strict';

  var PRODUCE = {
    wood: "fire",
    fire: "earth",
    earth: "metal",
    metal: "water",
    water: "wood"
  };
  var CONTROL = {
    wood: "earth",
    fire: "metal",
    earth: "water",
    metal: "wood",
    water: "fire"
  };
  var TOMBS = {
    wood: 2,
    fire: 6,
    earth: 4,
    metal: 8,
    water: 4
  };
  var MYSTERY = ["乙", "丙", "丁"];
  // Home (original) palaces of the doors and stars, and each palace's opposite across the centre, for 伏吟 / 反吟.
  var DOOR_HOME = { "休": 1, "死": 2, "伤": 3, "杜": 4, "开": 6, "惊": 7, "生": 8, "景": 9 };
  var STAR_HOME = { "天蓬": 1, "天芮": 2, "天冲": 3, "天辅": 4, "天禽": 5, "天心": 6, "天柱": 7, "天任": 8, "天英": 9 };
  var OPPOSITE = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
  var AUSP_DOORS = ["开", "生", "休"];
  var HOSTILE_DOORS = ["惊", "死", "伤", "杜"];
  var AUSP_STARS = ["天心", "天任", "天辅", "天冲"];
  var HOSTILE_STARS = ["天芮", "天蓬", "天柱", "天英"];
  var pair = function pair(x, h, e) {
    var _x$heavenStem, _x$earthStem;
    return ((_x$heavenStem = x.heavenStem) == null ? void 0 : _x$heavenStem.char) === h && (e ? ((_x$earthStem = x.earthStem) == null ? void 0 : _x$earthStem.char) === e : true);
  };
  var FORMATIONS = [
  // ===== AUSPICIOUS (吉格) =====
  {
    id: "qing_long_hui",
    name: "青龙返首",
    nameEn: "Green Dragon Returns",
    category: "auspicious",
    description: "戊加戊 (甲子戊 returns to its head) — extremely auspicious for initiation, leadership, and launching new ventures. Peak in spring.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "fei_niao_die",
    name: "飞鸟跌穴",
    nameEn: "Flying Bird Falls into Cave",
    category: "auspicious",
    description: "丙奇跌入戊穴 (丙加戊) — the bird returns to its nest; excellent for partnerships, negotiations, and recovery of lost things.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yu_nv_shou",
    name: "玉女守门",
    nameEn: "Jade Maiden Guards the Door",
    category: "auspicious",
    description: "丁奇 sits at the Open Door (开门) palace — supremely auspicious for diplomacy, legal matters, documents, and communications.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door, _x$heavenStem2, _x$earthStem2;
        return ((_x$door = x.door) == null ? void 0 : _x$door.char) === "开" && (((_x$heavenStem2 = x.heavenStem) == null ? void 0 : _x$heavenStem2.char) === "丁" || ((_x$earthStem2 = x.earthStem) == null ? void 0 : _x$earthStem2.char) === "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "san_qi_de_shi",
    name: "三奇得使",
    nameEn: "Three Mysteries Gain Command",
    category: "auspicious",
    description: "A mystery stem (乙丙丁) sits at the Chief Deity (值符) palace — amplifies strategic authority and timing precision.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem3, _x$deity;
        return MYSTERY.includes(((_x$heavenStem3 = x.heavenStem) == null ? void 0 : _x$heavenStem3.char) || "") && ((_x$deity = x.deity) == null ? void 0 : _x$deity.char) === "值符";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "san_qi_sheng_dian",
    name: "三奇升殿",
    nameEn: "Three Mysteries Ascend",
    category: "auspicious",
    description: "A mystery stem sits in a palace whose element produces it — timing precision and opportunity windows open.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem4, _x$heavenStem5;
        return MYSTERY.includes(((_x$heavenStem4 = x.heavenStem) == null ? void 0 : _x$heavenStem4.char) || "") && PRODUCE[x.element] === ((_x$heavenStem5 = x.heavenStem) == null ? void 0 : _x$heavenStem5.element);
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "bing_qi_sheng",
    name: "丙奇升殿",
    nameEn: "Bing Mystery Ascends",
    category: "auspicious",
    description: "丙奇 (Fire) sits in a Wood palace (Wood produces Fire) — authority recognized, illumination, peak visibility.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem6;
        return ((_x$heavenStem6 = x.heavenStem) == null ? void 0 : _x$heavenStem6.char) === "丙" && PRODUCE[x.element] === "fire";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_qi_sheng",
    name: "乙奇升殿",
    nameEn: "Yi Mystery Ascends",
    category: "auspicious",
    description: "乙奇 (Wood) sits in a Water palace (Water produces Wood) — growth, creativity, smooth advancement.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem7;
        return ((_x$heavenStem7 = x.heavenStem) == null ? void 0 : _x$heavenStem7.char) === "乙" && PRODUCE[x.element] === "wood";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ding_qi_sheng",
    name: "丁奇升殿",
    nameEn: "Ding Mystery Ascends",
    category: "auspicious",
    description: "丁奇 (Fire) sits in a Wood palace — hidden brilliance, diplomatic advantage, secret support.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem8;
        return ((_x$heavenStem8 = x.heavenStem) == null ? void 0 : _x$heavenStem8.char) === "丁" && PRODUCE[x.element] === "fire";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "huan_xi",
    name: "欢忻喜悦",
    nameEn: "Joyful Formation",
    category: "auspicious",
    description: "Life Door (生门) with Chief Deity (值符) — brings joy, growth, successful outcomes, and harmonious resolution.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door2, _x$deity2;
        return ((_x$door2 = x.door) == null ? void 0 : _x$door2.char) === "生" && ((_x$deity2 = x.deity) == null ? void 0 : _x$deity2.char) === "值符";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ji_men_dao",
    name: "吉门吉格",
    nameEn: "Auspicious Door Alignment",
    category: "auspicious",
    description: "An auspicious door (开生休) sits in a non-empty palace — smooth execution path, low resistance.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door3;
        return AUSP_DOORS.includes(((_x$door3 = x.door) == null ? void 0 : _x$door3.char) || "") && !x.isEmpty;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zhi_fu_xiang_sheng",
    name: "值符相生",
    nameEn: "Chief Harmonized",
    category: "auspicious",
    description: "Chief Deity (值符, Earth) in a Fire palace (Fire produces Earth) — leadership empowered, authority recognized.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity3;
        return ((_x$deity3 = x.deity) == null ? void 0 : _x$deity3.char) === "值符" && PRODUCE[x.element] === "earth";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zhi_shi_xiang_sheng",
    name: "直使相生",
    nameEn: "Director Door Harmonized",
    category: "auspicious",
    description: "The directing door sits in a palace that produces its element — the human channel is nourished, action flows.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && PRODUCE[x.element] === x.door.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "men_sheng_gong",
    name: "门生宫",
    nameEn: "Door Nourishes Palace",
    category: "auspicious",
    description: "Door element produces palace element — environment supports the action; sustained advantage.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && PRODUCE[x.door.element] === x.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xing_men_xiang_sheng",
    name: "星门相生",
    nameEn: "Star-Door Mutual Generation",
    category: "auspicious",
    description: "Star element and door element generate each other — macro-environment and human dynamics align.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.star && x.door && (PRODUCE[x.star.element] === x.door.element || PRODUCE[x.door.element] === x.star.element);
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ji_men_he_ji_xing",
    name: "吉门合吉星",
    nameEn: "Auspicious Door Meets Auspicious Star",
    category: "auspicious",
    description: "An auspicious door coincides with an auspicious star — doubly reinforced success trajectory.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door4, _x$star;
        return AUSP_DOORS.includes(((_x$door4 = x.door) == null ? void 0 : _x$door4.char) || "") && AUSP_STARS.includes(((_x$star = x.star) == null ? void 0 : _x$star.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tian_xian_shi",
    name: "天显时格",
    nameEn: "Heaven Reveals the Hour",
    category: "auspicious",
    description: "Hour stem matches the day stem (旬首 same) — Heaven displays itself; exceptionally rare and auspicious for major undertakings.",
    detect: function detect(p, meta) {
      var _meta$hourPillar, _meta$dayPillar;
      return (meta == null || (_meta$hourPillar = meta.hourPillar) == null || (_meta$hourPillar = _meta$hourPillar.stem) == null ? void 0 : _meta$hourPillar.char) === (meta == null || (_meta$dayPillar = meta.dayPillar) == null || (_meta$dayPillar = _meta$dayPillar.stem) == null ? void 0 : _meta$dayPillar.char) ? [0] : null;
    }
  }, {
    id: "jiao_tai",
    name: "交泰格",
    nameEn: "Harmonious Convergence",
    category: "auspicious",
    description: "Door produces palace and palace produces star — Heaven, Earth, and Human layers mutually generate; supreme harmony.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && x.star && PRODUCE[x.door.element] === x.element && PRODUCE[x.element] === x.star.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "qi_yi_xiang_he",
    name: "奇仪相合",
    nameEn: "Mystery Meets Six Instrument",
    category: "auspicious",
    description: "A mystery stem (乙丙丁) sits upon a Six-Instrument stem (戊己庚辛壬癸) in a generating relationship — alliances form.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem9, _x$earthStem3, _x$earthStem4, _x$heavenStem0;
        return MYSTERY.includes(((_x$heavenStem9 = x.heavenStem) == null ? void 0 : _x$heavenStem9.char) || "") && ["戊", "己", "庚", "辛", "壬", "癸"].includes(((_x$earthStem3 = x.earthStem) == null ? void 0 : _x$earthStem3.char) || "") && PRODUCE[(_x$earthStem4 = x.earthStem) == null ? void 0 : _x$earthStem4.element] === ((_x$heavenStem0 = x.heavenStem) == null ? void 0 : _x$heavenStem0.element);
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "jiu_tian_tong_ling",
    name: "九天通灵",
    nameEn: "Nine Heaven Spiritual Flow",
    category: "auspicious",
    description: "Nine Heaven deity (九天) with an auspicious door — celestial support, expansive reach, public-facing success.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity4, _x$door5;
        return ((_x$deity4 = x.deity) == null ? void 0 : _x$deity4.char) === "九天" && AUSP_DOORS.includes(((_x$door5 = x.door) == null ? void 0 : _x$door5.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "san_qi_gui_lu",
    name: "三奇贵禄",
    nameEn: "Three Mysteries Noble Prosperity",
    category: "auspicious",
    description: "All three mysteries (乙丙丁) each rest in a palace that produces them — full alignment of opportunity, rare windfall.",
    detect: function detect(p) {
      var ok = MYSTERY.every(function (c) {
        return p.some(function (x) {
          var _x$heavenStem1;
          return ((_x$heavenStem1 = x.heavenStem) == null ? void 0 : _x$heavenStem1.char) === c && PRODUCE[x.element] === x.heavenStem.element;
        });
      });
      return ok ? p.filter(function (x) {
        var _x$heavenStem10;
        return MYSTERY.includes(((_x$heavenStem10 = x.heavenStem) == null ? void 0 : _x$heavenStem10.char) || "");
      }).map(function (x) {
        return x.number;
      }) : null;
    }
  }, {
    id: "bing_jia",
    name: "丙奇加甲",
    nameEn: "Bing Mystery Meets Jia",
    category: "auspicious",
    description: "丙加戊 (甲子戊) — fire illuminates the leader; sudden clarity and recognition from superiors.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_jia",
    name: "乙奇加甲",
    nameEn: "Yi Mystery Meets Jia",
    category: "auspicious",
    description: "乙加戊 — gentle support reaches the leader; favorable for seeking patronage and mentorship.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ding_jia",
    name: "丁奇加甲",
    nameEn: "Ding Mystery Meets Jia",
    category: "auspicious",
    description: "丁加戊 — discreet counsel reaches the leader; favorable for secret negotiations and confidential deals.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丁", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "fei_niao_ru_long",
    name: "飞鸟入笼",
    nameEn: "Bird Enters the Cage",
    category: "auspicious",
    description: "乙加丙 at a Wood/Fire generating palace — safe haven found; recovering lost items and securing refuge.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "丙") && (x.element === "wood" || x.element === "fire");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "san_qi_you_liu_yi",
    name: "三奇游六仪",
    nameEn: "Mysteries Roam the Six Instruments",
    category: "auspicious",
    description: "A mystery stem lands on a Six-Instrument earth stem with no clash — flexible maneuvering room opens.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem11, _x$earthStem5, _x$heavenStem12, _x$earthStem6;
        return MYSTERY.includes(((_x$heavenStem11 = x.heavenStem) == null ? void 0 : _x$heavenStem11.char) || "") && ["戊", "己", "庚", "辛", "壬", "癸"].includes(((_x$earthStem5 = x.earthStem) == null ? void 0 : _x$earthStem5.char) || "") && CONTROL[(_x$heavenStem12 = x.heavenStem) == null ? void 0 : _x$heavenStem12.element] !== ((_x$earthStem6 = x.earthStem) == null ? void 0 : _x$earthStem6.element);
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== NINE ESCAPES (九遁格) — supreme auspicious escapes =====
  {
    id: "tian_dun",
    name: "天遁",
    nameEn: "Heaven Escape",
    category: "auspicious",
    description: "丙加戊 at the Life Door (生门) — Heaven escape; concealment under celestial cover, success in spiritual/upper-realm matters.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door6;
        return pair(x, "丙", "戊") && ((_x$door6 = x.door) == null ? void 0 : _x$door6.char) === "生";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "di_dun",
    name: "地遁",
    nameEn: "Earth Escape",
    category: "auspicious",
    description: "乙加己 at the Open Door (开门) — Earth escape; hidden by the terrain, favorable for concealment and real estate.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door7;
        return pair(x, "乙", "己") && ((_x$door7 = x.door) == null ? void 0 : _x$door7.char) === "开";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_dun",
    name: "人遁",
    nameEn: "Human Escape",
    category: "auspicious",
    description: "丁加戊 at the Rest Door (休门) — Human escape; people provide cover, favorable for travel and evading pursuit.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door8;
        return pair(x, "丁", "戊") && ((_x$door8 = x.door) == null ? void 0 : _x$door8.char) === "休";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "shen_dun",
    name: "神遁",
    nameEn: "Spirit Escape",
    category: "auspicious",
    description: "丙加乙 at the Open Door with Nine Heaven (九天) deity — Spirit escape; divine protection, favorable for worship and prayer.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door9, _x$deity5;
        return pair(x, "丙", "乙") && ((_x$door9 = x.door) == null ? void 0 : _x$door9.char) === "开" && ((_x$deity5 = x.deity) == null ? void 0 : _x$deity5.char) === "九天";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_dun",
    name: "鬼遁",
    nameEn: "Ghost Escape",
    category: "auspicious",
    description: "乙加辛 at the Block Door (杜门) with Nine Earth (九地) — Ghost escape; operating in shadows, favorable for stealth and concealment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door0, _x$deity6;
        return pair(x, "乙", "辛") && ((_x$door0 = x.door) == null ? void 0 : _x$door0.char) === "杜" && ((_x$deity6 = x.deity) == null ? void 0 : _x$deity6.char) === "九地";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "feng_dun",
    name: "风遁",
    nameEn: "Wind Escape",
    category: "auspicious",
    description: "乙加辛 at an auspicious door in a Wood palace (巽4) — Wind escape; swift movement, favorable for dissemination and travel.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door1;
        return pair(x, "乙", "辛") && AUSP_DOORS.includes(((_x$door1 = x.door) == null ? void 0 : _x$door1.char) || "") && x.element === "wood";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yun_dun",
    name: "云遁",
    nameEn: "Cloud Escape",
    category: "auspicious",
    description: "乙加辛 at the Open Door — Cloud escape; obscured by clouds, favorable for ambiguity and strategic concealment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door10;
        return pair(x, "乙", "辛") && ((_x$door10 = x.door) == null ? void 0 : _x$door10.char) === "开";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "long_dun",
    name: "龙遁",
    nameEn: "Dragon Escape",
    category: "auspicious",
    description: "乙加辛 or 乙加癸 at an auspicious door in a Water palace (坎1) — Dragon escape; hidden in depths, favorable for water-related ventures.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door11;
        return (pair(x, "乙", "辛") || pair(x, "乙", "癸")) && AUSP_DOORS.includes(((_x$door11 = x.door) == null ? void 0 : _x$door11.char) || "") && x.element === "water";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "hu_dun",
    name: "虎遁",
    nameEn: "Tiger Escape",
    category: "auspicious",
    description: "乙加辛 at the Life Door (生门) with White Tiger — Tiger escape; fierce protection, favorable for confrontation with backing.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door12, _x$deity7;
        return pair(x, "乙", "辛") && ((_x$door12 = x.door) == null ? void 0 : _x$door12.char) === "生" && ((_x$deity7 = x.deity) == null ? void 0 : _x$deity7.char) === "白虎";
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== SPECIAL / STRATEGIC (杂格) =====
  {
    id: "san_zha",
    name: "三诈格",
    nameEn: "Three Deceptions",
    category: "special",
    description: "Chief Deity (值符) with an auspicious door (开生休) and a mystery stem — favorable for stealth strategy and hidden moves.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity8, _x$door13, _x$heavenStem13;
        return ((_x$deity8 = x.deity) == null ? void 0 : _x$deity8.char) === "值符" && AUSP_DOORS.includes(((_x$door13 = x.door) == null ? void 0 : _x$door13.char) || "") && MYSTERY.includes(((_x$heavenStem13 = x.heavenStem) == null ? void 0 : _x$heavenStem13.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_tian",
    name: "天假",
    nameEn: "Heaven Falsehood",
    category: "special",
    description: "Mystery stem at Scenery Door (景门) with Nine Heaven — borrowed heavenly authority; favorable for public proclamation and prestige.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door14, _x$deity9, _x$heavenStem14;
        return ((_x$door14 = x.door) == null ? void 0 : _x$door14.char) === "景" && ((_x$deity9 = x.deity) == null ? void 0 : _x$deity9.char) === "九天" && MYSTERY.includes(((_x$heavenStem14 = x.heavenStem) == null ? void 0 : _x$heavenStem14.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_di",
    name: "地假",
    nameEn: "Earth Falsehood",
    category: "special",
    description: "Mystery stem at Block Door (杜门) with Nine Earth — earthly concealment; favorable for disguise and evasion.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door15, _x$deity0, _x$heavenStem15;
        return ((_x$door15 = x.door) == null ? void 0 : _x$door15.char) === "杜" && ((_x$deity0 = x.deity) == null ? void 0 : _x$deity0.char) === "九地" && MYSTERY.includes(((_x$heavenStem15 = x.heavenStem) == null ? void 0 : _x$heavenStem15.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_ren",
    name: "人假",
    nameEn: "Human Falsehood",
    category: "special",
    description: "Mystery stem at Rest Door (休门) with Yin Moon (太阴) — human intermediary conceals intent; favorable for intermediated negotiation.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door16, _x$deity1, _x$heavenStem16;
        return ((_x$door16 = x.door) == null ? void 0 : _x$door16.char) === "休" && ((_x$deity1 = x.deity) == null ? void 0 : _x$deity1.char) === "太阴" && MYSTERY.includes(((_x$heavenStem16 = x.heavenStem) == null ? void 0 : _x$heavenStem16.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_shen",
    name: "神假",
    nameEn: "Spirit Falsehood",
    category: "special",
    description: "Mystery stem at Fear Door (惊门) with Snake (腾蛇) — illusory authority; favorable for deception and misdirection.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door17, _x$deity10, _x$heavenStem17;
        return ((_x$door17 = x.door) == null ? void 0 : _x$door17.char) === "惊" && ((_x$deity10 = x.deity) == null ? void 0 : _x$deity10.char) === "腾蛇" && MYSTERY.includes(((_x$heavenStem17 = x.heavenStem) == null ? void 0 : _x$heavenStem17.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_gui",
    name: "鬼假",
    nameEn: "Ghost Falsehood",
    category: "special",
    description: "Mystery stem at Death Door (死门) with Black Tortoise (玄武) — ghostly cover; favorable for clandestine or mourning-related affairs.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door18, _x$deity11, _x$heavenStem18;
        return ((_x$door18 = x.door) == null ? void 0 : _x$door18.char) === "死" && ((_x$deity11 = x.deity) == null ? void 0 : _x$deity11.char) === "玄武" && MYSTERY.includes(((_x$heavenStem18 = x.heavenStem) == null ? void 0 : _x$heavenStem18.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "long_yin",
    name: "龙吟虎啸",
    nameEn: "Dragon Roars, Tiger Howls",
    category: "special",
    description: "Wood and Metal both strong (≥3 palaces each) across the chart — powerful but volatile; use with caution in negotiations.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.element === "wood";
      }).length >= 3 && p.filter(function (x) {
        return x.element === "metal";
      }).length >= 3 ? [0] : null;
    }
  }, {
    id: "fei_xing_ge",
    name: "飞星格",
    nameEn: "Flying Star Pattern",
    category: "special",
    description: "Stars rotate into non-native palaces (dynamic flight) — rapid environmental change; agility required.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.star && x.star.element !== x.element && !x.isEmpty;
      }).map(function (x) {
        return x.number;
      }).slice(0, 4);
    }
  }, {
    id: "zhi_fu_yin",
    name: "直符吟",
    nameEn: "Chief Resonance",
    category: "special",
    description: "Chief Deity (值符) coincides with its native palace element — authority sits firmly; stabilizing but static.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity12;
        return ((_x$deity12 = x.deity) == null ? void 0 : _x$deity12.char) === "值符" && x.element === "earth";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zhi_shi_yin",
    name: "直使吟",
    nameEn: "Director Resonance",
    category: "special",
    description: "The directing door coincides with its native palace — the human channel is at rest; consolidating position.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && PRODUCE[x.element] === x.door.element;
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== HOSTILE (凶格) =====
  {
    id: "fan_yin",
    name: "伏吟格",
    nameEn: "Fu Yin (Concealed/Stagnant)",
    category: "hostile",
    description: "The whole heaven plate sits unmoved, with every star and stem in its home palace. On a Noble or 戊 this reads as slow but positive; on other stems it reads as stagnant.",
    detect: function detect(p, meta) {
      return (meta == null ? void 0 : meta.fuYin) === true ? p.filter(function (x) { return x.number !== 5; }).map(function (x) { return x.number; }) : null;
    }
  }, {
    id: "fan_yin_2",
    name: "反吟格",
    nameEn: "Fan Yin (Reversal/Clash)",
    category: "hostile",
    description: "The whole heaven plate is turned over — every star and stem in the palace opposite its home — reversal of fortune, instability, sudden changes. High risk for new initiatives.",
    detect: function detect(p, meta) {
      return (meta == null ? void 0 : meta.fanYin) === true ? p.filter(function (x) { return x.number !== 5; }).map(function (x) { return x.number; }) : null;
    }
  }, {
    id: "bai_hu",
    name: "白虎凶门",
    nameEn: "White Tiger with a Harsh Door",
    category: "hostile",
    description: "White Tiger (白虎) deity with a hostile door (惊死伤) — danger of conflict, injury, regulatory hostility, communication breakdown.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity13, _x$door19;
        return ((_x$deity13 = x.deity) == null ? void 0 : _x$deity13.char) === "白虎" && ["惊", "死", "伤"].includes(((_x$door19 = x.door) == null ? void 0 : _x$door19.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xuan_wu",
    name: "玄武失格",
    nameEn: "Black Tortoise Deception",
    category: "hostile",
    description: "Black Tortoise (玄武) with Fear/Death door — deception, theft, hidden enemies, information leaks.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity14, _x$door20;
        return ((_x$deity14 = x.deity) == null ? void 0 : _x$deity14.char) === "玄武" && ["惊", "死"].includes(((_x$door20 = x.door) == null ? void 0 : _x$door20.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "teng_she",
    name: "腾蛇火星",
    nameEn: "Snake Deity with a Fire Star",
    category: "hostile",
    description: "Snake deity (腾蛇) with a Fire star — confusion, illusions, false information, unreliable partners.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity15, _x$star2;
        return ((_x$deity15 = x.deity) == null ? void 0 : _x$deity15.char) === "腾蛇" && ((_x$star2 = x.star) == null ? void 0 : _x$star2.element) === "fire";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "men_po",
    name: "门迫宫制",
    nameEn: "Door Suppressed by Palace",
    category: "hostile",
    description: "Palace element controls the door's element — even auspicious doors lose power; outcomes weakened.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && CONTROL[x.element] === x.door.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "kong_wang",
    name: "空亡格",
    nameEn: "Void / Death & Emptiness",
    category: "hostile",
    description: "An auspicious door falls into Death & Emptiness (旬空) — energy nullified; efforts dissolve, requires a catalyst.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$door21;
        return x.isEmpty && AUSP_DOORS.includes(((_x$door21 = x.door) == null ? void 0 : _x$door21.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ge_dou",
    name: "格斗格",
    nameEn: "Combat Formation",
    category: "hostile",
    description: "Heaven stem controls the earth stem in the same palace — direct conflict, confrontation inevitable.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.heavenStem && x.earthStem && CONTROL[x.heavenStem.element] === x.earthStem.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xing_zhi",
    name: "星伏受制",
    nameEn: "Star Suppressed",
    category: "hostile",
    description: "Palace element controls the star's element — environmental support withdrawn, strategy lacks foundation.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.star && CONTROL[x.element] === x.star.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "men_xing_xiang",
    name: "门宫相克",
    nameEn: "Door Clashes Palace",
    category: "hostile",
    description: "Door element controls the palace element — resistance to action; friction expected.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && CONTROL[x.door.element] === x.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tian_wang_si_zhang",
    name: "天网四张",
    nameEn: "Heaven Net Spread Fourfold",
    category: "hostile",
    description: "癸加癸 (the net closes) — trapped under heaven's net; no escape, lawsuits and entanglement likely.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "di_wang_zhe_bi",
    name: "地网遮蔽",
    nameEn: "Earth Net Obscured",
    category: "hostile",
    description: "壬加壬 (earthly net) — obscured path, hidden obstacles beneath the surface.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "fei_duan_ge",
    name: "飞干格",
    nameEn: "Flying Stem Clash",
    category: "hostile",
    description: "Hour stem controls the day stem — the flying stem attacks; sudden disruption to the day's plan.",
    detect: function detect(p, meta) {
      var _meta$hourPillar2, _meta$dayPillar2;
      return meta != null && (_meta$hourPillar2 = meta.hourPillar) != null && _meta$hourPillar2.stem && meta != null && (_meta$dayPillar2 = meta.dayPillar) != null && _meta$dayPillar2.stem && CONTROL[meta.hourPillar.stem.element] === meta.dayPillar.stem.element ? [0] : null;
    }
  }, {
    id: "fu_duan_ge",
    name: "伏干格",
    nameEn: "Concealed Stem Clash",
    category: "hostile",
    description: "Hour stem identical to day stem — stems locked; stagnation and repetitive friction.",
    detect: function detect(p, meta) {
      var _meta$hourPillar3, _meta$dayPillar3, _meta$hourPillar4, _meta$dayPillar4;
      return (meta == null || (_meta$hourPillar3 = meta.hourPillar) == null || (_meta$hourPillar3 = _meta$hourPillar3.stem) == null ? void 0 : _meta$hourPillar3.char) === (meta == null || (_meta$dayPillar3 = meta.dayPillar) == null || (_meta$dayPillar3 = _meta$dayPillar3.stem) == null ? void 0 : _meta$dayPillar3.char) && (meta == null || (_meta$hourPillar4 = meta.hourPillar) == null || (_meta$hourPillar4 = _meta$hourPillar4.stem) == null ? void 0 : _meta$hourPillar4.yinYang) !== (meta == null || (_meta$dayPillar4 = meta.dayPillar) == null || (_meta$dayPillar4 = _meta$dayPillar4.stem) == null ? void 0 : _meta$dayPillar4.yinYang) ? [0] : null;
    }
  }, {
    id: "bei_ge",
    name: "悖格",
    nameEn: "Contradiction Pattern",
    category: "hostile",
    description: "丙加癸 (Fire meets Water) — contradicting forces; plans backfire, internal contradiction.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "da_ge",
    name: "大格",
    nameEn: "Major Obstacle (庚加癸)",
    category: "hostile",
    description: "庚加癸 — major obstruction; official trouble, travel blockage, punitive action.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xiao_ge",
    name: "小格",
    nameEn: "Minor Obstacle (庚加壬)",
    category: "hostile",
    description: "庚加壬 — minor obstruction; fluctuations and small delays, manageable friction.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xing_ge",
    name: "刑格",
    nameEn: "Punishment Pattern (庚加己)",
    category: "hostile",
    description: "庚加己 — punitive pattern; litigation, penalties, official reprimand.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "己");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "shang_ge",
    name: "上格",
    nameEn: "Upper Obstacle (庚加戊)",
    category: "hostile",
    description: "庚加戊 — the leader is attacked; authority challenged, superior resistance, 天乙伏宫格.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zei_ge",
    name: "贼格",
    nameEn: "Thief Pattern (庚加丙)",
    category: "hostile",
    description: "庚加丙 — thief pattern; loss through theft or betrayal, hostile external force.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ying_ru_tai_bai",
    name: "荧入太白",
    nameEn: "Mars Enters Venus (丙加庚)",
    category: "hostile",
    description: "丙加庚 — fire invades metal; enemy advances, hostile takeover, competitive aggression.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "庚");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tai_bai_ru_ying",
    name: "太白入荧",
    nameEn: "Venus Enters Mars (庚加丙 reversed)",
    category: "hostile",
    description: "庚 on heaven with 丙 earth (庚加丙 reversed host-guest) — counter-invasion; beware counterattacks.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem19, _x$earthStem7;
        return ((_x$heavenStem19 = x.heavenStem) == null ? void 0 : _x$heavenStem19.char) === "庚" && ((_x$earthStem7 = x.earthStem) == null ? void 0 : _x$earthStem7.char) === "丙";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "qing_long_tao",
    name: "青龙逃走",
    nameEn: "Green Dragon Flees (乙加辛)",
    category: "hostile",
    description: "乙加辛 — wood is cut by metal; the dragon flees; betrayal by allies, retreat forced.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tian_yi_fu_gong",
    name: "天乙伏宫格",
    nameEn: "Heaven Yi Concealed Palace",
    category: "hostile",
    description: "戊加庚 — the heavenly leader is cornered; plans stalled by officialdom.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "庚");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tian_yi_di_wang",
    name: "天乙地网",
    nameEn: "Heaven Yi Earth Net",
    category: "hostile",
    description: "戊加癸 — the leader caught in the earth net; trapped by external circumstances.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gan_he-xing",
    name: "干合刑格",
    nameEn: "Stem-Union Punishment (辛加丙)",
    category: "hostile",
    description: "辛加丙 — metal-fire union turned punishment; alliance that breeds conflict.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "辛", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_jia_xin_ge",
    name: "腾蛇妖娇",
    nameEn: "Tangling Snake (癸加丁)",
    category: "hostile",
    description: "癸加丁 — Gui Water and Ding Fire clash; entangled in heated disputes and disagreements.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "she_yao_jiao",
    name: "腾蛇相缠",
    nameEn: "Snake Entanglement (癸加辛)",
    category: "hostile",
    description: "癸加辛 — entangled schemes, prolonged disputes, no clean resolution.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== SIX-INSTRUMENT PUNISHMENTS (六仪击刑) =====
  {
    id: "wu_ji_xing",
    name: "戊击刑",
    nameEn: "Wu Self-Punishment (palace 3)",
    category: "hostile",
    description: "戊 (甲子) lands at palace 3 (震) — self-punishment; internal friction, self-sabotage.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem20;
        return ((_x$heavenStem20 = x.heavenStem) == null ? void 0 : _x$heavenStem20.char) === "戊" && x.number === 3;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ji_ji_xing",
    name: "己击刑",
    nameEn: "Ji Self-Punishment (palace 2)",
    category: "hostile",
    description: "己 (甲戌) lands at palace 2 (坤) — punishment at the earth palace; relational strife.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem21;
        return ((_x$heavenStem21 = x.heavenStem) == null ? void 0 : _x$heavenStem21.char) === "己" && x.number === 2;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "geng_ji_xing",
    name: "庚击刑",
    nameEn: "Geng Self-Punishment (palace 8)",
    category: "hostile",
    description: "庚 (甲申) lands at palace 8 (艮) — punishment at the mountain; blocked advancement, punitive delay.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem22;
        return ((_x$heavenStem22 = x.heavenStem) == null ? void 0 : _x$heavenStem22.char) === "庚" && x.number === 8;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xin_ji_xing",
    name: "辛击刑",
    nameEn: "Xin Self-Punishment (palace 9)",
    category: "hostile",
    description: "辛 (甲午) lands at palace 9 (离) — punishment at the fire palace; reputational damage, exposed error.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem23;
        return ((_x$heavenStem23 = x.heavenStem) == null ? void 0 : _x$heavenStem23.char) === "辛" && x.number === 9;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_ji_xing",
    name: "壬击刑",
    nameEn: "Ren Self-Punishment (palace 4)",
    category: "hostile",
    description: "壬 (甲辰) lands at palace 4 (巽) — punishment at the wind palace; scattered efforts, diffusion.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem24;
        return ((_x$heavenStem24 = x.heavenStem) == null ? void 0 : _x$heavenStem24.char) === "壬" && x.number === 4;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_ji_xing",
    name: "癸击刑",
    nameEn: "Gui Self-Punishment (palace 4)",
    category: "hostile",
    description: "癸 (甲寅) lands at palace 4 (巽) — punishment at the wind palace; entanglement and leakage.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem25;
        return ((_x$heavenStem25 = x.heavenStem) == null ? void 0 : _x$heavenStem25.char) === "癸" && x.number === 4;
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== TOMB / 墓 =====
  {
    id: "san_qi_ru_mu",
    name: "三奇入墓",
    nameEn: "Three Mysteries Enter Tomb",
    category: "hostile",
    description: "A mystery stem (乙丙丁) lands in its tomb palace — brilliance buried; potential suppressed, needs catalyst.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$heavenStem26;
        return MYSTERY.includes(((_x$heavenStem26 = x.heavenStem) == null ? void 0 : _x$heavenStem26.char) || "") && TOMBS[x.heavenStem.element] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "liu_yi_ru_mu",
    name: "六仪入墓",
    nameEn: "Six Instruments Enter Tomb",
    category: "hostile",
    description: "A Six-Instrument stem sits on its grave branch, and that branch is in the date's pillars: loss of direction, stagnation and slowing down.",
    detect: function detect(p, meta) {
      // Each stem's grave from the compendium's twelve-phase table (p.27), and the branch must appear in the date (p.163). [branch, palace].
      var GRAVE = { "戊": [10, 6], "己": [1, 8], "庚": [1, 8], "辛": [4, 4], "壬": [4, 4], "癸": [7, 2] };
      return p.filter(function (x) {
        var g = GRAVE[x.heavenStem && x.heavenStem.char];
        return !!g && g[1] === x.number && !!meta && (meta.pillarBranches || []).indexOf(g[0]) >= 0;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "men_ru_mu",
    name: "门入墓",
    nameEn: "Door Enters Tomb",
    category: "hostile",
    description: "A door sits in its grave palace: Open and Fear in Gen, Rest, Life and Death in Xun, Harm and Delusion in Kun, Scenery in Qian. This holds back what the door would do.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && TOMBS[x.door.element] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== SUPPLEMENTARY HOSTILE STEM-PAIR & RELATIONAL =====
  {
    id: "ji_ding",
    name: "己加丁",
    nameEn: "Ji over Ding — Earth Obscures Fire",
    category: "hostile",
    description: "己加丁 — earth buries fire; minor obstruction, muffled communication, paperwork delays.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "己", "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ji_bing",
    name: "己加丙",
    nameEn: "Ji over Bing — Earth Meets Fire",
    category: "hostile",
    description: "己加丙 — fire generates earth but as guest-host inversion; misplaced gratitude, dependency.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "己", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_ding",
    name: "壬加丁",
    nameEn: "Ren over Ding — Water Extinguishes Fire",
    category: "hostile",
    description: "壬加丁 — water douses fire; sudden cancellation, emotional disruption.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_bing",
    name: "壬加丙",
    nameEn: "Ren over Bing — Water Meets Fire",
    category: "hostile",
    description: "壬加丙 — water-fire clash; heated conflict, volatility.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xin_gui",
    name: "辛加癸",
    nameEn: "Xin over Gui — Metal Meets Water",
    category: "hostile",
    description: "辛加癸 — leakage; resources drain, information seeps out.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "辛", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "geng_xin",
    name: "庚加辛",
    nameEn: "Geng over Xin — Metal on Metal",
    category: "hostile",
    description: "庚加辛 — metal sharpens metal; rivalry among peers, cutthroat competition.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_xin",
    name: "戊加辛",
    nameEn: "Wu over Xin — Earth over Metal",
    category: "special",
    description: "戊加辛 — earth generates metal; latent value, resources forming — neutral-to-favorable for investment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_ren",
    name: "戊加壬",
    nameEn: "Wu over Ren — Earth Meets Water",
    category: "hostile",
    description: "戊加壬 — earth blocks water; dammed flow, suppressed momentum.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_ji",
    name: "戊加己",
    nameEn: "Wu over Ji — Earth on Earth",
    category: "special",
    description: "戊加己 — earth accumulates; consolidation phase, build reserves, neutral strategic posture.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "己");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_yi",
    name: "戊加乙",
    nameEn: "Wu over Yi — Earth over Wood",
    category: "hostile",
    description: "戊加乙 — earth controls wood; the subordinate is suppressed, growth stunted.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "乙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_bing",
    name: "戊加丙",
    nameEn: "Wu over Bing — Earth over Fire",
    category: "auspicious",
    description: "戊加丙 — fire generates earth; 'Dragon Illuminates' — recognition and illumination reach the leader.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "wu_ding",
    name: "戊加丁",
    nameEn: "Wu over Ding — Earth over Fire",
    category: "auspicious",
    description: "戊加丁 — fire generates earth; discreet support strengthens the leader; favorable for confidential success.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "戊", "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_gui",
    name: "乙加癸",
    nameEn: "Yi over Gui — Wood over Water",
    category: "auspicious",
    description: "乙加癸 — water generates wood; nourished growth, favorable for learning and cultivation.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_ren",
    name: "乙加壬",
    nameEn: "Yi over Ren — Wood over Water",
    category: "auspicious",
    description: "乙加壬 — water nourishes wood; 'Dragon enters the Sea'; favorable for expansion and recruitment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_ji",
    name: "乙加己",
    nameEn: "Yi over Ji — Wood Controls Earth",
    category: "special",
    description: "乙加己 — wood controls earth; the subordinate takes command; favorable for assertive restructuring.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "己");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yi_geng",
    name: "乙加庚",
    nameEn: "Yi over Geng — Wood Meets Metal",
    category: "hostile",
    description: "乙加庚 — metal controls wood; 'Dragon wounded'; pressure from superiors, constrained action.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "乙", "庚");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "bing_xin",
    name: "丙加辛",
    nameEn: "Bing over Xin — Fire Meets Metal",
    category: "hostile",
    description: "丙加辛 — fire controls metal; aggressive execution, risk of overreach and burnout.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "bing_ren",
    name: "丙加壬",
    nameEn: "Bing over Ren — Fire Meets Water",
    category: "hostile",
    description: "丙加壬 — water controls fire; plans doused, unexpected cancellation.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丙", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ding_xin",
    name: "丁加辛",
    nameEn: "Ding over Xin — Fire over Metal",
    category: "special",
    description: "丁加辛 — fire controls metal; 'precise cut'; favorable for surgical, targeted action.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丁", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ding_ren",
    name: "丁加壬",
    nameEn: "Ding over Ren — Fire over Water",
    category: "hostile",
    description: "丁加壬 — water controls fire; subtle extinguishing, quiet obstruction.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丁", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ding_gui",
    name: "朱雀投江",
    nameEn: "Red Phoenix Diving Water (丁加癸)",
    category: "hostile",
    description: "丁加癸 — communication is blocked and good intentions are misunderstood; little goes smoothly.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "丁", "癸");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "geng_ji_geng",
    name: "庚加戊",
    nameEn: "Geng over Wu — Metal over Earth",
    category: "hostile",
    description: "庚加戊 — earth generates metal but as attacker; the leader is cornered (天乙伏宫).",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "庚", "戊");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xin_ren",
    name: "辛加壬",
    nameEn: "Xin over Ren — Metal over Water",
    category: "special",
    description: "辛加壬 — metal generates water; flow resumes after blockage; favorable for clearance and resolution.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "辛", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xin_ding",
    name: "辛加丁",
    nameEn: "Xin over Ding — Metal over Fire",
    category: "hostile",
    description: "辛加丁 — fire controls metal; 'wound by fire'; reputational nicks, sharp criticism.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "辛", "丁");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xin_yi",
    name: "白虎猖狂",
    nameEn: "Ferocious White Tiger (辛加乙)",
    category: "hostile",
    description: "辛加乙 — Xin Metal clashes with Yi Wood; danger on long journeys, disputes, and loss of confidence.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "辛", "乙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_xin",
    name: "壬加辛",
    nameEn: "Ren over Xin — Water over Metal",
    category: "special",
    description: "壬加辛 — metal generates water; 'Clear stream'; favorable for communication and disclosure.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "辛");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_yi",
    name: "壬加乙",
    nameEn: "Ren over Yi — Water over Wood",
    category: "auspicious",
    description: "壬加乙 — water generates wood; 'Dragon in Rain'; favorable for creativity and new ventures.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "乙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ren_geng",
    name: "壬加庚",
    nameEn: "Ren over Geng — Water over Metal",
    category: "special",
    description: "壬加庚 — metal generates water; 'Flow from rock'; steady progress through rigid structures.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "壬", "庚");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_yi",
    name: "癸加乙",
    nameEn: "Gui over Yi — Water over Wood",
    category: "auspicious",
    description: "癸加乙 — water generates wood; 'Hidden growth'; favorable for quiet cultivation and R&D.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "乙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_bing",
    name: "癸加丙",
    nameEn: "Gui over Bing — Water over Fire",
    category: "hostile",
    description: "癸加丙 — water controls fire; 'Dark clouds cover sun'; suppressed visibility, overshadowed.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "丙");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_geng",
    name: "癸加庚",
    nameEn: "Gui over Geng — Water over Metal",
    category: "special",
    description: "癸加庚 — metal generates water; 'Spring from iron'; resilience yielding resources.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "庚");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "gui_ren",
    name: "癸加壬",
    nameEn: "Gui over Ren — Water over Water",
    category: "hostile",
    description: "癸加壬 — water on water; 'Flood'; overflow, loss of containment, diffusion of focus.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return pair(x, "癸", "壬");
      }).map(function (x) {
        return x.number;
      });
    }
  },
  // ===== ADDITIONAL CLASSICAL =====
  {
    id: "fu_yin_men",
    name: "伏吟门",
    nameEn: "Door Fu Yin",
    category: "hostile",
    description: "Each door sits in its own home palace (no flight) — the channel is stuck; action repeats without progress.",
    // A door is in 伏吟 in its home palace and 反吟 in the opposite one. The doors turn together, so either holds for
    // the whole plate. (It once compared elements, which flagged e.g. 开门 in 兑 7 though 开门's home is 乾 6.)
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && DOOR_HOME[x.door.char] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "men_fan_yin",
    name: "门反吟",
    nameEn: "Door Fan Yin",
    category: "hostile",
    description: "Each door sits in the palace opposite its home — the channel is reversed; plans turn back on themselves and agreements unwind.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.door && DOOR_HOME[x.door.char] && OPPOSITE[DOOR_HOME[x.door.char]] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xing_fu_yin",
    name: "星伏吟",
    nameEn: "Star Fu Yin",
    category: "hostile",
    description: "Each star sits in its own home palace — environment is static; inertia, no external catalyst.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.star && STAR_HOME[x.star.char] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "xing_fan_yin",
    name: "星反吟",
    nameEn: "Star Fan Yin",
    category: "hostile",
    description: "Each star sits in the palace opposite its home — the environment turns against the plan; sudden reversals.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.star && STAR_HOME[x.star.char] && OPPOSITE[STAR_HOME[x.star.char]] === x.number;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "deity_clash",
    name: "神煞相克",
    nameEn: "Deity-Door Clash",
    category: "hostile",
    description: "A deity's element clashes its door's element — the universal driver fights the human channel; mixed signals.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.deity && x.door && CONTROL[x.deity.element] === x.door.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "deity_harmony",
    name: "神门相生",
    nameEn: "Deity-Door Harmony",
    category: "auspicious",
    description: "A deity's element generates its door's element — the universal driver supports the human channel; aligned intent.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.deity && x.door && PRODUCE[x.deity.element] === x.door.element;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "san_he",
    name: "三合格",
    nameEn: "Three-Harmony Pattern",
    category: "auspicious",
    description: "Three palaces of the same generating element cluster — a self-reinforcing circuit; sustained alliance.",
    detect: function detect(p) {
      var counts = {
        wood: 0,
        fire: 0,
        earth: 0,
        metal: 0,
        water: 0
      };
      p.forEach(function (x) {
        return counts[x.element]++;
      });
      var harmonyEl = Object.keys(counts).find(function (k) {
        return counts[k] >= 3;
      });
      return harmonyEl ? p.filter(function (x) {
        return x.element === harmonyEl;
      }).map(function (x) {
        return x.number;
      }) : null;
    }
  }, {
    id: "wu_xing_que",
    name: "五行缺",
    nameEn: "Missing Element",
    category: "special",
    description: "One of the five elements is entirely absent from the chart's palaces — an imbalance; compensate via timing or color.",
    detect: function detect(p) {
      var counts = {
        wood: 0,
        fire: 0,
        earth: 0,
        metal: 0,
        water: 0
      };
      p.forEach(function (x) {
        return counts[x.element]++;
      });
      return Object.values(counts).some(function (c) {
        return c === 0;
      }) ? [0] : null;
    }
  }, {
    id: "shi_mu",
    name: "时墓格",
    nameEn: "Hour Tomb",
    category: "hostile",
    description: "The hour stem enters its tomb palace — the present moment is entombed; defer major action.",
    detect: function detect(p, meta) {
      var _meta$hourPillar5;
      var hs = meta == null || (_meta$hourPillar5 = meta.hourPillar) == null ? void 0 : _meta$hourPillar5.stem;
      if (!hs) return null;
      var tombPal = TOMBS[hs.element];
      return p.some(function (x) {
        var _x$heavenStem28;
        return x.number === tombPal && ((_x$heavenStem28 = x.heavenStem) == null ? void 0 : _x$heavenStem28.char) === hs.char;
      }) ? [tombPal] : null;
    }
  }, {
    id: "men_kong",
    name: "门空",
    nameEn: "Auspicious Door in Void",
    category: "hostile",
    description: "Any door in a void palace (旬空) — the channel is deactivated; outcomes fail to materialize.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.isEmpty && x.door;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "star_kong",
    name: "星空",
    nameEn: "Star in Void",
    category: "hostile",
    description: "A star in a void palace — environmental support is nullified; weak foundation.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.isEmpty && x.star;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "stem_kong",
    name: "奇仪空",
    nameEn: "Stem in Void",
    category: "special",
    description: "A heaven stem in a void palace — the active force is suspended; requires a catalyst to activate.",
    detect: function detect(p) {
      return p.filter(function (x) {
        return x.isEmpty && x.heavenStem;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "fei_dun_cheng",
    name: "飞遁成",
    nameEn: "Escape Achieved",
    category: "auspicious",
    description: "An escape formation (遁) with an auspicious star — the concealment holds; clean getaway.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$star3, _x$door22, _x$heavenStem29;
        return AUSP_STARS.includes(((_x$star3 = x.star) == null ? void 0 : _x$star3.char) || "") && AUSP_DOORS.includes(((_x$door22 = x.door) == null ? void 0 : _x$door22.char) || "") && MYSTERY.includes(((_x$heavenStem29 = x.heavenStem) == null ? void 0 : _x$heavenStem29.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "yin_yang_dao",
    name: "阴阳倒",
    nameEn: "Yin-Yang Inversion",
    category: "special",
    description: "Yin Dun with Yang-type stems dominant (or vice versa) — polarity inverted; expect reversals.",
    detect: function detect(p, meta) {
      if (!meta) return null;
      var yang = p.filter(function (x) {
        var _x$heavenStem30;
        return ((_x$heavenStem30 = x.heavenStem) == null ? void 0 : _x$heavenStem30.yinYang) === "yang";
      }).length;
      var yin = p.filter(function (x) {
        var _x$heavenStem31;
        return ((_x$heavenStem31 = x.heavenStem) == null ? void 0 : _x$heavenStem31.yinYang) === "yin";
      }).length;
      // The chart labels dun in Chinese (阴遁 / 阳遁); accept the English form too.
      var yinDun = meta.dun === "Yin" || meta.dun === "阴遁", yangDun = meta.dun === "Yang" || meta.dun === "阳遁";
      return yinDun && yang > yin || yangDun && yin > yang ? [0] : null;
    }
  }, {
    id: "xiong_xing_lin",
    name: "凶星临门",
    nameEn: "Hostile Star at Door",
    category: "hostile",
    description: "A hostile star (天芮/天蓬/天柱/天英) sits with an auspicious door — good intent undermined by bad environment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$star4, _x$door23;
        return HOSTILE_STARS.includes(((_x$star4 = x.star) == null ? void 0 : _x$star4.char) || "") && AUSP_DOORS.includes(((_x$door23 = x.door) == null ? void 0 : _x$door23.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "ji_xing_lin",
    name: "吉星临凶门",
    nameEn: "Auspicious Star at Hostile Door",
    category: "hostile",
    description: "An auspicious star sits with a hostile door — good environment wasted on bad human action.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$star5, _x$door24;
        return AUSP_STARS.includes(((_x$star5 = x.star) == null ? void 0 : _x$star5.char) || "") && HOSTILE_DOORS.includes(((_x$door24 = x.door) == null ? void 0 : _x$door24.char) || "");
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zhi_fu_kong",
    name: "值符空",
    nameEn: "Chief in Void",
    category: "hostile",
    description: "The Chief Deity (值符) sits in a void palace — leadership is suspended; authority cannot manifest.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity16;
        return ((_x$deity16 = x.deity) == null ? void 0 : _x$deity16.char) === "值符" && x.isEmpty;
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "zhi_fu_xiong",
    name: "值符受克",
    nameEn: "Chief Controlled",
    category: "hostile",
    description: "The Chief Deity's palace element controls its element (Earth) — leadership is suppressed by the environment.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity17;
        return ((_x$deity17 = x.deity) == null ? void 0 : _x$deity17.char) === "值符" && CONTROL[x.element] === "earth";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "jiu_tian_xiong",
    name: "九天受制",
    nameEn: "Nine Heaven Controlled",
    category: "hostile",
    description: "Nine Heaven (Fire) in a Water palace — celestial expansion curtailed; public reach limited.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity18;
        return ((_x$deity18 = x.deity) == null ? void 0 : _x$deity18.char) === "九天" && CONTROL[x.element] === "fire";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "jiu_di_xiong",
    name: "九地受制",
    nameEn: "Nine Earth Controlled",
    category: "hostile",
    description: "Nine Earth in a Wood palace — earthly concealment exposed; foundation weakened.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity19;
        return ((_x$deity19 = x.deity) == null ? void 0 : _x$deity19.char) === "九地" && CONTROL[x.element] === "earth";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "tai_yin_xiong",
    name: "太阴受制",
    nameEn: "Yin Moon Controlled",
    category: "hostile",
    description: "Yin Moon (Metal) in a Fire palace — discreet support burned; confidentiality compromised.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity20;
        return ((_x$deity20 = x.deity) == null ? void 0 : _x$deity20.char) === "太阴" && CONTROL[x.element] === "metal";
      }).map(function (x) {
        return x.number;
      });
    }
  }, {
    id: "liu_he_xiong",
    name: "六合受制",
    nameEn: "Six Harmony Controlled",
    category: "hostile",
    description: "Six Harmony (Wood) in a Metal palace — alliances broken; partnerships dissolve.",
    detect: function detect(p) {
      return p.filter(function (x) {
        var _x$deity21;
        return ((_x$deity21 = x.deity) == null ? void 0 : _x$deity21.char) === "六合" && CONTROL[x.element] === "wood";
      }).map(function (x) {
        return x.number;
      });
    }
  }];
  function formationSeasonalStrength(formation, month) {
    var seasonOf = function seasonOf(m) {
      return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";
    };
    var season = seasonOf(month);
    var woodFormations = ["qing_long_hui", "long_yin", "yi_qi_sheng", "feng_dun", "yi_jia", "yi_gui", "yi_ren"];
    var fireFormations = ["yu_nv_shou", "bing_qi_sheng", "ding_qi_sheng", "bing_jia", "wu_bing", "wu_ding"];
    var metalFormations = ["qing_long_tao", "da_ge", "xiao_ge", "xing_ge", "shang_ge", "zei_ge"];
    if (woodFormations.includes(formation.id)) {
      return season === "spring" ? "Peak (旺)" : season === "winter" ? "Strong (相)" : season === "summer" ? "Resting (休)" : "Weak (囚)";
    }
    if (fireFormations.includes(formation.id)) {
      return season === "summer" ? "Peak (旺)" : season === "spring" ? "Strong (相)" : "Weak (囚)";
    }
    if (metalFormations.includes(formation.id)) {
      return season === "autumn" ? "Peak (旺)" : season === "summer" ? "Strong (相)" : "Weak (囚)";
    }
    return season === "spring" ? "Active (相)" : season === "autumn" ? "Steady (平)" : "Moderate (平)";
  }
  function detectFormations(chart) {
    var palaceList = Object.values(chart.palaces);
    var meta = chart.meta;
    var found = [];
    var _iterator = _createForOfIteratorHelper(FORMATIONS),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var f = _step.value;
        try {
          var res = f.detect(palaceList, meta);
          if (res === null || res === undefined || Array.isArray(res) && res.length === 0) continue;
          found.push({
            id: f.id,
            name: f.name,
            nameEn: f.nameEn,
            category: f.category,
            description: f.description,
            palaces: res,
            seasonalStrength: formationSeasonalStrength(f, new Date(chart.meta.solarTime).getUTCMonth() + 1)
          });
        } catch (_e) {
          // skip detection errors
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
    return found;
  }
  var FORMATION_CATEGORIES = {
    auspicious: {
      label: "Auspicious",
      color: "#2ECC71"
    },
    hostile: {
      label: "Hostile",
      color: "#E74C3C"
    },
    special: {
      label: "Special / Strategic",
      color: "#F4D03F"
    }
  };
  // 28 Constellations (二十八宿) — Date Selection Overlay, per spec §5.
  // Independent of the 9-Palace grid; provides the ruling Constellation for a date and its
  // suitable (宜) / unsuitable (忌) activities.

  // Ordered as the traditional 28-mansion cycle (East → North → West → South).
  var CONSTELLATIONS_28 = [
  // 东方青龙 Azure Dragon
  {
    char: "角",
    name: "Horn",
    animal: "Dragon",
    element: "wood",
    suitable: "造作、嫁娶、移徙、安葬、立柱",
    unsuitable: "行船、放水"
  }, {
    char: "亢",
    name: "Neck",
    animal: "Dragon",
    element: "metal",
    suitable: "嫁娶、播种、祭祀",
    unsuitable: "起土、伐木、安葬"
  }, {
    char: "氐",
    name: "Root",
    animal: "Dragon",
    element: "earth",
    suitable: "嫁娶、造作、移徙、安床",
    unsuitable: "行船、出行"
  }, {
    char: "房",
    name: "House",
    animal: "Dragon",
    element: "sun",
    suitable: "嫁娶、造作、移徙、祭祀、开市",
    unsuitable: "安葬"
  }, {
    char: "心",
    name: "Heart",
    animal: "Dragon",
    element: "moon",
    suitable: "祭祀、嫁娶、祈福",
    unsuitable: "造作、出行、安葬"
  }, {
    char: "尾",
    name: "Tail",
    animal: "Dragon",
    element: "fire",
    suitable: "造作、嫁娶、移徙、开市",
    unsuitable: "安葬、行船"
  }, {
    char: "箕",
    name: "Basket",
    animal: "Dragon",
    element: "water",
    suitable: "造作、嫁娶、移徙、安葬、开池",
    unsuitable: "伐木"
  },
  // 北方玄武 Black Tortoise
  {
    char: "斗",
    name: "Dipper",
    animal: "Tortoise",
    element: "wood",
    suitable: "造作、嫁娶、移徙、安葬、开市",
    unsuitable: "出行"
  }, {
    char: "牛",
    name: "Ox",
    animal: "Tortoise",
    element: "metal",
    suitable: "嫁娶、移徙、安葬、祭祀",
    unsuitable: "造作、起土"
  }, {
    char: "女",
    name: "Girl",
    animal: "Tortoise",
    element: "earth",
    suitable: "嫁娶、移徙、安床",
    unsuitable: "造作、开市"
  }, {
    char: "虚",
    name: "Empty",
    animal: "Tortoise",
    element: "sun",
    suitable: "祭祀、嫁娶、移徙、祈福",
    unsuitable: "造作、安葬、开市"
  }, {
    char: "危",
    name: "Danger",
    animal: "Tortoise",
    element: "moon",
    suitable: "祭祀、嫁娶、移徙、安床",
    unsuitable: "造作、出行、登船"
  }, {
    char: "室",
    name: "Roof",
    animal: "Tortoise",
    element: "fire",
    suitable: "造作、嫁娶、移徙、安葬、修造",
    unsuitable: "出行"
  }, {
    char: "壁",
    name: "Wall",
    animal: "Tortoise",
    element: "water",
    suitable: "造作、嫁娶、移徙、安床",
    unsuitable: "放水、出行"
  },
  // 西方白虎 White Tiger
  {
    char: "奎",
    name: "Legs",
    animal: "Tiger",
    element: "wood",
    suitable: "造作、嫁娶、移徙、修造",
    unsuitable: "出行、放水"
  }, {
    char: "娄",
    name: "Bond",
    animal: "Tiger",
    element: "metal",
    suitable: "嫁娶、造作、移徙、祭祀",
    unsuitable: "安葬、起土"
  }, {
    char: "胃",
    name: "Stomach",
    animal: "Tiger",
    element: "earth",
    suitable: "造作、嫁娶、移徙、安葬",
    unsuitable: "出行"
  }, {
    char: "昴",
    name: "Hairy",
    animal: "Tiger",
    element: "sun",
    suitable: "嫁娶、移徙、安床",
    unsuitable: "造作、安葬、开市"
  }, {
    char: "毕",
    name: "Net",
    animal: "Tiger",
    element: "moon",
    suitable: "造作、嫁娶、移徙、祭祀、开市",
    unsuitable: "安葬"
  }, {
    char: "觜",
    name: "Turtle",
    animal: "Tiger",
    element: "fire",
    suitable: "嫁娶、移徙、安床",
    unsuitable: "造作、出行"
  }, {
    char: "参",
    name: "Stars",
    animal: "Tiger",
    element: "water",
    suitable: "造作、嫁娶、移徙、安葬、立柱",
    unsuitable: "放水"
  },
  // 南方朱雀 Vermilion Bird
  {
    char: "井",
    name: "Well",
    animal: "Bird",
    element: "wood",
    suitable: "造作、嫁娶、移徙、祭祀、开市",
    unsuitable: "安葬"
  }, {
    char: "鬼",
    name: "Ghost",
    animal: "Bird",
    element: "metal",
    suitable: "祭祀、嫁娶、祈福",
    unsuitable: "造作、安葬、出行"
  }, {
    char: "柳",
    name: "Willow",
    animal: "Bird",
    element: "earth",
    suitable: "嫁娶、移徙、安床",
    unsuitable: "造作、开市"
  }, {
    char: "星",
    name: "Star",
    animal: "Bird",
    element: "sun",
    suitable: "造作、嫁娶、移徙、祭祀、开市",
    unsuitable: "安葬"
  }, {
    char: "张",
    name: "Spread",
    animal: "Bird",
    element: "moon",
    suitable: "造作、嫁娶、移徙、开市",
    unsuitable: "安葬、放水"
  }, {
    char: "翼",
    name: "Wings",
    animal: "Bird",
    element: "fire",
    suitable: "祭祀、嫁娶、祈福",
    unsuitable: "造作、出行、开市"
  }, {
    char: "轸",
    name: "Chariot",
    animal: "Bird",
    element: "water",
    suitable: "造作、嫁娶、移徙、安葬",
    unsuitable: "出行"
  }];

  // Day-ruler Constellation lookup.
  // The 28-mansion cycle is anchored to the Julian Day Number. Anchor calibrated so that
  // 2026-07-22 (JDN 2461244) maps to 星宿 (index 23), matching standard Chinese almanacs.
  var ANCHOR_JDN = 2461244;
  var ANCHOR_INDEX = 23;
  function dayConstellationIndex(jdn) {
    return ((jdn - ANCHOR_JDN + ANCHOR_INDEX) % 28 + 28) % 28;
  }
  function getDayConstellation(jdn) {
    var idx = dayConstellationIndex(jdn);
    return CONSTELLATIONS_28[idx];
  }
  // Daily Almanac helpers — True Solar Time, 12建除 Officers, Dong Gong Ze Ri activities.
  // Used by the computeDailyAlmanac backend function.

  // ---------- True Solar Time ----------
  // Equation of Time (minutes) — standard approximation from day-of-year.
  function equationOfTimeMinutes(date) {
    var start = Date.UTC(date.getUTCFullYear(), 0, 0);
    var N = Math.floor((date.getTime() - start) / 86400000);
    var B = 2 * Math.PI * (N - 81) / 365;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }

  // Local True Solar Time = UTC + (longitude/15)h + Equation of Time.
  // Returns a Date whose UTC getters yield the solar-time clock reading.
  function trueSolarTime(utcDate, longitude) {
    var eotMin = equationOfTimeMinutes(utcDate);
    var offsetMs = longitude / 15 * 3600000;
    return new Date(utcDate.getTime() + offsetMs + eotMin * 60000);
  }

  // ---------- 12建除 Officers (建除满平定执破危成收开闭) ----------
  var TWELVE_OFFICERS = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];
  var OFFICER_EN = ["Establish", "Remove", "Full", "Peaceful", "Stable", "Capture", "Destruction", "Danger", "Success", "Harvest", "Open", "Close"];

  // Officer for a day, given the month-branch index and day-branch index.
  // 建 = day branch == month branch; count forward through the 12 branches.
  function dayOfficer(monthBranchIndex, dayBranchIndex) {
    var idx = ((dayBranchIndex - monthBranchIndex) % 12 + 12) % 12;
    return TWELVE_OFFICERS[idx];
  }
  function officerEnName(officer) {
    var i = TWELVE_OFFICERS.indexOf(officer);
    return i >= 0 ? OFFICER_EN[i] : "";
  }

  // ---------- Dong Gong Ze Ri (董公择日) activity lists per officer ----------
  // Classical 宜 (suitable) / 忌 (avoid) for each of the 12 officers.
  var DONG_GONG = {
    "建": {
      suitable: ["谒贵", "上书", "赴任", "求职", "筑堤"],
      unsuitable: ["动土", "开仓", "嫁娶", "安葬"]
    },
    "除": {
      suitable: ["治病", "解除", "沐浴", "扫舍", "出行"],
      unsuitable: ["嫁娶", "求仕", "开市"]
    },
    "满": {
      suitable: ["祭祀", "祈福", "移徙", "进人口"],
      unsuitable: ["动土", "安葬", "求医疗病"]
    },
    "平": {
      suitable: ["修造", "动土", "平整道路"],
      unsuitable: ["开渠", "放水", "祭祀"]
    },
    "定": {
      suitable: ["祭祀", "定盟", "冠带", "纳采"],
      unsuitable: ["词讼", "出行", "安葬"]
    },
    "执": {
      suitable: ["捕捉", "畋猎", "签约"],
      unsuitable: ["开市", "立券", "嫁娶"]
    },
    "破": {
      suitable: ["求医疗病", "破屋坏垣"],
      unsuitable: ["嫁娶", "开市", "安葬", "一切吉事"]
    },
    "危": {
      suitable: ["祭祀", "祈福", "安床"],
      unsuitable: ["出行", "登舟", "嫁娶"]
    },
    "成": {
      suitable: ["嫁娶", "开市", "入学", "移徙", "立券", "祈福"],
      unsuitable: ["词讼", "安葬"]
    },
    "收": {
      suitable: ["进人口", "纳财", "捕捉", "祭祀"],
      unsuitable: ["出行", "安葬", "开市"]
    },
    "开": {
      suitable: ["祭祀", "祈福", "赴任", "移徙", "求名", "嫁娶", "开市"],
      unsuitable: ["动土", "安葬"]
    },
    "闭": {
      suitable: ["筑堤", "塞穴", "安葬"],
      unsuitable: ["开市", "嫁娶", "出行", "求医"]
    }
  };

  // English glossary for common TongShu activities (for UI display)
  var ACTIVITY_EN = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({
    "谒贵": "Visit nobles",
    "上书": "Submit petition",
    "赴任": "Take office",
    "求职": "Seek post",
    "筑堤": "Build dyke",
    "动土": "Break ground",
    "开仓": "Open granary",
    "嫁娶": "Marry",
    "安葬": "Bury",
    "治病": "Heal",
    "解除": "Dispel",
    "沐浴": "Bathe",
    "扫舍": "Clean house",
    "出行": "Travel",
    "求仕": "Seek office",
    "开市": "Open market",
    "祭祀": "Sacrifice",
    "祈福": "Pray",
    "移徙": "Move house",
    "进人口": "Add people",
    "求医疗病": "Seek treatment",
    "修造": "Build/repair",
    "平整道路": "Level roads",
    "开渠": "Dig channels",
    "放水": "Release water",
    "定盟": "Betroth",
    "冠带": "Capping rite",
    "纳采": "Propose",
    "词讼": "Lawsuit",
    "捕捉": "Capture",
    "畋猎": "Hunt",
    "签约": "Sign contract",
    "立券": "Sign deed"
  }, "\u6C42\u533B\u7597\u75C5", "Treatment"), "破屋坏垣", "Demolish"), "一切吉事", "All auspicious acts"), "登舟", "Board boat"), "入学", "Schooling"), "求名", "Seek fame"), "纳财", "Take in wealth");
  // QMDJ Strategic Execution Engine — Core Constants
  // Heavenly Stems, Earthly Branches, Doors, Deities, Stars, Palaces, Elements

  var STEMS = [{
    char: "甲",
    name: "Jia",
    element: "wood",
    yinYang: "yang"
  }, {
    char: "乙",
    name: "Yi",
    element: "wood",
    yinYang: "yin"
  }, {
    char: "丙",
    name: "Bing",
    element: "fire",
    yinYang: "yang"
  }, {
    char: "丁",
    name: "Ding",
    element: "fire",
    yinYang: "yin"
  }, {
    char: "戊",
    name: "Wu",
    element: "earth",
    yinYang: "yang"
  }, {
    char: "己",
    name: "Ji",
    element: "earth",
    yinYang: "yin"
  }, {
    char: "庚",
    name: "Geng",
    element: "metal",
    yinYang: "yang"
  }, {
    char: "辛",
    name: "Xin",
    element: "metal",
    yinYang: "yin"
  }, {
    char: "壬",
    name: "Ren",
    element: "water",
    yinYang: "yang"
  }, {
    char: "癸",
    name: "Gui",
    element: "water",
    yinYang: "yin"
  }];
  var BRANCHES = [{
    char: "子",
    name: "Zi",
    element: "water",
    direction: "N"
  }, {
    char: "丑",
    name: "Chou",
    element: "earth",
    direction: "NE"
  }, {
    char: "寅",
    name: "Yin",
    element: "wood",
    direction: "NE"
  }, {
    char: "卯",
    name: "Mao",
    element: "wood",
    direction: "E"
  }, {
    char: "辰",
    name: "Chen",
    element: "earth",
    direction: "E"
  }, {
    char: "巳",
    name: "Si",
    element: "fire",
    direction: "SE"
  }, {
    char: "午",
    name: "Wu",
    element: "fire",
    direction: "S"
  }, {
    char: "未",
    name: "Wei",
    element: "earth",
    direction: "SW"
  }, {
    char: "申",
    name: "Shen",
    element: "metal",
    direction: "SW"
  }, {
    char: "酉",
    name: "You",
    element: "metal",
    direction: "W"
  }, {
    char: "戌",
    name: "Xu",
    element: "earth",
    direction: "NW"
  }, {
    char: "亥",
    name: "Hai",
    element: "water",
    direction: "NW"
  }];

  // Six Instruments + Three Mysteries ordering for the Earth plate
  var YI_QI_SEQUENCE = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];

  // Eight Doors (八门) — native palace mapping
  var DOORS = {
    1: {
      char: "休",
      name: "Rest",
      element: "water",
      nature: "auspicious",
      native: 1
    },
    8: {
      char: "生",
      name: "Life",
      element: "earth",
      nature: "auspicious",
      native: 8
    },
    3: {
      char: "伤",
      name: "Injury",
      element: "wood",
      nature: "inauspicious",
      native: 3
    },
    4: {
      char: "杜",
      name: "Block",
      element: "wood",
      nature: "neutral",
      native: 4
    },
    9: {
      char: "景",
      name: "Scenery",
      element: "fire",
      nature: "neutral",
      native: 9
    },
    2: {
      char: "死",
      name: "Death",
      element: "earth",
      nature: "inauspicious",
      native: 2
    },
    7: {
      char: "惊",
      name: "Fear",
      element: "metal",
      nature: "inauspicious",
      native: 7
    },
    6: {
      char: "开",
      name: "Open",
      element: "metal",
      nature: "auspicious",
      native: 6
    }
  };

  // Eight Deities (八神)
  // Per spec §4 Step 6: Yang uses Hook (勾陈) + Phoenix (朱雀); Yin transforms them to
  // Tiger (白虎) + Tortoise (玄武). DEITIES (below) is the Yin variant; DEITIES_YANG is Yang.
  var DEITIES = [{
    char: "值符",
    name: "Chief (Zhi Fu)",
    element: "earth",
    nature: "auspicious"
  }, {
    char: "腾蛇",
    name: "Snake (Teng She)",
    element: "fire",
    nature: "deceptive"
  }, {
    char: "太阴",
    name: "Yin Moon (Tai Yin)",
    element: "metal",
    nature: "auspicious"
  }, {
    char: "六合",
    name: "Six Harmony (Liu He)",
    element: "wood",
    nature: "auspicious"
  }, {
    char: "白虎",
    name: "White Tiger (Bai Hu)",
    element: "metal",
    nature: "hostile"
  }, {
    char: "玄武",
    name: "Black Tortoise (Xuan Wu)",
    element: "water",
    nature: "deceptive"
  }, {
    char: "九地",
    name: "Nine Earth (Jiu Di)",
    element: "earth",
    nature: "neutral"
  }, {
    char: "九天",
    name: "Nine Heaven (Jiu Tian)",
    element: "metal",
    nature: "auspicious"
  }];

  // Yang deity sequence: Chief, Snake, Moon, Harmony, Hook (勾陈), Phoenix (朱雀), Earth, Heaven.
  var DEITIES_YANG = [{
    char: "值符",
    name: "Chief (Zhi Fu)",
    element: "earth",
    nature: "auspicious"
  }, {
    char: "腾蛇",
    name: "Snake (Teng She)",
    element: "fire",
    nature: "deceptive"
  }, {
    char: "太阴",
    name: "Yin Moon (Tai Yin)",
    element: "metal",
    nature: "auspicious"
  }, {
    char: "六合",
    name: "Six Harmony (Liu He)",
    element: "wood",
    nature: "auspicious"
  }, {
    char: "勾陈",
    name: "Hook (Gou Chen)",
    element: "earth",
    nature: "hostile"
  }, {
    char: "朱雀",
    name: "Phoenix (Zhu Que)",
    element: "fire",
    nature: "deceptive"
  }, {
    char: "九地",
    name: "Nine Earth (Jiu Di)",
    element: "earth",
    nature: "neutral"
  }, {
    char: "九天",
    name: "Nine Heaven (Jiu Tian)",
    element: "metal",
    nature: "auspicious"
  }];

  // Nine Stars (九星) — native palace mapping
  var STARS = {
    1: {
      char: "天蓬",
      name: "Tian Peng",
      element: "water",
      native: 1
    },
    2: {
      char: "天芮",
      name: "Tian Rui",
      element: "earth",
      native: 2
    },
    3: {
      char: "天冲",
      name: "Tian Chong",
      element: "wood",
      native: 3
    },
    4: {
      char: "天辅",
      name: "Tian Fu",
      element: "wood",
      native: 4
    },
    5: {
      char: "天禽",
      name: "Tian Qin",
      element: "earth",
      native: 5
    },
    6: {
      char: "天心",
      name: "Tian Xin",
      element: "metal",
      native: 6
    },
    7: {
      char: "天柱",
      name: "Tian Zhu",
      element: "metal",
      native: 7
    },
    8: {
      char: "天任",
      name: "Tian Ren",
      element: "earth",
      native: 8
    },
    9: {
      char: "天英",
      name: "Tian Ying",
      element: "fire",
      native: 9
    }
  };

  // Nine Palaces (九宫) — Luoshu positions
  var PALACES = {
    4: {
      number: 4,
      name: "Xun (巽)",
      direction: "SE",
      trigram: "巽",
      element: "wood",
      branches: ["辰", "巳"]
    },
    9: {
      number: 9,
      name: "Li (离)",
      direction: "S",
      trigram: "离",
      element: "fire",
      branches: ["午"]
    },
    2: {
      number: 2,
      name: "Kun (坤)",
      direction: "SW",
      trigram: "坤",
      element: "earth",
      branches: ["未", "申"]
    },
    3: {
      number: 3,
      name: "Zhen (震)",
      direction: "E",
      trigram: "震",
      element: "wood",
      branches: ["卯"]
    },
    5: {
      number: 5,
      name: "Center (中宫)",
      direction: "Center",
      trigram: "中",
      element: "earth",
      branches: []
    },
    7: {
      number: 7,
      name: "Dui (兑)",
      direction: "W",
      trigram: "兑",
      element: "metal",
      branches: ["酉"]
    },
    8: {
      number: 8,
      name: "Gen (艮)",
      direction: "NE",
      trigram: "艮",
      element: "earth",
      branches: ["丑", "寅"]
    },
    1: {
      number: 1,
      name: "Kan (坎)",
      direction: "N",
      trigram: "坎",
      element: "water",
      branches: ["子"]
    },
    6: {
      number: 6,
      name: "Qian (乾)",
      direction: "NW",
      trigram: "乾",
      element: "metal",
      branches: ["戌", "亥"]
    }
  };

  // Grid display order (top-left → bottom-right in Luoshu layout)
  var GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

  // 28 Lunar Mansions (二十八宿)
  var LUNAR_MANSIONS = ["角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁", "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"];

  // 24 Solar Terms (二十四节气) — astronomical solar longitude thresholds.
  // `day` = approximate 2026 date (reference only); actual term boundaries are computed
  //   astronomically via apparentSolarLongitude() in solarAstronomy.ts.
  // `longitude` = the solar longitude (degrees) at which each term begins.
  //   Terms are 15° apart, starting from 冬至 (270°) around the solar year.
  // CLASSICAL Ju table per spec §1–§2 (上元/中元/下元). Yang = 冬至→夏至, Yin = 夏至→冬至.
  //   阳遁 pairs: (冬至,惊蛰) (大寒,春分) (清明,立夏) (谷雨,小满)
  //   阴遁 pairs: (夏至,白露) (大暑,秋分) (寒露,立冬) (霜降,小雪)
  // Polarity: Yang from 冬至 (270°) through 夏至 (90°); Yin from 夏至 through 冬至.
  var SOLAR_TERMS = [{
    name: "小寒",
    day: 5,
    longitude: 285,
    yang: true,
    ju: [2, 8, 5]
  }, {
    name: "大寒",
    day: 20,
    longitude: 300,
    yang: true,
    ju: [3, 9, 6]
  }, {
    name: "立春",
    day: 4,
    longitude: 315,
    yang: true,
    ju: [8, 5, 2]
  }, {
    name: "雨水",
    day: 18,
    longitude: 330,
    yang: true,
    ju: [9, 6, 3]
  }, {
    name: "惊蛰",
    day: 5,
    longitude: 345,
    yang: true,
    ju: [1, 7, 4]
  }, {
    name: "春分",
    day: 20,
    longitude: 0,
    yang: true,
    ju: [3, 9, 6]
  }, {
    name: "清明",
    day: 5,
    longitude: 15,
    yang: true,
    ju: [4, 1, 7]
  }, {
    name: "谷雨",
    day: 20,
    longitude: 30,
    yang: true,
    ju: [5, 2, 8]
  }, {
    name: "立夏",
    day: 5,
    longitude: 45,
    yang: true,
    ju: [4, 1, 7]
  }, {
    name: "小满",
    day: 21,
    longitude: 60,
    yang: true,
    ju: [5, 2, 8]
  }, {
    name: "芒种",
    day: 5,
    longitude: 75,
    yang: true,
    ju: [6, 3, 9]
  }, {
    name: "夏至",
    day: 21,
    longitude: 90,
    yang: false,
    ju: [9, 3, 6]
  }, {
    name: "小暑",
    day: 7,
    longitude: 105,
    yang: false,
    ju: [8, 2, 5]
  }, {
    name: "大暑",
    day: 23,
    longitude: 120,
    yang: false,
    ju: [7, 1, 4]
  }, {
    name: "立秋",
    day: 7,
    longitude: 135,
    yang: false,
    ju: [2, 5, 8]
  }, {
    name: "处暑",
    day: 23,
    longitude: 150,
    yang: false,
    ju: [1, 4, 7]
  }, {
    name: "白露",
    day: 7,
    longitude: 165,
    yang: false,
    ju: [9, 3, 6]
  }, {
    name: "秋分",
    day: 23,
    longitude: 180,
    yang: false,
    ju: [7, 1, 4]
  }, {
    name: "寒露",
    day: 8,
    longitude: 195,
    yang: false,
    ju: [6, 9, 3]
  }, {
    name: "霜降",
    day: 23,
    longitude: 210,
    yang: false,
    ju: [5, 8, 2]
  }, {
    name: "立冬",
    day: 7,
    longitude: 225,
    yang: false,
    ju: [6, 9, 3]
  }, {
    name: "小雪",
    day: 22,
    longitude: 240,
    yang: false,
    ju: [5, 8, 2]
  }, {
    name: "大雪",
    day: 7,
    longitude: 255,
    yang: false,
    ju: [4, 7, 1]
  }, {
    name: "冬至",
    day: 22,
    longitude: 270,
    yang: true,
    ju: [1, 7, 4]
  }];

  // Luoshu flying order (palace number sequence for forward/backward flight)
  var FLY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var ELEMENT_COLORS = {
    wood: "#2ECC71",
    fire: "#E74C3C",
    earth: "#D4A017",
    metal: "#F4D03F",
    water: "#3498DB"
  };
  var ELEMENT_NAMES = {
    wood: "Wood",
    fire: "Fire",
    earth: "Earth",
    metal: "Metal",
    water: "Water"
  };

  // Five Tiger Escape month stem starting points
  var TIGER_ESCAPE = {
    甲: 2,
    己: 2,
    // 丙寅
    乙: 4,
    庚: 4,
    // 戊寅
    丙: 6,
    辛: 6,
    // 庚寅
    丁: 8,
    壬: 8,
    // 壬寅
    戊: 0,
    癸: 0 // 甲寅
  };

  // Five Rat Escape hour stem starting points (by day stem)
  var RAT_ESCAPE = {
    甲: 0,
    己: 0,
    // 甲子
    乙: 2,
    庚: 2,
    // 丙子
    丙: 4,
    辛: 4,
    // 戊子
    丁: 6,
    壬: 6,
    // 庚子
    戊: 8,
    癸: 8 // 壬子
  };

  // Hidden stems in each earthly branch
  var HIDDEN_STEMS = {
    子: ["癸"],
    丑: ["己", "辛", "癸"],
    寅: ["甲", "丙", "戊"],
    卯: ["乙"],
    辰: ["戊", "乙", "癸"],
    巳: ["丙", "庚", "戊"],
    午: ["丁", "己"],
    未: ["己", "丁", "乙"],
    申: ["庚", "壬", "戊"],
    酉: ["辛"],
    戌: ["戊", "辛", "丁"],
    亥: ["壬", "甲"]
  };

  // ---------- Circular Rotation (转盘) Constants for Year/Month/Day Charts ----------

  // Clockwise path around 8 outer palaces (SE→S→SW→W→NW→N→NE→E)
  var CLOCKWISE_8 = [4, 9, 2, 7, 6, 1, 8, 3];

  // Door sequence for circular plotting: Rest, Life, Harm, Delusion, Scenery, Death, Fear, Open
  // Values are native palace numbers of each door
  var DOOR_SEQ = [1, 8, 3, 4, 9, 2, 7, 6];

  // Star sequence for circular plotting (clockwise perimeter order per Joey Yap San Yuan):
  // Grass(天蓬,1) → Ambassador(天任,8) → Destructor(天冲,3) → Assistant(天辅,4) →
  // Hero(天英,9) → Grain/Bird(天芮,2) → Pillar(天柱,7) → Heart(天心,6)
  // Values are native palace numbers of each star
  var STAR_SEQ = [1, 8, 3, 4, 9, 2, 7, 6];

  // Yin deity sequence (reverse of Yang): Chief, Heaven, Earth, Tortoise, Tiger, Harmony, Moon, Snake
  var DEITIES_YIN = [{
    char: "值符",
    name: "Chief (Zhi Fu)",
    element: "earth",
    nature: "auspicious"
  }, {
    char: "九天",
    name: "Nine Heaven (Jiu Tian)",
    element: "metal",
    nature: "auspicious"
  }, {
    char: "九地",
    name: "Nine Earth (Jiu Di)",
    element: "earth",
    nature: "neutral"
  }, {
    char: "玄武",
    name: "Black Tortoise (Xuan Wu)",
    element: "water",
    nature: "deceptive"
  }, {
    char: "白虎",
    name: "White Tiger (Bai Hu)",
    element: "metal",
    nature: "hostile"
  }, {
    char: "六合",
    name: "Six Harmony (Liu He)",
    element: "wood",
    nature: "auspicious"
  }, {
    char: "太阴",
    name: "Yin Moon (Tai Yin)",
    element: "metal",
    nature: "auspicious"
  }, {
    char: "腾蛇",
    name: "Snake (Teng She)",
    element: "fire",
    nature: "deceptive"
  }];

  // Ju table for each 三元 (cycle) × 旬 (stream): [Upper, Middle, Lower] × [甲子…甲寅]
  // San Yuan Method: +3 (increasing) pattern within each yuan; yuan bases 1/4/7 for 上/中/下.
  // Year & Month charts: always Yin Dun.
  // Verified: 2020 庚子 (下元·甲午旬) = Ju 7 → Lead Stem 辛 @ palace 4, Lead Star 天辅, Envoy 杜 (Joey Yap ref).
  // Verified: 2026 丙午 (下元·甲辰旬) = Ju 1 (Yin 1); deity placement matches Joey Yap ref.
  // Verified: 2026-05 壬辰 month (下元·甲申旬) = Ju 7 (Yin 7); matches user reference.
  // Verified: 2026-07 甲午 month (下元·甲午旬) = Ju 7 (Yin 7); matches user reference.
  var JU_BY_YUAN = [[1, 4, 7, 1, 4, 7],
  // 上元 Upper Cycle (1864–1923)
  [4, 7, 1, 4, 7, 1],
  // 中元 Middle Cycle (1924–1983)
  [7, 1, 7, 7, 1, 4] // 下元 Lower Cycle (1984–2043)
  ];
  global.QPData = {
    FORMATIONS: FORMATIONS,
    detectFormations: detectFormations,
    formationSeasonalStrength: formationSeasonalStrength,
    FORMATION_CATEGORIES: FORMATION_CATEGORIES,
    CONSTELLATIONS_28: CONSTELLATIONS_28,
    DONG_GONG: DONG_GONG,
    ACTIVITY_EN: ACTIVITY_EN,
    TWELVE_OFFICERS: TWELVE_OFFICERS,
    OFFICER_EN: OFFICER_EN,
    DOORS: DOORS,
    STARS: STARS,
    DEITIES: DEITIES,
    DEITIES_YANG: DEITIES_YANG,
    PALACES: PALACES,
    YI_QI_SEQUENCE: YI_QI_SEQUENCE,
    SOLAR_TERMS: SOLAR_TERMS
  };
})(typeof window !== 'undefined' ? window : globalThis);
