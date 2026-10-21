import { RULED, UI } from './text.js';
import { panelEntry, entryName } from './published.js';
import { prepName } from './state.js';
const blank = (s) => s === null || s === undefined || String(s).trim() === '';
function sourceShort(source) {
    if (source && typeof source === 'object') {
        const f = panelEntry(source.panel);
        if (f)
            return `${UI.headings.panel}: ${entryName(f)}`;
    }
    return RULED.usersOwn;
}
function dilutionText(p) {
    if (p.kind === 'none')
        return UI.block.notDiluted;
    if (p.kind === 'steps')
        return UI.block.steps(p.steps.length);
    return UI.block.factor(p.factor.trim());
}
export function declarationItems(state, result) {
    const B = UI.block;
    const items = [{ id: 'titer', label: B.titer, value: state.titer ? UI.on : UI.off }];
    if (state.entry === 'pasted')
        items.push({ id: 'separator', label: B.separator, value: state.paste.separator });
    items.push({ id: 'instrument', label: RULED.instrument, value: state.instrument.trim(), free: true });
    items.push({ id: 'partition-volume', label: RULED.partitionVolume, value: result.partitionVolume.echo });
    items.push({ id: 'pv-source', label: B.source, value: sourceShort(state.pv.source), wrap: true });
    items.push({ id: 'target', label: RULED.targetName, value: state.target.trim(), free: true });
    if (!blank(state.expected))
        items.push({ id: 'expected', label: B.expected, value: state.expected.trim() });
    if (state.titer) {
        const t = state.titre;
        const free = (prefix, text) => ({ prefix, text: text.trim() });
        const dnase = t.dnase === 'other' ? free(UI.block.dnaseOther, t.dnaseText) : null;
        items.push(dnase
            ? { id: 'free-dna', label: RULED.freeDna, value: dnase.text, prefix: `${dnase.prefix}: `, free: true }
            : { id: 'free-dna', label: RULED.freeDna, value: RULED.freeDnaOptions[t.dnase] });
        const lysis = RULED.lysisOptions[t.lysis];
        items.push(blank(t.lysisText)
            ? { id: 'lysis', label: UI.lysisLegend, value: lysis, wrap: true }
            : { id: 'lysis', label: UI.lysisLegend, value: t.lysisText.trim(), prefix: `${lysis}: `, free: true });
        items.push(t.targetClass === 'other'
            ? { id: 'target-class', label: UI.classLegend, value: t.targetClassText.trim(), prefix: `${UI.block.classOther}: `, free: true }
            : { id: 'target-class', label: UI.classLegend, value: RULED.classOptions[t.targetClass] });
        if (!blank(t.ratio))
            items.push({ id: 'ratio-limit', label: B.limit, value: t.ratio.trim() });
        if (!blank(t.low) && !blank(t.high))
            items.push({ id: 'range', label: B.range, value: `${t.low.trim()} ${UI.rangeTo} ${t.high.trim()} ${UI.rangeUnit}` });
    }
    return items;
}
export function preparationLines(state) {
    return state.preps.map((p) => ({
        id: `prep-${p.uid}`,
        label: prepName(state, p),
        value: UI.block.prepLine({ total: p.total.trim(), sample: p.sample.trim(), mix: p.mix.trim(), dilution: dilutionText(p) }),
    }));
}
export function flagItems(result) {
    return result.flags.map((f) => {
        let count = '';
        if (f.display === 'FL-06')
            count = UI.count.steps(f.steps.length);
        else if (f.wells && f.wells.length)
            count = UI.count.wells(f.wells.length);
        return { code: f.display, title: UI.flagLegend[f.display], count };
    });
}
export function blockModel(state, result) {
    return { declarations: declarationItems(state, result), preparations: preparationLines(state), flags: flagItems(result), flagForm: 'chips', noFlags: UI.noFlags };
}
