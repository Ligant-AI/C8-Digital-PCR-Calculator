import { fromText } from './decimal.js';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const GROUPING = [',', '.', ' ', ' ', ' ', "'", '’'];
const SIGNS = /^[+\-−]/;
export function isAbsent(text) {
    return text === null || text === undefined || (typeof text === 'string' && /^\s*$/.test(text));
}
export function readNumber(raw, separator) {
    if (isAbsent(raw))
        return { kind: 'absent' };
    if (typeof raw !== 'string')
        return { kind: 'unreadable', text: String(raw) };
    if (separator !== '.' && separator !== ',')
        throw new Error(`no decimal separator declared: ${separator}`);
    const text = raw.trim();
    const s = esc(separator);
    const grammar = new RegExp(`^(\\d+)(?:${s}(\\d+))?$`);
    const m = grammar.exec(text);
    if (m) {
        const norm = m[2] === undefined ? m[1] : `${m[1]}.${m[2]}`;
        return { kind: 'ok', text, norm, dec: fromText(norm) };
    }
    if (SIGNS.test(text))
        return { kind: 'sign', text };
    if (new RegExp(`^\\d+(?:${s}\\d+)?[eE][+\\-\\u2212]?\\d+$`).test(text))
        return { kind: 'exponent', text };
    const groupChars = GROUPING.filter((g) => g !== separator).map(esc).join('|');
    const between = new RegExp(`(?<=\\d)(?:${groupChars})(?=\\d)`, 'g');
    if (between.test(text) && grammar.test(text.replace(between, '')))
        return { kind: 'grouping', text };
    return { kind: 'unreadable', text };
}
