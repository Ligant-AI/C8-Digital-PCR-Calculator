"""Independent check of every number in the example records.

Written from the tool's documented relations (order of evaluation 1) and the display rule,
not from the engine. For each record it reads only the record's own inputs,
recomputes every result two ways, and compares:

  * a Decimal reference at 40 digits, against the record's unrounded value
    (relative difference reported; must be at most 1e-15);
  * the IEEE double path with lambda = -log1p(-p), against the record's
    unrounded value (must be equal, or within 1e-15 relative);
  * the display string, made here from the record's unrounded value by the
    display rule (half away from zero on the exact binary value, once), against
    the record's display string (must be identical).

Run with python3 -I check-arithmetic.py [folder]. The folder holds the schema
and examples/; by default it is this script's folder or the one above it.
Standard library only.
"""

import json
import math
import os
import sys
from decimal import Decimal, getcontext, ROUND_HALF_UP

getcontext().prec = 40
HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = "ligant-benchtools-record-1.0.0.schema.json"


def root_folder():
    """The folder holding the schema and examples/: the first argument, else beside this script, else one level up."""
    for candidate in ([sys.argv[1]] if len(sys.argv) > 1 else []) + [HERE, os.path.join(HERE, "..")]:
        if os.path.isfile(os.path.join(candidate, SCHEMA_FILE)) and os.path.isdir(os.path.join(candidate, "examples")):
            return os.path.abspath(candidate)
    sys.exit(f"No {SCHEMA_FILE} with an examples/ folder beside it found. Give the folder as the first argument.")


EXAMPLES = os.path.join(root_folder(), "examples")
SUP = str.maketrans("0123456789-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻")
DIGITS = "0123456789"


def shift(text, unit):
    """Unit conversion on the entered text: nL 3 places left, pL 6, µL none."""
    places = {"µL": 0, "nL": 3, "pL": 6}[unit]
    whole, _, frac = text.strip().partition(".")
    digits = whole + frac
    point = len(whole) - places
    if point <= 0:
        digits = "0" * (1 - point) + digits
        point = 1
    return digits[:point] + "." + digits[point:] if point < len(digits) else digits


def round_sig(x, n):
    """(digits, exponent of the leading digit) of positive double x to n sf, half away from zero on its exact value."""
    d = Decimal(x)  # exact binary value
    e = d.adjusted()
    q = d.scaleb(-e + n - 1).quantize(Decimal(1), rounding=ROUND_HALF_UP)
    s = str(int(q))
    if len(s) > n:
        s, e = s[:n], e + 1
    return s, e


def group(int_digits):
    out = ""
    for i, ch in enumerate(reversed(int_digits)):
        if i and i % 3 == 0:
            out = "," + out
        out = ch + out
    return out


def plain(s, e):
    n = len(s)
    if e >= n - 1:
        return group(s + "0" * (e - n + 1))
    if e >= 0:
        return group(s[: e + 1]) + "." + s[e + 1:]
    return "0." + "0" * (-e - 1) + s


def estimate(x):
    if x == 0:
        return "0"
    s, e = round_sig(x, 7)
    if -3 <= e <= 6:
        return plain(s, e)
    return s[0] + "." + s[1:] + " × 10" + str(e).translate(SUP)


def lam(x):
    return "0" if x == 0 else plain(*round_sig(x, 10))


def ratio(x):
    if x == 0:
        return "0"
    if float(x).is_integer():
        return group(str(int(x)))
    t = plain(*round_sig(x, 7))
    return t.rstrip("0").rstrip(".") if "." in t else t


def rel(a, b):
    a, b = Decimal(a), Decimal(b)
    return abs(a - b) / abs(b) if b != 0 else abs(a - b)


def check(path):
    rec = json.load(open(path, encoding="utf-8"))
    problems, compared = [], 0
    if rec["outcome"]["status"] != "result":
        return problems, compared
    # Entries are text under the declared decimal separator; a comma-decimal record is read with its comma
    # as the decimal mark (the number grammar has no grouping, so a comma can mean nothing else).
    sep = next((d["value"] for d in rec["declarations"] if d["id"] == "decimal-separator"), ".")
    inputs = {}
    for i in rec["inputs"]:
        i = dict(i)
        if sep == ",":
            i["entered"] = i["entered"].replace(",", ".")
        inputs[i["id"]] = i
    results = {r["id"]: r for r in rec["results"]}
    pv = inputs["partition-volume"]
    vd_text = shift(pv["entered"], pv["unit"])
    vd_dec, vd_dbl = Decimal(vd_text), float(vd_text)
    if pv["converted"] is not None and pv["converted"]["unrounded"] != vd_dbl:
        problems.append("partition volume conversion differs")

    def agree(rid, dec, dbl, fmt):
        nonlocal compared
        r = results[rid]
        compared += 1
        if r["unrounded"] is None:
            problems.append(f"{rid}: no unrounded value")
            return
        if rel(r["unrounded"], dec) > Decimal("1e-15"):
            problems.append(f"{rid}: {r['unrounded']} against Decimal {dec}")
        if r["unrounded"] != dbl and rel(r["unrounded"], dbl) > Decimal("1e-15"):
            problems.append(f"{rid}: {r['unrounded']} against double {dbl}")
        if fmt(r["unrounded"]) != r["display"]:
            problems.append(f"{rid}: display {r['display']!r}, rule gives {fmt(r['unrounded'])!r}")

    prep_values = {}
    for p in rec["tool"]["preparations"]:
        name = p["name"]
        R, V = inputs[f"total:{name}"]["entered"], inputs[f"sample:{name}"]["entered"]
        r_dec, r_dbl = Decimal(R) / Decimal(V), float(R) / float(V)
        agree(f"template-ratio:{name}", r_dec, r_dbl, ratio)
        kind = next(d["value"] for d in rec["declarations"] if d["id"] == f"dilution:{name}")
        F_dec, F_dbl = Decimal(1), 1.0
        if kind == "steps":
            i = 1
            while f"step-in:{name} step {i}" in inputs:
                vin, vt = inputs[f"step-in:{name} step {i}"]["entered"], inputs[f"step-total:{name} step {i}"]["entered"]
                f_dec, f_dbl = Decimal(vt) / Decimal(vin), float(vt) / float(vin)
                agree(f"step-factor:{name} step {i}", f_dec, f_dbl, ratio)
                F_dec, F_dbl = (f_dec, f_dbl) if i == 1 else (F_dec * f_dec, F_dbl * f_dbl)
                i += 1
        elif kind == "factor":
            F_dec, F_dbl = Decimal(inputs[f"factor:{name}"]["entered"]), float(inputs[f"factor:{name}"]["entered"])
        agree(f"overall-factor:{name}", F_dec, F_dbl, ratio)
        prep_values[name] = (r_dec, r_dbl, F_dec, F_dbl)

    ticked = []
    for w in rec["tool"]["wells"]:
        n = w["name"]
        k, N = inputs[f"positive:{n}"]["entered"], inputs[f"accepted:{n}"]["entered"]
        p_dec, p_dbl = Decimal(k) / Decimal(N), float(k) / float(N)
        agree(f"p:{n}", p_dec, p_dbl, ratio)
        if Decimal(k) == Decimal(N):
            for rid in (f"lambda:{n}", f"copies-per-ul-reaction:{n}", f"copies-per-ul-diluted:{n}", f"copies-per-ul-original:{n}", f"copies-per-ml-original:{n}"):
                compared += 1
                if results[rid]["unrounded"] is not None or results[rid]["status"] != "undefined":
                    problems.append(f"{rid}: p = 1 must be undefined")
            if w["inMean"]:
                ticked.append(None)
            continue
        r_dec, r_dbl, F_dec, F_dbl = prep_values[w["preparation"]]
        l_dec = -(Decimal(1) - p_dec).ln() if k != "0" else Decimal(0)
        l_dbl = 0 - math.log1p(-p_dbl)
        agree(f"lambda:{n}", l_dec, l_dbl, lam)
        c_dec, c_dbl = l_dec / vd_dec, l_dbl / vd_dbl
        agree(f"copies-per-ul-reaction:{n}", c_dec, c_dbl, estimate)
        d_dec, d_dbl = c_dec * r_dec, c_dbl * r_dbl
        agree(f"copies-per-ul-diluted:{n}", d_dec, d_dbl, estimate)
        o_dec, o_dbl = d_dec * F_dec, d_dbl * F_dbl
        agree(f"copies-per-ul-original:{n}", o_dec, o_dbl, estimate)
        agree(f"copies-per-ml-original:{n}", o_dec * 1000, o_dbl * 1000, estimate)
        if w["inMean"]:
            ticked.append((n, o_dec, o_dbl))

    if len(ticked) >= 2:
        if None in ticked:
            compared += 1
            if results["mean-copies-per-ul-original"]["status"] != "withheld":
                problems.append("mean must be withheld")
        else:
            s_dec, s_dbl = Decimal(0), 0.0
            for _, od, ob in ticked:
                s_dec, s_dbl = s_dec + od, s_dbl + ob
            m_dec, m_dbl = s_dec / len(ticked), s_dbl / len(ticked)
            agree("mean-copies-per-ul-original", m_dec, m_dbl, estimate)
            agree("mean-copies-per-ml-original", m_dec * 1000, m_dbl * 1000, estimate)
            if "highest-to-lowest" in results:
                hi = max(ticked, key=lambda t: t[2])
                lo = min(ticked, key=lambda t: t[2])
                if lo[2] == 0:
                    # The zero form: no finite ratio. The flag names only the ticked wells at 0.
                    compared += 1
                    r = results["highest-to-lowest"]
                    if (r["status"], r["unrounded"], r["display"], r["working"]) != ("undefined", None, "no finite value", None):
                        problems.append("highest-to-lowest: the zero form must be undefined, null, \"no finite value\", no working")
                    zero = [n for n, _, ob in ticked if ob == 0]
                    fl = next((f for f in rec["flags"] if f["code"] == "FL-08"), None)
                    if fl is None or fl["names"] != zero:
                        problems.append(f"FL-08 zero form must name only {zero}")
                else:
                    agree("highest-to-lowest", hi[1] / lo[1], hi[2] / lo[2], lambda x: plain(*round_sig(x, 3)))
    elif any(r.startswith("mean-") for r in results):
        problems.append("a mean with fewer than two ticked wells")
    return problems, compared


def main():
    bad = 0
    for f in sorted(os.listdir(EXAMPLES)):
        if not f.endswith(".json"):
            continue
        problems, compared = check(os.path.join(EXAMPLES, f))
        print(("FAIL" if problems else "PASS") + f"  {f}: {compared} values compared")
        for p in problems:
            print("      " + p)
        bad += bool(problems)
    print("No problems." if not bad else f"{bad} records with problems.")
    sys.exit(1 if bad else 0)


main()
