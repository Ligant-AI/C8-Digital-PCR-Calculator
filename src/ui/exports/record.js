import { CONFIG } from '../../config.js';
import { ENGINE_VERSION, ORDER_OF_EVALUATION } from '../../engine/version.js';
import { RULED, UI, RESEARCH_USE } from '../text.js';
import { panelEntry, PANEL_VERSION } from '../published.js';
import { citationText } from '../chrome.js';
import { prepName, separatorOf } from '../state.js';
import { wellWorkingSteps, meanWorkingSteps } from '../working.js';
import { sourceText } from '../form.js';
import { registerRows, assumptionRows } from './register.js';
import { scopeWords } from './signed.js';
const blank = (s) => s === null || s === undefined || String(s).trim() === '';
const UL = 'µL';
export function exportDate(now = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
function partitionVolumeSource(state) {
    const src = state.pv.source;
    if (src && typeof src === 'object') {
        const f = panelEntry(src.panel);
        return {
            kind: 'published', id: f.entry.id, platform: f.group.group, item: f.entry.item, source: f.group.source, url: f.group.url, read: f.group.read,
            quotes: [...(f.group.sharedQuote ? [f.group.sharedQuote] : []), ...f.entry.quotes], panelVersion: PANEL_VERSION, note: RULED.cannotKnow, text: sourceText(src),
        };
    }
    return { kind: 'user', text: RULED.usersOwn };
}
export function buildRecord(state, result, date = exportDate()) {
    const titer = state.titer;
    const t = state.titre;
    const sep = separatorOf(state);
    const source = sourceText(state.pv.source);
    const preps = state.preps.map((p) => ({
        name: prepName(state, p),
        total: { entered: p.total.trim(), unit: UL },
        sample: { entered: p.sample.trim(), unit: UL },
        mix: blank(p.mix) ? null : { entered: p.mix.trim(), unit: UL },
        dilution: p.kind === 'steps' ? { kind: 'steps', label: RULED.dilutionSteps, steps: p.steps.map((s) => ({ in: { entered: s.in.trim(), unit: UL }, total: { entered: s.total.trim(), unit: UL } })) }
            : p.kind === 'factor' ? { kind: 'factor', label: RULED.oneFactor, factor: p.factor.trim() } : { kind: 'none', label: RULED.notDiluted },
    }));
    const wells = result.wells.map((w) => {
        const prep = state.preps.find((p) => prepName(state, p) === w.prep);
        const v = (x) => (x ? { display: x.display, unrounded: x.unrounded } : { display: null, unrounded: null });
        return {
            well: w.well, prep: w.prep, positive: w.echo.positive, accepted: w.echo.accepted, inMean: w.inMean, status: w.status,
            p: { ...v(w.p), fraction: w.p.fraction }, lambda: v(w.lambda), cRxn: v(w.cRxn), ratio: v(w.ratio), factors: w.factors.map(v), F: v(w.F), cDil: v(w.cDil), cOrig: v(w.cOrig), perMl: v(w.perMl),
            flags: result.flags.filter((f) => (f.wells || []).includes(w.well)).map((f) => f.display),
            working: wellWorkingSteps(prep, result, w, source),
        };
    });
    const m = result.mean;
    const mean = !m ? null : m.status === 'computed'
        ? { status: 'computed', words: UI.exp.meanWords, wells: m.wells, preparations: [...new Set(result.wells.filter((w) => w.inMean).map((w) => w.prep))], notIncluded: result.wells.filter((w) => !w.inMean).map((w) => w.well),
            cOrig: { display: m.cOrig.display, unrounded: m.cOrig.unrounded }, perMl: { display: m.perMl.display, unrounded: m.perMl.unrounded }, sentence: RULED.meanSentence(m.wells.length), working: meanWorkingSteps(result) }
        : { status: 'withheld', wells: m.wells, reasonWells: (m.reasonWells && m.reasonWells['undefined-well']) || [], words: UI.meanWithheld((m.reasonWells && m.reasonWells['undefined-well']) || []) };
    const optional = (value, src) => (blank(value) ? null : { entered: value.trim(), source: UI.exp.sourceNamed(src && src.trim()) });
    return {
        tool: {
            name: 'Ligant · Digital PCR Calculator', version: CONFIG.version, engine: ENGINE_VERSION, orderOfEvaluation: ORDER_OF_EVALUATION, date,
            url: `${CONFIG.publicBase}${CONFIG.slug}/`, code: CONFIG.engineTagUrl(ENGINE_VERSION), citation: citationText(),
            scope: [RESEARCH_USE, scopeWords(titer)],
        },
        mode: titer ? 'titer' : 'base',
        entry: { kind: state.entry, decimalSeparator: state.entry === 'pasted' ? sep : null },
        inputs: {
            partitionVolume: { entered: state.pv.value.trim(), unit: state.pv.unit, microLitre: result.partitionVolume.microLitre.text, echo: result.partitionVolume.echo },
            preparations: preps,
        },
        declarations: {
            instrument: state.instrument.trim(),
            targetName: state.target.trim(),
            partitionVolumeSource: partitionVolumeSource(state),
            expectedAccepted: optional(state.expected, state.expectedSource),
            titer: titer ? {
                freeDna: { answer: RULED.freeDnaOptions[t.dnase], method: t.dnase === 'other' ? t.dnaseText.trim() : null },
                capsidOpening: { answer: RULED.lysisOptions[t.lysis], conditions: blank(t.lysisText) ? null : t.lysisText.trim() },
                targetClass: t.targetClass === 'other' ? t.targetClassText.trim() : RULED.classOptions[t.targetClass],
                ratioLimit: optional(t.ratio, t.ratioSource),
                workingRange: blank(t.low) || blank(t.high) ? null : { low: t.low.trim(), high: t.high.trim(), source: UI.exp.sourceNamed(t.rangeSource.trim()) },
            } : null,
        },
        constants: {
            poisson: { relation: UI.exp.poisson, source: RULED.quanCitation, quote: RULED.quanQuote, mapping: UI.exp.poissonMapping },
        },
        result: {
            label: result.headline || result.label.unit,
            labelLine: result.label.line,
            recordLabel: result.recordLabel,
            wells,
            mean,
        },
        flags: result.flags.map((f) => ({ code: f.display, words: f.messages })),
        display: { precision: RULED.precision, rounding: RULED.rounding },
        register: registerRows(),
        assumptions: assumptionRows(),
    };
}
