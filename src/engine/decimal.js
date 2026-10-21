const POW10 = (k) => 10n ** BigInt(k);
export function fromText(norm) {
    if (!/^\d+(\.\d+)?$/.test(norm))
        throw new Error(`not a normalised decimal text: ${norm}`);
    const [i, f = ''] = norm.split('.');
    return { n: BigInt(i + f), scale: f.length };
}
function align(a, b) {
    const s = Math.max(a.scale, b.scale);
    return [a.n * POW10(s - a.scale), b.n * POW10(s - b.scale), s];
}
export function compare(a, b) {
    const [x, y] = align(a, b);
    return x < y ? -1 : x > y ? 1 : 0;
}
export const lt = (a, b) => compare(a, b) < 0;
export const eq = (a, b) => compare(a, b) === 0;
export function add(a, b) {
    const [x, y, s] = align(a, b);
    return { n: x + y, scale: s };
}
export const isZero = (a) => a.n === 0n;
export const isWhole = (a) => a.n % POW10(a.scale) === 0n;
export const integerValue = (a) => a.n / POW10(a.scale);
export function toText(a, mark = '.') {
    const digits = a.n.toString().padStart(a.scale + 1, '0');
    const i = digits.slice(0, digits.length - a.scale);
    const f = digits.slice(digits.length - a.scale).replace(/0+$/, '');
    return f ? `${i}${mark}${f}` : i;
}
export function groupedInteger(a) {
    return integerValue(a).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
