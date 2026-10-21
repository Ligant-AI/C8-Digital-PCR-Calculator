import { validate } from './validate.js';
import { ORDER_OF_EVALUATION, ENGINE_VERSION } from './version.js';
import { lambdaOf } from './lambda.js';
import { formatEstimate, formatLambda, formatRatio, formatFraction, UNDEFINED_TEXT } from './numfmt.js';
import { labelOf, headlineOf, recordLabelOf } from './labels.js';
import { flagsOf } from './flags.js';
import { echoVolume } from './units.js';
import * as D from './decimal.js';
import { readNumber } from './parse.js';
const estimate = (x) => ({ unrounded: x, display: formatEstimate(x) });
const ratioValue = (x) => ({ unrounded: x, display: formatRatio(x) });
function base(id) {
    return { id, status: null, incomplete: [], rejections: [], questions: [], order: ORDER_OF_EVALUATION, flags: [], label: null, wells: [], mean: null };
}
export function preparationValues(prep) {
    const R = Number(prep.total.norm);
    const V = Number(prep.sample.norm);
    const ratio = R / V;
    let factors = [];
    let F;
    if (prep.kind === 'steps') {
        factors = prep.steps.map((s) => Number(s.total.norm) / Number(s.in.norm));
        F = factors[0];
        for (let i = 1; i < factors.length; i++)
            F = F * factors[i];
    }
    else if (prep.kind === 'factor') {
        F = Number(prep.factor.norm);
    }
    else {
        F = 1;
    }
    return { ratio, factors, F };
}
function wellResult(read, prepValues, vd) {
    const { w, k, n } = read;
    const kNum = Number(k.norm);
    const nNum = Number(n.norm);
    const p = kNum / nNum;
    const { ratio, factors, F } = prepValues;
    const out = {
        well: w.well,
        prep: w.prep,
        echo: { positive: w.positive, accepted: w.accepted },
        inMean: w.inMean,
        status: 'computed',
        p: { unrounded: p, display: formatRatio(p), fraction: formatFraction(k.dec, n.dec, D.groupedInteger) },
        lambda: null,
        cRxn: null,
        ratio: ratioValue(ratio),
        factors: factors.map(ratioValue),
        F: ratioValue(F),
        cDil: null,
        cOrig: null,
        perMl: null,
    };
    if (D.eq(k.dec, n.dec)) {
        out.status = 'undefined';
        out.lambda = { unrounded: null, display: null };
        out.cRxn = { unrounded: null, display: null };
        out.cDil = { unrounded: null, display: null };
        out.cOrig = { unrounded: null, display: UNDEFINED_TEXT };
        out.perMl = { unrounded: null, display: UNDEFINED_TEXT };
        return out;
    }
    const lambda = lambdaOf(p);
    const cRxn = lambda / vd;
    const cDil = cRxn * ratio;
    const cOrig = cDil * F;
    const perMl = cOrig * 1000;
    out.lambda = { unrounded: lambda, display: formatLambda(lambda) };
    out.cRxn = estimate(cRxn);
    out.cDil = estimate(cDil);
    out.cOrig = estimate(cOrig);
    out.perMl = estimate(perMl);
    return out;
}
export function meanOf(wells) {
    const ticked = wells.filter((w) => w.inMean);
    if (ticked.length < 2)
        return null;
    const names = ticked.map((w) => w.well);
    const undefinedWells = ticked.filter((w) => w.status === 'undefined').map((w) => w.well);
    if (undefinedWells.length) {
        return { status: 'withheld', wells: names, cOrig: null, perMl: null, reasons: ['undefined-well'], reasonWells: { 'undefined-well': undefinedWells } };
    }
    let sum = 0;
    for (const w of ticked)
        sum = sum + w.cOrig.unrounded;
    const mean = sum / ticked.length;
    return { status: 'computed', wells: names, cOrig: estimate(mean), perMl: estimate(mean * 1000), reasons: [] };
}
export function determine(c) {
    const id = c && typeof c === 'object' && typeof c.id === 'string' ? c.id : null;
    const v = validate(c);
    switch (v.status) {
        case 'error':
            return { id, status: 'error', message: v.message };
        case 'incomplete':
            return { ...base(id), status: 'incomplete', incomplete: v.incomplete };
        case 'rejected':
            return { ...base(id), status: 'rejected', rejections: v.rejections, refusals: v.refusals };
        case 'unsupported':
            return { ...base(id), status: 'unsupported', questions: v.questions };
        default:
            break;
    }
    const { values } = v;
    const vd = values.pv.micro.value;
    const prepValues = new Map(values.preps.map((p) => [p.p.prep, preparationValues(p)]));
    const wells = values.wells.map((read) => wellResult(read, prepValues.get(read.w.prep), vd));
    const mean = meanOf(wells);
    const flags = flagsOf(c, values, wells, mean);
    const label = labelOf(c);
    const sep = values.separator;
    return {
        ...base(id),
        status: 'result',
        flags,
        label,
        wells,
        mean,
        engine: ENGINE_VERSION,
        headline: c.mode === 'titre' ? headlineOf(label) : null,
        recordLabel: recordLabelOf(c, mean && mean.status === 'computed' ? mean.wells.length : 0),
        partitionVolume: {
            echo: echoVolume(values.pv.read.text, values.pv.unit, values.pv.micro.text, sep),
            microLitre: { text: values.pv.micro.text, unrounded: vd },
            source: c.partitionVolume.source ?? 'user',
        },
    };
}
export function preparationFactors(prep, separator) {
    const read = (q) => {
        const text = q !== null && typeof q === 'object' ? q.value : q;
        const r = readNumber(text, separator);
        return r.kind === 'ok' ? r : null;
    };
    const one = { norm: '1' };
    const out = { ratio: null, steps: [], F: null };
    const total = read(prep.total);
    const sample = read(prep.sample);
    if (total && sample && !D.isZero(sample.dec))
        out.ratio = ratioValue(preparationValues({ total, sample, kind: 'none', steps: [] }).ratio);
    const d = prep.dilution || {};
    if (d.kind === 'steps' && Array.isArray(d.steps)) {
        const steps = d.steps.map((s) => ({ in: read(s.in), total: read(s.total) }));
        const ok = steps.map((s) => Boolean(s.in && s.total && !D.isZero(s.in.dec)));
        out.steps = steps.map((s, i) => (ok[i] ? ratioValue(preparationValues({ total: one, sample: one, kind: 'steps', steps: [s] }).factors[0]) : null));
        if (steps.length && ok.every(Boolean))
            out.F = ratioValue(preparationValues({ total: one, sample: one, kind: 'steps', steps }).F);
    }
    else if (d.kind === 'factor') {
        const f = read(d.factor);
        if (f)
            out.F = ratioValue(preparationValues({ total: one, sample: one, kind: 'factor', steps: [], factor: f }).F);
    }
    else if (d.kind === 'none') {
        out.F = ratioValue(preparationValues({ total: one, sample: one, kind: 'none', steps: [] }).F);
    }
    return out;
}
