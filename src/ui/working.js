import { escapeHtml as esc } from '@ligant/bench-chrome';
import { UI } from './text.js';
import { UNDEFINED_TEXT } from '../engine/numfmt.js';
export const pointMark = (text) => String(text).replace(/,/g, '.');
export function vdText(result) {
    const echo = pointMark(result.partitionVolume.echo);
    const m = / = (\S+) µL$/.exec(echo);
    return m ? m[1] : echo.replace(/ µL$/, '');
}
const line = ([label, formula]) => `<li><span class="w-label">${esc(label)}</span> <span class="num w-formula">${esc(formula)}</span></li>`;
export function wellWorkingSteps(prep, result, well, source) {
    const W = UI.working;
    const vd = vdText(result);
    const steps = [[W.volume, `${pointMark(result.partitionVolume.echo)} (${source})`]];
    steps.push([W.p, `p = k ÷ n = ${well.p.fraction} = ${well.p.display}`]);
    if (well.status === 'undefined') {
        steps.push([W.undefined, `p = 1: ${UNDEFINED_TEXT}`]);
        return steps;
    }
    const R = pointMark(prep.total.trim());
    const V = pointMark(prep.sample.trim());
    steps.push([W.lambda, `lambda = −ln(1 − p) = −ln(1 − ${well.p.display}) = ${well.lambda.display}`]);
    steps.push([W.cRxn, `c_rxn = lambda ÷ Vd = ${well.lambda.display} ÷ ${vd} = ${well.cRxn.display}`]);
    steps.push([W.ratio, `r = R ÷ V = ${R} ÷ ${V} = ${well.ratio.display}`]);
    steps.push([W.cDil, `c_rxn × r = ${well.cRxn.display} × ${well.ratio.display} = ${well.cDil.display}`]);
    if (prep.kind === 'steps') {
        prep.steps.forEach((s, i) => steps.push([W.factor(i + 1), `f_${i + 1} = ${pointMark(s.total.trim())} ÷ ${pointMark(s.in.trim())} = ${well.factors[i].display}`]));
        const product = well.factors.length === 1 ? 'f_1' : well.factors.map((f) => f.display).join(' × ');
        steps.push([W.overall, `F = ${product} = ${well.F.display}`]);
    }
    else if (prep.kind === 'factor') {
        steps.push([W.overall, `F = ${well.F.display} (${W.oneFactor})`]);
    }
    else {
        steps.push([W.overall, `F = 1 (${W.notDiluted})`]);
    }
    steps.push([W.cOrig, `(c_rxn × r) × F = ${well.cDil.display} × ${well.F.display} = ${well.cOrig.display}`]);
    steps.push([W.perMl, `${well.cOrig.display} × 1000 = ${well.perMl.display}`]);
    return steps;
}
export function wellWorking(prep, result, well, source) {
    return `<ol class="working">${wellWorkingSteps(prep, result, well, source).map(line).join('')}</ol><p class="help">${esc(UI.working.wellNote)}</p>`;
}
export function meanWorkingSteps(result) {
    const mean = result.mean;
    if (!mean || mean.status !== 'computed')
        return [];
    const wells = result.wells.filter((w) => w.inMean);
    const W = UI.working;
    return [[W.meanOf(wells.length), `(${wells.map((w) => w.cOrig.display).join(' + ')}) ÷ ${wells.length} = ${mean.cOrig.display}`], [W.perMl, `${mean.cOrig.display} × 1000 = ${mean.perMl.display}`]];
}
export function meanWorking(result) {
    const steps = meanWorkingSteps(result);
    if (!steps.length)
        return '';
    return `<ol class="working">${steps.map(line).join('')}</ol><p class="help">${esc(UI.working.meanNote)}</p>`;
}
