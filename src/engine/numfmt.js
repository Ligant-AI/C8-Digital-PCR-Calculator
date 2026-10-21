const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
export const UNDEFINED_TEXT = 'undefined, not a measurement';
export function exactDecimal(x) {
    if (!(x > 0) || !Number.isFinite(x))
        throw new Error(`exactDecimal needs a positive finite double, not ${x}`);
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    const bits = view.getBigUint64(0);
    const biased = Number((bits >> 52n) & 0x7ffn);
    let mant = bits & ((1n << 52n) - 1n);
    let exp;
    if (biased === 0)
        exp = -1074;
    else {
        mant |= 1n << 52n;
        exp = biased - 1075;
    }
    if (exp >= 0)
        return { digits: mant << BigInt(exp), scale: 0 };
    const k = -exp;
    return { digits: mant * 5n ** BigInt(k), scale: k };
}
export function roundSig(x, n) {
    const { digits, scale } = exactDecimal(x);
    const s = digits.toString();
    let e = s.length - 1 - scale;
    const drop = s.length - n;
    let q;
    if (drop > 0) {
        const p = 10n ** BigInt(drop);
        q = digits / p;
        const r = digits % p;
        if (r * 2n >= p)
            q += 1n;
    }
    else {
        q = digits * 10n ** BigInt(-drop);
    }
    let qs = q.toString();
    if (qs.length > n) {
        qs = qs.slice(0, n);
        e += 1;
    }
    return { q: qs, e };
}
const group = (intDigits) => intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function plain({ q, e }) {
    const n = q.length;
    if (e >= n - 1)
        return group(q + '0'.repeat(e - n + 1));
    if (e >= 0)
        return `${group(q.slice(0, e + 1))}.${q.slice(e + 1)}`;
    return `0.${'0'.repeat(-e - 1)}${q}`;
}
const dropTrailingZeros = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
const superscript = (k) => String(k).split('').map((c) => SUP[c]).join('');
export function formatEstimate(x) {
    if (x === 0)
        return '0';
    const r = roundSig(x, 7);
    if (r.e >= -3 && r.e <= 6)
        return plain(r);
    return `${r.q[0]}.${r.q.slice(1)} × 10${superscript(r.e)}`;
}
export function formatLambda(x) {
    if (x === 0)
        return '0';
    return plain(roundSig(x, 10));
}
export function formatRatio(x) {
    if (x === 0)
        return '0';
    if (Number.isInteger(x))
        return group(BigInt(x).toString());
    return dropTrailingZeros(plain(roundSig(x, 7)));
}
export function formatFraction(kDec, nDec, groupedInteger) {
    return `${groupedInteger(kDec)} ÷ ${groupedInteger(nDec)}`;
}
export function formatFoldRatio(x, equalsLimit) {
    for (let n = 3; n <= 17; n++) {
        const s = plain(roundSig(x, n));
        if (!equalsLimit(s))
            return s;
    }
    return plain(roundSig(x, 17));
}
