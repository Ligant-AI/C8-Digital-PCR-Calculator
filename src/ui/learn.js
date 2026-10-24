import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, RULED_1_1 as R, RULED_1_1_FORMS as F, UI } from './text.js';
import { initialState, caseOf, newPrep, newStep, newWell } from './state.js';
export const LEARN_WELL = 'A1';
export function entriesInProgress(state) {
    const snapshot = (s) => JSON.stringify({ c: caseOf({ ...s, titer: true, learn: null }), paste: s.paste.text, sources: [s.expectedSource, s.titre.ratioSource, s.titre.rangeSource] });
    return snapshot(state) !== snapshot(initialState());
}
export function loadExample(state) {
    const fresh = initialState();
    for (const k of Object.keys(fresh))
        state[k] = fresh[k];
    const L = UI.learn;
    state.instrument = L.instrument;
    state.target = L.target;
    state.pv = { value: '1', unit: 'nL', source: 'user' };
    const p = newPrep(1);
    const step = newStep();
    step.in = '1';
    step.total = '10';
    Object.assign(p, { total: '25', sample: '5', mix: '20', kind: 'steps', steps: [step] });
    state.preps = [p];
    const w = newWell(1);
    Object.assign(w, { label: LEARN_WELL, positive: '15000', accepted: '20000', inMean: false });
    state.wells = [w];
    state.touched = true;
    state.learn = { volumeUnchanged: true, shown: true };
}
export function walkThrough(learn = null) {
    const L = UI.learn;
    const steps = RULED.learnSteps.map((t, i) => {
        if (i === 0 && learn)
            return `<li>${esc(t)}${learn.step1}</li>`;
        if (i === 1)
            return `<li>${esc(t)}${esc(RULED.learnCheck)}${learn ? learn.step2 : ''}</li>`;
        if (i === 3)
            return `<li>${esc(t)} ${esc(RULED.learnLoading)}</li>`;
        return `<li>${esc(t)}</li>`;
    }).join('');
    return `<div class="learn-body" data-result="worked-example">`
        + `<p>${esc(RULED.learnIntro)}</p>`
        + `<p class="help learn-one-nl"><b>${esc(L.oneNlLead)}</b> ${esc(RULED.learnOneNl)}</p>`
        + `<ol class="learn-steps">${steps}</ol>`
        + `<p class="help">${esc(L.lambdaSource)} ${esc(RULED.quanCitation)}. ${esc(L.derived)}</p>`
        + `<p>${esc(RULED.rounding)}</p>`
        + `<p>${esc(RULED.learnContrast)}</p>${learn ? learn.end : ''}</div>`;
}
export function tryThisHtml() {
    return `<div class="try-this" data-learn="try"><h3 class="try-heading">${esc(R.tryHeading)}</h3><p class="try-prompt">${esc(F.tryPrompt(LEARN_WELL))}</p>`
        + `<details class="options try-answer"><summary>${esc(R.trySummary)}</summary><p>${esc(R.tryAnswer)}</p></details></div>`;
}
export function learnWalkThrough() {
    return walkThrough({
        step1: '<div class="learn-item" data-slot="learn-dots"></div>',
        step2: '<div class="learn-item" data-slot="learn-curve"></div>',
        end: tryThisHtml(),
    });
}
export function learnPanelHtml(state, confirming) {
    const L = UI.learn;
    const action = confirming
        ? `<div class="learn-confirm" role="group" aria-label="${esc(L.confirm)}"><p>${esc(L.confirm)}</p><div class="button-row"><button type="button" class="primary" data-action="learn-replace">${esc(L.replace)}</button><button type="button" data-action="learn-keep">${esc(L.keep)}</button></div></div>`
        : `<div class="button-row"><button type="button" data-action="learn-load">${esc(L.load)}</button></div>`;
    const shown = state.learn && state.learn.shown;
    return `<section class="panel" id="learn" aria-labelledby="learn-heading"><div class="panel-head"><div class="titles"><h2 id="learn-heading">${esc(L.heading)}</h2></div></div>`
        + `<div class="panel-body stack"><p class="help">${esc(L.lead)}</p>${action}`
        + (shown ? `<details class="options learn-details" open><summary>${esc(UI.workedExampleHeading)}</summary>${learnWalkThrough()}</details>` : '')
        + '</div></section>';
}
