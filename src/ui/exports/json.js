import { CONFIG } from '../../config.js';
import { ENGINE_VERSION, ORDER_OF_EVALUATION } from '../../engine/version.js';
import { RULED, UI, RESEARCH_USE } from '../text.js';
import { panelEntry, entryName, PANEL_VERSION } from '../published.js';
import { citationText } from '../chrome.js';
import { prepName, wellRows, wellPrep } from '../state.js';
import { sourceText } from '../form.js';
import { wellWorkingSteps, meanWorkingSteps } from '../working.js';
import { MISSING_NAMES } from '../results.js';
import { includedConstants, assumptionRows } from './register.js';
import { PUBLISHED_ROW, scopeWords, RESULT_TEXT, OVERALL_RELATION, UNDEFINED_NOTE, DECLARATION_LABELS, INPUT_LABELS, DECIMAL_TOOL_RULE, OUTCOME_WORDS, ORDER_WORDS } from './signed.js';
import { exportDate } from './record.js';
export const JSON_EXPORT_ENABLED = true;
export const SCHEMA = Object.freeze({ name: 'ligant-benchtools-record', version: '1.0.0', url: 'https://benchtools.ligant.ai/digital-pcr-calculator/schema/ligant-benchtools-record-1.0.0.schema.json' });
const UL = 'µL';
const blank = (s) => s === null || s === undefined || String(s).trim() === '';
const user = () => ({ kind: 'user', words: RULED.usersOwn, constant: null });
const userOrNamed = (src) => (blank(src) ? user() : { kind: 'user-named-source', words: src.trim(), constant: null });
const stepName = (prep, i) => `${prep} step ${i}`;
const stepWords = (s) => { const [p, n] = s.split('/'); return stepName(p, n); };
function declarationsOf(state) {
    const t = state.titre;
    const d = [];
    const add = (id, label, of, value, text, unit, basis) => d.push({ id, label, of, value, text, unit, basis });
    add('mode', DECLARATION_LABELS.mode, null, state.titer ? 'titer' : 'base', state.titer ? UI.on : UI.off, null, user());
    add('data-entry', DECLARATION_LABELS['data-entry'], null, state.entry, UI.entryOptions[state.entry], null, user());
    if (state.entry === 'typed')
        add('decimal-separator', DECLARATION_LABELS['decimal-separator'], null, '.', UI.separatorOptions['.'], null, { kind: 'tool-rule', words: DECIMAL_TOOL_RULE, constant: null });
    else if (state.paste.separator)
        add('decimal-separator', DECLARATION_LABELS['decimal-separator'], null, state.paste.separator, UI.separatorOptions[state.paste.separator], null, user());
    const src = state.pv.source;
    if (src && typeof src === 'object') {
        const words = sourceText(src);
        add('partition-volume-source', DECLARATION_LABELS['partition-volume-source'], null, src.panel, words, null, { kind: 'published-value', words, constant: 'published-partition-volume' });
    }
    else
        add('partition-volume-source', DECLARATION_LABELS['partition-volume-source'], null, 'user', RULED.usersOwn, null, user());
    if (!blank(state.instrument))
        add('instrument', RULED.instrument, null, null, state.instrument.trim(), null, user());
    if (!blank(state.target))
        add('target-name', RULED.targetName, null, null, state.target.trim(), null, user());
    if (!blank(state.expected))
        add('expected-accepted', UI.expected, null, state.expected.trim(), state.expected.trim(), null, userOrNamed(state.expectedSource));
    const kinds = { none: RULED.notDiluted, steps: RULED.dilutionSteps, factor: RULED.oneFactor };
    for (const p of state.preps)
        if (p.kind)
            add(`dilution:${prepName(state, p)}`, DECLARATION_LABELS.dilution, prepName(state, p), p.kind, kinds[p.kind], null, user());
    if (state.titer) {
        if (t.dnase)
            add('free-dna', RULED.freeDna, null, t.dnase, RULED.freeDnaOptions[t.dnase], null, user());
        if (t.dnase === 'other' && !blank(t.dnaseText))
            add('free-dna-method', DECLARATION_LABELS['free-dna-method'], null, null, t.dnaseText.trim(), null, user());
        if (t.lysis)
            add('capsid-opening', UI.lysisLegend, null, t.lysis, RULED.lysisOptions[t.lysis], null, user());
        if (t.lysis && !blank(t.lysisText))
            add('capsid-opening-conditions', RULED.lysisConditions, null, null, t.lysisText.trim(), null, user());
        if (t.targetClass)
            add('target-class', UI.classLegend, null, t.targetClass, t.targetClass === 'other' && !blank(t.targetClassText) ? t.targetClassText.trim() : RULED.classOptions[t.targetClass], null, user());
        if (!blank(t.ratio))
            add('ratio-limit', RULED.ratioLimit, null, t.ratio.trim(), t.ratio.trim(), null, userOrNamed(t.ratioSource));
        if (!blank(t.low) && !blank(t.high)) {
            add('range-low', UI.recordRange.low, null, t.low.trim(), t.low.trim(), 'copies per µL of reaction', userOrNamed(t.rangeSource));
            add('range-high', UI.recordRange.high, null, t.high.trim(), t.high.trim(), 'copies per µL of reaction', userOrNamed(t.rangeSource));
        }
    }
    return d;
}
function constantsOf(state) {
    const rows = includedConstants().map((c) => ({ ...c, source: c.source ? { ...c.source, quotes: [...c.source.quotes] } : null }));
    const src = state.pv.source;
    if (src && typeof src === 'object') {
        const f = panelEntry(src.panel);
        rows.push({
            id: 'published-partition-volume', name: `${PUBLISHED_ROW.namePrefix}${entryName(f)}`, value: f.entry.value, unit: f.entry.unit,
            kind: PUBLISHED_ROW.kind, status: PUBLISHED_ROW.status, basis: PUBLISHED_ROW.basis, appliesTo: PUBLISHED_ROW.appliesTo,
            source: { citation: `${f.group.group}: ${f.group.source}`, url: f.group.url, dateRead: f.group.read, quotes: [...(f.group.sharedQuote ? [f.group.sharedQuote] : []), ...f.entry.quotes], tableVersion: PANEL_VERSION, note: RULED.cannotKnow },
            labelledAs: null,
        });
    }
    return rows;
}
function inputsOf(state, result, rows) {
    const out = [];
    const pv = state.pv;
    let converted = null;
    if (result.status === 'result' && pv.unit && pv.unit !== UL) {
        const text = result.partitionVolume.microLitre.text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        converted = { text, unit: UL, unrounded: result.partitionVolume.microLitre.unrounded };
    }
    const unit = ['nL', 'pL', UL].includes(pv.unit) ? pv.unit : null;
    out.push({ id: 'partition-volume', label: INPUT_LABELS['partition-volume'], of: null, entered: pv.value.trim(), unit, converted, restsOn: ['partition-volume-source', 'unit-conversion'] });
    const prepInputs = {};
    for (const p of state.preps) {
        const name = prepName(state, p);
        const dil = p.kind ? [`dilution:${name}`] : [];
        const ids = [];
        const push = (id, label, of, entered, unit, restsOn = []) => { out.push({ id, label, of, entered: entered.trim(), unit, converted: null, restsOn }); ids.push(id); };
        push(`total:${name}`, INPUT_LABELS.total, name, p.total, UL);
        push(`sample:${name}`, INPUT_LABELS.sample, name, p.sample, UL);
        if (!blank(p.mix))
            push(`mix:${name}`, INPUT_LABELS.mix, name, p.mix, UL);
        if (p.kind === 'steps')
            p.steps.forEach((s, i) => {
                push(`step-in:${stepName(name, i + 1)}`, INPUT_LABELS['step-in'], stepName(name, i + 1), s.in, UL, dil);
                push(`step-total:${stepName(name, i + 1)}`, INPUT_LABELS['step-total'], stepName(name, i + 1), s.total, UL, dil);
            });
        if (p.kind === 'factor')
            push(`factor:${name}`, RULED.oneFactor, name, p.factor, null, dil);
        prepInputs[name] = ids;
    }
    const wellInputs = {};
    for (const w of rows) {
        const label = String(w.label).trim();
        out.push({ id: `positive:${label}`, label: INPUT_LABELS.positive, of: label, entered: String(w.positive).trim(), unit: null, converted: null, restsOn: [] });
        out.push({ id: `accepted:${label}`, label: INPUT_LABELS.accepted, of: label, entered: String(w.accepted).trim(), unit: null, converted: null, restsOn: [] });
        wellInputs[label] = [`positive:${label}`, `accepted:${label}`];
    }
    return { inputs: out, prepInputs, wellInputs };
}
function context(declared) {
    return ['partition-volume-source', 'instrument', 'target-name', 'free-dna', 'free-dna-method', 'capsid-opening', 'capsid-opening-conditions', 'target-class'].filter((id) => declared.has(id));
}
function outcomeOf(result, problems) {
    const base = { missing: [], refusals: [], notSupported: [], message: null };
    if (problems.length)
        return { status: 'incomplete', words: OUTCOME_WORDS.incomplete, ...base, missing: [...new Set(problems.map((p) => p.text))] };
    switch (result.status) {
        case 'result': return { status: 'result', words: OUTCOME_WORDS.result, ...base };
        case 'incomplete': return { status: 'incomplete', words: OUTCOME_WORDS.incomplete, ...base, missing: result.incomplete.map((id) => MISSING_NAMES[id]).filter(Boolean) };
        case 'rejected': return { status: 'refused', words: OUTCOME_WORDS.refused, ...base, refusals: result.refusals.map((r) => ({ message: r.message, names: [...r.wells, ...r.preps, ...r.steps.map(stepWords)] })) };
        case 'unsupported': return { status: 'unsupported', words: OUTCOME_WORDS.unsupported, ...base, notSupported: [UI.unitNotOffered] };
        default: return { status: 'error', words: OUTCOME_WORDS.error, ...base, message: UI.malformed };
    }
}
const value = (status, x, note = null) => (status === 'computed'
    ? { status, unrounded: x.unrounded, display: x.display, note: null }
    : { status, unrounded: null, display: x && x.display ? x.display : null, note });
export function recordJson(state, result, problems = [], date = exportDate()) {
    const rows = wellRows(state).filter((w) => wellPrep(state, w));
    const declarations = declarationsOf(state);
    const declared = new Set(declarations.map((d) => d.id));
    const { inputs, prepInputs, wellInputs } = inputsOf(state, result, rows);
    const outcome = outcomeOf(result, problems);
    const computed = outcome.status === 'result';
    const results = [];
    const prepResults = {};
    const wellResults = {};
    const ctx = context(declared);
    const R = RESULT_TEXT;
    const res = (id, kind, of, unit, working, v, restsOn, label = R[kind].label) => results.push({ id, label, of, unit, relation: R[kind].relation, working, ...v, restsOn });
    if (computed) {
        const sources = new Map(state.preps.map((p) => [prepName(state, p), p]));
        const pvSource = sourceText(state.pv.source);
        for (const p of state.preps) {
            const name = prepName(state, p);
            const wells = result.wells.filter((w) => w.prep === name);
            prepResults[name] = [];
            if (!wells.length)
                continue;
            const w0 = wells[0];
            const steps = wellWorkingSteps(p, result, w0, pvSource).map(([, f]) => f);
            const findStep = (prefix) => steps.find((f) => f.startsWith(prefix)) ?? null;
            const dil = p.kind ? [`dilution:${name}`] : [];
            res(`template-ratio:${name}`, 'template-ratio', name, null, findStep('r = R ÷ V'), value('computed', w0.ratio), ['template-ratio-relation']);
            prepResults[name].push(`template-ratio:${name}`);
            w0.factors.forEach((f, i) => {
                const id = `step-factor:${stepName(name, i + 1)}`;
                res(id, 'step-factor', stepName(name, i + 1), null, findStep(`f_${i + 1} =`), value('computed', f), [...dil, 'dilution-factor-relation'], R['step-factor'].label.replace('{i}', String(i + 1)));
                prepResults[name].push(id);
            });
            res(`overall-factor:${name}`, 'overall-factor', name, null, findStep('F ='), value('computed', w0.F), [...dil, 'dilution-factor-relation']);
            results[results.length - 1].relation = OVERALL_RELATION[p.kind];
            prepResults[name].push(`overall-factor:${name}`);
            for (const w of wells) {
                const label = w.well;
                const work = wellWorkingSteps(sources.get(name), result, w, pvSource).map(([, f]) => f);
                const at = (prefix) => work.find((f) => f.startsWith(prefix)) ?? null;
                const undef = w.status === 'undefined';
                const st = undef ? 'undefined' : 'computed';
                const ids = [];
                const add = (kind, unit, working, v, restsOn) => { const id = `${kind}:${label}`; res(id, kind, label, unit, working, v, restsOn); ids.push(id); };
                add('p', null, at('p = k'), value('computed', w.p), []);
                add('lambda', null, undef ? null : at('lambda ='), value(st, w.lambda, undef ? UNDEFINED_NOTE : null), ['poisson-relation', 'lambda-evaluation']);
                ids.push(...prepResults[name]);
                add('copies-per-ul-reaction', 'copies per µL of reaction', undef ? null : at('c_rxn = lambda'), value(st, w.cRxn, undef ? UNDEFINED_NOTE : null), [...ctx, 'copies-per-reaction-relation']);
                add('copies-per-ul-diluted', 'copies per µL of the diluted sample', undef ? null : at('c_rxn × r'), value(st, w.cDil, undef ? UNDEFINED_NOTE : null), [...ctx, 'copies-per-reaction-relation', 'template-ratio-relation']);
                const orig = [...ctx, ...dil, 'copies-per-reaction-relation', 'template-ratio-relation', 'dilution-factor-relation'];
                add('copies-per-ul-original', 'copies per µL of the original sample', undef ? null : at('(c_rxn × r)'), value(st, w.cOrig, undef ? UNDEFINED_NOTE : null), orig);
                add('copies-per-ml-original', result.label.unit, undef ? null : work[work.length - 1], value(st, w.perMl, undef ? UNDEFINED_NOTE : null), [...orig, 'ul-per-ml']);
                wellResults[label] = ids;
            }
        }
        const m = result.mean;
        if (m) {
            const mPreps = [...new Set(result.wells.filter((w) => w.inMean).map((w) => w.prep))];
            const mctx = [...ctx, ...mPreps.filter((p) => declared.has(`dilution:${p}`)).map((p) => `dilution:${p}`), 'mean-relation'];
            if (m.status === 'computed') {
                const work = meanWorkingSteps(result).map(([, f]) => f);
                res('mean-copies-per-ul-original', 'mean-copies-per-ul-original', null, 'copies per µL of the original sample', work[0], value('computed', m.cOrig), mctx);
                res('mean-copies-per-ml-original', 'mean-copies-per-ml-original', null, result.label.unit, work[1], value('computed', m.perMl), [...mctx, 'ul-per-ml']);
            }
            else {
                const note = UI.meanWithheld((m.reasonWells && m.reasonWells['undefined-well']) || []);
                res('mean-copies-per-ul-original', 'mean-copies-per-ul-original', null, 'copies per µL of the original sample', null, value('withheld', null, note), mctx);
                res('mean-copies-per-ml-original', 'mean-copies-per-ml-original', null, result.label.unit, null, value('withheld', null, note), [...mctx, 'ul-per-ml']);
            }
        }
        const fl08 = result.flags.find((f) => f.display === 'FL-08');
        if (fl08) {
            const [high, low] = fl08.wells.map((n) => result.wells.find((w) => w.well === n));
            if (fl08.ratioDisplay === 'no finite value') {
                res('highest-to-lowest', 'highest-to-lowest', null, null, null, { status: 'undefined', unrounded: null, display: 'no finite value', note: UI.noFiniteRatio(low.well) }, ['ratio-limit']);
            }
            else {
                res('highest-to-lowest', 'highest-to-lowest', null, null, `${high.cOrig.display} ÷ ${low.cOrig.display} = ${fl08.ratioDisplay}`, { status: 'computed', unrounded: fl08.unrounded, display: fl08.ratioDisplay, note: null }, ['ratio-limit']);
            }
        }
    }
    const flags = computed ? result.flags.map((f) => ({
        code: f.display, words: [...f.messages], names: f.display === 'FL-08' && f.ratioDisplay === 'no finite value' ? [f.wells[1]] : [...(f.wells || []), ...(f.steps || []).map(stepWords)], results: f.display === 'FL-08' ? ['highest-to-lowest'] : [],
    })) : [];
    const flagsNaming = (label) => flags.filter((f) => f.names.includes(label)).map((f) => f.code);
    const m = computed ? result.mean : null;
    return {
        format: { name: SCHEMA.name, version: SCHEMA.version, schema: SCHEMA.url },
        madeWith: {
            suiteId: CONFIG.toolId, name: 'Ligant · Digital PCR Calculator', address: `${CONFIG.publicBase}${CONFIG.slug}/`,
            toolVersion: CONFIG.version, engineVersion: ENGINE_VERSION, engineCode: CONFIG.engineTagUrl(ENGINE_VERSION),
            orderOfEvaluation: { version: ORDER_OF_EVALUATION, words: ORDER_WORDS },
        },
        date,
        statements: { scope: scopeWords(state.titer), researchUse: RESEARCH_USE, citation: citationText(), doi: CONFIG.doi ?? null },
        precision: { display: RULED.precision, rounding: RULED.rounding },
        outcome,
        declarations,
        constants: constantsOf(state),
        assumptions: assumptionRows().map(({ assumption, appliesTo, status }) => ({ assumption, appliesTo, status })),
        inputs,
        results,
        flags,
        tool: {
            shape: { name: 'Digital PCR Calculator', version: '1.0.0' },
            label: computed ? { unit: result.label.unit, target: result.label.target, line: result.label.line } : null,
            headline: computed ? result.headline : null,
            recordLabel: computed ? result.recordLabel : null,
            preparations: state.preps.map((p) => {
                const name = prepName(state, p);
                return { name, dilution: `dilution:${name}`, inputs: prepInputs[name], results: computed ? prepResults[name] : [] };
            }),
            wells: rows.map((w) => {
                const label = String(w.label).trim();
                const rw = computed ? result.wells.find((x) => x.well === label) : null;
                return {
                    name: label, preparation: prepName(state, wellPrep(state, w)), inMean: Boolean(w.inMean),
                    status: rw ? rw.status : 'not-computed', inputs: wellInputs[label], results: rw ? wellResults[label] : [], flags: rw ? flagsNaming(label) : [],
                };
            }),
            mean: m ? {
                status: m.status, words: UI.exp.meanWords, sentence: m.status === 'computed' ? RULED.meanSentence(m.wells.length) : null, wells: m.wells,
                preparations: [...new Set(result.wells.filter((w) => w.inMean).map((w) => w.prep))],
                notIncluded: result.wells.filter((w) => !w.inMean).map((w) => w.well),
                results: ['mean-copies-per-ul-original', 'mean-copies-per-ml-original'],
            } : null,
        },
    };
}
export function jsonText(state, result, problems = [], date) {
    return `${JSON.stringify(recordJson(state, result, problems, date), null, 2)}\n`;
}
