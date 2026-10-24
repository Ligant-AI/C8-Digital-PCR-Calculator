import { RULED, RULED_1_1, UI } from '../text.js';
import { overviewScale } from '../visuals/overview.js';
import { declarationLines as declarationLinesOf } from './notebook.js';
export const SVG_MIME = 'image/svg+xml';
const W = 960;
const M = 32;
const X0 = M;
const X1 = W - M;
const WRAP = 128;
const ROW_FLAGS = ['FL-01', 'FL-02', 'FL-03', 'FL-09'];
const C = Object.freeze({ text: '#1B2A4A', secondary: '#4F4943', muted: '#6B6357', rule: '#8B8678', strip: '#FAF7F2', border: '#D8D2C5', teal: '#0D7C66', white: '#FFFFFF' });
export function xmlEscape(value) {
    return String(value ?? '')
        .replace(/[\t\n\r]/g, ' ')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F￾￿]/g, '�')
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�')
        .replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
export function wrapText(text, max = WRAP) {
    const words = [];
    for (const w of String(text).split(' ')) {
        if (words.length && (w === '×' || words[words.length - 1].endsWith(' ×')))
            words[words.length - 1] += ` ${w}`;
        else
            words.push(w);
    }
    const lines = [];
    let line = '';
    for (const w of words) {
        if (line && line.length + 1 + w.length > max) {
            lines.push(line);
            line = w;
        }
        else
            line = line ? `${line} ${w}` : w;
    }
    if (line)
        lines.push(line);
    return lines;
}
const num = (v) => String(Math.round(v * 100) / 100);
export function svgText(record, result) {
    const out = [];
    let y = 0;
    const text = (s, { x = M, size = 12, weight = null, fill = C.text, anchor = null } = {}) => {
        out.push(`<text x="${num(x)}" y="${num(y)}" font-size="${size}"${weight ? ` font-weight="${weight}"` : ''} fill="${fill}"${anchor ? ` text-anchor="${anchor}"` : ''}>${xmlEscape(s)}</text>`);
    };
    const rect = (x, ry, w, h, paint) => out.push(`<rect x="${num(x)}" y="${num(ry)}" width="${num(w)}" height="${num(h)}" ${paint}/>`);
    const para = (s, opts = {}, lead = 17) => { for (const l of wrapText(s)) {
        y += lead;
        text(l, opts);
    } };
    const t = record.tool;
    const r = record.result;
    const wells = r.wells;
    const scale = overviewScale({ wells });
    const mean = r.mean && r.mean.status === 'computed' ? r.mean : null;
    const meanAt = mean && scale.axis === 'scale' ? scale.at(mean.perMl.unrounded) : null;
    const zeroRule = scale.axis !== 'none';
    const xAt = (at) => X0 + at * (X1 - X0);
    const flagWells = (code) => ((result && result.flags) || []).find((f) => f.display === code)?.wells || [];
    const fl06 = ((result && result.flags) || []).find((f) => f.display === 'FL-06');
    const fl06Preps = new Set(fl06 ? (fl06.steps || []).map((s) => String(s).split('/')[0]) : []);
    y = 28;
    text(t.name, { size: 13, weight: 600 });
    text(RULED_1_1.figureHeaderRight, { x: W - M, size: 13, anchor: 'end', fill: C.secondary });
    rect(M, 38, W - 2 * M, 1, `fill="${C.border}"`);
    y = 66;
    text(RULED_1_1.overviewHeading, { size: 16, weight: 600 });
    y += 20;
    text(UI.exp.figureVersions(t.version, UI.engineVersion(t.engine), t.orderOfEvaluation, t.date), { fill: C.secondary });
    for (const line of [r.label, ...(r.labelLine ? [r.labelLine] : [])])
        para(line, { weight: 600 }, 20);
    const strip = (top, marker) => {
        rect(X0, top, X1 - X0, 12, `fill="${C.strip}"`);
        if (zeroRule)
            rect(X0, top, 1, 12, `fill="${C.rule}"`);
        if (meanAt !== null)
            rect(xAt(meanAt) - 0.75, top, 1.5, 12, `fill="${C.text}"`);
        if (marker)
            out.push(marker);
    };
    const marker = (inMean, at, top) => {
        const cx = xAt(at);
        return inMean
            ? `<rect x="${num(cx - 5)}" y="${num(top + 1)}" width="10" height="10" rx="5" ry="5" fill="${C.teal}" stroke="${C.teal}" stroke-width="1"/>`
            : `<rect x="${num(cx - 4.5)}" y="${num(top + 1.5)}" width="9" height="9" rx="4.5" ry="4.5" fill="${C.white}" stroke="${C.text}" stroke-width="1.5"/>`;
    };
    y += 10;
    const groups = [];
    for (const w of wells) {
        let g = groups.find((x) => x.prep === w.prep);
        if (!g) {
            g = { prep: w.prep, F: w.F.display, wells: [] };
            groups.push(g);
        }
        g.wells.push(w);
    }
    for (const g of groups) {
        y += 24;
        text(`${g.prep}, × ${g.F}${fl06Preps.has(g.prep) ? ' FL-06' : ''}`, { weight: 600, fill: C.secondary });
        for (const w of g.wells) {
            const codes = ROW_FLAGS.filter((c) => flagWells(c).includes(w.well));
            y += 22;
            text(w.well, { weight: 600 });
            if (codes.length)
                text(codes.join(' '), { x: W - M, anchor: 'end', fill: C.secondary });
            y += 16;
            text(`${UI.countsOf(w.positive, w.accepted)}${w.inMean ? '' : `, ${RULED.notInMean}`}`, { fill: C.secondary });
            y += 16;
            text(w.perMl.display, { weight: 600 });
            const at = w.status === 'computed' ? scale.at(w.perMl.unrounded) : null;
            strip(y + 6, at === null ? '' : marker(w.inMean, at, y + 6));
            y += 18;
        }
    }
    if (zeroRule) {
        rect(X0, y + 4, X1 - X0, 1, `fill="${C.rule}"`);
        y += 20;
        text('0', { x: X0 });
        if (scale.axis === 'scale')
            text(`${scale.maxWell.perMl.display}, ${scale.maxWell.well}`, { x: X1, anchor: 'end' });
    }
    if (zeroRule) {
        y += 26;
        out.push(`<rect x="${M}" y="${num(y - 9)}" width="10" height="10" rx="5" ry="5" fill="${C.teal}" stroke="${C.teal}" stroke-width="1"/>`);
        text(RULED_1_1.overviewInMean, { x: M + 16 });
        y += 18;
        out.push(`<rect x="${M + 0.5}" y="${num(y - 8.5)}" width="9" height="9" rx="4.5" ry="4.5" fill="${C.white}" stroke="${C.text}" stroke-width="1.5"/>`);
        text(RULED_1_1.overviewNotInMean, { x: M + 16 });
        if (mean) {
            y += 18;
            if (meanAt !== null)
                rect(M + 4.25, y - 10, 1.5, 12, `fill="${C.text}"`);
            text(`${mean.perMl.display}, ${UI.meanOf(mean.wells.length, mean.wells)}`, { x: M + 16 });
        }
    }
    if (mean) {
        y += 8;
        para(mean.sentence, { fill: C.secondary });
    }
    else if (r.mean) {
        y += 8;
        para(r.mean.words, { fill: C.secondary });
    }
    if (record.flags.length) {
        y += 14;
        for (const f of record.flags)
            for (const words of f.words)
                para(`${f.code} ${words}`);
    }
    y += 14;
    para(`${RULED.partitionVolume}: ${record.inputs.partitionVolume.echo}`);
    for (const line of declarationLinesOf(record))
        para(line, { fill: C.secondary });
    if (r.recordLabel)
        para(r.recordLabel, { fill: C.secondary });
    y += 26;
    text(RULED_1_1.figureNoteHeading, { weight: 600 });
    para(RULED_1_1.overviewCaption);
    para(RULED.precision);
    if (record.entry.decimalSeparator === ',')
        para(UI.commaEntries);
    y += 10;
    for (const s of t.scope)
        para(s, { fill: C.secondary });
    para(t.citation, { fill: C.secondary });
    y += 24;
    const desc = RULED_1_1.overviewCaption.slice(0, RULED_1_1.overviewCaption.indexOf('. ') + 1);
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
        + `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${num(y)}" viewBox="0 0 ${W} ${num(y)}" font-family="Inter, Arial, sans-serif">`
        + `<title>${xmlEscape(RULED_1_1.figureTitle)}</title><desc>${xmlEscape(desc)}</desc>`
        + `<rect x="0" y="0" width="${W}" height="${num(y)}" fill="${C.white}"/>`
        + out.join('')
        + '</svg>\n';
}
