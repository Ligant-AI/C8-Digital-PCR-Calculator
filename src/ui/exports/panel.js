import { escapeHtml as esc } from '@ligant/bench-chrome';
import { UI, RULED } from '../text.js';
import { JSON_EXPORT_ENABLED } from './json.js';
export const csvDecimalOf = (state) => state.exportDecimal ?? (state.entry === 'pasted' ? state.paste.separator : null);
export function exportPanelHtml(state, { hasResult, sheetReady }) {
    const E = UI.exp;
    const dec = csvDecimalOf(state);
    const radios = Object.entries(E.csvDecimalOptions).map(([v, label]) => `<label><input type="radio" name="csv-decimal" value="${esc(v)}"${dec === v ? ' checked' : ''}> <span>${esc(label)}</span></label>`).join('');
    return `<h3 class="sub-h">${esc(E.exportHeading)}</h3><p class="hint">${esc(E.exportLead)}</p>`
        + `<p class="hint">${esc(RULED.privacySentence)}</p>`
        + `<div class="button-row export-buttons">`
        + `<button type="button" data-export="notebook"${hasResult ? '' : ' disabled'}>${esc(E.copy)}</button>`
        + `<button type="button" data-export="csv"${hasResult && dec ? '' : ' disabled'}>${esc(E.downloadCsv)}</button>`
        + (JSON_EXPORT_ENABLED ? `<button type="button" data-export="json"${hasResult ? '' : ' disabled'}>${esc(E.downloadJson)}</button>` : '')
        + `<button type="button" data-export="sheet"${sheetReady ? '' : ' disabled'}>${esc(E.printSheet)}</button></div>`
        + `<fieldset class="field csv-decimal" aria-describedby="csv-decimal-need"><legend class="label">${esc(E.csvDecimalLegend)}</legend><div class="radios">${radios}</div>`
        + `<p class="hint" id="csv-decimal-need"${dec ? ' hidden' : ''}>${esc(E.csvNeeds)}</p></fieldset>`
        + `${sheetReady ? '' : `<p class="hint">${esc(E.sheetNeeds)}</p>`}`
        + `<p class="hint" id="copy-status" aria-live="polite" hidden></p>`
        + `<div id="notebook-fallback" hidden><p class="hint">${esc(E.copyFallback)}</p><textarea id="notebook-text" rows="12" readonly class="num"></textarea></div>`;
}
