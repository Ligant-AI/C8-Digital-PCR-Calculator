import { UI, RULED } from '../text.js';
import { declarationLines } from './notebook.js';
export function unroundedCell(x, decimal) {
    if (x === null || x === undefined)
        return '';
    const t = String(x).replace('e', 'E');
    return decimal === ',' ? t.replace('.', ',') : t;
}
const DISPLAY_NUMBER = /^[0-9][0-9,]*(\.[0-9]+)?( × 10[⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)?$/u;
export function displayCell(display, decimal) {
    if (display === null || display === undefined)
        return '';
    const t = String(display);
    if (decimal !== ',' || !DISPLAY_NUMBER.test(t))
        return t;
    return t.replace(/[.,]/g, (ch) => (ch === '.' ? ',' : '.'));
}
const entered = (t, decimal) => (decimal === ',' ? t.replace('.', ',') : t.replace(',', '.'));
const FORMULA_START = /^[=+\-@\t\r\n]/;
export function csvCell(t, field) {
    let s = String(t ?? '');
    const neutralise = FORMULA_START.test(s);
    if (neutralise)
        s = `'${s}`;
    return neutralise || s.includes(field) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function csvText(record, decimal) {
    if (decimal !== '.' && decimal !== ',')
        throw new Error('csvText: a decimal convention must be declared');
    const field = decimal === ',' ? ';' : ',';
    const q = (t) => csvCell(t, field);
    const row = (...cells) => cells.map(q).join(field);
    const E = UI.exp;
    const C = E.csvColumns;
    const t = record.tool;
    const lines = [row(t.name), ...t.scope.map((s) => row(s)), row(E.date, t.date), row(E.toolVersion, t.version), row(E.engine, t.engine), row(E.order, t.orderOfEvaluation), row(E.url, t.url), row(E.sections.citation, t.citation), ''];
    lines.push(row(E.sections.result, record.result.label));
    if (record.result.labelLine)
        lines.push(row('', record.result.labelLine));
    if (record.result.recordLabel)
        lines.push(row('', record.result.recordLabel));
    lines.push('', row(E.sections.inputs));
    lines.push(row(RULED.partitionVolume, entered(record.inputs.partitionVolume.entered, decimal), record.inputs.partitionVolume.unit, entered(record.inputs.partitionVolume.microLitre, decimal), 'µL'));
    for (const p of record.inputs.preparations) {
        lines.push(row(p.name, 'total', entered(p.total.entered, decimal), 'µL', 'sample', entered(p.sample.entered, decimal), 'µL', 'master mix', p.mix ? entered(p.mix.entered, decimal) : '', p.mix ? 'µL' : '', p.dilution.label, ...(p.dilution.kind === 'steps' ? p.dilution.steps.flatMap((s) => [entered(s.in.entered, decimal), entered(s.total.entered, decimal)]) : p.dilution.kind === 'factor' ? [entered(p.dilution.factor, decimal)] : [])));
    }
    lines.push('', row(E.sections.declarations), ...declarationLines(record).map((l) => row(l)), row(E.csvFormulaNote));
    const cols = [
        [C.well, (w) => w.well], [C.prep, (w) => w.prep], [C.positive, (w) => entered(w.positive, decimal)], [C.accepted, (w) => entered(w.accepted, decimal)], [C.inMean, (w) => (w.inMean ? E.yes : E.no)],
    ];
    const pair = (key, get) => { cols.push([C[key], (w) => displayCell(get(w).display, decimal)]); cols.push([E.unrounded(C[key]), (w) => unroundedCell(get(w).unrounded, decimal)]); };
    pair('p', (w) => w.p);
    pair('lambda', (w) => w.lambda);
    pair('cRxn', (w) => w.cRxn);
    pair('ratio', (w) => w.ratio);
    cols.push([C.factors, (w) => w.factors.map((f) => displayCell(f.display, decimal)).join(' × ')], [E.unrounded(C.factors), (w) => w.factors.map((f) => unroundedCell(f.unrounded, decimal)).join(' × ')]);
    pair('F', (w) => w.F);
    pair('cDil', (w) => w.cDil);
    pair('cOrig', (w) => w.cOrig);
    pair('perMl', (w) => w.perMl);
    cols.push([C.flags, (w) => w.flags.join(' ')]);
    lines.push('', row(...cols.map(([h]) => h)), ...record.result.wells.map((w) => row(...cols.map(([, f]) => f(w)))));
    const m = record.result.mean;
    if (m && m.status === 'computed') {
        const cells = cols.map(([h]) => h).map((h) => {
            if (h === C.well)
                return E.meanRow;
            if (h === C.cOrig)
                return displayCell(m.cOrig.display, decimal);
            if (h === E.unrounded(C.cOrig))
                return unroundedCell(m.cOrig.unrounded, decimal);
            if (h === C.perMl)
                return displayCell(m.perMl.display, decimal);
            if (h === E.unrounded(C.perMl))
                return unroundedCell(m.perMl.unrounded, decimal);
            if (h === C.inMean)
                return m.wells.join(' ');
            return '';
        });
        lines.push(row(...cells), row('', m.words, `${E.meanIncludes}: ${m.wells.join(' ')}`, m.notIncluded.length ? `${E.meanExcludes}: ${m.notIncluded.join(' ')}` : ''));
    }
    else if (m)
        lines.push(row(E.meanWithheld, m.words));
    lines.push('', row(E.sections.flags), ...(record.flags.length ? record.flags.flatMap((f) => f.words.map((wd) => row(f.code, wd))) : [row(E.noFlags)]));
    const c = record.constants;
    lines.push('', row(E.sections.constants), row(c.poisson.relation, c.poisson.source, c.poisson.quote, c.poisson.mapping));
    lines.push(row(record.display.precision), row(record.display.rounding));
    if (decimal === ',')
        lines.push(row(E.commaDisplay));
    lines.push('', row(E.sections.register), row(...E.registerColumns), ...record.register.map((x) => row(x.item, x.value, x.basis, x.appliesTo, x.status, x.labelledAs || '')));
    lines.push(row(...E.assumptionColumns), ...record.assumptions.map((x) => row(x.assumption, x.appliesTo, x.status)));
    return `﻿${lines.join('\r\n')}\r\n`;
}
