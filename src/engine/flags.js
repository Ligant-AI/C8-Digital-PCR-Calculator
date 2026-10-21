import * as D from './decimal.js';
import { exactDecimal, formatFoldRatio } from './numfmt.js';
import { DNASE_LINE } from './labels.js';
export const displayCode = (code) => code.replace(/^T1-/, '');
export const FLAG_TEXT = Object.freeze({
    'T1-FL-01': (w) => `Undefined, not a measurement. Every accepted partition in ${w} is positive, so the number of copies cannot be estimated: the sample is too concentrated for this run. Dilute it further and rerun.`,
    'T1-FL-02': (w) => `0 copies per µL in ${w}, meaning none detected at this partition count, not that target is absent. If you expected target, check the assay and the dilution.`,
    'T1-FL-03': (w, n, expected) => `Accepted partitions in ${w} (${n}) are below the ${expected} you expected for this run. Fewer partitions give a less precise estimate. Check the well in your instrument software before you use this result.`,
    'T1-FL-04': () => DNASE_LINE,
    'T1-FL-05': () => 'No capsid-opening method declared. The record cannot show how genomes were made available to the PCR.',
    'T1-FL-06': () => 'This step does not dilute (factor 1). Check that the total includes the diluent.',
    'T1-FL-07': () => "This is the worked example's partition volume (1 nL), a round number for following the arithmetic. Enter your instrument's partition volume before you use this result.",
    'T1-FL-08': (ratio, high, low, limit) => `Highest to lowest ticked well is ${ratio}-fold (${high} against ${low}), above the ${limit}-fold you set. Check those wells before you use the mean.`,
    'T1-FL-08-zero': (low) => `A ticked well (${low}) has no target detected (0), so the highest-to-lowest ratio has no finite value and is above any limit you set. Check that well before you use the mean.`,
    'T1-FL-09': (wells, values, low, high) => `Copies per µL of reaction in ${wells} (${values}) are outside the range you entered for this assay (${low} to ${high}). Their results are still shown. Check whether another dilution falls within your range.`,
});
export function compareDoubleToDecimal(x, dec) {
    if (x === 0)
        return D.isZero(dec) ? 0 : -1;
    const { digits, scale } = exactDecimal(x);
    return D.compare({ n: digits, scale }, dec);
}
const countText = (r) => (D.isWhole(r.dec) ? D.groupedInteger(r.dec) : r.text);
export function flagsOf(c, values, wells, mean) {
    const flags = [];
    const add = (code, extra, messages) => flags.push({ code, display: displayCode(code), wells: [], ...extra, messages });
    const titre = c.mode === 'titre';
    const fl01 = wells.filter((w) => w.status === 'undefined');
    if (fl01.length)
        add('T1-FL-01', { wells: fl01.map((w) => w.well) }, fl01.map((w) => FLAG_TEXT['T1-FL-01'](w.well)));
    const fl02 = values.wells.filter(({ k }) => D.isZero(k.dec));
    if (fl02.length)
        add('T1-FL-02', { wells: fl02.map(({ w }) => w.well) }, fl02.map(({ w }) => FLAG_TEXT['T1-FL-02'](w.well)));
    if (values.expected) {
        const low = values.wells.filter(({ n }) => D.lt(n.dec, values.expected.dec));
        if (low.length)
            add('T1-FL-03', { wells: low.map(({ w }) => w.well) }, low.map(({ w, n }) => FLAG_TEXT['T1-FL-03'](w.well, countText(n), countText(values.expected))));
    }
    if (titre && (c.titre.dnase === 'no' || c.titre.dnase === 'not-known'))
        add('T1-FL-04', {}, [FLAG_TEXT['T1-FL-04']()]);
    if (titre && c.titre.lysis === 'not-known')
        add('T1-FL-05', {}, [FLAG_TEXT['T1-FL-05']()]);
    const flat = values.preps.flatMap((p) => p.steps.filter((s) => D.eq(s.total.dec, s.in.dec)).map((s) => s.name));
    if (flat.length)
        add('T1-FL-06', { steps: flat }, flat.map(() => FLAG_TEXT['T1-FL-06']()));
    if (c.learnExampleVolumeUnchanged === true)
        add('T1-FL-07', {}, [FLAG_TEXT['T1-FL-07']()]);
    if (titre && values.replicateRatio && mean && mean.status === 'computed') {
        const ticked = wells.filter((w) => w.inMean);
        let high = ticked[0];
        let low = ticked[0];
        for (const w of ticked) {
            if (w.cOrig.unrounded > high.cOrig.unrounded)
                high = w;
            if (w.cOrig.unrounded < low.cOrig.unrounded)
                low = w;
        }
        const limit = values.replicateRatio;
        if (low.cOrig.unrounded === 0) {
            add('T1-FL-08', { wells: [high.well, low.well], ratioDisplay: 'no finite value' }, [FLAG_TEXT['T1-FL-08-zero'](low.well)]);
        }
        else {
            const ratio = high.cOrig.unrounded / low.cOrig.unrounded;
            if (compareDoubleToDecimal(ratio, limit.dec) > 0) {
                const ratioDisplay = formatFoldRatio(ratio, (s) => D.eq(D.fromText(s.replace(/,/g, '')), limit.dec));
                add('T1-FL-08', { wells: [high.well, low.well], ratioDisplay, unrounded: ratio }, [FLAG_TEXT['T1-FL-08'](ratioDisplay, high.well, low.well, limit.text)]);
            }
        }
    }
    const range = values.range;
    if (titre && range && range.low && range.high) {
        const out = wells.filter((w) => w.status === 'computed' && (compareDoubleToDecimal(w.cRxn.unrounded, range.low.dec) < 0 || compareDoubleToDecimal(w.cRxn.unrounded, range.high.dec) > 0));
        if (out.length)
            add('T1-FL-09', { wells: out.map((w) => w.well) }, [FLAG_TEXT['T1-FL-09'](out.map((w) => w.well).join(', '), out.map((w) => w.cRxn.display).join(', '), range.low.text, range.high.text)]);
    }
    return flags;
}
