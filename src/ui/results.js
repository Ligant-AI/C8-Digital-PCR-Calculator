import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, UI } from './text.js';
import { blockHtml } from './block.js';
import { blockModel } from './summary.js';
import { caseOf, separatorOf, prepName } from './state.js';
import { preparationFactors } from '../engine/determine.js';
import { negativeFraction } from '../engine/visual.js';
import { wellWorking, meanWorking } from './working.js';
import { partitionsHtml } from './visuals/partitions.js';
import { sourceText } from './form.js';
import { CONFIG } from '../config.js';
const R = Object.freeze({
    cRxn: 'copies per µL of reaction',
    cDil: 'copies per µL of the diluted sample',
    cOrig: 'copies per µL of the original sample',
    perMl: 'copies per mL of the original sample',
});
export const UNIT_NAMES = R;
export const MISSING_NAMES = Object.freeze({
    'T1-IN-14': UI.block.separator,
    'T1-IN-04': RULED.partitionVolume,
    'T1-IN-06': RULED.total,
    'T1-IN-07': RULED.sample,
    'T1-IN-09': UI.dilutionLegend,
    'T1-IN-10': RULED.instrument,
    'T1-IN-11': RULED.targetName,
    'T1-IN-02': `${RULED.positive} / ${UI.acceptedShort}`,
    'T1-TM-01': RULED.freeDna,
    'T1-TM-02': UI.lysisLegend,
    'T1-TM-03': UI.classLegend,
});
const figure = (cls, k, v, sub = '', data = '') => `<div class="figure ${cls}"${data ? ` data-result="${esc(data)}"` : ''}><span class="k">${esc(k)}</span><span class="v num">${esc(v)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</div>`;
function headlineFigures(result) {
    const out = [];
    const mean = result.mean;
    const perMlLabel = result.headline || R.perMl;
    if (mean && mean.status === 'computed') {
        const n = mean.wells.length;
        out.push(figure('lead', perMlLabel, mean.perMl.display, UI.meanOf(n, mean.wells), 'headline'));
        out.push(figure('', R.cOrig, mean.cOrig.display, UI.meanOf(n, mean.wells), 'mean'));
    }
    else if (result.wells.length === 1) {
        const w = result.wells[0];
        const counts = UI.countsOf(w.echo.positive, w.echo.accepted);
        out.push(figure('lead', perMlLabel, w.perMl.display, `${w.well}: ${counts}`, 'headline'));
        out.push(figure('', R.cOrig, w.cOrig.display, `${w.well}: ${counts}`, 'well-0'));
    }
    return out.length ? `<div class="result-grid">${out.join('')}</div>` : '';
}
function meanNote(result) {
    const mean = result.mean;
    if (!mean)
        return result.wells.length > 1 ? `<p class="hint">${esc(UI.noMean)}</p>` : '';
    if (mean.status === 'withheld') {
        const wells = (mean.reasonWells && mean.reasonWells['undefined-well']) || [];
        return `<div class="state-block withheld" data-result="mean-withheld"><p>${esc(UI.meanWithheld(wells))}</p></div>`;
    }
    return `<p class="hint">${esc(RULED.meanSentence(mean.wells.length))}</p>`;
}
export function summaryHtml(state, result, problems) {
    if (problems.length || result.status === 'incomplete') {
        const pasteNamed = problems.some((p) => p.key === 'paste:separator');
        const names = (result.status === 'incomplete' ? result.incomplete : []).filter((id) => !(pasteNamed && id === 'T1-IN-14')).map((id) => MISSING_NAMES[id]).filter(Boolean);
        const items = [...problems.map((p) => p.text), ...names];
        return { block: '', body: `<div class="state-block incomplete"><h3>${esc(UI.noResultTitle)}</h3><p>${esc(UI.remainsLead)}</p><ul>${[...new Set(items)].map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` };
    }
    if (result.status === 'rejected') {
        const msgs = (result.refusals || []).map((r) => r.message);
        return { block: '', body: `<div class="state-block rejected"><h3>${esc(UI.refusedTitle)}</h3><p>${esc(UI.refusedLead)}</p><ul>${msgs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` };
    }
    if (result.status !== 'result')
        return { block: '', body: `<div class="state-block rejected"><p>${esc(UI.malformed)}</p></div>` };
    const fl04 = result.label && result.label.line ? `<p class="headline-line" id="flag-FL-04">${esc(result.label.line)}</p>` : '';
    const meanWork = meanWorking(result);
    return {
        block: blockHtml(blockModel(state, result)),
        body: headlineFigures(result) + fl04 + meanNote(result)
            + (meanWork ? `<details class="options working-details" data-result="mean-working"><summary>${esc(UI.showWorking)}</summary>${meanWork}</details>` : '')
            + flagWords(result)
            + `<p class="hint">${esc(RULED.originalSample)}</p><p class="hint">${esc(RULED.precision)}</p>${separatorOf(state) === ',' ? `<p class="hint" data-slot="comma-entries">${esc(UI.commaEntries)}</p>` : ''}<p class="hint">${esc(RULED.rounding)}</p>`
            + engineLine(result),
    };
}
function flagWords(result) {
    const flags = result.flags.filter((f) => f.display !== 'FL-04');
    if (!flags.length)
        return '';
    return `<h3 class="sub-h">${esc(UI.flagsHeading)}</h3><ul class="result-flags">${flags.map((f) => `<li id="flag-${esc(f.display)}" data-result="flag-${esc(f.display)}"><a class="code" href="#legend-${esc(f.display)}" title="${esc(UI.legendLink)}">${esc(f.display)}</a> `
        + `${f.messages.map((m) => `<span class="flag-message">${esc(m)}</span>`).join(' ')}</li>`).join('')}</ul>`;
}
export function engineLine(result) {
    return `<p class="hint engine-line">${esc(UI.engineLead)} <a class="num" href="${esc(CONFIG.engineTagUrl(result.engine))}" rel="noopener">${esc(UI.engineVersion(result.engine))}</a></p>`;
}
export function detailHtml(state, result) {
    if (result.status !== 'result')
        return { block: '', body: '' };
    const cols = [UI.wellColumn, UI.preparation, RULED.positive, UI.acceptedShort, 'p', 'lambda', R.cRxn, R.cDil, R.cOrig, R.perMl, UI.inMeanColumn];
    const groups = [];
    for (const w of result.wells) {
        let g = groups.find((x) => x.prep === w.prep);
        if (!g) {
            g = { prep: w.prep, wells: [] };
            groups.push(g);
        }
        g.wells.push(w);
    }
    const cell = (v) => `<td>${esc(v ?? '')}</td>`;
    const body = groups.map((g) => `<tbody class="prep-group">${g.wells.map((w) => `<tr data-result="well-${esc(w.well)}">${cell(w.well)}<td class="words">${esc(w.prep)}</td>`
        + cell(w.echo.positive) + cell(w.echo.accepted) + cell(w.p.display) + cell(w.lambda.display) + cell(w.cRxn.display) + cell(w.cDil.display) + cell(w.cOrig.display) + cell(w.perMl.display)
        + `<td class="words">${esc(w.inMean ? UI.inMeanCell : RULED.notInMean)}</td></tr>`).join('')}</tbody>`).join('');
    const sep = separatorOf(state);
    const source = sourceText(state.pv.source);
    const cards = result.wells.map((w) => {
        const prep = state.preps.find((p) => prepName(state, p) === w.prep);
        const neg = negativeFraction(w.echo.positive, w.echo.accepted, sep);
        return `<section class="well-card"><h4>${esc(UI.wellCard(w.well, w.prep))} <span class="help">${esc(UI.countsOf(w.echo.positive, w.echo.accepted))}${w.inMean ? '' : `, ${esc(RULED.notInMean)}`}</span></h4>`
            + partitionsHtml(w, neg)
            + `<details class="options working-details" data-result="working-${esc(w.well)}"><summary>${esc(UI.showWorkingFor(w.well))}</summary>${wellWorking(prep, result, w, source)}</details></section>`;
    }).join('');
    return {
        block: blockHtml(blockModel(state, result)),
        body: `<table class="points" id="points"><thead id="points-head"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>${body}</table>`
            + `<h3 class="sub-h well-cards-h">${esc(UI.partitionsHeading)}</h3><div class="well-cards">${cards}</div>${engineLine(result)}`,
    };
}
export function factorsFrom(state) {
    const out = {};
    const sep = separatorOf(state);
    if (!sep)
        return out;
    const c = caseOf(state);
    state.preps.forEach((p, i) => {
        const f = preparationFactors(c.preparations[i], sep);
        out[p.uid] = { steps: f.steps.map((x) => (x ? x.display : null)), stepValues: f.steps, overall: f.F ? f.F.display : null, ratio: f.ratio };
    });
    return out;
}
