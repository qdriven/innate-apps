#!/usr/bin/env python3
"""Fetch plain + synced (LRC) lyrics from LRCLIB into a local data directory.

Pure standard library, no third-party dependencies. Lyrics are a separate
copyright from the recording: this script writes files to your local disk for
personal use and deliberately never prints lyric text to stdout.

Usage (either cwd works; paths are derived from this file's location):
    python3 innate-music/scripts/fetch-lyrics.py
    python3 scripts/fetch-lyrics.py --artist "The Cure" --track "Just Like Heaven"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://lrclib.net/api"
UA = "innate-music/0.1 (personal local use)"
ROOT = Path(__file__).resolve().parents[1]  # innate-music/ — project root, not workspace root
DATA = ROOT / "data"


def _get(url: str, retries: int = 2) -> list[dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < retries:
                wait = float(exc.headers.get("Retry-After", "5")) + 0.3
                print(f"  rate limited, retry in {wait:.1f}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("unreachable")


def search(track: str, artist: str) -> list[dict]:
    qs = urllib.parse.urlencode({"track_name": track, "artist_name": artist})
    return _get(f"{API}/search?{qs}")


def clean(value: object) -> str:
    """LRCLIB sometimes ships NUL-separated repeated tags: 'The Cure\\x00The Cure'."""
    parts = dict.fromkeys(
        s.strip() for s in str(value or "").split("\x00") if s.strip()
    )
    return " / ".join(parts)


def pick(rows: list[dict], duration: float, album: str | None) -> dict:
    """Prefer the exact album, then the closest duration."""
    candidates = [
        r for r in rows
        if r.get("syncedLyrics") and not r.get("instrumental")
    ]
    if not candidates:
        raise SystemExit("no record with synced lyrics found")
    if album:
        exact = [
            r for r in candidates
            if album.lower() in str(r.get("albumName", "")).lower()
        ]
        if exact:
            candidates = exact
    return min(candidates, key=lambda r: abs(float(r.get("duration") or 0) - duration))


def main() -> None:
    p = argparse.ArgumentParser(description="Fetch plain + LRC lyrics from LRCLIB")
    p.add_argument("--artist", default="The Cure")
    p.add_argument("--track", default="Just Like Heaven")
    p.add_argument("--album", default="Kiss Me, Kiss Me, Kiss Me")
    p.add_argument("--duration", type=float, default=212.0, help="track length in seconds")
    p.add_argument("--outdir", type=Path, default=DATA)
    args = p.parse_args()

    print(f"query   : {args.artist} — {args.track}")
    rows = search(args.track, args.artist)
    print(f"records : {len(rows)}")

    hit = pick(rows, args.duration, args.album)
    artist = clean(hit.get("artistName"))
    print("selected:")
    print(f"  id       : {hit.get('id')}")
    print(f"  track    : {clean(hit.get('trackName'))}")
    print(f"  artist   : {artist}")
    print(f"  album    : {clean(hit.get('albumName'))}")
    print(f"  duration : {hit.get('duration')}s")

    args.outdir.mkdir(parents=True, exist_ok=True)
    stem = re.sub(r"[^a-z0-9]+", "-", f"{args.artist}-{args.track}".lower()).strip("-")
    print(f"written to: {args.outdir}")

    for suffix, key in (("lrc", "syncedLyrics"), ("txt", "plainLyrics")):
        text = hit.get(key) or ""
        path = args.outdir / f"{stem}.{suffix}"
        path.write_text(text, encoding="utf-8")
        print(f"  {path.name:<34} {len(text.splitlines()):>3} lines / {path.stat().st_size:>5} bytes")

    stamps = [
        line.split("]", 1)[0] + "]"
        for line in (hit.get("syncedLyrics") or "").splitlines()
        if line.startswith("[")
    ]
    if stamps:
        print(f"LRC timeline: {len(stamps)} cues, {stamps[0]} → {stamps[-1]}")
    print("(lyric text is written to disk only, never echoed here)")


if __name__ == "__main__":
    main()
