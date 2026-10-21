import { readNumber } from './parse.js';
import { integerValue } from './decimal.js';
import { formatRatio } from './numfmt.js';
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
    return { unrounded: x, display: formatRatio(x) };
}
