#!/usr/bin/env python3
"""
Geluidsbewerking voor de Roos-opnamen van De Grote Huiskamer Show.

Doel: elke opname even hard.  Doel = -16 LUFS (EBU R128, geintegreerd) met een true peak
van hooguit -1 dBTP (we mikken op -1,5 en laten tot -1 toe).

Waarom niet gewoon ffmpeg's `loudnorm` in een keer?  Dat filter heeft ongeveer 3 seconden nodig om de
geluidssterkte te schatten en meet korte opnames (een los woord als "Uil" of "Rood") daardoor scheef.
In de praktijk kwam meer dan een derde van de clips meer dan 1 LU naast het doel uit, vooral te zacht.
Daarom meten we hier zelf, per opname:

  1. de stilte voor en na de opname wordt (alleen voor de meting) weggeknipt;
  2. korte opnames worden achter elkaar herhaald tot er minstens 2 seconden is, zodat er genoeg
     meetblokken van 400 ms zijn;
  3. de winst wordt uitgerekend en toegepast, met een limiter zodat de pieken binnen de perken blijven;
  4. het resultaat wordt opnieuw gemeten en zo nodig een keer bijgesteld.

Gebruik (alleen ffmpeg en Python 3 nodig, geen extra pakketten):

  python3 scripts/tts_audio.py check DIR     # meet alle clips en toon de verdeling, wijzigt niets
  python3 scripts/tts_audio.py fix DIR       # maakt alle clips die er te ver naast zitten even hard (op hun plek;
                                             # de originelen blijven staan in DIR/_origineel)
  python3 scripts/tts_audio.py selftest      # controleert de routine zelf met synthetische klanken
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import pathlib
import re
import shutil
import statistics
import subprocess
import sys
import tempfile

TARGET_LUFS = -16.0
CEILING_DBTP = -1.5          # hier mikken we op bij het begrenzen van pieken
TOLERANCE_LU = 0.7           # clips binnen dit bereik laten we ongemoeid (opnieuw coderen kost telkens wat kwaliteit)
PEAK_WARN_DBTP = -1.0        # hoogste toegestane true peak; een clip met een hogere piek wordt bijgewerkt
MIN_MEASURE_SECONDS = 2.0    # korter dan dit herhalen we de opname voor de meting
SAMPLE_RATE = 44100
MP3_BITRATE = "80k"

# Zachte voorbewerking van ruwe ElevenLabs-audio (zoals het script altijd deed): rommel onder 80 Hz weg
# en plofjes (p, b, t) licht temmen.
PRE_FILTER = "highpass=f=80,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=60:makeup=3"

# Stilte aan begin en eind weghalen (alleen voor de meting).
_TRIM = (
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03:detection=peak,"
    "areverse,"
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03:detection=peak,"
    "areverse"
)


class AudioError(RuntimeError):
    pass


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError as e:
        raise AudioError("ffmpeg/ffprobe niet gevonden. Installeer ffmpeg (bijv. `brew install ffmpeg`).") from e
    except subprocess.CalledProcessError as e:
        raise AudioError(f"{cmd[0]} faalde: {(e.stderr or '')[-300:]}") from e


def _ffmpeg(*args: str, loglevel: str = "error") -> subprocess.CompletedProcess:
    return _run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-loglevel", loglevel, *args])


def _duration(path: pathlib.Path) -> float:
    out = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def _parse_ebur128(stderr: str) -> tuple[float | None, float | None]:
    i = re.search(r"Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf) LUFS", stderr)
    t = re.search(r"True peak:\s*\n\s*Peak:\s*(-?[\d.]+|-inf) dBFS", stderr)

    def num(m):
        return None if (m is None or m.group(1) == "-inf") else float(m.group(1))

    return num(i), num(t)


def measure(src: pathlib.Path, pre_filter: str | None = None) -> tuple[float, float]:
    """Geef (geintegreerde LUFS, true peak dBTP) van een geluidsbestand.

    Betrouwbaar ook voor korte opnames (zie bovenaan dit bestand)."""
    with tempfile.TemporaryDirectory(prefix="tts-measure-") as tmp:
        tmpd = pathlib.Path(tmp)
        trimmed = tmpd / "trimmed.wav"
        af = (pre_filter + "," if pre_filter else "") + _TRIM
        _ffmpeg("-i", str(src), "-af", af, "-ar", str(SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_f32le", str(trimmed))
        dur = _duration(trimmed)
        if dur < 0.05:
            raise AudioError(f"{src.name}: bijna geen geluid na het wegknippen van stilte")

        target = trimmed
        if dur < MIN_MEASURE_SECONDS:
            looped = tmpd / "looped.wav"
            loops = math.ceil(MIN_MEASURE_SECONDS / dur) - 1
            _ffmpeg(
                "-stream_loop", str(loops), "-i", str(trimmed),
                "-t", f"{MIN_MEASURE_SECONDS + 0.5:.2f}", "-c:a", "pcm_f32le", str(looped),
            )
            target = looped

        res = _ffmpeg("-i", str(target), "-af", "ebur128=peak=true", "-f", "null", "-", loglevel="info")
        lufs, tp = _parse_ebur128(res.stderr)
        if target is not trimmed:
            # De naad tussen twee herhalingen kan een tikje geven; de piek meten we daarom op de echte opname.
            res_tp = _ffmpeg("-i", str(trimmed), "-af", "ebur128=peak=true", "-f", "null", "-", loglevel="info")
            _, tp = _parse_ebur128(res_tp.stderr)
        if lufs is None or tp is None:
            raise AudioError(f"{src.name}: meting mislukt")
        return lufs, tp


def _filter_for(gain_db: float, true_peak_db: float, limit_db: float, force_limiter: bool = False) -> str:
    """Winst toepassen; komt de piek daardoor boven `limit_db`, dan een limiter erachter.

    De limiter draait op 4x oversampled geluid (176,4 kHz): een gewone limiter begrenst alleen de losse
    samples, terwijl de echte (true) piek ertussen tot ruim 1 dB hoger kan uitkomen."""
    f = f"volume={gain_db:.3f}dB"
    if force_limiter or true_peak_db + gain_db > limit_db:
        # alimiter accepteert alleen 0,0625 tot 1; blijf er netjes binnen
        limit = min(0.97, max(0.0625, 10 ** (limit_db / 20)))
        f += (
            f",aresample={SAMPLE_RATE * 4},"
            f"alimiter=limit={limit:.4f}:attack=2:release=50:level=false,"
            f"aresample={SAMPLE_RATE}"
        )
    return f


def _encode(src: pathlib.Path, dst: pathlib.Path, af: str) -> None:
    _ffmpeg(
        "-i", str(src), "-af", af, "-ar", str(SAMPLE_RATE), "-ac", "1",
        "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, str(dst),
    )


def normalize_file(
    src: pathlib.Path,
    dst: pathlib.Path,
    pre_filter: str | None = None,
    max_rounds: int = 5,
) -> dict:
    """Maak `src` even hard als de rest en schrijf het als mp3 naar `dst`.

    Met `pre_filter` wordt eerst de voorbewerking voor ruwe opnames toegepast.
    Geeft een kort rapport terug (voor/na in LUFS en dBTP)."""
    with tempfile.TemporaryDirectory(prefix="tts-norm-") as tmp:
        tmpd = pathlib.Path(tmp)
        source = src
        if pre_filter:
            # Eerst de voorbewerking naar een float-wav, dan hoeft er maar een keer naar mp3 te worden gecodeerd.
            pre = tmpd / "pre.wav"
            _ffmpeg("-i", str(src), "-af", pre_filter, "-ar", str(SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_f32le", str(pre))
            source = pre

        before_l, before_tp = measure(source)
        gain = TARGET_LUFS - before_l
        peak_aim = PEAK_WARN_DBTP - 0.2          # hier moet de piek na het coderen ongeveer op uitkomen
        limit_db = peak_aim - 0.6                # begin iets lager: mp3-coderen voegt zelf ook wat piek toe
        force_limiter = False
        out_tmp = tmpd / "out.mp3"
        cand_tmp = tmpd / "cand.mp3"
        best: tuple[tuple[float, float], float, float, float] | None = None  # (score, lufs, tp, gain)

        for _ in range(max_rounds):
            _encode(source, cand_tmp, _filter_for(gain, before_tp, limit_db, force_limiter))
            after_l, after_tp = measure(cand_tmp)
            tp_excess = max(0.0, after_tp - PEAK_WARN_DBTP)   # tot -1 dBTP is prima (gangbare norm)
            l_err = abs(after_l - TARGET_LUFS)
            score = (tp_excess, l_err)           # eerst de piek in orde, dan zo dicht mogelijk bij het doel
            if best is None or score < best[0]:
                best = (score, after_l, after_tp, gain)
                shutil.copyfile(cand_tmp, out_tmp)
            if tp_excess == 0 and l_err <= 0.3:
                break
            if tp_excess > 0:
                limit_db = max(-12.0, limit_db - (tp_excess + 0.2))   # piek te hoog: limiter strakker
                force_limiter = True
            elif after_l < TARGET_LUFS - 0.3 and after_tp < peak_aim - 0.1:
                # Te zacht terwijl er nog ruimte in de piek zit: limiter ruimer, zodat er meer volume bij kan
                limit_db = min(-0.3, limit_db + (peak_aim - after_tp))
                force_limiter = True
            gain = max(-24.0, min(24.0, gain + (TARGET_LUFS - after_l)))

        assert best is not None
        _, after_l, after_tp, gain = best
        dst.parent.mkdir(parents=True, exist_ok=True)
        tmp_dst = dst.with_name(dst.name + ".tmp")
        shutil.copyfile(out_tmp, tmp_dst)
        os.replace(tmp_dst, dst)
        return {
            "before_lufs": round(before_l, 2), "before_tp": round(before_tp, 2),
            "after_lufs": round(after_l, 2), "after_tp": round(after_tp, 2),
            "gain_db": round(gain, 2),
        }


def process_raw_mp3(raw: bytes, dst: pathlib.Path) -> dict:
    """Ruwe ElevenLabs-mp3 (bytes) -> voorbewerkt, even hard en klaar voor de show."""
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(raw)
        raw_path = pathlib.Path(f.name)
    try:
        return normalize_file(raw_path, dst, pre_filter=PRE_FILTER)
    finally:
        try:
            raw_path.unlink()
        except OSError:
            pass


# ----------------------------------------------------------------------------- map-bewerkingen
def _measure_folder(folder: pathlib.Path, workers: int) -> list[tuple[pathlib.Path, float | None, float | None, str]]:
    files = sorted(folder.glob("*.mp3"))

    def one(p: pathlib.Path):
        try:
            lufs, tp = measure(p)
            return p, lufs, tp, ""
        except AudioError as e:
            return p, None, None, str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        return list(ex.map(one, files))


def _is_ok(lufs: float, tp: float) -> bool:
    """Hoeft deze clip niet (opnieuw) bewerkt te worden?"""
    if tp > PEAK_WARN_DBTP:
        return False
    dev = lufs - TARGET_LUFS
    if abs(dev) <= TOLERANCE_LU:
        return True
    # Te zacht (tot 1 LU), maar de piek zit al tegen de grens: harder kan alleen met een ruwere limiter.
    # Zulke clips (meestal een kort woord met een plofklank) laten we met rust, zodat een nieuwe run ze niet
    # telkens opnieuw codeert zonder dat het beter wordt.
    return -1.0 <= dev < 0 and tp >= PEAK_WARN_DBTP - 0.8


def _summary(rows) -> str:
    good = [(p, l, t) for p, l, t, e in rows if l is not None and t is not None]
    errs = [(p, e) for p, l, t, e in rows if l is None]
    if not good:
        return "Geen meetbare clips gevonden."
    ls = sorted(l for _, l, _ in good)
    n = len(ls)
    out = [
        f"Clips: {len(rows)} (meetbaar {n}, niet meetbaar {len(errs)})",
        f"Geluidssterkte (LUFS): mediaan {statistics.median(ls):.2f} | gemiddelde {statistics.mean(ls):.2f} | "
        f"p5 {ls[int(0.05 * n)]:.2f} | p95 {ls[min(n - 1, int(0.95 * n))]:.2f} | laagste {ls[0]:.2f} | hoogste {ls[-1]:.2f}",
    ]
    for lim in (0.5, 1.0, 2.0, 3.0):
        c = sum(1 for x in ls if abs(x - TARGET_LUFS) > lim)
        out.append(f"  meer dan {lim:g} LU van {TARGET_LUFS:g}: {c} clips ({100 * c / n:.1f}%)")
    tps = [t for _, _, t in good]
    out.append(f"True peak: hoogste {max(tps):.2f} dBTP | boven {PEAK_WARN_DBTP:g} dBTP: {sum(1 for t in tps if t > PEAK_WARN_DBTP)} clips")
    bad = sum(1 for _, l, t in good if not _is_ok(l, t))
    out.append(f"Moet bijgewerkt worden (buiten +/-{TOLERANCE_LU:g} LU of piek te hoog): {bad} clips")
    for p, e in errs[:5]:
        out.append(f"  niet meetbaar: {p.name}: {e}")
    return "\n".join(out)


def cmd_check(folder: pathlib.Path, workers: int) -> int:
    rows = _measure_folder(folder, workers)
    print(_summary(rows))
    bad = sum(1 for _, l, t, _ in rows if l is not None and not _is_ok(l, t))
    return 1 if bad else 0


BACKUP_DIRNAME = "_origineel"   # de server en install-tts.sh negeren submappen


def cmd_fix(folder: pathlib.Path, workers: int, backup: bool = True) -> int:
    rows = _measure_folder(folder, workers)
    print("VOOR:\n" + _summary(rows) + "\n", flush=True)
    todo = [p for p, l, t, _ in rows if l is not None and t is not None and not _is_ok(l, t)]

    if backup and todo:
        # Opnieuw coderen is niet terug te draaien: bewaar eerst het origineel (nooit een eerdere kopie overschrijven)
        bdir = folder / BACKUP_DIRNAME
        bdir.mkdir(exist_ok=True)
        saved = 0
        for p in todo:
            target = bdir / p.name
            if not target.exists():
                shutil.copy2(p, target)
                saved += 1
        print(f"Originelen bewaard in {bdir} ({saved} nieuwe kopieen; zet --no-backup om dit over te slaan)", flush=True)

    print(f"Bijwerken: {len(todo)} clips ...", flush=True)

    def work(p: pathlib.Path):
        try:
            return p, normalize_file(p, p), ""
        except AudioError as e:
            return p, None, str(e)

    failed = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for p, rep, err in ex.map(work, todo):
            if err:
                failed.append((p, err))
    after = _measure_folder(folder, workers)
    print("NA:\n" + _summary(after), flush=True)
    for p, e in failed[:10]:
        print(f"MISLUKT {p.name}: {e}")
    still_bad = sum(1 for _, l, t, _ in after if l is not None and not _is_ok(l, t))
    return 1 if (failed or still_bad) else 0


# ----------------------------------------------------------------------------- zelftest
def cmd_selftest() -> int:
    """Synthetische klanken met allerlei duur en niveau; na bewerken moet alles op -16 LUFS liggen."""
    cases = []
    for dur in (0.3, 0.8, 1.5, 3.0, 6.0):
        for level_db in (-32, -22, -12, -6):
            cases.append((dur, level_db))
    problems = []
    with tempfile.TemporaryDirectory(prefix="tts-selftest-") as tmp:
        tmpd = pathlib.Path(tmp)
        for dur, level in cases:
            raw = tmpd / f"raw_{dur}_{level}.mp3"
            # "stem-achtig": een paar harmonischen met een trillende amplitude, stilte aan beide kanten
            expr = f"0.5*sin(2*PI*180*t)+0.3*sin(2*PI*540*t)+0.2*sin(2*PI*1500*t)"
            af = (
                f"volume={level}dB,adelay=120|120,apad=pad_dur=0.12,"
                f"tremolo=f=5:d=0.5"
            )
            _ffmpeg(
                "-f", "lavfi", "-i", f"aevalsrc='{expr}':s={SAMPLE_RATE}:d={dur}",
                "-af", af, "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", str(raw),
            )
            dst = tmpd / f"out_{dur}_{level}.mp3"
            rep = normalize_file(raw, dst, pre_filter=PRE_FILTER)
            ok = abs(rep["after_lufs"] - TARGET_LUFS) <= 0.5 and rep["after_tp"] <= CEILING_DBTP + 0.3
            status = "ok " if ok else "FOUT"
            print(f"  {status} duur {dur:>3}s niveau {level:>4} dB: {rep['before_lufs']:>7.1f} -> {rep['after_lufs']:>6.2f} LUFS, "
                  f"piek {rep['after_tp']:>6.2f} dBTP")
            if not ok:
                problems.append((dur, level, rep))
        # Klanken met harde tikken (zoals een p of k): hier moet de limiter de pieken binnen de grens houden
        for dur in (0.6, 3.0):
            raw = tmpd / f"raw_peaky_{dur}.mp3"
            expr = "0.15*sin(2*PI*220*t)+0.95*lt(mod(t\\,0.25)\\,0.0015)"
            _ffmpeg(
                "-f", "lavfi", "-i", f"aevalsrc='{expr}':s={SAMPLE_RATE}:d={dur}",
                "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", str(raw),
            )
            dst = tmpd / f"out_peaky_{dur}.mp3"
            rep = normalize_file(raw, dst, pre_filter=PRE_FILTER)
            ok = abs(rep["after_lufs"] - TARGET_LUFS) <= 1.0 and rep["after_tp"] <= PEAK_WARN_DBTP
            status = "ok " if ok else "FOUT"
            print(f"  {status} duur {dur:>3}s met tikken:     {rep['before_lufs']:>7.1f} -> {rep['after_lufs']:>6.2f} LUFS, "
                  f"piek {rep['after_tp']:>6.2f} dBTP")
            cases.append((dur, "tikken"))
            if not ok:
                problems.append((dur, "tikken", rep))
    print("\nZELFTEST " + ("GESLAAGD" if not problems else f"MISLUKT ({len(problems)} van {len(cases)})"))
    return 1 if problems else 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Geluidsbewerking voor de Roos-opnamen")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, helptxt in (("check", "meet alle clips in een map en toon de verdeling"),
                          ("fix", "maak alle clips die er te ver naast zitten even hard (op hun plek)")):
        p = sub.add_parser(name, help=helptxt)
        p.add_argument("dir", type=pathlib.Path)
        p.add_argument("--workers", type=int, default=max(2, (os.cpu_count() or 4)))
        if name == "fix":
            p.add_argument("--no-backup", action="store_true",
                           help=f"geen kopie van de originelen bewaren in <map>/{BACKUP_DIRNAME}")
    sub.add_parser("selftest", help="controleer de routine met synthetische klanken")
    pr = sub.add_parser("process-raw", help="ruwe opname (mp3) voorbewerken en even hard maken")
    pr.add_argument("src", type=pathlib.Path)
    pr.add_argument("dst", type=pathlib.Path)
    args = ap.parse_args()

    try:
        if args.cmd == "selftest":
            return cmd_selftest()
        if args.cmd == "process-raw":
            print(json.dumps(normalize_file(args.src, args.dst, pre_filter=PRE_FILTER)))
            return 0
        if not args.dir.is_dir():
            print(f"Map niet gevonden: {args.dir}", file=sys.stderr)
            return 2
        if args.cmd == "check":
            return cmd_check(args.dir, args.workers)
        return cmd_fix(args.dir, args.workers, backup=not args.no_backup)
    except AudioError as e:
        print(f"Fout: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
