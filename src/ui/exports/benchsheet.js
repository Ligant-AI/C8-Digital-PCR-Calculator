import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, UI, RESEARCH_USE } from '../text.js';
import { CONFIG } from '../../config.js';
import { ENGINE_VERSION, ORDER_OF_EVALUATION } from '../../engine/version.js';
import { citationText } from '../chrome.js';
import { prepName, separatorOf, caseOf } from '../state.js';
import { sourceText } from '../form.js';
import { tubesHtml } from '../visuals/tubes.js';
import { preparationFactors } from '../../engine/determine.js';
import { exportDate } from './record.js';
import { scopeWords } from './signed.js';
const blank = (s) => s === null || s === undefined || String(s).trim() === '';
export function sheetReady(state) {
    return state.preps.every((p) => !blank(p.total) && !blank(p.sample) && p.kind
        && (p.kind !== 'steps' || p.steps.every((s) => !blank(s.in) && !blank(s.total)))
        && (p.kind !== 'factor' || !blank(p.factor)));
}
export function benchSheetHtml(state, date = exportDate()) {
    const E = UI.exp;
    const sep = separatorOf(state) || '.';
    const c = caseOf(state);
    const decl = [
        ['Instrument and software version', state.instrument.trim()], ['Target name', state.target.trim()],
        [RULED.partitionVolume, `${state.pv.value.trim()} ${state.pv.unit}`], [UI.block.source, sourceText(state.pv.source)],
    ];
    if (state.titer) {
        const t = state.titre;
        decl.push([RULED.freeDna, `${RULED.freeDnaOptions[t.dnase] ?? ''}${t.dnase === 'other' ? `: ${t.dnaseText.trim()}` : ''}`], [UI.lysisLegend, `${RULED.lysisOptions[t.lysis] ?? ''}${blank(t.lysisText) ? '' : `; ${t.lysisText.trim()}`}`], [UI.classLegend, t.targetClass === 'other' ? t.targetClassText.trim() : (RULED.classOptions[t.targetClass] ?? '')]);
    }
    const preps = state.preps.map((p, i) => {
        const f = preparationFactors(c.preparations[i], sep);
        const steps = p.kind === 'steps'
            ? `<table class="sheet-table"><thead><tr>${E.stepColumns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${p.steps.map((s, j) => `<tr><td>${j + 1}</td><td>${esc(s.in.trim())}</td><td>${esc(s.total.trim())}</td></tr>`).join('')}</tbody></table>`
                + tubesHtml(p.steps.map((s, j) => ({ in: s.in, total: s.total, factor: f.steps[j] })), f.F ? f.F.display : null)
            : `<p>${esc(p.kind === 'factor' ? `${RULED.oneFactor}: ${p.factor.trim()}` : RULED.notDiluted)}</p>`;
        const reaction = `<table class="sheet-table"><thead><tr>${E.reactionColumns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody><tr><td>${esc(p.total.trim())}</td><td>${esc(p.sample.trim())}</td><td>${esc(p.mix.trim())}</td></tr></tbody></table>`;
        return `<section class="sheet-prep"><h3>${esc(UI.preparation)} ${esc(prepName(state, p))}</h3>${steps}${reaction}</section>`;
    }).join('');
    return `<h2>${esc('Ligant · Digital PCR Calculator')}: ${esc(E.benchTitle)}</h2>`
        + `<p class="sheet-meta">${esc(E.date)}: ${esc(date)} · ${esc(E.toolVersion)} ${esc(CONFIG.version)} · ${esc(UI.engineVersion(ENGINE_VERSION))} · ${esc(E.order)} ${ORDER_OF_EVALUATION}</p>`
        + `<p class="sheet-scope">${esc(RESEARCH_USE)} ${esc(scopeWords(state.titer))}</p>`
        + `<dl class="sheet-decl">${decl.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
        + preps
        + `<p class="sheet-sentence">${esc(RULED.benchSheetSentence)}</p>`
        + `<p class="sheet-cite">${esc(E.sections.citation)}: ${esc(citationText())}</p>`;
}
