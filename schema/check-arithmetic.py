"""Independent check of every number in the example records.

Written from the tool's documented relations (order of evaluation 1) and the display rule,
not from the engine. For each record it reads only the record's own inputs,
recomputes every result two ways, and compares:

  * a Decimal reference at 40 digits, against the record's unrounded value
    (relative difference reported; must be at most 1e-15);
    lambda's reference, and everything after it, starts from Decimal(p_dbl), the exact binary value of the
    double p = k / n the engine holds, because near p = 1 that double's rounding is amplified by n / (n - k)
    beyond 1e-15 for any implementation that holds p as a double (NAD-2026-10-23-147);
  * for every computed well with 0 < k < n, lambda, the four estimates and the two means against the value
    at the exact k / n: within half a unit of the last shown figure (NAD-2026-10-23-148, NAD-2026-10-22-105);
  * on every record, whatever its status, each accepted count read as an exact decimal, never a double,
    against the 90,000,000 ceiling (T1-HI-14; NAD-2026-10-23-150);
  * the IEEE double path with lambda = -log1p(-p), against the record's
    unrounded value (must be equal, or within 1e-15 relative);
  * the display string, made here from the record's unrounded value by the
    display rule (half away from zero on the exact binary value, once), against
    the record's display string (must be identical). p, where k < n on the entered values, adds figures
    from 7 while its display reads "1" (T1-UN-04 (c); NAD-2026-10-23-149).

After the records, one labelled control: a record at k = n - 1, n = 10^9, made by the engine with the
ceiling bypassed, must pass the 1e-15 legs and the display check and fail the exact k / n leg.

Run with python3 -I check-arithmetic.py [folder]. The folder holds the schema
and examples/; by default it is this script's folder or the one above it.
Standard library only.
"""

import json
import math
import os
import re
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


def ratio_p(x, below):
    """p's display and its figures: ratio(), then, where k < n on the entered values (`below`), one figure more
    at a time while it reads "1", trailing zeros dropped (T1-UN-04 (c); NAD-2026-10-23-149). Stops at 17."""
    t, figs = ratio(x), 7
    while below and t == "1" and figs < 17:
        figs += 1
        t = plain(*round_sig(x, figs))
        t = t.rstrip("0").rstrip(".") if "." in t else t
    return t, figs


CEILING = Decimal(90000000)  # T1-HI-14, compared on exact decimals


def rel(a, b):
    a, b = Decimal(a), Decimal(b)
    return abs(a - b) / abs(b) if b != 0 else abs(a - b)


def check(rec):
    problems, compared = [], 0
    # Entries are text under the declared decimal separator; a comma-decimal record is read with its comma
    # as the decimal mark (the number grammar has no grouping, so a comma can mean nothing else).
    sep = next((d["value"] for d in rec["declarations"] if d["id"] == "decimal-separator"), ".")
    # T1-HI-14 on every record, whatever its status (NAD-2026-10-23-150): the engine's number grammar (digits, optionally the declared
    # separator and digits) is tested on each accepted count's trimmed text under the declared separator, before it is replaced by '.'
    # (NAD-2026-10-23-167). Matching text is read as an exact Decimal, never a float. Other text belongs to other refusals and is
    # skipped. Message text and order are not checked here (the record carries no refusal codes).
    status = rec["outcome"]["status"]
    grammar = re.compile(r"[0-9]+(?:" + re.escape(sep) + r"[0-9]+)?", re.ASCII)
    for i in rec["inputs"]:
        if not i["id"].startswith("accepted:") or not isinstance(i["entered"], str):
            continue
        t = i["entered"].strip()
        if not grammar.fullmatch(t):
            continue
        compared += 1
        if Decimal(t.replace(sep, ".")) > CEILING:
            if status == "result":
                problems.append(f"{i['id']}: {t} is above 90,000,000 on its exact decimal value, yet the record has a result (T1-HI-14)")
            elif status == "refused" and not any(i["of"] in r["names"] for r in rec["outcome"]["refusals"]):
                problems.append(f"{i['id']}: {t} is above 90,000,000 on its exact decimal value, and no refusal names {i['of']} (T1-HI-14)")
    if status != "result":
        return problems, compared
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

    def exact(rid, x, s, bound):
        """NAD-2026-10-23-148: the record's unrounded value against x, the value at the exact k / n, within
        half a unit of the s-th significant figure, e the smaller adjusted() exponent of the two. `bound` is
        the n-scaled bound B at this value, printed beside a failure as a diagnostic only, never the test."""
        nonlocal compared
        r = results[rid]
        compared += 1
        if r["unrounded"] is None:
            return  # reported by agree()
        v = Decimal(r["unrounded"])
        e = x.adjusted() if v == 0 else min(v.adjusted(), x.adjusted())
        half = Decimal(5).scaleb(e - s)  # ½ × 10^(e − s + 1)
        d = abs(v - x)
        if not d < half:
            problems.append(f"{rid}: {r['unrounded']} is more than half a unit of the last shown figure from the value at the exact k ÷ n (NAD-2026-10-22-105): exact {x:.20g}, difference {d:.3E}, half a unit {half:.1E}" + ("" if bound is None else f"; n-scaled bound B {bound:.3E} (diagnostic only)"))

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
        below = Decimal(k) < Decimal(N)
        agree(f"p:{n}", p_dec, p_dbl, lambda x: ratio_p(x, below)[0])
        pu = results[f"p:{n}"]["unrounded"]
        if below and pu is not None and Decimal(N) <= CEILING and ratio_p(pu, below)[1] > 8:
            problems.append(f"p:{n}: p needs more than 8 figures at or below the ceiling (T1-UN-04 (c))")
        if Decimal(k) == Decimal(N):
            for rid in (f"lambda:{n}", f"copies-per-ul-reaction:{n}", f"copies-per-ul-diluted:{n}", f"copies-per-ul-original:{n}", f"copies-per-ml-original:{n}"):
                compared += 1
                if results[rid]["unrounded"] is not None or results[rid]["status"] != "undefined":
                    problems.append(f"{rid}: p = 1 must be undefined")
            if w["inMean"]:
                ticked.append(None)
            continue
        r_dec, r_dbl, F_dec, F_dbl = prep_values[w["preparation"]]
        l_dec = -(Decimal(1) - Decimal(p_dbl)).ln() if k != "0" else Decimal(0)  # NAD-2026-10-23-147
        l_dbl = 0 - math.log1p(-p_dbl)
        agree(f"lambda:{n}", l_dec, l_dbl, lam)
        c_dec, c_dbl = l_dec / vd_dec, l_dbl / vd_dbl
        agree(f"copies-per-ul-reaction:{n}", c_dec, c_dbl, estimate)
        d_dec, d_dbl = c_dec * r_dec, c_dbl * r_dbl
        agree(f"copies-per-ul-diluted:{n}", d_dec, d_dbl, estimate)
        o_dec, o_dbl = d_dec * F_dec, d_dbl * F_dbl
        agree(f"copies-per-ul-original:{n}", o_dec, o_dbl, estimate)
        agree(f"copies-per-ml-original:{n}", o_dec * 1000, o_dbl * 1000, estimate)
        o_x = Decimal(0)  # k = 0: lambda is exactly 0, checked above; it enters a mean as 0
        if Decimal(0) < Decimal(k) < Decimal(N):
            # NAD-2026-10-23-148: the end-to-end leg against the exact k / n. B, the n-scaled bound, is printed
            # beside a failure only: ulp(p_dbl)/2 × n / (n − k) + 1e-15 × lambda, scaled to each value.
            l_x = -(Decimal(1) - Decimal(k) / Decimal(N)).ln()
            B = Decimal(math.ulp(p_dbl)) / 2 * Decimal(N) / (Decimal(N) - Decimal(k)) + Decimal("1e-15") * l_dec
            c_x = l_x / vd_dec
            d_x = c_x * r_dec
            o_x = d_x * F_dec
            exact(f"lambda:{n}", l_x, 10, B)
            exact(f"copies-per-ul-reaction:{n}", c_x, 7, B * c_x / l_x)
            exact(f"copies-per-ul-diluted:{n}", d_x, 7, B * d_x / l_x)
            exact(f"copies-per-ul-original:{n}", o_x, 7, B * o_x / l_x)
            exact(f"copies-per-ml-original:{n}", o_x * 1000, 7, B * o_x * 1000 / l_x)
        if w["inMean"]:
            ticked.append((n, o_dec, o_dbl, o_x))

    if len(ticked) >= 2:
        if None in ticked:
            compared += 1
            if results["mean-copies-per-ul-original"]["status"] != "withheld":
                problems.append("mean must be withheld")
        else:
            s_dec, s_dbl, s_x = Decimal(0), 0.0, Decimal(0)
            for _, od, ob, ox in ticked:
                s_dec, s_dbl, s_x = s_dec + od, s_dbl + ob, s_x + ox
            m_dec, m_dbl, m_x = s_dec / len(ticked), s_dbl / len(ticked), s_x / len(ticked)
            agree("mean-copies-per-ul-original", m_dec, m_dbl, estimate)
            agree("mean-copies-per-ml-original", m_dec * 1000, m_dbl * 1000, estimate)
            if m_x != 0:  # every ticked well at k = 0: the mean is 0 on both references
                exact("mean-copies-per-ul-original", m_x, 7, None)
                exact("mean-copies-per-ml-original", m_x * 1000, 7, None)
            if "highest-to-lowest" in results:
                hi = max(ticked, key=lambda t: t[2])
                lo = min(ticked, key=lambda t: t[2])
                if lo[2] == 0:
                    # The zero form: no finite ratio. The flag names only the ticked wells at 0.
                    compared += 1
                    r = results["highest-to-lowest"]
                    if (r["status"], r["unrounded"], r["display"], r["working"]) != ("undefined", None, "no finite value", None):
                        problems.append("highest-to-lowest: the zero form must be undefined, null, \"no finite value\", no working")
                    zero = [n for n, _, ob, _ in ticked if ob == 0]
                    fl = next((f for f in rec["flags"] if f["code"] == "FL-08"), None)
                    if fl is None or fl["names"] != zero:
                        problems.append(f"FL-08 zero form must name only {zero}")
                else:
                    agree("highest-to-lowest", hi[1] / lo[1], hi[2] / lo[2], lambda x: plain(*round_sig(x, 3)))
    elif any(r.startswith("mean-") for r in results):
        problems.append("a mean with fewer than two ticked wells")
    return problems, compared


# The control of NAD-2026-10-23-148. The worked example's composition (FX-08a) with A1 at 999,999,999 of
# 1,000,000,000, above the ceiling: every value below is engine 1.1.0's own, from make-examples.mjs's
# recordOf at C8 build/1.1 7294faf with only the T1-HI-14 test in validate.js disabled, in a scratch copy
# (Atlas, 23 October 2026). It is not a fixture. The 1e-15 legs and the display check must pass it; the
# exact k ÷ n leg must fail it; the T1-HI-14 check fails it as well, correctly, and is listed apart.
CONTROL_COUNTS = ("999999999", "1000000000")
CONTROL_RESULTS = {
    "p:A1": (0.999999999, "0.999999999"),
    "lambda:A1": (20.723265865228342, "20.72326587"),
    "copies-per-ul-reaction:A1": (20723.265865228343, "20,723.27"),
    "copies-per-ul-diluted:A1": (103616.32932614171, "103,616.3"),
    "copies-per-ul-original:A1": (1036163.2932614172, "1,036,163"),
    "copies-per-ml-original:A1": (1036163293.2614172, "1.036163 × 10⁹"),
}


def control():
    """Run the control on worked-example.json from the examples folder. Returns (caught, line)."""
    name = "control: k = n − 1 at n = 10⁹, the ceiling bypassed (NAD-2026-10-23-148)"
    path = os.path.join(EXAMPLES, "worked-example.json")
    if not os.path.isfile(path):
        return False, f"MISSED  {name}  (worked-example.json not in examples/)"
    rec = json.load(open(path, encoding="utf-8"))
    for i in rec["inputs"]:
        if i["id"] == "positive:A1":
            i["entered"] = CONTROL_COUNTS[0]
        if i["id"] == "accepted:A1":
            i["entered"] = CONTROL_COUNTS[1]
    for r in rec["results"]:
        if r["id"] in CONTROL_RESULTS:
            r["unrounded"], r["display"] = CONTROL_RESULTS[r["id"]]
    problems, _ = check(rec)
    leg148 = [p for p in problems if "from the value at the exact k ÷ n (NAD-2026-10-22-105)" in p]
    hi14 = [p for p in problems if p.endswith("(T1-HI-14)")]
    other = [p for p in problems if p not in leg148 and p not in hi14]
    caught = bool(leg148) and any(p.startswith("lambda:A1:") for p in leg148) and bool(hi14) and not other
    lines = [f"{'CAUGHT' if caught else 'MISSED'}  {name}  ({leg148[0] if leg148 else 'no exact k ÷ n failure'})"]
    lines += [f"      exact k ÷ n leg: {p}" for p in leg148[1:]]
    lines += [f"      T1-HI-14, expected and separate: {p}" for p in hi14]
    lines += [f"      unexpected (1e-15 leg or display): {p}" for p in other]
    return caught, "\n".join(lines)


def main():
    bad = 0
    for f in sorted(os.listdir(EXAMPLES)):
        if not f.endswith(".json"):
            continue
        problems, compared = check(json.load(open(os.path.join(EXAMPLES, f), encoding="utf-8")))
        print(("FAIL" if problems else "PASS") + f"  {f}: {compared} values compared")
        for p in problems:
            print("      " + p)
        bad += bool(problems)
    caught, line = control()
    print(line)
    print(("No problems." if not bad else f"{bad} records with problems.") + ("" if caught else " The control was missed."))
    sys.exit(1 if bad or not caught else 0)


main()
