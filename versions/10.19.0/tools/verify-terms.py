#!/usr/bin/env python3
"""Cross-check the solar term table against three independent sources.

1. PyEphem (VSOP87), every term from 1900 to 2100.
2. Published times computed from the DE431 ephemeris (chengxua.com), which also lists the government calendar's times.
3. The Sun theory of the 曆象考成後編 (1742), reproduced from its own constants (卷四 推日躔用數), which shows how far the
   historical calendar's terms sit from the true solar position.
Usage: python tools/verify-terms.py   (from the project root; needs pyswisseph and ephem)
"""
import json
import math
import re

import ephem
import swisseph as swe

src = open('www/js/ephem-terms.js', encoding='utf-8').read()
T = json.loads(src[src.index('QP_TERMS = ') + 11:src.rindex(';')])
NAMES = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒']


def term_jd(year, i):
    return T['jd0'] + T['sec'][year - T['from']][i] / 86400


def sun_ephem(d):
    s = ephem.Sun()
    s.compute(d, epoch=d)
    return math.degrees(ephem.Ecliptic(ephem.Equatorial(s.g_ra, s.g_dec, epoch=d)).lon) % 360


def check_ephem():
    errs = []
    for y in range(1900, 2101):
        for i in range(24):
            target, d = (315 + i * 15) % 360, term_jd(y, i) - 2415020
            for _ in range(6):
                d -= ((sun_ephem(d) - target + 180) % 360 - 180) / 0.9856
            errs.append(abs(term_jd(y, i) - 2415020 - d) * 86400)
    print('PyEphem, 1900-2100: %d terms, mean %.1f s, max %.1f s' % (len(errs), sum(errs) / len(errs), max(errs)))


# (year, term index, DE431 time at UT1+8, government calendar time), all as month, day, hour, minute.
DE431 = [(1912, 19, (11, 22, 23, 48), (11, 23, 0, 39)), (1913, 15, (9, 23, 23, 53), (9, 24, 0, 48)), (1917, 20, (12, 8, 0, 1), (12, 7, 23, 47)),
         (1927, 14, (9, 9, 0, 5), (9, 8, 23, 52)), (1928, 9, (6, 22, 0, 6), (6, 21, 23, 53))]


def to_jd(y, mdhm, offset=8.0):
    m, d, h, mi = mdhm
    return swe.julday(y, m, d, h + mi / 60 - offset)


# --- 曆象考成後編: 雍正元年癸卯天正冬至為元 ---
YEAR, DAILY = 365.23433442 + 0.008, 3548.3290897 / 3600   # 周歲 365.24233442 days; 太陽每日平行 3548.3290897 seconds of arc
QI_YING, PERIGEE0, ECC, PERIGEE_YEAR = 32.12254, 8 + 7 / 60 + 32.37 / 3600, 0.0169, 62.98 / 3600   # 氣應, 最卑應, 兩心差, 最卑每歲平行 (62.98" is from memory)
LMT = 116.4667 / 15                                       # the calendar was reckoned for 京師 (Beijing local time)


def lk_epoch():
    """JD (local) of the 癸卯 天正冬至: the day whose sexagenary number is 氣應 in the 60-day cycle, December 1722."""
    jd = swe.julday(1722, 12, 15, 0.0, swe.JUL_CAL if False else swe.GREG_CAL)
    base = int(jd + 0.5)
    for n in range(20):
        if (base + n + 49) % 60 == int(QI_YING):
            return base + n - 0.5 + (QI_YING - int(QI_YING))
    raise ValueError


def lk_true(days, n):
    """實行, the Sun's true position from the winter solstice point, `days` after 天正冬至 of year n after the epoch."""
    mean = (days * DAILY) % 360
    perigee = PERIGEE0 + n * PERIGEE_YEAR + days * PERIGEE_YEAR / YEAR
    M = math.radians(mean - perigee)
    E = M
    for _ in range(10):
        E = M + ECC * math.sin(E)
    v = 2 * math.atan2(math.sqrt(1 + ECC) * math.sin(E / 2), math.sqrt(1 - ECC) * math.cos(E / 2))
    return (perigee + math.degrees(v)) % 360


def lk_term(y, i):
    """A term of Gregorian year y on the Kaocheng theory; returns JD (UT). Term i counts from 立春 of year y."""
    k = (i + 3) % 24           # 15-degree steps after 冬至: 立春 is the third
    jan = i >= 21              # 冬至, 小寒 and 大寒 belong to the next year's count
    n = y - 1723 + (1 if jan else 0)
    t0 = lk_epoch() + n * (365.24233442)
    d = k * 15 / DAILY
    for _ in range(8):
        d -= ((lk_true(d, n) - k * 15 + 180) % 360 - 180) / DAILY
    return t0 + d - LMT / 24


def check_lk():
    print('\nKnown calendar and DE431 values (minutes; + means later than the table):')
    for y, i, de, gov in DE431:
        t = term_jd(y, i)
        print('  %d %s  DE431 %+.1f  | calendar %+.1f  | Kaocheng theory vs calendar %+.1f' % (
            y, NAMES[i], (to_jd(y, de) - t) * 1440, (to_jd(y, gov) - t) * 1440, (lk_term(y, i) - to_jd(y, gov)) * 1440))
    diffs = []
    for y in range(1743, 1912):
        for i in range(24):
            diffs.append((lk_term(y, i) - (term_jd(y, i) if y >= T['from'] else sw_term(y, i))) * 1440)
    a = [abs(x) for x in diffs]
    print('Kaocheng theory vs Swiss Ephemeris, 1743-1911: mean %.1f min, max %.1f min, mean signed %+.1f min' % (sum(a) / len(a), max(a), sum(diffs) / len(diffs)))


def sw_term(y, i):
    target, jd = (315 + i * 15) % 360, swe.julday(y, 2, 4, 0.0) + i * 15.22
    for _ in range(12):
        jd -= ((swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)[0][0] - target + 180) % 360 - 180) / 0.9856
    return jd


if __name__ == '__main__':
    print('Swiss Ephemeris', swe.version)
    check_ephem()
    check_lk()
