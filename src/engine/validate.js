import { readNumber, isAbsent } from './parse.js';
import * as D from './decimal.js';
import { MICRO, PARTITION_UNITS, partitionVolumeInMicroLitre } from './units.js';
import { PANEL_ENTRIES } from './panel.js';
import { MSG, FIELD } from './messages.js';
export const CAPS = Object.freeze({ preparations: 6, wellsPerPrep: 8, stepsPerPrep: 6 });
export const REFUSAL_ORDER = ['T1-HI-01', 'T1-HI-02', 'T1-HI-03', 'T1-HI-04', 'T1-HI-05', 'T1-HI-06', 'T1-HI-07', 'T1-HI-08', 'T1-HI-09', 'T1-HI-11', 'T1-HI-12', 'T1-HI-13'];
const MODES = ['concentration', 'titre'];
const ENTRIES = ['typed', 'pasted'];
const KINDS = ['none', 'steps', 'factor'];
const DNASE = ['yes', 'other', 'no', 'not-known'];
const LYSIS = ['proteinase-k', 'heat', 'pcr-start', 'other', 'not-known'];
const CLASSES = ['itr', 'transgene', 'other'];
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const blank = (s) => s === null || s === undefined || (typeof s === 'string' && s.trim() === '');
export function separatorOf(c) {
    return c.entry === 'pasted' ? c.decimalSeparator : '.';
}
export function shapeError(c) {
    if (!isObj(c))
        return 'case is not an object';
    if (typeof c.id !== 'string')
        return 'case has no id';
    if (!MODES.includes(c.mode))
        return `mode must be one of ${MODES.join(', ')}`;
    if (!ENTRIES.includes(c.entry))
        return `entry must be one of ${ENTRIES.join(', ')}`;
    if (![null, undefined, '.', ','].includes(c.decimalSeparator))
        return "decimalSeparator must be '.', ',' or null";
    if (!Array.isArray(c.preparations) || c.preparations.length === 0)
        return 'preparations must be a non-empty array';
    if (!Array.isArray(c.wells))
        return 'wells must be an array';
    const prepIds = new Set();
    for (const p of c.preparations) {
        if (!isObj(p) || typeof p.prep !== 'string')
            return 'each preparation needs a prep name';
        if (prepIds.has(p.prep))
            return `preparation ${p.prep} is listed twice`;
        prepIds.add(p.prep);
        for (const k of ['total', 'sample', 'mix'])
            if (p[k] !== null && p[k] !== undefined && !isObj(p[k]))
                return `${p.prep}.${k} must be an object or null`;
        if (p.dilution !== null && p.dilution !== undefined) {
            if (!isObj(p.dilution))
                return `${p.prep}.dilution must be an object or null`;
            const kind = p.dilution.kind;
            if (kind !== null && kind !== undefined && !KINDS.includes(kind))
                return `${p.prep}.dilution.kind must be one of ${KINDS.join(', ')} or null`;
            if (kind === 'steps' && p.dilution.steps !== null && p.dilution.steps !== undefined && !Array.isArray(p.dilution.steps))
                return `${p.prep}.dilution.steps must be an array`;
            if (kind === 'steps' && Array.isArray(p.dilution.steps) && p.dilution.steps.some((s) => !isObj(s)))
                return `${p.prep}.dilution.steps must hold objects`;
        }
    }
    const wellIds = new Set();
    for (const w of c.wells) {
        if (!isObj(w) || typeof w.well !== 'string')
            return 'each well needs a well name';
        if (wellIds.has(w.well))
            return `well ${w.well} is listed twice`;
        wellIds.add(w.well);
        if (!prepIds.has(w.prep))
            return `well ${w.well} names preparation ${w.prep}, which is not listed`;
        if (typeof w.inMean !== 'boolean')
            return `well ${w.well} needs inMean true or false`;
    }
    const pv = c.partitionVolume;
    if (pv !== null && pv !== undefined) {
        if (!isObj(pv))
            return 'partitionVolume must be an object or null';
        const src = pv.source;
        if (isObj(src)) {
            const entry = PANEL_ENTRIES[src.panel];
            if (!entry)
                return `partitionVolume.source names no panel entry: ${src.panel}`;
            const r = typeof pv.value === 'string' ? readNumber(pv.value, separatorOf(c) || '.') : null;
            if (!r || r.kind !== 'ok' || pv.unit !== entry.unit || !D.eq(r.dec, D.fromText(entry.value))) {
                return `partitionVolume ${pv.value} ${pv.unit} does not equal panel entry ${src.panel} (${entry.value} ${entry.unit})`;
            }
        }
        else if (src !== 'user' && src !== null && src !== undefined)
            return "partitionVolume.source must be 'user' or { panel }";
    }
    if (c.mode === 'titre' && isObj(c.titre)) {
        const t = c.titre;
        if (t.dnase != null && !DNASE.includes(t.dnase))
            return `titre.dnase must be one of ${DNASE.join(', ')} or null`;
        if (t.lysis != null && !LYSIS.includes(t.lysis))
            return `titre.lysis must be one of ${LYSIS.join(', ')} or null`;
        if (t.targetClass != null && !CLASSES.includes(t.targetClass))
            return `titre.targetClass must be one of ${CLASSES.join(', ')} or null`;
        if (t.reliableRange != null && !isObj(t.reliableRange))
            return 'titre.reliableRange must be an object or null';
    }
    return null;
}
const valueOf = (q) => (isObj(q) ? q.value : null);
export function missingDeclarations(c) {
    const out = [];
    const preps = c.preparations;
    const dilutionIncomplete = (d) => {
        if (!isObj(d) || d.kind === null || d.kind === undefined)
            return true;
        if (d.kind === 'factor')
            return isAbsent(d.factor);
        if (d.kind === 'steps')
            return !Array.isArray(d.steps) || d.steps.length === 0 || d.steps.some((s) => isAbsent(valueOf(s.in)) || isAbsent(valueOf(s.total)));
        return false;
    };
    if (c.entry === 'pasted' && (c.decimalSeparator === null || c.decimalSeparator === undefined))
        out.push('T1-IN-14');
    const pv = c.partitionVolume;
    if (!isObj(pv) || pv.unit === null || pv.unit === undefined || isAbsent(pv.value))
        out.push('T1-IN-04');
    if (preps.some((p) => isAbsent(valueOf(p.total))))
        out.push('T1-IN-06');
    if (preps.some((p) => isAbsent(valueOf(p.sample))))
        out.push('T1-IN-07');
    if (preps.some((p) => dilutionIncomplete(p.dilution)))
        out.push('T1-IN-09');
    if (blank(c.instrument))
        out.push('T1-IN-10');
    if (blank(c.targetName))
        out.push('T1-IN-11');
    if (c.wells.length === 0 || c.wells.some((w) => isAbsent(w.positive) || isAbsent(w.accepted)))
        out.push('T1-IN-02');
    if (c.mode === 'titre') {
        const t = isObj(c.titre) ? c.titre : {};
        if (t.dnase == null || (t.dnase === 'other' && blank(t.dnaseText)))
            out.push('T1-TM-01');
        if (t.lysis == null)
            out.push('T1-TM-02');
        if (t.targetClass == null)
            out.push('T1-TM-03');
    }
    return out;
}
export function refusalsOf(c) {
    const sep = separatorOf(c);
    const items = [];
    const push = (code, field, names, message) => items.push({ code, field, wells: names.wells || [], preps: names.preps || [], steps: names.steps || [], message });
    const mark = (dec) => D.toText(dec, sep);
    const read = (text, fieldKey, names) => {
        const r = readNumber(text, sep);
        if (r.kind === 'ok' || r.kind === 'absent')
            return r.kind === 'ok' ? r : null;
        const field = FIELD[fieldKey];
        push('T1-HI-09', fieldKey, names, MSG[`T1-HI-09-${r.kind}`](field, r.text, sep));
        return null;
    };
    const pvCase = c.partitionVolume;
    const pv = { read: read(pvCase.value, 'partitionVolume', {}), unit: pvCase.unit };
    if (pv.read && D.isZero(pv.read.dec))
        push('T1-HI-05', 'partitionVolume', {}, MSG['T1-HI-05-partitionVolume']());
    const wells = c.wells.map((w) => {
        const names = { wells: [w.well] };
        const k = read(w.positive, 'positive', names);
        const n = read(w.accepted, 'accepted', names);
        return { w, k, n };
    });
    for (const { w, k, n } of wells) {
        const names = { wells: [w.well] };
        const kWhole = k && D.isWhole(k.dec);
        const nWhole = n && D.isWhole(n.dec);
        if (kWhole && nWhole && D.lt(n.dec, k.dec))
            push('T1-HI-01', 'positive', names, MSG['T1-HI-01'](D.groupedInteger(k.dec), D.groupedInteger(n.dec)));
        if (n && D.isZero(n.dec))
            push('T1-HI-02', 'accepted', names, MSG['T1-HI-02']());
        if (k && !kWhole)
            push('T1-HI-05', 'positive', names, MSG['T1-HI-05-count'](FIELD.positive, k.text));
        if (n && !nWhole)
            push('T1-HI-05', 'accepted', names, MSG['T1-HI-05-count'](FIELD.accepted, n.text));
    }
    const preps = c.preparations.map((p) => {
        const names = { preps: [p.prep] };
        const total = read(valueOf(p.total), 'total', names);
        const sample = read(valueOf(p.sample), 'sample', names);
        const mix = p.mix == null ? null : read(valueOf(p.mix), 'mix', names);
        const d = p.dilution;
        const steps = d.kind === 'steps'
            ? d.steps.map((s, i) => {
                const sn = { steps: [`${p.prep}/${i + 1}`] };
                return { in: read(valueOf(s.in), 'stepIn', sn), total: read(valueOf(s.total), 'stepTotal', sn), name: sn.steps[0], unitIn: s.in?.unit, unitTotal: s.total?.unit };
            })
            : [];
        const factor = d.kind === 'factor' ? read(d.factor, 'factor', names) : null;
        return { p, total, sample, mix, kind: d.kind, steps, factor };
    });
    for (const { p, total, sample, mix, kind, steps, factor } of preps) {
        const names = { preps: [p.prep] };
        if (total && sample && !D.lt(sample.dec, total.dec))
            push('T1-HI-03', 'sample', names, MSG['T1-HI-03'](sample.text, total.text));
        if (total && sample && mix) {
            const sum = D.add(mix.dec, sample.dec);
            if (D.lt(total.dec, sum))
                push('T1-HI-04', 'total', names, MSG['T1-HI-04'](total.text, mix.text, sample.text, mark(sum)));
        }
        if (total && D.isZero(total.dec))
            push('T1-HI-05', 'total', names, MSG['T1-HI-05-total']());
        if (sample && D.isZero(sample.dec))
            push('T1-HI-05', 'sample', names, MSG['T1-HI-05-sample']());
        for (const s of steps) {
            const sn = { steps: [s.name] };
            if (s.in && D.isZero(s.in.dec))
                push('T1-HI-05', 'stepIn', sn, MSG['T1-HI-05-stepIn']());
            if (s.in && s.total && D.lt(s.total.dec, s.in.dec))
                push('T1-HI-06', 'stepTotal', sn, D.isZero(s.total.dec) ? MSG['T1-HI-06-zero'](s.in.text) : MSG['T1-HI-06'](s.total.text, s.in.text, mark(D.add(s.in.dec, s.total.dec))));
        }
        if (kind === 'factor' && factor && D.lt(factor.dec, D.fromText('1')))
            push('T1-HI-07', 'factor', names, MSG['T1-HI-07'](factor.text));
    }
    const expected = read(c.expectedAccepted, 'expectedAccepted', {});
    let replicateRatio = null;
    let range = null;
    if (c.mode === 'titre' && isObj(c.titre)) {
        const t = c.titre;
        replicateRatio = read(t.replicateRatio, 'replicateRatio', {});
        if (isObj(t.reliableRange)) {
            const low = read(t.reliableRange.low, 'rangeLow', {});
            const high = read(t.reliableRange.high, 'rangeHigh', {});
            range = { low, high };
            if (low && high && D.lt(high.dec, low.dec))
                push('T1-HI-11', 'rangeLow', {}, MSG['T1-HI-11'](low.text, high.text));
        }
        if (replicateRatio && D.lt(replicateRatio.dec, D.fromText('1')))
            push('T1-HI-12', 'replicateRatio', {}, MSG['T1-HI-12']());
    }
    if (c.preparations.length > CAPS.preparations)
        push('T1-HI-13', 'preparations', {}, MSG['T1-HI-13-preparations'](c.preparations.length));
    for (const p of c.preparations) {
        const count = c.wells.filter((w) => w.prep === p.prep).length;
        if (count > CAPS.wellsPerPrep)
            push('T1-HI-13', 'wells', { preps: [p.prep] }, MSG['T1-HI-13-wells'](p.prep, count));
    }
    for (const p of c.preparations) {
        if (p.dilution.kind === 'steps' && p.dilution.steps.length > CAPS.stepsPerPrep)
            push('T1-HI-13', 'steps', { preps: [p.prep] }, MSG['T1-HI-13-steps'](p.prep, p.dilution.steps.length));
    }
    return { items, values: { separator: sep, pv, wells, preps, expected, replicateRatio, range } };
}
export function aggregateRejections(items, c) {
    const wellOrder = c.wells.map((w) => w.well);
    const prepOrder = c.preparations.map((p) => p.prep);
    const stepOrder = c.preparations.flatMap((p) => (p.dilution?.kind === 'steps' ? p.dilution.steps.map((_, i) => `${p.prep}/${i + 1}`) : []));
    const ordered = (names, order) => order.filter((x) => names.has(x));
    const out = [];
    for (const code of REFUSAL_ORDER) {
        const mine = items.filter((it) => it.code === code);
        if (mine.length === 0)
            continue;
        out.push({
            code,
            wells: ordered(new Set(mine.flatMap((it) => it.wells)), wellOrder),
            preps: ordered(new Set(mine.flatMap((it) => it.preps)), prepOrder),
            steps: ordered(new Set(mine.flatMap((it) => it.steps)), stepOrder),
            messages: mine.map((it) => it.message),
        });
    }
    return out;
}
export function unsupportedOf(c) {
    const bad = [];
    if (!Object.hasOwn(PARTITION_UNITS, c.partitionVolume.unit))
        bad.push('partitionVolume');
    for (const p of c.preparations) {
        for (const k of ['total', 'sample', 'mix'])
            if (isObj(p[k]) && p[k].unit !== MICRO)
                bad.push(`${p.prep}.${k}`);
        if (p.dilution.kind === 'steps')
            p.dilution.steps.forEach((s, i) => { if (s.in?.unit !== MICRO || s.total?.unit !== MICRO)
                bad.push(`${p.prep}/${i + 1}`); });
    }
    return bad.length ? ['Q-AB-06'] : [];
}
export function validate(c) {
    const err = shapeError(c);
    if (err)
        return { status: 'error', message: err };
    const incomplete = missingDeclarations(c);
    if (incomplete.length)
        return { status: 'incomplete', incomplete };
    const { items, values } = refusalsOf(c);
    if (items.length)
        return { status: 'rejected', rejections: aggregateRejections(items, c), refusals: items };
    const questions = unsupportedOf(c);
    if (questions.length)
        return { status: 'unsupported', questions };
    values.pv.micro = partitionVolumeInMicroLitre(values.pv.read.norm, values.pv.unit);
    return { status: 'ok', values };
}
