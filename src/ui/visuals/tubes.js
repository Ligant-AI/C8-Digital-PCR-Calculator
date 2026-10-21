import { escapeHtml as esc } from '@ligant/bench-chrome';
import { UI } from '../text.js';
function tube(share) {
    const h = 46;
    const band = share > 0 && share <= 1 ? Math.max(2, Math.round(h * share)) : 0;
    return `<svg class="tube" viewBox="0 0 24 60" width="24" height="60" aria-hidden="true" focusable="false">`
        + `<path class="tube-glass" d="M4 2 V48 a8 8 0 0 0 16 0 V2" />`
        + `<path class="tube-liquid" d="M5 ${56 - h} V48 a7 7 0 0 0 14 0 V${56 - h} Z" />`
        + (band ? `<path class="tube-sample" d="M5 ${56 - band} V48 a7 7 0 0 0 14 0 V${56 - band} Z" />` : '')
        + '</svg>';
}
const labelHtml = (label) => { const i = label.lastIndexOf(': '); return i < 0 ? esc(label) : `${esc(label.slice(0, i + 2))}<span class="nowrap">${esc(label.slice(i + 2))}</span>`; };
export function tubesHtml(steps, overall) {
    if (!steps.length)
        return '';
    const items = steps.map((s, i) => {
        const label = s.in.trim() && s.total.trim() ? UI.tubeLabel(s.in.trim(), s.total.trim(), s.factor ? s.factor.display : null) : UI.tubeEmpty(i + 1);
        return `${i ? '<li class="tube-arrow" aria-hidden="true">→</li>' : ''}<li class="tube-step" data-tube="${i}">${tube(s.factor ? 1 / s.factor.unrounded : 0)}<span class="tube-label">${labelHtml(label)}</span></li>`;
    }).join('');
    return `<figure class="visual tubes-figure"><ol class="tubes">${items}<li class="tube-arrow" aria-hidden="true">→</li><li class="tube-overall" data-tube="overall"><span class="tube-label">${esc(overall ? UI.tubeOverall(overall) : UI.tubeOverallPending)}</span></li></ol>`
        + `<figcaption class="help">${esc(UI.tubesCaption)}</figcaption></figure>`;
}
