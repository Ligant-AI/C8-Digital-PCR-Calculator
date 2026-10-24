import { readNumber } from './parse.js';
import { integerValue } from './decimal.js';
import { formatRatio, formatRatioNotOne, formatLambda, formatWhole } from './numfmt.js';
import { lambdaOf } from './lambda.js';
import { wellCountRefusals, REFUSAL_ORDER } from './validate.js';
export function negativeFraction(positiveText, acceptedText, separator) {
    const k = readNumber(positiveText, separator);
    const n = readNumber(acceptedText, separator);
    if (k.kind !== 'ok' || n.kind !== 'ok')
        return null;
    const kk = integerValue(k.dec);
    const nn = integerValue(n.dec);
    if (nn === 0n || kk > nn)
        return null;
    const x = Number(nn - kk) / Number(nn);
    return { unrounded: x, display: kk > 0n ? formatRatioNotOne(x) : formatRatio(x) };
}
export function readCounts(positiveText, acceptedText, separator) {
    const items = [];
    const [read] = wellCountRefusals([{ well: 'A1', positive: positiveText, accepted: acceptedText }], separator, items);
    if (items.length)
        return { status: 'rejected', codes: REFUSAL_ORDER.filter((code) => items.some((it) => it.code === code)) };
    if (!read.k || !read.n)
        return { status: 'absent' };
    return { status: 'ok', k: integerValue(read.k.dec), n: integerValue(read.n.dec), kRead: read.k, nRead: read.n };
}
export const UNDER_HALF = 'under 0.5';
export const SPREAD_TERM_CAP = 1000;
export function expectedBins(lambda, n) {
    const N = Number(n);
    const P = [Math.exp(-lambda)];
    for (let j = 1; j <= 3; j++)
        P.push((P[j - 1] * lambda) / j);
    const bins = [N * P[1], N * P[2], N * P[3]];
    let t = P[3];
    let sum = 0;
    let j = 4;
    for (;; j++) {
        if (j > SPREAD_TERM_CAP)
            throw new Error('expectedBins: the "4 or more" sum reached its iteration cap');
        t = (t * lambda) / j;
        if (t === 0 || sum + t === sum)
            break;
        sum = sum + t;
    }
    bins.push(N * sum);
    if (!bins.every((x) => x >= 0 && Number.isFinite(x)))
        throw new Error('expectedBins: a bin is negative or not finite');
    return { bins, stopJ: j };
}
export function expectedDisplay(x) {
    const s = formatWhole(x);
    return s === '0' ? UNDER_HALF : s;
}
export function expectedSpread(lambda, k, n) {
    if (k === n)
        return { status: 'none', counted0: null, bracket: null, bins: [], copies: null, lambda: null, stopJ: null };
    const counted0 = Number(n - k);
    const copiesValue = Number(n) * lambda;
    if (k === 0n)
        return { status: 'zero', counted0, bracket: null, bins: [], copies: { unrounded: copiesValue, display: formatWhole(copiesValue) }, lambda, stopJ: null };
    const { bins, stopJ } = expectedBins(lambda, n);
    const shown = bins.map(expectedDisplay);
    return {
        status: 'chart',
        counted0,
        bracket: Number(k),
        bins: bins.map((x, i) => ({ unrounded: x, display: shown[i] })),
        copies: { unrounded: copiesValue, display: expectedDisplay(copiesValue) },
        lambda,
        stopJ,
    };
}
export function spreadForWell(well, separator) {
    const c = readCounts(well.echo.positive, well.echo.accepted, separator);
    if (c.status !== 'ok')
        return null;
    return expectedSpread(well.status === 'undefined' ? null : well.lambda.unrounded, c.k, c.n);
}
export function spreadOfCounts(positiveText, acceptedText, separator) {
    const c = readCounts(positiveText, acceptedText, separator);
    if (c.status !== 'ok')
        return c;
    const lambda = c.k === c.n ? null : lambdaOf(Number(c.kRead.norm) / Number(c.nRead.norm));
    return expectedSpread(lambda, c.k, c.n);
}
export const GRID_DOTS = 200n;
export function dotGrid(k, n) {
    const notDrawn = { status: 'not-drawn', perDot: null, filled: null };
    if (n === 0n || n % GRID_DOTS !== 0n)
        return notDrawn;
    const perDot = n / GRID_DOTS;
    if (k % perDot !== 0n)
        return notDrawn;
    return { status: 'drawn', perDot: Number(perDot), filled: Number(k / perDot) };
}
export function dotGridOfCounts(positiveText, acceptedText, separator) {
    const c = readCounts(positiveText, acceptedText, separator);
    if (c.status !== 'ok')
        return c;
    return dotGrid(c.k, c.n);
}
export const CURVE_DIVISOR = 1000;
export const CURVE_LAST_I = 990;
export function curvePoints() {
    const points = [];
    for (let i = 0; i <= CURVE_LAST_I; i++) {
        const p = i / CURVE_DIVISOR;
        points.push({ i, p, lambda: lambdaOf(p) });
    }
    const last = points[points.length - 1];
    return { points, edge: { p: formatRatio(last.p), lambda: formatLambda(last.lambda) } };
}
