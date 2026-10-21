import { readNumber } from '../engine/parse.js';
import { MSG, FIELD } from '../engine/messages.js';
import { PANEL_ENTRIES } from '../engine/panel.js';
import { UI } from './text.js';
const UL = 'µL';
let uidCounter = 0;
const uid = (p) => `${p}${++uidCounter}`;
const blank = (s) => s === null || s === undefined || String(s).trim() === '';
export function newStep() { return { uid: uid('s'), in: '', total: '' }; }
export function newPrep(n) { return { uid: uid('p'), name: `P${n}`, total: '', sample: '', mix: '', kind: null, steps: [newStep()], factor: '' }; }
export function newWell(n) { return { uid: uid('w'), label: `Well ${n}`, prep: null, positive: '', accepted: '', inMean: false }; }
export function initialState() {
    return {
        titer: false,
        touched: false,
        learn: null,
        exportDecimal: null,
        entry: 'typed',
        paste: { text: '', separator: null, headerRow: null, mapping: { well: null, positive: null, accepted: null } },
        instrument: '',
        target: '',
        pv: { value: '', unit: '', source: 'user' },
        preps: [newPrep(1)],
        wells: [newWell(1)],
        expected: '', expectedSource: '',
        titre: { dnase: null, dnaseText: '', lysis: null, lysisText: '', targetClass: null, targetClassText: '', ratio: '', ratioSource: '', low: '', high: '', rangeSource: '' },
    };
}
export const prepName = (state, p) => (blank(p.name) ? `P${state.preps.indexOf(p) + 1}` : p.name.trim());
export function wellPrep(state, w) {
    if (state.preps.length === 1)
        return state.preps[0];
    return state.preps.find((p) => p.uid === w.prep) || null;
}
export function splitPaste(text, headerRow) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1].trim() === '')
        lines.pop();
    const cells = lines.map((l) => l.split('\t'));
    const columns = cells.reduce((m, r) => Math.max(m, r.length), 0);
    if (headerRow === 'yes')
        return { headers: cells[0] || [], rows: cells.slice(1), columns };
    return { headers: null, rows: cells, columns };
}
export function wellRows(state) {
    if (state.entry !== 'pasted')
        return state.wells.map((w) => ({ ...w, pasted: false }));
    const { paste } = state;
    const m = paste.mapping;
    if (!paste.text.trim() || !paste.separator || !paste.headerRow || m.well === null || m.positive === null || m.accepted === null)
        return [];
    const split = splitPaste(paste.text, paste.headerRow);
    return split.rows.map((r, i) => {
        const kept = state.wells[i] || {};
        return { uid: kept.uid || `pasted-${i}`, label: m.well === 'number' ? String(i + 1) : (r[m.well] ?? ''), prep: kept.prep ?? null, positive: r[m.positive] ?? '', accepted: r[m.accepted] ?? '', inMean: Boolean(kept.inMean), pasted: true };
    });
}
export function formProblems(state) {
    const out = [];
    const names = state.preps.map((p) => prepName(state, p));
    state.preps.forEach((p, i) => { if (names.indexOf(names[i]) !== i)
        out.push({ key: `prep:${p.uid}:name`, text: UI.duplicatePrep(names[i]) }); });
    const rows = wellRows(state);
    const labels = rows.map((w) => String(w.label).trim());
    rows.forEach((w, i) => {
        if (!labels[i])
            out.push({ key: `well:${i}:label`, text: UI.blankWell });
        else if (labels.indexOf(labels[i]) !== i)
            out.push({ key: `well:${i}:label`, text: UI.duplicateWell(labels[i]) });
        if (!wellPrep(state, w))
            out.push({ key: `well:${i}:prep`, text: UI.missing.prep });
    });
    if (state.titer && state.titre.targetClass === 'other' && blank(state.titre.targetClassText))
        out.push({ key: 'titre:classText', text: UI.missing.typeIt });
    if (state.titer && state.titre.lysis === 'other' && blank(state.titre.lysisText))
        out.push({ key: 'titre:lysisText', text: UI.missing.typeIt });
    if (state.entry === 'pasted') {
        const p = state.paste;
        if (!p.text.trim())
            out.push({ key: 'paste:text', text: UI.missing.paste });
        if (!p.separator)
            out.push({ key: 'paste:separator', text: UI.missing.separator });
        if (!p.headerRow)
            out.push({ key: 'paste:header', text: UI.missing.header });
        if (p.mapping.well === null || p.mapping.positive === null || p.mapping.accepted === null)
            out.push({ key: 'paste:mapping', text: UI.missing.mapping });
    }
    return out;
}
const qty = (v) => (blank(v) ? null : { value: v, unit: UL });
const orNull = (v) => (blank(v) ? null : v);
export function caseOf(state) {
    const t = state.titre;
    const pv = state.pv;
    const pvDeclared = !blank(pv.value) || !blank(pv.unit);
    return {
        id: 'page',
        ...(state.learn && state.learn.volumeUnchanged ? { learnExampleVolumeUnchanged: true } : {}),
        mode: state.titer ? 'titre' : 'concentration',
        entry: state.entry,
        decimalSeparator: state.entry === 'pasted' ? state.paste.separator : null,
        instrument: orNull(state.instrument),
        targetName: orNull(state.target),
        partitionVolume: pvDeclared ? { value: pv.value, unit: orNull(pv.unit), source: pv.source } : null,
        preparations: state.preps.map((p) => ({
            prep: prepName(state, p),
            total: qty(p.total),
            sample: qty(p.sample),
            mix: qty(p.mix),
            dilution: {
                kind: p.kind,
                steps: p.kind === 'steps' ? p.steps.map((s) => ({ in: qty(s.in), total: qty(s.total) })) : null,
                factor: p.kind === 'factor' ? orNull(p.factor) : null,
            },
        })),
        wells: wellRows(state).filter((w) => wellPrep(state, w)).map((w) => ({
            well: String(w.label).trim(), prep: prepName(state, wellPrep(state, w)), positive: orNull(w.positive), accepted: orNull(w.accepted), inMean: w.inMean,
        })),
        expectedAccepted: orNull(state.expected),
        titre: state.titer ? {
            dnase: t.dnase, dnaseText: orNull(t.dnaseText), lysis: t.lysis, lysisText: orNull(t.lysisText),
            targetClass: t.targetClass, targetClassText: orNull(t.targetClassText),
            replicateRatio: orNull(t.ratio),
            reliableRange: blank(t.low) && blank(t.high) ? null : { low: orNull(t.low), high: orNull(t.high) },
        } : null,
    };
}
export const separatorOf = (state) => (state.entry === 'pasted' ? state.paste.separator : '.');
export function fieldNotes(state) {
    const notes = {};
    const sep = separatorOf(state);
    const miss = (key, text) => { notes[key] = { ...(notes[key] || {}), missing: text }; };
    const grammar = (key, text, fieldKey) => {
        if (!sep || blank(text))
            return;
        const r = readNumber(text, sep);
        if (r.kind === 'ok')
            return;
        const message = r.kind === 'sign' ? MSG['T1-HI-09-sign'](FIELD[fieldKey]) : MSG[`T1-HI-09-${r.kind}`](FIELD[fieldKey], r.text, sep);
        notes[key] = { ...(notes[key] || {}), refusal: message };
    };
    if (blank(state.instrument))
        miss('instrument', UI.missing.enter);
    if (blank(state.target))
        miss('target', UI.missing.enter);
    if (blank(state.pv.value))
        miss('pv:value', UI.missing.enter);
    if (blank(state.pv.unit))
        miss('pv:unit', UI.missing.unit);
    grammar('pv:value', state.pv.value, 'partitionVolume');
    for (const p of state.preps) {
        const k = `prep:${p.uid}`;
        if (blank(p.total))
            miss(`${k}:total`, UI.missing.enter);
        if (blank(p.sample))
            miss(`${k}:sample`, UI.missing.enter);
        grammar(`${k}:total`, p.total, 'total');
        grammar(`${k}:sample`, p.sample, 'sample');
        grammar(`${k}:mix`, p.mix, 'mix');
        if (!p.kind)
            miss(`${k}:kind`, UI.missing.choose);
        if (p.kind === 'factor') {
            if (blank(p.factor))
                miss(`${k}:factor`, UI.missing.factor);
            grammar(`${k}:factor`, p.factor, 'factor');
        }
        if (p.kind === 'steps') {
            if (p.steps.length === 0 || p.steps.some((s) => blank(s.in) || blank(s.total)))
                miss(`${k}:steps`, UI.missing.step);
            p.steps.forEach((s, i) => { grammar(`${k}:step:${i}:in`, s.in, 'stepIn'); grammar(`${k}:step:${i}:total`, s.total, 'stepTotal'); });
        }
    }
    const rows = wellRows(state);
    if (state.entry === 'typed' && rows.length === 0)
        miss('wells', UI.missing.wells);
    rows.forEach((w, i) => {
        if (blank(w.positive) || blank(w.accepted))
            miss(`well:${i}:counts`, UI.missing.counts);
        grammar(`well:${i}:positive`, w.positive, 'positive');
        grammar(`well:${i}:accepted`, w.accepted, 'accepted');
    });
    grammar('expected', state.expected, 'expectedAccepted');
    if (state.titer) {
        const t = state.titre;
        if (!t.dnase)
            miss('titre:dnase', UI.missing.choose);
        else if (t.dnase === 'other' && blank(t.dnaseText))
            miss('titre:dnaseText', UI.missing.method);
        if (!t.lysis)
            miss('titre:lysis', UI.missing.choose);
        if (!t.targetClass)
            miss('titre:class', UI.missing.choose);
        grammar('titre:ratio', t.ratio, 'replicateRatio');
        grammar('titre:low', t.low, 'rangeLow');
        grammar('titre:high', t.high, 'rangeHigh');
        if (blank(t.low) !== blank(t.high))
            notes['titre:range'] = { ...(notes['titre:range'] || {}), advice: UI.rangeOneEnd };
    }
    for (const pr of formProblems(state))
        notes[pr.key] = { ...(notes[pr.key] || {}), missing: pr.text };
    return notes;
}
export function insertPanelValue(state, id) {
    const e = PANEL_ENTRIES[id];
    state.pv = { value: e.value, unit: e.unit, source: { panel: id } };
}
