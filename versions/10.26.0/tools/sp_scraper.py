#!/usr/bin/env python3
"""
Singapore Pools results scraper for QiPath Pro.

Why this exists as a separate script rather than a feature inside the app:
singaporepools.com.sg sends no Access-Control-Allow-Origin header, so no browser
or WebView may read it. That is their server's policy and no client-side change
can work around it. This script runs outside the browser, where the restriction
does not apply.

Output is CSV in exactly the schema the app's importer accepts, which is also the
schema of the community dataset at
https://github.com/foooooooooooooooooooooooooootw/Singapore-Pools-Dataset

    4D    draw_number,number,date        one row per prize-winning number
    TOTO  draw_number,number,date        number is a list of 7: 6 winning + additional

Usage
-----
    pip install requests beautifulsoup4 pandas lxml

    python sp_scraper.py --game 4d   --latest            # most recent draw only
    python sp_scraper.py --game toto --last 20           # last 20 draws
    python sp_scraper.py --game both --last 50 --out ./data
    python sp_scraper.py --game 4d --merge 4d_prizes.csv # append new draws to an existing file

Then import the CSV on the app's Numbers > Past results tab, or commit it to your
own fork of the dataset repository.

A note on courtesy: this fetches one page per draw with a delay between requests.
Leave the delay in place. Scraping a public results page for personal use is
ordinarily fine, but check the site's terms yourself before running it at volume,
and do not redistribute their data in ways their terms forbid.
"""

from __future__ import annotations

import argparse
import base64
import csv
import os
import re
import sys
import time
from datetime import datetime
from typing import Iterable

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Missing dependencies. Run:  pip install requests beautifulsoup4 pandas lxml")

try:
    import pandas as pd
except ImportError:
    pd = None  # pandas is optional; plain csv is used when it is absent


BASE = "https://www.singaporepools.com.sg"
PAGES = {
    "4d":   f"{BASE}/en/product/Pages/4d_results.aspx",
    "toto": f"{BASE}/en/product/Pages/toto_results.aspx",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-SG,en;q=0.9",
}

DELAY = 1.5          # seconds between requests
TIMEOUT = 30


# --------------------------------------------------------------------------- #
# fetching
# --------------------------------------------------------------------------- #

def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def sppl(draw_number: str | int) -> str:
    """
    The results pages select a past draw with a ?sppl= query parameter holding
    base64 of 'DrawNumber=<n>'. Confirmed by inspecting the draw dropdown, whose
    option values are already encoded this way.
    """
    return base64.b64encode(f"DrawNumber={draw_number}".encode()).decode()


def fetch(session: requests.Session, url: str) -> str:
    r = session.get(url, timeout=TIMEOUT)
    r.raise_for_status()
    return r.text


def draw_options(html: str) -> list[tuple[str, str]]:
    """
    Read the draw-selector dropdown.
    Returns [(sppl_value, visible_label), ...] with the newest draw first.
    """
    soup = BeautifulSoup(html, "html.parser")
    out: list[tuple[str, str]] = []
    for select in soup.find_all("select"):
        opts = select.find_all("option")
        if len(opts) < 2:
            continue
        vals = [(o.get("value") or "").strip() for o in opts]
        # The draw dropdown's values are base64 blobs, not plain text.
        if sum(1 for v in vals if len(v) > 12 and re.fullmatch(r"[A-Za-z0-9+/=]+", v)) < 2:
            continue
        for o in opts:
            v = (o.get("value") or "").strip()
            if v:
                out.append((v, o.get_text(strip=True)))
        if out:
            break
    return out


def decode_draw_no(value: str) -> str | None:
    try:
        txt = base64.b64decode(value).decode(errors="ignore")
    except Exception:
        return None
    m = re.search(r"DrawNumber=(\d+)", txt)
    return m.group(1) if m else None


# --------------------------------------------------------------------------- #
# parsing
# --------------------------------------------------------------------------- #

DATE_RE = re.compile(
    r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})", re.I
)
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def find_date(text: str) -> str | None:
    m = DATE_RE.search(text)
    if not m:
        m2 = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", text)
        if m2:
            return f"{m2.group(1)}/{int(m2.group(2)):02d}/{int(m2.group(3)):02d}"
        return None
    day, mon, year = int(m.group(1)), MONTHS[m.group(2).lower()[:3]], int(m.group(3))
    return f"{year}/{mon:02d}/{day:02d}"


def find_draw_no(text: str) -> str | None:
    m = re.search(r"Draw\s*(?:No\.?|Number)\s*:?\s*(\d+)", text, re.I)
    return m.group(1) if m else None


def parse_4d(html: str) -> dict | None:
    """
    Pull one 4D draw: 1st, 2nd, 3rd, 10 starters, 10 consolation — in prize order,
    which is the order the dataset stores them in.
    """
    soup = BeautifulSoup(html, "html.parser")
    page_text = soup.get_text(" ", strip=True)
    date = find_date(page_text)
    draw_no = find_draw_no(page_text)
    if not date:
        return None

    top: list[str] = []
    for cls in ("tdFirstPrize", "tdSecondPrize", "tdThirdPrize"):
        el = soup.find(class_=cls)
        if el:
            v = el.get_text(strip=True)
            if re.fullmatch(r"\d{4}", v):
                top.append(v)

    starters: list[str] = []
    consolation: list[str] = []
    for tbl in soup.find_all("table"):
        head = tbl.get_text(" ", strip=True).lower()
        nums = re.findall(r"\b\d{4}\b", tbl.get_text(" ", strip=True))
        if "starter" in head and not starters:
            starters = [n for n in nums if n != draw_no][:10]
        elif "consolation" in head and not consolation:
            consolation = [n for n in nums if n != draw_no][:10]

    # Fallback: take the first 23 four-digit numbers on the page in document order.
    if len(top) < 3 or not starters:
        allnums = re.findall(r"\b\d{4}\b", page_text)
        year = date[:4]
        allnums = [n for n in allnums if n != year and n != draw_no]
        if len(allnums) >= 23:
            top, starters, consolation = allnums[:3], allnums[3:13], allnums[13:23]

    prizes = top + starters + consolation
    if len(prizes) < 3:
        return None
    return {"draw_number": draw_no or "", "date": date, "prizes": prizes}


def parse_toto(html: str) -> dict | None:
    """Pull one TOTO draw: six winning numbers plus the additional number."""
    soup = BeautifulSoup(html, "html.parser")
    page_text = soup.get_text(" ", strip=True)
    date = find_date(page_text)
    draw_no = find_draw_no(page_text)
    if not date:
        return None

    winning = [t.get_text(strip=True) for t in soup.find_all(class_="win")]
    winning = [w for w in winning if w.isdigit()]
    add_el = soup.find(class_="additional")
    additional = add_el.get_text(strip=True) if add_el and add_el.get_text(strip=True).isdigit() else None

    if len(winning) < 6 or additional is None:
        # Fallback: the winning-numbers table holds exactly seven cells of 1-49.
        for tbl in soup.find_all("table"):
            cells = [c.get_text(strip=True) for c in tbl.find_all(["td", "th"])]
            nums = [c for c in cells if c.isdigit() and 1 <= int(c) <= 49]
            if len(nums) >= 7:
                winning, additional = nums[:6], nums[6]
                break

    if len(winning) < 6 or additional is None:
        return None
    nums = [f"{int(w):02d}" for w in winning[:6]] + [f"{int(additional):02d}"]
    if len(set(nums[:6])) != 6:
        return None
    return {"draw_number": draw_no or "", "date": date, "numbers": nums}


# --------------------------------------------------------------------------- #
# scraping
# --------------------------------------------------------------------------- #

def scrape(game: str, count: int, verbose: bool = True) -> list[dict]:
    session = make_session()
    url = PAGES[game]
    if verbose:
        print(f"[{game}] fetching {url}")
    first = fetch(session, url)

    opts = draw_options(first)
    if verbose:
        print(f"[{game}] {len(opts)} draws listed in the selector")

    parser = parse_4d if game == "4d" else parse_toto
    rows: list[dict] = []

    seed = parser(first)
    if seed:
        rows.append(seed)
        if verbose:
            print(f"[{game}] latest draw {seed['draw_number']} on {seed['date']}")

    if count > 1 and opts:
        seen = {r["draw_number"] for r in rows}
        for value, label in opts:
            if len(rows) >= count:
                break
            dn = decode_draw_no(value)
            if dn and dn in seen:
                continue
            time.sleep(DELAY)
            try:
                html = fetch(session, f"{url}?sppl={value}")
                rec = parser(html)
            except Exception as exc:
                if verbose:
                    print(f"[{game}] draw {dn or label}: {exc}")
                continue
            if not rec:
                if verbose:
                    print(f"[{game}] draw {dn or label}: could not parse")
                continue
            if not rec["draw_number"] and dn:
                rec["draw_number"] = dn
            if rec["draw_number"] in seen:
                continue
            seen.add(rec["draw_number"])
            rows.append(rec)
            if verbose:
                print(f"[{game}] draw {rec['draw_number']} on {rec['date']}")

    return rows


# --------------------------------------------------------------------------- #
# output
# --------------------------------------------------------------------------- #

def to_records(game: str, rows: Iterable[dict]) -> list[dict]:
    """Flatten to the dataset schema: draw_number,number,date."""
    out: list[dict] = []
    for r in rows:
        if game == "4d":
            for n in r["prizes"]:
                out.append({"draw_number": r["draw_number"], "number": n, "date": r["date"]})
        else:
            listed = "[" + ", ".join(f"'{n}'" for n in r["numbers"]) + "]"
            out.append({"draw_number": r["draw_number"], "number": listed, "date": r["date"]})
    return out


def write_csv(records: list[dict], path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    if pd is not None:
        pd.DataFrame(records, columns=["draw_number", "number", "date"]).to_csv(
            path, index=False)
    else:
        with open(path, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["draw_number", "number", "date"])
            w.writeheader()
            w.writerows(records)
    print(f"wrote {len(records)} rows -> {path}")


def merge_csv(records: list[dict], path: str) -> None:
    """Append only draws the existing file does not already contain."""
    existing: list[dict] = []
    have: set[str] = set()
    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                existing.append(row)
                have.add(f"{row.get('draw_number','')}|{row.get('date','')}")
    fresh = [r for r in records if f"{r['draw_number']}|{r['date']}" not in have]
    if not fresh:
        print(f"{path}: already up to date ({len(existing)} rows)")
        return
    write_csv(existing + fresh, path)
    print(f"added {len(fresh)} new rows")


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape Singapore Pools 4D / TOTO results.")
    ap.add_argument("--game", choices=["4d", "toto", "both"], default="both")
    ap.add_argument("--last", type=int, default=1, help="how many recent draws to fetch")
    ap.add_argument("--latest", action="store_true", help="shorthand for --last 1")
    ap.add_argument("--out", default=".", help="output directory")
    ap.add_argument("--merge", help="append into this existing CSV instead of overwriting")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between requests")
    args = ap.parse_args()

    globals()["DELAY"] = max(0.5, args.delay)
    count = 1 if args.latest else max(1, args.last)
    games = ["4d", "toto"] if args.game == "both" else [args.game]

    stamp = datetime.now().strftime("%Y%m%d")
    failures = 0

    for game in games:
        try:
            rows = scrape(game, count)
        except Exception as exc:
            print(f"[{game}] failed: {exc}", file=sys.stderr)
            failures += 1
            continue
        if not rows:
            print(f"[{game}] nothing parsed. The page layout may have changed — "
                  f"open the URL in a browser and compare it against parse_{game}().",
                  file=sys.stderr)
            failures += 1
            continue
        records = to_records(game, rows)
        if args.merge and len(games) == 1:
            merge_csv(records, args.merge)
        else:
            name = "4d_prizes" if game == "4d" else "toto_prizes"
            write_csv(records, os.path.join(args.out, f"{name}_{stamp}.csv"))

    return 1 if failures == len(games) else 0


if __name__ == "__main__":
    raise SystemExit(main())
